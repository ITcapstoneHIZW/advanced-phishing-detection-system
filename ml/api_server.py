from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os
from typing import Dict, Any

# Create FastAPI app
app = FastAPI(title="Phishing Detection API", description="AI-powered email phishing detection")

# Load model once at startup
print("Loading model...")
model_path = 'models/final_model_part1.pkl'
scaler_path = 'models/scaler.pkl'

model = joblib.load(model_path)
scaler = joblib.load(scaler_path)
print("✅ Model and scaler loaded successfully!")

# Define the request format
class EmailRequest(BaseModel):
    text: str

# Define the response format
class EmailResponse(BaseModel):
    risk_score: float
    is_phishing: bool
    confidence: float

# Helper function to extract features
def extract_features(email_text: str) -> list:
    features = {
        'email_length': len(email_text),
        'word_count': len(email_text.split()),
        'sentence_count': email_text.count('. ') + email_text.count('! ') + email_text.count('? '),
        'urgent_word_count': sum(1 for word in ['urgent', 'immediately', 'suspended', 'verify'] if word in email_text.lower()),
        'money_word_count': sum(1 for word in ['money', 'win', 'prize', 'million', 'free'] if word in email_text.lower()),
        'product_word_count': sum(1 for word in ['cialis', 'viagra', 'weight', 'loss'] if word in email_text.lower()),
    }
    
    return [[
        features['email_length'],
        features['word_count'],
        features['sentence_count'],
        features['urgent_word_count'],
        features['money_word_count'],
        features['product_word_count']
    ]]

# API Endpoints
@app.get("/")
def root():
    return {"message": "Phishing Detection API is running!", "status": "online"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict", response_model=EmailResponse)
def predict(email: EmailRequest):
    # Extract features
    features = extract_features(email.text)
    
    # Scale features
    scaled = scaler.transform(features)
    
    # Get prediction
    risk_score = model.predict_proba(scaled)[0][1]
    is_phishing = risk_score > 0.5
    
    return EmailResponse(
        risk_score=round(float(risk_score), 3),
        is_phishing=bool(is_phishing),
        confidence=round(float(risk_score if is_phishing else 1 - risk_score), 3)
    )

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)