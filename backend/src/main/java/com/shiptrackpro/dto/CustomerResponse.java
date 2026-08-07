package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Outbound payload representing an approved registered Customer.
 *
 * <p>Returned by {@code GET /api/customers} and used to populate the
 * "Registered Customer" dropdown on the Shipment Creation page. When the
 * operator selects a customer, the {@code id} is sent as {@code receiverUserId}
 * in the {@link CreateShipmentRequest}, linking {@code Shipment.receiverUser}
 * to the registered account so the Delivery OTP system can later retrieve
 * {@code shipment.getReceiverUser().getEmail()} without any null-pointer risk.</p>
 *
 * <p>Only APPROVED users with {@code role.roleName = "CUSTOMER"} are ever
 * surfaced through this DTO — the controller enforces this filter.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerResponse {

    /** Primary key — sent back as {@code receiverUserId} when creating a shipment. */
    private Long id;

    private String firstName;
    private String lastName;

    /** Convenience field: firstName + " " + lastName — used as the dropdown label. */
    private String fullName;

    /**
     * The customer's registered email address.
     * Included for display purposes (shown as a hint in the dropdown).
     * The Delivery OTP system fetches this value directly from the database
     * via {@code Shipment.receiverUser.getEmail()} — the frontend never
     * needs to pass or store this value.
     */
    private String email;

    private String phone;
}
