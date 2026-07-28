package com.shiptrackpro.enums;

/**
 * Business event that triggered a notification.
 * Stored as a string column in the notifications table.
 */
public enum NotificationEventType {
    SHIPMENT_CREATED,
    DRIVER_ASSIGNED,
    PICKED_UP,
    IN_TRANSIT,
    OUT_FOR_DELIVERY,
    DELIVERED,
    DELAYED,
    CANCELLED,
    FAILED_DELIVERY,
    RETURNED,
    PASSWORD_RESET,
    ACCOUNT_APPROVED,
    ACCOUNT_REJECTED
}
