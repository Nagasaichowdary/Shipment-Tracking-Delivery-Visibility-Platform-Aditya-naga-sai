package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Response DTO for {@code GET /api/reports/routes}.
 *
 * <p>Provides route-level performance metrics. City rankings reuse the
 * {@link AnalyticsChartsResponse.LabelCount} type from the existing Analytics
 * module. Monthly delivery trend reuses {@link AnalyticsChartsResponse.MonthlyCount}.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteReportResponse {

    /** Top origin cities by shipment volume — reused from AnalyticsChartsResponse. */
    private List<AnalyticsChartsResponse.LabelCount> topOriginCities;

    /** Top destination cities by shipment volume — reused from AnalyticsChartsResponse. */
    private List<AnalyticsChartsResponse.LabelCount> topDestinationCities;

    /**
     * Top origin→destination route pairs ranked by shipment volume.
     * Each entry contains aggregate performance for that specific corridor.
     */
    private List<RouteStat> topRoutes;

    /** Monthly delivery trend for the selected period — reused from AnalyticsChartsResponse. */
    private List<AnalyticsChartsResponse.MonthlyCount> monthlyDeliveryTrend;

    /** Human-readable period label. */
    private String periodLabel;

    // ─────────────────────────────────────────────────────────────────────────
    // Nested DTO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Statistics for a single origin→destination route corridor.
     */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RouteStat {

        /** Origin city name. */
        private String origin;

        /** Destination city name. */
        private String destination;

        /** Total shipments on this corridor in the period. */
        private long totalShipments;

        /** Shipments on this corridor that were DELIVERED. */
        private long deliveredShipments;

        /**
         * Delivery rate: {@code deliveredShipments / totalShipments * 100}.
         * Zero when totalShipments is zero.
         */
        private double deliveryRate;

        /**
         * Average hours from creation to delivery for DELIVERED shipments
         * on this corridor. {@code null} when no deliveries exist.
         */
        private Double avgDeliveryHours;
    }
}
