package com.shiptrackpro.enums;

/**
 * Delivery channel for a notification.
 * Stored as a string column in the notifications table.
 */
public enum NotificationChannel {
    EMAIL,
    SMS,
    PUSH,
    IN_APP
}
