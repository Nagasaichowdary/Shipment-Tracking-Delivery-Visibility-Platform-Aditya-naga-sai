/**
 * Dashboard.jsx (Admin Dashboard)
 * Shows a personalised welcome banner and role-specific KPI stats.
 * Features Framer Motion entrance animations and sparkline analytics.
 */

import React from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../auth/AuthContext';
import { ROLE_COLOR } from '../auth/roleConfig';
import { dashboardStats, recentActivity, shipments } from '../data/dummyData';
import { motion } from 'framer-motion';
import {
  Package, Truck, Users, Clock,
  AlertTriangle, ArrowRight, TrendingUp, TrendingDown
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ── Status Badge ────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    'In Transit': 'badge-transit',
    'Delivered':  'badge-delivered',
    'Delayed':    'badge-delayed',
    'Pending':    'badge-pending',
    'Customs':    'badge-customs',
  };
  return (
    <span
      style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block' }}
      className={map[status] || 'badge-transit'}
    >
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
      <div
        style={{
          width: 44, height: 44, borderRadius: 10, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <Icon size={20} color={iconColor} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{label}</p>
        <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1, fontFamily: 'monospace' }}>
          {value}
        </p>
        {sub && <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{sub}</p>}
      </div>
    </div>
    
    {/* Analytics Area */}
    {trendData && (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 6, height: '100%' }}>
        <Sparkline data={trendData} color={trendUp ? '#10b981' : '#ef4444'} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: trendUp ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 700 }}>
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trendUp ? '+12%' : '-4%'}
        </div>
      </div>
    )}
  </motion.div>
);

/* ── Welcome Banner ──────────────────────────────────────────── */
const WelcomeBanner = ({ user }) => {
  const color = ROLE_COLOR[user.role] || ROLE_COLOR.ADMIN;
  const hour  = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        padding: '18px 24px',
        borderRadius: 12,
        background: `linear-gradient(135deg, ${color.bg}, #ffffff)`,
        border: `1px solid ${color.badge}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, color: color.text, fontWeight: 500 }}>{greeting} 👋</p>
        <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
          Welcome back, {user.firstName} {user.lastName}
        </h2>
        <span
          style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 999,
            background: color.badge, color: '#fff',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}
        >
          Administrator
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
          Logged in as <strong style={{ color: color.text }}>{user.email}</strong>
        </p>
      </div>
    </motion.div>
  );
};

/* ── Admin Dashboard ─────────────────────────────────────────── */
const Dashboard = () => {
  const { user } = useAuth();
  const s = dashboardStats;

  const stats = [
    { label: 'Total Revenue',     value: '$1.4M',                            icon: Package,       iconColor: '#6366f1', iconBg: '#eef2ff', sub: 'MTD Earnings',       trendData: [4, 5, 4, 6, 7, 8, 9], trendUp: true },
    { label: 'Total Shipments',   value: s.totalShipments.toLocaleString(), icon: Truck,         iconColor: '#0ea5e9', iconBg: '#e0f2fe', sub: 'Volume (Monthly)',  trendData: [12, 10, 14, 15, 13, 16, 18], trendUp: true },
    { label: 'Fleet Utilisation', value: '87%',                              icon: Clock,         iconColor: '#f59e0b', iconBg: '#fffbeb', sub: 'Active Vehicles',    trendData: [80, 82, 81, 85, 84, 87, 87], trendUp: true },
    { label: 'Delayed Shipments', value: s.delayed,                          icon: AlertTriangle, iconColor: '#ef4444', iconBg: '#fef2f2', sub: 'Needs attention',    trendData: [2, 3, 5, 4, 6, 4, 3], trendUp: false },
  ];

  const recent = shipments.slice(0, 5);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <AdminLayout>
      {/* Welcome banner */}
      {user && <WelcomeBanner user={user} />}

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {stats.map((st) => <StatCard key={st.label} {...st} />)}
      </motion.div>

      {/* Two-column row */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}
      >

        {/* Recent Shipments Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div>
              <p className="section-title" style={{ fontSize: 15 }}>Recent Shipments</p>
              <p className="section-sub">Latest 5 shipment records</p>
            </div>
            <Link
              to="/shipments"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}
            >
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
                  <th>Status</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((sh) => (
                  <tr key={sh.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6366f1', fontSize: 13 }}>{sh.id}</span></td>
                    <td style={{ fontWeight: 500, color: '#0f172a' }}>{sh.customer}</td>
                    <td style={{ color: '#64748b' }}>{sh.origin} → {sh.dest}</td>
                    <td><StatusBadge status={sh.status} /></td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>{sh.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Log */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <p className="section-title" style={{ fontSize: 15 }}>Recent Activity</p>
            <p className="section-sub">Latest operational events</p>
          </div>
          <div style={{ padding: '8px 0' }}>
            {recentActivity.map((item, i) => {
              const typeColor = {
                'Delivered':    '#10b981',
                'Delay Alert':  '#ef4444',
                'Checkpoint':   '#6366f1',
                'Dispatched':   '#0ea5e9',
                'Customs Hold': '#8b5cf6',
                'Maintenance':  '#f59e0b',
              }[item.type] || '#64748b';
              return (
                <div
                  key={item.id}
                  style={{ padding: '10px 20px', borderBottom: i < recentActivity.length - 1 ? '1px solid #f8fafc' : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: typeColor, background: `${typeColor}15`, padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.type}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.time}</span>
                  </div>
                  {item.shipmentId !== '—' && (
                    <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>{item.shipmentId}</p>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{item.note}</p>
                </div>
              );
            })}
          </div>
        </div>

      </motion.div>
    </AdminLayout>
  );
};

export default Dashboard;
