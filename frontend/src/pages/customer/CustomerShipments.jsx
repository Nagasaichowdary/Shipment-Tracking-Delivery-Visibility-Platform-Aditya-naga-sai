/**
 * CustomerShipments.jsx  —  /customer/shipments
 * Full shipment list for the logged-in customer.
 */

import React, { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../auth/AuthContext';
import { shipments } from '../../data/dummyData';
import { Package, Search } from 'lucide-react';

// Demo: customer user sees shipments under "Meesho Logistics"
const ALL_SHIPMENTS = shipments.filter(s => s.customer === 'Meesho Logistics');

const STATUS_STYLE = {
  'In Transit': { bg: '#e0f2fe', color: '#0369a1' },
  'Delivered':  { bg: '#dcfce7', color: '#15803d' },
  'Delayed':    { bg: '#fee2e2', color: '#b91c1c' },
  'Pending':    { bg: '#fef9c3', color: '#854d0e' },
  'Customs':    { bg: '#f3e8ff', color: '#7e22ce' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block', background: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

const CustomerShipments = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const filtered = ALL_SHIPMENTS.filter(
    s =>
      s.id.toLowerCase().includes(query.toLowerCase()) ||
      s.origin.toLowerCase().includes(query.toLowerCase()) ||
      s.dest.toLowerCase().includes(query.toLowerCase()) ||
      s.status.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>My Shipments</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>All shipments linked to your account</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <Search size={14} color="#94a3b8" />
          <input
            style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', background: 'transparent', width: 180 }}
            placeholder="Search shipments…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',      value: ALL_SHIPMENTS.length,                                    bg: '#eef2ff', color: '#6366f1' },
          { label: 'In Transit', value: ALL_SHIPMENTS.filter(s => s.status === 'In Transit').length, bg: '#e0f2fe', color: '#0ea5e9' },
          { label: 'Delivered',  value: ALL_SHIPMENTS.filter(s => s.status === 'Delivered').length,  bg: '#dcfce7', color: '#10b981' },
          { label: 'Delayed',    value: ALL_SHIPMENTS.filter(s => s.status === 'Delayed').length,    bg: '#fee2e2', color: '#ef4444' },
        ].map(c => (
          <div key={c.label} className="card" style={{ background: c.bg, padding: '14px 18px' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, color: c.color, lineHeight: 1, fontFamily: 'monospace' }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <p className="section-title" style={{ fontSize: 15 }}>Shipment Records</p>
          <p className="section-sub">{filtered.length} of {ALL_SHIPMENTS.length} shipments</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Vehicle</th>
                <th>Weight</th>
                <th>Priority</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Package size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                    No shipments match your search
                  </td>
                </tr>
              ) : filtered.map(sh => (
                <tr key={sh.id}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0ea5e9', fontSize: 13 }}>{sh.id}</span></td>
                  <td style={{ color: '#374151' }}>{sh.origin}</td>
                  <td style={{ color: '#374151' }}>{sh.dest}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8fafc', padding: '2px 7px', borderRadius: 4, border: '1px solid #e2e8f0' }}>{sh.vehicle}</span></td>
                  <td style={{ color: '#64748b' }}>{sh.weight}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                      background: sh.priority === 'High' ? '#fee2e2' : sh.priority === 'Medium' ? '#fef9c3' : '#f1f5f9',
                      color:      sh.priority === 'High' ? '#b91c1c' : sh.priority === 'Medium' ? '#854d0e' : '#475569',
                    }}>
                      {sh.priority}
                    </span>
                  </td>
                  <td><StatusBadge status={sh.status} /></td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{sh.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CustomerShipments;
