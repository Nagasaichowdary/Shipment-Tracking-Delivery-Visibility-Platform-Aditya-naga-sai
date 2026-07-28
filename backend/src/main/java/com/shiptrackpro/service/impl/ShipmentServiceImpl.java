package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.AddressRequest;
import com.shiptrackpro.dto.AddressResponse;
import com.shiptrackpro.dto.CreateShipmentRequest;
import com.shiptrackpro.dto.DriverAssignmentResponse;
import com.shiptrackpro.dto.DriverResponse;
import com.shiptrackpro.dto.ShipmentResponse;
import com.shiptrackpro.dto.UpdateShipmentRequest;
import com.shiptrackpro.entity.Address;
import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.enums.ShipmentStatus;
import com.shiptrackpro.exception.ResourceNotFoundException;
import com.shiptrackpro.repository.ShipmentRepository;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.service.EtaCalculationService;
import com.shiptrackpro.service.ShipmentService;
import com.shiptrackpro.service.NotificationService;
import com.shiptrackpro.enums.NotificationEventType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Default implementation of {@link ShipmentService}.
 *
 * <p>MODIFIED from the previous version: mapping now handles the
 * {@code Address}/{@code User} relations introduced by the normalized
 * schema, and {@code createdBy} is resolved from the authenticated
 * principal rather than the request body.</p>
 */
@Service
@Transactional
public class ShipmentServiceImpl implements ShipmentService {

    private static final String TRACKING_NUMBER_PREFIX = "SHIP-";
    private static final int TRACKING_NUMBER_SUFFIX_LENGTH = 8;

    private final ShipmentRepository shipmentRepository;
    private final UserRepository userRepository;
    private final EtaCalculationService etaCalculationService;
    private final NotificationService notificationService;

    /**
     * Constructor injection — preferred over field injection for
     * testability and immutability of dependencies.
     */
    public ShipmentServiceImpl(ShipmentRepository shipmentRepository,
                               UserRepository userRepository,
                               EtaCalculationService etaCalculationService,
                               NotificationService notificationService) {
        this.shipmentRepository = shipmentRepository;
        this.userRepository = userRepository;
        this.etaCalculationService = etaCalculationService;
        this.notificationService = notificationService;
    }

