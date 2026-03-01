"""Pydantic request/response schemas for HireFlow AI API."""

from typing import Optional, List
from pydantic import BaseModel, EmailStr


# --- Auth ---

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # 'candidate' or 'interviewer'


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# --- Existing ---

class MatchRequest(BaseModel):
    job_description: str
    top_k: int = 10


class StartInterviewRequest(BaseModel):
    candidate_id: str
    job_id: str


class InterviewMessageRequest(BaseModel):
    session_id: str
    user_message: str


class CreateJobRequest(BaseModel):
    title: str
    description: str
    required_skills: List[str] = []
    deadline: Optional[str] = None


class ScheduleInterviewRequest(BaseModel):
    candidate_id: str
    job_id: str
    scheduled_at: str  # ISO format string
    is_video_call: bool = True


class ApplyJobRequest(BaseModel):
    job_id: str
    additional_details: str = ""
    portfolio_url: Optional[str] = None
    start_date: Optional[str] = None
