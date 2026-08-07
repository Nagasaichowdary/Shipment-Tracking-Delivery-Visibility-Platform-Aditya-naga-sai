package com.shiptrackpro.repository;

import com.shiptrackpro.entity.Shipment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Read-only analytics repository.
 *
 * <p>Contains only aggregate queries — no write operations, no modification
 * of existing data. All queries target the existing {@code shipments},
 * {@code addresses}, {@code users}, and {@code driver_rejections} tables.
 * No new tables were created.</p>
 *
 * <p>This repository is completely isolated from {@link ShipmentRepository}.
 * It exists solely to serve the {@code AnalyticsService} and must never be
 * injected into any other service.</p>
 *
 * <h3>JPQL vs Native SQL split</h3>
 * <ul>
 *   <li><b>JPQL</b> — used for simple COUNT / AVG / GROUP BY / JOIN queries that
 *       do not require any PostgreSQL-specific functions. Hibernate 6 validates
 *       JPQL at startup; all JPQL queries here pass that validation.</li>
 *   <li><b>Native SQL ({@code nativeQuery = true})</b> — used exclusively for
 *       queries that require PostgreSQL-specific functions:
 *       {@code EXTRACT(EPOCH FROM …)}, {@code EXTRACT(YEAR FROM …)},
 *       {@code EXTRACT(MONTH FROM …)}, and timestamp arithmetic.
 *       Hibernate does NOT attempt to validate native queries at startup,
 *       so these expressions are passed directly to PostgreSQL at runtime.</li>
 * </ul>
 */
@Repository
public interface AnalyticsRepository extends JpaRepository<Shipment, Long> {

    // ─────────────────────────────────────────────────────────────────────────
    // Status distribution
    // (Native SQL: returns column value as plain VARCHAR, avoids CAST issues)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns the count of shipments for each status value.
     * Result rows: [shipment_status (String), count (Long)]
     *
     * <p><b>Native SQL</b> — reads {@code shipment_status} directly from
     * the VARCHAR(30) column, avoiding any JPQL CAST or enum-mapping
     * complications that can arise with Hibernate 6 validation.</p>
     */
    @Query(value = "SELECT shipment_status, COUNT(*) AS cnt " +
                   "FROM shipments " +
                   "GROUP BY shipment_status " +
                   "ORDER BY cnt DESC",
           nativeQuery = true)
    List<Object[]> countByStatus();

    /**
     * Same as {@link #countByStatus()} but restricted to shipments created
     * on or after {@code since}. Used for time-window filtered KPI cards.
     */
    @Query(value = "SELECT shipment_status, COUNT(*) AS cnt " +
                   "FROM shipments " +
                   "WHERE created_at >= :since " +
                   "GROUP BY shipment_status " +
                   "ORDER BY cnt DESC",
           nativeQuery = true)
    List<Object[]> countByStatusSince(@Param("since") LocalDateTime since);

    // ─────────────────────────────────────────────────────────────────────────
    // Time-window counts  (Today / This Week / This Month KPI cards)
    // JPQL — simple COUNT with a WHERE clause, no PG-specific functions.
    // ─────────────────────────────────────────────────────────────────────────

    /** Count of all shipments whose {@code created_at >= since}. */
    @Query("SELECT COUNT(s) FROM Shipment s WHERE s.createdAt >= :since")
    long countCreatedSince(@Param("since") LocalDateTime since);

    // ─────────────────────────────────────────────────────────────────────────
    // Delivery-time average  (hours from created_at → delivered_at)
    //
    // NATIVE SQL — requires EXTRACT(EPOCH FROM interval), which is a
    // PostgreSQL-specific function. Hibernate 6 rejects 'epoch' as a
    // temporal-unit argument in JPQL FUNCTION() calls at startup validation.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Average delivery duration in hours, computed only over shipments that
     * have a non-null {@code delivered_at}.
     *
     * <p><b>Why native?</b> PostgreSQL {@code EXTRACT(EPOCH FROM interval)}
     * converts a timestamp difference to seconds. "epoch" is not a standard
     * SQL or JPQL temporal-unit keyword, so Hibernate 6 rejects it during
     * startup JPQL validation. We use a native query so the expression is
     * sent directly to PostgreSQL without Hibernate parsing it.</p>
     *
     * <p>Returns {@code null} when no delivered shipments exist.</p>
     */
    @Query(value = "SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 3600.0) " +
                   "FROM shipments " +
                   "WHERE delivered_at IS NOT NULL",
           nativeQuery = true)
    Double avgDeliveryHours();

