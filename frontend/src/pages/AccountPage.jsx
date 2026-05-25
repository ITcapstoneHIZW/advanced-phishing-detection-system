import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const BASE_URL = "http://localhost:8000";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name) {
  const colors = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2"];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
}

function AccountPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [unlinkingId, setUnlinkingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userName = localStorage.getItem("userName") || "";

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const response = await fetch(`${BASE_URL}/account`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await response.json();
      setAccount(data);
    } catch (err) {
      setError("Could not load account details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    try {
      setPasswordLoading(true);
      const response = await fetch(`${BASE_URL}/account/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to change password.");
      }
      setPasswordSuccess("✅ Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUnlink = async (linkedEmailId) => {
    if (!window.confirm("Unlink this email? Your synced emails will be kept.")) return;
    try {
      setUnlinkingId(linkedEmailId);
      const response = await fetch(`${BASE_URL}/linked-emails/${linkedEmailId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to unlink email.");
      const updatedLinked = account.linked_emails.filter((l) => l.id !== linkedEmailId);
      setAccount((prev) => ({ ...prev, linked_emails: updatedLinked }));
      if (updatedLinked.length === 0) {
        localStorage.removeItem("emailLinked");
      }
      setSuccessMessage("✅ Email unlinked successfully.");
    } catch (err) {
      setError("Failed to unlink email.");
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      const response = await fetch(`${BASE_URL}/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to delete account.");
      localStorage.clear();
      navigate("/");
    } catch (err) {
      setError("Failed to delete account.");
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const getProviderLabel = (provider) => {
    if (provider === "gmail") return "Gmail";
    if (provider === "microsoft") return "Microsoft Outlook";
    return provider;
  };

  const getProviderIcon = (provider) => {
    if (provider === "gmail") return "🔴";
    if (provider === "microsoft") return "🔵";
    return "📧";
  };

  return (
    <div style={pageWrapper}>
      <Navbar />
      <div style={contentWrapper}>
        <h1 style={pageTitle}>Account</h1>
        <p style={pageSubtitle}>Manage your profile and account settings</p>

        {loading ? (
          <div style={spinnerWrapper}>
            <div style={spinnerStyle} />
            <p style={{ color: "#64748b", marginTop: "16px" }}>Loading account...</p>
          </div>
        ) : error ? (
          <div style={errorCard}><p style={{ margin: 0 }}>⚠️ {error}</p></div>
        ) : (
          <>
            {successMessage && (
              <div style={successCard}><p style={{ margin: 0 }}>{successMessage}</p></div>
            )}

            {/* Profile */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>Profile</h3>
              <div style={profileRow}>
                <div style={{ ...avatarStyle, background: getAvatarColor(account?.name) }}>
                  {getInitials(account?.name)}
                </div>
                <div>
                  <p style={profileName}>{account?.name}</p>
                  <p style={profileEmail}>{account?.email}</p>
                  <p style={profileJoined}>Member since {account?.created_at?.split("T")[0]}</p>
                </div>
              </div>
            </div>

            {/* Linked Emails */}
            <div style={sectionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ ...sectionTitle, margin: 0 }}>Linked Email Accounts</h3>
                <button onClick={() => navigate("/link-email")} style={addEmailButtonStyle}>
                  + Add Email
                </button>
              </div>

              {account?.linked_emails?.length === 0 ? (
                <div style={noEmailBox}>
                  <p style={{ margin: 0, color: "#64748b" }}>No email accounts linked yet.</p>
                  <button onClick={() => navigate("/link-email")} style={linkButtonStyle}>
                    Link Email Account
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {account.linked_emails.map((linked) => (
                    <div key={linked.id} style={linkedEmailCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "24px" }}>{getProviderIcon(linked.provider)}</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: "600", color: "#0f172a" }}>{linked.email_address}</p>
                          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                            {getProviderLabel(linked.provider)} · Linked {linked.linked_at?.split("T")[0]}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlink(linked.id)}
                        disabled={unlinkingId === linked.id}
                        style={unlinkButtonStyle}
                      >
                        {unlinkingId === linked.id ? "Unlinking..." : "Unlink"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Change Password */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>Change Password</h3>
              {passwordSuccess && <div style={successCard}><p style={{ margin: 0 }}>{passwordSuccess}</p></div>}
              {passwordError && <div style={errorCard}><p style={{ margin: 0 }}>⚠️ {passwordError}</p></div>}
              <form onSubmit={handleChangePassword}>
                <div style={fieldWrapper}>
                  <label style={labelStyle}>Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} placeholder="Enter current password" />
                </div>
                <div style={fieldWrapper}>
                  <label style={labelStyle}>New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="Enter new password" />
                </div>
                <div style={fieldWrapper}>
                  <label style={labelStyle}>Confirm New Password</label>
                  <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} style={inputStyle} placeholder="Confirm new password" />
                </div>
                <button type="submit" disabled={passwordLoading} style={saveButtonStyle}>
                  {passwordLoading ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div style={{ ...sectionCard, border: "1px solid #fecaca" }}>
              <h3 style={{ ...sectionTitle, color: "#dc2626" }}>Danger Zone</h3>
              <p style={{ color: "#64748b", fontSize: "14px" }}>
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} style={deleteButtonStyle}>
                  Delete Account
                </button>
              ) : (
                <div style={deleteConfirmBox}>
                  <p style={{ margin: "0 0 12px 0", fontWeight: "600", color: "#dc2626" }}>
                    Are you sure? This will permanently delete your account and all your data.
                  </p>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={handleDeleteAccount} disabled={deleteLoading} style={deleteButtonStyle}>
                      {deleteLoading ? "Deleting..." : "Yes, Delete My Account"}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)} style={cancelButtonStyle}>
                      Cancel
                    </button>
                  </div>
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
const contentWrapper = { padding: "24px", maxWidth: "800px", margin: "0 auto" };
const pageTitle = { margin: 0, color: "#0f172a" };
const pageSubtitle = { marginTop: "8px", color: "#64748b", marginBottom: "24px" };
const sectionCard = { background: "white", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)", border: "1px solid #e2e8f0", marginBottom: "16px" };
const sectionTitle = { marginTop: 0, color: "#0f172a" };
const profileRow = { display: "flex", alignItems: "center", gap: "20px" };
const avatarStyle = { width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "22px", fontWeight: "700", flexShrink: 0 };
const profileName = { margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" };
const profileEmail = { margin: "4px 0 0 0", color: "#64748b" };
const profileJoined = { margin: "4px 0 0 0", color: "#94a3b8", fontSize: "13px" };
const linkedEmailCard = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", flexWrap: "wrap", gap: "12px" };
const noEmailBox = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", flexWrap: "wrap", gap: "12px" };
const addEmailButtonStyle = { background: "#2563eb", color: "white", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" };
const linkButtonStyle = { background: "#2563eb", color: "white", border: "none", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" };
const unlinkButtonStyle = { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" };
const fieldWrapper = { marginBottom: "16px" };
const labelStyle = { display: "block", marginBottom: "6px", fontWeight: "600", color: "#334155", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" };
const saveButtonStyle = { background: "#2563eb", color: "white", border: "none", padding: "12px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const deleteButtonStyle = { background: "#dc2626", color: "white", border: "none", padding: "12px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" };
const cancelButtonStyle = { background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", padding: "12px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" };
const deleteConfirmBox = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "16px" };
const spinnerWrapper = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" };
const spinnerStyle = { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const successCard = { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", color: "#166534", marginBottom: "16px" };
const errorCard = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", color: "#b91c1c", marginBottom: "16px" };

export default AccountPage;