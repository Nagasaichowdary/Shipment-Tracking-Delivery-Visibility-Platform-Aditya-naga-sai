package com.shiptrackpro.service;

import com.shiptrackpro.dto.BusinessClientAnalyticsResponse;
import com.shiptrackpro.dto.MyShipmentReportResponse;

import java.time.LocalDate;

/**
 * Service for the Business Client's personal analytics and reports.
 *
 * <p>All methods require a {@code userId} that is extracted from the
 * Spring Security JWT principal by the controller — it is never accepted
 * from the HTTP request body or query parameters.</p>
 */
public interface BusinessClientService {

    /**
     * Returns analytics KPIs and chart data for the authenticated Business Client.
     *
     * @param userId the authenticated Business Client's user ID (from JWT)
     * @param period named period: "today" | "week" | "month" | "all"
     * @param from   optional range start (overrides period when both from+to are set)
     * @param to     optional range end
     */
    BusinessClientAnalyticsResponse getMyAnalytics(Long userId, String period,
                                                    LocalDate from, LocalDate to);

    /**
     * Returns a paginated shipment report for the authenticated Business Client.
     *
     * @param userId the authenticated Business Client's user ID (from JWT)
     * @param period named period
     * @param from   optional range start
     * @param to     optional range end
     * @param status optional status filter (e.g. "DELIVERED")
     * @param page   zero-based page index
     * @param size   page size (1–100)
     */
    MyShipmentReportResponse getMyReport(Long userId, String period,
                                          LocalDate from, LocalDate to,
                                          String status, int page, int size);

    /**
     * Exports the Business Client's own shipments as PDF, Excel, or CSV.
     *
     * @param userId the authenticated Business Client's user ID (from JWT)
     * @param format "pdf" | "excel" | "csv"
     * @param period named period
     * @param from   optional range start
     * @param to     optional range end
     * @param status optional status filter
     */
    byte[] exportMyReport(Long userId, String format, String period,
                           LocalDate from, LocalDate to, String status) throws java.io.IOException;

    /** Returns the MIME type for a given format string. */
    String exportContentType(String format);

    /** Returns a filename for the export file. */
    String exportFilename(String format);
}
