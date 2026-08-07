package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for {@code GET /api/reports/shipments}.
 *
 * <p>Contains a paginated list of shipments plus aggregate breakdowns
 * (status counts, type distribution, monthly trend). Reuses
 * {@link ShipmentResponse} for individual rows and the nested DTOs from
 * {@link AnalyticsChartsResponse} for breakdowns to avoid duplication.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentReportResponse {

    /** Paginated shipment rows — each is the full {@link ShipmentResponse}. */
    private List<ShipmentResponse> shipments;

    /** Total records matching the current filter (across all pages). */
    private long totalRecords;

    /** Current zero-indexed page number. */
    private int page;

    /** Number of records per page. */
    private int size;

    /** Total number of pages available. */
    private int totalPages;

    /**
     * Count of shipments per status within the current filter window.
     * Key = status name (e.g. "DELIVERED"), value = count.
     */
    private Map<String, Long> statusCounts;

    /** Shipment count by type (STANDARD, EXPRESS…) — reused from AnalyticsChartsResponse. */
    private List<AnalyticsChartsResponse.LabelCount> shipmentTypeBreakdown;

    /** Shipment count by package type (BOX, ENVELOPE…) — reused from AnalyticsChartsResponse. */
    private List<AnalyticsChartsResponse.LabelCount> packageTypeBreakdown;

    /** Monthly shipment creation trend — reused from AnalyticsChartsResponse. */
    private List<AnalyticsChartsResponse.MonthlyCount> monthlyTrend;

    /** Human-readable period label. */
    private String periodLabel;
}
