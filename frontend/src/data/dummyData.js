// ─── Dummy Data — Shipment Tracker Pro (Milestone 1) ─────────
// All static frontend-only data. No backend required.

export const shipments = [
  { id: 'SH-9821', customer: 'Amazon Logistics',  origin: 'Mumbai',    dest: 'Delhi',        vehicle: 'Truck-A14', status: 'In Transit', eta: 'Jul 03, 2026', weight: '1,240 kg', priority: 'High'   },
  { id: 'SH-9820', customer: 'Flipkart Supply',   origin: 'Chennai',   dest: 'Hyderabad',    vehicle: 'Truck-B07', status: 'Delivered',  eta: 'Jul 02, 2026', weight: '890 kg',   priority: 'Medium' },
  { id: 'SH-9819', customer: 'Reliance Retail',   origin: 'Pune',      dest: 'Nagpur',       vehicle: 'Truck-C22', status: 'Delayed',    eta: 'Jul 04, 2026', weight: '2,100 kg', priority: 'High'   },
  { id: 'SH-9818', customer: 'TATA Consumer',     origin: 'Kolkata',   dest: 'Bhubaneswar',  vehicle: 'Truck-D03', status: 'Pending',    eta: 'Jul 05, 2026', weight: '560 kg',   priority: 'Low'    },
  { id: 'SH-9817', customer: 'Meesho Logistics',  origin: 'Bangalore', dest: 'Mangalore',    vehicle: 'Truck-E19', status: 'In Transit', eta: 'Jul 03, 2026', weight: '730 kg',   priority: 'Medium' },
  { id: 'SH-9816', customer: 'Delhivery Corp',    origin: 'Ahmedabad', dest: 'Jaipur',       vehicle: 'Van-F11',   status: 'Customs',    eta: 'Jul 06, 2026', weight: '1,450 kg', priority: 'High'   },
  { id: 'SH-9815', customer: 'Ecom Express',      origin: 'Lucknow',   dest: 'Varanasi',     vehicle: 'Truck-G05', status: 'In Transit', eta: 'Jul 03, 2026', weight: '320 kg',   priority: 'Low'    },
  { id: 'SH-9814', customer: 'BlueDart Cargo',    origin: 'Indore',    dest: 'Bhopal',       vehicle: 'Bike-H02',  status: 'Delivered',  eta: 'Jul 02, 2026', weight: '45 kg',    priority: 'Medium' },
  { id: 'SH-9813', customer: 'Gati Limited',      origin: 'Surat',     dest: 'Vadodara',     vehicle: 'Truck-I08', status: 'Delayed',    eta: 'Jul 04, 2026', weight: '980 kg',   priority: 'High'   },
  { id: 'SH-9812', customer: 'XpressBees',        origin: 'Patna',     dest: 'Ranchi',       vehicle: 'Truck-J14', status: 'In Transit', eta: 'Jul 03, 2026', weight: '670 kg',   priority: 'Medium' },
];

export const vehicles = [
  { id: 'TRK-A14', type: 'Truck',    driver: 'Ramesh Kumar',  license: 'MH-04-AB-1234', capacity: '5,000 kg', status: 'Active',       route: 'Mumbai → Delhi'       },
  { id: 'TRK-B07', type: 'Truck',    driver: 'Suresh Babu',   license: 'TN-09-CD-5678', capacity: '4,500 kg', status: 'Available',    route: '—'                    },
  { id: 'TRK-C22', type: 'Truck',    driver: 'Vijay Patil',   license: 'MH-12-EF-9012', capacity: '6,000 kg', status: 'Delayed',      route: 'Pune → Nagpur'        },
  { id: 'VAN-F11', type: 'Van',      driver: 'Arjun Mehta',   license: 'GJ-01-GH-3456', capacity: '1,500 kg', status: 'Customs Hold', route: 'Ahmedabad → Jaipur'   },
  { id: 'TRK-G05', type: 'Truck',    driver: 'Priya Sharma',  license: 'UP-32-IJ-7890', capacity: '4,000 kg', status: 'Active',       route: 'Lucknow → Varanasi'   },
  { id: 'BKE-H02', type: 'Bike',     driver: 'Kiran Das',     license: 'MP-09-KL-1234', capacity: '100 kg',   status: 'Available',    route: '—'                    },
  { id: 'TRK-D03', type: 'Truck',    driver: 'Mohan Rao',     license: 'WB-06-MN-5678', capacity: '5,500 kg', status: 'Maintenance',  route: '—'                    },
  { id: 'TRK-I08', type: 'Truck',    driver: 'Sonia Verma',   license: 'GJ-06-OP-9012', capacity: '4,200 kg', status: 'Active',       route: 'Surat → Vadodara'     },
];

