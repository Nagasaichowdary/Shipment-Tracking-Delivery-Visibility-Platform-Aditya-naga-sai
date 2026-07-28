/**
 * ShipmentMap — Reusable OpenStreetMap (Leaflet) component for Shipment Tracker Pro.
 *
 * Migrated from Google Maps to React Leaflet + OpenStreetMap tiles.
 * ─── Component API (name, props, default export) is UNCHANGED ──────────────
 * TrackShipment.jsx requires NO modifications.
 *
 * Route visualization (enhanced):
 *  • Completed segment (origin → driver)     — real road geometry, gray dashed.
 *  • Remaining segment (driver → destination) — real road geometry, bold blue.
 *  • Road geometry is fetched from the free OSRM public API (no key required).
 *  • Falls back to straight-line polylines when OSRM is unreachable or GPS unavailable.
 *
 * All markers, ETA panel, legend, Haversine calculations, and business logic
 * are completely unchanged.
 *
 * Props (unchanged)
 * ──────────────────
 * driverLocation    { latitude, longitude, lastUpdated }   – may be null
 * shipmentLocation  { latitude, longitude, lastKnownCity } – may be null
 * originCity        string    – e.g. "Hyderabad"
 * destinationCity   string    – e.g. "Mumbai"
 * shipmentStatus    string    – reserved for future use
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import polylineCodec from "@mapbox/polyline";
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

const INDIA_CENTER = [20.5937, 78.9629];

// ── Route polyline styles ──────────────────────────────────────────────────
// Completed segment: gray dashed — "ground already covered".
const COMPLETED_PATH_OPTIONS = {
  color:     "#94a3b8",
  weight:    3,
  opacity:   0.7,
  dashArray: "8 6",
};

// Remaining segment: bold solid blue — "the road ahead".
const REMAINING_PATH_OPTIONS = {
  color:   "#2563eb",
  weight:  4,
  opacity: 0.88,
};

// Fallback (no driver GPS): single blue line.
const FULL_PATH_OPTIONS = {
  color:   "#2563eb",
  weight:  3,
  opacity: 0.75,
};

// ── OSRM road-route fetcher ────────────────────────────────────────────────
// Uses the free OSRM demo server — no API key, no billing.
// Returns an array of [lat, lng] pairs representing the road geometry,
// or null on any network / parsing error.
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

async function fetchRoadRoute(from, to, signal) {
  // OSRM coordinate order is lng,lat (GeoJSON convention).
  const url =
    `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=polyline`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code !== "Ok" || !json.routes?.[0]?.geometry) return null;
    // Decode the encoded polyline string → [[lat, lng], …]
    return polylineCodec.decode(json.routes[0].geometry);
  } catch {
    return null; // AbortError or network failure → silent fallback
  }
}

// ── Haversine distance between two [lat, lng] points (km) ─────────────────
// Used to find the nearest point on the road geometry to the driver's GPS fix,
// so we can split the full-route array into completed and remaining arrays.
function haversinePair([lat1, lng1], [lat2, lng2]) {
  const R  = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find the index in `routePoints` closest to `driverPoint [lat, lng]`.
function nearestIndex(routePoints, driverPoint) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < routePoints.length; i++) {
    const d = haversinePair(routePoints[i], driverPoint);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

// ── Emoji DivIcon factory ──────────────────────────────────────────────────
function buildEmojiIcon(emoji, size = 22) {
  return L.divIcon({
    html: `<span style="font-size:${size}px;line-height:1;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))">${emoji}</span>`,
    className:   "",
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

// ── Pulsing driver icon (orange animated ring) ─────────────────────────────
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
function MapBoundsController({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter(Boolean);
    if (valid.length === 0) return;
    const bounds = L.latLngBounds(valid);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points]);
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
  const [cityError,      setCityError]      = useState(null);
  // Road geometry for the full origin→destination route (array of [lat,lng]).
  const [fullRouteGeo,   setFullRouteGeo]   = useState(null);
  // Road geometry for driver→destination remaining route.
  const [remainingGeo,   setRemainingGeo]   = useState(null);

  // AbortController refs so we can cancel stale in-flight requests.
  const fullAbortRef      = useRef(null);
  const remainingAbortRef = useRef(null);

  // ── Static city coords (unchanged) ────────────────────────────────────────
  const originCoords = getCityCoordinates(originCity);
  const destCoords   = getCityCoordinates(destinationCity);
  const driverLive   = driverLocation?.latitude != null && driverLocation?.longitude != null;

  // ── City lookup errors (unchanged) ────────────────────────────────────────
  useEffect(() => {
    const errors = [];
    if (originCity      && !originCoords) errors.push(`Coordinates unavailable for '${originCity}'.`);
    if (destinationCity && !destCoords)   errors.push(`Coordinates unavailable for '${destinationCity}'.`);
    setCityError(errors.length ? errors.join(" ") : null);
  }, [originCity, destinationCity, originCoords, destCoords]);

  // ── Haversine route estimates (unchanged — used for ETA/distance panel) ───
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

  // ── Fetch full road route: origin → destination ───────────────────────────
  // Re-fetches only when origin/destination cities change (not on every GPS tick).
  useEffect(() => {
    if (!originCoords || !destCoords) { setFullRouteGeo(null); return; }

    if (fullAbortRef.current) fullAbortRef.current.abort();
    fullAbortRef.current = new AbortController();

    fetchRoadRoute(originCoords, destCoords, fullAbortRef.current.signal).then(geo => {
      setFullRouteGeo(geo); // null on error → falls back to straight line
    });

    return () => fullAbortRef.current?.abort();
  }, [originCoords, destCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch remaining road route: driver → destination ─────────────────────
  // Re-fetches on every driver GPS update (every 5-second poll tick).
  // Uses AbortController so a stale request never overwrites a newer one.
  const fetchRemaining = useCallback(async () => {
    if (!driverLive || !destCoords) { setRemainingGeo(null); return; }
    if (remainingAbortRef.current) remainingAbortRef.current.abort();
    remainingAbortRef.current = new AbortController();
    const geo = await fetchRoadRoute(
      { lat: driverLocation.latitude, lng: driverLocation.longitude },
      destCoords,
      remainingAbortRef.current.signal
    );
    setRemainingGeo(geo);
  }, [driverLive, driverLocation, destCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchRemaining();
    return () => remainingAbortRef.current?.abort();
  }, [fetchRemaining]);

  // ── Derive completed route from full geometry + remaining fetch ───────────
  // Strategy: the "completed" segment = everything in fullRouteGeo up to the
  // point nearest to the driver's current GPS position.
  // This avoids a third OSRM call and keeps the two polylines perfectly joined.
  const completedGeo = useMemo(() => {
    if (!driverLive || !fullRouteGeo || fullRouteGeo.length < 2) return null;
    const driverPt = [driverLocation.latitude, driverLocation.longitude];
    const idx = nearestIndex(fullRouteGeo, driverPt);
    // Include the driver's position itself as the final point so the segments connect.
    return [...fullRouteGeo.slice(0, idx + 1), driverPt];
  }, [driverLive, driverLocation, fullRouteGeo]);

  // ── Straight-line fallbacks (used when OSRM data is not yet loaded) ───────
  const straightCompleted = useMemo(() => {
    if (!driverLive || !originCoords) return null;
    return [[originCoords.lat, originCoords.lng], [driverLocation.latitude, driverLocation.longitude]];
  }, [driverLive, driverLocation, originCoords]);

  const straightRemaining = useMemo(() => {
    if (!driverLive || !destCoords) return null;
    return [[driverLocation.latitude, driverLocation.longitude], [destCoords.lat, destCoords.lng]];
  }, [driverLive, driverLocation, destCoords]);

  const straightFull = useMemo(() => {
    if (driverLive || !originCoords || !destCoords) return null;
    return [[originCoords.lat, originCoords.lng], [destCoords.lat, destCoords.lng]];
  }, [driverLive, originCoords, destCoords]);

  // Which polyline arrays to actually render:
  //   • If driver is live: completed + remaining (road if available, straight fallback otherwise)
  //   • If no driver: full route (road if available, straight fallback otherwise)
  const completedPath = completedGeo  ?? straightCompleted;
  const remainingPath = remainingGeo  ?? straightRemaining;
  const fullPath      = fullRouteGeo
    ? (driverLive ? null : fullRouteGeo)  // don't draw full route when driver is live
    : straightFull;

  // ── Bounds points (unchanged — covers origin, dest, driver, parcel) ────────
  const boundsPoints = useMemo(() => {
    const pts = [];
    if (originCoords)                       pts.push([originCoords.lat,          originCoords.lng]);
    if (destCoords)                         pts.push([destCoords.lat,            destCoords.lng]);
    if (driverLive)                         pts.push([driverLocation.latitude,   driverLocation.longitude]);
    if (shipmentLocation?.latitude != null) pts.push([shipmentLocation.latitude, shipmentLocation.longitude]);
    return pts;
  }, [originCoords, destCoords, driverLive, driverLocation, shipmentLocation]);

  // ── Initial map centre (unchanged) ────────────────────────────────────────
  const initialCenter = (() => {
    if (driverLive)                         return [driverLocation.latitude,   driverLocation.longitude];
    if (shipmentLocation?.latitude != null) return [shipmentLocation.latitude, shipmentLocation.longitude];
    if (originCoords)                       return [originCoords.lat,           originCoords.lng];
    return INDIA_CENTER;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={MAP_CONTAINER_STYLE}>
        <MapContainer
          center={initialCenter}
          zoom={6}
          style={{ width: "100%", height: "100%" }}
          zoomControl
          attributionControl
        >
          {/* OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Auto-fit viewport */}
          {boundsPoints.length > 0 && <MapBoundsController points={boundsPoints} />}

          {/* ── No-driver fallback: full route (road or straight line) ── */}
          {fullPath && (
            <Polyline positions={fullPath} pathOptions={FULL_PATH_OPTIONS} />
          )}

          {/* ── Completed segment: origin → driver (gray dashed road) ── */}
          {completedPath && (
            <Polyline positions={completedPath} pathOptions={COMPLETED_PATH_OPTIONS} />
          )}

          {/* ── Remaining segment: driver → destination (bold blue road) ── */}
          {remainingPath && (
            <Polyline positions={remainingPath} pathOptions={REMAINING_PATH_OPTIONS} />
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

          {/* ── Driver marker 🚚 (pulsing ring) ── */}
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

      {/* ── Map legend ─────────────────────────────────────────────────────── */}
      <div style={legendStyle}>
        <LegendItem emoji="🟢" label={`Origin: ${originCity || "—"}`}           color="#22c55e" />
        <LegendItem emoji="🔴" label={`Destination: ${destinationCity || "—"}`} color="#ef4444" />
        {driverLive && (
          <>
            <LegendSegment color="#94a3b8" dashed label="Completed route" />
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
            label={`Driver: ${driverLocation.latitude?.toFixed(3)}, ${driverLocation.longitude?.toFixed(3)}`}
            color="#f97316"
          />
        )}
      </div>

      {/* ── ETA / distance panel (unchanged Haversine logic) ───────────────── */}
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

      {/* ── City lookup error notice (unchanged) ──────────────────────────── */}
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

function LegendSegment({ color, dashed, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
      <svg width="24" height="6" style={{ flexShrink: 0 }}>
        <line
          x1="0" y1="3" x2="24" y2="3"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={dashed ? "5 4" : "none"}
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

// ── Style constants (unchanged) ────────────────────────────────────────────
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
