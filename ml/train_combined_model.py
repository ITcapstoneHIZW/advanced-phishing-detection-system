"""
Train a NEW model that uses BOTH keyword features AND TF-IDF features.
Run this after train_tfidf.py has created the vectorizer.
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.feature_extraction.text import TfidfVectorizer

print("=" * 60)
print("TRAINING COMBINED MODEL (Keyword + TF-IDF)")
print("=" * 60)

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(script_dir, 'data', 'processed', 'emails_with_features.csv')
tfidf_path = os.path.join(script_dir, 'models', 'tfidf_vectorizer.pkl')

# Load data
print("\n📂 Loading processed emails...")
df = pd.read_csv(data_path)
print(f"   Loaded {len(df)} emails")

# Load TF-IDF vectorizer
print("\n📂 Loading TF-IDF vectorizer...")
tfidf = joblib.load(tfidf_path)
print(f"   TF-IDF has {tfidf.get_feature_names_out().shape[0]} features")

# Get labels
label_col = 'label'
y = df[label_col].values

# Get email texts for TF-IDF
text_col = 'text_combined'
texts = df[text_col].fillna('').values

# Extract keyword features (the 6 original ones)
print("\n🔧 Extracting keyword features...")
keyword_features = df[['email_length', 'word_count', 'sentence_count', 
                       'urgent_word_count', 'money_word_count', 'product_word_count']].values

# Extract TF-IDF features
print("🔧 Extracting TF-IDF features...")
tfidf_features = tfidf.transform(texts).toarray()

# Combine features
print("🔧 Combining features...")
X = np.hstack([keyword_features, tfidf_features])
print(f"   Combined feature shape: {X.shape}")

# Split data
print("\n📊 Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print(f"   Training: {X_train.shape[0]} emails")
print(f"   Test: {X_test.shape[0]} emails")

# Scale features
print("\n📏 Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train new model
print("\n🤖 Training Random Forest with combined features...")
model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X_train_scaled, y_train)
print("   ✅ Training complete!")

# Evaluate
print("\n📊 Evaluating model...")
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"   Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

print("\n📋 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Safe (0)', 'Phishing (1)']))

# Save the new model and scaler
print("\n💾 Saving new model and scaler...")
joblib.dump(model, os.path.join(script_dir, 'models', 'combined_model.pkl'))
joblib.dump(scaler, os.path.join(script_dir, 'models', 'combined_scaler.pkl'))
print("   ✅ Saved to models/combined_model.pkl")
print("   ✅ Saved to models/combined_scaler.pkl")

print("\n✅ Done! Now update api_with_tfidf.py to use the new model.")