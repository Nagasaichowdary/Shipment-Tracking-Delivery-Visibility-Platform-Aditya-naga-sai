package com.shiptrackpro.service;

import com.shiptrackpro.dto.RouteHistoryResponse;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.enums.ShipmentStatus;

/**
 * Service for recording and retrieving the route history of shipments.
 *
 * <p>Route history is an append-only audit trail. Every status change
 * automatically creates a new {@code RouteHistory} record via
 * {@link #record(Shipment, ShipmentStatus, String, String)}.</p>
 */
public interface RouteHistoryService {

    /**
     * Records a new lifecycle event for the given shipment.
     *
     * <p>The performer (name and role) is automatically resolved from the
     * current Spring Security context so callers do not need to pass it.</p>
     *
     * @param shipment    the shipment whose status changed
     * @param status      the new (or initial) status
     * @param location    optional location label (city, hub name, etc.); may be null
     * @param description human-readable description of the event
     */
    void record(Shipment shipment, ShipmentStatus status, String location, String description);

    /**
     * Returns the full chronological route history for the shipment identified
     * by its tracking number.
     *
     * @param trackingNumber the shipment tracking number
     * @return response DTO containing all history events oldest → newest
     */
    RouteHistoryResponse getHistory(String trackingNumber);

    /**
     * Returns the full chronological timeline for the shipment identified
     * by its tracking number. The timeline is identical to the history but
     * is exposed under a separate URL for semantic clarity.
     *
     * @param trackingNumber the shipment tracking number
     * @return response DTO containing all history events oldest → newest
     */
    RouteHistoryResponse getTimeline(String trackingNumber);
}
