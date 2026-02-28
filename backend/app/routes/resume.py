"""Resume upload endpoint."""

import os

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import User, Candidate
from app.core.auth import require_candidate
from app.services.pipeline import process_resume

router = APIRouter(prefix="/api", tags=["resume"])


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    """Upload and process a resume (PDF or DOCX).

    Runs the full pipeline: parse → NER → chunk → embed → store → index.
    If the candidate already has a profile, it updates the existing one.
    """
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".docx", ".doc"):
        raise HTTPException(400, f"Unsupported file format: {ext}. Use PDF or DOCX.")

    try:
        content = await file.read()

        # Check if this user already has a candidate profile
        existing = db.query(Candidate).filter(
            Candidate.user_id == current_user.id
        ).first()

        if existing:
            # Delete old candidate data so we can re-process fresh
            from app.db.models import FaissMetadata
            db.query(FaissMetadata).filter(
                FaissMetadata.candidate_id == existing.id
            ).delete()
            db.query(Candidate).filter(
                Candidate.id == existing.id
            ).delete()
            db.commit()

        result = process_resume(content, file.filename, db)

        # Link the uploaded resume to the candidate's user account
        if result.get("candidate_id"):
            candidate = db.query(Candidate).filter(
                Candidate.id == result["candidate_id"]
            ).first()
            if candidate:
                candidate.user_id = current_user.id
                # Use account name/email instead of extracted ones
                candidate.name = current_user.name
                candidate.email = current_user.email
                db.commit()

        # Return result with user's actual name/email
        result["name"] = current_user.name
        result["email"] = current_user.email
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error processing resume: {str(e)}")
