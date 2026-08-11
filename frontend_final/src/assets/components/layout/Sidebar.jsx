import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../context/auth";

// Roles that are allowed to create shipments.
// Customer is intentionally excluded.
const CREATE_SHIPMENT_ROLES = ["Logistics Operator", "Administrator", "Business Client", "Support Agent"];
const ANALYTICS_ROLES       = ["Administrator", "Logistics Operator"];

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: "D" },
  { to: "/shipments", label: "Shipments", icon: "S" },
  { to: "/shipments/new", label: "Create Shipment", icon: "+", allowedRoles: CREATE_SHIPMENT_ROLES },
  { to: "/track", label: "Track", icon: "T" },
  { to: "/profile", label: "Profile", icon: "P" },
];

const adminNavigation = [
  { to: "/dashboard/pending-users", label: "Pending Users", icon: "U" },
  { to: "/dashboard/approved-users", label: "Approved Users", icon: "A" },
  { to: "/dashboard/rejected-users", label: "Rejected Users", icon: "R" },
];

const driverNavigation = [
  { to: "/driver/deliveries", label: "Available Deliveries", icon: "📦" },
  { to: "/driver/history",   label: "Delivery History",     icon: "🏁" },
];

function Sidebar() {
  const { auth } = useContext(AuthContext);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">ST</div>
        <div>
          <div className="brand-title">Shipment Tracker Pro</div>
          <div className="brand-subtitle">Smart Logistics. Smarter Tracking.</div>
        </div>
      </div>

      <div className="nav-section-label">Core</div>
      <nav>
        {navigation
          .filter((item) =>
            // Show item if it has no role restriction, or the current role is allowed.
            !item.allowedRoles || item.allowedRoles.includes(auth?.user?.role)
          )
          .map((item) => (
            <NavLink className="nav-link" key={item.to} to={item.to} end>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>

      {(ANALYTICS_ROLES.includes(auth?.user?.role)) && (
        <>
          <div className="nav-section-label" style={{ marginTop: 24 }}>Analytics</div>
          <nav>
            <NavLink className="nav-link" to="/analytics" end>
              <span className="nav-icon">📊</span>
              <span>Analytics</span>
            </NavLink>
            <NavLink className="nav-link" to="/reports" end>
              <span className="nav-icon">📋</span>
              <span>Reports</span>
            </NavLink>
          </nav>
        </>
      )}

      {auth?.user?.role === "Administrator" && (
        <>
          <div className="nav-section-label" style={{ marginTop: 24 }}>Admin</div>
          <nav>
            {adminNavigation.map((item) => (
              <NavLink className="nav-link" key={item.to} to={item.to} end>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {auth?.user?.role === "Driver" && (
        <>
          <div className="nav-section-label" style={{ marginTop: 24 }}>Driver</div>
          <nav>
            {driverNavigation.map((item) => (
              <NavLink className="nav-link" key={item.to} to={item.to} end>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {auth?.user?.role === "Business Client" && (
        <>
          <div className="nav-section-label" style={{ marginTop: 24 }}>My Workspace</div>
          <nav>
            <NavLink className="nav-link" to="/my-analytics" end>
              <span className="nav-icon">📊</span>
              <span>My Analytics</span>
            </NavLink>
            <NavLink className="nav-link" to="/my-reports" end>
              <span className="nav-icon">📄</span>
              <span>My Reports</span>
            </NavLink>
          </nav>
        </>
      )}


      <div className="nav-section-label">Session</div>
      <div style={{ padding: "0 8px", color: "#dce7f3", fontSize: 14 }}>
        <strong>{auth.user.name}</strong>
        <div style={{ color: "#aab8c7", marginTop: 4 }}>{auth.user.role}</div>
      </div>
    </aside>
  );
}

export default Sidebar;

