package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.AnalyticsActivityResponse;
import com.shiptrackpro.dto.AnalyticsActivityResponse.ActivityItem;
import com.shiptrackpro.dto.AnalyticsActivityResponse.RecentShipmentItem;
import com.shiptrackpro.dto.AnalyticsChartsResponse;
import com.shiptrackpro.dto.AnalyticsChartsResponse.DriverPerformanceStat;
import com.shiptrackpro.dto.AnalyticsChartsResponse.GuestVsRegistered;
import com.shiptrackpro.dto.AnalyticsChartsResponse.LabelCount;
import com.shiptrackpro.dto.AnalyticsChartsResponse.MonthlyCount;
import com.shiptrackpro.dto.AnalyticsOverviewResponse;
import com.shiptrackpro.entity.Notification;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.repository.AnalyticsRepository;
import com.shiptrackpro.repository.NotificationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Implementation of {@link com.shiptrackpro.service.AnalyticsService}.
 *
 * <p>All methods are read-only ({@code @Transactional(readOnly=true)}) and
 * delegate exclusively to {@link AnalyticsRepository} and
 * {@link NotificationRepository}. No write operations, no calls to
 * {@code ShipmentServiceImpl} or any other transactional service.</p>
 *
 * <p>Design notes:
 * <ul>
 *   <li>Period resolution is centralised in {@link #sinceFor(String)} so
 *       all three endpoints apply filters consistently.</li>
 *   <li>Object[] rows from JPQL are mapped to typed DTOs immediately after
 *       retrieval — raw arrays never escape this class.</li>
 *   <li>Driver rejection counts are loaded separately and merged with the
 *       driver performance aggregate to avoid a cross-join.</li>
 * </ul>
 * </p>
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements com.shiptrackpro.service.AnalyticsService {

    private static final DateTimeFormatter MONTH_FMT =
            DateTimeFormatter.ofPattern("MMM yyyy");

    private final AnalyticsRepository analyticsRepo;
    private final NotificationRepository notificationRepo;

    public AnalyticsServiceImpl(AnalyticsRepository analyticsRepo,
                                NotificationRepository notificationRepo) {
        this.analyticsRepo = analyticsRepo;
        this.notificationRepo = notificationRepo;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Period helper
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Converts a period string into a {@code LocalDateTime} that represents
     * the inclusive start of the requested window.
     *
     * @param period "today" | "week" | "month" | "all" (or null → "all")
     * @return start-of-window timestamp, or {@code null} for "all"
     */
    private LocalDateTime sinceFor(String period) {
        if (period == null) return null;
        LocalDate today = LocalDate.now();
        return switch (period.toLowerCase()) {
            case "today" -> today.atStartOfDay();
            case "week"  -> today.minusDays(6).atStartOfDay();
            case "month" -> today.withDayOfMonth(1).atStartOfDay();
            default      -> null; // "all" — no filter
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Overview — KPI cards
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public AnalyticsOverviewResponse getOverview(String period) {
        LocalDateTime since = sinceFor(period);

        // Load status distribution (with or without time filter)
        List<Object[]> statusRows = (since != null)
                ? analyticsRepo.countByStatusSince(since)
                : analyticsRepo.countByStatus();

        // Unpack status counts into a map for quick lookup.
        // countByStatus / countByStatusSince are native SQL — PostgreSQL JDBC returns
        // BigInteger for COUNT(*), not Long. Use Number.longValue() for safe downcasting.
        Map<String, Long> byStatus = new HashMap<>();
        for (Object[] row : statusRows) {
            byStatus.put(row[0].toString(), ((Number) row[1]).longValue());
        }

        long total         = byStatus.values().stream().mapToLong(Long::longValue).sum();
        long delivered     = byStatus.getOrDefault("DELIVERED",       0L);
        long pendingDriver = byStatus.getOrDefault("PENDING_DRIVER",  0L);
        long driverAssig   = byStatus.getOrDefault("DRIVER_ASSIGNED", 0L);
        long pickedUp      = byStatus.getOrDefault("PICKED_UP",       0L);
        long inTransit     = byStatus.getOrDefault("IN_TRANSIT",      0L);
        long outForDel     = byStatus.getOrDefault("OUT_FOR_DELIVERY",0L);
        long delayed       = byStatus.getOrDefault("DELAYED",         0L);
        long cancelled     = byStatus.getOrDefault("CANCELLED",       0L);
        long failed        = byStatus.getOrDefault("FAILED_DELIVERY", 0L);
        long returned      = byStatus.getOrDefault("RETURNED",        0L);

        // Time-window counts (always from DB; no need to re-compute from statusRows)
        long todayCount = analyticsRepo.countCreatedSince(
                LocalDate.now().atStartOfDay());
        long weekCount  = analyticsRepo.countCreatedSince(
                LocalDate.now().minusDays(6).atStartOfDay());
        long monthCount = analyticsRepo.countCreatedSince(
                LocalDate.now().withDayOfMonth(1).atStartOfDay());

        // Performance metrics (filtered by period when applicable)
        Double avgHours = (since != null)
                ? analyticsRepo.avgDeliveryHoursSince(since)
                : analyticsRepo.avgDeliveryHours();
        Double avgDelay = (since != null)
                ? analyticsRepo.avgDelayMinutesSince(since)
                : analyticsRepo.avgDelayMinutes();

        double successRate = (total > 0) ? (delivered * 100.0 / total) : 0.0;
        double delayRate   = (total > 0) ? (delayed   * 100.0 / total) : 0.0;

        return AnalyticsOverviewResponse.builder()
                .total(total)
                .delivered(delivered)
                .pendingDriver(pendingDriver)
                .driverAssigned(driverAssig)
                .pickedUp(pickedUp)
                .inTransit(inTransit)
                .outForDelivery(outForDel)
                .delayed(delayed)
                .cancelled(cancelled)
                .failedDelivery(failed)
                .returned(returned)
                .today(todayCount)
                .thisWeek(weekCount)
                .thisMonth(monthCount)
                .deliverySuccessRate(round1(successRate))
                .avgDeliveryHours(round2(avgHours))
                .avgDeliveryDays(avgHours != null ? round2(avgHours / 24.0) : null)
                .delayRate(round1(delayRate))
                .avgDelayMinutes(round2(avgDelay))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Charts
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public AnalyticsChartsResponse getCharts(String period, int limit) {
        Pageable top = PageRequest.of(0, limit);
        LocalDateTime since = sinceFor(period);

        // Status distribution (respect period filter)
        List<Object[]> statusRows = (since != null)
                ? analyticsRepo.countByStatusSince(since)
                : analyticsRepo.countByStatus();
        List<LabelCount> statusDist = toLabelCounts(statusRows);

        // Monthly trends — always last 6 months regardless of period filter
        LocalDateTime sixMonthsAgo = LocalDate.now().minusMonths(5)
                .withDayOfMonth(1).atStartOfDay();
        List<MonthlyCount> monthlyShipment = toMonthCountsPadded(
                analyticsRepo.monthlyShipmentTrend(sixMonthsAgo), 6);
        List<MonthlyCount> monthlyDelivery = toMonthCountsPadded(
                analyticsRepo.monthlyDeliveryTrend(sixMonthsAgo), 6);

        // City rankings
        List<LabelCount> topDest   = toLabelCounts(analyticsRepo.topDestinationCities(top));
        List<LabelCount> topOrigin = toLabelCounts(analyticsRepo.topOriginCities(top));

        // Type distributions
        List<LabelCount> shipmentTypes = toLabelCounts(analyticsRepo.shipmentTypeDistribution());
        List<LabelCount> packageTypes  = toLabelCounts(analyticsRepo.packageTypeDistribution());

        // Top creators — JPQL returns Long for count
        List<Object[]> creatorRows = analyticsRepo.topCreators(top);
        List<LabelCount> topCreators = creatorRows.stream()
                .map(r -> LabelCount.builder()
                        .label(r[0] + " " + r[1])
                        .count(((Number) r[2]).longValue())
                        .build())
                .collect(Collectors.toList());

        // Driver performance — native SQL; PostgreSQL returns BigInteger/BigDecimal,
        // so we use Number for safe downcasting regardless of JDBC numeric type.
        List<Object[]> driverRows = analyticsRepo.driverPerformance(limit);
        Map<Long, Long> rejCounts = new HashMap<>();
        analyticsRepo.driverRejectionCounts()
                .forEach(r -> rejCounts.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue()));

        List<DriverPerformanceStat> driverStats = new ArrayList<>();
        for (Object[] r : driverRows) {
            Long   driverId    = ((Number) r[0]).longValue();
            String firstName   = (String) r[1];
            String lastName    = (String) r[2];
            long   total       = ((Number) r[3]).longValue();
            long   dlv         = ((Number) r[4]).longValue();
            long   failed      = ((Number) r[5]).longValue();
            Double avgDelay    = r[6] != null ? ((Number) r[6]).doubleValue() : null;
            Double avgDelHours = r[7] != null ? ((Number) r[7]).doubleValue() : null;
            long   rejected    = rejCounts.getOrDefault(driverId, 0L);
            double compRate    = (total > 0) ? round1(dlv * 100.0 / total) : 0.0;

            driverStats.add(DriverPerformanceStat.builder()
                    .driverId(driverId)
                    .driverName(firstName + " " + lastName)
                    .totalAssigned(total)
                    .delivered(dlv)
                    .failedDeliveries(failed)
                    .rejectedShipments(rejected)
                    .avgDelayMinutes(round2(avgDelay))
                    .completionRate(compRate)
                    .avgDeliveryHours(round2(avgDelHours))
                    .build());
        }

        // Guest vs registered.
        // guestVsRegisteredCount() returns List<Object[]> (one row, two SUM columns).
        // We take list.get(0) to reach the actual [guestCount, registeredCount] row.
        // If the shipments table is empty, SUM returns NULL for both columns.
        List<Object[]> gvrList = analyticsRepo.guestVsRegisteredCount();
        Object[] gvr    = (gvrList != null && !gvrList.isEmpty()) ? gvrList.get(0)
                                                                   : new Object[]{null, null};
        long          guest  = gvr[0] != null ? ((Number) gvr[0]).longValue() : 0L;
        long          regist = gvr[1] != null ? ((Number) gvr[1]).longValue() : 0L;
        GuestVsRegistered gvrDto = GuestVsRegistered.builder()
                .guestCount(guest)
                .registeredCount(regist)
                .build();

        return AnalyticsChartsResponse.builder()
                .statusDistribution(statusDist)
                .monthlyShipmentTrend(monthlyShipment)
                .monthlyDeliveryTrend(monthlyDelivery)
                .topDestinationCities(topDest)
                .topOriginCities(topOrigin)
                .shipmentTypeDistribution(shipmentTypes)
                .packageTypeDistribution(packageTypes)
                .topCreators(topCreators)
                .driverPerformance(driverStats)
                .guestVsRegistered(gvrDto)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Activity feed
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public AnalyticsActivityResponse getActivity(int limit) {
        Pageable top = PageRequest.of(0, limit);

        // Recent activity — sourced from notifications (reuses existing logic)
        // We query all users' notifications then take the most recent ones.
        // NotificationRepository.findByUser_UserIdOrderByCreatedAtDesc requires a userId,
        // so we use the JPA findAll with a sort and take the top N directly.
        List<ActivityItem> activityItems = buildActivityFromNotifications(limit);

        // Four recent lists — sourced from shipments table
        List<RecentShipmentItem> recentShipments    = toShipmentItems(analyticsRepo.findRecentShipments(top));
        List<RecentShipmentItem> recentDeliveries   = toShipmentItems(analyticsRepo.findRecentDeliveries(top));
        List<RecentShipmentItem> recentDelays        = toShipmentItems(analyticsRepo.findRecentDelays(top));
        List<RecentShipmentItem> recentAssignments   = toShipmentItems(analyticsRepo.findRecentAssignments(top));

        return AnalyticsActivityResponse.builder()
                .recentActivity(activityItems)
                .recentShipments(recentShipments)
                .recentDeliveries(recentDeliveries)
                .recentDelays(recentDelays)
                .recentAssignments(recentAssignments)
                .build();
    }

    /**
     * Builds the activity feed by loading the most recent notifications
     * across all users (newest-first) and converting them to ActivityItem DTOs.
     *
     * <p>The notifications table already records all business events
     * (SHIPMENT_CREATED, DRIVER_ASSIGNED, DELIVERED, DELAYED, CANCELLED…)
     * via {@code NotificationServiceImpl}. Reusing it avoids duplicating
     * event-tracking logic.</p>
     */
    private List<ActivityItem> buildActivityFromNotifications(int limit) {
        // Load all notifications ordered by createdAt DESC, take top `limit`
        List<Notification> notifications = notificationRepo
                .findAll(org.springframework.data.domain.PageRequest.of(
                        0, limit,
                        org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC,
                                "createdAt")))
                .getContent();

        return notifications.stream().map(n -> {
            String trackingNum = (n.getShipment() != null)
                    ? n.getShipment().getTrackingNumber() : null;
            Long shipmentId = (n.getShipment() != null)
                    ? n.getShipment().getId() : null;
            LocalDateTime occurredAt = (n.getCreatedAt() != null)
                    ? n.getCreatedAt().toLocalDateTime() : null;
            return ActivityItem.builder()
                    .eventType(n.getEventType() != null ? n.getEventType().name() : "UNKNOWN")
                    .title(n.getTitle())
                    .description(n.getMessage())
                    .trackingNumber(trackingNum)
                    .shipmentId(shipmentId)
                    .occurredAt(occurredAt)
                    .build();
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Converts JPQL Object[] rows [label, count] → LabelCount list. */
    private List<LabelCount> toLabelCounts(List<Object[]> rows) {
        return rows.stream()
                .map(r -> LabelCount.builder()
                        .label(r[0] != null ? r[0].toString() : "Unknown")
                        .count(((Number) r[1]).longValue())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Converts JPQL Object[] rows [year, month, count] → MonthlyCount list
     * with formatted month labels ("Aug 2026").
     * Missing months within the last {@code numMonths} window are zero-filled
     * so the chart always has a consistent number of data points.
     */
    private List<MonthlyCount> toMonthCountsPadded(List<Object[]> rows, int numMonths) {
        // Build an ordered map of the last numMonths months, all initialised to 0
        LinkedHashMap<String, Long> ordered = new LinkedHashMap<>();
        YearMonth cursor = YearMonth.now().minusMonths(numMonths - 1);
        for (int i = 0; i < numMonths; i++) {
            String label = cursor.atDay(1).format(MONTH_FMT);
            ordered.put(label, 0L);
            cursor = cursor.plusMonths(1);
        }
        // Merge actual DB counts into the ordered map
        for (Object[] r : rows) {
            int  year  = ((Number) r[0]).intValue();
            int  month = ((Number) r[1]).intValue();
            long count = ((Number) r[2]).longValue();
            String label = LocalDate.of(year, month, 1).format(MONTH_FMT);
            if (ordered.containsKey(label)) {
                ordered.put(label, count);
            }
        }
        return ordered.entrySet().stream()
                .map(e -> MonthlyCount.builder().month(e.getKey()).count(e.getValue()).build())
                .collect(Collectors.toList());
    }

    /** Maps a list of Shipment entities to lightweight RecentShipmentItem DTOs. */
    private List<RecentShipmentItem> toShipmentItems(List<Shipment> shipments) {
        return shipments.stream().map(s -> RecentShipmentItem.builder()
                .id(s.getId())
                .trackingNumber(s.getTrackingNumber())
                .senderName(s.getSenderName())
                .receiverName(s.getReceiverName())
                .status(s.getShipmentStatus() != null ? s.getShipmentStatus().name() : null)
                .originCity(s.getOriginAddress() != null ? s.getOriginAddress().getCity() : null)
                .destinationCity(s.getDestinationAddress() != null ? s.getDestinationAddress().getCity() : null)
                .assignedDriverName(s.getAssignedDriver() != null ? s.getAssignedDriver().getFullName() : null)
                .createdAt(s.getCreatedAt())
                .deliveredAt(s.getDeliveredAt())
                .updatedAt(s.getUpdatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    /** Rounds a Double to 1 decimal place. Returns 0.0 if null. */
    private double round1(Double v) {
        if (v == null) return 0.0;
        return Math.round(v * 10.0) / 10.0;
    }

    /** Rounds a Double to 2 decimal places. Returns null if input is null. */
    private Double round2(Double v) {
        if (v == null) return null;
        return Math.round(v * 100.0) / 100.0;
    }
}
