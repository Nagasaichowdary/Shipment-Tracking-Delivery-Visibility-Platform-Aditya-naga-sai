package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Outbound payload for driver assignment and unassignment operations.
 *
 * <p>Returned by:
 * <ul>
 *   <li>{@code PUT  /api/shipments/{id}/assign-driver} — driver assigned</li>
 *   <li>{@code DELETE /api/shipments/{id}/assign-driver} — driver removed</li>
 * </ul>
 * When the driver is removed, {@code assignedDriver} is {@code null} and
 * {@code assigned} is {@code false}.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverAssignmentResponse {

    /** Primary key of the shipment that was modified. */
    private Long shipmentId;

    /** Human-readable tracking number of the shipment. */
    private String trackingNumber;

    /** Current shipment status at the time of assignment. */
    private String shipmentStatus;

    /**
     * Driver detail block. {@code null} when the driver has just been
     * unassigned ({@code assigned = false}).
     */
    private DriverResponse assignedDriver;

    /**
     * Timestamp of the most recent update — mirrors
     * {@code Shipment.updatedAt} which is refreshed by {@code @PreUpdate}.
     */
    private LocalDateTime assignedAt;

    /**
     * {@code true}  — a driver was successfully assigned.
     * {@code false} — the driver was removed from the shipment.
     */
    private boolean assigned;

    /** Human-readable summary message. */
    private String message;

}
