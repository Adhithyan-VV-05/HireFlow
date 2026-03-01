"""HireFlow AI — FastAPI Application.

Slim app factory: creates FastAPI instance, registers CORS,
includes all routers, and defines the startup event.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.db import init_db
from app.routes import auth, resume, jobs, candidates, interview, evaluate, upskilling, assistant, skill_test

app = FastAPI(
    title="HireFlow AI",
    description="AI-driven recruitment automation system",
    version="2.0.0",
)

# Browser-compliant CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(interview.router)
app.include_router(evaluate.router)
app.include_router(upskilling.router)
app.include_router(assistant.router)
app.include_router(skill_test.router)


@app.on_event("startup")
async def startup():
    """Initialize database and load ML models."""
    print("[Startup] Initializing database...")
    init_db()

    from app.services.ml_models import load_all_models
    load_all_models()

    print("[Startup] HireFlow AI is ready!")


@app.get("/")
async def root():
    return {"message": "HireFlow AI API", "version": "2.0.0"}
