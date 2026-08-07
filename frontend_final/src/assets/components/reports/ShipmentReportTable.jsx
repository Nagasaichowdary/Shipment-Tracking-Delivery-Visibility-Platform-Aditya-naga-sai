/**
 * ShipmentReportTable.jsx
 * Sortable/filterable shipment table for the Shipment Report tab.
 * Data from GET /api/reports/shipments (paginated).
 */
import { useState } from "react";

const STATUS_COLORS = {
  DELIVERED:        { bg: "#dcfce7", color: "#15803d" },
  PENDING_DRIVER:   { bg: "#fef3c7", color: "#92400e" },
  DRIVER_ASSIGNED:  { bg: "#dbeafe", color: "#1e40af" },
  IN_TRANSIT:       { bg: "#e0f2fe", color: "#0369a1" },
  OUT_FOR_DELIVERY: { bg: "#ede9fe", color: "#6d28d9" },
  CANCELLED:        { bg: "#f1f5f9", color: "#475569" },
  FAILED_DELIVERY:  { bg: "#fee2e2", color: "#dc2626" },
  DELAYED:          { bg: "#fef9c3", color: "#854d0e" },
  RETURNED:         { bg: "#fce7f3", color: "#be185d" },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11,
      fontWeight: 700, background: c.bg, color: c.color, whiteSpace: "nowrap",
    }}>
      {(status || "").replace(/_/g, " ")}
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

export default function ShipmentReportTable({ data, loading, onPageChange, onStatusFilter, statusFilter }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const thStyle = (col) => ({
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700,
    color: "#475569", borderBottom: "2px solid #e2e8f0", cursor: "pointer",
    userSelect: "none", whiteSpace: "nowrap",
    background: sortCol === col ? "#f8fafc" : "transparent",
  });

  const tdStyle = {
    padding: "11px 14px", fontSize: 13, color: "#1e293b",
    borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
  };

  const ALL_STATUSES = [
    "DELIVERED","PENDING_DRIVER","DRIVER_ASSIGNED","IN_TRANSIT",
    "OUT_FOR_DELIVERY","CANCELLED","FAILED_DELIVERY","DELAYED","RETURNED","PICKED_UP",
  ];

  if (loading) return <div>{[...Array(8)].map((_, i) => <Shimmer key={i} />)}</div>;
  if (!data)   return null;

  const shipments = data.shipments || [];

  // Client-side sort on current page
  const sorted = [...shipments].sort((a, b) => {
    if (!sortCol) return 0;
    let va = a[sortCol] ?? ""; let vb = b[sortCol] ?? "";
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const sortIcon = (col) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕";

  return (
    <div>
      {/* Status filter + summary */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={statusFilter || ""}
          onChange={(e) => onStatusFilter(e.target.value || null)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
            fontSize: 13, color: "#1e293b", background: "#fff", cursor: "pointer" }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {data.totalRecords?.toLocaleString()} records
          {data.totalPages > 1 && ` · Page ${(data.page || 0) + 1} of ${data.totalPages}`}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr>
              {[
                ["trackingNumber","Tracking #"],["senderName","Sender"],["receiverName","Receiver"],
                ["shipmentStatus","Status"],["shipmentType","Type"],["originAddress","Origin"],
                ["destinationAddress","Destination"],["assignedDriverName","Driver"],["createdAt","Created"],
              ].map(([col, label]) => (
                <th key={col} style={thStyle(col)} onClick={() => handleSort(col)}>
                  {label}{sortIcon(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>
                No shipments found for the selected filters.
              </td></tr>
            ) : sorted.map((s) => (
              <tr key={s.id} style={{ transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#2563eb" }}>{s.trackingNumber}</td>
                <td style={tdStyle}>{s.senderName}</td>
                <td style={tdStyle}>{s.receiverName}</td>
                <td style={tdStyle}><StatusBadge status={s.shipmentStatus} /></td>
                <td style={tdStyle}>{s.shipmentType}</td>
                <td style={tdStyle}>{s.originAddress?.city || "—"}</td>
                <td style={tdStyle}>{s.destinationAddress?.city || "—"}</td>
                <td style={tdStyle}>{s.assignedDriverName || <span style={{ color: "#94a3b8" }}>Unassigned</span>}</td>
                <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button disabled={data.page === 0} onClick={() => onPageChange(data.page - 1)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0",
              background: "#fff", cursor: data.page === 0 ? "not-allowed" : "pointer", fontWeight: 600 }}>
            ← Prev
          </button>
          <span style={{ padding: "6px 14px", fontSize: 13, color: "#475569" }}>
            {(data.page || 0) + 1} / {data.totalPages}
          </span>
          <button disabled={data.page >= data.totalPages - 1} onClick={() => onPageChange(data.page + 1)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0",
              background: "#fff", cursor: data.page >= data.totalPages - 1 ? "not-allowed" : "pointer", fontWeight: 600 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
