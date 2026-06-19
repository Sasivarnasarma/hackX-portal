import logging
import os

import httpx

logger = logging.getLogger(__name__)

TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY")
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile(token: str, remote_ip: str = None) -> bool:
    if not TURNSTILE_SECRET_KEY or TURNSTILE_SECRET_KEY == "your_turnstile_secret_key":
        # Dynamic fallback if not configured
        logger.info(
            "Cloudflare Turnstile secret unconfigured, passing validation as success."
        )
        return True

    payload = {
        "secret": TURNSTILE_SECRET_KEY,
        "response": token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(TURNSTILE_VERIFY_URL, data=payload)
            result = resp.json()
            success = result.get("success", False)
            if not success:
                logger.warning(
                    f"Turnstile verification failed for IP {remote_ip}: {result}"
                )
            return success
    except Exception as e:
        logger.error(f"Error checking Turnstile: {e}")
        # Fail open or fail closed? Fail closed in production, but let's return False if validation failed.
        return False
