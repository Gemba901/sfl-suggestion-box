"""
SFL Suggestion Box — Analytics Dashboard Generator
====================================================
Pulls live data from Supabase and generates a fully interactive,
self-contained HTML dashboard using Plotly.

Usage:
    pip install -r requirements.txt
    python analytics.py

Output:
    dashboard.html  — open in any browser, no server needed
"""

import os
import sys
import json
import warnings
from datetime import datetime, timedelta, date
from collections import defaultdict

warnings.filterwarnings("ignore")

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://guqnbwztmpgzyzemgvjh.supabase.co"
SUPABASE_KEY = "sb_publishable__cTdnaq02hEDj9b2PMdfeg_TAXkrqcG"
OUTPUT_FILE  = "dashboard.html"

# ── Colour palette (matches the React app's design system) ───────────────────
STATUS_COLORS = {
    "New":               "#3b82f6",
    "Under Review":      "#f59e0b",
    "Approved":          "#10b981",
    "Rejected":          "#ef4444",
    "Need Clarification":"#f97316",
    "Implementing":      "#8b5cf6",
    "Implemented":       "#06b6d4",
    "Closed":            "#6b7280",
}

QCDSMT_COLORS = {
    "Q": "#3b82f6",   # Quality   — blue
    "C": "#10b981",   # Cost      — green
    "D": "#f59e0b",   # Delivery  — amber
    "S": "#ef4444",   # Safety    — red
    "M": "#8b5cf6",   # Morale    — purple
    "T": "#06b6d4",   # Technology— cyan
}

QCDSMT_LABELS = {
    "Q": "Quality",
    "C": "Cost",
    "D": "Delivery",
    "S": "Safety",
    "M": "Morale",
    "T": "Technology",
}

DARK_BG    = "#0f172a"
CARD_BG    = "#1e293b"
BORDER     = "#334155"
TEXT_PRI   = "#f8fafc"
TEXT_SEC   = "#94a3b8"
ACCENT     = "#6366f1"

# ── Data helpers ──────────────────────────────────────────────────────────────

def fetch_data():
    """Pull all suggestions from Supabase via the PostgREST REST API."""
    try:
        import requests
    except ImportError:
        print("ERROR: requests package not found. Run:  pip install -r requirements.txt")
        sys.exit(1)

    print("Connecting to Supabase …")
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
    }
    url = f"{SUPABASE_URL}/rest/v1/suggestions"
    params = {"select": "*", "order": "submitted_date.asc", "limit": "10000"}

    resp = requests.get(url, headers=headers, params=params, timeout=30)
    if resp.status_code != 200:
        print(f"  WARNING: Supabase returned {resp.status_code}: {resp.text[:200]}")
        return []

    rows = resp.json() or []
    print(f"  Fetched {len(rows)} suggestions.")
    return rows


def demo_data():
    """Synthetic data so the dashboard renders even on an empty DB."""
    import random
    random.seed(42)
    statuses = list(STATUS_COLORS.keys())
    areas    = ["Production", "Logistics", "Quality", "Safety", "HR", "Maintenance"]
    impacts  = list(QCDSMT_COLORS.keys())
    names    = ["Alice", "Bob", "Carlos", "Diana", "Eve", "Frank", "Grace", "Hiro"]
    rows = []
    base = datetime(2024, 1, 1)
    for i in range(120):
        d     = base + timedelta(days=random.randint(0, 440))
        st    = random.choices(statuses, weights=[5,10,30,8,5,15,15,12])[0]
        rows.append({
            "suggestion_id":   f"SUG-{i+1:03d}",
            "employee_name":   random.choice(names),
            "submitted_date":  d.strftime("%Y-%m-%d"),
            "area":            random.choice(areas),
            "status":          st,
            "primary_impact":  random.choice(impacts),
            "secondary_impact":random.choice(impacts + [""]),
            "impact_rating":   random.randint(1, 5) if st in ("Implemented","Closed") else 0,
            "review_decision": "Approve" if st in ("Approved","Implementing","Implemented","Closed") else "",
            "due_date":        (d + timedelta(days=random.randint(7,60))).strftime("%Y-%m-%d") if st != "New" else None,
            "closed_date":     (d + timedelta(days=random.randint(30,120))).strftime("%Y-%m-%d") if st in ("Implemented","Closed") else None,
        })
    return rows


