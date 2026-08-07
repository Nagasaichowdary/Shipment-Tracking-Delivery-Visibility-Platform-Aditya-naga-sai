/**
 * ReportPeriodTabs.jsx
 * Reusable period filter tabs (Today / This Week / This Month / All Time).
 * Same visual pattern as AnalyticsDashboard.jsx.
 */
const PERIODS = [
  { key: "today", label: "Today"      },
  { key: "week",  label: "This Week"  },
  { key: "month", label: "This Month" },
  { key: "all",   label: "All Time"   },
];

export default function ReportPeriodTabs({ period, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, background: "#f1f5f9", borderRadius: 12, padding: 4, width: "fit-content" }}>
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          style={{
            padding: "7px 18px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
            transition: "all 0.18s",
            background: period === p.key ? "#2563eb" : "transparent",
            color: period === p.key ? "#fff" : "#475569",
            boxShadow: period === p.key ? "0 2px 8px #2563eb44" : "none",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
