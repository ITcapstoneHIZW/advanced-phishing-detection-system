from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import Email, AnalysisResult, User
import models
from logger import logger
from services.imap_service import connect_to_gmail, fetch_emails, parse_email
from services.feature_extractor import extract_features, calculate_phishing_score
from fastapi.middleware.cors import CORSMiddleware
from auth import (
    hash_password, create_access_token, authenticate_user,
    get_user_by_email, decode_access_token
)
from pydantic import BaseModel
from typing import Optional
import imaplib

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

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_email(db, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- Pydantic schemas ---
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class LinkEmailRequest(BaseModel):
    gmail_address: str
    gmail_app_password: str

# --- Auth endpoints ---
@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    logger.info(f"Register attempt for {request.email}")
    existing = get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=request.name,
        email=request.email,
        hashed_password=hash_password(request.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email})
    logger.info(f"User registered: {request.email}")
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for {request.email}")
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    logger.info(f"User logged in: {request.email}")
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}

@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "gmail_address": current_user.gmail_address,
        "has_gmail_linked": current_user.gmail_address is not None
    }

# --- Email linking ---
@app.post("/link-email")
def link_email(request: LinkEmailRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logger.info(f"Linking email for user {current_user.email}")
    # Test the credentials before saving
    try:
        imap = imaplib.IMAP4_SSL("imap.gmail.com")
        imap.login(request.gmail_address, request.gmail_app_password)
        imap.logout()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not connect to Gmail. Check your credentials.")
    
    current_user.gmail_address = request.gmail_address
    current_user.gmail_app_password = request.gmail_app_password
    db.commit()
    logger.info(f"Gmail linked for user {current_user.email}")
    return {"message": "Gmail account linked successfully"}

# --- Email endpoints ---
@app.post("/sync-emails")
def sync_emails(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.gmail_address or not current_user.gmail_app_password:
        raise HTTPException(status_code=400, detail="No Gmail account linked. Please link your Gmail first.")
    
    logger.info(f"Syncing emails for user {current_user.email}")
    try:
        imap = imaplib.IMAP4_SSL("imap.gmail.com")
        imap.login(current_user.gmail_address, current_user.gmail_app_password)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not connect to Gmail.")
    
    raw_emails = fetch_emails(imap)
    imap.logout()

    saved_count = 0
    for raw in raw_emails:
        parsed = parse_email(raw)
        features = extract_features(parsed)
        scoring = calculate_phishing_score(features)
        new_email = Email(
            user_id=current_user.id,
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
    logger.info(f"Synced {saved_count} emails for user {current_user.email}")
    return {"status": "success", "emails_stored": saved_count}

@app.get("/emails")
def get_emails(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logger.info(f"Fetching emails for user {current_user.email}")
    emails = db.query(Email).filter(Email.user_id == current_user.id).all()
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

@app.get("/")
def read_root():
    return {"message": "Backend alive"}