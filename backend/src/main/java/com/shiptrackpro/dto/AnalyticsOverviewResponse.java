package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Response DTO for {@code GET /api/analytics/overview}.
 *
 * <p>Contains KPI cards data only — shipment counts broken down by status,
 * time-window counts, and computed performance metrics (success rate,
 * average delivery time, delay rate, average delay).</p>
 *
 * <p>All fields are derived from the existing {@code shipments} table via
 * aggregate JPQL queries. No new database tables were created.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsOverviewResponse {

    // ── Status counts ─────────────────────────────────────────────────────────
    private long total;
    private long delivered;
    private long pendingDriver;
    private long driverAssigned;
    private long pickedUp;
    private long inTransit;
    private long outForDelivery;
    private long delayed;
    private long cancelled;
    private long failedDelivery;
    private long returned;

    // ── Time-window counts ────────────────────────────────────────────────────
    private long today;
    private long thisWeek;
    private long thisMonth;

    // ── Computed performance metrics ──────────────────────────────────────────

    /**
     * Percentage of all shipments that reached DELIVERED status.
     * {@code (delivered / total) * 100}, rounded to one decimal.
     */
    private double deliverySuccessRate;

    /**
     * Average time from shipment creation to delivery, expressed in hours.
     * Computed only over shipments with a non-null {@code delivered_at}.
     * {@code null} when no deliveries exist yet.
     */
    private Double avgDeliveryHours;

    /**
     * Average delivery time converted to days (avgDeliveryHours / 24).
     * Convenience field for the UI — avoids the division in JavaScript.
     */
    private Double avgDeliveryDays;

    /**
     * Percentage of all shipments that are currently in DELAYED status.
     * {@code (delayed / total) * 100}.
     */
    private double delayRate;

    /**
     * Average predicted delay in minutes for shipments that have a
     * non-null {@code estimated_delay_minutes} value.
     * {@code null} when no delay predictions exist.
     */
    private Double avgDelayMinutes;
}
