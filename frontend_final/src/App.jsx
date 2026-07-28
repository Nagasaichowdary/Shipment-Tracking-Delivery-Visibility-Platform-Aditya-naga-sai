import { useContext } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Navbar from "./assets/components/layout/Navbar";
import Sidebar from "./assets/components/layout/Sidebar";
import { AuthContext } from "./assets/context/auth";
import { AuthProvider } from "./assets/context/AuthContext";
import { ShipmentProvider } from "./assets/context/ShipmentContext";
import CreateShipment from "./assets/pages/CreateShipment";
import Dashboard from "./assets/pages/Dashboard";
import ForgotPassword from "./assets/pages/ForgotPassword";
import Login from "./assets/pages/Login";
import Profile from "./assets/pages/Profile";
import Register from "./assets/pages/Register";
import ShipmentList from "./assets/pages/ShipmentList";
import TrackShipment from "./assets/pages/TrackShipment";
import OAuth2Success from "./assets/pages/OAuth2Success";
import PendingUsers from "./assets/pages/PendingUsers";
import ApprovedUsers from "./assets/pages/ApprovedUsers";
import RejectedUsers from "./assets/pages/RejectedUsers";
import AvailableDeliveries from "./assets/pages/AvailableDeliveries";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/**
 * Guards a route by role. If the authenticated user's role is not in
 * allowedRoles, they are redirected to /dashboard silently.
 * This prevents direct URL access to restricted pages (e.g. Customer → /shipments/new).
 */
function RoleProtectedRoute({ children, allowedRoles }) {
  const { auth } = useContext(AuthContext);
  const role = auth?.user?.role;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppLayout() {
  return (
    <ProtectedRoute>
      <ShipmentProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="content">
            <Navbar />
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/shipments" element={<ShipmentList />} />
              <Route
                path="/shipments/new"
                element={
                  <RoleProtectedRoute
                    allowedRoles={["Logistics Operator", "Administrator", "Business Client", "Support Agent"]}
                  >
                    <CreateShipment />
                  </RoleProtectedRoute>
                }
              />
              <Route path="/track" element={<TrackShipment />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard/pending-users" element={<PendingUsers />} />
              <Route path="/dashboard/approved-users" element={<ApprovedUsers />} />
              <Route path="/dashboard/rejected-users" element={<RejectedUsers />} />
              <Route
                path="/driver/deliveries"
                element={
                  <RoleProtectedRoute allowedRoles={["Driver"]}>
                    <AvailableDeliveries />
                  </RoleProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </ShipmentProvider>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route path="/dashboard/success" element={<OAuth2Success />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
