import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import QuarantinePage from "./pages/QuarantinePage";
import EmailDetailsPage from "./pages/EmailDetailsPage";
import LinkEmailPage from "./pages/LinkEmailPage";
import SensitivitySettingsPage from "./pages/SensitivitySettingsPage";
import AccountPage from "./pages/AccountPage";
import { Sidebar } from "./components/Ui";

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

// Routes that use the sidebar shell. Login/Register/LinkEmail render full-screen.
function ShellLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Map current path → sidebar's notion of route
  const path = location.pathname;
  const route =
    path.startsWith("/quarantine") || path.startsWith("/email") ? "quarantine"
    : path.startsWith("/settings") ? "settings"
    : path.startsWith("/account")  ? "account"
    : "dashboard";

  const setRoute = (key) => {
    if (key === "dashboard")  navigate("/dashboard");
    else if (key === "quarantine") navigate("/quarantine");
    else if (key === "settings")   navigate("/settings");
    else if (key === "account")    navigate("/account");
  };

  const onSignOut = () => {
    localStorage.clear();
    navigate("/");
  };

  // Could be replaced with a real query when you persist quarantine count
  const quarantineCount = 0;
  const brandName = "Phishing Detection";

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
        <Route path="/dashboard"   element={<ProtectedRoute><ShellLayout><DashboardPage /></ShellLayout></ProtectedRoute>} />
        <Route path="/quarantine"  element={<ProtectedRoute><ShellLayout><QuarantinePage /></ShellLayout></ProtectedRoute>} />
        <Route path="/email/:id"   element={<ProtectedRoute><ShellLayout><EmailDetailsPage /></ShellLayout></ProtectedRoute>} />
        <Route path="/settings"    element={<ProtectedRoute><ShellLayout><SensitivitySettingsPage /></ShellLayout></ProtectedRoute>} />
        <Route path="/account"     element={<ProtectedRoute><ShellLayout><AccountPage /></ShellLayout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
