package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.NotificationResponse;
import com.shiptrackpro.entity.Notification;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.exception.ResourceNotFoundException;
import com.shiptrackpro.repository.NotificationRepository;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import com.shiptrackpro.enums.NotificationEventType;
import com.shiptrackpro.enums.NotificationChannel;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.enums.NotificationStatus;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository         userRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                   UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository         = userRepository;
    }

    // ── Helpers ──────────────────────────────────────────────────

    private User resolveUser(String email) {
        return userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    // ── Service methods ──────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String email) {
        User user = resolveUser(email);
        return notificationRepository
                .findByUser_UserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getUnreadCount(String email) {
        User user = resolveUser(email);
        long count = notificationRepository.countByUser_UserIdAndIsReadFalse(user.getUserId());
        return Map.of("unreadCount", count);
    }

    @Override
    public NotificationResponse markAsRead(Long notificationId, String email) {
        User user = resolveUser(email);

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found: " + notificationId));

        // Ownership check — users may only mark their own notifications
        if (!notification.getUser().getUserId().equals(user.getUserId())) {
            throw new SecurityException("Access denied to notification " + notificationId);
        }

        notification.setIsRead(true);
        Notification saved = notificationRepository.save(notification);
        return NotificationResponse.from(saved);
    }

    @Override
    public void markAllAsRead(String email) {
        User user = resolveUser(email);
        List<Notification> unread = notificationRepository
                .findByUser_UserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .filter(n -> Boolean.FALSE.equals(n.getIsRead()))
                .toList();
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    @Override
    public void createNotification(User user, Shipment shipment, NotificationEventType event, String title, String message) {
        if (user == null) {
            return;
        }

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setShipment(shipment);
        notification.setEventType(event);
        notification.setNotificationType(NotificationChannel.IN_APP);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setIsRead(false);
        notification.setSentStatus(NotificationStatus.SENT);

        notificationRepository.save(notification);
    }
}
