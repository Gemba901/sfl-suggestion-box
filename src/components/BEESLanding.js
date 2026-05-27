import { useState, useEffect, useRef } from 'react';
import './BEESLanding.css';

const PILLARS = [
  {
    id: 'operational',
    name: 'Operational Excellence',
    short: 'Operations',
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.1)',
    description: 'Eliminate bottlenecks, automate repetitive tasks, and maintain quality across every process in your organisation.',
    tools: [
      { name: 'Daily Work Manager', desc: 'Plan and track daily tasks across teams' },
      { name: 'Task & Project Tracker', desc: 'End-to-end project lifecycle management' },
      { name: 'Process Automation', desc: 'No-code workflow automation engine' },
      { name: 'Quality Control System', desc: 'ISO-aligned quality checklists & audits' },
      { name: 'Workflow Builder', desc: 'Drag-and-drop process design studio' },
      { name: 'Meeting Manager', desc: 'Agendas, minutes and action tracking' },
      { name: 'Performance Analytics', desc: 'Real-time operational KPI dashboards' },
    ],
    metrics: [
      { name: 'Process Completion Rate', badge: '94%', type: 'green' },
      { name: 'Automated Workflows Active', badge: '127', type: 'blue' },
      { name: 'Avg. Task Resolution', badge: '1.4d', type: 'yellow' },
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'leadership',
    name: 'Leadership Excellence',
    short: 'Leadership',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    description: 'Empower leaders with the tools to set vision, track goals, develop talent, and make data-driven decisions.',
    tools: [
      { name: 'OKR & Goal Setting', desc: 'Objectives and key results framework' },
      { name: 'Executive Dashboard', desc: 'C-suite intelligence at a glance' },
      { name: 'Leadership Assessment', desc: 'Competency mapping and growth plans' },
      { name: 'Decision Analytics', desc: 'Scenario modelling and risk scoring' },
      { name: 'Mentorship Platform', desc: 'Connect mentors with high-potential talent' },
      { name: 'Board Reports', desc: 'Automated governance and board packs' },
      { name: '360° Performance Reviews', desc: 'Multi-source feedback management' },
    ],
    metrics: [
      { name: 'OKR Achievement Rate', badge: '81%', type: 'green' },
      { name: 'Active Mentorship Pairs', badge: '42', type: 'blue' },
      { name: 'Leadership Score Avg', badge: '8.6', type: 'yellow' },
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="1.8">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'people',
    name: 'People Excellence',
    short: 'People',
    color: '#059669',
    bg: 'rgba(5,150,105,0.1)',
    description: 'Build, develop, and retain a world-class workforce with integrated HR tools that put people first.',
    tools: [
      { name: 'Employee Management', desc: 'Complete employee lifecycle management' },
      { name: 'Leave Management', desc: 'Smart leave requests with auto-approvals' },
      { name: 'Attendance Management', desc: 'Biometric and geo-fenced clock-in' },
      { name: 'Suggestions & Ideas (SIMS)', desc: 'Idea capture, review and recognition' },
      { name: 'Recruitment & Onboarding', desc: 'ATS with digital onboarding journeys' },
      { name: 'Learning & Development', desc: 'Built-in LMS with course builder' },
      { name: 'Benefits Administration', desc: 'Payroll, perks and benefits portal' },
    ],
    metrics: [
      { name: 'Employee Satisfaction', badge: '4.7/5', type: 'green' },
      { name: 'Open Positions Filled', badge: '23', type: 'blue' },
      { name: 'Training Completion', badge: '89%', type: 'yellow' },
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'technology',
    name: 'Technological Excellence',
    short: 'Technology',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.1)',
    description: 'Keep your technology infrastructure secure, efficient, and aligned with your business growth trajectory.',
    tools: [
      { name: 'IT Asset Management', desc: 'Hardware and software asset registry' },
      { name: 'Help Desk & Support', desc: 'Ticketing system with SLA tracking' },
      { name: 'Software License Manager', desc: 'License usage and renewal alerts' },
      { name: 'Cybersecurity Monitor', desc: 'Threat detection and compliance dashboard' },
      { name: 'API Integration Hub', desc: 'Connect all your business tools via API' },
      { name: 'DevOps Pipeline', desc: 'CI/CD management and deployment tracking' },
      { name: 'Cloud Resource Manager', desc: 'Multi-cloud cost and capacity management' },
    ],
    metrics: [
      { name: 'System Uptime', badge: '99.9%', type: 'green' },
      { name: 'Open Support Tickets', badge: '14', type: 'blue' },
      { name: 'Security Score', badge: 'A+', type: 'yellow' },
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="9" y="9" width="6" height="6" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="9" y1="2" x2="9" y2="4" strokeLinecap="round"/>
        <line x1="15" y1="2" x2="15" y2="4" strokeLinecap="round"/>
        <line x1="9" y1="20" x2="9" y2="22" strokeLinecap="round"/>
        <line x1="15" y1="20" x2="15" y2="22" strokeLinecap="round"/>
        <line x1="20" y1="9" x2="22" y2="9" strokeLinecap="round"/>
        <line x1="20" y1="14" x2="22" y2="14" strokeLinecap="round"/>
        <line x1="2" y1="9" x2="4" y2="9" strokeLinecap="round"/>
        <line x1="2" y1="14" x2="4" y2="14" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'strategy',
    name: 'Strategy Excellence',
    short: 'Strategy',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.1)',
    description: 'Translate vision into action with strategic intelligence tools that keep the entire organisation aligned.',
    tools: [
      { name: 'Strategic Planning Suite', desc: 'Vision, mission and roadmap builder' },
      { name: 'Market Intelligence', desc: 'Real-time industry and market data feeds' },
      { name: 'Competitive Analysis', desc: 'Competitor tracking and SWOT mapping' },
      { name: 'KPI Tracking', desc: 'Cascading KPIs from board to frontline' },
      { name: 'Risk Management', desc: 'Risk register, scoring and mitigation plans' },
      { name: 'Innovation Pipeline', desc: 'Idea-to-launch innovation funnel' },
      { name: 'Business Intelligence', desc: 'BI dashboards with predictive analytics' },
    ],
    metrics: [
      { name: 'Strategic Goals On-Track', badge: '76%', type: 'green' },
      { name: 'Risks Identified & Mitigated', badge: '31', type: 'blue' },
      { name: 'Innovation Initiatives', badge: '18', type: 'yellow' },
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'finance',
    name: 'Finance Excellence',
    short: 'Finance',
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.08)',
    description: 'Achieve complete financial clarity with integrated tools that manage every cent from invoice to tax return.',
    tools: [
      { name: 'Accounting & Bookkeeping', desc: 'Double-entry accounting with auto-reconcile' },
      { name: 'Expense Management', desc: 'Receipt capture and expense approvals' },
      { name: 'Payroll Processing', desc: 'Multi-currency, multi-country payroll engine' },
      { name: 'Budget Planning', desc: 'Zero-based and rolling budget management' },
      { name: 'Invoice Management', desc: 'Smart invoicing with payment reminders' },
      { name: 'Financial Reporting', desc: 'P&L, balance sheet and cash flow reports' },
      { name: 'Tax Compliance', desc: 'VAT, PAYE and corporate tax submissions' },
    ],
    metrics: [
      { name: 'Revenue Collected YTD', badge: '+12%', type: 'green' },
      { name: 'Pending Invoices', badge: '7', type: 'blue' },
      { name: 'Budget Variance', badge: '-2.1%', type: 'yellow' },
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="1.8">
        <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const STATS = [
  { value: 6, suffix: '', label: 'Business Pillars', prefix: '' },
  { value: 42, suffix: '+', label: 'Integrated Tools', prefix: '' },
  { value: 98, suffix: '%', label: 'Customer Satisfaction', prefix: '' },
  { value: 3, suffix: 'x', label: 'Faster Operations', prefix: '' },
];

const TESTIMONIALS = [
  {
    text: 'BEES transformed how we operate. What used to take our management team a week to compile is now available in real-time across every pillar.',
    name: 'Amara Diallo',
    role: 'CEO, TechVentures Africa',
    initials: 'AD',
    color: '#0891b2',
  },
  {
    text: "The People Excellence pillar alone saved us over 40 hours per month. From leave requests to performance reviews, everything just works seamlessly.",
    name: 'Sipho Nkosi',
    role: 'HR Director, BuildRight Group',
    initials: 'SN',
    color: '#059669',
  },
  {
    text: 'Having all six pillars under one ecosystem means our strategy actually reaches the frontline. The KPI cascading feature is a game-changer.',
    name: 'Fatima Al-Hassan',
    role: 'COO, Meridian Holdings',
    initials: 'FA',
    color: '#7c3aed',
  },
];

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.querySelectorAll ? [el, ...el.querySelectorAll('.bees-reveal')] : [el];
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); } }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    targets.forEach((t) => { if (t.classList.contains('bees-reveal')) obs.observe(t); });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useCounter(target, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) setStarted(true); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return { count, ref };
}

