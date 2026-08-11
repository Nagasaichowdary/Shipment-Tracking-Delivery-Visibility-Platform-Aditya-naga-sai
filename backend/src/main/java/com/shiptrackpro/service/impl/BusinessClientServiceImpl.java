package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.AddressResponse;
import com.shiptrackpro.dto.AnalyticsChartsResponse.LabelCount;
import com.shiptrackpro.dto.AnalyticsChartsResponse.MonthlyCount;
import com.shiptrackpro.dto.BusinessClientAnalyticsResponse;
import com.shiptrackpro.dto.MyShipmentReportResponse;
import com.shiptrackpro.dto.ShipmentResponse;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.enums.ShipmentStatus;
import com.shiptrackpro.repository.AnalyticsRepository;
import com.shiptrackpro.repository.ShipmentRepository;
import com.shiptrackpro.service.BusinessClientService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link BusinessClientService}.
 *
 * <h3>Security design</h3>
 * <p>Every method receives a {@code userId} extracted from the Spring Security
 * JWT principal by {@code BusinessClientController}. The HTTP layer never
 * exposes a userId parameter — all data scoping is enforced here using that
 * server-side identity.</p>
 *
 * <h3>Query reuse</h3>
 * <ul>
 *   <li>{@code AnalyticsRepository.findByCreatedByAndDateRange} — reused as-is
 *       for analytics KPI computation and export.</li>
 *   <li>{@code ShipmentRepository.findByCreatedByUserIdAndDateRangeAndStatus} —
 *       new user-scoped paginated query for the reports table.</li>
 *   <li>{@code AnalyticsRepository.monthlyShipmentTrendForUser} — new
 *       user-scoped monthly trend query.</li>
 *   <li>{@code AnalyticsRepository.topDestinationCitiesForUser} — new
 *       user-scoped destinations query.</li>
 * </ul>
 *
 * <h3>Mapper</h3>
 * <p>Shipment → ShipmentResponse mapping is inlined here (same logic as
 * {@code ReportServiceImpl.toShipmentResponse}) to avoid coupling to that
 * service.</p>
 */
@Service
@Transactional(readOnly = true)
public class BusinessClientServiceImpl implements BusinessClientService {

    private static final DateTimeFormatter MONTH_FMT  = DateTimeFormatter.ofPattern("MMM yyyy");
    private static final DateTimeFormatter FILE_DATE   = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final float PAGE_W = PDRectangle.A4.getWidth();
    private static final float MARGIN = 40f;
    private static final float ROW_H  = 15f;

    private final AnalyticsRepository analyticsRepo;
    private final ShipmentRepository  shipmentRepo;