def parse_rows(rows):
    """Normalise raw rows into a list of clean dicts with typed fields."""
    out = []
    for r in rows:
        submitted = r.get("submitted_date") or ""
        try:
            sub_dt = datetime.strptime(submitted, "%Y-%m-%d").date()
        except Exception:
            sub_dt = None

        closed = r.get("closed_date") or ""
        try:
            cls_dt = datetime.strptime(closed, "%Y-%m-%d").date()
        except Exception:
            cls_dt = None

        resolution_days = None
        if sub_dt and cls_dt:
            resolution_days = (cls_dt - sub_dt).days

        out.append({
            "id":             r.get("suggestion_id", ""),
            "employee":       r.get("employee_name", "Unknown"),
            "submitted_date": sub_dt,
            "area":           r.get("area", "Unknown"),
            "status":         r.get("status", "Unknown"),
            "primary":        r.get("primary_impact", "") or "",
            "secondary":      r.get("secondary_impact", "") or "",
            "rating":         int(r.get("impact_rating") or 0),
            "decision":       r.get("review_decision", "") or "",
            "resolution_days":resolution_days,
            "month":          sub_dt.strftime("%Y-%m") if sub_dt else "Unknown",
        })
    return out


# ── Chart builders ────────────────────────────────────────────────────────────

def chart_layout(title, height=320):
    return dict(
        title=dict(text=title, font=dict(size=15, color=TEXT_PRI, family="Inter, system-ui, sans-serif")),
        paper_bgcolor=CARD_BG,
        plot_bgcolor=CARD_BG,
        font=dict(color=TEXT_SEC, family="Inter, system-ui, sans-serif", size=12),
        margin=dict(l=45, r=20, t=48, b=40),
        height=height,
        xaxis=dict(gridcolor=BORDER, zerolinecolor=BORDER, tickfont=dict(color=TEXT_SEC)),
        yaxis=dict(gridcolor=BORDER, zerolinecolor=BORDER, tickfont=dict(color=TEXT_SEC)),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT_SEC)),
        hoverlabel=dict(bgcolor=DARK_BG, font=dict(color=TEXT_PRI)),
    )


def fig_status_donut(data):
    import plotly.graph_objects as go
    counts = defaultdict(int)
    for d in data:
        counts[d["status"]] += 1
    labels = list(counts.keys())
    values = [counts[l] for l in labels]
    colors = [STATUS_COLORS.get(l, "#64748b") for l in labels]

    fig = go.Figure(go.Pie(
        labels=labels, values=values,
        hole=0.55,
        marker=dict(colors=colors, line=dict(color=CARD_BG, width=2)),
        textfont=dict(color=TEXT_PRI, size=11),
        hovertemplate="<b>%{label}</b><br>%{value} suggestions<br>%{percent}<extra></extra>",
    ))
    fig.update_layout(**chart_layout("Suggestions by Status"))
    fig.update_layout(showlegend=True, legend=dict(orientation="v", x=1.02))
    return fig


def fig_monthly_trend(data):
    import plotly.graph_objects as go
    monthly = defaultdict(int)
    for d in data:
        if d["month"] != "Unknown":
            monthly[d["month"]] += 1
    months = sorted(monthly.keys())
    counts = [monthly[m] for m in months]

    # rolling 3-month average
    avg = []
    for i, c in enumerate(counts):
        window = counts[max(0, i-2):i+1]
        avg.append(sum(window)/len(window))

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=months, y=counts, name="Submissions",
        marker_color=ACCENT, opacity=0.7,
        hovertemplate="<b>%{x}</b><br>%{y} submissions<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=months, y=avg, name="3-mo average",
        line=dict(color="#f59e0b", width=2.5, dash="dot"),
        hovertemplate="<b>%{x}</b><br>Avg: %{y:.1f}<extra></extra>",
    ))
    layout = chart_layout("Monthly Submission Trend")
    layout["xaxis"]["tickangle"] = -35
    fig.update_layout(**layout)
    return fig