    /**
     * Same as {@link #avgDeliveryHours()} but restricted to shipments
     * created on or after {@code since}.
     */
    @Query(value = "SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 3600.0) " +
                   "FROM shipments " +
                   "WHERE delivered_at IS NOT NULL AND created_at >= :since",
           nativeQuery = true)
    Double avgDeliveryHoursSince(@Param("since") LocalDateTime since);

    // ─────────────────────────────────────────────────────────────────────────
    // Average delay
    // JPQL — AVG(column) with a simple WHERE clause, no PG-specific functions.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Average predicted delay in minutes across all shipments that have a
     * non-null {@code estimated_delay_minutes}. Returns {@code null} when none.
     */
    @Query("SELECT AVG(s.estimatedDelayMinutes) " +
           "FROM Shipment s " +
           "WHERE s.estimatedDelayMinutes IS NOT NULL")
    Double avgDelayMinutes();

    @Query("SELECT AVG(s.estimatedDelayMinutes) " +
           "FROM Shipment s " +
           "WHERE s.estimatedDelayMinutes IS NOT NULL AND s.createdAt >= :since")
    Double avgDelayMinutesSince(@Param("since") LocalDateTime since);

    // ─────────────────────────────────────────────────────────────────────────
    // Monthly shipment trend  (last N months)
    //
    // NATIVE SQL — requires EXTRACT(YEAR FROM timestamp) and
    // EXTRACT(MONTH FROM timestamp). Hibernate 6 parses the first argument
    // of JPQL FUNCTION('extract', …) and expects a standard TEMPORAL_UNIT
    // keyword (YEAR, MONTH, DAY…). When passed as a quoted string literal
    // ('year', 'month') the parser receives java.lang.Object instead of
    // TEMPORAL_UNIT and throws FunctionArgumentException at startup.
    // Using nativeQuery = true bypasses Hibernate's parser entirely.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Groups shipments by calendar month of creation for the period starting
     * at {@code since}.
     *
     * <p>Result rows: [year (Number), month (Number), count (Number)]</p>
     */
    @Query(value = "SELECT EXTRACT(YEAR  FROM created_at) AS yr, " +
                   "       EXTRACT(MONTH FROM created_at) AS mo, " +
                   "       COUNT(*)                        AS cnt " +
                   "FROM shipments " +
                   "WHERE created_at >= :since " +
                   "GROUP BY EXTRACT(YEAR FROM created_at), " +
                   "         EXTRACT(MONTH FROM created_at) " +
                   "ORDER BY yr, mo",
           nativeQuery = true)
    List<Object[]> monthlyShipmentTrend(@Param("since") LocalDateTime since);

    /**
     * Groups DELIVERED shipments by calendar month of delivery.
     * Result rows: [year (Number), month (Number), count (Number)]
     */
    @Query(value = "SELECT EXTRACT(YEAR  FROM delivered_at) AS yr, " +
                   "       EXTRACT(MONTH FROM delivered_at) AS mo, " +
                   "       COUNT(*)                          AS cnt " +
                   "FROM shipments " +
                   "WHERE delivered_at IS NOT NULL AND delivered_at >= :since " +
                   "GROUP BY EXTRACT(YEAR FROM delivered_at), " +
                   "         EXTRACT(MONTH FROM delivered_at) " +
                   "ORDER BY yr, mo",
           nativeQuery = true)
    List<Object[]> monthlyDeliveryTrend(@Param("since") LocalDateTime since);

    // ─────────────────────────────────────────────────────────────────────────
    // City rankings
    // JPQL — standard JOIN + GROUP BY + COUNT, no PG-specific functions.
    // Pageable is fully supported with JPQL queries.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Top destination cities by shipment volume.
     * Result rows: [city (String), count (Long)]
     */
    @Query("SELECT a.city, COUNT(s) " +
           "FROM Shipment s JOIN s.destinationAddress a " +
           "GROUP BY a.city " +
           "ORDER BY COUNT(s) DESC")
    List<Object[]> topDestinationCities(Pageable pageable);

