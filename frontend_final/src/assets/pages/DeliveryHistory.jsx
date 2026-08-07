import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDeliveryHistory } from "../services/api";

// ── Date helpers ──────────────────────────────────────────────────────────────
function parseDateHelper(value) {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, month - 1, day, hour, minute, second);
  }
  return new Date(value);
}

function formatDateTime(value) {
  const d = parseDateHelper(value);
  if (!d || isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function cityOf(addressResponse) {
  return addressResponse?.city || "—";
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
const shimmer = {
  background: "linear-gradient(90deg,#e8edf2 25%,#f5f7fa 50%,#e8edf2 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
  borderRadius: 6,
};

function SkeletonRow() {
  return (
    <tr>
      {[120, 160, 100, 130, 70, 80].map((w, i) => (
        <td key={i} style={{ padding: "14px 12px" }}>
          <div style={{ ...shimmer, height: 14, width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DeliveryHistory() {
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState("newest");

  useEffect(() => {
    setLoading(true);
    getDeliveryHistory()
      .then((res) => setDeliveries(Array.isArray(res.data) ? res.data : []))
      .catch((err) =>
        setError(err?.response?.data?.message || "Failed to load delivery history. Please try again.")
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? deliveries.filter(
          (d) =>
            d.trackingNumber?.toLowerCase().includes(q) ||
            d.deliveryReceiverName?.toLowerCase().includes(q) ||
            d.receiverName?.toLowerCase().includes(q) ||
            d.originAddress?.city?.toLowerCase().includes(q) ||
            d.destinationAddress?.city?.toLowerCase().includes(q)
        )
      : deliveries;

    return [...list].sort((a, b) => {
      const da = parseDateHelper(a.deliveredAt) ?? parseDateHelper(a.updatedAt);
      const db = parseDateHelper(b.deliveredAt) ?? parseDateHelper(b.updatedAt);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return sort === "newest" ? db - da : da - db;
    });
  }, [deliveries, search, sort]);

  const viewDetails = (trackingNumber) => {
    navigate("/track", { state: { trackingNumber } });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Driver</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Delivery History</h1>
          <p className="subtle" style={{ margin: "4px 0 0" }}>
            All deliveries you have completed.
          </p>
        </div>
        <span style={{
          background: "rgba(34,197,94,0.1)", color: "#16a34a",
          borderRadius: 8, padding: "5px 14px", fontSize: 13, fontWeight: 700,
        }}>
          {loading ? "— Delivered" : `${deliveries.length} Delivered`}
        </span>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          className="input"
          type="text"
          placeholder="Search tracking number, receiver, origin, destination…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 280px", minWidth: 200 }}
        />
        <select
          className="input"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ flex: "0 0 160px" }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {error && (
        <div style={{
          padding: "14px 18px", borderRadius: 8,
          background: "rgba(239,68,68,0.07)", border: "1.5px solid rgba(239,68,68,0.22)",
          color: "#b91c1c", fontSize: 14, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      <div className="schema-box" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid var(--line)" }}>
              {["Tracking Number", "Origin \u2192 Destination", "Receiver Name", "Delivered At", "Status", "Actions"].map((h) => (
                <th key={h} style={{
                  padding: "12px 14px", textAlign: "left", fontWeight: 700,
                  fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
                  color: "#64748b", whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>
                    {search ? `No deliveries match "${search}".` : "No completed deliveries yet."}
                  </td>
                </tr>
              )
              : filtered.map((d) => (
                <tr
                  key={d.id}
                  style={{ borderBottom: "1px solid var(--line)", transition: "background 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                    <code style={{
                      fontFamily: "monospace", fontSize: 12,
                      background: "#f1f5f9", borderRadius: 4,
                      padding: "2px 7px", color: "#1e3a5f", fontWeight: 700,
                    }}>
                      {d.trackingNumber}
                    </code>
                  </td>
                  <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 600 }}>{cityOf(d.originAddress)}</span>
                    <span style={{ color: "#94a3b8", margin: "0 6px" }}>&#8594;</span>
                    <span style={{ fontWeight: 600 }}>{cityOf(d.destinationAddress)}</span>
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    {d.deliveryReceiverName || d.receiverName || "—"}
                  </td>
                  <td style={{ padding: "13px 14px", whiteSpace: "nowrap", color: "#475569", fontSize: 12 }}>
                    {formatDateTime(d.deliveredAt)}
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <span className="badge delivered">Delivered</span>
                  </td>
                  <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                    <button
                      className="button ghost"
                      style={{ fontSize: 12, padding: "5px 14px" }}
                      onClick={() => viewDetails(d.trackingNumber)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
          Showing {filtered.length} of {deliveries.length} deliveries
        </div>
      )}
    </div>
  );
}
