import Navbar from "../components/Navbar";
import mockEmails from "../data/mockEmails";
import { Link } from "react-router-dom";

function DashboardPage() {
  const totalEmails = mockEmails.length;
  const quarantinedEmails = mockEmails.filter(
    (email) => email.status === "Quarantined"
  ).length;
  const highRiskEmails = mockEmails.filter((email) => email.risk === "High").length;
  const safeEmails = 12;

  const userName = localStorage.getItem("userName") || "User";

  return (
    <div style={pageWrapper}>
      <Navbar />

      <div style={contentWrapper}>
        <div style={headerRow}>
          <div>
            <h1 style={pageTitle}>Dashboard</h1>
            <p style={pageSubtitle}>Welcome back, {userName}</p>
          </div>

          <Link to="/quarantine" style={actionLink}>
            View Quarantine List
          </Link>
        </div>

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

          <div style={tableWrapper}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Sender</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>Risk</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {mockEmails.slice(0, 3).map((email) => (
                  <tr key={email.id}>
                    <td style={tdStyle}>{email.sender}</td>
                    <td style={tdStyle}>{email.subject}</td>
                    <td style={tdStyle}>{email.risk}</td>
                    <td style={tdStyle}>{email.date}</td>
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
        </div>
      </div>
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  background: "#f8fafc",
};

const contentWrapper = {
  padding: "24px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
};

const pageTitle = {
  margin: 0,
  color: "#0f172a",
};

const pageSubtitle = {
  marginTop: "8px",
  color: "#64748b",
};

const actionLink = {
  background: "#0f172a",
  color: "white",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "10px",
  fontWeight: "600",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const statCard = {
  background: "white",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
};

const statLabel = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
};

const statValue = {
  margin: "10px 0 0 0",
  fontSize: "32px",
  color: "#0f172a",
};

const sectionCard = {
  background: "white",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
};

const sectionTitle = {
  marginTop: 0,
  color: "#0f172a",
};

const tableWrapper = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: "14px",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "14px",
  color: "#334155",
};

const smallLinkStyle = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "600",
};

export default DashboardPage;