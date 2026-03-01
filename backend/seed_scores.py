import uuid
import random
import json
from datetime import datetime
from app.db.session import SessionLocal
from app.db.models import Candidate, SkillAssessment

def seed_scores():
    db = SessionLocal()
    try:
        candidates = db.query(Candidate).all()
        if not candidates:
            print("No candidates found. Please run seed_db.py first.")
            return

        print(f"Found {len(candidates)} candidates. Generating assessment data...")

        # General pool of skills to pick from if candidate skills are too few
        general_skills = [
            "Problem Solving", "Communication", "Teamwork", "Agile", "Git", "SQL",
            "Python", "JavaScript", "Docker", "AWS", "CSS", "HTML", "Data Structures"
        ]

        for cand in candidates:
            # Update Aptitude Scores with more variance
            aptitude = {
                "Analytical": round(random.uniform(0.65, 0.95), 2),
                "Communication": round(random.uniform(0.6, 0.98), 2),
                "Technical": round(random.uniform(0.7, 0.99), 2)
            }
            cand.aptitude_scores = aptitude

            # Determine number of skill tests (4 to 10)
            num_tests = random.randint(4, 10)
            
            # Combine their specific skills with some general ones
            pool = list(set(cand.skills + general_skills))
            skills_to_test = random.sample(pool, min(num_tests, len(pool)))

            print(f"Assigning {len(skills_to_test)} tests to {cand.name}...")

            for skill in skills_to_test:
                # Check if already exists to avoid duplicates
                existing = db.query(SkillAssessment).filter(
                    SkillAssessment.candidate_id == cand.id,
                    SkillAssessment.skill_name == skill
                ).first()
                if existing:
                    continue

                # Generate scores
                # Correct: 12-20 out of 20
                # Wrong: 0-5
                # Skipped: 0-3
                correct = random.randint(10, 20)
                wrong = random.randint(0, 20 - correct)
                skipped = 20 - correct - wrong
                
                # Each correct +5, wrong -2, skip -1
                score = (correct * 5) - (wrong * 2) - (skipped * 1)
                percentage = max(0, (score / 100) * 100)

                assessment = SkillAssessment(
                    id=str(uuid.uuid4()),
                    candidate_id=cand.id,
                    skill_name=skill,
                    score=score,
                    percentage=round(percentage, 2),
                    correct_count=correct,
                    wrong_count=wrong,
                    skipped_count=skipped,
                    is_completed=True,
                    created_at=datetime.utcnow()
                )
                db.add(assessment)

        db.commit()
        print("Skill assessments seeded successfully.")

    except Exception as e:
        print(f"Error seeding scores: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_scores()