    /**
     * Top origin cities by shipment volume.
     * Result rows: [city (String), count (Long)]
     */
    @Query("SELECT a.city, COUNT(s) " +
           "FROM Shipment s JOIN s.originAddress a " +
           "GROUP BY a.city " +
           "ORDER BY COUNT(s) DESC")
    List<Object[]> topOriginCities(Pageable pageable);

    // ─────────────────────────────────────────────────────────────────────────
    // Type distributions
    // JPQL — simple GROUP BY COUNT.
    // ─────────────────────────────────────────────────────────────────────────

    /** Shipment count grouped by {@code shipment_type}. */
    @Query("SELECT s.shipmentType, COUNT(s) " +
           "FROM Shipment s " +
           "GROUP BY s.shipmentType " +
           "ORDER BY COUNT(s) DESC")
    List<Object[]> shipmentTypeDistribution();

    /** Shipment count grouped by {@code package_type} (nulls excluded). */
    @Query("SELECT s.packageType, COUNT(s) " +
           "FROM Shipment s " +
           "WHERE s.packageType IS NOT NULL " +
           "GROUP BY s.packageType " +
           "ORDER BY COUNT(s) DESC")
    List<Object[]> packageTypeDistribution();

    // ─────────────────────────────────────────────────────────────────────────
    // Top creators  (Logistics Operators / Business Clients)
    // JPQL — standard JOIN + GROUP BY COUNT.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Top shipment creators ranked by shipment count.
     * Result rows: [firstName (String), lastName (String), count (Long)]
     */
    @Query("SELECT u.firstName, u.lastName, COUNT(s) " +
           "FROM Shipment s JOIN s.createdBy u " +
           "GROUP BY u.userId, u.firstName, u.lastName " +
           "ORDER BY COUNT(s) DESC")
    List<Object[]> topCreators(Pageable pageable);

    // ─────────────────────────────────────────────────────────────────────────
    // Driver performance
    //
    // NATIVE SQL — the avg delivery hours column requires
    // EXTRACT(EPOCH FROM interval), which is PostgreSQL-specific and
    // rejected by Hibernate 6 JPQL validation (same reason as monthly
    // trends above).
    //
    // Pageable is NOT used here because native queries with Pageable require
    // an explicit countQuery parameter. It is simpler and equivalent to pass
    // a plain :limit integer and use SQL LIMIT directly.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Per-driver aggregate performance.
     *
     * <p>Result rows (8 columns):
     * <ol>
     *   <li>user_id (Long)</li>
     *   <li>first_name (String)</li>
     *   <li>last_name (String)</li>
     *   <li>total_assigned (Long)</li>
     *   <li>delivered (Long)</li>
     *   <li>failed_deliveries (Long)</li>
     *   <li>avg_delay_minutes (Double, nullable)</li>
     *   <li>avg_delivery_hours (Double, nullable)</li>
     * </ol>
     * </p>
     *
     * @param limit maximum number of drivers to return (top N by total assigned)
     */
    @Query(value = "SELECT u.user_id, " +
                   "       u.first_name, " +
                   "       u.last_name, " +
                   "       COUNT(s.id)                                                   AS total_assigned, " +
                   "       SUM(CASE WHEN s.shipment_status = 'DELIVERED'       THEN 1 ELSE 0 END) AS delivered, " +
                   "       SUM(CASE WHEN s.shipment_status = 'FAILED_DELIVERY' THEN 1 ELSE 0 END) AS failed_deliveries, " +
                   "       AVG(s.estimated_delay_minutes)                                AS avg_delay_minutes, " +
                   "       AVG(CASE WHEN s.delivered_at IS NOT NULL " +
                   "               THEN EXTRACT(EPOCH FROM (s.delivered_at - s.created_at)) / 3600.0 " +
                   "               ELSE NULL END)                                        AS avg_delivery_hours " +
                   "FROM shipments s " +
                   "JOIN users u ON u.user_id = s.assigned_driver_id " +
                   "WHERE s.assigned_driver_id IS NOT NULL " +
                   "GROUP BY u.user_id, u.first_name, u.last_name " +
                   "ORDER BY COUNT(s.id) DESC " +
                   "LIMIT :limit",
           nativeQuery = true)
    List<Object[]> driverPerformance(@Param("limit") int limit);

    // ─────────────────────────────────────────────────────────────────────────
    // Driver rejection counts
    // JPQL — standard GROUP BY COUNT on DriverRejection entity.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Count of shipments rejected by each driver (from {@code driver_rejections}).
     * Result rows: [driverId (Long), rejectedCount (Long)]
     */
    @Query("SELECT dr.driver.userId, COUNT(dr) " +
           "FROM DriverRejection dr " +
           "GROUP BY dr.driver.userId")
    List<Object[]> driverRejectionCounts();

