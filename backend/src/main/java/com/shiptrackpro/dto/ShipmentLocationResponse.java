package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response DTO for shipment current location.
 *
 * <p>Returned by:
 * <ul>
 *   <li>{@code GET /api/shipments/{id}/location} — shipment's last known GPS fix</li>
 *   <li>{@code POST /api/shipments/{id}/location} — confirmation after an update</li>
 * </ul>
 * </p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentLocationResponse {

    /** Database PK of the shipment. */
    private Long shipmentId;

    /** Human-readable tracking number (e.g. SHIP-A1B2C3D4). */
    private String trackingNumber;

    /** Current shipment latitude (null if never updated). */
    private Double latitude;

    /** Current shipment longitude (null if never updated). */
    private Double longitude;

    /** Timestamp of the most recent GPS fix (null if never updated). */
    private LocalDateTime lastUpdated;

    /** City of the last known position, if available (optional enrichment). */
    private String lastKnownCity;
}
