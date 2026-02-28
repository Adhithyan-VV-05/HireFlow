"""Candidate management and matching endpoints."""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db, Candidate, FaissMetadata
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
    candidates = db.query(Candidate).all()
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
            }
            for c in candidates
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

    return {
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "skills": candidate.skills,
        "entities": candidate.entities,
        "chunks": chunks,
        "aptitude_scores": candidate.aptitude_scores,
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

    return {
        "profile": {
            "candidate_id": candidate.id,
            "name": current_user.name,
            "email": current_user.email,
            "skills": candidate.skills,
            "entities": candidate.entities,
            "chunks": chunks,
            "aptitude_scores": candidate.aptitude_scores,
            "created_at": str(candidate.created_at),
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
