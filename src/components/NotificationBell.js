// src/components/NotificationBell.js
import { useState } from "react";

function NotificationBell({ notifications, onClear }) {
  const [showPanel, setShowPanel] = useState(false);
  const unread = notifications.length;

  return (
    <div style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        className="btn-bell"
        onClick={() => setShowPanel(!showPanel)}
        title="Notifications"
      >
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div className="notif-backdrop" onClick={() => setShowPanel(false)} />

          {/* Panel */}
          <div className="notif-panel">
            <div className="notif-header">
              <span className="notif-title">Notifications</span>
              {unread > 0 && (
                <button className="notif-clear" onClick={() => { onClear(); setShowPanel(false); }}>
                  Clear all
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div style={{ fontSize: 28, marginBottom: 4 }}>🔕</div>
                <div>No notifications</div>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map((n, i) => (
                  <div key={i} className={"notif-item notif-" + n.type}>
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-body">{n.body}</div>
                    <div className="notif-item-time">{n.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Toast notification that appears at the top of the screen
export function NotificationToast({ notification, onDismiss }) {
  if (!notification) return null;

  const bgColor =
    notification.type === "rating" ? "#d97706" :
    notification.type === "new" ? "#6366f1" :
    notification.data?.status === "Approved" ? "#10b981" :
    notification.data?.status === "Rejected" ? "#ef4444" :
    notification.data?.status === "Need Clarification" ? "#f59e0b" : "#6366f1";

  return (
    <div className="notif-toast" style={{ background: bgColor }} onClick={onDismiss}>
      <div className="notif-toast-title">{notification.title}</div>
      <div className="notif-toast-body">{notification.body}</div>
      <div className="notif-toast-dismiss">Tap to dismiss</div>
    </div>
  );
}

export default NotificationBell;
