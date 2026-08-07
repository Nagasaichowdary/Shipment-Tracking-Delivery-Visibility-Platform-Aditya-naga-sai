package com.shiptrackpro.service;

import com.shiptrackpro.dto.ClientReportResponse;
import com.shiptrackpro.dto.ClientReportResponse.ClientStat;
import com.shiptrackpro.dto.AnalyticsChartsResponse.DriverPerformanceStat;
import com.shiptrackpro.dto.AnalyticsChartsResponse.LabelCount;
import com.shiptrackpro.dto.RouteReportResponse.RouteStat;
import com.shiptrackpro.dto.ShipmentResponse;
import com.shiptrackpro.dto.ShipmentReportResponse;
import com.shiptrackpro.dto.DriverReportResponse;
import com.shiptrackpro.dto.DeliverySummaryResponse;
import com.shiptrackpro.dto.RouteReportResponse;
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
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Export service for the Delivery Reports module.
 *
 * <p>Produces PDF (via existing Apache PDFBox dependency), CSV (pure Java),
 * and Excel (via new Apache POI dependency) byte arrays that are streamed
 * to the client by {@code ReportController}.</p>
 *
 * <p>All report data is fetched by {@link ReportService} before export —
 * this service is purely a rendering layer.</p>
 */
@Service
public class ReportExportService {

    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final float PAGE_W  = PDRectangle.A4.getWidth();
    private static final float MARGIN  = 40f;
    private static final float ROW_H   = 16f;

    private final ReportService reportService;

