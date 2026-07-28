/**
 * ForgotPassword.jsx  —  /forgot-password
 * Step 1: User enters their registered email to receive an OTP via email.
 *
 * Flow:
 *   User enters email → Send OTP → Backend emails OTP → Navigate to /verify-otp
 *
 * Root causes fixed:
 *  1. handleSubmit was not async and sendForgotPasswordOTP was not awaited
 *     (result was a Promise, not data — nothing ever happened after click)
 *  2. OtpPreviewModal expected result.otp which the backend never returns
 *     (backend emails the OTP, so the modal is not the right UX here)
 *  3. Navigate to /verify-otp directly after success, passing email + expiresAt
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Mail, ArrowLeft, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendForgotPasswordOTP } from '../services/authService';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false); // brief success banner before nav

  // ── Send OTP ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    const result = await sendForgotPasswordOTP(email); // ← await added
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to send OTP. Please try again.');
      return;
    }

    // Show brief success state then navigate
    setSent(true);
    setTimeout(() => {
      navigate('/verify-otp', {
        state: {
          email:       email.trim().toLowerCase(),
          maskedEmail: result.maskedEmail || email.trim().toLowerCase(),
          // Pass epoch-ms expiry so VerifyOTP can use timestamp-based countdown
          expiresAt:   result.expiresAt
            ? new Date(result.expiresAt).getTime()
            : Date.now() + 5 * 60 * 1000,
        },
      });
    }, 900);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f1f5f9', padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 440, background: '#ffffff',
          borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#6366f1,#818cf8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            <Package size={22} color="#ffffff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Shipment Tracker Pro</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Enterprise Logistics Platform</p>
          </div>
        </div>

        {/* Page icon */}
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Mail size={26} color="#6366f1" />
        </div>

        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Forgot Password?</h2>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          No worries. Enter your registered email and we'll send a 6-digit OTP directly to your inbox.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setSent(false); }}
                style={{ paddingLeft: 36 }}
                disabled={loading || sent}
                autoFocus
              />
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}
              >
                <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success banner */}
          <AnimatePresence>
            {sent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}
              >
                <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>
                  OTP has been sent to your email. Redirecting…
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || sent}
            style={{ marginTop: 4, justifyContent: 'center', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {loading ? (
              <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Sending OTP…</>
            ) : sent ? (
              <><CheckCircle2 size={16} /> OTP Sent!</>
            ) : (
              <><Send size={16} /> Send OTP</>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <Link
          to="/login"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ForgotPassword;
