import { useCallback, useEffect, useMemo, useState } from "react";
import { ShipmentContext } from "./shipments";
import {
  getAllShipments,
  getCustomerShipments,
  getMyShipments,           // Driver-specific: GET /api/driver/my-shipments
  createShipment as apiCreateShipment,
  updateShipmentStatus as apiUpdateStatus,
} from "../services/api";

// Maps ShipmentStatus enum values from backend to progress %
const statusProgress = {
  CREATED: 12,
  PENDING_DRIVER: 12,
  DRIVER_ASSIGNED: 20,
  PICKED_UP: 28,
  IN_TRANSIT: 58,
  DELAYED: 58,
  OUT_FOR_DELIVERY: 84,
  DELIVERED: 100,
  FAILED_DELIVERY: 72,
  CANCELLED: 0,
  RETURNED: 10,
};

// Display-friendly labels matching the backend enum
const STATUS_LABELS = [
  "PENDING_DRIVER",
  "DRIVER_ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELAYED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_DELIVERY",
  "CANCELLED",
  "RETURNED",
];

/**
 * Normalises a backend ShipmentResponse into the shape the UI expects.
 * The backend returns nested AddressResponse objects and a ShipmentStatus enum.
 * The UI expects flat fields: senderCity, receiverCity, status (string),
 * progress (number), history (array), eta (string), etc.
 */
function normalise(s) {
  return {
    // Identity
    id: s.id,
    trackingNumber: s.trackingNumber,

    // Sender
    senderName: s.senderName,
    senderPhone: s.senderPhone,
    senderCity: s.originAddress?.city || "",

    // Receiver
    receiverName: s.receiverName,
    receiverPhone: s.receiverPhone,
    receiverCity: s.destinationAddress?.city || "",

    // Address details
    deliveryAddress: s.destinationAddress
      ? [
          s.destinationAddress.line1,
          s.destinationAddress.line2,
          s.destinationAddress.city,
          s.destinationAddress.state,
          s.destinationAddress.postalCode,
          s.destinationAddress.country,
        ]
          .filter(Boolean)
          .join(", ")
      : "",

    // Package
    packageType: s.packageType || "",
    weight: s.packageWeight ? `${s.packageWeight} kg` : "",
    shipmentType: s.shipmentType || "",

    // Status & progress
    status: s.shipmentStatus || "CREATED",
    progress: statusProgress[s.shipmentStatus] ?? 0,

    // Dates
    eta: s.expectedDeliveryDate
      ? s.expectedDeliveryDate.slice(0, 10)
      : "",
    createdAt: s.createdAt ? s.createdAt.slice(0, 10) : "",

    // History – the backend does not yet expose a tracking_events table,
    // so we synthesise one entry from the current status and createdAt.
    history: [
      {
        status: s.shipmentStatus || "CREATED",
        location: s.originAddress?.city || "",
        timestamp: s.createdAt || new Date().toISOString(),
      },
    ],

    // Misc
    priority: s.shipmentType || "Standard",
    assignedTo: "",
    cancellationReason: s.cancellationReason || null,
    delayReason: s.delayReason || null,

    // Keep the raw backend object in case any component needs it
    _raw: s,
  };
}

