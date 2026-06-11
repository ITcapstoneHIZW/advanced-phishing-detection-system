from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import os
from typing import Dict, Any

# IMPORT THE IMPROVED PREDICTION FUNCTION
from api_with_tfidf import predict_phishing

# Create FastAPI app
app = FastAPI(title="Phishing Detection API", description="AI-powered email phishing detection (with TF-IDF semantic features)")

# Define the request format
class EmailRequest(BaseModel):
    text: str

# Define the response format
class EmailResponse(BaseModel):
    risk_score: float
    is_phishing: bool
    confidence: float

# API Endpoints
@app.get("/")
def root():
    return {"message": "Phishing Detection API is running!", "status": "online", "version": "2.0 - with TF-IDF"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict", response_model=EmailResponse)
def predict(email: EmailRequest):
    # Call the improved prediction function from api_with_tfidf.py
    result = predict_phishing(email.text)
    
    return EmailResponse(
        risk_score=result['risk_score'],
        is_phishing=result['is_phishing'],
        confidence=result['confidence']
    )

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)