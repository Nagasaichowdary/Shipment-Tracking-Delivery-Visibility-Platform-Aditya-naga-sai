import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { shipments } from '../data/dummyData';
import { Search, Plus, ChevronRight, ChevronLeft, Inbox, X, MapPin, Truck, Calendar, Clock, Weight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/ToastContext';

const ALL_STATUSES = ['All', 'In Transit', 'Delivered', 'Delayed', 'Pending', 'Customs'];

const StatusBadge = ({ status }) => {
  const map = {
    'In Transit': 'badge-transit',
    'Delivered':  'badge-delivered',
    'Delayed':    'badge-delayed',
    'Pending':    'badge-pending',
    'Customs':    'badge-customs',
  };
  return (
    <span
      style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, display: 'inline-block' }}
      className={map[status] || 'badge-transit'}
    >
      {status}
    </span>
  );
};

const PriorityDot = ({ priority }) => {
  const color = { High: '#ef4444', Medium: '#f59e0b', Low: '#94a3b8' }[priority] || '#94a3b8';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 }} />;
};

const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 9 }).map((_, i) => (
      <td key={i}>
        <div className="skeleton" style={{ height: 16, width: i === 0 || i === 4 ? '70%' : i === 7 ? '60%' : '90%', borderRadius: 4 }} />
      </td>
    ))}
    <td><div className="skeleton" style={{ height: 16, width: 16, borderRadius: '50%' }} /></td>
  </tr>
);

const Shipments = () => {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('All');
  const [selected, setSelected] = useState(null);
  
  // Loading & Pagination
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const { showToast } = useToast();

  useEffect(() => {
    // Simulate network latency for data fetch
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []); // Only on mount

  const filtered = useMemo(() => {
    return shipments.filter(s => {
      const matchFilter = filter === 'All' || s.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        s.id.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.dest.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [search, filter]);

  // Reset page to 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
    setSelected(null);
  }, [search, filter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stickyHeaderStyle = { position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 0 #e2e8f0' };
  
  const selectedShipment = shipments.find(sh => sh.id === selected);

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p className="section-title">Shipments</p>
          <p className="section-sub">{filtered.length} of {shipments.length} records</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => showToast('New shipment form is not available in demo mode.', 'error')}
        >
          <Plus size={15} />
          New Shipment
        </button>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            type="text"
            placeholder="Search by ID, customer, city…"
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
                transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area (Table + Drawer) */}
      <div style={{ position: 'relative', display: 'flex', gap: 16, height: 'calc(100vh - 240px)', overflow: 'hidden' }}>
        
        {/* Table Container */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, transition: 'all 0.3s' }}>
          <div className="table-wrap" style={{ flex: 1, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={stickyHeaderStyle}>Tracking ID</th>
                  <th style={stickyHeaderStyle}>Customer</th>
                  <th style={stickyHeaderStyle}>Origin</th>
                  <th style={stickyHeaderStyle}>Destination</th>
                  <th style={stickyHeaderStyle}>Vehicle</th>
                  <th style={stickyHeaderStyle}>Weight</th>
                  <th style={stickyHeaderStyle}>Priority</th>
                  <th style={stickyHeaderStyle}>Status</th>
                  <th style={stickyHeaderStyle}>ETA</th>
                  <th style={stickyHeaderStyle}></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.ReactFragment key="loading">
                      {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                    </motion.ReactFragment>
                  ) : paginated.length === 0 ? (
                    <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td colSpan={10} style={{ padding: '60px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                          <div style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Inbox size={32} color="#94a3b8" />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>No shipments found</p>
                            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>We couldn't find any records matching your search.</p>
                            <button 
                              className="btn-secondary" 
                              onClick={() => { setSearch(''); setFilter('All'); }}
                            >
                              Clear Filters
                            </button>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ) : (
                    paginated.map(s => (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        key={s.id}
                        onClick={() => setSelected(s.id === selected ? null : s.id)}
                        style={{ cursor: 'pointer', background: selected === s.id ? '#f0f9ff' : undefined }}
                      >
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: 13 }}>
                            {s.id}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: '#0f172a' }}>{s.customer}</td>
                        <td style={{ color: '#64748b' }}>{s.origin}</td>
                        <td style={{ color: '#64748b' }}>{s.dest}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8fafc', padding: '2px 7px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                            {s.vehicle}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{s.weight}</td>
                        <td>
                          <PriorityDot priority={s.priority} />
                          <span style={{ fontSize: 12, color: '#374151' }}>{s.priority}</span>
                        </td>
                        <td><StatusBadge status={s.status} /></td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{s.eta}</td>
                        <td>
                          <ChevronRight size={15} style={{ color: '#cbd5e1', transform: selected === s.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              Showing <strong>{filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> of <strong>{filtered.length}</strong> results
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#475569', borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                <ChevronLeft size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 13, fontWeight: 600, color: '#334155' }}>
                Page {currentPage} of {totalPages}
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f1f5f9' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#475569', borderRadius: 6, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Detail Drawer (Right Side Panel) ── */}
        <AnimatePresence>
          {selectedShipment && (
            <motion.div
              initial={{ opacity: 0, x: 50, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 360 }}
              exit={{ opacity: 0, x: 50, width: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div className="card" style={{ height: '100%', overflowY: 'auto', padding: 0, border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                
                {/* Drawer Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shipment Details</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{selectedShipment.id}</p>
                  </div>
                  <button 
                    onClick={() => setSelected(null)}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Drawer Content */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Status & Priority Row */}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</p>
                      <StatusBadge status={selectedShipment.status} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Priority</p>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        <PriorityDot priority={selectedShipment.priority} /> {selectedShipment.priority}
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Customer</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{selectedShipment.customer}</p>
                  </div>

                  {/* Route Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Route & Schedule</p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #6366f1', background: '#fff' }} />
                        <div style={{ width: 2, flex: 1, background: '#e2e8f0', margin: '4px 0' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 12, color: '#64748b' }}>Origin</p>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{selectedShipment.origin}</p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 12, color: '#64748b' }}>Destination</p>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{selectedShipment.dest}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spec Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Truck size={12} /> Vehicle</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{selectedShipment.vehicle}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={12} /> Weight</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selectedShipment.weight}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> ETA</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selectedShipment.eta}</p>
                    </div>
                  </div>
                  
                </div>
                
                {/* Drawer Footer Actions */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', marginTop: 'auto', display: 'flex', gap: 12 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => showToast('Tracking link copied to clipboard.', 'success')}>Share</button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={() => showToast('Update status dialog opened.', 'info')}>Update Status</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AdminLayout>
  );
};

export default Shipments;
