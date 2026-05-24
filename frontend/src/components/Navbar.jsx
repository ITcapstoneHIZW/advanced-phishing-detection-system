import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");
  const userName = localStorage.getItem("userName");

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("access_token");
    localStorage.removeItem("gmailLinked");
    localStorage.removeItem("gmailAddress");
    localStorage.removeItem("emailProvider");
    navigate("/");
  };

  return (
    <nav
      style={{
        background: "#0f172a",
        color: "white",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px" }}>Phishing Detection System</h2>
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
        <Link to="/quarantine" style={linkStyle}>Quarantine</Link>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
          {userName ? `${userName} (${userEmail})` : userEmail}
        </span>

        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "10px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

const linkStyle = {
  color: "white",
  textDecoration: "none",
  fontWeight: "600",
};

export default Navbar;