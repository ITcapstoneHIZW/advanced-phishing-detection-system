import requests
from typing import Optional

CLIENT_ID = "f683614c-566c-4112-9e9c-7ba63b40fcb5"
CLIENT_SECRET = "NE_8Q~-sETphFMzO1Mhq5WfKdgh.LhIZDSR37adn"
TENANT_ID = "f749221c-9d07-41c6-96e2-d47e733a8d72"
REDIRECT_URI = "http://localhost:8000/auth/microsoft/callback"

AUTHORITY = f"https://login.microsoftonline.com/common"
SCOPES = ["Mail.Read", "User.Read", "offline_access"]

def get_authorization_url() -> tuple[str, str]:
    import secrets
    state = secrets.token_urlsafe(32)
    scope_str = "%20".join(SCOPES)
    auth_url = (
        f"{AUTHORITY}/oauth2/v2.0/authorize"
        f"?client_id={CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={scope_str}"
        f"&state={state}"
        f"&prompt=consent"
        f"&access_type=offline"
    )
    return auth_url, state

def exchange_code_for_credentials(code: str) -> dict:
    token_url = f"{AUTHORITY}/oauth2/v2.0/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
        "scope": " ".join(SCOPES)
    }
    response = requests.post(token_url, data=data)
    if not response.ok:
        raise Exception(f"Token exchange failed: {response.text}")
    return response.json()

def refresh_access_token(refresh_token: str) -> dict:
    token_url = f"{AUTHORITY}/oauth2/v2.0/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
        "scope": " ".join(SCOPES)
    }
    response = requests.post(token_url, data=data)
    if not response.ok:
        raise Exception(f"Token refresh failed: {response.text}")
    return response.json()

def get_user_info(access_token: str) -> str:
    response = requests.get(
        "https://graph.microsoft.com/v1.0/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    if not response.ok:
        raise Exception("Failed to get user info")
    data = response.json()
    return data.get("mail") or data.get("userPrincipalName")

def fetch_emails_microsoft(credentials_dict: dict, max_results: int = 10) -> tuple[list, dict]:
    access_token = credentials_dict.get("access_token")
    refresh_token = credentials_dict.get("refresh_token")

    # Try to fetch emails
    response = requests.get(
        f"https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top={max_results}&$orderby=receivedDateTime desc",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    # If token expired, refresh it
    if response.status_code == 401 and refresh_token:
        new_creds = refresh_access_token(refresh_token)
        access_token = new_creds["access_token"]
        credentials_dict.update(new_creds)
        response = requests.get(
            f"https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top={max_results}&$orderby=receivedDateTime desc",
            headers={"Authorization": f"Bearer {access_token}"}
        )

    if not response.ok:
        raise Exception("Failed to fetch emails from Microsoft")

    messages = response.json().get("value", [])
    emails = []

    for msg in messages:
        body = msg.get("body", {}).get("content", "")
        # Strip HTML tags for plain text
        import re
        body = re.sub(r"<[^>]+>", "", body)

        emails.append({
            "subject": msg.get("subject", "No Subject"),
            "sender": msg.get("from", {}).get("emailAddress", {}).get("address", "Unknown"),
            "date": msg.get("receivedDateTime", "Unknown"),
            "body": body
        })

    return emails, credentials_dict