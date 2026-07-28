import React, { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { Save } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="card" style={{ marginBottom: 16 }}>
    <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#0f172a', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
      {title}
    </p>
    {children}
  </div>
);

const Field = ({ label, type = 'text', value, onChange, options }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
      {label}
    </label>
    {type === 'select' ? (
      <select className="input" value={value} onChange={onChange}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    ) : (
      <input className="input" type={type} value={value} onChange={onChange} />
    )}
  </div>
);

const Settings = () => {
  const [profile, setProfile] = useState({ name: 'Admin User', email: 'admin@shiptracker.pro', phone: '+91-98000-00000', role: 'Super Admin' });
  const [prefs, setPrefs]     = useState({ timezone: 'Asia/Kolkata (IST)', language: 'English', dateFormat: 'DD/MM/YYYY', currency: 'INR (₹)' });
  const [saved, setSaved]     = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p className="section-title">Settings</p>
          <p className="section-sub">Manage your account and platform preferences</p>
        </div>
        <button className="btn-primary" onClick={handleSave}>
          <Save size={15} />
          Save Changes
        </button>
      </div>

      {saved && (
        <div
          style={{
            marginBottom: 16, padding: '10px 16px', borderRadius: 8,
            background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d',
            fontSize: 13, fontWeight: 600,
          }}
        >
          ✓ Settings saved successfully.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Profile */}
        <Section title="Profile Information">
          <Field label="Full Name"     value={profile.name}  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}  />
          <Field label="Email Address" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
          <Field label="Phone Number"  type="tel"   value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          <Field label="Role"          type="select" value={profile.role}
            onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}
            options={['Super Admin', 'Admin', 'Manager', 'Operator', 'Viewer']}
          />
        </Section>

        {/* Preferences */}
        <Section title="Platform Preferences">
          <Field label="Timezone"    type="select" value={prefs.timezone}
            onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}
            options={['Asia/Kolkata (IST)', 'Asia/Dubai (GST)', 'Europe/London (GMT)', 'America/New_York (EST)']}
          />
          <Field label="Language"    type="select" value={prefs.language}
            onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
            options={['English', 'Hindi', 'Tamil', 'Telugu', 'Marathi']}
          />
          <Field label="Date Format" type="select" value={prefs.dateFormat}
            onChange={e => setPrefs(p => ({ ...p, dateFormat: e.target.value }))}
            options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']}
          />
          <Field label="Currency"    type="select" value={prefs.currency}
            onChange={e => setPrefs(p => ({ ...p, currency: e.target.value }))}
            options={['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)']}
          />
        </Section>

        {/* Password */}
        <Section title="Change Password">
          <Field label="Current Password" type="password" value="" onChange={() => {}} />
          <Field label="New Password"     type="password" value="" onChange={() => {}} />
          <Field label="Confirm Password" type="password" value="" onChange={() => {}} />
          <button className="btn-secondary" style={{ marginTop: 4 }}>Update Password</button>
        </Section>

        {/* System info */}
        <Section title="System Information">
          {[
            ['Platform Version',  'v1.0.0 — Milestone 1'],
            ['Build Date',        'July 2, 2026'],
            ['Environment',       'Development'],
            ['Database',          'Frontend-only (static data)'],
            ['API Status',        'Not connected (Milestone 1)'],
            ['Support Email',     'support@shiptracker.pro'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{v}</span>
            </div>
          ))}
        </Section>
      </div>
    </AdminLayout>
  );
};

export default Settings;
