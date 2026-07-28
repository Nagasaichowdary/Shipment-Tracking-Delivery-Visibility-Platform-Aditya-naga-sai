import React from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { dashboardStats, shipments } from '../data/dummyData';
import { FileText, Download } from 'lucide-react';

/* ── Simple summary table ─────────────────────────────────── */
const SummaryRow = ({ label, value, note }) => (
  <tr>
    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#374151' }}>{label}</td>
    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{value}</td>
    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{note}</td>
  </tr>
);

const Reports = () => {
  const s = dashboardStats;

  // Status breakdown from data
  const statusCounts = shipments.reduce((acc, sh) => {
    acc[sh.status] = (acc[sh.status] || 0) + 1;
    return acc;
  }, {});

  const onTimeRate = Math.round(((statusCounts['Delivered'] || 0) / shipments.length) * 100);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p className="section-title">Reports</p>
          <p className="section-sub">Summary of logistics operations — July 2026</p>
        </div>
        <button className="btn-secondary">
          <Download size={15} />
          Export Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Shipment Summary */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: '#6366f1' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Shipment Summary</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <SummaryRow label="Total Shipments"   value={s.totalShipments.toLocaleString()} note="All-time records"          />
                <SummaryRow label="Delivered Today"   value={s.deliveredToday}                  note="OTP confirmed"             />
                <SummaryRow label="In Transit"        value={s.inTransit.toLocaleString()}       note="Currently moving"         />
                <SummaryRow label="Pending Dispatch"  value={s.pending}                         note="Awaiting departure"        />
                <SummaryRow label="Delayed"           value={s.delayed}                         note="Needs attention"           />
                <SummaryRow label="On-Time Rate"      value={`${onTimeRate}%`}                  note="Based on current data"    />
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: '#10b981' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Status Breakdown</p>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct = Math.round((count / shipments.length) * 100);
              const barColor = {
                'In Transit': '#3b82f6',
                'Delivered':  '#10b981',
                'Delayed':    '#ef4444',
                'Pending':    '#f59e0b',
                'Customs':    '#8b5cf6',
              }[status] || '#94a3b8';

              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{status}</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                      {count} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="progress-bg">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fleet Summary */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: '#0ea5e9' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Fleet Summary</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <SummaryRow label="Total Vehicles"    value={s.totalVehicles}                                  note="Registered fleet"    />
                <SummaryRow label="Active / On Road"  value={s.activeVehicles}                                 note="Currently deployed"  />
                <SummaryRow label="Available"         value={s.totalVehicles - s.activeVehicles - 1}           note="Ready for dispatch"  />
                <SummaryRow label="Under Maintenance" value={1}                                                note="Truck-D03"           />
                <SummaryRow label="Fleet Utilization" value={`${Math.round((s.activeVehicles / s.totalVehicles) * 100)}%`} note="Active vs total" />
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Summary */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: '#8b5cf6' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Customer Summary</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <SummaryRow label="Total Customers"   value={s.totalCustomers} note="Registered accounts"   />
                <SummaryRow label="Active Accounts"   value={120}              note="Last 30 days activity" />
                <SummaryRow label="Inactive Accounts" value={8}               note="No recent activity"     />
                <SummaryRow label="Top Customer"      value="Delhivery Corp"   note="55 shipments"          />
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default Reports;
