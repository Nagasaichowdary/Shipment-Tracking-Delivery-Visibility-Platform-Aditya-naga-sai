import axios from "axios";

export const API = axios.create({
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
/** Admin / Logistics Operator: returns ALL shipments in the system */
export const getAllShipments = () => API.get("/shipments");

/**
 * Customer / Business Client: returns ONLY shipments belonging to the
 * authenticated user (those where they are the registered receiver or sender).
 * The userId is derived from the JWT on the backend — never passed as a param.
 */
export const getCustomerShipments = () => API.get("/shipments/my");

export const getShipmentById = (id) => API.get(`/shipments/${id}`);

export const createShipment = (data) => API.post("/shipments", data);

/**
 * Fetches all approved registered customers from the dedicated Customer API.
 * Used to populate the "Registered Customer" dropdown on the Shipment Creation
 * page. The selected customer's ID is sent as receiverUserId when creating a
 * shipment, which links Shipment.receiverUser so the Delivery OTP system can
 * retrieve shipment.receiverUser.getEmail() at delivery time.
 *
 * GET /api/customers
 */
export const getRegisteredCustomers = () => API.get("/customers");


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

/** Returns all DELIVERED shipments for the authenticated driver, sorted newest-first. */
export const getDeliveryHistory = () => API.get("/driver/delivery-history");

/**
 * Downloads the Proof of Delivery PDF for a shipment.
 * The JWT is forwarded automatically by the Axios interceptor.
 *
 * @param {number} shipmentId - DB id of the delivered shipment
 * @returns {Promise<Blob>} PDF blob
 */
export const downloadPodPdf = (shipmentId) =>
  API.get(`/shipments/${shipmentId}/proof-of-delivery/pdf`, {
    responseType: "blob",
  });

/** Updates the authenticated driver's GPS location via PUT /api/drivers/location */
export const updateDriverLocation = (data) => API.put("/drivers/location", data);

// Milestone 3: Delivery Confirmation + Proof of Delivery (POD)
// Accepts a FormData object containing: receiverName, deliveryRemarks (optional),
// signature (Blob/File, PNG), photo (File, JPG|PNG ≤ 5 MB).
export const confirmDelivery = (shipmentId, formData) =>
  API.post(`/shipments/${shipmentId}/confirm-delivery`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Milestone 4: Delivery OTP — Customer Identity Verification
// Generates a 6-digit OTP and emails it to the registered customer's email.
// The driver never supplies the email — backend fetches it from the shipment.
export const generateDeliveryOtp = (shipmentId) =>
  API.post("/driver/delivery-otp/generate", { shipmentId });

// Verifies the OTP entered by the driver. On success the backend records the
// shipment as OTP-verified, which unlocks the confirmDelivery endpoint.
export const verifyDeliveryOtp = (shipmentId, otp) =>
  API.post("/driver/delivery-otp/verify", {
    shipmentId: String(shipmentId),
    otp: String(otp),
  });


/**
 * Builds the URL used to display a Proof of Delivery image (signature or photo)
 * inside an <img> tag. The token is forwarded as a Bearer header via an Axios
 * interceptor when loaded through the API instance, but since <img src> cannot
 * set headers we instead fetch the image as a blob and convert to an object URL.
 *
 * @param {number} shipmentId - DB id of the delivered shipment
 * @param {string} relativePath - value stored in DB, e.g. "delivery/SHIP-ABC/signature.png"
 * @returns {Promise<string>} object URL safe for <img src>
 */
export const fetchPodImage = async (shipmentId, relativePath) => {
  // Extract only the filename from the relative path stored in DB
  const filename = relativePath.split("/").pop();
  const response = await API.get(`/shipments/${shipmentId}/pod/${filename}`, {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
};



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

// ─── Analytics Dashboard ──────────────────────────────────────────────────────
// period: "today" | "week" | "month" | "all"   (default on backend: "month")
// limit:  max items returned for ranked lists   (default: 5, max: 20)

/** KPI cards — GET /api/analytics/overview */
export const getAnalyticsOverview = (period = "month") =>
  API.get("/analytics/overview", { params: { period } });

/** Chart datasets — GET /api/analytics/charts */
export const getAnalyticsCharts = (period = "month", limit = 5) =>
  API.get("/analytics/charts", { params: { period, limit } });

/** Recent activity feed — GET /api/analytics/activity */
export const getAnalyticsActivity = (limit = 10) =>
  API.get("/analytics/activity", { params: { limit } });

// ─── Delivery Reports ──────────────────────────────────────────────────────────
// period: "today" | "week" | "month" | "all"
// from/to: ISO date strings "YYYY-MM-DD" (optional — override period)
// format: "pdf" | "excel" | "csv"

/** Delivery Summary KPIs + trends — GET /api/reports/summary */
export const getDeliverySummary = (period = "month", from = null, to = null) =>
  API.get("/reports/summary", { params: { period, ...(from && { from }), ...(to && { to }) } });

/** Paginated shipment list with breakdowns — GET /api/reports/shipments */
export const getShipmentReport = (params = {}) =>
  API.get("/reports/shipments", { params });

/** Driver performance rankings — GET /api/reports/drivers */
export const getDriverReport = (period = "all", limit = 20) =>
  API.get("/reports/drivers", { params: { period, limit } });

/** Business client statistics — GET /api/reports/clients */
export const getClientReport = (period = "month", from = null, to = null) =>
  API.get("/reports/clients", { params: { period, ...(from && { from }), ...(to && { to }) } });

/** Route corridor performance — GET /api/reports/routes */
export const getRouteReport = (period = "month", limit = 10) =>
  API.get("/reports/routes", { params: { period, limit } });

/**
 * Export a report as PDF, Excel, or CSV — GET /api/reports/export
 * Returns a Blob for client-side download.
 *
 * @param {string} reportType "summary" | "shipments" | "drivers" | "clients" | "routes"
 * @param {string} format     "pdf" | "excel" | "csv"
 * @param {string} period     "today" | "week" | "month" | "all"
 * @param {string|null} from  ISO date string or null
 * @param {string|null} to    ISO date string or null
 */
export const exportReport = (reportType, format, period = "month", from = null, to = null) =>
  API.get("/reports/export", {
    params: { reportType, format, period, ...(from && { from }), ...(to && { to }) },
    responseType: "blob",
  });

// ─── Business Client: My Analytics & My Reports ───────────────────────────────
// All /api/my/* endpoints are secured by ROLE_BUSINESS_CLIENT JWT on the backend.
// The userId is NEVER sent from the frontend — the backend extracts it from the JWT.

/**
 * Returns analytics KPIs and chart data for the logged-in Business Client.
 * GET /api/my/analytics?period=all
 */
export const getMyAnalytics = (period = "all", from = null, to = null) =>
  API.get("/my/analytics", {
    params: { period, ...(from && { from }), ...(to && { to }) },
  });

/**
 * Returns paginated shipment report for the logged-in Business Client.
 * GET /api/my/reports?period=all&status=&page=0&size=20
 */
export const getMyReport = (params = {}) =>
  API.get("/my/reports", { params });

/**
 * Exports the Business Client's own shipments as PDF, Excel, or CSV.
 * GET /api/my/reports/export?format=pdf&period=all
 * Returns a Blob for client-side download.
 */
export const exportMyReport = (format = "csv", period = "all", from = null, to = null, status = null) =>
  API.get("/my/reports/export", {
    params: {
      format,
      period,
      ...(from && { from }),
      ...(to && { to }),
      ...(status && { status }),
    },
    responseType: "blob",
  });

export default API;