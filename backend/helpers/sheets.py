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


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def update_or_append_row_to_sheets(
    range_name: str, row_data: list, leader_email: str, email_index: int
) -> bool:
    """
    Checks if a row with the same leader email already exists at the given column index.
    If it exists, updates the row. Otherwise, appends a new row.
    """
    service = get_google_sheets_service()
    if not service:
        return False

    try:
        sheet = service.spreadsheets()

        # Fetch current values in sheet to find the matching leader email row
        result = await run_in_threadpool(
            sheet.values().get(
                spreadsheetId=GOOGLE_SHEET_ID, range=range_name
            ).execute
        )
        values = result.get("values", [])

        found_row_idx = -1
        for idx, row in enumerate(values):
            if len(row) > email_index and row[email_index].strip().lower() == leader_email.strip().lower():
                found_row_idx = idx + 1  # Google Sheets row numbers are 1-indexed
                break

        if found_row_idx != -1:
            # Overwrite the existing row
            update_range = f"{range_name}!A{found_row_idx}"
            body = {"values": [row_data]}
            request = sheet.values().update(
                spreadsheetId=GOOGLE_SHEET_ID,
                range=update_range,
                valueInputOption="USER_ENTERED",
                body=body,
            )
            await run_in_threadpool(request.execute)
            logger.info(
                f"Successfully updated row {found_row_idx} in Google Sheet [{range_name}] for leader {leader_email}"
            )
            return True
        else:
            # Append new row
            body = {"values": [row_data]}
            request = sheet.values().append(
                spreadsheetId=GOOGLE_SHEET_ID,
                range=range_name,
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body=body,
            )
            await run_in_threadpool(request.execute)
            logger.info(
                f"Successfully appended row to Google Sheet [{range_name}] for leader {leader_email}"
            )
            return True
    except Exception as e:
        logger.error(f"Error updating/appending to Google Sheet [{range_name}]: {e}")
        raise e


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def update_or_append_row_to_sheets_by_name(
    range_name: str, row_data: list, team_name: str, name_index: int = 1
) -> bool:
    """
    Checks if a row with the same team name already exists at the given column index.
    If it exists, updates the row. Otherwise, appends a new row.
    """
    service = get_google_sheets_service()
    if not service:
        return False

    try:
        sheet = service.spreadsheets()

        # Fetch current values in sheet to find the matching team name row
        result = await run_in_threadpool(
            sheet.values().get(
                spreadsheetId=GOOGLE_SHEET_ID, range=range_name
            ).execute
        )
        values = result.get("values", [])

        found_row_idx = -1
        for idx, row in enumerate(values):
            if len(row) > name_index and row[name_index].strip().lower() == team_name.strip().lower():
                found_row_idx = idx + 1  # Google Sheets row numbers are 1-indexed
                break

        if found_row_idx != -1:
            # Overwrite the existing row
            update_range = f"{range_name}!A{found_row_idx}"
            body = {"values": [row_data]}
            request = sheet.values().update(
                spreadsheetId=GOOGLE_SHEET_ID,
                range=update_range,
                valueInputOption="USER_ENTERED",
                body=body,
            )
            await run_in_threadpool(request.execute)
            logger.info(
                f"Successfully updated row {found_row_idx} in Google Sheet [{range_name}] for team '{team_name}'"
            )
            return True
        else:
            # Append new row
            body = {"values": [row_data]}
            request = sheet.values().append(
                spreadsheetId=GOOGLE_SHEET_ID,
                range=range_name,
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body=body,
            )
            await run_in_threadpool(request.execute)
            logger.info(
                f"Successfully appended row to Google Sheet [{range_name}] for team '{team_name}'"
            )
            return True
    except Exception as e:
        logger.error(f"Error updating/appending by name to Google Sheet [{range_name}]: {e}")
        raise e


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


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def update_team_proposal_links(
    sheet_name: str, team_id: int, youtube_url: str, drive_url: str
) -> bool:
    """
    Finds the row matching team_id in column A, and updates:
    - Column AC (index 28) and AD (index 29) for hackX
    - Column AG (index 32) and AH (index 33) for hackXJr
    """
    service = get_google_sheets_service()
    if not service:
        return False

    try:
        sheet = service.spreadsheets()
        # Read the first column to match team ID
        range_name = f"{sheet_name}!A:A"
        result = await run_in_threadpool(
            sheet.values().get(spreadsheetId=GOOGLE_SHEET_ID, range=range_name).execute
        )
        rows = result.get("values", [])
        row_index = -1

        for i, row in enumerate(rows):
            if row and str(row[0]).strip() == str(team_id).strip():
                row_index = i + 1  # 1-indexed
                break

        if row_index == -1:
            logger.error(f"Could not find Team ID {team_id} in sheet [{sheet_name}] to update proposal links.")
            return False

        if sheet_name == "hackX":
            # Column AC is 29th (AC), Column AD is 30th (AD)
            update_range = f"{sheet_name}!AC{row_index}:AD{row_index}"
        else:
            # Column AG is 33rd (AG), Column AH is 34th (AH)
            update_range = f"{sheet_name}!AG{row_index}:AH{row_index}"

        body = {"values": [[youtube_url, drive_url]]}
        request = sheet.values().update(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=update_range,
            valueInputOption="USER_ENTERED",
            body=body,
        )
        await run_in_threadpool(request.execute)
        logger.info(
            f"Successfully updated proposal links for Team {team_id} in [{sheet_name}] on row {row_index}."
        )
        return True
    except Exception as e:
        logger.error(f"Error updating proposal links in Google Sheet [{sheet_name}]: {e}")
        raise e


