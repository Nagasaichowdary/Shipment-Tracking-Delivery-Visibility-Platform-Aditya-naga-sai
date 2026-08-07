package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.AnalyticsChartsResponse;
import com.shiptrackpro.dto.AnalyticsChartsResponse.LabelCount;
import com.shiptrackpro.dto.AnalyticsChartsResponse.MonthlyCount;
import com.shiptrackpro.dto.AnalyticsActivityResponse;
import com.shiptrackpro.dto.AnalyticsOverviewResponse;
import com.shiptrackpro.dto.ClientReportResponse;
import com.shiptrackpro.dto.ClientReportResponse.ClientStat;
import com.shiptrackpro.dto.DeliverySummaryResponse;
import com.shiptrackpro.dto.DriverReportResponse;
import com.shiptrackpro.dto.RouteReportResponse;
import com.shiptrackpro.dto.RouteReportResponse.RouteStat;
import com.shiptrackpro.dto.ShipmentReportResponse;
import com.shiptrackpro.dto.ShipmentResponse;
import com.shiptrackpro.entity.BusinessClient;
import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.enums.ShipmentStatus;
import com.shiptrackpro.repository.AnalyticsRepository;
import com.shiptrackpro.repository.BusinessClientRepository;
import com.shiptrackpro.repository.ShipmentRepository;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.service.AnalyticsService;
import com.shiptrackpro.service.ReportService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Implementation of {@link ReportService}.
 *
 * <p><b>Design principles</b>
 * <ul>
 *   <li>{@link #getSummary} and {@link #getDriverReport} call {@link AnalyticsService}
 *       directly — they never re-query the repository.</li>
 *   <li>{@link #getShipmentReport}, {@link #getClientReport}, and
 *       {@link #getRouteReport} use the 3 new queries added to the existing
 *       repositories; existing queries are reused for distributions and trends.</li>
 *   <li>All methods are read-only ({@code @Transactional(readOnly = true)}).</li>
 * </ul>
 * </p>
 */
@Service
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("MMM yyyy");

    private final AnalyticsService        analyticsService;
    private final AnalyticsRepository     analyticsRepo;
    private final ShipmentRepository      shipmentRepo;
    private final UserRepository          userRepo;
    private final BusinessClientRepository businessClientRepo;

    public ReportServiceImpl(AnalyticsService analyticsService,
                             AnalyticsRepository analyticsRepo,
                             ShipmentRepository shipmentRepo,
                             UserRepository userRepo,
                             BusinessClientRepository businessClientRepo) {
        this.analyticsService    = analyticsService;
        this.analyticsRepo       = analyticsRepo;
        this.shipmentRepo        = shipmentRepo;
        this.userRepo            = userRepo;
        this.businessClientRepo  = businessClientRepo;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Period / date-range helper
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves the effective [from, to] window from named period or explicit dates.
     * If both {@code from} and {@code to} are supplied they take priority.
     */
    private LocalDateTime[] resolveWindow(String period, LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return new LocalDateTime[]{from.atStartOfDay(), to.plusDays(1).atStartOfDay()};
        }
        LocalDate today = LocalDate.now();
        LocalDate start;
        if (period == null) period = "month";
        start = switch (period.toLowerCase()) {
            case "today" -> today;
            case "week"  -> today.minusDays(6);
            case "all"   -> LocalDate.of(2000, 1, 1);
            default      -> today.withDayOfMonth(1); // "month"
        };
        return new LocalDateTime[]{start.atStartOfDay(), today.plusDays(1).atStartOfDay()};
    }

    private String periodLabel(String period, LocalDate from, LocalDate to) {
        if (from != null && to != null) return from + " → " + to;
        return switch (period == null ? "month" : period.toLowerCase()) {
            case "today" -> "Today";
            case "week"  -> "This Week";
            case "all"   -> "All Time";
            default      -> "This Month";
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Delivery Summary — delegates entirely to AnalyticsService
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public DeliverySummaryResponse getSummary(String period, LocalDate from, LocalDate to) {
        String effectivePeriod = (from != null && to != null) ? "all" : (period == null ? "month" : period);

        AnalyticsOverviewResponse overview = analyticsService.getOverview(effectivePeriod);
        AnalyticsChartsResponse   charts   = analyticsService.getCharts(effectivePeriod, 5);
        AnalyticsActivityResponse activity = analyticsService.getActivity(10);

        return DeliverySummaryResponse.builder()
                .overview(overview)
                .monthlyDeliveryTrend(charts.getMonthlyDeliveryTrend())
                .monthlyShipmentTrend(charts.getMonthlyShipmentTrend())
                .recentDeliveries(activity.getRecentDeliveries())
                .periodLabel(periodLabel(period, from, to))
                .from(from)
                .to(to)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Shipment Report — paginated list + breakdowns
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public ShipmentReportResponse getShipmentReport(String period, LocalDate from, LocalDate to,
                                                    String status, int page, int size) {
        LocalDateTime[] window = resolveWindow(period, from, to);
        LocalDateTime windowFrom = window[0];
        LocalDateTime windowTo   = window[1];

        int safeSize = Math.max(1, Math.min(100, size));
        Pageable pageable = PageRequest.of(Math.max(0, page), safeSize);

        // Resolve optional status filter
        ShipmentStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try { statusFilter = ShipmentStatus.valueOf(status.trim().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        // Paginated shipment rows
        Page<Shipment> shipmentPage = shipmentRepo.findByDateRangeAndStatus(
                statusFilter, windowFrom, windowTo, pageable);

        // Map to ShipmentResponse via existing ShipmentService mapper (use getAllShipments pattern)
        List<ShipmentResponse> rows = shipmentPage.getContent().stream()
                .map(this::toShipmentResponse)
                .collect(Collectors.toList());

        // Status count summary
        Map<String, Long> statusCounts = new HashMap<>();
        List<Object[]> rawStatus = (statusFilter == null)
                ? analyticsRepo.countByStatusSince(windowFrom)
                : analyticsRepo.countByStatusSince(windowFrom);
        for (Object[] row : rawStatus) {
            statusCounts.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }

        // Type distributions — reuse existing queries
        List<LabelCount> typeBreakdown = toLabels(analyticsRepo.shipmentTypeDistribution());
        List<LabelCount> pkgBreakdown  = toLabels(analyticsRepo.packageTypeDistribution());

        // Monthly trend — reuse existing query (last 6 months)
        LocalDateTime trendSince = LocalDateTime.now().minusMonths(6).withDayOfMonth(1).toLocalDate().atStartOfDay();
        List<MonthlyCount> trend = toMonthly(analyticsRepo.monthlyShipmentTrend(trendSince));

        return ShipmentReportResponse.builder()
                .shipments(rows)
                .totalRecords(shipmentPage.getTotalElements())
                .page(shipmentPage.getNumber())
                .size(shipmentPage.getSize())
                .totalPages(shipmentPage.getTotalPages())
                .statusCounts(statusCounts)
                .shipmentTypeBreakdown(typeBreakdown)
                .packageTypeBreakdown(pkgBreakdown)
                .monthlyTrend(trend)
                .periodLabel(periodLabel(period, from, to))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Driver Report — delegates entirely to AnalyticsService
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public DriverReportResponse getDriverReport(String period, int limit) {
        int safeLimit = Math.max(1, Math.min(50, limit));
        AnalyticsChartsResponse charts = analyticsService.getCharts(period == null ? "all" : period, safeLimit);
        List<AnalyticsChartsResponse.DriverPerformanceStat> drivers = charts.getDriverPerformance();

        long totalDrivers = drivers.size();
        long totalAssigned  = drivers.stream().mapToLong(AnalyticsChartsResponse.DriverPerformanceStat::getTotalAssigned).sum();
        long totalDelivered = drivers.stream().mapToLong(AnalyticsChartsResponse.DriverPerformanceStat::getDelivered).sum();
        double overallRate = totalAssigned > 0 ? Math.round((double) totalDelivered / totalAssigned * 1000.0) / 10.0 : 0.0;
        Double avgHours = drivers.stream()
                .map(AnalyticsChartsResponse.DriverPerformanceStat::getAvgDeliveryHours)
                .filter(h -> h != null)
                .mapToDouble(Double::doubleValue)
                .average()
                .stream().boxed().findFirst().orElse(null);

        return DriverReportResponse.builder()
                .drivers(drivers)
                .totalDrivers(totalDrivers)
                .overallCompletionRate(overallRate)
                .avgDeliveryHours(avgHours)
                .periodLabel(periodLabel(period, null, null))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Business Client Report
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public ClientReportResponse getClientReport(String period, LocalDate from, LocalDate to) {
        LocalDateTime[] window = resolveWindow(period, from, to);
        LocalDateTime windowFrom = window[0];
        LocalDateTime windowTo   = window[1];

        // All BUSINESS_CLIENT users (approved)
        List<User> clients = userRepo.findByRole_RoleNameAndRegistrationStatus(
                "BUSINESS_CLIENT", RegistrationStatus.APPROVED);

        List<ClientStat> stats = new ArrayList<>();
        long totalShipments = 0L;

        for (User client : clients) {
            List<Shipment> shipments = analyticsRepo.findByCreatedByAndDateRange(
                    client.getUserId(), windowFrom, windowTo);
            if (shipments.isEmpty()) continue;

            long delivered = shipments.stream()
                    .filter(s -> s.getShipmentStatus() == ShipmentStatus.DELIVERED)
                    .count();
            double rate = Math.round((double) delivered / shipments.size() * 1000.0) / 10.0;

            LocalDate lastDate = shipments.stream()
                    .map(s -> s.getCreatedAt().toLocalDate())
                    .max(LocalDate::compareTo)
                    .orElse(null);

            // Enrich with company profile
            Optional<BusinessClient> profile = businessClientRepo.findByUser(client);
            String companyName   = profile.map(BusinessClient::getCompanyName).orElse(null);
            String businessType  = profile.map(BusinessClient::getBusinessType).orElse(null);

            stats.add(ClientStat.builder()
                    .userId(client.getUserId())
                    .clientName(client.getFirstName() + " " + client.getLastName())
                    .companyName(companyName)
                    .businessType(businessType)
                    .totalShipments(shipments.size())
                    .deliveredShipments(delivered)
                    .deliveryRate(rate)
                    .lastShipmentDate(lastDate)
                    .build());

            totalShipments += shipments.size();
        }

        // Sort by total shipments descending
        stats.sort((a, b) -> Long.compare(b.getTotalShipments(), a.getTotalShipments()));

        return ClientReportResponse.builder()
                .clients(stats)
                .totalClients(stats.size())
                .totalShipmentsByClients(totalShipments)
                .periodLabel(periodLabel(period, from, to))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Route Performance Report
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public RouteReportResponse getRouteReport(String period, int limit) {
        int safeLimit = Math.max(1, Math.min(20, limit));
        AnalyticsChartsResponse charts = analyticsService.getCharts(period == null ? "month" : period, safeLimit);

        // City rankings — reused directly from existing charts
        List<LabelCount> origins      = charts.getTopOriginCities();
        List<LabelCount> destinations = charts.getTopDestinationCities();

        // Build route pairs from top origins × top destinations
        // (approximate — a full cross-join is avoided for performance)
        List<RouteStat> topRoutes = buildTopRoutes(period, safeLimit);

        // Monthly delivery trend — reused from charts
        List<MonthlyCount> trend = charts.getMonthlyDeliveryTrend();

        return RouteReportResponse.builder()
                .topOriginCities(origins)
                .topDestinationCities(destinations)
                .topRoutes(topRoutes)
                .monthlyDeliveryTrend(trend)
                .periodLabel(periodLabel(period, null, null))
                .build();
    }

    /**
     * Derives route-level stats from all shipments in the current window.
     * Groups by origin city → destination city and computes delivery rate and avg hours.
     */
    private List<RouteStat> buildTopRoutes(String period, int limit) {
        // Use the full shipment list from the analytics "all" recent deliveries
        // to avoid N+1 queries. We aggregate in Java over the manageable resultset.
        LocalDateTime since = LocalDateTime.now().minusMonths(6).withDayOfMonth(1).toLocalDate().atStartOfDay();
        List<Shipment> recent = analyticsRepo.findRecentShipments(PageRequest.of(0, 500));

        Map<String, long[]> routeMap = new LinkedHashMap<>(); // key="Origin→Dest", val=[total,delivered,deliveryMillis]
        Map<String, Long>   sumMillis = new LinkedHashMap<>();

        for (Shipment s : recent) {
            if (s.getOriginAddress() == null || s.getDestinationAddress() == null) continue;
            String key = s.getOriginAddress().getCity() + "→" + s.getDestinationAddress().getCity();
            routeMap.computeIfAbsent(key, k -> new long[]{0, 0, 0});
            routeMap.get(key)[0]++;
            if (s.getShipmentStatus() == ShipmentStatus.DELIVERED) {
                routeMap.get(key)[1]++;
                if (s.getDeliveredAt() != null) {
                    long hours = java.time.Duration.between(s.getCreatedAt(), s.getDeliveredAt()).toHours();
                    sumMillis.merge(key, hours, Long::sum);
                }
            }
        }

        return routeMap.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0]))
                .limit(limit)
                .map(e -> {
                    String[] parts   = e.getKey().split("→", 2);
                    long total       = e.getValue()[0];
                    long delivered   = e.getValue()[1];
                    double rate      = total > 0 ? Math.round((double) delivered / total * 1000.0) / 10.0 : 0.0;
                    Long totalHours  = sumMillis.get(e.getKey());
                    Double avgHours  = (totalHours != null && delivered > 0) ? (double) totalHours / delivered : null;
                    return RouteStat.builder()
                            .origin(parts.length > 0 ? parts[0] : "")
                            .destination(parts.length > 1 ? parts[1] : "")
                            .totalShipments(total)
                            .deliveredShipments(delivered)
                            .deliveryRate(rate)
                            .avgDeliveryHours(avgHours)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mapping helpers
    // ─────────────────────────────────────────────────────────────────────────

    private List<LabelCount> toLabels(List<Object[]> rows) {
        return rows.stream()
                .map(r -> LabelCount.builder()
                        .label(String.valueOf(r[0]))
                        .count(((Number) r[1]).longValue())
                        .build())
                .collect(Collectors.toList());
    }

    private List<MonthlyCount> toMonthly(List<Object[]> rows) {
        return rows.stream()
                .map(r -> {
                    int year  = ((Number) r[0]).intValue();
                    int month = ((Number) r[1]).intValue();
                    String label = java.time.Month.of(month).getDisplayName(
                            java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH)
                            + " " + year;
                    long count = ((Number) r[2]).longValue();
                    return MonthlyCount.builder().month(label).count(count).build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Lightweight Shipment → ShipmentResponse mapper.
     * Mirrors the mapping in ShipmentServiceImpl to avoid injecting that service
     * (which would create a circular or layering violation).
     */
    private ShipmentResponse toShipmentResponse(Shipment s) {
        com.shiptrackpro.dto.AddressResponse origin = s.getOriginAddress() == null ? null :
                com.shiptrackpro.dto.AddressResponse.builder()
                        .id(s.getOriginAddress().getId())
                        .line1(s.getOriginAddress().getLine1())
                        .line2(s.getOriginAddress().getLine2())
                        .city(s.getOriginAddress().getCity())
                        .state(s.getOriginAddress().getState())
                        .postalCode(s.getOriginAddress().getPostalCode())
                        .country(s.getOriginAddress().getCountry())
                        .build();
        com.shiptrackpro.dto.AddressResponse dest = s.getDestinationAddress() == null ? null :
                com.shiptrackpro.dto.AddressResponse.builder()
                        .id(s.getDestinationAddress().getId())
                        .line1(s.getDestinationAddress().getLine1())
                        .line2(s.getDestinationAddress().getLine2())
                        .city(s.getDestinationAddress().getCity())
                        .state(s.getDestinationAddress().getState())
                        .postalCode(s.getDestinationAddress().getPostalCode())
                        .country(s.getDestinationAddress().getCountry())
                        .build();
        return ShipmentResponse.builder()
                .id(s.getId())
                .trackingNumber(s.getTrackingNumber())
                .senderName(s.getSenderName())
                .senderPhone(s.getSenderPhone())
                .senderUserId(s.getSenderUser() != null ? s.getSenderUser().getUserId() : null)
                .receiverName(s.getReceiverName())
                .receiverPhone(s.getReceiverPhone())
                .receiverUserId(s.getReceiverUser() != null ? s.getReceiverUser().getUserId() : null)
                .guestEmail(s.getGuestEmail())
                .originAddress(origin)
                .destinationAddress(dest)
                .packageWeight(s.getPackageWeight())
                .shipmentType(s.getShipmentType())
                .packageType(s.getPackageType())
                .shipmentStatus(s.getShipmentStatus())
                .expectedDeliveryDate(s.getExpectedDeliveryDate())
                .createdByUserId(s.getCreatedBy() != null ? s.getCreatedBy().getUserId() : null)
                .assignedDriverId(s.getAssignedDriver() != null ? s.getAssignedDriver().getUserId() : null)
                .assignedDriverName(s.getAssignedDriver() != null ? s.getAssignedDriver().getFullName() : null)
                .cancellationReason(s.getCancellationReason())
                .delayReason(s.getDelayReason())
                .deliveryConfirmed(s.getDeliveryConfirmed())
                .deliveredAt(s.getDeliveredAt())
                .deliveryReceiverName(s.getDeliveryReceiverName())
                .deliveryRemarks(s.getDeliveryRemarks())
                .customerSignaturePath(s.getCustomerSignaturePath())
                .deliveryPhotoPath(s.getDeliveryPhotoPath())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
