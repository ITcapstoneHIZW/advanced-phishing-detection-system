from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import Email, AnalysisResult, User
import models
from logger import logger
from services.feature_extractor import extract_features, calculate_phishing_score
from services.imap_providers import get_imap_server, test_imap_connection, fetch_emails_imap
from fastapi.middleware.cors import CORSMiddleware
from auth import (
    hash_password, create_access_token, authenticate_user,
    get_user_by_email, decode_access_token
)
from oauth_service import (
    get_authorization_url as get_google_auth_url,
    exchange_code_for_credentials as google_exchange_code,
    get_user_info as get_google_user_info,
    fetch_emails_oauth as fetch_google_emails
)
from microsoft_oauth_service import (
    get_authorization_url as get_microsoft_auth_url,
    exchange_code_for_credentials as microsoft_exchange_code,
    get_user_info as get_microsoft_user_info,
    fetch_emails_microsoft
)
from pydantic import BaseModel
from typing import Optional
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        "email_provider": current_user.email_provider,
        "has_email_linked": current_user.gmail_address is not None
    }

# --- Google OAuth2 ---
@app.get("/auth/gmail")
def gmail_auth(current_user: User = Depends(get_current_user)):
    auth_url, state = get_google_auth_url()
    return {"auth_url": auth_url, "state": state}

@app.get("/auth/callback")
def gmail_callback(code: str, state: str, db: Session = Depends(get_db)):
    try:
        credentials = google_exchange_code(code, state)
        gmail_address = get_google_user_info(credentials)
        creds_json = json.dumps(credentials)
        frontend_url = f"http://localhost:5173/link-email?success=true&gmail={gmail_address}&creds={creds_json}&provider=gmail"
        return RedirectResponse(url=frontend_url)
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return RedirectResponse(url="http://localhost:5173/link-email?error=true")

@app.post("/auth/save-gmail")
def save_gmail(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.gmail_address = data.get("gmail_address")
    current_user.gmail_credentials = json.dumps(data.get("credentials"))
    current_user.email_provider = "gmail"
    db.commit()
    return {"message": "Gmail linked successfully"}

# --- Microsoft OAuth2 ---
@app.get("/auth/microsoft")
def microsoft_auth(current_user: User = Depends(get_current_user)):
    auth_url, state = get_microsoft_auth_url()
    return {"auth_url": auth_url, "state": state}

@app.get("/auth/microsoft/callback")
def microsoft_callback(code: str, state: str, db: Session = Depends(get_db)):
    try:
        credentials = microsoft_exchange_code(code)
        email_address = get_microsoft_user_info(credentials["access_token"])
        creds_json = json.dumps(credentials)
        frontend_url = f"http://localhost:5173/link-email?success=true&gmail={email_address}&creds={creds_json}&provider=microsoft"
        return RedirectResponse(url=frontend_url)
    except Exception as e:
        logger.error(f"Microsoft OAuth callback error: {e}")
        return RedirectResponse(url="http://localhost:5173/link-email?error=true")

@app.post("/auth/save-microsoft")
def save_microsoft(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.gmail_address = data.get("email_address")
    current_user.gmail_credentials = json.dumps(data.get("credentials"))
    current_user.email_provider = "microsoft"
    db.commit()
    return {"message": "Microsoft account linked successfully"}

# --- Sync emails ---
@app.post("/sync-emails")
def sync_emails(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.gmail_address:
        raise HTTPException(status_code=400, detail="No email account linked. Please link your email first.")

    logger.info(f"Syncing emails for user {current_user.email}")

    try:
        provider = current_user.email_provider

        if provider == "gmail":
            credentials_dict = json.loads(current_user.gmail_credentials)
            raw_emails, updated_creds = fetch_google_emails(credentials_dict)
            current_user.gmail_credentials = json.dumps(updated_creds)
            db.commit()
        elif provider == "microsoft":
            credentials_dict = json.loads(current_user.gmail_credentials)
            raw_emails, updated_creds = fetch_emails_microsoft(credentials_dict)
            current_user.gmail_credentials = json.dumps(updated_creds)
            db.commit()
        else:
            raw_emails = fetch_emails_imap(
                current_user.gmail_address,
                current_user.gmail_app_password
            )
    except Exception as e:
        logger.error(f"Error syncing emails: {e}")
        raise HTTPException(status_code=400, detail=f"Could not fetch emails: {str(e)}")

    existing = db.query(Email.subject).filter(Email.user_id == current_user.id).all()
    existing_subjects = set(e.subject for e in existing)

    saved_count = 0
    for parsed in raw_emails:
        if parsed["subject"] in existing_subjects:
            continue

        features = extract_features(parsed)
        scoring = calculate_phishing_score(features)
        new_email = Email(
            user_id=current_user.id,
            sender=parsed["sender"],
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
        existing_subjects.add(parsed["subject"])
        saved_count += 1

    db.commit()
    logger.info(f"Synced {saved_count} new emails for user {current_user.email}")
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