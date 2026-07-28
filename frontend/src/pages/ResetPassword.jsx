/**
 * ResetPassword.jsx  —  /reset-password
 * Step 3 of password recovery: set a new password after OTP verification.
 *
 * Receives via router state: { email, otp }
 * On success: shows animated success state → auto-redirects to /login after 3s
 *
 * Features:
 *  - Live password strength bar with 5-rule checklist
 *  - Confirm password match indicator
 *  - Show/hide toggles for both fields
 *  - Animated success screen with 3-second countdown progress bar
 *  - Framer Motion page entrance + error animation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, KeyRound, Eye, EyeOff,
  CheckCircle2, ArrowLeft, AlertCircle, Lock,
} from 'lucide-react';
import { resetPassword }                    from '../services/authService';
import { analysePassword, isPasswordStrong } from '../utils/passwordUtils';

const REDIRECT_DELAY = 3000; // ms

const ResetPassword = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { email, otp } = location.state || {};

  const [form,     setForm]     = useState({ password: '', confirm: '' });
  const [showPw,   setShowPw]   = useState(false);
  const [showCf,   setShowCf]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [countdown, setCountdown] = useState(3);
  const analysis = analysePassword(form.password);

  // Guard
  useEffect(() => {
    if (!email || !otp) navigate('/forgot-password', { replace: true });
  }, [email, otp, navigate]);

  // Countdown after success
  const countdownRef = useRef(null);
  useEffect(() => {
    if (!success) return;
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          navigate('/login', { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [success, navigate]);

  const handleChange = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {   // ← async added
    e.preventDefault();
    setError('');

    if (!isPasswordStrong(form.password)) {
      setError('Password must satisfy all requirements listed below.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email, otp, form.password);  // ← await added
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess(true);
  };

  const passwordsMatch = form.confirm && form.password === form.confirm;
  const passwordsMismatch = form.confirm && form.password !== form.confirm;
  const isValid = form.password && form.confirm && isPasswordStrong(form.password) && passwordsMatch;

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
          overflow: 'hidden',
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

        {/* ── Success state ── */}
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{ textAlign: 'center', padding: '16px 0 8px' }}
            >
              {/* Animated checkmark */}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
                style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(34,197,94,0.25)' }}
              >
                <CheckCircle2 size={44} color="#16a34a" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#0f172a' }}
              >
                Password Reset Successfully!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ margin: '0 0 8px', fontSize: 14, color: '#64748b', lineHeight: 1.7 }}
              >
                Your password has been updated.<br />
                You can now sign in with your new credentials.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}
              >
                Redirecting to login in <strong style={{ color: '#6366f1' }}>{countdown}</strong> second{countdown !== 1 ? 's' : ''}…
              </motion.p>

              {/* Progress bar countdown */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ height: 5, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden', marginBottom: 24 }}
              >
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: REDIRECT_DELAY / 1000, ease: 'linear' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #22c55e)', borderRadius: 99 }}
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                onClick={() => navigate('/login', { replace: true })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                }}
              >
                Go to Login Now
              </motion.button>
            </motion.div>

          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* ── Page icon ── */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 280 }}
                style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 4px 16px rgba(99,102,241,0.18)' }}
              >
                <KeyRound size={30} color="#6366f1" />
              </motion.div>

              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Reset Password</h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Choose a strong new password for <strong style={{ color: '#374151' }}>{email}</strong>.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* ── New Password ── */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={handleChange('password')}
                      style={{ paddingLeft: 36, paddingRight: 42 }}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  <AnimatePresence>
                    {form.password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginTop: 10, overflow: 'hidden' }}
                      >
                        {/* Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strength</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: analysis.levelColor, textTransform: 'capitalize' }}>
                            {analysis.level}
                          </span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden', marginBottom: 10 }}>
                          <motion.div
                            animate={{ width: `${analysis.score}%`, background: analysis.levelColor }}
                            transition={{ duration: 0.3 }}
                            style={{ height: '100%', borderRadius: 99 }}
                          />
                        </div>

                        {/* Rules checklist */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {analysis.rules.map(r => (
                            <motion.div
                              key={r.id}
                              animate={{ opacity: 1 }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}
                            >
                              <motion.span
                                animate={{
                                  background: r.passed ? '#dcfce7' : '#f1f5f9',
                                  scale: r.passed ? [1, 1.2, 1] : 1,
                                }}
                                transition={{ duration: 0.2 }}
                                style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              >
                                {r.passed
                                  ? <CheckCircle2 size={11} color="#16a34a" />
                                  : <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
                                }
                              </motion.span>
                              <span style={{ color: r.passed ? '#374151' : '#94a3b8', transition: 'color 0.2s' }}>{r.label}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Confirm Password ── */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      className="input"
                      type={showCf ? 'text' : 'password'}
                      placeholder="Re-enter your new password"
                      value={form.confirm}
                      onChange={handleChange('confirm')}
                      style={{
                        paddingLeft: 36, paddingRight: 42,
                        borderColor: passwordsMismatch ? '#fca5a5' : passwordsMatch ? '#86efac' : undefined,
                        boxShadow: passwordsMatch ? '0 0 0 3px rgba(34,197,94,0.12)' : passwordsMismatch ? '0 0 0 3px rgba(239,68,68,0.12)' : undefined,
                      }}
                    />
                    <button type="button" onClick={() => setShowCf(p => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {form.confirm && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ margin: '6px 0 0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
                          color: passwordsMatch ? '#16a34a' : '#ef4444',
                          fontWeight: 500,
                        }}
                      >
                        {passwordsMatch
                          ? <><CheckCircle2 size={13} /> Passwords match</>
                          : <><AlertCircle size={13} /> Passwords do not match</>
                        }
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Error ── */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}
                    >
                      <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Submit ── */}
                <motion.button
                  type="submit"
                  disabled={loading || !isValid}
                  whileHover={(!loading && isValid) ? { scale: 1.02, boxShadow: '0 8px 24px rgba(99,102,241,0.4)' } : {}}
                  whileTap={(!loading && isValid) ? { scale: 0.98 } : {}}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '13px 20px', borderRadius: 12, border: 'none',
                    background: (loading || !isValid) ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                    color: (loading || !isValid) ? '#94a3b8' : '#fff',
                    fontSize: 15, fontWeight: 700,
                    cursor: (loading || !isValid) ? 'not-allowed' : 'pointer',
                    boxShadow: (loading || !isValid) ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
                    transition: 'all 0.2s ease',
                    marginTop: 4,
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Updating Password…
                    </>
                  ) : (
                    <><KeyRound size={18} /> Reset Password</>
                  )}
                </motion.button>
              </form>

              <Link to="/login"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ResetPassword;
