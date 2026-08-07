/**
 * SummarySection.jsx
 * Delivery Summary tab — KPI cards + monthly trends + recent deliveries.
 * Data comes from /api/reports/summary which reuses AnalyticsService internally.
 */

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: "20px 24px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${accent}`,
      minWidth: 170,
      flex: "1 1 170px",
    }}>
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Shimmer placeholder ──────────────────────────────────────────────────────
function Shimmer({ h = 80 }) {
  return (
    <div style={{
      height: h, borderRadius: 14, flex: "1 1 170px", minWidth: 170,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ── Recent delivery row ──────────────────────────────────────────────────────
function DeliveryRow({ item }) {
  const badge = {
    display: "inline-block", padding: "2px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#15803d",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{item.trackingNumber}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{item.senderName} → {item.receiverName}</div>
      </div>
      <span style={badge}>DELIVERED</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SummarySection({ data, loading }) {
  if (loading) {
    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          {[...Array(6)].map((_, i) => <Shimmer key={i} />)}
        </div>
        <Shimmer h={200} />
      </div>
    );
  }

  if (!data) return null;
  const ov = data.overview || {};

  const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
  const pct = (n) => (n == null ? "—" : Number(n).toFixed(1) + "%");
  const hrs = (n) => (n == null ? "—" : Number(n).toFixed(1) + " hrs");

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total Shipments"      value={fmt(ov.total)}              accent="#2563eb" />
        <KpiCard label="Delivered"            value={fmt(ov.delivered)}           accent="#16a34a" />
        <KpiCard label="In Transit"           value={fmt(ov.inTransit)}           accent="#0891b2" />
        <KpiCard label="Delayed"              value={fmt(ov.delayed)}             accent="#f59e0b" sub={`${pct(ov.delayRate)} delay rate`} />
        <KpiCard label="Failed Delivery"      value={fmt(ov.failedDelivery)}      accent="#dc2626" />
        <KpiCard label="Cancelled"            value={fmt(ov.cancelled)}           accent="#64748b" />
        <KpiCard label="Delivery Success Rate" value={pct(ov.deliverySuccessRate)} accent="#8b5cf6" />
        <KpiCard label="Avg Delivery Time"    value={hrs(ov.avgDeliveryHours)}    accent="#f97316"
          sub={ov.avgDeliveryDays ? `≈ ${Number(ov.avgDeliveryDays).toFixed(1)} days` : null} />
      </div>

      {/* Recent Deliveries */}
      {data.recentDeliveries && data.recentDeliveries.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
            🚚 Recent Deliveries
          </h3>
          {data.recentDeliveries.map((item, i) => (
            <DeliveryRow key={i} item={item} />
          ))}
        </div>
      )}

      {/* Period info */}
      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
        Period: {data.periodLabel}
      </div>
    </div>
  );
}
