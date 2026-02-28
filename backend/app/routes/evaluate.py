"""Evaluation endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import User
from app.core.auth import require_interviewer

router = APIRouter(prefix="/api", tags=["evaluation"])


@router.get("/evaluate")
async def evaluate_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Run evaluation metrics comparing search methods. Interviewer only."""
    from app.core.evaluate import run_evaluation
    results = run_evaluation(db_session=db)
    return results
