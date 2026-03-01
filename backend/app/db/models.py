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
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", backref="applications")
    candidate = relationship("Candidate", backref="applications")
    applied_resume = relationship("Resume")
