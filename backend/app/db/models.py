"""SQLAlchemy ORM models for HireFlow AI."""

import json
from datetime import datetime

from sqlalchemy import Column, Text, Integer, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    email = Column(Text, unique=True, nullable=False, index=True)
    hashed_password = Column(Text, nullable=False)
    role = Column(Text, nullable=False)  # 'candidate' or 'interviewer'
    created_at = Column(DateTime, default=datetime.utcnow)


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey("users.id"), nullable=True)
    name = Column(Text, default="")
    email = Column(Text, default="")
    skills_json = Column(Text, default="[]")
    entities_json = Column(Text, default="{}")
    aptitude_scores_json = Column(Text, default="{}")
    raw_text = Column(Text, default="")
    phone = Column(Text, default="")
    source = Column(Text, default="Direct")
    current_status = Column(Text, default="Applied")
    screening_score = Column(Float, nullable=True)
    screening_summary = Column(Text, nullable=True)
    screening_recommendation = Column(Text, nullable=True)
    hired_at = Column(DateTime, nullable=True)
    profile_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="candidate_profiles", foreign_keys=[user_id])
    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")

    @property
    def skills(self):
        return json.loads(self.skills_json) if self.skills_json else []

    @skills.setter
    def skills(self, value):
        self.skills_json = json.dumps(value)

    @property
    def entities(self):
        return json.loads(self.entities_json) if self.entities_json else {}

    @entities.setter
    def entities(self, value):
        self.entities_json = json.dumps(value)

    @property
    def aptitude_scores(self):
        return json.loads(self.aptitude_scores_json) if self.aptitude_scores_json else {}

    @aptitude_scores.setter
    def aptitude_scores(self, value):
        self.aptitude_scores_json = json.dumps(value)

    @property
    def profile(self):
        if self.profile_json and self.profile_json.strip() not in ("{}", ""):
            try:
                parsed = json.loads(self.profile_json)
                if parsed and isinstance(parsed, dict) and "education" in parsed:
                    return parsed
            except Exception:
                pass
        from app.core.profiler import extract_candidate_profile
        extracted = extract_candidate_profile(self.raw_text or "", self.entities, self.skills)
        if self.name:
            extracted["name"] = self.name
        if self.email:
            extracted["email"] = self.email
        if self.phone:
            extracted["phone"] = self.phone
        return extracted

    @profile.setter
    def profile(self, value):
        self.profile_json = json.dumps(value)


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Text, primary_key=True)
    candidate_id = Column(Text, ForeignKey("candidates.id"), nullable=False)
    file_name = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="resumes")


class FaissMetadata(Base):
    __tablename__ = "faiss_metadata"

    vector_id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Text, nullable=False)
    chunk_type = Column(Text, nullable=False)
    chunk_text = Column(Text, default="")
    metadata_json = Column(Text, default="{}")

    @property
    def chunk_metadata(self):
        return json.loads(self.metadata_json) if self.metadata_json else {}

    @chunk_metadata.setter
    def chunk_metadata(self, value):
        self.metadata_json = json.dumps(value)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Text, primary_key=True)
    owner_id = Column(Text, ForeignKey("users.id"), nullable=True)
    title = Column(Text, default="")
    description = Column(Text, default="")
    required_skills_json = Column(Text, default="[]")
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", backref="jobs", foreign_keys=[owner_id])

    @property
    def required_skills(self):
        return json.loads(self.required_skills_json) if self.required_skills_json else []

    @required_skills.setter
    def required_skills(self, value):
        self.required_skills_json = json.dumps(value)


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Text, primary_key=True)
    candidate_id = Column(Text, nullable=False)
    interviewer_id = Column(Text, nullable=True)
    job_id = Column(Text, nullable=False)
    transcript_json = Column(Text, default="[]")
    running_scores_json = Column(Text, default="{}")
    total_score = Column(Float, default=0.0)
    status = Column(Text, default="active")
    scheduled_at = Column(DateTime, nullable=True)
    meeting_link = Column(Text, nullable=True)
    is_video_call = Column(Boolean, default=False)
    
    # Advanced scheduling fields
    schedule_status = Column(Text, default="pending")  # pending, accepted, rescheduling
    candidate_availability_range = Column(Text, nullable=True)
    schedule_description = Column(Text, nullable=True)
    
    # Real-time ready status
    interviewer_ready = Column(Boolean, default=False)
    candidate_ready = Column(Boolean, default=False)
    last_ready_check = Column(DateTime, nullable=True)
    
    # Interview notes and feedback
    interviewer_notes = Column(Text, nullable=True)
    feedback_stars = Column(Integer, nullable=True)
    feedback_text = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def transcript(self):
        return json.loads(self.transcript_json) if self.transcript_json else []

    @transcript.setter
    def transcript(self, value):
        self.transcript_json = json.dumps(value)

    @property
    def running_scores(self):
        return json.loads(self.running_scores_json) if self.running_scores_json else {}

    @running_scores.setter
    def running_scores(self, value):
        self.running_scores_json = json.dumps(value)


