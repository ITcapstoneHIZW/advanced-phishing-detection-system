import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getEmailById, releaseEmail, deleteEmail, submitFeedback } from "../api/emailService";

function EmailDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadEmail = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getEmailById(id);
        setEmail(data);
      } catch (err) {
        setError("Could not load email details.");
      } finally {
        setLoading(false);
      }
    };
    loadEmail();
  }, [id]);

  const handleRelease = async () => {
    if (!window.confirm("Release this email from quarantine?")) return;
    try {
      setActionLoading("release");
      await releaseEmail(id);
      setSuccessMessage("✅ Email released from quarantine.");
      setEmail((prev) => ({ ...prev, is_quarantined: false }));
    } catch (err) {
      setError("Failed to release email.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this email? This cannot be undone.")) return;
    try {
      setActionLoading("delete");
      await deleteEmail(id);
      navigate("/quarantine");
    } catch (err) {
      setError("Failed to delete email.");
      setActionLoading("");
    }
  };

  const handleFeedback = async (verdict) => {
    if (!window.confirm(`Mark this email as ${verdict}?`)) return;
    try {
      setActionLoading(verdict);
      await submitFeedback(id, verdict);
      setSuccessMessage(`✅ Email marked as ${verdict}.`);
      setEmail((prev) => ({ ...prev, verdict }));
    } catch (err) {
      setError("Failed to submit feedback.");
    } finally {
      setActionLoading("");
    }
  };

  const getRiskLabel = (score) => {
    if (score >= 7) return { label: "High", color: "#b91c1c", bg: "#fee2e2" };
    if (score >= 4) return { label: "Medium", color: "#92400e", bg: "#fef3c7" };
    return { label: "Low", color: "#166534", bg: "#dcfce7" };
  };

  return (
    <div style={pageWrapper}>
      <Navbar />

      <div style={contentWrapper}>
        <div style={topRow}>
          <div>
            <h1 style={pageTitle}>Email Details</h1>
            <p style={pageSubtitle}>Review email content and take action</p>
          </div>
          <button onClick={() => navigate("/quarantine")} style={backButtonStyle}>
            ← Back to Quarantine
          </button>
        </div>

        {loading ? (
          <div style={spinnerWrapper}>
            <div style={spinnerStyle} />
            <p style={{ color: "#64748b", marginTop: "16px" }}>Loading email...</p>
          </div>
        ) : error ? (
          <div style={errorCard}><p style={{ margin: 0 }}>⚠️ {error}</p></div>
        ) : !email ? (
          <div style={sectionCard}>
            <p>Email not found.</p>
            <button onClick={() => navigate("/quarantine")} style={backButtonStyle}>
              Back to Quarantine
            </button>
          </div>
        ) : (
          <>
            {successMessage && (
              <div style={successCard}>
                <p style={{ margin: 0 }}>{successMessage}</p>
              </div>
            )}

            {/* Email metadata */}
            <div style={sectionCard}>
              <div style={detailGrid}>
                <div style={detailItem}>
                  <p style={detailLabel}>Sender</p>
                  <p style={detailValue}>{email.sender}</p>
                </div>
                <div style={detailItem}>
                  <p style={detailLabel}>Date Received</p>
                  <p style={detailValue}>{email.date_received}</p>
                </div>
                <div style={detailItem}>
                  <p style={detailLabel}>Risk Level</p>
                  {email.risk_score != null ? (
                    <span style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      borderRadius: "999px",
                      background: getRiskLabel(email.risk_score).bg,
                      color: getRiskLabel(email.risk_score).color,
                      fontWeight: "700",
                      fontSize: "14px",
                      marginTop: "8px"
                    }}>
                      {getRiskLabel(email.risk_score).label} ({email.risk_score}/10)
                    </span>
                  ) : <p style={detailValue}>N/A</p>}
                </div>
                <div style={detailItem}>
                  <p style={detailLabel}>Verdict</p>
                  <p style={{
                    ...detailValue,
                    color: email.verdict === "Phishing" ? "#b91c1c" : email.verdict === "Suspicious" ? "#92400e" : "#166534"
                  }}>{email.verdict || "N/A"}</p>
                </div>
                <div style={detailItem}>
                  <p style={detailLabel}>Status</p>
                  <p style={detailValue}>{email.is_quarantined ? "🔒 Quarantined" : "✅ Released"}</p>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div style={sectionCard}>
              <p style={detailLabel}>Subject</p>
              <p style={subjectBoxStyle}>{email.subject}</p>
            </div>

            {/* Email body */}
            {email.body && (
              <div style={sectionCard}>
                <p style={detailLabel}>Email Body</p>
                <div style={bodyBoxStyle}>{email.body}</div>
              </div>
            )}

            {/* Actions */}
            <div style={sectionCard}>
              <p style={detailLabel}>Actions</p>
              <div style={buttonRow}>
                {email.is_quarantined && (
                  <button
                    onClick={handleRelease}
                    disabled={!!actionLoading}
                    style={releaseButtonStyle}
                  >
                    {actionLoading === "release" ? "Releasing..." : "✅ Release from Quarantine"}
                  </button>
                )}
                <button
                  onClick={() => handleFeedback("Safe")}
                  disabled={!!actionLoading}
                  style={safeButtonStyle}
                >
                  {actionLoading === "Safe" ? "Saving..." : "👍 Mark as Safe"}
                </button>
                <button
                  onClick={() => handleFeedback("Phishing")}
                  disabled={!!actionLoading}
                  style={phishingButtonStyle}
                >
                  {actionLoading === "Phishing" ? "Saving..." : "🎣 Mark as Phishing"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!!actionLoading}
                  style={deleteButtonStyle}
                >
                  {actionLoading === "delete" ? "Deleting..." : "🗑️ Delete Email"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const pageWrapper = { minHeight: "100vh", background: "#f8fafc" };
const contentWrapper = { padding: "24px", maxWidth: "1000px", margin: "0 auto" };
const topRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "20px" };
const pageTitle = { margin: 0, color: "#0f172a" };
const pageSubtitle = { marginTop: "8px", color: "#64748b" };
const backButtonStyle = { background: "#e2e8f0", color: "#0f172a", border: "none", padding: "12px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" };
const sectionCard = { background: "white", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)", border: "1px solid #e2e8f0", marginBottom: "16px" };
const detailGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" };
const detailItem = { background: "#f8fafc", borderRadius: "10px", padding: "14px", border: "1px solid #e2e8f0" };
const detailLabel = { margin: 0, fontSize: "13px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em" };
const detailValue = { margin: "8px 0 0 0", color: "#0f172a", fontWeight: "600" };
const subjectBoxStyle = { marginTop: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "10px", color: "#0f172a", fontWeight: "600" };
const bodyBoxStyle = { marginTop: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "10px", color: "#334155", whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6", maxHeight: "400px", overflowY: "auto" };
const buttonRow = { display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" };
const releaseButtonStyle = { background: "#2563eb", color: "white", border: "none", padding: "12px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const safeButtonStyle = { background: "#16a34a", color: "white", border: "none", padding: "12px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const phishingButtonStyle = { background: "#ea580c", color: "white", border: "none", padding: "12px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const deleteButtonStyle = { background: "#dc2626", color: "white", border: "none", padding: "12px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const spinnerWrapper = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" };
const spinnerStyle = { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const errorCard = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", color: "#b91c1c", marginBottom: "16px" };
const successCard = { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", color: "#166534", marginBottom: "16px" };

export default EmailDetailsPage;