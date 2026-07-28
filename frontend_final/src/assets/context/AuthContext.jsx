import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext, roleCapabilities } from "./auth";

export const mapRole = (role) => {
  if (!role) return "Customer";
  const upper = role.toUpperCase().replace(/\s+/g, "_");
  if (upper === "ADMIN") return "Administrator";
  if (upper === "CUSTOMER") return "Customer";
  if (upper === "BUSINESS_CLIENT") return "Business Client";
  if (upper === "DISPATCHER" || upper === "LOGISTICS_OPERATOR") return "Logistics Operator";
  if (upper === "DRIVER") return "Driver";
  if (upper === "SUPPORT_AGENT") return "Support Agent";
  return role;
};

const getStoredAuth = () => {
  try {
    const token = sessionStorage.getItem("token");
    const rawRole = sessionStorage.getItem("role");
    const firstName = sessionStorage.getItem("firstName") || "";
    const lastName = sessionStorage.getItem("lastName") || "";
    const email = sessionStorage.getItem("email") || "";

    if (!token) {
      return null;
    }

    const role = mapRole(rawRole);

    return {
      token,
      user: {
        role,
        firstName,
        lastName,
        email,
        name: firstName ? `${firstName} ${lastName}`.trim() : role,
      },
    };
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getStoredAuth);

  useEffect(() => {
    if (auth?.token) {
      sessionStorage.setItem("token", auth.token);
      if (auth.user?.role) {
        sessionStorage.setItem("role", auth.user.role);
      }
      if (auth.user?.firstName) {
        sessionStorage.setItem("firstName", auth.user.firstName);
      } else {
        sessionStorage.removeItem("firstName");
      }
      if (auth.user?.lastName) {
        sessionStorage.setItem("lastName", auth.user.lastName);
      } else {
        sessionStorage.removeItem("lastName");
      }
      if (auth.user?.email) {
        sessionStorage.setItem("email", auth.user.email);
      } else {
        sessionStorage.removeItem("email");
      }
    } else {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("firstName");
      sessionStorage.removeItem("lastName");
      sessionStorage.removeItem("email");
    }
  }, [auth]);

  const logout = useCallback(() => setAuth(null), []);

  const updateAuth = useCallback((token, role, userDetails = {}) => {
    const mappedRole = mapRole(role);
    setAuth({
      token,
      user: {
        role: mappedRole,
        firstName: userDetails.firstName || "",
        lastName: userDetails.lastName || "",
        email: userDetails.email || "",
        name: userDetails.firstName ? `${userDetails.firstName} ${userDetails.lastName}`.trim() : mappedRole,
      },
    });
  }, []);

  const value = useMemo(
    () => ({
      auth,
      isAuthenticated: Boolean(auth?.token),
      logout,
      updateAuth,
      capabilities: auth?.user ? roleCapabilities[auth.user.role] || [] : [],
    }),
    [auth, logout, updateAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
