"""Pytest fixtures for HireFlow AI backend testing."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.db.session import Base, get_db
import app.db.models as models
from app.main import app
from app.core.auth import get_current_user, require_interviewer

# Setup SQLite in-memory database with StaticPool
TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all tables once for the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="db")
def db_fixture():
    """Provide a transactional database session for a test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(name="interviewer_user")
def interviewer_user_fixture(db):
    """Seed an interviewer user."""
    user = db.query(models.User).filter(models.User.email == "recruiter@hireflow.test").first()
    if not user:
        user = models.User(
            id="usr-recruiter-test-1",
            email="recruiter@hireflow.test",
            hashed_password="hashed_pw",
            name="Test Recruiter",
            role="interviewer",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture(name="candidate_user")
def candidate_user_fixture(db):
    """Seed a candidate user."""
    user = db.query(models.User).filter(models.User.email == "candidate@hireflow.test").first()
    if not user:
        user = models.User(
            id="usr-candidate-test-1",
            email="candidate@hireflow.test",
            hashed_password="hashed_pw",
            name="Alex Chen",
            role="candidate",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture(name="sample_job")
def sample_job_fixture(db, interviewer_user):
    """Seed a test job."""
    job = db.query(models.Job).filter(models.Job.title == "Senior Machine Learning Engineer").first()
    if not job:
        job = models.Job(
            id="job-ml-test-1",
            title="Senior Machine Learning Engineer",
            description="Looking for Senior ML Engineer with PyTorch, distributed training, and LLM fine-tuning experience.",
            required_skills=["Python", "PyTorch", "Transformers", "Distributed Systems", "MLOps"],
            owner_id=interviewer_user.id
        )
        db.add(job)
        db.commit()
        db.refresh(job)
    return job


@pytest.fixture(name="sample_candidate")
def sample_candidate_fixture(db, candidate_user):
    """Seed a test candidate."""
    cand = db.query(models.Candidate).filter(models.Candidate.email == "alex.chen@hireflow.test").first()
    if not cand:
        cand = models.Candidate(
            id="cand-test-alex-1",
            name="Alex Chen",
            email="alex.chen@hireflow.test",
            phone="+1-555-0199",
            source="ATS Test Portal",
            current_status="Applied",
            skills=["Python", "PyTorch", "Docker", "FastAPI", "Transformers"],
            raw_text="Experienced Senior ML Engineer with 5+ years building deep learning pipelines, fine-tuning LLMs with LoRA, and deploying models with Docker and Triton.",
            user_id=candidate_user.id
        )
        db.add(cand)
        db.commit()
        db.refresh(cand)
    return cand


@pytest.fixture(name="client")
def client_fixture(db, interviewer_user):
    """Provide a FastAPI TestClient configured to use the test database and interviewer user."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    def override_get_current_user():
        return interviewer_user

    def override_require_interviewer():
        return interviewer_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[require_interviewer] = override_require_interviewer

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(name="candidate_client")
def candidate_client_fixture(db, candidate_user):
    """Provide a FastAPI TestClient configured as candidate user."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    def override_get_current_user():
        return candidate_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
