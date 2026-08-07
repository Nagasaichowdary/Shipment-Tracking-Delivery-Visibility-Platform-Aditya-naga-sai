package com.shiptrackpro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

/**
 * Request body for {@code POST /api/shipments/{id}/confirm-delivery}.
 *
 * <p>Submitted as {@code multipart/form-data} — text fields are bound via
 * {@code @RequestParam} and file parts via {@code @RequestPart} in the
 * controller. The authenticated driver identity is resolved server-side from
 * the JWT; the caller never supplies driverId.</p>
 */
@Getter
@Setter
@NoArgsConstructor
public class DeliveryConfirmationRequest {

    /**
     * Name of the person who physically received the package.
     * Required; must be provided by the driver at the time of confirmation.
     */
    @NotBlank(message = "Receiver name is required.")
    @Size(max = 150, message = "Receiver name must not exceed 150 characters.")
    private String receiverName;

    /**
     * Optional free-text remarks about the delivery
     * (e.g. "Left with neighbour", "Delivered to front desk").
     */
    @Size(max = 500, message = "Delivery remarks must not exceed 500 characters.")
    private String deliveryRemarks;

    /**
     * Signature PNG generated from the driver's canvas drawing.
     * Validated and saved by {@link com.shiptrackpro.service.FileStorageService}.
     * Not serialised to JSON — handled as a multipart file part.
     */
    private transient MultipartFile signatureFile;

    /**
     * Delivery photo (JPG or PNG, max 5 MB).
     * Not serialised to JSON — handled as a multipart file part.
     */
    private transient MultipartFile deliveryPhotoFile;
}
