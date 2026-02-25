// src/components/SubmitForm.js
import { useState, useEffect } from "react";
import { getAreas, getQCDSMT, submitSuggestion } from "../services/data";

const QCDSMT_COLORS = {
  Q: "#2563eb", C: "#059669", D: "#d97706", S: "#dc2626", M: "#7c3aed", T: "#0891b2",
};

function SubmitForm({ user, onBack, onSuccess }) {
  const [area, setArea] = useState("");
  const [problem, setProblem] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [selectedImpact, setSelectedImpact] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [areas, setAreas] = useState([]);
  const [qcdsmt, setQcdsmt] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const [aData, qData] = await Promise.all([getAreas(), getQCDSMT()]);
      setAreas(aData);
      setQcdsmt(qData);
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!area) { setError("Please select an area"); return; }
    if (problem.trim().length < 10) { setError("Problem must be at least 10 characters"); return; }
    if (suggestion.trim().length < 10) { setError("Suggestion must be at least 10 characters"); return; }
    if (!selectedImpact) { setError("Please select where your suggestion improves, or choose \"I'm not sure\""); return; }

    setSubmitting(true);
    const impact = selectedImpact === "NOT_SURE" ? "" : selectedImpact;
    const result = await submitSuggestion(user, area, problem.trim(), suggestion.trim(), impact);
    setSubmitting(false);

    if (result) {
      setArea("");
      setProblem("");
      setSuggestion("");
      setSelectedImpact("");
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

        {/* QCDSMT SELECTOR */}
        <div className="form-group">
          <label>Where does your suggestion improve? <span className="required">*</span></label>
          <p className="form-hint">Select the area your idea impacts most. Not sure? That's okay — just pick "I'm not sure" and the reviewer will classify it.</p>

          <div className="qcdsmt-submit-grid">
            {qcdsmt.map((q) => (
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

            {/* I'M NOT SURE option */}
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
