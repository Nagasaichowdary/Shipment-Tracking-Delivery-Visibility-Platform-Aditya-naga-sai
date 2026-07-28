/**
 * Sidebar.jsx
 * Role-aware sidebar navigation.
 * Reads the logged-in user's role from AuthContext and renders
 * only the nav items that role is allowed to see.
 * Logout clears the session and redirects to /login.
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Package, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLE_NAV, ROLE_LABEL, ROLE_COLOR } from '../auth/roleConfig';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fall back to empty nav if user somehow has no role
  const navItems = user ? (ROLE_NAV[user.role] || []) : [];
  const roleColor = user ? (ROLE_COLOR[user.role] || ROLE_COLOR.ADMIN) : ROLE_COLOR.ADMIN;

  const handleLogout = () => {
    logout();               // clears localStorage + context state
    navigate('/login', { replace: true });
  };

  // Safely extract names and compute display values to prevent crashes
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.email || '';
  
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || email || 'User';
  const initial = (firstName || email || 'U').charAt(0).toUpperCase();

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        background: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid #334155',
      }}
    >
      {/* ── Logo ── */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, background: '#6366f1', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Package size={18} color="#ffffff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
              Shipment Tracker
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#6366f1', fontWeight: 500 }}>Pro</p>
          </div>
        </div>
      </div>

      {/* ── User info + Role badge ── */}
      {user && (
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Avatar initials */}
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: roleColor.badge,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {initial}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0, fontSize: 13, fontWeight: 600, color: '#f1f5f9',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {fullName}
            </p>
            {/* Role pill */}
            <span
              style={{
                display: 'inline-block', marginTop: 3,
                fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                background: roleColor.bg, color: roleColor.text,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
            >
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? '#ffffff' : '#94a3b8',
              background: isActive ? '#6366f1' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            })}
            onMouseEnter={(e) => {
              if (e.currentTarget.style.background !== 'rgb(99, 102, 241)') {
                e.currentTarget.style.background = '#334155';
                e.currentTarget.style.color = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (e.currentTarget.style.background !== 'rgb(99, 102, 241)') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }
            }}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Logout ── */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #334155' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            color: '#f87171',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3b1a1a'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;