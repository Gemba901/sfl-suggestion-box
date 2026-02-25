// src/App.js
import { useState, useEffect, useCallback } from "react";
import Login from "./components/Login";
import EmployeeHome from "./components/EmployeeHome";
import ReviewerHome from "./components/ReviewerHome";
import Dashboard from "./components/Dashboard";
import NotificationBell, { NotificationToast } from "./components/NotificationBell";
import {
  requestBrowserPermission,
  subscribeToNewSuggestions,
  subscribeToStatusChanges,
  subscribeToAllStatusChanges,
  unsubscribeAll,
} from "./services/notifications";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  // Add a notification to the list + show toast
  const addNotification = useCallback((notif) => {
    const withTime = {
      ...notif,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setNotifications((prev) => [withTime, ...prev].slice(0, 20)); // Keep last 20
    setToast(withTime);
    setTimeout(() => setToast(null), 4000); // Auto-dismiss after 4 seconds
  }, []);

  // Setup realtime subscriptions when user logs in
  useEffect(() => {
    if (!user) return;

    // Request browser notification permission
    requestBrowserPermission();

    // Subscribe based on role
    if (user.role === "Reviewer" || user.role === "Management") {
      // Reviewers/Management get notified of new suggestions
      subscribeToNewSuggestions(addNotification);
      // They also get notified if THEIR suggestions get reviewed
      subscribeToAllStatusChanges(user.name, addNotification);
    } else {
      // Employees get notified when their suggestions are reviewed
      subscribeToStatusChanges(user.name, addNotification);
    }

    // Cleanup on logout
    return () => {
      unsubscribeAll();
    };
  }, [user, addNotification]);

  function handleLogout() {
    unsubscribeAll();
    setNotifications([]);
    setToast(null);
    setUser(null);
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">📋</span>
          <div>
            <div className="header-title">SFL Suggestion Box</div>
            <div className="header-role">{user.role} • {user.name}</div>
          </div>
        </div>
        <div className="header-right">
          <NotificationBell
            notifications={notifications}
            onClear={() => setNotifications([])}
          />
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Toast notification */}
      <NotificationToast notification={toast} onDismiss={() => setToast(null)} />

      <div className="app-content">
        {user.role === "Employee" && <EmployeeHome user={user} />}
        {user.role === "Reviewer" && <ReviewerHome user={user} />}
        {user.role === "Management" && <Dashboard user={user} />}
      </div>
    </div>
  );
}

export default App;