def fig_qcdsmt(data):
    import plotly.graph_objects as go
    primary   = defaultdict(int)
    secondary = defaultdict(int)
    for d in data:
        if d["primary"]   in QCDSMT_COLORS: primary[d["primary"]]   += 1
        if d["secondary"] in QCDSMT_COLORS: secondary[d["secondary"]] += 1

    codes  = list(QCDSMT_COLORS.keys())
    labels = [QCDSMT_LABELS[c] for c in codes]
    colors = [QCDSMT_COLORS[c] for c in codes]
    pri_vals = [primary.get(c, 0)   for c in codes]
    sec_vals = [secondary.get(c, 0) for c in codes]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        name="Primary Impact", x=labels, y=pri_vals,
        marker_color=colors, opacity=0.9,
        hovertemplate="<b>%{x}</b><br>Primary: %{y}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        name="Secondary Impact", x=labels, y=sec_vals,
        marker_color=colors, opacity=0.4,
        hovertemplate="<b>%{x}</b><br>Secondary: %{y}<extra></extra>",
    ))
    layout = chart_layout("QCDSMT Impact Categories")
    layout["barmode"] = "group"
    fig.update_layout(**layout)
    return fig


def fig_department_bar(data):
    import plotly.graph_objects as go
    dept = defaultdict(int)
    for d in data:
        dept[d["area"]] += 1
    sorted_dept = sorted(dept.items(), key=lambda x: x[1], reverse=True)
    areas  = [x[0] for x in sorted_dept]
    counts = [x[1] for x in sorted_dept]

    # colour scale: lightest → darkest by count
    max_c = max(counts) if counts else 1
    colors = [f"rgba(99,102,241,{0.35 + 0.65*(c/max_c):.2f})" for c in counts]

    fig = go.Figure(go.Bar(
        x=counts, y=areas, orientation="h",
        marker=dict(color=colors, line=dict(color="rgba(0,0,0,0)")),
        text=counts, textposition="outside",
        textfont=dict(color=TEXT_PRI),
        hovertemplate="<b>%{y}</b><br>%{x} suggestions<extra></extra>",
    ))
    layout = chart_layout("Suggestions by Department", height=max(320, len(areas)*42))
    layout.pop("xaxis", None)
    layout.pop("yaxis", None)
    layout["xaxis"] = dict(gridcolor=BORDER, zerolinecolor=BORDER, tickfont=dict(color=TEXT_SEC))
    layout["yaxis"] = dict(gridcolor="rgba(0,0,0,0)", tickfont=dict(color=TEXT_PRI), autorange="reversed")
    fig.update_layout(**layout)
    return fig


def fig_approval_by_dept(data):
    import plotly.graph_objects as go
    dept_total    = defaultdict(int)
    dept_approved = defaultdict(int)
    for d in data:
        dept_total[d["area"]] += 1
        if d["status"] in ("Approved", "Implementing", "Implemented", "Closed"):
            dept_approved[d["area"]] += 1
    depts = sorted(dept_total.keys())
    rates = [round(100 * dept_approved[dep] / dept_total[dep], 1) if dept_total[dep] else 0 for dep in depts]

    colors = [
        "#10b981" if r >= 70 else "#f59e0b" if r >= 40 else "#ef4444"
        for r in rates
    ]
    fig = go.Figure(go.Bar(
        x=depts, y=rates,
        marker=dict(color=colors, line=dict(color="rgba(0,0,0,0)")),
        text=[f"{r}%" for r in rates], textposition="outside",
        textfont=dict(color=TEXT_PRI),
        hovertemplate="<b>%{x}</b><br>Approval rate: %{y}%<extra></extra>",
    ))
    layout = chart_layout("Approval Rate by Department (%)")
    layout["xaxis"]["tickangle"] = -30
    layout["yaxis"]["range"] = [0, 110]
    fig.update_layout(**layout)
    return fig


def fig_rating_histogram(data):
    import plotly.graph_objects as go
    ratings = [d["rating"] for d in data if d["rating"] > 0]
    if not ratings:
        fig = go.Figure()
        fig.update_layout(**chart_layout("Impact Rating Distribution"))
        return fig

    from collections import Counter
    cnt = Counter(ratings)
    stars = [1, 2, 3, 4, 5]
    vals  = [cnt.get(s, 0) for s in stars]
    colors = ["#ef4444","#f97316","#f59e0b","#10b981","#06b6d4"]

    fig = go.Figure(go.Bar(
        x=[f"{'★'*s}" for s in stars],
        y=vals,
        marker_color=colors,
        text=vals, textposition="outside",
        textfont=dict(color=TEXT_PRI),
        hovertemplate="<b>%{x}</b><br>%{y} suggestions<extra></extra>",
    ))
    fig.update_layout(**chart_layout("Impact Rating Distribution"))
    return fig


