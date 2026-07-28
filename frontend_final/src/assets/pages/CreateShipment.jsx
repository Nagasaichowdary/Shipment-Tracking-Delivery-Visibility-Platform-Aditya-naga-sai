import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/auth";
import { ShipmentContext } from "../context/shipments";

const initialForm = {
  senderName: "",
  senderPhone: "",
  senderCity: "",
  senderPostalCode: "",
  senderCountry: "India",
  receiverName: "",
  receiverPhone: "",
  receiverCity: "",
  receiverPostalCode: "",
  receiverCountry: "India",
  deliveryAddress: "",
  packageType: "General Cargo",
  weight: "",
  eta: "",
  priority: "Standard",
};

const allowedCreateRoles = ["Business Client", "Logistics Operator", "Administrator"];

function CreateShipment() {
  const { auth } = useContext(AuthContext);
  const { createShipment } = useContext(ShipmentContext);
  const [form, setForm] = useState(initialForm);
  const [created, setCreated] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const canCreate = useMemo(() => allowedCreateRoles.includes(auth.user.role), [auth.user.role]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate) return;
    setSubmitting(true);
    setApiError("");
    try {
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

        {/* ── Receiver ─────────────────────────────────── */}
        <h2 className="section-title" style={{ margin: "22px 0 14px" }}>Receiver details</h2>
        <div className="form-grid">
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