class AptitudeTest(Base):
    __tablename__ = "aptitude_tests"

    id = Column(Text, primary_key=True)
    candidate_id = Column(Text, ForeignKey("candidates.id"), nullable=False)
    transcript_json = Column(Text, default="[]")
    status = Column(Text, default="active")  # active, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", backref="aptitude_tests")

    @property
    def transcript(self):
        return json.loads(self.transcript_json) if self.transcript_json else []

    @transcript.setter
    def transcript(self, value):
        self.transcript_json = json.dumps(value)


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Text, primary_key=True)
    job_id = Column(Text, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Text, ForeignKey("candidates.id"), nullable=False)
    applied_resume_id = Column(Text, ForeignKey("resumes.id"), nullable=True)
    additional_details = Column(Text, default="")
    portfolio_url = Column(Text, nullable=True)
    start_date = Column(Text, nullable=True)
    status = Column(Text, default="pending")  # pending, reviewed, accepted, rejected
    
    # Advanced Ranking Scores
    overall_score = Column(Float, default=0.0)
    skill_match_score = Column(Float, default=0.0)
    semantic_score = Column(Float, default=0.0)
    quality_score = Column(Float, default=0.0)
    impact_score = Column(Float, default=0.0)
    completeness_score = Column(Float, default=0.0)
    analysis_json = Column(Text, default="{}")

    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", backref="applications")
    candidate = relationship("Candidate", backref="applications")
    applied_resume = relationship("Resume")


class SkillAssessment(Base):
    __tablename__ = "skill_assessments"

    id = Column(Text, primary_key=True)
    candidate_id = Column(Text, ForeignKey("candidates.id"), nullable=False)
    skill_name = Column(Text, nullable=False)
    score = Column(Integer, default=0)
    percentage = Column(Float, default=0.0)
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", backref="skill_assessments")


class CandidateStatusHistory(Base):
    __tablename__ = "candidate_status_history"

    id = Column(Text, primary_key=True)
    candidate_id = Column(Text, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Text, ForeignKey("jobs.id"), nullable=True)
    from_status = Column(Text, nullable=True)
    to_status = Column(Text, nullable=False)
    changed_by = Column(Text, nullable=True)  # user id, recruiter name, or "system"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", backref="status_history")
    job = relationship("Job")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Text, primary_key=True)
    candidate_id = Column(Text, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Text, ForeignKey("jobs.id"), nullable=False)
    interviewer_id = Column(Text, ForeignKey("users.id"), nullable=True)
    interview_type = Column(Text, default="mixed")  # technical, behavioral, situational, resume-based, mixed
    status = Column(Text, default="in_progress")  # scheduled, in_progress, completed, cancelled
    question_count = Column(Integer, default=5)
    current_question_index = Column(Integer, default=0)
    overall_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    behavioral_score = Column(Float, default=0.0)
    questions_json = Column(Text, default="[]")
    summary_report_json = Column(Text, default="{}")
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", backref="interview_sessions")
    job = relationship("Job", backref="interview_sessions")
    interviewer = relationship("User", foreign_keys=[interviewer_id])
    responses = relationship("InterviewResponse", back_populates="session", cascade="all, delete-orphan", order_by="InterviewResponse.question_index")

    @property
    def questions(self):
        return json.loads(self.questions_json) if self.questions_json else []

    @questions.setter
    def questions(self, value):
        self.questions_json = json.dumps(value)

    @property
    def summary_report(self):
        return json.loads(self.summary_report_json) if self.summary_report_json else {}

    @summary_report.setter
    def summary_report(self, value):
        self.summary_report_json = json.dumps(value)


