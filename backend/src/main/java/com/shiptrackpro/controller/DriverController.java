package com.shiptrackpro.controller;

import com.shiptrackpro.dto.AvailableShipmentResponse;
import com.shiptrackpro.dto.DriverResponse;
import com.shiptrackpro.dto.ShipmentResponse;
import com.shiptrackpro.dto.UpdateLocationRequest;
import com.shiptrackpro.service.DriverRequestService;
import com.shiptrackpro.service.ShipmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST API for driver-related operations.
 *
 * <p>Two route groups are served by this controller:
 * <ul>
 *   <li>{@code /api/drivers} — admin/dispatcher-facing list of available drivers
 *       and the driver's own location update endpoint.</li>
 *   <li>{@code /api/driver} — driver-facing delivery-request workflow endpoints
 *       (Phase 1): available shipments, accept, reject, my shipments.</li>
 * </ul>
 * </p>
 */
@RestController
public class DriverController {

    private final ShipmentService      shipmentService;
    private final DriverRequestService driverRequestService;

    public DriverController(ShipmentService shipmentService,
                            DriverRequestService driverRequestService) {
        this.shipmentService      = shipmentService;
        this.driverRequestService = driverRequestService;
    }

    // ── /api/drivers — existing endpoints ────────────────────────────────

    /**
     * Returns all APPROVED users with the DRIVER role.
     * Used by the Logistics Operator dashboard driver picker dropdown.
     */
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    @GetMapping("/api/drivers")
    public ResponseEntity<List<DriverResponse>> getAvailableDrivers() {
        return ResponseEntity.ok(shipmentService.getAvailableDrivers());
    }

    /**
     * Updates the authenticated driver's current GPS location (self-update).
     * Only {@code ROLE_DRIVER} may call this endpoint.
     *
     * <pre>PUT /api/drivers/location</pre>
     */
    @PreAuthorize("hasRole('DRIVER')")
    @PutMapping("/api/drivers/location")
    public ResponseEntity<Void> updateDriverLocation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateLocationRequest request) {
        shipmentService.updateDriverLocation(userDetails.getUsername(), request);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves the current location of a specific driver by their user ID.
     * Useful for the Logistics Operator dashboard map and admin monitoring.
     *
     * <pre>GET /api/drivers/{driverId}/location</pre>
     */
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    @GetMapping("/api/drivers/{driverId}/location")
    public ResponseEntity<?> getDriverLocation(@PathVariable Long driverId) {
        return ResponseEntity.ok(driverRequestService.getDriverLocation(driverId));
    }

    /**
     * Allows an admin system or backend job to push a GPS fix for a specific driver
     * without requiring the driver's own JWT (e.g. a fleet telematics integration).
     * Restricted to ADMIN only to prevent spoofing.
     *
     * <pre>POST /api/drivers/{driverId}/location</pre>
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/drivers/{driverId}/location")
    public ResponseEntity<Void> setDriverLocationById(
            @PathVariable Long driverId,
            @Valid @RequestBody UpdateLocationRequest request) {
        driverRequestService.updateDriverLocationById(driverId, request);
        return ResponseEntity.ok().build();
    }

    // ── /api/driver — Phase 1 delivery-request endpoints ─────────────────

    /**
     * Returns the broadcast pool of shipments waiting for a driver to accept.
     * Only shipments with status PENDING_DRIVER and no assigned driver appear.
     *
     * <pre>GET /api/driver/available-shipments</pre>
     */
    @PreAuthorize("hasRole('DRIVER')")
    @GetMapping("/api/driver/available-shipments")
    public ResponseEntity<List<AvailableShipmentResponse>> getAvailableShipments(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(driverRequestService.getAvailableShipments(userDetails.getUsername()));
    }

    /**
     * Accepts a delivery request. The authenticated driver is assigned to the
     * shipment; status transitions to DRIVER_ASSIGNED. If another driver has
     * already accepted, returns HTTP 409 Conflict.
     *
     * <pre>POST /api/driver/accept/{shipmentId}</pre>
     */
    @PreAuthorize("hasRole('DRIVER')")
    @PostMapping("/api/driver/accept/{shipmentId}")
    public ResponseEntity<Map<String, String>> acceptShipment(
            @PathVariable Long shipmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String message = driverRequestService.acceptShipment(shipmentId, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", message));
    }

    /**
     * Dismisses a delivery request for the caller.
     * The shipment remains in the broadcast pool for other drivers, but is hidden from this driver.
     *
     * <pre>POST /api/driver/reject/{shipmentId}</pre>
     */
    @PreAuthorize("hasRole('DRIVER')")
    @PostMapping("/api/driver/reject/{shipmentId}")
    public ResponseEntity<Map<String, String>> rejectShipment(
            @PathVariable Long shipmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String message = driverRequestService.rejectShipment(shipmentId, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", message));
    }

    /**
     * Returns all shipments currently assigned to the authenticated driver.
     *
     * <pre>GET /api/driver/my-shipments</pre>
     */
    @PreAuthorize("hasRole('DRIVER')")
    @GetMapping("/api/driver/my-shipments")
    public ResponseEntity<List<ShipmentResponse>> getMyShipments(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(driverRequestService.getMyShipments(userDetails.getUsername()));
    }
}
