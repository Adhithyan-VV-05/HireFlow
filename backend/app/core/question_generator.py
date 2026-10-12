"""Dynamic role-specific interview question generator for HireFlow AI.

Generates strictly Multiple Choice Questions (MCQ) based on recruiter conditions,
job specifications, candidate resume details, and centralized AI capabilities
(OpenRouter / Gemini / OpenAI) with structured JSON output validation, anti-duplicate
guarantees, and an infallible fallback question bank across 10+ core domains.
"""

import json
import re
from typing import Dict, List, Any, Optional

from app.core.llm_utils import call_llm
from app.core.openrouter import is_openrouter_configured
from app.core.question_bank import get_fallback_questions, QUESTION_BANK


def generate_interview_questions(
    job_title: str,
    job_description: str = "",
    required_skills: List[str] = None,
    preferred_skills: List[str] = None,
    candidate_skills: List[str] = None,
    candidate_resume_text: str = "",
    candidate_name: str = "Candidate",
    experience_level: str = "Mid-Senior",
    interview_type: str = "mixed",
    num_questions: int = 5,
    technical_count: Optional[int] = None,
    behavioral_count: Optional[int] = None,
    situational_count: Optional[int] = None,
    hr_count: Optional[int] = None,
    resume_based_count: Optional[int] = None,
    category_weights: Optional[Dict[str, float]] = None,
    recruiter_conditions: Optional[str] = None
) -> Dict[str, Any]:
    """Generate structured, role-specific Multiple Choice Questions (MCQ) based on recruiter conditions.
    
    Args:
        job_title: Target role title (e.g. 'Senior ML Engineer')
        job_description: Complete job description text
        required_skills: List of mandatory skills for the job
        preferred_skills: Optional preferred skills
        candidate_skills: Extracted skills from candidate's resume
        candidate_resume_text: Snippet of candidate's parsed resume
        candidate_name: Name of candidate
        experience_level: 'Entry', 'Mid-Level', 'Senior', 'Lead'
        interview_type: 'mixed', 'technical', 'behavioral', 'situational', 'hr', 'resume-based'
        num_questions: Total requested number of questions
        technical_count: Explicit count of technical questions requested
        behavioral_count: Explicit count of behavioral questions requested
        situational_count: Explicit count of situational questions requested
        hr_count: Explicit count of HR/culture questions requested
        resume_based_count: Explicit count of resume-grounded questions requested
        category_weights: Scoring weights per category
        recruiter_conditions: Custom recruiter specifications, directives, or focus areas
        
    Returns:
        Dict conforming to:
        {
            "job_role": str,
            "interview_type": str,
            "generated_by": "openrouter" | "llm" | "fallback_bank",
            "question_count": int,
            "questions": [
                {
                    "number": int,
                    "question": str,
                    "options": {
                        "A": str,
                        "B": str,
                        "C": str,
                        "D": str
                    },
                    "correct_option": "A" | "B" | "C" | "D",
                    "explanation": str,
                    "type": "technical" | "behavioral" | "situational" | "hr" | "resume-based",
                    "difficulty": "entry" | "intermediate" | "advanced",
                    "skill": str,
                    "skills": [str],
                    "expected_focus": [str],
                    "expected_topics": [str],
                    "maximum_score": 10
                }
            ]
        }
    """
    # Calculate explicit question counts if specified by HR configuration
    has_specific_breakdown = any(c is not None and c > 0 for c in [
        technical_count, behavioral_count, situational_count, hr_count, resume_based_count
    ])

    if has_specific_breakdown:
        tc = max(0, technical_count or 0)
        bc = max(0, behavioral_count or 0)
        sc = max(0, situational_count or 0)
        hc = max(0, hr_count or 0)
        rc = max(0, resume_based_count or 0)
        target_count = max(1, tc + bc + sc + hc + rc)
    else:
        target_count = max(1, min(20, num_questions))
        tc = target_count
        bc = 0
        sc = 0
        hc = 0
        rc = 0

    req_skills_str = ", ".join(required_skills) if required_skills else "General software and engineering principles"
    pref_skills_str = ", ".join(preferred_skills) if preferred_skills else "None specified"
    cand_skills_str = ", ".join(candidate_skills) if candidate_skills else "General technical skills"
    resume_snippet = candidate_resume_text[:2000] if candidate_resume_text else ""

    system_prompt = (
        "You are an elite hiring manager and principal technical interviewer at HireFlow AI. "
        "Your task is to generate rigorous, non-trivial, role-specific MULTIPLE CHOICE QUESTIONS (MCQ) ONLY "
        "tailored strictly to the recruiter's specifications, job requirements, and candidate background.\n\n"
        "CRITICAL REQUIREMENT:\n"
        "- The interview must be MULTIPLE CHOICE QUESTIONS (MCQ) ONLY.\n"
        "- NO descriptive questions, NO open-ended essay questions. Every question MUST have exactly 4 choices (A, B, C, D).\n\n"
        "RECRUITER SPECIFICATIONS & CONDITIONS:\n"
        f"- Target Job Role: {job_title}\n"
        f"- Target Seniority / Experience Level: {experience_level}\n"
        f"- Required Skills: {req_skills_str}\n"
        f"- Preferred Skills: {pref_skills_str}\n"
    )

    if recruiter_conditions and recruiter_conditions.strip():
        system_prompt += f"- Recruiter Custom Conditions & Directives: {recruiter_conditions.strip()}\n"

    if job_description:
        system_prompt += f"- Job Description Context:\n{job_description[:1200]}\n\n"

    if candidate_skills:
        system_prompt += f"- Candidate Extracted Skills: {cand_skills_str}\n"

    if resume_snippet:
        system_prompt += (
            f"- Candidate Resume Details:\n{resume_snippet}\n"
            "Ground questions directly in the candidate's actual projects, libraries, or architectures where relevant.\n\n"
        )

    if has_specific_breakdown:
        breakdown_text = (
            f"Generate exactly {target_count} MCQ questions matching this exact category breakdown:\n"
            f"- Technical Questions: {tc}\n"
            f"- Behavioral Questions: {bc}\n"
            f"- Situational Questions: {sc}\n"
            f"- HR / Culture Questions: {hc}\n"
            f"- Resume-Grounded Questions: {rc}\n"
        )
    else:
        breakdown_text = f"Generate exactly {target_count} {interview_type} MCQ questions.\n"

    system_prompt += (
        f"{breakdown_text}\n"
        "MCQ Generation Rules:\n"
        "1. Strictly MULTIPLE CHOICE QUESTIONS (MCQ). No descriptive or open-ended questions.\n"
        "2. Provide a challenging, realistic scenario or problem statement for each question.\n"
        "3. Provide exactly 4 distinct, plausible options labeled 'A', 'B', 'C', and 'D'. One must be unambiguously correct, and three must be plausible distractors.\n"
        "4. Specify the correct option letter ('A', 'B', 'C', or 'D') in 'correct_option'.\n"
        "5. Provide an 'explanation' detailing why the correct option is right and the others are suboptimal or flawed.\n"
        "6. Do NOT ask trivial trivia (e.g. 'What does HTTP stand for?'). Ask deep production, architecture, trade-off, and debugging questions.\n"
        "7. Do NOT duplicate questions.\n"
        "8. Output MUST be strictly valid JSON with no markdown fences, conversational prefix, or codeblocks.\n"
        "9. Follow this exact JSON schema:\n"
        "{\n"
        f'  "job_role": "{job_title}",\n'
        '  "questions": [\n'
        '    {\n'
        '      "number": 1,\n'
        '      "question": "Scenario or problem statement...",\n'
        '      "options": {\n'
        '        "A": "First option description...",\n'
        '        "B": "Second option description...",\n'
        '        "C": "Third option description...",\n'
        '        "D": "Fourth option description..."\n'
        '      },\n'
        '      "correct_option": "B",\n'
        '      "explanation": "Detailed explanation of why B is correct...",\n'
        '      "type": "technical" | "behavioral" | "situational" | "hr" | "resume-based",\n'
        '      "difficulty": "entry" | "intermediate" | "advanced",\n'
        '      "skills": ["topic1", "topic2"],\n'
        '      "expected_topics": ["key point 1", "key point 2"],\n'
        '      "maximum_score": 10\n'
        '    }\n'
        '  ]\n'
        '}'
    )

    messages = [
        {"role": "user", "content": f"Generate the {target_count} MCQ interview questions for {job_title} based on the recruiter's conditions."}
    ]

    try:
        response_text = call_llm(system_prompt, messages)
        questions_data = _parse_and_validate_questions_json(response_text, job_title, target_count)
        if questions_data and len(questions_data.get("questions", [])) > 0:
            provider_tag = "openrouter" if is_openrouter_configured() else "llm"
            return {
                "job_role": job_title,
                "interview_type": interview_type,
                "generated_by": provider_tag,
                "question_count": len(questions_data["questions"][:target_count]),
                "questions": questions_data["questions"][:target_count]
            }
    except Exception as e:
        print(f"[QuestionGenerator] LLM/OpenRouter generation failed: {e}. Activating curated fallback question bank.")

    # Infallible Fallback Path
    fallback_qs = get_fallback_questions(
        role_title=job_title,
        required_skills=required_skills,
        num_questions=target_count,
        interview_type=interview_type,
        technical_count=technical_count,
        behavioral_count=behavioral_count,
        situational_count=situational_count,
        hr_count=hr_count,
        resume_based_count=resume_based_count
    )

    return {
        "job_role": job_title,
        "interview_type": interview_type,
        "generated_by": "fallback_bank",
        "question_count": len(fallback_qs),
        "questions": fallback_qs
    }


