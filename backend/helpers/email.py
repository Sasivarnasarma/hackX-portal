import asyncio
import html
import logging
import os
import secrets
import smtplib
import string
import threading
from datetime import datetime, timezone, timedelta, time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select, func

from database.connection import AsyncSessionLocal
from models.email_log import EmailLog

logger = logging.getLogger(__name__)

# Lock to ensure thread-safe configuration of resend.api_key SDK module state
resend_lock = threading.Lock()

# Daily and Monthly Limits
RESEND_DAILY_LIMIT = 100
RESEND_MONTHLY_LIMIT = 3000
MAILTRAP_DAILY_LIMIT = 150
MAILTRAP_MONTHLY_LIMIT = 4500

# Thread-safe in-memory cache
_email_stats = {
    "resend_hackx": {"daily": 0, "monthly": 0},
    "mailtrap_hackx": {"daily": 0, "monthly": 0},
    "resend_hackx_jr": {"daily": 0, "monthly": 0},
    "mailtrap_hackx_jr": {"daily": 0, "monthly": 0},
    "resend_fallback": {"daily": 0, "monthly": 0},
    "mailtrap_fallback": {"daily": 0, "monthly": 0},
}
_last_tracked_date: Optional[object] = None

# Retrieve environment variable credentials
HACKX_RESEND_API_KEY = os.getenv("HACKX_RESEND_API_KEY")
HACKX_RESEND_FROM_EMAIL = os.getenv("HACKX_RESEND_FROM_EMAIL")
HACKX_FROM_NAME = os.getenv("HACKX_FROM_NAME", "HackX Committee")
HACKX_MAILTRAP_API_KEY = os.getenv("HACKX_MAILTRAP_API_KEY")
HACKX_MAILTRAP_FROM_EMAIL = os.getenv("HACKX_MAILTRAP_FROM_EMAIL")

HACKXJR_RESEND_API_KEY = os.getenv("HACKXJR_RESEND_API_KEY")
HACKXJR_RESEND_FROM_EMAIL = os.getenv("HACKXJR_RESEND_FROM_EMAIL")
HACKXJR_FROM_NAME = os.getenv("HACKXJR_FROM_NAME", "HackX Jr Committee")
HACKXJR_MAILTRAP_API_KEY = os.getenv("HACKXJR_MAILTRAP_API_KEY")
HACKXJR_MAILTRAP_FROM_EMAIL = os.getenv("HACKXJR_MAILTRAP_FROM_EMAIL")

FALLBACK_RESEND_API_KEY = os.getenv("FALLBACK_RESEND_API_KEY")
FALLBACK_RESEND_FROM_EMAIL = os.getenv("FALLBACK_RESEND_FROM_EMAIL")
FALLBACK_FROM_NAME = os.getenv("FALLBACK_FROM_NAME", "HackX Support")
FALLBACK_MAILTRAP_API_KEY = os.getenv("FALLBACK_MAILTRAP_API_KEY")
FALLBACK_MAILTRAP_FROM_EMAIL = os.getenv("FALLBACK_MAILTRAP_FROM_EMAIL")

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "HackX Support")

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def generate_otp(length=6):
    if os.getenv("SIMULATE_MAIL", "false").lower() == "true":
        return "000000"
    return "".join(secrets.choice(string.digits) for _ in range(length))


def load_template(template_name: str) -> str:
    template_path = TEMPLATES_DIR / template_name
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Template file not found at: {template_path}")
        return None


# ==========================================
# Caching & Synchronous Scheduler
# ==========================================


def _format_stats() -> str:
    return "\n" + "\n".join(
        f"  - {provider:<20} | Daily: {counts['daily']:<3} | Monthly: {counts['monthly']}"
        for provider, counts in _email_stats.items()
    )


