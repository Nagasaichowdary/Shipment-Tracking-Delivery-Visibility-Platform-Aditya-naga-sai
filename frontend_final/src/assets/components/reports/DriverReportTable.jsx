/**
 * DriverReportTable.jsx
 * Driver performance rankings table for the Driver Performance tab.
 * Data from GET /api/reports/drivers (which reuses AnalyticsService.getCharts()).
 */

function MetricCell({ value, suffix = "" }) {
  if (value == null) return <span style={{ color: "#94a3b8" }}>—</span>;
  return <span>{Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}{suffix}</span>;
}

function CompletionBar({ rate }) {
  const pct = Math.min(100, Math.max(0, rate || 0));
  const color = pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#dc2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 42 }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function Shimmer() {
  return (
    <div style={{
      height: 44, borderRadius: 8, margin: "6px 0",
      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  );
}

export default function DriverReportTable({ data, loading }) {
  if (loading) return <div>{[...Array(6)].map((_, i) => <Shimmer key={i} />)}</div>;
  if (!data)   return null;

  const drivers = data.drivers || [];

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700,
    color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "12px 14px", fontSize: 13, color: "#1e293b", borderBottom: "1px solid #f1f5f9",
  };

  return (
    <div>
      {/* Fleet summary */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Drivers", value: data.totalDrivers },
          { label: "Fleet Completion Rate", value: (data.overallCompletionRate || 0).toFixed(1) + "%" },
          { label: "Fleet Avg Delivery", value: data.avgDeliveryHours != null ? data.avgDeliveryHours.toFixed(1) + " hrs" : "—" },
        ].map((m) => (
          <div key={m.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", flex: "1 1 140px" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 36 }}>#</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Assigned</th>
              <th style={thStyle}>Delivered</th>
              <th style={thStyle}>Failed</th>
              <th style={thStyle}>Rejected</th>
              <th style={{ ...thStyle, minWidth: 160 }}>Completion Rate</th>
              <th style={thStyle}>Avg Delivery</th>
              <th style={thStyle}>Avg Delay</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>
                No driver data for the selected period.
              </td></tr>
            ) : drivers.map((d, i) => (
              <tr key={d.driverId} style={{ transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ ...tdStyle, color: "#94a3b8", fontWeight: 700 }}>{i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{d.driverName}</td>
                <td style={tdStyle}>{d.totalAssigned}</td>
                <td style={{ ...tdStyle, color: "#16a34a", fontWeight: 700 }}>{d.delivered}</td>
                <td style={{ ...tdStyle, color: "#dc2626" }}>{d.failedDeliveries}</td>
                <td style={{ ...tdStyle, color: "#f59e0b" }}>{d.rejectedShipments}</td>
                <td style={tdStyle}><CompletionBar rate={d.completionRate} /></td>
                <td style={tdStyle}><MetricCell value={d.avgDeliveryHours} suffix=" hrs" /></td>
                <td style={tdStyle}><MetricCell value={d.avgDelayMinutes} suffix=" min" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10, textAlign: "right" }}>
        Period: {data.periodLabel}
      </div>
    </div>
  );
}
