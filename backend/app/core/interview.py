"""AI Interview Bot using LLM API (OpenAI or Gemini).

Manages interview sessions with dynamic system prompts,
conversation history, and score extraction from LLM responses.
"""

import os
import re
import json
import uuid
from typing import Dict, Optional

from app.core.llm_utils import call_llm, init_llm





def build_system_prompt(job_title: str, required_skills: list, candidate_name: str, entities: dict) -> str:
    """Build the interview system prompt with full candidate context."""
    required = ", ".join(required_skills) if required_skills else "general software development"
    
    # Format candidate details
    skills = ", ".join(entities.get("SKILL", [])) if entities.get("SKILL") else "various technologies"
    education = ", ".join(entities.get("EDUCATION", [])) if entities.get("EDUCATION") else "not specified"
    experience = ", ".join(entities.get("COMPANY", [])) if entities.get("COMPANY") else "not specified"
    
    return (
        f"You are a technical interviewer conducting a preliminary screening interview "
        f"for the role of {job_title}. The required skills for this role are: {required}.\n\n"
        f"Candidate Name: {candidate_name}\n"
        f"Candidate Skills: {skills}\n"
        f"Candidate Education: {education}\n"
        f"Candidate Past Companies: {experience}\n\n"
        f"Your job is to ask one question at a time, alternating between technical and "
        f"behavioural questions. Focus your technical questions on the overlap between "
        f"required skills and candidate skills. You have access to the candidate's resume "
        f"details above, so you can ask specific questions about their experience (e.g., 'Tell me about your time at [Company]').\n\n"
        f"After each candidate response, silently assign a score from 1 to 10 and include it "
        f"in your reply in this exact format at the end: [SCORE:X]. Keep the interview "
        f"conversational and professional. Do not reveal the scoring. Ask no more than 8 questions total, "
        f"then provide a brief closing statement."
    )





def parse_score(response: str) -> Optional[int]:
    """Extract score from [SCORE:X] tag in LLM response."""
    match = re.search(r'\[SCORE:(\d+)\]', response)
    if match:
        score = int(match.group(1))
        return max(1, min(10, score))
    return None


def start_interview(
    candidate_id: str,
    job_id: str,
    db_session=None,
) -> Dict:
    """Start a new interview session."""
    from app.db import Candidate, Job, Interview, SessionLocal

    if db_session is None:
        db_session = SessionLocal()
        own_session = True
    else:
        own_session = False

    try:
        candidate = db_session.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()
        job = db_session.query(Job).filter(Job.id == job_id).first()

        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found")
        if not job:
            raise ValueError(f"Job {job_id} not found")

        system_prompt = build_system_prompt(
            job.title,
            job.required_skills,
            candidate.name or "Candidate",
            candidate.entities
        )

        initial_response = call_llm(system_prompt, [])

        session_id = str(uuid.uuid4())
        interview = Interview(
            id=session_id,
            candidate_id=candidate_id,
            job_id=job_id,
            transcript_json=json.dumps([
                {"role": "assistant", "content": initial_response, "score": None}
            ]),
            running_scores_json=json.dumps({}),
            total_score=0.0,
            status="active",
        )
        db_session.add(interview)
        db_session.commit()

        return {
            "session_id": session_id,
            "message": initial_response,
            "candidate_name": candidate.name,
            "job_title": job.title,
        }

    finally:
        if own_session:
            db_session.close()


def process_message(
    session_id: str,
    user_message: str,
    db_session=None,
) -> Dict:
    """Process a user message in an interview session."""
    from app.db import Candidate, Job, Interview, SessionLocal

    if db_session is None:
        db_session = SessionLocal()
        own_session = True
    else:
        own_session = False

    try:
        interview = db_session.query(Interview).filter(
            Interview.id == session_id
        ).first()

        if not interview:
            raise ValueError(f"Interview session {session_id} not found")

        if interview.status != "active":
            return {
                "message": "This interview has already been completed.",
                "scores": interview.running_scores,
                "status": "completed",
            }

        candidate = db_session.query(Candidate).filter(
            Candidate.id == interview.candidate_id
        ).first()
        job = db_session.query(Job).filter(
            Job.id == interview.job_id
        ).first()

        system_prompt = build_system_prompt(
            job.title if job else "Software Developer",
            job.required_skills if job else [],
            candidate.name if candidate else "Candidate",
            candidate.entities if candidate else {},
        )

        transcript = interview.transcript
        messages = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in transcript
        ]
        messages.append({"role": "user", "content": user_message})

        response = call_llm(system_prompt, messages)

        score = parse_score(response)

        transcript.append({"role": "user", "content": user_message, "score": None})
        transcript.append({"role": "assistant", "content": response, "score": score})

        running_scores = interview.running_scores
        question_num = sum(1 for t in transcript if t["role"] == "assistant" and t.get("score"))
        if score:
            running_scores[f"question_{question_num}"] = score

        all_scores = [v for v in running_scores.values() if isinstance(v, (int, float))]
        total_score = sum(all_scores) / len(all_scores) if all_scores else 0.0

        assistant_count = sum(1 for t in transcript if t["role"] == "assistant")
        status = "completed" if assistant_count >= 9 else "active"

        interview.transcript = transcript
        interview.running_scores = running_scores
        interview.total_score = round(total_score, 2)
        interview.status = status

        # If completed and score is high, schedule a video interview
        if status == "completed" and total_score >= 7.5:
            from datetime import datetime, timedelta
            # Schedule for 2 days from now at 10 AM
            future_date = datetime.utcnow() + timedelta(days=2)
            interview.scheduled_at = future_date.replace(hour=10, minute=0, second=0, microsecond=0)
            interview.meeting_link = f"https://meet.jit.si/HireFlow-{interview.id}"
            interview.is_video_call = True
            print(f"[Interview] Promoted candidate {interview.candidate_id} to video call")

        db_session.commit()

        return {
            "message": response,
            "scores": running_scores,
            "total_score": round(total_score, 2),
            "status": status,
            "question_number": assistant_count,
        }

    finally:
        if own_session:
            db_session.close()


def get_interview_result(session_id: str, db_session=None) -> Dict:
    """Get the full result of a completed interview."""
    from app.db import Candidate, Interview, SessionLocal

    if db_session is None:
        db_session = SessionLocal()
        own_session = True
    else:
        own_session = False

    try:
        interview = db_session.query(Interview).filter(
            Interview.id == session_id
        ).first()

        if not interview:
            raise ValueError(f"Interview session {session_id} not found")

        candidate = db_session.query(Candidate).filter(
            Candidate.id == interview.candidate_id
        ).first()

        running_scores = interview.running_scores
        all_scores = [v for v in running_scores.values() if isinstance(v, (int, float))]
        total_questions = len(all_scores)
        scored_count = sum(1 for s in all_scores if s >= 5)
        skill_coverage = (scored_count / total_questions * 100) if total_questions > 0 else 0

        return {
            "session_id": session_id,
            "candidate_id": interview.candidate_id,
            "candidate_name": candidate.name if candidate else "Unknown",
            "transcript": interview.transcript,
            "per_question_scores": running_scores,
            "total_score": interview.total_score,
            "skill_coverage_percent": round(skill_coverage, 1),
            "status": interview.status,
            "total_questions": total_questions,
        }

    finally:
        if own_session:
            db_session.close()
