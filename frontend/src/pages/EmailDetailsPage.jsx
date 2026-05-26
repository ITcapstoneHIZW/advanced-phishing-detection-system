import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { Card, Sev, PageHeader, riskLabel, riskColor, RiskBar, ConfirmModal } from "../components/Ui";
import { getEmailById, releaseEmail, deleteEmail, submitFeedback } from "../api/emailService";

// === Risk Gauge ===
function RiskGauge({ score }) {
  if (score == null) return null;
  const a0 = Math.PI * 0.85, a1 = Math.PI * 0.15;
  const r = 54, cx = 70, cy = 65;
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const angle = a0 - (a0 - a1) * pct;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const large = pct > 0.5 ? 1 : 0;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x} ${y}`;
  const fullPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  const color = riskColor(score);
  const label = riskLabel(score);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg viewBox="0 0 140 80" width={160} height={92}>
        <path d={fullPath} stroke="var(--bg-sunken)" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d={arcPath} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" />
        {[0, 2, 4, 6, 8, 10].map(t => {
          const a = a0 - (a0 - a1) * (t / 10);
          return <line key={t}
            x1={cx + (r + 4) * Math.cos(a)} y1={cy + (r + 4) * Math.sin(a)}
            x2={cx + (r + 8) * Math.cos(a)} y2={cy + (r + 8) * Math.sin(a)}
            stroke="var(--text-faint)" strokeWidth="1" />;
        })}
      </svg>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1, marginTop: -12 }}>{score.toFixed(1)}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>out of 10</div>
      <Sev score={score} label={label} />
    </div>
  );
}

// === Score breakdown row ===
function BreakdownRow({ label, score, meta, triggered }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-faint)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: triggered ? "var(--text)" : "var(--text-muted)" }}>{label}</div>
        {meta && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{meta}</div>}
      </div>
      <div style={{ width: 140 }}>
        <RiskBar score={score} />
      </div>
    </div>
  );
}

// === Detection flag chip ===
function FlagChip({ label, tone }) {
  return (
    <span className="sev" data-level={tone} style={{ fontSize: 12 }}>
      <span className="sev-dot" style={{ background: `var(--sev-${tone})` }}></span>
      {label}
    </span>
  );
}

// === Highlighted body ===
const URGENT_WORDS = [
  "urgent", "immediately", "act now", "verify your account",
  "suspended", "unusual activity", "click here", "limited time",
  "expires soon", "action required", "unauthorized", "suspicious",
  "compromised", "locked", "validate", "confirm your", "update your",
  "prize", "winner", "congratulations", "free", "risk", "threat", "alert"
];

function HighlightedBody({ body }) {
  if (!body) return <span className="muted">No body content.</span>;
  const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let result = escaped;
  URGENT_WORDS.forEach(word => {
    const regex = new RegExp(`(${word})`, "gi");
    result = result.replace(regex, `<mark title="Suspicious phrase: urgency/manipulation indicator" style="background:oklch(0.75 0.15 85/0.35);border-radius:2px;padding:0 2px;">$1</mark>`);
  });
  return (
    <div
      className="email-body"
      style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}
      dangerouslySetInnerHTML={{ __html: result }}
    />
  );
}

// === Main page ===
function EmailDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState("");
  const [showRawHeaders, setShowRawHeaders] = useState(false);
  const [confirm, setConfirm] = useState(null); // { title, message, confirmLabel, confirmTone, onConfirm }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getEmailById(id);
        setEmail(data);
      } catch {
        setError("Could not load email details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleRelease = () => {
    setConfirm({
      title: "Release email",
      message: "This email will be moved from quarantine to your inbox.",
      confirmLabel: "Release",
      confirmTone: "medium",
      onConfirm: async () => {
        setConfirm(null);
        try {
          setActionLoading("release");
      await releaseEmail(id);
          setEmail(prev => ({ ...prev, is_quarantined: false }));
          showToast("Email released from quarantine.");
        } catch { setError("Failed to release email."); }
        finally { setActionLoading(""); }
      }
    });
  };

  const handleDelete = () => {
    setConfirm({
      title: "Delete email",
      message: "This email will be permanently deleted and cannot be recovered.",
      confirmLabel: "Delete permanently",
      confirmTone: "critical",
      onConfirm: async () => {
        setConfirm(null);
        try {
          setActionLoading("delete");
          await deleteEmail(id);
          navigate("/quarantine");
        } catch {
          setError("Failed to delete email.");
          setActionLoading("");
        }
      }
    });
  };

  const handleFeedback = (verdict) => {
    setConfirm({
      title: `Mark as ${verdict}`,
      message: verdict === "Phishing"
        ? "This email will be confirmed as phishing and added to the retraining dataset."
        : "This email will be marked as safe and released from quarantine.",
      confirmLabel: `Mark as ${verdict}`,
      confirmTone: verdict === "Phishing" ? "critical" : "low",
      onConfirm: async () => {
        setConfirm(null);
        try {
          setActionLoading(verdict);
      await submitFeedback(id, verdict);
          setEmail(prev => ({ ...prev, verdict }));
          showToast(`Email marked as ${verdict}.`);
        } catch { setError("Failed to submit feedback."); }
        finally { setActionLoading(""); }
      }
    });
  };

  // Build detection flags from analysis data
  const flags = email ? [
    email.has_suspicious_url && { label: "Suspicious URL", tone: "critical" },
    email.has_spoofed_domain && { label: "Domain spoof", tone: "critical" },
    email.has_urgent_language && { label: "Urgency language", tone: "high" },
    email.subject_has_urgent && { label: "Urgent subject", tone: "high" },
    email.is_free_email && { label: "Free email provider", tone: "medium" },
    email.is_negative_sentiment && { label: "Negative sentiment", tone: "medium" },
    email.has_grammar_issues && { label: "Grammar issues", tone: "medium" },
    email.is_non_english && { label: `Non-English (${email.detected_language})`, tone: "low" },
  ].filter(Boolean) : [];

  // Build score breakdown by category
  const breakdown = email ? [
    {
      label: "Link analysis",
      score: Math.min(10, (email.has_suspicious_url ? 5 : 0) + (email.url_count > 3 ? 2 : 0) + (email.url_count > 0 ? 1 : 0)),
      meta: `${email.url_count} URL${email.url_count !== 1 ? "s" : ""} found${email.has_suspicious_url ? " · suspicious keywords detected" : ""}`,
      triggered: email.has_suspicious_url || email.url_count > 3,
    },
    {
      label: "Sender & domain",
      score: Math.min(10, (email.has_spoofed_domain ? 6 : 0) + (email.is_free_email ? 2 : 0)),
      meta: `${email.sender_domain || "unknown"}${email.has_spoofed_domain ? " · possible brand impersonation" : ""}${email.is_free_email ? " · free provider" : ""}`,
      triggered: email.has_spoofed_domain || email.is_free_email,
    },
    {
      label: "NLP language",
      score: Math.min(10, (email.has_urgent_language ? 4 : 0) + (email.urgent_word_count > 3 ? 2 : 0) + (email.is_negative_sentiment ? 1 : 0) + (email.has_grammar_issues ? 1 : 0)),
      meta: `${email.urgent_word_count || 0} urgency trigger${email.urgent_word_count !== 1 ? "s" : ""}${email.has_grammar_issues ? ` · grammar ratio ${((email.grammar_error_ratio || 0) * 100).toFixed(0)}%` : ""}${email.sentiment_score != null ? ` · sentiment ${email.sentiment_score > 0 ? "+" : ""}${email.sentiment_score}` : ""}`,
      triggered: email.has_urgent_language || email.has_grammar_issues,
    },
    {
      label: "Subject analysis",
      score: email.subject_has_urgent ? 4 : 0,
      meta: email.subject_has_urgent ? "Urgent language in subject line" : "Subject appears normal",
      triggered: email.subject_has_urgent,
    },
  ] : [];

  return (
    <>
      <PageHeader
        crumbs={["Quarantine", `Email #${id}`]}
        actions={
          <button className="btn" data-variant="ghost" onClick={() => navigate("/quarantine")}>
            <I.CornerUpLeft size={14} /> Back
          </button>
        }
      />

      <div className="page-body">
        <ConfirmModal
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        confirmTone={confirm?.confirmTone}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
      {toast && (
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, background: "var(--text)", color: "var(--bg-elevated)", padding: "10px 16px", borderRadius: "var(--r-md)", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontWeight: 500 }}>
            {toast}
          </div>
        )}

        {error && (
          <div style={{ padding: "12px 16px", background: "var(--sev-critical-bg)", border: "1px solid var(--sev-critical)", borderRadius: "var(--r-md)", color: "var(--sev-critical)", fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        {loading ? (
          <Card><div className="empty"><div>Loading email…</div></div></Card>
        ) : !email ? (
          <Card><div className="empty"><div>Email not found.</div></div></Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "var(--gap-card)", alignItems: "start" }}>

            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-card)" }}>

              {/* Header metadata */}
              <Card>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                  <div>
                    <div className="meta-label">From</div>
                    <div className="meta-value" style={{ color: email.has_spoofed_domain ? "var(--sev-critical)" : undefined }}>{email.sender}</div>
                    {email.has_spoofed_domain && <div style={{ fontSize: 11, color: "var(--sev-critical)", marginTop: 2 }}>⚠ Possible spoofed domain</div>}
                  </div>
                  <div>
                    <div className="meta-label">To</div>
                    <div className="meta-value">{email.inbox || "—"}</div>
                  </div>
                  <div>
                    <div className="meta-label">Date received</div>
                    <div className="meta-value" style={{ fontSize: 12.5 }}>{email.date_received}</div>
                  </div>
                  <div>
                    <div className="meta-label">Status</div>
                    <div className="meta-value row" style={{ gap: 6 }}>
                      {email.is_quarantined
                        ? <><I.Lock size={13} style={{ color: "var(--sev-high)" }}/> Quarantined</>
                        : <><I.Check size={13} style={{ color: "var(--sev-low)" }}/> Released</>}
                    </div>
                  </div>
                  <div>
                    <div className="meta-label">Language</div>
                    <div className="meta-value">{email.detected_language?.toUpperCase() || "—"}{email.is_non_english && " ⚠"}</div>
                  </div>
                  {email.analysed_at && (
                    <div>
                      <div className="meta-label">Analysed at</div>
                      <div className="meta-value" style={{ fontSize: 12.5 }}>{email.analysed_at}</div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Subject */}
              <Card title="Subject">
                <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: email.subject_has_urgent ? "var(--sev-high)" : "var(--text)" }}>
                  {email.subject}
                  {email.subject_has_urgent && <span style={{ fontSize: 11, color: "var(--sev-high)", marginLeft: 8, fontWeight: 400 }}>urgent language detected</span>}
                </p>
              </Card>

              {/* Score breakdown */}
              <Card title={<><I.Activity size={14}/> Risk breakdown by category</>}>
                <div>
                  {breakdown.map((row, i) => (
                    <BreakdownRow key={i} {...row} />
                  ))}
                </div>
              </Card>

              {/* Message body */}
              <Card
                title={<><I.FileText size={14}/> Message body</>}
                action={
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    <I.AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }}/>
                    Highlighted phrases indicate detected triggers
                  </span>
                }
              >
                <HighlightedBody body={email.body} />
              </Card>

              {/* Raw headers toggle */}
              {email.header_data && (
                <Card
                  title={<><I.Code size={14}/> Email headers</>}
                  action={
                    <button className="btn" data-size="sm" data-variant="ghost" onClick={() => setShowRawHeaders(v => !v)}>
                      {showRawHeaders ? "Hide raw" : "Show raw"} <I.ChevronDown size={12} style={{ transform: showRawHeaders ? "rotate(180deg)" : undefined }}/>
                    </button>
                  }
                >
                  {showRawHeaders
                    ? <pre style={{ margin: 0, fontSize: 11.5, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: 1.6 }}>{email.header_data}</pre>
                    : <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Toggle to view raw header dump.</div>
                  }
                </Card>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-card)" }}>

              {/* Risk gauge */}
              <Card title="Risk score">
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
                  <RiskGauge score={email.risk_score} />
                </div>
              </Card>

              {/* Detection flags */}
              <Card title={<><I.ShieldAlert size={14}/> Detection flags</>}>
                {flags.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No flags triggered.</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {flags.map((f, i) => <FlagChip key={i} {...f} />)}
                  </div>
                )}
              </Card>

              {/* Actions */}
              <Card title="Actions">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {email.is_quarantined && (
                    <button className="btn" data-variant="primary" style={{ justifyContent: "center" }} disabled={!!actionLoading} onClick={handleRelease}>
                      <I.CornerUpRight size={13} /> {actionLoading === "release" ? "Releasing…" : "Release from quarantine"}
                    </button>
                  )}
                  <button className="btn" style={{ justifyContent: "center", background: "var(--sev-low-bg)", color: "var(--sev-low)", border: "1px solid var(--sev-low)" }} disabled={!!actionLoading} onClick={() => handleFeedback("Safe")}>
                    <I.Check size={13} /> {actionLoading === "Safe" ? "Saving…" : "Mark as Safe"}
                  </button>
                  <button className="btn" style={{ justifyContent: "center", background: "var(--sev-critical-bg)", color: "var(--sev-critical)", border: "1px solid var(--sev-critical)" }} disabled={!!actionLoading} onClick={() => handleFeedback("Phishing")}>
                    <I.ShieldAlert size={13} /> {actionLoading === "Phishing" ? "Saving…" : "Confirm Phishing"}
                  </button>
                  <button className="btn" data-variant="ghost" style={{ justifyContent: "center", color: "var(--sev-critical)" }} disabled={!!actionLoading} onClick={handleDelete}>
                    <I.Trash size={13} /> {actionLoading === "delete" ? "Deleting…" : "Delete email"}
                  </button>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
                  <I.Info size={11} style={{ verticalAlign: -1, marginRight: 4 }}/>
                  Feedback improves classifier accuracy on next retraining cycle.
                </p>
              </Card>

            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default EmailDetailsPage;
