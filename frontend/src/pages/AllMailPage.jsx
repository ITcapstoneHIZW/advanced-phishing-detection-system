import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Card, RiskBar, PageHeader, Seg } from "../components/Ui";
import { getEmails } from "../api/emailService";

const PAGE_SIZE = 25;

function AllMailPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [verdict, setVerdict] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getEmails();
        setEmails(data);
      } catch {
        setError("Could not connect to backend. Make sure the server is running.");
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { setPage(1); }, [search, verdict]);

  const filtered = emails.filter(e => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (e.sender || "").toLowerCase().includes(q) ||
      (e.subject || "").toLowerCase().includes(q);
    const matchesVerdict =
      verdict === "all" ? true :
      verdict === "phishing" ? e.verdict === "Phishing" :
      verdict === "suspicious" ? e.verdict === "Suspicious" :
      verdict === "safe" ? e.verdict === "Safe" :
      verdict === "quarantined" ? e.is_quarantined :
      true;
    return matchesSearch && matchesVerdict;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const rows = [["ID", "Sender", "Subject", "Risk Score", "Verdict", "Quarantined", "Date"]];
    filtered.forEach(e => rows.push([e.id, e.sender, e.subject, e.risk_score, e.verdict, e.is_quarantined, e.date_received]));
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "all-mail.csv"; a.click();
  };

  return (
    <>
      <PageHeader
        crumbs={["All Mail"]}
        actions={
          <button className="btn" data-variant="ghost" data-size="sm" onClick={exportCSV}>
            <I.Download size={13}/> Export CSV
          </button>
        }
      />

      <div className="page-body">
        <h1 className="page-title">All Mail</h1>
        <p className="page-sub">Every email processed by the system — {filtered.length} result{filtered.length !== 1 ? "s" : ""}.</p>

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
              placeholder="Search sender or subject…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "transparent", border: 0, color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
                <I.X size={13}/>
              </button>
            )}
          </div>
          <Seg
            value={verdict}
            onChange={setVerdict}
            options={[
              { value: "all",        label: "All" },
              { value: "phishing",   label: "Phishing" },
              { value: "suspicious", label: "Suspicious" },
              { value: "safe",       label: "Safe" },
              { value: "quarantined",label: "Quarantined" },
            ]}
          />
        </div>

        <Card padded={false}>
          {loading ? (
            <div className="empty"><div>Loading emails…</div></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <I.Mail size={36}/>
              <div className="empty-title">No emails found</div>
              <div>Try adjusting your search or filters.</div>
            </div>
          ) : (
            <>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Subject</th>
                    <th>Risk</th>
                    <th>Verdict</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(e => (
                    <tr key={e.id} onClick={() => navigate(`/email/${e.id}`)} style={{ cursor: "pointer" }}>
                      <td className="cell-sender">
                        <div className="name">{e.sender}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                          {(e.sender || "").split("@")[1] || ""}
                        </div>
                      </td>
                      <td className="cell-subject" title={e.subject}>{e.subject}</td>
                      <td>{e.risk_score != null ? <RiskBar score={e.risk_score} /> : <span className="muted">—</span>}</td>
                      <td>
                        <span style={{
                          fontWeight: 500,
                          color: e.verdict === "Phishing" ? "var(--sev-critical)"
                               : e.verdict === "Suspicious" ? "var(--sev-high)"
                               : "var(--sev-low)"
                        }}>{e.verdict || "—"}</span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 12, fontWeight: 500, padding: "2px 8px",
                          borderRadius: "var(--r-sm)",
                          background: e.is_quarantined ? "var(--sev-critical-bg)" : "var(--sev-low-bg)",
                          color: e.is_quarantined ? "var(--sev-critical)" : "var(--sev-low)",
                        }}>
                          {e.is_quarantined ? "Quarantined" : "Inbox"}
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
    </>
  );
}

export default AllMailPage;
