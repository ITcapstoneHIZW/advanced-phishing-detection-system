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
    body = Column(Text, nullable=True)
    date_received = Column(String, nullable=True)
    header_data = Column(Text, nullable=True)
    link_data = Column(Text, nullable=True)
    is_quarantined = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="emails")
    linked_email = relationship("LinkedEmail", back_populates="emails")
    analysis = relationship("AnalysisResult", back_populates="email")


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
