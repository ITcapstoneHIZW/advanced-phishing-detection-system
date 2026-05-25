import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "";

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2"];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("access_token");
    localStorage.removeItem("emailLinked");
    localStorage.removeItem("gmailAddress");
    localStorage.removeItem("emailProvider");
    navigate("/");
  };

  return (
    <nav style={navStyle}>
      <div style={leftSection}>
        <h2 style={brandStyle}>Phishing Detection System</h2>
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
        <Link to="/quarantine" style={linkStyle}>Quarantine</Link>
        <Link to="/settings" style={linkStyle}>Settings</Link>
      </div>

      <div style={rightSection}>
        <div
          onClick={() => navigate("/account")}
          style={{
            ...avatarStyle,
            background: getAvatarColor(userName),
          }}
          title="Account"
        >
          {getInitials(userName)}
        </div>

        <button onClick={handleLogout} style={logoutButtonStyle}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const navStyle = {
  background: "#0f172a",
  color: "white",
  padding: "16px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const leftSection = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
};

const rightSection = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const brandStyle = {
  margin: 0,
  fontSize: "20px",
};

const linkStyle = {
  color: "white",
  textDecoration: "none",
  fontWeight: "600",
};

const avatarStyle = {
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  flexShrink: 0,
};

const logoutButtonStyle = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

export default Navbar;