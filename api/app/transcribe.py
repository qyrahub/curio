"""OpenAI Whisper transcription helper.

Kept intentionally provider-agnostic at the seam: this function takes raw audio
bytes and returns transcribed text. If we ever want to swap OpenAI Whisper for
Groq (OpenAI-compatible endpoint, ~3x cheaper), self-hosted faster-whisper on
the VPS, or anything else, only this file changes.

Configuration:
    OPENAI_API_KEY   — required. Set in api/.env alongside CURIO_ASK_MODEL.

Costs:
    OpenAI Whisper (whisper-1) = $0.006 / audio minute. For a family journaling
    5-10 min/day that's under $0.10/month/family.

Design notes:
    - No openai SDK dependency. httpx is already in the project; a direct POST
      to /v1/audio/transcriptions with multipart form-data is 15 lines.
    - 25 MB is the Whisper API hard limit. We enforce it at the endpoint.
    - Errors get turned into HTTPExceptions with sensible codes so the client
      can distinguish "not configured" (503) from "OpenAI rejected the upload"
      (502) from "you sent something too big" (413).
"""
from __future__ import annotations

import os

import httpx
from fastapi import HTTPException

OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions"
OPENAI_TIMEOUT_S = 120.0  # 2 min upload/transcode budget; long dictations included


async def openai_transcribe(audio: bytes, filename: str = "audio.webm",
                             content_type: str = "audio/webm") -> str:
    """Transcribe audio bytes via OpenAI Whisper. Returns plain text or raises.

    Raises HTTPException — do not catch and swallow here; the endpoint layer
    turns those into proper HTTP responses.
    """
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        # 503 rather than 500 — this is a config issue, not code failure.
        raise HTTPException(
            status_code=503,
            detail="Transcription is not configured. Set OPENAI_API_KEY in api/.env.",
        )

    files = {
        "file": (filename, audio, content_type),
        # Whisper API multipart form fields are passed alongside the file.
        "model": (None, "whisper-1"),
        "response_format": (None, "text"),
    }
    headers = {"Authorization": f"Bearer {key}"}

    try:
        async with httpx.AsyncClient(timeout=OPENAI_TIMEOUT_S) as client:
            r = await client.post(OPENAI_TRANSCRIBE_URL, headers=headers, files=files)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Transcription timed out.")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Transcription upstream error: {e}")

    if r.status_code != 200:
        # Trim the upstream body so we never leak keys, prompts, or long stack
        # traces to the client. First 200 chars is enough to diagnose.
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI rejected the request ({r.status_code}): {r.text[:200]}",
        )

    # response_format=text returns the transcript as plain text, no JSON.
    return r.text.strip()
