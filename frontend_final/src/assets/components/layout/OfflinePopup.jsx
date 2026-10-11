import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

/*
 * OfflinePopup - Global internet-connection monitor for ShipTrack Pro
 * -------------------------------------------------------------------------
 * Detection strategy - four complementary layers:
 *
 *  Layer 1 - window "offline"/"online" DOM events (instant when OS fires)
 *  Layer 2 - navigator.onLine poll every 2 s (catches DevTools Offline where
 *             the event is not reliably fired in all Edge builds)
 *  Layer 3 - Silent background fetch probe every 10 s while apparently online.
 *             Catches REAL physical disconnections where Windows/macOS keeps
 *             navigator.onLine = true for 5-30 s (or indefinitely).
 *             Only shows popup after FAILURE_THRESHOLD (2) consecutive
 *             failures, so a single Render cold-start does not trigger it.
 *  Layer 4 - visibilitychange + window focus events: fires an immediate
 *             silent probe when the user returns to the tab, defeating
 *             browser timer throttling (Chrome/Edge slow background-tab
 *             setInterval to >= 1 min, causing the previous version to fail
 *             to detect real disconnects for several minutes).
 *
 * KEY FIX - bgProbe vs runManualProbe are fully separate:
 *   bgProbe()        - silent; touches NO React state; own mutex bgProbingRef
 *   runManualProbe() - shows spinner; drives visible UI; own mutex manualProbingRef
 * In the previous version both paths shared probingRef and called setChecking,
 * which could block background probes and add unnecessary re-renders.
 *
 * CENTERING - framer-motion overwrites CSS transform every animation frame.
 * The card is centred by a static fixed flexbox wrapper div, not by
 * transform:translate(-50%,-50%) on the motion.div itself.
 * -------------------------------------------------------------------------
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://shipment-tracking-delivery-visibility.onrender.com";

const PROBE_URL         = `${API_BASE}/api/roles`;
const PROBE_TIMEOUT_MS  = 5000;  // fail fast - 5 s per probe
const POLL_INTERVAL_MS  = 2000;  // navigator.onLine poll
const PERIODIC_CHECK_MS = 10000; // background fetch probe interval (10 s)
const FAILURE_THRESHOLD = 2;     // consecutive silent failures before showing popup

async function probeConnectivity() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(PROBE_URL, { method: "GET", signal: controller.signal, cache: "no-store" });
    return true; // any HTTP response = network reachable
  } catch {
    return false; // ERR_NAME_NOT_RESOLVED, timeout, network error = offline
  } finally {
    clearTimeout(timer);
  }
}

export default function OfflinePopup() {
  const [isOffline,     setIsOffline]     = useState(false);
  const [checking,      setChecking]      = useState(false);
  const [stillOffline,  setStillOffline]  = useState(false);
  const [justRecovered, setJustRecovered] = useState(false);

  const isOfflineRef     = useRef(false); // mirror of isOffline for use in callbacks
  const bgProbingRef     = useRef(false); // mutex for silent background probe
  const manualProbingRef = useRef(false); // mutex for user-visible probe
  const pollTimerRef     = useRef(null);  // Layer 2 setInterval handle
  const periodicTimerRef = useRef(null);  // Layer 3 setInterval handle
  const autoRetryRef     = useRef(null);  // auto-retry setTimeout while popup shows
  const consecutiveFails = useRef(0);     // Layer 3 failure counter

  // Keep isOfflineRef in sync with state so interval callbacks can read it.
  useEffect(() => { isOfflineRef.current = isOffline; }, [isOffline]);

  // ── bgProbe: silent background check, touches NO visible React state ──────
  // Has its own mutex (bgProbingRef) completely independent of manualProbingRef.
  // This was the core architectural fix: the previous shared probingRef and
  // shared setChecking calls could block background detection and cause
  // unnecessary re-renders during silent checks.
  const bgProbe = useCallback(async () => {
    if (bgProbingRef.current || isOfflineRef.current) return;
    bgProbingRef.current = true;
    const online = await probeConnectivity();
    bgProbingRef.current = false;
    if (online) {
      consecutiveFails.current = 0;
    } else {
      consecutiveFails.current += 1;
      if (consecutiveFails.current >= FAILURE_THRESHOLD) {
        consecutiveFails.current = 0; // reset so re-entry works correctly
        setIsOffline(true);
        setStillOffline(false);
        setJustRecovered(false);
      }
    }
  }, []);

  // ── runManualProbe: shows spinner, drives visible popup UI ────────────────
  const runManualProbe = useCallback(async () => {
    if (manualProbingRef.current) return;
    manualProbingRef.current = true;
    setChecking(true);
    setStillOffline(false);
    const online = await probeConnectivity();
    setChecking(false);
    manualProbingRef.current = false;
    if (online) {
      consecutiveFails.current = 0;
      setJustRecovered(true);
      setTimeout(() => {
        setIsOffline(false);
        setJustRecovered(false);
        setStillOffline(false);
      }, 1200);
    } else {
      setStillOffline(true);
    }
  }, []);

  // ── Layer 2: navigator.onLine poll every 2 s ──────────────────────────────
  const startPoll = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      if (!navigator.onLine && !isOfflineRef.current) {
        consecutiveFails.current = 0;
        setIsOffline(true);
        setStillOffline(false);
        setJustRecovered(false);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const stopPoll = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  // ── Layer 3: silent background fetch probe every 10 s ────────────────────
  const startPeriodicCheck = useCallback(() => {
    if (periodicTimerRef.current) return;
    periodicTimerRef.current = setInterval(() => { bgProbe(); }, PERIODIC_CHECK_MS);
  }, [bgProbe]);

  const stopPeriodicCheck = useCallback(() => {
    if (periodicTimerRef.current) { clearInterval(periodicTimerRef.current); periodicTimerRef.current = null; }
  }, []);

  // ── Layer 1: DOM offline/online event handlers ────────────────────────────
  const handleOffline = useCallback(() => {
    consecutiveFails.current = 0;
    setIsOffline(true);
    setStillOffline(false);
    setJustRecovered(false);
  }, []);

  const handleOnline = useCallback(() => {
    runManualProbe(); // confirm before trusting the browser event
  }, [runManualProbe]);

  // ── Layer 4: visibilitychange + focus — defeat background timer throttling ─
  // Chrome/Edge throttle setInterval to >= 1 min for tabs without focus.
  // An immediate bgProbe when the user returns catches the disconnect fast.
  const handleVisibility = useCallback(() => {
    if (document.visibilityState === "visible") bgProbe();
  }, [bgProbe]);

  const handleFocus = useCallback(() => { bgProbe(); }, [bgProbe]);

  // ── Mount: register all listeners and start background checks ─────────────
  useEffect(() => {
    if (!navigator.onLine) setIsOffline(true);

    window.addEventListener("offline",            handleOffline);
    window.addEventListener("online",             handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus",              handleFocus);

    startPoll();
    startPeriodicCheck();

    return () => {
      window.removeEventListener("offline",            handleOffline);
      window.removeEventListener("online",             handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus",              handleFocus);
      stopPoll();
      stopPeriodicCheck();
      if (autoRetryRef.current) clearTimeout(autoRetryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally once on mount

  // ── Pause/resume background checks when popup visibility changes ──────────
  useEffect(() => {
    if (isOffline) {
      stopPeriodicCheck();
      stopPoll();
    } else {
      consecutiveFails.current = 0;
      startPoll();
      startPeriodicCheck();
    }
  }, [isOffline, startPoll, stopPoll, startPeriodicCheck, stopPeriodicCheck]);

  // ── Auto-retry every 30 s while popup is showing ──────────────────────────
  useEffect(() => {
    if (!isOffline) {
      if (autoRetryRef.current) { clearTimeout(autoRetryRef.current); autoRetryRef.current = null; }
      return;
    }
    function scheduleNext() {
      autoRetryRef.current = setTimeout(async () => {
        if (!manualProbingRef.current) await runManualProbe();
        // Re-schedule only if still offline after the probe.
        // Uses isOfflineRef (live ref) not the stale closure isOffline.
        if (isOfflineRef.current) scheduleNext();
      }, 30_000);
    }
    scheduleNext();
    return () => { if (autoRetryRef.current) clearTimeout(autoRetryRef.current); };
  }, [isOffline, runManualProbe]);

  // ── Manual Refresh Connection button ──────────────────────────────────────
  const handleRefresh = useCallback(() => { runManualProbe(); }, [runManualProbe]);

  // ── Computed style values (unchanged) ─────────────────────────────────────
  const iconBg     = justRecovered ? "#ecfdf5" : "#fef2f2";
  const iconBorder = justRecovered ? "#6ee7b7" : "#fecaca";
  const btnBg      = checking
    ? "var(--line, #dbe3ee)"
    : "linear-gradient(135deg, var(--brand, #146c94) 0%, var(--brand-strong, #0b4f6c) 100%)";
  const btnColor   = checking ? "var(--muted, #657184)" : "#ffffff";

  // ── Render (JSX unchanged) ────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOffline && (
        <>
          {/* Backdrop */}
          <motion.div
            key="offline-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(15,23,42,0.55)",
              backdropFilter: "blur(3px)",
              zIndex: 9998, pointerEvents: "all",
            }}
            aria-hidden="true"
          />

          {/* Centering wrapper - flexbox is immune to framer-motion transform overrides */}
          <div
            style={{
              position: "fixed", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 9999, pointerEvents: "none",
            }}
          >
            {/* Modal card - NO position/transform; centred by parent flexbox */}
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
                width: "min(92vw, 420px)",
                background: "var(--panel, #ffffff)",
                borderRadius: "20px",
                boxShadow: "0 24px 64px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.10)",
                overflow: "hidden",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                pointerEvents: "auto",
              }}
            >
              <div style={{ height: 4, background: "linear-gradient(90deg, #c2410c 0%, #f59e0b 60%, #c2410c 100%)" }} />

              <div style={{ padding: "36px 32px 32px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <motion.div
                    animate={justRecovered ? {} : { scale: [1, 1.06, 1] }}
                    transition={justRecovered ? {} : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: 72, height: 72, borderRadius: "50%", background: iconBg,
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

                <h2
                  id="offline-title"
                  style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 700, color: "var(--ink, #132238)", textAlign: "center", letterSpacing: "-0.02em" }}
                >
                  {justRecovered ? "Back Online!" : "You\u2019re Offline"}
                </h2>

                <p
                  id="offline-desc"
                  style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.65, color: "var(--muted, #657184)", textAlign: "center" }}
                >
                  {justRecovered
                    ? "Your internet connection has been restored. ShipTrack Pro is ready."
                    : "Your internet connection has been lost. Please reconnect to continue using ShipTrack Pro."}
                </p>

                <AnimatePresence>
                  {stillOffline && !justRecovered && (
                    <motion.div
                      key="still-offline"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}
                    >
                      <AlertCircle size={17} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ margin: 0, fontSize: 13, color: "#9a3412", lineHeight: 1.5 }}>
                        Still offline. Please check your internet connection and try again.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!justRecovered && (
                  <motion.button
                    id="offline-refresh-btn"
                    onClick={handleRefresh}
                    disabled={checking}
                    whileHover={checking ? {} : { scale: 1.02 }}
                    whileTap={checking ? {} : { scale: 0.97 }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
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
                      transition={checking ? { duration: 0.9, repeat: Infinity, ease: "linear" } : {}}
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
