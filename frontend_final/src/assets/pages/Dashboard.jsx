import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/auth";
import { ShipmentContext } from "../context/shipments";

const workflowSteps = [
  {
    title: "Shipment intake",
    detail: "Capture sender, receiver, package, address, ETA, priority, and tracking number.",
  },
  {
    title: "Lifecycle updates",
    detail: "Move shipments through Created, Picked Up, In Transit, Out for Delivery, and Delivered.",
  },
  {
    title: "Visibility dashboard",
    detail: "Expose live status, timeline, route summary, and role-aware operational views.",
  },
  {
    title: "Backend-ready contracts",
    detail: "Keep frontend data shaped for Spring Boot APIs, JWT auth, PostgreSQL entities, and RBAC.",
  },
];

const schemaItems = [
  ["users", "id, name, email, passwordHash, role, company"],
  ["shipments", "id, trackingNumber, sender, receiver, package, status, eta"],
  ["tracking_events", "id, shipmentId, status, location, timestamp"],
  ["roles", "id, roleName, permissions"],
  ["notifications", "id, userId, shipmentId, channel, message"],
  ["audit_logs", "id, actorId, action, entity, createdAt"],
];

function Dashboard() {
  const { auth, capabilities } = useContext(AuthContext);
  const { metrics, shipments } = useContext(ShipmentContext);
  const latestShipments = shipments.slice(0, 3);

const roleKey = (auth?.user?.role || "").toLowerCase();
 const roleMap = {
  administrator: {
    eyebrow: "Administrator",
    title: "Administrator Dashboard",
    sub: "Track shipments, view metrics, and manage workflows in real time.",
  },

  customer: {
    eyebrow: "Customer",
    title: "Customer Dashboard",
    sub: "View your orders, tracking status, and delivery ETA.",
  },

  "business client": {
    eyebrow: "Business Client",
    title: "Business Client Dashboard",
    sub: "Manage business shipments, invoices, and batch operations.",
  },

  "logistics operator": {
    eyebrow: "Logistics Operator",
    title: "Logistics Operator Dashboard",
    sub: "Monitor pickups, routes, and delivery progress.",
  },

  "support agent": {
    eyebrow: "Support Agent",
    title: "Support Agent Dashboard",
    sub: "Assist customers and resolve shipment issues.",
  },

  driver: {
    eyebrow: "Driver",
    title: "Driver Dashboard",
    sub: "View assigned deliveries, update statuses, and log delivery events.",
  },
};

  const { eyebrow, title, sub } = roleMap[roleKey] || roleMap["administrator"];
  const roleColors = {
  administrator: "#2563eb",
  customer: "#10b981",
  "business client": "#7c3aed",
  "logistics operator": "#f97316",
  "support agent": "#0ea5e9",
  driver: "#059669",
};
  const roleColor = roleColors[roleKey] || roleColors.administrator;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className="role-badge"
              style={{
                background: roleColor,
                color: "#fff",
                borderRadius: 8,
                padding: "6px 12px",
                fontWeight: 700,
                textTransform: "capitalize",
                fontSize: 18,
              }}
            >
              {title}
            </div>
          </div>
        </div>
        <Link className="button primary" to="/shipments/new">
          + New shipment
        </Link>
      </div>

      <section className="grid grid-4">
        <div className="metric-card">
          <div className="metric-label">Total shipments</div>
          <div className="metric-value">{metrics.total}</div>
          <div className="metric-note">Seeded and newly created records</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active shipments</div>
          <div className="metric-value">{metrics.active}</div>
          <div className="metric-note">Currently moving through workflow</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Delivered</div>
          <div className="metric-value">{metrics.delivered}</div>
          <div className="metric-note">{metrics.deliveryRate}% completion rate</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">RBAC role</div>
          <div className="metric-value" style={{ fontSize: 22 }}>
            {auth.user.role}
          </div>
          <div className="metric-note">Access mapped by backend</div>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="panel">
          <h2 className="section-title">Logistics Workflow</h2>
          <div className="workflow-list">
            {workflowSteps.map((step, index) => (
              <div className="workflow-step" key={step.title}>
                <div className="step-number">{index + 1}</div>
                <div>
                  <strong>{step.title}</strong>
                  <p className="subtle" style={{ margin: "4px 0 0" }}>
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">Your Role Access</h2>
          <div className="workflow-list">
            {capabilities.map((capability, index) => (
              <div className="workflow-step" key={capability}>
                <div className="step-number">{index + 1}</div>
                <div>
                  <strong>{capability}</strong>
                  <p className="subtle" style={{ margin: "4px 0 0" }}>
                    Enabled for {auth.user.role}.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="panel">
          <h2 className="section-title">Database Schema Plan</h2>
          <div className="schema-grid">
            {schemaItems.map(([name, fields]) => (
              <div className="schema-box" key={name}>
                <strong>{name}</strong>
                <p className="subtle" style={{ margin: "8px 0 0", fontSize: 13 }}>
                  {fields}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="toolbar">
            <h2 className="section-title" style={{ margin: 0 }}>
              Recent Tracking Activity
            </h2>
            <Link className="button ghost" to="/track">
              Open tracker
            </Link>
          </div>
          <div className="workflow-list">
            {latestShipments.map((shipment) => (
              <div className="shipment-card" key={shipment.id}>
                <div className="toolbar" style={{ marginBottom: 10 }}>
                  <strong>{shipment.trackingNumber}</strong>
                  <span className={`badge ${shipment.status.toLowerCase().replaceAll("_", "-")}`}>
                    {shipment.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="route-strip">
                  <div className="route-city">{shipment.senderCity}</div>
                  <div className="route-arrow">to</div>
                  <div className="route-city">{shipment.receiverCity}</div>
                </div>
                <div className="progress-track" style={{ marginTop: 12 }}>
                  <div className="progress-fill" style={{ width: `${shipment.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
