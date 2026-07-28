package com.shiptrackpro.enums;

/**
 * Delivery/processing status of a notification record.
 * Stored as a string column in the notifications table.
 */
public enum NotificationStatus {
    PENDING,
    SENT,
    FAILED,
    READ
}
