import React from "react";
import Icons from "./Icons";

const I = Icons;

// Shared building blocks

// === Severity helpers ===
function riskLevel(score) {
  if (score >= 8) return "critical";
  if (score >= 6) return "high";
  if (score >= 4) return "medium";
  if (score >= 2) return "low";
  return "clean";
}
function riskColor(score) {
  const l = riskLevel(score);
  return `var(--sev-${l})`;
}
function riskLabel(score) {
  return { critical: "Critical", high: "High", medium: "Medium", low: "Low", clean: "Clean" }[riskLevel(score)];
}

const Sev = ({ score, level, label, children }) => {
  const lvl = level || riskLevel(score);
  return (
    <span className="sev" data-level={lvl}>
      <span className="sev-dot" style={{ background: `var(--sev-${lvl})` }}></span>
      {children || label || riskLabel(score ?? 0)}
    </span>
  );
};

const RiskBar = ({ score, showLabel = true }) => {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <div className="risk-bar">
      <div className="track">
        <div className="fill" style={{ width: `${pct}%`, background: riskColor(score) }}></div>
      </div>
      {showLabel && <span className="score" style={{ color: riskColor(score) }}>{score.toFixed(1)}</span>}
    </div>
  );
};

const Chip = ({ tone, children, icon }) => (
  <span className="chip" data-tone={tone}>
    {icon}
    {children}
  </span>
);

