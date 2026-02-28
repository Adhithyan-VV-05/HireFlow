"""Upskilling recommendations endpoint.

Compares a candidate's existing skills against a job's required skills,
identifies gaps, and uses the LLM to suggest courses for each missing skill.
"""

import json
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db, Candidate, Job
from app.db.models import User
from app.core.auth import get_current_user

router = APIRouter(prefix="/api", tags=["upskilling"])


# ---------------------------------------------------------------------------
# LLM helpers (mirrors pattern from core/interview.py)
# ---------------------------------------------------------------------------

def _get_course_suggestions(skill: str, job_title: str) -> list[dict]:
    """Use the available LLM (or mock) to generate course suggestions for a skill."""

    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")

    prompt = (
        f"You are a career coach helping a candidate upskill for the role of '{job_title}'. "
        f"Suggest exactly 3 online courses to learn '{skill}'. "
        f"For each course respond with a JSON object with these keys: "
        f"title (string), provider (string, e.g. Udemy/Coursera/YouTube/freeCodeCamp/edX), "
        f"url (string, a plausible URL), level (string: Beginner/Intermediate/Advanced), "
        f"duration (string, e.g. '6 hours' or '4 weeks'). "
        f"Respond with a JSON array of exactly 3 objects. Nothing else."
    )

    # Try OpenAI
    if openai_key:
        try:
            import openai
            client = openai.OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=600,
            )
            raw = response.choices[0].message.content.strip()
            return json.loads(raw)
        except Exception as e:
            print(f"[Upskilling] OpenAI error for skill '{skill}': {e}")

    # Try Gemini
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-pro")
            response = model.generate_content(prompt)
            raw = response.text.strip()
            # Strip markdown fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw.strip())
        except Exception as e:
            print(f"[Upskilling] Gemini error for skill '{skill}': {e}")

    # Mock fallback — always returns useful-looking data without an API key
    return _mock_courses(skill)


def _mock_courses(skill: str) -> list[dict]:
    """Return mock course suggestions when no LLM API key is configured."""
    skill_lower = skill.lower()
    return [
        {
            "title": f"Complete {skill} Bootcamp",
            "provider": "Udemy",
            "url": f"https://udemy.com/course/{skill_lower.replace(' ', '-')}-bootcamp",
            "level": "Beginner",
            "duration": "10 hours",
        },
        {
            "title": f"{skill} for Professionals",
            "provider": "Coursera",
            "url": f"https://coursera.org/learn/{skill_lower.replace(' ', '-')}",
            "level": "Intermediate",
            "duration": "4 weeks",
        },
        {
            "title": f"Advanced {skill} Masterclass",
            "provider": "YouTube",
            "url": f"https://youtube.com/results?search_query={skill_lower.replace(' ', '+')}+tutorial",
            "level": "Advanced",
            "duration": "8 hours",
        },
    ]


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.get("/upskilling-recommendations")
async def get_upskilling_recommendations(
    job_id: Optional[str] = Query(None, description="Job ID to compare skills against"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return skill gap analysis and course recommendations for the current candidate.

    - If `job_id` is provided, gaps are computed for that specific job.
    - Always returns the full job list so the frontend can drive the selector.
    """
    if current_user.role != "candidate":
        raise HTTPException(403, "Only candidates can access upskilling recommendations")

    # Get the candidate's profile
    candidate = db.query(Candidate).filter(
        Candidate.user_id == current_user.id
    ).first()

    if not candidate:
        return {
            "has_resume": False,
            "candidate_skills": [],
            "jobs": [],
            "selected_job": None,
            "skill_gaps": [],
            "recommendations": [],
        }

    # Normalize candidate skills for comparison
    candidate_skills: list[str] = candidate.skills or []
    candidate_skills_lower = {s.lower().strip() for s in candidate_skills}

    # Fetch all jobs for the dropdown
    all_jobs = db.query(Job).all()
    jobs_list = [
        {
            "id": j.id,
            "title": j.title,
            "required_skills": j.required_skills or [],
        }
        for j in all_jobs
    ]

    if not job_id:
        # No job selected yet — return data without gap analysis
        return {
            "has_resume": True,
            "candidate_skills": candidate_skills,
            "jobs": jobs_list,
            "selected_job": None,
            "skill_gaps": [],
            "recommendations": [],
        }

    # Find the selected job
    selected_job = db.query(Job).filter(Job.id == job_id).first()
    if not selected_job:
        raise HTTPException(404, f"Job {job_id} not found")

    required_skills: list[str] = selected_job.required_skills or []

    # Compute gaps (case-insensitive)
    skill_gaps = [
        s for s in required_skills
        if s.lower().strip() not in candidate_skills_lower
    ]

    # Generate course recommendations for each gap
    recommendations = []
    for skill in skill_gaps:
        courses = _get_course_suggestions(skill, selected_job.title)
        recommendations.append({
            "skill": skill,
            "courses": courses,
        })

    return {
        "has_resume": True,
        "candidate_skills": candidate_skills,
        "jobs": jobs_list,
        "selected_job": {
            "id": selected_job.id,
            "title": selected_job.title,
            "required_skills": required_skills,
        },
        "skill_gaps": skill_gaps,
        "recommendations": recommendations,
    }
