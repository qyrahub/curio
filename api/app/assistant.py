"""The 'Ask Curio' assistant used by the Coach homework helper and voice chat.

Calls the Anthropic Messages API when CURIO_LLM_API_KEY is configured; otherwise
returns a graceful message. Spelling / counting / simple maths are handled locally
in the browser, so those work with no key and no token cost.
"""
from __future__ import annotations

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


def ask(message: str, mode: str | None = None) -> str:
    key = settings.llm_api_key
    if not key:
        return (
            "Curio can answer homework and questions once an assistant key is set up on "
            "the server (CURIO_LLM_API_KEY). In the meantime, spelling, counting and simple "
            "maths work right away — try 'spell elephant' or 'count to 20'."
        )
    system = _HW_SYS if mode == "homework" else _CHAT_SYS
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
                "max_tokens": 1024,
                "system": system,
                "messages": [{"role": "user", "content": message}],
            },
            timeout=40,
        )
        resp.raise_for_status()
        data = resp.json()
        parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
        return "\n".join(p for p in parts if p).strip() or "Sorry, I couldn't find an answer."
    except Exception:
        return "Sorry — I couldn't reach the assistant just now. Please try again in a moment."
