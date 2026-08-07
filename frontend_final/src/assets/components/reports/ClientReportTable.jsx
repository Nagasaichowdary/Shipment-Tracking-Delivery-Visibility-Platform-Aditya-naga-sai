/**
 * ClientReportTable.jsx
 * Business client statistics table for the Business Clients tab.
 * Data from GET /api/reports/clients.
 */

function DeliveryRateBadge({ rate }) {
  const color = rate >= 80 ? "#16a34a" : rate >= 50 ? "#f59e0b" : "#dc2626";
  const bg    = rate >= 80 ? "#dcfce7" : rate >= 50 ? "#fef9c3" : "#fee2e2";
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12,
        fontWeight: 700, background: bg, color }}>
      {rate.toFixed(1)}%
    </span>
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

export default function ClientReportTable({ data, loading }) {
  if (loading) return <div>{[...Array(5)].map((_, i) => <Shimmer key={i} />)}</div>;
  if (!data)   return null;

  const clients = data.clients || [];

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700,
    color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap",
  };
  const tdStyle = { padding: "12px 14px", fontSize: 13, color: "#1e293b", borderBottom: "1px solid #f1f5f9" };

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)", flex: "1 1 140px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Active Clients</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{data.totalClients}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)", flex: "1 1 140px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Shipments</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
            {(data.totalShipmentsByClients || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 36 }}>#</th>
              <th style={thStyle}>Client Name</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Business Type</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Delivered</th>
              <th style={thStyle}>Delivery Rate</th>
              <th style={thStyle}>Last Shipment</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr><td colSpan={8} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>
                No business client data for the selected period.
              </td></tr>
            ) : clients.map((c, i) => (
              <tr key={c.userId} style={{ transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ ...tdStyle, color: "#94a3b8", fontWeight: 700 }}>{i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{c.clientName}</td>
                <td style={tdStyle}>{c.companyName || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                <td style={tdStyle}>
                  {c.businessType
                    ? <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11,
                          fontWeight: 700, background: "#dbeafe", color: "#1e40af" }}>{c.businessType}</span>
                    : <span style={{ color: "#94a3b8" }}>—</span>}
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{c.totalShipments}</td>
                <td style={{ ...tdStyle, color: "#16a34a", fontWeight: 700 }}>{c.deliveredShipments}</td>
                <td style={tdStyle}><DeliveryRateBadge rate={c.deliveryRate || 0} /></td>
                <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>{c.lastShipmentDate || "—"}</td>
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
