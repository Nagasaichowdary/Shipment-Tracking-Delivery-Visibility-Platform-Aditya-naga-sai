/**
 * CustomerDashboard.jsx
 * Dashboard for CUSTOMER role.
 * Shows the customer's shipments and a quick track widget.
 * Features Framer Motion entrance animations and sparkline analytics.
 */

import React, { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_COLOR } from '../../auth/roleConfig';
import { shipments } from '../../data/dummyData';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, Clock, Search, TrendingUp, TrendingDown } from 'lucide-react';

// Demo: show shipments belonging to "Meesho Logistics" = customer user
const CUSTOMER_SHIPMENTS = shipments.filter(s => s.customer === 'Meesho Logistics');

/* ── Simple SVG Sparkline ─────────────────────────────────────── */
const Sparkline = ({ data, color }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ── Stat Card (Animated with Sparkline) ──────────────────────── */
const StatCard = ({ label, value, icon: Icon, iconColor, iconBg, sub, trendData, trendUp, trendVal }) => (
  <motion.div 
    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
    className="card" 
    style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{label}</p>
        <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1, fontFamily: 'monospace' }}>{value}</p>
        {sub && <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{sub}</p>}
      </div>
    </div>
    
    {/* Analytics Area */}
    {trendData && (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 6, height: '100%' }}>
        <Sparkline data={trendData} color={trendUp ? '#10b981' : '#ef4444'} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: trendUp ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 700 }}>
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trendVal}
        </div>
      </div>
    )}
  </motion.div>
);

const CustomerDashboard = () => {
  const { user } = useAuth();
  const color = ROLE_COLOR.CUSTOMER;
  const [trackId, setTrackId] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const inTransitCount = CUSTOMER_SHIPMENTS.filter(s => s.status === 'In Transit').length;
  const deliveredCount = CUSTOMER_SHIPMENTS.filter(s => s.status === 'Delivered').length;

  const stats = [
    { label: 'My Shipments',     value: CUSTOMER_SHIPMENTS.length, icon: Package,      iconColor: '#0ea5e9', iconBg: '#e0f2fe', sub: 'All time',         trendData: [15, 18, 17, 20, 22, 23, CUSTOMER_SHIPMENTS.length], trendUp: true, trendVal: '+4' },
    { label: 'In Transit',       value: inTransitCount,            icon: Clock,        iconColor: '#f59e0b', iconBg: '#fffbeb', sub: 'Currently moving', trendData: [2, 4, 3, 5, 2, 3, inTransitCount], trendUp: false, trendVal: '-1' },
    { label: 'Delivered',        value: deliveredCount,            icon: CheckCircle2, iconColor: '#10b981', iconBg: '#ecfdf5', sub: 'Completed',        trendData: [10, 12, 14, 15, 18, 20, deliveredCount], trendUp: true, trendVal: '+5' },
  ];

  const handleTrack = () => {
    setTrackError('');
    setTrackResult(null);
    const found = shipments.find(s => s.id.toLowerCase() === trackId.trim().toLowerCase());
    if (!found) {
      setTrackError(`No shipment found for "${trackId}". Try SH-9817.`);
    } else {
      setTrackResult(found);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <AdminLayout>
      {/* Welcome */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ padding: '18px 24px', borderRadius: 12, background: `linear-gradient(135deg, ${color.bg}, #fff)`, border: `1px solid ${color.badge}30`, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 13, color: color.text }}>{greeting} 👋</p>
          <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Welcome back, {user?.name}</h2>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: color.badge, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Customer
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}
      >
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}
      >
        {/* My Shipments */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <p className="section-title" style={{ fontSize: 15 }}>My Shipments</p>
            <p className="section-sub">Your recent orders</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Route</th><th>Weight</th><th>Status</th><th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMER_SHIPMENTS.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No shipments found</td></tr>
                  : CUSTOMER_SHIPMENTS.map(sh => (
                    <tr key={sh.id}>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0ea5e9', fontSize: 13 }}>{sh.id}</span></td>
                      <td style={{ color: '#64748b' }}>{sh.origin} → {sh.dest}</td>
                      <td style={{ color: '#64748b' }}>{sh.weight}</td>
                      <td><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block' }} className="badge-transit">{sh.status}</span></td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{sh.eta}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Track */}
        <div className="card" style={{ height: 'fit-content' }}>
          <p className="section-title" style={{ fontSize: 15, marginBottom: 4 }}>Quick Track</p>
          <p className="section-sub" style={{ marginBottom: 12 }}>Enter a shipment ID to check status</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="e.g. SH-9817"
              value={trackId}
              onChange={e => setTrackId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <button className="btn-primary" onClick={handleTrack}>
              <Search size={14} /> Track
            </button>
          </div>
          {trackError && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: 6, border: '1px solid #fecaca' }}>
              {trackError}
            </p>
          )}
          {trackResult && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                {[['Tracking ID', trackResult.id], ['Customer', trackResult.customer], ['Route', `${trackResult.origin} → ${trackResult.dest}`], ['Vehicle', trackResult.vehicle], ['Weight', trackResult.weight], ['Status', trackResult.status], ['ETA', trackResult.eta]].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{k}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default CustomerDashboard;
