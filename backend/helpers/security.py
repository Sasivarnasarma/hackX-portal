import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "hackx-super-secret-random-fallback-key-2026")
ALGORITHM = "HS256"

VERIFICATION_TOKEN_EXPIRE_MINUTES = 30
CAPTCHA_SESSION_EXPIRE_MINUTES = 30


def create_verification_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=VERIFICATION_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": email,
        "purpose": "email_verification",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_verification_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "email_verification":
            return None
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.PyJWTError:
        return None


def create_captcha_session_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=CAPTCHA_SESSION_EXPIRE_MINUTES
    )
    payload = {
        "sub": email,
        "purpose": "captcha_session",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_captcha_session_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "captcha_session":
            return None
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.PyJWTError:
        return None
