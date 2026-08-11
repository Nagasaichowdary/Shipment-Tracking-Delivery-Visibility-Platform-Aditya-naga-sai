import { useContext, useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { AuthContext } from "../context/auth";
import { getMyAnalytics } from "../services/api";

// ── Palette ─────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  DELIVERED:        "#16a34a",
  IN_TRANSIT:       "#0d9488",
  OUT_FOR_DELIVERY: "#7c3aed",
  DRIVER_ASSIGNED:  "#0284c7",
  PICKED_UP:        "#65a30d",
  DELAYED:          "#ea580c",
  CANCELLED:        "#dc2626",
  FAILED_DELIVERY:  "#be123c",
  CREATED:          "#94a3b8",
};
const DEST_COLORS = ["#2563eb","#0d9488","#7c3aed","#ea580c","#16a34a"];

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color = "#2563eb", sub }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "18px 22px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)", display: "flex",
      flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>
        {value ?? "—"}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
}

// ── Chart Card ───────────────────────────────────────────────────────────────
function ChartCard({ title, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "20px 22px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>
      No data available
    </div>
  );
}

// ── Period selector ───────────────────────────────────────────────────────────
const PERIODS = [
  { value: "all",   label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "week",  label: "This Week" },
  { value: "today", label: "Today" },
];

export default function MyAnalytics() {
  const { auth } = useContext(AuthContext);
  const [period, setPeriod]   = useState("all");
  const [data,   setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,  setError]    = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMyAnalytics(period)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load analytics."))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>
            📊 My Analytics
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
            Shipment performance for {auth?.user?.name}
            {data?.periodLabel && <span style={{ marginLeft: 8, background: "#eff6ff", color: "#2563eb", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{data.periodLabel}</span>}
          </p>
        </div>
        {/* Period picker */}
        <div style={{ display: "flex", gap: 8 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "1.5px solid",
                borderColor: period === p.value ? "#2563eb" : "#e2e8f0",
                background: period === p.value ? "#2563eb" : "#fff",
                color: period === p.value ? "#fff" : "#475569",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Loading your analytics…
        </div>
      )}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 20px", color: "#dc2626", marginBottom: 24 }}>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── KPI Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 16, marginBottom: 28 }}>
            <KpiCard label="Total Shipments"     value={data.totalShipments}   color="#2563eb" />
            <KpiCard label="Delivered"            value={data.delivered}         color="#16a34a" />
            <KpiCard label="In Transit"           value={data.inTransit}         color="#0d9488" />
            <KpiCard label="Out for Delivery"     value={data.outForDelivery}    color="#7c3aed" />
            <KpiCard label="Delayed"              value={data.delayed}           color="#ea580c" />
            <KpiCard label="Failed"               value={data.failed}            color="#dc2626" />
            <KpiCard label="Cancelled"            value={data.cancelled}         color="#9333ea" />
            <KpiCard
              label="Success Rate"
              value={`${data.successRate ?? 0}%`}
              color={data.successRate >= 80 ? "#16a34a" : data.successRate >= 50 ? "#d97706" : "#dc2626"}
            />
            <KpiCard
              label="Avg Delivery Time"
              value={data.avgDeliveryHours != null ? `${data.avgDeliveryHours.toFixed(1)} hrs` : "—"}
              color="#0284c7"
            />
            <KpiCard
              label="Avg Delay"
              value={data.avgDelayMinutes != null ? `${data.avgDelayMinutes.toFixed(0)} min` : "—"}
              color="#d97706"
            />
          </div>

          {/* ── Charts row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Status Distribution Pie */}
            <ChartCard title="Shipment Status Distribution">
              {!data.statusDistribution?.length ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.statusDistribution.map(d => ({ name: d.label, value: d.count }))}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={2} dataKey="value"
                    >
                      {data.statusDistribution.map((d) => (
                        <Cell key={d.label} fill={STATUS_COLORS[d.label] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n.replace(/_/g, " ")]} />
                    <Legend formatter={(v) => v.replace(/_/g, " ")} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Monthly Shipment Volume Bar */}
            <ChartCard title="Monthly Shipment Volume (Last 6 Months)">
              {!data.monthlyShipmentTrend?.length ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.monthlyShipmentTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Shipments" fill="#2563eb" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Top Destinations */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <ChartCard title="Top Destination Cities">
              {!data.topDestinations?.length ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={Math.max(160, data.topDestinations.length * 45)}>
                  <BarChart
                    data={data.topDestinations.map(d => ({ label: d.label, count: d.count }))}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="count" name="Shipments" radius={[0, 5, 5, 0]}>
                      {data.topDestinations.map((_, i) => (
                        <Cell key={i} fill={DEST_COLORS[i % DEST_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Delivery Performance summary */}
            <ChartCard title="Delivery Performance">
              {data.totalShipments === 0 ? <EmptyChart /> : (
                <div style={{ padding: "8px 0" }}>
                  {[
                    { label: "Delivered",   value: data.delivered,  color: "#16a34a", total: data.totalShipments },
                    { label: "Delayed",     value: data.delayed,    color: "#ea580c", total: data.totalShipments },
                    { label: "Failed",      value: data.failed,     color: "#dc2626", total: data.totalShipments },
                    { label: "Cancelled",   value: data.cancelled,  color: "#9333ea", total: data.totalShipments },
                    { label: "In Transit",  value: data.inTransit,  color: "#0d9488", total: data.totalShipments },
                  ].map((row) => {
                    const pct = row.total > 0 ? Math.round((row.value / row.total) * 100) : 0;
                    return (
                      <div key={row.label} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                          <span style={{ fontWeight: 600, color: "#334155" }}>{row.label}</span>
                          <span style={{ color: row.color, fontWeight: 700 }}>{row.value} <span style={{ color: "#94a3b8", fontWeight: 400 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: row.color, borderRadius: 4, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}

      {!loading && !error && data?.totalShipments === 0 && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#334155", marginBottom: 8 }}>No shipments found</div>
          <div style={{ color: "#64748b" }}>Create your first shipment to see analytics here.</div>
        </div>
      )}
    </div>
  );
}
