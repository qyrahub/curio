"""Bearer-token auth.

No-op by default (CURIO_AUTH_REQUIRED=false) so the build phase is frictionless;
flip the flag to enforce JWT without touching routes. Token-based (not cookies)
on purpose, so the frontend can live on a different domain - including Lovable.

Password hashing uses stdlib scrypt (no extra deps) with a per-user salt.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

_scheme = HTTPBearer(auto_error=False)
TOKEN_TTL = 60 * 60 * 24 * 30  # 30 days


# ---------------- passwords ----------------
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt_b64, hash_b64 = stored.split("$")
        if algo != "scrypt":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=len(expected))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# ---------------- tokens ----------------
def _secret() -> str:
    if settings.jwt_secret:
        return settings.jwt_secret
    if settings.auth_required:
        raise HTTPException(500, "CURIO_JWT_SECRET must be set when CURIO_AUTH_REQUIRED=true")
    return "curio-dev-insecure-secret"  # dev only; not verified while auth is off


def create_token(sub: str, email: str) -> str:
    now = int(time.time())
    payload = {"sub": sub, "email": email, "iat": now, "exp": now + TOKEN_TTL}
    return jwt.encode(payload, _secret(), algorithm=settings.jwt_alg)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_scheme),
) -> dict:
    if not settings.auth_required:
        return {"sub": "anonymous", "anonymous": True}
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        return jwt.decode(creds.credentials, _secret(), algorithms=[settings.jwt_alg])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
