package com.shiptrackpro.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Payload for updating an existing shipment's mutable details.
 *
 * <p>Same shape as {@link CreateShipmentRequest} today, but kept as a
 * distinct class (per requirements) so the two can diverge independently —
 * e.g. if update should later stop allowing {@code senderUserId} changes,
 * or gain fields Create doesn't need. Still excludes {@code id},
 * {@code trackingNumber}, {@code shipmentStatus}, {@code createdBy}, and
 * the audit timestamps, which remain system-managed and untouched by
 * updates.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateShipmentRequest {

    @NotBlank(message = "Sender name is required")
    @Size(max = 150)
    private String senderName;

    @NotBlank(message = "Sender phone is required")
    @Size(max = 20)
    private String senderPhone;

    private Long senderUserId;

    @NotBlank(message = "Receiver name is required")
    @Size(max = 150)
    private String receiverName;

    @NotBlank(message = "Receiver phone is required")
    @Size(max = 20)
    private String receiverPhone;

    private Long receiverUserId;

    @NotNull(message = "Origin address is required")
    @Valid
    private AddressRequest originAddress;

    @NotNull(message = "Destination address is required")
    @Valid
    private AddressRequest destinationAddress;

    @NotNull(message = "Package weight is required")
    @Positive(message = "Package weight must be greater than zero")
    private Double packageWeight;

    @NotBlank(message = "Shipment type is required")
    @Size(max = 30)
    private String shipmentType;

    @Size(max = 50)
    private String packageType;

    private LocalDateTime expectedDeliveryDate;

}
