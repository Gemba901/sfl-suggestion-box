// src/components/SubmitForm.js
import { useState, useEffect } from "react";
import { getAreas, submitSuggestion } from "../services/data";

function SubmitForm({ user, onBack, onSuccess }) {
  const [area, setArea] = useState("");
  const [problem, setProblem] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [areas, setAreas] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getAreas();
      setAreas(data);
    }
    load();
  }, []);

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

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn-primary btn-full" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Suggestion"}
        </button>
      </form>
    </div>
  );
}

export default SubmitForm;
