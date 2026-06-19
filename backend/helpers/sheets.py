import base64
import json
import logging
import os

from fastapi.concurrency import run_in_threadpool
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

logger = logging.getLogger(__name__)

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
GOOGLE_OAUTH_TOKEN_B64 = os.getenv("GOOGLE_OAUTH_TOKEN_B64")

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def get_google_sheets_service():
    if (
        not GOOGLE_SHEET_ID
        or not GOOGLE_OAUTH_TOKEN_B64
        or GOOGLE_SHEET_ID == "your_google_sheet_id"
    ):
        logger.info(
            "Google Sheets configuration is unconfigured. Skipping Sheets append operations."
        )
        return None

    try:
        decoded_bytes = base64.b64decode(GOOGLE_OAUTH_TOKEN_B64)
        credentials_dict = json.loads(decoded_bytes.decode("utf-8"))
        credentials = Credentials.from_authorized_user_info(
            credentials_dict, scopes=SCOPES
        )
        service = build("sheets", "v4", credentials=credentials)
        return service
    except Exception as e:
        logger.error(f"Failed to initialize Google Sheets service: {e}")
        return None


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def append_row_to_sheets(range_name: str, row_data: list) -> bool:
    """
    Appends a row of data to Google Sheets inside a specific worksheet tab.
    Retries up to 5 times with exponential backoff on failure.
    """
    service = get_google_sheets_service()
    if not service:
        # Configuration is missing, bypass silently to avoid throwing exceptions
        return False

    try:
        sheet = service.spreadsheets()
        body = {"values": [row_data]}
        request = sheet.values().append(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=range_name,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body=body,
        )
        result = await run_in_threadpool(request.execute)
        logger.info(
            f"Successfully appended row to Google Sheet [{range_name}]. {result.get('updates').get('updatedCells')} cells updated."
        )
        return True
    except Exception as e:
        logger.error(f"Error appending to Google Sheet [{range_name}]: {e}")
        raise e  # re-raise to trigger tenacity retry loop


def format_hackx_row(team, members) -> list:
    """
    Formats HackX university tier columns:
    Team ID, Team Name, University, Consent Share, Expectations, Info Source, Ambassador Code, Created At,
    and then up to 5 members' Name, NIC, Phone, Email.
    """
    row = [
        team.id,
        team.name,
        team.university,
        str(team.consent_share),
        team.expectations if team.expectations else "",
        team.source if team.source else "",
        team.ambassador_code if team.ambassador_code else "",
        team.created_at.strftime("%Y-%m-%d %H:%M:%S") if team.created_at else "",
    ]

    # Ensure leader is placed first in the roster
    sorted_members = sorted(members, key=lambda x: not x.is_leader)

    for i in range(5):
        if i < len(sorted_members):
            m = sorted_members[i]
            row.extend([m.name, m.nic, m.phone, m.email])
        else:
            row.extend(["", "", "", ""])
    return row


def format_hackx_jr_row(team, members) -> list:
    """
    Formats HackX Jr school tier columns:
    Team ID, Team Name, School Name, School District, Teacher Name, Teacher Phone, Teacher Email,
    Consent Share, Expectations, Info Source, Ambassador Code, Created At,
    and then up to 5 members' Name, DOB, Phone, Email.
    """
    row = [
        team.id,
        team.name,
        team.school_name,
        team.school_district.upper(),
        team.teacher_name if team.teacher_name else "",
        team.teacher_phone if team.teacher_phone else "",
        team.teacher_email if team.teacher_email else "",
        str(team.consent_share),
        team.expectations if team.expectations else "",
        team.source if team.source else "",
        team.ambassador_code if team.ambassador_code else "",
        team.created_at.strftime("%Y-%m-%d %H:%M:%S") if team.created_at else "",
    ]

    # Ensure leader is placed first in the roster
    sorted_members = sorted(members, key=lambda x: not x.is_leader)

    for i in range(5):
        if i < len(sorted_members):
            m = sorted_members[i]
            dob_str = m.dob.strftime("%Y-%m-%d") if m.dob else ""
            row.extend([m.name, dob_str, m.phone, m.email if m.email else ""])
        else:
            row.extend(["", "", "", ""])
    return row
