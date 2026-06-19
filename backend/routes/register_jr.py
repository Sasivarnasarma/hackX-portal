import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database.connection import get_db
from helpers.email import send_welcome_jr_email
from helpers.security import decode_verification_token
from helpers.sheets import append_row_to_sheets, format_hackx_jr_row
from helpers.telegram import format_telegram_jr_registration, send_telegram_notification
from models.hackx_jr import HackXJrMember, HackXJrTeam
from schemas.registration import HackXJrRegisterSchema

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jr", tags=["hackx_jr"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register")
@limiter.limit("3/minute")
async def register_hackx_jr_team(
    body: HackXJrRegisterSchema,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    logger.info(f"HackX Jr registration request received for team: '{body.team_name}'")

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
        select(HackXJrTeam).where(HackXJrTeam.name == body.team_name.strip())
    )
    if team_check.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"Team name '{body.team_name}' is already taken. Please choose a different team name.",
        )

    # 4. Check duplicate email registrations
    emails = [m.email.strip().lower() for m in body.members if m.email]

    email_check = await db.execute(
        select(HackXJrMember.email).where(HackXJrMember.email.in_(emails))
    )
    dup_email = email_check.scalars().first()
    if dup_email:
        raise HTTPException(
            status_code=400,
            detail=f"The email address '{dup_email}' is already registered in another junior team.",
        )

    # 5. DB transaction writes
    try:
        new_team = HackXJrTeam(
            name=body.team_name.strip(),
            school_name=body.school_name.strip(),
            school_district=body.school_district.strip().lower(),  # guaranteed lowercase by schema
            teacher_name=body.teacher_name.strip()
            if body.teacher_name and body.teacher_name.strip()
            else None,
            teacher_phone=body.teacher_phone.strip()
            if body.teacher_phone and body.teacher_phone.strip()
            else None,
            teacher_email=body.teacher_email.strip().lower()
            if body.teacher_email and body.teacher_email.strip()
            else None,
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
            db_member = HackXJrMember(
                team_id=new_team.id,
                name=m.name.strip(),
                dob=m.dob,
                phone=m.phone.strip(),
                email=m.email.strip().lower() if m.email else None,
                is_leader=m.is_leader,
                email_verified=m.is_leader,  # verified only if they are the verified leader
            )
            db.add(db_member)
            inserted_members.append(db_member)

        await db.commit()
        logger.info(
            f"HackX Jr Team '{new_team.name}' registered successfully with ID: {new_team.id}"
        )

    except Exception as e:
        await db.rollback()
        logger.error(f"Transaction failed during HackX Jr registration: {e}")
        raise HTTPException(
            status_code=500,
            detail="An internal server error occurred while writing to the database.",
        )

    # 6. Dispatch asynchronous BackgroundTasks
    import os

    send_to_all = os.getenv("SEND_MAIL_TO_MEMBERS", "false").lower() == "true"
    if send_to_all:
        for member in inserted_members:
            if member.email:
                background_tasks.add_task(
                    send_welcome_jr_email,
                    member.email.strip(),
                    new_team.name,
                    new_team.school_name,
                    new_team.school_district,
                    new_team.teacher_name,
                    new_team.teacher_phone,
                    new_team.teacher_email,
                    inserted_members,
                )
    else:
        background_tasks.add_task(
            send_welcome_jr_email,
            verified_email,
            new_team.name,
            new_team.school_name,
            new_team.school_district,
            new_team.teacher_name,
            new_team.teacher_phone,
            new_team.teacher_email,
            inserted_members,
        )

    telegram_msg = format_telegram_jr_registration(new_team, inserted_members)
    background_tasks.add_task(send_telegram_notification, telegram_msg)

    sheets_row = format_hackx_jr_row(new_team, inserted_members)
    background_tasks.add_task(append_row_to_sheets, "hackXJr", sheets_row)

    return {
        "status": "success",
        "message": "Team successfully registered for HackX Jr. 9.0!",
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
