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
 * Payload for creating a new shipment.
 *
 * <p>Deliberately excludes {@code id}, {@code trackingNumber},
 * {@code shipmentStatus}, {@code createdBy}, and the audit timestamps —
 * all system-managed. {@code trackingNumber} is generated server-side;
 * {@code createdBy} is resolved from the authenticated JWT principal in
 * the controller, never taken from the request body (a client could
 * otherwise claim to be someone else).</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateShipmentRequest {

    @NotBlank(message = "Sender name is required")
    @Size(max = 150)
    private String senderName;

    @NotBlank(message = "Sender phone is required")
    @Size(max = 20)
    private String senderPhone;

    /** Optional: set if the sender is a registered platform user. */
    private Long senderUserId;

    @NotBlank(message = "Receiver name is required")
    @Size(max = 150)
    private String receiverName;

    @NotBlank(message = "Receiver phone is required")
    @Size(max = 20)
    private String receiverPhone;

    /** Optional: set if the receiver is a registered platform user. */
    private Long receiverUserId;

    /**
     * Email address for a guest (non-registered) receiver.
     *
     * <p>Required when {@code receiverUserId} is {@code null} (guest customer path).
     * Must be omitted or {@code null} when {@code receiverUserId} is provided —
     * the backend will store {@code null} in that case so the registered customer's
     * email is always resolved from the {@link com.shiptrackpro.entity.User} entity.
     *
     * <p>Conditional "required" enforcement is handled in
     * {@link com.shiptrackpro.service.impl.ShipmentServiceImpl#createShipment} because
     * standard bean validation cannot cross-reference another field's value.
     */
    @jakarta.validation.constraints.Email(message = "Guest email must be a valid email address")
    @Size(max = 255)
    private String guestEmail;

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

