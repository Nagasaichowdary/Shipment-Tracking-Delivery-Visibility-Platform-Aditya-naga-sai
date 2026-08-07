/**
 * ExportToolbar.jsx
 * PDF / Excel / CSV download buttons for the Delivery Reports module.
 * Calls GET /api/reports/export and triggers a browser file download.
 */
import { useState } from "react";
import { exportReport } from "../../services/api";

const FORMATS = [
  { key: "pdf",   label: "📄 PDF",   color: "#dc2626" },
  { key: "excel", label: "📊 Excel", color: "#16a34a" },
  { key: "csv",   label: "📋 CSV",   color: "#2563eb" },
];

export default function ExportToolbar({ reportType, period, from, to }) {
  const [loading, setLoading] = useState(null); // which format is currently downloading
  const [error,   setError]   = useState("");

  const handleExport = async (format) => {
    setLoading(format);
    setError("");
    try {
      const res  = await exportReport(reportType, format, period, from, to);

      // res.data is already a native Blob (Axios responseType:"blob")
      // Do NOT wrap it in new Blob([res.data]) — that double-wraps and corrupts binary files
      const blob = res.data;
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");

      // Extract filename from Content-Disposition header if available
      const disposition = res.headers["content-disposition"] || "";
      const match       = disposition.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : `${reportType}-report.${format === "excel" ? "xlsx" : format}`;
      a.href     = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginRight: 4 }}>Export:</span>
      {FORMATS.map((f) => (
        <button
          key={f.key}
          id={`export-${reportType}-${f.key}`}
          onClick={() => handleExport(f.key)}
          disabled={loading !== null}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: `1.5px solid ${f.color}22`,
            background: loading === f.key ? f.color + "22" : "#fff",
            color: f.color,
            fontWeight: 700,
            fontSize: 12,
            cursor: loading !== null ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            opacity: loading !== null && loading !== f.key ? 0.5 : 1,
          }}
        >
          {loading === f.key ? "⏳ Downloading…" : f.label}
        </button>
      ))}
      {error && <span style={{ fontSize: 12, color: "#dc2626" }}>⚠️ {error}</span>}
    </div>
  );
}
