"""
ML predictor for phishing detection (COMBINED model: 9 keyword + TF-IDF semantics).

Loads Henry's combined Random Forest model + StandardScaler + TF-IDF vectorizer.
The CURRENT model expects 102 features:
- 9 keyword features (email_length, word_count, sentence_count,
  urgent_word_count, money_word_count, product_word_count,
  has_link, has_attachment, urgency_flag)
- 93 TF-IDF features

Feature order matches Henry's full_pipeline.py exactly:
    X = np.hstack([keyword_features (9), tfidf_features (93)])  -> 102

Fails gracefully — if anything can't load, predictions return None and the
caller falls back to rule-based scoring.

IMPORTANT: pass subject + " " + body (the text_combined format TF-IDF was
trained on) so the semantic features match training.
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

# Default download URLs (GitHub Releases — public, no auth needed), overridable
# by env vars. The large model is downloaded; the small scaler + vectorizer are
# committed in backend/models/, so their downloads are only a fallback.
_DEFAULT_RELEASE_BASE = (
    "https://github.com/ITcapstoneHIZW/advanced-phishing-detection-system/"
    "releases/download/ML5/"
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
    size_mb = dest.stat().st_size / 1_000_000
    logger.info(f"Download complete: {dest} ({size_mb:.1f} MB)")


def _ensure_files() -> None:
    if not MODEL_PATH.exists():
        _download_file(MODEL_URL, MODEL_PATH)
    if not SCALER_PATH.exists():
        _download_file(SCALER_URL, SCALER_PATH)
    if not VECTORIZER_PATH.exists():
        _download_file(VECTORIZER_URL, VECTORIZER_PATH)


def _initialize() -> None:
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
        n_expected = getattr(_scaler, "n_features_in_", "?")
        logger.info(
            f"ML combined model, scaler, and TF-IDF vectorizer loaded successfully "
            f"(TF-IDF features: {n_tfidf}, total expected: {n_expected})"
        )
    except Exception as e:
        logger.error(f"Failed to load ML model — falling back to rule-based scoring: {e}")
        _load_failed = True


def is_available() -> bool:
    if not _initialized and not _load_failed:
        _initialize()
    return _initialized and not _load_failed


# --- 9 keyword features: MUST match Henry's full_pipeline.py exactly, in order ---
_URGENT_WORDS = ['urgent', 'immediately', 'suspended', 'verify', 'alert', 'warning']
_MONEY_WORDS = ['money', 'win', 'prize', 'million', 'free', 'cash', 'reward']
_PRODUCT_WORDS = ['cialis', 'viagra', 'weight', 'loss', 'pharmacy']


def _keyword_features(email_text: str):
    lower = email_text.lower()
    return [
        len(email_text),                                                          # email_length
        len(email_text.split()),                                                  # word_count
        email_text.count('. ') + email_text.count('! ') + email_text.count('? '), # sentence_count
        sum(1 for w in _URGENT_WORDS if w in lower),                              # urgent_word_count
        sum(1 for w in _MONEY_WORDS if w in lower),                               # money_word_count
        sum(1 for w in _PRODUCT_WORDS if w in lower),                             # product_word_count
        1 if ('http' in lower or 'www.' in lower) else 0,                         # has_link
        0,                                                                        # has_attachment
        1 if ('urgent' in lower or 'immediately' in lower) else 0,                # urgency_flag
    ]


def get_model_info() -> dict:
    """
    Report what is ACTUALLY loaded, so the UI reflects the real model rather
    than a hardcoded label. Auto-updates whenever the deployed model changes.
    """
    available = is_available()
    info = {
        "ml_active": available,
        "model_type": None,
        "total_features": None,
        "tfidf_features": None,
        "description": None,
    }
    if available:
        try:
            info["model_type"] = type(_model).__name__  # e.g. "RandomForestClassifier"
            info["total_features"] = int(getattr(_scaler, "n_features_in_", 0)) or None
            info["tfidf_features"] = len(_vectorizer.get_feature_names_out())
            kw = (info["total_features"] - info["tfidf_features"]) if info["total_features"] else None
            info["description"] = (
                f"Hybrid: {info['model_type']} "
                f"({kw} keyword + {info['tfidf_features']} TF-IDF features) with rule-based checks"
            )
        except Exception:
            pass
    else:
        info["description"] = "Rule-based scoring (ML model not loaded)"
    return info


def predict_phishing_ml(email_text: str):
    """
    Run the combined (9 keyword + 93 TF-IDF = 102) model on email text.
    Pass subject + " " + body to match the TF-IDF training format.
    Returns dict(risk_score, is_phishing, confidence, used_tfidf) or None.
    """
    if not is_available():
        return None
    try:
        if not email_text:
            return None
        keyword_array = np.array([_keyword_features(email_text)])      # (1, 9)
        tfidf_features = _vectorizer.transform([email_text]).toarray()  # (1, 93)
        combined = np.hstack([keyword_array, tfidf_features])           # (1, 102)
        scaled = _scaler.transform(combined)
        risk_score = float(_model.predict_proba(scaled)[0][1])
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
