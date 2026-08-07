package com.shiptrackpro.service;

import com.shiptrackpro.dto.ClientReportResponse;
import com.shiptrackpro.dto.DriverReportResponse;
import com.shiptrackpro.dto.DeliverySummaryResponse;
import com.shiptrackpro.dto.RouteReportResponse;
import com.shiptrackpro.dto.ShipmentReportResponse;

import java.time.LocalDate;

/**
 * Service interface for the Delivery Reports module.
 *
 * <p>All methods are read-only and delegate as much computation as possible
 * to the existing {@link AnalyticsService} to prevent duplicate queries.</p>
 */
public interface ReportService {

    /**
     * Returns the Delivery Summary report for the given period or date range.
     *
     * @param period named period ("today" | "week" | "month" | "all")
     * @param from   custom range start (overrides period when both non-null)
     * @param to     custom range end   (overrides period when both non-null)
     */
    DeliverySummaryResponse getSummary(String period, LocalDate from, LocalDate to);

    /**
     * Returns a paginated Shipment Report with status/type breakdowns.
     *
     * @param period named period
     * @param from   custom range start
     * @param to     custom range end
     * @param status optional status filter (null = all)
     * @param page   zero-indexed page number
     * @param size   page size (capped at 100 by the service)
     */
    ShipmentReportResponse getShipmentReport(String period, LocalDate from, LocalDate to,
                                             String status, int page, int size);

    /**
     * Returns the Driver Performance report.
     *
     * @param period named period
     * @param limit  max drivers to return (1–50)
     */
    DriverReportResponse getDriverReport(String period, int limit);

    /**
     * Returns the Business Client Report.
     *
     * @param period named period
     * @param from   custom range start
     * @param to     custom range end
     */
    ClientReportResponse getClientReport(String period, LocalDate from, LocalDate to);

    /**
     * Returns the Route Performance Report.
     *
     * @param period named period
     * @param limit  max routes/cities to return (1–20)
     */
    RouteReportResponse getRouteReport(String period, int limit);
}