export const customers = [
  { id: 'CUS-001', name: 'Amazon Logistics',  contact: 'Ravi Sharma',   email: 'ops@amazon.in',        phone: '+91-98100-11111', city: 'Mumbai',    shipments: 42, status: 'Active'   },
  { id: 'CUS-002', name: 'Flipkart Supply',   contact: 'Anjali Menon',  email: 'supply@flipkart.com',  phone: '+91-98200-22222', city: 'Bangalore', shipments: 38, status: 'Active'   },
  { id: 'CUS-003', name: 'Reliance Retail',   contact: 'Vikram Nair',   email: 'logistics@reliance.in',phone: '+91-98300-33333', city: 'Mumbai',    shipments: 29, status: 'Active'   },
  { id: 'CUS-004', name: 'TATA Consumer',     contact: 'Deepa Singh',   email: 'ops@tataconsumer.com', phone: '+91-98400-44444', city: 'Kolkata',   shipments: 17, status: 'Active'   },
  { id: 'CUS-005', name: 'Meesho Logistics',  contact: 'Karan Joshi',   email: 'karan@meesho.com',     phone: '+91-98500-55555', city: 'Bangalore', shipments: 24, status: 'Active'   },
  { id: 'CUS-006', name: 'Delhivery Corp',    contact: 'Neha Gupta',    email: 'neha@delhivery.com',   phone: '+91-98600-66666', city: 'Gurugram',  shipments: 55, status: 'Active'   },
  { id: 'CUS-007', name: 'BlueDart Cargo',    contact: 'Suresh Pillai', email: 'ops@bluedart.com',     phone: '+91-98700-77777', city: 'Chennai',   shipments: 31, status: 'Inactive' },
  { id: 'CUS-008', name: 'Gati Limited',      contact: 'Pooja Iyer',    email: 'pooja@gati.com',       phone: '+91-98800-88888', city: 'Hyderabad', shipments: 19, status: 'Active'   },
];

export const recentActivity = [
  { id: 1, type: 'Delivered',    shipmentId: 'SH-9820', customer: 'Flipkart Supply',  note: 'Delivered to Hyderabad — OTP confirmed',           time: '2 min ago'  },
  { id: 2, type: 'Delay Alert',  shipmentId: 'SH-9819', customer: 'Reliance Retail',  note: 'NH-160 road closure — ETA pushed by 4 hours',      time: '8 min ago'  },
  { id: 3, type: 'Checkpoint',   shipmentId: 'SH-9812', customer: 'XpressBees',       note: 'Passed Patna checkpoint — 88% complete',           time: '15 min ago' },
  { id: 4, type: 'Dispatched',   shipmentId: 'SH-9821', customer: 'Amazon Logistics', note: 'Truck-A14 departed Mumbai, ETA Jul 3',             time: '22 min ago' },
  { id: 5, type: 'Customs Hold', shipmentId: 'SH-9816', customer: 'Delhivery Corp',   note: 'Documentation under review at Kandla Port',        time: '1 hr ago'   },
  { id: 6, type: 'Maintenance',  shipmentId: '—',       customer: '—',                note: 'Truck-D03 scheduled for service on Jul 4',         time: '2 hr ago'   },
];

export const dashboardStats = {
  totalShipments:   2847,
  deliveredToday:   312,
  inTransit:        1540,
  delayed:          47,
  pending:          148,
  totalVehicles:    163,
  activeVehicles:   142,
  totalCustomers:   128,
};
