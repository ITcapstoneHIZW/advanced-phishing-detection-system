"""
Complete pipeline for the new pre-processed phishing dataset.
Uses pre-extracted features (no TF-IDF needed).
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

print("=" * 60)
print("PHISHING DETECTION PIPELINE (Pre-processed Dataset)")
print("=" * 60)

# ============================================
# 1. LOAD DATA
# ============================================
print("\n📂 1. Loading data...")
df = pd.read_csv('data/raw/email_phishing_data.csv')
print(f"   Loaded {len(df):,} emails")

# Feature columns (all except 'label')
feature_cols = ['num_words', 'num_unique_words', 'num_stopwords', 'num_links', 
                'num_unique_domains', 'num_email_addresses', 'num_spelling_errors', 
                'num_urgent_keywords']

X = df[feature_cols].values
y = df['label'].values

print(f"   Features: {len(feature_cols)}")
print(f"   Class distribution:")
print(f"   Safe (0): {(y == 0).sum():,}")
print(f"   Phishing (1): {(y == 1).sum():,}")

# ============================================
# 2. TRAIN/TEST SPLIT
# ============================================
print("\n📊 2. Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"   Training: {len(X_train):,} emails")
print(f"   Test: {len(X_test):,} emails")

# ============================================
# 3. SCALING
# ============================================
print("\n📏 3. Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ============================================
# 4. TRAIN MODEL
# ============================================
print("\n🤖 4. Training Random Forest...")
model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X_train_scaled, y_train)

# ============================================
# 5. EVALUATE
# ============================================
print("\n📊 5. Evaluating model...")
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"\n   ✅ Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

print(f"\n📋 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Safe (0)', 'Phishing (1)']))

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
print(f"\n📊 Confusion Matrix:")
print(f"               Predicted Safe  Predicted Phishing")
print(f"Actual Safe:        {cm[0,0]:,}              {cm[0,1]:,}")
print(f"Actual Phishing:    {cm[1,0]:,}              {cm[1,1]:,}")

# ============================================
# 6. FEATURE IMPORTANCE
# ============================================
print("\n📊 6. Feature Importance:")
importance = model.feature_importances_
for col, imp in sorted(zip(feature_cols, importance), key=lambda x: x[1], reverse=True):
    print(f"   {col}: {imp:.4f}")

# ============================================
# 7. SAVE MODEL
# ============================================
print("\n💾 7. Saving model...")
os.makedirs('models', exist_ok=True)
joblib.dump(model, 'models/phishing_model_new.pkl')
joblib.dump(scaler, 'models/scaler_new.pkl')
joblib.dump(feature_cols, 'models/feature_cols_new.pkl')
print("   ✅ Saved to models/phishing_model_new.pkl")
print("   ✅ Saved to models/scaler_new.pkl")
print("   ✅ Saved to models/feature_cols_new.pkl")

# ============================================
# 8. API FUNCTION
# ============================================
print("\n🚀 8. Testing API function...")

def predict_phishing(features_dict):
    """
    Predict phishing from feature dictionary.
    
    Expected features:
    {
        'num_words': int,
        'num_unique_words': int,
        'num_stopwords': int,
        'num_links': int,
        'num_unique_domains': int,
        'num_email_addresses': int,
        'num_spelling_errors': int,
        'num_urgent_keywords': int
    }
    """
    feature_list = [[
        features_dict['num_words'],
        features_dict['num_unique_words'],
        features_dict['num_stopwords'],
        features_dict['num_links'],
        features_dict['num_unique_domains'],
        features_dict['num_email_addresses'],
        features_dict['num_spelling_errors'],
        features_dict['num_urgent_keywords']
    ]]
    scaled = scaler.transform(feature_list)
    risk_score = model.predict_proba(scaled)[0][1]
    is_phishing = risk_score > 0.5
    return {
        'risk_score': round(risk_score, 3),
        'is_phishing': bool(is_phishing),
        'confidence': round(risk_score if is_phishing else 1 - risk_score, 3)
    }

# Test with a sample
sample = {'num_words': 140, 'num_unique_words': 94, 'num_stopwords': 52, 
          'num_links': 0, 'num_unique_domains': 0, 'num_email_addresses': 0, 
          'num_spelling_errors': 0, 'num_urgent_keywords': 0}
result = predict_phishing(sample)
print(f"\n📧 Sample prediction: {result}")

print("\n" + "=" * 60)
print("✅ PIPELINE COMPLETE!")
print("=" * 60)