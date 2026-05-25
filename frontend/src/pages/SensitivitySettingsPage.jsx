import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const BASE_URL = "http://localhost:8000";

function SettingsPage() {
  const navigate = useNavigate();
  const [threshold, setThreshold] = useState(0.7);
  const [quarantineType, setQuarantineType] = useState("phishing");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`${BASE_URL}/settings/sensitivity`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        const data = await response.json();
        setThreshold(data.threshold);
        setQuarantineType(data.quarantine_type);
      } catch (err) {
        setError("Could not load settings.");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");
      const response = await fetch(`${BASE_URL}/settings/sensitivity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          threshold: parseFloat(threshold),
          quarantine_type: quarantineType,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to save settings.");
      }
      setSuccessMessage("✅ Settings saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setThreshold(0.7);
    setQuarantineType("phishing");
    setSuccessMessage("");
    setError("");
  };

  const getRiskLabel = (value) => {
    if (value <= 0.3) return { label: "Very Sensitive", desc: "Flags almost everything — expect many false positives", color: "#dc2626" };
    if (value <= 0.5) return { label: "High Sensitivity", desc: "Catches more phishing but may flag some legitimate emails", color: "#ea580c" };
    if (value <= 0.7) return { label: "Balanced (Recommended)", desc: "Good balance between security and usability", color: "#16a34a" };
    if (value <= 0.85) return { label: "Low Sensitivity", desc: "Less false positives but may miss some phishing attempts", color: "#2563eb" };
    return { label: "Very Low Sensitivity", desc: "Only flags obvious phishing — not recommended", color: "#64748b" };
  };

  const risk = getRiskLabel(threshold);

  return (
    <div style={pageWrapper}>
      <Navbar />

      <div style={contentWrapper}>
        <div style={headerRow}>
          <div>
            <h1 style={pageTitle}>Model & Sensitivity Settings</h1>
            <p style={pageSubtitle}>Adjust how aggressively the system flags suspicious emails</p>
          </div>
        </div>

        {loading ? (
          <div style={spinnerWrapper}>
            <div style={spinnerStyle} />
            <p style={{ color: "#64748b", marginTop: "16px" }}>Loading settings...</p>
          </div>
        ) : (
          <>
            {successMessage && (
              <div style={successCard}>
                <p style={{ margin: 0 }}>{successMessage}</p>
              </div>
            )}
            {error && (
              <div style={errorCard}>
                <p style={{ margin: 0 }}>⚠️ {error}</p>
              </div>
            )}

            {/* Sensitivity Slider */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>Detection Threshold</h3>
              <p style={sectionDesc}>
                This controls the risk score cutoff for quarantining emails.
                Lower values are more aggressive, higher values are more lenient.
              </p>

              <div style={sliderWrapper}>
                <div style={sliderLabels}>
                  <span style={{ color: "#dc2626", fontWeight: "600" }}>More Sensitive</span>
                  <span style={{ color: "#64748b", fontWeight: "600" }}>Less Sensitive</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.01"
                  value={threshold}
                  onChange={(e) => {
                    setThreshold(parseFloat(e.target.value));
                    setSuccessMessage("");
                  }}
                  style={sliderStyle}
                />
                <div style={thresholdDisplay}>
                  <span style={{ fontSize: "32px", fontWeight: "800", color: risk.color }}>
                    {threshold.toFixed(2)}
                  </span>
                </div>
              </div>

              <div style={{ ...riskBadge, background: risk.color + "15", border: `1px solid ${risk.color}33` }}>
                <p style={{ margin: 0, fontWeight: "700", color: risk.color }}>{risk.label}</p>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#475569" }}>{risk.desc}</p>
              </div>
            </div>

            {/* Quarantine Type */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>Quarantine Mode</h3>
              <p style={sectionDesc}>Choose which types of emails get quarantined automatically.</p>

              <div style={optionGrid}>
                {[
                  { value: "phishing", label: "Phishing Only", desc: "Only quarantine emails classified as Phishing", icon: "🎣" },
                  { value: "suspicious", label: "Phishing + Suspicious", desc: "Quarantine both Phishing and Suspicious emails", icon: "⚠️" },
                  { value: "all", label: "All Flagged", desc: "Quarantine any email with a risk score above threshold", icon: "🔒" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuarantineType(option.value)}
                    style={{
                      ...optionButton,
                      border: quarantineType === option.value ? "2px solid #2563eb" : "2px solid #e2e8f0",
                      background: quarantineType === option.value ? "#eff6ff" : "white",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>{option.icon}</span>
                    <span style={{ fontWeight: "700", color: "#0f172a" }}>{option.label}</span>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Info */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>Model Information</h3>
              <div style={modelGrid}>
                <div style={modelItem}>
                  <p style={modelLabel}>Current Model</p>
                  <p style={modelValue}>Rule-based Classifier v1.0</p>
                </div>
                <div style={modelItem}>
                  <p style={modelLabel}>Features Used</p>
                  <p style={modelValue}>URL Analysis, Urgency Detection, Sender Reputation</p>
                </div>
                <div style={modelItem}>
                  <p style={modelLabel}>Current Threshold</p>
                  <p style={modelValue}>{threshold.toFixed(2)}</p>
                </div>
                <div style={modelItem}>
                  <p style={modelLabel}>Quarantine Mode</p>
                  <p style={modelValue}>{quarantineType}</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={buttonRow}>
              <button onClick={handleSave} disabled={saving} style={saveButtonStyle}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={handleReset} style={resetButtonStyle}>
                Reset to Default
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const pageWrapper = { minHeight: "100vh", background: "#f8fafc" };
const contentWrapper = { padding: "24px", maxWidth: "900px", margin: "0 auto" };
const headerRow = { marginBottom: "24px" };
const pageTitle = { margin: 0, color: "#0f172a" };
const pageSubtitle = { marginTop: "8px", color: "#64748b" };
const sectionCard = { background: "white", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)", border: "1px solid #e2e8f0", marginBottom: "16px" };
const sectionTitle = { marginTop: 0, color: "#0f172a" };
const sectionDesc = { color: "#64748b", fontSize: "14px", marginBottom: "20px" };
const sliderWrapper = { display: "flex", flexDirection: "column", gap: "12px" };
const sliderLabels = { display: "flex", justifyContent: "space-between", fontSize: "14px" };
const sliderStyle = { width: "100%", height: "6px", cursor: "pointer", accentColor: "#2563eb" };
const thresholdDisplay = { textAlign: "center", padding: "12px 0" };
const riskBadge = { borderRadius: "12px", padding: "16px", marginTop: "8px" };
const optionGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" };
const optionButton = { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "16px", borderRadius: "12px", cursor: "pointer", textAlign: "center" };
const modelGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" };
const modelItem = { background: "#f8fafc", borderRadius: "10px", padding: "14px", border: "1px solid #e2e8f0" };
const modelLabel = { margin: 0, fontSize: "13px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em" };
const modelValue = { margin: "8px 0 0 0", color: "#0f172a", fontWeight: "600", fontSize: "14px" };
const buttonRow = { display: "flex", gap: "12px", flexWrap: "wrap" };
const saveButtonStyle = { background: "#2563eb", color: "white", border: "none", padding: "14px 24px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "15px" };
const resetButtonStyle = { background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", padding: "14px 24px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "15px" };
const spinnerWrapper = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" };
const spinnerStyle = { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const successCard = { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", color: "#166534", marginBottom: "16px" };
const errorCard = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", color: "#b91c1c", marginBottom: "16px" };

export default SettingsPage;