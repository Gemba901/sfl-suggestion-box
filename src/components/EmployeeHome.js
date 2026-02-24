// src/components/EmployeeHome.js
import { useState, useEffect, useCallback } from "react";
import { getAreas, getSuggestions, submitSuggestion } from "../services/data";

const STATUS_COLORS = {
  New: "#94a3b8", "Under Review": "#6366f1", Approved: "#3b82f6",
  "Need Clarification": "#f59e0b", Rejected: "#ef4444",
  Implementing: "#8b5cf6", Implemented: "#10b981", Closed: "#374151",
};

function EmployeeHome({ user }) {
  const [view, setView] = useState("home");
  const [area, setArea] = useState("");
  const [problem, setProblem] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [areas, setAreas] = useState([]);
  const [mySuggestions, setMySuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [areasData, sugData] = await Promise.all([
      getAreas(),
      getSuggestions(user),
    ]);
    setAreas(areasData);
    setMySuggestions(sugData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!area) { setError("Please select an area"); return; }
    if (problem.trim().length < 10) { setError("Problem must be at least 10 characters"); return; }
    if (suggestion.trim().length < 10) { setError("Suggestion must be at least 10 characters"); return; }

    setSubmitting(true);
    const result = await submitSuggestion(user, area, problem.trim(), suggestion.trim());
    setSubmitting(false);

    if (result) {
      setArea("");
      setProblem("");
      setSuggestion("");
      setSuccess("Suggestion submitted successfully! 🎉");
      setTimeout(() => { setSuccess(""); setView("home"); loadData(); }, 2000);
    } else {
      setError("Failed to submit. Please try again.");
    }
  }

  if (loading) {
    return <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <p>Loading...</p>
    </div>;
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
        </div>
      </div>
    );
  }

  // --- SUBMIT FORM ---
  if (view === "submit") {
    return (
      <div className="page">
        <button className="btn-back" onClick={() => setView("home")}>← Back</button>
        <h2 className="page-title">💡 Submit a Suggestion</h2>

        {success && <div className="alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-group">
            <label>Your Name</label>
            <input type="text" value={user.name} disabled className="form-input form-disabled" />
          </div>

          <div className="form-group">
            <label>Date</label>
            <input type="text" value={new Date().toLocaleDateString()} disabled className="form-input form-disabled" />
          </div>

          <div className="form-group">
            <label>Area <span className="required">*</span></label>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="form-input">
              <option value="">Select area...</option>
              {areas.map((a) => (
                <option key={a.id} value={a.area_name}>{a.area_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Problem <span className="required">*</span></label>
            <textarea
              placeholder="Describe the problem you've noticed (min 10 characters)..."
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="form-input form-textarea"
              maxLength={500}
            />
            <span className="char-count">{problem.length}/500</span>
          </div>

          <div className="form-group">
            <label>My Suggestion <span className="required">*</span></label>
            <textarea
              placeholder="What's your idea to fix this? (min 10 characters)..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              className="form-input form-textarea"
              maxLength={500}
            />
            <span className="char-count">{suggestion.length}/500</span>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary btn-full" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Suggestion"}
          </button>
        </form>
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
              </div>
              <div className="suggestion-area">{s.area} • {s.submittedDate}</div>
              <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
              <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>
              {s.reviewerComment && (
                <div className="reviewer-comment">
                  <strong>Reviewer:</strong> {s.reviewerComment}
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
