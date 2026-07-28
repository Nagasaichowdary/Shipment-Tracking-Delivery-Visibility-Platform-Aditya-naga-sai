package com.shiptrackpro.repository;

import com.shiptrackpro.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** Returns all notifications for a user, newest first. */
    List<Notification> findByUser_UserIdOrderByCreatedAtDesc(Long userId);

    /** Counts unread notifications for the badge. */
    long countByUser_UserIdAndIsReadFalse(Long userId);
}
