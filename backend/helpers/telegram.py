import logging
import os
import re

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


def _escape_md(text: str) -> str:
    return re.sub(r"([_*\[\]()~`>#+\-=|{}.!\\])", r"\\\1", str(text))


async def send_telegram_notification(text: str):
    if (
        not TELEGRAM_BOT_TOKEN
        or not TELEGRAM_CHAT_ID
        or TELEGRAM_BOT_TOKEN == "your_bot_token_here"
    ):
        logger.info(
            f"Telegram notification unconfigured. Logging text simulation:\n{text}"
        )
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "Markdown"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info("Telegram notification sent successfully.")
            return True
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")
        return False


def format_telegram_x_registration(team, members):
    message = "🚀 *New hackX 11.0 Registration!* 🚀\n\n"
    message += f"🏆 *Team Name:* `{_escape_md(team.name)}`\n"
    message += f"🎓 *University:* `{_escape_md(team.university)}`\n"
    message += (
        f"📡 *Info Source:* `{_escape_md(team.source if team.source else 'N/A')}`\n"
    )
    if team.ambassador_code:
        message += f"🎟️ *Ambassador Code:* `{_escape_md(team.ambassador_code)}`\n"

    message += "👥 *Roster:*\n"
    for i, m in enumerate(members, 1):
        leader_star = " (👑 Leader)" if m.is_leader else ""
        message += f"👤 *Member {i}{leader_star}*\n"
        message += f"   *Name:* `{_escape_md(m.name)}`\n"
        message += f"   *NIC:* `{_escape_md(m.nic)}`\n"
        message += f"   *Phone:* `{_escape_md(m.phone)}`\n"
        message += f"   *Email:* `{_escape_md(m.email)}`\n\n"

    message += f'💡 *Expectations:* `"{_escape_md(team.expectations if team.expectations else "N/A")}"`\n'
    return message


def format_telegram_jr_registration(team, members):
    message = "🎒 *New hackX Jr 9.0 Registration!* 🎒\n\n"
    message += f"🏆 *Team Name:* `{_escape_md(team.name)}`\n"
    message += f"🏫 *School:* `{_escape_md(team.school_name)}`\n"
    message += f"📍 *District:* `{_escape_md(team.school_district.upper())}`\n"
    message += (
        f"📡 *Info Source:* `{_escape_md(team.source if team.source else 'N/A')}`\n"
    )
    if team.ambassador_code:
        message += f"🎟️ *Ambassador Code:* `{_escape_md(team.ambassador_code)}`\n"

    message += "👩‍🏫 *Teacher-in-Charge:*\n"
    message += f"   *Name:* `{_escape_md(team.teacher_name if team.teacher_name else 'N/A')}`\n"
    message += f"   *Phone:* `{_escape_md(team.teacher_phone if team.teacher_phone else 'N/A')}`\n"
    message += f"   *Email:* `{_escape_md(team.teacher_email if team.teacher_email else 'N/A')}`\n\n"

    message += "👥 *Roster:*\n"
    for i, m in enumerate(members, 1):
        leader_star = " (👑 Leader)" if m.is_leader else ""
        message += f"👤 *Member {i}{leader_star}*\n"
        message += f"   *Name:* `{_escape_md(m.name)}`\n"
        message += f"   *DOB:* `{_escape_md(str(m.dob))}`\n"
        message += f"   *Phone:* `{_escape_md(m.phone)}`\n"
        message += f"   *Email:* `{_escape_md(m.email)}`\n\n"

    message += f'💡 *Expectations:* `"{_escape_md(team.expectations if team.expectations else "N/A")}"`\n'
    return message


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def send_telegram_document(file_path: str, caption: str):
    if (
        not TELEGRAM_BOT_TOKEN
        or not TELEGRAM_CHAT_ID
        or TELEGRAM_BOT_TOKEN == "your_bot_token_here"
    ):
        logger.warning("Telegram configuration is missing. Skipping document upload.")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument"
    data = {"chat_id": TELEGRAM_CHAT_ID, "caption": caption, "parse_mode": "Markdown"}

    try:
        with open(file_path, "rb") as f:
            files = {"document": (os.path.basename(file_path), f, "application/pdf")}
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, data=data, files=files)
                response.raise_for_status()
                logger.info("Successfully sent Telegram document.")
                return True
    except Exception as e:
        logger.error(f"Failed to upload Telegram document: {e}")
        raise e


def format_proposal_submission_message(
    tier: str, team_id: int, team_name: str, youtube_url: str, drive_url: str, submitter_name: str
):
    tier_title = "hackX 11.0" if tier == "x" else "hackX Jr. 9.0"
    message = f"🚀 *New Proposal Submitted for {tier_title}!* 🚀\n\n"
    message += f"🏆 *Team ID:* `{team_id}`\n"
    message += f"🏆 *Team Name:* `{_escape_md(team_name)}`\n"
    message += f"📧 *Submitted By:* `{_escape_md(submitter_name)}`\n\n"
    message += f"🔗 *YouTube Link:* [Watch here]({youtube_url})\n"
    message += f"🔗 *Google Drive Link:* [View Proposal]({drive_url})\n"
    return message

