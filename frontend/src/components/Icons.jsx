import React from "react";

// Icons — Lucide-style stroke icons. Single source of truth.
const Icon = ({ d, paths, size = 16, stroke = 1.5, fill = "none", style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {paths ? paths.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const Icons = {
  Shield: (p) => <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  ShieldCheck: (p) => <Icon {...p} paths={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "m9 12 2 2 4-4"]} />,
  ShieldAlert: (p) => <Icon {...p} paths={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M12 8v4", "M12 16h.01"]} />,
  Inbox: (p) => <Icon {...p} paths={["M22 12h-6l-2 3h-4l-2-3H2", "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} />,
  Lock: (p) => <Icon {...p} paths={["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"]} />,
  Activity: (p) => <Icon {...p} d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  Settings: (p) => <Icon {...p} paths={["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"]} />,
  FileText: (p) => <Icon {...p} paths={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"]} />,
  Search: (p) => <Icon {...p} paths={["m21 21-4.3-4.3", "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"]} />,
  ChevronRight: (p) => <Icon {...p} d="m9 18 6-6-6-6" />,
  ChevronDown: (p) => <Icon {...p} d="m6 9 6 6 6-6" />,
  ChevronUp: (p) => <Icon {...p} d="m18 15-6-6-6 6" />,
  ArrowUpRight: (p) => <Icon {...p} paths={["M7 7h10v10", "M7 17 17 7"]} />,
  ArrowUp: (p) => <Icon {...p} paths={["m18 15-6-6-6 6"]} />,
  ArrowDown: (p) => <Icon {...p} paths={["m6 9 6 6 6-6"]} />,
  Minus: (p) => <Icon {...p} d="M5 12h14" />,
  Plus: (p) => <Icon {...p} paths={["M5 12h14", "M12 5v14"]} />,
  X: (p) => <Icon {...p} paths={["M18 6 6 18", "m6 6 12 12"]} />,
  Check: (p) => <Icon {...p} d="M20 6 9 17l-5-5" />,
  AlertTriangle: (p) => <Icon {...p} paths={["M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"]} />,
  AlertCircle: (p) => <Icon {...p} paths={["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 8v4", "M12 16h.01"]} />,
  Info: (p) => <Icon {...p} paths={["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 16v-4", "M12 8h.01"]} />,
  Mail: (p) => <Icon {...p} paths={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "m22 6-10 7L2 6"]} />,
  Link: (p) => <Icon {...p} paths={["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"]} />,
  Trash: (p) => <Icon {...p} paths={["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"]} />,
  Eye: (p) => <Icon {...p} paths={["M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]} />,
  EyeOff: (p) => <Icon {...p} paths={["M9.88 9.88a3 3 0 1 0 4.24 4.24", "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68", "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61", "M2 2l20 20"]} />,
  RefreshCw: (p) => <Icon {...p} paths={["M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5"]} />,
  Download: (p) => <Icon {...p} paths={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"]} />,
  Upload: (p) => <Icon {...p} paths={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"]} />,
  Filter: (p) => <Icon {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  Calendar: (p) => <Icon {...p} paths={["M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z", "M16 2v4", "M8 2v4", "M3 10h18"]} />,
  Tag: (p) => <Icon {...p} paths={["M20.59 13.41 12 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z", "M7 7h.01"]} />,
  Users: (p) => <Icon {...p} paths={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"]} />,
  User: (p) => <Icon {...p} paths={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />,
  MoreHorizontal: (p) => <Icon {...p} paths={["M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", "M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", "M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"]} />,
  CornerUpLeft: (p) => <Icon {...p} d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 5 5v7" />,
  CornerUpRight: (p) => <Icon {...p} d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0-5 5v7" />,
  ExternalLink: (p) => <Icon {...p} paths={["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", "M15 3h6v6", "M10 14L21 3"]} />,
  Sliders: (p) => <Icon {...p} paths={["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"]} />,
  Zap: (p) => <Icon {...p} d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  Clock: (p) => <Icon {...p} paths={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 6v6l4 2"]} />,
  TrendingUp: (p) => <Icon {...p} paths={["M22 7l-9.5 9.5-5-5L1 18", "M16 7h6v6"]} />,
  TrendingDown: (p) => <Icon {...p} paths={["M22 17l-9.5-9.5-5 5L1 6", "M16 17h6v-6"]} />,
  Hash: (p) => <Icon {...p} paths={["M4 9h16", "M4 15h16", "M10 3 8 21", "M16 3l-2 18"]} />,
  Globe: (p) => <Icon {...p} paths={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"]} />,
  Server: (p) => <Icon {...p} paths={["M3 4h18v6H3z", "M3 14h18v6H3z", "M7 7h.01", "M7 17h.01"]} />,
  Code: (p) => <Icon {...p} d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  Database: (p) => <Icon {...p} paths={["M12 8c5 0 9-1.3 9-3s-4-3-9-3-9 1.3-9 3 4 3 9 3z", "M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5", "M3 12c0 1.7 4 3 9 3s9-1.3 9-3"]} />,
  Bell: (p) => <Icon {...p} paths={["M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9z", "M10.3 21a1.94 1.94 0 0 0 3.4 0"]} />,
  Type: (p) => <Icon {...p} paths={["M4 7V4h16v3", "M9 20h6", "M12 4v16"]} />,
  AtSign: (p) => <Icon {...p} paths={["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"]} />,
  LogOut: (p) => <Icon {...p} paths={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"]} />,
  PieChart: (p) => <Icon {...p} paths={["M21.21 15.89A10 10 0 1 1 8 2.83", "M22 12A10 10 0 0 0 12 2v10z"]} />,
  Layers: (p) => <Icon {...p} paths={["M12 2 2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"]} />,
  Send: (p) => <Icon {...p} paths={["M22 2 11 13", "M22 2l-7 20-4-9-9-4 20-7z"]} />,
  Sparkles: (p) => <Icon {...p} d="M12 3l1.5 5L18 9.5 13.5 11 12 16l-1.5-5L6 9.5 10.5 8 12 3z" />,
};

export default Icons;
export { Icons };
