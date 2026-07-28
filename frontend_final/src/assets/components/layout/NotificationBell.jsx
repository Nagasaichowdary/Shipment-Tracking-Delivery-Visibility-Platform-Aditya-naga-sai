import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/api";

const formatTimestamp = (value) => {
  if (!value) return "Just now";

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Just now";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(timestamp);
};

function NotificationBell({ isAuthenticated }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await getUnreadNotificationCount();
      setUnreadCount(response.data?.unreadCount ?? 0);
    } catch {
      // A notification failure must not interrupt the rest of the dashboard.
    }
  }, [isAuthenticated]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError("");
    try {
      const response = await getNotifications();
      setNotifications(Array.isArray(response.data) ? response.data : []);
      await refreshUnreadCount();
    } catch {
      setError("Notifications could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsOpen(false);
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    refreshUnreadCount();
    const refreshTimer = window.setInterval(refreshUnreadCount, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [isAuthenticated, refreshUnreadCount]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) await loadNotifications();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        const response = await markNotificationAsRead(notification.notificationId);
        const updatedNotification = response.data ?? { ...notification, isRead: true };
        setNotifications((current) =>
          current.map((item) =>
            item.notificationId === notification.notificationId ? updatedNotification : item,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        setError("The notification could not be marked as read.");
        return;
      }
    }

    if (notification.trackingNumber) {
      setIsOpen(false);
      navigate("/track", { state: { trackingNumber: notification.trackingNumber } });
    } else if (notification.shipmentId) {
      // Fallback: older notifications without trackingNumber go to shipments list
      setIsOpen(false);
      navigate("/shipments");
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    setError("");
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      setError("Notifications could not be marked as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="notification-menu" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        className="notification-bell"
        onClick={handleToggle}
        type="button"
      >
        <span aria-hidden="true">&#128276;</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <section aria-label="Notifications" className="notification-popover" role="dialog">
          <div className="notification-popover-header">
            <div>
              <h2>Notifications</h2>
              <p>{unreadCount ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}</p>
            </div>
            <button
              className="text-link notification-mark-all"
              disabled={!unreadCount || isMarkingAll}
              onClick={handleMarkAllAsRead}
              type="button"
            >
              {isMarkingAll ? "Marking..." : "Mark all read"}
            </button>
          </div>

          <div className="notification-items">
            {isLoading && <p className="notification-empty">Loading notifications...</p>}
            {!isLoading && error && <p className="notification-error">{error}</p>}
            {!isLoading && !error && notifications.length === 0 && (
              <p className="notification-empty">No notifications yet.</p>
            )}
            {!isLoading && !error && notifications.map((notification) => (
              <button
                className={`notification-item${notification.isRead ? "" : " unread"}`}
                key={notification.notificationId}
                onClick={() => handleNotificationClick(notification)}
                type="button"
              >
                <span className="notification-item-title">{notification.title || notification.eventType}</span>
                <span className="notification-item-message">{notification.message}</span>
                <span className="notification-item-time">{formatTimestamp(notification.createdAt)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default NotificationBell;
