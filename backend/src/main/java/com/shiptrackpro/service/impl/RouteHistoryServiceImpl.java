package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.RouteHistoryResponse;
import com.shiptrackpro.dto.RouteHistoryResponse.RouteHistoryEvent;
import com.shiptrackpro.entity.RouteHistory;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.enums.ShipmentStatus;
import com.shiptrackpro.repository.RouteHistoryRepository;
import com.shiptrackpro.repository.ShipmentRepository;
import com.shiptrackpro.service.RouteHistoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Default implementation of {@link RouteHistoryService}.
 *
 * <h3>Design decisions</h3>
 * <ul>
 *   <li>Performer resolution — the name and role of the actor are read from
 *       Spring SecurityContext so no existing service/controller method
 *       signatures need to be changed.</li>
 *   <li>Propagation — {@link #record} uses {@code REQUIRED} (default) so it
 *       joins the caller's transaction. This is essential: the Shipment entity
 *       is only visible inside the same JPA session/transaction. Using
 *       {@code REQUIRES_NEW} caused a FK constraint violation because the new
 *       independent transaction could not see the uncommitted parent Shipment
 *       row, silently discarding every history record.</li>
 *   <li>Append-only — no update or delete operations exist.</li>
 *   <li>No duplicate guard — the caller controls when to call {@link #record};
 *       duplicate prevention is an upstream responsibility.</li>
 * </ul>
 */
@Service
public class RouteHistoryServiceImpl implements RouteHistoryService {

    private static final Logger log = LoggerFactory.getLogger(RouteHistoryServiceImpl.class);

    /** Human-readable labels for each status enum value. */
    private static final Map<ShipmentStatus, String> STATUS_LABELS = Map.ofEntries(
            Map.entry(ShipmentStatus.CREATED,          "Shipment Created"),
            Map.entry(ShipmentStatus.PENDING_DRIVER,   "Awaiting Driver"),
            Map.entry(ShipmentStatus.DRIVER_ASSIGNED,  "Driver Assigned"),
            Map.entry(ShipmentStatus.PICKED_UP,        "Picked Up"),
            Map.entry(ShipmentStatus.IN_TRANSIT,       "In Transit"),
            Map.entry(ShipmentStatus.DELAYED,          "Delayed"),
            Map.entry(ShipmentStatus.OUT_FOR_DELIVERY, "Out for Delivery"),
            Map.entry(ShipmentStatus.DELIVERED,        "Delivered"),
            Map.entry(ShipmentStatus.CANCELLED,        "Cancelled"),
            Map.entry(ShipmentStatus.FAILED_DELIVERY,  "Delivery Failed"),
            Map.entry(ShipmentStatus.RETURNED,         "Returned to Sender")
    );

    private final RouteHistoryRepository routeHistoryRepository;
    private final ShipmentRepository     shipmentRepository;

    public RouteHistoryServiceImpl(RouteHistoryRepository routeHistoryRepository,
                                   ShipmentRepository     shipmentRepository) {
        this.routeHistoryRepository = routeHistoryRepository;
        this.shipmentRepository     = shipmentRepository;
    }

    // ── write ──────────────────────────────────────────────────────────────────

    /**
     * {@inheritDoc}
     *
     * <p>Uses {@code REQUIRED} (default) propagation so this method joins
     * the caller's active transaction. The Shipment FK reference is satisfied
     * because both the parent Shipment and this RouteHistory record live in
     * the same JPA persistence context and are committed together.</p>
     *
     * <p>The try-catch prevents any route-history-specific exception from
     * propagating up and rolling back the business transaction.</p>
     */
    @Override
    @Transactional
    public void record(Shipment shipment,
                       ShipmentStatus status,
                       String location,
                       String description) {
        try {
            String[] performer = resolvePerformer();

            RouteHistory rh = new RouteHistory(
                    shipment,
                    shipment.getTrackingNumber(),
                    status,
                    location,
                    description,
                    performer[0],   // performedByName
                    performer[1]    // performedByRole
            );

            routeHistoryRepository.save(rh);
            log.debug("Route history recorded: {} \u2192 {} by {}",
                    shipment.getTrackingNumber(), status, performer[0]);

        } catch (Exception ex) {
            // Log but do not rethrow — history is best-effort, not mission-critical
            log.error("Failed to record route history for shipment {}: {}",
                    shipment.getTrackingNumber(), ex.getMessage(), ex);
        }
    }

    // ── read ───────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public RouteHistoryResponse getHistory(String trackingNumber) {
        return buildResponse(trackingNumber);
    }

    @Override
    @Transactional(readOnly = true)
    public RouteHistoryResponse getTimeline(String trackingNumber) {
        return buildResponse(trackingNumber);
    }

    // ── private helpers ────────────────────────────────────────────────────────

    /**
     * Builds the {@link RouteHistoryResponse} from the stored records.
     */
    private RouteHistoryResponse buildResponse(String trackingNumber) {
        // Resolve current status from the shipments table (for the summary field)
        String currentStatus = shipmentRepository
                .findByTrackingNumber(trackingNumber)
                .map(s -> s.getShipmentStatus() != null ? s.getShipmentStatus().name() : "UNKNOWN")
                .orElse("NOT_FOUND");

        List<RouteHistory> records =
                routeHistoryRepository.findByShipmentTrackingNumberOrderByTimestampAsc(trackingNumber);

        List<RouteHistoryEvent> events = records.stream()
                .map(this::toEvent)
                .collect(Collectors.toList());

        return new RouteHistoryResponse(trackingNumber, currentStatus, events);
    }

    /**
     * Maps a {@link RouteHistory} entity to a {@link RouteHistoryEvent} DTO.
     */
    private RouteHistoryEvent toEvent(RouteHistory rh) {
        RouteHistoryEvent ev = new RouteHistoryEvent();
        ev.setId(rh.getId());
        ev.setStatus(rh.getStatus() != null ? rh.getStatus().name() : null);
        ev.setStatusLabel(rh.getStatus() != null
                ? STATUS_LABELS.getOrDefault(rh.getStatus(), rh.getStatus().name())
                : null);
        ev.setLocation(rh.getLocation());
        ev.setDescription(rh.getDescription());
        ev.setPerformedByName(rh.getPerformedByName());
        ev.setPerformedByRole(rh.getPerformedByRole());
        ev.setTimestamp(rh.getTimestamp());
        return ev;
    }

    /**
     * Resolves the current authenticated user's name and role from
     * Spring SecurityContext.
     *
     * @return {@code [name, role]} — defaults to {@code ["System", "System"]}
     *         for background/programmatic calls with no security context
     */
    private String[] resolvePerformer() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User user) {
                String name = (user.getFirstName() + " " + user.getLastName()).trim();
                String role = (user.getRole() != null)
                        ? user.getRole().getRoleName()
                        : "Unknown";
                return new String[]{ name.isBlank() ? user.getUsername() : name, role };
            }
        } catch (Exception ex) {
            log.warn("Could not resolve performer from SecurityContext: {}", ex.getMessage());
        }
        return new String[]{ "System", "System" };
    }
}
