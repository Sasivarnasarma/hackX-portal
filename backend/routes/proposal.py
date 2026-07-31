import logging
import os
import re
import shutil
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile, File, Form
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database.connection import get_db, AsyncSessionLocal
from helpers.drive import upload_file_to_google_drive
from helpers.email import send_proposal_submitted_email
from helpers.security import (
    decode_verification_token,
    create_jr_session_token,
    decode_jr_session_token,
)
from helpers.sheets import update_team_proposal_links
from helpers.telegram import (
    format_proposal_submission_message,
    send_telegram_document,
    send_telegram_notification,
)
from helpers.turnstile import verify_turnstile
from models.hackx import HackXMember, HackXTeam
from models.hackx_jr import HackXJrMember, HackXJrTeam

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/proposal", tags=["proposal"])
limiter = Limiter(key_func=get_remote_address)


def extract_youtube_id(url: str) -> str:
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    return match.group(1) if match else url


# ==========================================
# HackX (University Tier) Endpoints
# ==========================================

@router.get("/verify-session")
async def verify_hackx_session(token: str, db: AsyncSession = Depends(get_db)):
    verified_email = decode_verification_token(token)
    if not verified_email:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session. Please verify your email via OTP again.",
        )

    # Search for this email in HackXMember
    result = await db.execute(
        select(HackXMember).where(HackXMember.email == verified_email.strip().lower())
    )
    member = result.scalars().first()
    if not member:
        raise HTTPException(
            status_code=404,
            detail="No registered team found with this email address.",
        )

    # Fetch team
    team_result = await db.execute(
        select(HackXTeam).where(HackXTeam.id == member.team_id)
    )
    team = team_result.scalars().first()
    if not team:
        raise HTTPException(
            status_code=404,
            detail="Registered team not found.",
        )

    # Fetch all members of this team
    members_result = await db.execute(
        select(HackXMember).where(HackXMember.team_id == team.id)
    )
    members = members_result.scalars().all()

    # Find the leader
    leader = next((m for m in members if m.is_leader), None)

    return {
        "team_id": team.id,
        "team_name": team.name,
        "university": team.university,
        "proposal_link": team.proposal_link,
        "youtube_link": team.youtube_link,
        "has_submitted": bool(team.proposal_link or team.youtube_link),
        "submitter": {
            "name": member.name,
            "email": member.email,
            "is_leader": member.is_leader,
        },
        "leader_email": leader.email if leader else "",
        "members": [
            {
                "name": m.name,
                "email": m.email,
                "is_leader": m.is_leader,
            }
            for m in members
        ],
    }


@router.post("/submit-x")
@limiter.limit("3/minute")
async def submit_proposal_x(
    request: Request,
    background_tasks: BackgroundTasks,
    token: str = Form(...),
    youtube_url: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    verified_email = decode_verification_token(token)
    if not verified_email:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired verification session.",
        )

    # Check that file is PDF
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF proposal uploads are supported.",
        )

    # Verify member email is in the DB
    result = await db.execute(
        select(HackXMember).where(HackXMember.email == verified_email.strip().lower())
    )
    member = result.scalars().first()
    if not member:
        raise HTTPException(
            status_code=404,
            detail="Submitter is not registered in any team.",
        )

    # Fetch team
    team_result = await db.execute(
        select(HackXTeam).where(HackXTeam.id == member.team_id)
    )
    team = team_result.scalars().first()
    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team details not found.",
        )

    youtube_id = extract_youtube_id(youtube_url)
    youtube_clean_url = f"https://www.youtube.com/watch?v={youtube_id}"

    # Spool file to persistent submissions folder
    os.makedirs("submissions", exist_ok=True)
    sanitized_team_name = team.name.replace(" ", "_").replace("/", "-")
    file_key = f"{team.id}_{sanitized_team_name}_proposal.pdf"
    file_path = os.path.join("submissions", file_key)

    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Fetch leader
    members_result = await db.execute(
        select(HackXMember).where(HackXMember.team_id == team.id)
    )
    members = members_result.scalars().all()
    leader = next((m for m in members if m.is_leader), None)
    leader_email = leader.email if leader else verified_email

    # Schedule background tasks with retries
    background_tasks.add_task(
        process_background_proposal_x,
        team.id,
        team.name,
        file_path,
        file_key,
        youtube_clean_url,
        member.name,
        member.email,
        leader_email,
        member.is_leader,
    )

    return {"status": "success", "message": "Proposal submission queued successfully."}