async def initialize_email_stats_cache():
    global _last_tracked_date
    now = datetime.now(timezone.utc)
    _last_tracked_date = now.date()

    start_of_day = datetime.combine(now.date(), time.min, tzinfo=timezone.utc).replace(
        tzinfo=None
    )
    start_of_month = datetime.combine(
        now.date().replace(day=1), time.min, tzinfo=timezone.utc
    ).replace(tzinfo=None)

    logger.info("Initializing in-memory email stats cache from database...")
    try:
        async with AsyncSessionLocal() as session:
            for provider in _email_stats.keys():
                daily_stmt = select(func.count(EmailLog.id)).where(
                    EmailLog.provider == provider,
                    EmailLog.sent_at >= start_of_day,
                    EmailLog.status == "success",
                )
                daily_res = await session.execute(daily_stmt)
                _email_stats[provider]["daily"] = daily_res.scalar() or 0

                monthly_stmt = select(func.count(EmailLog.id)).where(
                    EmailLog.provider == provider,
                    EmailLog.sent_at >= start_of_month,
                    EmailLog.status == "success",
                )
                monthly_res = await session.execute(monthly_stmt)
                _email_stats[provider]["monthly"] = monthly_res.scalar() or 0

        logger.info(f"Email stats cache initialized successfully:{_format_stats()}")
    except Exception as e:
        logger.error(f"Error loading email stats cache: {e}")


async def email_stats_reset_scheduler():
    global _last_tracked_date
    logger.info("Starting email stats reset background worker...")
    while True:
        now = datetime.now(timezone.utc)
        tomorrow = now.date() + timedelta(days=1)
        next_midnight = datetime.combine(tomorrow, time.min, tzinfo=timezone.utc)
        delay = (next_midnight - now).total_seconds()

        logger.info(
            f"Email stats reset scheduler: sleeping for {delay:.2f} seconds until midnight UTC ({next_midnight})"
        )
        try:
            await asyncio.sleep(delay)
        except asyncio.CancelledError:
            logger.info("Email stats reset scheduler task cancelled.")
            break

        now_after = datetime.now(timezone.utc)
        logger.info(
            "Email stats reset scheduler: Midnight UTC reached. Resetting daily counters..."
        )

        # Reset daily counters
        for provider in _email_stats:
            _email_stats[provider]["daily"] = 0

        # Check if month transitioned to reset monthly counters
        if now_after.month != now.month:
            logger.info("Month transitioned. Resetting monthly counters...")
            for provider in _email_stats:
                _email_stats[provider]["monthly"] = 0

        _last_tracked_date = now_after.date()
        logger.info(
            f"Email stats reset complete. New tracking date: {_last_tracked_date}. Stats:{_format_stats()}"
        )


# ==========================================
# Dispatcher Helper Functions
# ==========================================


def _get_route_credentials(route: str) -> Optional[tuple[str, str, str]]:
    if route == "resend_hackx":
        return HACKX_RESEND_API_KEY, HACKX_RESEND_FROM_EMAIL, HACKX_FROM_NAME
    elif route == "mailtrap_hackx":
        return HACKX_MAILTRAP_API_KEY, HACKX_MAILTRAP_FROM_EMAIL, HACKX_FROM_NAME
    elif route == "resend_hackx_jr":
        return HACKXJR_RESEND_API_KEY, HACKXJR_RESEND_FROM_EMAIL, HACKXJR_FROM_NAME
    elif route == "mailtrap_hackx_jr":
        return HACKXJR_MAILTRAP_API_KEY, HACKXJR_MAILTRAP_FROM_EMAIL, HACKXJR_FROM_NAME
    elif route == "resend_fallback":
        return FALLBACK_RESEND_API_KEY, FALLBACK_RESEND_FROM_EMAIL, FALLBACK_FROM_NAME
    elif route == "mailtrap_fallback":
        return (
            FALLBACK_MAILTRAP_API_KEY,
            FALLBACK_MAILTRAP_FROM_EMAIL,
            FALLBACK_FROM_NAME,
        )
    return None


def _is_route_below_limits(route: str) -> bool:
    creds = _get_route_credentials(route)
    if not creds or not creds[0] or not creds[1]:
        return False

    daily_limit = (
        RESEND_DAILY_LIMIT if route.startswith("resend") else MAILTRAP_DAILY_LIMIT
    )
    monthly_limit = (
        RESEND_MONTHLY_LIMIT if route.startswith("resend") else MAILTRAP_MONTHLY_LIMIT
    )

    return (
        _email_stats[route]["daily"] < daily_limit
        and _email_stats[route]["monthly"] < monthly_limit
    )