def fig_top_contributors(data):
    import plotly.graph_objects as go
    emp = defaultdict(int)
    for d in data:
        emp[d["employee"]] += 1
    top = sorted(emp.items(), key=lambda x: x[1], reverse=True)[:10]
    names  = [x[0] for x in top]
    counts = [x[1] for x in top]

    fig = go.Figure(go.Bar(
        x=names, y=counts,
        marker=dict(
            color=counts,
            colorscale=[[0,"#312e81"],[0.5,ACCENT],[1,"#06b6d4"]],
            showscale=False,
            line=dict(color="rgba(0,0,0,0)"),
        ),
        text=counts, textposition="outside",
        textfont=dict(color=TEXT_PRI),
        hovertemplate="<b>%{x}</b><br>%{y} suggestions<extra></extra>",
    ))
    fig.update_layout(**chart_layout("Top 10 Contributors"))
    return fig


def fig_resolution_time(data):
    import plotly.graph_objects as go
    dept_times = defaultdict(list)
    for d in data:
        if d["resolution_days"] is not None and d["resolution_days"] >= 0:
            dept_times[d["area"]].append(d["resolution_days"])

    if not dept_times:
        fig = go.Figure()
        fig.update_layout(**chart_layout("Avg Resolution Time (days)"))
        return fig

    depts = sorted(dept_times.keys(), key=lambda k: sum(dept_times[k])/len(dept_times[k]))
    avgs  = [round(sum(dept_times[d])/len(dept_times[d]), 1) for d in depts]

    fig = go.Figure(go.Bar(
        x=depts, y=avgs,
        marker=dict(
            color=avgs,
            colorscale=[[0,"#10b981"],[0.5,"#f59e0b"],[1,"#ef4444"]],
            showscale=True,
            colorbar=dict(title=dict(text="Days", font=dict(color=TEXT_SEC)), tickfont=dict(color=TEXT_SEC)),
        ),
        text=[f"{a}d" for a in avgs], textposition="outside",
        textfont=dict(color=TEXT_PRI),
        hovertemplate="<b>%{x}</b><br>Avg: %{y} days<extra></extra>",
    ))
    layout = chart_layout("Avg Resolution Time by Department (days)")
    layout["xaxis"]["tickangle"] = -30
    fig.update_layout(**layout)
    return fig


def fig_status_over_time(data):
    """Stacked area chart — cumulative suggestions per status group over time."""
    import plotly.graph_objects as go

    groups = {
        "Open":        ["New", "Under Review", "Need Clarification"],
        "Approved":    ["Approved", "Implementing"],
        "Implemented": ["Implemented", "Closed"],
        "Rejected":    ["Rejected"],
    }
    group_colors = {
        "Open":        "#3b82f6",
        "Approved":    "#10b981",
        "Implemented": "#06b6d4",
        "Rejected":    "#ef4444",
    }

    monthly = defaultdict(lambda: defaultdict(int))
    for d in data:
        if d["month"] == "Unknown":
            continue
        for grp, statuses in groups.items():
            if d["status"] in statuses:
                monthly[d["month"]][grp] += 1

    months = sorted(monthly.keys())
    fig = go.Figure()
    for grp, color in group_colors.items():
        vals = [monthly[m][grp] for m in months]
        fig.add_trace(go.Scatter(
            x=months, y=vals, name=grp,
            stackgroup="one",
            line=dict(color=color, width=1),
            fillcolor=f"rgba({int(color[1:3],16)},{int(color[3:5],16)},{int(color[5:7],16)},0.45)",
            hovertemplate=f"<b>{grp}</b> — %{{x}}<br>%{{y}} suggestions<extra></extra>",
        ))
    layout = chart_layout("Suggestion Flow Over Time (stacked)", height=300)
    layout["xaxis"]["tickangle"] = -35
    fig.update_layout(**layout)
    return fig


# ── KPI computation ───────────────────────────────────────────────────────────