async def process_background_proposal_x(
    team_id: int,
    team_name: str,
    file_path: str,
    file_key: str,
    youtube_url: str,
    submitter_name: str,
    submitter_email: str,
    leader_email: str,
    is_leader: bool,
):
    try:
        # 1. Upload to Google Drive (which has retry logic internally)
        drive_id = await upload_file_to_google_drive(
            file_path=file_path,
            filename=file_key,
            folder_name="HackX",
        )

        drive_url = f"https://drive.google.com/file/d/{drive_id}/view" if not drive_id.startswith("Bypassed") else "Bypassed"

        # 2. Update DB links
        async with AsyncSessionLocal() as session:
            team_res = await session.execute(
                select(HackXTeam).where(HackXTeam.id == team_id)
            )
            team = team_res.scalars().first()
            if team:
                team.proposal_link = drive_url
                team.youtube_link = youtube_url
                await session.commit()
                logger.info(f"Successfully saved proposal links to database for HackX Team {team_id}.")

        # 3. Update Google Sheets (which has retry logic internally)
        await update_team_proposal_links(
            sheet_name="hackX",
            team_id=team_id,
            youtube_url=youtube_url,
            drive_url=drive_url,
        )

        # 4. Telegram alerts
        telegram_caption = format_proposal_submission_message(
            tier="x",
            team_id=team_id,
            team_name=team_name,
            youtube_url=youtube_url,
            drive_url=drive_url,
            submitter_name=submitter_name,
        )
        if os.path.exists(file_path):
            doc_sent = await send_telegram_document(file_path, telegram_caption)
            if not doc_sent:
                await send_telegram_notification(telegram_caption)
        else:
            await send_telegram_notification(telegram_caption)

        # 5. Email notifications
        # Send email to the submitter
        await send_proposal_submitted_email(
            to_email=submitter_email,
            team_name=team_name,
            submitter_name=submitter_name,
            is_leader=is_leader,
            domain="hackx",
        )

        # If a member submits, send mail to the leader too
        if not is_leader:
            await send_proposal_submitted_email(
                to_email=leader_email,
                team_name=team_name,
                submitter_name=submitter_name,
                is_leader=is_leader,
                domain="hackx",
            )
        # If leader submits, send to members only if SEND_MAIL_TO_MEMBERS=True
        elif os.getenv("SEND_MAIL_TO_MEMBERS", "false").lower() == "true":
            async with AsyncSessionLocal() as session:
                members_res = await session.execute(
                    select(HackXMember).where(
                        HackXMember.team_id == team_id,
                        HackXMember.email != submitter_email
                    )
                )
                team_members = members_res.scalars().all()
                for m in team_members:
                    if m.email:
                        await send_proposal_submitted_email(
                            to_email=m.email,
                            team_name=team_name,
                            submitter_name=submitter_name,
                            is_leader=False,
                            domain="hackx",
                        )

        # Persistent storage of submissions retains the file in submissions/ folder.
        pass

    except Exception as e:
        logger.error(f"Failed to process background proposal for HackX Team {team_id}: {e}")


# ==========================================
# HackX Jr (School Tier) Endpoints
# ==========================================