    public ReportExportService(ReportService reportService) {
        this.reportService = reportService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public dispatch
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Dispatches to the correct format renderer.
     *
     * @param reportType "summary" | "shipments" | "drivers" | "clients" | "routes"
     * @param format     "pdf" | "csv" | "excel"
     * @param period     named period
     * @param from       optional range start
     * @param to         optional range end
     */
    public byte[] export(String reportType, String format, String period,
                         LocalDate from, LocalDate to) throws IOException {
        return switch (format == null ? "csv" : format.toLowerCase()) {
            case "pdf"   -> exportPdf(reportType, period, from, to);
            case "excel" -> exportExcel(reportType, period, from, to);
            default      -> exportCsv(reportType, period, from, to);
        };
    }

    public String contentType(String format) {
        return switch (format == null ? "csv" : format.toLowerCase()) {
            case "pdf"   -> "application/pdf";
            case "excel" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default      -> "text/csv; charset=UTF-8";
        };
    }

    public String filename(String reportType, String format) {
        String ext = switch (format == null ? "csv" : format.toLowerCase()) {
            case "pdf"   -> "pdf";
            case "excel" -> "xlsx";
            default      -> "csv";
        };
        String tag = LocalDate.now().format(FILE_DATE);
        return reportType + "-report-" + tag + "." + ext;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CSV export (pure Java — no extra dependency)
    // ─────────────────────────────────────────────────────────────────────────

    private byte[] exportCsv(String reportType, String period, LocalDate from, LocalDate to) {
        StringBuilder sb = new StringBuilder();
        switch (reportType == null ? "summary" : reportType.toLowerCase()) {
            case "shipments" -> {
                ShipmentReportResponse r = reportService.getShipmentReport(period, from, to, null, 0, 10000);
                sb.append("ID,Tracking Number,Sender,Receiver,Status,Type,Weight (kg),Origin,Destination,Driver,Created At\n");
                for (ShipmentResponse s : r.getShipments()) {
                    sb.append(csvRow(
                            str(s.getId()), s.getTrackingNumber(), s.getSenderName(), s.getReceiverName(),
                            str(s.getShipmentStatus()), s.getShipmentType(), str(s.getPackageWeight()),
                            s.getOriginAddress() != null ? s.getOriginAddress().getCity() : "",
                            s.getDestinationAddress() != null ? s.getDestinationAddress().getCity() : "",
                            s.getAssignedDriverName() != null ? s.getAssignedDriverName() : "",
                            str(s.getCreatedAt())
                    ));
                }
            }
            case "drivers" -> {
                DriverReportResponse r = reportService.getDriverReport(period, 50);
                sb.append("Driver,Total Assigned,Delivered,Failed,Rejected,Completion Rate (%),Avg Delivery Hours\n");
                for (DriverPerformanceStat d : r.getDrivers()) {
                    sb.append(csvRow(
                            d.getDriverName(), str(d.getTotalAssigned()), str(d.getDelivered()),
                            str(d.getFailedDeliveries()), str(d.getRejectedShipments()),
                            str(d.getCompletionRate()), str(d.getAvgDeliveryHours())
                    ));
                }
            }
            case "clients" -> {
                ClientReportResponse r = reportService.getClientReport(period, from, to);
                sb.append("Client Name,Company,Business Type,Total Shipments,Delivered,Delivery Rate (%),Last Shipment\n");
                for (ClientStat c : r.getClients()) {
                    sb.append(csvRow(
                            c.getClientName(), str(c.getCompanyName()), str(c.getBusinessType()),
                            str(c.getTotalShipments()), str(c.getDeliveredShipments()),
                            str(c.getDeliveryRate()), str(c.getLastShipmentDate())
                    ));
                }
            }
            case "routes" -> {
                RouteReportResponse r = reportService.getRouteReport(period, 20);
                sb.append("Origin,Destination,Total Shipments,Delivered,Delivery Rate (%),Avg Hours\n");
                for (RouteStat rt : r.getTopRoutes()) {
                    sb.append(csvRow(
                            rt.getOrigin(), rt.getDestination(),
                            str(rt.getTotalShipments()), str(rt.getDeliveredShipments()),
                            str(rt.getDeliveryRate()), str(rt.getAvgDeliveryHours())
                    ));
                }
            }
            default -> { // summary
                DeliverySummaryResponse r = reportService.getSummary(period, from, to);
                sb.append("Metric,Value\n");
                if (r.getOverview() != null) {
                    sb.append(csvRow("Total Shipments",       str(r.getOverview().getTotal())));
                    sb.append(csvRow("Delivered",             str(r.getOverview().getDelivered())));
                    sb.append(csvRow("Cancelled",             str(r.getOverview().getCancelled())));
                    sb.append(csvRow("Failed Delivery",       str(r.getOverview().getFailedDelivery())));
                    sb.append(csvRow("Delivery Success Rate", r.getOverview().getDeliverySuccessRate() + "%"));
                    sb.append(csvRow("Avg Delivery Hours",   str(r.getOverview().getAvgDeliveryHours())));
                    sb.append(csvRow("Delay Rate",           r.getOverview().getDelayRate() + "%"));
                }
            }
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Excel export (Apache POI)
    // ─────────────────────────────────────────────────────────────────────────

    private byte[] exportExcel(String reportType, String period, LocalDate from, LocalDate to) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            Font headerFont = wb.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            switch (reportType == null ? "summary" : reportType.toLowerCase()) {
                case "shipments" -> {
                    Sheet sheet = wb.createSheet("Shipment Report");
                    writeHeaderRow(sheet, headerStyle, "ID", "Tracking Number", "Sender", "Receiver",
                            "Status", "Type", "Weight (kg)", "Origin", "Destination", "Driver", "Created At");
                    ShipmentReportResponse r = reportService.getShipmentReport(period, from, to, null, 0, 10000);
                    int rowIdx = 1;
                    for (ShipmentResponse s : r.getShipments()) {
                        Row row = sheet.createRow(rowIdx++);
                        fillRow(row, str(s.getId()), s.getTrackingNumber(), s.getSenderName(), s.getReceiverName(),
                                str(s.getShipmentStatus()), s.getShipmentType(), str(s.getPackageWeight()),
                                s.getOriginAddress() != null ? s.getOriginAddress().getCity() : "",
                                s.getDestinationAddress() != null ? s.getDestinationAddress().getCity() : "",
                                s.getAssignedDriverName() != null ? s.getAssignedDriverName() : "",
                                str(s.getCreatedAt()));
                    }
                    autosize(sheet, 11);
                }
                case "drivers" -> {
                    Sheet sheet = wb.createSheet("Driver Performance");
                    writeHeaderRow(sheet, headerStyle, "Driver", "Total Assigned", "Delivered",
                            "Failed", "Rejected", "Completion Rate (%)", "Avg Delivery Hours");
                    DriverReportResponse r = reportService.getDriverReport(period, 50);
                    int rowIdx = 1;
                    for (DriverPerformanceStat d : r.getDrivers()) {
                        Row row = sheet.createRow(rowIdx++);
                        fillRow(row, d.getDriverName(), str(d.getTotalAssigned()), str(d.getDelivered()),
                                str(d.getFailedDeliveries()), str(d.getRejectedShipments()),
                                str(d.getCompletionRate()), str(d.getAvgDeliveryHours()));
                    }
                    autosize(sheet, 7);
                }
                case "clients" -> {
                    Sheet sheet = wb.createSheet("Business Clients");
                    writeHeaderRow(sheet, headerStyle, "Client Name", "Company", "Business Type",
                            "Total Shipments", "Delivered", "Delivery Rate (%)", "Last Shipment");
                    ClientReportResponse r = reportService.getClientReport(period, from, to);
                    int rowIdx = 1;
                    for (ClientStat c : r.getClients()) {
                        Row row = sheet.createRow(rowIdx++);
                        fillRow(row, c.getClientName(), str(c.getCompanyName()), str(c.getBusinessType()),
                                str(c.getTotalShipments()), str(c.getDeliveredShipments()),
                                str(c.getDeliveryRate()), str(c.getLastShipmentDate()));
                    }
                    autosize(sheet, 7);
                }
                case "routes" -> {
                    Sheet sheet = wb.createSheet("Route Performance");
                    writeHeaderRow(sheet, headerStyle, "Origin", "Destination",
                            "Total Shipments", "Delivered", "Delivery Rate (%)", "Avg Hours");
                    RouteReportResponse r = reportService.getRouteReport(period, 20);
                    int rowIdx = 1;
                    for (RouteStat rt : r.getTopRoutes()) {
                        Row row = sheet.createRow(rowIdx++);
                        fillRow(row, rt.getOrigin(), rt.getDestination(),
                                str(rt.getTotalShipments()), str(rt.getDeliveredShipments()),
                                str(rt.getDeliveryRate()), str(rt.getAvgDeliveryHours()));
                    }
                    autosize(sheet, 6);
                }
                default -> { // summary
                    Sheet sheet = wb.createSheet("Delivery Summary");
                    writeHeaderRow(sheet, headerStyle, "Metric", "Value");
                    DeliverySummaryResponse r = reportService.getSummary(period, from, to);
                    int rowIdx = 1;
                    if (r.getOverview() != null) {
                        fillRow(sheet.createRow(rowIdx++), "Total Shipments",       str(r.getOverview().getTotal()));
                        fillRow(sheet.createRow(rowIdx++), "Delivered",             str(r.getOverview().getDelivered()));
                        fillRow(sheet.createRow(rowIdx++), "Cancelled",             str(r.getOverview().getCancelled()));
                        fillRow(sheet.createRow(rowIdx++), "Failed Delivery",       str(r.getOverview().getFailedDelivery()));
                        fillRow(sheet.createRow(rowIdx++), "Success Rate (%)",      str(r.getOverview().getDeliverySuccessRate()));
                        fillRow(sheet.createRow(rowIdx++), "Avg Delivery Hours",    str(r.getOverview().getAvgDeliveryHours()));
                        fillRow(sheet.createRow(rowIdx++), "Delay Rate (%)",        str(r.getOverview().getDelayRate()));
                    }
                    autosize(sheet, 2);
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PDF export (Apache PDFBox — existing dependency)
    // ─────────────────────────────────────────────────────────────────────────

    private byte[] exportPdf(String reportType, String period, LocalDate from, LocalDate to) throws IOException {
        // Fetch data first
        List<String[]> rows;
        String[] headers;
        String title;

        switch (reportType == null ? "summary" : reportType.toLowerCase()) {
            case "shipments" -> {
                title = "Shipment Report";
                headers = new String[]{"Tracking #", "Sender", "Receiver", "Status", "Origin", "Destination"};
                ShipmentReportResponse r = reportService.getShipmentReport(period, from, to, null, 0, 1000);
                rows = r.getShipments().stream().map(s -> new String[]{
                        s.getTrackingNumber(), s.getSenderName(), s.getReceiverName(),
                        str(s.getShipmentStatus()),
                        s.getOriginAddress() != null ? s.getOriginAddress().getCity() : "",
                        s.getDestinationAddress() != null ? s.getDestinationAddress().getCity() : ""
                }).toList();
            }
            case "drivers" -> {
                title = "Driver Performance Report";
                headers = new String[]{"Driver", "Assigned", "Delivered", "Failed", "Rate (%)"};
                DriverReportResponse r = reportService.getDriverReport(period, 50);
                rows = r.getDrivers().stream().map(d -> new String[]{
                        d.getDriverName(), str(d.getTotalAssigned()), str(d.getDelivered()),
                        str(d.getFailedDeliveries()), str(d.getCompletionRate())
                }).toList();
            }
            case "clients" -> {
                title = "Business Client Report";
                headers = new String[]{"Client", "Company", "Total", "Delivered", "Rate (%)"};
                ClientReportResponse r = reportService.getClientReport(period, from, to);
                rows = r.getClients().stream().map(c -> new String[]{
                        c.getClientName(), str(c.getCompanyName()),
                        str(c.getTotalShipments()), str(c.getDeliveredShipments()), str(c.getDeliveryRate())
                }).toList();
            }
            case "routes" -> {
                title = "Route Performance Report";
                headers = new String[]{"Origin", "Destination", "Total", "Delivered", "Rate (%)"};
                RouteReportResponse r = reportService.getRouteReport(period, 20);
                rows = r.getTopRoutes().stream().map(rt -> new String[]{
                        rt.getOrigin(), rt.getDestination(),
                        str(rt.getTotalShipments()), str(rt.getDeliveredShipments()), str(rt.getDeliveryRate())
                }).toList();
            }
            default -> { // summary
                title = "Delivery Summary Report";
                headers = new String[]{"Metric", "Value"};
                DeliverySummaryResponse r = reportService.getSummary(period, from, to);
                rows = r.getOverview() == null ? List.of() : List.of(
                        new String[]{"Total Shipments",     str(r.getOverview().getTotal())},
                        new String[]{"Delivered",           str(r.getOverview().getDelivered())},
                        new String[]{"Cancelled",           str(r.getOverview().getCancelled())},
                        new String[]{"Failed Delivery",     str(r.getOverview().getFailedDelivery())},
                        new String[]{"Success Rate",        r.getOverview().getDeliverySuccessRate() + "%"},
                        new String[]{"Avg Delivery Hours",  str(r.getOverview().getAvgDeliveryHours())},
                        new String[]{"Delay Rate",          r.getOverview().getDelayRate() + "%"}
                );
            }
        }

        return renderPdf(title, headers, rows);
    }

    private byte[] renderPdf(String title, String[] headers, List<String[]> rows) throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDType1Font bold    = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float colW  = (PAGE_W - 2 * MARGIN) / headers.length;
            float y     = 750f;

            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(doc, page);

            // Title
            cs.setFont(bold, 16);
            cs.beginText();
            cs.newLineAtOffset(MARGIN, y);
            cs.showText(title);
            cs.endText();
            y -= 28;

            // Generated line
            cs.setFont(regular, 9);
            cs.beginText();
            cs.newLineAtOffset(MARGIN, y);
            cs.showText("Generated: " + LocalDate.now());
            cs.endText();
            y -= 20;

            // Header row
            cs.setFont(bold, 9);
            for (int i = 0; i < headers.length; i++) {
                cs.beginText();
                cs.newLineAtOffset(MARGIN + i * colW, y);
                cs.showText(truncate(headers[i], 18));
                cs.endText();
            }
            y -= ROW_H;

            // Data rows — paginate automatically
            cs.setFont(regular, 8);
            for (String[] row : rows) {
                if (y < 50) {
                    cs.close();
                    page = new PDPage(PDRectangle.A4);
                    doc.addPage(page);
                    cs = new PDPageContentStream(doc, page);
                    cs.setFont(regular, 8);
                    y = 750f;
                }
                for (int i = 0; i < row.length; i++) {
                    cs.beginText();
                    cs.newLineAtOffset(MARGIN + i * colW, y);
                    cs.showText(truncate(row[i], 20));
                    cs.endText();
                }
                y -= ROW_H;
            }
            cs.close();
            doc.save(out);
            return out.toByteArray();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utility helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String csvRow(String... cols) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cols.length; i++) {
            if (i > 0) sb.append(',');
            String v = cols[i] == null ? "" : cols[i].replace("\"", "\"\"");
            if (v.contains(",") || v.contains("\"") || v.contains("\n")) sb.append('"').append(v).append('"');
            else sb.append(v);
        }
        sb.append('\n');
        return sb.toString();
    }

    private void writeHeaderRow(Sheet sheet, CellStyle style, String... headers) {
        Row row = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(style);
        }
    }

    private void fillRow(Row row, String... values) {
        for (int i = 0; i < values.length; i++) {
            row.createCell(i).setCellValue(values[i] == null ? "" : values[i]);
        }
    }

    private void autosize(Sheet sheet, int cols) {
        for (int i = 0; i < cols; i++) sheet.autoSizeColumn(i);
    }

    private String str(Object o) {
        return o == null ? "" : o.toString();
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max - 1) + "…" : s;
    }
}