def select_best_route(
    domain: str, tried_routes: set, force_provider: Optional[str] = None
) -> Optional[str]:
    resend_primary = f"resend_{domain}"
    mailtrap_primary = f"mailtrap_{domain}"

    # 1. forced provider (if requested and below limits)
    if force_provider:
        forced_route = f"{force_provider}_{domain}"
        if forced_route not in tried_routes and _is_route_below_limits(forced_route):
            return forced_route

    # 2. Tier 1: Event Primary (R, M, M, R, M)
    total_primary_sent = (
        _email_stats[resend_primary]["daily"] + _email_stats[mailtrap_primary]["daily"]
    )
    pattern_index = total_primary_sent % 5
    suggested_primary = resend_primary if pattern_index in (0, 3) else mailtrap_primary
    alternate_primary = (
        mailtrap_primary if suggested_primary == resend_primary else resend_primary
    )

    if suggested_primary not in tried_routes and _is_route_below_limits(
        suggested_primary
    ):
        return suggested_primary
    if alternate_primary not in tried_routes and _is_route_below_limits(
        alternate_primary
    ):
        return alternate_primary

    # 3. Tier 2: Shared Fallback Domain (R, M, M, R, M)
    resend_fallback = "resend_fallback"
    mailtrap_fallback = "mailtrap_fallback"

    total_fallback_sent = (
        _email_stats[resend_fallback]["daily"]
        + _email_stats[mailtrap_fallback]["daily"]
    )
    fallback_index = total_fallback_sent % 5
    suggested_fallback = (
        resend_fallback if fallback_index in (0, 3) else mailtrap_fallback
    )
    alternate_fallback = (
        mailtrap_fallback if suggested_fallback == resend_fallback else resend_fallback
    )

    if suggested_fallback not in tried_routes and _is_route_below_limits(
        suggested_fallback
    ):
        return suggested_fallback
    if alternate_fallback not in tried_routes and _is_route_below_limits(
        alternate_fallback
    ):
        return alternate_fallback

    # 4. Tier 3: Shared SMTP Fallback
    if "smtp" not in tried_routes:
        return "smtp"

    return None


async def _send_via_resend_sdk(
    api_key: str,
    from_email: str,
    from_name: str,
    to_email: str,
    subject: str,
    body: str,
) -> tuple[bool, Optional[str]]:
    def _sync_send():
        with resend_lock:
            import resend

            resend.api_key = api_key
            params: resend.Emails.SendParams = {
                "from": f"{from_name} <{from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": body,
            }
            resend.Emails.send(params)

    try:
        await run_in_threadpool(_sync_send)
        return True, None
    except Exception as e:
        return False, str(e)


async def _send_via_mailtrap_sdk(
    api_key: str,
    from_email: str,
    from_name: str,
    to_email: str,
    subject: str,
    body: str,
) -> tuple[bool, Optional[str]]:
    try:
        import mailtrap as mt

        client = mt.MailtrapClient(token=api_key)
        mail = mt.Mail(
            sender=mt.Address(email=from_email, name=from_name),
            to=[mt.Address(email=to_email)],
            subject=subject,
            html=body,
        )
        await run_in_threadpool(client.send, mail)
        return True, None
    except Exception as e:
        return False, str(e)


async def _send_via_smtp(
    to_email: str, subject: str, body: str
) -> tuple[bool, Optional[str]]:
    if not SMTP_SERVER or not SMTP_USER or not SMTP_PASSWORD:
        return False, "SMTP server is not configured in env variables"

    def _sync_send():
        msg = MIMEMultipart()
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        server.quit()

    try:
        await run_in_threadpool(_sync_send)
        return True, None
    except Exception as e:
        return False, str(e)


async def log_dispatch_attempt(
    recipient: str,
    provider: str,
    domain: str,
    purpose: str,
    subject: str,
    success: bool,
    error_message: Optional[str],
):
    try:
        async with AsyncSessionLocal() as session:
            log = EmailLog(
                recipient=recipient,
                provider=provider,
                domain=domain,
                purpose=purpose,
                subject=subject,
                status="success" if success else "failed",
                error_message=error_message,
            )
            session.add(log)
            await session.commit()
    except Exception as e:
        logger.error(f"Failed to record EmailLog: {e}")


