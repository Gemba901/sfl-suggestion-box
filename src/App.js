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
  const [dark, setDark] = useState(localStorage.getItem("sfl_dark") === "true");
  const [mgmtMode, setMgmtMode] = useState("dashboard"); // "dashboard" or "review"

  // Apply dark mode class to body
  useEffect(() => {
    if (dark) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("sfl_dark", dark);
  }, [dark]);

  // Add a notification to the list + show toast
  const addNotification = useCallback((notif) => {
    const withTime = {
      ...notif,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setNotifications((prev) => [withTime, ...prev].slice(0, 20));
    setToast(withTime);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Setup realtime subscriptions when user logs in
  useEffect(() => {
    if (!user) return;
    requestBrowserPermission();
    if (user.role === "Reviewer" || user.role === "Management") {
      subscribeToNewSuggestions(addNotification);
      subscribeToAllStatusChanges(user.name, addNotification);
    } else {
      subscribeToStatusChanges(user.name, addNotification);
    }
    return () => { unsubscribeAll(); };
  }, [user, addNotification]);

  function handleLogout() {
    unsubscribeAll();
    setNotifications([]);
    setToast(null);
    setMgmtMode("dashboard");
    setUser(null);
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <img src="/sfl-logo.png" alt="SFL" className="header-logo-img" />
          <div>
            <div className="header-title">SFL Suggestion Box</div>
            <div className="header-role">{user.role} • {user.name}</div>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-dark-toggle" onClick={() => setDark(!dark)} title={dark ? "Light mode" : "Dark mode"}>
            {dark ? "☀️" : "🌙"}
          </button>
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
        {user.role === "Management" && (
          <>
            {/* Toggle between Dashboard and Review mode */}
            <div style={{ padding: "16px 16px 0", maxWidth: 800, margin: "0 auto" }}>
              <div className="mode-toggle">
                <button
                  className={"mode-toggle-btn" + (mgmtMode === "dashboard" ? " mode-toggle-active" : "")}
                  onClick={() => setMgmtMode("dashboard")}
                >
                  📊 Dashboard
                </button>
                <button
                  className={"mode-toggle-btn" + (mgmtMode === "review" ? " mode-toggle-active" : "")}
                  onClick={() => setMgmtMode("review")}
                >
                  📥 Review & Rate
                </button>
              </div>
            </div>

            {mgmtMode === "dashboard" && <Dashboard user={user} />}
            {mgmtMode === "review" && <ReviewerHome user={user} />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
