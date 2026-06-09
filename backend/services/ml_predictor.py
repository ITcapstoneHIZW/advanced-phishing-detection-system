"""
ML predictor for phishing detection.

Loads Henry's trained model + scaler from local files, downloading them from
URLs (specified in env vars) if they're not present. Exposes a single function
`predict_phishing_ml(email_text)` that the rest of the backend can call.

Supports downloading from Google Drive, Hugging Face, GitHub Releases, or any
direct-download URL. Google Drive needs special handling for large files
(>100 MB) due to the virus scan warning page — `gdown` takes care of that.

Designed to fail gracefully — if the model can't be loaded for any reason,
predictions return None and the caller can fall back to rule-based scoring.
"""

import os
import logging
import joblib
import urllib.request
from pathlib import Path

logger = logging.getLogger(__name__)

# Where the model files live on disk. Created on first download.
MODELS_DIR = Path(__file__).parent.parent / "models"
MODEL_PATH = MODELS_DIR / "final_model_part1.pkl"
SCALER_PATH = MODELS_DIR / "scaler.pkl"

# Public download URLs for the model files. Set these as Railway env vars.
# Supports Google Drive view URLs, file IDs, direct-download URLs, etc.
MODEL_URL = os.environ.get("ML_MODEL_URL")
SCALER_URL = os.environ.get("ML_SCALER_URL")

# Module state — loaded once on first prediction request.
_model = None
_scaler = None
_initialized = False
_load_failed = False


def _is_google_drive_url(url: str) -> bool:
    """Detect Google Drive URLs so we know to use gdown instead of urllib."""
    return "drive.google.com" in url


def _download_file(url: str, dest: Path) -> None:
    """Download a file from a URL to a local path.

    Google Drive URLs are handled via `gdown` because Drive serves a virus-scan
    warning page for files over 100 MB. Other URLs use plain urllib.
    """
    logger.info(f"Downloading {url} to {dest}")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if _is_google_drive_url(url):
        # gdown handles the virus scan warning, confirmation tokens, etc.
        import gdown
        gdown.download(url, str(dest), quiet=False, fuzzy=True)
    else:
        urllib.request.urlretrieve(url, dest)

    if not dest.exists():
        raise RuntimeError(f"Download appeared to succeed but file not found at {dest}")
    logger.info(f"Download complete: {dest} ({dest.stat().st_size / 1_000_000:.1f} MB)")


def _ensure_files() -> None:
    """Make sure both model files exist on disk, downloading if needed."""
    if not MODEL_PATH.exists():
        if not MODEL_URL:
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH} and ML_MODEL_URL is not set"
            )
        _download_file(MODEL_URL, MODEL_PATH)

    if not SCALER_PATH.exists():
        if not SCALER_URL:
            raise FileNotFoundError(
                f"Scaler not found at {SCALER_PATH} and ML_SCALER_URL is not set"
            )
        _download_file(SCALER_URL, SCALER_PATH)


def _initialize() -> None:
    """Load the model and scaler into memory. Called once, lazily."""
    global _model, _scaler, _initialized, _load_failed

    if _initialized or _load_failed:
        return

    try:
        _ensure_files()
        _model = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        _initialized = True
        logger.info("ML model and scaler loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load ML model — falling back to rule-based scoring: {e}")
        _load_failed = True


def is_available() -> bool:
    """Return True if the ML model is loaded and ready to make predictions."""
    if not _initialized and not _load_failed:
        _initialize()
    return _initialized and not _load_failed


def predict_phishing_ml(email_text: str):
    """
    Run the ML model on an email body.

    Args:
        email_text: the raw email body to score.

    Returns:
        A dict with risk_score (0-1), is_phishing (bool), and confidence (0-1),
        or None if the model isn't available (caller should fall back to rules).
    """
    if not is_available():
        return None

    try:
        # Extract the 6 features the model was trained on.
        # IMPORTANT: this matches Henry's training code exactly — same word lists,
        # same calculations, same order. Don't change without retraining the model.
        text_lower = email_text.lower()
        features = [[
            len(email_text),
            len(email_text.split()),
            email_text.count('. ') + email_text.count('! ') + email_text.count('? '),
            sum(1 for word in ['urgent', 'immediately', 'suspended', 'verify']
                if word in text_lower),
            sum(1 for word in ['money', 'win', 'prize', 'million', 'free']
                if word in text_lower),
            sum(1 for word in ['cialis', 'viagra', 'weight', 'loss']
                if word in text_lower),
        ]]

        scaled = _scaler.transform(features)
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
