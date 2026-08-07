package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response returned by {@code POST /api/shipments/{id}/confirm-delivery}.
 *
 * <p>Contains the full confirmation record so the driver portal can
 * display immediate confirmation feedback without a second GET call.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryConfirmationResponse {

    /** Database id of the confirmed shipment. */
    private Long shipmentId;

    /** Auto-generated tracking identifier. */
    private String trackingNumber;

    /** Terminal status — always {@code DELIVERED} after a successful confirmation. */
    private String shipmentStatus;

    /** Name supplied by the driver for the person who received the package. */
    private String deliveryReceiverName;

    /** Optional driver remarks recorded at delivery time. */
    private String deliveryRemarks;

    /** Server-side UTC timestamp of when the confirmation was saved. */
    private LocalDateTime deliveredAt;

    /** Always {@code true} in a successful response. */
    private boolean deliveryConfirmed;

    /**
     * Relative server path to the customer's drawn signature PNG.
     * Example: {@code delivery/SHIP-ABCD1234/signature.png}
     */
    private String customerSignaturePath;

    /**
     * Relative server path to the delivery photo.
     * Example: {@code delivery/SHIP-ABCD1234/delivery-photo.jpg}
     */
    private String deliveryPhotoPath;

    /** Full name of the driver who confirmed the delivery. */
    private String confirmedByDriver;

    /** Human-readable summary message. */
    private String message;
}
