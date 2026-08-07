import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/auth";
import { ShipmentContext } from "../context/shipments";
import { getRegisteredCustomers } from "../services/api";

const initialForm = {
  senderName: "",
  senderPhone: "",
  senderCity: "",
  senderPostalCode: "",
  senderCountry: "India",
  receiverName: "",
  receiverPhone: "",
  // Single email field used for both scenarios:
  //   • Registered customer selected → auto-filled (read-only), maps to receiverUser.email on backend
  //   • No customer selected        → operator enters (required), sent as guestEmail to backend
  receiverEmail: "",
  receiverCity: "",
  receiverPostalCode: "",
  receiverCountry: "India",
  deliveryAddress: "",
  packageType: "General Cargo",
  weight: "",
  eta: "",
  priority: "Standard",
  // Delivery OTP link: set when a registered customer is selected from the
  // dropdown. Sent to the backend as receiverUserId so ShipmentServiceImpl
  // can call resolveOptionalUser() and persist Shipment.receiverUser.
  receiverUserId: null,
};

const allowedCreateRoles = ["Business Client", "Logistics Operator", "Administrator"];

function CreateShipment() {
  const { auth } = useContext(AuthContext);
  const { createShipment } = useContext(ShipmentContext);
  const [form, setForm] = useState(initialForm);
  const [created, setCreated] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // ── Registered Customer dropdown state ────────────────────────────────
  // customers: list of approved CUSTOMER accounts fetched from GET /api/customers
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Fetch the customer list once on mount so the dropdown is ready immediately.
  useEffect(() => {
    setCustomersLoading(true);
    getRegisteredCustomers()
      .then((res) => setCustomers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCustomers([]))
      .finally(() => setCustomersLoading(false));
  }, []);

  const canCreate = useMemo(() => allowedCreateRoles.includes(auth.user.role), [auth.user.role]);

  // Generic handler for text / select / textarea inputs
  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  /**
   * Handles selection of a registered customer from the dropdown.
   * When a customer is selected:
   *   - receiverUserId is stored (sent to backend as the FK link)
   *   - receiverName is auto-filled with the customer's full name
   *   - receiverPhone is auto-filled with the customer's phone
   * When reset back to "Select customer...", all three fields are cleared.
   */
  const handleCustomerSelect = (event) => {
    const selectedId = event.target.value;
    if (!selectedId) {
      // Operator cleared the selection — reset ALL customer-linked fields
      // so no stale customer information remains in the form.
      setForm((current) => ({
        ...current,
        receiverUserId: null,
        receiverName: "",
        receiverPhone: "",
        receiverEmail: "",
      }));
      return;
    }
    const customer = customers.find((c) => String(c.id) === selectedId);
    if (!customer) return;
    setForm((current) => ({
      ...current,
      receiverUserId: customer.id,
      // Auto-fill for convenience; Name and Phone remain editable.
      receiverName:  customer.fullName || `${customer.firstName} ${customer.lastName}`.trim(),
      receiverPhone: customer.phone || current.receiverPhone,
      // Email is auto-filled from the registered account and made READ-ONLY
      // so operators cannot accidentally change it to an incorrect address.
      receiverEmail: customer.email || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate) return;
    setSubmitting(true);
    setApiError("");
    try {
      console.log("FORM BEFORE CREATE:", form);
      const shipment = await createShipment(form);
      setCreated(shipment);
      setForm(initialForm);
    } catch (err) {
      setApiError(err.response?.data?.message || "Failed to create shipment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Shipment management</div>
          <h1>Create shipment</h1>
          <p className="subtle">Capture sender, receiver, package, ETA, and delivery information.</p>
        </div>
        <Link className="button secondary" to="/shipments">
          View shipments
        </Link>
      </div>

      {!canCreate && (
        <div className="alert error" style={{ marginBottom: 18 }}>
          Your current role can view and track shipments but cannot create new records.
        </div>
      )}

      {created && (
        <div className="alert success" style={{ marginBottom: 18 }}>
          Shipment <strong>{created.trackingNumber}</strong> created and saved to the database.
        </div>
      )}

      {apiError && (
        <div style={{ color: "#b91c1c", marginBottom: 16 }}>{apiError}</div>
      )}

      <form className="panel" onSubmit={handleSubmit}>
        {/* ── Sender ───────────────────────────────────── */}
        <h2 className="section-title" style={{ marginBottom: 14 }}>Sender details</h2>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="senderName">Sender name</label>
            <input
              className="input"
              disabled={!canCreate}
              id="senderName"
              name="senderName"
              onChange={handleChange}
              required
              placeholder="Enter Sender Name"
              value={form.senderName}
            />
          </div>

          <div className="form-field">
            <label htmlFor="senderPhone">Sender phone</label>
            <input
              className="input"
              disabled={!canCreate}
              id="senderPhone"
              name="senderPhone"
              onChange={handleChange}
              required
              placeholder="+91 98765 43210"
              value={form.senderPhone}
            />
          </div>

          <div className="form-field">
            <label htmlFor="senderCity">Sender city</label>
            <input
              className="input"
              disabled={!canCreate}
              id="senderCity"
              name="senderCity"
              onChange={handleChange}
              required
              placeholder="Mumbai"
              value={form.senderCity}
            />
          </div>

          <div className="form-field">
            <label htmlFor="senderPostalCode">Sender postal code</label>
            <input
              className="input"
              disabled={!canCreate}
              id="senderPostalCode"
              name="senderPostalCode"
              onChange={handleChange}
              required
              placeholder="400001"
              value={form.senderPostalCode}
            />
          </div>
        </div>

        {/* ── Receiver ─────────────────────────────── */}
        <h2 className="section-title" style={{ margin: "22px 0 14px" }}>Receiver details</h2>
        <div className="form-grid">

          {/* Registered Customer dropdown — optional but recommended.
              Selecting a customer sets receiverUserId (FK link), auto-fills
              receiverName and receiverPhone, and enables the Delivery OTP system
              to send the verification code to the customer's registered email. */}
          <div className="form-field full">
            <label htmlFor="receiverCustomer">
              Registered Customer
              <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>
                (optional — enables Delivery OTP)
              </span>
            </label>
            <select
              className="select"
              id="receiverCustomer"
              name="receiverCustomer"
              disabled={!canCreate || customersLoading}
              value={form.receiverUserId ?? ""}
              onChange={handleCustomerSelect}
            >
              <option value="">
                {customersLoading ? "Loading customers…" : "— Select registered customer (optional) —"}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName || `${c.firstName} ${c.lastName}`.trim()}
                  {c.email ? ` — ${c.email}` : ""}
                </option>
              ))}
            </select>
            {form.receiverUserId && (
              <p style={{ fontSize: 12, color: "var(--brand)", marginTop: 4 }}>
                ✔ Customer linked — Delivery OTP will be sent to this customer's registered email.
              </p>
            )}
            {!form.receiverUserId && customers.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Select a customer to enable Delivery OTP verification. Leave blank to create without customer link.
              </p>
            )}
          </div>

          {/* Receiver name — auto-filled when a customer is selected, editable manually */}
          <div className="form-field">
            <label htmlFor="receiverName">Receiver name</label>
            <input
              className="input"
              disabled={!canCreate}
              id="receiverName"
              name="receiverName"
              onChange={handleChange}
              required
              placeholder="Enter Receiver Name"
              value={form.receiverName}
            />
          </div>

          {/* Receiver phone */}
          <div className="form-field">
            <label htmlFor="receiverPhone">Receiver phone</label>
            <input
              className="input"
              disabled={!canCreate}
              id="receiverPhone"
              name="receiverPhone"
              onChange={handleChange}
              required
              placeholder="+91 98765 43210"
              value={form.receiverPhone}
            />
          </div>

          {/* Receiver email
              • Registered customer selected: auto-filled from account, READ-ONLY.
              • Guest customer (no selection): operator enters email, REQUIRED.
              This single field maps to guestEmail in the backend payload when
              receiverUserId is null; ignored (null sent) when receiverUserId is set. */}
          <div className="form-field">
            <label htmlFor="receiverEmail">
              Receiver email
              {form.receiverUserId
                ? <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>(registered account — read only)</span>
                : <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>
              }
            </label>
            <input
              className="input"
              id="receiverEmail"
              name="receiverEmail"
              type="email"
              placeholder={form.receiverUserId ? "" : "receiver@example.com"}
              value={form.receiverEmail}
              onChange={handleChange}
              // Read-only when a registered customer is selected (email belongs to their account).
              // Required and editable when no customer is selected (guest email needed for OTP).
              readOnly={!!form.receiverUserId}
              required={!form.receiverUserId}
              disabled={!canCreate}
              style={form.receiverUserId ? { background: "var(--subtle, #f8fafc)", cursor: "not-allowed" } : {}}
            />
          </div>

          <div className="form-field">
            <label htmlFor="receiverCity">Receiver city</label>
            <input
              className="input"
              disabled={!canCreate}
              id="receiverCity"
              name="receiverCity"
              onChange={handleChange}
              required
              placeholder="Delhi"
              value={form.receiverCity}
            />
          </div>

          <div className="form-field">
            <label htmlFor="receiverPostalCode">Receiver postal code</label>
            <input
              className="input"
              disabled={!canCreate}
              id="receiverPostalCode"
              name="receiverPostalCode"
              onChange={handleChange}
              required
              placeholder="110001"
              value={form.receiverPostalCode}
            />
          </div>

          <div className="form-field full">
            <label htmlFor="deliveryAddress">Delivery address</label>
            <textarea
              className="textarea"
              disabled={!canCreate}
              id="deliveryAddress"
              name="deliveryAddress"
              onChange={handleChange}
              required
              placeholder="Plot 42, Okhla Industrial Estate, New Delhi"
              value={form.deliveryAddress}
            />
          </div>
        </div>

        {/* ── Package ──────────────────────────────────── */}
        <h2 className="section-title" style={{ margin: "22px 0 14px" }}>Package details</h2>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="packageType">Package type</label>
            <select
              className="select"
              disabled={!canCreate}
              id="packageType"
              name="packageType"
              onChange={handleChange}
              value={form.packageType}
            >
              <option>General Cargo</option>
              <option>Electronics</option>
              <option>Medical Supplies</option>
              <option>Furniture</option>
              <option>Documents</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="weight">Package weight (kg)</label>
            <input
              className="input"
              disabled={!canCreate}
              id="weight"
              name="weight"
              onChange={handleChange}
              placeholder="12"
              required
              type="number"
              min="0.1"
              step="0.1"
              value={form.weight}
            />
          </div>

          <div className="form-field">
            <label htmlFor="eta">Estimated delivery date</label>
            <input
              className="input"
              disabled={!canCreate}
              id="eta"
              name="eta"
              onChange={handleChange}
              required
              type="date"
              value={form.eta}
            />
          </div>

          <div className="form-field">
            <label htmlFor="priority">Priority / shipment type</label>
            <select
              className="select"
              disabled={!canCreate}
              id="priority"
              name="priority"
              onChange={handleChange}
              value={form.priority}
            >
              <option>Standard</option>
              <option>Express</option>
              <option>Critical</option>
            </select>
          </div>
        </div>

        <div className="toolbar" style={{ margin: "22px 0 0" }}>
          <button
            className="button primary"
            disabled={!canCreate || submitting}
            type="submit"
          >
            {submitting ? "Creating…" : "Create shipment"}
          </button>
          <button
            className="button secondary"
            disabled={!canCreate || submitting}
            onClick={() => setForm(initialForm)}
            type="button"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateShipment;
