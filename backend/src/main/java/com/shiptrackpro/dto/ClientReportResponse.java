package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for {@code GET /api/reports/clients}.
 *
 * <p>Provides per-business-client shipment statistics, enriched with the
 * company profile stored in the {@code business_clients} table (company name,
 * business type). All shipment counts are derived from the existing
 * {@code shipments} table via {@code AnalyticsRepository.topCreatorsSince()}
 * and {@code AnalyticsRepository.findByCreatedByAndDateRange()}.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientReportResponse {

    /** Per-client statistics list, sorted by total shipments descending. */
    private List<ClientStat> clients;

    /** Total number of business clients with at least one shipment in the period. */
    private long totalClients;

    /** Sum of all shipments created by business clients in the period. */
    private long totalShipmentsByClients;

    /** Human-readable period label. */
    private String periodLabel;

    // ─────────────────────────────────────────────────────────────────────────
    // Nested DTO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Per-business-client statistics row.
     */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClientStat {

        /** User ID of the business client (creator). */
        private Long userId;

        /** Full name of the business client user. */
        private String clientName;

        /**
         * Company name from the {@code business_clients} table.
         * {@code null} when the user does not have a matching
         * {@code BusinessClient} profile (legacy accounts).
         */
        private String companyName;

        /**
         * Business type from {@code business_clients.business_type}.
         * E.g. "Retail", "Manufacturing". Nullable.
         */
        private String businessType;

        /** Total shipments created by this client in the period. */
        private long totalShipments;

        /** Shipments that reached DELIVERED status. */
        private long deliveredShipments;

        /**
         * Delivery success rate: {@code deliveredShipments / totalShipments * 100}.
         * Zero when totalShipments is zero.
         */
        private double deliveryRate;

        /** Date of the most recent shipment created by this client. Nullable. */
        private LocalDate lastShipmentDate;
    }
}
