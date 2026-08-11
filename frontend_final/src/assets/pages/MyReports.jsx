import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/auth";
import { getMyReport, exportMyReport } from "../services/api";

// ── Status options ────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  "CREATED","DRIVER_ASSIGNED","PICKED_UP","IN_TRANSIT",
  "OUT_FOR_DELIVERY","DELIVERED","DELAYED","CANCELLED","FAILED_DELIVERY",
];

const STATUS_BADGE = {
  DELIVERED:        { bg: "#dcfce7", color: "#16a34a" },
  IN_TRANSIT:       { bg: "#ccfbf1", color: "#0d9488" },
  OUT_FOR_DELIVERY: { bg: "#ede9fe", color: "#7c3aed" },
  DRIVER_ASSIGNED:  { bg: "#dbeafe", color: "#2563eb" },
  PICKED_UP:        { bg: "#ecfccb", color: "#65a30d" },
  DELAYED:          { bg: "#ffedd5", color: "#ea580c" },
  CANCELLED:        { bg: "#fee2e2", color: "#dc2626" },
  FAILED_DELIVERY:  { bg: "#fce7f3", color: "#be123c" },
  CREATED:          { bg: "#f1f5f9", color: "#475569" },
};

function Badge({ status }) {
  const s = STATUS_BADGE[status] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 12,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

function SummaryCard({ label, value, color = "#2563eb" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value ?? "—"}</div>
    </div>
  );
}

