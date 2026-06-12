"""
Improved Phishing Detection API using BOTH keyword AND TF-IDF features.
UPDATED to match full_pipeline.py (9 keyword + TF-IDF = 102 features)
WITH safe pattern overrides to reduce false positives on legitimate emails.
"""

import joblib
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

# Paths
MODEL_PATH = 'models/combined_model.pkl'
SCALER_PATH = 'models/combined_scaler.pkl'
TFIDF_PATH = 'models/tfidf_vectorizer.pkl'

# Sensitivity threshold (higher = less sensitive)
# 0.5 = default, 0.7 = less sensitive, 0.8 = even less, 0.85 = very strict
PHISHING_THRESHOLD = 0.8

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
    print("\n💡 Run 'python full_pipeline.py' first")
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
print(f"⚙️  Phishing threshold set to: {PHISHING_THRESHOLD} (higher = less sensitive)")

def extract_numeric_features(email_text):
    """Extract ALL 9 keyword-based features (matching full_pipeline.py)"""
    
    email_lower = email_text.lower()
    
    # Count links (more nuanced than binary)
    link_count = email_lower.count('http') + email_lower.count('www.')
    word_count = len(email_text.split())
    # Link density: if lots of links relative to text length, increase suspicion
    link_density = min(link_count / max(word_count, 1) * 20, 1)  # Cap at 1
    
    return {
        'email_length': len(email_text),
        'word_count': word_count,
        'sentence_count': email_text.count('. ') + email_text.count('! ') + email_text.count('? '),
        'urgent_word_count': sum(1 for word in ['urgent', 'immediately', 'suspended', 'verify', 'alert', 'warning'] if word in email_lower),
        'money_word_count': sum(1 for word in ['money', 'win', 'prize', 'million', 'free', 'cash', 'reward'] if word in email_lower),
        'product_word_count': sum(1 for word in ['cialis', 'viagra', 'weight', 'loss', 'pharmacy'] if word in email_lower),
        'has_link': min(link_count, 1),  # Binary: 0 or 1
        'link_density': link_density,  # New: continuous feature for link density
        'has_attachment': 0,  # Can't detect from text alone
        'urgency_flag': 1 if 'urgent' in email_lower or 'immediately' in email_lower else 0,
    }

def predict_phishing(email_text, threshold=PHISHING_THRESHOLD):
    """
    Predict if an email is phishing.
    threshold: higher = less sensitive (0.5 default, 0.8 = stricter)
    """
    
    email_lower = email_text.lower()
    
    # ========== SAFE PATTERN OVERRIDES (Run BEFORE model) ==========
    # These patterns indicate legitimate emails - override model prediction
    
    # Trusted domains and legitimate services
    safe_patterns = [
        'nytimes.com', 'new york times', 'washington post', 'the guardian',
        'bbc news', 'cnn.com', 'the atlantic', 'reuters.com', 'bloomberg.com',
        'substack.com', 'medium.com', 'newsletter', 'unsubscribe', 'view in browser',
        'linkedin.com', 'github.com', 'stackoverflow.com', 'reddit.com',
        'spotify.com', 'netflix.com', 'amazon.com', 'paypal.com', 'apple.com',
        'microsoft.com', 'google.com', 'facebook.com', 'twitter.com', 'instagram.com'
    ]
    
    for pattern in safe_patterns:
        if pattern in email_lower:
            return {
                'risk_score': 0.05,
                'is_phishing': False,
                'confidence': 0.95,
                'reason': f'Recognized as legitimate service (matched: {pattern})'
            }
    
    # Classic newsletter pattern: has both unsubscribe AND view in browser
    if ('unsubscribe' in email_lower or 'unsubscribe' in email_lower) and 'view in browser' in email_lower:
        return {
            'risk_score': 0.08,
            'is_phishing': False,
            'confidence': 0.92,
            'reason': 'Legitimate newsletter pattern detected'
        }
    
    # Business email pattern (common in corporate settings)
    business_patterns = [
        'quarterly report', 'meeting scheduled', 'salary payment', 
        'monthly report', 'team meeting', 'please find attached',
        'let me know if you have any questions', 'thank you for your'
    ]
    
    for pattern in business_patterns:
        if pattern in email_lower:
            return {
                'risk_score': 0.10,
                'is_phishing': False,
                'confidence': 0.90,
                'reason': f'Business email pattern detected'
            }
    
    # ========== NORMAL MODEL PREDICTION ==========
    
    # 1. Keyword features (10 features now with link_density)
    numeric = extract_numeric_features(email_text)
    numeric_array = np.array([[
        numeric['email_length'],
        numeric['word_count'],
        numeric['sentence_count'],
        numeric['urgent_word_count'],
        numeric['money_word_count'],
        numeric['product_word_count'],
        numeric['has_link'],
        numeric['link_density'],
        numeric['has_attachment'],
        numeric['urgency_flag']
    ]])
    
    # 2. TF-IDF semantic features
    tfidf_features = tfidf.transform([email_text]).toarray()
    
    # 3. Combine features
    combined = np.hstack([numeric_array, tfidf_features])
    
    # 4. Scale
    combined_scaled = scaler.transform(combined)
    
    # 5. Predict
    risk_score = model.predict_proba(combined_scaled)[0][1]
    is_phishing = risk_score > threshold
    
    return {
        'risk_score': round(risk_score, 3),
        'is_phishing': bool(is_phishing),
        'confidence': round(risk_score if is_phishing else 1 - risk_score, 3),
        'threshold_used': threshold
    }

# Test
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("TESTING IMPROVED PHISHING DETECTOR")
    print("=" * 60)
    
    test_emails = [
        "URGENT: Your PayPal account has been suspended! Click here to verify your identity immediately.",
        "Hi team, please find attached the quarterly report for your review. Let me know if you have any questions.",
        "CONGRATULATIONS! You've won $1,000,000. Claim your prize now by clicking this link.",
        "From: The New York Times <nytdirect@nytimes.com> - Best of Late Night: Late Night Prepares for Trump's U.F.C. Birthday Fight at the White House - View in browser"
    ]
    
    for i, email in enumerate(test_emails):
        result = predict_phishing(email)
        print(f"\n📧 Test {i+1}: {email[:60]}...")
        print(f"   Risk Score: {result['risk_score']}")
        print(f"   Is Phishing: {result['is_phishing']}")
        print(f"   Confidence: {result['confidence']}")
        if 'reason' in result:
            print(f"   Reason: {result['reason']}")
