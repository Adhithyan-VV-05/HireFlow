"""Job management endpoints."""

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db, Job
from app.db.models import User, JobApplication, Candidate
from app.core.auth import get_current_user, require_interviewer
from app.schemas import CreateJobRequest, ApplyJobRequest

router = APIRouter(prefix="/api", tags=["jobs"])


@router.post("/create-job")
async def create_job(
    request: CreateJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Create a new job posting. Interviewer only."""
    job_id = str(uuid.uuid4())
    deadline_dt = None
    if request.deadline:
        try:
            deadline_dt = datetime.fromisoformat(request.deadline.replace("Z", "+00:00"))
        except:
            pass

    job = Job(
        id=job_id,
        owner_id=current_user.id,
        title=request.title,
        description=request.description,
        required_skills_json=json.dumps(request.required_skills),
        deadline=deadline_dt,
        created_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()

    return {
        "job_id": job_id,
        "title": request.title,
        "description": request.description,
        "required_skills": request.required_skills,
    }


@router.get("/jobs")
async def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all jobs."""
    jobs = db.query(Job).all()
    return {
        "jobs": [
            {
                "id": j.id,
                "title": j.title,
                "description": j.description,
                "required_skills": j.required_skills,
                "owner_name": j.owner.name if j.owner else "HireFlow AI",
                "deadline": str(j.deadline) if j.deadline else None,
                "created_at": str(j.created_at),
            }
            for j in jobs
        ]
    }


@router.post("/apply-job")
async def apply_job(
    request: ApplyJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate applies for a job."""
    if current_user.role != "candidate":
        raise HTTPException(403, "Only candidates can apply for jobs")
    
    # Check if candidate exists (has profile/resume)
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(400, "Please upload your resume before applying")

    # Check if already applied
    existing = db.query(JobApplication).filter(
        JobApplication.job_id == request.job_id,
        JobApplication.candidate_id == candidate.id
    ).first()
    if existing:
        raise HTTPException(400, "You have already applied for this job")

    application_id = str(uuid.uuid4())
    new_app = JobApplication(
        id=application_id,
        job_id=request.job_id,
        candidate_id=candidate.id,
        applied_resume_id=request.applied_resume_id,
        additional_details=request.additional_details,
        portfolio_url=request.portfolio_url,
        start_date=request.start_date,
        created_at=datetime.utcnow(),
    )
    db.add(new_app)
    db.commit()

    return {"message": "Application submitted successfully", "application_id": application_id}


@router.get("/job-applications")
async def list_job_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """List applications for jobs owned by the recruiter."""
    # Join Job and JobApplication to filter by owner_id
    applications = db.query(JobApplication).join(Job).filter(Job.owner_id == current_user.id).all()
    
    return {
        "applications": [
            {
                "id": app.id,
                "job_title": app.job.title,
                "job_id": app.job_id,
                "candidate_name": app.candidate.name,
                "candidate_id": app.candidate_id,
                "candidate_email": app.candidate.email,
                "candidate_skills": app.candidate.skills,
                "additional_details": app.additional_details,
                "portfolio_url": app.portfolio_url,
                "start_date": app.start_date,
                "status": app.status,
                "applied_resume_id": app.applied_resume_id,
                "applied_resume_name": app.applied_resume.file_name if app.applied_resume else None,
                "created_at": str(app.created_at),
            }
            for app in applications
        ]
    }


@router.get("/my-applications")
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List applications for the current candidate."""
    if current_user.role != "candidate":
        raise HTTPException(403, "Only candidates can access their applications")
        
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return {"applications": []}
        
    applications = db.query(JobApplication).filter(
        JobApplication.candidate_id == candidate.id
    ).all()
    
    return {
        "applications": [
            {
                "id": app.id,
                "job_title": app.job.title,
                "job_id": app.job_id,
                "status": app.status,
                "created_at": str(app.created_at),
                "applied_resume_name": app.applied_resume.file_name if app.applied_resume else "Primary Resume",
            }
            for app in applications
        ]
    }
