package com.shiptrackpro.dto;

import com.shiptrackpro.entity.Notification;

import java.time.OffsetDateTime;

/**
 * DTO returned by GET /api/notifications and PUT /api/notifications/{id}/read.
 *
 * Field names intentionally match what NotificationBell.jsx expects:
 *   notificationId, title, eventType, message, isRead, createdAt, shipmentId
 */
public class NotificationResponse {

    private Long   notificationId;
    private String title;
    private String eventType;
    private String message;
    private Boolean isRead;
    private OffsetDateTime createdAt;
    private Long   shipmentId;          // null when not shipment-related
    private String trackingNumber;      // null when not shipment-related

    // ── Constructors ─────────────────────────────────────────────

    public NotificationResponse() {}

    /** Maps a Notification entity to this DTO. */
    public static NotificationResponse from(Notification n) {
        NotificationResponse dto = new NotificationResponse();
        dto.notificationId = n.getNotificationId();
        dto.title          = n.getTitle();
        dto.eventType      = n.getEventType() != null ? n.getEventType().name() : null;
        dto.message        = n.getMessage();
        dto.isRead         = Boolean.TRUE.equals(n.getIsRead());
        dto.createdAt      = n.getCreatedAt();
        dto.shipmentId     = n.getShipment() != null ? n.getShipment().getId() : null;
        dto.trackingNumber = n.getShipment() != null ? n.getShipment().getTrackingNumber() : null;
        return dto;
    }

    // ── Getters / Setters ────────────────────────────────────────

    public Long getNotificationId()            { return notificationId; }
    public void setNotificationId(Long v)      { this.notificationId = v; }

    public String getTitle()                   { return title; }
    public void setTitle(String v)             { this.title = v; }

    public String getEventType()               { return eventType; }
    public void setEventType(String v)         { this.eventType = v; }

    public String getMessage()                 { return message; }
    public void setMessage(String v)           { this.message = v; }

    public Boolean getIsRead()                 { return isRead; }
    public void setIsRead(Boolean v)           { this.isRead = v; }

    public OffsetDateTime getCreatedAt()       { return createdAt; }
    public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }

    public Long getShipmentId()                { return shipmentId; }
    public void setShipmentId(Long v)          { this.shipmentId = v; }

    public String getTrackingNumber()          { return trackingNumber; }
    public void setTrackingNumber(String v)    { this.trackingNumber = v; }
}