function StatItem({ value, suffix, prefix, label }) {
  const { count, ref } = useCounter(value);
  return (
    <div className="bees-stat-item" ref={ref}>
      <div className="bees-stat-number">{prefix}{count}{suffix}</div>
      <div className="bees-stat-label">{label}</div>
    </div>
  );
}

const PILLAR_BAR_WIDTHS = ['88%','75%','92%','81%','70%','85%'];

export default function BEESLanding({ onGetStarted }) {
  const [activePillar, setActivePillar] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const heroRef = useReveal();
  const statsRef = useReveal();
  const pillarsRef = useReveal();
  const diveRef = useReveal();
  const howRef = useReveal();
  const testiRef = useReveal();

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const pillar = PILLARS[activePillar];

  return (
    <div className="bees-landing">
      {/* NAV */}
      <nav className={`bees-nav${navScrolled ? ' scrolled' : ''}`}>
        <a href="#top" className="bees-nav-logo">
          <div className="bees-nav-logo-mark">B</div>
          <span className="bees-nav-brand">BEES</span>
        </a>
        <ul className="bees-nav-links">
          <li><a href="#pillars">Pillars</a></li>
          <li><a href="#tools">Tools</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#testimonials">Stories</a></li>
        </ul>
        <div className="bees-nav-cta">
          <button className="bees-btn-ghost" onClick={onGetStarted}>Sign In</button>
          <button className="bees-btn-primary" onClick={onGetStarted}>Get Started</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="bees-hero" id="top" ref={heroRef}>
        <div className="bees-hero-bg">
          <div className="bees-hero-orb bees-hero-orb-1" />
          <div className="bees-hero-orb bees-hero-orb-2" />
          <div className="bees-hero-orb bees-hero-orb-3" />
          <div className="bees-hero-grid" />
        </div>
        <div className="bees-hero-inner">
          <div className="bees-hero-copy">
            <div className="bees-hero-badge">
              <span className="bees-hero-badge-dot" />
              Business Excellence Ecosystem
            </div>
            <h1 className="bees-hero-heading">
              One Ecosystem.<br />
              <span>Six Pillars.</span><br />
              Infinite Growth.
            </h1>
            <p className="bees-hero-sub">
              BEES unifies every dimension of your business — operations, people, finance, technology, strategy and leadership — into a single, intelligent platform built for excellence.
            </p>
            <div className="bees-hero-actions">
              <button className="bees-btn-hero-primary" onClick={onGetStarted}>
                Start Free Trial
              </button>
              <button className="bees-btn-hero-ghost" onClick={onGetStarted}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Watch Demo
              </button>
            </div>
            <div className="bees-hero-trust">
              <div className="bees-hero-avatars">
                {[['#0891b2','AK'],['#059669','SM'],['#7c3aed','TN'],['#d97706','BL']].map(([c,i])=>(
                  <div key={i} className="bees-hero-avatar" style={{background:c}}>{i}</div>
                ))}
              </div>
              <span className="bees-hero-trust-text"><strong>500+</strong> businesses growing with BEES</span>
            </div>
          </div>
          <div className="bees-hero-visual">
            <div className="bees-dashboard-card bees-dashboard-main">
              <div className="bees-dashboard-card-title">Excellence Score by Pillar</div>
              <div className="bees-pillar-bars">
                {PILLARS.map((p, i) => (
                  <div key={p.id} className="bees-pillar-bar-row">
                    <span className="bees-pillar-bar-label">{p.short}</span>
                    <div className="bees-pillar-bar-track">
                      <div className="bees-pillar-bar-fill" style={{
                        background: `linear-gradient(90deg, ${p.color}, ${p.color}99)`,
                        '--target-width': PILLAR_BAR_WIDTHS[i],
                        '--delay': `${0.3 + i * 0.12}s`,
                      }} />
                    </div>
                    <span className="bees-pillar-bar-pct">{PILLAR_BAR_WIDTHS[i]}</span>
                  </div>
                ))}
              </div>
              <div className="bees-stat-row">
                <div className="bees-stat-cell">
                  <div className="bees-stat-cell-value">42+</div>
                  <div className="bees-stat-cell-label">Tools Active</div>
                </div>
                <div className="bees-stat-cell">
                  <div className="bees-stat-cell-value">6</div>
                  <div className="bees-stat-cell-label">Pillars</div>
                </div>
                <div className="bees-stat-cell">
                  <div className="bees-stat-cell-value" style={{color:'#4ade80'}}>↑12%</div>
                  <div className="bees-stat-cell-label">This Month</div>
                </div>
              </div>
            </div>
            <div className="bees-floating-pill bees-pill-1">
              <span className="bees-pill-dot" style={{background:'#4ade80'}} />
              <span>3 new ideas submitted</span>
            </div>
            <div className="bees-floating-pill bees-pill-2">
              <span className="bees-pill-dot" style={{background:'#22d3ee'}} />
              <span>Payroll processed ✓</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bees-stats" ref={statsRef}>
        <div className="bees-stats-inner">
          {STATS.map((s) => (
            <StatItem key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* PILLARS OVERVIEW */}
      <section className="bees-section bees-section-light" id="pillars" ref={pillarsRef}>
        <div className="bees-container">
          <div className="bees-section-header">
            <div className="bees-section-label bees-reveal">The Six Pillars</div>
            <h2 className="bees-section-title bees-reveal bees-reveal-delay-1">
              Every corner of your business,<br />unified under one roof
            </h2>
            <p className="bees-section-sub bees-reveal bees-reveal-delay-2">
              Each pillar is a complete module packed with tools designed to drive excellence in that specific domain — yet all six work together seamlessly.
            </p>
          </div>
          <div className="bees-pillars-grid">
            {PILLARS.map((p, i) => (
              <div
                key={p.id}
                className={`bees-pillar-card bees-reveal bees-reveal-delay-${(i % 3) + 1}`}
                style={{ '--hover-border': p.color }}
                onClick={() => { setActivePillar(i); document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' }); }}
              >
                <div className="bees-pillar-icon" style={{ background: p.bg, color: p.color }}>
                  {p.icon}
                </div>
                <div className="bees-pillar-card-name">{p.name}</div>
                <div className="bees-pillar-card-desc">{p.description}</div>
                <div className="bees-pillar-tools-count" style={{ background: p.bg, color: p.color }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  {p.tools.length} tools included
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PILLAR DEEP DIVE */}
      <section className="bees-section bees-section-white" id="tools" ref={diveRef}>
        <div className="bees-container">
          <div className="bees-section-header">
            <div className="bees-section-label bees-reveal">Explore the Tools</div>
            <h2 className="bees-section-title bees-reveal bees-reveal-delay-1">
              42+ tools across<br />six excellence pillars
            </h2>
          </div>
          <div className="bees-tabs bees-reveal bees-reveal-delay-2">
            {PILLARS.map((p, i) => (
              <button
                key={p.id}
                className={`bees-tab${activePillar === i ? ' active' : ''}`}
                onClick={() => setActivePillar(i)}
                style={activePillar === i ? { color: p.color } : {}}
              >
                {p.short}
              </button>
            ))}
          </div>
          <div className="bees-pillar-content bees-reveal bees-reveal-delay-3">
            <div className="bees-pillar-content-left">
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:pillar.bg, color:pillar.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {pillar.icon}
                </div>
                <span style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', color:pillar.color }}>{pillar.name}</span>
              </div>
              <h3>{pillar.name}</h3>
              <p>{pillar.description}</p>
              <div className="bees-pillar-tools-grid">
                {pillar.tools.map((t) => (
                  <div key={t.name} className="bees-tool-chip">
                    <div className="bees-tool-chip-dot" style={{ background: pillar.color }} />
                    <div>
                      <span style={{ display:'block', fontSize:13, fontWeight:600, color:'#1e293b' }}>{t.name}</span>
                      <span style={{ display:'block', fontSize:11, color:'#64748b', marginTop:2 }}>{t.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bees-pillar-visual">
              <div className="bees-pillar-visual-bg" style={{ background: `radial-gradient(circle at 70% 30%, ${pillar.color}, transparent 60%)` }} />
              <div className="bees-visual-header">
                <span className="bees-visual-title">{pillar.short} Overview</span>
                <span className="bees-visual-status">
                  <span className="bees-visual-status-dot" />
                  Live
                </span>
              </div>
              <div className="bees-metrics-list">
                {pillar.metrics.map((m) => (
                  <div key={m.name} className="bees-metric-row">
                    <span className="bees-metric-name">{m.name}</span>
                    <span className={`bees-metric-badge ${m.type}`}>{m.badge}</span>
                  </div>
                ))}
                <div style={{ padding:'16px', background:'rgba(255,255,255,0.04)', borderRadius:12, marginTop:4 }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'1px' }}>Tool Activity (Last 7 Days)</div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:60 }}>
                    {[40,65,45,80,55,90,70].map((h,i) => (
                      <div key={i} style={{ flex:1, height:`${h}%`, background:`linear-gradient(to top, ${pillar.color}, ${pillar.color}66)`, borderRadius:'4px 4px 0 0', opacity:0.8 }} />
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                    {['M','T','W','T','F','S','S'].map((d,i) => (
                      <span key={i} style={{ fontSize:10, color:'rgba(255,255,255,0.3)', flex:1, textAlign:'center' }}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bees-section bees-section-light" id="how" ref={howRef}>
        <div className="bees-container">
          <div className="bees-section-header" style={{ textAlign:'center', maxWidth:'none' }}>
            <div className="bees-section-label bees-reveal" style={{ textAlign:'center' }}>Simple Onboarding</div>
            <h2 className="bees-section-title bees-reveal bees-reveal-delay-1" style={{ textAlign:'center', maxWidth:'none' }}>
              Up and running in three steps
            </h2>
            <p className="bees-section-sub bees-reveal bees-reveal-delay-2" style={{ textAlign:'center', maxWidth:480, margin:'0 auto' }}>
              No complex implementations. No consultants. Just a streamlined setup that gets your whole business on BEES fast.
            </p>
          </div>
          <div className="bees-steps">
            {[
              { n:'01', title:'Connect Your Organisation', desc:'Add your company structure, departments and teams. Import existing data or start fresh in minutes.' },
              { n:'02', title:'Choose Your Pillars', desc:'Activate the excellence pillars you need. Each pillar auto-configures with sensible defaults for your industry.' },
              { n:'03', title:'Drive Excellence Together', desc:'Invite your team, set your first goals and watch every pillar start generating insights from day one.' },
            ].map((s, i) => (
              <div key={s.n} className={`bees-step bees-reveal bees-reveal-delay-${i+1}`}>
                <div className="bees-step-number">{s.n}</div>
                <div className="bees-step-title">{s.title}</div>
                <div className="bees-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bees-section bees-section-dark" id="testimonials" ref={testiRef}>
        <div className="bees-container">
          <div className="bees-section-header">
            <div className="bees-section-label bees-reveal" style={{ color:'#22d3ee' }}>Customer Stories</div>
            <h2 className="bees-section-title light bees-reveal bees-reveal-delay-1">
              Trusted by businesses<br />building for excellence
            </h2>
            <p className="bees-section-sub light bees-reveal bees-reveal-delay-2">
              From growing startups to established enterprises, BEES delivers measurable impact across every pillar.
            </p>
          </div>
          <div className="bees-testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className={`bees-testi-card bees-reveal bees-reveal-delay-${i+1}`}>
                <div className="bees-testi-stars">
                  {[1,2,3,4,5].map(s => <span key={s} className="bees-star">★</span>)}
                </div>
                <p className="bees-testi-text">"{t.text}"</p>
                <div className="bees-testi-author">
                  <div className="bees-testi-avatar" style={{ background: t.color }}>{t.initials}</div>
                  <div>
                    <div className="bees-testi-name">{t.name}</div>
                    <div className="bees-testi-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bees-cta-section">
        <h2 className="bees-cta-title">Ready to build your<br />Business Excellence Ecosystem?</h2>
        <p className="bees-cta-sub">Join 500+ organisations transforming how they operate, lead and grow.</p>
        <div className="bees-cta-actions">
          <button className="bees-btn-cta-white" onClick={onGetStarted}>Start Free — No Card Required</button>
          <button className="bees-btn-cta-outline" onClick={onGetStarted}>Book a Demo</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bees-footer">
        <div className="bees-footer-inner">
          <div className="bees-footer-brand">
            <div className="bees-nav-logo" style={{ textDecoration:'none' }}>
              <div className="bees-nav-logo-mark">B</div>
              <span className="bees-nav-brand">BEES</span>
            </div>
            <p>Business Excellence Ecosystem — six pillars, one platform, infinite potential for growth.</p>
          </div>
          <div className="bees-footer-col">
            <h4>Pillars</h4>
            <ul>{PILLARS.map(p => <li key={p.id}><a href="#pillars">{p.short}</a></li>)}</ul>
          </div>
          <div className="bees-footer-col">
            <h4>Company</h4>
            <ul>
              {['About Us','Careers','Press','Partners','Contact'].map(l => <li key={l}><a href="#top">{l}</a></li>)}
            </ul>
          </div>
          <div className="bees-footer-col">
            <h4>Legal</h4>
            <ul>
              {['Privacy Policy','Terms of Service','Security','Compliance'].map(l => <li key={l}><a href="#top">{l}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="bees-footer-bottom">
          <p>© {new Date().getFullYear()} BEES — Business Excellence Ecosystem. All rights reserved.</p>
          <p style={{ color:'rgba(255,255,255,0.2)' }}>Built for excellence. Designed for growth.</p>
        </div>
      </footer>
    </div>
  );
}
