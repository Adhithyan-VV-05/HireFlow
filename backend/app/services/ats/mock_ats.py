"""Mock ATS Provider using HireFlow's persistent SQLite database models.

Implements full candidate management, stage transitions, status history logging,
and interview associations without relying on ephemeral in-memory lists or external API keys.
"""

import uuid
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.services.ats.base import ATSProvider
from app.db.models import (
    Candidate,
    Job,
    JobApplication,
    CandidateStatusHistory,
    InterviewSession,
    Interview,
    User
)

# Canonical list of valid ATS pipeline statuses
VALID_ATS_STATUSES = [
    "Applied",
    "Screening",
    "Screened",
    "Shortlisted",
    "Interview Scheduled",
    "Interview In Progress",
    "Interview Completed",
    "Interviewed",
    "Offered",
    "Selected",
    "Hired",
    "Rejected",
]


class MockATSProvider(ATSProvider):
    """Local, database-backed ATS provider implementation."""

    def create_candidate(self, candidate_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Create or register a candidate into the ATS."""
        candidate_id = candidate_data.get("id") or str(uuid.uuid4())
        name = candidate_data.get("name", "").strip()
        email = candidate_data.get("email", "").strip()
        phone = candidate_data.get("phone", "").strip()
        source = candidate_data.get("source", "Direct ATS Upload")
        status = candidate_data.get("status", "Applied")
        skills = candidate_data.get("skills", [])
        job_id = candidate_data.get("job_id")

        if status not in VALID_ATS_STATUSES:
            status = "Applied"

        # Check if candidate already exists by email or ID
        existing = None
        if email:
            existing = db.query(Candidate).filter(Candidate.email == email).first()
        if not existing and candidate_id:
            existing = db.query(Candidate).filter(Candidate.id == candidate_id).first()

        if existing:
            # Update candidate details
            if name: existing.name = name
            if phone: existing.phone = phone
            if source: existing.source = source
            if status: existing.current_status = status
            if skills:
                curr_skills = existing.skills
                combined = list(set(curr_skills + skills))
                existing.skills = combined
            cand_obj = existing
        else:
            cand_obj = Candidate(
                id=candidate_id,
                name=name,
                email=email,
                phone=phone,
                source=source,
                current_status=status,
                skills=skills,
                entities={"SKILL": skills},
                created_at=datetime.utcnow()
            )
            db.add(cand_obj)

        # Log initial status in history
        history_entry = CandidateStatusHistory(
            id=str(uuid.uuid4()),
            candidate_id=cand_obj.id,
            job_id=job_id,
            from_status=None,
            to_status=status,
            changed_by="ATS System",
            notes=f"Candidate registered via {source}",
            created_at=datetime.utcnow()
        )
        db.add(history_entry)

        # If job_id was specified, ensure an application record exists
        if job_id:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                app = db.query(JobApplication).filter(
                    JobApplication.candidate_id == cand_obj.id,
                    JobApplication.job_id == job_id
                ).first()
                if not app:
                    app = JobApplication(
                        id=str(uuid.uuid4()),
                        job_id=job_id,
                        candidate_id=cand_obj.id,
                        status=status,
                        created_at=datetime.utcnow()
                    )
                    db.add(app)
                else:
                    app.status = status

        db.commit()
        db.refresh(cand_obj)

        return self.get_candidate(cand_obj.id, db)

    def get_candidate(self, candidate_id: str, db: Session) -> Optional[Dict[str, Any]]:
        """Retrieve candidate record and ATS stage by candidate ID."""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            return None

        # Fetch latest application or job connection
        application = db.query(JobApplication).filter(JobApplication.candidate_id == candidate_id).order_by(JobApplication.created_at.desc()).first()
        job = application.job if application else None

        # Fetch interview count
        interview_count = db.query(InterviewSession).filter(InterviewSession.candidate_id == candidate_id).count()

        return {
            "id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "phone": candidate.phone or "",
            "source": candidate.source or "Direct",
            "current_status": candidate.current_status or (application.status if application else "Applied"),
            "skills": candidate.skills,
            "entities": candidate.entities,
            "applied_job_id": job.id if job else None,
            "applied_job_title": job.title if job else None,
            "total_interviews": interview_count,
            "created_at": candidate.created_at.isoformat() if candidate.created_at else None,
        }

    def list_candidates(self, filters: Optional[Dict[str, Any]], db: Session) -> List[Dict[str, Any]]:
        """List all candidates tracked in the ATS with optional stage/job filters."""
        query = db.query(Candidate)

        status_filter = filters.get("status") if filters else None
        job_filter = filters.get("job_id") if filters else None
        search_query = filters.get("q") if filters else None

        if status_filter:
            query = query.filter(Candidate.current_status == status_filter)

        if search_query:
            term = f"%{search_query}%"
            query = query.filter((Candidate.name.ilike(term)) | (Candidate.email.ilike(term)))

        candidates = query.order_by(Candidate.created_at.desc()).all()

        results = []
        for c in candidates:
            app = db.query(JobApplication).filter(JobApplication.candidate_id == c.id).order_by(JobApplication.created_at.desc()).first()
            if job_filter and (not app or app.job_id != job_filter):
                continue

            job = app.job if app else None
            results.append({
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone or "",
                "source": c.source or "Direct",
                "current_status": c.current_status or (app.status if app else "Applied"),
                "skills": c.skills,
                "applied_job_id": job.id if job else None,
                "applied_job_title": job.title if job else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            })

        return results

    def update_candidate_status(
        self,
        candidate_id: str,
        new_status: str,
        changed_by: str = "Recruiter",
        notes: Optional[str] = None,
        job_id: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Update candidate stage in the ATS and record the status transition."""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found in ATS.")

        if new_status not in VALID_ATS_STATUSES:
            raise ValueError(f"Invalid ATS status '{new_status}'. Allowed: {', '.join(VALID_ATS_STATUSES)}")

        old_status = candidate.current_status or "Applied"
        candidate.current_status = new_status
        if new_status in ["Hired", "Selected"] and not getattr(candidate, "hired_at", None):
            candidate.hired_at = datetime.utcnow()

        # Synchronize linked JobApplication status if exists
        app_query = db.query(JobApplication).filter(JobApplication.candidate_id == candidate_id)
        if job_id:
            app_query = app_query.filter(JobApplication.job_id == job_id)
        app = app_query.first()
        if app:
            app.status = new_status
            if not job_id:
                job_id = app.job_id

        # Record in history
        history_entry = CandidateStatusHistory(
            id=str(uuid.uuid4()),
            candidate_id=candidate_id,
            job_id=job_id,
            from_status=old_status,
            to_status=new_status,
            changed_by=changed_by,
            notes=notes or f"Status changed from {old_status} to {new_status}",
            created_at=datetime.utcnow()
        )
        db.add(history_entry)
        db.commit()

        try:
            from app.routes.analytics import invalidate_analytics_cache
            invalidate_analytics_cache()
        except Exception:
            pass

        return {
            "candidate_id": candidate_id,
            "previous_status": old_status,
            "current_status": new_status,
            "changed_by": changed_by,
            "notes": notes,
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_candidate_history(self, candidate_id: str, db: Session) -> List[Dict[str, Any]]:
        """Retrieve the chronological status transition history for a candidate."""
        records = db.query(CandidateStatusHistory).filter(
            CandidateStatusHistory.candidate_id == candidate_id
        ).order_by(CandidateStatusHistory.created_at.asc()).all()

        history = []
        for r in records:
            job = db.query(Job).filter(Job.id == r.job_id).first() if r.job_id else None
            history.append({
                "id": r.id,
                "candidate_id": r.candidate_id,
                "job_id": r.job_id,
                "job_title": job.title if job else None,
                "from_status": r.from_status,
                "to_status": r.to_status,
                "changed_by": r.changed_by or "System",
                "notes": r.notes,
                "timestamp": r.created_at.isoformat() if r.created_at else None
            })

        return history

    def create_interview(self, interview_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Associate an interview session with a candidate in the ATS."""
        candidate_id = interview_data["candidate_id"]
        job_id = interview_data["job_id"]
        interview_type = interview_data.get("interview_type", "mixed")
        interviewer_id = interview_data.get("interviewer_id")
        question_count = int(interview_data.get("question_count", 5))

        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found")

        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")

        session_id = str(uuid.uuid4())
        session = InterviewSession(
            id=session_id,
            candidate_id=candidate_id,
            job_id=job_id,
            interviewer_id=interviewer_id,
            interview_type=interview_type,
            status="scheduled",
            question_count=question_count,
            current_question_index=0,
            created_at=datetime.utcnow()
        )
        db.add(session)

        # Update candidate status to "Interview Scheduled"
        self.update_candidate_status(
            candidate_id=candidate_id,
            new_status="Interview Scheduled",
            changed_by="ATS Interview Scheduler",
            notes=f"Interview ({interview_type}) scheduled for role '{job.title}'",
            job_id=job_id,
            db=db
        )

        db.commit()

        return {
            "interview_id": session_id,
            "candidate_id": candidate_id,
            "candidate_name": candidate.name,
            "job_id": job_id,
            "job_title": job.title,
            "interview_type": interview_type,
            "status": "scheduled"
        }

    def get_candidate_interviews(self, candidate_id: str, db: Session) -> List[Dict[str, Any]]:
        """Retrieve all interview records associated with a candidate."""
        sessions = db.query(InterviewSession).filter(
            InterviewSession.candidate_id == candidate_id
        ).order_by(InterviewSession.created_at.desc()).all()

        results = []
        for s in sessions:
            job = db.query(Job).filter(Job.id == s.job_id).first()
            results.append({
                "id": s.id,
                "job_id": s.job_id,
                "job_title": job.title if job else "General",
                "interview_type": s.interview_type,
                "status": s.status,
                "question_count": s.question_count,
                "current_question_index": s.current_question_index,
                "overall_score": s.overall_score,
                "technical_score": s.technical_score,
                "behavioral_score": s.behavioral_score,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            })

        return results

    def sync_interview_result(
        self,
        candidate_id: str,
        job_id: str,
        session_id: str,
        overall_score: float,
        summary: str,
        db: Session
    ) -> Dict[str, Any]:
        """Synchronize a completed interview result into candidate ATS status."""
        return self.update_candidate_status(
            candidate_id=candidate_id,
            new_status="Interview Completed",
            changed_by="AI Interviewer",
            notes=f"Interview completed (Score: {overall_score:.1f}/100). Summary: {summary[:200]}",
            job_id=job_id,
            db=db
        )
