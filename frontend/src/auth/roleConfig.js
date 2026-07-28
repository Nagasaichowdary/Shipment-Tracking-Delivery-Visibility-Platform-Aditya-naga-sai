/**
 * roleConfig.js
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for UI-level role configuration:
 *  - Role constants
 *  - Role → home dashboard route
 *  - Role → sidebar navigation items
 *  - Role → which routes are accessible
 *  - Role display labels and accent colours
 *
 * User credentials and authentication logic live in:
 *   src/data/mockUsers.js  (replace with real API for backend)
 */

import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  BarChart3,
  Settings,
  MapPin,
  ClipboardList,
  History,
  Navigation,
  ShoppingBag,
  UserCircle,
} from 'lucide-react';

// ── Role constants ─────────────────────────────────────────────
export const ROLES = {
  ADMIN:           'ADMIN',
  DISPATCHER:      'DISPATCHER',
  DRIVER:          'DRIVER',
  CUSTOMER:        'CUSTOMER',
  BUSINESS_CLIENT: 'BUSINESS_CLIENT',
};

// ── Where each role lands after login ─────────────────────────
export const ROLE_HOME = {
  ADMIN:           '/dashboard',
  DISPATCHER:      '/dispatcher/dashboard',
  DRIVER:          '/driver/dashboard',
  CUSTOMER:        '/customer/dashboard',
  BUSINESS_CLIENT: '/business/dashboard',
};

// ── Sidebar nav items per role ─────────────────────────────────
export const ROLE_NAV = {
  ADMIN: [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/shipments',   icon: Package,          label: 'Shipments'     },
    { to: '/vehicles',    icon: Truck,            label: 'Vehicles'      },
    { to: '/customers',   icon: Users,            label: 'Customers'     },
    { to: '/reports',     icon: BarChart3,        label: 'Reports'       },
    { to: '/settings',    icon: Settings,         label: 'Settings'      },
  ],

  DISPATCHER: [
    { to: '/dispatcher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/shipments',            icon: Package,          label: 'Shipments' },
    { to: '/vehicles',             icon: Truck,            label: 'Vehicles'  },
    { to: '/dispatcher/orders',    icon: ShoppingBag,      label: 'Orders'    },
  ],

  DRIVER: [
    { to: '/driver/dashboard',   icon: LayoutDashboard, label: 'Dashboard'         },
    { to: '/driver/deliveries',  icon: ClipboardList,   label: 'Assigned Deliveries'},
    { to: '/driver/route',       icon: Navigation,      label: 'My Route'          },
    { to: '/driver/history',     icon: History,         label: 'Delivery History'  },
  ],

  CUSTOMER: [
    { to: '/customer/dashboard', icon: LayoutDashboard, label: 'Dashboard'      },
    { to: '/customer/shipments', icon: Package,          label: 'My Shipments'   },
    { to: '/customer/track',     icon: MapPin,           label: 'Track Shipment' },
    { to: '/customer/profile',   icon: UserCircle,       label: 'My Profile'     },
  ],

  BUSINESS_CLIENT: [
    { to: '/business/dashboard', icon: LayoutDashboard, label: 'Dashboard'      },
    { to: '/business/shipments', icon: Package,         label: 'All Shipments'  },
    { to: '/business/customers', icon: Users,           label: 'Customers'      },
    { to: '/business/reports',   icon: BarChart3,       label: 'Reports'        },
    { to: '/business/profile',   icon: UserCircle,      label: 'Company Profile'},
  ],
};

// ── Which routes each role is allowed to visit ────────────────
// Using prefix matching — "/driver" means all /driver/* paths
export const ROLE_ALLOWED_PREFIXES = {
  ADMIN:           ['/dashboard', '/shipments', '/vehicles', '/customers', '/reports', '/settings'],
  DISPATCHER:      ['/dispatcher', '/shipments', '/vehicles'],
  DRIVER:          ['/driver'],
  CUSTOMER:        ['/customer'],
  BUSINESS_CLIENT: ['/business'],
};

// ── Role display labels (for UI) ──────────────────────────────
export const ROLE_LABEL = {
  ADMIN:           'Administrator',
  DISPATCHER:      'Dispatcher',
  DRIVER:          'Driver',
  CUSTOMER:        'Customer',
  BUSINESS_CLIENT: 'Business Client',
};

// ── Role accent colours (for badges, welcome cards) ───────────
export const ROLE_COLOR = {
  ADMIN:           { bg: '#eef2ff', text: '#4338ca', badge: '#6366f1' },
  DISPATCHER:      { bg: '#ecfdf5', text: '#065f46', badge: '#10b981' },
  DRIVER:          { bg: '#fff7ed', text: '#9a3412', badge: '#f97316' },
  CUSTOMER:        { bg: '#f0f9ff', text: '#0369a1', badge: '#0ea5e9' },
  BUSINESS_CLIENT: { bg: '#f5f3ff', text: '#6d28d9', badge: '#8b5cf6' },
};
