// src/components/Dashboard.js
import { useState, useEffect, useCallback } from "react";
import { getSuggestions, getQCDSMT } from "../services/data";
import SubmitForm from "./SubmitForm";

const STATUS_COLORS = {
  New: "#94a3b8", "Under Review": "#6366f1", Approved: "#3b82f6",
  "Need Clarification": "#f59e0b", Rejected: "#ef4444",
  Implementing: "#8b5cf6", Implemented: "#10b981", Closed: "#374151",
};

const QCDSMT_COLORS = {
  Q: "#2563eb", C: "#059669", D: "#d97706", S: "#dc2626", M: "#7c3aed", T: "#0891b2",
};

function Dashboard({ user }) {
  const [tab, setTab] = useState("overview");
  const [showSubmit, setShowSubmit] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState([]);
  const [qcdsmt, setQcdsmt] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sugData, qData] = await Promise.all([
      getSuggestions(user),
      getQCDSMT(),
    ]);
    setAllSuggestions(sugData);
    setQcdsmt(qData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <p>Loading dashboard...</p>
    </div>;
  }

  // --- SUBMIT SUGGESTION ---
  if (showSubmit) {
    return (
      <div className="page">
        <SubmitForm
          user={user}
          onBack={() => setShowSubmit(false)}
          onSuccess={loadData}
        />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const total = allSuggestions.length;
  const newCount = allSuggestions.filter((s) => s.status === "New").length;
  const approved = allSuggestions.filter((s) => ["Approved", "Implementing", "Implemented", "Closed"].includes(s.status)).length;
  const closed = allSuggestions.filter((s) => s.status === "Closed").length;
  const overdue = allSuggestions.filter((s) => s.dueDate && s.dueDate < today && !["Closed", "Implemented", "Rejected"].includes(s.status));
  const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;

  const qcdsmtCounts = qcdsmt.map((q) => ({
    ...q,
    count: allSuggestions.filter((s) => s.primaryImpact === q.code).length,
  }));
  const maxQ = Math.max(...qcdsmtCounts.map((q) => q.count), 1);

  const areaCounts = {};
  allSuggestions.forEach((s) => {
    if (s.area) areaCounts[s.area] = (areaCounts[s.area] || 0) + 1;
  });
  const areaData = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
  const maxA = Math.max(...areaData.map(([, c]) => c), 1);

  const statusCounts = {};
  allSuggestions.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  return (
    <div className="page">
      <div className="welcome-card welcome-management">
        <div className="welcome-emoji">📊</div>
        <h2>Welcome {user.name.split(" ")[0]}!</h2>
        <p className="text-muted">Here's your operations overview</p>
      </div>

      {/* Submit Suggestion Button */}
      <button className="action-card action-submit" onClick={() => setShowSubmit(true)} style={{ marginBottom: 16, width: "100%" }}>
        <span className="action-icon">💡</span>
        <span className="action-title">Submit Suggestion</span>
        <span className="action-desc">Share your own idea to improve SFL</span>
      </button>

      {/* KPI Tiles */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">📋</div>
          <div className="kpi-value" style={{ color: "#3b82f6" }}>{total}</div>
          <div className="kpi-label">Total Suggestions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📥</div>
          <div className="kpi-value" style={{ color: "#f59e0b" }}>{newCount}</div>
          <div className="kpi-label">Pending Review</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">✅</div>
          <div className="kpi-value" style={{ color: "#10b981" }}>{pct(approved, total)}%</div>
          <div className="kpi-label">Approved Rate</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🔒</div>
          <div className="kpi-value" style={{ color: "#374151" }}>{pct(closed, total)}%</div>
          <div className="kpi-label">Closure Rate</div>
        </div>
        <div className={"kpi-card" + (overdue.length > 0 ? " kpi-alert" : "")}>
          <div className="kpi-icon">⏰</div>
          <div className="kpi-value" style={{ color: overdue.length > 0 ? "#ef4444" : "#10b981" }}>{overdue.length}</div>
          <div className="kpi-label">Overdue</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📊</div>
          <div className="kpi-value" style={{ color: "#6366f1" }}>{closed}</div>
          <div className="kpi-label">Closed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { k: "overview", l: "Overview" },
          { k: "qcdsmt", l: "QCDSMT" },
          { k: "areas", l: "By Area" },
          { k: "all", l: "All Suggestions" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={"tab-btn" + (tab === t.k ? " tab-active" : "")}
          >{t.l}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="chart-section">
          <div className="chart-card">
            <h3 className="chart-title">Status Breakdown</h3>
            <div className="status-bars">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="bar-row">
                  <span className="bar-label">{status}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{
                      width: pct(count, total) + "%",
                      background: STATUS_COLORS[status] || "#94a3b8",
                    }} />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {overdue.length > 0 && (
            <div className="chart-card card-overdue">
              <h3 className="chart-title" style={{ color: "#dc2626" }}>🚨 Overdue Items ({overdue.length})</h3>
              {overdue.map((s) => (
                <div key={s.id} className="overdue-item">
                  <div><strong>{s.id}</strong> — {s.suggestion}</div>
                  <div className="text-muted">{s.assignedOwner} • Due: {s.dueDate}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "qcdsmt" && (
        <div className="chart-card">
          <h3 className="chart-title">Suggestions by QCDSMT</h3>
          <p className="chart-subtitle">What types of improvements are being suggested?</p>
          <div className="status-bars">
            {qcdsmtCounts.map((q) => (
              <div key={q.code} className="bar-row">
                <span className="bar-label">
                  <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[q.code] }}>{q.code}</span>
                  {q.category}
                </span>
                <div className="bar-track">
                  <div className="bar-fill" style={{
                    width: (q.count / maxQ * 100) + "%",
                    background: QCDSMT_COLORS[q.code],
                  }} />
                </div>
                <span className="bar-value">{q.count}</span>
              </div>
            ))}
          </div>
          <div className="qcdsmt-summary">
            {qcdsmtCounts.filter((q) => q.count > 0).sort((a, b) => b.count - a.count).map((q) => (
              <div key={q.code} className="qcdsmt-summary-item" style={{ borderColor: QCDSMT_COLORS[q.code] + "30" }}>
                <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[q.code] }}>{q.code}</span>
                <span>{q.category}: <strong>{q.count}</strong> ({pct(q.count, total)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "areas" && (
        <div className="chart-card">
          <h3 className="chart-title">Suggestions by Area</h3>
          <p className="chart-subtitle">Which areas are most active?</p>
          <div className="status-bars">
            {areaData.map(([area, count]) => (
              <div key={area} className="bar-row">
                <span className="bar-label">{area}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{
                    width: (count / maxA * 100) + "%",
                    background: "#6366f1",
                  }} />
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "all" && (
        <div className="suggestion-list">
          {allSuggestions.map((s) => (
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
              <div className="suggestion-area">{s.area} • {s.employeeName} • {s.submittedDate}</div>
              <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
              <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>
              {s.assignedOwner && <div className="text-muted">Owner: {s.assignedOwner} | Due: {s.dueDate || "—"}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
