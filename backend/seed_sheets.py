import os
import sys
from datetime import datetime

# Guarantee local backend path is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

from helpers.sheets import get_google_sheets_service, GOOGLE_SHEET_ID  # noqa: E402

hackx_headers = [
    "Team ID",
    "Team Name",
    "University",
    "Consent Share",
    "Expectations",
    "Info Source",
    "Ambassador Code",
    "Created At",
    "Leader Name",
    "Leader NIC",
    "Leader Phone",
    "Leader Email",
    "Member 2 Name",
    "Member 2 NIC",
    "Member 2 Phone",
    "Member 2 Email",
    "Member 3 Name",
    "Member 3 NIC",
    "Member 3 Phone",
    "Member 3 Email",
    "Member 4 Name",
    "Member 4 NIC",
    "Member 4 Phone",
    "Member 4 Email",
    "Member 5 Name",
    "Member 5 NIC",
    "Member 5 Phone",
    "Member 5 Email",
]

hackx_jr_headers = [
    "Team ID",
    "Team Name",
    "School Name",
    "School District",
    "Teacher Name",
    "Teacher Phone",
    "Teacher Email",
    "Consent Share",
    "Expectations",
    "Info Source",
    "Ambassador Code",
    "Created At",
    "Leader Name",
    "Leader DOB",
    "Leader Phone",
    "Leader Email",
    "Member 2 Name",
    "Member 2 DOB",
    "Member 2 Phone",
    "Member 2 Email",
    "Member 3 Name",
    "Member 3 DOB",
    "Member 3 Phone",
    "Member 3 Email",
    "Member 4 Name",
    "Member 4 DOB",
    "Member 4 Phone",
    "Member 4 Email",
    "Member 5 Name",
    "Member 5 DOB",
    "Member 5 Phone",
    "Member 5 Email",
]


def main():
    print("Initializing Google Sheets seed process...")

    if not GOOGLE_SHEET_ID or GOOGLE_SHEET_ID == "your_google_sheet_id":
        print(
            "Error: GOOGLE_SHEET_ID not properly configured in environment or .env file."
        )
        sys.exit(1)

    service = get_google_sheets_service()
    if not service:
        print(
            "Error: Failed to initialize Google Sheets service. Please verify your GOOGLE_OAUTH_TOKEN_B64 credential in .env."
        )
        sys.exit(1)

    print(f"Connected to Google Spreadsheet ID: {GOOGLE_SHEET_ID}")

    try:
        # 1. Fetch spreadsheet metadata to check existing tabs
        spreadsheet = (
            service.spreadsheets().get(spreadsheetId=GOOGLE_SHEET_ID).execute()
        )
        sheets = spreadsheet.get("sheets", [])
        existing_titles = [s["properties"]["title"] for s in sheets]
        print(f"Existing tabs in spreadsheet: {existing_titles}")

        # 2. Dynamically add tabs if they are missing
        requests = []
        if "hackX" not in existing_titles:
            requests.append({"addSheet": {"properties": {"title": "hackX"}}})
        if "hackXJr" not in existing_titles:
            requests.append({"addSheet": {"properties": {"title": "hackXJr"}}})

        if requests:
            print("Creating missing tabs...")
            service.spreadsheets().batchUpdate(
                spreadsheetId=GOOGLE_SHEET_ID, body={"requests": requests}
            ).execute()
            print("Missing tabs created successfully.")

        # 3. Write/Update Header Rows (Row 1)
        print("Writing table headers...")
        service.spreadsheets().values().update(
            spreadsheetId=GOOGLE_SHEET_ID,
            range="hackX!A1",
            valueInputOption="USER_ENTERED",
            body={"values": [hackx_headers]},
        ).execute()
        print("hackX header written.")

        service.spreadsheets().values().update(
            spreadsheetId=GOOGLE_SHEET_ID,
            range="hackXJr!A1",
            valueInputOption="USER_ENTERED",
            body={"values": [hackx_jr_headers]},
        ).execute()
        print("hackXJr header written.")

        # 4. Append Test Seed Rows to verify appends are working
        print("Appending test validation rows...")
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        test_x_row = [
            "SEED-001",
            "Test Seed Team X",
            "Seed University",
            "True",
            "Seeding validation",
            "Self Check",
            "TEST-AMB-01",
            now_str,
            "Sarma Test",
            "199923456780",
            "0771234567",
            "sasivarnasarma@gmail.com",
        ]

        test_jr_row = [
            "SEED-002",
            "Test Seed Team Jr",
            "Seed School",
            "COLOMBO",
            "Mr. Seeder",
            "0778889990",
            "seeder@gmail.com",
            "True",
            "Seeding validation",
            "Self Check",
            "TEST-AMB-02",
            now_str,
            "Sarma Jr Test",
            "2010-05-15",
            "0711112223",
            "sasivarnasarma@gmail.com",
        ]

        res_x = (
            service.spreadsheets()
            .values()
            .append(
                spreadsheetId=GOOGLE_SHEET_ID,
                range="hackX",
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body={"values": [test_x_row]},
            )
            .execute()
        )
        print(
            f"hackX test row appended successfully. Cells updated: {res_x.get('updates').get('updatedCells')}"
        )

        res_jr = (
            service.spreadsheets()
            .values()
            .append(
                spreadsheetId=GOOGLE_SHEET_ID,
                range="hackXJr",
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body={"values": [test_jr_row]},
            )
            .execute()
        )
        print(
            f"hackXJr test row appended successfully. Cells updated: {res_jr.get('updates').get('updatedCells')}"
        )

        print(
            "\nGoogle Sheets seeding and diagnostic checks completed successfully! Your credentials are fully functional."
        )

    except Exception as e:
        print(f"Error during Google Sheets seeding or connection check: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
