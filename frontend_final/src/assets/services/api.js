import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8080/api",
});


API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
// Authentication APIs
export const login = (data) => API.post("/auth/login", data);

export const googleLoginApi = (token) => API.post("/auth/google", { token });

export const sendRegistrationOtp = (email) => API.post("/auth/send-registration-otp", { email });

export const verifyRegistrationOtp = (email, otp) => API.post("/auth/verify-registration-otp", { email, otp });

export const register = (data) => API.post("/auth/register", data);

// Roles
export const getRoles = () => API.get("/roles");

// Admin
export const getPendingUsers = () => API.get("/admin/pending-users");

export const getApprovedUsers = () => API.get("/admin/approved-users");

export const getRejectedUsers = () => API.get("/admin/rejected-users");

export const approveUser = (id) => API.put(`/admin/approve/${id}`);

export const rejectUser = (id) => API.put(`/admin/reject/${id}`);

// Shipments
export const getAllShipments = () => API.get("/shipments");

export const getShipmentById = (id) => API.get(`/shipments/${id}`);

export const createShipment = (data) => API.post("/shipments", data);

export const updateShipment = (id, data) => API.put(`/shipments/${id}`, data);

export const updateShipmentStatus = (id, status, cancellationReason, delayReason) =>
  API.patch(`/shipments/${id}/status`, {
    status,
    ...(cancellationReason ? { cancellationReason } : {}),
    ...(delayReason ? { delayReason } : {}),
  });

export const deleteShipment = (id) => API.delete(`/shipments/${id}`);

export const getShipmentDriver = (id) => API.get(`/shipments/${id}/driver`);

// Driver's live device location (separate from shipment parcel location)
export const getShipmentDriverLocation = (id) => API.get(`/shipments/${id}/driver-location`);

// Shipment's own last-known parcel location
export const getShipmentLocation = (id) => API.get(`/shipments/${id}/location`);

export const updateShipmentLocation = (id, data) => API.post(`/shipments/${id}/location`, data);

export const getShipmentDelay = (id) => API.get(`/shipments/${id}/delay`);


// Driver Delivery Request (Phase 1)
export const getAvailableShipments = () => API.get("/driver/available-shipments");

export const acceptShipment = (shipmentId) => API.post(`/driver/accept/${shipmentId}`);

export const rejectShipmentRequest = (shipmentId) => API.post(`/driver/reject/${shipmentId}`);

export const getMyShipments = () => API.get("/driver/my-shipments");

/** Updates the authenticated driver's GPS location via PUT /api/drivers/location */
export const updateDriverLocation = (data) => API.put("/drivers/location", data);

// ForgotPassword
export const forgotPassword = (data) => API.post("/auth/forgot-password", data);

export const verifyOtp = (data) => API.post("/auth/verify-otp", data);

export const resetPassword = (data) => API.post("/auth/reset-password", data);

// Notifications
export const getNotifications = () => API.get("/notifications");

export const getUnreadNotificationCount = () => API.get("/notifications/unread-count");

export const markNotificationAsRead = (notificationId) =>
  API.put(`/notifications/${notificationId}/read`);

export const markAllNotificationsAsRead = () => API.put("/notifications/read-all");

export default API;