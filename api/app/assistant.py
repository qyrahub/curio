"""The 'Ask Curio' assistant used by the Coach homework helper and voice chat.

Calls the Anthropic Messages API when CURIO_LLM_API_KEY is configured; otherwise
returns a graceful message. Spelling / counting / simple maths are handled locally
in the browser, so those work with no key and no token cost.
"""
from __future__ import annotations

import sys
import httpx

from .config import settings

_CHAT_SYS = (
    "You are Curio, a friendly and safe assistant for children and families. "
    "Keep replies short, clear, warm and age-appropriate. If asked to spell a word, "
    "spell it out letter by letter. Never produce anything unsafe or unsuitable for a "
    "child; if asked, gently decline and suggest asking a trusted adult."
)
_HW_SYS = (
    "You are Curio, a kind and encouraging homework helper for a child. The user gives "
    "homework questions, instructions or a list of points. Answer EACH item and PRESERVE "
    "THE EXACT FORMAT of the input — keep the same numbering or bullet style and the same "
    "order. If an item is a problem to solve, give the answer and a brief, simple "
    "explanation of how you got it so the child learns. Use clear, age-appropriate "
    "language. If anything is unsafe or unsuitable for a child, gently decline and suggest "
    "asking a trusted adult."
)
_DEV_SYS = (
    "You are a paediatric learning & development planning assistant helping a PARENT "
    "(not a child). Be specific, concrete and evidence-informed; avoid generic filler and "
    "tailor everything to the exact child, age and situation described — two different "
    "situations must produce clearly different plans. Ground advice in established "
    "child-development strategies; for attention/ADHD-type needs use predictable routines, "
    "externalised/visible time, one instruction at a time, task chunking, movement breaks, "
    "reduced distractions and immediate specific praise. Prefer measurable, trackable actions "
    "with realistic durations. When the user's message says to 'Return ONLY JSON', reply with "
    "strictly valid JSON and nothing else — no preamble, no markdown, no code fences. This is "
    "practical guidance for a parent, not a diagnosis."
)


def ask(message: str, mode: str | None = None) -> str:
    key = settings.llm_api_key
    if not key:
        return (
            "Curio can answer homework and questions once an assistant key is set up on "
            "the server (CURIO_LLM_API_KEY). In the meantime, spelling, counting and simple "
            "maths work right away — try 'spell elephant' or 'count to 20'."
        )
    if mode == "homework":
        system = _HW_SYS
    elif mode == "develop":
        system = _DEV_SYS
    else:
        system = _CHAT_SYS
    max_tokens = 2000 if mode == "develop" else 1024
    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.ask_model,
                "max_tokens": max_tokens,
                "system": system,
                "messages": [{"role": "user", "content": message}],
            },
            timeout=40,
        )
        if resp.status_code != 200:
            print(f"[ask-error] status={resp.status_code} model={settings.ask_model} body={resp.text[:400]}", file=sys.stderr, flush=True)
            resp.raise_for_status()
        data = resp.json()
        parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
        out = "\n".join(p for p in parts if p).strip()
        if out.startswith("```"):
            out = out.strip("`")
            if out[:4].lower() == "json":
                out = out[4:].strip()
        return out or "Sorry, I couldn't find an answer."
    except Exception as e:
        print(f"[ask-error] {type(e).__name__}: {e} model={settings.ask_model}", file=sys.stderr, flush=True)
        return "Sorry — I couldn't reach the assistant just now. Please try again in a moment."


def ask_vision(message: str, image_b64: str, media_type: str = "image/jpeg", mode: str | None = None) -> str:
    """Analyse an image (e.g. a photo of school work) with the same model + key."""
    key = settings.llm_api_key
    if not key:
        return "Image analysis needs an assistant key (CURIO_LLM_API_KEY)."
    system = _DEV_SYS if mode == "develop" else _CHAT_SYS
    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={
                "model": settings.ask_model,
                "max_tokens": 2000,
                "system": system,
                "messages": [{"role": "user", "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_b64}},
                    {"type": "text", "text": message},
                ]}],
            },
            timeout=60,
        )
        if resp.status_code != 200:
            print(f"[ask-error] vision status={resp.status_code} model={settings.ask_model} body={resp.text[:400]}", file=sys.stderr, flush=True)
            resp.raise_for_status()
        data = resp.json()
        parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
        out = "\n".join(p for p in parts if p).strip()
        if out.startswith("```"):
            out = out.strip("`")
            if out[:4].lower() == "json":
                out = out[4:].strip()
        return out or "Sorry, I couldn't read that image."
    except Exception as e:
        print(f"[ask-error] vision {type(e).__name__}: {e} model={settings.ask_model}", file=sys.stderr, flush=True)
        return "Sorry — I couldn't analyse that image just now."
