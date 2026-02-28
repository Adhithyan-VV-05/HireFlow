"""Aptitude Interview Engine.

Manages AI-driven aptitude test sessions for candidates using their
resume skills to generate personalised technical and reasoning questions.
"""

import re
import uuid
import json
from typing import Optional, Dict

from app.core.llm_utils import call_llm


APTITUDE_SYSTEM_PROMPT = """You are an expert technical recruiter conducting an aptitude evaluation interview.
Your goal is to assess the candidate's depth of technical knowledge, problem-solving ability, and reasoning skills.

Follow these rules strictly:
1. Ask exactly ONE question at a time based on the candidate's skills.
2. Cover a mix of: technical concepts, problem-solving scenarios, logical reasoning, and situational questions.
3. After each candidate response, evaluate it silently and include a hidden score tag at the very end of your reply: [SCORE:X] where X is 1-10.
4. Keep responses conversational, warm, and professional.
5. Do NOT reveal or mention the scoring to the candidate.
6. Ask no more than 8 questions. After the 8th answer, give a brief, positive closing statement without any [SCORE:X] tag.
7. Start immediately with your FIRST question — no preamble or introduction needed.

Focus on depth of understanding, not just buzzword recognition."""


def build_aptitude_prompt(skills: list, name: str) -> str:
    skill_str = ", ".join(skills[:15]) if skills else "general software engineering"
    return (
        f"{APTITUDE_SYSTEM_PROMPT}\n\n"
        f"Candidate Name: {name}\n"
        f"Skills from resume: {skill_str}\n\n"
        f"Begin the aptitude evaluation now."
    )


def parse_score(text: str) -> Optional[int]:
    """Extract [SCORE:X] from LLM response."""
    match = re.search(r"\[SCORE:(\d+)\]", text)
    if match:
        val = int(match.group(1))
        return max(1, min(10, val))
    return None


def clean_response(text: str) -> str:
    """Remove hidden score tags from message shown to user."""
    return re.sub(r"\s*\[SCORE:\d+\]", "", text).strip()


def start_aptitude_session(candidate_id: str, db_session=None) -> Dict:
    """Start a new aptitude interview for a candidate."""
    from app.db import Candidate, SessionLocal
    from app.db.models import AptitudeTest

    own = db_session is None
    if own:
        db_session = SessionLocal()

    try:
        candidate = db_session.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()
        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found")

        system_prompt = build_aptitude_prompt(candidate.skills, candidate.name or "Candidate")
        first_question_raw = call_llm(system_prompt, [])
        first_question = clean_response(first_question_raw)

        session_id = str(uuid.uuid4())
        test = AptitudeTest(
            id=session_id,
            candidate_id=candidate_id,
            transcript_json=json.dumps([
                {"role": "assistant", "content": first_question, "raw": first_question_raw, "score": None}
            ]),
            status="active",
        )
        db_session.add(test)
        db_session.commit()

        return {
            "session_id": session_id,
            "message": first_question,
            "candidate_name": candidate.name,
            "question_number": 1,
            "status": "active",
        }
    finally:
        if own:
            db_session.close()


def process_aptitude_message(session_id: str, user_message: str, db_session=None) -> Dict:
    """Process a candidate reply and return the next AI question."""
    from app.db import Candidate, SessionLocal
    from app.db.models import AptitudeTest

    own = db_session is None
    if own:
        db_session = SessionLocal()

    try:
        test = db_session.query(AptitudeTest).filter(
            AptitudeTest.id == session_id
        ).first()
        if not test:
            raise ValueError(f"Aptitude session {session_id} not found")

        if test.status != "active":
            return {
                "message": "This aptitude test has already been completed.",
                "status": "completed",
                "session_id": session_id,
                "scores": _compute_scores(test.transcript),
            }

        candidate = db_session.query(Candidate).filter(
            Candidate.id == test.candidate_id
        ).first()

        system_prompt = build_aptitude_prompt(
            candidate.skills if candidate else [],
            candidate.name if candidate else "Candidate",
        )

        transcript = test.transcript
        # Build conversation history for LLM (use raw responses with score tags)
        history = []
        for msg in transcript:
            raw_content = msg.get("raw") or msg["content"]
            history.append({"role": msg["role"], "content": raw_content})
        history.append({"role": "user", "content": user_message})

        ai_raw = call_llm(system_prompt, history)
        ai_clean = clean_response(ai_raw)
        score = parse_score(ai_raw)

        # Update transcript
        transcript.append({"role": "user", "content": user_message, "score": None})
        transcript.append({"role": "assistant", "content": ai_clean, "raw": ai_raw, "score": score})

        # Count questions answered
        assistant_turns = sum(1 for m in transcript if m["role"] == "assistant")
        status = "completed" if assistant_turns >= 9 else "active"

        test.transcript = transcript
        test.status = status
        
        scores = _compute_scores(transcript)
        
        # If test completed, sync scores to candidate profile
        if status == "completed" and candidate:
            candidate.aptitude_scores = scores

        db_session.commit()

        return {
            "message": ai_clean,
            "status": status,
            "session_id": session_id,
            "question_number": assistant_turns,
            "scores": scores,
        }
    finally:
        if own:
            db_session.close()


def get_aptitude_result(session_id: str, db_session=None) -> Dict:
    """Get full aptitude result with scores and transcript."""
    from app.db import Candidate, SessionLocal
    from app.db.models import AptitudeTest

    own = db_session is None
    if own:
        db_session = SessionLocal()

    try:
        test = db_session.query(AptitudeTest).filter(
            AptitudeTest.id == session_id
        ).first()
        if not test:
            raise ValueError(f"Aptitude session {session_id} not found")

        candidate = db_session.query(Candidate).filter(
            Candidate.id == test.candidate_id
        ).first()

        scores = _compute_scores(test.transcript)
        overall = round(sum(scores.values()) / len(scores) * 10, 1) if scores else 0.0

        return {
            "session_id": session_id,
            "candidate_id": test.candidate_id,
            "candidate_name": candidate.name if candidate else "Unknown",
            "status": test.status,
            "transcript": [
                {"role": m["role"], "content": m["content"]}
                for m in test.transcript
            ],
            "per_question_scores": scores,
            "overall_score": overall,           # 0–100
            "total_questions": len(scores),
        }
    finally:
        if own:
            db_session.close()


def _compute_scores(transcript: list) -> dict:
    """Extract per-question scores from transcript."""
    scores = {}
    q = 0
    for msg in transcript:
        if msg["role"] == "assistant" and msg.get("score") is not None:
            q += 1
            scores[f"Q{q}"] = msg["score"]
    return scores
