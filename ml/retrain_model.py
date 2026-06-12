"""
Retrain the phishing detection model using user feedback.
Run this script periodically (e.g., weekly or after collecting feedback).
"""

import pandas as pd
import joblib
import numpy as np
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split

print("=" * 60)
print("RETRAINING MODEL FROM USER FEEDBACK")
print("=" * 60)

script_dir = os.path.dirname(os.path.abspath(__file__))

# 1. Load original training data
print("\n📂 Loading original training data...")
original_path = os.path.join(script_dir, 'data', 'processed', 'emails_with_features.csv')
original_df = pd.read_csv(original_path)
print(f"   Original data: {len(original_df)} emails")

# 2. Load user feedback (if any)
feedback_path = os.path.join(script_dir, 'data', 'feedback', 'feedback_data.csv')
feedback_exists = os.path.exists(feedback_path)

if feedback_exists:
    feedback_df = pd.read_csv(feedback_path)
    print(f"   Feedback data: {len(feedback_df)} corrections")
    
    # Combine original + feedback
    combined_df = pd.concat([original_df, feedback_df], ignore_index=True)
    print(f"   Combined data: {len(combined_df)} emails")
else:
    print("   No feedback data found. Using original data only.")
    combined_df = original_df

# 3. Load TF-IDF vectorizer (already trained)
print("\n📂 Loading TF-IDF vectorizer...")
tfidf_path = os.path.join(script_dir, 'models', 'tfidf_vectorizer.pkl')
tfidf = joblib.load(tfidf_path)

# 4. Extract features
print("\n🔧 Extracting features...")

# Keyword features
keyword_features = combined_df[['email_length', 'word_count', 'sentence_count',
                                  'urgent_word_count', 'money_word_count', 'product_word_count']].values

# TF-IDF features
texts = combined_df['text_combined'].fillna('').values
tfidf_features = tfidf.transform(texts).toarray()

# Combine
X = np.hstack([keyword_features, tfidf_features])
y = combined_df['label'].values

print(f"   Feature shape: {X.shape}")

# 5. Split and scale
print("\n📊 Preparing data...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 6. Train new model
print("\n🤖 Training new model...")
model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X_train_scaled, y_train)

# 7. Evaluate
y_pred = model.predict(X_test_scaled)
accuracy = (y_pred == y_test).sum() / len(y_test)
print(f"   New model accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

# 8. Save new model and scaler
print("\n💾 Saving updated model...")
joblib.dump(model, os.path.join(script_dir, 'models', 'combined_model_updated.pkl'))
joblib.dump(scaler, os.path.join(script_dir, 'models', 'combined_scaler_updated.pkl'))
print("   ✅ Saved to models/combined_model_updated.pkl")
print("   ✅ Saved to models/combined_scaler_updated.pkl")

print("\n✅ Retraining complete!")