/**
 * OtpVerificationStep.jsx
 * ─────────────────────────────────────────────────────────────
 * Enterprise OTP verification UI for the registration flow.
 *
 * Features:
 *  - 6 individual digit input boxes with auto-advance & backspace navigation
 *  - Paste support for the full 6-digit OTP
 *  - Timestamp-based countdown (expiresAt - Date.now()) so the timer
 *    stays accurate even when the browser tab is inactive or throttled
 *  - visibilitychange listener forces immediate recalculation when user
 *    returns to the tab — no stale values ever shown
 *  - "Resend OTP" with 60-second cooldown
 *  - Loading, error, and success states
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, ShieldCheck, RefreshCw, ArrowLeft,
  CheckCircle2, AlertCircle, Loader2, Clock
} from 'lucide-react';

const DIGITS             = 6;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds in ms

/* ── Helpers ──────────────────────────────────────────────────── */
const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

/**
 * Calculate remaining seconds from an epoch-ms expiry timestamp.
 * Always uses the real wall-clock time — unaffected by tab throttling.
 */
const calcRemaining = (expiresAtMs) =>
  Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

/**
 * @param {object} props
 * @param {string}   props.email        Email the OTP was sent to
 * @param {string}   props.maskedEmail  Masked version from backend
 * @param {number}   props.expiresAt    Epoch-ms timestamp when the OTP expires
 * @param {function} props.onVerified   async callback(otpValue) — throws on error
 * @param {function} props.onResend     async callback(email) — returns { success, data?, error? }
 * @param {function} props.onBack       Go back to the registration form
 */
