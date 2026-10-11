import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

/*
 * OfflinePopup — Global internet-connection monitor for ShipTrack Pro
 * -------------------------------------------------------------------------
 * Detects connectivity loss via:
 *   1. window "offline" / "online" events  (primary)
 *   2. navigator.onLine polling every 2 s  (fallback — Edge DevTools sometimes
 *      does not fire the DOM event when Network throttle is set to Offline)
 *
 * On each state change a fetch probe against /api/roles confirms real
 * connectivity before closing the popup (navigator.onLine is unreliable).
 *
 * CENTERING FIX: framer-motion rewrites the CSS transform property on every
 * animation frame (to apply scale / y). If "transform: translate(-50%,-50%)"
 * is placed in the motion.div style it is silently overwritten, pushing the
 * card off-screen. The fix is a fixed full-viewport flexbox wrapper div that
 * centres the card without relying on CSS transform.
 * -------------------------------------------------------------------------
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://shipment-tracking-delivery-visibility.onrender.com";

const PROBE_URL        = `${API_BASE}/api/roles`;
const PROBE_TIMEOUT_MS = 6000;
const POLL_INTERVAL_MS = 2000; // navigator.onLine poll while potentially offline

async function probeConnectivity() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(PROBE_URL, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default function OfflinePopup() {
  const [isOffline,     setIsOffline]     = useState(false);
  const [checking,      setChecking]      = useState(false);
  const [stillOffline,  setStillOffline]  = useState(false);
  const [justRecovered, setJustRecovered] = useState(false);

  const autoCheckTimerRef = useRef(null);
  const pollTimerRef      = useRef(null);
  const probingRef        = useRef(false);

  // ── Probe connectivity and update state ──────────────────────────────────
  const runProbe = useCallback(async () => {
    if (probingRef.current) return;
    probingRef.current = true;
    setChecking(true);
    setStillOffline(false);

    const online = await probeConnectivity();

    setChecking(false);
    probingRef.current = false;

    if (online) {
      setJustRecovered(true);
      // Brief "back online" flash, then dismiss.
      setTimeout(() => {
        setIsOffline(false);
        setJustRecovered(false);
        setStillOffline(false);
      }, 1200);
    } else {
      setStillOffline(true);
    }
  }, []);

  // ── navigator.onLine polling (fallback for DevTools Offline) ────────────
  // Stops itself once online; restarts when offline is detected.
  const startPoll = useCallback(() => {
    if (pollTimerRef.current) return; // already running
    pollTimerRef.current = setInterval(() => {
      if (!navigator.onLine) {
        setIsOffline(true);
        setStillOffline(false);
        setJustRecovered(false);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const stopPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── DOM event handlers ───────────────────────────────────────────────────
  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setStillOffline(false);
    setJustRecovered(false);
    startPoll(); // keep polling in case future "online" event is also missed
  }, [startPoll]);

  const handleOnline = useCallback(() => {
    // Browser says we're back — probe before trusting it.
    runProbe();
  }, [runProbe]);

  // ── Mount: register events, check initial state, start poll ─────────────
  useEffect(() => {
    if (!navigator.onLine) {
      setIsOffline(true);
      startPoll();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);

    // Always run the poll so we catch DevTools Offline that skips the event.
    startPoll();

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
      stopPoll();
      if (autoCheckTimerRef.current) clearTimeout(autoCheckTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // ── Stop poll once we confirm we're online ───────────────────────────────
  useEffect(() => {
    if (!isOffline) stopPoll();
  }, [isOffline, stopPoll]);

  // ── Auto-retry every 30 s while popup is showing ─────────────────────────
  useEffect(() => {
    if (!isOffline) {
      if (autoCheckTimerRef.current) {
        clearTimeout(autoCheckTimerRef.current);
        autoCheckTimerRef.current = null;
      }
      return;
    }
    function scheduleNext() {
      autoCheckTimerRef.current = setTimeout(async () => {
        if (!probingRef.current) await runProbe();
        // scheduleNext() will be called again by the effect re-run if still offline
      }, 30_000);
    }
    scheduleNext();
    return () => {
      if (autoCheckTimerRef.current) clearTimeout(autoCheckTimerRef.current);
    };
  }, [isOffline, runProbe]);

  // ── Manual refresh button ────────────────────────────────────────────────
  const handleRefresh = useCallback(() => { runProbe(); }, [runProbe]);

  // ── Computed style values ────────────────────────────────────────────────
  const iconBg     = justRecovered ? "#ecfdf5" : "#fef2f2";
  const iconBorder = justRecovered ? "#6ee7b7" : "#fecaca";
  const btnBg      = checking
    ? "var(--line, #dbe3ee)"
    : "linear-gradient(135deg, var(--brand, #146c94) 0%, var(--brand-strong, #0b4f6c) 100%)";
  const btnColor   = checking ? "var(--muted, #657184)" : "#ffffff";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOffline && (
        <>
          {/* ── Backdrop ─────────────────────────────────────────────────── */}
          <motion.div
            key="offline-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.55)",
              backdropFilter: "blur(3px)",
              zIndex: 9998,
              pointerEvents: "all",
            }}
            aria-hidden="true"
          />

          {/*
           * ── Centering wrapper ──────────────────────────────────────────
           * FIX: framer-motion overwrites the CSS `transform` property on
           * every animation frame when scale/y are animated.  Placing
           * `transform: translate(-50%,-50%)` on the motion.div is silently
           * discarded, sending the card off-screen.
           *
           * Solution: use a static fixed full-viewport flexbox div to centre
           * the card.  The motion.div card has NO position/transform of its
           * own — framer-motion can animate scale and y freely.
           */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              pointerEvents: "none", // let clicks pass through to the backdrop
            }}
          >
            {/* ── Modal card ─────────────────────────────────────────────── */}
            <motion.div
              key="offline-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="offline-title"
              aria-describedby="offline-desc"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              style={{
                /* No position / transform here — centred by the parent flex */
                width: "min(92vw, 420px)",
                background: "var(--panel, #ffffff)",
                borderRadius: "20px",
                boxShadow:
                  "0 24px 64px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.10)",
                overflow: "hidden",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                pointerEvents: "auto", // card itself is interactive
              }}
            >
              {/* Top accent stripe */}
              <div
                style={{
                  height: 4,
                  background:
                    "linear-gradient(90deg, #c2410c 0%, #f59e0b 60%, #c2410c 100%)",
                }}
              />

              <div style={{ padding: "36px 32px 32px" }}>
                {/* Icon */}
                <div
                  style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}
                >
                  <motion.div
                    animate={justRecovered ? {} : { scale: [1, 1.06, 1] }}
                    transition={
                      justRecovered
                        ? {}
                        : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                    }
                    style={{
                      width: 72, height: 72, borderRadius: "50%",
                      background: iconBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `2px solid ${iconBorder}`,
                    }}
                  >
                    {justRecovered
                      ? <CheckCircle size={34} color="#059669" strokeWidth={1.8} />
                      : <WifiOff     size={34} color="#c2410c" strokeWidth={1.8} />
                    }
                  </motion.div>
                </div>

                {/* Title */}
                <h2
                  id="offline-title"
                  style={{
                    margin: "0 0 10px", fontSize: 22, fontWeight: 700,
                    color: "var(--ink, #132238)", textAlign: "center",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {justRecovered ? "Back Online!" : "You\u2019re Offline"}
                </h2>

                {/* Description */}
                <p
                  id="offline-desc"
                  style={{
                    margin: "0 0 24px", fontSize: 14, lineHeight: 1.65,
                    color: "var(--muted, #657184)", textAlign: "center",
                  }}
                >
                  {justRecovered
                    ? "Your internet connection has been restored. ShipTrack Pro is ready."
                    : "Your internet connection has been lost. Please reconnect to continue using ShipTrack Pro."}
                </p>

                {/* Still-offline warning */}
                <AnimatePresence>
                  {stillOffline && !justRecovered && (
                    <motion.div
                      key="still-offline"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      style={{
                        background: "#fff7ed", border: "1px solid #fed7aa",
                        borderRadius: 10, padding: "12px 14px",
                        display: "flex", alignItems: "flex-start", gap: 10,
                      }}
                    >
                      <AlertCircle
                        size={17} color="#c2410c"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                      <p style={{ margin: 0, fontSize: 13, color: "#9a3412", lineHeight: 1.5 }}>
                        Still offline. Please check your internet connection and try again.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Refresh button */}
                {!justRecovered && (
                  <motion.button
                    id="offline-refresh-btn"
                    onClick={handleRefresh}
                    disabled={checking}
                    whileHover={checking ? {} : { scale: 1.02 }}
                    whileTap={checking ? {} : { scale: 0.97 }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 9,
                      padding: "13px 0", borderRadius: 12, border: "none",
                      cursor: checking ? "not-allowed" : "pointer",
                      background: btnBg, color: btnColor,
                      fontSize: 15, fontWeight: 600, letterSpacing: "0.01em",
                      transition: "background 0.2s", fontFamily: "inherit",
                    }}
                    aria-label="Check internet connection"
                  >
                    <motion.span
                      animate={checking ? { rotate: 360 } : { rotate: 0 }}
                      transition={
                        checking
                          ? { duration: 0.9, repeat: Infinity, ease: "linear" }
                          : {}
                      }
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <RefreshCw size={17} strokeWidth={2.2} />
                    </motion.span>
                    {checking ? "Checking connection\u2026" : "Refresh Connection"}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}