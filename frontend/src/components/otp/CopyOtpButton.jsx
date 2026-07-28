/**
 * CopyOtpButton.jsx
 * ─────────────────────────────────────────────────────────────
 * Copies the OTP to the clipboard and shows an animated
 * "✓ OTP Copied Successfully" confirmation.
 *
 * Props:
 *   otp  {string}  The 6-digit OTP to copy
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, CheckCircle2 } from 'lucide-react';

const CopyOtpButton = ({ otp }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (copied) return;
    try {
      await navigator.clipboard.writeText(otp);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = otp;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '11px 20px',
        borderRadius: 10,
        border: `1.5px solid ${copied ? '#16a34a' : '#6366f1'}`,
        background: copied ? 'rgba(220,252,231,0.5)' : 'rgba(99,102,241,0.06)',
        color: copied ? '#15803d' : '#6366f1',
        fontSize: 14,
        fontWeight: 600,
        cursor: copied ? 'default' : 'pointer',
        transition: 'all 0.25s ease',
        outline: 'none',
        backdropFilter: 'blur(4px)',
      }}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <CheckCircle2 size={16} />
            OTP Copied Successfully
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Copy size={16} />
            Copy OTP
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default CopyOtpButton;
