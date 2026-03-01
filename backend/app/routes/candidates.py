"""Candidate management and matching endpoints."""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db, Candidate, FaissMetadata, SkillAssessment
from app.db.models import User
from app.core.auth import get_current_user, require_interviewer
from app.schemas import MatchRequest

router = APIRouter(prefix="/api", tags=["candidates"])


@router.get("/candidates")
async def list_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all candidates. Visible to both roles."""
    all_candidates = db.query(Candidate).all()
    # Pre-calculate ranks
    candidate_scores = []
    for c in all_candidates:
        avg_score = 0
        if c.aptitude_scores:
            scores = c.aptitude_scores.values()
            avg_score = sum(scores) / len(scores) if scores else 0
        candidate_scores.append((c.id, avg_score))
    candidate_scores.sort(key=lambda x: x[1], reverse=True)
    ranks = {cid: i + 1 for i, (cid, _) in enumerate(candidate_scores)}

    return {
        "candidates": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "skills": c.skills,
                "entities": c.entities,
                "aptitude_scores": c.aptitude_scores,
                "created_at": str(c.created_at),
                "global_rank": ranks.get(c.id, len(all_candidates)),
                "total_candidates": len(all_candidates)
            }
            for c in all_candidates
        ]
    }


@router.get("/candidate/{candidate_id}")
async def get_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full candidate profile."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    meta_records = db.query(FaissMetadata).filter(
        FaissMetadata.candidate_id == candidate_id
    ).all()

    chunks = {}
    aptitude_scores = {}
    for meta in meta_records:
        chunks[meta.chunk_type] = meta.chunk_text
        meta_data = json.loads(meta.metadata_json) if meta.metadata_json else {}
        aptitude_scores.update(meta_data.get("aptitude_scores", {}))

    assessments = db.query(SkillAssessment).filter(SkillAssessment.candidate_id == candidate_id).all()
    skill_scores = {a.skill_name: a.percentage for a in assessments if a.is_completed}
    is_verified = len(skill_scores) >= 1

    return {
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "skills": candidate.skills,
        "entities": candidate.entities,
        "chunks": chunks,
        "aptitude_scores": candidate.aptitude_scores,
        "skill_scores": skill_scores,
        "is_verified": is_verified,
        "created_at": str(candidate.created_at),
    }


@router.post("/match-candidates")
async def match_candidates(
    request: MatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Match candidates to a job description. Interviewer only."""
    from app.core.search import hybrid_search
    from app.core.ranking import apply_skill_boost, bias_check

    results = hybrid_search(request.job_description, top_k=request.top_k, db_session=db)

    if not results:
        return {"candidates": [], "total": 0, "fairness": {}}

    boosted = apply_skill_boost(results, request.job_description, db_session=db)
    fairness = bias_check(boosted, db_session=db)

    return {
        "candidates": boosted,
        "total": len(boosted),
        "fairness": fairness,
    }


