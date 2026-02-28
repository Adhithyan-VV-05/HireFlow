"""Interview & Aptitude API endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db
from app.db.models import User
from app.core.auth import get_current_user
from app.schemas import StartInterviewRequest, InterviewMessageRequest, ScheduleInterviewRequest

router = APIRouter(prefix="/api", tags=["interview"])


# ── Aptitude schemas ────────────────────────────────────────────

class StartAptitudeRequest(BaseModel):
    candidate_id: str


class AptitudeMessageRequest(BaseModel):
    session_id: str
    message: str


class InvitationResponse(BaseModel):
    interview_id: str
    response: str  # 'accepted' or 'skipped'


# ── Original interview endpoints ────────────────────────────────

@router.post("/start-interview")
async def start_interview_endpoint(
    request: StartInterviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Start an AI interview session."""
    from app.core.interview import start_interview
    try:
        result = start_interview(request.candidate_id, request.job_id)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error starting interview: {str(e)}")


@router.post("/interview-message")
async def interview_message_endpoint(
    request: InterviewMessageRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a message in an interview session."""
    from app.core.interview import process_message
    try:
        result = process_message(request.session_id, request.user_message)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error processing message: {str(e)}")


@router.get("/interview-result/{session_id}")
async def interview_result_endpoint(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get the full result of an interview session."""
    from app.core.interview import get_interview_result
    try:
        result = get_interview_result(session_id)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── Aptitude-test endpoints ────────────────────────────────────

@router.post("/start-aptitude")
async def start_aptitude_endpoint(
    request: StartAptitudeRequest,
    current_user: User = Depends(get_current_user),
):
    """Start a personalised AI aptitude test for a candidate."""
    from app.core.aptitude import start_aptitude_session
    try:
        result = start_aptitude_session(request.candidate_id)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error starting aptitude session: {str(e)}")


@router.post("/aptitude-message")
async def aptitude_message_endpoint(
    request: AptitudeMessageRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a message in an aptitude test session."""
    from app.core.aptitude import process_aptitude_message
    try:
        result = process_aptitude_message(request.session_id, request.message)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error processing aptitude message: {str(e)}")


@router.get("/aptitude-result/{session_id}")
async def aptitude_result_endpoint(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get full result of a completed aptitude test."""
    from app.core.aptitude import get_aptitude_result
    try:
        result = get_aptitude_result(session_id)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/scheduled-interviews")
async def scheduled_interviews_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.db.models import Interview, Candidate, Job
    
    query = db.query(Interview)

    if current_user.role == "interviewer":
        # Only show interviews this recruiter created
        query = query.filter(Interview.interviewer_id == current_user.id)
    elif current_user.role == "candidate":
        # Find the candidate profile for this user
        candidate_profile = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not candidate_profile:
            return []
        query = query.filter(Interview.candidate_id == candidate_profile.id)
    
    interviews = query.all()
    results = []
    for iv in interviews:
        candidate = db.query(Candidate).filter(Candidate.id == iv.candidate_id).first()
        job = db.query(Job).filter(Job.id == iv.job_id).first()
        
        results.append({
            "id": iv.id,
            "candidate_name": candidate.name if candidate else "Candidate",
            "candidate_id": iv.candidate_id,
            "candidate_email": candidate.email if candidate else "",
            "interviewer_id": iv.interviewer_id,
            "job_id": iv.job_id,
            "job_title": job.title if job else "General",
            "job_role": job.title if job else "General",
            "job_description": job.description if job else "",
            "scheduled_at": iv.scheduled_at,
            "meeting_link": iv.meeting_link,
            "status": iv.status,
            "schedule_status": iv.schedule_status
        })

    return results


@router.post("/schedule-interview")
async def schedule_interview_endpoint(
    request: ScheduleInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Schedule a video interview for a candidate."""
    import uuid
    from datetime import datetime
    from app.db.models import Interview, Candidate, Job
    from app.services.email import generate_interview_email, send_interview_email

    # Map candidate_id to user_id if needed, but here models.py Interview uses candidate_id (string)
    # Let's just create the interview object
    try:
        dt = datetime.fromisoformat(request.scheduled_at.replace('Z', '+00:00'))
    except Exception:
        raise HTTPException(400, "Invalid date format. Use ISO format.")

    interview_id = str(uuid.uuid4())
    new_interview = Interview(
        id=interview_id,
        candidate_id=request.candidate_id,
        interviewer_id=current_user.id,
        job_id=request.job_id,
        scheduled_at=dt,
        is_video_call=request.is_video_call,
        status="active",
        schedule_status="offered",  # Candidate needs to confirm
        created_at=datetime.utcnow()
    )
    
    db.add(new_interview)
    db.commit()

    return {"message": "Interview offer sent to candidate", "id": interview_id}


@router.post("/respond-interview-invitation")
async def respond_invitation_endpoint(
    request: InvitationResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate responds to an interview invitation."""
    from app.db.models import Interview
    
    interview = db.query(Interview).filter(Interview.id == request.interview_id).first()
    if not interview:
        raise HTTPException(404, "Interview offer not found")
        
    if request.response not in ["accepted", "skipped"]:
        raise HTTPException(400, "Invalid response. Use 'accepted' or 'skipped'.")
        
    interview.schedule_status = request.response
    db.commit()
    
    return {"message": f"Invitation {request.response}"}
