"""Structured error log for the admin tech tab.

Purpose: keep a compact record of upstream and internal errors so an admin
can see what's failing in the field, without ever surfacing raw upstream
detail (which can include API keys, tokens, prompts or stack traces) to
end users.

Discipline preserved by every writer:
- Never store the raw OPENAI_API_KEY, ANTHROPIC_API_KEY, or any other
  environment secret. Values matching sk-... / xai-... / Bearer <hex>
  patterns get redacted before writing.
- Never store user-supplied audio, images, or personal file contents.
  Only metadata (endpoint, status, error class, short message).
- Bounded: entries expire after two days, either via the /purge admin
  endpoint or the ops cron that hits it daily.

Storage: MongoDB collection `admin_errors`. Same store the rest of Curio
uses; no new infrastructure.
"""
from __future__ import annotations

import datetime as _dt
import re
import time
import uuid
from typing import Any

from .store import coll_delete, coll_list, coll_put  # existing helpers in store.py

COLL = "admin_errors"
RETAIN_DAYS = 2

# Patterns that must never land in the DB even by accident. Order matters —
# the more-specific ones run first so short matches inside long tokens still
# get scrubbed.
_REDACT_PATTERNS = [
    (re.compile(r"sk-[A-Za-z0-9_\-]{10,}"), "sk-***"),
    (re.compile(r"xai-[A-Za-z0-9_\-]{10,}"), "xai-***"),
    (re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]{10,}", re.IGNORECASE), "Bearer ***"),
    (re.compile(r"[A-Za-z0-9]{32,}"), "***"),  # generic long-token catch-all
    (re.compile(r"password\s*[:=]\s*\S+", re.IGNORECASE), "password=***"),
]


def _redact(s: str) -> str:
    if not s:
        return ""
    out = s
    for pat, sub in _REDACT_PATTERNS:
        out = pat.sub(sub, out)
    # Also truncate anything unreasonably long so a single upstream stack
    # trace can't blow up the collection.
    return out[:800]


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat()


def log_error(
    *,
    endpoint: str,
    status: int,
    kind: str,
    message: str,
    upstream: str = "",
    user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record an error. Never raises — logging must not itself break a request."""
    try:
        entry = {
            "id": uuid.uuid4().hex,
            "created_at": _now(),
            "epoch": int(time.time()),
            "endpoint": (endpoint or "")[:120],
            "status": int(status),
            "kind": (kind or "")[:60],
            "message": _redact(message)[:400],
            "upstream": _redact(upstream)[:400] if upstream else "",
            "user_id": (user_id or "")[:80],
            "extra": {k: _redact(str(v))[:200] for k, v in (extra or {}).items()},
        }
        coll_put(COLL, entry)
    except Exception:
        # Structured logging must never fail the caller. Silence is safe here.
        pass


def list_errors(limit: int = 200) -> list[dict[str, Any]]:
    try:
        rows = coll_list(COLL, {})
        # Most recent first.
        rows.sort(key=lambda r: r.get("epoch", 0), reverse=True)
        return rows[:limit]
    except Exception:
        return []


def purge_old(retain_days: int = RETAIN_DAYS) -> int:
    """Delete entries older than N days. Returns number deleted."""
    try:
        cutoff = int(time.time()) - retain_days * 86400
        # We don't have a $lt helper on coll_delete, so we filter in Python
        # over the current list. Volume is tiny (bounded to a few thousand at
        # most given retention), so this is fine.
        rows = coll_list(COLL, {})
        old = [r for r in rows if r.get("epoch", 0) < cutoff]
        n = 0
        for r in old:
            n += coll_delete(COLL, {"id": r.get("id")})
        return n
    except Exception:
        return 0


def purge_all() -> int:
    try:
        rows = coll_list(COLL, {})
        n = 0
        for r in rows:
            n += coll_delete(COLL, {"id": r.get("id")})
        return n
    except Exception:
        return 0


if __name__ == "__main__":
    # Invoked from cron via:  docker exec curio python -m app.errorlog
    # Loads config first so mongo_uri / mongo_db are picked up, then purges.
    import sys
    try:
        from .config import _load_env_file
        _load_env_file()
    except Exception:
        pass
    n = purge_old(retain_days=RETAIN_DAYS)
    print(f"[curio-cron] Purged {n} error entries older than {RETAIN_DAYS} day(s).", flush=True)
    sys.exit(0)