def compute_kpis(data):
    total       = len(data)
    approved    = sum(1 for d in data if d["status"] in ("Approved","Implementing","Implemented","Closed"))
    implemented = sum(1 for d in data if d["status"] in ("Implemented","Closed"))
    rejected    = sum(1 for d in data if d["status"] == "Rejected")
    open_count  = sum(1 for d in data if d["status"] in ("New","Under Review","Need Clarification"))
    ratings     = [d["rating"] for d in data if d["rating"] > 0]
    avg_rating  = round(sum(ratings)/len(ratings), 1) if ratings else 0
    res_times   = [d["resolution_days"] for d in data if d["resolution_days"] is not None]
    avg_res     = round(sum(res_times)/len(res_times), 0) if res_times else 0
    approval_rt = round(100 * approved / total, 1) if total else 0

    return dict(
        total=total,
        open=open_count,
        approved=approved,
        implemented=implemented,
        rejected=rejected,
        avg_rating=avg_rating,
        avg_resolution=int(avg_res),
        approval_rate=approval_rt,
    )


# ── HTML builder ──────────────────────────────────────────────────────────────

def fig_to_div(fig):
    import plotly.io as pio
    return pio.to_html(fig, full_html=False, include_plotlyjs=False, config={"responsive":True, "displayModeBar":False})


