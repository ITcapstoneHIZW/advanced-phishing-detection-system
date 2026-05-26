import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Card, PageHeader, Sev } from "../components/Ui";

function AccountPage() {
  const navigate = useNavigate();
  const [name, setName] = useState(localStorage.getItem("userName") || "User");
  const email = localStorage.getItem("userEmail") || "";

  // In Phase 1 we store a single linked mailbox in localStorage; later
  // this becomes a list fetched from the backend.
  const [linkedAccounts, setLinkedAccounts] = useState(() => {
    if (localStorage.getItem("emailLinked") === "true") {
      return [{
        address: localStorage.getItem("gmailAddress") || email,
        provider: localStorage.getItem("emailProvider") || "google",
        linked: "Recently",
      }];
    }
    return [];
  });

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleUnlink = (addr) => {
    setLinkedAccounts(linkedAccounts.filter(a => a.address !== addr));
    if (linkedAccounts.length === 1) {
      localStorage.removeItem("emailLinked");
      localStorage.removeItem("gmailAddress");
      localStorage.removeItem("emailProvider");
    }
  };

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

  return (
    <>
      <PageHeader
        crumbs={["Account"]}
        actions={
          <>
            <button className="btn" data-variant="ghost">Discard</button>
            <button className="btn" data-variant="primary"><I.Check size={14}/> Save changes</button>
          </>
        }
      />
      <div className="page-body">
        <h1 className="page-title">Account</h1>
        <p className="page-sub">Manage your profile and linked email accounts.</p>

        <div className="col" style={{ gap: "var(--gap-card)", maxWidth: 720 }}>

          <Card title={<><I.User size={14}/> Profile</>}>
            <div className="row" style={{ gap: 18, marginBottom: 18 }}>
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 18 }}>
                {name.split(" ").map(s => s[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{email}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label>Full name</label>
                <div className="input"><input value={name} onChange={e => setName(e.target.value)} /></div>
              </div>
              <div className="field">
                <label>Email</label>
                <div className="input"><input value={email} disabled style={{ color: "var(--text-muted)" }} /></div>
              </div>
            </div>
          </Card>

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
            {linkedAccounts.length === 0 ? (
              <div className="between" style={{ padding: "14px 18px" }}>
                <span className="muted" style={{ fontSize: 13 }}>No mailboxes linked yet.</span>
                <button className="btn" data-size="sm" data-variant="primary" onClick={() => navigate("/link-email")}>
                  <I.Plus size={12}/> Link mailbox
                </button>
              </div>
            ) : (
              <div className="col" style={{ gap: 0 }}>
                {linkedAccounts.map((acc, idx) => (
                  <div key={acc.address} className="between" style={{
                    padding: "12px 18px",
                    borderBottom: idx < linkedAccounts.length - 1 ? "1px solid var(--border-faint)" : "none",
                    gap: 12,
                  }}>
                    <div className="row" style={{ gap: 12, minWidth: 0, flex: 1 }}>
                      {providerLogo(acc.provider)}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc.address}</div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                          {acc.provider === "microsoft" ? "Microsoft" : "Google"} · linked {acc.linked}
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                      <Sev level="low" label="Connected" />
                      <button className="btn" data-size="sm" data-variant="ghost" onClick={() => handleUnlink(acc.address)}>Unlink</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={<><I.Lock size={14}/> Password</>}>
            <div className="between">
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Change your password</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Use a strong, unique passphrase.</div>
              </div>
              <button className="btn" data-size="sm">Change password</button>
            </div>
          </Card>

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
        </div>
      </div>
    </>
  );
}

export default AccountPage;
