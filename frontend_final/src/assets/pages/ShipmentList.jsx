import { useContext, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth";
import { ShipmentContext } from "../context/shipments";

// Only Logistics Operator may update shipment status (requirement #1).
// Administrator and all other roles get a read-only badge (see render below).
const editableRoles = ["Logistics Operator"];

function statusClass(status) {
  // Backend returns ENUM values like IN_TRANSIT; CSS badges use kebab-case
  return status.toLowerCase().replaceAll("_", "-");
}

function ShipmentList() {
  const { auth } = useContext(AuthContext);
  const { shipments, statuses, updateStatus, metrics } = useContext(ShipmentContext);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  
  // State for cancellation modal
  const [cancellingShipment, setCancellingShipment] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // State for delay reason modal (mirrors cancellation pattern exactly)
  const [delayingShipment, setDelayingShipment] = useState(null);
  const [delayReason, setDelayReason] = useState("Heavy Traffic");
  const [customDelayReason, setCustomDelayReason] = useState("");



  const canEditStatus = editableRoles.includes(auth.user.role);
  // RBAC: same pattern as Dashboard line 112 — Customer and Driver cannot create shipments.
  const roleKey = (auth.user.role || "").toLowerCase();
  const canCreateShipment = roleKey !== "customer" && roleKey !== "driver";

  const filteredShipments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return shipments.filter((shipment) => {
      const matchesStatus = status === "All" || shipment.status === status;  // status is backend enum
      const searchable = [
        shipment.trackingNumber,
        shipment.senderName,
        shipment.receiverName,
        shipment.senderCity,
        shipment.receiverCity,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, shipments, status]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Shipment management</div>
          <h1>Management dashboard</h1>
          <p className="subtle">Filter shipments, review route progress, and update lifecycle status.</p>
        </div>
        {canCreateShipment && (
          <Link className="button primary" to="/shipments/new">
            + New shipment
          </Link>
        )}
      </div>

      <section className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="metric-card">
          <div className="metric-label">Total</div>
          <div className="metric-value">{metrics.total}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active</div>
          <div className="metric-value">{metrics.active}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Delivered</div>
          <div className="metric-value">{metrics.delivered}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Delayed or failed</div>
          <div className="metric-value">{metrics.delayed}</div>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <div className="filters">
            <input
              className="input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tracking, sender, receiver, city"
              style={{ minWidth: 300 }}
              value={query}
            />
            <select className="select" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option>All</option>
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <span className="subtle">{filteredShipments.length} visible records</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tracking</th>
                <th>Route</th>
                <th>Package</th>
                <th>Status</th>
                <th>Progress</th>
                <th>ETA</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>
                    <strong>{shipment.trackingNumber}</strong>
                    <div className="subtle" style={{ fontSize: 12 }}>
                      {shipment.id}
                    </div>
                  </td>
                  <td>
                    <strong>{shipment.senderCity}</strong> to <strong>{shipment.receiverCity}</strong>
                    <div className="subtle" style={{ fontSize: 12 }}>
                      {shipment.receiverName}
                    </div>
                  </td>
                  <td>
                    {shipment.packageType || "-"}
                    <div className="subtle" style={{ fontSize: 12 }}>
                      {shipment.weight} · {shipment.priority}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${statusClass(shipment.status)}`}>
                      {shipment.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ minWidth: 150 }}>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${shipment.progress}%` }} />
                    </div>
                    <div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>
                      {shipment.progress}% complete
                    </div>
                  </td>
                  <td>{shipment.eta}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      {canEditStatus ? (
                        (() => {
                          return (
                            <select
                              className="select"
                              onChange={async (event) => {
                                const newStatus = event.target.value;
                                if (newStatus === "CANCELLED") {
                                  setCancellingShipment(shipment);
                                  setCancellationReason("Driver unavailable");
                                  setCustomReason("");
                                } else if (newStatus === "DELAYED") {
                                  setDelayingShipment(shipment);
                                  setDelayReason("Heavy Traffic");
                                  setCustomDelayReason("");
                                } else {
                                  try {
                                    await updateStatus(shipment.trackingNumber, newStatus, shipment.receiverCity);
                                  } catch (err) {
                                    console.error("Status update failed:", err?.response?.data?.message || err);
                                  }
                                }
                              }}
                              title="Update shipment status"
                              value={shipment.status}
                            >
                              {statuses.map((item) => (
                                <option key={item}>{item}</option>
                              ))}
                            </select>
                          );
                        })()
                      ) : (
                        <button
                          className="button secondary"
                          onClick={() => navigate("/track", { state: { trackingNumber: shipment.trackingNumber } })}
                          type="button"
                        >
                          Track
                        </button>
                      )}
                      <button
                        className="btn-route-history"
                        title="View full route history"
                        type="button"
                        onClick={() =>
                          navigate(`/shipments/${shipment.trackingNumber}/route-history`)
                        }
                      >
                        🗺 History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredShipments.length === 0 && (
          <div className="empty-state">No shipments match the selected filters.</div>
        )}
      </section>

      {/* Cancellation Modal */}
      {cancellingShipment && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999
        }}>
          <div className="panel" style={{ width: 400, padding: 24, background: "#fff", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 16px" }}>Cancel Shipment</h3>
            <p style={{ margin: "0 0 16px", fontSize: 14 }}>
              Please select a reason for cancelling shipment <strong>{cancellingShipment.trackingNumber}</strong>.
            </p>
            <select 
              className="select" 
              style={{ width: "100%", marginBottom: 16 }}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            >
              <option value="Driver unavailable">Driver unavailable</option>
              <option value="Customer requested cancellation">Customer requested cancellation</option>
              <option value="Vehicle breakdown">Vehicle breakdown</option>
              <option value="Weather conditions">Weather conditions</option>
              <option value="Address not serviceable">Address not serviceable</option>
              <option value="Payment issue">Payment issue</option>
              <option value="Other">Other (custom reason)</option>
            </select>
            
            {cancellationReason === "Other" && (
              <input
                className="input"
                style={{ width: "100%", marginBottom: 16 }}
                placeholder="Enter custom reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            )}
            
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button 
                className="button secondary" 
                onClick={() => setCancellingShipment(null)}
              >
                Go Back
              </button>
              <button 
                className="button primary" 
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
                disabled={cancellationReason === "Other" && !customReason.trim()}
                onClick={() => {
                  const finalReason = cancellationReason === "Other" ? customReason.trim() : cancellationReason;
                  updateStatus(cancellingShipment.trackingNumber, "CANCELLED", cancellingShipment.receiverCity, finalReason);
                  setCancellingShipment(null);
                }}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delay Reason Modal — mirrors Cancellation modal exactly */}
      {delayingShipment && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999
        }}>
          <div className="panel" style={{ width: 400, padding: 24, background: "#fff", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 16px" }}>Mark Shipment as Delayed</h3>
            <p style={{ margin: "0 0 16px", fontSize: 14 }}>
              Please select a delay reason for shipment <strong>{delayingShipment.trackingNumber}</strong>.
            </p>
            <select
              className="select"
              style={{ width: "100%", marginBottom: 16 }}
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
            >
              <option value="Heavy Traffic">Heavy Traffic</option>
              <option value="Severe Weather Conditions">Severe Weather Conditions</option>
              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
              <option value="Driver Delay">Driver Delay</option>
              <option value="Road Closure">Road Closure</option>
              <option value="Accident on Route">Accident on Route</option>
              <option value="Package Verification Delay">Package Verification Delay</option>
              <option value="Loading Delay">Loading Delay</option>
              <option value="Warehouse Processing Delay">Warehouse Processing Delay</option>
              <option value="Operational Issue">Operational Issue</option>
              <option value="Customs Clearance Delay">Customs Clearance Delay</option>
              <option value="Other">Other (custom reason)</option>
            </select>

            {delayReason === "Other" && (
              <input
                className="input"
                style={{ width: "100%", marginBottom: 16 }}
                placeholder="Enter custom delay reason..."
                value={customDelayReason}
                onChange={(e) => setCustomDelayReason(e.target.value)}
              />
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="button secondary"
                onClick={() => setDelayingShipment(null)}
              >
                Go Back
              </button>
              <button
                className="button primary"
                style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
                disabled={delayReason === "Other" && !customDelayReason.trim()}
                onClick={() => {
                  const finalReason = delayReason === "Other" ? customDelayReason.trim() : delayReason;
                  updateStatus(delayingShipment.trackingNumber, "DELAYED", delayingShipment.receiverCity, null, finalReason);
                  setDelayingShipment(null);
                }}
              >
                Confirm Delay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ShipmentList;
