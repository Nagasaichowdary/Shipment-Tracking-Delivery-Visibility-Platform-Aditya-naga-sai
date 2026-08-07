package com.shiptrackpro.controller;

import com.shiptrackpro.dto.AnalyticsActivityResponse;
import com.shiptrackpro.dto.AnalyticsChartsResponse;
import com.shiptrackpro.dto.AnalyticsOverviewResponse;
import com.shiptrackpro.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for the Analytics Dashboard.
 *
 * <p>Exposes three read-only endpoints under {@code /api/analytics}:
 * <ul>
 *   <li>{@code GET /api/analytics/overview} — KPI cards</li>
 *   <li>{@code GET /api/analytics/charts}   — Chart datasets</li>
 *   <li>{@code GET /api/analytics/activity} — Recent activity feed</li>
 * </ul>
 * </p>
 *
 * <h3>Role / Authority mapping (verified against DB + SecurityContext)</h3>
 * <pre>
 *  DB roles.role_name   User.getAuthorities()         Allowed?
 *  ─────────────────    ─────────────────────────     ────────
 *  ADMIN                ROLE_ADMIN                    YES
 *  DISPATCHER           ROLE_DISPATCHER               YES  (frontend shows as "Logistics Operator")
 *  DRIVER               ROLE_DRIVER                   NO
 *  CUSTOMER             ROLE_CUSTOMER                 NO
 *  BUSINESS_CLIENT      ROLE_BUSINESS_CLIENT          NO
 * </pre>
 *
 * <p>{@code hasAnyRole('ADMIN', 'DISPATCHER')} is the correct expression because
 * Spring Security's {@code hasAnyRole} automatically prepends the {@code ROLE_}
 * prefix to each argument, matching the exact {@link
 * org.springframework.security.core.authority.SimpleGrantedAuthority} strings
 * created by {@code User.getAuthorities()} via
 * {@code "ROLE_" + role.getRoleName()}.</p>
 *
 * <p>No existing controllers were modified.</p>
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * Returns KPI card data for the Analytics Dashboard overview section.
     *
     * <p>Supported {@code period} values:
     * <ul>
     *   <li>{@code "today"}  — shipments created today</li>
     *   <li>{@code "week"}   — last 7 days</li>
     *   <li>{@code "month"}  — current calendar month</li>
     *   <li>{@code "all"}    — all time</li>
     * </ul>
     * </p>
     *
     * <pre>GET /api/analytics/overview?period=month</pre>
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(analyticsService.getOverview(period));
    }

    /**
     * Returns all chart datasets for the Analytics Dashboard charts section.
     *
     * <p>{@code period} filters the status distribution. Monthly trend charts
     * always show the last 6 calendar months regardless of the period
     * parameter.</p>
     *
     * <p>{@code limit} controls how many items appear in ranked lists
     * (top cities, top creators, driver performance). Defaults to 5;
     * configurable up to 20.</p>
     *
     * <pre>GET /api/analytics/charts?period=month&amp;limit=5</pre>
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    @GetMapping("/charts")
    public ResponseEntity<AnalyticsChartsResponse> getCharts(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(defaultValue = "5")     int    limit) {
        int safeLimit = Math.max(1, Math.min(20, limit));
        return ResponseEntity.ok(analyticsService.getCharts(period, safeLimit));
    }

    /**
     * Returns the recent activity feed and the four recent-item lists
     * (created, delivered, delayed, assigned).
     *
     * <p>{@code limit} controls how many items appear in each list.
     * Defaults to 10; configurable up to 50.</p>
     *
     * <pre>GET /api/analytics/activity?limit=10</pre>
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    @GetMapping("/activity")
    public ResponseEntity<AnalyticsActivityResponse> getActivity(
            @RequestParam(defaultValue = "10") int limit) {
        int safeLimit = Math.max(1, Math.min(50, limit));
        return ResponseEntity.ok(analyticsService.getActivity(safeLimit));
    }
}
