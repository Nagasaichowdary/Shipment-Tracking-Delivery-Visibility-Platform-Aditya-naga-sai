/**
 * DriverLocationCard — OpenStreetMap Live Driver Location module.
 *
 * Uses React Leaflet + OpenStreetMap tiles exclusively.
 * Does NOT touch ShipmentMap, Google Maps, or any Shipment Tracking code.
 *
 * ── Modes ──────────────────────────────────────────────────────────────────
 *  GPS (default)
 *    • watchPosition() for continuous tracking.
 *    • Live Tracking toggle starts / stops the watch.
 *    • Smart throttle: only calls PUT /api/drivers/location when the driver
 *      has moved ≥ 10 m OR 10 s have elapsed since the last backend update.
 *
 *  Map (Select on Map)
 *    • Interactive Leaflet map — click to place a draggable 🚚 marker.
 *    • "Send Selected Location" sends coords to PUT /api/drivers/location.
 *    • Switching to map mode automatically stops the GPS watch.
 *
 * Props
 * ─────
 *  updateDriverLocation  (data: {latitude,longitude}) => Promise<any>
 *  showToast             (msg: string, type: string)  => void
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet default icon paths broken by Vite bundling ─────────────────
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

// ── 🚚 Custom truck div-icon ────────────────────────────────────────────────
const TRUCK_ICON = L.divIcon({
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.45))">🚚</div>`,
  className: "",
  iconAnchor:  [14, 14],
  popupAnchor: [0, -14],
});

// ── Constants ───────────────────────────────────────────────────────────────
const INDIA_CENTER    = [20.5937, 78.9629]; // geographic centre of India
const MIN_DIST_METERS = 10;                 // minimum movement for backend update
const MIN_ELAPSED_MS  = 10_000;             // force update every 10 s even if stationary

// ── Status config ───────────────────────────────────────────────────────────
const STATUS = {
  idle:           { icon: "⚪", label: "Idle",                 color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "#cbd5e1" },
  waiting:        { icon: "🟡", label: "Waiting for GPS…",     color: "#d97706", bg: "rgba(251,191,36,0.10)",  border: "#fbbf24" },
  live:           { icon: "🟢", label: "Live",                  color: "#16a34a", bg: "rgba(34,197,94,0.08)",   border: "#22c55e" },
  ready:          { icon: "✅", label: "Location acquired",     color: "#16a34a", bg: "rgba(34,197,94,0.08)",   border: "#22c55e" },
  "perm-denied":  { icon: "🔴", label: "Permission Denied",    color: "#dc2626", bg: "rgba(239,68,68,0.08)",   border: "#ef4444" },
  "gps-unavail":  { icon: "🔴", label: "GPS Unavailable",      color: "#dc2626", bg: "rgba(239,68,68,0.08)",   border: "#ef4444" },
  "backend-err":  { icon: "🔴", label: "Backend Update Failed", color: "#dc2626", bg: "rgba(239,68,68,0.08)",   border: "#ef4444" },
  error:          { icon: "❌", label: "Error",                 color: "#dc2626", bg: "rgba(239,68,68,0.08)",   border: "#ef4444" },
};

// ── Haversine (metres) ──────────────────────────────────────────────────────
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R   = 6_371_000;
  const dφ  = (lat2 - lat1) * (Math.PI / 180);
  const dλ  = (lng2 - lng1) * (Math.PI / 180);
  const a   =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── MapClickHandler — inner component to capture Leaflet click events ───────
function MapClickHandler({ enabled, onMapClick }) {
  useMapEvents({ click: enabled ? onMapClick : undefined });
  return null;
}

// ── Shared CSS-in-JS tokens ─────────────────────────────────────────────────
const L_STYLE = {
  fontSize: 11, fontWeight: 600, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.05em",
};
const V_STYLE = { fontSize: 14, fontWeight: 700, color: "#1e293b", marginTop: 3 };

// ════════════════════════════════════════════════════════════════════════════
// DriverLocationCard
// ════════════════════════════════════════════════════════════════════════════
export default function DriverLocationCard({ updateDriverLocation, showToast }) {

  // ── Mode ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState("gps"); // "gps" | "map"

  // ── GPS state ────────────────────────────────────────────────────────────
  const [liveTracking, setLiveTracking] = useState(false);
  const [gpsStatus,    setGpsStatus]    = useState("idle");
  const [gpsCoords,    setGpsCoords]    = useState(null); // { lat, lng, accuracy }
  const [lastUpdated,  setLastUpdated]  = useState(null); // Date

  // ── Map-pick state ───────────────────────────────────────────────────────
  const [pickedCoords, setPickedCoords] = useState(null); // { lat, lng }
  const [sending,      setSending]      = useState(false);

  // ── Refs (avoid closure-staleness, no unnecessary re-renders) ────────────
  const watchIdRef   = useRef(null);
  const lastSentRef  = useRef(null); // { lat, lng, time }

  // ─────────────────────────────────────────────────────────────────────────
  // Throttled backend update
  // ─────────────────────────────────────────────────────────────────────────
  const maybeSendToBackend = useCallback(async (lat, lng) => {
    const now  = Date.now();
    const prev = lastSentRef.current;

    const dist    = prev ? haversineMeters(prev.lat, prev.lng, lat, lng) : Infinity;
    const elapsed = prev ? now - prev.time : Infinity;

    if (dist < MIN_DIST_METERS && elapsed < MIN_ELAPSED_MS) return; // throttle

    lastSentRef.current = { lat, lng, time: now };
    try {
      await updateDriverLocation({ latitude: lat, longitude: lng });
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Backend update failed.";
      setGpsStatus("backend-err");
      showToast(msg, "error");
    }
  }, [updateDriverLocation, showToast]);

  // ─────────────────────────────────────────────────────────────────────────
  // watchPosition management
  // ─────────────────────────────────────────────────────────────────────────
  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLiveTracking(false);
    setGpsStatus((prev) => (prev === "live" || prev === "waiting" ? "idle" : prev));
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      showToast("Your browser does not support the Geolocation API.", "error");
      return;
    }
    setGpsStatus("waiting");
    setLiveTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGpsCoords({ lat, lng, accuracy });
        setGpsStatus("live");
        maybeSendToBackend(lat, lng);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsStatus("perm-denied");
            showToast("Location permission denied.", "error");
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsStatus("gps-unavail");
            showToast("GPS unavailable. Check device settings.", "error");
            break;
          case err.TIMEOUT:
            setGpsStatus("error");
            showToast("Location request timed out.", "error");
            break;
          default:
            setGpsStatus("error");
            showToast("Could not retrieve location.", "error");
        }
        stopWatch();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, [maybeSendToBackend, showToast, stopWatch]);

  const handleTrackingToggle = useCallback(() => {
    if (liveTracking) stopWatch();
    else              startWatch();
  }, [liveTracking, startWatch, stopWatch]);

  // ─────────────────────────────────────────────────────────────────────────
  // Mode switch
  // ─────────────────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((next) => {
    if (next === mode) return;
    if (next === "map") {
      stopWatch();             // stop GPS when switching to map
    } else {
      setPickedCoords(null);   // clear pick when returning to GPS
    }
    setMode(next);
  }, [mode, stopWatch]);

  // ─────────────────────────────────────────────────────────────────────────
  // Map-pick handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleMapClick = useCallback((e) => {
    setPickedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
  }, []);

  const handleMarkerDrag = useCallback((e) => {
    const { lat, lng } = e.target.getLatLng();
    setPickedCoords({ lat, lng });
  }, []);

  const handleSendPicked = useCallback(async () => {
    if (!pickedCoords) return;
    setSending(true);
    try {
      await updateDriverLocation({ latitude: pickedCoords.lat, longitude: pickedCoords.lng });
      setLastUpdated(new Date());
      lastSentRef.current = { lat: pickedCoords.lat, lng: pickedCoords.lng, time: Date.now() };
      showToast("📍 Location updated (map pick).", "success");
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Backend update failed.";
      showToast(msg, "error");
    } finally {
      setSending(false);
    }
  }, [pickedCoords, updateDriverLocation, showToast]);

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (watchIdRef.current !== null)
      navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived display values
  // ─────────────────────────────────────────────────────────────────────────
  const cfg = STATUS[gpsStatus] ?? STATUS.idle;

  const displayLat = mode === "map" ? pickedCoords?.lat : gpsCoords?.lat;
  const displayLng = mode === "map" ? pickedCoords?.lng : gpsCoords?.lng;
  const displayAcc = mode === "map"
    ? (pickedCoords ? "Manual pick" : "—")
    : gpsCoords?.accuracy != null
    ? `±${Math.round(gpsCoords.accuracy)} m`
    : "—";

  // Map centre: follow GPS position, then picked point, else default
  const mapCenter = gpsCoords
    ? [gpsCoords.lat, gpsCoords.lng]
    : pickedCoords
    ? [pickedCoords.lat, pickedCoords.lng]
    : INDIA_CENTER;

  const mapZoom = gpsCoords || pickedCoords ? 13 : 5;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="panel" style={{ marginBottom: 22 }}>

      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div>
          <div className="eyebrow">Live tracking · OpenStreetMap</div>
          <h2 className="section-title" style={{ margin: 0 }}>
            📍 Live Driver Location
          </h2>
        </div>
        {/* Status badge */}
        <span style={{
          fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "3px 14px",
          display: "flex", alignItems: "center", gap: 6,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
          transition: "all 0.3s",
        }}>
          {cfg.icon}&nbsp;{liveTracking ? "Live" : mode === "map" && pickedCoords ? "Picked" : "Idle"}
        </span>
      </div>

      {/* ── Mode selector ───────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 16,
        border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden",
      }}>
        {[
          { value: "gps", icon: "📡", label: "Device GPS" },
          { value: "map", icon: "🗺️", label: "Select on Map" },
        ].map(({ value, icon, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleModeChange(value)}
            style={{
              flex: 1, padding: "9px 0", border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 12, gap: 6,
              background: mode === value ? "var(--brand, #2563eb)" : "#f8fafc",
              color:      mode === value ? "#fff" : "#64748b",
              transition: "background 0.2s, color 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {icon}&nbsp;{label}
          </button>
        ))}
      </div>

      {/* ── Live Tracking toggle (GPS mode only) ────────────────────────── */}
      {mode === "gps" && (
        <div
          onClick={handleTrackingToggle}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", marginBottom: 14, borderRadius: 8, cursor: "pointer",
            background: liveTracking ? "rgba(34,197,94,0.06)" : "#f8fafc",
            border: `1.5px solid ${liveTracking ? "#22c55e" : "#e2e8f0"}`,
            transition: "all 0.25s", userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Toggle pill */}
            <span style={{
              display: "inline-block", width: 40, height: 22, borderRadius: 999,
              background: liveTracking ? "#22c55e" : "#cbd5e1",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}>
              <span style={{
                position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%",
                background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                left: liveTracking ? 21 : 3, transition: "left 0.2s",
              }} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: liveTracking ? "#16a34a" : "#64748b" }}>
              ☑ Live Tracking
            </span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999,
            background: liveTracking ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.12)",
            color: liveTracking ? "#16a34a" : "#64748b",
          }}>
            {liveTracking ? "🟢 Live" : "⚪ Idle"}
          </span>
        </div>
      )}

      {/* ── Status row ──────────────────────────────────────────────────── */}
      <div
        className="schema-box"
        style={{ marginBottom: 14, background: cfg.bg, border: `1px solid ${cfg.border}40` }}
      >
        <div style={L_STYLE}>Current Location Status</div>
        <div style={{ fontSize: 13, marginTop: 4, color: cfg.color }}>
          {cfg.icon}&nbsp;
          {mode === "gps"
            ? gpsStatus === "live"         ? "GPS tracking active — sending location automatically"
            : gpsStatus === "waiting"      ? "Waiting for first GPS fix…"
            : gpsStatus === "perm-denied"  ? "Location permission denied — check browser settings"
            : gpsStatus === "gps-unavail"  ? "GPS unavailable — check device settings"
            : gpsStatus === "backend-err"  ? "Backend update failed — check your connection"
            : gpsStatus === "error"        ? "Could not retrieve location"
            :                               "Enable Live Tracking to start"
            : pickedCoords
            ? "Location picked — click Send to update backend"
            : "Click anywhere on the map to select a location"
          }
        </div>
      </div>

      {/* ── Interactive OpenStreetMap ────────────────────────────────────── */}
      <div style={{
        width: "100%", height: 280, borderRadius: 10,
        overflow: "hidden", marginBottom: 10,
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        <MapContainer
          key={mode}
          center={mapCenter}
          zoom={mapZoom}
          style={{ width: "100%", height: "100%" }}
          zoomControl
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Enable map-click only in map mode */}
          <MapClickHandler enabled={mode === "map"} onMapClick={handleMapClick} />

          {/* GPS mode: live position marker (non-draggable) */}
          {mode === "gps" && gpsCoords && (
            <Marker
              position={[gpsCoords.lat, gpsCoords.lng]}
              icon={TRUCK_ICON}
            />
          )}

          {/* Map mode: draggable picked-location marker */}
          {mode === "map" && pickedCoords && (
            <Marker
              position={[pickedCoords.lat, pickedCoords.lng]}
              icon={TRUCK_ICON}
              draggable
              eventHandlers={{ dragend: handleMarkerDrag }}
            />
          )}
        </MapContainer>
      </div>

      {/* Map-mode hint */}
      {mode === "map" && (
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 14px", textAlign: "center" }}>
          Click the map or drag the marker · then click Send to update
        </p>
      )}

      {/* ── Coordinate grid ─────────────────────────────────────────────── */}
      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <div className="schema-box">
          <div style={L_STYLE}>Latitude</div>
          <div style={V_STYLE}>{displayLat != null ? Number(displayLat).toFixed(6) : "—"}</div>
        </div>
        <div className="schema-box">
          <div style={L_STYLE}>Longitude</div>
          <div style={V_STYLE}>{displayLng != null ? Number(displayLng).toFixed(6) : "—"}</div>
        </div>
        <div className="schema-box">
          <div style={L_STYLE}>GPS Accuracy</div>
          <div style={V_STYLE}>{displayAcc}</div>
        </div>
        <div className="schema-box">
          <div style={L_STYLE}>Last Updated</div>
          <div style={{ ...V_STYLE, fontSize: 12 }}>
            {lastUpdated
              ? new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" }).format(lastUpdated)
              : "—"}
          </div>
        </div>
        <div className="schema-box">
          <div style={L_STYLE}>Tracking Status</div>
          <div style={{ ...V_STYLE, fontSize: 12, color: cfg.color }}>
            {cfg.icon}&nbsp;
            {mode === "gps"
              ? liveTracking ? "Live (watchPosition)" : "Idle"
              : pickedCoords ? "Manual pick" : "No pick yet"
            }
          </div>
        </div>
        <div className="schema-box">
          <div style={L_STYLE}>Current Mode</div>
          <div style={{ ...V_STYLE, fontSize: 12 }}>
            {mode === "gps" ? "📡 Device GPS" : "🗺️ Select on Map"}
          </div>
        </div>
      </div>

      {/* ── Send button (map mode only) ──────────────────────────────────── */}
      {mode === "map" && (
        <button
          className="button primary"
          style={{ width: "100%", justifyContent: "center", gap: 8 }}
          disabled={sending || !pickedCoords}
          onClick={handleSendPicked}
        >
          {sending ? (
            <>
              <span style={{
                width: 15, height: 15,
                border: "2px solid #fff", borderTopColor: "transparent",
                borderRadius: "50%", display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }} />
              Sending…
            </>
          ) : "📍 Send Selected Location"}
        </button>
      )}
    </div>
  );
}
