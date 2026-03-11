// src/components/EmployeeHome.js
import { useState, useEffect, useCallback } from "react";
import { getSuggestions, getDeptSuggestions } from "../services/data";
import SubmitForm from "./SubmitForm";

const STATUS_COLORS = {
  New: "#94a3b8", "Under Review": "#6366f1", Approved: "#3b82f6",
  "Need Clarification": "#f59e0b", Rejected: "#ef4444",
  Implementing: "#8b5cf6", Implemented: "#10b981", Closed: "#374151",
};

const QCDSMT_LABELS = {
  Q: "Quality", C: "Cost", D: "Delivery", S: "Safety", M: "Morale", T: "Technology",
};

const QCDSMT_COLORS = {
  Q: "#2563eb", C: "#059669", D: "#d97706", S: "#dc2626", M: "#7c3aed", T: "#0891b2",
};

function EmployeeHome({ user }) {
  const [view, setView] = useState("home");
  const [mySuggestions, setMySuggestions] = useState([]);
  const [deptSuggestions, setDeptSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sugData, deptData] = await Promise.all([
      getSuggestions(user),
      getDeptSuggestions(user.department),
    ]);
    setMySuggestions(sugData);
    setDeptSuggestions(deptData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <p>Loading...</p>
    </div>;
  }

  // --- SUBMIT FORM ---
  if (view === "submit") {
    return (
      <div className="page">
        <SubmitForm
          user={user}
          onBack={() => setView("home")}
          onSuccess={loadData}
        />
      </div>
    );
  }

  // --- MY DEPT VIEW ---
  if (view === "dept") {
    const dept = user.department || "Unknown";
    const dTotal = deptSuggestions.length;
    const dPending = deptSuggestions.filter((s) => s.status === "New" || s.status === "Under Review").length;
    const dApproved = deptSuggestions.filter((s) => ["Approved", "Implementing", "Implemented", "Closed"].includes(s.status)).length;
    const dCompleted = deptSuggestions.filter((s) => ["Implemented", "Closed"].includes(s.status)).length;
    const dRated = deptSuggestions.filter((s) => s.impactRating > 0);
    const dAvgRating = dRated.length > 0 ? (dRated.reduce((sum, s) => sum + s.impactRating, 0) / dRated.length).toFixed(1) : "—";
    const today = new Date().toISOString().split("T")[0];
    const dOverdue = deptSuggestions.filter((s) => s.dueDate && s.dueDate < today && !["Closed", "Implemented", "Rejected"].includes(s.status)).length;

    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <h2 className="page-title">📊 {dept} — Department Summary</h2>

        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon">📋</div>
            <div className="kpi-value" style={{ color: "#3b82f6" }}>{dTotal}</div>
            <div className="kpi-label">Total</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">📥</div>
            <div className="kpi-value" style={{ color: "#f59e0b" }}>{dPending}</div>
            <div className="kpi-label">Pending</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">✅</div>
            <div className="kpi-value" style={{ color: "#10b981" }}>{dApproved}</div>
            <div className="kpi-label">Approved</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🎯</div>
            <div className="kpi-value" style={{ color: "#6366f1" }}>{dCompleted}</div>
            <div className="kpi-label">Completed</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">⭐</div>
            <div className="kpi-value" style={{ color: "#d97706" }}>{dAvgRating}</div>
            <div className="kpi-label">Avg Rating</div>
          </div>
          <div className={"kpi-card" + (dOverdue > 0 ? " kpi-alert" : "")}>
            <div className="kpi-icon">⏰</div>
            <div className="kpi-value" style={{ color: dOverdue > 0 ? "#ef4444" : "#10b981" }}>{dOverdue}</div>
            <div className="kpi-label">Overdue</div>
          </div>
        </div>

        <h3 style={{ margin: "20px 0 12px", fontSize: 16, fontWeight: 600 }}>All Suggestions in {dept} ({dTotal})</h3>

        {dTotal === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No suggestions for this department yet.</p>
          </div>
        ) : (
          <div className="suggestion-list">
            {deptSuggestions.map((s) => (
              <div key={s.id} className="suggestion-card">
                <div className="suggestion-header">
                  <span className="suggestion-id">{s.id}</span>
                  <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>
                    {s.status}
                  </span>
                  {s.primaryImpact && (
                    <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact}</span>
                  )}
                </div>
                <div className="suggestion-area">{s.employeeName} • {s.submittedDate}</div>
                <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
                <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>
                {s.reviewerComment && <div className="reviewer-comment"><strong>Reviewer:</strong> {s.reviewerComment}</div>}
                {s.impactRating > 0 && (
                  <div className="impact-rating-display">
                    <div className="impact-stars">
                      {"★".repeat(s.impactRating)}{"☆".repeat(5 - s.impactRating)}
                    </div>
                    <div className="impact-label">Impact Rating: {s.impactRating}/5</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- HOME SCREEN ---
  if (view === "home") {
    const pending = mySuggestions.filter((s) => s.status === "New" || s.status === "Under Review").length;
    const approved = mySuggestions.filter((s) => ["Approved", "Implementing", "Implemented", "Closed"].includes(s.status)).length;

    return (
      <div className="page">
        <div className="welcome-card">
          <div className="welcome-emoji">👋</div>
          <h2>Welcome {user.name.split(" ")[0]}!</h2>
          <p className="text-muted">Ready to make a difference?</p>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{mySuggestions.length}</div>
            <div className="stat-label">My Suggestions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#f59e0b" }}>{pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#10b981" }}>{approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>

        <div className="action-cards">
          <button className="action-card action-submit" onClick={() => setView("submit")}>
            <span className="action-icon">💡</span>
            <span className="action-title">Submit Suggestion</span>
            <span className="action-desc">Share your idea to improve SFL</span>
          </button>

          <button className="action-card action-view" onClick={() => setView("list")}>
            <span className="action-icon">📋</span>
            <span className="action-title">My Suggestions</span>
            <span className="action-desc">Track status of your ideas</span>
          </button>

          <button className="action-card action-progress" onClick={() => setView("dept")}>
            <span className="action-icon">🏢</span>
            <span className="action-title">My Department</span>
            <span className="action-desc">See all suggestions in {user.department || "your dept"}</span>
          </button>
        </div>
      </div>
    );
  }

  // --- MY SUGGESTIONS LIST ---
  return (
    <div className="page">
      <button className="btn-back" onClick={() => setView("home")}>← Back</button>
      <h2 className="page-title">📋 My Suggestions ({mySuggestions.length})</h2>

      {mySuggestions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No suggestions yet. Submit your first idea!</p>
          <button className="btn-primary" onClick={() => setView("submit")}>Submit Suggestion</button>
        </div>
      ) : (
        <div className="suggestion-list">
          {mySuggestions.map((s) => (
            <div key={s.id} className="suggestion-card">
              <div className="suggestion-header">
                <span className="suggestion-id">{s.id}</span>
                <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>
                  {s.status}
                </span>
                {s.primaryImpact && (
                  <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] || "#6366f1" }}>
                    {s.primaryImpact}
                  </span>
                )}
              </div>
              <div className="suggestion-area">{s.area} • {s.submittedDate}</div>
              <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
              <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>

              {s.primaryImpact && (
                <div className="qcdsmt-classification">
                  <span className="qcdsmt-tag">
                    {s.primaryImpact} — {QCDSMT_LABELS[s.primaryImpact] || s.primaryImpact}
                  </span>
                  {s.secondaryImpact && (
                    <span className="qcdsmt-tag qcdsmt-tag-secondary">
                      {s.secondaryImpact} — {QCDSMT_LABELS[s.secondaryImpact] || s.secondaryImpact}
                    </span>
                  )}
                </div>
              )}

              {s.reviewerComment && (
                <div className="reviewer-comment">
                  <strong>Reviewer:</strong> {s.reviewerComment}
                </div>
              )}

              {s.status === "Approved" && s.assignedOwner && (
                <div className="status-info status-approved">
                  ✅ Approved — Assigned to {s.assignedOwner} {s.dueDate ? `(Due: ${s.dueDate})` : ""}
                </div>
              )}
              {s.status === "Rejected" && (
                <div className="status-info status-rejected">
                  ❌ Not approved at this time
                </div>
              )}
              {s.status === "Need Clarification" && (
                <div className="status-info status-clarify">
                  ❓ Reviewer needs more information — check the comment above
                </div>
              )}
              {s.status === "Implementing" && (
                <div className="status-info status-implementing">
                  🔨 Your idea is being implemented!
                </div>
              )}
              {s.status === "Implemented" && (
                <div className="status-info status-implemented">
                  🎉 Your idea has been implemented!
                </div>
              )}
              {s.impactRating > 0 && (
                <div className="impact-rating-display">
                  <div className="impact-stars">
                    {"★".repeat(s.impactRating)}{"☆".repeat(5 - s.impactRating)}
                  </div>
                  <div className="impact-label">Impact Rating: {s.impactRating}/5</div>
                  {s.ratingComment && <div className="impact-comment">{s.ratingComment}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmployeeHome;