def build_html(kpis, figs, generated_at):
    # Convert all figures to div strings
    divs = {name: fig_to_div(fig) for name, fig in figs.items()}

    kpi_cards = [
        ("Total Suggestions",  kpis["total"],          "#6366f1", "📋"),
        ("Open",               kpis["open"],            "#3b82f6", "📂"),
        ("Approved",           kpis["approved"],        "#10b981", "✅"),
        ("Implemented",        kpis["implemented"],     "#06b6d4", "🚀"),
        ("Rejected",           kpis["rejected"],        "#ef4444", "❌"),
        ("Approval Rate",      f"{kpis['approval_rate']}%", "#f59e0b", "📈"),
        ("Avg Rating",         f"{kpis['avg_rating']} ★", "#8b5cf6", "⭐"),
        ("Avg Resolution",     f"{kpis['avg_resolution']}d", "#f97316", "⏱"),
    ]

    kpi_html = ""
    for label, value, color, icon in kpi_cards:
        kpi_html += f"""
        <div class="kpi-card" style="border-top:3px solid {color}">
          <div class="kpi-icon">{icon}</div>
          <div class="kpi-value" style="color:{color}">{value}</div>
          <div class="kpi-label">{label}</div>
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SFL Suggestion Box — Analytics Dashboard</title>
<script src="https://cdn.plot.ly/plotly-2.30.0.min.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  :root {{
    --bg:      {DARK_BG};
    --card:    {CARD_BG};
    --border:  {BORDER};
    --text:    {TEXT_PRI};
    --muted:   {TEXT_SEC};
    --accent:  {ACCENT};
  }}
  html {{ scroll-behavior: smooth; }}
  body {{
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    min-height: 100vh;
  }}

  /* ── Header ── */
  header {{
    background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #1e3a5f 100%);
    border-bottom: 1px solid var(--border);
    padding: 24px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }}
  .header-left h1 {{
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    background: linear-gradient(90deg, #c7d2fe, #a5b4fc, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }}
  .header-left p {{
    color: var(--muted);
    font-size: 12px;
    margin-top: 3px;
  }}
  .header-badge {{
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.35);
    color: #a5b4fc;
    font-size: 11px;
    font-weight: 500;
    padding: 5px 12px;
    border-radius: 20px;
    white-space: nowrap;
  }}

  /* ── Layout ── */
  main {{ padding: 28px 32px; max-width: 1600px; margin: 0 auto; }}

  /* ── KPI Grid ── */
  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: 28px;
  }}
  .kpi-card {{
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 16px 14px;
    text-align: center;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    cursor: default;
  }}
  .kpi-card:hover {{
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }}
  .kpi-icon  {{ font-size: 22px; margin-bottom: 6px; }}
  .kpi-value {{ font-size: 26px; font-weight: 700; line-height: 1; margin-bottom: 6px; }}
  .kpi-label {{ font-size: 11px; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }}

  /* ── Section labels ── */
  .section-title {{
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--muted);
    margin: 28px 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }}
  .section-title::after {{
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }}

  /* ── Chart cards ── */
  .chart-grid {{
    display: grid;
    gap: 16px;
  }}
  .grid-2 {{ grid-template-columns: repeat(2, 1fr); }}
  .grid-3 {{ grid-template-columns: repeat(3, 1fr); }}
  .grid-1 {{ grid-template-columns: 1fr; }}
  @media (max-width: 1100px) {{ .grid-2, .grid-3 {{ grid-template-columns: 1fr; }} }}

  .chart-card {{
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    padding: 4px;
    transition: box-shadow 0.18s ease;
  }}
  .chart-card:hover {{ box-shadow: 0 4px 20px rgba(0,0,0,0.35); }}

  /* ── Footer ── */
  footer {{
    text-align: center;
    color: var(--muted);
    font-size: 11px;
    padding: 24px 32px;
    border-top: 1px solid var(--border);
    margin-top: 32px;
  }}
  footer span {{ color: #6366f1; }}
</style>
</head>
<body>

<header>
  <div class="header-left">
    <h1>SFL Suggestion Box — Analytics Dashboard</h1>
    <p>Real-time insights powered by Supabase &amp; Plotly</p>
  </div>
  <div class="header-badge">Generated {generated_at}</div>
</header>

<main>
  <!-- KPI row -->
  <div class="section-title">Key Performance Indicators</div>
  <div class="kpi-grid">{kpi_html}</div>

  <!-- Row 1: trend + flow -->
  <div class="section-title">Submission Trends</div>
  <div class="chart-grid grid-2">
    <div class="chart-card">{divs['monthly_trend']}</div>
    <div class="chart-card">{divs['status_over_time']}</div>
  </div>

  <!-- Row 2: status donut + QCDSMT -->
  <div class="section-title">Status &amp; Impact Analysis</div>
  <div class="chart-grid grid-2">
    <div class="chart-card">{divs['status_donut']}</div>
    <div class="chart-card">{divs['qcdsmt']}</div>
  </div>

  <!-- Row 3: departments -->
  <div class="section-title">Department Breakdown</div>
  <div class="chart-grid grid-2">
    <div class="chart-card">{divs['dept_bar']}</div>
    <div class="chart-card">{divs['approval_by_dept']}</div>
  </div>

  <!-- Row 4: people + resolution + rating -->
  <div class="section-title">People &amp; Resolution</div>
  <div class="chart-grid grid-3">
    <div class="chart-card">{divs['top_contributors']}</div>
    <div class="chart-card">{divs['resolution_time']}</div>
    <div class="chart-card">{divs['rating_hist']}</div>
  </div>
</main>

<footer>
  Generated by <span>SFL Analytics</span> &nbsp;·&nbsp; {generated_at} &nbsp;·&nbsp;
  Data source: Supabase (live)
</footer>

</body>
</html>"""
    return html


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    try:
        import plotly
    except ImportError:
        print("ERROR: plotly not found. Run:  pip install -r requirements.txt")
        sys.exit(1)
    try:
        import pandas  # noqa — ensure pandas available for future use
    except ImportError:
        pass

    # Fetch or fall back to demo data
    raw = fetch_data()
    if not raw:
        print("  No data found — using demo data so you can preview the dashboard.")
        raw = demo_data()

    data = parse_rows(raw)
    kpis = compute_kpis(data)

    print("Building charts …")
    figs = {
        "status_donut":    fig_status_donut(data),
        "monthly_trend":   fig_monthly_trend(data),
        "qcdsmt":          fig_qcdsmt(data),
        "dept_bar":        fig_department_bar(data),
        "approval_by_dept":fig_approval_by_dept(data),
        "rating_hist":     fig_rating_histogram(data),
        "top_contributors":fig_top_contributors(data),
        "resolution_time": fig_resolution_time(data),
        "status_over_time":fig_status_over_time(data),
    }

    generated_at = datetime.now().strftime("%d %b %Y, %H:%M")
    print("Assembling HTML …")
    html = build_html(kpis, figs, generated_at)

    out_path = os.path.join(os.path.dirname(__file__), OUTPUT_FILE)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n✓  Dashboard saved → {out_path}")
    print("  Open it in any browser — no server required.\n")

    # Try to auto-open in the default browser
    import webbrowser
    try:
        webbrowser.open(f"file://{os.path.abspath(out_path)}")
    except Exception:
        pass


if __name__ == "__main__":
    main()
