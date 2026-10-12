"""Candidate management and matching endpoints."""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db, Candidate, FaissMetadata, SkillAssessment
from app.db.models import User, JobApplication, Job, InterviewSession, VoiceScreeningSession
from app.core.auth import get_current_user, require_interviewer
from app.schemas import MatchRequest

from app.routes.upskilling import skill_matches

router = APIRouter(prefix="/api", tags=["candidates"])


def normalize_apt_score(val):
    try:
        v = float(val)
        if v > 10.0:
            return min(100.0, v)
        elif v > 1.0:
            return min(100.0, v * 10.0)
        else:
            return min(100.0, v * 100.0)
    except (ValueError, TypeError):
        return 70.0


def calculate_cohort_relative_scoring(db: Session):
    """Compute verified multi-factor composite scores and cohort relative marking metrics.
    
    Relative Marking Scheme:
    1. Raw Component Scores:
       - Skill Match (0-100%): Exact competency verification against target job requirements.
       - Screening & Interview (0-100%): Verified oral screening or simulation score.
       - Aptitude Proficiency (0-100%): Normalized technical, analytical, communication aptitude.
       - Profile Completeness (0-100%): Verified credentials and extracted resume entities.
    2. Multi-Factor Composite Score:
       - Screened Candidates: 40% Skill + 35% Screening + 15% Aptitude + 10% Profile Credentials.
       - Unscreened Candidates: 55% Skill + 30% Aptitude + 15% Profile Credentials.
    3. Cohort Benchmark & Relative Curve:
       - Percentile Rank = ((Total - Rank + 1) / Total) * 100
       - Relative Grades: A+ Elite (Top 15-20%), A High Alignment, B+ Competitive, B Foundational, C Development.
    """
    all_candidates = db.query(Candidate).all()
    if not all_candidates:
        return {}, {
            "mean_score": 0.0,
            "median_score": 0.0,
            "top_score": 0.0,
            "total_evaluated": 0,
            "grade_counts": {"a_plus": 0, "a": 0, "b_plus": 0, "b": 0, "c": 0},
            "formula_description": "Composite = 40% Skill Match + 35% Screening + 15% Aptitude + 10% Profile."
        }

    raw_data = []
    for c in all_candidates:
        cand_skills = [s.strip() for s in (c.skills or []) if s.strip()]

        # 1. Target Job and Skill Match
        app = db.query(JobApplication).filter(JobApplication.candidate_id == c.id).order_by(JobApplication.created_at.desc()).first()
        job = app.job if app else None

        job_skills = [s.strip() for s in (job.required_skills or []) if s.strip()] if job else []
        if job and job_skills:
            matched = [s for s in job_skills if any(skill_matches(cs, s) for cs in cand_skills)]
            missing = [s for s in job_skills if not any(skill_matches(cs, s) for cs in cand_skills)]
            skill_score = round((len(matched) / len(job_skills)) * 100.0, 1)
            match_reason = f"{len(matched)} of {len(job_skills)} skills verified"
        elif job:
            matched = []
            missing = []
            skill_score = 0.0
            match_reason = f"No requirements configured on {job.title}"
        else:
            matched = []
            missing = []
            skill_score = min(100.0, round(len(cand_skills) * 12.0, 1))
            match_reason = f"{len(cand_skills)} profile skills (General Pool)"

        # 2. Oral Screening or Simulation Interview Score
        sim = db.query(InterviewSession).filter(InterviewSession.candidate_id == c.id).order_by(InterviewSession.created_at.desc()).first()
        screen = db.query(VoiceScreeningSession).filter(VoiceScreeningSession.candidate_id == c.id).order_by(VoiceScreeningSession.created_at.desc()).first()

        interview_score = None
        interview_type = "Pending Screening"
        if getattr(c, "screening_score", None) and float(c.screening_score) > 0:
            interview_score = float(c.screening_score)
            interview_type = "Oral Voice Screening"
        elif screen and screen.overall_score > 0:
            interview_score = float(screen.overall_score)
            interview_type = "Oral Voice Screening"
        elif sim and sim.overall_score > 0:
            interview_score = float(sim.overall_score)
            interview_type = "AI Interview Simulation"

        # 3. Aptitude Score
        if c.aptitude_scores:
            s_vals = [normalize_apt_score(v) for v in c.aptitude_scores.values()]
            aptitude_score = round(sum(s_vals) / len(s_vals), 1) if s_vals else 70.0
        else:
            aptitude_score = 70.0

        # 4. Profile Completeness Score
        profile_score = min(100.0, 50.0 + len(cand_skills) * 5.0)

        # 5. Composite Score with transparent formula proof
        if interview_score is not None:
            comp = round(0.40 * skill_score + 0.35 * interview_score + 0.15 * aptitude_score + 0.10 * profile_score, 1)
            formula = f"40% Skill ({skill_score:.0f}%) + 35% Screening ({interview_score:.0f}%) + 15% Aptitude ({aptitude_score:.0f}%) + 10% Profile ({profile_score:.0f}%)"
        else:
            comp = round(0.55 * skill_score + 0.30 * aptitude_score + 0.15 * profile_score, 1)
            formula = f"55% Skill ({skill_score:.0f}%) + 30% Aptitude ({aptitude_score:.0f}%) + 15% Profile ({profile_score:.0f}%) (Pending Screening)"

        raw_data.append({
            "candidate": c,
            "job": job,
            "cand_skills": cand_skills,
            "matched_skills": matched,
            "missing_skills": missing,
            "skill_score": skill_score,
            "match_reason": match_reason,
            "interview_score": interview_score,
            "interview_type": interview_type,
            "aptitude_score": aptitude_score,
            "profile_score": profile_score,
            "composite_score": comp,
            "scoring_formula": formula
        })

    # Sort candidates descending by composite score
    raw_data.sort(key=lambda x: x["composite_score"], reverse=True)
    N = len(raw_data)
    cohort_mean = sum(x["composite_score"] for x in raw_data) / N
    sorted_comps = [x["composite_score"] for x in raw_data]
    cohort_median = sorted_comps[N // 2] if N % 2 == 1 else (sorted_comps[N // 2 - 1] + sorted_comps[N // 2]) / 2.0
    cohort_top = sorted_comps[0]

    grade_counts = {
        "a_plus": 0, "A+ Elite": 0,
        "a": 0, "A High Alignment": 0,
        "b_plus": 0, "B+ Competitive": 0,
        "b": 0, "B Foundational": 0,
        "c": 0, "C Development Required": 0,
    }
    candidate_metrics_map = {}

    for i, item in enumerate(raw_data):
        rank = i + 1
        pctile = round(((N - rank + 1) / N) * 100, 1)
        comp = item["composite_score"]
        delta = round(comp - cohort_mean, 1)
        delta_str = f"+{delta}%" if delta >= 0 else f"{delta}%"

        # Cohort Curve Relative Grading
        if comp >= 85.0 and rank <= max(2, int(0.20 * N)):
            grade = "A+ Elite"
            grade_code = "a_plus"
            grade_color = "#7e22ce"
            grade_counts["a_plus"] += 1
            grade_counts["A+ Elite"] += 1
        elif comp >= 72.0 and rank <= max(4, int(0.45 * N)):
            grade = "A High Alignment"
            grade_code = "a"
            grade_color = "#15803d"
            grade_counts["a"] += 1
            grade_counts["A High Alignment"] += 1
        elif comp >= 58.0:
            grade = "B+ Competitive"
            grade_code = "b_plus"
            grade_color = "#1d4ed8"
            grade_counts["b_plus"] += 1
            grade_counts["B+ Competitive"] += 1
        elif comp >= 45.0:
            grade = "B Foundational"
            grade_code = "b"
            grade_color = "#a16207"
            grade_counts["b"] += 1
            grade_counts["B Foundational"] += 1
        else:
            grade = "C Development Required"
            grade_code = "c"
            grade_color = "#dc2626"
            grade_counts["c"] += 1
            grade_counts["C Development Required"] += 1

        c = item["candidate"]
        delta_val = round(comp - cohort_mean, 1)
        standing_obj = {
            "cohort_rank": rank,
            "relative_grade": grade,
            "percentile": pctile,
            "delta_from_mean": delta_val,
            "composite_score": comp,
            "scoring_mode": "evaluated" if item["interview_score"] is not None else "pending_screening",
            "summary": f"Rank #{rank} of {N} ({pctile}th %ile) | {delta_str} vs Mean"
        }

        candidate_metrics_map[c.id] = {
            "candidate_id": c.id,
            "composite_score": comp,
            "scoring_formula": item["scoring_formula"],
            "relative_rank": rank,
            "relative_percentile": pctile,
            "relative_grade": grade,
            "relative_grade_code": grade_code,
            "relative_grade_color": grade_color,
            "cohort_delta": delta_str,
            "cohort_standing": standing_obj,
            "cohort_standing_text": f"Rank #{rank} of {N} ({pctile}th %ile) | {delta_str} vs Mean",
            "skill_match_score": item["skill_score"],
            "matched_skills": item["matched_skills"],
            "missing_skills": item["missing_skills"],
            "match_reason": item["match_reason"],
            "interview_score": item["interview_score"],
            "interview_type": item["interview_type"],
            "aptitude_score": item["aptitude_score"],
            "profile_score": item["profile_score"],
            "applied_job_id": item["job"].id if item["job"] else None,
            "applied_job_title": item["job"].title if item["job"] else "General Talent Pool",
        }

    cohort_benchmark = {
        "mean_score": round(cohort_mean, 1),
        "cohort_mean": round(cohort_mean, 1),
        "median_score": round(cohort_median, 1),
        "cohort_median": round(cohort_median, 1),
        "top_score": round(cohort_top, 1),
        "cohort_max": round(cohort_top, 1),
        "total_evaluated": N,
        "grade_counts": grade_counts,
        "grade_distribution": grade_counts,
        "formula_description": "Composite = 40% Job Skill Match + 35% Screening + 15% Aptitude + 10% Profile Credentials. Relative ranks benchmarked against active cohort.",
        "scoring_formula": "Composite = 40% Job Skill Match + 35% Screening + 15% Aptitude + 10% Profile Credentials (or 55% Skill + 30% Aptitude + 15% Profile if pending screening)."
    }

    return candidate_metrics_map, cohort_benchmark


@router.get("/candidates")
async def list_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all candidates with relative marking metrics and transparent scoring breakdown."""
    all_candidates = db.query(Candidate).all()
    metrics_map, cohort_benchmark = calculate_cohort_relative_scoring(db)

    candidate_items = []
    for c in all_candidates:
        metrics = metrics_map.get(c.id, {})

        candidate_items.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": getattr(c, "phone", "") or "",
            "source": getattr(c, "source", "Direct") or "Direct",
            "current_status": c.current_status or "Applied",
            "screening_score": getattr(c, "screening_score", None),
            "screening_summary": getattr(c, "screening_summary", None),
            "screening_recommendation": getattr(c, "screening_recommendation", None),
            "skills": c.skills or [],
            "matched_skills": metrics.get("matched_skills", []),
            "missing_skills": metrics.get("missing_skills", []),
            "match_score": metrics.get("skill_match_score", 0.0),
            "match_reason": metrics.get("match_reason", ""),
            "interview_score": metrics.get("interview_score"),
            "interview_type": metrics.get("interview_type", "Pending Screening"),
            "aptitude_score": metrics.get("aptitude_score", 70.0),
            "profile_score": metrics.get("profile_score", 50.0),
            "composite_score": metrics.get("composite_score", 0.0),
            "scoring_formula": metrics.get("scoring_formula", ""),
            "relative_rank": metrics.get("relative_rank", len(all_candidates)),
            "relative_percentile": metrics.get("relative_percentile", 0.0),
            "relative_grade": metrics.get("relative_grade", "B Foundational"),
            "relative_grade_code": metrics.get("relative_grade_code", "b"),
            "relative_grade_color": metrics.get("relative_grade_color", "#d97706"),
            "cohort_delta": metrics.get("cohort_delta", "+0.0%"),
            "cohort_standing": metrics.get("cohort_standing", ""),
            "applied_job_id": metrics.get("applied_job_id"),
            "applied_job_title": metrics.get("applied_job_title", "General Talent Pool"),
            "entities": c.entities,
            "profile": c.profile,
            "education": c.profile.get("education", []),
            "experience": c.profile.get("experience", []),
            "projects": c.profile.get("projects", []),
            "certifications": c.profile.get("certifications", []),
            "aptitude_scores": c.aptitude_scores,
            "created_at": str(c.created_at),
            "global_rank": metrics.get("relative_rank", len(all_candidates)),
            "total_candidates": len(all_candidates)
        })

    # Sort candidates by relative rank ascending
    candidate_items.sort(key=lambda x: x["relative_rank"])

    return {
        "candidates": candidate_items,
        "total": len(candidate_items),
        "cohort_benchmark": cohort_benchmark
    }


@router.get("/candidate/{candidate_id}")
async def get_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full candidate profile with relative marking metrics and scoring proof."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    metrics_map, cohort_benchmark = calculate_cohort_relative_scoring(db)
    metrics = metrics_map.get(candidate.id, {})

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

    app = db.query(JobApplication).filter(JobApplication.candidate_id == candidate.id).order_by(JobApplication.created_at.desc()).first()
    job = app.job if app else None

    return {
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "phone": getattr(candidate, "phone", "") or "",
        "source": getattr(candidate, "source", "Direct") or "Direct",
        "current_status": candidate.current_status or "Applied",
        "screening_score": getattr(candidate, "screening_score", None),
        "screening_summary": getattr(candidate, "screening_summary", None),
        "screening_recommendation": getattr(candidate, "screening_recommendation", None),
        "applied_job_id": job.id if job else None,
        "applied_job_title": job.title if job else "General Talent Pool",
        "skills": candidate.skills or [],
        "matched_skills": metrics.get("matched_skills", []),
        "missing_skills": metrics.get("missing_skills", []),
        "skill_match_score": metrics.get("skill_match_score", 0.0),
        "match_reason": metrics.get("match_reason", ""),
        "interview_score": metrics.get("interview_score"),
        "interview_type": metrics.get("interview_type", "Pending Screening"),
        "aptitude_score": metrics.get("aptitude_score", 70.0),
        "profile_score": metrics.get("profile_score", 50.0),
        "composite_score": metrics.get("composite_score", 0.0),
        "scoring_formula": metrics.get("scoring_formula", ""),
        "relative_rank": metrics.get("relative_rank", 1),
        "relative_percentile": metrics.get("relative_percentile", 100.0),
        "relative_grade": metrics.get("relative_grade", "B Foundational"),
        "relative_grade_code": metrics.get("relative_grade_code", "b"),
        "relative_grade_color": metrics.get("relative_grade_color", "#d97706"),
        "cohort_delta": metrics.get("cohort_delta", "+0.0%"),
        "cohort_standing": metrics.get("cohort_standing", ""),
        "cohort_benchmark": cohort_benchmark,
        "entities": candidate.entities,
        "profile": candidate.profile,
        "education": candidate.profile.get("education", []),
        "experience": candidate.profile.get("experience", []),
        "projects": candidate.profile.get("projects", []),
        "certifications": candidate.profile.get("certifications", []),
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
    """Get the candidate profile linked to the current user with exact relative marking metrics."""
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

    assessments = db.query(SkillAssessment).filter(SkillAssessment.candidate_id == candidate.id).all()
    skill_scores = {a.skill_name: a.percentage for a in assessments if a.is_completed}
    is_verified = len(skill_scores) >= 1

    # Unified relative marking calculation
    metrics_map, cohort_benchmark = calculate_cohort_relative_scoring(db)
    my_metrics = metrics_map.get(candidate.id, {})
    all_candidates_count = len(metrics_map)

    # Calculate mastery percentage
    apt_mastery = 0
    if candidate.aptitude_scores:
        s_vals = [normalize_apt_score(x) for x in candidate.aptitude_scores.values()]
        apt_mastery = sum(s_vals) / len(s_vals) if s_vals else 0

    # Profile completion
    completion = 0 
    if candidate.name: completion += 10
    if candidate.email: completion += 10
    if candidate.skills: completion += 20
    if candidate.aptitude_scores: completion += 30
    if is_verified: completion += 30

    return {
        "profile": {
            "candidate_id": candidate.id,
            "id": candidate.id,
            "name": current_user.name,
            "email": current_user.email,
            "current_status": candidate.current_status or "Applied",
            "screening_score": getattr(candidate, "screening_score", None),
            "screening_summary": getattr(candidate, "screening_summary", None),
            "screening_recommendation": getattr(candidate, "screening_recommendation", None),
            "skills": candidate.skills,
            "entities": candidate.entities,
            "profile": candidate.profile,
            "education": candidate.profile.get("education", []),
            "experience": candidate.profile.get("experience", []),
            "projects": candidate.profile.get("projects", []),
            "certifications": candidate.profile.get("certifications", []),
            "skills_by_category": candidate.profile.get("skills_by_category", {}),
            "chunks": chunks,
            "aptitude_scores": candidate.aptitude_scores,
            "aptitude_mastery": int(apt_mastery),
            "skill_scores": skill_scores,
            "overall_score": my_metrics.get("composite_score", 0.0),
            "composite_score": my_metrics.get("composite_score", 0.0),
            "scoring_formula": my_metrics.get("scoring_formula", ""),
            "is_verified": is_verified,
            "created_at": str(candidate.created_at),
            "completion_percentage": min(100, int(completion)),
            "global_rank": my_metrics.get("relative_rank", 1),
            "relative_percentile": my_metrics.get("relative_percentile", 100.0),
            "relative_grade": my_metrics.get("relative_grade", "B+ Competitive"),
            "relative_grade_code": my_metrics.get("relative_grade_code", "b_plus"),
            "relative_grade_color": my_metrics.get("relative_grade_color", "#2563eb"),
            "cohort_delta": my_metrics.get("cohort_delta", "+0.0%"),
            "cohort_standing": my_metrics.get("cohort_standing", ""),
            "cohort_mean": cohort_benchmark.get("mean_score", 70.0),
            "total_candidates": all_candidates_count,
            "system_max_score": cohort_benchmark.get("top_score", 100.0)
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