def col_idx_to_letter(col_idx: int) -> str:
    """Converts a 0-indexed column index to a Google Sheets column letter (e.g. 0 -> A, 27 -> AB)"""
    letter = ""
    while col_idx >= 0:
        letter = chr(col_idx % 26 + 65) + letter
        col_idx = col_idx // 26 - 1
    return letter


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def update_jr_proposal_link_in_sheets(
    team_id: int, slot_number: int, drive_url: str
) -> bool:
    """
    Finds the row matching team_id in column A for the hackXJr sheet,
    determines the column index of header 'Proposal File S' (where S = slot_number),
    and updates/overwrites that cell with the drive_url.
    """
    service = get_google_sheets_service()
    if not service:
        return False

    try:
        sheet = service.spreadsheets()
        
        # 1. Fetch headers row (row 1) and all team IDs in column A
        result = await run_in_threadpool(
            sheet.values().get(
                spreadsheetId=GOOGLE_SHEET_ID,
                range="hackXJr!A:A"
            ).execute
        )
        rows = result.get("values", [])
        
        row_index = -1
        for i, row in enumerate(rows):
            if row and str(row[0]).strip() == str(team_id).strip():
                row_index = i + 1  # 1-indexed
                break
                
        if row_index == -1:
            logger.error(f"Could not find Team ID {team_id} in sheet [hackXJr] to update slot {slot_number}.")
            return False

        # 2. Fetch headers to locate column index for "Proposal File {slot_number}"
        header_res = await run_in_threadpool(
            sheet.values().get(
                spreadsheetId=GOOGLE_SHEET_ID,
                range="hackXJr!1:1"
            ).execute
        )
        headers = header_res.get("values", [[]])[0]
        
        col_name = f"Proposal File {slot_number}"
        col_index = -1
        for idx, h in enumerate(headers):
            if h.strip().lower() == col_name.lower():
                col_index = idx
                break
                
        if col_index == -1:
            logger.error(f"Could not find header '{col_name}' in sheet [hackXJr].")
            return False

        col_letter = col_idx_to_letter(col_index)
        update_range = f"hackXJr!{col_letter}{row_index}"
        
        body = {"values": [[drive_url]]}
        request = sheet.values().update(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=update_range,
            valueInputOption="USER_ENTERED",
            body=body,
        )
        await run_in_threadpool(request.execute)
        logger.info(f"Successfully updated {col_name} to '{drive_url}' for Team {team_id} in [hackXJr] row {row_index}.")
        return True
    except Exception as e:
        logger.error(f"Error updating proposal slot {slot_number} in Google Sheet [hackXJr]: {e}")
        raise e


