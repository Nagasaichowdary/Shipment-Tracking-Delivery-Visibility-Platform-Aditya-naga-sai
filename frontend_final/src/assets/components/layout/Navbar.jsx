import { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth";
import NotificationBell from "./NotificationBell";

const titles = {
  "/dashboard": ["Dashboard", ""],
  "/shipments": ["Shipment Management", "Create, monitor, and update shipment lifecycle records"],
  "/shipments/new": ["Create Shipment", "Register a new package into the tracking workflow"],
  "/track": ["Tracking Dashboard", "Search by tracking number and view delivery progress"],
  "/profile": ["Profile & Access", "JWT session preview and role capabilities"],
};

function Navbar() {
  const { auth, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [title, subtitle] = titles[location.pathname] || titles["/dashboard"];

  const initials = (auth?.user?.role || "U")
    .charAt(0)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-meta">{subtitle}</div>
      </div>

      <div className="user-chip">
        {/* Notification bell — placed before the avatar, uses the same auth state */}
        <NotificationBell isAuthenticated={isAuthenticated} />

        <div className="avatar">{initials}</div>
        <div>
          <div>
            <strong>{auth?.user?.role || "User"}</strong>
            <div className="topbar-meta">Shipment Tracker Pro</div>
          </div>
        </div>
        <button className="button danger" onClick={handleLogout} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}

export default Navbar;
