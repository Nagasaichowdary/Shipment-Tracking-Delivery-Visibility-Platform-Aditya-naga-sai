package com.shiptrackpro.controller;

import com.shiptrackpro.dto.BusinessClientAnalyticsResponse;
import com.shiptrackpro.dto.MyShipmentReportResponse;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.service.BusinessClientService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;

/**
 * REST controller for Business Client personal analytics and reports.
 *
 * <h3>Security</h3>
 * <p>All endpoints are restricted to {@code ROLE_BUSINESS_CLIENT}
 * (DB role_name = {@code BUSINESS_CLIENT}, authority = {@code ROLE_BUSINESS_CLIENT}
 * as produced by {@code User.getAuthorities()}).</p>
 *
 * <p>The authenticated user's ID is extracted from the Spring Security
 * {@code @AuthenticationPrincipal} — exactly as {@code ShipmentController.createShipment}
 * does. The HTTP layer never accepts a userId parameter; all data scoping
 * is enforced server-side from the JWT principal.</p>
 *
 * <h3>Endpoints</h3>
 * <pre>
 *   GET /api/my/analytics         — KPI cards + charts for logged-in Business Client
 *   GET /api/my/reports           — Paginated shipment table + summary KPIs
 *   GET /api/my/reports/export    — PDF / Excel / CSV export
 * </pre>
 */
@RestController
@RequestMapping("/api/my")
@PreAuthorize("hasRole('BUSINESS_CLIENT')")
public class BusinessClientController {

    private final BusinessClientService businessClientService;

    public BusinessClientController(BusinessClientService businessClientService) {
        this.businessClientService = businessClientService;
    }

    /**
     * Returns analytics KPI cards and chart data for the authenticated Business Client.
     *
     * <p>The userId is taken from the JWT — the frontend cannot override it.</p>
     *
     * <pre>GET /api/my/analytics?period=month</pre>
     * <pre>GET /api/my/analytics?period=all</pre>
     * <pre>GET /api/my/analytics?from=2026-01-01&amp;to=2026-08-31</pre>
     */
    @GetMapping("/analytics")
    public ResponseEntity<BusinessClientAnalyticsResponse> getMyAnalytics(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "all")  String    period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        Long userId = currentUser.getUserId();
        return ResponseEntity.ok(businessClientService.getMyAnalytics(userId, period, from, to));
    }

    /**
     * Returns a paginated shipment report for the authenticated Business Client.
     *
     * <pre>GET /api/my/reports?period=all&amp;status=&amp;page=0&amp;size=20</pre>
     */
    @GetMapping("/reports")
    public ResponseEntity<MyShipmentReportResponse> getMyReport(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "all")  String    period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false)       String    status,
            @RequestParam(defaultValue = "0")     int       page,
            @RequestParam(defaultValue = "20")    int       size) {

        Long userId = currentUser.getUserId();
        return ResponseEntity.ok(
                businessClientService.getMyReport(userId, period, from, to, status,
                        Math.max(0, page), Math.max(1, Math.min(100, size))));
    }

    /**
     * Exports the authenticated Business Client's shipments as PDF, Excel, or CSV.
     *
     * <pre>GET /api/my/reports/export?format=pdf&amp;period=all</pre>
     * <pre>GET /api/my/reports/export?format=excel&amp;status=DELIVERED</pre>
     * <pre>GET /api/my/reports/export?format=csv&amp;from=2026-01-01&amp;to=2026-08-31</pre>
     */
    @GetMapping("/reports/export")
    public ResponseEntity<byte[]> exportMyReport(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "csv")  String    format,
            @RequestParam(defaultValue = "all")  String    period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false)       String    status) throws IOException {

        Long userId = currentUser.getUserId();
        byte[] data = businessClientService.exportMyReport(userId, format, period, from, to, status);

        String contentType  = businessClientService.exportContentType(format);
        String disposition  = "attachment; filename=\"" + businessClientService.exportFilename(format) + "\"";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }
}
