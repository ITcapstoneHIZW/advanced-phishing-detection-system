from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import Email, AnalysisResult, User, LinkedEmail, SensitivityConfig
from logger import logger
from services.feature_extractor import extract_features, calculate_phishing_score
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
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for {request.email}")
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}

@app.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    linked = db.query(LinkedEmail).filter(LinkedEmail.user_id == current_user.id).all()
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "has_email_linked": len(linked) > 0,
        "linked_emails": [{"id": l.id, "email_address": l.email_address, "provider": l.provider} for l in linked]
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
    gmail_address = data.get("gmail_address")
    # Check if already linked
    existing = db.query(LinkedEmail).filter(
        LinkedEmail.user_id == current_user.id,
        LinkedEmail.email_address == gmail_address
    ).first()
    if existing:
        existing.credentials = json.dumps(data.get("credentials"))
        db.commit()
        return {"message": "Gmail credentials updated"}
    linked = LinkedEmail(
        user_id=current_user.id,
        email_address=gmail_address,
        provider="gmail",
        credentials=json.dumps(data.get("credentials"))
    )
    db.add(linked)
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
    email_address = data.get("email_address")
    existing = db.query(LinkedEmail).filter(
        LinkedEmail.user_id == current_user.id,
        LinkedEmail.email_address == email_address
    ).first()
    if existing:
        existing.credentials = json.dumps(data.get("credentials"))
        db.commit()
        return {"message": "Microsoft credentials updated"}
    linked = LinkedEmail(
        user_id=current_user.id,
        email_address=email_address,
        provider="microsoft",
        credentials=json.dumps(data.get("credentials"))
    )
    db.add(linked)
    db.commit()
    return {"message": "Microsoft account linked successfully"}

