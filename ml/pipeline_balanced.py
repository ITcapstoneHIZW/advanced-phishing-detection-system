"""
Balanced pipeline with SMOTE for class imbalance.
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from imblearn.over_sampling import SMOTE

print("=" * 60)
print("PHISHING DETECTION PIPELINE (BALANCED with SMOTE)")
print("=" * 60)

# Load data
print("\n📂 1. Loading data...")
df = pd.read_csv('data/raw/email_phishing_data.csv')
print(f"   Loaded {len(df):,} emails")

feature_cols = ['num_words', 'num_unique_words', 'num_stopwords', 'num_links', 
                'num_unique_domains', 'num_email_addresses', 'num_spelling_errors', 
                'num_urgent_keywords']

X = df[feature_cols].values
y = df['label'].values

print(f"   Original - Safe: {(y == 0).sum():,}, Phishing: {(y == 1).sum():,}")

# Apply SMOTE to balance classes
print("\n⚖️  2. Applying SMOTE...")
smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X, y)
print(f"   After SMOTE - Safe: {(y_resampled == 0).sum():,}, Phishing: {(y_resampled == 1).sum():,}")

# Split
print("\n📊 3. Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(
    X_resampled, y_resampled, test_size=0.2, random_state=42, stratify=y_resampled
)
print(f"   Training: {len(X_train):,} emails")
print(f"   Test: {len(X_test):,} emails")

# Scale
print("\n📏 4. Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train
print("\n🤖 5. Training Random Forest...")
model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X_train_scaled, y_train)

# Evaluate
print("\n📊 6. Evaluating model...")
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
print(f"\n   ✅ Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

print(f"\n📋 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Safe (0)', 'Phishing (1)']))

cm = confusion_matrix(y_test, y_pred)
print(f"\n📊 Confusion Matrix:")
print(f"               Predicted Safe  Predicted Phishing")
print(f"Actual Safe:        {cm[0,0]:,}              {cm[0,1]:,}")
print(f"Actual Phishing:    {cm[1,0]:,}              {cm[1,1]:,}")

# Feature importance
print("\n📊 7. Feature Importance:")
importance = model.feature_importances_
for col, imp in sorted(zip(feature_cols, importance), key=lambda x: x[1], reverse=True):
    print(f"   {col}: {imp:.4f}")

# Save
print("\n💾 8. Saving model...")
os.makedirs('models', exist_ok=True)
joblib.dump(model, 'models/phishing_model_balanced.pkl')
joblib.dump(scaler, 'models/scaler_balanced.pkl')
joblib.dump(feature_cols, 'models/feature_cols_balanced.pkl')
print("   ✅ Saved to models/phishing_model_balanced.pkl")

print("\n✅ PIPELINE COMPLETE!")