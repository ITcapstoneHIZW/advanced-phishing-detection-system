import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Card, RiskBar, PageHeader } from "../components/Ui";
import { getEmails } from "../api/emailService";

function QuarantinePage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  return (
    <>
      <PageHeader crumbs={["Quarantine"]} />

      <div className="page-body">
        <h1 className="page-title">Quarantine</h1>
        <p className="page-sub">Review suspicious emails that have been flagged by the system.</p>

        {error && (
          <div style={{ padding: "14px 18px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", marginBottom: 20, color: "var(--sev-critical)", fontSize: 13.5 }}>
            {error}
          </div>
        )}

        <Card padded={false}>
          {loading ? (
            <div className="empty"><div>Loading quarantine list…</div></div>
          ) : emails.length === 0 ? (
            <div className="empty">
              <I.ShieldCheck size={36}/>
              <div className="empty-title">No emails found</div>
              <div>Try syncing from the Dashboard.</div>
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
                {emails.map(e => (
                  <tr key={e.id} onClick={() => navigate(`/email/${e.id}`)}>
                    <td className="cell-sender">
                      <div className="name">{e.sender}</div>
                    </td>
                    <td className="cell-subject" title={e.subject}>{e.subject}</td>
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
                      <button className="btn" data-size="sm" data-variant="ghost" onClick={(ev) => { ev.stopPropagation(); navigate(`/email/${e.id}`); }}>
                        View details <I.ChevronRight size={12}/>
                      </button>
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

export default QuarantinePage;
