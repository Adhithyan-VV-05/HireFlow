from app.db.session import SessionLocal
from app.db.models import Candidate
import json

db = SessionLocal()
try:
    c = db.query(Candidate).first()
    if c:
        print(f"Name: {c.name}")
        print(f"Skills: {c.skills_json}")
        print(f"Aptitude Scores: {c.aptitude_scores_json}")
    else:
        print("No candidates found.")
finally:
    db.close()
