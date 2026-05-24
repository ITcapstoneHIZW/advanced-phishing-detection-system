import imaplib

IMAP_SERVERS = {
    "gmail.com": "imap.gmail.com",
    "googlemail.com": "imap.gmail.com",
    "outlook.com": "imap-mail.outlook.com",
    "hotmail.com": "imap-mail.outlook.com",
    "live.com": "imap-mail.outlook.com",
    "msn.com": "imap-mail.outlook.com",
    "yahoo.com": "imap.mail.yahoo.com",
    "yahoo.com.au": "imap.mail.yahoo.com",
    "ymail.com": "imap.mail.yahoo.com",
    "icloud.com": "imap.mail.me.com",
    "me.com": "imap.mail.me.com",
}

def get_imap_server(email_address: str) -> str:
    domain = email_address.split("@")[-1].lower()
    return IMAP_SERVERS.get(domain, None)

def test_imap_connection(email_address: str, password: str) -> bool:
    server = get_imap_server(email_address)
    if not server:
        raise Exception(f"Unsupported email provider. Supported providers: Gmail, Outlook, Hotmail, Yahoo, iCloud.")
    try:
        imap = imaplib.IMAP4_SSL(server)
        imap.login(email_address, password)
        imap.logout()
        return True
    except imaplib.IMAP4.error:
        raise Exception("Invalid credentials. Please check your email and password.")
    except Exception as e:
        raise Exception(f"Could not connect to mail server: {str(e)}")

def fetch_emails_imap(email_address: str, password: str, max_results: int = 10):
    server = get_imap_server(email_address)
    if not server:
        raise Exception("Unsupported email provider.")
    
    imap = imaplib.IMAP4_SSL(server)
    imap.login(email_address, password)
    imap.select("INBOX")
    
    _, message_ids = imap.search(None, "ALL")
    email_ids = message_ids[0].split()
    latest_ids = email_ids[-max_results:] if len(email_ids) > max_results else email_ids
    latest_ids = list(reversed(latest_ids))
    
    emails = []
    for eid in latest_ids:
        _, msg_data = imap.fetch(eid, "(RFC822)")
        raw = msg_data[0][1]
        
        import email as email_lib
        msg = email_lib.message_from_bytes(raw)
        
        subject = msg.get("Subject", "No Subject")
        sender = msg.get("From", "Unknown")
        date = msg.get("Date", "Unknown")
        
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                        break
                    except:
                        pass
        else:
            try:
                body = msg.get_payload(decode=True).decode("utf-8", errors="replace")
            except:
                body = ""
        
        emails.append({
            "subject": subject,
            "sender": sender,
            "date": date,
            "body": body
        })
    
    imap.logout()
    return emails