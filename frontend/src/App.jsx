import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import QuarantinePage from "./pages/QuarantinePage";
import EmailDetailsPage from "./pages/EmailDetailsPage";
import LinkEmailPage from "./pages/LinkEmailPage";
import SensitivitySettingsPage from "./pages/SensitivitySettingsPage";
import AccountPage from "./pages/AccountPage";

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/link-email"
          element={
            <ProtectedRoute>
              <LinkEmailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quarantine"
          element={
            <ProtectedRoute>
              <QuarantinePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/email/:id"
          element={
            <ProtectedRoute>
              <EmailDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SensitivitySettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;