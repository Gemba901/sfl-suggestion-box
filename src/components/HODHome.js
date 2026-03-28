// src/components/HODHome.js
// HOD role: dept metrics + assign owner/due date + in-progress (own dept, read-only)
import { useState, useEffect, useCallback } from "react";
import { getSuggestions, getOwners, assignSuggestionOwner } from "../services/data";
import SubmitForm from "./SubmitForm";

const STATUS_COLORS = {
  New: "#94a3b8", "Under Review": "#6366f1", Approved: "#3b82f6",
  "Need Clarification": "#f59e0b", Rejected: "#ef4444",
  Implementing: "#8b5cf6", Implemented: "#10b981", Closed: "#374151",
};

const QCDSMT_COLORS = {
  Q: "#2563eb", C: "#059669", D: "#d97706", S: "#dc2626", M: "#7c3aed", T: "#0891b2",
};

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div className="skeleton-line skeleton-short" style={{ marginBottom: 0 }} />
        <div className="skeleton-line" style={{ width: 80, marginBottom: 0 }} />
      </div>
      <div className="skeleton-line skeleton-medium" />
      <div className="skeleton-line skeleton-full" />
      <div className="skeleton-line skeleton-full" />
    </div>
  );
}

function ExpandableText({ text, label, maxLen = 160 }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text && text.length > maxLen;
  return (
    <div>
      <div className={`suggestion-text${isLong && !expanded ? " suggestion-text-truncated" : ""}`}>
        <strong>{label}:</strong> {text}
      </div>
      {isLong && (
        <button className="btn-expand" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less ▲" : "Show more ▼"}
        </button>
      )}
    </div>
  );
}