    public BusinessClientServiceImpl(AnalyticsRepository analyticsRepo,
                                     ShipmentRepository  shipmentRepo) {
        this.analyticsRepo = analyticsRepo;
        this.shipmentRepo  = shipmentRepo;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Personal Analytics
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public BusinessClientAnalyticsResponse getMyAnalytics(Long userId, String period,
                                                           LocalDate from, LocalDate to) {
        LocalDateTime[] window   = resolveWindow(period, from, to);
        LocalDateTime   winFrom  = window[0];
        LocalDateTime   winTo    = window[1];

        // Load all shipments for this user in the window (reuse existing query)
        List<Shipment> shipments = analyticsRepo.findByCreatedByAndDateRange(userId, winFrom, winTo);

        // ── KPI computation ──────────────────────────────────────────────────
        long total         = shipments.size();
        long delivered     = count(shipments, ShipmentStatus.DELIVERED);
        long inTransit     = count(shipments, ShipmentStatus.IN_TRANSIT);
        long outForDel     = count(shipments, ShipmentStatus.OUT_FOR_DELIVERY);
        long delayed       = count(shipments, ShipmentStatus.DELAYED);
        long failed        = count(shipments, ShipmentStatus.FAILED_DELIVERY);
        long cancelled     = count(shipments, ShipmentStatus.CANCELLED);
        double successRate = total > 0 ? round1((double) delivered / total * 100.0) : 0.0;

        // Average delivery hours (creation → delivered_at)
        Double avgDelHours = shipments.stream()
                .filter(s -> s.getDeliveredAt() != null && s.getCreatedAt() != null)
                .mapToDouble(s -> Duration.between(s.getCreatedAt(), s.getDeliveredAt()).toMinutes() / 60.0)
                .average()
                .stream().boxed().findFirst().orElse(null);

        // Average predicted delay — not yet tracked per-shipment; reserved for future use
        Double avgDelayMin = null;

        // ── Status distribution chart ────────────────────────────────────────
        List<LabelCount> statusDist = shipments.stream()
                .filter(s -> s.getShipmentStatus() != null)
                .collect(Collectors.groupingBy(s -> s.getShipmentStatus().name(), Collectors.counting()))
                .entrySet().stream()
                .map(e -> LabelCount.builder().label(e.getKey()).count(e.getValue()).build())
                .sorted((a, b) -> Long.compare(b.getCount(), a.getCount()))
                .collect(Collectors.toList());

        // ── Monthly trend (last 6 months, padded with zeros) ─────────────────
        LocalDateTime trendSince = LocalDate.now().minusMonths(5).withDayOfMonth(1).atStartOfDay();
        List<Object[]> trendRows = analyticsRepo.monthlyShipmentTrendForUser(userId, trendSince);
        List<MonthlyCount> monthlyTrend = padMonthly(trendRows, 6);

        // ── Top destinations ─────────────────────────────────────────────────
        Pageable top5 = PageRequest.of(0, 5);
        List<Object[]> destRows = analyticsRepo.topDestinationCitiesForUser(userId, top5);
        List<LabelCount> topDest = destRows.stream()
                .map(r -> LabelCount.builder()
                        .label(String.valueOf(r[0]))
                        .count(((Number) r[1]).longValue())
                        .build())
                .collect(Collectors.toList());

        return BusinessClientAnalyticsResponse.builder()
                .totalShipments(total)
                .delivered(delivered)
                .inTransit(inTransit)
                .outForDelivery(outForDel)
                .delayed(delayed)
                .failed(failed)
                .cancelled(cancelled)
                .successRate(successRate)
                .avgDeliveryHours(avgDelHours != null ? round1(avgDelHours) : null)
                .avgDelayMinutes(avgDelayMin != null ? round1(avgDelayMin) : null)
                .statusDistribution(statusDist)
                .monthlyShipmentTrend(monthlyTrend)
                .topDestinations(topDest)
                .periodLabel(periodLabel(period, from, to))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Personal Report (paginated)
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public MyShipmentReportResponse getMyReport(Long userId, String period,
                                                 LocalDate from, LocalDate to,
                                                 String status, int page, int size) {
        LocalDateTime[] window  = resolveWindow(period, from, to);
        LocalDateTime   winFrom = window[0];
        LocalDateTime   winTo   = window[1];

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(100, size));
        Pageable pageable = PageRequest.of(safePage, safeSize);

        // Resolve optional status filter
        ShipmentStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try { statusFilter = ShipmentStatus.valueOf(status.trim().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        Page<Shipment> shipmentPage = shipmentRepo.findByCreatedByUserIdAndDateRangeAndStatus(
                userId, statusFilter, winFrom, winTo, pageable);

        List<ShipmentResponse> rows = shipmentPage.getContent().stream()
                .map(this::toShipmentResponse)
                .collect(Collectors.toList());

        // Summary KPIs — computed over all matching (unpaginated) shipments
        List<Shipment> allForWindow = analyticsRepo.findByCreatedByAndDateRange(userId, winFrom, winTo);
        final ShipmentStatus finalSf = statusFilter;
        List<Shipment> filtered = (finalSf == null) ? allForWindow
                : allForWindow.stream()
                        .filter(s -> s.getShipmentStatus() == finalSf)
                        .collect(Collectors.toList());

        long total       = filtered.size();
        long dlv         = count(filtered, ShipmentStatus.DELIVERED);
        long inT         = count(filtered, ShipmentStatus.IN_TRANSIT);
        long dly         = count(filtered, ShipmentStatus.DELAYED);
        long fail        = count(filtered, ShipmentStatus.FAILED_DELIVERY);
        long cancel      = count(filtered, ShipmentStatus.CANCELLED);
        double rate      = total > 0 ? round1((double) dlv / total * 100.0) : 0.0;
        Double avgHours  = filtered.stream()
                .filter(s -> s.getDeliveredAt() != null && s.getCreatedAt() != null)
                .mapToDouble(s -> Duration.between(s.getCreatedAt(), s.getDeliveredAt()).toMinutes() / 60.0)
                .average().stream().boxed().findFirst().orElse(null);

        return MyShipmentReportResponse.builder()
                .shipments(rows)
                .totalRecords(shipmentPage.getTotalElements())
                .page(shipmentPage.getNumber())
                .size(shipmentPage.getSize())
                .totalPages(shipmentPage.getTotalPages())
                .totalShipments(total)
                .delivered(dlv)
                .inTransit(inT)
                .delayed(dly)
                .failed(fail)
                .cancelled(cancel)
                .successRate(rate)
                .avgDeliveryHours(avgHours != null ? round1(avgHours) : null)
                .periodLabel(periodLabel(period, from, to))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Export
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public byte[] exportMyReport(Long userId, String format, String period,
                                  LocalDate from, LocalDate to, String status) throws IOException {
        LocalDateTime[] window  = resolveWindow(period, from, to);
        List<Shipment> all = analyticsRepo.findByCreatedByAndDateRange(userId, window[0], window[1]);

        ShipmentStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try { statusFilter = ShipmentStatus.valueOf(status.trim().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }
        final ShipmentStatus sf = statusFilter;
        List<ShipmentResponse> rows = all.stream()
                .filter(s -> sf == null || s.getShipmentStatus() == sf)
                .map(this::toShipmentResponse)
                .collect(Collectors.toList());

        String fmt = format == null ? "csv" : format.toLowerCase();
        return switch (fmt) {
            case "pdf"   -> exportPdf(rows);
            case "excel" -> exportExcel(rows);
            default      -> exportCsv(rows);
        };
    }

    @Override
    public String exportContentType(String format) {
        return switch (format == null ? "csv" : format.toLowerCase()) {
            case "pdf"   -> "application/pdf";
            case "excel" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default      -> "text/csv; charset=UTF-8";
        };
    }

    @Override
    public String exportFilename(String format) {
        String ext = switch (format == null ? "csv" : format.toLowerCase()) {
            case "pdf"   -> "pdf";
            case "excel" -> "xlsx";
            default      -> "csv";
        };
        return "my-shipment-report-" + LocalDate.now().format(FILE_DATE) + "." + ext;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Export renderers
    // ─────────────────────────────────────────────────────────────────────────

    private static final String[] HEADERS = {
            "Tracking Number", "Receiver", "Origin", "Destination",
            "Status", "Created Date", "Delivered Date", "Delivery Time (hrs)"
    };

    private byte[] exportCsv(List<ShipmentResponse> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.join(",", HEADERS)).append("\n");
        for (ShipmentResponse r : rows) {
            sb.append(csv(r.getTrackingNumber())).append(",")
              .append(csv(r.getReceiverName())).append(",")
              .append(csv(r.getOriginAddress() != null ? r.getOriginAddress().getCity() : "")).append(",")
              .append(csv(r.getDestinationAddress() != null ? r.getDestinationAddress().getCity() : "")).append(",")
              .append(csv(r.getShipmentStatus() != null ? r.getShipmentStatus().name() : "")).append(",")
              .append(csv(r.getCreatedAt() != null ? r.getCreatedAt().toString() : "")).append(",")
              .append(csv(r.getDeliveredAt() != null ? r.getDeliveredAt().toString() : "")).append(",")
              .append(deliveryHours(r))
              .append("\n");
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private byte[] exportExcel(List<ShipmentResponse> rows) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("My Shipments");

            // Header style
            CellStyle hdrStyle = wb.createCellStyle();
            hdrStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            hdrStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            hdrStyle.setBorderBottom(BorderStyle.THIN);
            Font hdrFont = wb.createFont();
            hdrFont.setBold(true);
            hdrFont.setColor(IndexedColors.WHITE.getIndex());
            hdrStyle.setFont(hdrFont);

            Row hdr = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell c = hdr.createCell(i);
                c.setCellValue(HEADERS[i]);
                c.setCellStyle(hdrStyle);
                sheet.setColumnWidth(i, 5000);
            }

            int rowIdx = 1;
            for (ShipmentResponse r : rows) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(safe(r.getTrackingNumber()));
                row.createCell(1).setCellValue(safe(r.getReceiverName()));
                row.createCell(2).setCellValue(r.getOriginAddress() != null ? safe(r.getOriginAddress().getCity()) : "");
                row.createCell(3).setCellValue(r.getDestinationAddress() != null ? safe(r.getDestinationAddress().getCity()) : "");
                row.createCell(4).setCellValue(r.getShipmentStatus() != null ? r.getShipmentStatus().name() : "");
                row.createCell(5).setCellValue(r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
                row.createCell(6).setCellValue(r.getDeliveredAt() != null ? r.getDeliveredAt().toString() : "");
                row.createCell(7).setCellValue(deliveryHours(r));
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private byte[] exportPdf(List<ShipmentResponse> rows) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            PDType1Font bold  = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font plain = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float y = page.getMediaBox().getHeight() - MARGIN;

                // Title
                cs.setFont(bold, 14);
                cs.beginText();
                cs.newLineAtOffset(MARGIN, y);
                cs.showText("My Shipment Report — " + LocalDate.now());
                cs.endText();
                y -= 24;

                // Column widths
                float[] colW = {100, 80, 70, 70, 90, 80, 80, 70};
                String[] hdr = HEADERS;

                // Header row
                cs.setFont(bold, 8);
                float x = MARGIN;
                cs.setNonStrokingColor(0.2f, 0.3f, 0.6f);
                for (int i = 0; i < hdr.length; i++) {
                    cs.beginText();
                    cs.newLineAtOffset(x, y);
                    cs.showText(truncate(hdr[i], 15));
                    cs.endText();
                    x += colW[i];
                }
                cs.setNonStrokingColor(0f, 0f, 0f);
                y -= ROW_H;

                // Data rows
                cs.setFont(plain, 7);
                for (ShipmentResponse r : rows) {
                    if (y < MARGIN + ROW_H) break; // no multi-page for simplicity
                    x = MARGIN;
                    String[] cells = {
                        safe(r.getTrackingNumber()),
                        safe(r.getReceiverName()),
                        r.getOriginAddress() != null ? safe(r.getOriginAddress().getCity()) : "",
                        r.getDestinationAddress() != null ? safe(r.getDestinationAddress().getCity()) : "",
                        r.getShipmentStatus() != null ? r.getShipmentStatus().name() : "",
                        r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate().toString() : "",
                        r.getDeliveredAt() != null ? r.getDeliveredAt().toLocalDate().toString() : "",
                        deliveryHours(r)
                    };
                    for (int i = 0; i < cells.length; i++) {
                        cs.beginText();
                        cs.newLineAtOffset(x, y);
                        cs.showText(truncate(cells[i], 18));
                        cs.endText();
                        x += colW[i];
                    }
                    y -= ROW_H;
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Shipment → ShipmentResponse mapper (mirrors ReportServiceImpl, no coupling)
    // ─────────────────────────────────────────────────────────────────────────

    private ShipmentResponse toShipmentResponse(Shipment s) {
        AddressResponse origin = s.getOriginAddress() == null ? null :
                AddressResponse.builder()
                        .id(s.getOriginAddress().getId())
                        .line1(s.getOriginAddress().getLine1())
                        .line2(s.getOriginAddress().getLine2())
                        .city(s.getOriginAddress().getCity())
                        .state(s.getOriginAddress().getState())
                        .postalCode(s.getOriginAddress().getPostalCode())
                        .country(s.getOriginAddress().getCountry())
                        .build();
        AddressResponse dest = s.getDestinationAddress() == null ? null :
                AddressResponse.builder()
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

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private LocalDateTime[] resolveWindow(String period, LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return new LocalDateTime[]{from.atStartOfDay(), to.plusDays(1).atStartOfDay()};
        }
        LocalDate today = LocalDate.now();
        LocalDate start = switch (period == null ? "month" : period.toLowerCase()) {
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

    private long count(List<Shipment> list, ShipmentStatus status) {
        return list.stream().filter(s -> s.getShipmentStatus() == status).count();
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    /**
     * Builds a zero-padded 6-month monthly trend list.
     * Same logic as {@code AnalyticsServiceImpl.toMonthCountsPadded}.
     */
    private List<MonthlyCount> padMonthly(List<Object[]> rows, int numMonths) {
        LinkedHashMap<String, Long> ordered = new LinkedHashMap<>();
        YearMonth cursor = YearMonth.now().minusMonths(numMonths - 1);
        for (int i = 0; i < numMonths; i++) {
            ordered.put(cursor.atDay(1).format(MONTH_FMT), 0L);
            cursor = cursor.plusMonths(1);
        }
        for (Object[] r : rows) {
            int    year  = ((Number) r[0]).intValue();
            int    month = ((Number) r[1]).intValue();
            long   count = ((Number) r[2]).longValue();
            String label = LocalDate.of(year, month, 1).format(MONTH_FMT);
            if (ordered.containsKey(label)) ordered.put(label, count);
        }
        return ordered.entrySet().stream()
                .map(e -> MonthlyCount.builder().month(e.getKey()).count(e.getValue()).build())
                .collect(Collectors.toList());
    }

    private String csv(String v) {
        if (v == null) return "";
        if (v.contains(",") || v.contains("\"") || v.contains("\n"))
            return "\"" + v.replace("\"", "\"\"") + "\"";
        return v;
    }

    private String safe(String v) { return v != null ? v : ""; }

    private String truncate(String s, int max) {
        if (s == null || s.length() <= max) return safe(s);
        return s.substring(0, max - 1) + "…";
    }

    private String deliveryHours(ShipmentResponse r) {
        if (r.getDeliveredAt() == null || r.getCreatedAt() == null) return "";
        double hrs = Duration.between(r.getCreatedAt(), r.getDeliveredAt()).toMinutes() / 60.0;
        return String.format("%.1f", hrs);
    }
}
