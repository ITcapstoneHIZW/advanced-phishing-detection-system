"""
ML predictor for phishing detection (combined model with TF-IDF).

Loads Henry's combined Random Forest model + StandardScaler + TF-IDF vectorizer
from GitHub Releases. The combined model was trained on 506 features:
- 6 keyword features (email_length, word_count, sentence_count,
  urgent_word_count, money_word_count, product_word_count)
- 500 TF-IDF features (max_features=500, ngram_range=(1,2), stop_words=english)

The feature combination order matches train_combined_model.py exactly:
    X = np.hstack([keyword_features, tfidf_features])

Designed to fail gracefully — if anything goes wrong loading the model,
predictions return None and the caller falls back to rule-based scoring.
"""

import os
import re
import logging
import joblib
import numpy as np
import urllib.request
from pathlib import Path

logger = logging.getLogger(__name__)

# Where model files live on disk. Created on first download.
MODELS_DIR = Path(__file__).parent.parent / "models"
MODEL_PATH = MODELS_DIR / "combined_model.pkl"
SCALER_PATH = MODELS_DIR / "combined_scaler.pkl"
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.pkl"

# Default download URLs (GitHub Releases — public, no auth needed).
# These can be overridden by env vars if Henry moves the files.
_DEFAULT_RELEASE_BASE = (
    "https://github.com/ITcapstoneHIZW/advanced-phishing-detection-system/"
    "releases/download/ML/"
)
MODEL_URL = os.environ.get("ML_MODEL_URL") or _DEFAULT_RELEASE_BASE + "combined_model.pkl"
SCALER_URL = os.environ.get("ML_SCALER_URL") or _DEFAULT_RELEASE_BASE + "combined_scaler.pkl"
VECTORIZER_URL = os.environ.get("ML_VECTORIZER_URL") or _DEFAULT_RELEASE_BASE + "tfidf_vectorizer.pkl"

# Module state — loaded lazily on first prediction.
_model = None
_scaler = None
_vectorizer = None
_initialized = False
_load_failed = False


def _is_google_drive_url(url: str) -> bool:
    """Detect Google Drive URLs (kept for backup / future flexibility)."""
    return "drive.google.com" in url


def _extract_drive_file_id(url: str) -> str:
    """Extract the file ID from a Google Drive share URL."""
    match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
    if match:
        return match.group(1)
    match = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", url)
    if match:
        return match.group(1)
    raise ValueError(f"Could not extract Google Drive file ID from URL: {url}")


def _download_file(url: str, dest: Path) -> None:
    """Download a file from a URL to a local path.

    Plain urllib works for GitHub Releases (public direct downloads).
    Google Drive needs gdown to handle the virus-scan warning for large files.
    """
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
    size_mb = dest.stat().st_size / 1_000_000
    logger.info(f"Download complete: {dest} ({size_mb:.1f} MB)")


def _ensure_files() -> None:
    """Make sure all three model files exist on disk, downloading if needed."""
    if not MODEL_PATH.exists():
        _download_file(MODEL_URL, MODEL_PATH)
    if not SCALER_PATH.exists():
        _download_file(SCALER_URL, SCALER_PATH)
    if not VECTORIZER_PATH.exists():
        _download_file(VECTORIZER_URL, VECTORIZER_PATH)


def _initialize() -> None:
    """Load model, scaler, and TF-IDF vectorizer into memory. Called once, lazily."""
    global _model, _scaler, _vectorizer, _initialized, _load_failed

    if _initialized or _load_failed:
        return

    try:
        _ensure_files()
        _model = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        _vectorizer = joblib.load(VECTORIZER_PATH)
        _initialized = True
        n_tfidf = len(_vectorizer.get_feature_names_out())
        logger.info(
            f"ML model and scaler loaded successfully "
            f"(TF-IDF features: {n_tfidf})"
        )
    except Exception as e:
        logger.error(
            f"Failed to load ML model — falling back to rule-based scoring: {e}"
        )
        _load_failed = True


def is_available() -> bool:
    """Return True if the ML model is loaded and ready to make predictions."""
    if not _initialized and not _load_failed:
        _initialize()
    return _initialized and not _load_failed


def predict_phishing_ml(email_text: str):
    """
    Run the combined ML model on a piece of email text.

    The expected input is the combined "subject + body" text — this matches
    what TF-IDF was trained on (text_combined column from the training CSV).
    If only the body is passed, predictions will still work but accuracy may
    drop because TF-IDF features won't pick up subject keywords.

    Args:
        email_text: subject + body of the email, concatenated.

    Returns:
        A dict with risk_score (0-1), is_phishing (bool), confidence (0-1),
        or None if the model isn't available (caller falls back to rules).
    """
    if not is_available():
        return None

    try:
        # 1. Extract the 6 keyword features.
        # MUST match train_combined_model.py's feature names and order exactly.
        text_lower = email_text.lower()
        keyword_features = np.array([[
            len(email_text),
            len(email_text.split()),
            email_text.count('. ') + email_text.count('! ') + email_text.count('? '),
            sum(1 for word in ['urgent', 'immediately', 'suspended', 'verify']
                if word in text_lower),
            sum(1 for word in ['money', 'win', 'prize', 'million', 'free']
                if word in text_lower),
            sum(1 for word in ['cialis', 'viagra', 'weight', 'loss']
                if word in text_lower),
        ]])

        # 2. Extract TF-IDF features (500 of them). The vectorizer was trained
        # with stop_words='english' + lowercase=True + ngram_range=(1,2), so
        # passing the raw text is correct — it preprocesses internally.
        tfidf_features = _vectorizer.transform([email_text]).toarray()

        # 3. Combine in the SAME order as training: keyword first, then TF-IDF.
        # Expected total: 6 + 500 = 506 features.
        combined = np.hstack([keyword_features, tfidf_features])

        # 4. Scale with the combined scaler (it expects all 506 features at once).
        scaled = _scaler.transform(combined)

        # 5. Predict.
        risk_score = float(_model.predict_proba(scaled)[0][1])
        is_phishing = risk_score > 0.5

        return {
            "risk_score": round(risk_score, 3),
            "is_phishing": is_phishing,
            "confidence": round(risk_score if is_phishing else 1 - risk_score, 3),
        }
    except Exception as e:
        logger.error(f"ML prediction failed for an email: {e}")
        return None
