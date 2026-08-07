import { useCallback, useEffect, useRef, useState } from "react";
import DriverLocationCard from "../components/location/DriverLocationCard";

import {
  acceptShipment,
  confirmDelivery,
  generateDeliveryOtp,
  getAvailableShipments,
  getMyShipments,
  rejectShipmentRequest,
  updateDriverLocation,
  verifyDeliveryOtp,
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
  Camera: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" width={24} height={24} {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
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

// ─────────────────────────────────────────────────────────────────────────────
// Milestone 3 — Proof of Delivery: Signature Canvas helper
// ─────────────────────────────────────────────────────────────────────────────
function SignatureCanvas({ canvasRef, onDraw }) {
  const drawing = useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.strokeStyle = "#1a2744";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    onDraw();
  };

  const endDraw = (e) => { e.preventDefault(); drawing.current = false; };

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={210}
      onMouseDown={startDraw}  onMouseMove={draw}  onMouseUp={endDraw}  onMouseLeave={endDraw}
      onTouchStart={startDraw} onTouchMove={draw}  onTouchEnd={endDraw}
      style={{
        width: "100%", height: 210, display: "block",
        border: "1.5px solid var(--line)", borderRadius: 8,
        background: "#fff", cursor: "crosshair", touchAction: "none",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestone 3 — Delivery Confirmation Modal (extended with POD)
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_PHOTO_MB        = 5;

function DeliveryConfirmationModal({ shipment, onClose, onConfirmed, showToast }) {
  const [receiverName,    setReceiverName]    = useState("");
  const [deliveryRemarks, setDeliveryRemarks] = useState("");
  const [submitting,      setSubmitting]      = useState(false);

  // ── OTP Verification State (Milestone 4) ────────────────────────────────
  const [otpSent,          setOtpSent]          = useState(false);
  const [otpVerified,      setOtpVerified]      = useState(false);
  const [otpValue,         setOtpValue]         = useState("");
  const [otpStatus,        setOtpStatus]        = useState(null); // null | "sending" | "verifying" | "verified" | "error"
  const [otpMessage,       setOtpMessage]       = useState("");
  const [maskedEmail,      setMaskedEmail]      = useState("");
  const [resendTimer,      setResendTimer]      = useState(0);
  const [resendCount,      setResendCount]      = useState(0);
  const [attemptsLeft,     setAttemptsLeft]     = useState(5);
  const resendTimerRef = useRef(null);

  // Clean up countdown timer when modal closes
  useEffect(() => {
    return () => { if (resendTimerRef.current) clearInterval(resendTimerRef.current); };
  }, []);

  // Start the 45-second countdown after each OTP send
  const startResendCountdown = () => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    setResendTimer(45);
    resendTimerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current);
          resendTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handler: Generate / Resend OTP
  const handleGenerateOtp = async () => {
    if (!receiverName.trim()) {
      setErrors((p) => ({ ...p, receiverName: "Please enter the receiver name before generating OTP." }));
      return;
    }
    setOtpStatus("sending");
    setOtpMessage("");
    try {
      const res = await generateDeliveryOtp(shipment.id);
      const data = res.data;
      setMaskedEmail(data.maskedEmail || "");
      setOtpSent(true);
      setOtpVerified(false);
      setOtpValue("");
      setAttemptsLeft(5);
      setResendCount((c) => c + 1);
      setOtpStatus(null);
      setOtpMessage(`OTP sent to ${data.maskedEmail}. Expires in 45 seconds.`);
      startResendCountdown();
    } catch (err) {
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.error
        ?? "Failed to generate OTP. Please try again.";
      setOtpStatus("error");
      setOtpMessage(msg);
    }
  };

  // Handler: Verify OTP
  const handleVerifyOtp = async () => {
    if (otpValue.trim().length !== 6) {
      setOtpMessage("Please enter the 6-digit OTP.");
      return;
    }
    setOtpStatus("verifying");
    setOtpMessage("");
    try {
      const res = await verifyDeliveryOtp(shipment.id, otpValue.trim());
      const data = res.data;
      if (data.success === "true" || data.success === true) {
        setOtpVerified(true);
        setOtpStatus("verified");
        setOtpMessage("✔ Customer identity verified.");
      } else {
        const remaining = parseInt(data.attemptsRemaining ?? "0", 10);
        setAttemptsLeft(remaining);
        setOtpStatus("error");
        setOtpMessage(data.message ?? "Incorrect OTP.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.error
        ?? "Verification failed. Please try again.";
      setOtpStatus("error");
      setOtpMessage(msg);
    }
  };

  // Signature canvas — useRef so the DOM node is stable across renders
  const canvasRef  = useRef(null);
  const [sigEmpty, setSigEmpty] = useState(true);

  // Delivery photo state
  const [photoFile,  setPhotoFile]  = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Per-field errors
  const [errors, setErrors] = useState({});

  // ── Signature helpers ───────────────────────────────────────────────────
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setSigEmpty(true);
    setErrors((p) => ({ ...p, signature: undefined }));
  };

  const getSignatureBlob = () =>
    new Promise((resolve) => canvasRef.current.toBlob(resolve, "image/png"));

  // ── Photo helpers ───────────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.toLowerCase();
    if (!ALLOWED_PHOTO_TYPES.includes(type)) {
      setErrors((p) => ({ ...p, photo: "Only JPG and PNG images are accepted." }));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setErrors((p) => ({ ...p, photo: `Photo must not exceed ${MAX_PHOTO_MB} MB.` }));
      e.target.value = "";
      return;
    }
    setErrors((p) => ({ ...p, photo: undefined }));
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  // ── Submission ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Gate: OTP must be verified before submission is allowed
    if (!otpVerified) {
      setOtpMessage("Customer identity must be verified before confirming delivery.");
      return;
    }

    // Validate all fields before sending anything
    const next = {};
    if (!receiverName.trim())  next.receiverName = "Receiver name is required.";
    if (sigEmpty)              next.signature    = "Customer signature is required.";
    if (!photoFile)            next.photo        = "Delivery photo is required.";
    if (Object.keys(next).length > 0) { setErrors(next); return; }

    setErrors({});
    setSubmitting(true);
    try {
      const signatureBlob = await getSignatureBlob();

      const fd = new FormData();
      fd.append("receiverName",    receiverName.trim());
      if (deliveryRemarks.trim()) fd.append("deliveryRemarks", deliveryRemarks.trim());
      fd.append("signature", signatureBlob, "signature.png");
      fd.append("photo",     photoFile,     photoFile.name);

      await confirmDelivery(shipment.id, fd);
      showToast(`✓ Delivery confirmed — ${shipment.trackingNumber}`);
      onConfirmed();
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Failed to confirm delivery. Please try again.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const FieldError = ({ name }) =>
    errors[name]
      ? <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors[name]}</p>
      : null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(10,20,40,0.48)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 16px",
      }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Dialog shell — wide, compact height ── */}
      <div style={{
        background: "var(--panel)", borderRadius: 16,
        boxShadow: "0 28px 72px rgba(10,20,40,0.30)",
        width: "100%", maxWidth: 760,
        maxHeight: "92vh", overflowY: "auto",
        padding: "26px 28px 24px",
        display: "flex", flexDirection: "column", gap: 0,
      }}>

        {/* ── Header row ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3, fontSize: 11 }}>Confirm Delivery</div>
            <strong style={{ fontSize: 16 }}>{shipment.trackingNumber}</strong>
          </div>
          <button type="button" onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: 4, color: "var(--muted)", lineHeight: 1,
          }}>
            <Icon.X width={18} height={18} />
          </button>
        </div>

        {/* ── Route pill ── */}
        <div style={{
          background: "#f7fafc", border: "1px solid var(--line)",
          borderRadius: 8, padding: "8px 14px", marginBottom: 16,
          fontSize: 13, color: "var(--muted)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Icon.MapPin style={{ color: "var(--brand)", flexShrink: 0, width: 15, height: 15 }} />
          <span>
            <strong style={{ color: "var(--ink)" }}>{shipment.originAddress?.city || "—"}</strong>
            {" → "}
            <strong style={{ color: "var(--ink)" }}>{shipment.destinationAddress?.city || "—"}</strong>
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Row 1: Receiver Name + Remarks side-by-side ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                Receiver Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                id="delivery-receiver-name"
                className="input"
                type="text"
                placeholder="Full name of receiver"
                value={receiverName}
                onChange={(e) => { setReceiverName(e.target.value); setErrors((p) => ({ ...p, receiverName: undefined })); }}
                maxLength={150}
                autoFocus
                style={{ width: "100%" }}
              />
              <FieldError name="receiverName" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                Delivery Remarks <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="delivery-remarks"
                className="input"
                placeholder='e.g. "Handed to security guard"'
                value={deliveryRemarks}
                onChange={(e) => setDeliveryRemarks(e.target.value)}
                maxLength={500}
                rows={2}
                style={{ width: "100%", resize: "none" }}
              />
            </div>
          </div>

          {/* ── OTP Verification Section (Milestone 4) ── */}
          {/* Inserted between Row 1 and Row 2. No new popup — stays inside this form. */}
          <div style={{
            background: otpVerified ? "#f0fdf4" : "#f8fafc",
            border: `1.5px solid ${otpVerified ? "#6ee7b7" : "#e2e8f0"}`,
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
            transition: "background 0.3s, border-color 0.3s",
          }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: otpVerified ? "#059669" : "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  {otpVerified ? "✔ Identity Verified" : "Customer Identity Verification"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {otpVerified
                    ? "Customer OTP verified. You may now collect signature and photo."
                    : "Generate an OTP — the customer will receive it by email and share it with you."
                  }
                </div>
              </div>
            </div>

            {/* Generate OTP button row */}
            {!otpVerified && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: otpSent ? 10 : 0 }}>
                <button
                  id="delivery-generate-otp-btn"
                  type="button"
                  className="button primary"
                  style={{
                    fontSize: 13, padding: "7px 16px",
                    opacity: otpStatus === "sending" || !receiverName.trim() ? 0.6 : 1,
                    cursor: otpStatus === "sending" || !receiverName.trim() ? "not-allowed" : "pointer",
                  }}
                  disabled={otpStatus === "sending" || !receiverName.trim()}
                  onClick={handleGenerateOtp}
                >
                  {otpStatus === "sending"
                    ? "Sending…"
                    : otpSent ? "Resend OTP" : "Generate OTP"
                  }
                </button>
                {maskedEmail && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    OTP sent to <strong>{maskedEmail}</strong>
                  </span>
                )}
              </div>
            )}

            {/* OTP input + Verify row — visible after first send */}
            {otpSent && !otpVerified && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Enter 6-digit OTP
                  </label>
                  <input
                    id="delivery-otp-input"
                    className="input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{
                      width: "100%",
                      letterSpacing: "0.2em",
                      textAlign: "center",
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                    disabled={otpStatus === "verifying"}
                  />
                </div>
                <button
                  id="delivery-verify-otp-btn"
                  type="button"
                  className="button primary"
                  style={{
                    fontSize: 13, padding: "7px 18px",
                    opacity: otpValue.length !== 6 || otpStatus === "verifying" ? 0.6 : 1,
                    cursor: otpValue.length !== 6 || otpStatus === "verifying" ? "not-allowed" : "pointer",
                    background: "#059669",
                    border: "none",
                  }}
                  disabled={otpValue.length !== 6 || otpStatus === "verifying"}
                  onClick={handleVerifyOtp}
                >
                  {otpStatus === "verifying" ? "Verifying…" : "Verify OTP"}
                </button>
              </div>
            )}

            {/* Resend timer + attempts remaining */}
            {otpSent && !otpVerified && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <button
                  id="delivery-resend-otp-btn"
                  type="button"
                  style={{
                    fontSize: 11, color: resendTimer > 0 || resendCount >= 3 ? "var(--muted)" : "var(--brand)",
                    background: "none", border: "none", cursor: resendTimer > 0 || resendCount >= 3 ? "not-allowed" : "pointer",
                    padding: 0, fontWeight: 600,
                  }}
                  disabled={resendTimer > 0 || resendCount >= 3}
                  onClick={handleGenerateOtp}
                >
                  {resendCount >= 3
                    ? "Resend limit reached"
                    : resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : "Resend OTP"
                  }
                </button>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  Attempts remaining: <strong>{attemptsLeft}</strong>
                </span>
              </div>
            )}

            {/* OTP status message */}
            {otpMessage && (
              <div style={{
                fontSize: 12, fontWeight: 600, marginTop: 4,
                color: otpStatus === "verified" ? "#059669"
                     : otpStatus === "error"    ? "var(--danger)"
                     : "var(--muted)",
              }}>
                {otpMessage}
              </div>
            )}
          </div>

          {/* ── Row 2: Signature (left) + Photo (right) ── */}
          {/* Signature and photo are LOCKED until OTP is verified */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", marginBottom: 18, position: "relative" }}>

            {/* Overlay shown when OTP not yet verified */}
            {!otpVerified && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 2,
                background: "rgba(248,250,252,0.82)",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(2px)",
              }}>
                <div style={{
                  background: "#fff", border: "1.5px solid var(--line)",
                  borderRadius: 8, padding: "10px 20px",
                  fontSize: 13, color: "var(--muted)",
                  fontWeight: 600, textAlign: "center",
                }}>
                  🔒 Verify customer OTP to unlock Signature and Photo
                </div>
              </div>
            )}

            {/* LEFT: Signature */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                Customer Signature <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{
                border: sigEmpty ? "1.5px dashed var(--line)" : "1.5px solid var(--brand)",
                borderRadius: 8, overflow: "hidden", background: "#fff",
              }}>
                <SignatureCanvas
                  canvasRef={canvasRef}
                  onDraw={() => { setSigEmpty(false); setErrors((p) => ({ ...p, signature: undefined })); }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                {sigEmpty
                  ? <span style={{ fontSize: 11, color: "var(--muted)" }}>Draw with mouse or touch</span>
                  : <span style={{ fontSize: 11, color: "var(--brand)" }}>✓ Signature captured</span>
                }
                {!sigEmpty && (
                  <button type="button" onClick={clearSignature} style={{
                    fontSize: 11, color: "var(--muted)", background: "none",
                    border: "1px solid var(--line)", borderRadius: 5,
                    padding: "2px 8px", cursor: "pointer",
                  }}>Clear</button>
                )}
              </div>
              <FieldError name="signature" />
            </div>

            {/* RIGHT: Delivery Photo */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                Delivery Photo <span style={{ color: "var(--danger)" }}>*</span>
                <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>JPG / PNG ≤ {MAX_PHOTO_MB} MB</span>
              </label>

              {photoPreview ? (
                <div style={{ position: "relative", flex: 1 }}>
                  <img
                    src={photoPreview}
                    alt="Delivery preview"
                    style={{
                      width: "100%", height: 188, objectFit: "cover",
                      borderRadius: 8, border: "1.5px solid var(--line)", display: "block",
                    }}
                  />
                  <button type="button" onClick={removePhoto} style={{
                    position: "absolute", top: 6, right: 6,
                    background: "rgba(10,20,40,0.62)", border: "none",
                    borderRadius: "50%", width: 24, height: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#fff",
                  }}>
                    <Icon.X width={12} height={12} />
                  </button>
                  <label htmlFor="delivery-photo-input" style={{
                    display: "block", marginTop: 6, textAlign: "center",
                    fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600,
                  }}>Change photo</label>
                </div>
              ) : (
                <label htmlFor="delivery-photo-input" style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 8,
                  border: "1.5px dashed var(--line)", borderRadius: 8,
                  background: "#f7fafc", cursor: "pointer",
                  color: "var(--muted)", fontSize: 13, minHeight: 188,
                  transition: "border-color 0.15s",
                }}>
                  <Icon.Camera style={{ width: 28, height: 28, opacity: 0.45 }} />
                  <span style={{ fontWeight: 600 }}>Upload delivery photo</span>
                  <span style={{ fontSize: 11 }}>Click to browse</span>
                </label>
              )}

              <input
                id="delivery-photo-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
              <FieldError name="photo" />
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              id="delivery-confirm-btn"
              className="button primary"
              style={{
                flex: 1.4,
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: 14,
                opacity: !otpVerified ? 0.5 : 1,
                cursor: !otpVerified ? "not-allowed" : "pointer",
              }}
              disabled={submitting || !otpVerified}
            >
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 14, height: 14,
                    border: "2px solid rgba(255,255,255,0.35)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    display: "inline-block", animation: "spin 0.7s linear infinite",
                  }} />
                  Uploading…
                </span>
              ) : (
                <><Icon.CheckCircle /> Confirm Delivery</>
              )}
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ flex: 1 }}
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
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

  // Milestone 3: which shipment's confirmation modal is open (null = closed)
  const [confirmModal, setConfirmModal] = useState(null);

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

  // ── Delivery Confirmation (Milestone 3) ──────────────────────────────────
  // After a successful confirmation, trigger a full silent backend refresh
  // (available shipments + my-shipments) so every counter and card reflects
  // the real database state — not just an optimistic local update.
  const handleConfirmDelivery = useCallback(() => {
    setConfirmModal(null);
    load(true);
  }, [load]);


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

                    {/* Hint — changes for OUT_FOR_DELIVERY to show Confirm Delivery button */}
                    {status === "OUT_FOR_DELIVERY" ? (
                      <div style={{ marginTop: 4 }}>
                        <button
                          className="button primary"
                          style={{ width: "100%" }}
                          onClick={() => setConfirmModal(s)}
                        >
                          <Icon.CheckCircle /> Confirm Delivery
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        background: "#f0fdf4", border: "1px solid #bbf7d0",
                        borderRadius: 8, padding: "8px 12px",
                        fontSize: 12, color: "#166534",
                      }}>
                        ✓ This shipment is assigned to you. Update its status as you make progress.
                      </div>
                    )}
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

      {/* ── Milestone 3: Delivery Confirmation Modal ── */}
      {confirmModal && (
        <DeliveryConfirmationModal
          shipment={confirmModal}
          onClose={() => setConfirmModal(null)}
          onConfirmed={handleConfirmDelivery}
          showToast={showToast}
        />
      )}
    </div>
  );
}

export default AvailableDeliveries;
