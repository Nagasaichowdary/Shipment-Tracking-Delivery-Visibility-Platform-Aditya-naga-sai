/**
 * OtpPreviewModal.jsx
 * ─────────────────────────────────────────────────────────────
 * Compact, enterprise-grade OTP Preview Popup.
 * Replaces the large email preview with a focused, minimal alert style.
 *
 * Props:
 *   isOpen      {boolean}
 *   email       {string}   raw registered email
 *   maskedEmail {string}   display version: a***@gmail.com
 *   otp         {string}   6-digit OTP
 *   expiresAt   {string}   ISO date string from OTP session
 *   onClose     {function} called when user dismisses modal
 *   onResend    {function} (kept for compatibility, not displayed in compact mode)
 *   onContinue  {function} called when user clicks "Continue"
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Copy, ArrowRight, CheckCircle2, Info } from 'lucide-react';

const OtpPreviewModal = ({
  isOpen,
  otp,
  onClose,
  onContinue,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* ── Modal panel ── */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1001,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px',
              pointerEvents: 'none',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                width: '100%', maxWidth: 420, // Compact width
                borderRadius: 16,
                background: '#ffffff',
                boxShadow: '0 20px 60px rgba(15,23,42,0.15), 0 0 0 1px rgba(99,102,241,0.08)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: '#eef2ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <ShieldCheck size={24} color="#4f46e5" />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  OTP Generated Successfully
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                  Use this code to verify your identity.
                </p>
              </div>

              {/* Development Mode Notice */}
              <div style={{ padding: '0 24px 16px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a',
                  justifyContent: 'center'
                }}>
                  <Info size={14} color="#b45309" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>
                    Development Mode Preview
                  </span>
                </div>
              </div>

              {/* OTP Display Box */}
              <div style={{ padding: '0 24px 24px' }}>
                <div style={{
                  padding: '20px', borderRadius: 12, textAlign: 'center',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Your OTP
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800, fontFamily: 'monospace', color: '#0f172a', letterSpacing: '0.15em' }}>
                    {otp}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#10b981', fontWeight: 500 }}>
                    Valid for 5 minutes
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{
                padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
                display: 'flex', gap: 12,
              }}>
                <motion.button
                  whileHover={{ backgroundColor: '#e2e8f0' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopy}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', transition: 'background-color 0.2s',
                  }}
                >
                  {copied ? <><CheckCircle2 size={16} color="#10b981" /> Copied</> : <><Copy size={16} /> Copy OTP</>}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onContinue}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(79,70,229,0.2)',
                  }}
                >
                  Continue <ArrowRight size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OtpPreviewModal;
