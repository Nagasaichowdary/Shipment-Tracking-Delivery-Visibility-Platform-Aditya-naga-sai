package com.shiptrackpro.controller;

import com.shiptrackpro.dto.ClientReportResponse;
import com.shiptrackpro.dto.DeliverySummaryResponse;
import com.shiptrackpro.dto.DriverReportResponse;
import com.shiptrackpro.dto.RouteReportResponse;
import com.shiptrackpro.dto.ShipmentReportResponse;
import com.shiptrackpro.service.ReportExportService;
import com.shiptrackpro.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;

/**
 * REST controller for the Delivery Reports module.
 *
 * <p>All endpoints under {@code /api/reports} are restricted to
 * {@code ADMIN} and {@code DISPATCHER} roles — consistent with
 * {@link AnalyticsController}.</p>
 *
 * <h3>Endpoints</h3>
 * <pre>
 *   GET /api/reports/summary   — Delivery Summary KPIs + trends
 *   GET /api/reports/shipments — Paginated shipment report table
 *   GET /api/reports/drivers   — Driver performance rankings
 *   GET /api/reports/clients   — Business client statistics
 *   GET /api/reports/routes    — Route corridor performance
 *   GET /api/reports/export    — PDF / Excel / CSV download
 * </pre>
 */
@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
public class ReportController {

    private final ReportService       reportService;
    private final ReportExportService exportService;

    public ReportController(ReportService reportService, ReportExportService exportService) {
        this.reportService  = reportService;
        this.exportService  = exportService;
    }

    /**
     * Delivery Summary: KPI cards + monthly delivery/shipment trends + recent deliveries.
     *
     * <pre>GET /api/reports/summary?period=month</pre>
     * <pre>GET /api/reports/summary?from=2026-01-01&amp;to=2026-06-30</pre>
     */
    @GetMapping("/summary")
    public ResponseEntity<DeliverySummaryResponse> getSummary(
            @RequestParam(defaultValue = "month")  String    period,
            @RequestParam(required = false)        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getSummary(period, from, to));
    }

    /**
     * Shipment Report: paginated shipment list + status/type breakdowns.
     *
     * <pre>GET /api/reports/shipments?period=month&amp;status=DELIVERED&amp;page=0&amp;size=20</pre>
     */
    @GetMapping("/shipments")
    public ResponseEntity<ShipmentReportResponse> getShipmentReport(
            @RequestParam(defaultValue = "month")  String    period,
            @RequestParam(required = false)        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false)        String    status,
            @RequestParam(defaultValue = "0")      int       page,
            @RequestParam(defaultValue = "20")     int       size) {
        return ResponseEntity.ok(reportService.getShipmentReport(period, from, to, status,
                Math.max(0, page), Math.max(1, Math.min(100, size))));
    }

    /**
     * Driver Performance Report: per-driver metrics ranked by completion rate.
     *
     * <pre>GET /api/reports/drivers?period=month&amp;limit=20</pre>
     */
    @GetMapping("/drivers")
    public ResponseEntity<DriverReportResponse> getDriverReport(
            @RequestParam(defaultValue = "all")   String period,
            @RequestParam(defaultValue = "20")    int    limit) {
        return ResponseEntity.ok(reportService.getDriverReport(period, Math.max(1, Math.min(50, limit))));
    }

    /**
     * Business Client Report: per-client shipment stats enriched with company profile.
     *
     * <pre>GET /api/reports/clients?period=month</pre>
     */
    @GetMapping("/clients")
    public ResponseEntity<ClientReportResponse> getClientReport(
            @RequestParam(defaultValue = "month") String    period,
            @RequestParam(required = false)       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getClientReport(period, from, to));
    }

    /**
     * Route Performance Report: top city pairs + monthly delivery trend.
     *
     * <pre>GET /api/reports/routes?period=month&amp;limit=10</pre>
     */
    @GetMapping("/routes")
    public ResponseEntity<RouteReportResponse> getRouteReport(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(defaultValue = "10")    int    limit) {
        return ResponseEntity.ok(reportService.getRouteReport(period, Math.max(1, Math.min(20, limit))));
    }

    /**
     * Export: downloads the requested report in PDF, Excel, or CSV format.
     *
     * <pre>
     * GET /api/reports/export?reportType=drivers&amp;format=pdf&amp;period=month
     * GET /api/reports/export?reportType=shipments&amp;format=excel&amp;from=2026-01-01&amp;to=2026-06-30
     * GET /api/reports/export?reportType=summary&amp;format=csv&amp;period=all
     * </pre>
     *
     * @param reportType "summary" | "shipments" | "drivers" | "clients" | "routes"
     * @param format     "pdf" | "excel" | "csv" (default: "csv")
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam(defaultValue = "summary") String    reportType,
            @RequestParam(defaultValue = "csv")     String    format,
            @RequestParam(defaultValue = "month")   String    period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to)
            throws IOException {

        byte[] data = exportService.export(reportType, format, period, from, to);

        String contentType        = exportService.contentType(format);
        String contentDisposition = "attachment; filename=\"" + exportService.filename(reportType, format) + "\"";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }
}
