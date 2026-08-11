package com.shiptrackpro.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for the Business Client's personal analytics page.
 * Scoped exclusively to shipments created by the authenticated Business Client.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BusinessClientAnalyticsResponse {

    // ── KPI cards ──────────────────────────────────────────────────────────────
    private long   totalShipments;
    private long   delivered;
    private long   inTransit;
    private long   outForDelivery;
    private long   delayed;
    private long   failed;
    private long   cancelled;

    /** Delivery success rate as a percentage (0–100), rounded to 1 decimal. */
    private double successRate;

    /** Average time from creation to delivery in hours. Null if no deliveries. */
    private Double avgDeliveryHours;

    /** Average predicted delay in minutes. Null if no delay data. */
    private Double avgDelayMinutes;

    // ── Charts ────────────────────────────────────────────────────────────────
    private List<AnalyticsChartsResponse.LabelCount>    statusDistribution;
    private List<AnalyticsChartsResponse.MonthlyCount>  monthlyShipmentTrend;
    private List<AnalyticsChartsResponse.LabelCount>    topDestinations;

    /** Human-readable period label (e.g. "This Month", "All Time"). */
    private String periodLabel;
}
