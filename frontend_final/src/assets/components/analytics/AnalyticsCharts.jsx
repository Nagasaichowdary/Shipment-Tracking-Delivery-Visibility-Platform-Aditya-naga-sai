/**
 * AnalyticsCharts.jsx
 * All Recharts visualisations for the Analytics Dashboard.
 *
 * Renders 10 charts across a responsive grid:
 *  1. Shipment Status Distribution (Pie / Donut)
 *  2. Monthly Shipment Trend (Area)
 *  3. Monthly Deliveries (Bar)
 *  4. Top Destination Cities (Horizontal Bar)
 *  5. Top Origin Cities (Horizontal Bar)
 *  6. Shipment Type Distribution (Bar)
 *  7. Package Type Distribution (Pie)
 *  8. Top Business Clients / Creators (Horizontal Bar)
 *  9. Driver Performance (Table with progress bars)
 * 10. Guest vs Registered Customer Ratio (Pie)
 *
 * Props:
 *   data    {AnalyticsChartsResponse | null}
 *   loading {boolean}
 */

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  "#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0d9488",
  "#d97706", "#dc2626", "#0284c7", "#9333ea", "#65a30d",
  "#be123c", "#0ea5e9",
];

const STATUS_COLORS = {
  DELIVERED:       "#16a34a",
  IN_TRANSIT:      "#0d9488",
  OUT_FOR_DELIVERY:"#7c3aed",
  PENDING_DRIVER:  "#d97706",
  DRIVER_ASSIGNED: "#0284c7",
  PICKED_UP:       "#65a30d",
  DELAYED:         "#ea580c",
  CANCELLED:       "#dc2626",
  FAILED_DELIVERY: "#be123c",
  RETURNED:        "#9333ea",
  CREATED:         "#94a3b8",
};

