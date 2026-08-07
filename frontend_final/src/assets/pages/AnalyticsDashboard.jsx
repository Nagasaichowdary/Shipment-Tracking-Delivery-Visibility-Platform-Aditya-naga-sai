/**
 * AnalyticsDashboard.jsx
 * Enterprise Logistics Analytics Dashboard.
 *
 * Accessible at: /analytics
 * Allowed roles: Administrator, Logistics Operator
 *
 * Features:
 *  - Period filter tabs: Today / This Week / This Month / All Time
 *  - Filter persistence while navigating inside the page
 *  - Auto-refresh every 30 seconds
 *  - Three sections: Overview KPIs → Charts → Recent Activity
 *  - Role-gated: non-authorised users are redirected to /dashboard
 */

import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/auth";
import {
  getAnalyticsOverview,
  getAnalyticsCharts,
  getAnalyticsActivity,
} from "../services/api";
import OverviewCards    from "../components/analytics/OverviewCards";
import AnalyticsCharts  from "../components/analytics/AnalyticsCharts";
import RecentActivityFeed from "../components/analytics/RecentActivityFeed";

// ── Constants ─────────────────────────────────────────────────────────────────
const ALLOWED_ROLES = ["Administrator", "Logistics Operator"];
const PERIODS = [
  { key: "today", label: "Today"      },
  { key: "week",  label: "This Week"  },
  { key: "month", label: "This Month" },
  { key: "all",   label: "All Time"   },
];
const DEFAULT_PERIOD = "month";
const AUTO_REFRESH_MS = 30_000;
const TOP_LIMIT = 5;
const ACTIVITY_LIMIT = 10;

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "overview", label: "📊 Overview"  },
  { key: "charts",   label: "📈 Charts"    },
  { key: "activity", label: "🔔 Activity"  },
];

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{subtitle}</p>
      )}
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div
      style={{
        background: "#fef2f2",
        border: "1.5px solid #fca5a5",
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <span style={{ color: "#dc2626", fontSize: 14 }}>⚠️ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            padding: "6px 14px",
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── Last-refreshed badge ──────────────────────────────────────────────────────
function LastRefreshed({ timestamp }) {
  if (!timestamp) return null;
  return (
    <span
      style={{
        fontSize: 12,
        color: "#94a3b8",
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
      Refreshed {timestamp.toLocaleTimeString()}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const { auth } = useContext(AuthContext);

  // Role guard — redirect immediately if not authorised
  if (!ALLOWED_ROLES.includes(auth?.user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState("overview");
  const [period,    setPeriod]      = useState(DEFAULT_PERIOD);

  const [overview,  setOverview]    = useState(null);
  const [charts,    setCharts]      = useState(null);
  const [activity,  setActivity]    = useState(null);

  const [loadingOv, setLoadingOv]   = useState(false);
  const [loadingCh, setLoadingCh]   = useState(false);
  const [loadingAc, setLoadingAc]   = useState(false);

  const [errorOv,   setErrorOv]     = useState("");
  const [errorCh,   setErrorCh]     = useState("");
  const [errorAc,   setErrorAc]     = useState("");

  const [lastRefresh, setLastRefresh] = useState(null);

  const timerRef = useRef(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoadingOv(true);
    setErrorOv("");
    try {
      const res = await getAnalyticsOverview(period);
      setOverview(res.data);
    } catch (e) {
      setErrorOv(e?.response?.data?.message || "Failed to load overview data.");
    } finally {
      setLoadingOv(false);
    }
  }, [period]);

  const fetchCharts = useCallback(async () => {
    setLoadingCh(true);
    setErrorCh("");
    try {
      const res = await getAnalyticsCharts(period, TOP_LIMIT);
      setCharts(res.data);
    } catch (e) {
      setErrorCh(e?.response?.data?.message || "Failed to load chart data.");
    } finally {
      setLoadingCh(false);
    }
  }, [period]);

  const fetchActivity = useCallback(async () => {
    setLoadingAc(true);
    setErrorAc("");
    try {
      const res = await getAnalyticsActivity(ACTIVITY_LIMIT);
      setActivity(res.data);
    } catch (e) {
      setErrorAc(e?.response?.data?.message || "Failed to load activity data.");
    } finally {
      setLoadingAc(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchOverview(), fetchCharts(), fetchActivity()]);
    setLastRefresh(new Date());
  }, [fetchOverview, fetchCharts, fetchActivity]);

  // ── Initial load + auto-refresh ────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, AUTO_REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  // Re-fetch overview + charts when period changes (activity is period-agnostic)
  useEffect(() => {
    fetchOverview();
    fetchCharts();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Period label ───────────────────────────────────────────────────────────
  const periodLabel = PERIODS.find((p) => p.key === period)?.label || "This Month";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: "100%" }}>
      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1.5px solid #e2e8f0",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
            📊 Enterprise Analytics
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
            Shipment intelligence &amp; operational metrics · {periodLabel}
          </p>
        </div>
        <LastRefreshed timestamp={lastRefresh} />
      </div>

      {/* ── Period filter tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "#f1f5f9",
          borderRadius: 12,
          padding: 4,
          width: "fit-content",
          marginBottom: 24,
        }}
      >
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: "7px 18px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              transition: "all 0.18s",
              background: period === p.key ? "#2563eb" : "transparent",
              color: period === p.key ? "#fff" : "#475569",
              boxShadow: period === p.key ? "0 2px 8px #2563eb44" : "none",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Section tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: 0,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              color: activeTab === t.key ? "#2563eb" : "#94a3b8",
              borderBottom: activeTab === t.key ? "2.5px solid #2563eb" : "2.5px solid transparent",
              marginBottom: "-2px",
              transition: "all 0.18s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview KPIs ── */}
      {activeTab === "overview" && (
        <div>
          <SectionHeader
            title="KPI Overview"
            subtitle={`Showing shipment metrics for: ${periodLabel}`}
          />
          {errorOv && <ErrorBanner message={errorOv} onRetry={fetchOverview} />}
          <OverviewCards data={overview} loading={loadingOv} />
        </div>
      )}

      {/* ── Tab: Charts ── */}
      {activeTab === "charts" && (
        <div>
          <SectionHeader
            title="Charts &amp; Distributions"
            subtitle="Visual breakdown of shipment data. Monthly trends always show last 6 months."
          />
          {errorCh && <ErrorBanner message={errorCh} onRetry={fetchCharts} />}
          <AnalyticsCharts data={charts} loading={loadingCh} />
        </div>
      )}

      {/* ── Tab: Activity ── */}
      {activeTab === "activity" && (
        <div>
          <SectionHeader
            title="Recent Activity"
            subtitle="Latest operational events pulled from the notification log."
          />
          {errorAc && <ErrorBanner message={errorAc} onRetry={fetchActivity} />}
          <RecentActivityFeed data={activity} loading={loadingAc} />
        </div>
      )}

      {/* Shimmer animation keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
