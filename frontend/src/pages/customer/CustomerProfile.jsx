/**
 * CustomerProfile.jsx  —  /customer/profile
 * User profile page for customers.
 */

import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../auth/AuthContext';
import { Mail, MapPin, Building, Phone } from 'lucide-react';

const CustomerProfile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>My Profile</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Manage your account settings</p>
      </div>

      <div className="card" style={{ maxWidth: 800, padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 120, background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}></div>
        <div style={{ padding: '0 32px 32px', position: 'relative' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#fff', padding: 4, marginTop: -48, display: 'inline-block' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#0284c7' }}>{(user.firstName || user.email || 'U').charAt(0).toUpperCase()}</span>
            </div>
          </div>
          
          <div style={{ marginTop: 16 }}>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{user.firstName} {user.lastName}</h3>
            <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: '#0ea5e9', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customer Account
            </span>
          </div>

          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={18} color="#64748b" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>Email Address</p>
                <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{user.email}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building size={18} color="#64748b" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>Company</p>
                <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 600 }}>Meesho Logistics</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={18} color="#64748b" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>Phone Number</p>
                <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 600 }}>+91-98500-55555</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={18} color="#64748b" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>Primary City</p>
                <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 600 }}>Bangalore</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CustomerProfile;
