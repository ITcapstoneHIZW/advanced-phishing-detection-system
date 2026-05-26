import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Card, PageHeader, Sev, ConfirmModal } from "../components/Ui";

const BASE_URL = "http://localhost:8000";

function AccountPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState(null);

  // Password change state
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");


  // Stats
  const [stats, setStats] = useState({ total: 0, quarantined: 0, safe: 0, phishing: 0 });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const token = localStorage.getItem("access_token");
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [accRes, emailsRes] = await Promise.all([
          fetch(`${BASE_URL}/account`, { headers: authHeaders }),
          fetch(`${BASE_URL}/emails`, { headers: authHeaders }),
        ]);
        const accData = await accRes.json();
        const emailsData = await emailsRes.json();
        setAccount(accData);
        const emails = emailsData.emails || [];
        setStats({
          total: emails.length,
          quarantined: emails.filter(e => e.is_quarantined).length,
          safe: emails.filter(e => e.verdict === "Safe").length,
          phishing: emails.filter(e => e.verdict === "Phishing").length,
        });
      } catch {
        setError("Could not load account data.");
      } finally { setLoading(false); }
    })();
  }, []);

  const handleUnlink = (linkedId) => {
    setConfirm({
      title: "Unlink email account",
      message: "This mailbox will stop being monitored. You can re-link it at any time.",
      confirmLabel: "Unlink",
      confirmTone: "medium",
      onConfirm: async () => {
        setConfirm(null);
        try {
      const res = await fetch(`${BASE_URL}/linked-emails/${linkedId}`, {
        method: "DELETE", headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to unlink");
      setAccount(prev => ({
        ...prev,
        linked_emails: prev.linked_emails.filter(l => l.id !== linkedId),
      }));
      if (account.linked_emails.length === 1) {
        localStorage.removeItem("emailLinked");
      }
          showToast("Email account unlinked.");
        } catch {
          setError("Failed to unlink email account.");
        }
      }
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (newPw !== confirmPw) { setPwError("New passwords do not match."); return; }
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    try {
      setPwLoading(true);
      const res = await fetch(`${BASE_URL}/account/change-password`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to change password.");
      }
      setShowPwForm(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed successfully.");
    } catch (err) {
      setPwError(err.message);
    } finally { setPwLoading(false); }
  };

  const handleDeleteAccount = () => {
    setConfirm({
      title: "Delete account permanently",
      message: "All your emails, analysis results, linked accounts, and settings will be permanently deleted. This cannot be undone.",
      confirmLabel: "Delete my account",
      confirmTone: "critical",
      onConfirm: async () => {
        setConfirm(null);
        try {
          await fetch(`${BASE_URL}/account`, { method: "DELETE", headers: authHeaders });
          localStorage.clear();
          navigate("/");
        } catch {
          setError("Failed to delete account.");
        }
      }
    });
  };

  const handleSignOut = () => { localStorage.clear(); navigate("/"); };

  const providerLogo = (p) => p === "microsoft" ? (
    <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="8" height="8" fill="#f25022"/>
      <rect x="13" y="3" width="8" height="8" fill="#7fba00"/>
      <rect x="3" y="13" width="8" height="8" fill="#00a4ef"/>
      <rect x="13" y="13" width="8" height="8" fill="#ffb900"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );

  const initials = (account?.name || localStorage.getItem("userName") || "U")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <PageHeader crumbs={["Account"]} />

      <div className="page-body">
        <ConfirmModal
          title={confirm?.title}
          message={confirm?.message}
          confirmLabel={confirm?.confirmLabel}
          confirmTone={confirm?.confirmTone}
          onConfirm={confirm?.onConfirm}
          onCancel={() => setConfirm(null)}
        />
        {toast && (
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, background: "var(--text)", color: "var(--bg-elevated)", padding: "10px 16px", borderRadius: "var(--r-md)", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontWeight: 500 }}>
            {toast}
          </div>
        )}

        <h1 className="page-title">Account</h1>
        <p className="page-sub">Manage your profile and linked email accounts.</p>

        {error && (
          <div style={{ padding: "12px 16px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", color: "var(--sev-critical)", fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        {loading ? (
          <Card><div className="empty"><div>Loading account…</div></div></Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "var(--gap-card)", alignItems: "start" }}>

            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-card)" }}>

              {/* Profile */}
              <Card title={<><I.User size={14}/> Profile</>}>
                <div className="row" style={{ gap: 18, marginBottom: 18 }}>
                  <div className="avatar" style={{ width: 56, height: 56, fontSize: 18, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{account?.name}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{account?.email}</div>
                    {account?.created_at && (
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                        Member since {new Date(account.created_at).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="field">
                    <label>Full name</label>
                    <div className="input"><input value={account?.name || ""} disabled style={{ color: "var(--text-muted)" }} /></div>
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <div className="input"><input value={account?.email || ""} disabled style={{ color: "var(--text-muted)" }} /></div>
                  </div>
                </div>
              </Card>

              {/* Linked accounts */}
              <Card
                title={<><I.AtSign size={14}/> Linked email accounts</>}
                sub="Mailboxes monitored on your behalf"
                action={
                  <button className="btn" data-size="sm" onClick={() => navigate("/link-email")}>
                    <I.Plus size={12}/> Link another
                  </button>
                }
                padded={false}
              >
                {!account?.linked_emails?.length ? (
                  <div className="between" style={{ padding: "14px 18px" }}>
                    <span className="muted" style={{ fontSize: 13 }}>No mailboxes linked yet.</span>
                    <button className="btn" data-size="sm" data-variant="primary" onClick={() => navigate("/link-email")}>
                      <I.Plus size={12}/> Link mailbox
                    </button>
                  </div>
                ) : (
                  <div>
                    {account.linked_emails.map((acc, idx) => (
                      <div key={acc.id} className="between" style={{
                        padding: "12px 18px",
                        borderBottom: idx < account.linked_emails.length - 1 ? "1px solid var(--border-faint)" : "none",
                        gap: 12,
                      }}>
                        <div className="row" style={{ gap: 12, minWidth: 0, flex: 1 }}>
                          {providerLogo(acc.provider)}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="mono" style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc.email_address}</div>
                            <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                              {acc.provider === "microsoft" ? "Microsoft" : "Google"} · linked {new Date(acc.linked_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                          <Sev level="low" label="Connected" />
                          <button className="btn" data-size="sm" data-variant="ghost" onClick={() => handleUnlink(acc.id)}>Unlink</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Password */}
              <Card title={<><I.Lock size={14}/> Password</>}>
                {!showPwForm ? (
                  <div className="between">
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>Change your password</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Use a strong, unique passphrase.</div>
                    </div>
                    <button className="btn" data-size="sm" onClick={() => setShowPwForm(true)}>Change password</button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {pwError && (
                        <div style={{ padding: "8px 12px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", color: "var(--sev-critical)", fontSize: 12.5 }}>{pwError}</div>
                      )}
                      <div className="field">
                        <label>Current password</label>
                        <div className="input"><I.Lock size={13}/><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" /></div>
                      </div>
                      <div className="field">
                        <label>New password</label>
                        <div className="input"><I.Lock size={13}/><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6 chars)" /></div>
                        
                      </div>
                      <div className="field">
                        <label>Confirm new password</label>
                        <div className="input"><I.Lock size={13}/><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" /></div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <button type="button" className="btn" data-variant="ghost" onClick={() => { setShowPwForm(false); setPwError(""); }}>Cancel</button>
                        <button type="submit" className="btn" data-variant="primary" disabled={pwLoading}>
                          <I.Check size={13}/> {pwLoading ? "Saving…" : "Update password"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </Card>

              {/* Sign out */}
              <Card>
                <div className="between">
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>Sign out</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>End your current session on this device.</div>
                  </div>
                  <button className="btn" data-variant="ghost" onClick={handleSignOut}>
                    <I.LogOut size={13}/> Sign out
                  </button>
                </div>
              </Card>

              {/* Danger zone */}
              <Card title={<span style={{ color: "var(--sev-critical)" }}><I.AlertTriangle size={14}/> Danger zone</span>}>
                <div className="between">
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>Delete account</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      Permanently delete your account and all associated emails, analysis, and settings. This cannot be undone.
                    </div>
                  </div>
                  <button
                    className="btn"
                    data-size="sm"
                    style={{ background: "var(--sev-critical-bg)", color: "var(--sev-critical)", border: "1px solid var(--sev-critical)", flexShrink: 0 }}
                    onClick={handleDeleteAccount}
                  >
                    <I.Trash size={13}/> Delete account
                  </button>
                </div>
              </Card>
            </div>

            {/* Right column — personal stats */}
            <div>
              <Card title={<><I.Activity size={14}/> Your stats</>}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Emails processed", value: stats.total, icon: <I.Mail size={13}/>, color: "var(--accent)" },
                    { label: "Quarantined", value: stats.quarantined, icon: <I.Lock size={13}/>, color: "var(--sev-high)" },
                    { label: "Confirmed phishing", value: stats.phishing, icon: <I.ShieldAlert size={13}/>, color: "var(--sev-critical)" },
                    { label: "Marked safe", value: stats.safe, icon: <I.Check size={13}/>, color: "var(--sev-low)" },
                  ].map(s => (
                    <div key={s.label} className="between">
                      <div className="row" style={{ gap: 8, color: "var(--text-secondary)", fontSize: 13 }}>
                        <span style={{ color: s.color }}>{s.icon}</span>
                        {s.label}
                      </div>
                      <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 15, color: s.color }}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
