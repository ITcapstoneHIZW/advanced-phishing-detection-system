import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Kpi, Card, RiskBar, PageHeader, Sparkline } from "../components/Ui";
import { getEmails, syncEmails } from "../api/emailService";

// === Mini SVG bar chart for threats over time ===
function ThreatsChart({ emails, period }) {
  const data = useMemo(() => {
    if (!emails.length) return [];
    const now = new Date();
    let buckets, fmt;

    if (period === "24h") {
      buckets = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now);
        d.setHours(now.getHours() - (23 - i), 0, 0, 0);
        return { label: `${d.getHours()}:00`, ts: d, safe: 0, suspicious: 0, phishing: 0 };
      });
      emails.forEach(e => {
        const d = new Date(e.date_received);
        const idx = buckets.findIndex((b, i) =>
          i === buckets.length - 1 || (d >= b.ts && d < buckets[i + 1].ts)
        );
        if (idx >= 0) {
          if (e.verdict === "Phishing") buckets[idx].phishing++;
          else if (e.verdict === "Suspicious") buckets[idx].suspicious++;
          else buckets[idx].safe++;
        }
      });
    } else if (period === "7d") {
      buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        return { label: d.toLocaleDateString("en", { weekday: "short" }), ts: d, safe: 0, suspicious: 0, phishing: 0 };
      });
      emails.forEach(e => {
        const d = new Date(e.date_received);
        const idx = buckets.findIndex((b, i) =>
          i === buckets.length - 1 || (d >= b.ts && d < buckets[i + 1].ts)
        );
        if (idx >= 0) {
          if (e.verdict === "Phishing") buckets[idx].phishing++;
          else if (e.verdict === "Suspicious") buckets[idx].suspicious++;
          else buckets[idx].safe++;
        }
      });
    } else {
      buckets = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (29 - i));
        d.setHours(0, 0, 0, 0);
        return { label: d.toLocaleDateString("en", { day: "numeric", month: "short" }), ts: d, safe: 0, suspicious: 0, phishing: 0 };
      });
      emails.forEach(e => {
        const d = new Date(e.date_received);
        const idx = buckets.findIndex((b, i) =>
          i === buckets.length - 1 || (d >= b.ts && d < buckets[i + 1].ts)
        );
        if (idx >= 0) {
          if (e.verdict === "Phishing") buckets[idx].phishing++;
          else if (e.verdict === "Suspicious") buckets[idx].suspicious++;
          else buckets[idx].safe++;
        }
      });
    }
    return buckets;
  }, [emails, period]);

  if (!data.length) return <div className="empty" style={{ minHeight: 120 }}><div>No data for this period.</div></div>;

  const maxVal = Math.max(...data.map(b => b.safe + b.suspicious + b.phishing), 1);
  const W = 600, H = 120, pad = 4;
  const bw = (W - pad * (data.length + 1)) / data.length;

  // Show every Nth label to avoid crowding
  const labelEvery = period === "24h" ? 4 : period === "7d" ? 1 : 5;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: "100%", minWidth: 300 }}>
        {data.map((b, i) => {
          const total = b.safe + b.suspicious + b.phishing;
          const x = pad + i * (bw + pad);
          const totalH = (total / maxVal) * H;
          const phishH = (b.phishing / maxVal) * H;
          const suspH = (b.suspicious / maxVal) * H;
          const safeH = (b.safe / maxVal) * H;
          let y = H;
          return (
            <g key={i}>
              {b.safe > 0 && (() => { y -= safeH; return <rect x={x} y={y} width={bw} height={safeH} fill="var(--sev-low)" fillOpacity="0.6" rx="1" />; })()}
              {b.suspicious > 0 && (() => { y -= suspH; return <rect x={x} y={y} width={bw} height={suspH} fill="var(--sev-medium)" fillOpacity="0.7" rx="1" />; })()}
              {b.phishing > 0 && (() => { y -= phishH; return <rect x={x} y={y} width={bw} height={phishH} fill="var(--sev-critical)" fillOpacity="0.8" rx="1" />; })()}
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H + 14} textAnchor="middle" fontSize="9" fill="var(--text-faint)">{b.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--sev-critical)", display: "inline-block" }}/> Phishing</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--sev-medium)", display: "inline-block" }}/> Suspicious</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--sev-low)", display: "inline-block" }}/> Safe</span>
      </div>
    </div>
  );
}