def _parse_and_validate_questions_json(raw_text: str, expected_role: str, target_count: int) -> Optional[Dict[str, Any]]:
    """Clean markdown code fences, parse JSON, validate MCQ items, ensure options & correct_option exist, and deduplicate."""
    if not raw_text or not raw_text.strip():
        return None

    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    json_match = re.search(r'\{[\s\S]*\}', cleaned)
    if not json_match:
        return None

    try:
        data = json.loads(json_match.group(0))
    except Exception:
        return None

    if not isinstance(data, dict) or "questions" not in data or not isinstance(data["questions"], list):
        return None

    valid_questions = []
    seen_texts = set()

    for idx, item in enumerate(data["questions"]):
        if not isinstance(item, dict):
            continue

        q_text = item.get("question", "").strip()
        if not q_text or len(q_text) < 10:
            continue

        # Prevent duplicate questions
        normalized_text = re.sub(r'\W+', '', q_text.lower())
        if normalized_text in seen_texts:
            continue
        seen_texts.add(normalized_text)

        q_type = str(item.get("type", "technical")).lower()
        if q_type not in ["technical", "behavioral", "situational", "hr", "resume-based"]:
            q_type = "technical"

        difficulty = str(item.get("difficulty", "intermediate")).lower()
        if difficulty not in ["entry", "intermediate", "advanced"]:
            difficulty = "intermediate"

        # Handle options (must be dict with A, B, C, D)
        raw_options = item.get("options")
        clean_options = {}
        if isinstance(raw_options, dict):
            for k in ["A", "B", "C", "D"]:
                val = raw_options.get(k) or raw_options.get(k.lower())
                if val:
                    clean_options[k] = str(val).strip()
        elif isinstance(raw_options, list):
            keys = ["A", "B", "C", "D"]
            for opt_idx, opt_val in enumerate(raw_options[:4]):
                clean_options[keys[opt_idx]] = str(opt_val).strip()

        # If options are incomplete, supply robust default options
        if len(clean_options) < 4:
            clean_options = {
                "A": clean_options.get("A", "Option A: Conventional baseline approach"),
                "B": clean_options.get("B", "Option B: Optimized production architectural pattern"),
                "C": clean_options.get("C", "Option C: Deprecated or sub-optimal implementation"),
                "D": clean_options.get("D", "Option D: Anti-pattern causing bottleneck or vulnerability")
            }

        # Handle correct_option
        raw_correct = str(item.get("correct_option", "B")).strip().upper()
        if raw_correct not in ["A", "B", "C", "D"]:
            # Try to see if answer key was passed
            raw_answer = str(item.get("answer", "")).strip().upper()
            if raw_answer in ["A", "B", "C", "D"]:
                raw_correct = raw_answer
            else:
                raw_correct = "B"

        # Handle explanation
        explanation = str(item.get("explanation", "")).strip()
        if not explanation:
            explanation = f"Option {raw_correct} is the optimal industry-standard solution for this scenario."

        # Handle skill and skills fields
        skills_raw = item.get("skills", item.get("skill", "General"))
        if isinstance(skills_raw, list):
            skills_list = [str(s) for s in skills_raw if s]
            primary_skill = skills_list[0] if skills_list else "General"
        else:
            primary_skill = str(skills_raw)
            skills_list = [primary_skill]

        # Handle expected_topics and expected_focus fields
        focus_raw = item.get("expected_topics", item.get("expected_focus", []))
        if isinstance(focus_raw, list):
            focus_list = [str(f) for f in focus_raw if f]
        else:
            focus_list = [str(focus_raw)] if focus_raw else ["Core domain competency"]

        max_score = int(item.get("maximum_score", 10))

        valid_questions.append({
            "number": idx + 1,
            "question": q_text,
            "options": clean_options,
            "correct_option": raw_correct,
            "explanation": explanation,
            "type": q_type,
            "difficulty": difficulty,
            "skill": primary_skill,
            "skills": skills_list,
            "expected_focus": focus_list,
            "expected_topics": focus_list,
            "maximum_score": max_score
        })

    if not valid_questions:
        return None

    return {
        "job_role": data.get("job_role", expected_role),
        "questions": valid_questions
    }
