import React, { useState, useEffect, useMemo } from "react";
import I from "../components/Icons";
import { Card, PageHeader } from "../components/Ui";
import { getEmails } from "../api/emailService";

const BASE_URL = "http://localhost:8000";

// === Risk score histogram ===
function ScoreHistogram({ emails, threshold }) {
  const buckets = useMemo(() => {
    const b = Array.from({ length: 20 }, (_, i) => ({ min: i * 0.5, max: (i + 1) * 0.5, count: 0 }));
    emails.forEach(e => {
      if (e.risk_score == null) return;
      const idx = Math.min(19, Math.floor(e.risk_score / 0.5));
      b[idx].count++;
    });
    return b;
  }, [emails]);

  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const cutScore = threshold * 10; // threshold is 0-1, scores are 0-10

  if (!emails.length) return (
    <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "20px 0" }}>
      Sync some emails to see the score distribution.
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, marginBottom: 4 }}>
        {buckets.map((b, i) => {
          const pct = (b.count / maxCount) * 100;
          const barScore = b.min + 0.25; // midpoint
          const isAboveCut = barScore >= cutScore;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div
                title={`Score ${b.min.toFixed(1)}–${b.max.toFixed(1)}: ${b.count} email${b.count !== 1 ? "s" : ""}`}
                style={{
                  width: "100%",
                  height: `${Math.max(pct, b.count > 0 ? 4 : 0)}%`,
                  minHeight: b.count > 0 ? 3 : 0,
                  borderRadius: "2px 2px 0 0",
                  background: isAboveCut ? "var(--sev-critical)" : "var(--sev-low)",
                  opacity: isAboveCut ? 0.85 : 0.5,
                  transition: "background 0.2s",
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Cut line indicator */}
      <div style={{ position: "relative", height: 16 }}>
        <div style={{
          position: "absolute",
          left: `${(cutScore / 10) * 100}%`,
          transform: "translateX(-50%)",
          fontSize: 10,
          color: "var(--sev-critical)",
          fontFamily: "var(--font-mono)",
          whiteSpace: "nowrap",
        }}>
          ▲ cut ({cutScore.toFixed(1)})
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-faint)", marginTop: 4 }}>
        <span>0</span><span>2.5</span><span>5</span><span>7.5</span><span>10</span>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--sev-critical)", opacity: 0.85, display: "inline-block" }}/>
          Would be quarantined
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--sev-low)", opacity: 0.5, display: "inline-block" }}/>
          Would pass through
        </span>
      </div>
    </div>
  );
}

// === Impact callout ===
function ImpactCallout({ emails, threshold }) {
  const cutScore = threshold * 10;
  const wouldQuarantine = emails.filter(e => e.risk_score != null && e.risk_score >= cutScore).length;
  const total = emails.filter(e => e.risk_score != null).length;
  const pct = total > 0 ? Math.round((wouldQuarantine / total) * 100) : 0;

  const tone = pct > 60 ? "critical" : pct > 30 ? "high" : pct > 10 ? "medium" : "low";

  return (
    <div style={{
      padding: "12px 16px",
      background: `var(--sev-${tone}-bg)`,
      border: `1px solid var(--sev-${tone})`,
      borderRadius: "var(--r-md)",
      marginTop: 16,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13.5, color: `var(--sev-${tone})` }}>
        {wouldQuarantine} of {total} emails would be quarantined ({pct}%)
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
        Based on {total} scored emails with the current threshold of {(threshold * 10).toFixed(1)}/10.
        {pct > 50 && " Consider raising the threshold to reduce false positives."}
        {pct === 0 && total > 0 && " Consider lowering the threshold to catch more threats."}
      </div>
    </div>
  );
}

function SettingsPage() {
  const [threshold, setThreshold] = useState(0.7);
  const [mode, setMode] = useState("phishing");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [emails, setEmails] = useState([]);

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

    // Load emails for histogram
    (async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${BASE_URL}/emails`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setEmails(data.emails || []);
      } catch {}
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
      setSaved("Settings saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const handleReset = () => { setThreshold(0.7); setMode("phishing"); setSaved(""); setError(""); };

  const modes = [
    { v: "phishing",   t: "Phishing only",         d: "Only quarantine emails classified as Phishing.", icon: <I.ShieldAlert size={14}/> },
    { v: "suspicious", t: "Phishing + Suspicious",  d: "Quarantine both Phishing and Suspicious emails.", icon: <I.AlertTriangle size={14}/> },
    { v: "all",        t: "All flagged",            d: "Quarantine any email with a risk score above the threshold.", icon: <I.Lock size={14}/> },
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "var(--gap-card)", alignItems: "start" }}>

            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-card)" }}>

              {/* Threshold slider */}
              <Card title={<><I.Sliders size={14}/> Detection threshold</>}>
                <p className="muted" style={{ fontSize: 13, margin: "0 0 18px" }}>
                  Controls the risk score cutoff for quarantining emails. Lower values are more aggressive, higher values are more lenient.
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
                  style={{ width: "100%" }}
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

                {/* Impact callout — live updates as slider moves */}
                {emails.length > 0 && <ImpactCallout emails={emails} threshold={threshold} />}
              </Card>

              {/* Quarantine mode */}
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

              {/* Model info */}
              <Card title={<><I.Sparkles size={14}/> Model information</>}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                  <div>
                    <div className="meta-label">Current model</div>
                    <div className="meta-value" style={{ fontSize: 13 }}>Rule-based Classifier v1.0</div>
                  </div>
                  <div>
                    <div className="meta-label">Features used</div>
                    <div className="meta-value" style={{ fontSize: 13 }}>URL analysis, Urgency detection, Sender reputation, NLP sentiment</div>
                  </div>
                  <div>
                    <div className="meta-label">Current threshold</div>
                    <div className="meta-value mono" style={{ fontSize: 13 }}>{threshold.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="meta-label">Quarantine mode</div>
                    <div className="meta-value mono" style={{ fontSize: 13 }}>{mode}</div>
                  </div>
                  <div>
                    <div className="meta-label">Emails scored</div>
                    <div className="meta-value mono" style={{ fontSize: 13 }}>{emails.length}</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right column — histogram */}
            <div>
              <Card title={<><I.Activity size={14}/> Score distribution</>}>
                <p className="muted" style={{ fontSize: 12.5, margin: "0 0 14px" }}>
                  Distribution of risk scores across all {emails.length} scored emails. Red bars would be quarantined at the current threshold.
                </p>
                <ScoreHistogram emails={emails} threshold={threshold} />
              </Card>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

export default SettingsPage;
