package com.shiptrackpro.service;

import com.shiptrackpro.dto.CreateShipmentRequest;
import com.shiptrackpro.dto.DriverAssignmentResponse;
import com.shiptrackpro.dto.DriverResponse;
import com.shiptrackpro.dto.ShipmentResponse;
import com.shiptrackpro.dto.UpdateShipmentRequest;
import com.shiptrackpro.enums.ShipmentStatus;

import java.util.List;

/**
 * Business operations for managing shipments.
 *
 * <p>MODIFIED: {@code createShipment} now takes the authenticated user's id
 * separately from the request body (see {@code createdBy} note on
 * {@link CreateShipmentRequest}); the single {@code ShipmentRequest} type
 * from the previous version is replaced by
 * {@link CreateShipmentRequest}/{@link UpdateShipmentRequest}.</p>
 */
public interface ShipmentService {

    /**
     * Creates a new shipment with an auto-generated tracking number and a
     * default status of {@code CREATED}.
     *
     * @param request         validated shipment details from the client
     * @param createdByUserId id of the authenticated user creating the shipment
     * @return the created shipment
     */
    ShipmentResponse createShipment(CreateShipmentRequest request, Long createdByUserId);

    /**
     * Retrieves all shipments.
     */
    List<ShipmentResponse> getAllShipments();

    /**
     * Retrieves a single shipment by its primary key.
     *
     * @throws com.shiptrackpro.exception.ResourceNotFoundException if no shipment exists with the given id
     */
    ShipmentResponse getShipmentById(Long id);

    /**
     * Updates the mutable details of an existing shipment.
     *
     * @throws com.shiptrackpro.exception.ResourceNotFoundException if no shipment exists with the given id
     */
    ShipmentResponse updateShipment(Long id, UpdateShipmentRequest request);

    /**
     * Removes a shipment from active operation. Implemented as a
     * soft-cancel (status set to {@code CANCELLED}) rather than a physical
     * delete, to preserve tracking history — see
     * {@code ShipmentServiceImpl.deleteShipment} for the rationale.
     *
     * @throws com.shiptrackpro.exception.ResourceNotFoundException if no shipment exists with the given id
     */
    ShipmentResponse deleteShipment(Long id);

    /**
     * Updates only the shipment status field, leaving all other fields unchanged.
     *
     * @param cancellationReason human-readable reason required when {@code newStatus == CANCELLED};
     *                           pass {@code null} for all other status transitions
     * @param delayReason        human-readable reason required when {@code newStatus == DELAYED};
     *                           pass {@code null} for all other status transitions
     */
    ShipmentResponse updateShipmentStatus(Long id, ShipmentStatus newStatus, String cancellationReason, String delayReason);

    // ── Driver Assignment (Milestone 2) ────────────────────────────────────

    /**
     * Assigns an approved driver to the specified shipment.
     *
     * <p>The target user must have {@code role_name = 'DRIVER'} and
     * {@code registration_status = 'APPROVED'}. Attempting to assign a user who
     * does not meet these criteria results in an {@code IllegalArgumentException}
     * which the controller translates to HTTP 400 Bad Request.</p>
     *
     * @param shipmentId shipment to update
     * @param driverId   primary key of the driver user
     * @return updated shipment including the new driver assignment
     * @throws com.shiptrackpro.exception.ResourceNotFoundException if either the
     *         shipment or the driver user does not exist
     */
    DriverAssignmentResponse assignDriver(Long shipmentId, Long driverId);

    /**
     * Removes the currently assigned driver from the specified shipment.
     * Safe to call even when no driver is currently assigned (idempotent).
     *
     * @param shipmentId shipment to update
     * @return updated shipment with {@code assignedDriver = null}
     * @throws com.shiptrackpro.exception.ResourceNotFoundException if the shipment does not exist
     */
    DriverAssignmentResponse unassignDriver(Long shipmentId);

    /**
     * Returns all users with {@code role_name = 'DRIVER'} and
     * {@code registration_status = 'APPROVED'}, ordered as returned by the
     * repository (natural database order).
     *
     * <p>Used to populate the driver picker dropdown in the Logistics Operator
     * dashboard and to validate assignment requests.</p>
     */
    List<DriverResponse> getAvailableDrivers();

