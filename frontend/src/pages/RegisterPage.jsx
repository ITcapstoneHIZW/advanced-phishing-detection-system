import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/emailService";

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await registerUser(name, email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userName", data.user.name);
      navigate("/link-email");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Create Account</h1>
        <p style={subtitleStyle}>Register for the phishing detection system</p>

        <form onSubmit={handleRegister}>
          <div style={fieldWrapper}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" style={primaryButtonStyle} disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p style={footerTextStyle}>
          Already have an account? <Link to="/">Login here</Link>
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
  maxWidth: "440px",
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

export default RegisterPage;