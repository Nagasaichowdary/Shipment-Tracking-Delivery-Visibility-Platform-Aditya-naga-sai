/**
 * DriverDashboard.jsx
 * Dashboard for DRIVER role.
 * Shows the driver's assigned deliveries and route summary.
 * Features Framer Motion entrance animations and sparkline analytics.
 */

import React from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_COLOR } from '../../auth/roleConfig';
import { shipments } from '../../data/dummyData';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, MapPin, Activity, TrendingUp, TrendingDown } from 'lucide-react';

// For demo: driver "Ramesh Kumar" is assigned to SH-9821 via Truck-A14
const DRIVER_VEHICLE = 'Truck-A14';

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

const DriverDashboard = () => {
  const { user } = useAuth();
  const color = ROLE_COLOR.DRIVER;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Assigned delivery (demo: find by vehicle)
  const assigned = shipments.filter(s => s.vehicle === DRIVER_VEHICLE);

  const stats = [
    { label: 'Assigned Today',    value: assigned.length,  icon: Package,       iconColor: '#f97316', iconBg: '#fff7ed', sub: 'Active deliveries', trendData: [2, 3, 2, 4, 3, 4, assigned.length], trendUp: true, trendVal: '+1' },
    { label: 'Completed Today',   value: 2,                icon: CheckCircle2,  iconColor: '#10b981', iconBg: '#ecfdf5', sub: 'OTP confirmed',     trendData: [0, 1, 0, 2, 1, 3, 2], trendUp: true, trendVal: '+2' },
    { label: 'Distance Covered',  value: '542 km',         icon: MapPin,        iconColor: '#6366f1', iconBg: '#eef2ff', sub: 'Today so far',      trendData: [300, 420, 500, 480, 510, 530, 542], trendUp: true, trendVal: '+12km' },
    { label: 'On-Time Rate',      value: '98%',            icon: Activity,      iconColor: '#0ea5e9', iconBg: '#e0f2fe', sub: 'Weekly average',    trendData: [90, 92, 95, 94, 96, 97, 98], trendUp: true, trendVal: '+1%' },
  ];

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
            Driver
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Vehicle: <strong style={{ color: '#374151' }}>{DRIVER_VEHICLE}</strong></p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
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

      {/* Assigned deliveries */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <p className="section-title" style={{ fontSize: 15 }}>My Assigned Deliveries</p>
          <p className="section-sub">Active shipments for {DRIVER_VEHICLE}</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Shipment ID</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Weight</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {assigned.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No active deliveries</td></tr>
                : assigned.map(sh => (
                  <tr key={sh.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f97316', fontSize: 13 }}>{sh.id}</span></td>
                    <td style={{ fontWeight: 500 }}>{sh.customer}</td>
                    <td style={{ color: '#64748b' }}>{sh.origin} → {sh.dest}</td>
                    <td style={{ color: '#64748b' }}>{sh.weight}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block' }} className="badge-transit">
                        {sh.status}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>{sh.eta}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Current route info */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="card" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#9a3412' }}>📍 Current Route</p>
        <p style={{ margin: 0, fontSize: 13, color: '#7c3b1e' }}>
          <strong>Mumbai → Delhi</strong> via NH-44 &nbsp;·&nbsp; Next checkpoint: Jaipur Hub &nbsp;·&nbsp; ~320 km remaining
        </p>
      </motion.div>
    </AdminLayout>
  );
};

export default DriverDashboard;