export function ShipmentProvider({ children }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -----------------------------------------------------------------
  // Fetch shipments from the backend on mount.
  //
  // Role → endpoint mapping (all enforced server-side by @PreAuthorize):
  //   CUSTOMER / BUSINESS_CLIENT → GET /api/shipments/my
  //       Returns only shipments where the user is receiver/sender/creator.
  //   DRIVER                     → GET /api/driver/my-shipments
  //       Returns only shipments assigned to this driver (findByAssignedDriver).
  //       Calling GET /api/shipments is @PreAuthorize(ADMIN|DISPATCHER) and
  //       returns 403 for DRIVER — this caused the "0 shipments" bug.
  //   ADMIN / DISPATCHER / other → GET /api/shipments
  //       Returns all shipments in the system.
  //
  // The backend enforces isolation at the repository level; this role check
  // is an additional routing layer, not the primary security guard.
  // -----------------------------------------------------------------
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      // Read role from sessionStorage — the same store AuthContext.jsx uses.
      // AuthContext persists the raw backend role name under the key "role"
      // (e.g. "CUSTOMER", "ADMIN", "DISPATCHER", "DRIVER"). Case-insensitive.
      // Note: localStorage was WRONG — the auth system uses sessionStorage.
      const rawRole    = sessionStorage.getItem("role") || "";
      const upperRole  = rawRole.toUpperCase().replace(/\s+/g, "_");
      const isCustomer = upperRole === "CUSTOMER" || upperRole === "BUSINESS_CLIENT";
      const isDriver   = upperRole === "DRIVER";

      let response;
      if (isCustomer) {
        // GET /api/shipments/my — scoped to authenticated user's own shipments
        response = await getCustomerShipments();
      } else if (isDriver) {
        // GET /api/driver/my-shipments — scoped to this driver's assigned shipments only.
        // Using getAllShipments() here would return 403 (Access Denied) because
        // GET /api/shipments requires ADMIN or DISPATCHER role.
        response = await getMyShipments();
      } else {
        // ADMIN / DISPATCHER — GET /api/shipments returns all system shipments
        response = await getAllShipments();
      }

      const data = Array.isArray(response.data) ? response.data : [];
      setShipments(data.map(normalise));
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load shipments from server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 30-second background refresh.
  // clearInterval in the cleanup ensures no dangling timer on unmount.
  useEffect(() => {
    fetchShipments();                                      // immediate fetch on mount
    const id = setInterval(fetchShipments, 30_000);        // refresh every 30 s
    return () => clearInterval(id);                        // cleanup on unmount
  }, [fetchShipments]);

  // -----------------------------------------------------------------
  // Create shipment – POST to backend, then refresh list
  // -----------------------------------------------------------------
  const createShipment = useCallback(
    async (formData) => {
      // Map the CreateShipment form fields → CreateShipmentRequest DTO
      const payload = {
        senderName: formData.senderName,
        senderPhone: formData.senderPhone,
        receiverName: formData.receiverName,
        receiverPhone: formData.receiverPhone,
        // Link the selected registered customer so Shipment.receiverUser is persisted.
        // When non-null, the backend's resolveOptionalUser() loads the User entity and
        // stores it on the shipment, enabling the Delivery OTP system to retrieve
        // shipment.getReceiverUser().getEmail() at delivery time without null errors.
        receiverUserId: formData.receiverUserId || null,
        // Route receiverEmail to guestEmail based on whether a registered customer was selected.
        // Registered customer (receiverUserId set): guestEmail = null — backend uses receiverUser.email.
        // Guest customer (receiverUserId null):     guestEmail = receiverEmail — stored on shipment
        //                                           and used by Delivery OTP as the email destination.
        guestEmail: formData.receiverUserId ? null : (formData.receiverEmail || null),
        originAddress: {
          line1: formData.senderAddress || formData.senderCity,
          city: formData.senderCity,
          postalCode: formData.senderPostalCode || "000000",
          country: formData.senderCountry || "India",
        },
        destinationAddress: {
          line1: formData.deliveryAddress || formData.receiverCity,
          city: formData.receiverCity,
          postalCode: formData.receiverPostalCode || "000000",
          country: formData.receiverCountry || "India",
        },
        packageWeight: parseFloat(formData.weight) || 1.0,
        shipmentType: formData.priority || "Standard",
        packageType: formData.packageType,
        expectedDeliveryDate: formData.eta ? `${formData.eta}T00:00:00` : null,
      };

      const response = await apiCreateShipment(payload);
      const created = normalise(response.data);
      // Refresh from the backend so the list is always the canonical server state.
      // Do NOT optimistically prepend to local state — fetchShipments will include
      // the new record, and prepending would cause it to appear twice.
      await fetchShipments();
      return created;
    },
    [fetchShipments]
  );

  // -----------------------------------------------------------------
  // Update status – PUT to backend using id, then refresh list
  // -----------------------------------------------------------------
  const updateStatus = useCallback(async (trackingNumber, status, _location, cancellationReason, delayReason) => {
    const shipment = shipments.find((s) => s.trackingNumber === trackingNumber);
    if (!shipment) return;

    await apiUpdateStatus(shipment.id, status, cancellationReason, delayReason);
    // Refresh from backend to get the canonical state
    await fetchShipments();
  }, [shipments, fetchShipments]);

  // -----------------------------------------------------------------
  // Metrics derived from live data
  // -----------------------------------------------------------------
  const metrics = useMemo(() => {
    const total = shipments.length;
    const active = shipments.filter(
      (s) => !["DELIVERED", "CANCELLED"].includes(s.status)
    ).length;
    const delivered = shipments.filter((s) => s.status === "DELIVERED").length;
    const delayed = shipments.filter(
      (s) => s.status === "FAILED_DELIVERY"
    ).length;

    return {
      total,
      active,
      delivered,
      delayed,
      deliveryRate: total ? Math.round((delivered / total) * 100) : 0,
    };
  }, [shipments]);

  const value = useMemo(
    () => ({
      shipments,
      createShipment,
      updateStatus,
      metrics,
      loading,
      error,
      refetch: fetchShipments,
      statuses: STATUS_LABELS,
    }),
    [createShipment, error, fetchShipments, loading, metrics, shipments, updateStatus]
  );

  return (
    <ShipmentContext.Provider value={value}>{children}</ShipmentContext.Provider>
  );
}
