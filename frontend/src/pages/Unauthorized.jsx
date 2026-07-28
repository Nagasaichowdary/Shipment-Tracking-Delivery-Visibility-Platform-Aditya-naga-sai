/**
 * Unauthorized.jsx
 * Shown when an authenticated user tries to access a route
 * they are not allowed to view (wrong role).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLE_HOME, ROLE_LABEL } from '../auth/roleConfig';

const Unauthorized = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goHome = () => {
    if (user) {
      navigate(ROLE_HOME[user.role], { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#fef2f2', border: '2px solid #fecaca',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <ShieldOff size={32} color="#ef4444" />
        </div>

        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
          Access Denied
        </h1>
        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
          You don't have permission to view this page.
        </p>
        {user && (
          <p style={{ margin: '0 0 28px', fontSize: 13, color: '#94a3b8' }}>
            You are logged in as <strong style={{ color: '#374151' }}>{user.firstName} {user.lastName}</strong>
            {' '}({ROLE_LABEL[user.role]})
          </p>
        )}

        <button
          className="btn-primary"
          onClick={goHome}
          style={{ justifyContent: 'center', width: '100%', padding: '11px 18px' }}
        >
          <ArrowLeft size={16} />
          Go to My Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
