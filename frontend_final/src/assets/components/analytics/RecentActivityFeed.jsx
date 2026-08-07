/**
 * RecentActivityFeed.jsx
 * Live activity feed panel for the Analytics Dashboard.
 *
 * Renders:
 *  - Recent Activity timeline  (from notifications)
 *  - Recent Shipments list
 *  - Recent Deliveries list
 *  - Recent Delays list
 *  - Recent Driver Assignments list
 *
 * Props:
 *   data    {AnalyticsActivityResponse | null}
 *   loading {boolean}
 */

const EVENT_META = {
  SHIPMENT_CREATED:   { icon: "📦", color: "#2563eb", bg: "#eff6ff" },
  DRIVER_ASSIGNED:    { icon: "🧑‍✈️", color: "#0284c7", bg: "#f0f9ff" },
  PICKED_UP:          { icon: "🤝", color: "#65a30d", bg: "#f7fee7" },
  IN_TRANSIT:         { icon: "🚛", color: "#0d9488", bg: "#f0fdfa" },
  OUT_FOR_DELIVERY:   { icon: "🏠", color: "#7c3aed", bg: "#f5f3ff" },
  DELIVERED:          { icon: "✅", color: "#16a34a", bg: "#f0fdf4" },
  DELAYED:            { icon: "⚠️", color: "#ea580c", bg: "#fff7ed" },
  CANCELLED:          { icon: "❌", color: "#dc2626", bg: "#fef2f2" },
  FAILED_DELIVERY:    { icon: "🚫", color: "#be123c", bg: "#fff1f2" },
  RETURNED:           { icon: "↩️", color: "#9333ea", bg: "#fdf4ff" },
  PASSWORD_RESET:     { icon: "🔑", color: "#d97706", bg: "#fffbeb" },
  ACCOUNT_APPROVED:   { icon: "✔️", color: "#16a34a", bg: "#f0fdf4" },
  ACCOUNT_REJECTED:   { icon: "🚷", color: "#dc2626", bg: "#fef2f2" },
  UNKNOWN:            { icon: "📌", color: "#64748b", bg: "#f8fafc" },
};

function getEventMeta(type) {
  return EVENT_META[type] || EVENT_META.UNKNOWN;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

function ActivityTimeline({ items }) {
  if (!items?.length) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
        No recent activity
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => {
        const meta = getEventMeta(item.eventType);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "10px 14px",
              background: meta.bg,
              borderRadius: 10,
              borderLeft: `3px solid ${meta.color}`,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>{meta.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 13 }}>
                  {item.title || item.eventType?.replace(/_/g, " ")}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {formatTime(item.occurredAt)}
                </span>
              </div>
              {item.trackingNumber && (
                <div style={{ fontSize: 11, color: meta.color, fontWeight: 600, marginTop: 2 }}>
                  #{item.trackingNumber}
                </div>
              )}
              {item.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_COLORS = {
  DELIVERED:        "#16a34a",
  IN_TRANSIT:       "#0d9488",
  OUT_FOR_DELIVERY: "#7c3aed",
  PENDING_DRIVER:   "#d97706",
  DRIVER_ASSIGNED:  "#0284c7",
  PICKED_UP:        "#65a30d",
  DELAYED:          "#ea580c",
  CANCELLED:        "#dc2626",
  FAILED_DELIVERY:  "#be123c",
  RETURNED:         "#9333ea",
};

function ShipmentRow({ item }) {
  const statusColor = STATUS_COLORS[item.status] || "#64748b";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
            {item.trackingNumber}
          </span>
          <span
            style={{
              background: `${statusColor}18`,
              color: statusColor,
              borderRadius: 5,
              padding: "2px 7px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {item.status?.replace(/_/g, " ")}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
          {item.originCity || "?"} → {item.destinationCity || "?"}
          {item.assignedDriverName && (
            <span style={{ color: "#0284c7", marginLeft: 8 }}>
              👤 {item.assignedDriverName}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
        {formatTime(item.deliveredAt || item.updatedAt || item.createdAt)}
      </div>
    </div>
  );
}

function RecentList({ items, emptyMsg = "No items" }) {
  if (!items?.length) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
        {emptyMsg}
      </div>
    );
  }
  return (
    <div>
      {items.map((item, i) => (
        <ShipmentRow key={item.id || i} item={item} />
      ))}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      }}
    >
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: 14,
          fontWeight: 700,
          color: "#1e293b",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function SkeletonRows({ n = 5 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 48,
            borderRadius: 8,
            background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      ))}
    </div>
  );
}

export default function RecentActivityFeed({ data, loading }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
    marginTop: 20,
  };

  if (loading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Panel key={i} title="">
            <SkeletonRows />
          </Panel>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      {/* Full-width activity timeline */}
      <Panel title="🔔 Recent Activity">
        <ActivityTimeline items={data?.recentActivity} />
      </Panel>

      {/* Four recent-item grids */}
      <div style={{ ...gridStyle, marginTop: 16 }}>
        <Panel title="📦 Recent Shipments">
          <RecentList
            items={data?.recentShipments}
            emptyMsg="No shipments yet"
          />
        </Panel>
        <Panel title="✅ Recent Deliveries">
          <RecentList
            items={data?.recentDeliveries}
            emptyMsg="No deliveries yet"
          />
        </Panel>
        <Panel title="⚠️ Recent Delays">
          <RecentList
            items={data?.recentDelays}
            emptyMsg="No delayed shipments"
          />
        </Panel>
        <Panel title="🧑‍✈️ Recent Assignments">
          <RecentList
            items={data?.recentAssignments}
            emptyMsg="No driver assignments yet"
          />
        </Panel>
      </div>
    </div>
  );
}
