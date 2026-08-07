package com.shiptrackpro.repository;

import com.shiptrackpro.entity.RouteHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link RouteHistory} — the append-only shipment audit trail.
 *
 * <p>All queries are read-only. History records are never updated or deleted.</p>
 */
@Repository
public interface RouteHistoryRepository extends JpaRepository<RouteHistory, Long> {

    /**
     * Returns the complete event history for a shipment, in chronological order.
     *
     * <p>Uses the denormalised {@code shipment_tracking_number} column so no
     * JOIN against the {@code shipments} table is required.</p>
     *
     * @param trackingNumber the shipment tracking number (e.g. "SHIP-ABCD1234")
     * @return all history records ordered oldest → newest
     */
    List<RouteHistory> findByShipmentTrackingNumberOrderByTimestampAsc(String trackingNumber);

    /**
     * Returns the complete event history for a shipment by its internal ID,
     * in chronological order.
     *
     * @param shipmentId the primary key of the shipment
     * @return all history records ordered oldest → newest
     */
    List<RouteHistory> findByShipment_IdOrderByTimestampAsc(Long shipmentId);
}
