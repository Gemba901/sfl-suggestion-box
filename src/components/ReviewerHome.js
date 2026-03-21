// src/components/ReviewerHome.js
import { useState, useEffect, useCallback } from "react";
import { getSuggestions, getQCDSMT, getOwners, reviewSuggestion, updateSuggestionStatus, getDeptSuggestions } from "../services/data";
import SubmitForm from "./SubmitForm";

const STATUS_COLORS = {
  New: "#94a3b8", "Under Review": "#6366f1", Approved: "#3b82f6",
  "Need Clarification": "#f59e0b", Rejected: "#ef4444",
  Implementing: "#8b5cf6", Implemented: "#10b981", Closed: "#374151",
};

const QCDSMT_LABELS = {
  Q: "Quality", C: "Cost", D: "Delivery", S: "Safety", M: "Morale", T: "Technology",
};

const QCDSMT_ORDER = ["Q", "C", "D", "S", "M", "T"];

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

// Confirmation modal
function ConfirmModal({ title, body, confirmLabel, confirmColor = "#6366f1", onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-modal">
        <div className="confirm-title">{title}</div>
        <div className="confirm-body">{body}</div>
        <div className="confirm-actions">
          <button className="btn-back" style={{ flex: 1, textAlign: "center" }} onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, background: confirmColor }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewerHome({ user }) {
  const [view, setView] = useState("home");
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [decision, setDecision] = useState("");
  const [primaryImpact, setPrimaryImpact] = useState("");
  const [secondaryImpact, setSecondaryImpact] = useState("");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [allSuggestions, setAllSuggestions] = useState([]);
  const [deptSuggestions, setDeptSuggestions] = useState([]);
  const [qcdsmt, setQcdsmt] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRating, setShowRating] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  // Confirm dialog state
  const [confirm, setConfirm] = useState(null); // { sug, newStatus, title, body, color }

  // Search states
  const [queueSearch, setQueueSearch] = useState("");
  const [progressSearch, setProgressSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [sugData, qData, oData, deptData] = await Promise.all([
        getSuggestions(user),
        getQCDSMT(),
        getOwners(),
        getDeptSuggestions(user.department),
      ]);
      setAllSuggestions(sugData);
      setQcdsmt(qData);
      setOwners(oData);
      setDeptSuggestions(deptData);
    } catch (err) {
      setLoadError("Failed to load data. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  const today = new Date().toISOString().split("T")[0];
  const newCount = allSuggestions.filter((s) => s.status === "New").length;
  const inProgress = allSuggestions.filter((s) => ["Approved", "Implementing"].includes(s.status));
  const overdueCount = inProgress.filter((s) => s.dueDate && s.dueDate < today).length;

  function openReview(sug) {
    setSelectedSuggestion(sug);
    setDecision("");
    setPrimaryImpact(sug.primaryImpact || "");
    setSecondaryImpact(sug.secondaryImpact || "");
    setOwner(sug.assignedOwner || "");
    setDueDate(sug.dueDate || "");
    setComment(sug.reviewerComment || "");
    setError("");
    setSuccess("");
    setView("review");
  }

  async function handleReview(e) {
    e.preventDefault();
    setError("");

    if (!primaryImpact) { setError("Please select Primary Impact (QCDSMT)"); return; }
    if (!decision) { setError("Please select a decision"); return; }
    if (decision === "Approve" && !owner) { setError("Please assign an owner"); return; }
    if (decision === "Approve" && !dueDate) { setError("Please set a due date"); return; }
    if (decision === "Approve" && dueDate <= today) { setError("Due date must be in the future"); return; }

    setSaving(true);
    try {
      await reviewSuggestion(selectedSuggestion.id, {
        primaryImpact,
        secondaryImpact,
        reviewDecision: decision,
        assignedOwner: owner,
        dueDate: decision === "Approve" ? dueDate : "",
        reviewerComment: comment,
      });
      setSuccess("Review saved! ✅");
      setTimeout(async () => {
        setSuccess("");
        await loadData();
        setView("home");
      }, 1500);
    } catch (err) {
      setError("Failed to save review. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(sug, newStatus, ratingExtras) {
    const extras = {};
    if (newStatus === "Closed") {
      extras.closedDate = today;
      extras.closedBy = user.name;
      if (ratingExtras) {
        extras.impactRating = ratingExtras.impactRating;
        extras.ratingComment = ratingExtras.ratingComment;
      }
    }
    try {
      await updateSuggestionStatus(sug.id, newStatus, extras);
      await loadData();
    } catch (err) {
      // silently fail — data will be stale but not blocking
    }
  }

  function requestStatusChange(sug, newStatus) {
    const labels = {
      Implementing: { title: "Mark as Implementing?", body: `This will move "${sug.id}" to Implementing status, indicating work has begun.`, color: "#8b5cf6", label: "Yes, Mark Implementing" },
      Implemented: { title: "Mark as Implemented?", body: `This confirms "${sug.id}" has been fully implemented. You'll then be able to close and rate it.`, color: "#10b981", label: "Yes, Mark Implemented" },
    };
    const info = labels[newStatus];
    if (info) {
      setConfirm({ sug, newStatus, ...info });
    } else {
      handleStatusChange(sug, newStatus);
    }
  }

  // Filter helpers
  function filterQueue(list) {
    const q = queueSearch.toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      s.id?.toLowerCase().includes(q) ||
      s.problem?.toLowerCase().includes(q) ||
      s.suggestion?.toLowerCase().includes(q) ||
      s.gemba?.toLowerCase().includes(q) ||
      s.employeeName?.toLowerCase().includes(q)
    );
  }

  function filterProgress(list) {
    const q = progressSearch.toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      s.id?.toLowerCase().includes(q) ||
      s.problem?.toLowerCase().includes(q) ||
      s.suggestion?.toLowerCase().includes(q) ||
      s.gemba?.toLowerCase().includes(q) ||
      s.assignedOwner?.toLowerCase().includes(q)
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-list">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
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
          <button className="btn-primary" onClick={() => { setLoading(true); loadData(); }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // --- SUBMIT SUGGESTION ---
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
    const dOverdue = deptSuggestions.filter((s) => s.dueDate && s.dueDate < today && !["Closed", "Implemented", "Rejected"].includes(s.status)).length;

    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <div className="page-title-row">
          <h2 className="page-title">📊 {dept} — Department</h2>
          <button className={"btn-refresh" + (refreshing ? " spinning" : "")} onClick={handleRefresh} title="Refresh">🔄</button>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card"><div className="kpi-icon">📋</div><div className="kpi-value" style={{ color: "#3b82f6" }}>{dTotal}</div><div className="kpi-label">Total</div></div>
          <div className="kpi-card"><div className="kpi-icon">📥</div><div className="kpi-value" style={{ color: "#f59e0b" }}>{dPending}</div><div className="kpi-label">Pending</div></div>
          <div className="kpi-card"><div className="kpi-icon">✅</div><div className="kpi-value" style={{ color: "#10b981" }}>{dApproved}</div><div className="kpi-label">Approved</div></div>
          <div className="kpi-card"><div className="kpi-icon">🎯</div><div className="kpi-value" style={{ color: "#6366f1" }}>{dCompleted}</div><div className="kpi-label">Completed</div></div>
          <div className="kpi-card"><div className="kpi-icon">⭐</div><div className="kpi-value" style={{ color: "#d97706" }}>{dAvgRating}</div><div className="kpi-label">Avg Rating</div></div>
          <div className={"kpi-card" + (dOverdue > 0 ? " kpi-alert" : "")}><div className="kpi-icon">⏰</div><div className="kpi-value" style={{ color: dOverdue > 0 ? "#ef4444" : "#10b981" }}>{dOverdue}</div><div className="kpi-label">Overdue</div></div>
        </div>

        <h3 style={{ margin: "20px 0 12px", fontSize: 16, fontWeight: 600 }}>All Suggestions in {dept} ({dTotal})</h3>

        {dTotal === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><p>No suggestions for this department yet.</p></div>
        ) : (
          <div className="suggestion-list">
            {deptSuggestions.map((s) => (
              <div key={s.id} className="suggestion-card">
                <div className="suggestion-header">
                  <span className="suggestion-id">{s.id}</span>
                  <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>{s.status}</span>
                  {s.primaryImpact && <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact}</span>}
                </div>
                <div className="suggestion-gemba">{s.employeeName} • {s.submittedDate}</div>
                <ExpandableText text={s.problem} label="Problem" />
                <ExpandableText text={s.suggestion} label="Suggestion" />
                {s.reviewerComment && <div className="reviewer-comment"><strong>Reviewer:</strong> {s.reviewerComment}</div>}
                {s.assignedOwner && <div className="text-muted">Owner: {s.assignedOwner} | Due: {s.dueDate || "—"}</div>}
                {s.impactRating > 0 && (
                  <div className="impact-rating-display">
                    <div className="impact-stars">{"★".repeat(s.impactRating)}{"☆".repeat(5 - s.impactRating)}</div>
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

  // --- HOME ---
  if (view === "home") {
    return (
      <div className="page">
        <div className="welcome-card welcome-reviewer">
          <div className="welcome-emoji">📊</div>
          <h2>Welcome {user.name.split(" ")[0]}!</h2>
          <p className="text-muted">Here's what needs your attention</p>
        </div>

        <div className="stats-row">
          <div className="stat-card"><div className="stat-value">{allSuggestions.length}</div><div className="stat-label">Total</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: "#f59e0b" }}>{newCount}</div><div className="stat-label">New</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: "#8b5cf6" }}>{inProgress.length}</div><div className="stat-label">In Progress</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: overdueCount > 0 ? "#ef4444" : "#10b981" }}>{overdueCount}</div><div className="stat-label">Overdue</div></div>
        </div>

        <div className="action-cards">
          <button className="action-card action-submit" onClick={() => setView("submit")}>
            <span className="action-icon">💡</span>
            <span>
              <span className="action-title">Submit Suggestion</span>
              <span className="action-desc">Share your own idea to improve SFL</span>
            </span>
          </button>

          <button className="action-card action-view" onClick={() => setView("my")}>
            <span className="action-icon">📋</span>
            <span>
              <span className="action-title">My Suggestions</span>
              <span className="action-desc">Track your own submitted ideas</span>
            </span>
          </button>

          <button className="action-card action-progress" onClick={() => setView("dept")}>
            <span className="action-icon">🏢</span>
            <span>
              <span className="action-title">My Department</span>
              <span className="action-desc">See all suggestions in {user.department || "your dept"}</span>
            </span>
          </button>

          <button className="action-card action-review" onClick={() => { setQueueSearch(""); setView("queue"); }}>
            <span className="action-icon">📥</span>
            <span>
              <span className="action-title">Review Queue</span>
              <span className="action-desc">{newCount} suggestions awaiting review</span>
            </span>
            {newCount > 0 && <span className="badge-red">{newCount}</span>}
          </button>

          <button className="action-card action-progress" onClick={() => { setProgressSearch(""); setView("progress"); }}>
            <span className="action-icon">⏳</span>
            <span>
              <span className="action-title">In Progress</span>
              <span className="action-desc">{inProgress.length} active, {overdueCount} overdue</span>
            </span>
            {overdueCount > 0 && <span className="badge-red">{overdueCount}</span>}
          </button>
        </div>
      </div>
    );
  }

  // --- REVIEW QUEUE ---
  if (view === "queue") {
    const queue = allSuggestions.filter((s) => s.status === "New");
    const filteredQueue = filterQueue(queue);

    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <div className="page-title-row">
          <h2 className="page-title">📥 Review Queue ({queue.length})</h2>
          <button className={"btn-refresh" + (refreshing ? " spinning" : "")} onClick={handleRefresh} title="Refresh">🔄</button>
        </div>

        {queue.length > 0 && (
          <div className="filter-row">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by employee, gemba, problem..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        {queue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>All caught up! No pending reviews.</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No suggestions match your search.</p>
            <button className="btn-back" onClick={() => setQueueSearch("")}>Clear search</button>
          </div>
        ) : (
          <>
            <p className="results-count">Showing {filteredQueue.length} of {queue.length} suggestions</p>
            <div className="suggestion-list">
              {filteredQueue.map((s) => (
                <div key={s.id} className="suggestion-card suggestion-clickable" onClick={() => openReview(s)}>
                  <div className="suggestion-header">
                    <span className="suggestion-id">{s.id}</span>
                    <span className="status-badge" style={{ background: "#94a3b818", color: "#94a3b8" }}>New</span>
                  </div>
                  <div className="suggestion-gemba">{s.gemba} • {s.employeeName} • {s.submittedDate}</div>
                  <ExpandableText text={s.problem} label="Problem" />
                  <ExpandableText text={s.suggestion} label="Suggestion" />
                  {s.photo && (
                    <div className="suggestion-media">
                      {/\.(mp4|webm|mov)(\?|$)/i.test(s.photo)
                        ? <video src={s.photo} controls onClick={(e) => e.stopPropagation()} />
                        : <img src={s.photo} alt="Attachment" />}
                    </div>
                  )}
                  {s.primaryImpact ? (
                    <div className="employee-qcdsmt-hint">
                      💬 Employee thinks this is: <strong style={{ color: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact} — {QCDSMT_LABELS[s.primaryImpact]}</strong>
                    </div>
                  ) : (
                    <div className="employee-qcdsmt-hint" style={{ color: "#94a3b8" }}>
                      💬 Employee wasn't sure about QCDSMT classification
                    </div>
                  )}
                  <div className="tap-hint">Tap to review →</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // --- MY SUGGESTIONS ---
  if (view === "my") {
    const mine = allSuggestions.filter((s) => s.employeeName === user.name);
    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <div className="page-title-row">
          <h2 className="page-title">📋 My Suggestions ({mine.length})</h2>
          <button className={"btn-refresh" + (refreshing ? " spinning" : "")} onClick={handleRefresh} title="Refresh">🔄</button>
        </div>
        {mine.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>You haven't submitted any suggestions yet.</p>
            <button className="btn-primary" onClick={() => setView("submit")}>Submit One Now</button>
          </div>
        ) : (
          <div className="suggestion-list">
            {mine.map((s) => (
              <div key={s.id} className="suggestion-card">
                <div className="suggestion-header">
                  <span className="suggestion-id">{s.id}</span>
                  <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>{s.status}</span>
                  {s.primaryImpact && <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] || "#6366f1" }}>{s.primaryImpact}</span>}
                </div>
                <div className="suggestion-gemba">{s.gemba} • {s.submittedDate}</div>
                <ExpandableText text={s.problem} label="Problem" />
                <ExpandableText text={s.suggestion} label="Suggestion" />
                {s.reviewerComment && <div className="reviewer-comment"><strong>Reviewer:</strong> {s.reviewerComment}</div>}
                {s.status === "Approved" && s.assignedOwner && (
                  <div className="status-info status-approved">✅ Approved — Assigned to {s.assignedOwner} {s.dueDate ? "(Due: " + s.dueDate + ")" : ""}</div>
                )}
                {s.status === "Rejected" && <div className="status-info status-rejected">❌ Not approved at this time</div>}
                {s.status === "Need Clarification" && <div className="status-info status-clarify">❓ Reviewer needs more information</div>}
                {s.impactRating > 0 && (
                  <div className="impact-rating-display">
                    <div className="impact-stars">{"★".repeat(s.impactRating)}{"☆".repeat(5 - s.impactRating)}</div>
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

  // --- IN PROGRESS ---
  if (view === "progress") {
    const progressItems = allSuggestions.filter((s) =>
      ["Approved", "Implementing", "Implemented"].includes(s.status)
    );
    const filteredProgress = filterProgress(progressItems);

    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <div className="page-title-row">
          <h2 className="page-title">⏳ In Progress ({progressItems.length})</h2>
          <button className={"btn-refresh" + (refreshing ? " spinning" : "")} onClick={handleRefresh} title="Refresh">🔄</button>
        </div>

        {progressItems.length > 0 && (
          <div className="filter-row">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by gemba, owner, suggestion..."
                value={progressSearch}
                onChange={(e) => setProgressSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        {progressItems.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><p>No suggestions in progress.</p></div>
        ) : filteredProgress.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No items match your search.</p>
            <button className="btn-back" onClick={() => setProgressSearch("")}>Clear search</button>
          </div>
        ) : (
          <>
            <p className="results-count">Showing {filteredProgress.length} of {progressItems.length} items</p>
            <div className="suggestion-list">
              {filteredProgress.map((s) => {
                const isOverdue = s.dueDate && s.dueDate < today && s.status !== "Implemented";
                return (
                  <div key={s.id} className={"suggestion-card" + (isOverdue ? " card-overdue" : "")}>
                    <div className="suggestion-header">
                      <span className="suggestion-id">{s.id}</span>
                      <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>
                        {s.status}
                      </span>
                      {isOverdue && <span className="overdue-tag">OVERDUE</span>}
                    </div>
                    <div className="suggestion-gemba">
                      {s.gemba} • {s.assignedOwner} • Due: {s.dueDate || "—"}
                    </div>
                    <ExpandableText text={s.problem} label="Problem" />
                    <ExpandableText text={s.suggestion} label="Suggestion" />
                    {s.primaryImpact && (
                      <div className="qcdsmt-tag">{s.primaryImpact}{s.secondaryImpact ? " / " + s.secondaryImpact : ""}</div>
                    )}
                    {s.actionTaken && (
                      <div className="action-taken"><strong>Action:</strong> {s.actionTaken}</div>
                    )}

                    <div className="status-actions">
                      {s.status === "Approved" && (
                        <button className="btn-sm btn-purple" onClick={() => requestStatusChange(s, "Implementing")}>
                          Mark Implementing
                        </button>
                      )}
                      {s.status === "Implementing" && (
                        <button className="btn-sm btn-green" onClick={() => requestStatusChange(s, "Implemented")}>
                          Mark Implemented
                        </button>
                      )}
                      {s.status === "Implemented" && (
                        <button className="btn-sm btn-dark" onClick={() => { setShowRating(s); setRatingStars(0); setRatingComment(""); }}>
                          Verify & Close
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* CONFIRM MODAL */}
        {confirm && (
          <ConfirmModal
            title={confirm.title}
            body={confirm.body}
            confirmLabel={confirm.label}
            confirmColor={confirm.color}
            onConfirm={async () => {
              await handleStatusChange(confirm.sug, confirm.newStatus);
              setConfirm(null);
            }}
            onCancel={() => setConfirm(null)}
          />
        )}

        {/* RATING MODAL */}
        {showRating && (
          <div className="rating-overlay">
            <div className="rating-modal">
              <h3 className="rating-modal-title">⭐ Rate Impact of {showRating.id}</h3>
              <p className="rating-modal-sub">How much did this suggestion improve operations?</p>

              <div className="rating-info">
                <strong>Gemba:</strong> {showRating.gemba} •
                <strong> QCDSMT:</strong> {showRating.primaryImpact || "—"}
              </div>
              <div className="rating-info" style={{ marginTop: 4 }}>
                <strong>Suggestion:</strong> {showRating.suggestion}
              </div>

              <div className="star-row">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={"star-btn" + (ratingStars >= n ? " star-active" : "")}
                    onClick={() => setRatingStars(n)}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="star-labels">
                <span>Low impact</span>
                <span>High impact</span>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Comment (optional)</label>
                <textarea
                  placeholder="What changed after this was implemented?"
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="form-input form-textarea"
                  maxLength={300}
                />
              </div>

              {ratingStars === 0 && <div className="form-error">Please select a star rating</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="btn-back"
                  style={{ flex: 1, textAlign: "center" }}
                  onClick={() => setShowRating(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={ratingStars === 0}
                  onClick={async () => {
                    await handleStatusChange(showRating, "Closed", {
                      impactRating: ratingStars,
                      ratingComment: ratingComment,
                    });
                    setShowRating(null);
                  }}
                >
                  Close & Save Rating
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- REVIEW FORM ---
  if (view === "review" && selectedSuggestion) {
    const s = selectedSuggestion;
    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("queue")}>← Back to Queue</button>
        <h2 className="page-title">📝 Review {s.id}</h2>

        {success && <div className="alert-success">{success}</div>}

        <div className="review-info-card">
          <div className="review-field">
            <span className="review-label">Employee</span>
            <span className="review-value">{s.employeeName}</span>
          </div>
          <div className="review-field">
            <span className="review-label">Gemba</span>
            <span className="review-value">{s.gemba}</span>
          </div>
          {s.photo && (
            <div className="review-field-full">
              <span className="review-label">Attachment</span>
              <div className="suggestion-media" style={{ marginTop: 6 }}>
                {/\.(mp4|webm|mov)(\?|$)/i.test(s.photo)
                  ? <video src={s.photo} controls />
                  : <img src={s.photo} alt="Attachment" />}
              </div>
            </div>
          )}
          <div className="review-field">
            <span className="review-label">Date</span>
            <span className="review-value">{s.submittedDate}</span>
          </div>
          <div className="review-field-full">
            <span className="review-label">Problem</span>
            <span className="review-value">{s.problem}</span>
          </div>
          <div className="review-field-full">
            <span className="review-label">Suggestion</span>
            <span className="review-value">{s.suggestion}</span>
          </div>
        </div>

        <form onSubmit={handleReview} className="form-card">
          <h3 className="form-section-title">A) QCDSMT Classification</h3>

          {s.primaryImpact ? (
            <div className="employee-choice-banner">
              💬 <strong>{s.employeeName}</strong> classified this as:
              <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact], marginLeft: 6 }}>{s.primaryImpact}</span>
              <strong style={{ color: QCDSMT_COLORS[s.primaryImpact] }}>{QCDSMT_LABELS[s.primaryImpact]}</strong>
              <span style={{ color: "#94a3b8", fontSize: 12 }}> — you can confirm or change below</span>
            </div>
          ) : (
            <div className="employee-choice-banner" style={{ borderColor: "#f59e0b30", background: "#fffbeb" }}>
              ❓ <strong>{s.employeeName}</strong> wasn't sure about the classification — please classify below
            </div>
          )}

          <div className="form-group">
            <label>Primary Impact <span className="required">*</span></label>
            <div className="qcdsmt-grid">
              {[...qcdsmt].sort((a, b) => QCDSMT_ORDER.indexOf(a.code) - QCDSMT_ORDER.indexOf(b.code)).map((q) => (
                <button type="button" key={q.code}
                  className={"qcdsmt-btn" + (primaryImpact === q.code ? " qcdsmt-selected" : "")}
                  onClick={() => setPrimaryImpact(q.code)}
                >
                  <span className="qcdsmt-code">{q.code}</span>
                  <span className="qcdsmt-name">{q.category}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Secondary Impact (optional)</label>
            <div className="qcdsmt-grid">
              <button type="button"
                className={"qcdsmt-btn qcdsmt-none" + (secondaryImpact === "" ? " qcdsmt-selected" : "")}
                onClick={() => setSecondaryImpact("")}
              >None</button>
              {[...qcdsmt].sort((a, b) => QCDSMT_ORDER.indexOf(a.code) - QCDSMT_ORDER.indexOf(b.code)).filter((q) => q.code !== primaryImpact).map((q) => (
                <button type="button" key={q.code}
                  className={"qcdsmt-btn" + (secondaryImpact === q.code ? " qcdsmt-selected" : "")}
                  onClick={() => setSecondaryImpact(q.code)}
                >
                  <span className="qcdsmt-code">{q.code}</span>
                  <span className="qcdsmt-name">{q.category}</span>
                </button>
              ))}
            </div>
          </div>

          <h3 className="form-section-title">B) Decision</h3>

          <div className="form-group">
            <div className="decision-grid">
              {[
                { val: "Approve", icon: "✅", color: "#10b981" },
                { val: "Need Clarification", icon: "❓", color: "#f59e0b" },
                { val: "Reject", icon: "❌", color: "#ef4444" },
              ].map((d) => (
                <button type="button" key={d.val}
                  className="decision-btn"
                  style={{
                    borderColor: decision === d.val ? d.color : "#e2e8f0",
                    background: decision === d.val ? d.color + "10" : "#fff",
                    color: decision === d.val ? d.color : "#64748b",
                  }}
                  onClick={() => setDecision(d.val)}
                >
                  <span style={{ fontSize: 20 }}>{d.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{d.val}</span>
                </button>
              ))}
            </div>
          </div>

          {decision === "Approve" && (
            <>
              <h3 className="form-section-title">C) Assign Owner & Due Date</h3>

              <div className="form-group">
                <label>Assigned Owner <span className="required">*</span></label>
                <select value={owner} onChange={(e) => setOwner(e.target.value)} className="form-input">
                  <option value="">Select owner...</option>
                  {owners.map((o) => (
                    <option key={o.title} value={o.title}>{o.title} ({o.name})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Due Date <span className="required">*</span></label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={today}
                  className="form-input"
                />
              </div>
            </>
          )}

          <h3 className="form-section-title">D) Comment (optional)</h3>

          <div className="form-group">
            <textarea
              placeholder="Add a note about your decision..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="form-input form-textarea"
              maxLength={300}
            />
            <span className={"char-count" + (comment.length > 270 ? " char-count-danger" : comment.length > 240 ? " char-count-warn" : "")}>
              {comment.length}/300
            </span>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary btn-full" disabled={saving}>
            {saving ? "Saving..." : "Save Review"}
          </button>
        </form>
      </div>
    );
  }

  return null;
}

export default ReviewerHome;
