import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

/*
 * OfflinePopup — Global internet-connection monitor for ShipTrack Pro
 * -------------------------------------------------------------------------
 * Detection strategy (three complementary layers):
 *
 *   Layer 1 — DOM events
 *     window "offline" / "online" events fire immediately when the OS
 *     propagates the network state change. Fastest path, but not guaranteed
 *     on every OS/browser combination.
 *
 *   Layer 2 — navigator.onLine poll (every 2 s)
 *     Catches the DevTools Network → Offline case where some Edge/Chrome
 *     builds do not fire the DOM event.
 *
 *   Layer 3 — Proactive background fetch probe (every 20 s, while online)
 *     Catches actual physical disconnections where the OS takes 5-30 s to
 *     update navigator.onLine.  Probes /api/roles (existing public endpoint,
 *     no side-effects).  Only triggers the popup after FAILURE_THRESHOLD (2)
 *     consecutive failures so that a single Render cold-start or momentary
 *     hiccup does NOT falsely claim the user's internet is down.
 *
 * Recovery: the popup closes only after a successful probe — never on a bare
 * browser "online" event or navigator.onLine flip alone.
 *
 * CENTERING: framer-motion overwrites CSS `transform` every frame when scale/y
 * are animated.  A fixed full-viewport flexbox wrapper centres the card
 * safely, with no transform on the motion.div card itself.
 * -------------------------------------------------------------------------
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://shipment-tracking-delivery-visibility.onrender.com";

const PROBE_URL           = `${API_BASE}/api/roles`;
const PROBE_TIMEOUT_MS    = 6000;  // per-probe fetch timeout
const POLL_INTERVAL_MS    = 2000;  // navigator.onLine poll interval
const PERIODIC_CHECK_MS   = 20000; // background fetch probe interval while online
const FAILURE_THRESHOLD   = 2;     // consecutive probe failures before showing popup

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

  const autoCheckTimerRef    = useRef(null);  // 30-s auto-retry while popup shows
  const pollTimerRef         = useRef(null);  // 2-s navigator.onLine poll
  const periodicCheckTimerRef = useRef(null); // 20-s background fetch probe
  const probingRef           = useRef(false); // mutex — prevent concurrent probes
  const consecutiveFailures  = useRef(0);     // failure counter for threshold logic
  const isOfflineRef         = useRef(false); // mirror of isOffline for use in timers

  // Keep isOfflineRef in sync with state (timers can't read current state)
  useEffect(() => { isOfflineRef.current = isOffline; }, [isOffline]);

  // ── Core: probe + update state ───────────────────────────────────────────
  // Used by: manual Refresh button, auto-retry, and background check.
  // Called with resetThreshold=true only from background check; false from
  // manual/auto calls so an explicit user action always shows the spinner.
  const runProbe = useCallback(async ({ resetThreshold = false } = {}) => {
    if (probingRef.current) return;
    probingRef.current = true;
    setChecking(true);
    setStillOffline(false);

    const online = await probeConnectivity();

    setChecking(false);
    probingRef.current = false;

    if (online) {
      consecutiveFailures.current = 0;
      if (isOfflineRef.current) {
        // We're recovering — show the "Back Online" flash then dismiss.
        setJustRecovered(true);
        setTimeout(() => {
          setIsOffline(false);
          setJustRecovered(false);
          setStillOffline(false);
        }, 1200);
      }
    } else {
      if (resetThreshold) {
        // Background probe path — count consecutive failures.
        consecutiveFailures.current += 1;
        if (consecutiveFailures.current >= FAILURE_THRESHOLD) {
          // Only show popup when threshold is reached, not on first failure.
          setIsOffline(true);
          setStillOffline(false);
          setJustRecovered(false);
        }
        // Do NOT set stillOffline here — popup may not be visible yet.
      } else {
        // Manual / auto-retry path — popup is already showing.
        setStillOffline(true);
      }
    }
  }, []);

  // ── Layer 2: navigator.onLine poll (2 s) ─────────────────────────────────
  const startPoll = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      if (!navigator.onLine) {
        consecutiveFailures.current = FAILURE_THRESHOLD; // instant trigger
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

  // ── Layer 3: background fetch probe (20 s, only while apparently online) ──
  // Catches physical disconnections where the OS delays updating onLine.
  // Stops while the popup is showing (auto-retry handles that at 30 s).
  const startPeriodicCheck = useCallback(() => {
    if (periodicCheckTimerRef.current) return;
    periodicCheckTimerRef.current = setInterval(() => {
      // Skip if popup is already showing or a probe is in progress.
      if (isOfflineRef.current || probingRef.current) return;
      runProbe({ resetThreshold: true });
    }, PERIODIC_CHECK_MS);
  }, [runProbe]);

  const stopPeriodicCheck = useCallback(() => {
    if (periodicCheckTimerRef.current) {
      clearInterval(periodicCheckTimerRef.current);
      periodicCheckTimerRef.current = null;
    }
  }, []);

  // ── Layer 1: DOM event handlers ──────────────────────────────────────────
  const handleOffline = useCallback(() => {
    consecutiveFailures.current = FAILURE_THRESHOLD; // immediate
    setIsOffline(true);
    setStillOffline(false);
    setJustRecovered(false);
  }, []);

  const handleOnline = useCallback(() => {
    // Browser says we're back — probe to confirm before closing popup.
    runProbe({ resetThreshold: false });
  }, [runProbe]);

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Check state immediately on mount.
    if (!navigator.onLine) {
      consecutiveFailures.current = FAILURE_THRESHOLD;
      setIsOffline(true);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);

    startPoll();           // Layer 2
    startPeriodicCheck();  // Layer 3

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
      stopPoll();
      stopPeriodicCheck();
      if (autoCheckTimerRef.current) clearTimeout(autoCheckTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally once on mount

  // ── Pause / resume periodic check based on popup visibility ──────────────
  useEffect(() => {
    if (isOffline) {
      // Popup is showing — pause background probe (auto-retry covers this).
      stopPeriodicCheck();
      stopPoll();
    } else {
      // Back online — reset failure counter and resume checks.
      consecutiveFailures.current = 0;
      startPoll();
      startPeriodicCheck();
    }
  }, [isOffline, startPoll, stopPoll, startPeriodicCheck, stopPeriodicCheck]);

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
        if (!probingRef.current) await runProbe({ resetThreshold: false });
      }, 30_000);
    }
    scheduleNext();
    return () => {
      if (autoCheckTimerRef.current) clearTimeout(autoCheckTimerRef.current);
    };
  }, [isOffline, runProbe]);

  // ── Manual Refresh Connection button ─────────────────────────────────────
  const handleRefresh = useCallback(() => {
    runProbe({ resetThreshold: false });
  }, [runProbe]);

  // ── Computed style values (unchanged from previous version) ──────────────
  const iconBg     = justRecovered ? "#ecfdf5" : "#fef2f2";
  const iconBorder = justRecovered ? "#6ee7b7" : "#fecaca";
  const btnBg      = checking
    ? "var(--line, #dbe3ee)"
    : "linear-gradient(135deg, var(--brand, #146c94) 0%, var(--brand-strong, #0b4f6c) 100%)";
  const btnColor   = checking ? "var(--muted, #657184)" : "#ffffff";

  // ── Render (JSX unchanged from previous version) ─────────────────────────
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
           * Centering wrapper — framer-motion overwrites `transform` on every
           * animation frame, so we use a flexbox parent for centering instead
           * of transform:translate(-50%,-50%) on the motion.div card.
           */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              pointerEvents: "none",
            }}
          >
            {/* Modal card */}
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
                /* No position / transform — centred by parent flexbox */
                width: "min(92vw, 420px)",
                background: "var(--panel, #ffffff)",
                borderRadius: "20px",
                boxShadow:
                  "0 24px 64px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.10)",
                overflow: "hidden",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                pointerEvents: "auto",
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