/**
 * CustomerTrack.jsx  —  /customer/track
 * Dedicated tracking page for customers.
 */

import React, { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { shipments } from '../../data/dummyData';
import { Search, MapPin, Package, Clock, CheckCircle2 } from 'lucide-react';

const CustomerTrack = () => {
  const [trackId, setTrackId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    
    setError('');
    setResult(null);
    const found = shipments.find(s => s.id.toLowerCase() === trackId.trim().toLowerCase());
    
    if (found) {
      setResult(found);
    } else {
      setError(`No shipment found for tracking ID "${trackId}".`);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Delivered': return <CheckCircle2 size={24} color="#10b981" />;
      case 'In Transit': return <Clock size={24} color="#0ea5e9" />;
      case 'Pending': return <Package size={24} color="#f59e0b" />;
      default: return <MapPin size={24} color="#6366f1" />;
    }
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24, maxWidth: 600 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Track Your Shipment</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Enter your tracking ID to see real-time updates.</p>
      </div>

      <div className="card" style={{ maxWidth: 600, padding: 32, marginBottom: 24 }}>
        <form onSubmit={handleTrack} style={{ display: 'flex', gap: 12 }}>
          <input
            className="input"
            placeholder="e.g. SH-9817"
            value={trackId}
            onChange={e => setTrackId(e.target.value.toUpperCase())}
            style={{ flex: 1, fontSize: 16, padding: '12px 16px', fontFamily: 'monospace' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 24px', fontSize: 15 }}>
            <Search size={18} />
            Track
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
            <p style={{ margin: 0, color: '#ef4444', fontSize: 14 }}>{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div className="card" style={{ maxWidth: 600, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getStatusIcon(result.status)}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tracking ID</p>
              <h3 style={{ margin: '4px 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{result.id}</h3>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1' }}>
                {result.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>From</p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{result.origin}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>To</p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{result.dest}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Estimated Delivery</p>
              <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 500, color: '#374151' }}>{result.eta}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Weight</p>
              <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 500, color: '#374151' }}>{result.weight}</p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CustomerTrack;
