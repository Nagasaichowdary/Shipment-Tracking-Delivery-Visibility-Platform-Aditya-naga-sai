package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Lightweight DTO returned by GET /api/driver/available-shipments.
 * Contains only the fields a driver needs to decide whether to accept.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailableShipmentResponse {

    private Long          shipmentId;
    private String        trackingNumber;
    private String        pickupAddress;       // origin city + address line
    private String        destinationAddress;  // destination city + address line
    private String        shipmentType;
    private Double        weight;
    private LocalDateTime createdAt;

}
