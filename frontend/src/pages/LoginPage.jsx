import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api/emailService";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const data = await loginUser(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userName", data.user.name);

      // Check if user already has email linked
      const meResponse = await fetch("http://localhost:8000/me", {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });
      const meData = await meResponse.json();
      if (meData.has_email_linked) {
      localStorage.setItem("emailLinked", "true");
      }

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
        <h1 style={titleStyle}>Phishing Detection System</h1>
        <p style={subtitleStyle}>Sign in to access the dashboard</p>

        <form onSubmit={handleLogin}>
          <div style={fieldWrapper}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" style={primaryButtonStyle} disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p style={footerTextStyle}>
          Don't have an account? <Link to="/register">Create one here</Link>
        </p>
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
  maxWidth: "420px",
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
  marginBottom: "24px",
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
  marginTop: "6px",
};

const errorStyle = {
  color: "#dc2626",
  marginBottom: "14px",
  fontSize: "14px",
};

const footerTextStyle = {
  marginTop: "20px",
  textAlign: "center",
  color: "#475569",
};

export default LoginPage;