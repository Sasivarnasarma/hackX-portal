import logging
import os
import re

import httpx

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
    message = "🚀 *New HackX 11.0 Registration!* 🚀\n\n"
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
    message = "🎒 *New HackX Jr 9.0 Registration!* 🎒\n\n"
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
