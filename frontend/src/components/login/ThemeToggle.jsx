/**
 * ThemeToggle.jsx
 * ─────────────────────────────────────────────────────────────
 * Dark / Light theme toggle button.
 * Purely UI — stores preference in localStorage.
 * Applies/removes a "dark" class on <html>.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('stp_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('stp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('stp_theme', 'light');
    }
  }, [dark]);

  return (
    <motion.button
      onClick={() => setDark(d => !d)}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        width: 38, height: 38, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: dark ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.06)',
        border: `1px solid ${dark ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.1)'}`,
        cursor: 'pointer',
        outline: 'none',
        transition: 'background 0.2s, border 0.2s',
      }}
    >
      <motion.span
        key={dark ? 'moon' : 'sun'}
        initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 30, opacity: 0, scale: 0.7 }}
        transition={{ duration: 0.2 }}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        {dark
          ? <Sun  size={16} color="#fbbf24" />
          : <Moon size={16} color="#6366f1" />
        }
      </motion.span>
    </motion.button>
  );
};

export default ThemeToggle;
