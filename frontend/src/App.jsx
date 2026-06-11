import BASE_URL from "./api/config";
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import QuarantinePage from "./pages/QuarantinePage";
import EmailDetailsPage from "./pages/EmailDetailsPage";
import LinkEmailPage from "./pages/LinkEmailPage";
import SensitivitySettingsPage from "./pages/SensitivitySettingsPage";
import AccountPage from "./pages/AccountPage";
import AuditLogPage from "./pages/AuditLogPage";
import AllMailPage from "./pages/AllMailPage";
import { Sidebar } from "./components/Ui";

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function ShellLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [quarantineCount, setQuarantineCount] = useState(0);

  // Fetch real quarantine count
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${BASE_URL}/emails`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const count = (data.emails || []).filter(e => e.is_quarantined).length;
        setQuarantineCount(count);
      })
      .catch(() => {});
  }, [location.pathname]); // re-fetch when navigating between pages

  const path = location.pathname;
  const route =
    path.startsWith("/quarantine") || path.startsWith("/email") ? "quarantine"
    : path.startsWith("/settings")  ? "settings"
    : path.startsWith("/account")   ? "account"
    : path.startsWith("/audit-log") ? "audit-log"
    : path.startsWith("/all-mail")  ? "all-mail"
    : "dashboard";

  const setRoute = (key) => {
    if (key === "dashboard")       navigate("/dashboard");
    else if (key === "quarantine") navigate("/quarantine");
    else if (key === "settings")   navigate("/settings");
    else if (key === "account")    navigate("/account");
    else if (key === "audit-log")  navigate("/audit-log");
    else if (key === "all-mail")   navigate("/all-mail");
  };

  const onSignOut = () => {
    localStorage.clear();
    navigate("/");
  };

  const brandName = "Sentinel";

  return (
    <div className="app">
      <Sidebar
        route={route}
        setRoute={setRoute}
        brandName={brandName}
        quarantineCount={quarantineCount}
        onAccount={() => navigate("/account")}
        onSignOut={onSignOut}
      />
      <main className="main">{children}</main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Full-screen routes (no sidebar) */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/link-email" element={<ProtectedRoute><LinkEmailPage /></ProtectedRoute>} />

        {/* Shell routes */}
        <Route path="/dashboard"  element={<ProtectedRoute><ShellLayout><DashboardPage /></ShellLayout></ProtectedRoute>} />
        <Route path="/quarantine" element={<ProtectedRoute><ShellLayout><QuarantinePage /></ShellLayout></ProtectedRoute>} />
        <Route path="/email/:id"  element={<ProtectedRoute><ShellLayout><EmailDetailsPage /></ShellLayout></ProtectedRoute>} />
        <Route path="/settings"   element={<ProtectedRoute><ShellLayout><SensitivitySettingsPage /></ShellLayout></ProtectedRoute>} />
        <Route path="/account"    element={<ProtectedRoute><ShellLayout><AccountPage /></ShellLayout></ProtectedRoute>} />
        <Route path="/audit-log"  element={<ProtectedRoute><ShellLayout><AuditLogPage /></ShellLayout></ProtectedRoute>} />
        <Route path="/all-mail"   element={<ProtectedRoute><ShellLayout><AllMailPage /></ShellLayout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
