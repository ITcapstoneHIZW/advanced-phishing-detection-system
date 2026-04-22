from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import Email, AnalysisResult
import models
from logger import logger
from services.imap_service import connect_to_gmail, fetch_emails, parse_email
from services.feature_extractor import extract_features, calculate_phishing_score
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables in the database
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    logger.info("Health check endpoint called")
    imap = connect_to_gmail()
    if imap:
        imap.logout()
        return {"message": "Backend alive and Gmail connected"}
    return {"message": "Backend alive but Gmail failed"}

@app.get("/fetch-emails")
def fetch_emails_route():
    logger.info("Fetching emails from Gmail")
    imap = connect_to_gmail()
    if not imap:
        logger.error("Failed to connect to Gmail")
        return {"error": "Could not connect to Gmail"}
    raw_emails = fetch_emails(imap)
    imap.logout()
    logger.info(f"Successfully fetched {len(raw_emails)} emails")
    return {"status": "success", "emails_fetched": len(raw_emails)}

@app.get("/analyze-emails")
def analyze_emails_route():
    logger.info("Analyzing emails")
    imap = connect_to_gmail()
    if not imap:
        logger.error("Failed to connect to Gmail")
        return {"error": "Could not connect to Gmail"}
    raw_emails = fetch_emails(imap)
    imap.logout()
    results = []
    for raw in raw_emails:
        parsed = parse_email(raw)
        features = extract_features(parsed)
        scoring = calculate_phishing_score(features)
        logger.info(f"Email '{parsed['subject']}' scored {scoring['score']} - {scoring['verdict']}")
        results.append({
            "subject": parsed["subject"],
            "sender": parsed["sender"],
            "features": features,
            "risk_score": scoring["score"],
            "verdict": scoring["verdict"]
        })
    return {"status": "success", "emails": results}

@app.post("/store-emails")
def store_emails_route(db: Session = Depends(get_db)):
    logger.info("Storing emails to database")
    imap = connect_to_gmail()
    if not imap:
        logger.error("Failed to connect to Gmail")
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
        logger.info(f"Stored email '{parsed['subject']}' with risk score {scoring['score']} - {scoring['verdict']}")
        saved_count += 1
    db.commit()
    logger.info(f"Successfully stored {saved_count} emails")
    return {"status": "success", "emails_stored": saved_count}

@app.get("/emails")
def get_emails(db: Session = Depends(get_db)):
    logger.info("Fetching all emails from database")
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
    logger.info(f"Returned {len(results)} emails from database")
    return {"emails": results}