class InterviewResponse(Base):
    __tablename__ = "interview_responses"

    id = Column(Text, primary_key=True)
    session_id = Column(Text, ForeignKey("interview_sessions.id"), nullable=False)
    question_index = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    question_type = Column(Text, default="technical")
    difficulty = Column(Text, default="intermediate")
    skill = Column(Text, default="")
    expected_focus_json = Column(Text, default="[]")
    candidate_answer = Column(Text, default="")
    score = Column(Float, default=0.0)
    evaluation_json = Column(Text, default="{}")
    submitted_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="responses")

    @property
    def expected_focus(self):
        return json.loads(self.expected_focus_json) if self.expected_focus_json else []

    @expected_focus.setter
    def expected_focus(self, value):
        self.expected_focus_json = json.dumps(value)

    @property
    def evaluation(self):
        return json.loads(self.evaluation_json) if self.evaluation_json else {}

    @evaluation.setter
    def evaluation(self, value):
        self.evaluation_json = json.dumps(value)


class VoiceScreeningSession(Base):
    __tablename__ = "voice_screening_sessions"

    id = Column(Text, primary_key=True)
    candidate_id = Column(Text, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Text, ForeignKey("jobs.id"), nullable=True)
    interviewer_id = Column(Text, ForeignKey("users.id"), nullable=True)
    status = Column(Text, default="ready")  # ready, in_progress, completed, cancelled
    question_count = Column(Integer, default=3)
    current_question_index = Column(Integer, default=0)
    questions_json = Column(Text, default="[]")
    
    # 5-Dimensional Assessment Scores (0-100)
    overall_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.0)
    completeness_score = Column(Float, default=0.0)
    role_knowledge_score = Column(Float, default=0.0)
    recommendation = Column(Text, default="")  # Proceed to Next Round / Requires Further Review / Do Not Proceed at This Stage
    summary_report_json = Column(Text, default="{}")
    duration_seconds = Column(Integer, default=0)
    audio_stored = Column(Boolean, default=False)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", backref="voice_screening_sessions")
    job = relationship("Job", backref="voice_screening_sessions")
    interviewer = relationship("User", foreign_keys=[interviewer_id])
    responses = relationship(
        "VoiceScreeningResponse",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="VoiceScreeningResponse.question_index"
    )

    @property
    def questions(self):
        return json.loads(self.questions_json) if self.questions_json else []

    @questions.setter
    def questions(self, value):
        self.questions_json = json.dumps(value)

    @property
    def summary_report(self):
        return json.loads(self.summary_report_json) if self.summary_report_json else {}

    @summary_report.setter
    def summary_report(self, value):
        self.summary_report_json = json.dumps(value)


class VoiceScreeningResponse(Base):
    __tablename__ = "voice_screening_responses"

    id = Column(Text, primary_key=True)
    session_id = Column(Text, ForeignKey("voice_screening_sessions.id"), nullable=False)
    question_index = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    question_type = Column(Text, default="technical")
    skill = Column(Text, default="")
    candidate_response = Column(Text, default="")  # Transcribed speech
    duration_seconds = Column(Float, default=0.0)
    score = Column(Float, default=0.0)
    evaluation_json = Column(Text, default="{}")
    submitted_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("VoiceScreeningSession", back_populates="responses")

    @property
    def evaluation(self):
        return json.loads(self.evaluation_json) if self.evaluation_json else {}

    @evaluation.setter
    def evaluation(self, value):
        self.evaluation_json = json.dumps(value)


class UserFeedback(Base):
    __tablename__ = "user_feedbacks"

    id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey("users.id"), nullable=True)
    user_role = Column(Text, default="recruiter")
    rating = Column(Integer, nullable=False)  # 1 to 5
    feedback_text = Column(Text, default="")
    feature = Column(Text, default="recruitment_dashboard")
    created_at = Column(DateTime, default=datetime.utcnow)


