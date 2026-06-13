from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import Email, AnalysisResult, User, LinkedEmail, SensitivityConfig, AuditLog, UserFeedback
from logger import logger
from services.feature_extractor import extract_features, calculate_combined_score
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
import os
import nltk

from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

def parse_email_date(date_str):
    """
    Parse a provider date string into a timezone-aware datetime.
    Handles Gmail RFC 2822 ("Wed, 10 Jun 2026 14:22:01 +1000") and
    Microsoft ISO 8601 ("2026-06-10T14:22:01Z"). Returns None if unparseable.
    All results are normalised to timezone-aware (UTC if no tz given) so they
    can be compared/sorted without naive-vs-aware errors.
    """
    if not date_str:
        return None
    # Try RFC 2822 (Gmail)
    try:
        dt = parsedate_to_datetime(date_str)
        if dt is not None:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
    except (TypeError, ValueError, IndexError):
        pass
    # Try ISO 8601 (Microsoft)
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (TypeError, ValueError):
        return None

for pkg in ["punkt", "punkt_tab"]:
    try:
        nltk.download(pkg, quiet=True)
    except Exception:
        pass

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        os.environ.get("FRONTEND_URL", ""),
    ],
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

def audit(db: Session, user, action: str, entity_type: str = None, entity_id: str = None, detail: str = None, severity: str = "info"):
    try:
        log = AuditLog(
            user_id=user.id if user else None,
            user_email=user.email if user else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            detail=detail,
            severity=severity,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Audit log failed: {e}")

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
    audit(db, user, "user_registered", "account", user.id, f"New account created for {user.email}")
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for {request.email}")
    user = authenticate_user(db, request.email, request.password)
    if not user:
        # Log failed login - use a stub user object
        try:
            log = AuditLog(user_email=request.email, action="login_failed", entity_type="account", detail=f"Failed login attempt for {request.email}", severity="warning")
            db.add(log)
            db.commit()
        except Exception as e:
            logger.error(f"Audit log failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    audit(db, user, "login_success", "account", user.id, f"{user.email} logged in")
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
        frontend_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/link-email?success=true&gmail={gmail_address}&creds={creds_json}&provider=gmail"
        return RedirectResponse(url=frontend_url)
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return RedirectResponse(url=f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/link-email?error=true")

@app.post("/auth/save-gmail")
def save_gmail(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    gmail_address = data.get("gmail_address")
    existing = db.query(LinkedEmail).filter(
        LinkedEmail.user_id == current_user.id,
        LinkedEmail.email_address == gmail_address
    ).first()
    if existing:
        existing.credentials = json.dumps(data.get("credentials"))
        db.commit()
        audit(db, current_user, "email_relinked", "linked_email", existing.id, f"Gmail credentials updated for {gmail_address}")
        return {"message": "Gmail credentials updated"}
    linked = LinkedEmail(
        user_id=current_user.id,
        email_address=gmail_address,
        provider="gmail",
        credentials=json.dumps(data.get("credentials"))
    )
    db.add(linked)
    db.commit()
    audit(db, current_user, "email_linked", "linked_email", linked.id, f"Gmail account linked: {gmail_address}")
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
        frontend_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/link-email?success=true&gmail={email_address}&creds={creds_json}&provider=microsoft"
        return RedirectResponse(url=frontend_url)
    except Exception as e:
        logger.error(f"Microsoft OAuth callback error: {e}")
        return RedirectResponse(url=f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/link-email?error=true")

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
        audit(db, current_user, "email_relinked", "linked_email", existing.id, f"Microsoft credentials updated for {email_address}")
        return {"message": "Microsoft credentials updated"}
    linked = LinkedEmail(
        user_id=current_user.id,
        email_address=email_address,
        provider="microsoft",
        credentials=json.dumps(data.get("credentials"))
    )
    db.add(linked)
    db.commit()
    audit(db, current_user, "email_linked", "linked_email", linked.id, f"Microsoft account linked: {email_address}")
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
    audit(db, current_user, "email_unlinked", "linked_email", linked_email_id, f"Unlinked {linked.email_address}", severity="warning")
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
    total_quarantined = 0

    # Load the user's sensitivity settings once; the sync loop applies them so
    # new emails are quarantined according to the user's chosen mode/threshold.
    sens_config = db.query(SensitivityConfig).filter(SensitivityConfig.user_id == current_user.id).first()
    sens_threshold = sens_config.threshold_value if sens_config else 0.7
    sens_mode = sens_config.quarantine_type if sens_config else "phishing"

    for linked in linked_emails:
        try:
            credentials_dict = json.loads(linked.credentials) if linked.credentials else None

            if linked.provider == "gmail":
                raw_emails, updated_creds = fetch_google_emails(credentials_dict, max_results=100)
                linked.credentials = json.dumps(updated_creds)
                db.commit()
            elif linked.provider == "microsoft":
                raw_emails, updated_creds = fetch_emails_microsoft(credentials_dict, max_results=100)
                linked.credentials = json.dumps(updated_creds)
                db.commit()
            else:
                continue

            existing = db.query(Email.message_id).filter(
                Email.user_id == current_user.id,
                Email.linked_email_id == linked.id
            ).all()
            existing_ids = set(e.message_id for e in existing if e.message_id)

            for parsed in raw_emails:
                msg_id = parsed.get("message_id")
                # Dedup on stable provider message ID (falls back to skipping
                # only if we've genuinely seen this exact message before)
                if msg_id and msg_id in existing_ids:
                    continue
                features = extract_features(parsed)
                scoring = calculate_combined_score(features, email_text=((parsed.get("subject", "") or "") + " " + (parsed.get("body", "") or "")), sender_domain=features.get("sender_domain"))
                quarantined = _should_quarantine(scoring["score"], scoring["verdict"], sens_threshold, sens_mode)
                new_email = Email(
                    user_id=current_user.id,
                    linked_email_id=linked.id,
                    sender=parsed["sender"],
                    subject=parsed["subject"],
                    body=parsed["body"],
                    body_html=parsed.get("body_html", ""),
                    message_id=msg_id,
                    date_received=parse_email_date(parsed.get("date")),
                    is_quarantined=quarantined
                )
                db.add(new_email)
                db.flush()
                analysis = AnalysisResult(
                    email_id=new_email.id,
                    url_count=features["url_count"],
                    has_suspicious_url=features["has_suspicious_url"],
                    has_urgent_language=features["has_urgent_language"],
                    urgent_word_count=features["urgent_word_count"],
                    sender_domain=features["sender_domain"],
                    is_free_email=features["is_free_email"],
                    has_spoofed_domain=features["has_spoofed_domain"],
                    subject_has_urgent=features["subject_has_urgent"],
                    sentiment_score=features["sentiment_score"],
                    is_negative_sentiment=features["is_negative_sentiment"],
                    has_grammar_issues=features["has_grammar_issues"],
                    grammar_error_ratio=features["grammar_error_ratio"],
                    detected_language=features["detected_language"],
                    is_non_english=features["is_non_english"],
                    risk_score=scoring["score"],
                    verdict=scoring["verdict"],
                    ml_score=scoring.get("ml_score"),
                    used_ml=scoring.get("used_ml", False)
                )
                db.add(analysis)
                if msg_id:
                    existing_ids.add(msg_id)
                total_saved += 1
                if quarantined:
                    total_quarantined += 1

        except Exception as e:
            logger.error(f"Error syncing {linked.email_address}: {e}")
            audit(db, current_user, "sync_error", "linked_email", linked.id, f"Sync failed for {linked.email_address}: {str(e)}", severity="warning")
            continue

    db.commit()
    audit(db, current_user, "email_sync", "linked_email", None, f"Synced {total_saved} new emails, {total_quarantined} quarantined")
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
        "body_html": email.body_html,
        "date_received": str(email.date_received) if email.date_received else None,
        "is_quarantined": email.is_quarantined,
        "inbox": linked.email_address if linked else None,
        "risk_score": analysis.risk_score if analysis else None,
        "verdict": analysis.verdict if analysis else None,
        "ml_score": analysis.ml_score if analysis else None,
        "used_ml": analysis.used_ml if analysis else False,
        "url_count": analysis.url_count if analysis else 0,
        "has_suspicious_url": analysis.has_suspicious_url if analysis else False,
        "has_urgent_language": analysis.has_urgent_language if analysis else False,
        "urgent_word_count": analysis.urgent_word_count if analysis else 0,
        "sender_domain": analysis.sender_domain if analysis else None,
        "is_free_email": analysis.is_free_email if analysis else False,
        "has_spoofed_domain": analysis.has_spoofed_domain if analysis else False,
        "subject_has_urgent": analysis.subject_has_urgent if analysis else False,
        "sentiment_score": analysis.sentiment_score if analysis else None,
        "is_negative_sentiment": analysis.is_negative_sentiment if analysis else False,
        "has_grammar_issues": analysis.has_grammar_issues if analysis else False,
        "grammar_error_ratio": analysis.grammar_error_ratio if analysis else None,
        "detected_language": analysis.detected_language if analysis else None,
        "is_non_english": analysis.is_non_english if analysis else False,
        "analysed_at": str(analysis.analysed_at) if analysis else None,
    }

@app.get("/emails")
def get_emails(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    emails = db.query(Email).filter(Email.user_id == current_user.id)\
        .order_by(Email.date_received.desc().nullslast()).all()
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
            "ml_score": analysis.ml_score if analysis else None,
            "used_ml": analysis.used_ml if analysis else False,
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
    audit(db, current_user, "email_released", "email", email_id, f"Email released from quarantine: '{email.subject}'", severity="info")
    return {"message": "Email released successfully"}

@app.delete("/emails/{email_id}")
def delete_email(email_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == current_user.id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    subject = email.subject
    db.query(UserFeedback).filter(UserFeedback.email_id == email_id).delete()
    db.query(AnalysisResult).filter(AnalysisResult.email_id == email_id).delete()
    db.delete(email)
    db.commit()
    audit(db, current_user, "email_deleted", "email", email_id, f"Email permanently deleted: '{subject}'", severity="warning")
    return {"message": "Email deleted successfully"}

# --- Feedback endpoints ---
@app.post("/emails/{email_id}/feedback")
def submit_feedback(email_id: int, data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == current_user.id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    verdict = data.get("verdict")
    if verdict not in ["Safe", "Phishing"]:
        raise HTTPException(status_code=400, detail="Invalid verdict")

    analysis = db.query(AnalysisResult).filter(AnalysisResult.email_id == email_id).first()
    original_verdict = analysis.verdict if analysis else None

    # Record the human feedback as a labelled training datapoint, preserving
    # what the system originally said (do NOT overwrite the system verdict).
    feedback_row = UserFeedback(
        email_id=email_id,
        user_id=current_user.id,
        feedback=verdict,
        original_verdict=original_verdict,
        used_for_retraining=False
    )
    db.add(feedback_row)

    # Still reflect the user's decision in the quarantine state for UX.
    email.is_quarantined = verdict == "Phishing"
    db.commit()
    audit(db, current_user, "feedback_submitted", "email", email_id, f"Email marked as {verdict} (was {original_verdict}): '{email.subject}'", severity="info")
    return {"message": f"Email marked as {verdict}"}


# ========== NEW: FEEDBACK EXPORT FOR ML RETRAINING ==========
# Add these endpoints for the ML feedback loop

@app.get("/feedback/export")
def export_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 1000,
    only_unused: bool = True
):
    """Export user feedback for ML retraining."""
    query = db.query(UserFeedback).filter(UserFeedback.user_id == current_user.id)
    
    if only_unused:
        query = query.filter(UserFeedback.used_for_retraining == False)
    
    feedbacks = query.order_by(UserFeedback.date_submitted.desc()).limit(limit).all()
    
    # Get the actual email content for each feedback
    results = []
    for fb in feedbacks:
        email = db.query(Email).filter(Email.id == fb.email_id).first()
        if email:
            text_combined = f"{email.subject or ''} {email.body or ''}"
            label = 1 if fb.feedback == "Phishing" else 0
            results.append({
                "id": fb.id,
                "text_combined": text_combined,
                "label": label,
                "original_verdict": fb.original_verdict,
                "date_submitted": str(fb.date_submitted),
                "used_for_retraining": fb.used_for_retraining
            })
    
    return {
        "feedbacks": results,
        "count": len(results)
    }


@app.post("/feedback/mark-used")
def mark_feedback_used(
    feedback_ids: list[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark feedback as used for retraining."""
    db.query(UserFeedback).filter(
        UserFeedback.id.in_(feedback_ids),
        UserFeedback.user_id == current_user.id
    ).update({"used_for_retraining": True}, synchronize_session=False)
    db.commit()
    return {"message": f"Marked {len(feedback_ids)} feedback items as used"}


@app.get("/feedback/export-csv")
def export_feedback_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export user feedback as CSV file for ML retraining."""
    import csv
    from io import StringIO
    from fastapi.responses import Response
    
    feedbacks = db.query(UserFeedback).filter(
        UserFeedback.user_id == current_user.id,
        UserFeedback.used_for_retraining == False
    ).all()
    
    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['text_combined', 'label'])
    
    for fb in feedbacks:
        email = db.query(Email).filter(Email.id == fb.email_id).first()
        if email:
            text_combined = f"{email.subject or ''} {email.body or ''}"
            label = 1 if fb.feedback == "Phishing" else 0
            writer.writerow([text_combined, label])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=feedback_data.csv"}
    )
# ========== END OF NEW FEEDBACK ENDPOINTS ==========


# --- Sensitivity settings ---
@app.get("/model-info")
def model_info(current_user: User = Depends(get_current_user)):
    """Report the actually-loaded ML model details so the UI reflects reality."""
    try:
        from services.ml_predictor import get_model_info as _get_model_info
        return _get_model_info()
    except Exception as e:
        logger.error(f"model-info failed: {e}")
        return {
            "ml_active": False,
            "description": "Rule-based scoring (model info unavailable)",
            "model_type": None,
            "total_features": None,
            "tfidf_features": None,
        }


@app.get("/settings/sensitivity")
def get_sensitivity(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(SensitivityConfig).filter(SensitivityConfig.user_id == current_user.id).first()
    if not config:
        return {"threshold": 0.7, "quarantine_type": "phishing"}
    return {"threshold": config.threshold_value, "quarantine_type": config.quarantine_type}

def _should_quarantine(risk_score, verdict, threshold, mode):
    """
    Decide whether an email should be quarantined, based on the user's
    sensitivity settings.
      - mode "phishing"   -> quarantine only Phishing (score >= 7)
      - mode "suspicious" -> quarantine Phishing + Suspicious (score >= 4)
      - mode "all"        -> quarantine anything at/above the slider threshold
                             (threshold is 0-1, scores are 0-10)
    """
    if risk_score is None:
        return False
    if mode == "all":
        return risk_score >= (threshold * 10)
    if mode == "suspicious":
        return risk_score >= 4
    # default: phishing only
    return risk_score >= 7


@app.post("/settings/sensitivity")
def update_sensitivity(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    threshold = data.get("threshold")
    quarantine_type = data.get("quarantine_type", "phishing")
    if not threshold or not (0.1 <= threshold <= 0.9):
        raise HTTPException(status_code=400, detail="Threshold must be between 0.1 and 0.9")

    config = db.query(SensitivityConfig).filter(SensitivityConfig.user_id == current_user.id).first()
    old_threshold = config.threshold_value if config else 0.7
    if config:
        config.threshold_value = threshold
        config.quarantine_type = quarantine_type
    else:
        config = SensitivityConfig(user_id=current_user.id, threshold_value=threshold, quarantine_type=quarantine_type)
        db.add(config)
    db.commit()

    # Re-evaluate ALL of the user's existing emails against the new settings, so
    # adjusting the slider/mode immediately moves emails in and out of quarantine.
    emails = db.query(Email).filter(Email.user_id == current_user.id).all()
    newly_quarantined = 0
    newly_released = 0
    for email in emails:
        analysis = db.query(AnalysisResult).filter(AnalysisResult.email_id == email.id).first()
        risk_score = analysis.risk_score if analysis else None
        verdict = analysis.verdict if analysis else None
        should_q = _should_quarantine(risk_score, verdict, threshold, quarantine_type)
        if should_q and not email.is_quarantined:
            email.is_quarantined = True
            newly_quarantined += 1
        elif not should_q and email.is_quarantined:
            email.is_quarantined = False
            newly_released += 1
    db.commit()

    audit(db, current_user, "sensitivity_updated", "config", None,
          f"Threshold {old_threshold} -> {threshold}, mode {quarantine_type}. "
          f"Re-evaluated {len(emails)} emails: {newly_quarantined} quarantined, {newly_released} released.",
          severity="warning")
    return {
        "message": "Sensitivity updated successfully",
        "threshold": threshold,
        "quarantine_type": quarantine_type,
        "newly_quarantined": newly_quarantined,
        "newly_released": newly_released,
        "total_evaluated": len(emails),
    }

# --- Audit log ---
@app.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog)\
        .filter(AuditLog.user_id == current_user.id)\
        .order_by(AuditLog.timestamp.desc())\
        .offset(offset)\
        .limit(limit)\
        .all()
    total = db.query(AuditLog).filter(AuditLog.user_id == current_user.id).count()
    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "user_email": log.user_email,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "detail": log.detail,
                "severity": log.severity,
                "timestamp": str(log.timestamp),
            }
            for log in logs
        ]
    }

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
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.hashed_password = hash_password(new_password)
    db.commit()
    audit(db, current_user, "password_changed", "account", current_user.id, "User changed their password", severity="warning")
    return {"message": "Password changed successfully"}

@app.delete("/account")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit(db, current_user, "account_deleted", "account", current_user.id, f"Account deleted: {current_user.email}", severity="critical")
    db.query(UserFeedback).filter(UserFeedback.user_id == current_user.id).delete(synchronize_session=False)
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
