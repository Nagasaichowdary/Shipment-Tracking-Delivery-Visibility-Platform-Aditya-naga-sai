/**
 * DriverDeliveries.jsx  —  /driver/deliveries
 * Assigned deliveries for the driver.
 */

import React from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { shipments } from '../../data/dummyData';
import { ClipboardList } from 'lucide-react';

const DRIVER_VEHICLE = 'Truck-A14';

const DriverDeliveries = () => {
  const assigned = shipments.filter(s => s.vehicle === DRIVER_VEHICLE);

  return (
    <AdminLayout>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Assigned Deliveries</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Your active delivery tasks for {DRIVER_VEHICLE}</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <p className="section-title" style={{ fontSize: 15 }}>Deliveries</p>
        </div>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Shipment ID</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Route</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Weight</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>ETA</th>
              </tr>
            </thead>
            <tbody>
              {assigned.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <ClipboardList size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                    No assigned deliveries
                  </td>
                </tr>
              ) : assigned.map(sh => (
                <tr key={sh.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 20px' }}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f97316', fontSize: 13 }}>{sh.id}</span></td>
                  <td style={{ padding: '12px 20px', color: '#374151', fontWeight: 500 }}>{sh.customer}</td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>{sh.origin} → {sh.dest}</td>
                  <td style={{ padding: '12px 20px', color: '#64748b' }}>{sh.weight}</td>
                  <td style={{ padding: '12px 20px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block', background: '#e0f2fe', color: '#0369a1' }}>{sh.status}</span></td>
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

export default DriverDeliveries;