# ==========================================
# Core Routed Email Sender
# ==========================================


async def send_routed_email(
    to_email: str,
    subject: str,
    body: str,
    purpose: str,
    domain: str,
    force_provider: Optional[str] = None,
) -> str:
    """
    Sends an email using the multi-tiered limits routing rules.
    Logs every attempt (success and failure) to the email_logs table.
    Returns the string provider name used successfully ('resend', 'mailtrap', 'smtp'),
    or 'failed' if all attempts failed.
    """
    tried_routes = set()

    if os.getenv("SIMULATE_MAIL", "false").lower() == "true":
        selected_route = select_best_route(domain, tried_routes, force_provider)
        if not selected_route:
            logger.error(
                f"[SIMULATION] All available email dispatches exhausted for {to_email}"
            )
            return "failed"

        logger.info(
            f"Email dispatch simulation: Mail to {to_email} via route '{selected_route}' not sent due to testing env (SIMULATE_MAIL=true)"
        )

        if selected_route.startswith("resend"):
            return "resend"
        elif selected_route.startswith("mailtrap"):
            return "mailtrap"
        return "smtp"

    while True:
        selected_route = select_best_route(domain, tried_routes, force_provider)
        if not selected_route:
            logger.error(f"All available email dispatches exhausted for {to_email}")
            return "failed"

        tried_routes.add(selected_route)
        logger.info(
            f"Attempting to send email to {to_email} via provider route: '{selected_route}'"
        )

        success = False
        err_msg = None

        if selected_route.startswith("resend"):
            api_key, from_email, from_name = _get_route_credentials(selected_route)
            success, err_msg = await _send_via_resend_sdk(
                api_key, from_email, from_name, to_email, subject, body
            )
        elif selected_route.startswith("mailtrap"):
            api_key, from_email, from_name = _get_route_credentials(selected_route)
            success, err_msg = await _send_via_mailtrap_sdk(
                api_key, from_email, from_name, to_email, subject, body
            )
        elif selected_route == "smtp":
            success, err_msg = await _send_via_smtp(to_email, subject, body)

        # Log detailed audit record
        await log_dispatch_attempt(
            to_email, selected_route, domain, purpose, subject, success, err_msg
        )

        if success:
            logger.info(
                f"Successfully sent email to {to_email} using route: '{selected_route}'"
            )
            # Update cache metrics
            if selected_route != "smtp":
                _email_stats[selected_route]["daily"] += 1
                _email_stats[selected_route]["monthly"] += 1

            # Return standard identifier name
            if selected_route.startswith("resend"):
                return "resend"
            elif selected_route.startswith("mailtrap"):
                return "mailtrap"
            return "smtp"
        else:
            logger.warning(
                f"Email attempt failed using route '{selected_route}': {err_msg}. Cascading..."
            )


# ==========================================
# Interface Functions
# ==========================================


async def send_otp_email(
    to_email: str,
    otp: str,
    purpose: str,
    domain: str,
    force_provider: Optional[str] = None,
) -> str:
    subject = "Verify Your Email - HackX OTP Code"
    heading = "Confirm Your Email Address"
    description = f"Use the verification OTP code below to confirm your email for {purpose.replace('_', ' ')}. This code will expire in 10 minutes."

    template = load_template("otp_email.html")
    if template:
        body = template.replace("{{OTP_CODE}}", otp)
        body = body.replace("{{heading}}", heading)
        body = body.replace("{{description}}", description)
    else:
        body = f"""
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>{heading}</h2>
            <p>{description}</p>
            <p style="font-size: 24px; font-weight: bold; color: #5BB8FF;">{otp}</p>
        </div>
        """
    return await send_routed_email(
        to_email,
        subject,
        body,
        purpose="otp",
        domain=domain,
        force_provider=force_provider,
    )


