"""
ML predictor for phishing detection (COMBINED model: keyword + TF-IDF semantics).

Loads Henry's trained combined model, scaler, and TF-IDF vectorizer from local
files, downloading the large model from a URL (env var) if it's not present.
Exposes `predict_phishing_ml(email_text)` for the rest of the backend.

The combined model expects a 506-feature vector:
  6 keyword features  +  500 TF-IDF features  (in that order).
The keyword feature definitions MUST match Henry's training code exactly
(train_combined_model.py / api_with_tfidf.py) — same word lists, same order.

Designed to fail gracefully — if anything can't be loaded, predictions return
None and the caller falls back to rule-based scoring.
"""

import os
import re
import logging
import joblib
import urllib.request
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# Where the model files live on disk.
MODELS_DIR = Path(__file__).parent.parent / "models"
MODEL_PATH = MODELS_DIR / "combined_model.pkl"
SCALER_PATH = MODELS_DIR / "combined_scaler.pkl"
TFIDF_PATH = MODELS_DIR / "tfidf_vectorizer.pkl"

# Public download URLs (Railway env vars). The combined model is large, so it is
# downloaded at runtime. The scaler and TF-IDF vectorizer are small (~KB) and are
# committed to the repo in backend/models/, so their URLs are optional.
MODEL_URL = os.environ.get("ML_MODEL_URL")
SCALER_URL = os.environ.get("ML_SCALER_URL")
TFIDF_URL = os.environ.get("ML_TFIDF_URL")

# Module state — loaded once on first prediction request.
_model = None
_scaler = None
_tfidf = None
_initialized = False
_load_failed = False


def _is_google_drive_url(url: str) -> bool:
    return "drive.google.com" in url


def _extract_drive_file_id(url: str) -> str:
    match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
    if match:
        return match.group(1)
    match = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", url)
    if match:
        return match.group(1)
    raise ValueError(f"Could not extract Google Drive file ID from URL: {url}")


def _download_file(url: str, dest: Path) -> None:
    logger.info(f"Downloading {url} to {dest}")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    if _is_google_drive_url(url):
        import gdown
        file_id = _extract_drive_file_id(url)
        gdown.download(f"https://drive.google.com/uc?id={file_id}", str(dest), quiet=False)
    else:
        urllib.request.urlretrieve(url, dest)
    if not dest.exists():
        raise RuntimeError(f"Download appeared to succeed but file not found at {dest}")
    logger.info(f"Download complete: {dest} ({dest.stat().st_size / 1_000_000:.1f} MB)")


def _ensure_files() -> None:
    """Make sure model, scaler, and TF-IDF vectorizer all exist on disk."""
    if not MODEL_PATH.exists():
        if not MODEL_URL:
            raise FileNotFoundError(f"Model not found at {MODEL_PATH} and ML_MODEL_URL is not set")
        _download_file(MODEL_URL, MODEL_PATH)

    if not SCALER_PATH.exists():
        if not SCALER_URL:
            raise FileNotFoundError(f"Scaler not found at {SCALER_PATH} and ML_SCALER_URL is not set")
        _download_file(SCALER_URL, SCALER_PATH)

    if not TFIDF_PATH.exists():
        if not TFIDF_URL:
            raise FileNotFoundError(f"TF-IDF vectorizer not found at {TFIDF_PATH} and ML_TFIDF_URL is not set")
        _download_file(TFIDF_URL, TFIDF_PATH)


def _initialize() -> None:
    global _model, _scaler, _tfidf, _initialized, _load_failed
    if _initialized or _load_failed:
        return
    try:
        _ensure_files()
        _model = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        _tfidf = joblib.load(TFIDF_PATH)
        _initialized = True
        logger.info("ML combined model, scaler, and TF-IDF vectorizer loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load ML model — falling back to rule-based scoring: {e}")
        _load_failed = True


def is_available() -> bool:
    if not _initialized and not _load_failed:
        _initialize()
    return _initialized and not _load_failed


# --- Keyword features: MUST match Henry's training code exactly ---
# (full_pipeline.py uses these 9 columns, in this order. Keep identical or the
#  model receives wrong inputs. Total model input = 9 keyword + 93 TF-IDF = 102.)
_URGENT_WORDS = ['urgent', 'immediately', 'suspended', 'verify', 'alert', 'warning']
_MONEY_WORDS = ['money', 'win', 'prize', 'million', 'free', 'cash', 'reward']
_PRODUCT_WORDS = ['cialis', 'viagra', 'weight', 'loss', 'pharmacy']


def _keyword_features(email_text: str):
    lower = email_text.lower()
    return [
        len(email_text),                                                   # email_length
        len(email_text.split()),                                           # word_count
        email_text.count('. ') + email_text.count('! ') + email_text.count('? '),  # sentence_count
        sum(1 for w in _URGENT_WORDS if w in lower),                       # urgent_word_count
        sum(1 for w in _MONEY_WORDS if w in lower),                        # money_word_count
        sum(1 for w in _PRODUCT_WORDS if w in lower),                      # product_word_count
        1 if ('http' in lower or 'www.' in lower) else 0,                  # has_link
        0,                                                                 # has_attachment (can't detect from text)
        1 if ('urgent' in lower or 'immediately' in lower) else 0,         # urgency_flag
    ]


def predict_phishing_ml(email_text: str):
    """
    Run the combined (keyword + TF-IDF) model on an email body.

    Returns a dict with risk_score (0-1), is_phishing (bool), confidence (0-1),
    and used_tfidf (True, to indicate the semantic model ran), or None if the
    model isn't available (caller falls back to rules).
    """
    if not is_available():
        return None

    try:
        if not email_text:
            return None

        # 1. Keyword features (6)
        numeric_array = np.array([_keyword_features(email_text)])

        # 2. TF-IDF semantic features (500)
        tfidf_features = _tfidf.transform([email_text]).toarray()

        # 3. Combine -> 506 features, same order as training (keyword first)
        combined = np.hstack([numeric_array, tfidf_features])

        # 4. Scale
        combined_scaled = _scaler.transform(combined)

        # 5. Predict
        risk_score = float(_model.predict_proba(combined_scaled)[0][1])
        is_phishing = risk_score > 0.5

        return {
            "risk_score": round(risk_score, 3),
            "is_phishing": is_phishing,
            "confidence": round(risk_score if is_phishing else 1 - risk_score, 3),
            "used_tfidf": True,
        }
    except Exception as e:
        logger.error(f"ML prediction failed for an email: {e}")
        return None
