import BASE_URL from "../api/config";
import React, { useState, useEffect } from "react";
import I from "../components/Icons";
import { Card, PageHeader } from "../components/Ui";

const PAGE_SIZE = 50;

const ACTION_META = {
  login_success:       { label: "Login",                icon: "User",         tone: "low" },
  login_failed:        { label: "Login failed",         icon: "AlertTriangle", tone: "critical" },
  user_registered:     { label: "Registered",           icon: "User",         tone: "low" },
  email_linked:        { label: "Mailbox linked",       icon: "AtSign",       tone: "low" },
  email_relinked:      { label: "Mailbox updated",      icon: "AtSign",       tone: "medium" },
  email_unlinked:      { label: "Mailbox unlinked",     icon: "AtSign",       tone: "medium" },
  email_sync:          { label: "Email sync",           icon: "RefreshCw",    tone: "low" },
  sync_error:          { label: "Sync error",           icon: "AlertTriangle", tone: "high" },
  email_released:      { label: "Email released",       icon: "CornerUpRight", tone: "medium" },
  email_deleted:       { label: "Email deleted",        icon: "Trash",        tone: "high" },
  feedback_submitted:  { label: "Feedback submitted",   icon: "Check",        tone: "low" },
  sensitivity_updated: { label: "Sensitivity changed",  icon: "Sliders",      tone: "high" },
  password_changed:    { label: "Password changed",     icon: "Lock",         tone: "high" },
  account_deleted:     { label: "Account deleted",      icon: "Trash",        tone: "critical" },
};

function severityTone(sev) {
  return { info: "low", warning: "medium", critical: "critical" }[sev] || "low";
}

function ActionIcon({ action, tone }) {
  const iconName = ACTION_META[action]?.icon || "Activity";
  const IconComp = I[iconName] || I.Activity;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "var(--r-md)", flexShrink: 0,
      background: `var(--sev-${tone}-bg)`,
      display: "grid", placeItems: "center", color: `var(--sev-${tone})`,
    }}>
      <IconComp size={13}/>
    </div>
  );
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch { return ts; }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const fetchLogs = async (pg = 1) => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("access_token");
      const offset = (pg - 1) * PAGE_SIZE;
      const res = await fetch(`${BASE_URL}/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError("Could not connect to backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  const filtered = logs.filter(log => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (log.action || "").toLowerCase().includes(q) ||
      (log.detail || "").toLowerCase().includes(q) ||
      (log.entity_type || "").toLowerCase().includes(q);
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCSV = () => {
    const rows = [["ID", "Action", "Actor", "Entity Type", "Entity ID", "Detail", "Severity", "Timestamp"]];
    filtered.forEach(l => rows.push([l.id, l.action, l.user_email, l.entity_type, l.entity_id, l.detail, l.severity, l.timestamp]));
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "audit-log.csv"; a.click();
  };

  return (
    <>
      <PageHeader
        crumbs={["Audit Log"]}
        actions={
          <button className="btn" data-variant="ghost" data-size="sm" onClick={exportCSV}>
            <I.Download size={13}/> Export CSV
          </button>
        }
      />

      <div className="page-body">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-sub">Complete record of all system and user actions — {total} total events.</p>

        {error && (
          <div style={{ padding: "14px 18px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", marginBottom: 20, color: "var(--sev-critical)", fontSize: 13.5 }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div className="input" style={{ flex: "1 1 220px", minWidth: 180 }}>
            <I.Search size={13}/>
            <input
              type="text"
              placeholder="Search action, detail…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "transparent", border: 0, color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
                <I.X size={13}/>
              </button>
            )}
          </div>

          {/* Severity filter */}
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "info", "warning", "critical"].map(s => (
              <button
                key={s}
                className="btn"
                data-size="sm"
                data-variant={severityFilter === s ? "primary" : "ghost"}
                onClick={() => setSeverityFilter(s)}
                style={severityFilter === s && s !== "all" ? { background: `var(--sev-${severityTone(s)}-bg)`, color: `var(--sev-${severityTone(s)})`, border: `1px solid var(--sev-${severityTone(s)})` } : {}}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Card padded={false}>
          {loading ? (
            <div className="empty"><div>Loading audit log…</div></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <I.FileText size={36}/>
              <div className="empty-title">No log entries found</div>
              <div>Actions you take will appear here.</div>
            </div>
          ) : (
            <>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Action</th>
                    <th>Detail</th>
                    <th>Entity</th>
                    <th>Severity</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => {
                    const meta = ACTION_META[log.action];
                    const tone = meta?.tone || severityTone(log.severity);
                    return (
                      <tr key={log.id}>
                        <td><ActionIcon action={log.action} tone={tone} /></td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>
                            {meta?.label || log.action}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {log.action}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                            {log.user_email || "—"}
                          </div>
                        </td>
                        <td style={{ maxWidth: 280, color: "var(--text-secondary)", fontSize: 13 }}>
                          {log.detail || "—"}
                        </td>
                        <td>
                          {log.entity_type && (
                            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                              {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="sev" data-level={severityTone(log.severity)}>
                            <span className="sev-dot" style={{ background: `var(--sev-${severityTone(log.severity)})` }}></span>
                            {log.severity}
                          </span>
                        </td>
                        <td className="cell-date" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                          {formatTimestamp(log.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--border-faint)", fontSize: 13, color: "var(--text-muted)" }}>
                  <span>{total} total · page {page} of {totalPages}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn" data-size="sm" data-variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <I.ChevronRight size={13} style={{ transform: "rotate(180deg)" }}/> Prev
                    </button>
                    <button className="btn" data-size="sm" data-variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      Next <I.ChevronRight size={13}/>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
