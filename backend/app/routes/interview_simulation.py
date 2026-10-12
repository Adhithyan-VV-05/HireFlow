"""API Endpoints for Interview Question Generation and AI Interview Simulation."""

import asyncio
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import User, Candidate, Job, InterviewSession
from app.core.auth import get_current_user, require_interviewer
from app.core.question_generator import generate_interview_questions
from app.core.interview_simulation import (
    start_simulation,
    launch_simulation,
    get_current_question,
    submit_candidate_answer,
    complete_simulation,
    get_simulation_report,
    get_live_simulation_status,
    register_session_listener,
    unregister_session_listener
)

router = APIRouter(prefix="/api/interviews", tags=["interview_simulation"])


# ── Pydantic Request Schemas ──────────────────────────────────────────

class GenerateQuestionsRequest(BaseModel):
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    candidate_id: Optional[str] = None
    question_type: Optional[str] = "mixed"
    experience_level: Optional[str] = "Mid-Senior"
    num_questions: Optional[int] = 5
    technical_count: Optional[int] = None
    behavioral_count: Optional[int] = None
    situational_count: Optional[int] = None
    hr_count: Optional[int] = None
    resume_based_count: Optional[int] = None
    recruiter_conditions: Optional[str] = None


class StartSimulationRequest(BaseModel):
    candidate_id: str
    job_id: str
    interview_type: Optional[str] = "mixed"
    num_questions: Optional[int] = 5
    technical_count: Optional[int] = None
    behavioral_count: Optional[int] = None
    situational_count: Optional[int] = None
    hr_count: Optional[int] = None
    resume_based_count: Optional[int] = None
    category_weights: Optional[Dict[str, float]] = None
    initial_status: Optional[str] = "in_progress"  # "scheduled" or "in_progress"
    recruiter_conditions: Optional[str] = None


class SubmitAnswerRequest(BaseModel):
    question_index: int
    answer: str


# ── Feature 1: Role-Specific Question Generation Endpoint ────────────

