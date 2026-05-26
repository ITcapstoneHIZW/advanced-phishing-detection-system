import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Card, Sev, PageHeader, riskLabel } from "../components/Ui";
import { getEmailById, releaseEmail, deleteEmail, submitFeedback } from "../api/emailService";

function EmailDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getEmailById(id);
        setEmail(data);
      } catch {
        setError("Could not load email details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleRelease = async () => {
    if (!window.confirm("Release this email from quarantine?")) return;
    try {
      setActionLoading("release");
      await releaseEmail(id);
      setSuccess("Email released from quarantine.");
      setEmail(prev => ({ ...prev, is_quarantined: false }));
    } catch {
      setError("Failed to release email.");
    } finally { setActionLoading(""); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this email? This cannot be undone.")) return;
    try {
      setActionLoading("delete");
      await deleteEmail(id);
      navigate("/quarantine");
    } catch {
      setError("Failed to delete email.");
      setActionLoading("");
    }
  };

  const handleFeedback = async (verdict) => {
    if (!window.confirm(`Mark this email as ${verdict}?`)) return;
    try {
      setActionLoading(verdict);
      await submitFeedback(id, verdict);
      setSuccess(`Email marked as ${verdict}.`);
      setEmail(prev => ({ ...prev, verdict }));
    } catch {
      setError("Failed to submit feedback.");
    } finally { setActionLoading(""); }
  };

  return (
    <>
      <PageHeader
        crumbs={["Quarantine", id]}
        actions={
          <button className="btn" data-variant="ghost" onClick={() => navigate("/quarantine")}>
            <I.CornerUpLeft size={14} /> Back to Quarantine
          </button>
        }
      />

      <div className="page-body">
        <h1 className="page-title">Email details</h1>
        <p className="page-sub">Review email content and take action.</p>

        {success && (
          <div style={{ padding: "12px 16px", background: "var(--sev-low-bg)", border: "1px solid var(--sev-low)", borderRadius: "var(--r-md)", color: "var(--sev-low)", fontSize: 13, marginBottom: 14, fontWeight: 500 }}>{success}</div>
        )}
        {error && (
          <div style={{ padding: "12px 16px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", color: "var(--sev-critical)", fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        {loading ? (
          <Card><div className="empty"><div>Loading email…</div></div></Card>
        ) : !email ? (
          <Card><div className="empty"><div>Email not found.</div></div></Card>
        ) : (
          <>
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                <div>
                  <div className="meta-label">Sender</div>
                  <div className="meta-value">{email.sender}</div>
                </div>
                <div>
                  <div className="meta-label">Date received</div>
                  <div className="meta-value mono" style={{ fontSize: 13 }}>{email.date_received}</div>
                </div>
                <div>
                  <div className="meta-label">Risk level</div>
                  <div style={{ marginTop: 6 }}>
                    {email.risk_score != null
                      ? <Sev score={email.risk_score} label={`${riskLabel(email.risk_score)} (${Number(email.risk_score).toFixed(1)}/10)`} />
                      : <span className="muted">N/A</span>}
                  </div>
                </div>
                <div>
                  <div className="meta-label">Verdict</div>
                  <div className="meta-value" style={{
                    color: email.verdict === "Phishing" ? "var(--sev-critical)"
                         : email.verdict === "Suspicious" ? "var(--sev-medium)"
                         : "var(--sev-low)"
                  }}>{email.verdict || "N/A"}</div>
                </div>
                <div>
                  <div className="meta-label">Status</div>
                  <div className="meta-value row" style={{ gap: 6 }}>
                    {email.is_quarantined
                      ? <><I.Lock size={13} style={{ color: "var(--sev-high)" }}/> Quarantined</>
                      : <><I.Check size={13} style={{ color: "var(--sev-low)" }}/> Released</>}
                  </div>
                </div>
              </div>
            </Card>

            <div style={{ marginTop: "var(--gap-card)" }}>
              <Card title="Subject">
                <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: "var(--text)" }}>{email.subject}</p>
              </Card>
            </div>

            {email.body && (
              <div style={{ marginTop: "var(--gap-card)" }}>
                <Card title="Message body">
                  <div className="email-body">{email.body}</div>
                </Card>
              </div>
            )}

            <div style={{ marginTop: "var(--gap-card)" }}>
              <Card title="Actions">
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {email.is_quarantined && (
                    <button className="btn" data-variant="primary" disabled={!!actionLoading} onClick={handleRelease}>
                      <I.CornerUpRight size={13} /> {actionLoading === "release" ? "Releasing…" : "Release from quarantine"}
                    </button>
                  )}
                  <button className="btn" data-variant="success" disabled={!!actionLoading} onClick={() => handleFeedback("Safe")}>
                    <I.Check size={13} /> {actionLoading === "Safe" ? "Saving…" : "Mark as Safe"}
                  </button>
                  <button className="btn" data-variant="danger" disabled={!!actionLoading} onClick={() => handleFeedback("Phishing")}>
                    <I.ShieldAlert size={13} /> {actionLoading === "Phishing" ? "Saving…" : "Mark as Phishing"}
                  </button>
                  <button className="btn" data-variant="ghost" style={{ color: "var(--sev-critical)" }} disabled={!!actionLoading} onClick={handleDelete}>
                    <I.Trash size={13} /> {actionLoading === "delete" ? "Deleting…" : "Delete email"}
                  </button>
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                  <I.Info size={11} style={{ verticalAlign: -1, marginRight: 4 }}/>
                  Your feedback helps improve the classifier on the next retraining cycle.
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default EmailDetailsPage;
