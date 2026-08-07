/**
 * DeliveryReports.jsx
 * Enterprise Logistics Delivery Reports Dashboard.
 *
 * Accessible at: /reports
 * Allowed roles: Administrator, Logistics Operator
 *
 * Tabs:
 *   📦 Summary   — Delivery Summary KPIs + recent deliveries
 *   📋 Shipments — Paginated shipment report table
 *   🚗 Drivers   — Driver performance rankings
 *   🏢 Clients   — Business client statistics
 *   🗺️ Routes    — Route corridor performance
 */

import { useState, useEffect, useCallback, useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/auth";
import {
  getDeliverySummary,
  getShipmentReport,
  getDriverReport,
  getClientReport,
  getRouteReport,
} from "../services/api";

import ReportPeriodTabs   from "../components/reports/ReportPeriodTabs";
import DateRangePicker    from "../components/reports/DateRangePicker";
import ExportToolbar      from "../components/reports/ExportToolbar";
import SummarySection     from "../components/reports/SummarySection";
import ShipmentReportTable from "../components/reports/ShipmentReportTable";
import DriverReportTable  from "../components/reports/DriverReportTable";
import ClientReportTable  from "../components/reports/ClientReportTable";
import RouteReportSection from "../components/reports/RouteReportSection";

// ── Constants ─────────────────────────────────────────────────────────────────
const ALLOWED_ROLES = ["Administrator", "Logistics Operator"];

const TABS = [
  { key: "summary",   label: "📦 Summary",    export: "summary"   },
  { key: "shipments", label: "📋 Shipments",  export: "shipments"  },
  { key: "drivers",   label: "🚗 Drivers",    export: "drivers"   },
  { key: "clients",   label: "🏢 Clients",    export: "clients"   },
  { key: "routes",    label: "🗺️ Routes",    export: "routes"    },
];

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{
      background: "#fef2f2", border: "1.5px solid #fca5a5",
      borderRadius: 10, padding: "14px 18px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, marginBottom: 20,
    }}>
      <span style={{ color: "#dc2626", fontSize: 14 }}>⚠️ {message}</span>
      {onRetry && (
        <button onClick={onRetry}
          style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 7,
            padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
          Retry
        </button>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{title}</h2>
      {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{subtitle}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DeliveryReports() {
  const { auth } = useContext(AuthContext);

  // Role guard
  if (!ALLOWED_ROLES.includes(auth?.user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Shared filter state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("summary");
  const [period, setPeriod]       = useState("month");
  const [fromDate, setFromDate]   = useState(null);
  const [toDate, setToDate]       = useState(null);

  // Shipment Report pagination + status filter
  const [shipmentPage, setShipmentPage]           = useState(0);
  const [shipmentStatusFilter, setShipmentStatus] = useState(null);

  // ── Data state (one per tab) ───────────────────────────────────────────────
  const [summaryData,   setSummaryData]   = useState(null);
  const [shipmentData,  setShipmentData]  = useState(null);
  const [driverData,    setDriverData]    = useState(null);
  const [clientData,    setClientData]    = useState(null);
  const [routeData,     setRouteData]     = useState(null);

  const [loadingSummary,  setLoadingSummary]  = useState(false);
  const [loadingShipment, setLoadingShipment] = useState(false);
  const [loadingDriver,   setLoadingDriver]   = useState(false);
  const [loadingClient,   setLoadingClient]   = useState(false);
  const [loadingRoute,    setLoadingRoute]    = useState(false);

  const [errorSummary,  setErrorSummary]  = useState("");
  const [errorShipment, setErrorShipment] = useState("");
  const [errorDriver,   setErrorDriver]   = useState("");
  const [errorClient,   setErrorClient]   = useState("");
  const [errorRoute,    setErrorRoute]    = useState("");

  // ── Fetch functions ────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true); setErrorSummary("");
    try { setSummaryData((await getDeliverySummary(period, fromDate, toDate)).data); }
    catch (e) { setErrorSummary(e?.response?.data?.message || "Failed to load delivery summary."); }
    finally { setLoadingSummary(false); }
  }, [period, fromDate, toDate]);

  const fetchShipments = useCallback(async (pg = shipmentPage, st = shipmentStatusFilter) => {
    setLoadingShipment(true); setErrorShipment("");
    try {
      setShipmentData((await getShipmentReport({
        period, from: fromDate, to: toDate, status: st || undefined, page: pg, size: 20,
      })).data);
    } catch (e) { setErrorShipment(e?.response?.data?.message || "Failed to load shipment report."); }
    finally { setLoadingShipment(false); }
  }, [period, fromDate, toDate, shipmentPage, shipmentStatusFilter]);

  const fetchDrivers = useCallback(async () => {
    setLoadingDriver(true); setErrorDriver("");
    try { setDriverData((await getDriverReport(period, 50)).data); }
    catch (e) { setErrorDriver(e?.response?.data?.message || "Failed to load driver report."); }
    finally { setLoadingDriver(false); }
  }, [period]);

  const fetchClients = useCallback(async () => {
    setLoadingClient(true); setErrorClient("");
    try { setClientData((await getClientReport(period, fromDate, toDate)).data); }
    catch (e) { setErrorClient(e?.response?.data?.message || "Failed to load client report."); }
    finally { setLoadingClient(false); }
  }, [period, fromDate, toDate]);

  const fetchRoutes = useCallback(async () => {
    setLoadingRoute(true); setErrorRoute("");
    try { setRouteData((await getRouteReport(period, 10)).data); }
    catch (e) { setErrorRoute(e?.response?.data?.message || "Failed to load route report."); }
    finally { setLoadingRoute(false); }
  }, [period]);

  // ── Load data for the active tab when period/dates change ──────────────────
  useEffect(() => {
    if (activeTab === "summary")   fetchSummary();
    if (activeTab === "shipments") fetchShipments(0, shipmentStatusFilter);
    if (activeTab === "drivers")   fetchDrivers();
    if (activeTab === "clients")   fetchClients();
    if (activeTab === "routes")    fetchRoutes();
  }, [activeTab, period, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab switch: load data if not yet loaded ────────────────────────────────
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "summary"   && !summaryData)  fetchSummary();
    if (key === "shipments" && !shipmentData) fetchShipments(0, null);
    if (key === "drivers"   && !driverData)   fetchDrivers();
    if (key === "clients"   && !clientData)   fetchClients();
    if (key === "routes"    && !routeData)    fetchRoutes();
  };

  // ── Period / date filter change ────────────────────────────────────────────
  const handlePeriodChange = (p) => {
    setPeriod(p);
    setFromDate(null);
    setToDate(null);
  };

  const handleDateRangeClear = () => { setFromDate(null); setToDate(null); };

  // ── Shipment report: pagination & status filter ────────────────────────────
  const handlePageChange = (pg) => {
    setShipmentPage(pg);
    fetchShipments(pg, shipmentStatusFilter);
  };

  const handleStatusFilter = (st) => {
    setShipmentStatus(st);
    setShipmentPage(0);
    fetchShipments(0, st);
  };

  // ── Current tab config ─────────────────────────────────────────────────────
  const currentTab = TABS.find(t => t.key === activeTab);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: "100%" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap",
          gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: "1.5px solid #e2e8f0" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
            📊 Delivery Reports
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
            Operational reporting &amp; export — Enterprise Logistics Platform
          </p>
        </div>
      </div>

      {/* ── Filters row ── */}
      <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Period</div>
          <ReportPeriodTabs period={period} onChange={handlePeriodChange} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Custom Range</div>
          <DateRangePicker
            from={fromDate} to={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
            onClear={handleDateRangeClear}
          />
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Download</div>
          <ExportToolbar
            reportType={currentTab?.export}
            period={period}
            from={fromDate}
            to={toDate}
          />
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24,
          borderBottom: "2px solid #e2e8f0", paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`report-tab-${t.key}`}
            onClick={() => handleTabChange(t.key)}
            style={{
              padding: "10px 20px", border: "none", background: "transparent",
              cursor: "pointer", fontSize: 14, fontWeight: 700,
              color: activeTab === t.key ? "#2563eb" : "#94a3b8",
              borderBottom: activeTab === t.key ? "2.5px solid #2563eb" : "2.5px solid transparent",
              marginBottom: "-2px", transition: "all 0.18s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Delivery Summary ── */}
      {activeTab === "summary" && (
        <div>
          <SectionHeader
            title="Delivery Summary"
            subtitle="Overall delivery performance KPIs and recent confirmed deliveries."
          />
          {errorSummary && <ErrorBanner message={errorSummary} onRetry={fetchSummary} />}
          <SummarySection data={summaryData} loading={loadingSummary} />
        </div>
      )}

      {/* ── Tab: Shipment Report ── */}
      {activeTab === "shipments" && (
        <div>
          <SectionHeader
            title="Shipment Report"
            subtitle="Complete shipment list with status, type, and route breakdown. Export up to 10,000 rows."
          />
          {errorShipment && <ErrorBanner message={errorShipment} onRetry={() => fetchShipments(0, shipmentStatusFilter)} />}
          <ShipmentReportTable
            data={shipmentData}
            loading={loadingShipment}
            onPageChange={handlePageChange}
            onStatusFilter={handleStatusFilter}
            statusFilter={shipmentStatusFilter}
          />
        </div>
      )}

      {/* ── Tab: Driver Performance ── */}
      {activeTab === "drivers" && (
        <div>
          <SectionHeader
            title="Driver Performance"
            subtitle="Per-driver delivery metrics ranked by completion rate."
          />
          {errorDriver && <ErrorBanner message={errorDriver} onRetry={fetchDrivers} />}
          <DriverReportTable data={driverData} loading={loadingDriver} />
        </div>
      )}

      {/* ── Tab: Business Clients ── */}
      {activeTab === "clients" && (
        <div>
          <SectionHeader
            title="Business Client Report"
            subtitle="Shipment activity and delivery performance per business client."
          />
          {errorClient && <ErrorBanner message={errorClient} onRetry={fetchClients} />}
          <ClientReportTable data={clientData} loading={loadingClient} />
        </div>
      )}

      {/* ── Tab: Route Performance ── */}
      {activeTab === "routes" && (
        <div>
          <SectionHeader
            title="Route Performance"
            subtitle="Top origin/destination cities and route corridor delivery rates."
          />
          {errorRoute && <ErrorBanner message={errorRoute} onRetry={fetchRoutes} />}
          <RouteReportSection data={routeData} loading={loadingRoute} />
        </div>
      )}

      {/* Shimmer animation keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
