from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    linked_emails = relationship("LinkedEmail", back_populates="user")
    emails = relationship("Email", back_populates="user")
    sensitivity_configs = relationship("SensitivityConfig", back_populates="user")


class LinkedEmail(Base):
    __tablename__ = "linked_emails"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email_address = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    credentials = Column(Text, nullable=True)
    linked_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="linked_emails")
    emails = relationship("Email", back_populates="linked_email")


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    linked_email_id = Column(Integer, ForeignKey("linked_emails.id"), nullable=True)
    sender = Column(String, nullable=True)
    recipient = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=True)            # plain-text body, used for feature extraction / scoring
    body_html = Column(Text, nullable=True)       # NEW: raw HTML body, used for display only
    message_id = Column(String, nullable=True, index=True)  # NEW: stable provider message ID, for dedup
    date_received = Column(DateTime(timezone=True), nullable=True)  # CHANGED: was String, now real datetime
    header_data = Column(Text, nullable=True)
    link_data = Column(Text, nullable=True)
    is_quarantined = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="emails")
    linked_email = relationship("LinkedEmail", back_populates="emails")
    analysis = relationship("AnalysisResult", back_populates="email")
    feedback = relationship("UserFeedback", back_populates="email")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"))

    # URL analysis
    url_count = Column(Integer, default=0)
    has_suspicious_url = Column(Boolean, default=False)

    # Urgent language
    has_urgent_language = Column(Boolean, default=False)
    urgent_word_count = Column(Integer, default=0)

    # Sender analysis
    sender_domain = Column(String, nullable=True)
    is_free_email = Column(Boolean, default=False)
    has_spoofed_domain = Column(Boolean, default=False)

    # Subject
    subject_has_urgent = Column(Boolean, default=False)

    # NLP
    sentiment_score = Column(Float, default=0.0)
    is_negative_sentiment = Column(Boolean, default=False)
    has_grammar_issues = Column(Boolean, default=False)
    grammar_error_ratio = Column(Float, default=0.0)

    # Language
    detected_language = Column(String, nullable=True)
    is_non_english = Column(Boolean, default=False)

    # Overall scoring
    risk_score = Column(Float, default=0.0)
    verdict = Column(String, nullable=True)

    # ML model scoring  (NEW)
    ml_score = Column(Float, nullable=True)       # ML model's risk score (0-10 scaled), null if ML not used
    used_ml = Column(Boolean, default=False)      # True if the ML model scored this email, False if rule-based only

    analysed_at = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="analysis")


class SensitivityConfig(Base):
    __tablename__ = "sensitivity_config"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    threshold_value = Column(Float, default=0.7)
    quarantine_type = Column(String, default="phishing")
    date_changed = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sensitivity_configs")


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    feedback = Column(String, nullable=False)             # "Safe" or "Phishing" — the human label
    original_verdict = Column(String, nullable=True)      # what the system said before the correction (preserved)
    date_submitted = Column(DateTime(timezone=True), server_default=func.now())
    used_for_retraining = Column(Boolean, default=False)  # track which feedback has been fed into a retrain cycle

    email = relationship("Email", back_populates="feedback")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    detail = Column(Text, nullable=True)
    severity = Column(String, default="info")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
