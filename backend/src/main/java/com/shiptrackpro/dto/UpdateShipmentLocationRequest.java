package com.shiptrackpro.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request body for updating a shipment's current GPS position.
 *
 * <p>Used by {@code POST /api/shipments/{shipmentId}/location}.</p>
 *
 * <p>Latitude must be in the range [-90, 90] and longitude in [-180, 180].
 * An optional {@code source} string lets callers tag the update with the
 * originating system (e.g. "DRIVER_APP", "HUB_SCAN", "MANUAL") for
 * audit and future route-history queries.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateShipmentLocationRequest {

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0",  message = "Latitude must be >= -90")
    @DecimalMax(value =  "90.0",  message = "Latitude must be <= 90")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
    @DecimalMax(value =  "180.0", message = "Longitude must be <= 180")
    private Double longitude;

    /**
     * Optional free-text city or hub name for human-readable display on the
     * tracking page.  Not persisted as a separate column but stored in
     * {@code Shipment.lastKnownCity}.
     */
    private String city;

    /**
     * Optional source tag (e.g. "DRIVER_APP", "HUB_SCAN").
     * Used for audit trails and future route-history; not validated by the
     * service layer today.
     */
    private String source;
}