// === Sparkline (mini line) ===
const Sparkline = ({ data, color, height = 28, fill = true }) => {
  const w = 100, h = height;
  if (!data || !data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="kpi-spark">
      {fill && <path d={area} fill={color} fillOpacity="0.10" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
};

// === KPI card ===
const Kpi = ({ label, value, delta, dir, spark, sparkColor, icon, format }) => {
  const fmt = (v) => format === "pct" ? `${(v * 100).toFixed(1)}%` : (format === "pp" ? (v >= 0 ? `+${v}` : `${v}`) + " pp" : (v >= 0 ? `+${v}` : v) + "%");
  return (
    <div className="kpi">
      <div className="kpi-label">{icon}{label}</div>
      <div className="kpi-row">
        <div className="kpi-value">{value}</div>
        {delta != null && (
          <span className="kpi-delta" data-dir={dir}>
            {dir === "up" && <I.ArrowUp size={11} />}
            {dir === "down" && <I.ArrowDown size={11} />}
            {dir === "flat" && <I.Minus size={11} />}
            {fmt(delta)}
          </span>
        )}
      </div>
      {spark && <Sparkline data={spark} color={sparkColor || "var(--accent)"} />}
    </div>
  );
};

// === Card ===
const Card = ({ title, sub, action, children, padded = true }) => (
  <div className="card">
    {(title || action) && (
      <div className="card-head">
        <div>
          {title && <div className="card-title">{title}</div>}
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        {action}
      </div>
    )}
    <div style={{ padding: padded ? "var(--pad-lg)" : 0 }}>{children}</div>
  </div>
);

// === Segmented control ===
const Seg = ({ value, onChange, options }) => (
  <div className="seg">
    {options.map(o => (
      <button key={o.value} data-active={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
    ))}
  </div>
);

// === Brand mark ===
const BrandMark = ({ tweak }) => (
  <div className="brand-mark" aria-hidden="true">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// === Sidebar ===
const Sidebar = ({ route, setRoute, brandName, env, quarantineCount, onAccount, onSignOut }) => {
  const nav = [
    { key: "dashboard",  label: "Dashboard",  icon: <I.Activity size={16} /> },
    { key: "quarantine", label: "Quarantine", icon: <I.Lock size={16} />, badge: quarantineCount, badgeTone: "critical" },
    { key: "settings",   label: "Sensitivity", icon: <I.Sliders size={16} /> },
    { key: "audit-log",  label: "Audit Log",  icon: <I.FileText size={16} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <span className="brand-name">{brandName}</span>
      </div>

      <div className="nav-group">
        {nav.map(item => (
          <button
            key={item.key}
            className="nav-item"
            data-active={route === item.key}
            onClick={() => setRoute(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge ? (
              <span className="nav-badge" data-tone={item.badgeTone}>{item.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div
        className="sidebar-foot"
        style={{ cursor: "pointer" }}
        data-active={route === "account"}
        onClick={() => onAccount && onAccount()}
      >
        <div className="avatar">{(localStorage.getItem("userName") || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}</div>
        <div className="foot-meta">
          <div className="foot-name">{localStorage.getItem("userName") || "User"}</div>

          <div className="foot-role">{localStorage.getItem("userEmail") || ""}</div>
        </div>
        <button
          className="btn"
          data-variant="ghost"
          data-size="sm"
          style={{ padding: 4, height: 24, width: 24, justifyContent: "center" }}
          title="Sign out"
          onClick={(e) => { e.stopPropagation(); onSignOut && onSignOut(); }}
        >
          <I.LogOut size={13} />
        </button>
      </div>
    </aside>
  );
};

// === Page Header ===
const PageHeader = ({ crumbs, actions }) => (
  <header className="page-header">
    <div className="crumbs">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <I.ChevronRight size={12} />}
          {i === crumbs.length - 1 ? <strong>{c}</strong> : <span>{c}</span>}
        </React.Fragment>
      ))}
    </div>
    <div className="page-actions">{actions}</div>
  </header>
);

// === Threats chart (stacked area-ish, time series) ===
const ThreatsChart = ({ data }) => {
  const w = 700, h = 200, pad = { l: 36, r: 12, t: 12, b: 24 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const maxY = Math.max(...data.map(d => d.clean + d.suspicious + d.phishing));
  const step = cw / (data.length - 1);
  const yScale = (v) => pad.t + ch - (v / maxY) * ch;
  const xScale = (i) => pad.l + i * step;

  const buildArea = (key, baseKey) => {
    let top = data.map((d, i) => [xScale(i), yScale(key === "clean" ? d.clean : (key === "suspicious" ? d.clean + d.suspicious : d.clean + d.suspicious + d.phishing))]);
    let bot = data.map((d, i) => [xScale(i), yScale(baseKey ? (baseKey === "clean" ? d.clean : d.clean + d.suspicious) : 0)]).reverse();
    return [...top, ...bot].map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + " Z";
  };

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxY / yTicks) * i));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" preserveAspectRatio="none">
      {/* grid */}
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r} y1={yScale(v)} y2={yScale(v)} stroke="var(--border-faint)" strokeDasharray={i === 0 ? "0" : "2 3"} />
          <text x={pad.l - 8} y={yScale(v) + 3} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-muted)">{v}</text>
        </g>
      ))}
      {/* areas */}
      <path d={buildArea("clean", null)} fill="var(--sev-clean-bg)" stroke="none" />
      <path d={buildArea("suspicious", "clean")} fill="var(--sev-medium-bg)" stroke="none" />
      <path d={buildArea("phishing", "suspicious")} fill="var(--sev-critical-bg)" stroke="none" />
      {/* lines on top */}
      <path d={data.map((d,i) => `${i===0?'M':'L'}${xScale(i)},${yScale(d.clean + d.suspicious + d.phishing)}`).join(' ')} fill="none" stroke="var(--sev-critical)" strokeWidth="1.4" />
      <path d={data.map((d,i) => `${i===0?'M':'L'}${xScale(i)},${yScale(d.clean + d.suspicious)}`).join(' ')} fill="none" stroke="var(--sev-medium)" strokeWidth="1.2" opacity="0.7" />
      {/* x axis */}
      {data.filter((_, i) => i % 4 === 0).map((d, i) => (
        <text key={i} x={xScale(i * 4)} y={h - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-muted)">{d.t}:00</text>
      ))}
    </svg>
  );
};

// === Gauge for risk score ===
const RiskGauge = ({ score, verdict }) => {
  const a0 = Math.PI, a1 = 0;
  const r = 60, cx = 80, cy = 70;
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const angle = a0 - (a0 - a1) * pct;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const large = pct > 0.5 ? 1 : 0;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x} ${y}`;
  const fullPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  const color = riskColor(score);
  return (
    <div className="gauge">
      <svg viewBox="0 0 160 100" className="gauge-svg">
        <path d={fullPath} stroke="var(--bg-sunken)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d={arcPath} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
        {/* ticks */}
        {[0, 2, 4, 6, 8, 10].map(t => {
          const a = a0 - (a0 - a1) * (t / 10);
          const r1 = r + 4, r2 = r + 8;
          return <line key={t} x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)} stroke="var(--text-faint)" strokeWidth="1" />;
        })}
      </svg>
      <div className="gauge-num" style={{ color }}>{score.toFixed(1)}</div>
      <div className="gauge-out">out of 10</div>
      <div className="gauge-verdict"><Sev score={score} label={verdict} /></div>
    </div>
  );
};

// === Breakdown row ===
const BreakdownRow = ({ cat, score, meta }) => (
  <div className="breakdown-row">
    <div>
      <div className="breakdown-cat">{cat}</div>
      <div className="breakdown-meta">{meta}</div>
    </div>
    <RiskBar score={score} />
  </div>
);

export {
  riskLevel, riskColor, riskLabel,
  Sev, RiskBar, Chip, Sparkline, Kpi, Card, Seg,
  Sidebar, PageHeader, ThreatsChart, RiskGauge, BreakdownRow, BrandMark,
};

export default {
  riskLevel, riskColor, riskLabel,
  Sev, RiskBar, Chip, Sparkline, Kpi, Card, Seg,
  Sidebar, PageHeader, ThreatsChart, RiskGauge, BreakdownRow, BrandMark,
};
