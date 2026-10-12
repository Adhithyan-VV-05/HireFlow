"""Centralized OpenRouter AI Service for HireFlow AI.

Provides OpenRouter client integration for AI interview question generation,
candidate answer evaluation, and scoring. Falls back gracefully to Google Gemini,
OpenAI, or deterministic heuristics when external API keys are unavailable.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
import httpx

logger = logging.getLogger("hireflow.openrouter")

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct"


def get_openrouter_api_key() -> Optional[str]:
    """Retrieve the OpenRouter API key from the environment."""
    return os.environ.get("OPENROUTER_API_KEY")


def get_openrouter_model() -> str:
    """Retrieve configured OpenRouter model, defaulting to Llama 3.3 70B."""
    return os.environ.get("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)


def is_openrouter_configured() -> bool:
    """Check if OpenRouter is configured with a valid API key."""
    key = get_openrouter_api_key()
    return bool(key and len(key.strip()) > 5)


def call_openrouter(
    system_prompt: str,
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 1500,
    timeout_seconds: float = 30.0
) -> str:
    """Call OpenRouter API to generate text or structured JSON.
    
    Args:
        system_prompt: High-level instructions (system role).
        messages: Conversation history (list of {"role": "user"|"assistant", "content": str}).
        model: Target model name on OpenRouter (optional).
        temperature: Sampling temperature.
        max_tokens: Maximum tokens to generate.
        timeout_seconds: Request timeout in seconds.
        
    Returns:
        Raw string response from the OpenRouter model.
        
    Raises:
        RuntimeError if OpenRouter API key is missing or request fails.
    """
    api_key = get_openrouter_api_key()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured in backend environment.")

    target_model = model or get_openrouter_model()

    payload = {
        "model": target_model,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hireflow.ai",
        "X-Title": "HireFlow AI Recruitment Platform"
    }

    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            resp = client.post(OPENROUTER_API_URL, json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"OpenRouter API returned HTTP {resp.status_code}: {resp.text}"
                )

            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("OpenRouter response contained no choices.")

            content = choices[0].get("message", {}).get("content", "")
            return content.strip()

    except httpx.TimeoutException:
        raise TimeoutError(f"OpenRouter request timed out after {timeout_seconds}s.")
    except Exception as e:
        logger.warning(f"[OpenRouter] API call failed: {e}")
        raise e
