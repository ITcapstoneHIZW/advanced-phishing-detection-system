"""
Train and save TF-IDF vectorizer for semantic feature extraction.
"""

import pandas as pd
import joblib
import os
from sklearn.feature_extraction.text import TfidfVectorizer

print("=" * 60)
print("TRAINING TF-IDF VECTORIZER")
print("=" * 60)

# Use the absolute path relative to the script
script_dir = os.path.dirname(os.path.abspath(__file__))
processed_data_path = os.path.join(script_dir, 'data', 'processed', 'emails_with_features.csv')

print(f"\n📂 Looking for file at: {processed_data_path}")

if not os.path.exists(processed_data_path):
    print(f"❌ Error: Could not find {processed_data_path}")
    print("   Please run your notebook first to create this file.")
    exit(1)

# Load processed emails
print(f"\n📂 Loading processed emails...")
df = pd.read_csv(processed_data_path)
print(f"   Loaded {len(df)} emails")

# Get the email text column
text_col = 'text_combined'
if text_col not in df.columns:
    print(f"❌ Error: Column '{text_col}' not found in dataset")
    print(f"   Available columns: {df.columns.tolist()}")
    exit(1)

# Create and train TF-IDF vectorizer
print("\n🔧 Training TF-IDF vectorizer...")
print("   This captures word patterns and semantic meaning")

tfidf = TfidfVectorizer(
    max_features=500,
    stop_words='english',
    ngram_range=(1, 2),
    min_df=5,
    max_df=0.7
)

# Fit the vectorizer on all email text
texts = df[text_col].fillna('').values
tfidf.fit(texts)
print("   ✅ TF-IDF training complete!")

# Create models directory if it doesn't exist
models_dir = os.path.join(script_dir, 'models')
os.makedirs(models_dir, exist_ok=True)

# Save the vectorizer
save_path = os.path.join(models_dir, 'tfidf_vectorizer.pkl')
joblib.dump(tfidf, save_path)
print(f"\n💾 TF-IDF vectorizer saved to: {save_path}")
print(f"   File size: {os.path.getsize(save_path) / 1024 / 1024:.2f} MB")

# Show what the vectorizer learned
feature_names = tfidf.get_feature_names_out()
print(f"\n📊 Top 20 most important words/phrases learned:")
for i, name in enumerate(feature_names[:20]):
    print(f"   {i+1:2d}. {name}")

print("\n✅ Done! You can now use api_with_tfidf.py")