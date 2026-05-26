import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Kpi, Card, RiskBar, PageHeader } from "../components/Ui";
import { getEmails, syncEmails } from "../api/emailService";

function DashboardPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const userName = localStorage.getItem("userName") || "User";
  const emailLinked = localStorage.getItem("emailLinked") === "true";

  const loadEmails = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getEmails();
      setEmails(data);
    } catch (err) {
      setError("Could not connect to backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmails(); }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage("");
      const result = await syncEmails();
      setSyncMessage(`Synced ${result.emails_stored} new emails.`);
      await loadEmails();
    } catch (err) {
      setSyncMessage("Sync failed. Check that your email account is linked.");
    } finally {
      setSyncing(false);
    }
  };

  const total = emails.length;
  const quarantined = emails.filter(e => e.is_quarantined).length;
  const highRisk = emails.filter(e => e.risk_score >= 7).length;
  const safe = emails.filter(e => e.verdict === "Safe").length;
  const recent = emails.filter(e => e.is_quarantined).slice(0, 5);

  return (
    <>
      <PageHeader
        crumbs={["Dashboard"]}
        actions={
          emailLinked ? (
            <button className="btn" data-variant="primary" onClick={handleSync} disabled={syncing}>
              <I.RefreshCw size={14} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "Syncing…" : "Sync emails"}
            </button>
          ) : (
            <button className="btn" data-variant="primary" onClick={() => navigate("/link-email")}>
              <I.AtSign size={14}/> Link your email
            </button>
          )
        }
      />

      <div className="page-body">
        <h1 className="page-title">Welcome back, {userName}</h1>
        <p className="page-sub">{syncMessage || "Manage your monitored mailboxes"}</p>

        {!emailLinked && (
          <div style={{ padding: "14px 18px", background: "var(--sev-medium-bg)", border: "1px solid var(--sev-medium)", borderRadius: "var(--r-md)", marginBottom: 20, color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <I.AlertTriangle size={16} style={{ color: "var(--sev-medium)" }}/>
            <span style={{ fontSize: 13.5 }}>
              You haven't linked an email account yet.{" "}
              <a onClick={() => navigate("/link-email")} style={{ color: "var(--accent)", fontWeight: 500, cursor: "pointer" }}>Link it here</a>{" "}
              to start syncing.
            </span>
          </div>
        )}

        {error && (
          <div style={{ padding: "14px 18px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", marginBottom: 20, color: "var(--sev-critical)", fontSize: 13.5 }}>
            {error}
          </div>
        )}

        <div className="kpi-grid">
          <Kpi label={<><I.Mail size={11}/> Total emails</>} value={total} />
          <Kpi label={<><I.Lock size={11}/> Quarantined</>} value={quarantined} />
          <Kpi label={<><I.AlertTriangle size={11}/> High risk</>} value={highRisk} />
          <Kpi label={<><I.Check size={11}/> Marked safe</>} value={safe} />
        </div>

        <Card
          title={<><I.Lock size={14}/> Recent quarantined emails</>}
          action={
            <button className="btn" data-variant="ghost" data-size="sm" onClick={() => navigate("/quarantine")}>
              View all <I.ChevronRight size={12} />
            </button>
          }
          padded={false}
        >
          {loading ? (
            <div className="empty"><div>Loading emails…</div></div>
          ) : recent.length === 0 ? (
            <div className="empty">
              <I.ShieldCheck size={36}/>
              <div className="empty-title">No quarantined emails yet</div>
              <div>{emailLinked ? "Try syncing your emails." : "Link your email account to start monitoring."}</div>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Risk</th>
                  <th>Verdict</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(e => (
                  <tr key={e.id} onClick={() => navigate(`/email/${e.id}`)}>
                    <td className="cell-sender">
                      <div className="name">{e.sender}</div>
                    </td>
                    <td className="cell-subject">{e.subject}</td>
                    <td>{e.risk_score != null ? <RiskBar score={e.risk_score} /> : <span className="muted">—</span>}</td>
                    <td>
                      <span style={{
                        fontWeight: 500,
                        color: e.verdict === "Phishing" ? "var(--sev-critical)"
                             : e.verdict === "Suspicious" ? "var(--sev-medium)"
                             : "var(--sev-low)"
                      }}>{e.verdict}</span>
                    </td>
                    <td className="cell-date">{e.date_received}</td>
                    <td className="cell-actions">
                      <I.ChevronRight size={14} style={{ color: "var(--text-faint)" }}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

export default DashboardPage;
