/**
 * DispatcherDashboard.jsx
 * Dashboard for DISPATCHER role.
 * Shows dispatch-relevant KPIs and active shipments.
 * Features Framer Motion entrance animations and sparkline analytics.
 */

import React from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_COLOR } from '../../auth/roleConfig';
import { shipments, vehicles } from '../../data/dummyData';
import { motion } from 'framer-motion';
import { Package, Truck, Clock, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ── Status Badge ────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    'In Transit': 'badge-transit', 'Delivered': 'badge-delivered',
    'Delayed': 'badge-delayed', 'Pending': 'badge-pending', 'Customs': 'badge-customs',
  };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block' }} className={map[status] || 'badge-transit'}>
      {status}
    </span>
  );
};

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
const StatCard = ({ label, value, icon: Icon, iconColor, iconBg, sub, trendData, trendUp }) => (
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
          {trendUp ? '+8%' : '-2%'}
        </div>
      </div>
    )}
  </motion.div>
);

const DispatcherDashboard = () => {
  const { user } = useAuth();
  const color = ROLE_COLOR.DISPATCHER;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const inTransit = shipments.filter(s => s.status === 'In Transit').length;
  const pending   = shipments.filter(s => s.status === 'Pending').length;
  const delayed   = shipments.filter(s => s.status === 'Delayed').length;
  const available = vehicles.filter(v => v.status === 'Available').length;

  const stats = [
    { label: 'Active Shipments',   value: inTransit,  icon: Package,       iconColor: '#0ea5e9', iconBg: '#e0f2fe', sub: 'In Transit',         trendData: [40, 42, 38, 45, 50, 48, inTransit], trendUp: true },
    { label: 'Pending Dispatch',   value: pending,    icon: Clock,         iconColor: '#f59e0b', iconBg: '#fffbeb', sub: 'Awaiting vehicles',  trendData: [10, 12, 15, 11, 8, 9, pending], trendUp: false },
    { label: 'Delayed Shipments',  value: delayed,    icon: Package,       iconColor: '#ef4444', iconBg: '#fef2f2', sub: 'Needs re-routing',   trendData: [1, 2, 0, 3, 2, 1, delayed], trendUp: false },
    { label: 'Available Vehicles', value: available,  icon: Truck,         iconColor: '#10b981', iconBg: '#ecfdf5', sub: 'Ready for dispatch', trendData: [8, 7, 9, 10, 12, 10, available], trendUp: true },
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
            Dispatcher
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

      {/* Pending shipments to dispatch */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="card" style={{ padding: 0, overflow: 'hidden' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="section-title" style={{ fontSize: 15 }}>Pending & Delayed Shipments</p>
            <p className="section-sub">Requires your attention</p>
          </div>
          <Link to="/shipments" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {shipments.filter(s => s.status === 'Pending' || s.status === 'Delayed').map(sh => (
                <tr key={sh.id}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#10b981', fontSize: 13 }}>{sh.id}</span></td>
                  <td style={{ fontWeight: 500, color: '#0f172a' }}>{sh.customer}</td>
                  <td style={{ color: '#64748b' }}>{sh.origin} → {sh.dest}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8fafc', padding: '2px 7px', borderRadius: 4, border: '1px solid #e2e8f0' }}>{sh.vehicle}</span></td>
                  <td><StatusBadge status={sh.status} /></td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{sh.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default DispatcherDashboard;
