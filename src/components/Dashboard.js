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

const DEPT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#0891b2", "#ec4899", "#6366f1", "#14b8a6", "#f97316",
  "#a855f7", "#06b6d4", "#84cc16", "#e11d48", "#7c3aed",
];

function Dashboard({ user }) {
  const [tab, setTab] = useState("overview");
  const [showSubmit, setShowSubmit] = useState(false);
  const [showMine, setShowMine] = useState(false);
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

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 32 }}>⏳</div><p>Loading dashboard...</p>
    </div>;
  }

  // --- MY SUGGESTIONS ---
  if (showMine) {
    const mine = allSuggestions.filter((s) => s.employeeName === user.name);
    return (
      <div className="page">
        <button className="btn-back" onClick={() => setShowMine(false)}>← Back</button>
        <h2 className="page-title">📋 My Suggestions ({mine.length})</h2>
        {mine.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>You haven't submitted any suggestions yet.</p>
            <button className="btn-primary" onClick={() => { setShowMine(false); setShowSubmit(true); }}>Submit One Now</button>
          </div>
        ) : (
          <div className="suggestion-list">
            {mine.map((s) => (
              <div key={s.id} className="suggestion-card">
                <div className="suggestion-header">
                  <span className="suggestion-id">{s.id}</span>
                  <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>{s.status}</span>
                  {s.primaryImpact && (
                    <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact}</span>
                  )}
                  {s.impactRating > 0 && (
                    <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginLeft: "auto" }}>
                      {"★".repeat(s.impactRating)}{"☆".repeat(5 - s.impactRating)}
                    </span>
                  )}
                </div>
                <div className="suggestion-area">{s.area} • {s.submittedDate}</div>
                <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
                <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>
                {s.reviewerComment && <div className="reviewer-comment"><strong>Reviewer:</strong> {s.reviewerComment}</div>}
                {s.impactRating > 0 && (
                  <div className="impact-rating-display">
                    <div className="impact-stars">{"★".repeat(s.impactRating)}{"☆".repeat(5 - s.impactRating)}</div>
                    <div className="impact-label">Impact Rating: {s.impactRating}/5</div>
                    {s.ratingComment && <div className="impact-comment">"{s.ratingComment}"</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- SUBMIT SUGGESTION ---
  if (showSubmit) {
    return (
      <div className="page">
        <SubmitForm user={user} onBack={() => setShowSubmit(false)} onSuccess={loadData} />
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
    ...q, count: allSuggestions.filter((s) => s.primaryImpact === q.code).length,
  }));
  const maxQ = Math.max(...qcdsmtCounts.map((q) => q.count), 1);

  const areaCounts = {};
  allSuggestions.forEach((s) => { if (s.area) areaCounts[s.area] = (areaCounts[s.area] || 0) + 1; });
  const areaData = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
  const maxA = Math.max(...areaData.map(([, c]) => c), 1);

  const statusCounts = {};
  allSuggestions.forEach((s) => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });

  // --- MY DEPARTMENT DATA ---
  const myDept = user.department || user.area || "";
  const deptSuggestions = myDept ? allSuggestions.filter((s) => s.area === myDept) : [];
  const deptTotal = deptSuggestions.length;
  const deptNew = deptSuggestions.filter((s) => s.status === "New").length;
  const deptApproved = deptSuggestions.filter((s) => ["Approved", "Implementing", "Implemented", "Closed"].includes(s.status)).length;
  const deptImplemented = deptSuggestions.filter((s) => s.status === "Implemented" || s.status === "Closed").length;
  const deptOverdue = deptSuggestions.filter((s) => s.dueDate && s.dueDate < today && !["Closed", "Implemented", "Rejected"].includes(s.status));
  const deptStatusCounts = {};
  deptSuggestions.forEach((s) => { deptStatusCounts[s.status] = (deptStatusCounts[s.status] || 0) + 1; });
  const deptQcdsmtCounts = qcdsmt.map((q) => ({ ...q, count: deptSuggestions.filter((s) => s.primaryImpact === q.code).length }));
  const maxDQ = Math.max(...deptQcdsmtCounts.map((q) => q.count), 1);
  const deptRated = deptSuggestions.filter((s) => s.impactRating > 0);
  const deptAvgRating = deptRated.length > 0 ? (deptRated.reduce((sum, s) => sum + s.impactRating, 0) / deptRated.length).toFixed(1) : "—";
  const deptRank = areaData.findIndex(([area]) => area === myDept) + 1;

  return (
    <div className="page">
      <div className="welcome-card welcome-management">
        <div className="welcome-emoji">📊</div>
        <h2>Welcome {user.name.split(" ")[0]}!</h2>
        <p className="text-muted">{myDept ? `${myDept} Department` : "Operations Overview"}</p>
      </div>

      <div className="action-cards" style={{ marginBottom: 16 }}>
        <button className="action-card action-submit" onClick={() => setShowSubmit(true)}>
          <span className="action-icon">💡</span>
          <span className="action-title">Submit Suggestion</span>
          <span className="action-desc">Share your own idea to improve SFL</span>
        </button>
        <button className="action-card action-view" onClick={() => setShowMine(true)}>
          <span className="action-icon">📋</span>
          <span className="action-title">My Suggestions</span>
          <span className="action-desc">Track your own submitted ideas</span>
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-icon">📋</div><div className="kpi-value" style={{ color: "#3b82f6" }}>{total}</div><div className="kpi-label">Total Suggestions</div></div>
        <div className="kpi-card"><div className="kpi-icon">📥</div><div className="kpi-value" style={{ color: "#f59e0b" }}>{newCount}</div><div className="kpi-label">Pending Review</div></div>
        <div className="kpi-card"><div className="kpi-icon">✅</div><div className="kpi-value" style={{ color: "#10b981" }}>{pct(approved, total)}%</div><div className="kpi-label">Approved Rate</div></div>
        <div className="kpi-card"><div className="kpi-icon">🔒</div><div className="kpi-value" style={{ color: "#374151" }}>{pct(closed, total)}%</div><div className="kpi-label">Closure Rate</div></div>
        <div className={"kpi-card" + (overdue.length > 0 ? " kpi-alert" : "")}><div className="kpi-icon">⏰</div><div className="kpi-value" style={{ color: overdue.length > 0 ? "#ef4444" : "#10b981" }}>{overdue.length}</div><div className="kpi-label">Overdue</div></div>
        <div className="kpi-card"><div className="kpi-icon">📊</div><div className="kpi-value" style={{ color: "#6366f1" }}>{closed}</div><div className="kpi-label">Closed</div></div>
      </div>

      <div className="tab-bar">
        {[
          { k: "overview", l: "Overview" },
          ...(myDept ? [{ k: "mydept", l: "My Dept" }] : []),
          { k: "qcdsmt", l: "QCDSMT" },
          { k: "areas", l: "By Area" },
          { k: "all", l: "All Suggestions" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={"tab-btn" + (tab === t.k ? " tab-active" : "")}>{t.l}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="chart-section">
          <div className="chart-card">
            <h3 className="chart-title">📊 Department Comparison</h3>
            <p className="chart-subtitle">Which departments have the most suggestions?</p>
            <div style={{ marginTop: 12 }}>
              {areaData.map(([area, count], i) => {
                const isMyDept = area === myDept;
                const barColor = DEPT_COLORS[i % DEPT_COLORS.length];
                const widthPct = Math.max((count / maxA) * 100, 4);
                return (
                  <div key={area} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 120, fontSize: 12, fontWeight: isMyDept ? 800 : 600, color: isMyDept ? barColor : "inherit", textAlign: "right", flexShrink: 0 }}>
                      {isMyDept ? "★ " : ""}{area}
                    </span>
                    <div style={{ flex: 1, height: 28, borderRadius: 8, overflow: "hidden", background: isMyDept ? barColor + "15" : "var(--bar-track-bg, #f1f5f9)" }}>
                      <div style={{ width: widthPct + "%", height: "100%", borderRadius: 8, background: isMyDept ? `linear-gradient(90deg, ${barColor}, ${barColor}dd)` : barColor + "cc", transition: "width 0.4s", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                        {widthPct > 20 && <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{count}</span>}
                      </div>
                    </div>
                    {widthPct <= 20 && <span style={{ fontSize: 13, fontWeight: 700, width: 30 }}>{count}</span>}
                  </div>
                );
              })}
            </div>
            {myDept && deptRank > 0 && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "var(--dept-rank-bg, #f0f9ff)", fontSize: 13, color: "var(--dept-rank-color, #1e40af)", fontWeight: 600 }}>
                📍 {myDept} is ranked #{deptRank} of {areaData.length} departments with {deptTotal} suggestion{deptTotal !== 1 ? "s" : ""}
              </div>
            )}
          </div>
          <div className="chart-card">
            <h3 className="chart-title">Status Breakdown</h3>
            <div className="status-bars">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="bar-row"><span className="bar-label">{status}</span><div className="bar-track"><div className="bar-fill" style={{ width: pct(count, total) + "%", background: STATUS_COLORS[status] || "#94a3b8" }} /></div><span className="bar-value">{count}</span></div>
              ))}
            </div>
          </div>
          {overdue.length > 0 && (
            <div className="chart-card card-overdue">
              <h3 className="chart-title" style={{ color: "#dc2626" }}>🚨 Overdue Items ({overdue.length})</h3>
              {overdue.map((s) => (<div key={s.id} className="overdue-item"><div><strong>{s.id}</strong> — {s.suggestion}</div><div className="text-muted">{s.assignedOwner} • Due: {s.dueDate}</div></div>))}
            </div>
          )}
        </div>
      )}

      {tab === "mydept" && myDept && (
        <div className="chart-section">
          <div className="chart-card">
            <h3 className="chart-title">🏢 {myDept} — Department Summary</h3>
            <div className="kpi-grid" style={{ marginTop: 12 }}>
              <div className="kpi-card"><div className="kpi-icon">📋</div><div className="kpi-value" style={{ color: "#3b82f6" }}>{deptTotal}</div><div className="kpi-label">Total</div></div>
              <div className="kpi-card"><div className="kpi-icon">📥</div><div className="kpi-value" style={{ color: "#f59e0b" }}>{deptNew}</div><div className="kpi-label">Pending</div></div>
              <div className="kpi-card"><div className="kpi-icon">✅</div><div className="kpi-value" style={{ color: "#10b981" }}>{deptApproved}</div><div className="kpi-label">Approved</div></div>
              <div className="kpi-card"><div className="kpi-icon">🎯</div><div className="kpi-value" style={{ color: "#8b5cf6" }}>{deptImplemented}</div><div className="kpi-label">Completed</div></div>
              <div className="kpi-card"><div className="kpi-icon">⭐</div><div className="kpi-value" style={{ color: "#f59e0b" }}>{deptAvgRating}</div><div className="kpi-label">Avg Rating</div></div>
              <div className={"kpi-card" + (deptOverdue.length > 0 ? " kpi-alert" : "")}><div className="kpi-icon">⏰</div><div className="kpi-value" style={{ color: deptOverdue.length > 0 ? "#ef4444" : "#10b981" }}>{deptOverdue.length}</div><div className="kpi-label">Overdue</div></div>
            </div>
          </div>
          {deptTotal > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Status in {myDept}</h3>
              <div className="status-bars">
                {Object.entries(deptStatusCounts).map(([status, count]) => (
                  <div key={status} className="bar-row"><span className="bar-label">{status}</span><div className="bar-track"><div className="bar-fill" style={{ width: pct(count, deptTotal) + "%", background: STATUS_COLORS[status] || "#94a3b8" }} /></div><span className="bar-value">{count}</span></div>
                ))}
              </div>
            </div>
          )}
          {deptTotal > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">QCDSMT in {myDept}</h3>
              <p className="chart-subtitle">What types of issues are raised in your department?</p>
              <div className="status-bars">
                {deptQcdsmtCounts.filter((q) => q.count > 0).sort((a, b) => b.count - a.count).map((q) => (
                  <div key={q.code} className="bar-row"><span className="bar-label"><span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[q.code] }}>{q.code}</span>{q.category}</span><div className="bar-track"><div className="bar-fill" style={{ width: (q.count / maxDQ * 100) + "%", background: QCDSMT_COLORS[q.code] }} /></div><span className="bar-value">{q.count}</span></div>
                ))}
              </div>
            </div>
          )}
          <div className="chart-card">
            <h3 className="chart-title">All Suggestions in {myDept} ({deptTotal})</h3>
            <div className="suggestion-list" style={{ marginTop: 10 }}>
              {deptSuggestions.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📭</div><p>No suggestions for {myDept} yet</p></div>
              ) : (
                deptSuggestions.map((s) => (
                  <div key={s.id} className="suggestion-card">
                    <div className="suggestion-header">
                      <span className="suggestion-id">{s.id}</span>
                      <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>{s.status}</span>
                      {s.primaryImpact && <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact}</span>}
                      {s.impactRating > 0 && <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginLeft: "auto" }}>{"★".repeat(s.impactRating)}{"☆".repeat(5 - s.impactRating)}</span>}
                    </div>
                    <div className="suggestion-area">{s.employeeName} • {s.submittedDate}</div>
                    <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
                    <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>
                    {s.assignedOwner && <div className="text-muted">Owner: {s.assignedOwner} | Due: {s.dueDate || "—"}</div>}
                    {s.impactRating > 0 && s.ratingComment && <div style={{ marginTop: 6, fontSize: 12, color: "#78350f", fontStyle: "italic" }}>Rating comment: "{s.ratingComment}"</div>}
                  </div>
                ))
              )}
            </div>
          </div>
          {deptOverdue.length > 0 && (
            <div className="chart-card card-overdue">
              <h3 className="chart-title" style={{ color: "#dc2626" }}>🚨 Overdue in {myDept} ({deptOverdue.length})</h3>
              {deptOverdue.map((s) => (<div key={s.id} className="overdue-item"><div><strong>{s.id}</strong> — {s.suggestion}</div><div className="text-muted">{s.assignedOwner} • Due: {s.dueDate}</div></div>))}
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
              <div key={q.code} className="bar-row"><span className="bar-label"><span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[q.code] }}>{q.code}</span>{q.category}</span><div className="bar-track"><div className="bar-fill" style={{ width: (q.count / maxQ * 100) + "%", background: QCDSMT_COLORS[q.code] }} /></div><span className="bar-value">{q.count}</span></div>
            ))}
          </div>
          <div className="qcdsmt-summary">
            {qcdsmtCounts.filter((q) => q.count > 0).sort((a, b) => b.count - a.count).map((q) => (
              <div key={q.code} className="qcdsmt-summary-item" style={{ borderColor: QCDSMT_COLORS[q.code] + "30" }}><span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[q.code] }}>{q.code}</span><span>{q.category}: <strong>{q.count}</strong> ({pct(q.count, total)}%)</span></div>
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
              <div key={area} className="bar-row"><span className="bar-label">{area}</span><div className="bar-track"><div className="bar-fill" style={{ width: (count / maxA * 100) + "%", background: "#6366f1" }} /></div><span className="bar-value">{count}</span></div>
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
                <span className="status-badge" style={{ background: (STATUS_COLORS[s.status] || "#94a3b8") + "18", color: STATUS_COLORS[s.status] || "#94a3b8" }}>{s.status}</span>
                {s.primaryImpact && <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact}</span>}
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
