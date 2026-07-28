package com.shiptrackpro.controller;

import com.shiptrackpro.dto.AssignDriverRequest;
import com.shiptrackpro.dto.CreateShipmentRequest;
import com.shiptrackpro.dto.DelayPredictionResponse;
import com.shiptrackpro.dto.DriverAssignmentResponse;
import com.shiptrackpro.dto.DriverLocationResponse;
import com.shiptrackpro.dto.DriverResponse;
import com.shiptrackpro.dto.ShipmentLocationResponse;
import com.shiptrackpro.dto.ShipmentResponse;
import com.shiptrackpro.dto.UpdateShipmentLocationRequest;
import com.shiptrackpro.dto.UpdateShipmentRequest;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.enums.ShipmentStatus;
import com.shiptrackpro.service.ShipmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST API for the Shipment Management Workflow.
 *
 * <p>MODIFIED: {@code createShipment} now reads the authenticated
 * principal via {@code @AuthenticationPrincipal} (works as-is with the
 * existing {@code JwtAuthenticationFilter}/{@code CustomUserDetailsService},
 * since {@code User implements UserDetails}) instead of trusting a
 * client-supplied creator id. DTO types updated to
 * {@code CreateShipmentRequest}/{@code UpdateShipmentRequest}.</p>
 *
 * <p>Role restrictions below are commented rather than enforced, since the
 * exact policy per endpoint wasn't specified — uncomment and adjust once
 * confirmed, and add {@code @EnableMethodSecurity} to SecurityConfig if
 * it isn't already present.</p>
 */
@RestController
@RequestMapping("/api/shipments")
public class ShipmentController {

    private final ShipmentService shipmentService;

    public ShipmentController(ShipmentService shipmentService) {
        this.shipmentService = shipmentService;
    }

