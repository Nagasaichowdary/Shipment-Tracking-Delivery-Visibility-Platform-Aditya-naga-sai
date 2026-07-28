/**
 * ShipmentMap — Reusable OpenStreetMap (Leaflet) component for Shipment Tracker Pro.
 *
 * Uses React Leaflet + OpenStreetMap tiles.
 * No API key required. No external routing API.
 *
 * ─── Component API (name, props, default export) is UNCHANGED ──────────────
 * TrackShipment.jsx requires NO modifications.
 *
 * Route visualization:
 *  • Driver live     → Completed segment (Origin → Driver, gray dashed, weight 5)
 *                       Remaining segment (Driver → Destination, bold blue, weight 6)
 *  • No driver GPS   → Full route (Origin → Destination, blue, weight 5)
 *
 * All coordinates are straight-line great-circle paths — guaranteed always
 * visible. No async fetch means no race conditions or CORS failures.
 *
 * Props (unchanged)
 * ──────────────────
 * driverLocation    { latitude, longitude, lastUpdated }   – may be null
 * shipmentLocation  { latitude, longitude, lastKnownCity } – may be null
 * originCity        string    – e.g. "Hyderabad"
 * destinationCity   string    – e.g. "Mumbai"
 * shipmentStatus    string    – reserved for future use
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCityCoordinates, estimateRoute } from "../../utils/cityCoordinates";

// ── Fix Leaflet default icon URLs broken by Vite bundling ─────────────────
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

// ── Constants ──────────────────────────────────────────────────────────────
const MAP_CONTAINER_STYLE = {
  width:        "100%",
  height:       "380px",
  borderRadius: "10px",
  overflow:     "hidden",
};

const INDIA_CENTER = [20.5937, 78.9629]; // Geographical centre of India

// ── Route polyline styles ──────────────────────────────────────────────────
// Completed route (Origin → Driver): gray dashed — ground already covered.
const COMPLETED_PATH_OPTIONS = {
  color:     "#64748b",  // slate-500
  weight:    5,
  dashArray: "10 6",
  opacity:   0.9,
};

// Remaining route (Driver → Destination): bold solid blue — the road ahead.
const REMAINING_PATH_OPTIONS = {
  color:   "#2563eb",   // blue-600
  weight:  6,
  opacity: 1.0,
};

// Full route (no driver GPS): single blue line origin → destination.
const FULL_PATH_OPTIONS = {
  color:   "#2563eb",
  weight:  5,
  opacity: 0.85,
};

// ── Emoji DivIcon factory ──────────────────────────────────────────────────
function buildEmojiIcon(emoji, size = 22) {
  return L.divIcon({
    html: `<span style="font-size:${size}px;line-height:1;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))">${emoji}</span>`,
    className:   "",
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

// ── Pulsing driver icon ────────────────────────────────────────────────────
const DRIVER_ICON_SIZE = 36;
const DRIVER_ICON = L.divIcon({
  html: `
    <style>
      @keyframes smp-pulse {
        0%   { transform: scale(1);    opacity: 0.85; }
        50%  { transform: scale(1.35); opacity: 0.4;  }
        100% { transform: scale(1);    opacity: 0.85; }
      }
    </style>
    <div style="
      position: relative;
      width: ${DRIVER_ICON_SIZE}px;
      height: ${DRIVER_ICON_SIZE}px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        background: rgba(249,115,22,0.25);
        border: 2px solid rgba(249,115,22,0.6);
        animation: smp-pulse 1.8s ease-in-out infinite;
      "></div>
      <span style="
        font-size: 24px;
        line-height: 1;
        display: block;
        position: relative;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
      ">🚚</span>
    </div>
  `,
  className:   "",
  iconAnchor:  [DRIVER_ICON_SIZE / 2, DRIVER_ICON_SIZE / 2],
  popupAnchor: [0, -(DRIVER_ICON_SIZE / 2)],
});

const ICONS = {
  origin:      buildEmojiIcon("🟢", 22),
  destination: buildEmojiIcon("🔴", 22),
  shipment:    buildEmojiIcon("📦", 22),
};

// ── MapBoundsController ────────────────────────────────────────────────────
// fitKey is derived ONLY from originCity:destinationCity — never from GPS.
// This ensures fitBounds() fires exactly once per new shipment, preserving
// the user's manual zoom level between GPS poll ticks.
function MapBoundsController({ points, fitKey }) {
  const map = useMap();
  const lastFitKeyRef = useRef(null);

  useEffect(() => {
    if (!fitKey || fitKey === lastFitKeyRef.current) return;

    const valid = points.filter(Boolean);
    if (valid.length === 0) return;

    const bounds = L.latLngBounds(valid);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60] });
      lastFitKeyRef.current = fitKey;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points, fitKey]);

  return null;
}

// ── ShipmentMap ────────────────────────────────────────────────────────────
export default function ShipmentMap({
  driverLocation,
  shipmentLocation,
  originCity,
  destinationCity,
  shipmentStatus, // reserved
}) {
  const [cityError, setCityError] = useState(null);

  // ── Resolve city coordinates (static lookup — synchronous, no API) ─────────
  const originCoords = getCityCoordinates(originCity);
  const destCoords   = getCityCoordinates(destinationCity);

  // True only when driver has a valid GPS fix from the 5-second poll.
  const driverLive =
    driverLocation?.latitude  != null &&
    driverLocation?.longitude != null;

  // ── City lookup error reporting ────────────────────────────────────────────
  useEffect(() => {
    const errors = [];
    if (originCity      && !originCoords) errors.push(`Coordinates unavailable for '${originCity}'.`);
    if (destinationCity && !destCoords)   errors.push(`Coordinates unavailable for '${destinationCity}'.`);
    setCityError(errors.length ? errors.join(" ") : null);
  }, [originCity, destinationCity, originCoords, destCoords]);

  // ── Haversine ETA / distance (unchanged — only for the info panel) ─────────
  const routeInfo = useMemo(() => {
    if (!originCoords || !destCoords) return null;
    return estimateRoute(originCoords, destCoords);
  }, [originCoords, destCoords]);

  const remainingInfo = useMemo(() => {
    if (!driverLive || !destCoords) return null;
    return estimateRoute(
      { lat: driverLocation.latitude, lng: driverLocation.longitude },
      destCoords
    );
  }, [driverLive, driverLocation, destCoords]);

  // ── Polyline coordinates ────────────────────────────────────────────────────
  //
  // All coordinates are pre-computed synchronously — no async fetch, no CORS
  // dependency, no race conditions. Routes are always visible immediately.
  //
  // Leaflet expects positions as [[lat, lng], [lat, lng], …].
  // originCoords / destCoords come from getCityCoordinates() → { lat, lng }.
  // driverLocation from the backend → { latitude, longitude }.
  //
  // completedPath  — Origin → Driver  (rendered when driver GPS is live)
  // remainingPath  — Driver → Destination (rendered when driver GPS is live)
  // fullPath       — Origin → Destination (rendered when driver GPS unavailable)

  const completedPath = useMemo(() => {
    if (!driverLive || !originCoords) return null;
    return [
      [originCoords.lat, originCoords.lng],
      [Number(driverLocation.latitude), Number(driverLocation.longitude)],
    ];
  }, [driverLive, driverLocation, originCoords]);

  const remainingPath = useMemo(() => {
    if (!driverLive || !destCoords) return null;
    return [
      [Number(driverLocation.latitude), Number(driverLocation.longitude)],
      [destCoords.lat, destCoords.lng],
    ];
  }, [driverLive, driverLocation, destCoords]);

  const fullPath = useMemo(() => {
    if (driverLive || !originCoords || !destCoords) return null;
    return [
      [originCoords.lat, originCoords.lng],
      [destCoords.lat, destCoords.lng],
    ];
  }, [driverLive, originCoords, destCoords]);

  // ── Bounds points (origin, destination, driver, parcel) ───────────────────
  const boundsPoints = useMemo(() => {
    const pts = [];
    if (originCoords)                       pts.push([originCoords.lat,          originCoords.lng]);
    if (destCoords)                         pts.push([destCoords.lat,            destCoords.lng]);
    if (driverLive)                         pts.push([driverLocation.latitude,   driverLocation.longitude]);
    if (shipmentLocation?.latitude != null) pts.push([shipmentLocation.latitude, shipmentLocation.longitude]);
    return pts;
  }, [originCoords, destCoords, driverLive, driverLocation, shipmentLocation]);

  // fitKey changes only when origin/destination cities change — NOT on GPS ticks.
  const fitKey = originCity && destinationCity
    ? `${originCity}:${destinationCity}`
    : null;

  // ── Initial map centre (seed value — MapBoundsController adjusts it) ───────
  const initialCenter = (() => {
    if (driverLive)                         return [driverLocation.latitude,   driverLocation.longitude];
    if (shipmentLocation?.latitude != null) return [shipmentLocation.latitude, shipmentLocation.longitude];
    if (originCoords)                       return [originCoords.lat,           originCoords.lng];
    return INDIA_CENTER;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Map canvas ─────────────────────────────────────────────────────── */}
      <div style={MAP_CONTAINER_STYLE}>
        <MapContainer
          center={initialCenter}
          zoom={6}
          style={{ width: "100%", height: "100%" }}
          zoomControl
          attributionControl
        >
          {/* OpenStreetMap tiles — free, no API key, no billing */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Auto-fit viewport — once per shipment, never on GPS ticks */}
          {boundsPoints.length > 0 && (
            <MapBoundsController points={boundsPoints} fitKey={fitKey} />
          )}

          {/* ── Full route: Origin → Destination (no driver GPS) ── */}
          {fullPath && (
            <Polyline
              positions={fullPath}
              pathOptions={FULL_PATH_OPTIONS}
            />
          )}

          {/* ── Completed segment: Origin → Driver (gray dashed) ── */}
          {completedPath && (
            <Polyline
              positions={completedPath}
              pathOptions={COMPLETED_PATH_OPTIONS}
            />
          )}

          {/* ── Remaining segment: Driver → Destination (bold blue) ── */}
          {remainingPath && (
            <Polyline
              positions={remainingPath}
              pathOptions={REMAINING_PATH_OPTIONS}
            />
          )}

          {/* ── Origin marker 🟢 ── */}
          {originCoords && (
            <Marker
              position={[originCoords.lat, originCoords.lng]}
              icon={ICONS.origin}
              title={`Origin: ${originCity}`}
            />
          )}

          {/* ── Destination marker 🔴 ── */}
          {destCoords && (
            <Marker
              position={[destCoords.lat, destCoords.lng]}
              icon={ICONS.destination}
              title={`Destination: ${destinationCity}`}
            />
          )}

          {/* ── Shipment / parcel marker 📦 ── */}
          {shipmentLocation?.latitude != null && (
            <Marker
              position={[shipmentLocation.latitude, shipmentLocation.longitude]}
              icon={ICONS.shipment}
              title={`Shipment location${shipmentLocation.lastKnownCity ? `: ${shipmentLocation.lastKnownCity}` : ""}`}
            />
          )}

          {/* ── Driver marker 🚚 (pulsing ring, always on top) ── */}
          {driverLive && (
            <Marker
              position={[driverLocation.latitude, driverLocation.longitude]}
              icon={DRIVER_ICON}
              title={`Driver location (${
                driverLocation.lastUpdated
                  ? new Date(driverLocation.lastUpdated).toLocaleTimeString()
                  : "unknown time"
              })`}
              zIndexOffset={1000}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div style={legendStyle}>
        <LegendItem emoji="🟢" label={`Origin: ${originCity || "—"}`}           color="#22c55e" />
        <LegendItem emoji="🔴" label={`Destination: ${destinationCity || "—"}`} color="#ef4444" />

        {driverLive && (
          <>
            <LegendSegment color="#64748b" dashed label="Completed route" />
            <LegendSegment color="#2563eb"       label="Remaining route" />
          </>
        )}

        {shipmentLocation?.latitude != null && (
          <LegendItem
            emoji="📦"
            label={`Parcel: ${
              shipmentLocation.lastKnownCity ||
              `${shipmentLocation.latitude?.toFixed(3)}, ${shipmentLocation.longitude?.toFixed(3)}`
            }`}
            color="#3b82f6"
          />
        )}

        {driverLive && (
          <LegendItem
            emoji="🚚"
            label={`Driver: ${Number(driverLocation.latitude).toFixed(3)}, ${Number(driverLocation.longitude).toFixed(3)}`}
            color="#f97316"
          />
        )}
      </div>

      {/* ── ETA / distance panel (Haversine — unchanged) ───────────────────── */}
      {routeInfo && (
        <div style={routeInfoStyle}>
          <RouteInfoItem icon="📏" label="Total Distance" value={routeInfo.distance} />
          {remainingInfo && (
            <RouteInfoItem icon="🛣️" label="Remaining Dist." value={remainingInfo.distance} />
          )}
          <RouteInfoItem
            icon="⏱️"
            label={remainingInfo ? "Remaining Time" : "Est. Travel Time"}
            value={remainingInfo ? remainingInfo.duration : routeInfo.duration}
            accent
          />
        </div>
      )}

      {/* ── City lookup error notice ──────────────────────────────────────── */}
      {cityError && (
        <p style={{ fontSize: 12, color: "#f97316", marginTop: 8 }}>⚠ {cityError}</p>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function LegendItem({ emoji, label, color }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span style={{ color }}>{label}</span>
    </span>
  );
}

// SVG line swatch for route segments in the legend.
function LegendSegment({ color, dashed, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
      <svg width="28" height="6" style={{ flexShrink: 0 }}>
        <line
          x1="0" y1="3" x2="28" y2="3"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={dashed ? "6 4" : "none"}
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}

function RouteInfoItem({ icon, label, value, accent }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 20, marginBottom: 2 }}>{icon}</div>
      <div style={{
        fontSize: 11, color: "#94a3b8", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700,
        color: accent ? "#2563eb" : "#1e293b", marginTop: 2,
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Style constants ────────────────────────────────────────────────────────
const legendStyle = {
  display:      "flex",
  flexWrap:     "wrap",
  gap:          "8px 20px",
  marginTop:    10,
  padding:      "8px 12px",
  background:   "rgba(248,250,252,0.8)",
  borderRadius: 8,
  border:       "1px solid #e2e8f0",
};

const routeInfoStyle = {
  display:      "flex",
  gap:          12,
  marginTop:    12,
  padding:      "14px 20px",
  background:   "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(59,130,246,0.04) 100%)",
  border:       "1px solid rgba(37,99,235,0.15)",
  borderRadius: 10,
};
