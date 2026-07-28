/**
 * DispatcherOrders.jsx  —  /dispatcher/orders
 * Order management for dispatchers.
 */

import React, { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { shipments } from '../../data/dummyData';
import { ShoppingBag, Search, Filter } from 'lucide-react';

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

const DispatcherOrders = () => {
  const [query, setQuery] = useState('');

  const filtered = shipments.filter(
    s =>
      s.id.toLowerCase().includes(query.toLowerCase()) ||
      s.customer.toLowerCase().includes(query.toLowerCase()) ||
      s.origin.toLowerCase().includes(query.toLowerCase()) ||
      s.dest.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Orders</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Manage and assign customer orders</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <Search size={14} color="#94a3b8" />
            <input
              style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', background: 'transparent', width: 180 }}
              placeholder="Search orders..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#374151' }}>
            <Filter size={14} />
            Filter
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <p className="section-title" style={{ fontSize: 15 }}>Order List</p>
          <p className="section-sub">{filtered.length} of {shipments.length} total orders</p>
        </div>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Order ID</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Route</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Vehicle</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>ETA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <ShoppingBag size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                    No orders match your search
                  </td>
                </tr>
              ) : filtered.map(sh => (
                <tr key={sh.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 20px' }}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981', fontSize: 13 }}>{sh.id}</span></td>
                  <td style={{ padding: '12px 20px', color: '#374151', fontWeight: 500 }}>{sh.customer}</td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>{sh.origin} → {sh.dest}</td>
                  <td style={{ padding: '12px 20px' }}><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8fafc', padding: '2px 7px', borderRadius: 4, border: '1px solid #e2e8f0' }}>{sh.vehicle}</span></td>
                  <td style={{ padding: '12px 20px' }}><StatusBadge status={sh.status} /></td>
                  <td style={{ padding: '12px 20px', color: '#64748b', fontSize: 12 }}>{sh.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DispatcherOrders;
