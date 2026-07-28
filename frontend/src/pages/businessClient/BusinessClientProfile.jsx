import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../auth/AuthContext';
import { Building2, Globe, Mail, Phone, MapPin, User, Briefcase, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

const BusinessClientProfile = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (user) {
      setCompany({
        companyName: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
        businessType: 'Enterprise',
        companyStatus: 'Active',
        companyId: 'BC-12345',
        businessPhone: '+1 234 567 8900',
        website: 'https://example.com',
        designation: 'Administrator',
        contactMobile: '+1 234 567 8900',
        address: '123 Business Avenue',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      });
    }
  }, [user]);

  if (!company) {
    return (
      <AdminLayout>
        <div style={{ padding: 24 }}>Loading profile...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ padding: '24px 24px 60px', maxWidth: 900, margin: '0 auto' }}>
        
        <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Company Profile</h1>

        <div style={{ display: 'grid', gap: 24 }}>
          
          {/* Header Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#fff', borderRadius: 16, padding: 32, display: 'flex', gap: 24, alignItems: 'flex-start', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
            <div style={{ width: 100, height: 100, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Building2 size={40} color="#94a3b8" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{company.companyName}</h2>
                  <p style={{ margin: 0, fontSize: 14, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Briefcase size={16} /> {company.businessType} Industry
                  </p>
                </div>
                <span style={{ padding: '6px 12px', background: company.companyStatus === 'Active' ? '#dcfce7' : '#f1f5f9', color: company.companyStatus === 'Active' ? '#16a34a' : '#64748b', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                  {company.companyStatus}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            
            {/* Info Card 1 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="#6366f1" /> Business Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Hash size={18} color="#94a3b8" style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600 }}>Company ID</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{company.companyId}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Mail size={18} color="#94a3b8" style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600 }}>Business Email</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{user.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Phone size={18} color="#94a3b8" style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600 }}>Business Phone</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{company.businessPhone}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Globe size={18} color="#94a3b8" style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 600 }}>Website</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{company.website || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Info Card 2 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} color="#6366f1" /> Representative
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Name</span>
                    <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{user.firstName} {user.lastName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Designation</span>
                    <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{company.designation}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Contact Mobile</span>
                    <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{company.contactMobile}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={18} color="#6366f1" /> Address Details
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{company.address}</p>
                <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                  {company.city}, {company.state} {company.postalCode}
                  <br />{company.country}
                </p>
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BusinessClientProfile;
