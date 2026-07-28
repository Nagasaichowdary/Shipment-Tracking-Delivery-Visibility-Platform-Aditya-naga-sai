import { useCallback, useEffect, useRef, useState } from "react";
import DriverLocationCard from "../components/location/DriverLocationCard";

import {
  acceptShipment,
  getAvailableShipments,
  getMyShipments,
  rejectShipmentRequest,
  updateDriverLocation,
} from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// SVG Icons (inline — no extra dependency, consistent with existing codebase)
// ─────────────────────────────────────────────────────────────────────────────
const Icon = {
  MapPin: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={15} height={15} {...props}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Package: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={15} height={15} {...props}>
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  Clock: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={15} height={15} {...props}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Weight: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={15} height={15} {...props}>
      <circle cx="12" cy="5" r="3"/>
      <path d="M6.5 8a2 2 0 0 0-1.905 1.46L2 20h20l-2.595-10.54A2 2 0 0 0 17.5 8z"/>
    </svg>
  ),
  RefreshCw: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={16} height={16} {...props}>
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  Search: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={15} height={15} {...props}>
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Truck: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={42} height={42} {...props}>
      <rect x="1" y="3" width="15" height="13"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  CheckCircle: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={15} height={15} {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  X: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
         strokeLinecap="round" strokeLinejoin="round" width={14} height={14} {...props}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ArrowRight: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
         strokeLinecap="round" strokeLinejoin="round" width={14} height={14} {...props}>
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(value) {
  if (!value) return "N/A";
  const d = Array.isArray(value)
    ? new Date(value[0], value[1] - 1, value[2], value[3] ?? 0, value[4] ?? 0)
    : new Date(value);
  return isNaN(d.getTime())
    ? "N/A"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function formatTime(d) {
  return new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" }).format(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Fixed-position toast notification */
function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type !== "error";
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      padding: "14px 18px", borderRadius: 10, fontWeight: 700, fontSize: 14,
      display: "flex", alignItems: "center", gap: 10, maxWidth: 380,
      background: isSuccess ? "#e6f7ef" : "#fff0ec",
      border: `1.5px solid ${isSuccess ? "#148f77" : "#c2410c"}`,
      color: isSuccess ? "#148f77" : "#c2410c",
      boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
      animation: "slideIn 0.25s ease",
    }}>
      {isSuccess ? <Icon.CheckCircle /> : <Icon.X />}
      {toast.message}
    </div>
  );
}

/** Skeleton card loader */
function SkeletonCard() {
  const shimmer = {
    background: "linear-gradient(90deg,#eef2f7 25%,#e0e7ef 50%,#eef2f7 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 6,
  };
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ ...shimmer, height: 16, width: "40%" }} />
        <div style={{ ...shimmer, height: 22, width: 70, borderRadius: 999 }} />
      </div>
      <div style={{ ...shimmer, height: 14, width: "90%" }} />
      <div style={{ ...shimmer, height: 56, width: "100%", borderRadius: 8 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ ...shimmer, height: 14, width: "30%" }} />
        <div style={{ ...shimmer, height: 14, width: "30%" }} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <div style={{ ...shimmer, height: 40, flex: 1, borderRadius: 8 }} />
        <div style={{ ...shimmer, height: 40, flex: 1, borderRadius: 8 }} />
      </div>
    </div>
  );
}

