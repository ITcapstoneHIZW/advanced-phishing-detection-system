import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import mockEmails from "../data/mockEmails";

function EmailDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const email = mockEmails.find((item) => item.id === Number(id));

  if (!email) {
    return (
      <div style={pageWrapper}>
        <Navbar />
        <div style={contentWrapper}>
          <div style={sectionCard}>
            <h1 style={{ marginTop: 0 }}>Email Not Found</h1>
            <button onClick={() => navigate("/quarantine")} style={backButtonStyle}>
              Back to Quarantine
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        <div style={sectionCard}>
          <div style={detailGrid}>
            <div style={detailItem}>
              <p style={detailLabel}>Sender</p>
              <p style={detailValue}>{email.sender}</p>
            </div>

            <div style={detailItem}>
              <p style={detailLabel}>Risk Level</p>
              <p style={detailValue}>{email.risk}</p>
            </div>

            <div style={detailItem}>
              <p style={detailLabel}>Date</p>
              <p style={detailValue}>{email.date}</p>
            </div>

            <div style={detailItem}>
              <p style={detailLabel}>Status</p>
              <p style={detailValue}>{email.status}</p>
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <p style={detailLabel}>Subject</p>
            <p style={subjectBoxStyle}>{email.subject}</p>
          </div>

          <div style={{ marginTop: "20px" }}>
            <p style={detailLabel}>Email Body</p>
            <div style={bodyBoxStyle}>{email.body}</div>
          </div>

          <div style={buttonRow}>
            <button
              onClick={() => alert("Email marked as safe.")}
              style={safeButtonStyle}
            >
              Mark as Safe
            </button>

            <button
              onClick={() => {
                alert("Email deleted.");
                navigate("/quarantine");
              }}
              style={deleteButtonStyle}
            >
              Delete
            </button>
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
  maxWidth: "1000px",
  margin: "0 auto",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const pageTitle = {
  margin: 0,
  color: "#0f172a",
};

const pageSubtitle = {
  marginTop: "8px",
  color: "#64748b",
};

const backButtonStyle = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "12px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "600",
};

const sectionCard = {
  background: "white",
  borderRadius: "14px",
  padding: "24px",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "16px",
};

const detailItem = {
  background: "#f8fafc",
  borderRadius: "10px",
  padding: "14px",
  border: "1px solid #e2e8f0",
};

const detailLabel = {
  margin: 0,
  fontSize: "13px",
  color: "#64748b",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const detailValue = {
  margin: "8px 0 0 0",
  color: "#0f172a",
  fontWeight: "600",
};

const subjectBoxStyle = {
  marginTop: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  padding: "14px",
  borderRadius: "10px",
  color: "#0f172a",
  fontWeight: "600",
};

const bodyBoxStyle = {
  marginTop: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  padding: "18px",
  borderRadius: "10px",
  color: "#334155",
  lineHeight: "1.6",
};

const buttonRow = {
  marginTop: "24px",
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const safeButtonStyle = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "700",
};

const deleteButtonStyle = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "700",
};

export default EmailDetailsPage;