/**
 * RouteReportSection.jsx
 * Route Performance tab — top origin/destination cities + route corridor table.
 * Data from GET /api/analytics/charts (city rankings) + GET /api/reports/routes.
 */

function CityBar({ label, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{label}</span>
        <span style={{ fontSize: 13, color: "#64748b" }}>{count.toLocaleString()}</span>
      </div>
      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#2563eb",
            borderRadius: 4, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function Shimmer({ h = 200 }) {
  return (
    <div style={{
      height: h, borderRadius: 12, marginBottom: 16,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  );
}

export default function RouteReportSection({ data, loading }) {
  if (loading) return <div><Shimmer /><Shimmer /></div>;
  if (!data)   return null;

  const origins      = data.topOriginCities      || [];
  const destinations = data.topDestinationCities || [];
  const routes       = data.topRoutes            || [];
  const maxOrig = origins.length > 0      ? origins[0].count      : 1;
  const maxDest = destinations.length > 0 ? destinations[0].count : 1;

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700,
    color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap",
  };
  const tdStyle = { padding: "11px 14px", fontSize: 13, color: "#1e293b", borderBottom: "1px solid #f1f5f9" };

  return (
    <div>
      {/* City rankings: two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
            📍 Top Origin Cities
          </h3>
          {origins.length === 0
            ? <p style={{ color: "#94a3b8", fontSize: 13 }}>No data available.</p>
            : origins.map((c, i) => <CityBar key={i} label={c.label} count={c.count} maxCount={maxOrig} />)
          }
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
            🎯 Top Destination Cities
          </h3>
          {destinations.length === 0
            ? <p style={{ color: "#94a3b8", fontSize: 13 }}>No data available.</p>
            : destinations.map((c, i) => <CityBar key={i} label={c.label} count={c.count} maxCount={maxDest} />)
          }
        </div>
      </div>

      {/* Route corridors table */}
      {routes.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "16px 24px 0" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
              🗺️ Top Route Corridors
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Origin</th>
                  <th style={thStyle}>Destination</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Delivered</th>
                  <th style={thStyle}>Delivery Rate</th>
                  <th style={thStyle}>Avg Hours</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r, i) => {
                  const rate = r.deliveryRate || 0;
                  const rateColor = rate >= 80 ? "#16a34a" : rate >= 50 ? "#f59e0b" : "#dc2626";
                  return (
                    <tr key={i} style={{ transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{r.origin}</td>
                      <td style={tdStyle}>{r.destination}</td>
                      <td style={tdStyle}>{r.totalShipments}</td>
                      <td style={{ ...tdStyle, color: "#16a34a", fontWeight: 700 }}>{r.deliveredShipments}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11,
                            fontWeight: 700,
                            background: rate >= 80 ? "#dcfce7" : rate >= 50 ? "#fef9c3" : "#fee2e2",
                            color: rateColor }}>
                          {rate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "#64748b" }}>
                        {r.avgDeliveryHours != null ? r.avgDeliveryHours.toFixed(1) + " hrs" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, textAlign: "right" }}>
        Period: {data.periodLabel}
      </div>
    </div>
  );
}
