package com.shiptrackpro.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request payload for assigning a driver to a shipment.
 *
 * <p>The driver must be a registered user with {@code role_name = 'DRIVER'}
 * and {@code registration_status = 'APPROVED'}. Validation is enforced in
 * {@code ShipmentServiceImpl.assignDriver()}.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignDriverRequest {

    @NotNull(message = "Driver ID is required")
    private Long driverId;

}
