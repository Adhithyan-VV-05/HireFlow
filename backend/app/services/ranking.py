import re
import json
import numpy as np
from typing import List, Dict, Any, cast
from sqlalchemy.orm import Session
from app.db import Candidate, Job, JobApplication
from app.core.search import hybrid_search

def calculate_skill_match(candidate_skills: List[str], required_skills: List[str]) -> float:
    if not required_skills:
        return 0.8  # Default if no specific requirements listed
    
    can_set = set(s.lower() for s in candidate_skills)
    req_set = set(s.lower() for s in required_skills)
    
    matches = can_set.intersection(req_set)
    if not req_set:
        return 0.0
    
    return min(1.0, len(matches) / len(req_set))

def calculate_quality_score(text: str, entities: Dict[str, Any]) -> float:
    score = 0.0
    
    # Section Presence (Heuristic)
    sections = {
        "experience": r"(experience|work history|employment|career)",
        "education": r"(education|academic|study|university|college)",
        "skills": r"(skills|technical|expertise|competencies)",
        "projects": r"(projects|portfolio|personal work)",
        "summary": r"(summary|objective|profile|about me)"
    }
    
    for section, pattern in sections.items():
        if re.search(pattern, text, re.IGNORECASE):
            score += 0.15
            
    # Content Length heuristic
    word_count = len(text.split())
    if 200 <= word_count <= 1000:
        score += 0.15
    elif word_count > 1000:
        score += 0.10 # Too long might be noisy
        
    # Structural completeness (entities)
    if entities.get("EDUCATION"): score += 0.05
    if entities.get("JOB_TITLE"): score += 0.05
    
    return min(1.0, score)

def calculate_impact_score(text: str) -> float:
    # Look for quantified achievements
    # Patterns for numbers, percentages, currency
    impact_patterns = [
        r"\d+%", # Percentages
        r"\$\d+", # Currency
        r"\b(improved|increased|decreased|saved|reduced|grown|led|managed|delivered|optimized)\b" # Success verbs
    ]
    
    hits = 0
    for pattern in impact_patterns:
        match_count = len(re.findall(pattern, text, re.IGNORECASE))
        hits += min(5, match_count) # Cap contribution per pattern
        
    return min(1.0, hits / 15.0)

def calculate_completeness_score(candidate: Candidate) -> float:
    score = 0.0
    if candidate.name: score += 0.25
    if candidate.email: score += 0.25
    if candidate.skills: score += 0.25
    if candidate.raw_text: score += 0.25
    return score

def compute_ranking_for_application(db: Session, application_id: str):
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        return
    
    candidate = app.candidate
    job = app.job
    
    # 1. Skill Match Score
    skill_score = calculate_skill_match(candidate.skills, job.required_skills)
    
    # 2. Semantic Score (Hybrid Search)
    query = f"{job.title} {job.description}"
    search_results = hybrid_search(query, top_k=50, db_session=db)
    
    semantic_score = 0.0
    for res in search_results:
        if res["candidate_id"] == candidate.id:
            semantic_score = res["final_score"]
            break
            
    # 3. Quality & Impact
    entities = json.loads(candidate.entities_json) if candidate.entities_json else {}
    quality_score = calculate_quality_score(candidate.raw_text, entities)
    impact_score = calculate_impact_score(candidate.raw_text)
    completeness_score = calculate_completeness_score(candidate)
    
    # Weighted Final Score
    # Weights: Skill (0.35), Semantic (0.25), Quality (0.15), Impact (0.15), Completeness (0.10)
    final_score = (
        (skill_score * 0.35) +
        (semantic_score * 0.25) +
        (quality_score * 0.15) +
        (impact_score * 0.15) +
        (completeness_score * 0.10)
    )
    
    # Update application
    app.skill_match_score = round(skill_score, 4)
    app.semantic_score = round(semantic_score, 4)
    app.quality_score = round(quality_score, 4)
    app.impact_score = round(impact_score, 4)
    app.completeness_score = round(completeness_score, 4)
    app.overall_score = round(final_score, 4)
    
    app.analysis_json = json.dumps({
        "matched_count": len(set(s.lower() for s in candidate.skills).intersection(set(s.lower() for s in job.required_skills))),
        "required_count": len(job.required_skills),
        "verdict": "Qualified" if final_score > 0.7 else "Review Recommended" if final_score > 0.4 else "Low Match"
    })
    
    db.commit()
