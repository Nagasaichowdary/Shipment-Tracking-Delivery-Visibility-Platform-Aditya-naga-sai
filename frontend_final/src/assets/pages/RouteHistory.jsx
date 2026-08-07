import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth";
import { API } from "../services/api";

/* ─── Status metadata ─────────────────────────────────────────────────────── */
const STATUS_META = {
  PENDING_DRIVER:   { label: "Awaiting Driver",    icon: "⏳", color: "#f59e0b" },
  DRIVER_ASSIGNED:  { label: "Driver Assigned",    icon: "🚗", color: "#3b82f6" },
  PICKED_UP:        { label: "Picked Up",           icon: "📦", color: "#8b5cf6" },
  IN_TRANSIT:       { label: "In Transit",          icon: "🚚", color: "#06b6d4" },
  DELAYED:          { label: "Delayed",             icon: "⚠️", color: "#f97316" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",   icon: "🏃", color: "#10b981" },
  DELIVERED:        { label: "Delivered",           icon: "✅", color: "#22c55e" },
  CANCELLED:        { label: "Cancelled",           icon: "❌", color: "#ef4444" },
  FAILED_DELIVERY:  { label: "Delivery Failed",    icon: "⛔", color: "#dc2626" },
  RETURNED:         { label: "Returned to Sender", icon: "↩️", color: "#6b7280" },
  CREATED:          { label: "Created",             icon: "📋", color: "#6366f1" },
};

function getMeta(status) {
  return STATUS_META[status] || { label: status, icon: "📌", color: "#6b7280" };
}

function formatDateTime(isoString) {
  if (!isoString) return { date: "—", time: "—" };
  const d = new Date(isoString);
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function roleLabel(role) {
  const map = {
    ADMIN:          "Administrator",
    DISPATCHER:     "Logistics Operator",
    DRIVER:         "Driver",
    CUSTOMER:       "Customer",
    BUSINESS_CLIENT:"Business Client",
    System:         "System",
  };
  return map[role] || role || "—";
}

/* ─── Timeline event card ─────────────────────────────────────────────────── */
function TimelineEvent({ event, isFirst, isLast }) {
  const meta      = getMeta(event.status);
  const { date, time } = formatDateTime(event.timestamp);

  return (
    <div className="rh-event-row">
      {/* Connector line */}
      <div className="rh-connector-col">
        {!isFirst && <div className="rh-line rh-line-top" />}
        <div className="rh-dot" style={{ background: meta.color, boxShadow: `0 0 0 4px ${meta.color}22` }}>
          <span className="rh-dot-icon">{meta.icon}</span>
        </div>
        {!isLast && <div className="rh-line rh-line-bottom" />}
      </div>

      {/* Event card */}
      <div className="rh-card">
        <div className="rh-card-header">
          <span className="rh-status-badge" style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}>
            {meta.label}
          </span>
          <div className="rh-time-block">
            <span className="rh-time">{time}</span>
            <span className="rh-date">{date}</span>
          </div>
        </div>

        <p className="rh-description">{event.description || "—"}</p>

        <div className="rh-meta-row">
          {event.location && (
            <span className="rh-meta-item">
              <span className="rh-meta-icon">📍</span>
              {event.location}
            </span>
          )}
          <span className="rh-meta-item">
            <span className="rh-meta-icon">👤</span>
            {event.performedByName || "System"}
          </span>
          <span className="rh-meta-item">
            <span className="rh-meta-icon">🏷️</span>
            {roleLabel(event.performedByRole)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function RouteHistory() {
  const { trackingNumber } = useParams();
  const { auth }           = useContext(AuthContext);
  const navigate           = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!trackingNumber) return;
    setLoading(true);
    setError(null);

    // Use the shared Axios instance from api.js.
    // It automatically attaches the Bearer token (via its request interceptor
    // reading sessionStorage) and routes through the Vite /api proxy in dev,
    // avoiding the SPA index.html fallback that caused the parse error.
    API.get(`/shipments/${encodeURIComponent(trackingNumber)}/route-history`)
      .then((res) => setData(res.data))
      .catch((err) => {
        const msg =
          err?.response?.data?.message ||
          err?.response?.statusText ||
          err?.message ||
          "Unknown error";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [trackingNumber]);

  const events = data?.events || [];
  const currentMeta = data?.currentStatus ? getMeta(data.currentStatus) : null;

  return (
    <div className="page" style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Shipment audit trail</div>
          <h1>Route History</h1>
          <p className="subtle">
            Complete chronological lifecycle for{" "}
            <strong style={{ color: "var(--accent)" }}>{trackingNumber}</strong>
          </p>
        </div>
        <button className="button secondary" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* ── Summary strip ── */}
      {data && (
        <div className="rh-summary-strip">
          <div className="rh-summary-item">
            <span className="rh-summary-label">Tracking Number</span>
            <span className="rh-summary-value">{data.trackingNumber}</span>
          </div>
          <div className="rh-summary-item">
            <span className="rh-summary-label">Current Status</span>
            <span
              className="rh-summary-value"
              style={{ color: currentMeta?.color }}
            >
              {currentMeta?.icon} {currentMeta?.label || data.currentStatus}
            </span>
          </div>
          <div className="rh-summary-item">
            <span className="rh-summary-label">Total Events</span>
            <span className="rh-summary-value">{data.totalEvents}</span>
          </div>
        </div>
      )}

      {/* ── States ── */}
      {loading && (
        <div className="rh-state-box">
          <div className="rh-spinner" />
          <p>Loading route history…</p>
        </div>
      )}

      {error && (
        <div className="rh-state-box rh-error">
          <span className="rh-state-icon">⚠️</span>
          <p>Failed to load route history: {error}</p>
          <button className="button secondary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="rh-state-box">
          <span className="rh-state-icon">📭</span>
          <p>No history records found for this shipment.</p>
        </div>
      )}

      {/* ── Timeline ── */}
      {!loading && !error && events.length > 0 && (
        <div className="rh-timeline">
          {events.map((ev, idx) => (
            <TimelineEvent
              key={ev.id ?? idx}
              event={ev}
              isFirst={idx === 0}
              isLast={idx === events.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
