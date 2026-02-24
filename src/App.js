// src/App.js
import { useState } from "react";
import Login from "./components/Login";
import EmployeeHome from "./components/EmployeeHome";
import ReviewerHome from "./components/ReviewerHome";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  function handleLogin(userData) {
    setUser(userData);
  }

  function handleLogout() {
    setUser(null);
  }

  // Not logged in — show login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Logged in — show the right screen based on role
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <img src="/sfl-logo.png" alt="SFL" className="header-logo-img" />
          <div>
            <div className="header-title">SFL Suggestion Box</div>
            <div className="header-role">
              {user.role === "Employee" && "👷 Employee"}
              {user.role === "Reviewer" && "📋 Reviewer"}
              {user.role === "Management" && "📊 Management"}
              {" • "}{user.name}
            </div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </header>

      {/* Content based on role */}
      <main className="app-content">
        {user.role === "Employee" && <EmployeeHome user={user} />}
        {user.role === "Reviewer" && <ReviewerHome user={user} />}
        {user.role === "Management" && <Dashboard user={user} />}
      </main>
    </div>
  );
}

export default App;
