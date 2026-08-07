package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Response DTO for {@code GET /api/reports/drivers}.
 *
 * <p>Embeds {@link AnalyticsChartsResponse.DriverPerformanceStat} directly
 * to prevent any duplication of per-driver calculations. The driver list is
 * produced by the existing {@code AnalyticsService.getCharts()} pipeline
 * which already computes totalAssigned, delivered, failed, avgDeliveryHours,
 * completionRate, and rejectedShipments.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverReportResponse {

    /**
     * Per-driver performance statistics — reused directly from
     * {@link AnalyticsChartsResponse.DriverPerformanceStat}.
     */
    private List<AnalyticsChartsResponse.DriverPerformanceStat> drivers;

    /** Total number of drivers with at least one assigned shipment in the period. */
    private long totalDrivers;

    /**
     * Overall fleet completion rate across all drivers.
     * {@code totalDelivered / totalAssigned * 100}, rounded to one decimal.
     */
    private double overallCompletionRate;

    /**
     * Fleet average delivery time in hours (across all DELIVERED shipments).
     * {@code null} when no deliveries exist.
     */
    private Double avgDeliveryHours;

    /** Human-readable period label (e.g. "This Month"). */
    private String periodLabel;
}
