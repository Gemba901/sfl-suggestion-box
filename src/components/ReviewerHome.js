// src/components/ReviewerHome.js
import { useState, useEffect, useCallback } from "react";
import { getSuggestions, getQCDSMT, getOwners, reviewSuggestion, updateSuggestionStatus } from "../services/data";
import SubmitForm from "./SubmitForm";

const STATUS_COLORS = {
  New: "#94a3b8", "Under Review": "#6366f1", Approved: "#3b82f6",
  "Need Clarification": "#f59e0b", Rejected: "#ef4444",
  Implementing: "#8b5cf6", Implemented: "#10b981", Closed: "#374151",
};

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
  const [qcdsmt, setQcdsmt] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sugData, qData, oData] = await Promise.all([
      getSuggestions(user),
      getQCDSMT(),
      getOwners(),
    ]);
    setAllSuggestions(sugData);
    setQcdsmt(qData);
    setOwners(oData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    await reviewSuggestion(selectedSuggestion.id, {
      primaryImpact,
      secondaryImpact,
      reviewDecision: decision,
      assignedOwner: owner,
      dueDate: decision === "Approve" ? dueDate : "",
      reviewerComment: comment,
    });
    setSaving(false);

    setSuccess("Review saved! ✅");
    setTimeout(async () => {
      setSuccess("");
      await loadData();
      setView("home");
    }, 1500);
  }

  async function handleStatusChange(sug, newStatus) {
    const extras = {};
    if (newStatus === "Closed") {
      extras.closedDate = today;
      extras.closedBy = user.name;
    }
    await updateSuggestionStatus(sug.id, newStatus, extras);
    await loadData();
  }

  if (loading) {
    return <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <p>Loading...</p>
    </div>;
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
          <div className="stat-card">
            <div className="stat-value">{allSuggestions.length}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#f59e0b" }}>{newCount}</div>
            <div className="stat-label">New</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#8b5cf6" }}>{inProgress.length}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: overdueCount > 0 ? "#ef4444" : "#10b981" }}>{overdueCount}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        <div className="action-cards">
          <button className="action-card action-submit" onClick={() => setView("submit")}>
            <span className="action-icon">💡</span>
            <span className="action-title">Submit Suggestion</span>
            <span className="action-desc">Share your own idea to improve SFL</span>
          </button>

          <button className="action-card action-review" onClick={() => setView("queue")}>
            <span className="action-icon">📥</span>
            <span className="action-title">Review Queue</span>
            <span className="action-desc">{newCount} suggestions awaiting review</span>
            {newCount > 0 && <span className="badge-red">{newCount}</span>}
          </button>

          <button className="action-card action-progress" onClick={() => setView("progress")}>
            <span className="action-icon">⏳</span>
            <span className="action-title">In Progress</span>
            <span className="action-desc">{inProgress.length} active, {overdueCount} overdue</span>
            {overdueCount > 0 && <span className="badge-red">{overdueCount}</span>}
          </button>
        </div>
      </div>
    );
  }

  // --- REVIEW QUEUE ---
  if (view === "queue") {
    const queue = allSuggestions.filter((s) => s.status === "New");
    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <h2 className="page-title">📥 Review Queue ({queue.length})</h2>

        {queue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>All caught up! No pending reviews.</p>
          </div>
        ) : (
          <div className="suggestion-list">
            {queue.map((s) => (
              <div key={s.id} className="suggestion-card suggestion-clickable" onClick={() => openReview(s)}>
                <div className="suggestion-header">
                  <span className="suggestion-id">{s.id}</span>
                  <span className="status-badge" style={{ background: "#94a3b818", color: "#94a3b8" }}>New</span>
                </div>
                <div className="suggestion-area">{s.area} • {s.employeeName} • {s.submittedDate}</div>
                <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
                <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>
                <div className="tap-hint">Tap to review →</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- IN PROGRESS ---
  if (view === "progress") {
    const progressList = allSuggestions.filter((s) =>
      ["Approved", "Implementing", "Implemented"].includes(s.status)
    );
    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <h2 className="page-title">⏳ In Progress ({progressList.length})</h2>

        {progressList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No suggestions in progress.</p>
          </div>
        ) : (
          <div className="suggestion-list">
            {progressList.map((s) => {
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
                  <div className="suggestion-area">
                    {s.area} • {s.assignedOwner} • Due: {s.dueDate || "—"}
                  </div>
                  <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
                  <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>
                  {s.primaryImpact && (
                    <div className="qcdsmt-tag">{s.primaryImpact}{s.secondaryImpact ? " / " + s.secondaryImpact : ""}</div>
                  )}
                  {s.actionTaken && (
                    <div className="action-taken"><strong>Action:</strong> {s.actionTaken}</div>
                  )}

                  <div className="status-actions">
                    {s.status === "Approved" && (
                      <button className="btn-sm btn-purple" onClick={() => handleStatusChange(s, "Implementing")}>
                        Mark Implementing
                      </button>
                    )}
                    {s.status === "Implementing" && (
                      <button className="btn-sm btn-green" onClick={() => handleStatusChange(s, "Implemented")}>
                        Mark Implemented
                      </button>
                    )}
                    {s.status === "Implemented" && (
                      <button className="btn-sm btn-dark" onClick={() => handleStatusChange(s, "Closed")}>
                        Verify & Close
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
            <span className="review-label">Area</span>
            <span className="review-value">{s.area}</span>
          </div>
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

          <div className="form-group">
            <label>Primary Impact <span className="required">*</span></label>
            <div className="qcdsmt-grid">
              {qcdsmt.map((q) => (
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
              {qcdsmt.filter((q) => q.code !== primaryImpact).map((q) => (
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
