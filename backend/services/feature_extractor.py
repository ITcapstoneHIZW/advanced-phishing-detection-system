import re
from textblob import TextBlob
from langdetect import detect, LangDetectException

# ========== TRUSTED DOMAINS ==========
# These domains bypass rule-based scoring entirely
TRUSTED_DOMAINS = [
    # News & Media
    'nytimes.com', 'e.newyorktimes.com', 'e.nytimes.com',
    'washingtonpost.com', 'theguardian.com', 'editorial.theguardian.com',
    'bbc.com', 'bbc.co.uk', 'cnn.com', 'reuters.com', 'bloomberg.com',
    
    # Newsletter platforms
    'substack.com', 'medium.com', 'beehiiv.com', 'convertkit.com',
    
    # Tech & Social (legitimate services, not free email providers)
    'github.com', 'stackoverflow.com', 'reddit.com', 'linkedin.com',
    'spotify.com', 'netflix.com', 'amazon.com', 'paypal.com',
    
    # Google SERVICES (not gmail user accounts)
    'google.com', 'accounts.google.com',
    
    # Microsoft SERVICES (not outlook/hotmail user accounts)
    'microsoft.com', 'accountprotection.microsoft.com',
    
    # Other legitimate services
    'apple.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'whatsapp.com', 'telegram.org', 'slack.com', 'zoom.us', 'dropbox.com',
    'airbnb.com', 'uber.com', 'doordash.com'
]

# ========== URGENT WORDS (Cleaned) ==========
URGENT_WORDS = [
    "urgent", "immediately", "act now", "verify your account",
    "suspended", "unusual activity", "click here", "limited time",
    "expires soon", "action required", "your account has been",
    "unauthorized", "suspicious", "compromised", "locked",
    "validate", "confirm your", "update your",
    "tight spot", "need help", "send money", "borrow"
]


def extract_features(email_data):
    features = {}
    
    body = email_data.get("body", "")
    subject = email_data.get("subject", "")
    sender = email_data.get("sender", "")
    combined_text = subject + " " + body
 
    # --- Sender Analysis (do this FIRST so we know if trusted) ---
    sender_domain_match = re.findall(r'@([a-zA-Z0-9.-]+)', sender)
    features["sender_domain"] = sender_domain_match[0] if sender_domain_match else "unknown"
    features["is_free_email"] = any(
        domain in features["sender_domain"] 
        for domain in ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
    )
    
    # ========== CHECK IF SENDER IS TRUSTED (CRITICAL) ==========
    features["is_trusted_sender"] = features["sender_domain"].lower() in TRUSTED_DOMAINS
    # ===========================================================
 
    # Check for domain spoofing (e.g. paypaI.com instead of paypal.com)
    spoofed_brands = ["paypal", "microsoft", "google", "apple", "amazon", "netflix", "bank", "venmo", "cashapp", "zelle"]
    features["has_spoofed_domain"] = any(
        brand in features["sender_domain"].lower() for brand in spoofed_brands
    ) and not any(
        features["sender_domain"].lower().endswith(f"{brand}.com") for brand in spoofed_brands
    )
 
    # --- URL Analysis (with trusted sender bypass) ---
    urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', body)
    features["url_count"] = len(urls)
    
    # Only check suspicious URLs if sender is NOT trusted
    if not features.get("is_trusted_sender", False):
        features["has_suspicious_url"] = any(
            word in url.lower() for url in urls 
            for word in ["login", "verify", "account", "secure", "update", "confirm", "reset", "password", "bank",
                         "paypal", "special", "offer", "money", "payment", "transfer", "funds", "pay", "checkout"]
        )
    else:
        features["has_suspicious_url"] = False  # Trusted domains don't get flagged for URLs
 
    # --- Urgent Language (using cleaned word list) ---
    features["has_urgent_language"] = any(
        word in combined_text.lower() for word in URGENT_WORDS
    )
    features["urgent_word_count"] = sum(
        1 for word in URGENT_WORDS if word in combined_text.lower()
    )
 
    # --- Subject Analysis ---
    features["subject_has_re_fwd"] = subject.lower().startswith(("re:", "fwd:"))
    features["subject_length"] = len(subject)
    features["subject_has_urgent"] = any(word in subject.lower() for word in URGENT_WORDS)
 
    # --- NLP Sentiment Analysis ---
    blob = TextBlob(combined_text)
    sentiment = blob.sentiment.polarity
    features["sentiment_score"] = round(sentiment, 3)
    # Phishing emails tend to have very negative or very manipulative tone
    features["is_negative_sentiment"] = sentiment < -0.1
 
    # --- Grammar Error Detection ---
    words = re.findall(r'\b[a-zA-Z]+\b', combined_text)
    total_words = len(words) if words else 1
    # Count words that are not recognised (rough grammar check)
    misspelled = [word for word in words if len(word) > 3 and word.lower() not in blob.words]
    features["grammar_error_ratio"] = round(len(misspelled) / total_words, 3)
    features["has_grammar_issues"] = features["grammar_error_ratio"] > 0.3
 
    # --- Language Detection ---
    try:
        language = detect(combined_text)
        features["detected_language"] = language
        features["is_non_english"] = language != "en"
    except LangDetectException:
        features["detected_language"] = "unknown"
        features["is_non_english"] = False
 
    # --- Body Analysis ---
    features["body_length"] = len(body)
    features["has_short_body"] = len(body) < 50
 
    return features
 
 
