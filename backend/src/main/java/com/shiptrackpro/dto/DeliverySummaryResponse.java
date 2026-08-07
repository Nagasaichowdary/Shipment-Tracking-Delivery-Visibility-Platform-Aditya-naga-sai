package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for {@code GET /api/reports/summary}.
 *
 * <p>Embeds {@link AnalyticsOverviewResponse} directly to reuse all KPI
 * calculations already produced by {@code AnalyticsServiceImpl.getOverview()}.
 * Monthly delivery trend and recent deliveries are pulled from the existing
 * charts and activity endpoints respectively.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliverySummaryResponse {

    /** Full KPI overview — reused directly from AnalyticsService.getOverview(). */
    private AnalyticsOverviewResponse overview;

    /** Monthly delivery trend — reused from AnalyticsChartsResponse.monthlyDeliveryTrend. */
    private List<AnalyticsChartsResponse.MonthlyCount> monthlyDeliveryTrend;

    /** Monthly shipment creation trend — reused from AnalyticsChartsResponse.monthlyShipmentTrend. */
    private List<AnalyticsChartsResponse.MonthlyCount> monthlyShipmentTrend;

    /** Most recent confirmed deliveries — reused from AnalyticsActivityResponse. */
    private List<AnalyticsActivityResponse.RecentShipmentItem> recentDeliveries;

    /** Human-readable period label (e.g. "This Month", "Today"). */
    private String periodLabel;

    /** Inclusive start of the custom date range filter. Null when using a named period. */
    private LocalDate from;

    /** Inclusive end of the custom date range filter. Null when using a named period. */
    private LocalDate to;
}
