import { useEffect, useState } from "react";
import {
  listNotifications,
  markNotificationAsRead,
  Notification
} from "../../services/notificationService";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await listNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  async function handleMarkAsRead(notificationId: string) {
    try {
      await markNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (err) {
      console.error(err);
      setError("Failed to mark notification as read.");
    }
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const delayBreakdownCount = notifications.filter(
    (item) => item.type === "DELAYED" || item.type === "BREAKDOWN"
  ).length;

  const fallbackAlertCount = notifications.filter(
    (item) =>
      item.type === "WHATSAPP_FALLBACK_SENT" ||
      item.type === "WHATSAPP_FALLBACK_FAILED" ||
      item.type === "NO_DRIVER_REPLY"
  ).length;

  return (
    <div className="page">
      <h1>Notifications</h1>
      <p>
        Important fleet alerts appear here, including delayed trips, breakdowns,
customer account alerts, and future document expiry alerts.
      </p>

      {error && (
        <p style={{ color: "red", fontWeight: 600 }}>
          {error}
        </p>
      )}

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <p style={{ margin: 0, color: "#64748b" }}>Total Alerts</p>
          <h2>{notifications.length}</h2>
        </div>

        <div className="card">
          <p style={{ margin: 0, color: "#64748b" }}>Unread</p>
          <h2>{unreadCount}</h2>
        </div>

        <div className="card">
          <p style={{ margin: 0, color: "#64748b" }}>Delays / Breakdowns</p>
          <h2>{delayBreakdownCount}</h2>
        </div>

        <div className="card">
          <p style={{ margin: 0, color: "#64748b" }}>Fallback Alerts</p>
          <h2>{fallbackAlertCount}</h2>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading notifications...</div>
      ) : (
        <div className="card">
          <h3>Alert List</h3>

          {notifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Message</th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td style={tdStyle}>
                      {notification.is_read ? "Read" : "Unread"}
                    </td>
                    <td style={tdStyle}>
                      <NotificationBadge type={notification.type} />
                    </td>
                    <td style={tdStyle}>
                      <strong>{notification.title}</strong>
                    </td>
                    <td style={tdStyle}>{notification.message}</td>
                    <td style={tdStyle}>
                      {new Date(notification.created_at).toLocaleString()}
                    </td>
                    <td style={tdStyle}>
                      {!notification.is_read ? (
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Mark Read
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationBadge({ type }: { type: string }) {
  const background =
    type === "BREAKDOWN" ||
    type === "WHATSAPP_FALLBACK_FAILED" ||
    type === "NO_DRIVER_REPLY"
      ? "#fee2e2"
      : type === "DELAYED"
      ? "#fef3c7"
      : type === "WHATSAPP_FALLBACK_SENT"
      ? "#dcfce7"
      : type.includes("SMS")
      ? "#e0f2fe"
      : "#e5e7eb";

  const color =
    type === "BREAKDOWN" ||
    type === "WHATSAPP_FALLBACK_FAILED" ||
    type === "NO_DRIVER_REPLY"
      ? "#991b1b"
      : type === "DELAYED"
      ? "#92400e"
      : type === "WHATSAPP_FALLBACK_SENT"
      ? "#166534"
      : type.includes("SMS")
      ? "#075985"
      : "#374151";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: "999px",
        background,
        color,
        fontWeight: 700,
        fontSize: 12
      }}
    >
      {type.replaceAll("_", " ")}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #e5e9f2"
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #eef2f7"
};