const PERIODS = [
  { value: "all",   label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "week",  label: "This Week" },
  { value: "today", label: "Today" },
];

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function MyReports() {
  const { auth } = useContext(AuthContext);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [period,  setPeriod]  = useState("all");
  const [status,  setStatus]  = useState("");
  const [from,    setFrom]    = useState("");
  const [to,      setTo]      = useState("");
  const [page,    setPage]    = useState(0);
  const size = 20;

  // ── Data ─────────────────────────────────────────────────────────────────
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [exporting, setExporting] = useState(null); // "pdf"|"excel"|"csv"|null

  function buildParams() {
    return {
      period,
      ...(status  && { status }),
      ...(from    && { from }),
      ...(to      && { to }),
      page,
      size,
    };
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMyReport(buildParams())
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load report."))
      .finally(() => setLoading(false));
  }, [period, status, from, to, page]);

  function handleFilter() {
    setPage(0);
  }

  function handleReset() {
    setPeriod("all");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(0);
  }

  async function handleExport(format) {
    setExporting(format);
    try {
      const res = await exportMyReport(format, period, from || null, to || null, status || null);
      const ext  = format === "excel" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
      const name = `my-shipment-report.${ext}`;
      triggerDownload(res.data, name);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  const inputStyle = {
    padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8,
    fontSize: 13, color: "#334155", background: "#fff", outline: "none",
    minWidth: 140,
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>
          📄 My Reports
        </h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
          Shipment history for {auth?.user?.name}
          {data?.periodLabel && (
            <span style={{ marginLeft: 8, background: "#eff6ff", color: "#2563eb", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {data.periodLabel}
            </span>
          )}
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Period */}
          <div>
            <label style={labelStyle}>Period</label>
            <select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(0); }} style={inputStyle}>
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} style={inputStyle}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          {/* Date from */}
          <div>
            <label style={labelStyle}>From Date</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
          </div>
          {/* Date to */}
          <div>
            <label style={labelStyle}>To Date</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
          </div>
          {/* Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleFilter}
              style={{ padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Apply
            </button>
            <button
              onClick={handleReset}
              style={{ padding: "8px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      {!loading && !error && data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
          <SummaryCard label="Total"        value={data.totalShipments} color="#2563eb" />
          <SummaryCard label="Delivered"    value={data.delivered}      color="#16a34a" />
          <SummaryCard label="In Transit"   value={data.inTransit}      color="#0d9488" />
          <SummaryCard label="Delayed"      value={data.delayed}        color="#ea580c" />
          <SummaryCard label="Failed"       value={data.failed}         color="#dc2626" />
          <SummaryCard label="Cancelled"    value={data.cancelled}      color="#9333ea" />
          <SummaryCard
            label="Success Rate"
            value={`${data.successRate ?? 0}%`}
            color={data.successRate >= 80 ? "#16a34a" : data.successRate >= 50 ? "#d97706" : "#dc2626"}
          />
          <SummaryCard
            label="Avg Delivery"
            value={data.avgDeliveryHours != null ? `${data.avgDeliveryHours.toFixed(1)}h` : "—"}
            color="#0284c7"
          />
        </div>
      )}

      {/* ── Export buttons ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "flex-end" }}>
        {[
          { fmt: "pdf",   label: "📄 Export PDF",   bg: "#dc2626" },
          { fmt: "excel", label: "📊 Export Excel", bg: "#16a34a" },
          { fmt: "csv",   label: "📋 Export CSV",   bg: "#0284c7" },
        ].map(({ fmt, label, bg }) => (
          <button
            key={fmt}
            onClick={() => handleExport(fmt)}
            disabled={!!exporting}
            style={{
              padding: "9px 18px", background: exporting === fmt ? "#94a3b8" : bg,
              color: "#fff", border: "none", borderRadius: 8, fontWeight: 700,
              fontSize: 13, cursor: exporting ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {exporting === fmt ? "Exporting…" : label}
          </button>
        ))}
      </div>

      {/* ── Loading / Error / Table ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Loading your report…
        </div>
      )}

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 20px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {data.shipments?.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#334155", marginBottom: 8 }}>No shipments found</div>
              <div style={{ color: "#64748b" }}>No shipments match your current filters.</div>
            </div>
          ) : (
            <>
              {/* Table */}
              <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 20 }}>
                <div style={{ padding: "14px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>
                    Shipments
                  </span>
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    {data.totalRecords} record{data.totalRecords !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Tracking #","Receiver","Origin","Destination","Status","Created","Pickup Date","Delivered","Delivery Time"].map((h) => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 12, borderBottom: "1.5px solid #e2e8f0", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.shipments.map((s, i) => {
                        const deliveryHrs = s.deliveredAt && s.createdAt
                          ? ((new Date(s.deliveredAt) - new Date(s.createdAt)) / 3600000).toFixed(1) + " hrs"
                          : "—";
                        return (
                          <tr key={s.id || i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding: "11px 14px", fontWeight: 700, color: "#2563eb", fontFamily: "monospace", fontSize: 12 }}>
                              {s.trackingNumber}
                            </td>
                            <td style={{ padding: "11px 14px", color: "#334155" }}>{s.receiverName || "—"}</td>
                            <td style={{ padding: "11px 14px", color: "#475569" }}>{s.originAddress?.city || "—"}</td>
                            <td style={{ padding: "11px 14px", color: "#475569" }}>{s.destinationAddress?.city || "—"}</td>
                            <td style={{ padding: "11px 14px" }}><Badge status={s.shipmentStatus} /></td>
                            <td style={{ padding: "11px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                              {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                            </td>
                            <td style={{ padding: "11px 14px", color: "#64748b", whiteSpace: "nowrap" }}>—</td>
                            <td style={{ padding: "11px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                              {s.deliveredAt ? new Date(s.deliveredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                            </td>
                            <td style={{ padding: "11px 14px", color: "#334155", fontWeight: 600 }}>{deliveryHrs}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Pagination ── */}
              {data.totalPages > 1 && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{ padding: "7px 16px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", color: page === 0 ? "#cbd5e1" : "#334155", fontWeight: 600, cursor: page === 0 ? "not-allowed" : "pointer" }}
                  >
                    ‹ Prev
                  </button>
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    Page {data.page + 1} of {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                    disabled={page >= data.totalPages - 1}
                    style={{ padding: "7px 16px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", color: page >= data.totalPages - 1 ? "#cbd5e1" : "#334155", fontWeight: 600, cursor: page >= data.totalPages - 1 ? "not-allowed" : "pointer" }}
                  >
                    Next ›
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
