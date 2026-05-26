import re
from textblob import TextBlob
from langdetect import detect, LangDetectException

def extract_features(email_data):
    features = {}
    
    body = email_data.get("body", "")
    subject = email_data.get("subject", "")
    sender = email_data.get("sender", "")
    combined_text = subject + " " + body

    # --- URL Analysis ---
    urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', body)
    features["url_count"] = len(urls)
    features["has_suspicious_url"] = any(
        word in url.lower() for url in urls 
        for word in ["login", "verify", "account", "secure", "update", "confirm", "reset", "password", "bank"]
    )

    # --- Urgent Language ---
    urgent_words = [
        "urgent", "immediately", "act now", "verify your account",
        "suspended", "unusual activity", "click here", "limited time",
        "expires soon", "action required", "your account has been",
        "unauthorized", "suspicious", "compromised", "locked",
        "validate", "confirm your", "update your", "prize", "winner",
        "congratulations", "free", "risk", "threat", "alert"
    ]
    features["has_urgent_language"] = any(
        word in combined_text.lower() for word in urgent_words
    )
    features["urgent_word_count"] = sum(
        1 for word in urgent_words if word in combined_text.lower()
    )

    # --- Sender Analysis ---
    sender_domain = re.findall(r'@([a-zA-Z0-9.-]+)', sender)
    features["sender_domain"] = sender_domain[0] if sender_domain else "unknown"
    features["is_free_email"] = any(
        domain in features["sender_domain"] 
        for domain in ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
    )

    # Check for domain spoofing (e.g. paypaI.com instead of paypal.com)
    spoofed_brands = ["paypal", "microsoft", "google", "apple", "amazon", "netflix", "bank"]
    features["has_spoofed_domain"] = any(
        brand in features["sender_domain"].lower() for brand in spoofed_brands
    ) and not any(
        features["sender_domain"].lower().endswith(f"{brand}.com") for brand in spoofed_brands
    )

    # --- Subject Analysis ---
    features["subject_has_re_fwd"] = subject.lower().startswith(("re:", "fwd:"))
    features["subject_length"] = len(subject)
    features["subject_has_urgent"] = any(word in subject.lower() for word in urgent_words)

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