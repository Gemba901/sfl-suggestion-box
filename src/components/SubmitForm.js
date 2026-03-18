// src/components/SubmitForm.js
import { useState, useEffect } from "react";
import { getAreas, getQCDSMT, submitSuggestion } from "../services/data";

const QCDSMT_COLORS = {
  Q: "#2563eb", C: "#059669", D: "#d97706", S: "#dc2626", M: "#7c3aed", T: "#0891b2",
};

const DRAFT_KEY = (userName) => `sfl_draft_${userName}`;

function charCountClass(len, max) {
  const pct = len / max;
  if (pct >= 0.95) return " char-count-danger";
  if (pct >= 0.80) return " char-count-warn";
  return "";
}

function SubmitForm({ user, onBack, onSuccess }) {
  const [area, setArea] = useState("");
  const [problem, setProblem] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [selectedImpact, setSelectedImpact] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [areas, setAreas] = useState([]);
  const [qcdsmt, setQcdsmt] = useState([]);
  const QCDSMT_ORDER = ["Q", "C", "D", "S", "M", "T"];
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Load areas + QCDSMT, then try to restore draft
  useEffect(() => {
    async function load() {
      const [aData, qData] = await Promise.all([getAreas(), getQCDSMT()]);
      setAreas(aData);
      setQcdsmt(qData);

      // Restore draft from localStorage
      try {
        const saved = localStorage.getItem(DRAFT_KEY(user.name));
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.area) setArea(draft.area);
          if (draft.problem) setProblem(draft.problem);
          if (draft.suggestion) setSuggestion(draft.suggestion);
          if (draft.selectedImpact) setSelectedImpact(draft.selectedImpact);
          if (draft.area || draft.problem || draft.suggestion) {
            setDraftRestored(true);
          }
        }
      } catch (e) {
        // Ignore draft restore errors
      }
    }
    load();
  }, [user.name]);

  // Auto-save draft whenever form changes
  useEffect(() => {
    if (!problem && !suggestion && !area && !selectedImpact) return;
    try {
      localStorage.setItem(DRAFT_KEY(user.name), JSON.stringify({ area, problem, suggestion, selectedImpact }));
    } catch (e) {
      // Ignore storage errors
    }
  }, [area, problem, suggestion, selectedImpact, user.name]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY(user.name));
    } catch (e) {}
  }

  function handleDiscardDraft() {
    clearDraft();
    setArea("");
    setProblem("");
    setSuggestion("");
    setSelectedImpact("");
    setDraftRestored(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!area) { setError("Please select a department"); return; }
    if (problem.trim().length < 10) { setError("Problem must be at least 10 characters"); return; }
    if (suggestion.trim().length < 10) { setError("Suggestion must be at least 10 characters"); return; }
    if (!selectedImpact) { setError("Please select where your suggestion improves, or choose \"I'm not sure\""); return; }

    setSubmitting(true);
    const impact = selectedImpact === "NOT_SURE" ? "" : selectedImpact;
    const result = await submitSuggestion(user, area, problem.trim(), suggestion.trim(), impact);
    setSubmitting(false);

    if (result) {
      clearDraft();
      setArea("");
      setProblem("");
      setSuggestion("");
      setSelectedImpact("");
      setDraftRestored(false);
      setSuccess("Suggestion submitted successfully! 🎉");
      setTimeout(() => {
        setSuccess("");
        if (onSuccess) onSuccess();
        if (onBack) onBack();
      }, 2000);
    } else {
      setError("Failed to submit. Please try again.");
    }
  }

  return (
    <div>
      <button className="btn-back" onClick={onBack}>← Back</button>
      <h2 className="page-title">💡 Submit a Suggestion</h2>

      {/* Draft restored banner */}
      {draftRestored && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#059669",
          padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span>✏️ Draft restored — your previous progress was saved.</span>
          <button
            onClick={handleDiscardDraft}
            style={{ background: "none", border: "none", color: "#059669", fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
          >
            Discard
          </button>
        </div>
      )}

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
          <label>Your Department</label>
          <input type="text" value={user.area || user.department || "Not assigned"} disabled className="form-input form-disabled" />
        </div>

        <div className="form-group">
          <label>Suggestion is about which department? <span className="required">*</span></label>
          <p className="form-hint">Choose the department this suggestion relates to.</p>
          <select value={area} onChange={(e) => setArea(e.target.value)} className="form-input">
            <option value="">Select department...</option>
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
          <span className={"char-count" + charCountClass(problem.length, 500)}>
            {problem.length}/500{problem.length > 400 ? ` — ${500 - problem.length} remaining` : ""}
          </span>
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
          <span className={"char-count" + charCountClass(suggestion.length, 500)}>
            {suggestion.length}/500{suggestion.length > 400 ? ` — ${500 - suggestion.length} remaining` : ""}
          </span>
        </div>

        {/* QCDSMT SELECTOR */}
        <div className="form-group">
          <label>Where does your suggestion improve? <span className="required">*</span></label>
          <p className="form-hint">Select the area your idea impacts most. Not sure? That's okay — just pick "I'm not sure" and the reviewer will classify it.</p>

          <div className="qcdsmt-submit-grid">
            {[...qcdsmt].sort((a, b) => QCDSMT_ORDER.indexOf(a.code) - QCDSMT_ORDER.indexOf(b.code)).map((q) => (
              <button
                type="button"
                key={q.code}
                className={"qcdsmt-submit-btn" + (selectedImpact === q.code ? " qcdsmt-submit-selected" : "")}
                style={{
                  borderColor: selectedImpact === q.code ? QCDSMT_COLORS[q.code] : "#e2e8f0",
                  background: selectedImpact === q.code ? QCDSMT_COLORS[q.code] + "10" : "#fff",
                }}
                onClick={() => setSelectedImpact(q.code)}
              >
                <span className="qcdsmt-submit-code" style={{ color: QCDSMT_COLORS[q.code] }}>{q.code}</span>
                <span className="qcdsmt-submit-name">{q.category}</span>
                <span className="qcdsmt-submit-desc">{q.description}</span>
              </button>
            ))}

            <button
              type="button"
              className={"qcdsmt-submit-btn qcdsmt-notsure" + (selectedImpact === "NOT_SURE" ? " qcdsmt-submit-selected" : "")}
              style={{
                borderColor: selectedImpact === "NOT_SURE" ? "#94a3b8" : "#e2e8f0",
                background: selectedImpact === "NOT_SURE" ? "#94a3b810" : "#fff",
              }}
              onClick={() => setSelectedImpact("NOT_SURE")}
            >
              <span className="qcdsmt-submit-code" style={{ color: "#94a3b8" }}>?</span>
              <span className="qcdsmt-submit-name">I'm not sure</span>
              <span className="qcdsmt-submit-desc">Let the reviewer decide</span>
            </button>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn-primary btn-full" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Suggestion"}
        </button>
      </form>
    </div>
  );
}

export default SubmitForm;