    /**
     * Retrieves the driver currently assigned to the given shipment.
     *
     * @param shipmentId the ID of the shipment
     * @return the assigned driver, or {@code null} if no driver is assigned
     * @throws com.shiptrackpro.exception.ResourceNotFoundException if the shipment does not exist
     */
    DriverResponse getAssignedDriver(Long shipmentId);

    // ── Live Location (Milestone 2) ─────────────────────────────────────────

    /**
     * Updates the location for a specific driver.
     *
     * @param email driver's email (from AuthenticationPrincipal)
     * @param request the location data to update
     */
    void updateDriverLocation(String email, com.shiptrackpro.dto.UpdateLocationRequest request);

    /**
     * Retrieves the assigned driver's location for a given shipment.
     *
     * @param shipmentId the ID of the shipment
     * @return the driver's location
     */
    com.shiptrackpro.dto.DriverLocationResponse getAssignedDriverLocation(Long shipmentId);

    // ── Shipment Location (Milestone 2) ──────────────────────────────────────

    /**
     * Stores a new GPS position for the shipment itself (e.g. from a hub scan
     * or the driver's app when IN_TRANSIT).
     *
     * @param shipmentId the shipment to update
     * @param request    latitude, longitude, optional city label
     * @return the updated shipment location summary
     */
    com.shiptrackpro.dto.ShipmentLocationResponse updateShipmentLocation(
            Long shipmentId,
            com.shiptrackpro.dto.UpdateShipmentLocationRequest request);

    /**
     * Retrieves the shipment's own last known location (independent of the
     * driver's real-time device position).
     *
     * @param shipmentId the shipment to query
     * @return the stored location, or a response with null lat/lon when no
     *         update has ever been posted
     */
    com.shiptrackpro.dto.ShipmentLocationResponse getShipmentLocation(Long shipmentId);

    // ── Delay Prediction (Milestone 2) ───────────────────────────────────────

    /**
     * Calculates the estimated delay for a shipment based on its expected
     * delivery date and current time. Updates the database record.
     *
     * @param shipmentId the ID of the shipment
     * @return the delay prediction response
     */
    com.shiptrackpro.dto.DelayPredictionResponse predictDelay(Long shipmentId);

    /**
     * Retrieves the current delay information without recalculating.
     *
     * @param shipmentId the ID of the shipment
     * @return the delay prediction response
     */
    com.shiptrackpro.dto.DelayPredictionResponse getDelay(Long shipmentId);

    // ── Delivery Confirmation (Milestone 3 + POD) ────────────────────────────

    /**
     * Confirms delivery of a shipment by the authenticated driver, saving the
     * customer's signature and delivery photo as Proof of Delivery (POD).
     *
     * <p>Business rules enforced:
     * <ol>
     *   <li>Shipment must exist.</li>
     *   <li>Shipment status must be {@code OUT_FOR_DELIVERY}.</li>
     *   <li>Delivery must not have been confirmed already.</li>
     *   <li>The caller must be the driver currently assigned to this shipment.</li>
     *   <li>Receiver name must not be blank after trimming.</li>
     *   <li>Signature file must be present and a valid PNG.</li>
     *   <li>Delivery photo must be present, JPG/PNG, and ≤ 5 MB.</li>
     * </ol>
     * On success: files are saved first, then status → {@code DELIVERED} and
     * all POD fields are persisted atomically.</p>
     *
     * @param shipmentId      the shipment to confirm
     * @param driverEmail     email of the authenticated driver (from JWT)
     * @param request         text fields from the multipart form
     * @param signatureFile   PNG drawn on the signature canvas
     * @param deliveryPhotoFile JPG/PNG delivery photo
     * @return structured confirmation response including file paths
     */
    com.shiptrackpro.dto.DeliveryConfirmationResponse confirmDelivery(
            Long shipmentId,
            String driverEmail,
            com.shiptrackpro.dto.DeliveryConfirmationRequest request,
            org.springframework.web.multipart.MultipartFile signatureFile,
            org.springframework.web.multipart.MultipartFile deliveryPhotoFile);

}
