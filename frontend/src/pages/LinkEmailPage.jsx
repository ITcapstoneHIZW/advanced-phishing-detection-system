import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import I from "../components/Icons";
import { BrandMark, Sev } from "../components/Ui";

const BASE_URL = "http://localhost:8000";

function LinkEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [phase, setPhase] = useState("pick"); // pick | redirecting | saving | linked
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState("");

  // Handle OAuth callback (returned from Google/Microsoft with credentials)
  useEffect(() => {
    const success = searchParams.get("success");
    const gmail = searchParams.get("gmail");
    const creds = searchParams.get("creds");
    const prov = searchParams.get("provider");
    const err = searchParams.get("error");

    if (err) { setError("Sign in failed. Please try again."); return; }

    if (success && gmail && creds) {
      setProvider(prov || "google");
      setPhase("saving");

      const endpoint = prov === "microsoft" ? "/auth/save-microsoft" : "/auth/save-gmail";
      const body = prov === "microsoft"
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
        .then(res => res.json())
        .then(() => {
          localStorage.setItem("emailLinked", "true");
          localStorage.setItem("gmailAddress", gmail);
          localStorage.setItem("emailProvider", prov || "gmail");
          setPhase("linked");
        })
        .catch(() => {
          setError("Failed to save credentials. Please try again.");
          setPhase("pick");
        });
    }
  }, [searchParams]);

  const handleProvider = async (key) => {
    try {
      setProvider(key);
      setPhase("redirecting");
      setError("");
      const endpoint = key === "microsoft" ? "/auth/microsoft" : "/auth/gmail";
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await res.json();
      window.location.href = data.auth_url;
    } catch {
      setError(`Failed to initiate ${key === "microsoft" ? "Microsoft" : "Google"} sign in. Please try again.`);
      setPhase("pick");
    }
  };

  const PROVIDERS = [
    {
      key: "google",
      name: "Sign in with Google",
      sub: "Gmail",
      logo: (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
      ),
    },
    {
      key: "microsoft",
      name: "Sign in with Microsoft",
      sub: "Outlook, Hotmail, Live",
      logo: (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <rect x="3" y="3" width="8" height="8" fill="#f25022"/>
          <rect x="13" y="3" width="8" height="8" fill="#7fba00"/>
          <rect x="3" y="13" width="8" height="8" fill="#00a4ef"/>
          <rect x="13" y="13" width="8" height="8" fill="#ffb900"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="login-wrap">
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div className="row" style={{ justifyContent: "center", marginBottom: 22 }}>
          <BrandMark />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Sentinel</span>
        </div>

        {(phase === "pick" || phase === "redirecting") && (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "32px 32px 20px", textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, margin: "0 auto 14px",
                borderRadius: "var(--r-md)", background: "var(--accent-bg)",
                border: "1px solid var(--accent-border)", color: "var(--accent)",
                display: "grid", placeItems: "center",
              }}>
                <I.AtSign size={22}/>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.015em" }}>Link your email</h1>
              <p className="muted" style={{ fontSize: 13.5, margin: "8px 0 0", lineHeight: 1.55 }}>
                Connect your email account so we can monitor it for phishing attempts.
                We only request read-only access.
              </p>
            </div>

            {error && (
              <div style={{ margin: "0 32px 16px", padding: "10px 14px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", color: "var(--sev-critical)", fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ padding: "0 32px 20px" }}>
              <div style={{ padding: 14, background: "var(--bg-sunken)", border: "1px solid var(--border-faint)", borderRadius: "var(--r-md)" }}>
                {[
                  "Read-only access — we never send emails on your behalf",
                  "Revoke access anytime from your account settings",
                  "Secured with OAuth 2.0 — no passwords stored",
                ].map((t, i) => (
                  <div key={i} className="row" style={{ fontSize: 12.5, padding: "4px 0", color: "var(--text-secondary)" }}>
                    <I.Check size={13} style={{ color: "var(--sev-low)", flexShrink: 0 }}/>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "0 32px 20px" }}>
              <div className="col" style={{ gap: 10 }}>
                {PROVIDERS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleProvider(p.key)}
                    disabled={phase === "redirecting"}
                    className="btn" data-size="lg"
                    style={{ width: "100%", justifyContent: "center", gap: 10 }}
                  >
                    {p.logo}
                    {phase === "redirecting" && provider === p.key ? "Redirecting…" : p.name}
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: "14px 0 0" }}>
                Supports Gmail, Outlook, Hotmail, and Live accounts.
              </p>
            </div>

            <div style={{ padding: "14px 32px", borderTop: "1px solid var(--border-faint)", background: "var(--bg-sunken)", textAlign: "center" }}>
              <button className="btn" data-variant="ghost" data-size="sm" onClick={() => navigate("/dashboard")}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {phase === "saving" && (
          <div className="card">
            <div style={{ padding: "60px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ position: "relative", width: 64, height: 64, marginBottom: 22 }}>
                <div style={{
                  position: "absolute", inset: 0,
                  border: "2px solid var(--border)", borderTopColor: "var(--accent)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}/>
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                  {PROVIDERS.find(p => p.key === provider)?.logo}
                </div>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, letterSpacing: "-0.015em" }}>Saving credentials…</h2>
              <p className="muted" style={{ fontSize: 13, margin: "8px 0 0", maxWidth: 320, lineHeight: 1.55 }}>
                You're almost done. We're encrypting your token before storing it.
              </p>
            </div>
          </div>
        )}

        {phase === "linked" && (
          <div className="card">
            <div style={{ padding: "44px 40px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "var(--sev-low-bg)",
                border: "1px solid var(--sev-low)",
                color: "var(--sev-low)",
                display: "grid", placeItems: "center",
                marginBottom: 18,
              }}>
                <I.Check size={26}/>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.015em" }}>Mailbox linked</h2>
              <p className="muted" style={{ fontSize: 13.5, margin: "8px 0 0", maxWidth: 340, lineHeight: 1.55 }}>
                Your dashboard will populate as messages are scored.
              </p>

              <div style={{ marginTop: 22, padding: "12px 16px", background: "var(--bg-sunken)", borderRadius: "var(--r-md)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center", width: "100%", maxWidth: 340 }}>
                {PROVIDERS.find(p => p.key === provider)?.logo}
                <div style={{ textAlign: "left", minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{localStorage.getItem("gmailAddress")}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{provider === "google" ? "Google" : "Microsoft"}</div>
                </div>
                <Sev level="low" label="Connected" />
              </div>

              <button
                className="btn" data-size="lg" data-variant="primary"
                style={{ width: "100%", maxWidth: 340, justifyContent: "center", marginTop: 22 }}
                onClick={() => navigate("/dashboard")}
              >
                Go to dashboard <I.ArrowUpRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LinkEmailPage;
