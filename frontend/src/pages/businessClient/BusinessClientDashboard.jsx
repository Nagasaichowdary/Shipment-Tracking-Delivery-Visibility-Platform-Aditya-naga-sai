import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../auth/AuthContext';
import { Building2, Package, TrendingUp, CheckCircle, Plus, MapPin, Users, FileText, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const BusinessClientDashboard = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (user) {
      setCompany({
        companyName: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
        businessType: 'Enterprise',
        companyStatus: 'Active'
      });
    }
  }, [user]);

  // Mock analytics
  const analytics = [
    { label: "Today's Shipments", value: '24', icon: Package, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Active Orders',     value: '12', icon: TrendingUp, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Delivered Orders',  value: '156',icon: CheckCircle, color: '#10b981', bg: '#ecfdf5' },
    { label: 'Revenue (MTD)',     value: '$42K',icon: Building2, color: '#6366f1', bg: '#eef2ff' },
  ];

  // Mock Quick Actions
  const quickActions = [
    { label: 'Create Shipment', icon: Plus,    path: '/business/shipments/new', color: '#6366f1', bg: '#eef2ff' },
    { label: 'Track Shipment',  icon: MapPin,  path: '/business/track',         color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Manage Customers',icon: Users,   path: '/business/customers',     color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Reports',         icon: FileText,path: '/business/reports',       color: '#10b981', bg: '#ecfdf5' },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
            padding: '32px 40px', 
            borderRadius: 16, 
            color: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 24, 
            boxShadow: '0 12px 32px rgba(79,70,229,0.25)',
            marginBottom: 32,
            marginTop: 8
          }}
        >
          {/* Company Logo or Fallback */}
          <div style={{ 
            width: 80, height: 80, borderRadius: 16, background: '#ffffff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', flexShrink: 0
          }}>
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Building2 size={40} color="#4f46e5" />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Enterprise Account
              </span>
              {company?.companyStatus === 'Active' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#6ee7b7' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6ee7b7', boxShadow: '0 0 8px #6ee7b7' }} />
                  Active
                </span>
              )}
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>
              Welcome back, {company?.companyName || 'Business Client'}
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={16} />
              {company?.businessType || 'Enterprise'} Industry
            </p>
          </div>
        </motion.div>

        {/* Analytics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
          {analytics.map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (i * 0.05) }}
              style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <stat.icon size={24} color={stat.color} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>{stat.label}</p>
                  <p style={{ margin: 0, fontSize: 24, color: '#0f172a', fontWeight: 800 }}>{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {quickActions.map((action, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(15,23,42,0.06)' }}
              style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <action.icon size={20} color={action.color} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{action.label}</span>
            </motion.div>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
};

export default BusinessClientDashboard;
