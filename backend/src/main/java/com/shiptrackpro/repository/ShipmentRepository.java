package com.shiptrackpro.repository;

import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.enums.ShipmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

/**
 * Repository for {@link Shipment}.
 *
 * <p>{@code existsByTrackingNumber} backs the collision check in
 * {@code ShipmentServiceImpl.generateUniqueTrackingNumber()}.</p>
 *
 * <p>{@code findPendingDriverShipments} and {@code findByAssignedDriver}
 * support the Phase 1 Driver Delivery Request workflow.</p>
 */
@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

    boolean existsByTrackingNumber(String trackingNumber);

    /**
     * Looks up a shipment by its human-readable tracking number.
     * Used by {@code RouteHistoryServiceImpl} to resolve the current status
     * without requiring the internal numeric ID.
     *
     * @param trackingNumber e.g. "SHIP-ABCD1234"
     * @return the shipment, or {@code Optional.empty()} if not found
     */
    Optional<Shipment> findByTrackingNumber(String trackingNumber);

    /**
     * Returns all shipments that are in the PENDING_DRIVER broadcast pool:
     * status == PENDING_DRIVER AND no driver assigned yet.
     * Used by GET /api/driver/available-shipments.
     */
    @Query("SELECT s FROM Shipment s WHERE s.shipmentStatus = :status AND s.assignedDriver IS NULL")
    List<Shipment> findPendingDriverShipments(@Param("status") ShipmentStatus status);

    /**
     * Returns all shipments currently assigned to a specific driver.
     * Used by GET /api/driver/my-shipments.
     */
    List<Shipment> findByAssignedDriver(User driver);

    /**
     * Pessimistic write lock on a single shipment row.
     * Used by the accept flow to prevent two drivers accepting the same shipment.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Shipment s WHERE s.id = :id")
    Optional<Shipment> findByIdForUpdate(@Param("id") Long id);

    /**
     * Returns all shipments assigned to a driver that match a specific status.
     * Used by GET /api/driver/delivery-history to retrieve only DELIVERED shipments
     * for the authenticated driver — never exposes another driver's data.
     */
    List<Shipment> findByAssignedDriverAndShipmentStatus(User driver, ShipmentStatus status);

    // ─────────────────────────────────────────────────────────────────────────
    // Delivery Reports — paginated date-range + status filter
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns a paginated list of shipments filtered by date range and optional status.
     * Used by {@code GET /api/reports/shipments} in the Delivery Reports module.
     *
     * @param status optional status filter — pass {@code null} to return all statuses
     * @param from   inclusive lower bound on {@code created_at}
     * @param to     inclusive upper bound on {@code created_at}
     * @param page   Spring Data {@link org.springframework.data.domain.Pageable}
     */
    @Query("SELECT s FROM Shipment s " +
           "WHERE (:status IS NULL OR s.shipmentStatus = :status) " +
           "AND s.createdAt >= :from AND s.createdAt <= :to " +
           "ORDER BY s.createdAt DESC")
    org.springframework.data.domain.Page<Shipment> findByDateRangeAndStatus(
            @Param("status") ShipmentStatus status,
            @Param("from") java.time.LocalDateTime from,
            @Param("to") java.time.LocalDateTime to,
            org.springframework.data.domain.Pageable page);
}
