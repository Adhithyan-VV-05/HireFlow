"""Shared LLM utilities for API calls and text generation."""

import os
import re
import json
from typing import Dict

# LLM client state
_openai_client = None
_gemini_model = None
_llm_provider = None


def init_llm():
    """Initialize the LLM client. Tries Gemini first, then OpenAI."""
    global _openai_client, _gemini_model, _llm_provider

    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
            _llm_provider = "gemini"
            print("[LLM] Using Gemini API (Primary)")
            
            # Still init OpenAI client in case we need to fall back
            openai_key = os.environ.get("OPENAI_API_KEY")
            if openai_key:
                import openai
                _openai_client = openai.OpenAI(api_key=openai_key)
                print("[LLM] OpenAI client initialized (Secondary)")
            return
        except Exception as e:
            print(f"[LLM] Gemini init failed: {e}")

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            import openai
            _openai_client = openai.OpenAI(api_key=openai_key)
            _llm_provider = "openai"
            print("[LLM] Using OpenAI API")
            return
        except Exception as e:
            print(f"[LLM] OpenAI init failed: {e}")

    print("[LLM] WARNING: No healthy LLM API key found. Set OPENAI_API_KEY or GEMINI_API_KEY.")
    _llm_provider = "mock"


def call_llm(system_prompt: str, messages: list) -> str:
    """Call the LLM API with conversation history."""
    # Try the active provider
    try:
        if _llm_provider == "openai" and _openai_client:
            return _call_openai(system_prompt, messages)
        elif _llm_provider == "gemini" and _gemini_model:
            return _call_gemini(system_prompt, messages)
    except Exception as e:
        # If OpenAI fails due to quota, try Gemini if available
        if "insufficient_quota" in str(e).lower() and _gemini_model:
            print("[LLM] OpenAI Quota exceeded. Falling back to Gemini...")
            return _call_gemini(system_prompt, messages)
        raise e

    # Mock response for testing without API keys
    is_interview = any(msg["role"] == "user" for msg in messages)
    if is_interview:
        question_num = sum(1 for m in messages if m["role"] == "assistant") + 1
        return (
            f"Thank you for sharing that. Here's my next question (#{question_num}): "
            f"Can you tell me about a challenging project you've worked on recently? [SCORE:6]"
        )
    return "{}"


def _call_openai(system_prompt: str, messages: list) -> str:
    full_messages = [{"role": "system", "content": system_prompt}]
    full_messages.extend(messages)
    response = _openai_client.chat.completions.create(
        model="gpt-3.5-turbo-1106",
        messages=full_messages,
        temperature=0.7,
        max_tokens=500,
    )
    return response.choices[0].message.content


def _call_gemini(system_prompt: str, messages: list) -> str:
    prompt_parts = [f"System: {system_prompt}\n"]
    for msg in messages:
        role = "Interviewer" if msg["role"] == "assistant" else "Candidate"
        prompt_parts.append(f"{role}: {msg['content']}")
    
    if any(msg["role"] == "user" for msg in messages):
        prompt_parts.append("Interviewer:")

    response = _gemini_model.generate_content("\n".join(prompt_parts))
    return response.text


def evaluate_aptitude_with_llm(skills: list, text: str) -> dict:
    """Uses LLM to evaluate the candidate's actual depth of experience for each skill.
    
    Args:
        skills: List of skills extracted from the resume
        text: Full resume text
        
    Returns:
        Dict mapping skill names to float scores (0.0 to 1.0)
    """
    if not skills or _llm_provider == "mock":
        return _mock_evaluate_aptitude(skills, text)

    system_prompt = (
        "You are an expert technical recruiter analyzing a candidate's resume. "
        "Evaluate the candidate's real-world proficiency and experience for the following specific skills, "
        "using context clues like years of experience, complexity of projects, leadership, and phrasing.\n\n"
        f"Skills to evaluate: {', '.join(skills)}\n\n"
        "Return the evaluation strictly as a valid JSON object where the keys are the exact skill names "
        "provided, and the values are floats between 0.00 and 1.00. "
        "A score of 0.40 means basic exposure, 0.70 means solid professional experience, "
        "and 1.00 means absolute mastery/architect level. Do not include any other text."
    )

    messages = [
        {"role": "user", "content": f"Here is the resume text:\n\n{text[:6000]}"} # limit text size just in case 
    ]
    
    try:
        response_text = call_llm(system_prompt, messages)
        # Attempt to parse out the JSON
        # Clean up possible markdown wrappers
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        scores = json.loads(clean_text)
        
        # Validate shapes and ranges
        result = {}
        for skill in skills:
            if skill in scores:
                try:
                    val = float(scores[skill])
                    result[skill] = round(max(0.0, min(1.0, val)), 2)
                except ValueError:
                    result[skill] = 0.40
            else:
                result[skill] = 0.40 # Default fallback if missing
                
        return result
        
    except Exception as e:
        print(f"[LLM] Aptitude evaluation failed, falling back: {e}")
        return _mock_evaluate_aptitude(skills, text)


def _mock_evaluate_aptitude(skills: list, text: str) -> dict:
    """Heuristic aptitude score fallback based on mention frequency."""
    text_lower = text.lower()
    top_half = text_lower[: len(text_lower) // 2]
    scores = {}

    for skill in skills:
        skill_lower = skill.lower()
        count = len(re.findall(r'\b' + re.escape(skill_lower) + r'\b', text_lower))
        if count == 0:
            score = 0.40
        else:
            score = min(1.0, 0.40 + (count - 1) * 0.12)

        if re.search(r'\b' + re.escape(skill_lower) + r'\b', top_half):
            score = min(1.0, score + 0.05)

        scores[skill] = round(score, 2)

    return scores
