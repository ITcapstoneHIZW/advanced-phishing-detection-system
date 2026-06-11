from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import re

class PhishingSemanticDetector:
    """Uses a pre-trained transformer to understand sentence meaning"""
    
    def __init__(self):
        # Load a model fine-tuned for phishing detection
        # Option A: Use a general sentiment model as base (quick)
        self.tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
        self.model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased")
        
        # Option B: Find a phishing-specific model on HuggingFace
        # Search: "phishing detection" or "email classification"
        
    def predict(self, email_text):
        # Tokenize the email
        inputs = self.tokenizer(email_text, return_tensors="pt", truncation=True, max_length=512)
        
        # Get prediction
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)
            risk_score = probabilities[0][1].item()
        
        return {
            'risk_score': round(risk_score, 3),
            'is_phishing': risk_score > 0.5,
            'confidence': round(risk_score if risk_score > 0.5 else 1 - risk_score, 3)
        }

# Use it
detector = PhishingSemanticDetector()
result = detector.predict("URGENT: Your account has been suspended!")
print(result)