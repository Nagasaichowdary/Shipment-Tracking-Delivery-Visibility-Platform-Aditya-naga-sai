import { createContext } from "react";

export const roleCapabilities = {
  Customer: ["Track shipments", "View personal shipment history", "Manage profile"],
  "Business Client": ["Create shipments", "Track business consignments", "View shipment history"],
  "Logistics Operator": ["Create shipments", "Update shipment status", "Monitor active routes"],
  "Support Agent": ["Search shipments", "Assist customers", "Review tracking history"],
  Administrator: ["Manage users", "Monitor all shipments", "Review role-based access"],
};

export const AuthContext = createContext(null);
