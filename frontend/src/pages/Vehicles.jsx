import React, { useState, useMemo } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { vehicles } from '../data/dummyData';
import { Search, Plus } from 'lucide-react';

const ALL_STATUSES = ['All', 'Active', 'Available', 'Delayed', 'Maintenance', 'Customs Hold'];

const StatusBadge = ({ status }) => {
  const styles = {
    'Active':       { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' },
    'Available':    { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    'Delayed':      { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' },
    'Maintenance':  { background: '#fef9c3', color: '#a16207', border: '1px solid #fef08a' },
    'Customs Hold': { background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff' },
  };
  const s = styles[status] || styles['Available'];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block', ...s }}>
      {status}
    </span>
  );
};

const Vehicles = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => {
    return vehicles.filter(v => {
      const matchFilter = filter === 'All' || v.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        v.id.toLowerCase().includes(q) ||
        v.driver.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.license.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [search, filter]);

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p className="section-title">Fleet / Vehicles</p>
          <p className="section-sub">{filtered.length} of {vehicles.length} vehicles</p>
        </div>
        <button className="btn-primary">
          <Plus size={15} />
          Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            type="text"
            placeholder="Search by ID, driver, type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_STATUSES.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                background: filter === f ? '#6366f1' : '#ffffff',
                borderColor: filter === f ? '#6366f1' : '#e2e8f0',
                color: filter === f ? '#ffffff' : '#64748b',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vehicle ID</th>
                <th>Type</th>
                <th>Driver</th>
                <th>License Plate</th>
                <th>Capacity</th>
                <th>Current Route</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                    No vehicles match your search.
                  </td>
                </tr>
              ) : (
                filtered.map(v => (
                  <tr key={v.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: 13 }}>
                        {v.id}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                          background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                        }}
                      >
                        {v.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#0f172a' }}>{v.driver}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{v.license}</td>
                    <td style={{ color: '#64748b' }}>{v.capacity}</td>
                    <td style={{ color: '#64748b' }}>{v.route}</td>
                    <td><StatusBadge status={v.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Vehicles;