const OtpVerificationStep = ({ email, maskedEmail, expiresAt, onVerified, onResend, onBack }) => {

  const [digits,      setDigits]      = useState(Array(DIGITS).fill(''));
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const [resending,   setResending]   = useState(false);
  const [resendMsg,   setResendMsg]   = useState('');

  // ── Timestamp-based OTP expiry ────────────────────────────────
  // otpSeconds is derived from (expiresAt - now) each tick,
  // NOT from a decrementing local counter.
  const [otpSeconds, setOtpSeconds] = useState(() => calcRemaining(expiresAt));

  // ── Resend cooldown (also timestamp-based) ────────────────────
  const resendEndsAtRef = useRef(Date.now() + RESEND_COOLDOWN_MS);
  const [resendSeconds, setResendSeconds] = useState(
    () => Math.max(0, Math.floor((resendEndsAtRef.current - Date.now()) / 1000))
  );

  const inputRefs = useRef([]);

  // ── OTP countdown — recalculates from real timestamp every tick ─
  useEffect(() => {
    if (otpSeconds <= 0) return;

    const tick = () => setOtpSeconds(calcRemaining(expiresAt));

    // Poll every 500 ms for smoother display without relying on exact 1s intervals
    const id = setInterval(tick, 500);

    // Instantly correct when user returns to tab (fixes throttled-tab drift)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [expiresAt, otpSeconds]);

  // ── Resend cooldown countdown ─────────────────────────────────
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((resendEndsAtRef.current - Date.now()) / 1000)
      );
      setResendSeconds(remaining);
    }, 500);
    return () => clearInterval(id);
  }, [resendSeconds]);

  // ── Focus first box on mount ──────────────────────────────────
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // ── Computed flags ────────────────────────────────────────────
  const otpValue      = digits.join('');
  const isOtpComplete = otpValue.length === DIGITS;
  const isExpired     = otpSeconds <= 0;
  const canResend     = resendSeconds <= 0 && !resending;
  const otpMin        = Math.floor(otpSeconds / 60);
  const otpSec        = otpSeconds % 60;
  const timerColor    = otpSeconds < 60 ? '#ef4444' : '#6366f1';

  // ── Input handlers ────────────────────────────────────────────
  const handleChange = useCallback((index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setError('');
    if (digit && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits((prev) => { const n = [...prev]; n[index] = ''; return n; });
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft'  && index > 0)          inputRefs.current[index - 1]?.focus();
    else if   (e.key === 'ArrowRight' && index < DIGITS - 1) inputRefs.current[index + 1]?.focus();
    else if   (e.key === 'Enter' && isOtpComplete && !loading && !isExpired) handleSubmit();
  }, [digits, isOtpComplete, loading, isExpired]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (!pasted) return;
    const next = Array(DIGITS).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError('');
    inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
  }, []);

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Re-check with real timestamp at submit time
    if (calcRemaining(expiresAt) <= 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }
    if (!isOtpComplete || loading) return;
    setLoading(true);
    setError('');
    try {
      await onVerified(otpValue);
      setSuccess(true);
    } catch (err) {
      setError(err?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    setResendMsg('');
    setError('');
    setDigits(Array(DIGITS).fill(''));
    inputRefs.current[0]?.focus();

    try {
      const result = await onResend(email);
      if (result.success) {
        setResendMsg('A new OTP has been sent to your email.');
        // Reset resend cooldown
        resendEndsAtRef.current = Date.now() + RESEND_COOLDOWN_MS;
        setResendSeconds(60);
        // Note: parent must update expiresAt prop for the new OTP;
        // the onResend callback returns data.expiresAt for that purpose.
      } else {
        setError(result.error || 'Failed to resend OTP. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────
  if (success) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '24px 0' }}
      >
        <div style={{
          width: 72, height: 72, background: '#dcfce7', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle2 size={36} color="#16a34a" />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
          Email Verified!
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>Creating your account…</p>
        <div style={{ marginTop: 16 }}>
          <Loader2 size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, #ede9fe, #c7d2fe)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 4px 16px rgba(99,102,241,0.15)',
        }}>
          <ShieldCheck size={30} color="#6366f1" />
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Verify Your Email
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
          We sent a 6-digit code to
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
          <Mail size={14} color="#6366f1" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>
            {maskedEmail || email}
          </span>
        </div>
      </div>

      {/* ── Timer — driven by real timestamp ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginBottom: 20,
      }}>
        <Clock size={14} color={timerColor} />
        <span style={{ fontSize: 13, fontWeight: 700, color: timerColor, fontFamily: 'monospace' }}>
          {isExpired
            ? 'OTP expired — please request a new one'
            : `Expires in ${pad(otpMin)}:${pad(otpSec)}`}
        </span>
      </div>

      {/* ── OTP Digit Inputs ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => {
              e.target.select();
              e.target.style.borderColor = '#6366f1';
              e.target.style.boxShadow   = '0 0 0 3px rgba(99,102,241,0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = digit ? '#6366f1' : '#e2e8f0';
              e.target.style.boxShadow   = 'none';
            }}
            disabled={loading || isExpired}
            style={{
              width: 52, height: 60,
              textAlign: 'center',
              fontSize: 24, fontWeight: 800,
              fontFamily: 'monospace',
              border: `2px solid ${digit ? '#6366f1' : '#e2e8f0'}`,
              borderRadius: 10,
              background: digit ? '#f5f3ff' : '#ffffff',
              color: '#0f172a',
              outline: 'none',
              cursor: (loading || isExpired) ? 'not-allowed' : 'text',
              opacity: isExpired ? 0.45 : 1,
              transition: 'border-color 0.15s, background 0.15s',
              boxSizing: 'border-box',
            }}
          />
        ))}
      </div>

      {/* ── Expired banner ── */}
      <AnimatePresence>
        {isExpired && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: '#fef2f2', border: '1px solid #fecaca',
            }}
          >
            <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#b91c1c' }}>
              Your OTP has expired. Click <strong>Resend OTP</strong> to get a new one.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error / Success message ── */}
      <AnimatePresence mode="wait">
        {(error || resendMsg) && !isExpired && (
          <motion.div
            key={error ? 'error' : 'resend'}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: error ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${error ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            {error
              ? <AlertCircle  size={14} color="#ef4444" style={{ flexShrink: 0 }} />
              : <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0 }} />
            }
            <span style={{ fontSize: 13, fontWeight: 500, color: error ? '#b91c1c' : '#15803d' }}>
              {error || resendMsg}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Verify Button ── */}
      <button
        onClick={handleSubmit}
        disabled={!isOtpComplete || loading || isExpired}
        style={{
          width: '100%', padding: 14, borderRadius: 8, border: 'none',
          background: (!isOtpComplete || loading || isExpired)
            ? '#e2e8f0'
            : 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)',
          color: (!isOtpComplete || loading || isExpired) ? '#94a3b8' : '#ffffff',
          fontSize: 15, fontWeight: 700,
          cursor: (!isOtpComplete || loading || isExpired) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
          boxShadow: (!isOtpComplete || loading || isExpired)
            ? 'none' : '0 4px 12px rgba(79,70,229,0.3)',
          marginBottom: 14,
        }}
      >
        {loading
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</>
          : <><ShieldCheck size={16} /> Verify &amp; Create Account</>
        }
      </button>

      {/* ── Resend Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        {canResend ? (
          <button
            onClick={handleResend}
            disabled={resending}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: '#4f46e5', fontWeight: 700, fontSize: 13,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {resending
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
              : <><RefreshCw size={13} /> Resend OTP</>
            }
          </button>
        ) : (
          <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>
            Resend OTP in{' '}
            <strong style={{ color: '#64748b' }}>{pad(0)}:{pad(resendSeconds)}</strong>
          </span>
        )}
      </div>

      {/* ── Back link ── */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onBack}
          disabled={loading}
          style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: 13,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0,
          }}
        >
          <ArrowLeft size={13} /> Back to Registration
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default OtpVerificationStep;
