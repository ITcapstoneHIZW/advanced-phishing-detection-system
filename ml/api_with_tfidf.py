"""
Improved Phishing Detection API using BOTH keyword AND TF-IDF features.
"""

import joblib
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

# Paths - UPDATED to use the combined model!
MODEL_PATH = 'models/combined_model.pkl'
SCALER_PATH = 'models/combined_scaler.pkl'
TFIDF_PATH = 'models/tfidf_vectorizer.pkl'

print("=" * 60)
print("LOADING IMPROVED PHISHING DETECTION MODEL")
print("=" * 60)

# Check if all files exist
missing_files = []
for path in [MODEL_PATH, SCALER_PATH, TFIDF_PATH]:
    if not os.path.exists(path):
        missing_files.append(path)

if missing_files:
    print("❌ Missing files:")
    for f in missing_files:
        print(f"   - {f}")
    print("\n💡 To fix:")
    print("   1. Run 'python train_combined_model.py' first")
    exit(1)

# Load all models
print("📂 Loading combined model...")
model = joblib.load(MODEL_PATH)
print("   ✅ Combined model loaded")

print("📂 Loading combined scaler...")
scaler = joblib.load(SCALER_PATH)
print("   ✅ Combined scaler loaded")

print("📂 Loading TF-IDF vectorizer...")
tfidf = joblib.load(TFIDF_PATH)
print(f"   ✅ TF-IDF vectorizer loaded ({tfidf.get_feature_names_out().shape[0]} features)")

print("\n✅ All models loaded successfully!")

def extract_numeric_features(email_text):
    """Extract keyword-based features (same 6 as before)"""
    return {
        'email_length': len(email_text),
        'word_count': len(email_text.split()),
        'sentence_count': email_text.count('. ') + email_text.count('! ') + email_text.count('? '),
        'urgent_word_count': sum(1 for word in ['urgent', 'immediately', 'suspended', 'verify', 'alert', 'warning'] if word in email_text.lower()),
        'money_word_count': sum(1 for word in ['money', 'win', 'prize', 'million', 'free', 'cash', 'reward'] if word in email_text.lower()),
        'product_word_count': sum(1 for word in ['cialis', 'viagra', 'weight', 'loss', 'pharmacy'] if word in email_text.lower()),
    }

def predict_phishing(email_text):
    """Predict using BOTH keyword AND TF-IDF features"""
    
    # 1. Keyword features
    numeric = extract_numeric_features(email_text)
    numeric_array = np.array([[
        numeric['email_length'],
        numeric['word_count'],
        numeric['sentence_count'],
        numeric['urgent_word_count'],
        numeric['money_word_count'],
        numeric['product_word_count']
    ]])
    
    # 2. TF-IDF semantic features
    tfidf_features = tfidf.transform([email_text]).toarray()
    
    # 3. Combine features
    combined = np.hstack([numeric_array, tfidf_features])
    
    # 4. Scale
    combined_scaled = scaler.transform(combined)
    
    # 5. Predict
    risk_score = model.predict_proba(combined_scaled)[0][1]
    is_phishing = risk_score > 0.5
    
    return {
        'risk_score': round(risk_score, 3),
        'is_phishing': bool(is_phishing),
        'confidence': round(risk_score if is_phishing else 1 - risk_score, 3)
    }

# Test
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("TESTING IMPROVED PHISHING DETECTOR")
    print("=" * 60)
    
    test_emails = [
        "URGENT: Your PayPal account has been suspended! Click here to verify your identity immediately.",
        "Hi team, please find attached the quarterly report for your review. Let me know if you have any questions.",
        "CONGRATULATIONS! You've won $1,000,000. Claim your prize now by clicking this link."
    ]
    
    for i, email in enumerate(test_emails):
        result = predict_phishing(email)
        print(f"\n📧 Test {i+1}: {email[:60]}...")
        print(f"   Risk Score: {result['risk_score']}")
        print(f"   Is Phishing: {result['is_phishing']}")
        print(f"   Confidence: {result['confidence']}")