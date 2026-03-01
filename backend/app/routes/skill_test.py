import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.db.models import User, Candidate, SkillAssessment
from app.core.auth import get_current_user
from app.core.llm_utils import generate_skill_mcqs

router = APIRouter(prefix="/api/skill-test", tags=["skill-test"])

@router.get("/questions")
async def get_test_questions(
    skill: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch 20 rapid-fire MCQ questions for a skill."""
    if current_user.role != "candidate":
        raise HTTPException(403, "Only candidates can take skill tests")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(400, "Candidate profile not found")

    # Check if already completed and locked
    existing = db.query(SkillAssessment).filter(
        SkillAssessment.candidate_id == candidate.id,
        SkillAssessment.skill_name == skill,
        SkillAssessment.is_completed == True
    ).first()
    
    if existing:
        return {
            "questions": [],
            "status": "locked",
            "message": "You have already completed this test. Pay 500Rs to unlock or purchase premium."
        }

    questions = generate_skill_mcqs(skill)
    if not questions:
        raise HTTPException(500, "Failed to generate questions. Please try again.")
    
    return {"questions": questions}

@router.post("/submit")
async def submit_test_results(
    results: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit test results and update candidate skill score."""
    if current_user.role != "candidate":
        raise HTTPException(403, "Only candidates can submit tests")

    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(400, "Candidate profile not found")

    skill_name = results.get("skill_name")
    score = results.get("score", 0)
    percentage = results.get("percentage", 0.0)
    correct = results.get("correct_count", 0)
    wrong = results.get("wrong_count", 0)
    skipped = results.get("skipped_count", 0)

    # Save or update assessment
    assessment = db.query(SkillAssessment).filter(
        SkillAssessment.candidate_id == candidate.id,
        SkillAssessment.skill_name == skill_name
    ).first()

    if not assessment:
        assessment = SkillAssessment(
            id=str(uuid.uuid4()),
            candidate_id=candidate.id,
            skill_name=skill_name
        )
        db.add(assessment)

    assessment.score = score
    assessment.percentage = percentage
    assessment.correct_count = correct
    assessment.wrong_count = wrong
    assessment.skipped_count = skipped
    assessment.is_completed = True
    assessment.created_at = datetime.utcnow()

    db.commit()
    return {"message": "Success", "assessment_id": assessment.id}
