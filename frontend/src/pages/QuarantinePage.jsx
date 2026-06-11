import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Card, RiskBar, PageHeader, Seg, Chip, ConfirmModal } from "../components/Ui";
import { getEmails, releaseEmail, deleteEmail } from "../api/emailService";

const PAGE_SIZE = 20;

function reasonChips(email) {
  const chips = [];
  if (email.verdict === "Phishing") chips.push({ label: "Phishing", tone: "critical" });
  if (email.verdict === "Suspicious") chips.push({ label: "Suspicious", tone: "high" });
  return chips;
}

function severityLevel(score) {
  if (score == null) return "unknown";
  if (score >= 7) return "critical";   // Phishing
  if (score >= 4) return "high";       // Suspicious
  return "low";                        // Safe
}

function QuarantinePage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  // Bulk select
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

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

  useEffect(() => { loadEmails(); }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, severity, status]);

  // Filter logic
  const filtered = emails.filter(e => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (e.sender || "").toLowerCase().includes(q) ||
      (e.subject || "").toLowerCase().includes(q) ||
      (e.sender || "").toLowerCase().split("@")[1]?.includes(q);

    const matchesSeverity = severity === "all" || severityLevel(e.risk_score) === severity;

    const matchesStatus =
      status === "all" ? true :
      status === "quarantined" ? e.is_quarantined :
      !e.is_quarantined;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Select helpers
  const allPageSelected = paginated.length > 0 && paginated.every(e => selected.has(e.id));
  const toggleAll = () => {
    if (allPageSelected) {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(e => s.delete(e.id)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(e => s.add(e.id)); return s; });
    }
  };
  const toggleOne = (id) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  // Bulk actions
  const bulkRelease = async () => {
    setBulkLoading(true);
    let count = 0;
    for (const id of selected) {
      try { await releaseEmail(id); count++; } catch {}
    }
    setSelected(new Set());
    await loadEmails();
    setBulkLoading(false);
    showToast(`Released ${count} email${count !== 1 ? "s" : ""}.`);
  };

  const bulkDelete = () => {
    setConfirm({
      title: `Delete ${selected.size} email${selected.size !== 1 ? "s" : ""}`,
      message: `Permanently delete ${selected.size} selected email${selected.size !== 1 ? "s" : ""}? This cannot be undone.`,
      confirmLabel: "Delete permanently",
      confirmTone: "critical",
      onConfirm: async () => {
        setConfirm(null);
        setBulkLoading(true);
    let count = 0;
    for (const id of selected) {
      try { await deleteEmail(id); count++; } catch {}
    }
    setSelected(new Set());
    await loadEmails();
    setBulkLoading(false);
        showToast(`Deleted ${count} email${count !== 1 ? "s" : ""}.`);
      }
    });
  };

  const exportCSV = () => {
    const rows = [["ID", "Sender", "Subject", "Risk Score", "Verdict", "Quarantined", "Date"]];
    filtered.forEach(e => rows.push([e.id, e.sender, e.subject, e.risk_score, e.verdict, e.is_quarantined, e.date_received]));
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "quarantine.csv"; a.click();
  };

  return (
    <>
      <PageHeader
        crumbs={["Quarantine"]}
        actions={
          <button className="btn" data-variant="ghost" data-size="sm" onClick={exportCSV}>
            <I.Download size={13}/> Export CSV
          </button>
        }
      />

      <div className="page-body">
        <h1 className="page-title">Quarantine</h1>
        <p className="page-sub">Review all emails processed by the system — {filtered.length} result{filtered.length !== 1 ? "s" : ""}.</p>

        {error && (
          <div style={{ padding: "14px 18px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", marginBottom: 20, color: "var(--sev-critical)", fontSize: 13.5 }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div className="input" style={{ flex: "1 1 220px", minWidth: 180 }}>
            <I.Search size={13}/>
            <input
              type="text"
              placeholder="Search sender, subject, domain…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "transparent", border: 0, color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
                <I.X size={13}/>
              </button>
            )}
          </div>

          {/* Severity */}
          <Seg
            value={severity}
            onChange={setSeverity}
            options={[
              { value: "all", label: "All severity" },
              { value: "critical", label: "Phishing" },
              { value: "high", label: "Suspicious" },
              { value: "low", label: "Safe" },
            ]}
          />

          {/* Status */}
          <Seg
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "quarantined", label: "Quarantined" },
              { value: "released", label: "Released" },
            ]}
          />
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: "var(--r-md)", marginBottom: 12, fontSize: 13 }}>
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>{selected.size} selected</span>
            <button className="btn" data-size="sm" data-variant="ghost" onClick={bulkRelease} disabled={bulkLoading}>
              <I.Check size={13}/> Release
            </button>
            <button className="btn" data-size="sm" data-variant="ghost" onClick={bulkDelete} disabled={bulkLoading} style={{ color: "var(--sev-critical)" }}>
              <I.Trash size={13}/> Delete
            </button>
            <button className="btn" data-size="sm" data-variant="ghost" onClick={() => setSelected(new Set())} style={{ marginLeft: "auto" }}>
              <I.X size={13}/> Clear
            </button>
          </div>
        )}

        <Card padded={false}>
          {loading ? (
            <div className="empty"><div>Loading emails…</div></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <I.ShieldCheck size={36}/>
              <div className="empty-title">No emails match your filters</div>
              <div>Try adjusting the search or filter controls above.</div>
            </div>
          ) : (
            <>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={allPageSelected} onChange={toggleAll} />
                    </th>
                    <th>Sender</th>
                    <th>Subject</th>
                    <th>Flags</th>
                    <th>Risk</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(e => (
                    <tr key={e.id} onClick={() => navigate(`/email/${e.id}`)} style={{ cursor: "pointer" }}>
                      <td onClick={ev => ev.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleOne(e.id)} />
                      </td>
                      <td className="cell-sender">
                        <div className="name">{e.sender}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                          {(e.sender || "").split("@")[1] || ""}
                        </div>
                      </td>
                      <td className="cell-subject" title={e.subject}>{e.subject}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {reasonChips(e).map((c, i) => (
                            <span key={i} className="sev" data-level={c.tone}>
                              <span className="sev-dot" style={{ background: `var(--sev-${c.tone})` }}></span>
                              {c.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{e.risk_score != null ? <RiskBar score={e.risk_score} /> : <span className="muted">—</span>}</td>
                      <td>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: "2px 8px",
                          borderRadius: "var(--r-sm)",
                          background: e.is_quarantined ? "var(--sev-critical-bg)" : "var(--sev-low-bg)",
                          color: e.is_quarantined ? "var(--sev-critical)" : "var(--sev-low)",
                        }}>
                          {e.is_quarantined ? "Quarantined" : "Released"}
                        </span>
                      </td>
                      <td className="cell-date">{e.date_received}</td>
                      <td className="cell-actions">
                        <button className="btn" data-size="sm" data-variant="ghost" onClick={ev => { ev.stopPropagation(); navigate(`/email/${e.id}`); }}>
                          View <I.ChevronRight size={12}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--border-faint)", fontSize: 13, color: "var(--text-muted)" }}>
                  <span>{filtered.length} total · page {page} of {totalPages}</span>
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

      <ConfirmModal
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        confirmTone={confirm?.confirmTone}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          background: "var(--text)", color: "var(--bg-elevated)",
          padding: "10px 16px", borderRadius: "var(--r-md)", fontSize: 13,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontWeight: 500,
        }}>
          {toast}
        </div>
      )}
    </>
  );
}

export default QuarantinePage;
