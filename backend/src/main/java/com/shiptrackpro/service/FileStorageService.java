package com.shiptrackpro.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;

/**
 * Handles saving uploaded files (delivery photos, signature PNGs) to the
 * local file system and returns the relative path stored in the database.
 *
 * <p>Files are organized as:
 * <pre>
 * {uploadDir}/delivery/{trackingNumber}/signature.png
 * {uploadDir}/delivery/{trackingNumber}/delivery-photo.{ext}
 * </pre>
 * </p>
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    /** Allowed MIME types for delivery photos. */
    private static final Set<String> ALLOWED_PHOTO_TYPES =
            Set.of("image/jpeg", "image/jpg", "image/png");

    /** 5 MB in bytes. */
    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Saves the signature PNG from the canvas.
     *
     * @param signatureFile multipart file whose content type must be {@code image/png}
     * @param trackingNumber used to build the per-shipment directory name
     * @return relative path suitable for storage in the database
     *         (e.g. {@code delivery/SHIP-ABCD1234/signature.png})
     * @throws IllegalStateException if the file is empty or not a PNG
     * @throws IOException if writing to disk fails
     */
    public String saveSignature(MultipartFile signatureFile, String trackingNumber)
            throws IOException {
        if (signatureFile == null || signatureFile.isEmpty()) {
            throw new IllegalStateException("Customer signature is required.");
        }
        // Canvas always exports PNG; guard against tampering.
        String contentType = signatureFile.getContentType();
        if (!"image/png".equalsIgnoreCase(contentType)) {
            throw new IllegalStateException("Signature must be a PNG image.");
        }
        return persist(signatureFile, trackingNumber, "signature.png");
    }

    /**
     * Saves the delivery photo after type and size validation.
     *
     * @param photoFile multipart file; must be JPG/JPEG/PNG and ≤ 5 MB
     * @param trackingNumber used to build the per-shipment directory name
     * @return relative path suitable for storage in the database
     * @throws IllegalStateException if validation fails
     * @throws IOException if writing to disk fails
     */
    public String saveDeliveryPhoto(MultipartFile photoFile, String trackingNumber)
            throws IOException {
        if (photoFile == null || photoFile.isEmpty()) {
            throw new IllegalStateException("Delivery photo is required.");
        }
        String contentType = (photoFile.getContentType() == null)
                ? "" : photoFile.getContentType().toLowerCase();
        if (!ALLOWED_PHOTO_TYPES.contains(contentType)) {
            throw new IllegalStateException(
                    "Delivery photo must be a JPG or PNG image. Received: " + contentType);
        }
        if (photoFile.getSize() > MAX_PHOTO_BYTES) {
            throw new IllegalStateException(
                    "Delivery photo must not exceed 5 MB. Uploaded: "
                            + (photoFile.getSize() / (1024 * 1024)) + " MB.");
        }

        // Derive extension from MIME type — never trust client-supplied filename extension.
        String ext = contentType.contains("png") ? "png" : "jpg";
        return persist(photoFile, trackingNumber, "delivery-photo." + ext);
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    /**
     * Writes the file bytes to {@code {uploadDir}/delivery/{trackingNumber}/{filename}}.
     *
     * @return relative path string (no leading slash)
     */
    private String persist(MultipartFile file, String trackingNumber, String filename)
            throws IOException {
        // Sanitise tracking number to prevent directory traversal
        String safe = trackingNumber.replaceAll("[^A-Za-z0-9\\-]", "_");
        Path dir = Paths.get(uploadDir, "delivery", safe);
        Files.createDirectories(dir);
        Path target = dir.resolve(filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        String relativePath = "delivery/" + safe + "/" + filename;
        log.info("[POD] Saved file: {}", relativePath);
        return relativePath;
    }
}
