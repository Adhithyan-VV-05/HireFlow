"""HireFlow AI — FastAPI Application.

Slim app factory: creates FastAPI instance, registers CORS,
includes all routers, and defines the startup event.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.db import init_db
from app.routes import auth, resume, jobs, candidates, interview, evaluate, upskilling, assistant

app = FastAPI(
    title="HireFlow AI",
    description="AI-driven recruitment automation system",
    version="2.0.0",
)

# Advanced CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev, all origins. If credentials needed, replace with list.
    allow_credentials=True,
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
