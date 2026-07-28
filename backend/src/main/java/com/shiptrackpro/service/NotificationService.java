package com.shiptrackpro.service;

import com.shiptrackpro.dto.NotificationResponse;

import java.util.List;
import java.util.Map;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.enums.NotificationEventType;
import com.shiptrackpro.enums.NotificationChannel;

/**
 * Notification service interface.
 *
 * All methods are keyed by the authenticated user's email address,
 * which is extracted from the JWT by the controller.
 */
public interface NotificationService {

    /** Returns all notifications for the given user, newest first. */
    List<NotificationResponse> getNotifications(String email);

    /** Returns the unread notification count for the given user. */
    Map<String, Long> getUnreadCount(String email);

    /** Marks a single notification as read. Throws if not owned by the user. */
    NotificationResponse markAsRead(Long notificationId, String email);

    /** Marks all of the user's notifications as read. */
    void markAllAsRead(String email);

    /**
     * Creates a new notification for a specific user.
     *
     * @param user     The recipient of the notification.
     * @param shipment The related shipment, if any.
     * @param event    The type of event that triggered the notification.
     * @param title    The title of the notification.
     * @param message  The detailed message.
     */
    void createNotification(User user, Shipment shipment, NotificationEventType event, String title, String message);
}