    // @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @PostMapping
    public ResponseEntity<ShipmentResponse> createShipment(
            @Valid @RequestBody CreateShipmentRequest request,
            @AuthenticationPrincipal User currentUser) {
        ShipmentResponse response = shipmentService.createShipment(request, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ShipmentResponse>> getAllShipments() {
        return ResponseEntity.ok(shipmentService.getAllShipments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShipmentResponse> getShipmentById(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.getShipmentById(id));
    }

    // @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ShipmentResponse> updateShipment(
            @PathVariable Long id,
            @Valid @RequestBody UpdateShipmentRequest request) {
        return ResponseEntity.ok(shipmentService.updateShipment(id, request));
    }

    // @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ShipmentResponse> deleteShipment(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.deleteShipment(id));
    }

    /**
     * Lightweight status-only update.
     *
     * <p>Restricted to {@code ROLE_DISPATCHER} (Logistics Operator) only.
     * Any other authenticated role receives HTTP 403 Forbidden.
     * The database role name is DISPATCHER; Spring Security prefixes it
     * with ROLE_ automatically, so hasRole('DISPATCHER') is correct.</p>
     */
    @PreAuthorize("hasRole('DISPATCHER')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ShipmentResponse> updateShipmentStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String rawStatus = body.get("status");
        ShipmentStatus newStatus = ShipmentStatus.valueOf(rawStatus);
        String cancellationReason = body.get("cancellationReason"); // null for non-cancellation
        String delayReason = body.get("delayReason");               // null for non-delay
        return ResponseEntity.ok(shipmentService.updateShipmentStatus(id, newStatus, cancellationReason, delayReason));
    }

    // ──────────────────────────────────────────────────────────
    // Driver Assignment (Milestone 2)
    // ──────────────────────────────────────────────────────────

    /**
     * Gets the driver currently assigned to a shipment.
     *
     * <pre>
     * GET /api/shipments/{id}/driver
     * </pre>
     */
    @GetMapping("/{id}/driver")
    public ResponseEntity<DriverResponse> getAssignedDriver(@PathVariable Long id) {
        DriverResponse driver = shipmentService.getAssignedDriver(id);
        if (driver == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(driver);
    }

    /**
     * Gets the live device location of the driver currently assigned to a shipment.
     * Returns 404 when the shipment has no assigned driver.
     *
     * <pre>
     * GET /api/shipments/{id}/driver-location
     * </pre>
     */
    @GetMapping("/{id}/driver-location")
    public ResponseEntity<?> getAssignedDriverLocation(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(shipmentService.getAssignedDriverLocation(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ── Shipment Location (Milestone 2) ────────────────────────────────────────

    /**
     * Stores / updates the shipment's current GPS position.
     *
     * <p>Roles allowed: DISPATCHER (Logistics Operator) and DRIVER.
     * Drivers call this from the mobile app while in transit; the Logistics
     * Operator can also correct a position from the dashboard.</p>
     *
     * <pre>
     * POST /api/shipments/{id}/location
     * Body: { "latitude": 17.385, "longitude": 78.4867, "city": "Hyderabad", "source": "DRIVER_APP" }
     * </pre>
     */
    @PreAuthorize("hasAnyRole('DISPATCHER', 'DRIVER', 'ADMIN')")
    @PostMapping("/{id}/location")
    public ResponseEntity<ShipmentLocationResponse> updateShipmentLocation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateShipmentLocationRequest request) {
        return ResponseEntity.ok(shipmentService.updateShipmentLocation(id, request));
    }

    /**
     * Retrieves the shipment's own last known GPS position.
     * Returns coordinates of the parcel — not the driver's live device location.
     * Lat/lon fields are {@code null} when no location has ever been posted.
     *
     * <pre>
     * GET /api/shipments/{id}/location
     * </pre>
     */
    @GetMapping("/{id}/location")
    public ResponseEntity<ShipmentLocationResponse> getShipmentLocation(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.getShipmentLocation(id));
    }

    /**
     * Assigns an approved DRIVER to a shipment.
     *
     * <p>Only {@code ROLE_DISPATCHER} (Logistics Operator) or {@code ROLE_ADMIN}
     * may call this endpoint. The service validates that the target user has
     * {@code DRIVER} role and {@code APPROVED} registration status; it returns
     * HTTP 400 if either guard fails.</p>
     *
     * <pre>
     * PUT /api/shipments/{id}/assign-driver
     * Body: { "driverId": 21 }
     * </pre>
     */
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    @PutMapping("/{id}/assign-driver")
    public ResponseEntity<DriverAssignmentResponse> assignDriver(
            @PathVariable Long id,
            @Valid @RequestBody AssignDriverRequest request) {
        return ResponseEntity.ok(shipmentService.assignDriver(id, request.getDriverId()));
    }

    /**
     * Removes the currently assigned driver from a shipment.
     * Idempotent — safe to call even when no driver is currently assigned.
     *
     * <pre>
     * DELETE /api/shipments/{id}/assign-driver
     * </pre>
     */
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    @DeleteMapping("/{id}/assign-driver")
    public ResponseEntity<DriverAssignmentResponse> unassignDriver(
            @PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.unassignDriver(id));
    }

    // ──────────────────────────────────────────────────────────
    // Delay Prediction (Milestone 2)
    // ──────────────────────────────────────────────────────────

    /**
     * Calculates the estimated delay for a shipment.
     *
     * <pre>
     * POST /api/shipments/{id}/predict-delay
     * </pre>
     */
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER')")
    @PostMapping("/{id}/predict-delay")
    public ResponseEntity<DelayPredictionResponse> predictDelay(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.predictDelay(id));
    }

    /**
     * Retrieves the current delay information without recalculating.
     *
     * <pre>
     * GET /api/shipments/{id}/delay
     * </pre>
     */
    @PreAuthorize("hasAnyRole('ADMIN','DISPATCHER','DRIVER','CUSTOMER','BUSINESS_CLIENT')")
    @GetMapping("/{id}/delay")
    public ResponseEntity<DelayPredictionResponse> getDelay(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.getDelay(id));
    }

    @GetMapping("/test-auth")
    public org.springframework.http.ResponseEntity<String> testAuth() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean hasRole = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_DRIVER"));
        return org.springframework.http.ResponseEntity.ok("ROLE_DRIVER present: " + hasRole);
    }

}
