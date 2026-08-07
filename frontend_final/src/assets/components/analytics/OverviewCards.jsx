/**
 * OverviewCards.jsx
 * KPI card grid for the Analytics Dashboard.
 *
 * Renders 16 stat cards in two rows:
 *  Row 1 — Status counts (total, delivered, in-transit, etc.)
 *  Row 2 — Time-window counts + performance metrics
 *
 * Props:
 *   data  {AnalyticsOverviewResponse | null}
 *   loading {boolean}
 */

const CARDS = [
  // ── Status counts ─────────────────────────────────────────────────────────
  {
    key: "total",
    label: "Total Shipments",
    icon: "📦",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: "✅",
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    key: "inTransit",
    label: "In Transit",
    icon: "🚛",
    color: "#0d9488",
    bg: "#f0fdfa",
  },
  {
    key: "outForDelivery",
    label: "Out For Delivery",
    icon: "🏠",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    key: "pendingDriver",
    label: "Pending Driver",
    icon: "⏳",
    color: "#d97706",
    bg: "#fffbeb",
  },
  {
    key: "driverAssigned",
    label: "Driver Assigned",
    icon: "🧑‍✈️",
    color: "#0284c7",
    bg: "#f0f9ff",
  },
  {
    key: "pickedUp",
    label: "Picked Up",
    icon: "🤝",
    color: "#65a30d",
    bg: "#f7fee7",
  },
  {
    key: "delayed",
    label: "Delayed",
    icon: "⚠️",
    color: "#ea580c",
    bg: "#fff7ed",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: "❌",
    color: "#dc2626",
    bg: "#fef2f2",
  },
  {
    key: "failedDelivery",
    label: "Failed Delivery",
    icon: "🚫",
    color: "#be123c",
    bg: "#fff1f2",
  },
  {
    key: "returned",
    label: "Returned",
    icon: "↩️",
    color: "#9333ea",
    bg: "#fdf4ff",
  },
  // ── Time-window counts ────────────────────────────────────────────────────
  {
    key: "today",
    label: "Today",
    icon: "📅",
    color: "#0ea5e9",
    bg: "#f0f9ff",
  },
  {
    key: "thisWeek",
    label: "This Week",
    icon: "🗓️",
    color: "#6366f1",
    bg: "#eef2ff",
  },
  {
    key: "thisMonth",
    label: "This Month",
    icon: "📆",
    color: "#4f46e5",
    bg: "#eef2ff",
  },
  // ── Performance metrics ───────────────────────────────────────────────────
  {
    key: "deliverySuccessRate",
    label: "Success Rate",
    icon: "🏆",
    color: "#16a34a",
    bg: "#f0fdf4",
    suffix: "%",
  },
  {
    key: "avgDeliveryDays",
    label: "Avg Delivery Time",
    icon: "⏱️",
    color: "#2563eb",
    bg: "#eff6ff",
    suffix: " days",
    decimals: 1,
  },
  {
    key: "delayRate",
    label: "Delay Rate",
    icon: "📉",
    color: "#ea580c",
    bg: "#fff7ed",
    suffix: "%",
  },
  {
    key: "avgDelayMinutes",
    label: "Avg Delay",
    icon: "🕐",
    color: "#d97706",
    bg: "#fffbeb",
    suffix: " min",
    decimals: 0,
  },
];

function SkeletonCard() {
  return (
    <div
      style={{
        background: "#f1f5f9",
        borderRadius: 14,
        padding: "18px 20px",
        minHeight: 100,
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function KpiCard({ card, value }) {
  const displayValue =
    value == null
      ? "—"
      : card.decimals !== undefined
      ? `${Number(value).toFixed(card.decimals)}${card.suffix || ""}`
      : `${value}${card.suffix || ""}`;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        border: `1.5px solid ${card.bg}`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 6px 20px ${card.color}22`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
      }}
    >
      {/* Icon + label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 22,
            background: card.bg,
            borderRadius: 8,
            padding: "4px 6px",
            lineHeight: 1,
          }}
        >
          {card.icon}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {card.label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: card.color,
          lineHeight: 1.1,
        }}
      >
        {displayValue}
      </div>
    </div>
  );
}

export default function OverviewCards({ data, loading }) {
  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 14,
        }}
      >
        {CARDS.map((c) => (
          <SkeletonCard key={c.key} />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 14,
      }}
    >
      {CARDS.map((card) => (
        <KpiCard key={card.key} card={card} value={data?.[card.key]} />
      ))}
    </div>
  );
}
