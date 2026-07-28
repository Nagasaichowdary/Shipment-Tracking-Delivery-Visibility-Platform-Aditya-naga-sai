package com.shiptrackpro.service;

import com.shiptrackpro.dto.AvailableShipmentResponse;
import com.shiptrackpro.dto.ShipmentResponse;
import com.shiptrackpro.entity.Address;
import com.shiptrackpro.entity.DriverRejection;
import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.enums.ShipmentStatus;
import com.shiptrackpro.exception.ResourceNotFoundException;
import com.shiptrackpro.exception.ShipmentConflictException;
import com.shiptrackpro.repository.DriverRejectionRepository;
import com.shiptrackpro.repository.ShipmentRepository;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.service.NotificationService;
import com.shiptrackpro.enums.NotificationEventType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Business logic for the Phase 1 Driver Delivery Request workflow.
 *
 * <h3>Workflow</h3>
 * <ol>
 *   <li>A new shipment is created with status {@code PENDING_DRIVER}.</li>
 *   <li>All approved drivers call {@link #getAvailableShipments()} to see the broadcast pool.</li>
 *   <li>The first driver to call {@link #acceptShipment(Long, String)} wins:
 *       the shipment is assigned and its status becomes {@code DRIVER_ASSIGNED}.</li>
 *   <li>All other drivers who call accept receive {@code HTTP 409 Conflict}.</li>
 *   <li>A driver may call {@link #rejectShipment(Long)} to dismiss a request
 *       without affecting the database — the shipment remains in the pool.</li>
 * </ol>
 *
 * <h3>Concurrency</h3>
 * <p>{@link #acceptShipment} acquires a pessimistic write lock on the shipment
 * row before checking assignment state, so only one transaction can claim the
 * shipment even when two drivers click Accept simultaneously.</p>
 */
@Service
public class DriverRequestService {

    private final ShipmentRepository       shipmentRepository;
    private final UserRepository           userRepository;
    private final NotificationService      notificationService;
    private final DriverRejectionRepository driverRejectionRepository;

    public DriverRequestService(ShipmentRepository shipmentRepository,
                                UserRepository userRepository,
                                NotificationService notificationService,
                                DriverRejectionRepository driverRejectionRepository) {
        this.shipmentRepository       = shipmentRepository;
        this.userRepository           = userRepository;
        this.notificationService      = notificationService;
        this.driverRejectionRepository = driverRejectionRepository;
    }

    // ── Available Shipments ────────────────────────────────────────────────

    /**
     * Returns all shipments currently in the PENDING_DRIVER broadcast pool.
     * A shipment is in the pool when its status is PENDING_DRIVER and no
     * driver has been assigned yet.
     *
     * @return list of lightweight delivery-request cards (never {@code null})
     */
    @Transactional(readOnly = true)
    public List<AvailableShipmentResponse> getAvailableShipments(String driverEmail) {
        User driver = userRepository.findByEmail(driverEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + driverEmail));

        // Collect IDs of shipments this driver has already rejected
        Set<Long> rejectedShipmentIds = new java.util.HashSet<>(
                driverRejectionRepository.findByDriver_UserId(driver.getUserId())
                        .stream()
                        .map(r -> r.getShipment().getId())
                        .toList()
        );

        return shipmentRepository
                .findPendingDriverShipments(ShipmentStatus.PENDING_DRIVER)
                .stream()
                .filter(s -> !rejectedShipmentIds.contains(s.getId()))
                .map(this::mapToAvailableResponse)
                .toList();
    }

    // ── Accept ─────────────────────────────────────────────────────────────

    /**
     * The authenticated driver claims the specified shipment.
     *
     * <p>A pessimistic write lock is held for the duration of the transaction
     * to guarantee only one driver can win the race.</p>
     *
     * @param shipmentId the shipment to accept
     * @param driverEmail email of the authenticated driver
     * @throws ResourceNotFoundException  if the shipment or driver does not exist
     * @throws ShipmentConflictException  if the shipment is already assigned (HTTP 409)
     * @throws IllegalArgumentException   if the user is not an approved active driver
     */
    @Transactional
    public String acceptShipment(Long shipmentId, String driverEmail) {
        // Acquire pessimistic write lock — prevents concurrent accepts
        Shipment shipment = shipmentRepository.findByIdForUpdate(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shipment not found with id: " + shipmentId));

        // Guard: must still be in the broadcast pool
        if (shipment.getAssignedDriver() != null
                || !ShipmentStatus.PENDING_DRIVER.equals(shipment.getShipmentStatus())) {
            throw new ShipmentConflictException(
                    "Shipment already assigned to another driver. Please refresh your list.");
        }

        User driver = resolveApprovedDriver(driverEmail);


        // Assign and transition status
        shipment.setAssignedDriver(driver);
        shipment.setShipmentStatus(ShipmentStatus.DRIVER_ASSIGNED);
        Shipment saved = shipmentRepository.save(shipment);
        
        // Notify driver
        notificationService.createNotification(driver, saved, NotificationEventType.DRIVER_ASSIGNED, 
                "Delivery Accepted", "You have successfully accepted shipment " + saved.getTrackingNumber());
                
        // Notify stakeholders
        java.util.Set<Long> notifiedUserIds = new java.util.HashSet<>();
        notifiedUserIds.add(driver.getUserId());
        
        if (saved.getSenderUser() != null) {
            notificationService.createNotification(saved.getSenderUser(), saved, NotificationEventType.DRIVER_ASSIGNED, 
                    "Driver Assigned", "Driver " + driver.getFullName() + " is heading to pickup shipment " + saved.getTrackingNumber());
            notifiedUserIds.add(saved.getSenderUser().getUserId());
        }
        if (saved.getReceiverUser() != null && !notifiedUserIds.contains(saved.getReceiverUser().getUserId())) {
            notificationService.createNotification(saved.getReceiverUser(), saved, NotificationEventType.DRIVER_ASSIGNED, 
                    "Driver Assigned", "Driver " + driver.getFullName() + " is heading to pickup shipment " + saved.getTrackingNumber());
            notifiedUserIds.add(saved.getReceiverUser().getUserId());
        }
        if (saved.getCreatedBy() != null && !notifiedUserIds.contains(saved.getCreatedBy().getUserId())) {
            notificationService.createNotification(saved.getCreatedBy(), saved, NotificationEventType.DRIVER_ASSIGNED, 
                    "Driver Assigned", "Driver " + driver.getFullName() + " is heading to pickup shipment " + saved.getTrackingNumber());
            notifiedUserIds.add(saved.getCreatedBy().getUserId());
        }

        return "Delivery accepted successfully. Shipment "
                + shipment.getTrackingNumber() + " is now assigned to you.";
    }

    // ── Reject ─────────────────────────────────────────────────────────────

    /**
     * Persists the driver's rejection so they never see this shipment again.
     * The shipment stays in the broadcast pool for other drivers.
     *
     * @param shipmentId  the shipment to reject
     * @param driverEmail email of the authenticated driver
     * @return a confirmation message
     */
    @Transactional
    public String rejectShipment(Long shipmentId, String driverEmail) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + shipmentId));

        User driver = resolveApprovedDriver(driverEmail);

        // Idempotent: skip if already rejected by this driver
        if (!driverRejectionRepository.existsByDriver_UserIdAndShipment_Id(driver.getUserId(), shipmentId)) {
            DriverRejection rejection = DriverRejection.builder()
                    .driver(driver)
                    .shipment(shipment)
                    .build();
            driverRejectionRepository.save(rejection);
        }

        return "Shipment request rejected and will no longer appear in your list.";
    }

    // ── My Shipments ───────────────────────────────────────────────────────

    /**
     * Returns all shipments currently assigned to the authenticated driver,
     * regardless of their current status (i.e. in-progress deliveries).
     *
     * @param driverEmail email of the authenticated driver
     * @return list of assigned shipments (never {@code null})
     */
    @Transactional(readOnly = true)
    public List<ShipmentResponse> getMyShipments(String driverEmail) {
        User driver = userRepository.findByEmail(driverEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + driverEmail));

        return shipmentRepository.findByAssignedDriver(driver)
                .stream()
                .map(this::mapToShipmentResponse)
                .toList();
    }

    // ── Mapping helpers ────────────────────────────────────────────────────

    private AvailableShipmentResponse mapToAvailableResponse(Shipment s) {
        return AvailableShipmentResponse.builder()
                .shipmentId(s.getId())
                .trackingNumber(s.getTrackingNumber())
                .pickupAddress(formatAddress(s.getOriginAddress()))
                .destinationAddress(formatAddress(s.getDestinationAddress()))
                .shipmentType(s.getShipmentType())
                .weight(s.getPackageWeight())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private ShipmentResponse mapToShipmentResponse(Shipment s) {
        User driver = s.getAssignedDriver();
        return ShipmentResponse.builder()
                .id(s.getId())
                .trackingNumber(s.getTrackingNumber())
                .senderName(s.getSenderName())
                .senderPhone(s.getSenderPhone())
                .senderUserId(s.getSenderUser() != null ? s.getSenderUser().getUserId() : null)
                .receiverName(s.getReceiverName())
                .receiverPhone(s.getReceiverPhone())
                .receiverUserId(s.getReceiverUser() != null ? s.getReceiverUser().getUserId() : null)
                .originAddress(mapAddress(s.getOriginAddress()))
                .destinationAddress(mapAddress(s.getDestinationAddress()))
                .packageWeight(s.getPackageWeight())
                .shipmentType(s.getShipmentType())
                .packageType(s.getPackageType())
                .shipmentStatus(s.getShipmentStatus())
                .expectedDeliveryDate(s.getExpectedDeliveryDate())
                .createdByUserId(s.getCreatedBy().getUserId())
                .assignedDriverId(driver != null ? driver.getUserId() : null)
                .assignedDriverName(driver != null ? driver.getFullName() : null)
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    private com.shiptrackpro.dto.AddressResponse mapAddress(
            com.shiptrackpro.entity.Address address) {
        if (address == null) return null;
        return com.shiptrackpro.dto.AddressResponse.builder()
                .id(address.getId())
                .line1(address.getLine1())
                .line2(address.getLine2())
                .city(address.getCity())
                .state(address.getState())
                .postalCode(address.getPostalCode())
                .country(address.getCountry())
                .build();
    }

    private String formatAddress(Address address) {
        if (address == null) return "N/A";
        StringBuilder sb = new StringBuilder();
        if (address.getLine1() != null) sb.append(address.getLine1());
        if (address.getCity()  != null) sb.append(", ").append(address.getCity());
        if (address.getState() != null) sb.append(", ").append(address.getState());
        return sb.toString();
    }

    // ── Guard helpers ──────────────────────────────────────────────────────

    /**
     * Resolves the driver user and enforces all invariants:
     * must exist, have DRIVER role, be APPROVED, and be active.
     */
    private User resolveApprovedDriver(String email) {
        User driver = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + email));

        if (!"DRIVER".equals(driver.getRole().getRoleName())) {
            throw new IllegalArgumentException("User does not have the DRIVER role.");
        }
        if (driver.getRegistrationStatus() != RegistrationStatus.APPROVED) {
            throw new IllegalArgumentException("Driver account is not approved.");
        }
        if (driver.getActive() == null || !driver.getActive()) {
            throw new IllegalArgumentException("Driver account is inactive.");
        }
        return driver;
    }

    // ──────────────────────────────────────────────────────────────────
    // Driver Location by ID  (Milestone 2)
    // ──────────────────────────────────────────────────────────────────

    /**
     * Returns the current stored GPS position for a driver identified by their
     * primary key.  Used by Dispatcher/Admin to view any driver's position
     * directly without going through a shipment.
     *
     * @param driverId primary key of the driver {@link User}
     * @return location response (lat/lon may be null if never updated)
     * @throws ResourceNotFoundException if no user exists with this id
     * @throws IllegalArgumentException  if the user is not a DRIVER
     */
    @Transactional(readOnly = true)
    public com.shiptrackpro.dto.DriverLocationResponse getDriverLocation(Long driverId) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + driverId));

        if (!"DRIVER".equals(driver.getRole().getRoleName())) {
            throw new IllegalArgumentException("User " + driverId + " is not a DRIVER.");
        }

        return com.shiptrackpro.dto.DriverLocationResponse.builder()
                .driverId(driver.getUserId())
                .driverName(driver.getFullName())
                .latitude(driver.getCurrentLatitude())
                .longitude(driver.getCurrentLongitude())
                .lastUpdated(driver.getLastLocationUpdate())
                .build();
    }

    /**
     * Pushes a GPS fix for a specific driver by their primary key.
     * Intended for admin/backend-system use (e.g. fleet telematics integration)
     * where the driver's own JWT is not available.
     *
     * @param driverId primary key of the driver {@link User}
     * @param request  latitude and longitude to store
     * @throws ResourceNotFoundException if no user exists with this id
     * @throws IllegalArgumentException  if the user is not an approved DRIVER
     */
    @Transactional
    public void updateDriverLocationById(Long driverId,
                                         com.shiptrackpro.dto.UpdateLocationRequest request) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + driverId));

        if (!"DRIVER".equals(driver.getRole().getRoleName())) {
            throw new IllegalArgumentException("User " + driverId + " is not a DRIVER.");
        }
        if (driver.getRegistrationStatus() != RegistrationStatus.APPROVED) {
            throw new IllegalArgumentException("Driver " + driverId + " is not approved.");
        }
        if (driver.getActive() == null || !driver.getActive()) {
            throw new IllegalArgumentException("Driver " + driverId + " is not active.");
        }

        driver.setCurrentLatitude(request.getLatitude());
        driver.setCurrentLongitude(request.getLongitude());
        driver.setLastLocationUpdate(java.time.LocalDateTime.now());
        userRepository.save(driver);
    }
}
