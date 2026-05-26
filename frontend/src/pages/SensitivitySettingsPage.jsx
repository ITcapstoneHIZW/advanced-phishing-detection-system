import React, { useState, useEffect } from "react";
import I from "../components/Icons";
import { Card, PageHeader } from "../components/Ui";

const BASE_URL = "http://localhost:8000";

function SettingsPage() {
  const [threshold, setThreshold] = useState(0.7);
  const [mode, setMode] = useState("phishing");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/settings/sensitivity`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        });
        const data = await res.json();
        if (data.threshold != null) setThreshold(data.threshold);
        if (data.quarantine_type) setMode(data.quarantine_type);
      } catch {
        setError("Could not load settings.");
      } finally { setLoading(false); }
    })();
  }, []);

  const sensLabel = (t) => {
    if (t <= 0.3) return { label: "Very sensitive", desc: "Flags almost everything — expect many false positives.", tone: "critical" };
    if (t <= 0.5) return { label: "High sensitivity", desc: "Catches more phishing but may flag some legitimate emails.", tone: "high" };
    if (t <= 0.7) return { label: "Balanced (recommended)", desc: "Good balance between security and usability.", tone: "low" };
    if (t <= 0.85) return { label: "Low sensitivity", desc: "Less false positives but may miss some phishing attempts.", tone: "medium" };
    return { label: "Very lenient", desc: "Only obvious phishing is flagged — not recommended.", tone: "clean" };
  };
  const sens = sensLabel(threshold);

  const handleSave = async () => {
    try {
      setSaving(true); setError(""); setSaved("");
      const res = await fetch(`${BASE_URL}/settings/sensitivity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ threshold: parseFloat(threshold), quarantine_type: mode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save settings.");
      }
      setSaved("Settings saved.");
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const handleReset = () => { setThreshold(0.7); setMode("phishing"); setSaved(""); setError(""); };

  const modes = [
    { v: "phishing",   t: "Phishing only",         d: "Only quarantine emails classified as Phishing.", icon: <I.ShieldAlert size={14}/> },
    { v: "suspicious", t: "Phishing + Suspicious", d: "Quarantine both Phishing and Suspicious emails.", icon: <I.AlertTriangle size={14}/> },
    { v: "all",        t: "All flagged",           d: "Quarantine any email with a risk score above the threshold.", icon: <I.Lock size={14}/> },
  ];

  return (
    <>
      <PageHeader
        crumbs={["Sensitivity"]}
        actions={
          <>
            <button className="btn" data-variant="ghost" onClick={handleReset}>Reset to default</button>
            <button className="btn" data-variant="primary" onClick={handleSave} disabled={saving}>
              <I.Check size={14}/> {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      />
      <div className="page-body">
        <h1 className="page-title">Sensitivity settings</h1>
        <p className="page-sub">Adjust how aggressively the system flags suspicious emails.</p>

        {saved && (
          <div style={{ padding: "10px 14px", background: "var(--sev-low-bg)", border: "1px solid var(--sev-low)", borderRadius: "var(--r-md)", color: "var(--sev-low)", fontSize: 13, marginBottom: 14, fontWeight: 500 }}>{saved}</div>
        )}
        {error && (
          <div style={{ padding: "10px 14px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", color: "var(--sev-critical)", fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        {loading ? (
          <Card><div className="empty"><div>Loading settings…</div></div></Card>
        ) : (
          <>
            <Card title={<><I.Sliders size={14}/> Detection threshold</>}>
              <p className="muted" style={{ fontSize: 13, margin: "0 0 18px" }}>
                This controls the risk score cutoff for quarantining emails. Lower values are more aggressive, higher values are more lenient.
              </p>
              <div className="between" style={{ marginBottom: 14 }}>
                <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>More sensitive</span>
                <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Less sensitive</span>
              </div>
              <input
                type="range" min="0.1" max="0.9" step="0.01"
                value={threshold}
                onChange={e => { setThreshold(parseFloat(e.target.value)); setSaved(""); }}
                className="slider"
              />
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em", color: `var(--sev-${sens.tone})`, fontFeatureSettings: '"tnum"' }}>
                  {threshold.toFixed(2)}
                </span>
              </div>
              <div style={{ marginTop: 12, padding: "12px 16px", background: `var(--sev-${sens.tone}-bg)`, border: `1px solid var(--sev-${sens.tone})`, borderRadius: "var(--r-md)" }}>
                <div style={{ fontWeight: 600, color: `var(--sev-${sens.tone})`, fontSize: 13.5 }}>{sens.label}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{sens.desc}</div>
              </div>
            </Card>

            <div style={{ marginTop: "var(--gap-card)" }}>
              <Card title={<><I.Lock size={14}/> Quarantine mode</>}>
                <p className="muted" style={{ fontSize: 13, margin: "0 0 14px" }}>
                  Choose which types of emails get quarantined automatically.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  {modes.map(o => (
                    <button
                      key={o.v}
                      onClick={() => { setMode(o.v); setSaved(""); }}
                      style={{
                        textAlign: "left", padding: 14,
                        borderRadius: "var(--r-md)",
                        border: `1px solid ${mode === o.v ? "var(--accent)" : "var(--border)"}`,
                        background: mode === o.v ? "var(--accent-bg)" : "var(--bg-elevated)",
                        cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, color: "var(--text)",
                      }}
                    >
                      <div className="row">{o.icon}<strong style={{ fontSize: 13.5 }}>{o.t}</strong></div>
                      <div className="muted" style={{ fontSize: 12 }}>{o.d}</div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            <div style={{ marginTop: "var(--gap-card)" }}>
              <Card title={<><I.Sparkles size={14}/> Model information</>}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                  <div>
                    <div className="meta-label">Current model</div>
                    <div className="meta-value" style={{ fontSize: 13 }}>Rule-based Classifier v1.0</div>
                  </div>
                  <div>
                    <div className="meta-label">Features used</div>
                    <div className="meta-value" style={{ fontSize: 13 }}>URL analysis, Urgency detection, Sender reputation</div>
                  </div>
                  <div>
                    <div className="meta-label">Current threshold</div>
                    <div className="meta-value mono" style={{ fontSize: 13 }}>{threshold.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="meta-label">Quarantine mode</div>
                    <div className="meta-value mono" style={{ fontSize: 13 }}>{mode}</div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default SettingsPage;
