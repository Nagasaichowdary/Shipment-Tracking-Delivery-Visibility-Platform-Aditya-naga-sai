import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ShipmentContext } from "../context/shipments";
import { getShipmentDriver, getShipmentDriverLocation, getShipmentDelay, getShipmentLocation } from "../services/api";
import { getCityCoordinates, estimateRoute, haversineKm } from "../utils/cityCoordinates";


import ShipmentMap from "../components/map/ShipmentMap";

function statusClass(status) {
  // Backend returns ENUM values like IN_TRANSIT; CSS badges use kebab-case
  return status.toLowerCase().replaceAll("_", "-");
}

function parseDateHelper(value) {
  if (!value) return null;
  // If Spring Boot returns LocalDateTime as an array: [2026, 7, 18, 10, 0, 0]
  if (Array.isArray(value) && value.length >= 3) {
    // Note: JS Date months are 0-indexed, so we subtract 1 from the month
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, month - 1, day, hour, minute, second);
  }
  // Otherwise parse as standard string/number
  return new Date(value);
}

function formatDateTime(value) {
  const dateObj = parseDateHelper(value);
  if (!dateObj || isNaN(dateObj.getTime())) return "Invalid Date";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dateObj);
}

function formatDateOnly(value) {
  const dateObj = parseDateHelper(value);
  if (!dateObj || isNaN(dateObj.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(dateObj);
}

/**
 * Returns a human-readable remaining time string from now until the given date.
 * Returns null if the date is in the past.
 */
function calcRemainingTime(etaValue) {
  const eta = parseDateHelper(etaValue);
  if (!eta || isNaN(eta.getTime())) return null;

  const diffMs = eta.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);

  return parts.join(" ");
}

/** Format estimatedDelayMinutes as "X days Y hours Z minutes" */
function formatDelayMinutes(mins) {
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const parts = [];
  if (d > 0) parts.push(`${d} day${d !== 1 ? "s" : ""}`);
  if (h > 0) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
  if (m > 0 || parts.length === 0) parts.push(`${m} minute${m !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function TrackShipment() {
  const { shipments, loading } = useContext(ShipmentContext);
  const location = useLocation();
  const [trackingNumber, setTrackingNumber] = useState("");
  // null = user has not searched yet; "" = searched but submitted empty string
  const [submittedTracking, setSubmittedTracking] = useState(null);

  const [driverData, setDriverData] = useState(null);
  const [locationData, setLocationData] = useState(null);           // driver device GPS
  const [shipmentParcelLocation, setShipmentParcelLocation] = useState(null); // parcel GPS
  const [delayData, setDelayData] = useState(null);
  const [fetchingDriver, setFetchingDriver] = useState(false);

  // ── Auto-track when arriving via a notification click ──────────────────────
  // NotificationBell navigates to /track with { state: { trackingNumber } }.
  // We read it once on mount so the user sees the shipment immediately.
  useEffect(() => {
    const tn = location.state?.trackingNumber;
    if (tn) {
      setTrackingNumber(tn);
      setSubmittedTracking(tn);
      // Clear the location state so a manual refresh / back-navigation
      // does not re-trigger the auto-search.
      window.history.replaceState({}, "", location.pathname);
    }
    // Run only on first mount — location.state is intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ───────────────────────────────────────────────────────────────────────────

  const shipment = useMemo(
    () =>
      submittedTracking !== null
        ? shipments.find(
            (item) => item.trackingNumber.toLowerCase() === submittedTracking.trim().toLowerCase(),
          )
        : undefined,
    [shipments, submittedTracking],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmittedTracking(trackingNumber);
    // State is cleared inside the useEffect when shipment.id changes,
    // so we do NOT reset here — avoids the race where handleSubmit nulls
    // driverData but the effect does not re-fire (same shipment.id).
  };

  // Depend only on the shipment *id*, not the full object reference.
  const shipmentId = shipment?.id ?? null;

  useEffect(() => {
    if (!shipmentId) {
      // No shipment selected — clear all supplementary state.
      setDriverData(null);
      setLocationData(null);
      setShipmentParcelLocation(null);
      setDelayData(null);
      return;
    }

    console.log("TrackShipment: Fetching driver/location/parcel-location/delay for shipment id", shipmentId);
    setFetchingDriver(true);
    // Clear previous results immediately so stale data isn't shown
    // while the new fetch is in-flight.
    setDriverData(null);
    setLocationData(null);
    setShipmentParcelLocation(null);
    setDelayData(null);

    Promise.allSettled([
      getShipmentDriver(shipmentId),
      getShipmentDriverLocation(shipmentId),   // driver's live device position
      getShipmentDelay(shipmentId),
      getShipmentLocation(shipmentId),         // shipment parcel's last known position
    ]).then(([driverRes, locationRes, delayRes, parcelLocRes]) => {
      console.log("TrackShipment: driverRes",      driverRes);
      console.log("TrackShipment: locationRes",     locationRes);
      console.log("TrackShipment: delayRes",        delayRes);
      console.log("TrackShipment: parcelLocRes",    parcelLocRes);

      // Accept any fulfilled response whose data contains a userId field.
      if (driverRes.status === "fulfilled" && driverRes.value?.data?.userId != null) {
        setDriverData(driverRes.value.data);
      } else {
        setDriverData(null);
      }

      if (locationRes.status === "fulfilled" && locationRes.value?.data != null) {
        setLocationData(locationRes.value.data);
      } else {
        setLocationData(null);
      }

      if (delayRes.status === "fulfilled" && delayRes.value?.data != null) {
        setDelayData(delayRes.value.data);
      } else {
        setDelayData(null);
      }

      // Parcel location — null lat/lon when never updated is still a valid 200 response
      if (parcelLocRes.status === "fulfilled" && parcelLocRes.value?.data?.latitude != null) {
        setShipmentParcelLocation(parcelLocRes.value.data);
      } else {
        setShipmentParcelLocation(null);
      }
    }).catch((err) => {
      console.error("TrackShipment: allSettled unexpected error", err);
    }).finally(() => {
      setFetchingDriver(false);
    });
  }, [shipmentId]);

  // ── Live location polling — every 5 seconds ─────────────────────────────────
  // Fetches only the two live-location endpoints and the delay API.
  // Driver info (getShipmentDriver) is static once assigned — excluded from poll.
  // An isFetching ref guards against overlapping requests from a slow network.
  // The interval is skipped for terminal shipment statuses (delivered, cancelled, etc.).
  const isFetchingRef = useRef(false);

  const pollLocations = useCallback(async () => {
    if (!shipmentId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [locationRes, parcelLocRes, delayRes] = await Promise.allSettled([
        getShipmentDriverLocation(shipmentId),
        getShipmentLocation(shipmentId),
        getShipmentDelay(shipmentId),
      ]);

      if (locationRes.status === "fulfilled" && locationRes.value?.data != null) {
        setLocationData(locationRes.value.data);
      }
      if (parcelLocRes.status === "fulfilled" && parcelLocRes.value?.data?.latitude != null) {
        setShipmentParcelLocation(parcelLocRes.value.data);
      }
      if (delayRes.status === "fulfilled" && delayRes.value?.data != null) {
        setDelayData(delayRes.value.data);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [shipmentId]);

  useEffect(() => {
    const TERMINAL = ["DELIVERED", "CANCELLED", "RETURNED", "FAILED_DELIVERY"];
    if (!shipmentId || TERMINAL.includes(shipment?.status)) return;

    const intervalId = setInterval(pollLocations, 5000);
    return () => clearInterval(intervalId);
  }, [shipmentId, shipment?.status, pollLocations]);
  // ───────────────────────────────────────────────────────────────────────────

  // ─── Derived delivery timing values ────────────────────────────────────────
  const etaRaw = shipment?._raw?.expectedDeliveryDate ?? shipment?.eta ?? null;
  const isDelivered = shipment?.status === "DELIVERED";
  const remainingTime = isDelivered ? null : calcRemainingTime(etaRaw);
  // ───────────────────────────────────────────────────────────────────────────

  const hasLocation =
    locationData && locationData.latitude != null && locationData.longitude != null;

  // ── Route distance summary ──────────────────────────────────────────────────────────
  // Recomputes whenever shipment changes or driver location is updated by polling.
  // Uses the same Haversine logic as ShipmentMap — no API calls needed.
  // totalKm / remainingKm are raw numbers (road-adjusted) used for progress calculation.
  const routeSummaryInfo = useMemo(() => {
    const origCoords = getCityCoordinates(shipment?.senderCity);
    const destCoords = getCityCoordinates(shipment?.receiverCity);
    if (!origCoords || !destCoords) return null;

    const total   = estimateRoute(origCoords, destCoords);
    const totalKm = haversineKm(origCoords, destCoords) * 1.3; // road-adjusted km

    if (!hasLocation) {
      return { total, remaining: null, totalKm, remainingKm: null };
    }

    const driverPos    = { lat: locationData.latitude, lng: locationData.longitude };
    const remaining    = estimateRoute(driverPos, destCoords);
    const remainingKm  = haversineKm(driverPos, destCoords) * 1.3; // road-adjusted km
    return { total, remaining, totalKm, remainingKm };
  }, [shipment?.senderCity, shipment?.receiverCity, hasLocation, locationData]);

  // ── GPS-based journey progress ───────────────────────────────────────────────────────
  // When the driver's live location is available, progress is derived from how much of
  // the road distance has been covered (GPS-driven, updates every 5 s via polling).
  // Falls back to the static status-based percentage when GPS is not yet available.
  // Clamped to [0, 100]; never goes negative or exceeds 100%.
  const gpsProgress = useMemo(() => {
    const { totalKm, remainingKm } = routeSummaryInfo ?? {};
    if (totalKm > 0 && remainingKm != null) {
      return Math.max(0, Math.min(100,
        Math.round((1 - remainingKm / totalKm) * 100)
      ));
    }
    return shipment?.progress ?? 0;
  }, [routeSummaryInfo, shipment?.progress]);
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Shipment tracking</div>
          <h1>Tracking dashboard</h1>
          <p className="subtle">
            Search a tracking number to view status, route, package details, and timeline history.
          </p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 18 }}>
        <form className="toolbar" onSubmit={handleSubmit}>
          <div className="form-field" style={{ flex: "1 1 340px" }}>
            <label htmlFor="trackingNumber">Tracking number</label>
            <input
              className="input"
              id="trackingNumber"
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="STP10024591"
              required
              value={trackingNumber}
            />
          </div>
          <button className="button primary" type="submit">
            Track shipment
          </button>
        </form>
      </section>

      {loading && <div className="empty-state">Loading shipments…</div>}

      {!loading && submittedTracking !== null && !shipment && (
        <div className="empty-state">
          No shipment found for {submittedTracking || "the entered tracking number"}.
        </div>
      )}

      {/* ── Shipment details + Timeline ────────────────────────────────────── */}
      {shipment && (
        <section className="grid grid-2">
          <div className="panel">
            <div className="toolbar">
              <div>
                <div className="eyebrow">Tracking number</div>
                <h2 className="section-title" style={{ marginTop: 6 }}>
                  {shipment.trackingNumber}
                </h2>
              </div>
              <span className={`badge ${statusClass(shipment.status)}`}>
                {shipment.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="route-strip">
              <div className="route-city">
                <strong>{shipment.senderCity}</strong>
                <div className="subtle">{shipment.senderName}</div>
              </div>
              <div className="route-arrow">to</div>
              <div className="route-city">
                <strong>{shipment.receiverCity}</strong>
                <div className="subtle">{shipment.receiverName}</div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="toolbar" style={{ marginBottom: 8 }}>
                <strong>Delivery progress</strong>
                <span className="subtle">{gpsProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${gpsProgress}%` }} />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div className="schema-box">
                <strong>ETA</strong>
                <p className="subtle" style={{ margin: "6px 0 0" }}>{shipment.eta}</p>
              </div>
              <div className="schema-box">
                <strong>Priority</strong>
                <p className="subtle" style={{ margin: "6px 0 0" }}>{shipment.priority}</p>
              </div>
              <div className="schema-box">
                <strong>Package</strong>
                <p className="subtle" style={{ margin: "6px 0 0" }}>
                  {shipment.packageType}, {shipment.weight}
                </p>
              </div>
              <div className="schema-box">
                <strong>Address</strong>
                <p className="subtle" style={{ margin: "6px 0 0" }}>
                  {shipment.deliveryAddress}
                </p>
              </div>
            </div>
          </div>

          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Shipment activity</div>
            <h2 className="section-title" style={{ margin: "0 0 18px" }}>Tracking Timeline</h2>

            {/* ── Activity Timeline ── */}
            {(() => {
              // Canonical lifecycle steps in order
              const STEPS = [
                { key: "PENDING_DRIVER",   label: "Order Created",     icon: "📋" },
                { key: "DRIVER_ASSIGNED",  label: "Driver Assigned",   icon: "🧑‍✈️" },
                { key: "PICKED_UP",        label: "Picked Up",         icon: "📦" },
                { key: "IN_TRANSIT",       label: "In Transit",        icon: "🚛" },
                { key: "OUT_FOR_DELIVERY", label: "Out for Delivery",  icon: "🛵" },
                { key: "DELIVERED",        label: "Delivered",         icon: "✅" },
              ];
              // Also map legacy CREATED status to index 0 so older shipments render correctly
              const STATUS_INDEX = {
                ...Object.fromEntries(STEPS.map((s, i) => [s.key, i])),
                CREATED: 0,
              };
              const currentIdx = STATUS_INDEX[shipment.status] ?? -1;

              return (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {STEPS.map((step, idx) => {
                    const isDone    = currentIdx > idx;
                    const isCurrent = currentIdx === idx;
                    const isUpcoming = currentIdx < idx;
                    const isLast    = idx === STEPS.length - 1;

                    // Timestamp: use createdAt for all completed/current steps as a fallback
                    const ts = isDone || isCurrent
                      ? (shipment._raw?.createdAt ?? shipment.createdAt ?? null)
                      : null;

                    // Dot colours
                    const dotBg    = isDone ? "#22c55e" : isCurrent ? "#2563eb" : "#e2e8f0";
                    const dotBorder = isDone ? "#22c55e" : isCurrent ? "#2563eb" : "#cbd5e1";
                    const lineBg   = isDone ? "#22c55e" : "#e2e8f0";

                    return (
                      <li key={step.key} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        {/* Dot + connector */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: dotBg,
                              border: `2px solid ${dotBorder}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              color: "#fff",
                              fontWeight: 700,
                              boxShadow: isCurrent ? "0 0 0 4px rgba(37,99,235,0.15)" : "none",
                              transition: "all 0.2s",
                            }}
                          >
                            {isDone ? "✓" : isCurrent ? "●" : "○"}
                          </div>
                          {!isLast && (
                            <div
                              style={{
                                width: 2,
                                flexGrow: 1,
                                minHeight: 28,
                                background: lineBg,
                                margin: "3px 0",
                                borderRadius: 1,
                              }}
                            />
                          )}
                        </div>

                        {/* Step content */}
                        <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontWeight: isCurrent ? 700 : isDone ? 600 : 400,
                              fontSize: 13,
                              color: isDone
                                ? "var(--text, #1e293b)"
                                : isCurrent
                                ? "#2563eb"
                                : "#94a3b8",
                            }}
                          >
                            <span>{step.icon}</span>
                            <span>{step.label}</span>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: "#2563eb",
                                  color: "#fff",
                                  borderRadius: 4,
                                  padding: "1px 6px",
                                  letterSpacing: "0.04em",
                                  marginLeft: 4,
                                }}
                              >
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div
                            className="subtle"
                            style={{ fontSize: 11, marginTop: 2 }}
                          >
                            {isDone || isCurrent
                              ? (ts ? formatDateTime(ts) : "—")
                              : "Pending"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}

            {/* ── Delivery Summary card ── */}
            <div
              style={{
                marginTop: 20,
                padding: "14px 16px",
                background: "rgba(37,99,235,0.04)",
                border: "1px solid rgba(37,99,235,0.12)",
                borderRadius: 10,
              }}
            >
              <div
                className="eyebrow"
                style={{ marginBottom: 10, color: "#2563eb" }}
              >
                Delivery Summary
              </div>
              <div className="grid grid-2" style={{ gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estimated Delivery</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{shipment.eta || "N/A"}</div>
                </div>
                <div className="schema-box">
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Remaining Time</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {isDelivered
                      ? <span style={{ color: "#22c55e", fontWeight: 600 }}>Delivered ✓</span>
                      : (delayData?.remainingTime ?? remainingTime ?? "—")}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {delayData?.isDelayed ? (
                      <span style={{ color: "#e11d48", fontWeight: 600 }}>Delayed</span>
                    ) : (
                      <span style={{ color: "#22c55e", fontWeight: 600 }}>On Schedule</span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Shipment Type</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{shipment.shipmentType || shipment.priority || "Standard"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Package Weight</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{shipment.weight || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Driver Assigned</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {fetchingDriver
                      ? "Loading…"
                      : driverData
                      ? <span style={{ color: "#22c55e", fontWeight: 600 }}>Yes — {driverData.fullName || driverData.firstName}</span>
                      : <span style={{ color: "#94a3b8" }}>No</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>
      )}

      {/* ── Smart Route Tracking ───────────────────────────────────────────── */}
      {shipment && (
        <section className="panel" style={{ marginTop: 18 }}>
          {/* Section header */}
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Live tracking</div>
              <h2 className="section-title" style={{ margin: 0 }}>
                Driver Details &amp; Current Route
              </h2>
            </div>
            {fetchingDriver && (
              <span className="subtle" style={{ fontSize: 13 }}>Loading…</span>
            )}
          </div>

          {/* DELIVERED state — replace everything with success banner */}
          {isDelivered ? (
            <div
              className="schema-box"
              style={{
                textAlign: "center",
                padding: "32px 24px",
                background: "rgba(34,197,94,0.07)",
                border: "1.5px solid #22c55e",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <strong style={{ fontSize: 18, color: "#22c55e" }}>Delivered Successfully</strong>
              <p className="subtle" style={{ margin: "8px 0 0" }}>
                This shipment has been delivered. Live tracking is no longer active.
              </p>
            </div>

          ) : !driverData && !fetchingDriver ? (
            // Distinguish: driver assigned but pending acceptance vs truly no driver
            shipment.status === "DRIVER_ASSIGNED" || shipment._raw?.assignedDriverId != null ? (
              <div
                className="schema-box"
                style={{
                  textAlign: "center",
                  padding: "28px 24px",
                  background: "rgba(37,99,235,0.04)",
                  border: "1.5px solid rgba(37,99,235,0.18)",
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>🧑‍✈️</div>
                <strong style={{ fontSize: 16, color: "#2563eb" }}>Driver Assignment Pending</strong>
                <p className="subtle" style={{ margin: "10px 0 0", lineHeight: 1.6 }}>
                  A driver has been assigned to this shipment.<br />
                  Waiting for the driver to accept the assignment.<br />
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>
                    Live tracking will become available after the driver accepts.
                  </span>
                </p>
              </div>
            ) : (
              <div className="subtle">No driver assigned</div>
            )

          ) : driverData ? (
            <>
              {/* Driver info strip */}
              <div className="grid grid-2" style={{ marginBottom: 16 }}>
                <div className="schema-box">
                  <strong>Driver</strong>
                  <p className="subtle" style={{ margin: "4px 0 0" }}>
                    {driverData.fullName || driverData.firstName || "N/A"}
                  </p>
                </div>
                <div className="schema-box">
                  <strong>Phone</strong>
                  <p className="subtle" style={{ margin: "4px 0 0" }}>
                    {driverData.phone || "N/A"}
                  </p>
                </div>
                <div className="schema-box">
                  <strong>Email</strong>
                  <p className="subtle" style={{ margin: "4px 0 0" }}>
                    {driverData.email || "N/A"}
                  </p>
                </div>
                <div className="schema-box">
                  <strong>Last Updated</strong>
                  <p className="subtle" style={{ margin: "4px 0 0" }}>
                    {locationData?.lastUpdated
                      ? formatDateTime(locationData.lastUpdated)
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Map + Route Summary side by side */}
              <div className="grid grid-2" style={{ alignItems: "start" }}>

                {/* Left — Shipment Map (OpenStreetMap) */}
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Current Route</div>
                  <ShipmentMap
                    driverLocation={locationData}
                    shipmentLocation={shipmentParcelLocation}
                    originCity={shipment.senderCity}
                    destinationCity={shipment.receiverCity}
                    shipmentStatus={shipment.status}
                  />
                </div>

                {/* Right — vertical Route Summary */}
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Route Summary</div>
                  <div className="schema-box" style={{ padding: "16px 20px" }}>

                    {/* Origin node */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: "#2563eb",
                            border: "2px solid #2563eb",
                            flexShrink: 0,
                          }}
                        />
                        <div
                          style={{
                            width: 2,
                            height: 44,
                            background: "#e2e8f0",
                            margin: "3px 0",
                          }}
                        />
                      </div>
                      <div style={{ paddingBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Origin</div>
                        <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>
                          {shipment.senderCity || "N/A"}
                        </div>
                        <div className="subtle" style={{ fontSize: 11, marginTop: 1 }}>
                          {shipment.senderName}
                        </div>
                      </div>
                    </div>

                    {/* Driver current location node */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: hasLocation ? "#f97316" : "#94a3b8",
                            border: `2px solid ${hasLocation ? "#f97316" : "#94a3b8"}`,
                            flexShrink: 0,
                            boxShadow: hasLocation
                              ? "0 0 0 4px rgba(249,115,22,0.18)"
                              : "none",
                          }}
                        />
                        <div
                          style={{
                            width: 2,
                            height: 44,
                            background: "#e2e8f0",
                            margin: "3px 0",
                          }}
                        />
                      </div>
                      <div style={{ paddingBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#f97316" }}>
                          📦 Driver Current Location
                        </div>
                        <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>
                          {hasLocation
                            ? `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`
                            : "Location unavailable"}
                        </div>
                        <div className="subtle" style={{ fontSize: 11, marginTop: 1 }}>
                          {driverData.fullName || driverData.firstName}
                        </div>
                      </div>
                    </div>

                    {/* Destination node */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: "#22c55e",
                            border: "2px solid #22c55e",
                            flexShrink: 0,
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Destination</div>
                        <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>
                          {shipment.receiverCity || "N/A"}
                        </div>
                        <div className="subtle" style={{ fontSize: 11, marginTop: 1 }}>
                          {shipment.receiverName}
                        </div>
                      </div>
                    </div>

                    {/* ── Distance summary ── */}
                    {routeSummaryInfo && (
                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: "1px solid #e2e8f0",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {/* Total distance */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            📏 Total Distance
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                            {routeSummaryInfo.total.distance}
                          </span>
                        </div>

                        {/* Remaining distance — shown only when driver GPS is known */}
                        {routeSummaryInfo.remaining ? (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                🛣️ Remaining Distance
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>
                                {routeSummaryInfo.remaining.distance}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                ⏱️ Remaining Time
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}>
                                {routeSummaryInfo.remaining.duration}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              ⏱️ Est. Travel Time
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}>
                              {routeSummaryInfo.total.duration}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* ── Enhanced Delivery Status / Delay Card ─────────────────────────── */}
      {/* Only shown once the shipment is past DRIVER_ASSIGNED — before that,
          delay prediction is not meaningful and would show misleading info. */}
      {shipment && delayData &&
       !(["PENDING_DRIVER", "DRIVER_ASSIGNED", "CREATED"].includes(shipment.status)) && (() => {
        // ── Status-to-theme mapping ───────────────────────────────────────────
        // One place to change colours — do NOT inline colours anywhere below.
        const STATUS_THEME = {
          ON_SCHEDULE:     { border: "#22c55e", title: "#22c55e", badge: "#22c55e", bg: "rgba(34, 197, 94, 0.06)",  label: "✓ Delivery Status",  badgeText: "🟢 ON SCHEDULE"  },
          IN_TRANSIT:      { border: "#3b82f6", title: "#3b82f6", badge: "#3b82f6", bg: "rgba(59, 130, 246, 0.06)", label: "✈ In Transit",        badgeText: "🔵 IN TRANSIT"   },
          DELAYED:         { border: "#f59e0b", title: "#f59e0b", badge: "#f59e0b", bg: "rgba(245, 158, 11, 0.06)", label: "⚠ Delay Alert",       badgeText: "🟠 DELAYED"      },
          FAILED_DELIVERY: { border: "#ef4444", title: "#ef4444", badge: "#ef4444", bg: "rgba(239, 68, 68, 0.06)",  label: "✗ Delivery Failed",  badgeText: "🔴 FAILED"        },
          CANCELLED:       { border: "#ef4444", title: "#ef4444", badge: "#ef4444", bg: "rgba(239, 68, 68, 0.06)",  label: "✗ Delivery Status",  badgeText: "🔴 CANCELLED"     },
          RETURNED:        { border: "#ef4444", title: "#ef4444", badge: "#ef4444", bg: "rgba(239, 68, 68, 0.06)",  label: "↩ Returned",         badgeText: "🔴 RETURNED"      },
          DELIVERED:       { border: "#22c55e", title: "#22c55e", badge: "#22c55e", bg: "rgba(34, 197, 94, 0.06)",  label: "✓ Delivery Status",  badgeText: "🟢 DELIVERED"     },
        };

        // Resolve current theme: operator status wins; fallback to delay-prediction green/red.
        const currentStatus = shipment.status || "";
        const theme =
          STATUS_THEME[currentStatus] ||
          (delayData.delayed ? STATUS_THEME.DELAYED : STATUS_THEME.ON_SCHEDULE);

        return (
          <section
            className="panel"
            style={{
              marginTop: 18,
              borderLeft: `4px solid ${theme.border}`,
              background: theme.bg,
            }}
          >
            {/* Header row */}
            <div className="toolbar" style={{ marginBottom: 14 }}>
              <div>
                <div
                  className="eyebrow"
                  style={{ color: theme.title }}
                >
                  {theme.label}
                </div>
              </div>
              <span
                className="badge"
                style={{
                  background: `${theme.badge}26`,   /* 15 % opacity hex */
                  color: theme.badge,
                  border: `1px solid ${theme.badge}`,
                  fontWeight: 700,
                }}
              >
                {theme.badgeText}
              </span>
            </div>

            {/* Info grid */}
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              {/* Estimated Delivery Date */}
              <div className="schema-box">
                <strong>Estimated Delivery</strong>
                <p className="subtle" style={{ margin: "6px 0 0" }}>
                  {delayData.estimatedDeliveryTime
                    ? formatDateTime(delayData.estimatedDeliveryTime)
                    : etaRaw ? formatDateOnly(etaRaw) : "N/A"}
                </p>
              </div>

              {/* Remaining Time / Delayed By / Delivered */}
              <div className="schema-box">
                {isDelivered ? (
                  <>
                    <strong style={{ color: theme.title }}>✓ Delivered Successfully</strong>
                    <p className="subtle" style={{ margin: "6px 0 0" }}>
                      Shipment has been delivered.
                    </p>
                  </>
                ) : currentStatus === "CANCELLED" ? (
                  <>
                    <strong style={{ color: theme.title }}>Cancelled</strong>
                    <p className="subtle" style={{ margin: "6px 0 0" }}>
                      This shipment has been cancelled.
                    </p>
                  </>
                ) : currentStatus === "DELAYED" || delayData.delayed ? (
                  <>
                    <strong style={{ color: theme.title }}>Delayed By</strong>
                    <p className="subtle" style={{ margin: "6px 0 0" }}>
                      {delayData.estimatedDelayMinutes != null
                        ? formatDelayMinutes(delayData.estimatedDelayMinutes)
                        : "Unknown"}
                    </p>
                  </>
                ) : (
                  <>
                    <strong>Remaining Time</strong>
                    <p className="subtle" style={{ margin: "6px 0 0" }}>
                      {/* GPS-based remaining drive time takes priority when driver location
                          is available; status-based ETA is used as the fallback. */}
                      {routeSummaryInfo?.remaining?.duration
                        ?? delayData.remainingTime
                        ?? remainingTime
                        ?? "Calculating…"}
                    </p>
                  </>
                )}
              </div>

              {/* Shipment Status */}
              <div className="schema-box">
                <strong>Shipment Status</strong>
                <p className="subtle" style={{ margin: "6px 0 0" }}>
                  {delayData.shipmentStatus
                    ? delayData.shipmentStatus.replace(/_/g, " ")
                    : shipment.status
                    ? shipment.status.replace(/_/g, " ")
                    : "N/A"}
                </p>
              </div>

              {/* Cancellation Reason */}
              {currentStatus === "CANCELLED" && shipment.cancellationReason && (
                <div className="schema-box">
                  <strong style={{ color: theme.title }}>Cancellation Reason</strong>
                  <p className="subtle" style={{ margin: "6px 0 0" }}>
                    {shipment.cancellationReason}
                  </p>
                </div>
              )}

              {/* Delay Reason removed — now delivered via the Notification Bell/Popup */}

              {/* New Estimated Delivery — only shown when prediction engine marks delayed */}
              {delayData.delayed && (
                <div className="schema-box">
                  <strong style={{ color: theme.title }}>New Estimated Delivery</strong>
                  <p className="subtle" style={{ margin: "6px 0 0" }}>
                    {delayData.estimatedDeliveryTime
                      ? formatDateTime(delayData.estimatedDeliveryTime)
                      : etaRaw && delayData.estimatedDelayMinutes != null
                      ? (() => {
                          const eta = parseDateHelper(etaRaw);
                          if (!eta || isNaN(eta.getTime())) return "N/A";
                          const newEta = new Date(
                            eta.getTime() + delayData.estimatedDelayMinutes * 60000,
                          );
                          return new Intl.DateTimeFormat("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(newEta);
                        })()
                      : "N/A"}
                  </p>
                </div>
              )}
            </div>

            {/* ── Forecast Confidence Indicator ────────────────────────────────── */}
            {delayData.confidence != null && (() => {
              const pct = delayData.confidence;
              // Resolve badge colour and label based on score band
              const confBand = pct >= 90
                ? { color: "#22c55e", bg: "rgba(34,197,94,0.10)",  label: "High",     icon: "🟢" }
                : pct >= 70
                ? { color: "#2563eb", bg: "rgba(37,99,235,0.10)",  label: "Good",     icon: "🔵" }
                : pct >= 50
                ? { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", label: "Moderate", icon: "🟠" }
                : { color: "#ef4444", bg: "rgba(239,68,68,0.10)",  label: "Low",      icon: "🔴" };

              return (
                <div
                  className="schema-box"
                  style={{
                    marginBottom: 12,
                    padding: "14px 16px",
                    background: confBand.bg,
                    border: `1px solid ${confBand.color}40`,
                    borderRadius: 10,
                  }}
                >
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <strong style={{ fontSize: 13, color: "#1e293b" }}>
                      📊 Forecast Confidence
                    </strong>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: confBand.bg,
                        color: confBand.color,
                        border: `1px solid ${confBand.color}`,
                        borderRadius: 20,
                        padding: "2px 10px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {confBand.icon} {confBand.label} — {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: 7,
                      borderRadius: 999,
                      background: "#e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: confBand.color,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  {/* Score label */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>0</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>100</span>
                  </div>
                </div>
              );
            })()}

            {/* Message */}
            <div className="schema-box">
              <strong>Message</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {currentStatus === "CANCELLED" && shipment.cancellationReason
                  ? `Shipment was cancelled due to ${shipment.cancellationReason}.`
                  : currentStatus === "DELAYED"
                  ? `Shipment is delayed. The estimated delivery time has been updated.`
                  : delayData.message || "No message available"}
              </p>
            </div>
          </section>
        );
      })()}
    </div>
  );
}

export default TrackShipment;