/** Shipment type / weight / fragile badges */
function ShipmentBadges({ shipmentType, weight }) {
  const badges = [];

  const isExpress = (shipmentType || "").toUpperCase() === "EXPRESS";
  badges.push({
    label: isExpress ? "Express" : "Standard",
    bg: isExpress ? "#fff0ec" : "#e9f1ff",
    color: isExpress ? "#c2410c" : "#2456a6",
    border: isExpress ? "#c2410c" : "#2456a6",
  });

  if (weight > 25) {
    badges.push({ label: "Heavy", bg: "#fff7ed", color: "#c2670c", border: "#c2670c" });
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {badges.map((b) => (
        <span key={b.label} className="badge" style={{
          background: b.bg, color: b.color,
          border: `1px solid ${b.border}`, fontSize: 11,
        }}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

/** Summary metric card */
function SummaryCard({ label, value, note, accent }) {
  return (
    <div className="metric-card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ fontSize: 28, color: accent }}>{value}</div>
      {note && <div className="metric-note">{note}</div>}
    </div>
  );
}

/** Individual delivery request card */
function DeliveryCard({ s, removing, accepting, onAccept, onReject }) {
  const isRemoving = removing[s.shipmentId];
  const isAccepting = accepting[s.shipmentId];

  return (
    <div
      className="panel"
      style={{
        display: "flex", flexDirection: "column", gap: 0,
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? "scale(0.95) translateY(-8px)" : "scale(1)",
        transition: "opacity 0.32s ease, transform 0.32s ease, box-shadow 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 8px 32px rgba(20,108,148,0.16)"}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = ""}
    >
      {/* ── Card header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div className="eyebrow">Tracking Number</div>
          <strong style={{ fontSize: 14, letterSpacing: "0.03em" }}>{s.trackingNumber}</strong>
        </div>
        <ShipmentBadges shipmentType={s.shipmentType} weight={s.weight} />
      </div>

      {/* ── Route strip ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 28px 1fr",
        gap: 8, alignItems: "center", marginBottom: 14,
      }}>
        <div className="route-city" style={{ fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <Icon.MapPin style={{ color: "var(--brand)" }} />
            <span className="eyebrow" style={{ fontSize: 10 }}>Pickup</span>
          </div>
          <span style={{ fontWeight: 600 }}>{s.pickupAddress || "N/A"}</span>
        </div>
        <div style={{ textAlign: "center", color: "var(--brand)" }}>
          <Icon.ArrowRight />
        </div>
        <div className="route-city" style={{ fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <Icon.MapPin style={{ color: "var(--success)" }} />
            <span className="eyebrow" style={{ fontSize: 10 }}>Drop-off</span>
          </div>
          <span style={{ fontWeight: 600 }}>{s.destinationAddress || "N/A"}</span>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div style={{ display: "flex", gap: 18, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 12 }}>
          <Icon.Weight />
          <span><strong style={{ color: "var(--ink)" }}>
            {s.weight != null ? `${s.weight} kg` : "N/A"}
          </strong> weight</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 12 }}>
          <Icon.Package />
          <span>{s.shipmentType ?? "STANDARD"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 12 }}>
          <Icon.Clock />
          <span>{formatDate(s.createdAt)}</span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "var(--line)", marginBottom: 14 }} />

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          className="button primary"
          style={{ flex: 1, position: "relative" }}
          disabled={isAccepting}
          onClick={() => onAccept(s.shipmentId, s.trackingNumber)}
        >
          {isAccepting ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff", borderRadius: "50%",
                display: "inline-block", animation: "spin 0.7s linear infinite",
              }} />
              Accepting…
            </span>
          ) : (
            <><Icon.CheckCircle /> Accept</>
          )}
        </button>
        <button
          className="button secondary"
          style={{ flex: 1 }}
          disabled={isAccepting}
          onClick={() => onReject(s.shipmentId)}
        >
          <Icon.X /> Reject
        </button>
      </div>
    </div>
  );
}

/** Improved empty state */
function EmptyState({ onRefresh }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "56px 24px", textAlign: "center",
      background: "#f7fafc", border: "1px dashed #b9c7d6", borderRadius: 12,
      gap: 16,
    }}>
      <div style={{ color: "var(--brand)", opacity: 0.35 }}>
        <Icon.Truck />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>
          No Delivery Requests Available
        </div>
        <p className="subtle" style={{ maxWidth: 400, margin: "0 auto" }}>
          New shipment requests will automatically appear here when businesses create
          deliveries. Use the Refresh button or wait for auto-refresh.
        </p>
      </div>
      <button className="button secondary" style={{ marginTop: 4 }} onClick={onRefresh}>
        <Icon.RefreshCw /> Refresh Now
      </button>
    </div>
  );
}

/** Error state */
function ErrorState({ onRetry }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", textAlign: "center",
      background: "#fff0ec", border: "1px solid #f5cbb6", borderRadius: 12, gap: 12,
    }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ fontWeight: 800, color: "#9a3412", fontSize: 17 }}>
        Unable to load available deliveries.
      </div>
      <p className="subtle">Check your connection or contact support if the problem persists.</p>
      <button className="button danger" onClick={onRetry}>↻ Retry</button>
    </div>
  );
}


// ────────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────────
const AUTO_REFRESH_INTERVAL = 30_000; // 30 s

function AvailableDeliveries() {
  const [shipments,   setShipments]   = useState([]);
  const [myShipments, setMyShipments] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(false);
  const [toast,       setToast]       = useState(null);
  const [removing,    setRemoving]    = useState({});
  const [accepting,   setAccepting]   = useState({});
  const [rejected,    setRejected]    = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [totalAccepted, setTotalAccepted] = useState(0);

  // Live location state — all logic moved into DriverLocationCard
  // (state kept minimal: showToast is passed as a prop)

  // Filters
  const [search,    setSearch]    = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [weightFilter, setWeightFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");

  const timerRef = useRef(null);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);



  // ── Data loaders ─────────────────────────────────────────────────────────
  const loadMyShipments = useCallback(async () => {
    try {
      const res = await getMyShipments();
      setMyShipments(res.data ?? []);
    } catch { /* silent — my-shipments is supplemental */ }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const [avail] = await Promise.all([
        getAvailableShipments(),
        loadMyShipments(),
      ]);
      setShipments(avail.data ?? []);
      setRejected({});
      setLastUpdated(new Date());
    } catch (err) {
      setError(true);
      if (!silent) showToast("Failed to load available deliveries.", "error");
    } finally {
      setLoading(false);
    }
  }, [loadMyShipments, showToast]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => load(true), AUTO_REFRESH_INTERVAL);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, load]);

  // ── Card removal animation ────────────────────────────────────────────────
  const animateRemove = useCallback((shipmentId, then) => {
    setRemoving((p) => ({ ...p, [shipmentId]: true }));
    setTimeout(() => {
      then?.();
      setRemoving((p) => { const n = { ...p }; delete n[shipmentId]; return n; });
    }, 350);
  }, []);

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = useCallback(async (shipmentId, trackingNumber) => {
    setAccepting((p) => ({ ...p, [shipmentId]: true }));
    try {
      await acceptShipment(shipmentId);
      setTotalAccepted((n) => n + 1);
      animateRemove(shipmentId, () =>
        setShipments((p) => p.filter((s) => s.shipmentId !== shipmentId)),
      );
      showToast(`✓ Delivery accepted — ${trackingNumber}`);
      // Refresh my-shipments so count updates immediately
      loadMyShipments();
    } catch (err) {
      const status  = err?.response?.status;
      const message = err?.response?.data?.message;
      if (status === 409) {
        showToast(message ?? "Already assigned to another driver.", "error");
        animateRemove(shipmentId, () =>
          setShipments((p) => p.filter((s) => s.shipmentId !== shipmentId)),
        );
      } else {
        showToast(message ?? "Failed to accept. Please try again.", "error");
      }
    } finally {
      setAccepting((p) => { const n = { ...p }; delete n[shipmentId]; return n; });
    }
  }, [animateRemove, showToast, loadMyShipments]);

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = useCallback(async (shipmentId) => {
    try {
      await rejectShipmentRequest(shipmentId);
      animateRemove(shipmentId, () => {
        setRejected((p) => ({ ...p, [shipmentId]: true }));
        setShipments((p) => p.filter((s) => s.shipmentId !== shipmentId));
      });
    } catch (err) {
      console.error("Reject error", err);
    }
  }, [animateRemove]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const visible = shipments.filter((s) => !rejected[s.shipmentId]);

  // Computed "completed today" from myShipments
  const todayStr = new Date().toDateString();
  const completedToday = myShipments.filter((s) => {
    const status = s.shipmentStatus?.toString?.() ?? "";
    if (!["DELIVERED"].includes(status)) return false;
    const raw = s.updatedAt;
    const d = Array.isArray(raw)
      ? new Date(raw[0], raw[1] - 1, raw[2])
      : new Date(raw);
    return d.toDateString() === todayStr;
  }).length;

  const totalRequests = visible.length;
  const totalAccepted_ = myShipments.filter((s) =>
    !["DELIVERED", "CANCELLED"].includes(s.shipmentStatus?.toString?.() ?? "")
  ).length;
  const acceptRate = totalAccepted + totalAccepted_ > 0
    ? Math.round((totalAccepted / Math.max(totalAccepted + visible.length + totalAccepted, 1)) * 100)
    : "--";

  // Client-side filter + sort
  let filtered = visible.filter((s) => {
    if (search && !s.trackingNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "ALL" && (s.shipmentType ?? "STANDARD").toUpperCase() !== typeFilter) return false;
    if (weightFilter === "LIGHT"  && !(s.weight <= 10))  return false;
    if (weightFilter === "MEDIUM" && !(s.weight > 10 && s.weight <= 25)) return false;
    if (weightFilter === "HEAVY"  && !(s.weight > 25))   return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    const da = Array.isArray(a.createdAt) ? new Date(a.createdAt[0], a.createdAt[1]-1, a.createdAt[2]) : new Date(a.createdAt);
    const db = Array.isArray(b.createdAt) ? new Date(b.createdAt[0], b.createdAt[1]-1, b.createdAt[2]) : new Date(b.createdAt);
    return sortOrder === "NEWEST" ? db - da : da - db;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Keyframes injected once */}
      <style>{`
        @keyframes shimmer { to { background-position: -200% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:none; } }
      `}</style>

      <Toast toast={toast} />

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Driver portal</div>
          <h1>Available Deliveries</h1>
          <p className="subtle">
            Accept a delivery to claim it — first driver to accept wins.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {/* Auto-refresh toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>
            <span style={{
              display: "inline-block", width: 36, height: 20, borderRadius: 999,
              background: autoRefresh ? "var(--brand)" : "#cbd8e5",
              position: "relative", transition: "background 0.2s",
            }}>
              <span style={{
                position: "absolute", top: 3, left: autoRefresh ? 18 : 3,
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
              }} />
            </span>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
            Auto-refresh (30s)
          </label>
          {/* Last updated */}
          {lastUpdated && (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              <Icon.Clock style={{ marginRight: 4, verticalAlign: "middle" }} />
              Last updated: {formatTime(lastUpdated)}
            </span>
          )}
          <button className="button secondary" style={{ gap: 6 }} onClick={() => load()} disabled={loading}>
            <Icon.RefreshCw style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <section className="grid grid-4" style={{ marginBottom: 24 }}>
        <SummaryCard
          label="Available Requests"
          value={totalRequests}
          note="Pending in broadcast pool"
          accent="var(--brand)"
        />
        <SummaryCard
          label="My Active Deliveries"
          value={totalAccepted_}
          note="Assigned to you"
          accent="#059669"
        />
        <SummaryCard
          label="Completed Today"
          value={completedToday}
          note="Delivered today"
          accent="var(--accent)"
        />
        <SummaryCard
          label="Acceptance Rate"
          value={typeof acceptRate === "number" ? `${acceptRate}%` : "--"}
          note="Session acceptance ratio"
          accent="#7c3aed"
        />
      </section>

      {/* ── Live Driver Location card (OpenStreetMap) ── */}
      <DriverLocationCard
        updateDriverLocation={updateDriverLocation}
        showToast={showToast}
      />

      {/* ── Filters & search ── */}
      <div className="panel" style={{ marginBottom: 22, padding: "14px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Icon.Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              className="input"
              placeholder="Search tracking number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, minHeight: 38 }}
            />
          </div>
          {/* Type filter */}
          <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            style={{ flex: "0 0 140px", minHeight: 38 }}>
            <option value="ALL">All Types</option>
            <option value="STANDARD">Standard</option>
            <option value="EXPRESS">Express</option>
          </select>
          {/* Weight filter */}
          <select className="select" value={weightFilter} onChange={(e) => setWeightFilter(e.target.value)}
            style={{ flex: "0 0 140px", minHeight: 38 }}>
            <option value="ALL">All Weights</option>
            <option value="LIGHT">Light (≤10 kg)</option>
            <option value="MEDIUM">Medium (10–25 kg)</option>
            <option value="HEAVY">Heavy (&gt;25 kg)</option>
          </select>
          {/* Sort */}
          <select className="select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
            style={{ flex: "0 0 150px", minHeight: 38 }}>
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
          </select>
          {/* Result count */}
          {(search || typeFilter !== "ALL" || weightFilter !== "ALL") && (
            <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Active Deliveries (my assigned shipments) ── */}
      {(() => {
        const activeDeliveries = myShipments.filter(
          (s) => !["DELIVERED", "CANCELLED"].includes(s.shipmentStatus?.toString?.() ?? "")
        );
        if (activeDeliveries.length === 0) return null;
        return (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>🚛</span>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                My Active Deliveries
              </h2>
              <span style={{
                background: "#e6f7ef", color: "#059669",
                border: "1px solid #6ee7b7", borderRadius: 999,
                fontSize: 11, fontWeight: 700, padding: "2px 10px",
              }}>
                {activeDeliveries.length} assigned
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 18,
            }}>
              {activeDeliveries.map((s) => {
                const status = s.shipmentStatus?.toString?.() ?? "—";
                const statusColor = {
                  DRIVER_ASSIGNED: { bg: "#e9f1ff", color: "#2456a6", border: "#2456a6" },
                  PICKED_UP:       { bg: "#fffbeb", color: "#b45309", border: "#b45309" },
                  IN_TRANSIT:      { bg: "#e6f7ef", color: "#059669", border: "#059669" },
                  OUT_FOR_DELIVERY:{ bg: "#f0fdf4", color: "#16a34a", border: "#16a34a" },
                  DELAYED:         { bg: "#fff7ed", color: "#c2670c", border: "#c2670c" },
                }[status] ?? { bg: "#f3f4f6", color: "#374151", border: "#9ca3af" };

                return (
                  <div
                    key={s.id}
                    className="panel"
                    style={{
                      display: "flex", flexDirection: "column", gap: 0,
                      borderTop: `3px solid ${statusColor.border}`,
                      transition: "box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 8px 32px rgba(5,150,105,0.14)"}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = ""}
                  >
                    {/* Card header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div className="eyebrow">Tracking Number</div>
                        <strong style={{ fontSize: 14, letterSpacing: "0.03em" }}>{s.trackingNumber}</strong>
                      </div>
                      <span style={{
                        background: statusColor.bg, color: statusColor.color,
                        border: `1px solid ${statusColor.border}`,
                        borderRadius: 999, fontSize: 11, fontWeight: 700,
                        padding: "3px 10px", whiteSpace: "nowrap",
                      }}>
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Route */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 28px 1fr",
                      gap: 8, alignItems: "center", marginBottom: 14,
                    }}>
                      <div style={{ fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                          <Icon.MapPin style={{ color: "var(--brand)" }} />
                          <span className="eyebrow" style={{ fontSize: 10 }}>Pickup</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          {s.originAddress?.city || "N/A"}
                        </span>
                      </div>
                      <div style={{ textAlign: "center", color: "var(--brand)" }}>
                        <Icon.ArrowRight />
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                          <Icon.MapPin style={{ color: "var(--success)" }} />
                          <span className="eyebrow" style={{ fontSize: 10 }}>Drop-off</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          {s.destinationAddress?.city || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 12 }}>
                        <Icon.Weight />
                        <span><strong style={{ color: "var(--ink)" }}>
                          {s.packageWeight != null ? `${s.packageWeight} kg` : "N/A"}
                        </strong> weight</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)", fontSize: 12 }}>
                        <Icon.Clock />
                        <span>ETA: {s.expectedDeliveryDate ? s.expectedDeliveryDate.slice(0, 10) : "N/A"}</span>
                      </div>
                    </div>

                    {/* Hint */}
                    <div style={{
                      background: "#f0fdf4", border: "1px solid #bbf7d0",
                      borderRadius: 8, padding: "8px 12px",
                      fontSize: 12, color: "#166534",
                    }}>
                      ✓ This shipment is assigned to you. Update its status as you make progress.
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Loading skeletons ── */}
      {loading && visible.length === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 18 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && <ErrorState onRetry={load} />}

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState onRefresh={load} />
      )}

      {/* ── Card grid ── */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 18,
        }}>
          {filtered.map((s) => (
            <DeliveryCard
              key={s.shipmentId}
              s={s}
              removing={removing}
              accepting={accepting}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AvailableDeliveries;
