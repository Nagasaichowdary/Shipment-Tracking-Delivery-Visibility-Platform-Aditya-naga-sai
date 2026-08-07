package com.shiptrackpro.controller;

import com.shiptrackpro.dto.RouteHistoryResponse;
import com.shiptrackpro.service.RouteHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing the Route History and Timeline APIs.
 *
 * <h3>Endpoints</h3>
 * <ul>
 *   <li>{@code GET /api/shipments/{trackingNumber}/route-history} — full event list</li>
 *   <li>{@code GET /api/shipments/{trackingNumber}/timeline}      — same data, semantic alias</li>
 * </ul>
 *
 * <h3>Role access</h3>
 * <p>All authenticated users may read route history.
 * Roles: {@code ADMIN}, {@code DISPATCHER}, {@code DRIVER},
 * {@code CUSTOMER}, {@code BUSINESS_CLIENT}.</p>
 *
 * <p>No existing controller was modified.</p>
 */
@RestController
@RequestMapping("/api/shipments")
public class RouteHistoryController {

    private final RouteHistoryService routeHistoryService;

    public RouteHistoryController(RouteHistoryService routeHistoryService) {
        this.routeHistoryService = routeHistoryService;
    }

    /**
     * Returns the complete chronological route history for the given shipment.
     *
     * <pre>GET /api/shipments/{trackingNumber}/route-history</pre>
     *
     * @param trackingNumber the shipment tracking number (e.g. SHIP-ABCD1234)
     * @return 200 with {@link RouteHistoryResponse} containing all events
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{trackingNumber}/route-history")
    public ResponseEntity<RouteHistoryResponse> getRouteHistory(
            @PathVariable String trackingNumber) {
        return ResponseEntity.ok(routeHistoryService.getHistory(trackingNumber));
    }

    /**
     * Returns the complete chronological timeline for the given shipment.
     * Functionally identical to {@code /route-history}; exposed as a
     * semantically distinct URL for UI integrations that prefer the
     * "timeline" terminology.
     *
     * <pre>GET /api/shipments/{trackingNumber}/timeline</pre>
     *
     * @param trackingNumber the shipment tracking number
     * @return 200 with {@link RouteHistoryResponse} containing all events
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{trackingNumber}/timeline")
    public ResponseEntity<RouteHistoryResponse> getTimeline(
            @PathVariable String trackingNumber) {
        return ResponseEntity.ok(routeHistoryService.getTimeline(trackingNumber));
    }
}
