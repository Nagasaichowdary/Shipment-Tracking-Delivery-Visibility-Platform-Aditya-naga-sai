package com.shiptrackpro.controller;

import com.shiptrackpro.dto.AssignDriverRequest;
import com.shiptrackpro.dto.CreateShipmentRequest;
import com.shiptrackpro.dto.DelayPredictionResponse;
import com.shiptrackpro.dto.DeliveryConfirmationRequest;
import com.shiptrackpro.dto.DeliveryConfirmationResponse;
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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;


import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
    private final com.shiptrackpro.service.PodPdfService podPdfService;

    public ShipmentController(ShipmentService shipmentService,
                              com.shiptrackpro.service.PodPdfService podPdfService) {
        this.shipmentService = shipmentService;
        this.podPdfService   = podPdfService;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER', 'BUSINESS_CLIENT')")
    @PostMapping
    public ResponseEntity<ShipmentResponse> createShipment(
            @Valid @RequestBody CreateShipmentRequest request,
            @AuthenticationPrincipal User currentUser) {
        ShipmentResponse response = shipmentService.createShipment(request, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Returns ALL shipments.
     * Restricted to ADMIN and LOGISTICS OPERATOR (DISPATCHER) roles only.
     * Customers must use GET /api/shipments/my instead.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    @GetMapping
    public ResponseEntity<List<ShipmentResponse>> getAllShipments() {
        return ResponseEntity.ok(shipmentService.getAllShipments());
    }

    /**
     * Returns the shipments belonging to the authenticated Customer or Business Client.
     *
     * <p>The caller's identity is extracted from the JWT via
     * {@code @AuthenticationPrincipal} — a userId is never accepted from the
     * request to prevent customers from accessing other customers' data.</p>
     *
     * <p>A new customer with no associated shipments receives an empty list.
     * This endpoint returns data only for shipments where the authenticated
     * user is the registered receiver or sender.</p>
     *
     * <pre>GET /api/shipments/my</pre>
     */
    @PreAuthorize("hasAnyRole('CUSTOMER', 'BUSINESS_CLIENT')")
    @GetMapping("/my")
    public ResponseEntity<List<ShipmentResponse>> getMyShipments(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(shipmentService.getMyShipments(currentUser.getUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShipmentResponse> getShipmentById(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.getShipmentById(id));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    @PutMapping("/{id}")
    public ResponseEntity<ShipmentResponse> updateShipment(
            @PathVariable Long id,
            @Valid @RequestBody UpdateShipmentRequest request) {
        return ResponseEntity.ok(shipmentService.updateShipment(id, request));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
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

    // Debug endpoint removed before deployment.

    // ── Milestone 3: Delivery Confirmation + Proof of Delivery ───────────────

    /**
     * Confirms delivery and stores Proof of Delivery (signature + photo).
     *
     * <p>Accepted as {@code multipart/form-data}:
     * <ul>
     *   <li>{@code receiverName} — required text field</li>
     *   <li>{@code deliveryRemarks} — optional text field</li>
     *   <li>{@code signature} — PNG from the canvas (required)</li>
     *   <li>{@code photo} — JPG/PNG delivery photo, max 5 MB (required)</li>
     * </ul>
     * The driver's identity is resolved from the JWT — never from the request.</p>
     *
     * <pre>POST /api/shipments/{id}/confirm-delivery</pre>
     */
    @PreAuthorize("hasRole('DRIVER')")
    @PostMapping(value = "/{id}/confirm-delivery",
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DeliveryConfirmationResponse> confirmDelivery(
            @PathVariable Long id,
            @RequestParam("receiverName") String receiverName,
            @RequestParam(value = "deliveryRemarks", required = false) String deliveryRemarks,
            @RequestPart("signature") MultipartFile signatureFile,
            @RequestPart("photo")     MultipartFile photoFile,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Assemble DTO from individual @RequestParam values so the service-layer
        // Bean Validation guards can still run without @RequestBody.
        DeliveryConfirmationRequest request = new DeliveryConfirmationRequest();
        request.setReceiverName(receiverName);
        request.setDeliveryRemarks(deliveryRemarks);

        DeliveryConfirmationResponse response =
                shipmentService.confirmDelivery(id, userDetails.getUsername(),
                        request, signatureFile, photoFile);
        return ResponseEntity.ok(response);
    }

    // ── Proof of Delivery — file serving ─────────────────────────────────────

    /**
     * Streams a Proof of Delivery file (signature PNG or delivery photo) back
     * to the authenticated caller.
     *
     * <p>The file path is reconstructed from the tracking number and the
     * original filename that was stored in the DB. The endpoint deliberately
     * does NOT accept arbitrary filesystem paths — only the fixed directory
     * structure {@code uploads/delivery/{trackingNumber}/{filename}} is
     * reachable, which prevents path-traversal attacks.</p>
     *
     * <pre>GET /api/shipments/{id}/pod/{filename}</pre>
     */
    @GetMapping("/{id}/pod/{filename:.+}")
    public ResponseEntity<org.springframework.core.io.Resource> servePodFile(
            @PathVariable Long id,
            @PathVariable String filename,
            @org.springframework.beans.factory.annotation.Value("${app.upload.dir:uploads}") String uploadDir) {

        // Resolve the shipment so we know its trackingNumber (needed for path)
        ShipmentResponse shipment = shipmentService.getShipmentById(id);
        String trackingNumber = shipment.getTrackingNumber()
                .replaceAll("[^A-Za-z0-9\\-]", "_"); // sanitise — matches FileStorageService

        // Sanitise filename — allow only alphanumeric, dash, dot, underscore
        String safeFilename = filename.replaceAll("[^A-Za-z0-9.\\-_]", "");

        Path filePath = Paths.get(uploadDir, "delivery", trackingNumber, safeFilename)
                .toAbsolutePath().normalize();

        // Guard: resolved path must still sit inside the upload directory
        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!filePath.startsWith(uploadRoot)) {
            return ResponseEntity.badRequest().build();
        }

        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        try {
            org.springframework.core.io.Resource resource =
                    new org.springframework.core.io.UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + safeFilename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (java.io.IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── Proof of Delivery — PDF download ──────────────────────────────────────

    /**
     * Generates and streams a Proof of Delivery PDF for the given shipment.
     *
     * <p>Access control is enforced inside {@link PodPdfService#generatePodPdf}:
     * ADMIN and LOGISTICS_OPERATOR are always allowed; DRIVER is allowed only
     * for their own deliveries; BUSINESS_CLIENT and CUSTOMER only for their
     * own shipments (creator / sender / receiver). All checks use the JWT
     * principal — never a client-supplied parameter.</p>
     *
     * <pre>GET /api/shipments/{id}/proof-of-delivery/pdf</pre>
     */
    @GetMapping(value = "/{id}/proof-of-delivery/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadPodPdf(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Derive the role string from the granted authorities (e.g. "ROLE_DRIVER")
        String callerRole = userDetails.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .findFirst()
                .orElse("");

        try {
            byte[] pdfBytes = podPdfService.generatePodPdf(id,
                    userDetails.getUsername(), callerRole);

            String filename = "POD-" + id + ".pdf";
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(pdfBytes);

        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).build();
        } catch (IllegalStateException e) {
            // Shipment not yet DELIVERED
            return ResponseEntity.badRequest().build();
        } catch (java.io.IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

}
