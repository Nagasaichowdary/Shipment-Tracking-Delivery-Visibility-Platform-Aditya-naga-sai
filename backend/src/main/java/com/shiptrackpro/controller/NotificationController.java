package com.shiptrackpro.controller;

import com.shiptrackpro.dto.NotificationResponse;
import com.shiptrackpro.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Notification REST controller.
 *
 * All four endpoints require a valid JWT (protected by SecurityConfig).
 * The authenticated user's email is resolved from the JWT principal.
 *
 * Endpoints:
 *   GET  /api/notifications                          → list all notifications
 *   GET  /api/notifications/unread-count             → { "unreadCount": N }
 *   PUT  /api/notifications/{notificationId}/read    → mark single as read
 *   PUT  /api/notifications/read-all                 → mark all as read
 */
@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /** GET /api/notifications — returns all notifications for the authenticated user. */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(notificationService.getNotifications(principal.getUsername()));
    }

    /** GET /api/notifications/unread-count — returns {"unreadCount": N}. */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(notificationService.getUnreadCount(principal.getUsername()));
    }

    /** PUT /api/notifications/{notificationId}/read — marks a single notification as read. */
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(
                notificationService.markAsRead(notificationId, principal.getUsername()));
    }

    /** PUT /api/notifications/read-all — marks all notifications as read. */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @AuthenticationPrincipal UserDetails principal) {
        notificationService.markAllAsRead(principal.getUsername());
        return ResponseEntity.noContent().build();
    }
}