    // ─────────────────────────────────────────────────────────────────────────
    // Guest vs registered receivers
    // JPQL — CASE/SUM over a nullable relationship.
    // Hibernate 6 supports "entity IS NULL" in JPQL for FK checks.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Two-value aggregate: guest receivers vs registered receivers.
     *
     * <p>Returns a single-element list where the one element is an {@code Object[2]}:
     * <ul>
     *   <li>{@code row[0]} — guestCount (Long): shipments where receiverUser IS NULL</li>
     *   <li>{@code row[1]} — registeredCount (Long): shipments where receiverUser IS NOT NULL</li>
     * </ul>
     *
     * <p><b>Why {@code List<Object[]>} and not {@code Object[]}?</b>
     * Spring Data JPA executes all {@code @Query} methods via {@code getResultList()},
     * which returns {@code List<Object[]>}. When the declared return type is the raw
     * {@code Object[]}, the proxy converts via {@code list.toArray()} making
     * {@code result[0]} the first <em>row</em> (itself an {@code Object[]}), not the
     * first <em>column</em>. Declaring {@code List<Object[]>} preserves the correct
     * structure; the service takes {@code list.get(0)} to access the single row.</p>
     */
    @Query("SELECT " +
           "  SUM(CASE WHEN s.receiverUser IS NULL THEN 1 ELSE 0 END), " +
           "  SUM(CASE WHEN s.receiverUser IS NOT NULL THEN 1 ELSE 0 END) " +
           "FROM Shipment s")
    List<Object[]> guestVsRegisteredCount();

    // ─────────────────────────────────────────────────────────────────────────
    // Recent activity lists
    // JPQL — simple ORDER BY queries with Pageable for limiting results.
    // ─────────────────────────────────────────────────────────────────────────

    /** Most recently created shipments (newest-first). */
    @Query("SELECT s FROM Shipment s ORDER BY s.createdAt DESC")
    List<Shipment> findRecentShipments(Pageable pageable);

    /** Most recently confirmed deliveries (newest delivered_at first). */
    @Query("SELECT s FROM Shipment s " +
           "WHERE s.deliveredAt IS NOT NULL " +
           "ORDER BY s.deliveredAt DESC")
    List<Shipment> findRecentDeliveries(Pageable pageable);

    /** Most recently delayed shipments (non-null delay_reason, newest first). */
    @Query("SELECT s FROM Shipment s " +
           "WHERE s.delayReason IS NOT NULL " +
           "ORDER BY s.updatedAt DESC")
    List<Shipment> findRecentDelays(Pageable pageable);

    /** Most recently driver-assigned shipments (newest updated_at first). */
    @Query("SELECT s FROM Shipment s " +
           "WHERE s.assignedDriver IS NOT NULL " +
           "ORDER BY s.updatedAt DESC")
    List<Shipment> findRecentAssignments(Pageable pageable);

    // ─────────────────────────────────────────────────────────────────────────
    // Delivery Reports — date-range filtered variants
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Top shipment creators since a given date, for Business Client Report.
     * Variant of {@link #topCreators(Pageable)} that accepts a date filter.
     * Result rows: [userId (Long), firstName (String), lastName (String), count (Long)]
     */
    @Query("SELECT u.userId, u.firstName, u.lastName, COUNT(s) " +
           "FROM Shipment s JOIN s.createdBy u " +
           "WHERE s.createdAt >= :since " +
           "GROUP BY u.userId, u.firstName, u.lastName " +
           "ORDER BY COUNT(s) DESC")
    List<Object[]> topCreatorsSince(@Param("since") LocalDateTime since, Pageable pageable);

    /**
     * All shipments created by a specific user within [from, to].
     * Used by Business Client Report to compute per-client delivery rate.
     * Result rows: full {@link Shipment} entities.
     */
    @Query("SELECT s FROM Shipment s " +
           "WHERE s.createdBy.userId = :userId " +
           "AND s.createdAt >= :from AND s.createdAt <= :to " +
           "ORDER BY s.createdAt DESC")
    List<Shipment> findByCreatedByAndDateRange(@Param("userId") Long userId,
                                               @Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to);
}
