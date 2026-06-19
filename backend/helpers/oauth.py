import logging
import os

from helpers.sheets import get_google_sheets_service

logger = logging.getLogger(__name__)


def verify_oauth_token_on_startup():
    logger.info("Running Google API OAuth Startup Self-Check...")

    sheets_service = get_google_sheets_service()
    if not sheets_service:
        logger.warning(
            "Google Sheets credentials unconfigured. Appending registrations to sheets will be bypassed."
        )
        return

    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if sheet_id and sheet_id != "your_google_sheet_id":
            sheet = (
                sheets_service.spreadsheets()
                .get(spreadsheetId=sheet_id, fields="properties.title")
                .execute()
            )
            title = sheet.get("properties", {}).get("title", "Unknown Workbook")
            logger.info(
                f"Google Sheets service successfully authenticated! Workbook access confirmed: '{title}'"
            )
        else:
            logger.warning(
                "Sheets service active but GOOGLE_SHEET_ID is missing/default. Skipping diagnostics check."
            )
    except Exception as e:
        logger.error(
            f"Failed to establish diagnostic sheets connection. Token might be expired or lacking sheet scopes. Error: {e}"
        )