function HODHome({ user }) {
  const [view, setView] = useState("home");
  const [suggestions, setSuggestions] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Assign modal state
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignOwner, setAssignOwner] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assignComment, setAssignComment] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [sugData, ownersData] = await Promise.all([
        getSuggestions(user),
        getOwners(),
      ]);
      setSuggestions(sugData);
      setOwners(ownersData);
    } catch {
      setLoadError("Failed to load data. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRefresh() { setRefreshing(true); await loadData(); }

  // KPI computations
  const dept = user.department || "Your Department";
  const pending = suggestions.filter((s) => ["New", "Under Review"].includes(s.status)).length;
  const approved = suggestions.filter((s) => ["Approved", "Implementing", "Implemented", "Closed"].includes(s.status)).length;
  const done = suggestions.filter((s) => ["Implemented", "Closed"].includes(s.status)).length;
  const rated = suggestions.filter((s) => s.impactRating > 0);
  const avgRating = rated.length > 0 ? (rated.reduce((sum, s) => sum + s.impactRating, 0) / rated.length).toFixed(1) : "—";
  const overdue = suggestions.filter((s) => s.dueDate && s.dueDate < today && !["Closed", "Implemented", "Rejected"].includes(s.status));
  const inProgress = suggestions.filter((s) => ["Approved", "Implementing"].includes(s.status));

  function openAssign(sug) {
    setAssignTarget(sug);
    setAssignOwner(sug.assignedOwner || "");
    setAssignDate(sug.dueDate || "");
    setAssignComment(sug.reviewerComment || "");
    setAssignError("");
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssignError("");
    if (!assignOwner) { setAssignError("Please select an owner"); return; }
    if (!assignDate) { setAssignError("Please set a due date"); return; }
    if (assignDate <= today) { setAssignError("Due date must be in the future"); return; }
    setAssignSaving(true);
    try {
      await assignSuggestionOwner(assignTarget.id, {
        assignedOwner: assignOwner,
        dueDate: assignDate,
        comment: assignComment,
      });
      setAssignTarget(null);
      await loadData();
    } catch {
      setAssignError("Failed to save. Please try again.");
    } finally {
      setAssignSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-list">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{loadError}</p>
          <button className="btn-primary" onClick={() => { setLoading(true); loadData(); }}>Try Again</button>
        </div>
      </div>
    );
  }

  if (view === "submit") {
    return (
      <div className="page">
        <SubmitForm user={user} onBack={() => setView("home")} onSuccess={loadData} />
      </div>
    );
  }

  // --- IN PROGRESS VIEW ---
  if (view === "progress") {
    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <div className="page-title-row">
          <h2 className="page-title">⏳ In Progress ({inProgress.length})</h2>
          <button className={"btn-refresh" + (refreshing ? " spinning" : "")} onClick={handleRefresh} title="Refresh">🔄</button>
        </div>
        {inProgress.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✅</div><p>No items currently in progress.</p></div>
        ) : (
          <div className="suggestion-list">
            {inProgress.map((s) => {
              const isOverdue = s.dueDate && s.dueDate < today;
              return (
                <div key={s.id} className={"suggestion-card" + (isOverdue ? " card-overdue" : "")}>
                  <div className="suggestion-header">
                    <span className="suggestion-id">{s.id}</span>
                    <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>{s.status}</span>
                    {s.primaryImpact && <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact}</span>}
                    {isOverdue && <span className="badge-red">Overdue</span>}
                  </div>
                  <div className="suggestion-gemba">{s.employeeName} • {s.submittedDate}</div>
                  <ExpandableText text={s.problem} label="Problem" />
                  <ExpandableText text={s.suggestion} label="Suggestion" />
                  {s.assignedOwner && (
                    <div className="text-muted">
                      Owner: {s.assignedOwner} | Due: {s.dueDate || "—"}
                      {isOverdue && <span style={{ color: "#ef4444", marginLeft: 6 }}>● Overdue</span>}
                    </div>
                  )}
                  <div className="card-actions" style={{ marginTop: 10 }}>
                    <button className="btn-sm btn-outline" onClick={() => openAssign(s)}>
                      ✏️ {s.assignedOwner ? "Reassign" : "Assign Owner"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assign Modal */}
        {assignTarget && (
          <div className="rating-overlay">
            <div className="rating-modal">
              <h3 className="rating-modal-title">✏️ Assign — {assignTarget.id}</h3>
              <form onSubmit={handleAssign}>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label>Assign To <span className="required">*</span></label>
                  <select value={assignOwner} onChange={(e) => setAssignOwner(e.target.value)} className="form-input">
                    <option value="">Select owner...</option>
                    {owners.map((o) => <option key={o.name} value={o.name}>{o.name} {o.title ? `— ${o.title}` : ""}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label>Due Date <span className="required">*</span></label>
                  <input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} className="form-input" min={today} />
                </div>
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label>Comment (optional)</label>
                  <textarea value={assignComment} onChange={(e) => setAssignComment(e.target.value)} className="form-input form-textarea" placeholder="Any notes..." maxLength={300} />
                </div>
                {assignError && <div className="form-error">{assignError}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn-back" style={{ flex: 1, textAlign: "center" }} onClick={() => setAssignTarget(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={assignSaving}>{assignSaving ? "Saving..." : "Save Assignment"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- ALL DEPT SUGGESTIONS VIEW ---
  if (view === "all") {
    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <div className="page-title-row">
          <h2 className="page-title">📋 All in {dept} ({suggestions.length})</h2>
          <button className={"btn-refresh" + (refreshing ? " spinning" : "")} onClick={handleRefresh} title="Refresh">🔄</button>
        </div>
        {suggestions.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><p>No suggestions in {dept} yet.</p></div>
        ) : (
          <div className="suggestion-list">
            {suggestions.map((s) => (
              <div key={s.id} className="suggestion-card">
                <div className="suggestion-header">
                  <span className="suggestion-id">{s.id}</span>
                  <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>{s.status}</span>
                  {s.primaryImpact && <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact}</span>}
                </div>
                <div className="suggestion-gemba">{s.employeeName} • {s.submittedDate}</div>
                <ExpandableText text={s.problem} label="Problem" />
                <ExpandableText text={s.suggestion} label="Suggestion" />
                {s.reviewerComment && <div className="reviewer-comment"><strong>Note:</strong> {s.reviewerComment}</div>}
                {s.assignedOwner && <div className="text-muted">Owner: {s.assignedOwner} | Due: {s.dueDate || "—"}</div>}
                {["Approved", "Implementing"].includes(s.status) && (
                  <div className="card-actions" style={{ marginTop: 10 }}>
                    <button className="btn-sm btn-outline" onClick={() => openAssign(s)}>
                      ✏️ {s.assignedOwner ? "Reassign" : "Assign Owner"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Assign Modal */}
        {assignTarget && (
          <div className="rating-overlay">
            <div className="rating-modal">
              <h3 className="rating-modal-title">✏️ Assign — {assignTarget.id}</h3>
              <form onSubmit={handleAssign}>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label>Assign To <span className="required">*</span></label>
                  <select value={assignOwner} onChange={(e) => setAssignOwner(e.target.value)} className="form-input">
                    <option value="">Select owner...</option>
                    {owners.map((o) => <option key={o.name} value={o.name}>{o.name} {o.title ? `— ${o.title}` : ""}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label>Due Date <span className="required">*</span></label>
                  <input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} className="form-input" min={today} />
                </div>
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label>Comment (optional)</label>
                  <textarea value={assignComment} onChange={(e) => setAssignComment(e.target.value)} className="form-input form-textarea" placeholder="Any notes..." maxLength={300} />
                </div>
                {assignError && <div className="form-error">{assignError}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn-back" style={{ flex: 1, textAlign: "center" }} onClick={() => setAssignTarget(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={assignSaving}>{assignSaving ? "Saving..." : "Save Assignment"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- HOME ---
  return (
    <div className="page">
      <div className="welcome-card welcome-reviewer">
        <div className="welcome-emoji">🏢</div>
        <h2>Welcome {user.name.split(" ")[0]}!</h2>
        <p className="text-muted">Head of Department — {dept}</p>
      </div>

      {/* Dept KPI Cards */}
      <h3 style={{ margin: "4px 0 10px", fontSize: 15, fontWeight: 700, color: "#475569" }}>🏢 {dept} — Summary</h3>
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-icon">📋</div><div className="kpi-value" style={{ color: "#3b82f6" }}>{suggestions.length}</div><div className="kpi-label">Total</div></div>
        <div className="kpi-card"><div className="kpi-icon">📥</div><div className="kpi-value" style={{ color: "#f59e0b" }}>{pending}</div><div className="kpi-label">Pending</div></div>
        <div className="kpi-card"><div className="kpi-icon">✅</div><div className="kpi-value" style={{ color: "#10b981" }}>{approved}</div><div className="kpi-label">Approved</div></div>
        <div className="kpi-card"><div className="kpi-icon">🎯</div><div className="kpi-value" style={{ color: "#6366f1" }}>{done}</div><div className="kpi-label">Done</div></div>
        <div className="kpi-card"><div className="kpi-icon">⭐</div><div className="kpi-value" style={{ color: "#d97706" }}>{avgRating}</div><div className="kpi-label">Avg Rating</div></div>
        <div className={"kpi-card" + (overdue.length > 0 ? " kpi-alert" : "")}>
          <div className="kpi-icon">⏰</div>
          <div className="kpi-value" style={{ color: overdue.length > 0 ? "#ef4444" : "#10b981" }}>{overdue.length}</div>
          <div className="kpi-label">Overdue</div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="action-cards">
        <button className="action-card action-submit" onClick={() => setView("submit")}>
          <span className="action-icon">💡</span>
          <span>
            <span className="action-title">Submit Suggestion</span>
            <span className="action-desc">Share your own idea</span>
          </span>
        </button>

        <button className="action-card action-progress" onClick={() => setView("progress")}>
          <span className="action-icon">⏳</span>
          <span>
            <span className="action-title">In Progress</span>
            <span className="action-desc">{inProgress.length} active{overdue.length > 0 ? `, ${overdue.length} overdue` : ""}</span>
          </span>
          {overdue.length > 0 && <span className="badge-red">{overdue.length}</span>}
        </button>

        <button className="action-card action-view" onClick={() => setView("all")}>
          <span className="action-icon">📋</span>
          <span>
            <span className="action-title">All Dept Suggestions</span>
            <span className="action-desc">{suggestions.length} total in {dept}</span>
          </span>
        </button>
      </div>
    </div>
  );
}

export default HODHome;
