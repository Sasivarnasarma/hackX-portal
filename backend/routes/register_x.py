import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database.connection import get_db
from helpers.email import send_welcome_x_email
from helpers.security import decode_verification_token
from helpers.sheets import append_row_to_sheets, format_hackx_row
from helpers.telegram import format_telegram_x_registration, send_telegram_notification
from models.hackx import HackXMember, HackXTeam
from schemas.registration import HackXRegisterSchema

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/x", tags=["hackx_university"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register")
@limiter.limit("3/minute")
async def register_hackx_team(
    body: HackXRegisterSchema,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    logger.info(f"HackX registration request received for team: '{body.team_name}'")

    # 1. Decode and verify verification token
    verified_email = decode_verification_token(body.verification_token)
    if not verified_email:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired verification session. Please verify your email via OTP again.",
        )

    # 2. Match verified email with leader email
    leader_member = next((m for m in body.members if m.is_leader), None)
    if (
        not leader_member
        or leader_member.email.strip().lower() != verified_email.strip().lower()
    ):
        raise HTTPException(
            status_code=400,
            detail="The email verified via OTP must belong to the designated team leader.",
        )

    # 3. Check duplicate Team Name
    team_check = await db.execute(
        select(HackXTeam).where(HackXTeam.name == body.team_name.strip())
    )
    if team_check.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"Team name '{body.team_name}' is already taken. Please choose a different team name.",
        )

    # 4. Check duplicate email/NIC registrations
    emails = [m.email.strip().lower() for m in body.members]
    nics = [m.nic.strip().upper() for m in body.members]

    email_check = await db.execute(
        select(HackXMember.email).where(HackXMember.email.in_(emails))
    )
    dup_email = email_check.scalars().first()
    if dup_email:
        raise HTTPException(
            status_code=400,
            detail=f"The email address '{dup_email}' is already registered in another team.",
        )

    nic_check = await db.execute(
        select(HackXMember.nic).where(HackXMember.nic.in_(nics))
    )
    dup_nic = nic_check.scalars().first()
    if dup_nic:
        raise HTTPException(
            status_code=400,
            detail=f"The NIC number '{dup_nic}' is already registered in another team.",
        )

    # 5. DB transaction writes
    try:
        new_team = HackXTeam(
            name=body.team_name.strip(),
            university=body.university.strip(),
            consent_share=body.consent_share,
            expectations=body.expectations.strip()
            if body.expectations and body.expectations.strip()
            else None,
            source=body.source.strip() if body.source and body.source.strip() else None,
            ambassador_code=body.ambassador_code.strip()
            if body.ambassador_code and body.ambassador_code.strip()
            else None,
        )
        db.add(new_team)
        await db.flush()  # to populate new_team.id

        inserted_members = []
        for m in body.members:
            db_member = HackXMember(
                team_id=new_team.id,
                name=m.name.strip(),
                nic=m.nic.strip().upper(),
                phone=m.phone.strip(),
                email=m.email.strip().lower(),
                is_leader=m.is_leader,
                email_verified=m.is_leader,  # verified only if they are the verified leader
            )
            db.add(db_member)
            inserted_members.append(db_member)

        await db.commit()
        logger.info(
            f"Team '{new_team.name}' registered successfully with ID: {new_team.id}"
        )

    except Exception as e:
        await db.rollback()
        logger.error(f"Transaction failed during HackX registration: {e}")
        raise HTTPException(
            status_code=500,
            detail="An internal server error occurred while writing to the database.",
        )

    # 6. Dispatch asynchronous BackgroundTasks
    import os

    send_to_all = os.getenv("SEND_MAIL_TO_MEMBERS", "false").lower() == "true"
    if send_to_all:
        for member in inserted_members:
            background_tasks.add_task(
                send_welcome_x_email,
                member.email.strip(),
                new_team.name,
                new_team.university,
                inserted_members,
            )
    else:
        background_tasks.add_task(
            send_welcome_x_email,
            verified_email,
            new_team.name,
            new_team.university,
            inserted_members,
        )

    telegram_msg = format_telegram_x_registration(new_team, inserted_members)
    background_tasks.add_task(send_telegram_notification, telegram_msg)

    sheets_row = format_hackx_row(new_team, inserted_members)
    background_tasks.add_task(append_row_to_sheets, "hackX", sheets_row)

    return {
        "status": "success",
        "message": "Team successfully registered for HackX 11.0!",
    }


@router.get("/verify-ambassador/{code}")
@limiter.limit("15/minute")
async def verify_ambassador_code(code: str, request: Request):
    logger.info(f"Ambassador code verification request for: '{code}'")
    if code.strip().lower() == "xxx":
        raise HTTPException(
            status_code=400,
            detail="The provided ambassador code is invalid. Remove it if you don't know the correct code.",
        )
    return {"status": "success", "valid": True, "code": code.strip()}
