import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import I from "../components/Icons";
import { BrandMark } from "../components/Ui";
import { loginUser } from "../api/emailService";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
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

    // Don't let /me failure block navigation
    try {
      const meRes = await fetch("http://localhost:8000/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const meData = await meRes.json();
      if (meData.has_email_linked) localStorage.setItem("emailLinked", "true");
    } catch {
      // /me failed — not critical, proceed anyway
    }

    navigate("/dashboard");
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-wrap">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 900, width: "100%", gap: 0, alignItems: "stretch" }}>
        <div className="login-card" style={{ width: "auto", borderRadius: "var(--r-xl) 0 0 var(--r-xl)", borderRight: 0 }}>
          <div className="row" style={{ marginBottom: 28 }}>
            <BrandMark />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Phishing Detection</span>
          </div>

          <h1>Sign in to your console</h1>
          <p>Personal or work email — any address that receives mail you want monitored.</p>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <div className="input">
                <I.AtSign size={14}/>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
              </div>
            </div>

            <div className="field">
              <label className="between" style={{ fontSize: 12 }}>
                <span>Password</span>
                <a style={{ color: "var(--accent)", fontWeight: 500 }} href="#">Forgot?</a>
              </label>
              <div className="input">
                <I.Lock size={14}/>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "transparent", border: 0, color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
                  {showPw ? <I.EyeOff size={14}/> : <I.Eye size={14}/>}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", color: "var(--sev-critical)", fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <label className="row" style={{ marginBottom: 18, fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>Keep me signed in for 30 days</span>
            </label>

            <button type="submit" className="btn" data-variant="primary" data-size="lg" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
              {loading ? <><I.RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }}/> Authenticating…</> : <>Sign in <I.ArrowUpRight size={14}/></>}
            </button>

            <p style={{ marginTop: 22, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              No account? <Link to="/register" style={{ color: "var(--accent)", fontWeight: 500 }}>Create one here</Link>
            </p>
          </form>
        </div>

        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderLeft: 0,
          borderRadius: "0 var(--r-xl) var(--r-xl) 0",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 480,
        }}>
          <div>
            <span className="sev" data-level="low">
              <span className="sev-dot" style={{ background: "var(--sev-low)" }}></span>
              All systems operational
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: "20px 0 10px", lineHeight: 1.25 }}>
              Adaptive phishing defence, with the reasoning included.
            </h2>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
              Every quarantine decision is explained, every flag traceable to a feature.
            </p>
          </div>

          <div style={{ marginTop: 28, padding: "12px 14px", background: "var(--bg-sunken)", borderRadius: "var(--r-md)", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            By signing in you agree to the Acceptable Use Policy.
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
