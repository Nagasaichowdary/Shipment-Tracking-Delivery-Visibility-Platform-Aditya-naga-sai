package com.shiptrackpro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for {@code GET /api/analytics/activity}.
 *
 * <p>Contains recent shipment activity items sourced from the
 * {@code notifications} table (where available) and supplemented by
 * direct shipment queries for events that may not have a corresponding
 * notification record.</p>
 *
 * <p>Each activity item carries the event type, shipment reference,
 * and a human-readable description — ready for display in a live
 * activity feed on the Analytics Dashboard.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsActivityResponse {

    /**
     * The most recent activity items across all event types,
     * ordered newest-first. Limited to {@code limit} items (default 20).
     */
    private List<ActivityItem> recentActivity;

    /** Latest shipments created (newest-first). */
    private List<RecentShipmentItem> recentShipments;

    /** Latest confirmed deliveries (newest delivered_at first). */
    private List<RecentShipmentItem> recentDeliveries;

    /** Latest delayed shipments (newest updated_at first). */
    private List<RecentShipmentItem> recentDelays;

    /** Latest driver assignments (shipments where assigned_driver_id was recently set). */
    private List<RecentShipmentItem> recentAssignments;

    // ─────────────────────────────────────────────────────────────────────────
    // Nested DTOs
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * A single activity event in the feed.
     *
     * <p>Events are sourced from the {@code notifications} table via
     * {@code NotificationRepository} — this avoids duplicating event-tracking
     * logic that already exists. When no notification record exists for an
     * event (e.g. driver rejection), the item is synthesised from the
     * {@code shipments} or {@code driver_rejections} table.</p>
     */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ActivityItem {
        /**
         * The business event type.
         * Maps to {@code NotificationEventType} enum values:
         * SHIPMENT_CREATED, DRIVER_ASSIGNED, PICKED_UP, IN_TRANSIT,
         * OUT_FOR_DELIVERY, DELIVERED, DELAYED, CANCELLED, FAILED_DELIVERY,
         * RETURNED, etc.
         */
        private String eventType;

        /** Short title — matches {@code notifications.title}. */
        private String title;

        /** Human-readable description — matches {@code notifications.message}. */
        private String description;

        /** Tracking number of the related shipment. */
        private String trackingNumber;

        /** DB id of the related shipment (for deep-links). */
        private Long shipmentId;

        /** Timestamp of the event (notification.created_at or shipment.updated_at). */
        private LocalDateTime occurredAt;
    }

    /**
     * Lightweight shipment summary used in the four "recent" lists
     * (recent created, recent delivered, recent delays, recent assignments).
     */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RecentShipmentItem {
        private Long id;
        private String trackingNumber;
        private String senderName;
        private String receiverName;
        private String status;
        private String originCity;
        private String destinationCity;
        private String assignedDriverName;
        private LocalDateTime createdAt;
        private LocalDateTime deliveredAt;
        private LocalDateTime updatedAt;
    }
}
