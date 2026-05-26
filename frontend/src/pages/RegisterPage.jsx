import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import I from "../components/Icons";
import { BrandMark } from "../components/Ui";
import { registerUser } from "../api/emailService";

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pwSignals = useMemo(() => ({
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^a-zA-Z0-9]/.test(password),
  }), [password]);
  const pwScore = Object.values(pwSignals).filter(Boolean).length;
  const pwLevel = pwScore <= 1 ? "critical" : pwScore <= 2 ? "high" : pwScore <= 3 ? "medium" : "low";
  const pwLabel = ["Too weak", "Weak", "Fair", "Good", "Strong"][pwScore];

  const canContinue = fullName.trim() && /.+@.+\..+/.test(emailAddr);
  const canSubmit = pwScore >= 3 && agree;

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    setBusy(true);
    setError("");
    const data = await registerUser(fullName, emailAddr, password);
    localStorage.clear();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userEmail", data.user.email);
    localStorage.setItem("userName", data.user.name);
    navigate("/link-email");
  } catch (err) {
    setError(err.message);
  } finally { setBusy(false); }
};

  return (
    <div className="login-wrap">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 900, width: "100%", gap: 0, alignItems: "stretch" }}>
        <div className="login-card" style={{ width: "auto", borderRadius: "var(--r-xl) 0 0 var(--r-xl)", borderRight: 0 }}>
          <div className="row" style={{ marginBottom: 22 }}>
            <BrandMark />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Phishing Detection</span>
          </div>

          <div className="row" style={{ gap: 6, marginBottom: 18, fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>
            <span style={{ color: step >= 1 ? "var(--text)" : "var(--text-faint)", fontWeight: 500 }}>01 IDENTITY</span>
            <span style={{ flex: 1, height: 1, background: step > 1 ? "var(--text)" : "var(--border)" }}></span>
            <span style={{ color: step >= 2 ? "var(--text)" : "var(--text-faint)", fontWeight: 500 }}>02 CREDENTIALS</span>
          </div>

          <h1>{step === 1 ? "Create your account" : "Set a password"}</h1>
          <p>{step === 1 ? "Register an email to start monitoring a mailbox." : "Choose a passphrase. We never store it in plain text."}</p>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <div className="field">
                  <label>Full name</label>
                  <div className="input">
                    <I.User size={14}/>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" autoFocus />
                  </div>
                </div>
                <div className="field">
                  <label>Email</label>
                  <div className="input">
                    <I.AtSign size={14}/>
                    <input type="email" value={emailAddr} onChange={e => setEmailAddr(e.target.value)} placeholder="you@example.com" />
                  </div>
                </div>
                <button type="button" className="btn" data-variant="primary" data-size="lg" style={{ width: "100%", justifyContent: "center" }} disabled={!canContinue} onClick={() => setStep(2)}>
                  Continue <I.ChevronRight size={14}/>
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="field">
                  <label>Email</label>
                  <div className="input" style={{ background: "var(--bg-sunken)" }}>
                    <I.AtSign size={14}/>
                    <input value={emailAddr} disabled style={{ color: "var(--text-muted)" }} />
                    <button type="button" onClick={() => setStep(1)} style={{ background: "transparent", border: 0, color: "var(--accent)", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Edit</button>
                  </div>
                </div>
                <div className="field">
                  <label>Password</label>
                  <div className="input">
                    <I.Lock size={14}/>
                    <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 12 characters" autoFocus />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "transparent", border: 0, color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
                      {showPw ? <I.EyeOff size={14}/> : <I.Eye size={14}/>}
                    </button>
                  </div>
                  <div className="row" style={{ gap: 4, marginTop: 8 }}>
                    {[0, 1, 2, 3].map(i => (
                      <span key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < pwScore ? `var(--sev-${pwLevel})` : "var(--bg-sunken)" }} />
                    ))}
                  </div>
                  <div className="between" style={{ marginTop: 6, fontSize: 11.5 }}>
                    <span className="muted">Strength</span>
                    <span style={{ color: password ? `var(--sev-${pwLevel})` : "var(--text-muted)", fontWeight: 500 }}>{password ? pwLabel : "—"}</span>
                  </div>
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--bg-sunken)", borderRadius: "var(--r-md)" }}>
                    {[
                      { ok: pwSignals.length, label: "12+ characters" },
                      { ok: pwSignals.upper,  label: "An uppercase letter" },
                      { ok: pwSignals.digit,  label: "A number" },
                      { ok: pwSignals.symbol, label: "A symbol" },
                    ].map((r, i) => (
                      <div key={i} className="row" style={{ fontSize: 11.5, color: r.ok ? "var(--sev-low)" : "var(--text-muted)", padding: "2px 0" }}>
                        {r.ok ? <I.Check size={12}/> : <I.Minus size={12}/>}
                        <span>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "10px 14px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", color: "var(--sev-critical)", fontSize: 13, marginBottom: 14 }}>{error}</div>
                )}

                <label className="row" style={{ alignItems: "flex-start", margin: "14px 0 18px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", lineHeight: 1.5 }}>
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>I agree to the <a href="#" style={{ color: "var(--accent)", fontWeight: 500 }}>Acceptable Use Policy</a>.</span>
                </label>

                <div className="row" style={{ gap: 8 }}>
                  <button type="button" className="btn" data-size="lg" style={{ flex: "0 0 auto" }} onClick={() => setStep(1)}>
                    <I.CornerUpLeft size={14}/> Back
                  </button>
                  <button type="submit" className="btn" data-variant="primary" data-size="lg" style={{ flex: 1, justifyContent: "center" }} disabled={!canSubmit || busy}>
                    {busy ? <><I.RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }}/> Creating account…</> : <>Create account <I.ArrowUpRight size={14}/></>}
                  </button>
                </div>
              </>
            )}

            <p style={{ marginTop: 22, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              Already have an account? <Link to="/" style={{ color: "var(--accent)", fontWeight: 500 }}>Sign in</Link>
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
          minHeight: 480,
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 22px", lineHeight: 1.25 }}>
            What happens after you sign up
          </h2>
          <div className="col" style={{ gap: 16 }}>
            {[
              { n: "01", t: "Link a mailbox", d: "Connect via OAuth — read-only by default.", icon: <I.AtSign size={14}/> },
              { n: "02", t: "First sync runs", d: "The classifier scores every message and explains its decision.", icon: <I.Activity size={14}/> },
              { n: "03", t: "Receive your first digest", d: "A daily summary of quarantined mail.", icon: <I.Mail size={14}/> },
              { n: "04", t: "Tune sensitivity", d: "Adjust the threshold to balance recall vs false positives.", icon: <I.Sliders size={14}/> },
            ].map(s => (
              <div key={s.n} className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "var(--r-md)",
                  background: "var(--bg-sunken)", border: "1px solid var(--border)",
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                  color: "var(--text-muted)", flexShrink: 0,
                }}>{s.n}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6, fontSize: 13.5, fontWeight: 500 }}>{s.icon}{s.t}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.5 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