# --- Linked emails management ---
@app.get("/linked-emails")
def get_linked_emails(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    linked = db.query(LinkedEmail).filter(LinkedEmail.user_id == current_user.id).all()
    return {"linked_emails": [
        {"id": l.id, "email_address": l.email_address, "provider": l.provider, "linked_at": str(l.linked_at)}
        for l in linked
    ]}

@app.delete("/linked-emails/{linked_email_id}")
def unlink_email(linked_email_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    linked = db.query(LinkedEmail).filter(
        LinkedEmail.id == linked_email_id,
        LinkedEmail.user_id == current_user.id
    ).first()
    if not linked:
        raise HTTPException(status_code=404, detail="Linked email not found")
    db.delete(linked)
    db.commit()
    return {"message": "Email unlinked successfully"}

# --- Sync emails ---
@app.post("/sync-emails")
def sync_emails(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    linked_emails = db.query(LinkedEmail).filter(LinkedEmail.user_id == current_user.id).all()
    if not linked_emails:
        raise HTTPException(status_code=400, detail="No email accounts linked. Please link at least one email.")

    total_saved = 0

    for linked in linked_emails:
        try:
            credentials_dict = json.loads(linked.credentials) if linked.credentials else None

            if linked.provider == "gmail":
                raw_emails, updated_creds = fetch_google_emails(credentials_dict)
                linked.credentials = json.dumps(updated_creds)
                db.commit()
            elif linked.provider == "microsoft":
                raw_emails, updated_creds = fetch_emails_microsoft(credentials_dict)
                linked.credentials = json.dumps(updated_creds)
                db.commit()
            else:
                continue

            existing = db.query(Email.subject).filter(
                Email.user_id == current_user.id,
                Email.linked_email_id == linked.id
            ).all()
            existing_subjects = set(e.subject for e in existing)

            for parsed in raw_emails:
                if parsed["subject"] in existing_subjects:
                    continue
                features = extract_features(parsed)
                scoring = calculate_phishing_score(features)
                new_email = Email(
                    user_id=current_user.id,
                    linked_email_id=linked.id,
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
                total_saved += 1

        except Exception as e:
            logger.error(f"Error syncing {linked.email_address}: {e}")
            continue

    db.commit()
    return {"status": "success", "emails_stored": total_saved}

# --- Email endpoints ---
@app.get("/emails/{email_id}")
def get_email(email_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == current_user.id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    analysis = db.query(AnalysisResult).filter(AnalysisResult.email_id == email_id).first()
    linked = db.query(LinkedEmail).filter(LinkedEmail.id == email.linked_email_id).first()
    return {
        "id": email.id,
        "sender": email.sender,
        "subject": email.subject,
        "body": email.body,
        "date_received": email.date_received,
        "is_quarantined": email.is_quarantined,
        "risk_score": analysis.risk_score if analysis else None,
        "verdict": analysis.verdict if analysis else None,
        "inbox": linked.email_address if linked else None
    }

@app.get("/emails")
def get_emails(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    emails = db.query(Email).filter(Email.user_id == current_user.id).all()
    results = []
    for email in emails:
        analysis = db.query(AnalysisResult).filter(AnalysisResult.email_id == email.id).first()
        linked = db.query(LinkedEmail).filter(LinkedEmail.id == email.linked_email_id).first()
        results.append({
            "id": email.id,
            "sender": email.sender,
            "subject": email.subject,
            "date_received": email.date_received,
            "is_quarantined": email.is_quarantined,
            "risk_score": analysis.risk_score if analysis else None,
            "verdict": analysis.verdict if analysis else None,
            "inbox": linked.email_address if linked else None
        })
    return {"emails": results}

# --- Email actions ---
@app.post("/emails/{email_id}/release")
def release_email(email_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == current_user.id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.is_quarantined = False
    db.commit()
    return {"message": "Email released successfully"}

@app.delete("/emails/{email_id}")
def delete_email(email_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == current_user.id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    db.query(AnalysisResult).filter(AnalysisResult.email_id == email_id).delete()
    db.delete(email)
    db.commit()
    return {"message": "Email deleted successfully"}

@app.post("/emails/{email_id}/feedback")
def submit_feedback(email_id: int, data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == current_user.id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    verdict = data.get("verdict")
    if verdict not in ["Safe", "Phishing"]:
        raise HTTPException(status_code=400, detail="Invalid verdict")
    analysis = db.query(AnalysisResult).filter(AnalysisResult.email_id == email_id).first()
    if analysis:
        analysis.verdict = verdict
    email.is_quarantined = verdict == "Phishing"
    db.commit()
    return {"message": f"Email marked as {verdict}"}

# --- Sensitivity settings ---
@app.get("/settings/sensitivity")
def get_sensitivity(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(SensitivityConfig).filter(SensitivityConfig.user_id == current_user.id).first()
    if not config:
        return {"threshold": 0.7, "quarantine_type": "phishing"}
    return {"threshold": config.threshold_value, "quarantine_type": config.quarantine_type}

@app.post("/settings/sensitivity")
def update_sensitivity(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    threshold = data.get("threshold")
    quarantine_type = data.get("quarantine_type", "phishing")
    if not threshold or not (0.1 <= threshold <= 0.9):
        raise HTTPException(status_code=400, detail="Threshold must be between 0.1 and 0.9")
    config = db.query(SensitivityConfig).filter(SensitivityConfig.user_id == current_user.id).first()
    if config:
        config.threshold_value = threshold
        config.quarantine_type = quarantine_type
    else:
        config = SensitivityConfig(user_id=current_user.id, threshold_value=threshold, quarantine_type=quarantine_type)
        db.add(config)
    db.commit()
    return {"message": "Sensitivity updated successfully", "threshold": threshold}

# --- Account ---
@app.get("/account")
def get_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    linked = db.query(LinkedEmail).filter(LinkedEmail.user_id == current_user.id).all()
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "created_at": str(current_user.created_at),
        "linked_emails": [
            {"id": l.id, "email_address": l.email_address, "provider": l.provider, "linked_at": str(l.linked_at)}
            for l in linked
        ]
    }

@app.post("/account/change-password")
def change_password(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from auth import verify_password, hash_password
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password changed successfully"}

@app.delete("/account")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(AnalysisResult).filter(
        AnalysisResult.email_id.in_(
            db.query(Email.id).filter(Email.user_id == current_user.id)
        )
    ).delete(synchronize_session=False)
    db.query(Email).filter(Email.user_id == current_user.id).delete()
    db.query(LinkedEmail).filter(LinkedEmail.user_id == current_user.id).delete()
    db.query(SensitivityConfig).filter(SensitivityConfig.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}

@app.get("/")
def read_root():
    return {"message": "Backend alive"}