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
    gmail_address = Column(String, nullable=True)
    gmail_credentials = Column(Text, nullable=True)  # Stores OAuth2 credentials as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    emails = relationship("Email", back_populates="user")


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
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
    analysis = relationship("AnalysisResult", back_populates="email")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"))
    url_count = Column(Integer, default=0)
    has_suspicious_url = Column(Boolean, default=False)
    has_urgent_language = Column(Boolean, default=False)
    sender_domain = Column(String, nullable=True)
    is_free_email = Column(Boolean, default=False)
    risk_score = Column(Float, default=0.0)
    verdict = Column(String, nullable=True)
    analysed_at = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="analysis")