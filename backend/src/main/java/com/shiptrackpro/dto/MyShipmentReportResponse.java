package com.shiptrackpro.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for the Business Client's personal shipment report page.
 * Contains the authenticated client's own shipments plus summary metrics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MyShipmentReportResponse {

    // ── Shipment rows (paginated) ─────────────────────────────────────────────
    private List<ShipmentResponse> shipments;
    private long totalRecords;
    private int  page;
    private int  size;
    private int  totalPages;

    // ── Summary KPI cards ─────────────────────────────────────────────────────
    private long   totalShipments;
    private long   delivered;
    private long   inTransit;
    private long   delayed;
    private long   failed;
    private long   cancelled;
    private double successRate;

    /** Average delivery time in hours. Null when no delivered shipments exist. */
    private Double avgDeliveryHours;

    private String periodLabel;
}
