"""HireFlow AI — FastAPI Application.

Slim app factory: creates FastAPI instance, registers CORS,
includes all routers, and defines the startup event.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.db import init_db
from app.routes import (
    auth,
    resume,
    jobs,
    candidates,
    interview,
    evaluate,
    upskilling,
    assistant,
    skill_test,
    ats,
    interview_simulation,
    voice_screening,
    analytics,
    voice,
)

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
app.include_router(ats.router)
app.include_router(interview_simulation.router)
app.include_router(voice_screening.router)
app.include_router(analytics.router)
app.include_router(voice.router)



@app.on_event("startup")
async def startup():
    """Initialize database and load ML models."""
    print("[Startup] Initializing database...", flush=True)
    init_db()

    import threading
    from app.services.ml_models import load_all_models
    threading.Thread(target=load_all_models, daemon=True).start()

    print("[Startup] HireFlow AI API server is ready!", flush=True)


@app.get("/")
async def root():
    return {"message": "HireFlow AI API", "version": "2.0.0"}


# Static asset mounting for unified single-container deployment
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(_frontend_dist):
    _assets_dir = os.path.join(_frontend_dist, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/app")
    @app.get("/app/{catchall:path}")
    async def serve_frontend(catchall: str = ""):
        """Serve the compiled React frontend for unified deployment."""
        index_file = os.path.join(_frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": "Frontend build index.html not found"}

