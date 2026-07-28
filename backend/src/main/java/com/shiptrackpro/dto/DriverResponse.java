package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Outbound payload representing an available driver.
 *
 * <p>Returned by {@code GET /api/drivers} and embedded inside
 * {@link ShipmentResponse} as the {@code assignedDriver} block.
 * Only APPROVED users with role {@code DRIVER} are ever surfaced
 * through this DTO.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverResponse {

    private Long userId;
    private String firstName;
    private String lastName;
    /** Convenience field: firstName + " " + lastName */
    private String fullName;
    private String email;
    private String phone;

}
