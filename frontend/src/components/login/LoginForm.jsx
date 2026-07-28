/**
 * LoginForm.jsx
 * ─────────────────────────────────────────────────────────────
 * Clean, flat, minimal enterprise form layout.
 * Enhanced with professional polish: ripple effects, smooth checkbox,
 * robust focus states, micro-interactions, live validation UI,
 * Caps Lock detection, error shake physics, and success states.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ChevronDown, AlertCircle, Eye, EyeOff, CheckCircle2, Lock, Key, Server, AlertTriangle, Info } from 'lucide-react';
import { analysePassword } from '../../utils/passwordUtils';

const LoginForm = ({
  form,
  onChange,
  onSubmit,
  loading,
  success,
  error,
  fromRegister,
  roleOptions,
}) => {
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  // Validation States
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [emailValid, setEmailValid] = useState(null);

  // Animation Controls
  const buttonControls = useAnimation();
  const errorShakeControls = useAnimation();

  // Password analysis
  const pwAnalysis = analysePassword(form.password);
  const isTypingPassword = focusedInput === 'password' && form.password.length > 0;

  useEffect(() => {
    if (error) {
      errorShakeControls.start({
        x: [-5, 5, -5, 5, 0],
        transition: { duration: 0.4 }
      });
    }
  }, [error, errorShakeControls]);

  const handleRipple = async (e) => {
    if (!loading && !success) buttonControls.start({ scale: [1, 0.98, 1], transition: { duration: 0.3 } });
  };

  const handleEmailChange = (e) => {
    onChange('email')(e);
    const val = e.target.value;
    if (val.length === 0) {
      setEmailValid(null);
    } else {
      const isFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      setEmailValid(isFormatValid);
    }
  };

  const checkCapsLock = (e) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const getInputStyle = (name) => {
    let borderColor = '#cbd5e1';
    let ringColor = 'rgba(99,102,241,0.1)';
    
    if (focusedInput === name) {
      borderColor = '#6366f1';
    }

    if (name === 'email' && emailValid === false && form.email.length > 0) {
      borderColor = '#ef4444';
      ringColor = 'rgba(239,68,68,0.1)';
    } else if (name === 'email' && emailValid === true) {
      borderColor = '#10b981';
    }

    return {
      width: '100%', padding: '14px 16px',
      fontSize: 14, color: '#0f172a',
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      background: '#ffffff', outline: 'none', transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      boxShadow: focusedInput === name ? `0 0 0 4px ${ringColor}` : '0 1px 2px rgba(0,0,0,0.05)',
    };
  };

  // Trust Badges Data
  const trustBadges = [
    { icon: Lock, label: 'SSL Secured', tooltip: '256-bit encrypted connection' },
    { icon: Key, label: 'Role-Based Access', tooltip: 'Granular permission controls' },
    { icon: Server, label: 'Enterprise Security', tooltip: 'Continuous threat monitoring' }
  ];

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Enterprise Sign In Form">
      
      <AnimatePresence>
        {fromRegister && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 24, padding: '14px 16px',
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
            }}
          >
            <CheckCircle2 size={18} color="#16a34a" />
            <p style={{ margin: 0, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
              Account created successfully. Please sign in below.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* ── Role Selector ── */}
        <div>
          <label htmlFor="roleSelect" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
            Sign in as
          </label>
          <div style={{ position: 'relative' }}>
            <select
              id="roleSelect"
              aria-label="Select your role"
              value={form.role}
              onChange={onChange('role')}
              onFocus={() => setFocusedInput('role')}
              onBlur={() => setFocusedInput(null)}
              style={{
                ...getInputStyle('role'),
                appearance: 'none', cursor: 'pointer', fontWeight: 500
              }}
            >
              {roleOptions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* ── Email ── */}
        <div>
          <label htmlFor="emailInput" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
            {form.role === 'BUSINESS_CLIENT' ? 'Business Email' : 'Email address'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="emailInput"
              type="email"
              aria-label="Email address"
              value={form.email}
              onChange={handleEmailChange}
              placeholder={form.role === 'BUSINESS_CLIENT' ? "company@example.com" : "name@company.com"}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              style={{ ...getInputStyle('email'), paddingRight: 40 }}
            />
            {emailValid === true && (
              <CheckCircle2 size={18} color="#10b981" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} />
            )}
          </div>
        </div>

        {/* ── Password ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label htmlFor="passwordInput" style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#3730a3'}
              onMouseLeave={e => e.target.style.color = '#4f46e5'}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="passwordInput"
              type={showPw ? 'text' : 'password'}
              aria-label="Password"
              value={form.password}
              onChange={onChange('password')}
              onKeyDown={checkCapsLock}
              onKeyUp={checkCapsLock}
              placeholder="••••••••"
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              style={{ ...getInputStyle('password'), paddingRight: 48 }}
            />
            <motion.button
              type="button"
              aria-label={showPw ? "Hide password" : "Show password"}
              initial={{ y: '-50%' }}
              whileHover={{ scale: 1.1, color: '#6366f1', y: '-50%' }}
              whileTap={{ scale: 0.9, y: '-50%' }}
              onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, margin: 0, lineHeight: 0 }}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </motion.button>
          </div>
          
          <AnimatePresence>
            {isTypingPassword && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 6 }}>
                <div style={{ height: 3, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${Math.max(pwAnalysis.score, 5)}%`, background: pwAnalysis.levelColor }} transition={{ duration: 0.3 }} style={{ height: '100%', borderRadius: 2 }} />
                </div>
              </motion.div>
            )}
            {capsLockOn && focusedInput === 'password' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <AlertTriangle size={14} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>Caps Lock is on</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Remember Me (Animated SVG Checkbox) ── */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div
              role="checkbox"
              aria-checked={rememberMe}
              tabIndex={0}
              onClick={() => setRememberMe(!rememberMe)}
              onKeyDown={(e) => e.key === ' ' && setRememberMe(!rememberMe)}
              style={{
                width: 18, height: 18, borderRadius: 6,
                border: `2px solid ${rememberMe ? '#4f46e5' : '#cbd5e1'}`,
                background: rememberMe ? '#4f46e5' : '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <AnimatePresence>
                {rememberMe && (
                  <motion.svg
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    width="12" height="12" viewBox="0 0 10 10"
                  >
                    <motion.polyline
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}
                      points="1.5,5 4,7.5 8.5,2.5" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </div>
            <span style={{ fontSize: 14, color: '#475569', fontWeight: 500, userSelect: 'none' }}>Keep me signed in</span>
          </label>
        </div>

        {/* ── Error (Shake Animation) ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              animate={errorShakeControls}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}
            >
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#b91c1c', fontWeight: 600 }}>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Submit Button ── */}
        <motion.button
          type="submit"
          aria-live="polite"
          disabled={loading || success}
          animate={buttonControls}
          onClick={handleRipple}
          whileHover={(!loading && !success) ? { scale: 1.015, boxShadow: '0 8px 24px rgba(79,70,229,0.4)' } : {}}
          whileTap={(!loading && !success) ? { scale: 0.985 } : {}}
          style={{
            width: '100%', padding: '14px 16px', marginTop: 8,
            background: success ? '#10b981' : loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 10,
            cursor: (loading || success) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: (loading || success) ? 'none' : '0 4px 16px rgba(79,70,229,0.3)',
            transition: 'background 0.3s, box-shadow 0.3s',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {success ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} /> Authentication Successful
            </motion.div>
          ) : loading ? (
            <>
              <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              Signing In...
            </>
          ) : 'Sign In'}
        </motion.button>
        
        {/* ── Register Link ── */}
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}>
              Register here
            </Link>
          </p>
        </div>

        {/* ── 3 Premium Trust Badges (Hover Animation with Tooltip) ── */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
          {trustBadges.map((badge, idx) => (
            <motion.div 
              key={idx}
              title={badge.tooltip} // Native tooltip for simplicity and bulletproof a11y
              whileHover={{ y: -2, color: '#6366f1' }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', cursor: 'help', transition: 'color 0.2s' }}
            >
              <badge.icon size={14} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{badge.label}</span>
            </motion.div>
          ))}
        </div>

      </div>
    </form>
  );
};

export default LoginForm;
