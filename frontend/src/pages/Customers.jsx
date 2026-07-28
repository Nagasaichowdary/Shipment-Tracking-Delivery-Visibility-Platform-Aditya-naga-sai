import React, { useState, useMemo } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { customers } from '../data/dummyData';
import { Search, Plus, Mail, Phone } from 'lucide-react';

const Customers = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const matchFilter = filter === 'All' || c.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [search, filter]);

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p className="section-title">Customers</p>
          <p className="section-sub">{filtered.length} of {customers.length} registered accounts</p>
        </div>
        <button className="btn-primary">
          <Plus size={15} />
          Add Customer
        </button>
      </div>

      {/* Search + Filter */}
      <div
        className="card"
        style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            type="text"
            placeholder="Search by name, email, city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Active', 'Inactive'].map(f => (
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
                <th>Customer ID</th>
                <th>Company</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Shipments</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                    No customers match your search.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: 13 }}>
                        {c.id}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</td>
                    <td style={{ color: '#374151' }}>{c.contact}</td>
                    <td>
                      <a
                        href={`mailto:${c.email}`}
                        style={{ color: '#6366f1', textDecoration: 'none', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Mail size={12} /> {c.email}
                      </a>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
                        <Phone size={12} /> {c.phone}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{c.city}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#374151' }}>{c.shipments}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block',
                          background: c.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                          color: c.status === 'Active' ? '#15803d' : '#64748b',
                          border: `1px solid ${c.status === 'Active' ? '#bbf7d0' : '#e2e8f0'}`,
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
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

export default Customers;
