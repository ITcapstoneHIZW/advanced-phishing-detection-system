import imaplib
import os
import email
from dotenv import load_dotenv

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

def connect_to_gmail():
    try:
        imap = imaplib.IMAP4_SSL("imap.gmail.com")
        imap.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        print("Successfully connected to Gmail via IMAP.")
        return imap
    except Exception as e:
        print("Failed to connect to Gmail:", e)
        return None
    
def fetch_emails(imap, num_emails=10):
    try:
        imap.select("inbox")
        _, message_ids = imap.search(None, "ALL")
        email_ids = message_ids[0].split()
        latest_ids = email_ids[-num_emails:]
        
        emails = []
        for email_id in latest_ids:
            _, msg_data = imap.fetch(email_id, "(RFC822)")
            raw_email = msg_data[0][1]
            emails.append(raw_email)
        
        print(f"Fetched {len(emails)} emails.")
        return emails
    except Exception as e:
        print("Failed to fetch emails:", e)
        return []
    
def parse_email(raw_email):
    msg = email.message_from_bytes(raw_email)
    
    subject = msg.get("Subject", "No Subject")
    sender = msg.get("From", "Unknown")
    date = msg.get("Date", "Unknown")
    
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                body = part.get_payload(decode=True).decode(errors="replace")
                break
    else:
        body = msg.get_payload(decode=True).decode(errors="replace")
    
    return {
        "subject": subject,
        "sender": sender,
        "date": date,
        "body": body
    }