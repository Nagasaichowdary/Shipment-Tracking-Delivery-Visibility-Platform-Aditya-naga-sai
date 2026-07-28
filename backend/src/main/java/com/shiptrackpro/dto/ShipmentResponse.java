package com.shiptrackpro.dto;

import com.shiptrackpro.enums.ShipmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Outbound shipment payload. Supersedes the earlier flat-string version of
 * this class from previous messages — origin/destination are now nested
 * {@link AddressResponse} objects, matching the updated {@code Shipment}
 * entity.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentResponse {

    private Long id;
    private String trackingNumber;

    private String senderName;
    private String senderPhone;
    private Long senderUserId;

    private String receiverName;
    private String receiverPhone;
    private Long receiverUserId;

    private AddressResponse originAddress;
    private AddressResponse destinationAddress;

    private Double packageWeight;
    private String shipmentType;
    private String packageType;
    private ShipmentStatus shipmentStatus;
    private LocalDateTime expectedDeliveryDate;

    private Long createdByUserId;

    /** ID of the currently assigned driver. {@code null} when unassigned. */
    private Long assignedDriverId;

    /**
     * Full name of the currently assigned driver (firstName + " " + lastName).
     * {@code null} when unassigned.
     */
    private String assignedDriverName;

    /**
     * Reason provided by the Logistics Operator when cancelling the shipment.
     * {@code null} for every status other than CANCELLED.
     */
    private String cancellationReason;

    /**
     * Reason provided by the Logistics Operator when marking the shipment as delayed.
     * {@code null} for every status other than DELAYED.
     */
    private String delayReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
