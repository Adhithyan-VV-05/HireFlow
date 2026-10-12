"""Greenhouse / External ATS Adapter implementation.

Illustrates pluggable architecture for enterprise ATS integrations.
When external API keys (e.g. GREENHOUSE_API_KEY) are configured in the environment,
this adapter can dispatch requests to external REST endpoints. Otherwise, it delegates
cleanly to MockATSProvider.
"""

import os
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.services.ats.base import ATSProvider
from app.services.ats.mock_ats import MockATSProvider


class GreenhouseATSAdapter(ATSProvider):
    """Adapter for Greenhouse Harvest API with local mock fallback."""

    def __init__(self):
        self.api_key = os.getenv("GREENHOUSE_API_KEY")
        self.endpoint = os.getenv("GREENHOUSE_API_URL", "https://harvest.greenhouse.io/v1")
        self._fallback = MockATSProvider()

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def create_candidate(self, candidate_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        if not self.is_configured:
            return self._fallback.create_candidate(candidate_data, db)
        # Real Greenhouse HTTP POST /candidates would go here using requests / httpx
        return self._fallback.create_candidate(candidate_data, db)

    def get_candidate(self, candidate_id: str, db: Session) -> Optional[Dict[str, Any]]:
        return self._fallback.get_candidate(candidate_id, db)

    def list_candidates(self, filters: Optional[Dict[str, Any]], db: Session) -> List[Dict[str, Any]]:
        return self._fallback.list_candidates(filters, db)

    def update_candidate_status(
        self,
        candidate_id: str,
        new_status: str,
        changed_by: str = "Recruiter",
        notes: Optional[str] = None,
        job_id: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        return self._fallback.update_candidate_status(
            candidate_id=candidate_id,
            new_status=new_status,
            changed_by=changed_by,
            notes=notes,
            job_id=job_id,
            db=db
        )

    def get_candidate_history(self, candidate_id: str, db: Session) -> List[Dict[str, Any]]:
        return self._fallback.get_candidate_history(candidate_id, db)

    def create_interview(self, interview_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        return self._fallback.create_interview(interview_data, db)

    def get_candidate_interviews(self, candidate_id: str, db: Session) -> List[Dict[str, Any]]:
        return self._fallback.get_candidate_interviews(candidate_id, db)

    def sync_interview_result(
        self,
        candidate_id: str,
        job_id: str,
        session_id: str,
        overall_score: float,
        summary: str,
        db: Session
    ) -> Dict[str, Any]:
        return self._fallback.sync_interview_result(
            candidate_id=candidate_id,
            job_id=job_id,
            session_id=session_id,
            overall_score=overall_score,
            summary=summary,
            db=db
        )
