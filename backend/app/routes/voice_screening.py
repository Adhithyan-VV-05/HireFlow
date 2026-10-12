"""API Endpoints for Voice-Based Screening (Milestone 4)."""

import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import (
    User,
    Candidate,
    Job,
    VoiceScreeningSession,
    VoiceScreeningResponse,
)
from app.core.auth import get_current_user, require_interviewer
from app.core.voice_screening import (
    generate_voice_screening_questions,
    evaluate_voice_response,
    finalize_voice_screening_assessment,
)

router = APIRouter(prefix="/api/voice-screening", tags=["voice_screening"])


# ── Schemas ────────────────────────────────────────────────────────────

class StartVoiceScreeningRequest(BaseModel):
    candidate_id: str
    job_id: Optional[str] = None
    question_count: Optional[int] = 3


class SubmitVoiceResponseRequest(BaseModel):
    question_index: int
    candidate_response: str  # STT recognized transcript
    duration_seconds: Optional[float] = 0.0


# ── Endpoints ──────────────────────────────────────────────────────────

@router.post("/start")
async def start_voice_screening(
    request: StartVoiceScreeningRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initialize a voice screening session with tailored oral questions."""
    candidate = None
    if request.candidate_id:
        candidate = db.query(Candidate).filter(Candidate.id == request.candidate_id).first()
    if not candidate:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        candidate = db.query(Candidate).filter(Candidate.email == current_user.email).first()
    if not candidate and current_user.role == "candidate":
        candidate = Candidate(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            name=current_user.name or "Candidate",
            email=current_user.email,
            current_status="Applied",
            skills_json="[]",
            entities_json="{}",
            aptitude_scores_json="{}"
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
    if not candidate and current_user.role == "interviewer":
        candidate = db.query(Candidate).first()

    if not candidate:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate profile not found")

    job = None
    if request.job_id:
        job = db.query(Job).filter(Job.id == request.job_id).first()
    if not job:
        # Default to first job if exists
        job = db.query(Job).first()

    q_count = max(1, min(6, request.question_count or 3))
    questions = generate_voice_screening_questions(
        candidate=candidate,
        job=job,
        num_questions=q_count
    )

    session_id = str(uuid.uuid4())
    session = VoiceScreeningSession(
        id=session_id,
        candidate_id=candidate.id,
        job_id=job.id if job else None,
        interviewer_id=current_user.id if current_user.role == "interviewer" else None,
        status="ready",
        question_count=len(questions),
        current_question_index=0,
        questions_json=json.dumps(questions),
        overall_score=0.0,
        recommendation="",
        summary_report_json=json.dumps({}),
        duration_seconds=0,
        audio_stored=False,
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()

    return {
        "session_id": session.id,
        "status": "ready",
        "candidate_id": candidate.id,
        "candidate_name": candidate.name,
        "candidate_email": candidate.email,
        "job_id": job.id if job else None,
        "job_title": job.title if job else "General Screening",
        "question_count": len(questions),
        "current_question_index": 0,
        "questions": questions,
        "current_question": questions[0] if questions else None,
        "created_at": session.created_at.isoformat(),
        "storage_mode": "persistent_transcripts_session_audio"
    }


@router.get("/session/{session_id}")
async def get_voice_screening_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve current state of a voice screening session."""
    session = db.query(VoiceScreeningSession).filter(VoiceScreeningSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice screening session not found")

    questions = session.questions
    current_idx = session.current_question_index
    current_q = questions[current_idx] if 0 <= current_idx < len(questions) else None

    responses = [
        {
            "question_index": r.question_index,
            "question": r.question,
            "skill": r.skill,
            "candidate_response": r.candidate_response,
            "score": r.score,
            "evaluation": r.evaluation,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None
        }
        for r in session.responses
    ]

    return {
        "session_id": session.id,
        "candidate_id": session.candidate_id,
        "candidate_name": session.candidate.name if session.candidate else "Candidate",
        "job_id": session.job_id,
        "job_title": session.job.title if session.job else "General Screening",
        "status": session.status,
        "current_question_index": current_idx,
        "question_count": session.question_count,
        "current_question": current_q,
        "questions": questions,
        "responses": responses,
        "overall_score": session.overall_score,
        "recommendation": session.recommendation,
        "summary_report": session.summary_report,
    }


@router.post("/session/{session_id}/answer")
async def submit_voice_response(
    session_id: str,
    request: SubmitVoiceResponseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit candidate transcribed answer for a voice screening question."""
    session = db.query(VoiceScreeningSession).filter(VoiceScreeningSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice screening session not found")

    if session.status == "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Session is already completed.")

    questions = session.questions
    if request.question_index < 0 or request.question_index >= len(questions):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid question_index {request.question_index}")

    current_q = questions[request.question_index]
    job_title = session.job.title if session.job else "Software Engineer"

    # Evaluate the spoken answer transcript
    evaluation = evaluate_voice_response(
        question=current_q.get("question", ""),
        candidate_response=request.candidate_response,
        skill=current_q.get("skill", ""),
        expected_focus=current_q.get("expected_focus", []),
        job_title=job_title
    )

    # Store response
    response_record = VoiceScreeningResponse(
        id=str(uuid.uuid4()),
        session_id=session.id,
        question_index=request.question_index,
        question=current_q.get("question", ""),
        question_type=current_q.get("type", "technical"),
        skill=current_q.get("skill", ""),
        candidate_response=request.candidate_response,
        duration_seconds=request.duration_seconds or 0.0,
        score=evaluation.get("score", 0.0),
        evaluation_json=json.dumps(evaluation),
        submitted_at=datetime.utcnow()
    )
    db.add(response_record)

    # Advance state
    session.current_question_index = request.question_index + 1
    session.status = "in_progress"

    # Check if this was the last question
    is_completed = session.current_question_index >= session.question_count
    db.commit()

    if is_completed:
        report = finalize_voice_screening_assessment(session, db)
        return {
            "status": "completed",
            "is_completed": True,
            "question_index": request.question_index,
            "evaluation": evaluation,
            "final_report": report
        }

    next_idx = session.current_question_index
    next_q = questions[next_idx] if next_idx < len(questions) else None

    return {
        "status": "in_progress",
        "is_completed": False,
        "question_index": request.question_index,
        "next_question_index": next_idx,
        "evaluation": evaluation,
        "next_question": next_q
    }


@router.post("/session/{session_id}/audio-answer")
async def submit_voice_audio_response(
    session_id: str,
    question_index: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transcribe spoken audio via Faster-Whisper and submit evaluated answer."""
    from app.services.whisper_service import transcribe_audio_bytes
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty audio file received")

    # Transcribe with Faster-Whisper
    whisper_result = transcribe_audio_bytes(
        audio_bytes=audio_bytes,
        filename_hint=file.filename or "recording.webm",
        language="en"
    )
    transcript_text = whisper_result.get("text", "").strip()

    req = SubmitVoiceResponseRequest(
        question_index=question_index,
        candidate_response=transcript_text,
        duration_seconds=whisper_result.get("duration", 0.0)
    )
    result = await submit_voice_response(session_id=session_id, request=req, db=db, current_user=current_user)
    result["transcript"] = transcript_text
    result["stt_engine"] = "Faster-Whisper"
    return result


@router.post("/session/{session_id}/complete")
async def complete_voice_screening(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Finalize the voice screening session and generate assessment report."""
    session = db.query(VoiceScreeningSession).filter(VoiceScreeningSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice screening session not found")

    report = finalize_voice_screening_assessment(session, db)
    return report


@router.get("/session/{session_id}/report")
async def get_voice_screening_report(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full screening evaluation and transcript report."""
    session = db.query(VoiceScreeningSession).filter(VoiceScreeningSession.id == session_id).first()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice screening session not found")

    responses = [
        {
            "question_index": r.question_index,
            "question": r.question,
            "skill": r.skill,
            "candidate_response": r.candidate_response,
            "score": r.score,
            "evaluation": r.evaluation,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None
        }
        for r in session.responses
    ]

    return {
        "session_id": session.id,
        "candidate_id": session.candidate_id,
        "candidate_name": session.candidate.name if session.candidate else "Candidate",
        "candidate_email": session.candidate.email if session.candidate else "",
        "job_id": session.job_id,
        "job_title": session.job.title if session.job else "General Screening",
        "status": session.status,
        "overall_score": session.overall_score,
        "recommendation": session.recommendation,
        "dimension_breakdown": {
            "technical_knowledge": session.technical_score,
            "response_relevance": session.relevance_score,
            "communication_clarity": session.communication_score,
            "completeness": session.completeness_score,
            "role_knowledge": session.role_knowledge_score
        },
        "responses": responses,
        "summary_report": session.summary_report,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "recording_storage_note": "Session transcript and dimension evaluations are permanently stored. Audio buffer processed in-session."
    }


@router.get("/candidate/{candidate_id}")
async def get_candidate_voice_screenings(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List voice screenings for a candidate."""
    sessions = db.query(VoiceScreeningSession).filter(
        VoiceScreeningSession.candidate_id == candidate_id
    ).order_by(VoiceScreeningSession.created_at.desc()).all()

    return {
        "candidate_id": candidate_id,
        "total_screenings": len(sessions),
        "screenings": [
            {
                "session_id": s.id,
                "job_title": s.job.title if s.job else "General",
                "status": s.status,
                "overall_score": s.overall_score,
                "recommendation": s.recommendation,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in sessions
        ]
    }
