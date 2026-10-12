"""ATS Integration API Routes for HireFlow AI."""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import User
from app.core.auth import get_current_user, require_interviewer
from app.services.ats import get_ats_provider, VALID_ATS_STATUSES

router = APIRouter(prefix="/api/ats", tags=["ats"])


# ── Pydantic Request Schemas ──────────────────────────────────────────

class CreateATSCandidateRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    source: Optional[str] = "Direct ATS Upload"
    status: Optional[str] = "Applied"
    skills: Optional[List[str]] = []
    job_id: Optional[str] = None


class UpdateCandidateStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = None
    job_id: Optional[str] = None


class CreateATSInterviewRequest(BaseModel):
    job_id: str
    interview_type: Optional[str] = "mixed"
    question_count: Optional[int] = 5


# ── ATS Endpoints ─────────────────────────────────────────────────────

@router.post("/candidates", status_code=status.HTTP_201_CREATED)
async def create_candidate_endpoint(
    request: CreateATSCandidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Create a candidate in the ATS. Interviewer only."""
    provider = get_ats_provider()
    try:
        candidate = provider.create_candidate(request.dict(), db)
        return {"message": "Candidate created in ATS", "candidate": candidate}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/candidates")
async def list_candidates_endpoint(
    stage: Optional[str] = Query(None, alias="status"),
    job_id: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all candidates in ATS with optional status, job_id, or search query filter."""
    provider = get_ats_provider()
    filters = {}
    if stage:
        filters["status"] = stage
    if job_id:
        filters["job_id"] = job_id
    if q:
        filters["q"] = q

    candidates = provider.list_candidates(filters, db)
    return {
        "candidates": candidates,
        "total": len(candidates),
        "available_statuses": VALID_ATS_STATUSES
    }


@router.get("/candidates/{candidate_id}")
async def get_candidate_endpoint(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for a single candidate."""
    provider = get_ats_provider()
    candidate = provider.get_candidate(candidate_id, db)
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found in ATS")
    return candidate


@router.put("/candidates/{candidate_id}/status")
@router.patch("/candidates/{candidate_id}/status")
async def update_candidate_status_endpoint(
    candidate_id: str,
    request: UpdateCandidateStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Update a candidate's ATS stage and log status transition. Interviewer only."""
    provider = get_ats_provider()
    try:
        result = provider.update_candidate_status(
            candidate_id=candidate_id,
            new_status=request.status,
            changed_by=current_user.name or current_user.email,
            notes=request.notes,
            job_id=request.job_id,
            db=db
        )
        return {"message": "Candidate status updated", "details": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")


@router.get("/candidates/{candidate_id}/history")
async def get_candidate_history_endpoint(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full chronological audit log of stage transitions for a candidate."""
    provider = get_ats_provider()
    # Check candidate exists
    cand = provider.get_candidate(candidate_id, db)
    if not cand:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

    history = provider.get_candidate_history(candidate_id, db)
    return {
        "candidate_id": candidate_id,
        "candidate_name": cand.get("name"),
        "history": history
    }


@router.post("/candidates/{candidate_id}/interview")
async def schedule_candidate_interview_endpoint(
    candidate_id: str,
    request: CreateATSInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Associate an interview session with a candidate in the ATS."""
    provider = get_ats_provider()
    try:
        data = {
            "candidate_id": candidate_id,
            "job_id": request.job_id,
            "interview_type": request.interview_type,
            "question_count": request.question_count,
            "interviewer_id": current_user.id
        }
        res = provider.create_interview(data, db)
        return {"message": "Interview created in ATS", "interview": res}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/candidates/{candidate_id}/interviews")
async def list_candidate_interviews_endpoint(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all interviews associated with a candidate."""
    provider = get_ats_provider()
    interviews = provider.get_candidate_interviews(candidate_id, db)
    return {
        "candidate_id": candidate_id,
        "interviews": interviews
    }


@router.get("/candidates/{candidate_id}/match/{job_id}")
async def get_ats_candidate_job_match_endpoint(
    candidate_id: str,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get Hugging Face powered ATS semantic match details between candidate and job."""
    from app.services.ats_intelligence import get_candidate_ats_match
    match_data = get_candidate_ats_match(candidate_id=candidate_id, job_id=job_id, db=db)
    if not match_data:
        raise HTTPException(status_code=404, detail="Candidate or Job not found.")
    return match_data

