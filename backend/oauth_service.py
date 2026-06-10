from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
import os
import base64

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")

# Store flow state in memory between redirect and callback
flow_store = {}

def create_flow():
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    return flow

def get_authorization_url():
    flow = create_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )
    flow_store[state] = flow
    return auth_url, state

def exchange_code_for_credentials(code, state):
    flow = flow_store.get(state)
    if not flow:
        raise Exception("Invalid state parameter - flow not found")

    flow.fetch_token(code=code)
    credentials = flow.credentials
    flow_store.pop(state, None)

    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes) if credentials.scopes else []
    }

def get_gmail_service(credentials_dict):
    from google.oauth2.credentials import Credentials
    creds = Credentials(
        token=credentials_dict["token"],
        refresh_token=credentials_dict.get("refresh_token"),
        token_uri=credentials_dict["token_uri"],
        client_id=credentials_dict["client_id"],
        client_secret=credentials_dict["client_secret"],
        scopes=credentials_dict.get("scopes", [])
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    service = build("gmail", "v1", credentials=creds)
    return service, creds

def get_user_info(credentials_dict):
    service, _ = get_gmail_service(credentials_dict)
    profile = service.users().getProfile(userId="me").execute()
    return profile.get("emailAddress")


def _decode_part_data(data):
    """Safely base64url-decode a Gmail body part's data field."""
    if not data:
        return ""
    try:
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _extract_bodies(payload):
    """
    Walk a Gmail message payload (which can be deeply nested via multipart
    structures) and collect the first text/plain and text/html bodies found.

    Returns (plain_text, html). Either may be "" if not present.
    """
    plain = ""
    html = ""

    def walk(part):
        nonlocal plain, html
        if not part:
            return
        mime = part.get("mimeType", "")
        body = part.get("body", {})
        data = body.get("data", "")

        if mime == "text/plain" and not plain:
            plain = _decode_part_data(data)
        elif mime == "text/html" and not html:
            html = _decode_part_data(data)

        # Recurse into nested parts (multipart/* containers)
        for sub in part.get("parts", []) or []:
            walk(sub)

    walk(payload)

    # Some single-part messages put the body directly on the payload with no
    # explicit mimeType match above — fall back to the top-level body data.
    if not plain and not html:
        top = _decode_part_data(payload.get("body", {}).get("data", ""))
        if "<" in top and ">" in top:
            html = top
        else:
            plain = top

    return plain, html


def fetch_emails_oauth(credentials_dict, max_results=10):
    service, creds = get_gmail_service(credentials_dict)

    results = service.users().messages().list(
        userId="me",
        maxResults=max_results,
        labelIds=["INBOX"]
    ).execute()

    messages = results.get("messages", [])
    emails = []

    for msg in messages:
        try:
            msg_data = service.users().messages().get(
                userId="me",
                id=msg["id"],
                format="full"
            ).execute()

            headers = msg_data["payload"]["headers"]
            subject = next((h["value"] for h in headers if h["name"] == "Subject"), "No Subject")
            sender = next((h["value"] for h in headers if h["name"] == "From"), "Unknown")
            date = next((h["value"] for h in headers if h["name"] == "Date"), "")

            plain, html = _extract_bodies(msg_data["payload"])

            emails.append({
                "message_id": msg.get("id"),     # stable Gmail message ID, for dedup
                "subject": subject,
                "sender": sender,
                "date": date,                    # raw RFC 2822 string; parsed in the sync loop
                "body": plain,                   # plain text, for feature extraction / scoring
                "body_html": html,               # raw HTML, for display
            })
        except Exception:
            # Skip any single message that fails to parse rather than aborting the whole sync
            continue

    updated_creds = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else []
    }

    return emails, updated_creds