@router.get("/my-profile")
async def get_my_candidate_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the candidate profile linked to the current user."""
    if current_user.role != "candidate":
        raise HTTPException(403, "Only candidates have profiles")

    candidate = db.query(Candidate).filter(
        Candidate.user_id == current_user.id
    ).first()

    if not candidate:
        return {"profile": None, "message": "No resume uploaded yet"}

    meta_records = db.query(FaissMetadata).filter(
        FaissMetadata.candidate_id == candidate.id
    ).all()

    chunks = {}
    aptitude_scores = {}
    for meta in meta_records:
        chunks[meta.chunk_type] = meta.chunk_text
        meta_data = json.loads(meta.metadata_json) if meta.metadata_json else {}
        aptitude_scores.update(meta_data.get("aptitude_scores", {}))

    # Skill Assessment data
    assessments = db.query(SkillAssessment).filter(SkillAssessment.candidate_id == candidate.id).all()
    skill_scores = {a.skill_name: a.percentage for a in assessments if a.is_completed}
    is_verified = len(skill_scores) >= 1

    # Overall score for ranking (average of aptitude + average of skill tests if any)
    def calc_overall(c):
        apt_score = 0
        if c.aptitude_scores:
            s_vals = [float(s) for s in c.aptitude_scores.values()]
            apt_score = sum(s_vals) / (len(s_vals) * 10) if s_vals else 0
        
        tests = db.query(SkillAssessment).filter(SkillAssessment.candidate_id == c.id, SkillAssessment.is_completed == True).all()
        test_score = 0
        if tests:
            test_score = sum(t.percentage for t in tests) / (len(tests) * 100)
        
        if not c.aptitude_scores and not tests:
            return 0
        
        div = 0
        if c.aptitude_scores: div += 1
        if tests: div += 1
        return (apt_score + test_score) / div

    # Calculate global rank
    all_candidates = db.query(Candidate).all()
    candidate_scores = []
    for c in all_candidates:
        candidate_scores.append((c.id, calc_overall(c)))
    
    candidate_scores.sort(key=lambda x: x[1], reverse=True)
    rank = next((i + 1 for i, (cid, _) in enumerate(candidate_scores) if cid == candidate.id), len(all_candidates))

    # Calculate mastery percentage
    apt_mastery = 0
    if candidate.aptitude_scores:
        s_vals = [float(x) for x in candidate.aptitude_scores.values()]
        apt_mastery = (sum(s_vals) / (len(s_vals) * 10)) * 100

    # Calculate completion: basic fields + skills + aptitude + verified status
    completion = 0 
    if candidate.name: completion += 10
    if candidate.email: completion += 10
    if candidate.skills: completion += 20
    if candidate.aptitude_scores: completion += 30
    if is_verified: completion += 30

    return {
        "profile": {
            "candidate_id": candidate.id,
            "name": current_user.name,
            "email": current_user.email,
            "skills": candidate.skills,
            "entities": candidate.entities,
            "chunks": chunks,
            "aptitude_scores": candidate.aptitude_scores,
            "aptitude_mastery": int(apt_mastery),
            "skill_scores": skill_scores,
            "overall_score": round(float(calc_overall(candidate)) * 100, 1),
            "is_verified": is_verified,
            "created_at": str(candidate.created_at),
            "completion_percentage": min(100, int(completion)),
            "global_rank": rank,
            "total_candidates": len(all_candidates),
            "system_max_score": round(float(candidate_scores[0][1]) * 100, 1) if candidate_scores else 100.0
        }
    }


@router.get("/my-interviews")
async def get_my_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get interviews for the current candidate user."""
    from app.db.models import Interview, Job

    candidate = db.query(Candidate).filter(
        Candidate.user_id == current_user.id
    ).first()

    if not candidate:
        return {"interviews": []}

    interviews = db.query(Interview).filter(
        Interview.candidate_id == candidate.id
    ).all()

    result = []
    for interview in interviews:
        job = db.query(Job).filter(Job.id == interview.job_id).first()
        result.append({
            "id": interview.id,
            "job_title": job.title if job else "Unknown",
            "job_id": interview.job_id,
            "status": interview.status,
            "total_score": interview.total_score,
            "created_at": str(interview.created_at),
        })

    return {"interviews": result}


@router.post("/update-profile")
async def update_profile(
    details: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update candidate profile details."""
    if current_user.role != "candidate":
        raise HTTPException(403, "Only candidates can update their profiles")

    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(400, "Please upload a resume first")

    # Update entities (location, skills, education, etc.)
    # The 'details' dict can contain 'entities' object
    if "entities" in details:
        # Merge or replace entities
        current_entities = candidate.entities
        new_entities = details["entities"]
        for k, v in new_entities.items():
            current_entities[k] = v
        candidate.entities_json = json.dumps(current_entities)
        
        # If skills were updated in entities, sync with skills_json
        if "SKILL" in new_entities:
            candidate.skills_json = json.dumps(new_entities["SKILL"])

    # Update top-level fields
    if "location" in details:
        ents = candidate.entities
        ents["LOCATION"] = details["location"]
        candidate.entities_json = json.dumps(ents)

    if "name" in details:
        candidate.name = details["name"]
    
    if "email" in details:
        candidate.email = details["email"]

    db.commit()
    return {
        "message": "Profile updated successfully",
        "profile": {
            "name": candidate.name,
            "email": candidate.email,
            "entities": candidate.entities,
            "skills": candidate.skills
        }
    }