@router.post("/questions/generate")
async def generate_questions_endpoint(
    request: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate role-specific interview questions based on job and candidate context."""
    job_title = request.job_title or ""
    job_description = ""
    required_skills = []
    preferred_skills = []

    if request.job_id:
        job = db.query(Job).filter(Job.id == request.job_id).first()
        if job:
            job_title = job.title or job_title
            job_description = job.description or ""
            required_skills = job.required_skills or []

    if not job_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'job_title' or valid 'job_id' must be provided."
        )

    candidate_skills = []
    candidate_resume_text = ""
    candidate_name = "Candidate"

    if request.candidate_id:
        cand = db.query(Candidate).filter(Candidate.id == request.candidate_id).first()
        if cand:
            candidate_skills = cand.skills
            candidate_resume_text = cand.raw_text
            candidate_name = cand.name or "Candidate"

    try:
        result = generate_interview_questions(
            job_title=job_title,
            job_description=job_description,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            candidate_skills=candidate_skills,
            candidate_resume_text=candidate_resume_text,
            candidate_name=candidate_name,
            experience_level=request.experience_level,
            interview_type=request.question_type,
            num_questions=request.num_questions,
            technical_count=request.technical_count,
            behavioral_count=request.behavioral_count,
            situational_count=request.situational_count,
            hr_count=request.hr_count,
            resume_based_count=request.resume_based_count,
            recruiter_conditions=request.recruiter_conditions
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


# ── Feature 3: AI Interview Simulation Lifecycle Endpoints ───────────

@router.post("/simulation/start")
async def start_simulation_endpoint(
    request: StartSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pre-generate question set and initialize an interview simulation session."""
    # Ensure authorization
    if current_user.role == "candidate":
        cand = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not cand or cand.id != request.candidate_id:
            raise HTTPException(status_code=403, detail="Candidates can only start interviews for their own profile.")

    try:
        interviewer_id = current_user.id if current_user.role == "interviewer" else None
        session_data = start_simulation(
            candidate_id=request.candidate_id,
            job_id=request.job_id,
            interview_type=request.interview_type,
            num_questions=request.num_questions,
            technical_count=request.technical_count,
            behavioral_count=request.behavioral_count,
            situational_count=request.situational_count,
            hr_count=request.hr_count,
            resume_based_count=request.resume_based_count,
            category_weights=request.category_weights,
            interviewer_id=interviewer_id,
            initial_status=request.initial_status,
            recruiter_conditions=request.recruiter_conditions,
            db=db
        )
        return session_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting simulation: {str(e)}")


@router.post("/simulation/{session_id}/launch")
async def launch_simulation_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Launch a scheduled interview session when candidate enters the room."""
    try:
        data = launch_simulation(session_id, user=current_user, db=db)
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulation/{session_id}/current")
async def get_current_question_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the current pending question for an active interview simulation."""
    try:
        data = get_current_question(session_id, user=current_user, db=db)
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simulation/{session_id}/answer")
async def submit_answer_endpoint(
    session_id: str,
    request: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a candidate's answer for the current question."""
    try:
        result = submit_candidate_answer(
            session_id=session_id,
            question_index=request.question_index,
            answer_text=request.answer,
            user=current_user,
            db=db
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing answer: {str(e)}")


@router.post("/simulation/{session_id}/complete")
async def complete_simulation_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually complete and finalize an interview simulation session."""
    try:
        result = complete_simulation(session_id, db=db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulation/{session_id}/report")
async def get_simulation_report_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full interview simulation report with Q&As, evaluations, and summary."""
    try:
        report = get_simulation_report(session_id, user=current_user, db=db)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Feature 4: Live HR Interview Tracking Endpoints ───────────────────

@router.get("/simulation/{session_id}/live-status")
async def get_live_simulation_status_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve live progress metrics for HR monitoring."""
    try:
        status_info = get_live_simulation_status(session_id, db)
        return status_info
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulation/{session_id}/stream")
async def stream_simulation_events_endpoint(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Server-Sent Events (SSE) stream for real-time live progress updates to HR."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    queue = register_session_listener(session_id)

    async def event_generator():
        try:
            # Yield initial state
            initial_status = get_live_simulation_status(session_id, db)
            yield f"data: {json.dumps(initial_status)}\n\n"

            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(data)}\n\n"
                    if data.get("interview_status") == "completed":
                        break
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat comment
                    yield ": keep-alive\n\n"
        finally:
            unregister_session_listener(session_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/simulation/active")
async def list_active_simulations_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """List all currently active or scheduled simulation sessions for HR live monitoring."""
    sessions = db.query(InterviewSession).filter(
        InterviewSession.status.in_(["scheduled", "in_progress"])
    ).order_by(InterviewSession.created_at.desc()).all()

    results = []
    for s in sessions:
        candidate = db.query(Candidate).filter(Candidate.id == s.candidate_id).first()
        job = db.query(Job).filter(Job.id == s.job_id).first()
        results.append({
            "session_id": s.id,
            "candidate_id": s.candidate_id,
            "candidate_name": candidate.name if candidate else "Candidate",
            "candidate_email": candidate.email if candidate else "",
            "job_id": s.job_id,
            "job_title": job.title if job else "General Role",
            "interview_type": s.interview_type,
            "status": s.status,
            "question_count": s.question_count,
            "current_question_index": s.current_question_index,
            "progress": f"{s.current_question_index} / {s.question_count}",
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })

    return {"active_simulations": results}


@router.get("/simulation/candidate/{candidate_id}")
async def list_candidate_simulations_endpoint(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all simulation sessions for a candidate."""
    if current_user.role == "candidate":
        cand = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not cand or cand.id != candidate_id:
            raise HTTPException(status_code=403, detail="Access denied.")

    sessions = db.query(InterviewSession).filter(
        InterviewSession.candidate_id == candidate_id
    ).order_by(InterviewSession.created_at.desc()).all()

    results = []
    for s in sessions:
        job = db.query(Job).filter(Job.id == s.job_id).first()
        results.append({
            "session_id": s.id,
            "job_id": s.job_id,
            "job_title": job.title if job else "General Role",
            "interview_type": s.interview_type,
            "status": s.status,
            "overall_score": s.overall_score,
            "question_count": s.question_count,
            "current_question_index": s.current_question_index,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        })

    return {"simulations": results}
