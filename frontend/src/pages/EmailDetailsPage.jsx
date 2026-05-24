import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getEmailById } from "../api/emailService";

function EmailDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const getRiskLabel = (score) => {
    if (score >= 7) return "High";
    if (score >= 4) return "Medium";
    return "Low";
  };

  return (
    <div style={pageWrapper}>
      <Navbar />

      <div style={contentWrapper}>
        <div style={topRow}>
          <div>
            <h1 style={pageTitle}>Email Details</h1>
            <p style={pageSubtitle}>Review email content and actions</p>
          </div>
          <button onClick={() => navigate("/quarantine")} style={backButtonStyle}>
            Back to Quarantine
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
            <h2>Email Not Found</h2>
            <button onClick={() => navigate("/quarantine")} style={backButtonStyle}>
              Back to Quarantine
            </button>
          </div>
        ) : (
          <div style={sectionCard}>
            <div style={detailGrid}>
              <div style={detailItem}>
                <p style={detailLabel}>Sender</p>
                <p style={detailValue}>{email.sender}</p>
              </div>
              <div style={detailItem}>
                <p style={detailLabel}>Risk Level</p>
                <p style={detailValue}>{getRiskLabel(email.risk_score)} ({email.risk_score}/10)</p>
              </div>
              <div style={detailItem}>
                <p style={detailLabel}>Verdict</p>
                <p style={{
                  ...detailValue,
                  color: email.verdict === "Phishing" ? "#b91c1c" : email.verdict === "Suspicious" ? "#92400e" : "#166534"
                }}>{email.verdict}</p>
              </div>
              <div style={detailItem}>
                <p style={detailLabel}>Date Received</p>
                <p style={detailValue}>{email.date_received}</p>
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <p style={detailLabel}>Subject</p>
              <p style={subjectBoxStyle}>{email.subject}</p>
            </div>

            <div style={{ marginTop: "20px" }}>
              <p style={detailLabel}>Status</p>
              <p style={subjectBoxStyle}>{email.is_quarantined ? "🔒 Quarantined" : "✅ Not Quarantined"}</p>
            </div>

            <div style={buttonRow}>
              <button onClick={() => alert("Email marked as safe.")} style={safeButtonStyle}>
                Mark as Safe
              </button>
              <button onClick={() => { alert("Email deleted."); navigate("/quarantine"); }} style={deleteButtonStyle}>
                Delete
              </button>
            </div>
          </div>
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
const sectionCard = { background: "white", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)", border: "1px solid #e2e8f0" };
const detailGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" };
const detailItem = { background: "#f8fafc", borderRadius: "10px", padding: "14px", border: "1px solid #e2e8f0" };
const detailLabel = { margin: 0, fontSize: "13px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em" };
const detailValue = { margin: "8px 0 0 0", color: "#0f172a", fontWeight: "600" };
const subjectBoxStyle = { marginTop: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "10px", color: "#0f172a", fontWeight: "600" };
const buttonRow = { marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" };
const safeButtonStyle = { background: "#16a34a", color: "white", border: "none", padding: "12px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const deleteButtonStyle = { background: "#dc2626", color: "white", border: "none", padding: "12px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const spinnerWrapper = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" };
const spinnerStyle = { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const errorCard = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", color: "#b91c1c" };

export default EmailDetailsPage;
