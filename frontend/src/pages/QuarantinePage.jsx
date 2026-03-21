import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import mockEmails from "../data/mockEmails";

function QuarantinePage() {
  return (
    <div style={pageWrapper}>
      <Navbar />

      <div style={contentWrapper}>
        <h1 style={pageTitle}>Quarantine Emails</h1>
        <p style={pageSubtitle}>
          Review suspicious emails that have been flagged by the system.
        </p>

        <div style={sectionCard}>
          <div style={tableWrapper}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Sender</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>Risk</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {mockEmails.map((email) => (
                  <tr key={email.id}>
                    <td style={tdStyle}>{email.sender}</td>
                    <td style={tdStyle}>{email.subject}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          ...riskBadgeStyle,
                          background:
                            email.risk === "High" ? "#fee2e2" : "#fef3c7",
                          color:
                            email.risk === "High" ? "#b91c1c" : "#92400e",
                        }}
                      >
                        {email.risk}
                      </span>
                    </td>
                    <td style={tdStyle}>{email.status}</td>
                    <td style={tdStyle}>{email.date}</td>
                    <td style={tdStyle}>
                      <Link to={`/email/${email.id}`} style={viewButtonStyle}>
                        View Details
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

const pageTitle = {
  marginBottom: "8px",
  color: "#0f172a",
};

const pageSubtitle = {
  marginTop: 0,
  marginBottom: "20px",
  color: "#64748b",
};

const sectionCard = {
  background: "white",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
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
  verticalAlign: "middle",
};

const riskBadgeStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "700",
};

const viewButtonStyle = {
  background: "#0f172a",
  color: "white",
  textDecoration: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "600",
  display: "inline-block",
};

export default QuarantinePage;