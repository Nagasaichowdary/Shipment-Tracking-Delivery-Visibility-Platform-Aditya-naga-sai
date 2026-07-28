package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverLocationResponse {

    private Long driverId;
    private String driverName;
    private Double latitude;
    private Double longitude;
    private LocalDateTime lastUpdated;

}
