from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from services.feature_extractor import extract_features, calculate_phishing_score
from models import Email, AnalysisResult

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
        features = extract_features(parsed)
        scoring = calculate_phishing_score(features)
        
        new_email = Email(
            sender=parsed["sender"],
            recipient=parsed.get("recipient", None),
            subject=parsed["subject"],
            body=parsed["body"],
            date_received=parsed["date"],
            is_quarantined=scoring["verdict"] == "Phishing"
        )
        db.add(new_email)
        db.flush()

        analysis = AnalysisResult(
            email_id=new_email.id,
            url_count=features["url_count"],
            has_suspicious_url=features["has_suspicious_url"],
            has_urgent_language=features["has_urgent_language"],
            sender_domain=features["sender_domain"],
            is_free_email=features["is_free_email"],
            risk_score=scoring["score"],
            verdict=scoring["verdict"]
        )
        db.add(analysis)
        saved_count += 1
    
    db.commit()
    return {"status": "success", "emails_stored": saved_count}

@app.get("/analyze-emails")
def analyze_emails_route():
    imap = connect_to_gmail()
    if not imap:
        return {"error": "Could not connect to Gmail"}
    
    raw_emails = fetch_emails(imap)
    imap.logout()
    
    results = []
    for raw in raw_emails:
        parsed = parse_email(raw)
        features = extract_features(parsed)
        scoring = calculate_phishing_score(features)
        results.append({
            "subject": parsed["subject"],
            "sender": parsed["sender"],
            "features": features,
            "risk_score": scoring["score"],
            "verdict": scoring["verdict"]
        })
    
    return {"status": "success", "emails": results}

@app.get("/emails")
def get_emails(db: Session = Depends(get_db)):
    emails = db.query(Email).all()
    results = []
    for email in emails:
        analysis = db.query(AnalysisResult).filter(AnalysisResult.email_id == email.id).first()
        results.append({
            "id": email.id,
            "sender": email.sender,
            "subject": email.subject,
            "date_received": email.date_received,
            "is_quarantined": email.is_quarantined,
            "risk_score": analysis.risk_score if analysis else None,
            "verdict": analysis.verdict if analysis else None
        })
    return {"emails": results}