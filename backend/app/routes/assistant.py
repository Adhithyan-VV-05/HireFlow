from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db, Candidate, User
from app.core.auth import get_current_user
from app.core.llm_utils import call_llm
from app.core.search import hybrid_search

router = APIRouter(prefix="/api", tags=["assistant"])

class AssistantRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

@router.post("/assistant-chat")
async def assistant_chat(
    request: AssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Assistant that can answer questions about candidates using RAG.
    """
    user_msg = request.message.strip()
    if not user_msg:
        return {"response": "Please provide a message so I can help you."}

    # 1. Search for relevant context
    relevant_context = ""
    try:
        # Search for relevant candidates/chunks
        search_results = hybrid_search(user_msg, top_k=5, db_session=db)
        
        context_parts = []
        is_candidate = current_user.role == "candidate"

        if search_results:
            for res in search_results:
                cand_id = res.get("candidate_id")
                if not cand_id:
                    continue
                
                # RESTRICTION: A candidate can only see their own data
                if is_candidate and cand_id != current_user.id:
                    continue
                
                candidate = db.query(Candidate).filter(Candidate.id == cand_id).first()
                if candidate:
                    skills_str = ", ".join(candidate.skills) if candidate.skills else "No skills listed"
                    raw_text = candidate.raw_text or ""
                    
                    if is_candidate:
                        context_parts.append(
                            f"MY PROFILE INFORMATION:\n"
                            f"Name: {candidate.name}\n"
                            f"My Skills: {skills_str}\n"
                            f"My Resume Content: {raw_text[:2000]}\n"
                        )
                    else:
                        context_parts.append(
                            f"Candidate Name: {candidate.name}\n"
                            f"Skills: {skills_str}\n"
                            f"Resume Excerpt: {raw_text[:1500]}\n"
                        )
        
        # Add upskilling context for candidates
        if is_candidate:
            from app.routes.upskilling import get_upskilling_recommendations
            try:
                # Call the upskilling logic (we pass job_id=None to get general info/jobs)
                upskilling = await get_upskilling_recommendations(job_id=None, db=db, current_user=current_user)
                if upskilling.get("has_resume"):
                    available_jobs = ", ".join([j["title"] for j in upskilling.get("jobs", [])])
                    context_parts.append(
                        f"SYSTEM INFO FOR ASSISTANT:\n"
                        f"Available Job Roles: {available_jobs}\n"
                        f"Instructions: If the candidate asks about studying or courses, suggest they check the Upskilling tab for personalized recommendations for these roles."
                    )
            except Exception as e:
                print(f"[Assistant] Failed to fetch upskilling context: {e}")

        relevant_context = "\n---\n".join([str(p) for p in context_parts])
    except Exception as e:
        print(f"[Assistant] RAG search failed: {e}")

    # 2. Build Prompt based on role
    if current_user.role == "candidate":
        system_prompt = (
            "You are the HireFlow Personal Career Assistant. Your goal is to help the candidate "
            "understand their own skills, prepare for interviews, and study based on their profile.\n\n"
            "YOU ONLY HAVE ACCESS TO THE LOGGED-IN CANDIDATE'S DATA. DO NOT MENTION OTHER CANDIDATES.\n\n"
            "CANDIDATE PROFILE CONTEXT:\n"
            f"{relevant_context if relevant_context else 'No specific profile data found.'}\n\n"
            "Instructions:\n"
            "- Help the candidate with their resumes, skills, and study materials.\n"
            "- Be encouraging and act as a personal coach.\n"
            "- If they ask about other candidates, politely inform them you only assist with their personal profile."
        )
    else:
        system_prompt = (
            "You are the HireFlow AI Assistant for Recruiters. Your goal is to help recruiters "
            "analyze candidate data and make hiring decisions.\n\n"
            "DATABASE CONTEXT:\n"
            f"{relevant_context if relevant_context else 'No specific candidate data found.'}\n\n"
            "Instructions:\n"
            "- Use the provided context to answer questions about candidates.\n"
            "- Provide comparative analysis if multiple candidates are in context.\n"
            "- Maintain professional tone."
        )

    # 3. Call LLM
    try:
        # Ensure history is a list of dicts
        chat_history = request.history if isinstance(request.history, list) else []
        full_history = chat_history + [{"role": "user", "content": user_msg}]
        
        response = call_llm(system_prompt, full_history)
        return {"response": response}
    except Exception as e:
        print(f"[Assistant] LLM call failed: {e}")
        raise HTTPException(500, f"Assistant failed to respond: {str(e)}")
