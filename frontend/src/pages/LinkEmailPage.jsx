import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { linkGmail } from "../api/emailService";

function LinkEmailPage() {
  const navigate = useNavigate();
  const [gmailAddress, setGmailAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLink = async (e) => {
    e.preventDefault();

    if (!gmailAddress || !appPassword) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await linkGmail(gmailAddress, appPassword);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Link Your Gmail</h1>
        <p style={subtitleStyle}>
          Connect your Gmail account so we can monitor it for phishing attempts.
        </p>

        <div style={infoBox}>
          <p style={{ margin: 0, fontWeight: "600" }}>📋 How to get an App Password</p>
          <ol style={{ margin: "10px 0 0 0", paddingLeft: "18px", fontSize: "14px", lineHeight: "1.8" }}>
            <li>Go to <strong>myaccount.google.com</strong></li>
            <li>Click <strong>Security</strong></li>
            <li>Enable <strong>2-Step Verification</strong></li>
            <li>Search for <strong>App Passwords</strong></li>
            <li>Generate one and paste it below</li>
          </ol>
        </div>

        <form onSubmit={handleLink}>
          <div style={fieldWrapper}>
            <label style={labelStyle}>Gmail Address</label>
            <input
              type="email"
              placeholder="yourname@gmail.com"
              value={gmailAddress}
              onChange={(e) => setGmailAddress(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>App Password</label>
            <input
              type="password"
              placeholder="16-character app password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" style={primaryButtonStyle} disabled={loading}>
            {loading ? "Connecting..." : "Link Gmail Account"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={skipButtonStyle}
          >
            Skip for now
          </button>
        </form>
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
};

const titleStyle = {
  margin: 0,
  textAlign: "center",
  color: "#0f172a",
};

const subtitleStyle = {
  textAlign: "center",
  color: "#64748b",
  marginTop: "10px",
  marginBottom: "20px",
};

const infoBox = {
  background: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: "10px",
  padding: "14px",
  marginBottom: "24px",
  color: "#0369a1",
};

const fieldWrapper = {
  marginBottom: "16px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "600",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  width: "100%",
  padding: "12px",
  background: "#0f172a",
  color: "white",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "700",
  marginBottom: "10px",
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

const errorStyle = {
  color: "#dc2626",
  marginBottom: "14px",
  fontSize: "14px",
};

export default LinkEmailPage;