import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database.connection import get_db
from helpers.email import generate_otp, send_otp_email
from helpers.otp_store import check_otp, clear_otp, get_last_otp_info, store_otp
from helpers.security import (
    create_captcha_session_token,
    create_verification_token,
    decode_captcha_session_token,
)
from helpers.turnstile import verify_turnstile
from models.hackx import HackXMember
from models.hackx_jr import HackXJrMember
from schemas.otp import ResendOTPRequest, SendOTPRequest, VerifyOTPRequest, VerifyCaptchaRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/otp", tags=["otp"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/send")
@limiter.limit("5/minute")
async def send_otp(
    body: SendOTPRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    logger.info(f"OTP send request for {body.email} (purpose: {body.purpose})")

    # 1. CAPTCHA verification
    client_ip = request.client.host if request.client else None
    turnstile_ok = await verify_turnstile(body.turnstile_token, client_ip)
    if not turnstile_ok:
        raise HTTPException(
            status_code=400, detail="CAPTCHA verification failed. Please try again."
        )

    # 2. Validate Purpose
    if body.purpose not in ["hackx_registration", "hackx_jr_registration", "hackx_proposal"]:
        raise HTTPException(status_code=400, detail="Invalid OTP purpose.")

    # 3. Check duplicate registrations or check existing registration
    already_registered = False
    if body.purpose == "hackx_registration":
        result = await db.execute(
            select(HackXMember).where(HackXMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if existing:
            if existing.is_leader:
                already_registered = True
            else:
                raise HTTPException(
                    status_code=400,
                    detail="This email address is already registered as a member of another team.",
                )
    elif body.purpose == "hackx_jr_registration":
        result = await db.execute(
            select(HackXJrMember).where(HackXJrMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if existing:
            if existing.is_leader:
                already_registered = True
            else:
                raise HTTPException(
                    status_code=400,
                    detail="This email address is already registered as a member of another junior team.",
                )
    elif body.purpose == "hackx_proposal":
        result = await db.execute(
            select(HackXMember).where(HackXMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if not existing:
            raise HTTPException(
                status_code=404,
                detail="This email address is not registered with any team.",
            )

    # 4. Generate/Throttling logic
    last_info = get_last_otp_info(body.email)
    if last_info:
        existing_otp, created_at, last_provider = last_info
        time_elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
        if time_elapsed < 60:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait 1 minute before requesting a new OTP.",
            )
        otp = existing_otp
    else:
        otp = generate_otp()

    import os

    if os.getenv("SIMULATE_MAIL", "false").lower() == "true":
        otp = "000000"

    # 5. Dispatch email
    domain = "hackx" if body.purpose in ["hackx_registration", "hackx_proposal"] else "hackx_jr"
    used_provider = await send_otp_email(
        body.email, otp, purpose=body.purpose, domain=domain
    )
    if used_provider == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP email. Please try again later.",
        )
    store_otp(body.email, otp, used_provider)

    captcha_token = create_captcha_session_token(body.email)
    return {
        "status": "success",
        "message": "OTP successfully sent to email.",
        "email": body.email,
        "captcha_session_token": captcha_token,
        "already_registered": already_registered,
    }


@router.post("/resend")
@limiter.limit("5/minute")
async def resend_otp(
    body: ResendOTPRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    logger.info(f"OTP resend request for {body.email}")

    # 1. Session verification
    session_email = decode_captcha_session_token(body.captcha_session_token)
    if not session_email or session_email != body.email:
        raise HTTPException(
            status_code=401,
            detail="Invalid session. Please restart your verification flow.",
        )

    # 2. Validate Purpose
    if body.purpose not in ["hackx_registration", "hackx_jr_registration", "hackx_proposal"]:
        raise HTTPException(status_code=400, detail="Invalid OTP purpose.")

    # 3. Check duplicate registrations or check existing registration
    already_registered = False
    if body.purpose == "hackx_registration":
        result = await db.execute(
            select(HackXMember).where(HackXMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if existing:
            if existing.is_leader:
                already_registered = True
            else:
                raise HTTPException(
                    status_code=400,
                    detail="This email address is already registered as a member of another team.",
                )
    elif body.purpose == "hackx_jr_registration":
        result = await db.execute(
            select(HackXJrMember).where(HackXJrMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if existing:
            if existing.is_leader:
                already_registered = True
            else:
                raise HTTPException(
                    status_code=400,
                    detail="This email address is already registered as a member of another junior team.",
                )
    elif body.purpose == "hackx_proposal":
        result = await db.execute(
            select(HackXMember).where(HackXMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if not existing:
            raise HTTPException(
                status_code=404,
                detail="This email address is not registered with any team.",
            )

    # 4. Generates/Throttle logic
    last_info = get_last_otp_info(body.email)
    if last_info:
        existing_otp, created_at, last_provider = last_info
        time_elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
        if time_elapsed < 60:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait 1 minute before requesting a new OTP.",
            )
        otp = existing_otp
        # Flip to the opposite provider to maximize delivery chances
        force_provider = "mailtrap" if last_provider == "resend" else "resend"
    else:
        otp = generate_otp()
        force_provider = None

    import os

    if os.getenv("SIMULATE_MAIL", "false").lower() == "true":
        otp = "000000"

    # 5. Dispatch email
    domain = "hackx" if body.purpose in ["hackx_registration", "hackx_proposal"] else "hackx_jr"
    used_provider = await send_otp_email(
        body.email,
        otp,
        purpose=body.purpose,
        domain=domain,
        force_provider=force_provider,
    )
    if used_provider == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP email. Please try again later.",
        )
    store_otp(body.email, otp, used_provider)

    return {
        "status": "success",
        "message": "OTP successfully resent to email.",
        "email": body.email,
        "already_registered": already_registered,
    }


@router.post("/verify")
@limiter.limit("10/minute")
async def verify_otp(
    body: VerifyOTPRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    logger.info(f"OTP verify request for {body.email}")

    # 1. Session verification
    session_email = decode_captcha_session_token(body.captcha_session_token)
    if not session_email or session_email != body.email:
        raise HTTPException(
            status_code=401, detail="Invalid session. Please restart verification."
        )

    # 2. Check Purpose
    if body.purpose not in ["hackx_registration", "hackx_jr_registration", "hackx_proposal"]:
        raise HTTPException(status_code=400, detail="Invalid OTP purpose.")

    # 3. Match code
    otp_status = check_otp(body.email, body.otp)
    if otp_status == "expired":
        raise HTTPException(
            status_code=400, detail="OTP has expired. Please request a new OTP code."
        )
    elif otp_status == "locked":
        raise HTTPException(
            status_code=429,
            detail="Too many failed verification attempts. Please request a new OTP code.",
        )
    elif otp_status == "invalid":
        raise HTTPException(
            status_code=400, detail="Invalid OTP code. Please check and try again."
        )

    # 4. Clear and return JWT verification token
    clear_otp(body.email)
    token = create_verification_token(body.email)

    already_registered = False
    if body.purpose == "hackx_registration":
        result = await db.execute(
            select(HackXMember).where(
                HackXMember.email == body.email,
                HackXMember.is_leader == True
            )
        )
        if result.scalars().first():
            already_registered = True
    elif body.purpose == "hackx_jr_registration":
        result = await db.execute(
            select(HackXJrMember).where(
                HackXJrMember.email == body.email,
                HackXJrMember.is_leader == True
            )
        )
        if result.scalars().first():
            already_registered = True

    return {
        "status": "success",
        "message": "OTP verified successfully.",
        "verification_token": token,
        "already_registered": already_registered,
    }


@router.post("/verify-captcha")
@limiter.limit("5/minute")
async def verify_captcha_only(
    body: VerifyCaptchaRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    logger.info(f"Direct verification token request for {body.email} (purpose: {body.purpose})")

    # 1. Verify Turnstile Captcha
    client_ip = request.client.host if request.client else None
    turnstile_ok = await verify_turnstile(body.turnstile_token, client_ip)
    if not turnstile_ok:
        raise HTTPException(
            status_code=400, detail="CAPTCHA verification failed. Please try again."
        )

    # 2. Check Purpose
    if body.purpose not in ["hackx_registration", "hackx_jr_registration", "hackx_proposal"]:
        raise HTTPException(status_code=400, detail="Invalid verification purpose.")

    # 3. Duplicate checks or check existing registration
    already_registered = False
    if body.purpose == "hackx_registration":
        result = await db.execute(
            select(HackXMember).where(HackXMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if existing:
            if existing.is_leader:
                already_registered = True
            else:
                raise HTTPException(
                    status_code=400,
                    detail="This email address is already registered as a member of another team.",
                )
    elif body.purpose == "hackx_jr_registration":
        result = await db.execute(
            select(HackXJrMember).where(HackXJrMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if existing:
            if existing.is_leader:
                already_registered = True
            else:
                raise HTTPException(
                    status_code=400,
                    detail="This email address is already registered as a member of another junior team.",
                )
    elif body.purpose == "hackx_proposal":
        result = await db.execute(
            select(HackXMember).where(HackXMember.email == body.email.strip().lower())
        )
        existing = result.scalars().first()
        if not existing:
            raise HTTPException(
                status_code=404,
                detail="This email address is not registered with any team.",
            )

    # 4. Generate token
    token = create_verification_token(body.email)
    return {
        "status": "success",
        "message": "CAPTCHA verified successfully. Session verification token issued.",
        "verification_token": token,
        "already_registered": already_registered,
    }
