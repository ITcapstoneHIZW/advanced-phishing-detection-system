import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { getEmails, syncEmails } from "../api/emailService";
import { Link } from "react-router-dom";

function DashboardPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  const userName = localStorage.getItem("userName") || "User";
  const gmailLinked = localStorage.getItem("gmailLinked") === "true";

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

  useEffect(() => {
    loadEmails();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage("");
      const result = await syncEmails();
      setSyncMessage(`✅ Synced ${result.emails_stored} new emails from Gmail.`);
      await loadEmails();
    } catch (err) {
      setSyncMessage("❌ Sync failed. Check that your Gmail account is linked.");
    } finally {
      setSyncing(false);
    }
  };

  const totalEmails = emails.length;
  const quarantinedEmails = emails.filter((e) => e.is_quarantined).length;
  const highRiskEmails = emails.filter((e) => e.risk_score >= 7).length;
  const safeEmails = emails.filter((e) => e.verdict === "Safe").length;
  const recentQuarantined = emails.filter((e) => e.is_quarantined).slice(0, 3);

  return (
    <div style={pageWrapper}>
      <Navbar />

      <div style={contentWrapper}>
        <div style={headerRow}>
          <div>
            <h1 style={pageTitle}>Dashboard</h1>
            <p style={pageSubtitle}>Welcome back, {userName}</p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            {gmailLinked ? (
              <button onClick={handleSync} disabled={syncing} style={syncButtonStyle}>
                {syncing ? "Syncing..." : "Sync Emails from Gmail"}
              </button>
            ) : (
              <Link to="/link-email" style={syncButtonStyle}>
                🔗 Link Your Gmail Account
              </Link>
            )}
            <Link to="/quarantine" style={actionLink}>
              View Quarantine List
            </Link>
          </div>
        </div>

        {!gmailLinked && (
          <div style={warningCard}>
            <p style={{ margin: 0 }}>
              ⚠️ You haven't linked a Gmail account yet.{" "}
              <Link to="/link-email" style={{ color: "#92400e", fontWeight: "700" }}>
                Link it here
              </Link>{" "}
              to start syncing and monitoring your emails.
            </p>
          </div>
        )}

        {syncMessage && <p style={syncMsgStyle}>{syncMessage}</p>}

        {loading ? (
          <div style={spinnerWrapper}>
            <div style={spinnerStyle} />
            <p style={{ color: "#64748b", marginTop: "16px" }}>Loading emails...</p>
          </div>
        ) : error ? (
          <div style={errorCard}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
          </div>
        ) : (
          <>
            <div style={cardGrid}>
              <div style={statCard}>
                <p style={statLabel}>Total Emails</p>
                <h2 style={statValue}>{totalEmails}</h2>
              </div>
              <div style={statCard}>
                <p style={statLabel}>Quarantined</p>
                <h2 style={statValue}>{quarantinedEmails}</h2>
              </div>
              <div style={statCard}>
                <p style={statLabel}>High Risk</p>
                <h2 style={statValue}>{highRiskEmails}</h2>
              </div>
              <div style={statCard}>
                <p style={statLabel}>Marked Safe</p>
                <h2 style={statValue}>{safeEmails}</h2>
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Recent Quarantined Emails</h3>

              {recentQuarantined.length === 0 ? (
                <p style={{ color: "#64748b" }}>
                  {gmailLinked
                    ? "No quarantined emails yet. Try syncing from Gmail."
                    : "Link your Gmail account to start monitoring emails."}
                </p>
              ) : (
                <div style={tableWrapper}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Sender</th>
                        <th style={thStyle}>Subject</th>
                        <th style={thStyle}>Risk Score</th>
                        <th style={thStyle}>Verdict</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentQuarantined.map((email) => (
                        <tr key={email.id}>
                          <td style={tdStyle}>{email.sender}</td>
                          <td style={tdStyle}>{email.subject}</td>
                          <td style={tdStyle}>{email.risk_score}</td>
                          <td style={tdStyle}>{email.verdict}</td>
                          <td style={tdStyle}>{email.date_received}</td>
                          <td style={tdStyle}>
                            <Link to={`/email/${email.id}`} style={smallLinkStyle}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const pageWrapper = { minHeight: "100vh", background: "#f8fafc" };
const contentWrapper = { padding: "24px", maxWidth: "1200px", margin: "0 auto" };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "24px" };
const pageTitle = { margin: 0, color: "#0f172a" };
const pageSubtitle = { marginTop: "8px", color: "#64748b" };
const actionLink = { background: "#0f172a", color: "white", textDecoration: "none", padding: "12px 16px", borderRadius: "10px", fontWeight: "600" };
const syncButtonStyle = { background: "#2563eb", color: "white", border: "none", padding: "12px 16px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", textDecoration: "none", display: "inline-block" };
const syncMsgStyle = { marginBottom: "16px", color: "#334155", fontWeight: "500" };
const warningCard = { background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "12px", padding: "16px", color: "#92400e", marginBottom: "16px" };
const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" };
const statCard = { background: "white", borderRadius: "14px", padding: "20px", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)", border: "1px solid #e2e8f0" };
const statLabel = { margin: 0, color: "#64748b", fontSize: "14px" };
const statValue = { margin: "10px 0 0 0", fontSize: "32px", color: "#0f172a" };
const sectionCard = { background: "white", borderRadius: "14px", padding: "20px", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)", border: "1px solid #e2e8f0" };
const sectionTitle = { marginTop: 0, color: "#0f172a" };
const tableWrapper = { overflowX: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { textAlign: "left", padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#334155", fontSize: "14px" };
const tdStyle = { padding: "12px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#334155" };
const smallLinkStyle = { color: "#2563eb", textDecoration: "none", fontWeight: "600" };
const spinnerWrapper = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" };
const spinnerStyle = { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const errorCard = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", color: "#b91c1c" };

export default DashboardPage;