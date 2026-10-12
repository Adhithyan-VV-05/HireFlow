"""ATS Service Factory."""

import os
from app.services.ats.base import ATSProvider
from app.services.ats.mock_ats import MockATSProvider
from app.services.ats.greenhouse import GreenhouseATSAdapter

_current_provider: ATSProvider = None


def get_ats_provider() -> ATSProvider:
    """Retrieve active ATS provider based on configuration."""
    global _current_provider
    if _current_provider is None:
        provider_name = os.getenv("ATS_PROVIDER", "mock").lower()
        if provider_name == "greenhouse":
            _current_provider = GreenhouseATSAdapter()
        else:
            _current_provider = MockATSProvider()
    return _current_provider
