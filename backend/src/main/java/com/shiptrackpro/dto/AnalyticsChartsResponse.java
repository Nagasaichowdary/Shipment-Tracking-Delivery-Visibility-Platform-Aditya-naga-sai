package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Response DTO for {@code GET /api/analytics/charts}.
 *
 * <p>Contains all chart datasets in a single response. Each dataset is
 * a list of simple label-count pairs or specialised stat objects. The
 * frontend distributes these lists directly to the appropriate Recharts
 * components.</p>
 *
 * <p>All data is aggregated from the existing {@code shipments},
 * {@code addresses}, and {@code users} tables — no new tables.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsChartsResponse {

    /** Shipment count grouped by {@code shipment_status} enum value. */
    private List<LabelCount> statusDistribution;

    /** Monthly shipment creation counts for the last 6 calendar months. */
    private List<MonthlyCount> monthlyShipmentTrend;

    /** Monthly delivery (confirmed) counts for the last 6 calendar months. */
    private List<MonthlyCount> monthlyDeliveryTrend;

    /** Top destination cities by shipment count (configurable limit). */
    private List<LabelCount> topDestinationCities;

    /** Top origin cities by shipment count (configurable limit). */
    private List<LabelCount> topOriginCities;

    /** Shipment count grouped by {@code shipment_type}. */
    private List<LabelCount> shipmentTypeDistribution;

    /** Shipment count grouped by {@code package_type} (nulls excluded). */
    private List<LabelCount> packageTypeDistribution;

    /**
     * Top shipment creators (Logistics Operators / Business Clients)
     * ranked by shipment count (configurable limit).
     */
    private List<LabelCount> topCreators;

    /**
     * Per-driver analytics including total assigned, delivered, failed,
     * rejected, avg delay, completion rate, and avg delivery time.
     */
    private List<DriverPerformanceStat> driverPerformance;

    /**
     * Ratio of guest (no registered account) vs registered receivers.
     * Used for a 2-slice donut chart.
     */
    private GuestVsRegistered guestVsRegistered;

    // ─────────────────────────────────────────────────────────────────────────
    // Nested DTO classes used in the chart datasets
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generic label-count pair.
     * Used for status distribution, city rankings, type breakdowns, and
     * creator rankings.
     */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LabelCount {
        /** Human-readable label (status name, city, type, driver name…). */
        private String label;
        /** Shipment count for this label. */
        private long count;
    }

    /**
     * Month label + shipment count.
     * Month is formatted as "Aug 2026" for direct use in Recharts axis labels.
     */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MonthlyCount {
        /** e.g. "Mar 2026", "Apr 2026" … */
        private String month;
        private long count;
    }

    /**
     * Comprehensive per-driver performance metrics.
     *
     * <p>Derived entirely from the {@code shipments} table by grouping on
     * {@code assigned_driver_id} and computing aggregates over
     * {@code shipment_status}, {@code estimated_delay_minutes}, and
     * the delivery-time delta ({@code delivered_at - created_at}).</p>
     */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DriverPerformanceStat {
        private Long   driverId;
        private String driverName;

        /** Total shipments ever assigned to this driver. */
        private long totalAssigned;

        /** Shipments confirmed as DELIVERED. */
        private long delivered;

        /** Shipments with status FAILED_DELIVERY. */
        private long failedDeliveries;

        /**
         * Shipments this driver explicitly rejected via
         * {@code POST /api/driver/reject/{id}}.
         * Sourced from {@code driver_rejections} table.
         */
        private long rejectedShipments;

        /**
         * Average predicted delay for this driver's delayed shipments,
         * in minutes. {@code null} if none are delayed.
         */
        private Double avgDelayMinutes;

        /**
         * {@code delivered / totalAssigned * 100}, rounded to one decimal.
         * {@code 0.0} when totalAssigned is zero.
         */
        private double completionRate;

        /**
         * Average hours from creation to delivery for DELIVERED shipments.
         * {@code null} when no deliveries exist.
         */
        private Double avgDeliveryHours;
    }

    /**
     * Two-bucket split: guest receivers (no platform account) vs
     * registered receivers (linked to a {@code User} entity).
     */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GuestVsRegistered {
        private long guestCount;
        private long registeredCount;
    }
}
