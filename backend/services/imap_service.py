import imaplib
import os
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