/**
 * CountdownTimer.jsx
 * ─────────────────────────────────────────────────────────────
 * Displays a live MM:SS countdown until OTP expiry.
 * Calls onExpire() when the timer reaches zero.
 *
 * Props:
 *   expiresAt  {string}    ISO date string (from OTP session)
 *   onExpire   {function}  called once when timer hits 0:00
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

const CountdownTimer = ({ expiresAt, onExpire }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const ms = new Date(expiresAt) - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  });
  const expiredFired = useRef(false);

  useEffect(() => {
    // Re-sync when expiresAt changes (after Resend OTP)
    const ms = new Date(expiresAt) - Date.now();
    setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
    expiredFired.current = false;
  }, [expiresAt]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!expiredFired.current) {
        expiredFired.current = true;
        onExpire?.();
      }
      return;
    }

    const id = setInterval(() => {
      setSecondsLeft(s => {
        const next = s - 1;
        if (next <= 0 && !expiredFired.current) {
          expiredFired.current = true;
          onExpire?.();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(id);
  }, [expiresAt, onExpire]); // eslint-disable-line react-hooks/exhaustive-deps

  const isExpired = secondsLeft === 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  // Progress 0→1 (full → empty)
  const totalSecs = 5 * 60;
  const progress  = secondsLeft / totalSecs;

  // Colour interpolates: green → amber → red
  const barColor = progress > 0.5 ? '#22c55e' : progress > 0.2 ? '#f59e0b' : '#ef4444';

  if (isExpired) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '14px 20px', borderRadius: 12,
        background: 'rgba(254,242,242,0.8)', border: '1px solid #fecaca',
      }}>
        <Clock size={18} color="#ef4444" />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ef4444' }}>OTP Expired</p>
        <p style={{ margin: 0, fontSize: 11, color: '#ef4444', opacity: 0.8 }}>Please generate a new OTP.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '14px 20px', borderRadius: 12,
      background: 'rgba(248,250,252,0.8)', border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={14} color="#64748b" />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          OTP expires in
        </span>
      </div>

      {/* Large countdown display */}
      <div style={{
        fontFamily: 'monospace', fontSize: 32, fontWeight: 800,
        color: barColor, letterSpacing: '0.05em', lineHeight: 1,
        transition: 'color 0.3s ease',
      }}>
        {mm}:{ss}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 4, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${progress * 100}%`,
          background: barColor,
          transition: 'width 1s linear, background 0.3s ease',
        }} />
      </div>
    </div>
  );
};

export default CountdownTimer;
