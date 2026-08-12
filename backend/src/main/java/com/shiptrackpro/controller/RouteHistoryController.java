package com.shiptrackpro.controller;

import com.shiptrackpro.dto.RouteHistoryResponse;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.service.RouteHistoryService;
import com.shiptrackpro.service.ShipmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
 * <h3>Customer isolation</h3>
 * <p>When the caller has {@code ROLE_CUSTOMER} or {@code ROLE_BUSINESS_CLIENT},
 * the controller performs an ownership check before returning history:
 * the tracking number must belong to a shipment where the caller is the
 * registered receiver or sender. Any other tracking number returns 403
 * Forbidden — preventing tracking-number-guessing attacks.</p>
 *
 * <p>Admin, Dispatcher, and Driver roles may read history for any shipment.</p>
 */
@RestController
@RequestMapping("/api/shipments")
public class RouteHistoryController {

    private final RouteHistoryService routeHistoryService;
    private final ShipmentService     shipmentService;

    public RouteHistoryController(RouteHistoryService routeHistoryService,
                                   ShipmentService     shipmentService) {
        this.routeHistoryService = routeHistoryService;
        this.shipmentService     = shipmentService;
    }

    /**
     * Returns the complete chronological route history for the given shipment.
     * Customers and Business Clients receive 403 if the tracking number does
     * not belong to one of their own shipments.
     *
     * <pre>GET /api/shipments/{trackingNumber}/route-history</pre>
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{trackingNumber}/route-history")
    public ResponseEntity<?> getRouteHistory(
            @PathVariable String trackingNumber,
            @AuthenticationPrincipal User currentUser) {
        if (isCustomerRole(currentUser)) {
            if (shipmentService.getShipmentByTrackingNumberForUser(
                    trackingNumber, currentUser.getUserId()) == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You are not authorised to view history for this shipment.");
            }
        }
        return ResponseEntity.ok(routeHistoryService.getHistory(trackingNumber));
    }

    /**
     * Returns the complete chronological timeline for the given shipment.
     * Functionally identical to {@code /route-history}; exposed as a
     * semantically distinct URL for UI integrations that prefer the
     * "timeline" terminology.
     *
     * <pre>GET /api/shipments/{trackingNumber}/timeline</pre>
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{trackingNumber}/timeline")
    public ResponseEntity<?> getTimeline(
            @PathVariable String trackingNumber,
            @AuthenticationPrincipal User currentUser) {
        if (isCustomerRole(currentUser)) {
            if (shipmentService.getShipmentByTrackingNumberForUser(
                    trackingNumber, currentUser.getUserId()) == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You are not authorised to view history for this shipment.");
            }
        }
        return ResponseEntity.ok(routeHistoryService.getTimeline(trackingNumber));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Returns true when the authenticated user is a CUSTOMER or BUSINESS_CLIENT
     * (roles that must be restricted to their own shipments only).
     */
    private boolean isCustomerRole(User user) {
        String roleName = user.getRole() != null ? user.getRole().getRoleName() : "";
        return "CUSTOMER".equals(roleName) || "BUSINESS_CLIENT".equals(roleName);
    }
}
