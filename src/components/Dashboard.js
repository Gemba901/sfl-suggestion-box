// src/components/Dashboard.js
import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line,
} from "recharts";
import { getSuggestions, getQCDSMT } from "../services/data";
import SubmitForm from "./SubmitForm";

const STATUS_COLORS = {
  New: "#94a3b8",
  "Under Review": "#6366f1",
  Approved: "#3b82f6",
  "Need Clarification": "#f59e0b",
  Rejected: "#ef4444",
  Implementing: "#8b5cf6",
  Implemented: "#10b981",
  Closed: "#374151",
};

const QCDSMT_COLORS = {
  Q: "#2563eb", C: "#059669", D: "#d97706", S: "#dc2626", M: "#7c3aed", T: "#0891b2",
};

const DEPT_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#0891b2","#ec4899","#6366f1","#14b8a6","#f97316",
  "#a855f7","#06b6d4","#84cc16","#e11d48","#7c3aed",
];

const ALL_STATUSES = [
  "New","Under Review","Approved","Need Clarification",
  "Rejected","Implementing","Implemented","Closed",
];

// ─── Dark-mode hook ───────────────────────────────────────────────────────────
function useIsDark() {
  const [isDark, setIsDark] = useState(() => document.body.classList.contains("dark-mode"));
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.body.classList.contains("dark-mode"))
    );
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ─── Chart theme ─────────────────────────────────────────────────────────────
function useChartTheme(isDark) {
  return {
    grid:    isDark ? "#334155" : "#e2e8f0",
    text:    isDark ? "#94a3b8" : "#64748b",
    tipBg:   isDark ? "#0f172a" : "#ffffff",
    tipBorder: isDark ? "#334155" : "#e2e8f0",
  };
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
function computeMonthlyData(suggestions) {
  const map = {};
  suggestions.forEach((s) => {
    if (!s.submittedDate) return;
    const month = s.submittedDate.substring(0, 7);
    if (!map[month]) map[month] = { month, total: 0, approved: 0, rejected: 0 };
    map[month].total++;
    if (["Approved","Implementing","Implemented","Closed"].includes(s.status)) map[month].approved++;
    if (s.status === "Rejected") map[month].rejected++;
  });
  const arr = Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  return arr.map((d, i) => {
    const slice = arr.slice(Math.max(0, i - 2), i + 1);
    return { ...d, avg: parseFloat((slice.reduce((s, x) => s + x.total, 0) / slice.length).toFixed(1)) };
  });
}

function computeApprovalByDept(suggestions) {
  const stats = {};
  suggestions.forEach((s) => {
    if (!s.gemba) return;
    if (!stats[s.gemba]) stats[s.gemba] = { name: s.gemba, total: 0, approved: 0 };
    stats[s.gemba].total++;
    if (["Approved","Implementing","Implemented","Closed"].includes(s.status)) stats[s.gemba].approved++;
  });
  return Object.values(stats)
    .map((d) => ({ ...d, rate: d.total ? Math.round((100 * d.approved) / d.total) : 0 }))
    .sort((a, b) => b.rate - a.rate);
}

function exportToCSV(suggestions) {
  const headers = [
    "ID","Date","Employee","Department","Status",
    "Primary Impact","Secondary Impact","Problem","Suggestion",
    "Assigned Owner","Due Date","Action Taken","Impact Rating","Rating Comment",
    "Closed Date","Closed By",
  ];
  const rows = suggestions.map((s) => [
    s.id||"", s.submittedDate||"", s.employeeName||"", s.gemba||"", s.status||"",
    s.primaryImpact||"", s.secondaryImpact||"",
    `"${(s.problem||"").replace(/"/g,'""')}"`,
    `"${(s.suggestion||"").replace(/"/g,'""')}"`,
    s.assignedOwner||"", s.dueDate||"",
    `"${(s.actionTaken||"").replace(/"/g,'""')}"`,
    s.impactRating||"",
    `"${(s.ratingComment||"").replace(/"/g,'""')}"`,
    s.closedDate||"", s.closedBy||"",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sfl-suggestions-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Shared chart props ───────────────────────────────────────────────────────
function chartProps(theme) {
  return {
    axis: { tick: { fill: theme.text, fontSize: 11 }, axisLine: { stroke: theme.grid }, tickLine: false },
    grid: { stroke: theme.grid, strokeDasharray: "3 3" },
    tip:  { contentStyle: { background: theme.tipBg, border: `1px solid ${theme.tipBorder}`, borderRadius: 10, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,.12)" }, labelStyle: { color: theme.text, fontWeight: 700 } },
    leg:  { wrapperStyle: { fontSize: 12, color: theme.text } },
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div className="skeleton-line skeleton-short" style={{ marginBottom: 0 }} />
        <div className="skeleton-line" style={{ width: 80, marginBottom: 0 }} />
      </div>
      <div className="skeleton-line skeleton-medium" />
      <div className="skeleton-line skeleton-full" />
    </div>
  );
}

// ─── SuggestionCard ───────────────────────────────────────────────────────────
function SuggestionCard({ s }) {
  return (
    <div className="suggestion-card">
      <div className="suggestion-header">
        <span className="suggestion-id">{s.id}</span>
        <span className="status-badge" style={{ background: (STATUS_COLORS[s.status]||"#94a3b8")+"18", color: STATUS_COLORS[s.status]||"#94a3b8" }}>{s.status}</span>
        {s.primaryImpact && <span className="qcdsmt-dot" style={{ background: QCDSMT_COLORS[s.primaryImpact] }}>{s.primaryImpact}</span>}
        {s.impactRating > 0 && <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginLeft: "auto" }}>{"★".repeat(s.impactRating)}{"☆".repeat(5-s.impactRating)}</span>}
      </div>
      <div className="suggestion-gemba">{s.gemba} • {s.employeeName} • {s.submittedDate}</div>
      <div className="suggestion-problem"><strong>Problem:</strong> {s.problem}</div>
      <div className="suggestion-text"><strong>Suggestion:</strong> {s.suggestion}</div>
      {s.assignedOwner && <div className="text-muted">Owner: {s.assignedOwner} | Due: {s.dueDate||"—"}</div>}
      {s.impactRating > 0 && (
        <div className="impact-rating-display">
          <div className="impact-stars">{"★".repeat(s.impactRating)}{"☆".repeat(5-s.impactRating)}</div>
          <div className="impact-label">Impact Rating: {s.impactRating}/5</div>
          {s.ratingComment && <div className="impact-comment">"{s.ratingComment}"</div>}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard({ user }) {
  const [tab, setTab] = useState("overview");
  const [showSubmit, setShowSubmit] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState([]);
  const [qcdsmt, setQcdsmt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [allSearch, setAllSearch] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("All");

  const isDark = useIsDark();
  const theme = useChartTheme(isDark);
  const cp = chartProps(theme);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [sugData, qData] = await Promise.all([getSuggestions(user), getQCDSMT()]);
      setAllSuggestions(sugData);
      setQcdsmt(qData);
    } catch {
      setLoadError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-list">
          <div className="skeleton-card" style={{ height: 100 }}>
            <div className="skeleton-line skeleton-medium" />
            <div className="skeleton-line skeleton-short" />
          </div>
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

  // ── My Suggestions view ────────────────────────────────────────────────────
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
            {mine.map((s) => <SuggestionCard key={s.id} s={s} />)}
          </div>
        )}
      </div>
    );
  }

  if (showSubmit) {
    return (
      <div className="page">
        <SubmitForm user={user} onBack={() => setShowSubmit(false)} onSuccess={loadData} />
      </div>
    );
  }

  // ── Computed data ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const total = allSuggestions.length;
  const newCount = allSuggestions.filter((s) => s.status === "New").length;
  const approved = allSuggestions.filter((s) => ["Approved","Implementing","Implemented","Closed"].includes(s.status)).length;
  const closed = allSuggestions.filter((s) => s.status === "Closed").length;
  const overdue = allSuggestions.filter((s) => s.dueDate && s.dueDate < today && !["Closed","Implemented","Rejected"].includes(s.status));
  const pct = (n, d) => d ? Math.round((n/d)*100) : 0;

  // Status donut
  const statusCounts = {};
  allSuggestions.forEach((s) => { statusCounts[s.status] = (statusCounts[s.status]||0)+1; });
  const donutData = Object.entries(statusCounts).map(([name,value]) => ({ name, value }));

  // QCDSMT grouped bar
  const qcdsmtData = qcdsmt.map((q) => ({
    name: q.category, code: q.code,
    Primary: allSuggestions.filter((s) => s.primaryImpact === q.code).length,
    Secondary: allSuggestions.filter((s) => s.secondaryImpact === q.code).length,
  })).filter((q) => q.Primary > 0 || q.Secondary > 0);

  // Gemba/dept horizontal bar
  const gembaMap = {};
  allSuggestions.forEach((s) => { if (s.gemba) gembaMap[s.gemba] = (gembaMap[s.gemba]||0)+1; });
  const gembaData = Object.entries(gembaMap)
    .sort((a,b) => b[1]-a[1])
    .map(([name,count],i) => ({ name, count, fill: DEPT_COLORS[i%DEPT_COLORS.length] }));

  // Monthly trend with rolling avg
  const monthlyData = computeMonthlyData(allSuggestions);

  // Approval rate by dept
  const approvalRateData = computeApprovalByDept(allSuggestions);

  // My dept
  const myDept = user.department || user.gemba || "";
  const deptSuggestions = myDept ? allSuggestions.filter((s) => s.gemba === myDept) : [];
  const deptTotal = deptSuggestions.length;
  const deptNew = deptSuggestions.filter((s) => s.status === "New").length;
  const deptApproved = deptSuggestions.filter((s) => ["Approved","Implementing","Implemented","Closed"].includes(s.status)).length;
  const deptImplemented = deptSuggestions.filter((s) => ["Implemented","Closed"].includes(s.status)).length;
  const deptOverdue = deptSuggestions.filter((s) => s.dueDate && s.dueDate < today && !["Closed","Implemented","Rejected"].includes(s.status));
  const deptRated = deptSuggestions.filter((s) => s.impactRating > 0);
  const deptAvgRating = deptRated.length > 0 ? (deptRated.reduce((sum,s) => sum+s.impactRating, 0) / deptRated.length).toFixed(1) : "—";
  const deptRank = gembaData.findIndex((a) => a.name === myDept) + 1;
  const deptStatusCounts = {};
  deptSuggestions.forEach((s) => { deptStatusCounts[s.status] = (deptStatusCounts[s.status]||0)+1; });
  const deptDonutData = Object.entries(deptStatusCounts).map(([name,value]) => ({ name, value }));
  const deptQcdsmtData = qcdsmt.map((q) => ({
    name: q.category, code: q.code,
    Primary: deptSuggestions.filter((s) => s.primaryImpact === q.code).length,
  })).filter((q) => q.Primary > 0);

  // Filtered "All" tab
  const filteredAll = allSuggestions.filter((s) => {
    const matchStatus = allStatusFilter === "All" || s.status === allStatusFilter;
    const q = allSearch.toLowerCase();
    const matchSearch = !q || (
      s.id?.toLowerCase().includes(q) ||
      s.gemba?.toLowerCase().includes(q) ||
      s.employeeName?.toLowerCase().includes(q) ||
      s.problem?.toLowerCase().includes(q) ||
      s.suggestion?.toLowerCase().includes(q) ||
      s.assignedOwner?.toLowerCase().includes(q)
    );
    return matchStatus && matchSearch;
  });

  const tabs = [
    { k: "overview", l: "Overview" },
    ...(myDept ? [{ k: "mydept", l: "My Dept" }] : []),
    { k: "qcdsmt", l: "QCDSMT" },
    { k: "gembas", l: "By Gemba" },
    { k: "all", l: "All" },
  ];

  return (
    <div className="page">
      {/* Welcome banner */}
      <div className="welcome-card welcome-management">
        <div className="welcome-emoji">📊</div>
        <h2>Welcome {user.name.split(" ")[0]}!</h2>
        <p className="text-muted">{myDept ? `${myDept} Department` : "Operations Overview"}</p>
      </div>

      {/* Quick actions */}
      <div className="action-cards" style={{ marginBottom: 16 }}>
        <button className="action-card action-submit" onClick={() => setShowSubmit(true)}>
          <span className="action-icon">💡</span>
          <span>
            <span className="action-title">Submit Suggestion</span>
            <span className="action-desc">Share your own idea to improve SFL</span>
          </span>
        </button>
        <button className="action-card action-view" onClick={() => setShowMine(true)}>
          <span className="action-icon">📋</span>
          <span>
            <span className="action-title">My Suggestions</span>
            <span className="action-desc">Track your own submitted ideas</span>
          </span>
        </button>
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-icon">📋</div><div className="kpi-value" style={{ color:"#3b82f6" }}>{total}</div><div className="kpi-label">Total</div></div>
        <div className="kpi-card"><div className="kpi-icon">📥</div><div className="kpi-value" style={{ color:"#f59e0b" }}>{newCount}</div><div className="kpi-label">Pending</div></div>
        <div className="kpi-card"><div className="kpi-icon">✅</div><div className="kpi-value" style={{ color:"#10b981" }}>{pct(approved,total)}%</div><div className="kpi-label">Approved</div></div>
        <div className="kpi-card"><div className="kpi-icon">🔒</div><div className="kpi-value" style={{ color:"#374151" }}>{pct(closed,total)}%</div><div className="kpi-label">Closed</div></div>
        <div className={"kpi-card"+(overdue.length>0?" kpi-alert":"")}><div className="kpi-icon">⏰</div><div className="kpi-value" style={{ color:overdue.length>0?"#ef4444":"#10b981" }}>{overdue.length}</div><div className="kpi-label">Overdue</div></div>
        <div className="kpi-card"><div className="kpi-icon">📊</div><div className="kpi-value" style={{ color:"#6366f1" }}>{closed}</div><div className="kpi-label">Closed</div></div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={"tab-btn"+(tab===t.k?" tab-active":"")}>{t.l}</button>
        ))}
      </div>

      {/* ══════════════ OVERVIEW ══════════════ */}
      {tab === "overview" && (
        <div className="chart-section">
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8, gap:8 }}>
            <button className="btn-export" onClick={() => exportToCSV(allSuggestions)}>⬇ Export CSV</button>
            <button className={"btn-refresh"+(refreshing?" spinning":"")} onClick={handleRefresh} title="Refresh">🔄</button>
          </div>

          {/* Monthly trend */}
          {monthlyData.length > 1 && (
            <div className="chart-card">
              <h3 className="chart-title">📈 Monthly Submission Trend</h3>
              <p className="chart-subtitle">Submissions, approvals, and 3-month rolling average</p>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={monthlyData} margin={{ top:6, right:8, left:-18, bottom:0 }}>
                  <CartesianGrid {...cp.grid} />
                  <XAxis dataKey="month" {...cp.axis} />
                  <YAxis {...cp.axis} allowDecimals={false} />
                  <Tooltip {...cp.tip} />
                  <Legend {...cp.leg} />
                  <Bar dataKey="total" name="Submitted" fill="#6366f1" opacity={0.9} radius={[4,4,0,0]} />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" opacity={0.8} radius={[4,4,0,0]} />
                  <Bar dataKey="rejected" name="Rejected" fill="#ef4444" opacity={0.7} radius={[4,4,0,0]} />
                  <Line type="monotone" dataKey="avg" name="3-mo avg" stroke="#f59e0b" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status donut */}
          <div className="chart-card">
            <h3 className="chart-title">🔵 Status Distribution</h3>
            <p className="chart-subtitle">Where are suggestions currently in the pipeline?</p>
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%" cy="48%"
                  innerRadius="40%" outerRadius="68%"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]||"#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background:theme.tipBg, border:`1px solid ${theme.tipBorder}`, borderRadius:10, fontSize:13 }}
                  formatter={(value, name) => [`${value} (${pct(value,total)}%)`, name]}
                />
                <Legend {...cp.leg} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Department bar */}
          <div className="chart-card">
            <h3 className="chart-title">🏢 Suggestions by Department</h3>
            <p className="chart-subtitle">Which departments are contributing the most ideas?</p>
            <ResponsiveContainer width="100%" height={Math.max(180, gembaData.length * 38)}>
              <BarChart data={gembaData} layout="vertical" margin={{ top:4, right:48, left:4, bottom:0 }}>
                <CartesianGrid {...cp.grid} horizontal={false} />
                <XAxis type="number" {...cp.axis} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} {...cp.axis} />
                <Tooltip {...cp.tip} />
                <Bar dataKey="count" name="Suggestions" radius={[0,6,6,0]} label={{ position:"right", fill:theme.text, fontSize:11, fontWeight:700 }}>
                  {gembaData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {myDept && deptRank > 0 && (
              <div style={{ marginTop:12, padding:"8px 12px", borderRadius:8, background:"var(--dept-rank-bg,#f0f9ff)", fontSize:13, color:"var(--dept-rank-color,#1e40af)", fontWeight:600 }}>
                📍 {myDept} is ranked #{deptRank} of {gembaData.length} departments
              </div>
            )}
          </div>

          {/* Approval rate by dept */}
          {approvalRateData.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">✅ Approval Rate by Department</h3>
              <p className="chart-subtitle">What percentage of suggestions get approved per gemba?</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={approvalRateData} margin={{ top:4, right:8, left:-18, bottom:36 }}>
                  <CartesianGrid {...cp.grid} />
                  <XAxis dataKey="name" {...cp.axis} angle={-30} textAnchor="end" interval={0} />
                  <YAxis {...cp.axis} tickFormatter={(v) => `${v}%`} domain={[0,100]} />
                  <Tooltip {...cp.tip} formatter={(v) => `${v}%`} />
                  <Bar dataKey="rate" name="Approval Rate" radius={[4,4,0,0]} label={{ position:"top", fill:theme.text, fontSize:10, formatter:(v)=>`${v}%` }}>
                    {approvalRateData.map((entry) => (
                      <Cell key={entry.name} fill={entry.rate>=70?"#10b981":entry.rate>=40?"#f59e0b":"#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="chart-card card-overdue">
              <h3 className="chart-title" style={{ color:"#dc2626" }}>🚨 Overdue Items ({overdue.length})</h3>
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

      {/* ══════════════ MY DEPT ══════════════ */}
      {tab === "mydept" && myDept && (
        <div className="chart-section">
          <div className="chart-card">
            <h3 className="chart-title">🏢 {myDept} — Summary</h3>
            <div className="kpi-grid" style={{ marginTop:12 }}>
              <div className="kpi-card"><div className="kpi-icon">📋</div><div className="kpi-value" style={{ color:"#3b82f6" }}>{deptTotal}</div><div className="kpi-label">Total</div></div>
              <div className="kpi-card"><div className="kpi-icon">📥</div><div className="kpi-value" style={{ color:"#f59e0b" }}>{deptNew}</div><div className="kpi-label">Pending</div></div>
              <div className="kpi-card"><div className="kpi-icon">✅</div><div className="kpi-value" style={{ color:"#10b981" }}>{deptApproved}</div><div className="kpi-label">Approved</div></div>
              <div className="kpi-card"><div className="kpi-icon">🎯</div><div className="kpi-value" style={{ color:"#8b5cf6" }}>{deptImplemented}</div><div className="kpi-label">Done</div></div>
              <div className="kpi-card"><div className="kpi-icon">⭐</div><div className="kpi-value" style={{ color:"#f59e0b" }}>{deptAvgRating}</div><div className="kpi-label">Avg Rating</div></div>
              <div className={"kpi-card"+(deptOverdue.length>0?" kpi-alert":"")}><div className="kpi-icon">⏰</div><div className="kpi-value" style={{ color:deptOverdue.length>0?"#ef4444":"#10b981" }}>{deptOverdue.length}</div><div className="kpi-label">Overdue</div></div>
            </div>
          </div>

          {/* Dept status donut */}
          {deptTotal > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Status Breakdown — {myDept}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={deptDonutData}
                    cx="50%" cy="48%"
                    innerRadius="38%" outerRadius="65%"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {deptDonutData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]||"#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background:theme.tipBg, border:`1px solid ${theme.tipBorder}`, borderRadius:10, fontSize:13 }}
                    formatter={(value, name) => [`${value} (${pct(value,deptTotal)}%)`, name]}
                  />
                  <Legend {...cp.leg} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Dept QCDSMT */}
          {deptQcdsmtData.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">QCDSMT — {myDept}</h3>
              <p className="chart-subtitle">Issue types raised in your department</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptQcdsmtData} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                  <CartesianGrid {...cp.grid} />
                  <XAxis dataKey="name" {...cp.axis} />
                  <YAxis {...cp.axis} allowDecimals={false} />
                  <Tooltip {...cp.tip} />
                  <Bar dataKey="Primary" name="Suggestions" radius={[4,4,0,0]}>
                    {deptQcdsmtData.map((entry) => (
                      <Cell key={entry.code} fill={QCDSMT_COLORS[entry.code]||"#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Dept list */}
          <div className="chart-card">
            <h3 className="chart-title">All Suggestions in {myDept} ({deptTotal})</h3>
            <div className="suggestion-list" style={{ marginTop:10 }}>
              {deptSuggestions.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📭</div><p>No suggestions for {myDept} yet</p></div>
              ) : (
                deptSuggestions.map((s) => <SuggestionCard key={s.id} s={s} />)
              )}
            </div>
          </div>

          {deptOverdue.length > 0 && (
            <div className="chart-card card-overdue">
              <h3 className="chart-title" style={{ color:"#dc2626" }}>🚨 Overdue in {myDept} ({deptOverdue.length})</h3>
              {deptOverdue.map((s) => (
                <div key={s.id} className="overdue-item">
                  <div><strong>{s.id}</strong> — {s.suggestion}</div>
                  <div className="text-muted">{s.assignedOwner} • Due: {s.dueDate}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ QCDSMT ══════════════ */}
      {tab === "qcdsmt" && (
        <div className="chart-section">
          <div className="chart-card">
            <h3 className="chart-title">Suggestions by QCDSMT Category</h3>
            <p className="chart-subtitle">Primary and secondary impact breakdown across all suggestions</p>
            {qcdsmtData.length > 0 ? (
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={qcdsmtData} margin={{ top:6, right:8, left:-18, bottom:0 }}>
                  <CartesianGrid {...cp.grid} />
                  <XAxis dataKey="name" {...cp.axis} />
                  <YAxis {...cp.axis} allowDecimals={false} />
                  <Tooltip {...cp.tip} />
                  <Legend {...cp.leg} />
                  <Bar dataKey="Primary" name="Primary Impact" radius={[4,4,0,0]}>
                    {qcdsmtData.map((entry) => (
                      <Cell key={entry.code} fill={QCDSMT_COLORS[entry.code]||"#6366f1"} />
                    ))}
                  </Bar>
                  <Bar dataKey="Secondary" name="Secondary Impact" radius={[4,4,0,0]} opacity={0.45}>
                    {qcdsmtData.map((entry) => (
                      <Cell key={entry.code} fill={QCDSMT_COLORS[entry.code]||"#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-icon">📊</div><p>No QCDSMT data yet</p></div>
            )}
            <div className="qcdsmt-summary">
              {qcdsmt.map((q) => {
                const count = allSuggestions.filter((s) => s.primaryImpact === q.code).length;
                if (!count) return null;
                return (
                  <div key={q.code} className="qcdsmt-summary-item" style={{ borderColor:QCDSMT_COLORS[q.code]+"30" }}>
                    <span className="qcdsmt-dot" style={{ background:QCDSMT_COLORS[q.code] }}>{q.code}</span>
                    <span>{q.category}: <strong>{count}</strong> ({pct(count,total)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ BY AREA ══════════════ */}
      {tab === "gembas" && (
        <div className="chart-section">
          <div className="chart-card">
            <h3 className="chart-title">Suggestions by Gemba</h3>
            <p className="chart-subtitle">Which gembas are most active?</p>
            <ResponsiveContainer width="100%" height={Math.max(200, gembaData.length * 38)}>
              <BarChart data={gembaData} layout="vertical" margin={{ top:4, right:48, left:4, bottom:0 }}>
                <CartesianGrid {...cp.grid} horizontal={false} />
                <XAxis type="number" {...cp.axis} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} {...cp.axis} />
                <Tooltip {...cp.tip} />
                <Bar dataKey="count" name="Suggestions" radius={[0,6,6,0]} label={{ position:"right", fill:theme.text, fontSize:12, fontWeight:700 }}>
                  {gembaData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ══════════════ ALL SUGGESTIONS ══════════════ */}
      {tab === "all" && (
        <div>
          <div className="filter-row" style={{ marginBottom:10 }}>
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by employee, gemba, ID, suggestion..."
                value={allSearch}
                onChange={(e) => setAllSearch(e.target.value)}
              />
            </div>
            <button className="btn-export" onClick={() => exportToCSV(filteredAll)}>⬇ CSV</button>
          </div>
          <div className="status-filter">
            {["All",...ALL_STATUSES].map((s) => (
              <button
                key={s}
                className={"filter-chip"+(allStatusFilter===s?" filter-chip-active":"")}
                onClick={() => setAllStatusFilter(s)}
              >{s}</button>
            ))}
          </div>
          <p className="results-count">Showing {filteredAll.length} of {total} suggestions</p>
          {filteredAll.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>No suggestions match your search.</p>
              <button className="btn-back" onClick={() => { setAllSearch(""); setAllStatusFilter("All"); }}>Clear filters</button>
            </div>
          ) : (
            <div className="suggestion-list">
              {filteredAll.map((s) => <SuggestionCard key={s.id} s={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