@router.post("/find-jr-teams")
@limiter.limit("5/minute")
async def find_jr_teams(
    body: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    query = body.get("query", "").strip()
    turnstile_token = body.get("turnstile_token", "")

    if not query:
        raise HTTPException(status_code=400, detail="Search query is required.")

    # Verify Turnstile
    client_ip = request.client.host if request.client else None
    turnstile_ok = await verify_turnstile(turnstile_token, client_ip)
    if not turnstile_ok:
        raise HTTPException(
            status_code=400,
            detail="CAPTCHA verification failed. Please try again.",
        )

    # Search HackXJrMember where is_leader = True and (email = query or phone = query)
    result = await db.execute(
        select(HackXJrMember).where(
            HackXJrMember.is_leader == True,
            (HackXJrMember.email == query.lower()) | (HackXJrMember.phone == query)
        )
    )
    leaders = result.scalars().all()

    if not leaders:
        raise HTTPException(
            status_code=404,
            detail="No team leader matching that email or phone number was found.",
        )

    matching_teams = []
    for leader in leaders:
        team_res = await db.execute(
            select(HackXJrTeam).where(HackXJrTeam.id == leader.team_id)
        )
        team = team_res.scalars().first()
        if team:
            matching_teams.append({
                "team_id": team.id,
                "team_name": team.name,
                "school_name": team.school_name,
                "leader_name": leader.name,
                "leader_phone": leader.phone,
                "leader_email": leader.email,
                "proposal_link": team.proposal_link,
                "youtube_link": team.youtube_link,
                "has_submitted": bool(team.proposal_link or team.youtube_link),
            })

    # Generate a signed jr session token
    jr_session_token = create_jr_session_token(query)

    return {
        "status": "success",
        "teams": matching_teams,
        "jr_session_token": jr_session_token,
    }


@router.post("/submit-jr")
@limiter.limit("3/minute")
async def submit_proposal_jr(
    request: Request,
    background_tasks: BackgroundTasks,
    jr_session_token: str = Form(...),
    team_id: int = Form(...),
    youtube_url: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    session_query = decode_jr_session_token(jr_session_token)
    if not session_query:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session. Please identify the team leader details again.",
        )

    # Check file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF proposal uploads are supported.",
        )

    # Verify team exists
    team_res = await db.execute(
        select(HackXJrTeam).where(HackXJrTeam.id == team_id)
    )
    team = team_res.scalars().first()
    if not team:
        raise HTTPException(
            status_code=404,
            detail="Selected junior team not found.",
        )

    # Verify leader matches session query
    leader_res = await db.execute(
        select(HackXJrMember).where(
            HackXJrMember.team_id == team.id,
            HackXJrMember.is_leader == True
        )
    )
    leader = leader_res.scalars().first()
    if not leader or (leader.email.strip().lower() != session_query.strip().lower() and leader.phone.strip() != session_query.strip()):
        raise HTTPException(
            status_code=403,
            detail="Unauthorized. The selected team does not correspond to this verification session.",
        )

    youtube_id = extract_youtube_id(youtube_url)
    youtube_clean_url = f"https://www.youtube.com/watch?v={youtube_id}"

    # Spool file to persistent submissions folder
    os.makedirs("submissions", exist_ok=True)
    sanitized_team_name = team.name.replace(" ", "_").replace("/", "-")
    file_key = f"{team.id}_{sanitized_team_name}_proposal_jr.pdf"
    file_path = os.path.join("submissions", file_key)

    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Schedule background processing
    background_tasks.add_task(
        process_background_proposal_jr,
        team.id,
        team.name,
        file_path,
        file_key,
        youtube_clean_url,
        leader.name,
        leader.email if leader.email else "",
    )

    return {"status": "success", "message": "Junior Proposal submission queued successfully."}


async def process_background_proposal_jr(
    team_id: int,
    team_name: str,
    file_path: str,
    file_key: str,
    youtube_url: str,
    leader_name: str,
    leader_email: str,
):
    try:
        # 1. Upload to Google Drive folder HackX JR
        drive_id = await upload_file_to_google_drive(
            file_path=file_path,
            filename=file_key,
            folder_name="HackX JR",
        )

        drive_url = f"https://drive.google.com/file/d/{drive_id}/view" if not drive_id.startswith("Bypassed") else "Bypassed"

        # 2. Update DB
        async with AsyncSessionLocal() as session:
            team_res = await session.execute(
                select(HackXJrTeam).where(HackXJrTeam.id == team_id)
            )
            team = team_res.scalars().first()
            if team:
                team.proposal_link = drive_url
                team.youtube_link = youtube_url
                await session.commit()
                logger.info(f"Successfully saved proposal links to database for HackX Jr Team {team_id}.")

        # 3. Update Sheets
        await update_team_proposal_links(
            sheet_name="hackXJr",
            team_id=team_id,
            youtube_url=youtube_url,
            drive_url=drive_url,
        )

        # 4. Telegram alerts
        telegram_caption = format_proposal_submission_message(
            tier="jr",
            team_id=team_id,
            team_name=team_name,
            youtube_url=youtube_url,
            drive_url=drive_url,
            submitter_name=leader_name,
        )
        if os.path.exists(file_path):
            doc_sent = await send_telegram_document(file_path, telegram_caption)
            if not doc_sent:
                await send_telegram_notification(telegram_caption)
        else:
            await send_telegram_notification(telegram_caption)

        # 5. Email (if leader email is available)
        if leader_email:
            await send_proposal_submitted_email(
                to_email=leader_email,
                team_name=team_name,
                submitter_name=leader_name,
                is_leader=True,
                domain="hackx_jr",
            )

            # If SEND_MAIL_TO_MEMBERS is True, send to all junior members
            if os.getenv("SEND_MAIL_TO_MEMBERS", "false").lower() == "true":
                async with AsyncSessionLocal() as session:
                    members_res = await session.execute(
                        select(HackXJrMember).where(
                            HackXJrMember.team_id == team_id,
                            HackXJrMember.email != leader_email,
                            HackXJrMember.email.isnot(None),
                            HackXJrMember.email != ""
                        )
                    )
                    team_members = members_res.scalars().all()
                    for m in team_members:
                        if m.email:
                            await send_proposal_submitted_email(
                                to_email=m.email,
                                team_name=team_name,
                                submitter_name=leader_name,
                                is_leader=False,
                                domain="hackx_jr",
                            )

        # Persistent storage of submissions retains the file in submissions/ folder.
        pass

    except Exception as e:
        logger.error(f"Failed to process background proposal for HackX Jr Team {team_id}: {e}")
