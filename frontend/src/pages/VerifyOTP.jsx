/**
 * VerifyOTP.jsx  —  /verify-otp
 * Step 2 of password recovery: User enters the 6-digit OTP.
 *
 * Receives via router state: { email, maskedEmail }
 * Passes to /reset-password: { email, otp }
 *
 * Features:
 *  - 6 individual OTP input boxes with auto-advance, backspace, paste
 *  - Live countdown timer (colour-shifts green → amber → red)
 *  - Resend OTP with max 3 attempts (available anytime, not locked to expired)
 *  - Animated error messages via Framer Motion
 *  - Disabled "Verify OTP" when any box is empty or OTP is expired
 *  - Auto-navigates to /reset-password on successful verification
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ShieldCheck, ArrowLeft, RefreshCw,
  Clock, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { verifyForgotPasswordOTP, sendForgotPasswordOTP } from '../services/authService';

const MAX_RESENDS    = 3;
const OTP_TOTAL_SECS = 5 * 60; // 5 minutes

// ── Helpers ──────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

const VerifyOTP = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { email, maskedEmail, expiresAt: expiresAtMs } = location.state || {};

  // Compute initial seconds from server timestamp if provided, else 5 min
  const getRemaining = () =>
    expiresAtMs
      ? Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
      : OTP_TOTAL_SECS;

  // Guard — no email means user navigated here directly
  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true });
  }, [email, navigate]);

  const [otp,         setOtp]         = useState(['', '', '', '', '', '']);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  // Timestamp-based seconds: recalculated from real clock each tick
  const [secondsLeft, setSecondsLeft] = useState(getRemaining);
  const [resendCount, setResendCount] = useState(0);
  const [resendMsg,   setResendMsg]   = useState('');
  // Track expiresAt for resend updates
  const [currentExpiresAt, setCurrentExpiresAt] = useState(expiresAtMs || Date.now() + OTP_TOTAL_SECS * 1000);
  const inputRefs = useRef([]);
  const timerRef  = useRef(null);

  // ── Timer — timestamp-based so tab-switch doesn't freeze it ──
  const startTimer = useCallback((newExpiresAt) => {
    clearInterval(timerRef.current);
    const expiry = newExpiresAt || currentExpiresAt;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    tick(); // immediate
    timerRef.current = setInterval(tick, 500);

    // Instant correction when user returns to tab
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [currentExpiresAt]);

  useEffect(() => {
    if (!email) return;
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
    const cleanup = startTimer();
    return () => { clearInterval(timerRef.current); cleanup?.(); };
  }, [email, startTimer]);

  // Also correct on visibility change at top level
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setSecondsLeft(Math.max(0, Math.floor((currentExpiresAt - Date.now()) / 1000)));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [currentExpiresAt]);

  const isExpired  = secondsLeft === 0;
  const progress   = secondsLeft / OTP_TOTAL_SECS; // 1 → 0
  const timerColor = progress > 0.5 ? '#22c55e' : progress > 0.2 ? '#f59e0b' : '#ef4444';

  // ── OTP input ────────────────────────────────────────────────
  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Allow Enter to submit when all filled
    if (e.key === 'Enter' && otp.every(d => d)) handleSubmit(e);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const next = ['', '', '', '', '', ''];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const lastFilled = Math.min(digits.length, 5);
    inputRefs.current[lastFilled]?.focus();
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {   // ← async added
    e?.preventDefault();
    setError('');
    const otpString = otp.join('');

    if (isExpired) {
      setError('OTP has expired. Please request a new one using Resend OTP.');
      return;
    }
    if (otpString.length < 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    const result = await verifyForgotPasswordOTP(email, otpString);  // ← await added
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      return;
    }

    // Success → navigate to reset password
    navigate('/reset-password', { state: { email, otp: otpString } });
  };

  // ── Resend ───────────────────────────────────────────────────
  const handleResend = async () => {   // ← async added
    if (resendCount >= MAX_RESENDS || loading) return;
    setError('');
    setResendMsg('');

    const result = await sendForgotPasswordOTP(email);  // ← await added
    if (!result.success) {
      setError(result.error);
      return;
    }

    // Update timer with new expiry timestamp
    const newExpiry = result.expiresAt
      ? new Date(result.expiresAt).getTime()
      : Date.now() + OTP_TOTAL_SECS * 1000;
    setCurrentExpiresAt(newExpiry);
    startTimer(newExpiry);

    setResendCount(c => c + 1);
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
    setResendMsg(`New OTP sent to your email. ${MAX_RESENDS - resendCount - 1} resend(s) remaining.`);
  };

  const canResend = resendCount < MAX_RESENDS && !loading;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f1f5f9', padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 460, background: '#ffffff',
          borderRadius: 20, border: '1px solid #e2e8f0',
          padding: '40px 36px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        }}
      >
        {/* ── Logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            <Package size={22} color="#ffffff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Shipment Tracker Pro</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Enterprise Logistics Platform</p>
          </div>
        </div>

        {/* ── Page icon ── */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 280 }}
          style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 4px 16px rgba(99,102,241,0.18)' }}
        >
          <ShieldCheck size={30} color="#6366f1" />
        </motion.div>

        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Verify Your Identity</h2>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          Enter the 6-digit verification code sent to your registered email.
        </p>

        {/* ── Email display ── */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, padding: '5px 12px', borderRadius: 20, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
          <CheckCircle2 size={12} color="#6366f1" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#4338ca' }}>{maskedEmail || email}</span>
        </div>

        {/* ── Countdown timer ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color={isExpired ? '#ef4444' : timerColor} />
              <span style={{ fontSize: 12, fontWeight: 600, color: isExpired ? '#ef4444' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isExpired ? 'OTP Expired' : 'Expires in'}
              </span>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: isExpired ? '#ef4444' : timerColor, transition: 'color 0.3s' }}>
              {pad(Math.floor(secondsLeft / 60))}:{pad(secondsLeft % 60)}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${progress * 100}%`,
              background: isExpired ? '#ef4444' : timerColor,
              transition: 'width 1s linear, background 0.3s ease',
            }} />
          </div>
          {isExpired && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ margin: '8px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 500 }}
            >
              Your OTP has expired. Click "Resend OTP" below to generate a new one.
            </motion.p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── OTP boxes ── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>
              Enter 6-Digit OTP
            </label>
            <div style={{ display: 'flex', gap: 10 }} onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <motion.input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  whileFocus={{ scale: 1.05 }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 58,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    borderRadius: 12,
                    border: `2px solid ${
                      error ? '#fca5a5' :
                      digit ? '#6366f1' :
                      '#e2e8f0'
                    }`,
                    outline: 'none',
                    background: error ? '#fef2f2' : digit ? '#eef2ff' : '#f8fafc',
                    color: error ? '#ef4444' : '#0f172a',
                    transition: 'all 0.15s ease',
                    boxShadow: digit && !error ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                    cursor: isExpired ? 'not-allowed' : 'text',
                    opacity: isExpired ? 0.5 : 1,
                  }}
                  disabled={isExpired}
                />
              ))}
            </div>
          </div>

          {/* ── Error ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}
              >
                <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Resend success message ── */}
          <AnimatePresence>
            {resendMsg && !error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}
              >
                <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#15803d' }}>{resendMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Resend link ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Didn't receive it?</span>
            <motion.button
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              whileHover={canResend ? { scale: 1.03 } : {}}
              whileTap={canResend ? { scale: 0.97 } : {}}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none',
                cursor: canResend ? 'pointer' : 'not-allowed',
                color: canResend ? '#6366f1' : '#cbd5e1',
                fontWeight: 700, fontSize: 13, padding: '2px 6px',
                borderRadius: 6,
                transition: 'color 0.2s',
              }}
            >
              <RefreshCw size={13} />
              Resend OTP
              {resendCount > 0 && (
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
                  ({MAX_RESENDS - resendCount} left)
                </span>
              )}
            </motion.button>
          </div>

          {/* ── Verify button ── */}
          <motion.button
            type="submit"
            disabled={loading || otp.some(d => !d) || isExpired}
            whileHover={!loading && otp.every(d => d) && !isExpired ? { scale: 1.02, boxShadow: '0 8px 24px rgba(99,102,241,0.4)' } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 12, border: 'none',
              background: loading || otp.some(d => !d) || isExpired
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #6366f1, #818cf8)',
              color: loading || otp.some(d => !d) || isExpired ? '#94a3b8' : '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: loading || otp.some(d => !d) || isExpired ? 'not-allowed' : 'pointer',
              boxShadow: loading || otp.some(d => !d) || isExpired ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Verifying…
              </>
            ) : (
              <><ShieldCheck size={18} /> Verify OTP</>
            )}
          </motion.button>
        </form>

        {/* ── Back link ── */}
        <Link
          to="/forgot-password"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}
        >
          <ArrowLeft size={14} /> Back to Forgot Password
        </Link>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default VerifyOTP;
