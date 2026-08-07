package com.shiptrackpro.service;

import com.shiptrackpro.dto.AnalyticsActivityResponse;
import com.shiptrackpro.dto.AnalyticsChartsResponse;
import com.shiptrackpro.dto.AnalyticsOverviewResponse;

/**
 * Analytics service interface.
 *
 * <p>Defines the three operations that back the analytics REST endpoints.
 * Each method accepts a {@code period} filter string ({@code "today"},
 * {@code "week"}, {@code "month"}, {@code "all"}) and an optional
 * {@code limit} that controls how many items are returned for ranked
 * lists (top cities, top creators, driver performance).</p>
 *
 * <p>This interface is intentionally isolated from {@link ShipmentService}
 * — analytics is a read-only concern and must not be mixed with the
 * transactional shipment workflow.</p>
 */
public interface AnalyticsService {

    /**
     * Returns all KPI card data.
     *
     * @param period one of: "today", "week", "month", "all"
     * @return overview stats DTO
     */
    AnalyticsOverviewResponse getOverview(String period);

    /**
     * Returns all chart datasets.
     *
     * @param period one of: "today", "week", "month", "all"
     * @param limit  max items returned for ranked lists (cities, creators, drivers)
     * @return charts data DTO
     */
    AnalyticsChartsResponse getCharts(String period, int limit);

    /**
     * Returns recent activity feed and four recent-item lists.
     *
     * @param limit max items per list
     * @return activity data DTO
     */
    AnalyticsActivityResponse getActivity(int limit);
}