    @Override
    public ShipmentResponse createShipment(CreateShipmentRequest request, Long createdByUserId) {
        User createdBy = findUserOrThrow(createdByUserId, "creator");

        Shipment shipment = Shipment.builder()
                .trackingNumber(generateUniqueTrackingNumber())
                .senderName(request.getSenderName())
                .senderPhone(request.getSenderPhone())
                .senderUser(resolveOptionalUser(request.getSenderUserId()))
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .receiverUser(resolveOptionalUser(request.getReceiverUserId()))
                .originAddress(toAddressEntity(request.getOriginAddress()))
                .destinationAddress(toAddressEntity(request.getDestinationAddress()))
                .packageWeight(request.getPackageWeight())
                .shipmentType(request.getShipmentType())
                .packageType(request.getPackageType())
                .shipmentStatus(ShipmentStatus.PENDING_DRIVER)   // broadcast to driver pool
                .expectedDeliveryDate(request.getExpectedDeliveryDate())
                .createdBy(createdBy)
                .build();


        // originAddress/destinationAddress are transient at this point;
        // cascade = {PERSIST, MERGE} on Shipment's associations (see the
        // modified entity) persists them in the same operation.
        Shipment saved = shipmentRepository.save(shipment);
        
        // Notify relevant stakeholders (sender, receiver, creator)
        notifyStakeholders(saved, NotificationEventType.SHIPMENT_CREATED, 
                "Shipment Created", "Shipment " + saved.getTrackingNumber() + " has been created.");
        
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShipmentResponse> getAllShipments() {
        return shipmentRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ShipmentResponse getShipmentById(Long id) {
        return mapToResponse(findShipmentOrThrow(id));
    }

    @Override
    public ShipmentResponse updateShipment(Long id, UpdateShipmentRequest request) {
        Shipment shipment = findShipmentOrThrow(id);

        shipment.setSenderName(request.getSenderName());
        shipment.setSenderPhone(request.getSenderPhone());
        shipment.setSenderUser(resolveOptionalUser(request.getSenderUserId()));
        shipment.setReceiverName(request.getReceiverName());
        shipment.setReceiverPhone(request.getReceiverPhone());
        shipment.setReceiverUser(resolveOptionalUser(request.getReceiverUserId()));
        shipment.setPackageWeight(request.getPackageWeight());
        shipment.setShipmentType(request.getShipmentType());
        shipment.setPackageType(request.getPackageType());
        shipment.setExpectedDeliveryDate(request.getExpectedDeliveryDate());

        // Update the existing Address rows in place rather than replacing
        // the association — avoids creating orphaned address records on
        // every edit. Managed-entity field changes are flushed by JPA
        // dirty checking; the explicit save() below is just for clarity.
        copyAddressFields(shipment.getOriginAddress(), request.getOriginAddress());
        copyAddressFields(shipment.getDestinationAddress(), request.getDestinationAddress());

        // id, trackingNumber, shipmentStatus, createdBy, createdAt are
        // intentionally left untouched — system-managed / immutable via
        // this endpoint.
        Shipment updated = shipmentRepository.save(shipment);
        return mapToResponse(updated);
    }

    @Override
    public ShipmentResponse deleteShipment(Long id) {
        Shipment shipment = findShipmentOrThrow(id);

        // Soft-cancel rather than a hard delete: shipment history is
        // valuable for tracking, analytics, and customer support, so the
        // record is preserved with a terminal CANCELLED status instead of
        // being removed from the database. If a genuine hard delete is
        // ever required, replace this with shipmentRepository.delete(shipment).
        shipment.setShipmentStatus(ShipmentStatus.CANCELLED);

        Shipment cancelled = shipmentRepository.save(shipment);
        
        notifyStakeholders(cancelled, NotificationEventType.CANCELLED, 
                "Shipment Cancelled", "Shipment " + cancelled.getTrackingNumber() + " was cancelled.");
        
        return mapToResponse(cancelled);
    }

    @Override
    public ShipmentResponse updateShipmentStatus(Long id, ShipmentStatus newStatus, String cancellationReason, String delayReason) {
        Shipment shipment = findShipmentOrThrow(id);

        shipment.setShipmentStatus(newStatus);
        
        if (ShipmentStatus.CANCELLED.equals(newStatus)) {
            shipment.setCancellationReason(cancellationReason);
        } else {
            shipment.setCancellationReason(null);
        }

        if (ShipmentStatus.DELAYED.equals(newStatus)) {
            shipment.setDelayReason(delayReason);
        } else {
            shipment.setDelayReason(null);
        }
        
        Shipment updated = shipmentRepository.save(shipment);
        
        NotificationEventType eventType = mapStatusToEvent(newStatus);
        if (eventType != null) {
            String title;
            String message;
            if (ShipmentStatus.DELAYED.equals(newStatus)) {
                // Rich message that includes the operator-supplied delay reason
                title = "Shipment Delayed";
                String reason = (updated.getDelayReason() != null && !updated.getDelayReason().isBlank())
                        ? updated.getDelayReason()
                        : "No reason provided";
                message = "Shipment " + updated.getTrackingNumber() + " has been delayed.\n"
                        + "Reason: " + reason + "\n"
                        + "ETA has been updated.";
            } else {
                title = "Shipment Update";
                message = "Shipment " + updated.getTrackingNumber() + " status changed to " + newStatus.name();
            }
            notifyStakeholders(updated, eventType, title, message);
        }
        
        return mapToResponse(updated);
    }
    
    private void notifyStakeholders(Shipment shipment, NotificationEventType eventType, String title, String message) {
        java.util.Set<Long> notifiedUserIds = new java.util.HashSet<>();

        // Notify any platform user directly linked to this shipment row.
        if (shipment.getSenderUser() != null) {
            notificationService.createNotification(shipment.getSenderUser(), shipment, eventType, title, message);
            notifiedUserIds.add(shipment.getSenderUser().getUserId());
        }
        if (shipment.getReceiverUser() != null && !notifiedUserIds.contains(shipment.getReceiverUser().getUserId())) {
            notificationService.createNotification(shipment.getReceiverUser(), shipment, eventType, title, message);
            notifiedUserIds.add(shipment.getReceiverUser().getUserId());
        }
        if (shipment.getCreatedBy() != null && !notifiedUserIds.contains(shipment.getCreatedBy().getUserId())) {
            notificationService.createNotification(shipment.getCreatedBy(), shipment, eventType, title, message);
            notifiedUserIds.add(shipment.getCreatedBy().getUserId());
        }

        // Broadcast to all approved CUSTOMER and BUSINESS_CLIENT users.
        // senderUser / receiverUser are always null because the frontend never
        // collects userId values from the create-shipment form, so these two
        // roles would otherwise receive no notifications at all.
        java.util.List<String> broadcastRoles = java.util.List.of("CUSTOMER", "BUSINESS_CLIENT");
        for (String roleName : broadcastRoles) {
            userRepository.findByRole_RoleNameAndRegistrationStatus(roleName, com.shiptrackpro.entity.RegistrationStatus.APPROVED)
                    .stream()
                    .filter(u -> Boolean.TRUE.equals(u.getActive()))
                    .filter(u -> !notifiedUserIds.contains(u.getUserId()))
                    .forEach(u -> {
                        notificationService.createNotification(u, shipment, eventType, title, message);
                        notifiedUserIds.add(u.getUserId());
                    });
        }
    }
    
    private NotificationEventType mapStatusToEvent(ShipmentStatus status) {
        return switch (status) {
            case PICKED_UP        -> NotificationEventType.PICKED_UP;
            case IN_TRANSIT       -> NotificationEventType.IN_TRANSIT;
            case OUT_FOR_DELIVERY -> NotificationEventType.OUT_FOR_DELIVERY;
            case DELIVERED        -> NotificationEventType.DELIVERED;
            case DELAYED          -> NotificationEventType.DELAYED;
            case CANCELLED        -> NotificationEventType.CANCELLED;
            case FAILED_DELIVERY  -> NotificationEventType.FAILED_DELIVERY;
            case RETURNED         -> NotificationEventType.RETURNED;
            case DRIVER_ASSIGNED  -> NotificationEventType.DRIVER_ASSIGNED;
            case PENDING_DRIVER   -> NotificationEventType.SHIPMENT_CREATED; // reuse closest event
            default               -> null;
        };
    }

    // ──────────────────────────────────────────────────────────────────
    // Driver Assignment  (Milestone 2)
    // ──────────────────────────────────────────────────────────────────

    @Override
    public DriverAssignmentResponse assignDriver(Long shipmentId, Long driverId) {
        Shipment shipment = findShipmentOrThrow(shipmentId);
        User driver     = findUserOrThrow(driverId, "driver");

        // Guard 1: Shipment must not be DELIVERED
        if (ShipmentStatus.DELIVERED.equals(shipment.getShipmentStatus())) {
            throw new IllegalArgumentException(
                    "Cannot assign driver to shipment " + shipment.getTrackingNumber()
                            + " because it is already DELIVERED.");
        }

        // Guard 2: the user must actually have the DRIVER role
        if (!"DRIVER".equals(driver.getRole().getRoleName())) {
            throw new IllegalArgumentException(
                    "User " + driverId + " does not have the DRIVER role."
                            + " Actual role: " + driver.getRole().getRoleName());
        }

        // Guard 3: the driver account must be APPROVED
        if (driver.getRegistrationStatus() != RegistrationStatus.APPROVED) {
            throw new IllegalArgumentException(
                    "Driver " + driverId + " is not approved."
                            + " Current status: " + driver.getRegistrationStatus());
        }

        // Guard 4: the driver account must be active
        if (driver.getActive() == null || !driver.getActive()) {
            throw new IllegalArgumentException(
                    "Driver " + driverId + " is inactive and cannot be assigned.");
        }

        shipment.setAssignedDriver(driver);
        Shipment saved = shipmentRepository.save(shipment);
        
        // Notify driver
        notificationService.createNotification(driver, saved, NotificationEventType.DRIVER_ASSIGNED, 
                "New Assignment", "You have been assigned to shipment " + saved.getTrackingNumber());
                
        // Notify stakeholders
        notifyStakeholders(saved, NotificationEventType.DRIVER_ASSIGNED, 
                "Driver Assigned", "A driver has been assigned to shipment " + saved.getTrackingNumber());

        return DriverAssignmentResponse.builder()
                .shipmentId(saved.getId())
                .trackingNumber(saved.getTrackingNumber())
                .shipmentStatus(saved.getShipmentStatus().name())
                .assignedDriver(mapToDriverResponse(driver))
                .assignedAt(saved.getUpdatedAt())
                .assigned(true)
                .message("Driver " + driver.getFullName() + " assigned to shipment "
                        + saved.getTrackingNumber())
                .build();
    }

    @Override
    public DriverAssignmentResponse unassignDriver(Long shipmentId) {
        Shipment shipment = findShipmentOrThrow(shipmentId);

        if (ShipmentStatus.DELIVERED.equals(shipment.getShipmentStatus())) {
            throw new IllegalArgumentException(
                    "Cannot unassign driver from shipment " + shipment.getTrackingNumber()
                            + " because it is already DELIVERED.");
        }

        shipment.setAssignedDriver(null);
        Shipment saved = shipmentRepository.save(shipment);

        return DriverAssignmentResponse.builder()
                .shipmentId(saved.getId())
                .trackingNumber(saved.getTrackingNumber())
                .shipmentStatus(saved.getShipmentStatus().name())
                .assignedDriver(null)
                .assignedAt(saved.getUpdatedAt())
                .assigned(false)
                .message("Driver unassigned from shipment " + saved.getTrackingNumber())
                .build();
    }

    @Override
    public List<DriverResponse> getAvailableDrivers() {
        return userRepository
                .findByRole_RoleNameAndRegistrationStatus("DRIVER", RegistrationStatus.APPROVED)
                .stream()
                .filter(user -> user.getActive() != null && user.getActive())
                .map(this::mapToDriverResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DriverResponse getAssignedDriver(Long shipmentId) {
        Shipment shipment = findShipmentOrThrow(shipmentId);
        if (shipment.getAssignedDriver() == null) {
            return null;
        }
        return mapToDriverResponse(shipment.getAssignedDriver());
    }

    // ──────────────────────────────────────────────────────────────────
    // Live Location (Milestone 2)
    // ──────────────────────────────────────────────────────────────────

    @Override
    public void updateDriverLocation(String email, com.shiptrackpro.dto.UpdateLocationRequest request) {
        User driver = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

        if (!"DRIVER".equals(driver.getRole().getRoleName())) {
            throw new IllegalArgumentException("User is not a DRIVER");
        }
        if (driver.getRegistrationStatus() != RegistrationStatus.APPROVED) {
            throw new IllegalArgumentException("Driver is not approved");
        }
        if (driver.getActive() == null || !driver.getActive()) {
            throw new IllegalArgumentException("Driver is not active");
        }

        driver.setCurrentLatitude(request.getLatitude());
        driver.setCurrentLongitude(request.getLongitude());
        driver.setLastLocationUpdate(java.time.LocalDateTime.now());
        
        userRepository.save(driver);
    }

    @Override
    @Transactional(readOnly = true)
    public com.shiptrackpro.dto.DriverLocationResponse getAssignedDriverLocation(Long shipmentId) {
        Shipment shipment = findShipmentOrThrow(shipmentId);
        User driver = shipment.getAssignedDriver();
        
        if (driver == null) {
            throw new IllegalArgumentException("Shipment does not have an assigned driver");
        }

        return com.shiptrackpro.dto.DriverLocationResponse.builder()
                .driverId(driver.getUserId())
                .driverName(driver.getFullName())
                .latitude(driver.getCurrentLatitude())
                .longitude(driver.getCurrentLongitude())
                .lastUpdated(driver.getLastLocationUpdate())
                .build();
    }

    // ──────────────────────────────────────────────────────────────────
    // Shipment Location  (Milestone 2)
    // ──────────────────────────────────────────────────────────────────

    /**
     * Persists the shipment's current GPS position.
     *
     * <p>This is the shipment's own location record — separate from the
     * driver's real-time device position stored on the {@code User} row.
     * Use this endpoint for hub scans, checkpoint updates, or driver-app
     * pushes that describe where the parcel physically is.</p>
     */
    @Override
    public com.shiptrackpro.dto.ShipmentLocationResponse updateShipmentLocation(
            Long shipmentId,
            com.shiptrackpro.dto.UpdateShipmentLocationRequest request) {

        Shipment shipment = findShipmentOrThrow(shipmentId);

        shipment.setLastKnownLatitude(request.getLatitude());
        shipment.setLastKnownLongitude(request.getLongitude());
        shipment.setLastLocationUpdatedAt(LocalDateTime.now());

        // Persist optional city label only when supplied
        if (request.getCity() != null && !request.getCity().isBlank()) {
            shipment.setLastKnownCity(request.getCity().trim());
        }

        Shipment saved = shipmentRepository.save(shipment);
        return mapToShipmentLocationResponse(saved);
    }

    /**
     * Returns the shipment's stored location.  Returns a response with
     * {@code null} coordinates when no location update has ever been posted,
     * rather than throwing a 404 — the shipment exists, it just has no GPS
     * fix yet.
     */
    @Override
    @Transactional(readOnly = true)
    public com.shiptrackpro.dto.ShipmentLocationResponse getShipmentLocation(Long shipmentId) {
        Shipment shipment = findShipmentOrThrow(shipmentId);
        return mapToShipmentLocationResponse(shipment);
    }

    /** Maps Shipment location columns to the lightweight location response DTO. */
    private com.shiptrackpro.dto.ShipmentLocationResponse mapToShipmentLocationResponse(Shipment shipment) {
        return com.shiptrackpro.dto.ShipmentLocationResponse.builder()
                .shipmentId(shipment.getId())
                .trackingNumber(shipment.getTrackingNumber())
                .latitude(shipment.getLastKnownLatitude())
                .longitude(shipment.getLastKnownLongitude())
                .lastUpdated(shipment.getLastLocationUpdatedAt())
                .lastKnownCity(shipment.getLastKnownCity())
                .build();
    }

    // ──────────────────────────────────────────────────────────────────
    // Delay Prediction (Milestone 2 — rule-based ETA engine)
    // ──────────────────────────────────────────────────────────────────

    /**
     * Recalculates the dynamic ETA using the rule engine, persists the
     * derived {@code estimatedDelayMinutes} for the simple-delay path, and
     * returns the full enriched response.
     */
    @Override
    public com.shiptrackpro.dto.DelayPredictionResponse predictDelay(Long shipmentId) {
        Shipment shipment = findShipmentOrThrow(shipmentId);

        // Run the rule engine
        EtaCalculationService.EtaResult eta = etaCalculationService.calculate(shipment);

        // Persist the computed delay so the legacy getDelay endpoint still
        // returns a sensible estimatedDelayMinutes value.
        
        Integer previousDelay = shipment.getEstimatedDelayMinutes();
        shipment.setEstimatedDelayMinutes(eta.delayMinutes());
        Shipment saved = shipmentRepository.save(shipment);
        
        // Only notify if newly delayed or delay increased
        if (eta.delayMinutes() > 0 && (previousDelay == null || previousDelay < eta.delayMinutes())) {
            notifyStakeholders(saved, NotificationEventType.DELAYED, 
                    "Shipment Delayed", "Shipment " + saved.getTrackingNumber() + " is delayed by " + eta.delayMinutes() + " minutes.");
        }

        return buildDelayPredictionResponse(saved, eta);
    }

    /**
     * Returns current delay information.  Also runs the rule engine so that
     * callers always get a fresh ETA without having to call predictDelay first.
     */
    @Override
    @Transactional(readOnly = true)
    public com.shiptrackpro.dto.DelayPredictionResponse getDelay(Long shipmentId) {
        Shipment shipment = findShipmentOrThrow(shipmentId);
        EtaCalculationService.EtaResult eta = etaCalculationService.calculate(shipment);
        return buildDelayPredictionResponse(shipment, eta);
    }

    /**
     * Assembles the response DTO from both the persisted shipment data and
     * the freshly computed ETA result.
     */
    private com.shiptrackpro.dto.DelayPredictionResponse buildDelayPredictionResponse(
            Shipment shipment, EtaCalculationService.EtaResult eta) {

        boolean isDelayed = eta.delayMinutes() > 0;
        ShipmentStatus status = shipment.getShipmentStatus();

        // Status-aware human-readable message
        String message = buildStatusMessage(status, eta.delayMinutes(), isDelayed);

        // Build human-readable remaining-time string
        String remainingTime = buildRemainingTimeString(status, eta.estimatedDeliveryTime());

        return com.shiptrackpro.dto.DelayPredictionResponse.builder()
                // Original fields
                .shipmentId(shipment.getId())
                .trackingNumber(shipment.getTrackingNumber())
                .shipmentStatus(status.name())
                .estimatedDelayMinutes(eta.delayMinutes())
                .delayed(isDelayed)
                .message(message)
                // New ETA fields
                .estimatedDeliveryTime(eta.estimatedDeliveryTime())
                .remainingTime(remainingTime)
                .delayMinutes(eta.delayMinutes())
                .delayReason(eta.delayReason())
                .confidence(eta.confidence())
                .build();
    }

    /**
     * Generates a context-aware message for the delay card that reflects
     * the current lifecycle stage, not just a generic "on time" / "delayed".
     */
    private String buildStatusMessage(ShipmentStatus status, int delayMinutes, boolean isDelayed) {
        return switch (status) {
            case PENDING_DRIVER   -> "Shipment created — awaiting driver acceptance.";
            case DRIVER_ASSIGNED  -> "Driver assigned — heading to pickup location.";
            case PICKED_UP        -> isDelayed
                    ? "Package collected. Delayed by " + delayMinutes + " minutes."
                    : "Package collected — en route to distribution hub.";
            case IN_TRANSIT       -> isDelayed
                    ? "In transit. Delayed by " + delayMinutes + " minutes."
                    : "Shipment is in transit and on schedule.";
            case OUT_FOR_DELIVERY -> isDelayed
                    ? "Out for delivery. Delayed by " + delayMinutes + " minutes."
                    : "Out for delivery — arriving soon!";
            case DELIVERED        -> "Shipment has been delivered successfully.";
            case CANCELLED        -> "Shipment was cancelled.";
            case FAILED_DELIVERY  -> "Delivery attempt failed. Please contact support.";
            case RETURNED         -> "Shipment returned to sender.";
            default               -> isDelayed
                    ? "Shipment delayed by " + delayMinutes + " minutes."
                    : "Shipment is on schedule.";
        };
    }

    /**
     * Converts the estimated delivery time to a friendly remaining-time string.
     * For early stages (PENDING_DRIVER, DRIVER_ASSIGNED) a contextual label
     * is returned instead of a raw countdown.
     */
    private String buildRemainingTimeString(ShipmentStatus status,
                                            LocalDateTime estimatedDeliveryTime) {
        return switch (status) {
            case DELIVERED        -> "Delivered";
            case CANCELLED        -> "Cancelled";
            case FAILED_DELIVERY  -> "Failed delivery";
            case RETURNED         -> "Returned to sender";
            case PENDING_DRIVER   -> "Awaiting driver";
            case DRIVER_ASSIGNED  -> "Driver assigned — pickup pending";
            default               -> formatMinutesRemaining(estimatedDeliveryTime);
        };
    }

    private String formatMinutesRemaining(LocalDateTime estimatedDeliveryTime) {
        if (estimatedDeliveryTime == null) return "Unknown";

        long totalMinutes = Duration.between(LocalDateTime.now(), estimatedDeliveryTime).toMinutes();
        if (totalMinutes <= 0) return "Overdue";

        long days    = totalMinutes / 1440;
        long hours   = (totalMinutes % 1440) / 60;
        long minutes = totalMinutes % 60;

        StringBuilder sb = new StringBuilder();
        if (days    > 0) sb.append(days).append(days    == 1 ? " day "    : " days ");
        if (hours   > 0) sb.append(hours).append(hours  == 1 ? " hour "   : " hours ");
        if (minutes > 0 || sb.isEmpty())
            sb.append(minutes).append(minutes == 1 ? " minute" : " minutes");

        return sb.toString().trim();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Shipment findShipmentOrThrow(Long id) {
        return shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shipment not found with id: " + id));
    }

    private User findUserOrThrow(Long userId, String roleDescription) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found for " + roleDescription + " with id: " + userId));
    }

    /** Returns null if userId is null, otherwise resolves the user or throws. */
    private User resolveOptionalUser(Long userId) {
        if (userId == null) {
            return null;
        }
        return findUserOrThrow(userId, "sender/receiver");
    }

    private Address toAddressEntity(AddressRequest request) {
        return Address.builder()
                .line1(request.getLine1())
                .line2(request.getLine2())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .country(request.getCountry())
                .build();
    }

    private void copyAddressFields(Address target, AddressRequest source) {
        target.setLine1(source.getLine1());
        target.setLine2(source.getLine2());
        target.setCity(source.getCity());
        target.setState(source.getState());
        target.setPostalCode(source.getPostalCode());
        target.setCountry(source.getCountry());
    }

    private AddressResponse mapAddress(Address address) {
        return AddressResponse.builder()
                .id(address.getId())
                .line1(address.getLine1())
                .line2(address.getLine2())
                .city(address.getCity())
                .state(address.getState())
                .postalCode(address.getPostalCode())
                .country(address.getCountry())
                .build();
    }

    private ShipmentResponse mapToResponse(Shipment shipment) {
        User driver = shipment.getAssignedDriver();
        return ShipmentResponse.builder()
                .id(shipment.getId())
                .trackingNumber(shipment.getTrackingNumber())
                .senderName(shipment.getSenderName())
                .senderPhone(shipment.getSenderPhone())
                .senderUserId(shipment.getSenderUser() != null ? shipment.getSenderUser().getUserId() : null)
                .receiverName(shipment.getReceiverName())
                .receiverPhone(shipment.getReceiverPhone())
                .receiverUserId(shipment.getReceiverUser() != null ? shipment.getReceiverUser().getUserId() : null)
                .originAddress(mapAddress(shipment.getOriginAddress()))
                .destinationAddress(mapAddress(shipment.getDestinationAddress()))
                .packageWeight(shipment.getPackageWeight())
                .shipmentType(shipment.getShipmentType())
                .packageType(shipment.getPackageType())
                .shipmentStatus(shipment.getShipmentStatus())
                .expectedDeliveryDate(shipment.getExpectedDeliveryDate())
                .createdByUserId(shipment.getCreatedBy().getUserId())
                .assignedDriverId(driver != null ? driver.getUserId() : null)
                .assignedDriverName(driver != null ? driver.getFullName() : null)
                .cancellationReason(shipment.getCancellationReason())
                .delayReason(shipment.getDelayReason())
                .createdAt(shipment.getCreatedAt())
                .updatedAt(shipment.getUpdatedAt())
                .build();
    }

    /** Maps a {@link User} with DRIVER role to the lightweight {@link DriverResponse} DTO. */
    private DriverResponse mapToDriverResponse(User user) {
        return DriverResponse.builder()
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .build();
    }

    private String generateUniqueTrackingNumber() {
        String candidate;
        do {
            String randomSegment = UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .substring(0, TRACKING_NUMBER_SUFFIX_LENGTH)
                    .toUpperCase();
            candidate = TRACKING_NUMBER_PREFIX + randomSegment;
        } while (shipmentRepository.existsByTrackingNumber(candidate));

        return candidate;
    }

}

