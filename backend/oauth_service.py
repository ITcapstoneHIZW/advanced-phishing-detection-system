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

CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(__file__), "client_secret.json")
REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")

# Store flow state in memory between redirect and callback
flow_store = {}

def create_flow():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
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
    # Store the flow object so we can use it in the callback
    flow_store[state] = flow
    return auth_url, state

def exchange_code_for_credentials(code, state):
    # Retrieve the original flow object using the state
    flow = flow_store.get(state)
    if not flow:
        raise Exception("Invalid state parameter - flow not found")
    
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    # Clean up stored flow
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
        msg_data = service.users().messages().get(
            userId="me",
            id=msg["id"],
            format="full"
        ).execute()

        headers = msg_data["payload"]["headers"]
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "No Subject")
        sender = next((h["value"] for h in headers if h["name"] == "From"), "Unknown")
        date = next((h["value"] for h in headers if h["name"] == "Date"), "Unknown")

        body = ""
        payload = msg_data["payload"]
        if "parts" in payload:
            for part in payload["parts"]:
                if part["mimeType"] == "text/plain":
                    import base64
                    data = part["body"].get("data", "")
                    if data:
                        body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                        break
        elif "body" in payload:
            import base64
            data = payload["body"].get("data", "")
            if data:
                body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

        emails.append({
            "subject": subject,
            "sender": sender,
            "date": date,
            "body": body
        })

    # Update token if refreshed
    updated_creds = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else []
    }

    return emails, updated_creds