def calculate_phishing_score(features):
    """Rule-based phishing score (0-10). Falls back to 0/Safe for trusted domains."""
    
    # ========== TRUSTED DOMAINS OVERRIDE ==========
    sender_domain = features.get("sender_domain", "")
    if sender_domain and sender_domain.lower() in TRUSTED_DOMAINS:
        return {"score": 0, "verdict": "Safe"}
    # =============================================
    
    score = 0
 
    # URL signals
    if features["has_suspicious_url"]:
        score += 2.5
    if features["url_count"] > 3:
        score += 1.0
 
    # Urgent language signals
    if features["has_urgent_language"]:
        score += 1.5
    if features["urgent_word_count"] > 3:
        score += 1.0
 
    # Sender signals
    if features["has_spoofed_domain"]:
        score += 2.0
    if features["is_free_email"]:
        score += 0.5
 
    # NLP signals
    if features["is_negative_sentiment"]:
        score += 0.5
    if features["has_grammar_issues"]:
        score += 0.5
 
    # Subject signals
    if features["subject_has_urgent"]:
        score += 0.5
 
    # Language signals
    if features["is_non_english"]:
        score += 0.5
 
    # Cap at 10
    score = min(round(score, 1), 10)
 
    if score >= 7:
        verdict = "Phishing"
    elif score >= 4:
        verdict = "Suspicious"
    else:
        verdict = "Safe"
 
    return {"score": score, "verdict": verdict}
 
 
def calculate_combined_score(features, email_text=None, sender_domain=None):
    """
    Hybrid scorer: ML model is PRIMARY, rule-based scoring is SECONDARY.
    Trusted domains have a lower threshold for being marked Safe.
    """
    
    domain = sender_domain or features.get("sender_domain", "")
    is_trusted = domain and domain.lower() in TRUSTED_DOMAINS
    
    # ========== RULE SCORE (for explanation only) ==========
    rule_result = calculate_phishing_score(features)
    rule_score = rule_result["score"]
    rule_verdict = rule_result["verdict"]
    # =======================================================
 
    # ========== ML SCORE (PRIMARY) ==========
    ml_score_scaled = None
    ml_used = False
    
    if email_text:
        if isinstance(email_text, str) and email_text and email_text != '...':
            try:
                from services.ml_predictor import predict_phishing_ml
                ml_result = predict_phishing_ml(email_text)
                if ml_result is not None:
                    ml_score_scaled = ml_result["risk_score"] * 10
                    ml_used = True
            except Exception:
                ml_score_scaled = None
    
    # ========== FINAL SCORE ==========
    if ml_score_scaled is not None:
        final_score = max(rule_score, ml_score_scaled)
        used_ml = True
    else:
        final_score = rule_score
        used_ml = False
    
    # ========== TRUSTED DOMAIN ADJUSTMENT ==========
    # For trusted domains, if rule_score is 0, cap the final score at 4 (Safe)
    if is_trusted and rule_score == 0 and ml_score_scaled is not None:
        final_score = min(final_score, 4.0)  # Cap at 4.0 (Safe threshold)
    # =============================================
    
    final_score = min(round(final_score, 1), 10)
    
    if final_score >= 8:
        verdict = "Phishing"
    elif final_score >= 6:
        verdict = "Suspicious"
    else:
        verdict = "Safe"
    
    return {
        "score": final_score,
        "verdict": verdict,
        "rule_score": rule_score,
        "rule_verdict": rule_verdict,
        "ml_score": round(ml_score_scaled, 1) if ml_score_scaled is not None else None,
        "used_ml": used_ml,
        "trusted_domain": is_trusted
    }