async def send_welcome_x_email(
    to_email: str,
    team_name: str,
    university_name: str,
    members: list,
):
    subject = f"Welcome to HackX 11.0! Team {team_name} Registered Successfully"

    members_html = ""
    for i, m in enumerate(members):
        m_name = html.escape(m.name)
        m_nic = html.escape(m.nic)
        m_phone = html.escape(m.phone)
        m_email = html.escape(m.email)
        leader_badge = (
            '<span style="font-size: 10px; background: rgba(26, 111, 212, 0.15); color: #5BB8FF; border: 1px solid rgba(91, 184, 255, 0.3); padding: 2px 8px; border-radius: 20px; font-weight: 700; margin-left: 8px;">LEADER</span>'
            if m.is_leader
            else ""
        )
        members_html += f"""
        <div style="background-color: #020F2B; border: 1px solid rgba(91, 184, 255, 0.2); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <p style="margin: 0 0 4px; font-size: 14px; font-weight: bold; color: #f0f4ff;">{m_name}{leader_badge}</p>
            <p style="margin: 0; font-size: 12px; color: #8ba3c7;">NIC: {m_nic} | Phone: {m_phone} | Email: {m_email}</p>
        </div>
        """

    template = load_template("welcome_x.html")
    if template:
        body = template.replace("{{team_name}}", html.escape(team_name))
        body = body.replace("{{university}}", html.escape(university_name))
        body = body.replace("{{members_section}}", members_html)
    else:
        body = f"""
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>Registration Successful - HackX 11.0</h2>
            <p>Congratulations, your team <strong>{html.escape(team_name)}</strong> from <strong>{html.escape(university_name)}</strong> has been registered successfully!</p>
            <h3>Team Roster:</h3>
            {members_html}
        </div>
        """
    return await send_routed_email(
        to_email, subject, body, purpose="welcome_x", domain="hackx"
    )


async def send_welcome_jr_email(
    to_email: str,
    team_name: str,
    school_name: str,
    school_district: str,
    teacher_name: Optional[str],
    teacher_phone: Optional[str],
    teacher_email: Optional[str],
    members: list,
):
    subject = f"Welcome to HackX Jr. 9.0! Team {team_name} Registered Successfully"

    members_html = ""
    for i, m in enumerate(members):
        m_name = html.escape(m.name)
        m_dob = html.escape(str(m.dob))
        m_phone = html.escape(m.phone)
        m_email = html.escape(m.email) if m.email else "N/A"
        leader_badge = (
            '<span style="font-size: 10px; background: rgba(26, 111, 212, 0.15); color: #5BB8FF; border: 1px solid rgba(91, 184, 255, 0.3); padding: 2px 8px; border-radius: 20px; font-weight: 700; margin-left: 8px;">LEADER</span>'
            if m.is_leader
            else ""
        )
        members_html += f"""
        <div style="background-color: #020F2B; border: 1px solid rgba(91, 184, 255, 0.2); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <p style="margin: 0 0 4px; font-size: 14px; font-weight: bold; color: #f0f4ff;">{m_name}{leader_badge}</p>
            <p style="margin: 0; font-size: 12px; color: #8ba3c7;">DOB: {m_dob} | Phone: {m_phone} | Email: {m_email}</p>
        </div>
        """

    t_name = html.escape(teacher_name) if teacher_name else "N/A"
    t_phone = html.escape(teacher_phone) if teacher_phone else "N/A"
    t_email = html.escape(teacher_email) if teacher_email else "N/A"

    template = load_template("welcome_jr.html")
    if template:
        body = template.replace("{{team_name}}", html.escape(team_name))
        body = body.replace("{{school_name}}", html.escape(school_name))
        body = body.replace("{{school_district}}", html.escape(school_district.upper()))
        body = body.replace("{{teacher_name}}", t_name)
        body = body.replace("{{teacher_phone}}", t_phone)
        body = body.replace("{{teacher_email}}", t_email)
        body = body.replace("{{members_section}}", members_html)
    else:
        body = f"""
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>Registration Successful - HackX Jr. 9.0</h2>
            <p>Congratulations, your school team <strong>{html.escape(team_name)}</strong> from <strong>{html.escape(school_name)} ({html.escape(school_district)})</strong> has been registered successfully!</p>
            <p>Teacher in Charge: {t_name} ({t_phone} / {t_email})</p>
            <h3>Team Roster:</h3>
            {members_html}
        </div>
        """
    return await send_routed_email(
        to_email, subject, body, purpose="welcome_jr", domain="hackx_jr"
    )
