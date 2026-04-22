from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
from models import Email
import models

from services.imap_service import connect_to_gmail, fetch_emails, parse_email

app = FastAPI()

# Create tables in the database
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    imap = connect_to_gmail()
    if imap:
        imap.logout()
        return {"message": "Backend alive and Gmail connected"}
    return {"message": "Backend alive but Gmail failed"}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/test-email")
def create_test_email(db: Session = Depends(get_db)):
    new_email = Email(
        sender="test@example.com",
        subject="Test Subject",
        body="This is a test email body"
    )
    db.add(new_email)
    db.commit()
    db.refresh(new_email)
    return {"status": "Email saved", "id": new_email.id}

@app.get("/fetch-emails")
def fetch_emails_route():
    imap = connect_to_gmail()
    if not imap:
        return {"error": "Could not connect to Gmail"}
    
    raw_emails = fetch_emails(imap)
    imap.logout()
    
    parsed = []
    for raw in raw_emails:
        parsed.append(parse_email(raw))
    
    return {"status": "success", "emails": parsed}

@app.post("/store-emails")
def store_emails_route(db: Session = Depends(get_db)):
    imap = connect_to_gmail()
    if not imap:
        return {"error": "Could not connect to Gmail"}
    
    raw_emails = fetch_emails(imap)
    imap.logout()
    
    saved_count = 0
    for raw in raw_emails:
        parsed = parse_email(raw)
        new_email = Email(
            sender=parsed["sender"],
            subject=parsed["subject"],
            body=parsed["body"]
        )
        db.add(new_email)
        saved_count += 1
    
    db.commit()
    return {"status": "success", "emails_stored": saved_count}