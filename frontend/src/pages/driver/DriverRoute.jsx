/**
 * DriverRoute.jsx  —  /driver/route
 * Current route for the driver.
 */

import React from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { Navigation } from 'lucide-react';

const DriverRoute = () => {
  return (
    <AdminLayout>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>My Route</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Your current active delivery route</p>
      </div>

      <div className="card" style={{ padding: '24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: '#eef2ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={22} color="#6366f1" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Mumbai → Delhi</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>via NH-44</p>
          </div>
        </div>

        <div style={{ marginLeft: 22, paddingLeft: 20, borderLeft: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: -26, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Mumbai Hub</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Departed at 06:00 AM</p>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: -26, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }}></div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Jaipur Checkpoint</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Next Stop (ETA: 02:00 PM)</p>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: -26, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#cbd5e1' }}></div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Delhi NCR Zone</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Final Destination (ETA: 09:00 PM)</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DriverRoute;