// ── Shared helpers ────────────────────────────────────────────────────────────
function ChartCard({ title, children, span = 1 }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
        gridColumn: span > 1 ? `span ${span}` : undefined,
      }}
    >
      <h3
        style={{
          margin: "0 0 16px",
          fontSize: 14,
          fontWeight: 700,
          color: "#1e293b",
          letterSpacing: "0.01em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyState({ message = "No data available" }) {
  return (
    <div
      style={{
        height: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

function SkeletonChart({ height = 200 }) {
  return (
    <div
      style={{
        height,
        background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
        backgroundSize: "200% 100%",
        borderRadius: 10,
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

// ── Chart 1 — Status Distribution (Donut) ─────────────────────────────────────
function StatusPie({ data }) {
  if (!data?.length) return <EmptyState />;
  const formatted = data.map((d) => ({ name: d.label, value: d.count }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {formatted.map((entry) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] || "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip formatter={(v, n) => [v, n.replace(/_/g, " ")]} />
        <Legend
          formatter={(v) => v.replace(/_/g, " ")}
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Chart 2 — Monthly Shipment Volume (Bar) ───────────────────────────────────
function MonthlyTrend({ data }) {
  if (!data?.length) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Shipments" fill="#2563eb" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Chart 3 — Monthly Deliveries (Bar) ────────────────────────────────────────
function MonthlyDeliveries({ data }) {
  if (!data?.length) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Deliveries" fill="#16a34a" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Chart 4/5 — Top Cities (Horizontal Bar) ───────────────────────────────────
function TopCitiesBar({ data, color = "#2563eb" }) {
  if (!data?.length) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
        <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} width={90} />
        <Tooltip />
        <Bar dataKey="count" name="Shipments" fill={color} radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Chart 6 — Shipment Type Distribution (Bar) ────────────────────────────────
function ShipmentTypesBar({ data }) {
  if (!data?.length) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Count" radius={[5, 5, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Chart 7 — Package Type Distribution (Pie) ─────────────────────────────────
function PackageTypePie({ data }) {
  if (!data?.length) return <EmptyState />;
  const formatted = data.map((d) => ({ name: d.label, value: d.count }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {formatted.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Chart 8 — Top Creators (Horizontal Bar) ───────────────────────────────────
function TopCreatorsBar({ data }) {
  return <TopCitiesBar data={data} color="#7c3aed" />;
}

// ── Chart 9 — Driver Performance (Table) ─────────────────────────────────────
function DriverTable({ data }) {
  if (!data?.length) return <EmptyState message="No driver data available" />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {[
              "Driver",
              "Assigned",
              "Delivered",
              "Failed",
              "Rejected",
              "Completion",
              "Avg Delay (min)",
              "Avg Delivery (hrs)",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: "#64748b",
                  fontSize: 12,
                  borderBottom: "1.5px solid #e2e8f0",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr
              key={d.driverId || i}
              style={{
                borderBottom: "1px solid #f1f5f9",
                background: i % 2 === 0 ? "#fff" : "#fafafa",
              }}
            >
              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b" }}>
                {d.driverName}
              </td>
              <td style={{ padding: "10px 12px", color: "#334155" }}>{d.totalAssigned}</td>
              <td style={{ padding: "10px 12px", color: "#16a34a", fontWeight: 600 }}>
                {d.delivered}
              </td>
              <td style={{ padding: "10px 12px", color: "#dc2626" }}>{d.failedDeliveries}</td>
              <td style={{ padding: "10px 12px", color: "#9333ea" }}>{d.rejectedShipments}</td>
              <td style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 7,
                      background: "#e2e8f0",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(d.completionRate, 100)}%`,
                        background:
                          d.completionRate >= 80
                            ? "#16a34a"
                            : d.completionRate >= 50
                            ? "#d97706"
                            : "#dc2626",
                        borderRadius: 4,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", minWidth: 38 }}>
                    {d.completionRate.toFixed(1)}%
                  </span>
                </div>
              </td>
              <td style={{ padding: "10px 12px", color: "#64748b" }}>
                {d.avgDelayMinutes != null ? d.avgDelayMinutes.toFixed(0) : "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "#64748b" }}>
                {d.avgDeliveryHours != null ? d.avgDeliveryHours.toFixed(1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Chart 10 — Guest vs Registered (Pie) ──────────────────────────────────────
function GuestVsRegisteredPie({ data }) {
  if (!data) return <EmptyState />;
  const formatted = [
    { name: "Guest", value: data.guestCount },
    { name: "Registered", value: data.registeredCount },
  ].filter((d) => d.value > 0);
  if (!formatted.length) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          outerRadius={85}
          paddingAngle={4}
          dataKey="value"
        >
          <Cell fill="#ea580c" />
          <Cell fill="#2563eb" />
        </Pie>
        <Tooltip />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AnalyticsCharts({ data, loading }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 16,
    marginTop: 20,
  };

  if (loading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ChartCard key={i} title="">
            <SkeletonChart height={220} />
          </ChartCard>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
      {/* Row 1 — Status + Monthly Trend */}
      <div style={gridStyle}>
        <ChartCard title="📊 Shipment Status Distribution">
          <StatusPie data={data?.statusDistribution} />
        </ChartCard>
        <ChartCard title="📈 Monthly Shipment Volume (Last 6 Months)">
          <MonthlyTrend data={data?.monthlyShipmentTrend} />
        </ChartCard>
        <ChartCard title="✅ Monthly Deliveries (Last 6 Months)">
          <MonthlyDeliveries data={data?.monthlyDeliveryTrend} />
        </ChartCard>
      </div>

      {/* Row 2 — Cities */}
      <div style={gridStyle}>
        <ChartCard title="🏙️ Top Destination Cities">
          <TopCitiesBar data={data?.topDestinationCities} color="#0d9488" />
        </ChartCard>
        <ChartCard title="📍 Top Origin Cities">
          <TopCitiesBar data={data?.topOriginCities} color="#2563eb" />
        </ChartCard>
      </div>

      {/* Row 3 — Types + Guest/Registered */}
      <div style={gridStyle}>
        <ChartCard title="🚀 Shipment Type Breakdown">
          <ShipmentTypesBar data={data?.shipmentTypeDistribution} />
        </ChartCard>
        <ChartCard title="📦 Package Type Distribution">
          <PackageTypePie data={data?.packageTypeDistribution} />
        </ChartCard>
        <ChartCard title="👥 Guest vs Registered Receivers">
          <GuestVsRegisteredPie data={data?.guestVsRegistered} />
        </ChartCard>
      </div>

      {/* Row 4 — Top Creators */}
      <div style={gridStyle}>
        <ChartCard title="🏢 Top Shipment Creators">
          <TopCreatorsBar data={data?.topCreators} />
        </ChartCard>
      </div>

      {/* Row 5 — Driver Performance (full width) */}
      <ChartCard title="🧑‍✈️ Driver Performance">
        <DriverTable data={data?.driverPerformance} />
      </ChartCard>
    </div>
  );
}
