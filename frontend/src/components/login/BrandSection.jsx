/**
 * BrandSection.jsx
 * ─────────────────────────────────────────────────────────────
 * The left side of the Login page.
 * Enhanced with enterprise SaaS typography, smooth Framer Motion animations,
 * high-fidelity stats cards with glowing trend indicators, and a live "Last Updated" timestamp.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Map, Box, Activity } from 'lucide-react';
import BackgroundAnimation from './BackgroundAnimation';

const stats = [
  { label: 'Active Shipments', value: '24,592', icon: Truck,   trend: '+12%', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
  { label: 'Fleet Vehicles',   value: '1,204',  icon: Map,     trend: '+5%',  color: '#a78bfa', bg: 'rgba(139,92,246,0.15)' },
  { label: 'On-Time Delivery', value: '98.4%',  icon: Activity,trend: '+1%',  color: '#34d399', bg: 'rgba(16,185,129,0.15)' },
  { label: 'Countries Served', value: '156',    icon: Box,     trend: '+2%',  color: '#f472b6', bg: 'rgba(236,72,153,0.15)' },
];

const BrandSection = () => {
  const [timeAgo, setTimeAgo] = useState('Just Now');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeAgo(prev => prev === 'Just Now' ? '1 min ago' : prev);
    }, 60000); // 1 minute
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* ── Background Layer ── */}
      <BackgroundAnimation />

      {/* ── Content Layer ── */}
      <div 
        style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          height: '100%', padding: '0 12%',
          background: 'linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 50%, transparent 100%)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ marginBottom: 48 }}
        >
          <h1 style={{ margin: '0 0 16px', fontSize: 36, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Smarter Logistics.<br />
            <span style={{ color: '#818cf8' }}>Faster Deliveries.</span>
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: '#f8fafc', fontWeight: 500, lineHeight: 1.5, maxWidth: 500 }}>
            Powering modern supply chains through real-time shipment tracking, intelligent fleet management, predictive analytics, and enterprise-grade security.
          </p>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (i * 0.1), duration: 0.6 }}
              whileHover={{ 
                scale: 1.02, 
                y: -5, 
                backgroundColor: 'rgba(30,41,59,0.95)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
                borderColor: 'rgba(255,255,255,0.15)',
                transition: { delay: 0, duration: 0.15, ease: 'easeOut' }
              }}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 16,
                padding: 20,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex', flexDirection: 'column', gap: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <stat.icon size={18} color={stat.color} />
                </div>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {stat.value}
                </span>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + (i * 0.1), type: 'spring' }}
                  style={{ display: 'flex', alignItems: 'center', gap: 2, color: stat.color, background: stat.bg, padding: '4px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}
                >
                  <span style={{ fontSize: 9 }}>▲</span> {stat.trend}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default BrandSection;
