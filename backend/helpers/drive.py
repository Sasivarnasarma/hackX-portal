import base64
import json
import logging
import os

from fastapi.concurrency import run_in_threadpool
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

GOOGLE_DRIVE_MAIN_FOLDER_ID = os.getenv("GOOGLE_DRIVE_MAIN_FOLDER_ID")
GOOGLE_OAUTH_TOKEN_B64 = os.getenv("GOOGLE_OAUTH_TOKEN_B64")

SCOPES = ["https://www.googleapis.com/auth/drive"]


def get_google_drive_service():
    if not GOOGLE_OAUTH_TOKEN_B64:
        logger.warning("Google Drive token configuration is missing. Bypassing Drive upload.")
        return None

    try:
        decoded_bytes = base64.b64decode(GOOGLE_OAUTH_TOKEN_B64)
        credentials_dict = json.loads(decoded_bytes.decode("utf-8"))
        credentials = Credentials.from_authorized_user_info(
            credentials_dict, scopes=SCOPES
        )
        service = build("drive", "v3", credentials=credentials)
        return service
    except Exception as e:
        logger.error(f"Failed to initialize Google Drive service: {e}")
        return None


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def get_or_create_subfolder(parent_id: str, folder_name: str) -> str:
    """
    Finds a subfolder by name within a parent folder.
    Creates it if it does not exist. Retries up to 5 times.
    """
    service = get_google_drive_service()
    if not service:
        raise Exception("Google Drive service not available.")

    def _sync_find_or_create():
        # 1. Search for existing folder
        query = (
            f"name = '{folder_name}' and "
            f"'{parent_id}' in parents and "
            "mimeType = 'application/vnd.google-apps.folder' and "
            "trashed = false"
        )
        results = service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name)',
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()

        files = results.get('files', [])
        if files:
            logger.info(f"Google Drive: Found existing subfolder '{folder_name}' with ID: {files[0]['id']}")
            return files[0]['id']

        # 2. Create the folder if not found
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        folder = service.files().create(
            body=file_metadata,
            fields='id',
            supportsAllDrives=True
        ).execute()
        logger.info(f"Google Drive: Created new subfolder '{folder_name}' with ID: {folder.get('id')}")
        return folder.get('id')

    return await run_in_threadpool(_sync_find_or_create)


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def upload_file_to_google_drive(
    file_path: str,
    filename: str,
    folder_name: str,
    mime_type: str = "application/pdf",
) -> str:
    """
    Creates HackX/HackX JR folder inside the main folder if needed,
    and uploads the file inside it. Retries up to 5 times.
    """
    if not GOOGLE_DRIVE_MAIN_FOLDER_ID:
        logger.warning("No main Google Drive folder ID configured. Skipping Drive upload.")
        return "Bypassed: No Drive Main Folder ID"

    service = get_google_drive_service()
    if not service:
        return "Bypassed: Google Drive service not initialized"

    # Get or create specific subfolder
    subfolder_id = await get_or_create_subfolder(GOOGLE_DRIVE_MAIN_FOLDER_ID, folder_name)

    def _sync_upload():
        file_metadata = {"name": filename, "parents": [subfolder_id]}
        media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)
        request = service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id, webViewLink",
            supportsAllDrives=True,
        )
        file_res = request.execute()
        logger.info(
            f"Successfully uploaded {filename} to Google Drive ({folder_name}). File ID: {file_res.get('id')}"
        )
        return file_res.get("id")

    return await run_in_threadpool(_sync_upload)
