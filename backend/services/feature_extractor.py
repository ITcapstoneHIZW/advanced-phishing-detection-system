import re

def extract_features(email_data):
    features = {}
    
    body = email_data.get("body", "")
    subject = email_data.get("subject", "")
    sender = email_data.get("sender", "")
    
    # Check for suspicious links
    urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', body)
    features["url_count"] = len(urls)
    features["has_suspicious_url"] = any(
        word in url.lower() for url in urls 
        for word in ["login", "verify", "account", "secure", "update", "confirm"]
    )
    
    # Check for urgent language
    urgent_words = ["urgent", "immediately", "act now", "verify your account", 
                    "suspended", "unusual activity", "click here", "limited time"]
    features["has_urgent_language"] = any(word in body.lower() or word in subject.lower() 
                                          for word in urgent_words)
    
    # Check sender domain
    sender_domain = re.findall(r'@([a-zA-Z0-9.-]+)', sender)
    features["sender_domain"] = sender_domain[0] if sender_domain else "unknown"
    features["is_free_email"] = any(domain in features["sender_domain"] 
                                    for domain in ["gmail.com", "yahoo.com", "hotmail.com"])
    
    # Check subject
    features["subject_has_re_fwd"] = subject.lower().startswith(("re:", "fwd:"))
    features["subject_length"] = len(subject)
    
    return features

def calculate_phishing_score(features):
    score = 0
    
    if features["has_suspicious_url"]:
        score += 3
    if features["has_urgent_language"]:
        score += 2.5
    if features["url_count"] > 3:
        score += 1.5
    if features["is_free_email"]:
        score += 1
    if not features["subject_has_re_fwd"]:
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