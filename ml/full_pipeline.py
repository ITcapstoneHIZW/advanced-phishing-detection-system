"""
Complete pipeline: Load data -> Train TF-IDF -> Train Model -> Test -> Save
Run this ONCE to have a consistent model.
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

print("=" * 60)
print("COMPLETE PHISHING DETECTION PIPELINE")
print("=" * 60)

# ============================================
# 1. LOAD DATA
# ============================================
print("\n📂 1. Loading data...")
df = pd.read_csv('data/processed/emails_with_features.csv')
print(f"   Loaded {len(df)} emails")

# Get text and labels
texts = df['text_combined'].fillna('').values
y = df['label'].values

print(f"   Class distribution:")
print(f"   Safe (0): {(y == 0).sum()}")
print(f"   Phishing (1): {(y == 1).sum()}")

# ============================================
# 2. TF-IDF VECTORIZER (FIXED NUMBER OF FEATURES)
# ============================================
print("\n🔧 2. Training TF-IDF vectorizer...")
TFIDF_FEATURES = 100  # FIXED: use exactly 100 features
tfidf = TfidfVectorizer(
    max_features=TFIDF_FEATURES,
    stop_words='english',
    ngram_range=(1, 2),
    min_df=2,
    max_df=0.8
)
X_tfidf = tfidf.fit_transform(texts).toarray()
print(f"   TF-IDF features: {X_tfidf.shape[1]}")

# ============================================
# 3. KEYWORD FEATURES (9 features)
# ============================================
print("\n🔧 3. Extracting keyword features...")
keyword_cols = [
    'email_length', 'word_count', 'sentence_count',
    'urgent_word_count', 'money_word_count', 'product_word_count',
    'has_link', 'has_attachment', 'urgency_flag'
]
X_keyword = df[keyword_cols].values
print(f"   Keyword features: {X_keyword.shape[1]}")

# ============================================
# 4. COMBINE FEATURES
# ============================================
print("\n🔧 4. Combining features...")
X = np.hstack([X_keyword, X_tfidf])
print(f"   Total features: {X.shape[1]}")

# ============================================
# 5. TRAIN/TEST SPLIT
# ============================================
print("\n📊 5. Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"   Training: {len(X_train)} emails")
print(f"   Test: {len(X_test)} emails")

# ============================================
# 6. SCALING
# ============================================
print("\n📏 6. Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ============================================
# 7. TRAIN MODEL
# ============================================
print("\n🤖 7. Training Random Forest...")
model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X_train_scaled, y_train)

# ============================================
# 8. EVALUATE
# ============================================
print("\n📊 8. Evaluating model...")
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"\n   ✅ Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

print(f"\n📋 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Safe (0)', 'Phishing (1)']))

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
print(f"\n📊 Confusion Matrix:")
print(f"               Predicted Safe  Predicted Phishing")
print(f"Actual Safe:        {cm[0,0]}              {cm[0,1]}")
print(f"Actual Phishing:    {cm[1,0]}              {cm[1,1]}")

# ============================================
# 9. SAVE EVERYTHING
# ============================================
print("\n💾 9. Saving models...")
os.makedirs('models', exist_ok=True)
joblib.dump(tfidf, 'models/tfidf_vectorizer.pkl')
joblib.dump(scaler, 'models/combined_scaler.pkl')
joblib.dump(model, 'models/combined_model.pkl')
print("   ✅ tfidf_vectorizer.pkl saved")
print("   ✅ combined_scaler.pkl saved")
print("   ✅ combined_model.pkl saved")

# ============================================
# 10. QUICK API TEST
# ============================================
print("\n🚀 10. Testing API function...")

def predict_phishing(email_text):
    # Keyword features
    features = {
        'email_length': len(email_text),
        'word_count': len(email_text.split()),
        'sentence_count': email_text.count('. ') + email_text.count('! ') + email_text.count('? '),
        'urgent_word_count': sum(1 for w in ['urgent', 'immediately', 'suspended', 'verify', 'alert', 'warning'] if w in email_text.lower()),
        'money_word_count': sum(1 for w in ['money', 'win', 'prize', 'million', 'free', 'cash', 'reward'] if w in email_text.lower()),
        'product_word_count': sum(1 for w in ['cialis', 'viagra', 'weight', 'loss', 'pharmacy'] if w in email_text.lower()),
        'has_link': 1 if 'http' in email_text.lower() or 'www.' in email_text.lower() else 0,
        'has_attachment': 0,  # Can't detect from text alone
        'urgency_flag': 1 if 'urgent' in email_text.lower() or 'immediately' in email_text.lower() else 0,
    }
    
    # Create feature array
    keyword_array = np.array([[
        features['email_length'],
        features['word_count'],
        features['sentence_count'],
        features['urgent_word_count'],
        features['money_word_count'],
        features['product_word_count'],
        features['has_link'],
        features['has_attachment'],
        features['urgency_flag']
    ]])
    
    # TF-IDF
    tfidf_features = tfidf.transform([email_text]).toarray()
    
    # Combine and scale
    combined = np.hstack([keyword_array, tfidf_features])
    combined_scaled = scaler.transform(combined)
    
    # Predict
    risk_score = model.predict_proba(combined_scaled)[0][1]
    is_phishing = risk_score > 0.5
    
    return {
        'risk_score': round(risk_score, 3),
        'is_phishing': bool(is_phishing),
        'confidence': round(risk_score if is_phishing else 1 - risk_score, 3)
    }

# Test
test_emails = [
    "URGENT: Your PayPal account has been suspended! Click here to verify.",
    "Hi team, please find attached the quarterly report.",
    "CONGRATULATIONS! You've won $1,000,000. Claim your prize now."
]

print("\n📧 API Test Results:")
for email in test_emails:
    result = predict_phishing(email)
    print(f"   Email: {email[:50]}...")
    print(f"   Risk: {result['risk_score']} | Phishing: {result['is_phishing']}")

print("\n" + "=" * 60)
print("✅ PIPELINE COMPLETE!")
print("=" * 60)