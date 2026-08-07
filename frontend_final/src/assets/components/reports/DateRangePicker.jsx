/**
 * DateRangePicker.jsx
 * Two date inputs (from/to) for custom date range filtering in Delivery Reports.
 */
export default function DateRangePicker({ from, to, onFromChange, onToChange, onClear }) {
  const inputStyle = {
    padding: "7px 12px",
    borderRadius: 8,
    border: "1.5px solid #e2e8f0",
    fontSize: 13,
    color: "#1e293b",
    background: "#fff",
    cursor: "pointer",
    outline: "none",
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 2, display: "block" };

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
      <div>
        <label style={labelStyle}>From</label>
        <input
          type="date"
          value={from || ""}
          onChange={(e) => onFromChange(e.target.value || null)}
          style={inputStyle}
          max={to || undefined}
        />
      </div>
      <div>
        <label style={labelStyle}>To</label>
        <input
          type="date"
          value={to || ""}
          onChange={(e) => onToChange(e.target.value || null)}
          style={inputStyle}
          min={from || undefined}
        />
      </div>
      {(from || to) && (
        <button
          onClick={onClear}
          title="Clear date range"
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1.5px solid #fca5a5",
            background: "#fff",
            color: "#dc2626",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}
