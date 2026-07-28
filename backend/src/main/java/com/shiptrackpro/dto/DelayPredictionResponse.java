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
public class DelayPredictionResponse {

    // ── Original fields (unchanged — do not remove) ─────────────────────────
    private Long    shipmentId;
    private String  trackingNumber;
    private String  shipmentStatus;
    private Integer estimatedDelayMinutes;
    private boolean delayed;
    private String  message;

    // ── New ETA fields (nullable for backward compatibility) ─────────────────

    /** Dynamic ETA computed by EtaCalculationService rule engine. */
    private LocalDateTime estimatedDeliveryTime;

    /**
     * Human-readable remaining time until estimated delivery.
     * Examples: "5 hours 20 minutes", "2 days 6 hours", "Delivered".
     */
    private String remainingTime;

    /**
     * Minutes by which the estimated delivery time exceeds the original
     * expectedDeliveryDate.  0 means on time or ahead of schedule.
     */
    private Integer delayMinutes;

    /**
     * Short explanation of all rule adjustments that contributed to the ETA,
     * e.g. "Status IN_TRANSIT (+6h); Shipment type EXPRESS (−4h); Driver assigned (−30 min)".
     */
    private String delayReason;

    /**
     * Forecast confidence score 0–100.
     * Reflects how reliable the current ETA estimate is.
     * <ul>
     *   <li>90–100 — High confidence (green)</li>
     *   <li>70–89  — Good confidence (blue)</li>
     *   <li>50–69  — Moderate confidence (orange)</li>
     *   <li>0–49   — Low confidence (red)</li>
     * </ul>
     */
    private Integer confidence;

}

