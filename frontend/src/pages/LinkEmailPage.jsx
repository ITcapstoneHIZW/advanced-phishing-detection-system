import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const BASE_URL = "http://localhost:8000";

function LinkEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const gmail = searchParams.get("gmail");
    const creds = searchParams.get("creds");
    const provider = searchParams.get("provider");
    const err = searchParams.get("error");

    if (err) {
      setError("Sign in failed. Please try again.");
      return;
    }

    if (success && gmail && creds) {
      setSaving(true);

      const endpoint =
        provider === "microsoft" ? "/auth/save-microsoft" : "/auth/save-gmail";

      const body =
        provider === "microsoft"
          ? { email_address: gmail, credentials: JSON.parse(creds) }
          : { gmail_address: gmail, credentials: JSON.parse(creds) };

      fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(body),
      })
        .then((res) => res.json())
        .then(() => {
          localStorage.setItem("gmailLinked", "true");
          localStorage.setItem("gmailAddress", gmail);
          localStorage.setItem("emailProvider", provider || "gmail");
          navigate("/dashboard");
        })
        .catch(() => {
          setError("Failed to save credentials. Please try again.");
          setSaving(false);
        });
    }
  }, [searchParams, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${BASE_URL}/auth/gmail`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (err) {
      setError("Failed to initiate Google sign in. Please try again.");
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      setMicrosoftLoading(true);
      setError("");
      const response = await fetch(`${BASE_URL}/auth/microsoft`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (err) {
      setError("Failed to initiate Microsoft sign in. Please try again.");
      setMicrosoftLoading(false);
    }
  };

  if (saving) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={spinnerWrapper}>
            <div style={spinnerStyle} />
            <p style={{ color: "#64748b", marginTop: "16px" }}>
              Linking your email account...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={iconWrapper}>📧</div>
        <h1 style={titleStyle}>Link Your Email</h1>
        <p style={subtitleStyle}>
          Connect your email account so we can monitor it for phishing attempts.
          We only request read-only access to your emails.
        </p>

        <div style={featuresBox}>
          <p style={featureItem}>🔒 Read-only access — we never send emails on your behalf</p>
          <p style={featureItem}>🔄 Revoke access anytime from your account settings</p>
          <p style={featureItem}>🛡️ Secured with OAuth2 — no passwords stored</p>
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <div style={buttonGroup}>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={googleButtonStyle}
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              style={{ width: "20px", height: "20px" }}
            />
            {loading ? "Redirecting..." : "Sign in with Google"}
          </button>

          <button
            onClick={handleMicrosoftSignIn}
            disabled={microsoftLoading}
            style={microsoftButtonStyle}
          >
            <img
              src="https://www.microsoft.com/favicon.ico"
              alt="Microsoft"
              style={{ width: "20px", height: "20px" }}
            />
            {microsoftLoading ? "Redirecting..." : "Sign in with Microsoft"}
          </button>
        </div>

        <p style={supportedText}>
          Supports Gmail, Outlook, Hotmail, and Live accounts
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          style={skipButtonStyle}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #e2e8f0, #f8fafc)",
  padding: "20px",
};

const cardStyle = {
  width: "100%",
  maxWidth: "460px",
  background: "white",
  padding: "32px",
  borderRadius: "16px",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
  textAlign: "center",
};

const iconWrapper = { fontSize: "48px", marginBottom: "16px" };

const titleStyle = { margin: 0, color: "#0f172a" };

const subtitleStyle = {
  color: "#64748b",
  marginTop: "10px",
  marginBottom: "24px",
  lineHeight: "1.6",
};

const featuresBox = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "24px",
  textAlign: "left",
};

const featureItem = {
  margin: "8px 0",
  fontSize: "14px",
  color: "#334155",
};

const buttonGroup = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginBottom: "16px",
};

const googleButtonStyle = {
  width: "100%",
  padding: "14px",
  background: "white",
  color: "#334155",
  border: "2px solid #e2e8f0",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const microsoftButtonStyle = {
  width: "100%",
  padding: "14px",
  background: "#0078d4",
  color: "white",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const supportedText = {
  fontSize: "13px",
  color: "#94a3b8",
  marginBottom: "16px",
};

const skipButtonStyle = {
  width: "100%",
  padding: "12px",
  background: "transparent",
  color: "#64748b",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "600",
};

const spinnerWrapper = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "40px 0",
};

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid #e2e8f0",
  borderTop: "4px solid #2563eb",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const errorStyle = {
  color: "#dc2626",
  marginBottom: "14px",
  fontSize: "14px",
};

export default LinkEmailPage;