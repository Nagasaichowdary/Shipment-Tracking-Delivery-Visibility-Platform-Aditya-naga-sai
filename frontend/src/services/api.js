import axios from 'axios';

// Base URL — update this when the backend is ready
const BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Auth ──────────────────────────────────────────
export const login    = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const logout   = ()     => api.post('/auth/logout');

// ─── Shipments ─────────────────────────────────────
export const getShipments   = ()         => api.get('/shipments');
export const getShipment    = (id)       => api.get(`/shipments/${id}`);
export const createShipment = (data)     => api.post('/shipments', data);
export const updateShipment = (id, data) => api.put(`/shipments/${id}`, data);
export const deleteShipment = (id)       => api.delete(`/shipments/${id}`);

// ─── Vehicles ──────────────────────────────────────
export const getVehicles    = ()         => api.get('/vehicles');
export const getVehicle     = (id)       => api.get(`/vehicles/${id}`);
export const createVehicle  = (data)     => api.post('/vehicles', data);
export const updateVehicle  = (id, data) => api.put(`/vehicles/${id}`, data);
export const deleteVehicle  = (id)       => api.delete(`/vehicles/${id}`);

// ─── Customers ─────────────────────────────────────
export const getCustomers   = ()         => api.get('/customers');
export const getCustomer    = (id)       => api.get(`/customers/${id}`);
export const createCustomer = (data)     => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id)       => api.delete(`/customers/${id}`);

// ─── Reports ───────────────────────────────────────
export const getDashboardStats = () => api.get('/reports/dashboard');

export default api;
