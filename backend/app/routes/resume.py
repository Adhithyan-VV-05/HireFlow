import os
import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import User, Candidate, Resume, FaissMetadata
from app.core.auth import require_candidate, get_current_user
from app.services.pipeline import process_resume

router = APIRouter(prefix="/api", tags=["resume"])


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    """Upload and process a resume.
    Updates candidate profile and keeps history of files.
    """
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".docx", ".doc"):
        raise HTTPException(400, f"Unsupported file format: {ext}. Use PDF or DOCX.")

    try:
        content = await file.read()

        # Check if this user already has a candidate profile
        candidate = db.query(Candidate).filter(
            Candidate.user_id == current_user.id
        ).first()

        existing_id = candidate.id if candidate else None

        # If updating, de-activate old resumes and clear old AI index entries
        if candidate:
            db.query(Resume).filter(Resume.candidate_id == candidate.id).update({"is_active": False})
            db.query(FaissMetadata).filter(FaissMetadata.candidate_id == candidate.id).delete()
            db.commit()

        # Run pipeline (updated version returns file metadata)
        result = process_resume(content, file.filename, db, existing_candidate_id=existing_id)
        
        # Reload or use the one created/updated
        candidate_id = result["candidate_id"]
        
        # Link user if fresh
        if not existing_id:
            cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
            if cand:
                cand.user_id = current_user.id
                cand.name = current_user.name
                cand.email = current_user.email
                db.commit()

        # Save new Resume record
        new_resume = Resume(
            id=str(uuid.uuid4()),
            candidate_id=candidate_id,
            file_name=result["file_name"],
            file_path=result["file_path"],
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(new_resume)
        db.commit()

        return {
            "message": "Resume uploaded and processed successfully",
            "candidate_id": candidate_id,
            "resume_id": new_resume.id,
            "skills": result["skills"],
            "aptitude_scores": result["aptitude_scores"]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error processing resume: {str(e)}")


@router.get("/resume-history")
async def get_resume_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get list of all resumes uploaded by the current candidate."""
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return {"resumes": []}

    resumes = db.query(Resume).filter(
        Resume.candidate_id == candidate.id
    ).order_by(Resume.created_at.desc()).all()

    return {
        "resumes": [
            {
                "id": r.id,
                "file_name": r.file_name,
                "is_active": r.is_active,
                "created_at": str(r.created_at),
            }
            for r in resumes
        ]
    }


@router.get("/view-resume/{resume_id}")
async def view_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download/View a specific resume from history."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(404, "Resume record not found")

    # Security check
    is_interviewer = current_user.role == "interviewer"
    
    # Candidates can only see their own resumes
    # Interviewers can see any candidate's resume, but ONLY the active (latest) one
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    
    if not is_interviewer:
        if not candidate or candidate.id != resume.candidate_id:
            raise HTTPException(403, "Access denied. You can only view your own resumes.")
    else:
        # User is an interviewer
        if not resume.is_active:
            raise HTTPException(403, "Access denied. Interviewers can only see the latest uploaded resume.")

    if not os.path.exists(resume.file_path):
        raise HTTPException(404, "Physical file not found on server")

    # Set media type based on extension
    ext = os.path.splitext(resume.file_path)[1].lower()
    media_type = "application/pdf" if ext == ".pdf" else "application/octet-stream"

    return FileResponse(
        resume.file_path,
        filename=resume.file_name,
        media_type=media_type,
        # Allow browser to display PDF inline
        content_disposition_type="inline" if ext == ".pdf" else "attachment"
    )


@router.get("/view-latest-resume/{candidate_id}")
async def view_latest_resume(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """View the latest resume for a specific candidate."""
    # Find the active resume for this candidate
    resume = db.query(Resume).filter(
        Resume.candidate_id == candidate_id,
        Resume.is_active == True
    ).first()

    if not resume:
        raise HTTPException(404, "No active resume found for this candidate")

    # Reuse the same security and response logic
    return await view_resume(resume.id, db, current_user)
