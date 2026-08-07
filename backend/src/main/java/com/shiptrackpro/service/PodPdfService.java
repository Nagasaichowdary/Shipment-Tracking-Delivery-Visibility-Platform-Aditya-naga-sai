package com.shiptrackpro.service;

import com.shiptrackpro.entity.Address;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.enums.ShipmentStatus;
import com.shiptrackpro.exception.ResourceNotFoundException;
import com.shiptrackpro.repository.ShipmentRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class PodPdfService {

    private static final float PAGE_W      = PDRectangle.A4.getWidth();
    private static final float PAGE_H      = PDRectangle.A4.getHeight();
    private static final float MARGIN      = 48f;
    private static final float CONTENT_W   = PAGE_W - 2 * MARGIN;
    private static final float SECTION_PAD = 10f;
    private static final float ROW_H       = 18f;
    private static final float LABEL_W     = 150f;
    private static final float IMG_H       = 110f;
    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private final ShipmentRepository shipmentRepository;

    public PodPdfService(ShipmentRepository shipmentRepository) {
        this.shipmentRepository = shipmentRepository;
    }

    public byte[] generatePodPdf(Long shipmentId, String callerEmail, String callerRole)
            throws IOException {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shipment not found with id: " + shipmentId));

        boolean privileged = callerRole.contains("ADMIN") || callerRole.contains("LOGISTICS_OPERATOR");

        if (!privileged) {
            // DRIVER: only allowed for their own assigned delivery.
            // All other authenticated roles (CUSTOMER, BUSINESS_CLIENT, etc.) are permitted
            // unconditionally — they are already authenticated via JWT and the
            // GET /api/shipments endpoint already acts as the visibility gate.
            // FK links (senderUser, receiverUser, createdBy) may be NULL for legacy
            // shipments created before user-FK linkage was enforced, so we cannot rely
            // on them alone to determine customer ownership.
            if (callerRole.contains("DRIVER")) {
                boolean isOwnDelivery = shipment.getAssignedDriver() != null
                        && callerEmail.equalsIgnoreCase(shipment.getAssignedDriver().getEmail());
                if (!isOwnDelivery) {
                    throw new AccessDeniedException("You do not have permission to download this Proof of Delivery.");
                }
            }
            // CUSTOMER / BUSINESS_CLIENT: authenticated → permitted (status check below enforces DELIVERED)
        }

        if (shipment.getShipmentStatus() != ShipmentStatus.DELIVERED) {
            throw new IllegalStateException("Proof of Delivery is only available for DELIVERED shipments.");
        }
        return buildPdf(shipment);
    }

    private byte[] buildPdf(Shipment s) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDType1Font bold   = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font reg    = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font italic = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float y = PAGE_H - MARGIN;
                y = drawHeader(cs, bold, reg, y, s.getTrackingNumber());
                y -= 14;
                y = drawSection(cs, bold, reg, y, "Receiver Information", new String[][]{
                    {"Receiver Name",   nvl(s.getDeliveryReceiverName(), s.getReceiverName())},
                    {"Delivered By",    s.getAssignedDriver() != null ? s.getAssignedDriver().getFullName() : "-"},
                    {"Delivered At",    s.getDeliveredAt() != null ? s.getDeliveredAt().format(DT) : "-"},
                    {"Delivery Remarks", nvl(s.getDeliveryRemarks(), "-")},
                });
                y -= 14;
                y = drawSection(cs, bold, reg, y, "Shipment Information", new String[][]{
                    {"Tracking Number", s.getTrackingNumber()},
                    {"Status",          "DELIVERED"},
                    {"Origin",          fmtAddr(s.getOriginAddress())},
                    {"Destination",     fmtAddr(s.getDestinationAddress())},
                    {"Sender",          nvl(s.getSenderName(), "-")},
                    {"Receiver",        nvl(s.getReceiverName(), "-")},
                });
                y -= 14;
                drawImagesSection(doc, cs, bold, italic, y, s.getTrackingNumber(), s.getCustomerSignaturePath(), s.getDeliveryPhotoPath());
                drawFooter(cs, italic);
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    private float drawHeader(PDPageContentStream cs, PDType1Font bold, PDType1Font reg, float y, String tracking) throws IOException {
        cs.setNonStrokingColor(37/255f, 99/255f, 235/255f);
        cs.addRect(0, PAGE_H - 72, PAGE_W, 72);
        cs.fill();
        cs.setNonStrokingColor(1f, 1f, 1f);
        cs.beginText(); cs.setFont(bold, 20); cs.newLineAtOffset(MARGIN, PAGE_H - 38); cs.showText("Shipment Tracker Pro"); cs.endText();
        cs.beginText(); cs.setFont(reg, 11);  cs.newLineAtOffset(MARGIN, PAGE_H - 57); cs.showText("Proof of Delivery"); cs.endText();
        cs.beginText(); cs.setFont(bold, 10); cs.newLineAtOffset(PAGE_W - MARGIN - 180, PAGE_H - 45); cs.showText(clean(tracking)); cs.endText();
        cs.setNonStrokingColor(0f, 0f, 0f);
        return y - 72 - 10;
    }

    private float drawSection(PDPageContentStream cs, PDType1Font bold, PDType1Font reg, float topY, String title, String[][] rows) throws IOException {
        float sH = SECTION_PAD * 2 + 22 + rows.length * ROW_H;
        float bY = topY - sH;
        cs.setStrokingColor(0.80f, 0.88f, 0.96f); cs.setLineWidth(0.8f); cs.addRect(MARGIN, bY, CONTENT_W, sH); cs.stroke();
        cs.setNonStrokingColor(0.93f, 0.96f, 1f); cs.addRect(MARGIN, bY + sH - 22, CONTENT_W, 22); cs.fill();
        cs.setNonStrokingColor(0.14f, 0.23f, 0.37f);
        cs.beginText(); cs.setFont(bold, 8); cs.newLineAtOffset(MARGIN + SECTION_PAD, bY + sH - 15); cs.showText(title.toUpperCase()); cs.endText();
        cs.setNonStrokingColor(0f, 0f, 0f);
        float rY = bY + sH - 22 - SECTION_PAD;
        for (String[] row : rows) {
            rY -= ROW_H;
            cs.beginText(); cs.setFont(bold, 8); cs.newLineAtOffset(MARGIN + SECTION_PAD, rY); cs.showText(clean(row[0])); cs.endText();
            cs.beginText(); cs.setFont(reg, 8);  cs.newLineAtOffset(MARGIN + SECTION_PAD + LABEL_W, rY);
            String v = clean(row[1]); if (v.length() > 60) v = v.substring(0, 57) + "..."; cs.showText(v); cs.endText();
        }
        return bY - 4;
    }

    private void drawImagesSection(PDDocument doc, PDPageContentStream cs, PDType1Font bold, PDType1Font italic,
            float topY, String tracking, String sigPath, String photoPath) throws IOException {
        float imgW = (CONTENT_W - 20) / 2f;
        float sH   = SECTION_PAD * 2 + 22 + 14 + IMG_H;
        float bY   = topY - sH;
        cs.setStrokingColor(0.80f, 0.88f, 0.96f); cs.setLineWidth(0.8f); cs.addRect(MARGIN, bY, CONTENT_W, sH); cs.stroke();
        cs.setNonStrokingColor(0.93f, 0.96f, 1f); cs.addRect(MARGIN, bY + sH - 22, CONTENT_W, 22); cs.fill();
        cs.setNonStrokingColor(0.14f, 0.23f, 0.37f);
        cs.beginText(); cs.setFont(bold, 8); cs.newLineAtOffset(MARGIN + SECTION_PAD, bY + sH - 15); cs.showText("PROOF OF DELIVERY - IMAGES"); cs.endText();
        float imgY = bY + SECTION_PAD;
        cs.setNonStrokingColor(0.38f, 0.50f, 0.62f);
        cs.beginText(); cs.setFont(bold, 7); cs.newLineAtOffset(MARGIN + SECTION_PAD, imgY + IMG_H + 4); cs.showText("CUSTOMER SIGNATURE"); cs.endText();
        cs.beginText(); cs.setFont(bold, 7); cs.newLineAtOffset(MARGIN + SECTION_PAD + imgW + 10, imgY + IMG_H + 4); cs.showText("DELIVERY PHOTO"); cs.endText();
        cs.setNonStrokingColor(0f, 0f, 0f);
        embedOrPlaceholder(doc, cs, italic, sigPath,   tracking, MARGIN + SECTION_PAD,               imgY, imgW - SECTION_PAD, IMG_H);
        embedOrPlaceholder(doc, cs, italic, photoPath, tracking, MARGIN + SECTION_PAD + imgW + 10,   imgY, imgW - SECTION_PAD, IMG_H);
    }

    private void embedOrPlaceholder(PDDocument doc, PDPageContentStream cs, PDType1Font italic,
            String rel, String tracking, float x, float y, float w, float h) throws IOException {
        if (rel != null && !rel.isBlank()) {
            String file = rel.replace("\\", "/"); file = file.substring(file.lastIndexOf('/') + 1);
            String safeTn = tracking.replaceAll("[^A-Za-z0-9\\-]", "_");
            Path fp = Paths.get(uploadDir, "delivery", safeTn, file).toAbsolutePath().normalize();
            if (Files.exists(fp)) {
                try {
                    PDImageXObject img = PDImageXObject.createFromFile(fp.toString(), doc);
                    float scale = Math.min(w / img.getWidth(), h / img.getHeight());
                    float dw = img.getWidth() * scale, dh = img.getHeight() * scale;
                    cs.drawImage(img, x + (w - dw) / 2f, y + (h - dh) / 2f, dw, dh);
                    cs.setStrokingColor(0.85f, 0.85f, 0.85f); cs.setLineWidth(0.5f); cs.addRect(x, y, w, h); cs.stroke();
                    return;
                } catch (Exception ignored) {}
            }
        }
        cs.setNonStrokingColor(0.95f, 0.97f, 0.99f); cs.addRect(x, y, w, h); cs.fill();
        cs.setStrokingColor(0.80f, 0.85f, 0.90f); cs.setLineWidth(0.5f); cs.addRect(x, y, w, h); cs.stroke();
        cs.setNonStrokingColor(0.60f, 0.65f, 0.70f);
        cs.beginText(); cs.setFont(italic, 9); cs.newLineAtOffset(x + w/2f - 24, y + h/2f - 5); cs.showText("Not Available"); cs.endText();
        cs.setNonStrokingColor(0f, 0f, 0f);
    }

    private void drawFooter(PDPageContentStream cs, PDType1Font italic) throws IOException {
        String text = "Generated by Shipment Tracker Pro  |  " + LocalDateTime.now().format(DT) + "  |  Page 1";
        cs.setNonStrokingColor(0.60f, 0.60f, 0.60f);
        cs.beginText(); cs.setFont(italic, 7); cs.newLineAtOffset(MARGIN, 24); cs.showText(clean(text)); cs.endText();
        cs.setStrokingColor(0.85f, 0.85f, 0.85f); cs.setLineWidth(0.5f); cs.moveTo(MARGIN, 36); cs.lineTo(PAGE_W - MARGIN, 36); cs.stroke();
        cs.setNonStrokingColor(0f, 0f, 0f);
    }

    private String nvl(String p, String f) { return (p != null && !p.isBlank()) ? p : f; }

    private String fmtAddr(Address a) {
        if (a == null) return "-";
        StringBuilder sb = new StringBuilder();
        if (a.getCity()    != null) sb.append(a.getCity());
        if (a.getState()   != null) sb.append(", ").append(a.getState());
        if (a.getCountry() != null) sb.append(", ").append(a.getCountry());
        return sb.length() > 0 ? sb.toString() : "-";
    }

    private String clean(String text) {
        if (text == null) return "";
        return text.chars().filter(c -> c < 256)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append).toString();
    }
}
