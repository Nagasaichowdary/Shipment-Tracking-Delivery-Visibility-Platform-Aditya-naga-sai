/**
 * Navbar.jsx
 * Top navigation bar.
 * Shows the current page title and the logged-in user's name
 * and role read from AuthContext.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABEL, ROLE_COLOR } from '../auth/roleConfig';

// ── Page title map (extend as more routes are added) ──────────
const PAGE_TITLES = {
  '/dashboard':            { title: 'Dashboard',            sub: 'Overview of operations'        },
  '/shipments':            { title: 'Shipments',            sub: 'Manage and track shipments'    },
  '/vehicles':             { title: 'Vehicles',             sub: 'Fleet management'              },
  '/customers':            { title: 'Customers',            sub: 'Customer records'              },
  '/reports':              { title: 'Reports',              sub: 'Operational reports'           },
  '/settings':             { title: 'Settings',             sub: 'System configuration'         },
  '/dispatcher/dashboard': { title: 'Dispatcher Dashboard', sub: 'Manage dispatch operations'   },
  '/dispatcher/orders':    { title: 'Orders',               sub: 'Manage orders'                },
  '/driver/dashboard':     { title: 'Driver Dashboard',     sub: 'Your assigned deliveries'     },
  '/driver/deliveries':    { title: 'Assigned Deliveries',  sub: 'Active delivery tasks'        },
  '/driver/route':         { title: 'My Route',             sub: 'Current delivery route'       },
  '/driver/history':       { title: 'Delivery History',     sub: 'Completed deliveries'         },
  '/customer/dashboard':   { title: 'My Dashboard',         sub: 'Track your shipments'         },
  '/customer/shipments':   { title: 'My Shipments',         sub: 'All your shipment records'    },
  '/customer/track':       { title: 'Track Shipment',       sub: 'Real-time tracking'           },
  '/customer/profile':     { title: 'My Profile',           sub: 'Account information'          },
};

const Navbar = () => {
  const { user } = useAuth();
  const location  = useLocation();

  const page      = PAGE_TITLES[location.pathname] || { title: 'Shipment Tracker Pro', sub: '' };
  const roleColor = user ? (ROLE_COLOR[user.role] || ROLE_COLOR.ADMIN) : ROLE_COLOR.ADMIN;
  const fullName = user
  ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
  : 'Guest';

const initial = user
  ? (user.firstName?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()
  : 'G';

  return (
    <header
      style={{
        height: 60,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      {/* ── Page title ── */}
      <div>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
          {page.title}
        </h1>
        {page.sub && (
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{page.sub}</p>
        )}
      </div>

      {/* ── Right: notification + user ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Notification bell */}
        <button
          style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: 8,
            width: 36, height: 36, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#64748b',
          }}
          title="Notifications"
        >
          <Bell size={15} />
        </button>

        {/* User info pill */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', background: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: 8,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: user ? roleColor.badge : '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {user
              ? <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{initial}</span>
              : <User size={14} color="#ffffff" />
            }
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0f172a', lineHeight: 1 }}>
              {fullName}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
              {user ? ROLE_LABEL[user.role] : '—'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
