"""Abstract Base Class for ATS (Applicant Tracking System) providers."""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session


VALID_ATS_STATUSES = [
    "Applied",
    "Screening",
    "Screened",
    "Shortlisted",
    "Interview Scheduled",
    "Interview In Progress",
    "Interview Completed",
    "Offered",
    "Selected",
    "Hired",
    "Rejected",
]


class ATSProvider(ABC):
    """Abstract interface defining required ATS capabilities."""

    @abstractmethod
    def create_candidate(self, candidate_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Create or register a candidate into the ATS."""
        pass

    @abstractmethod
    def get_candidate(self, candidate_id: str, db: Session) -> Optional[Dict[str, Any]]:
        """Retrieve candidate record and ATS stage by candidate ID."""
        pass

    @abstractmethod
    def list_candidates(self, filters: Optional[Dict[str, Any]], db: Session) -> List[Dict[str, Any]]:
        """List all candidates tracked in the ATS with optional stage/job filters."""
        pass

    @abstractmethod
    def update_candidate_status(
        self,
        candidate_id: str,
        new_status: str,
        changed_by: str,
        notes: Optional[str],
        job_id: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        """Update candidate stage in the ATS and record the status transition."""
        pass

    @abstractmethod
    def get_candidate_history(self, candidate_id: str, db: Session) -> List[Dict[str, Any]]:
        """Retrieve the chronological status transition history for a candidate."""
        pass

    @abstractmethod
    def create_interview(self, interview_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Associate an interview session with a candidate in the ATS."""
        pass

    @abstractmethod
    def get_candidate_interviews(self, candidate_id: str, db: Session) -> List[Dict[str, Any]]:
        """Retrieve all interview records associated with a candidate."""
        pass

    @abstractmethod
    def sync_interview_result(
        self,
        candidate_id: str,
        job_id: str,
        session_id: str,
        overall_score: float,
        summary: str,
        db: Session
    ) -> Dict[str, Any]:
        """Synchronize a completed interview result into candidate ATS status."""
        pass
