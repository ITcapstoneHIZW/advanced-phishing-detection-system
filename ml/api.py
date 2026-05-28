import joblib
import os

# Load your trained model
model_path = 'models/final_model_part1.pkl'
scaler_path = 'models/scaler.pkl'

# Check if files exist
if os.path.exists(model_path) and os.path.exists(scaler_path):
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    print("✅ Model and scaler loaded successfully!")
else:
    print("❌ Model or scaler not found!")
    print(f"Model path: {model_path}")
    print(f"Scaler path: {scaler_path}")

def predict_phishing(email_text):
    """Simple function that backend can call"""
    
    # Extract basic features (same as training)
    features = {
        'email_length': len(email_text),
        'word_count': len(email_text.split()),
        'sentence_count': email_text.count('. ') + email_text.count('! ') + email_text.count('? '),
        'urgent_word_count': sum(1 for word in ['urgent', 'immediately', 'suspended', 'verify'] if word in email_text.lower()),
        'money_word_count': sum(1 for word in ['money', 'win', 'prize', 'million', 'free'] if word in email_text.lower()),
        'product_word_count': sum(1 for word in ['cialis', 'viagra', 'weight', 'loss'] if word in email_text.lower()),
    }
    
    # Convert to list in correct order
    feature_list = [[
        features['email_length'],
        features['word_count'],
        features['sentence_count'],
        features['urgent_word_count'],
        features['money_word_count'],
        features['product_word_count']
    ]]
    
    # Scale and predict
    scaled = scaler.transform(feature_list)
    risk_score = model.predict_proba(scaled)[0][1]
    is_phishing = risk_score > 0.5
    
    return {
        'risk_score': round(risk_score, 3),
        'is_phishing': is_phishing,
        'confidence': round(risk_score if is_phishing else 1 - risk_score, 3)
    }

# Test it
if __name__ == "__main__":
    test_email = "URGENT: Your account has been suspended! Click here to verify."
    result = predict_phishing(test_email)
    print("\n📧 Test Email:", test_email)
    print("📊 Result:", result)