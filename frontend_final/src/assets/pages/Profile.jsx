import { useContext } from "react";
import { AuthContext } from "../context/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns the two-letter initials from firstName + lastName. */
function getInitials(firstName, lastName) {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  return "?";
}


/**
 * Decodes the JWT payload (second base64 segment) without any library.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token) {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return null;
    // atob requires standard base64; JWT uses URL-safe base64
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Formats a Unix epoch (seconds) to a human-readable local date-time string. */
function formatEpoch(epochSeconds) {
  if (!epochSeconds) return "Not Available";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(epochSeconds * 1000));
  } catch {
    return "Not Available";
  }
}

// Role-specific colour accents — mirrors the Dashboard palette
const roleColor = {
  Administrator: "#2563eb",
  Customer: "#10b981",
  "Business Client": "#7c3aed",
  "Logistics Operator": "#f97316",
  "Support Agent": "#0ea5e9",
};

// ─── Component ───────────────────────────────────────────────────────────────

function Profile() {
  const { auth, capabilities } = useContext(AuthContext);

  const role      = auth?.user?.role      || "Unknown Role";
  const firstName = auth?.user?.firstName || "";
  const lastName  = auth?.user?.lastName  || "";
  const email     = auth?.user?.email     || "Not Available";
  const token     = auth?.token           || null;

  // Derive token metadata from the JWT payload — no API call needed
  const payload   = token ? decodeJwtPayload(token) : null;
  const expiresAt = payload?.exp ? formatEpoch(payload.exp) : "Not Available";
  const issuedAt  = payload?.iat ? formatEpoch(payload.iat) : "Not Available";

  // Company is stored in auth context only for Business Client;
  // the current auth state does not persist it, so we display accordingly.
  const company =
    role === "Business Client"
      ? auth?.user?.company || "Not Available"
      : "Not Applicable";

  const accent = roleColor[role] || "#2563eb";


  return (
    <div className="page">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Authentication and RBAC</div>
          <h1>Profile management</h1>
          <p className="subtle">
            Review session details, account information, and role permissions.
          </p>
        </div>
      </div>

      <section className="grid grid-2">
        {/* ── LEFT: Account Information ──────────────────────────── */}
        <div className="panel">
          {/* Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
                flexShrink: 0,
                letterSpacing: 1,
              }}
            >
              {getInitials(firstName, lastName)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {auth?.user?.name || role}
              </div>
              <div
                style={{
                  display: "inline-block",
                  background: accent,
                  color: "#fff",
                  borderRadius: 6,
                  padding: "2px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                {role}
              </div>
            </div>
          </div>

          <h2 className="section-title">Account information</h2>
          <div className="workflow-list">
            <div className="schema-box">
              <strong>Full name</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {auth?.user?.name || "Not Available"}
              </p>
            </div>

            <div className="schema-box">
              <strong>Email address</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {email}
              </p>
            </div>

            <div className="schema-box">
              <strong>Role</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {role}
              </p>
            </div>

            <div className="schema-box">
              <strong>Company</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {company}
              </p>
            </div>

            <div className="schema-box">
              <strong>Account status</strong>
              <p
                className="subtle"
                style={{ margin: "6px 0 0", color: token ? "#10b981" : "#ef4444" }}
              >
                {token ? "Active" : "Inactive"}
              </p>
            </div>

            <div className="schema-box">
              <strong>Member since</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {issuedAt}
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Session + Capabilities ───────────────────────── */}
        <div className="panel">
          {/* Session information */}
          <h2 className="section-title">Session information</h2>
          <div className="workflow-list" style={{ marginBottom: 24 }}>
            <div className="schema-box">
              <strong>Logged in as</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {email}
              </p>
            </div>

            <div className="schema-box">
              <strong>Role</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {role}
              </p>
            </div>

            <div className="schema-box">
              <strong>Session status</strong>
              <p
                className="subtle"
                style={{ margin: "6px 0 0", color: token ? "#10b981" : "#ef4444" }}
              >
                {token ? "● Active" : "● No active session"}
              </p>
            </div>

            <div className="schema-box">
              <strong>Token expiry</strong>
              <p className="subtle" style={{ margin: "6px 0 0" }}>
                {expiresAt}
              </p>
            </div>

          </div>

          {/* Role Capabilities — dynamic from auth.js roleCapabilities */}
          <h2 className="section-title">Role capabilities</h2>
          <div className="workflow-list">
            {capabilities.length > 0 ? (
              capabilities.map((capability, index) => (
                <div className="workflow-step" key={capability}>
                  <div
                    className="step-number"
                    style={{ background: accent, color: "#fff" }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <strong>{capability}</strong>
                    <p className="subtle" style={{ margin: "4px 0 0" }}>
                      Enabled for {role}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="subtle">No capabilities mapped for this role.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Profile;
