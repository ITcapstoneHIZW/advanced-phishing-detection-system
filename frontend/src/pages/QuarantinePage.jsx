import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getEmails } from "../api/emailService";

function QuarantinePage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
    loadEmails();
  }, []);

  const getRiskLabel = (score) => {
    if (score >= 7) return "High";
    if (score >= 4) return "Medium";
    return "Low";
  };

  return (
    <div style={pageWrapper}>
      <Navbar />

      <div style={contentWrapper}>
        <h1 style={pageTitle}>Quarantine Emails</h1>
        <p style={pageSubtitle}>
          Review suspicious emails that have been flagged by the system.
        </p>

        {loading ? (
          <div style={spinnerWrapper}>
            <div style={spinnerStyle} />
            <p style={{ color: "#64748b", marginTop: "16px" }}>Loading quarantine list...</p>
          </div>
        ) : error ? (
          <div style={errorCard}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
          </div>
        ) : (
          <div style={sectionCard}>
            {emails.length === 0 ? (
              <p style={{ color: "#64748b" }}>No emails found. Try syncing from the Dashboard.</p>
            ) : (
              <div style={tableWrapper}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Sender</th>
                      <th style={thStyle}>Subject</th>
                      <th style={thStyle}>Risk</th>
                      <th style={thStyle}>Verdict</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((email) => {
                      const riskLabel = getRiskLabel(email.risk_score);
                      return (
                        <tr key={email.id}>
                          <td style={tdStyle}>{email.sender}</td>
                          <td style={tdStyle}>{email.subject}</td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                ...riskBadgeStyle,
                                background: riskLabel === "High" ? "#fee2e2" : riskLabel === "Medium" ? "#fef3c7" : "#dcfce7",
                                color: riskLabel === "High" ? "#b91c1c" : riskLabel === "Medium" ? "#92400e" : "#166534",
                              }}
                            >
                              {riskLabel} ({email.risk_score})
                            </span>
                          </td>
                          <td style={tdStyle}>{email.verdict}</td>
                          <td style={tdStyle}>{email.date_received}</td>
                          <td style={tdStyle}>
                            <Link to={`/email/${email.id}`} style={viewButtonStyle}>
                              View Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const pageWrapper = { minHeight: "100vh", background: "#f8fafc" };
const contentWrapper = { padding: "24px", maxWidth: "1200px", margin: "0 auto" };
const pageTitle = { marginBottom: "8px", color: "#0f172a" };
const pageSubtitle = { marginTop: 0, marginBottom: "20px", color: "#64748b" };
const sectionCard = { background: "white", borderRadius: "14px", padding: "20px", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)", border: "1px solid #e2e8f0" };
const tableWrapper = { overflowX: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { textAlign: "left", padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#334155", fontSize: "14px" };
const tdStyle = { padding: "12px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#334155", verticalAlign: "middle" };
const riskBadgeStyle = { display: "inline-block", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" };
const viewButtonStyle = { background: "#0f172a", color: "white", textDecoration: "none", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", display: "inline-block" };
const spinnerWrapper = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" };
const spinnerStyle = { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const errorCard = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", color: "#b91c1c" };

export default QuarantinePage;