// === Top risk factors bar list ===
function TopRiskFactors({ emails }) {
  const factors = useMemo(() => {
    // We can derive flags from verdict/risk_score since full analysis isn't in list endpoint
    const counts = {
      "High risk score (≥7)": emails.filter(e => e.risk_score >= 7).length,
      "Quarantined": emails.filter(e => e.is_quarantined).length,
      "Phishing verdict": emails.filter(e => e.verdict === "Phishing").length,
      "Suspicious verdict": emails.filter(e => e.verdict === "Suspicious").length,
      "Safe verdict": emails.filter(e => e.verdict === "Safe").length,
      "Medium risk (4–7)": emails.filter(e => e.risk_score >= 4 && e.risk_score < 7).length,
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [emails]);

  if (!factors.length) return <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No data yet.</div>;

  const max = factors[0][1];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {factors.map(([label, count]) => (
        <div key={label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ color: "var(--text-secondary)" }}>{label}</span>
            <span style={{ fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{count}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "var(--bg-sunken)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: "var(--accent)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// === Main page ===
function DashboardPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [period, setPeriod] = useState("7d");
  const [auditLogs, setAuditLogs] = useState([]);

  const userName = localStorage.getItem("userName") || "User";
  const emailLinked = localStorage.getItem("emailLinked") === "true";

  const loadEmails = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getEmails();
      setEmails(data);
    } catch {
      setError("Could not connect to backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
    // Fetch recent audit logs for activity feed
    const token = localStorage.getItem("access_token");
    fetch("http://localhost:8000/audit-logs?limit=10", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setAuditLogs(data.logs || []))
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage("");
      const result = await syncEmails();
      setSyncMessage(`Synced ${result.emails_stored} new emails.`);
      await loadEmails();
    } catch {
      setSyncMessage("Sync failed. Check that your email account is linked.");
    } finally {
      setSyncing(false);
    }
  };

  const exportCSV = () => {
    const rows = [["ID", "Sender", "Subject", "Risk Score", "Verdict", "Quarantined", "Date"]];
    emails.forEach(e => rows.push([e.id, e.sender, e.subject, e.risk_score, e.verdict, e.is_quarantined, e.date_received]));
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "emails.csv"; a.click();
  };

  // Filter emails by period
  const periodEmails = useMemo(() => {
    const now = new Date();
    const hours = period === "24h" ? 24 : period === "7d" ? 168 : 720;
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return emails.filter(e => {
      const d = new Date(e.date_received);
      return !isNaN(d) ? d >= cutoff : true;
    });
  }, [emails, period]);

  const total = periodEmails.length;
  const quarantined = periodEmails.filter(e => e.is_quarantined).length;
  const highRisk = periodEmails.filter(e => e.risk_score >= 7).length;
  const safe = periodEmails.filter(e => e.verdict === "Safe").length;
  const recent = emails.filter(e => e.is_quarantined).slice(0, 5);

  // Sparkline data (last 7 data points = last 7 days total count)
  const sparkData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      return emails.filter(e => {
        const ed = new Date(e.date_received);
        return ed >= d && ed < next;
      }).length;
    });
  }, [emails]);

  return (
    <>
      <PageHeader
        crumbs={["Dashboard"]}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Period selector */}
            <div style={{ display: "flex", background: "var(--bg-sunken)", borderRadius: "var(--r-md)", padding: 2, gap: 2 }}>
              {["24h", "7d", "30d"].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "4px 10px", border: 0, borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                    background: period === p ? "var(--bg-elevated)" : "transparent",
                    color: period === p ? "var(--text)" : "var(--text-muted)",
                    boxShadow: period === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >{p}</button>
              ))}
            </div>
            <button className="btn" data-variant="ghost" data-size="sm" onClick={exportCSV}>
              <I.Download size={13}/> Export
            </button>
            {emailLinked ? (
              <button className="btn" data-variant="primary" onClick={handleSync} disabled={syncing}>
                <I.RefreshCw size={14} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
                {syncing ? "Syncing…" : "Sync emails"}
              </button>
            ) : (
              <button className="btn" data-variant="primary" onClick={() => navigate("/link-email")}>
                <I.AtSign size={14}/> Link your email
              </button>
            )}
          </div>
        }
      />

      <div className="page-body">
        <h1 className="page-title">Welcome back, {userName}</h1>
        <p className="page-sub">{syncMessage || `Showing data for the last ${period === "24h" ? "24 hours" : period === "7d" ? "7 days" : "30 days"}`}</p>

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

        {/* KPI tiles */}
        <div className="kpi-grid">
          <Kpi label={<><I.Mail size={11}/> Total emails</>} value={total} spark={sparkData} sparkColor="var(--accent)" />
          <Kpi label={<><I.Lock size={11}/> Quarantined</>} value={quarantined} spark={sparkData.map((_, i) => emails.filter(e => e.is_quarantined && (() => { const d = new Date(e.date_received); const now = new Date(); const day = new Date(now); day.setDate(now.getDate() - (6 - i)); day.setHours(0,0,0,0); const next = new Date(day); next.setDate(day.getDate()+1); return d >= day && d < next; })()).length)} sparkColor="var(--sev-high)" />
          <Kpi label={<><I.AlertTriangle size={11}/> High risk</>} value={highRisk} spark={sparkData} sparkColor="var(--sev-critical)" />
          <Kpi label={<><I.Check size={11}/> Marked safe</>} value={safe} spark={sparkData} sparkColor="var(--sev-low)" />
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "var(--gap-card)", marginTop: "var(--gap-card)" }}>
          <Card title={<><I.Activity size={14}/> Threats over time</>}>
            {loading ? (
              <div className="empty" style={{ minHeight: 100 }}><div>Loading…</div></div>
            ) : (
              <ThreatsChart emails={periodEmails} period={period} />
            )}
          </Card>

          <Card title={<><I.TrendingUp size={14}/> Risk distribution</>}>
            {loading ? (
              <div className="empty" style={{ minHeight: 100 }}><div>Loading…</div></div>
            ) : (
              <TopRiskFactors emails={periodEmails} />
            )}
          </Card>
        </div>

        {/* Recent quarantined */}
        <div style={{ marginTop: "var(--gap-card)" }}>
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
                    <tr key={e.id} onClick={() => navigate(`/email/${e.id}`)} style={{ cursor: "pointer" }}>
                      <td className="cell-sender"><div className="name">{e.sender}</div></td>
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
                      <td className="cell-actions"><I.ChevronRight size={14} style={{ color: "var(--text-faint)" }}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Live activity feed */}
        <div style={{ marginTop: "var(--gap-card)" }}>
          <Card
            title={<><I.Activity size={14}/> Live activity feed</>}
            action={
              <button className="btn" data-variant="ghost" data-size="sm" onClick={() => navigate("/audit-log")}>
                View all <I.ChevronRight size={12}/>
              </button>
            }
          >
            {auditLogs.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No activity yet. Actions you take will appear here.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {auditLogs.map(log => {
                  const toneMap = { info: "low", warning: "medium", critical: "critical" };
                  const tone = toneMap[log.severity] || "low";
                  const labelMap = {
                    login_success: "Logged in", login_failed: "Login failed",
                    user_registered: "Account created", email_linked: "Mailbox linked",
                    email_relinked: "Mailbox updated", email_unlinked: "Mailbox unlinked",
                    email_sync: "Emails synced", sync_error: "Sync error",
                    email_released: "Email released", email_deleted: "Email deleted",
                    feedback_submitted: "Feedback submitted", sensitivity_updated: "Sensitivity changed",
                    password_changed: "Password changed", account_deleted: "Account deleted",
                  };
                  return (
                    <div key={log.id} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                        background: `var(--sev-${tone})`,
                      }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{labelMap[log.action] || log.action}</div>
                        {log.detail && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{log.detail}</div>}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-faint)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

export default DashboardPage;

