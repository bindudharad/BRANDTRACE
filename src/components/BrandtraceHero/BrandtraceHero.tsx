import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Shield,
  FileText,
  Search,
  CheckCircle,
  Zap,
  ArrowRight,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Database,
  Cpu,
  Eye,
  AlertTriangle,
  History,
  Lock,
  Compass,
  Palette,
  Check,
  Activity,
  GitBranch,
} from 'lucide-react';

import {
  subscribeSystemStatus,
  getCachedSystemStatus,
  probeSystemStatus,
  SystemStatusData,
} from '../../services/environment';

interface BrandtraceHeroProps {
  onEnterWorkspace: () => void;
  onOpenTour?: () => void;
}

export const BrandtraceHero: React.FC<BrandtraceHeroProps> = ({ onEnterWorkspace, onOpenTour }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<number | null>(0);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData>(getCachedSystemStatus);

  useEffect(() => {
    const unsub = subscribeSystemStatus((newStatus) => {
      setSystemStatus(newStatus);
    });
    if (systemStatus.readiness === 'checking') {
      probeSystemStatus();
    }
    return unsub;
  }, []);

  // Connected System Nodes (SVG Diagram)
  const systemNodes = [
    {
      id: 0,
      title: 'BRANDTRACE Core',
      badge: 'GOVERNANCE ENGINE',
      desc: 'Central orchestration engine coordinating deterministic rule matching, fact validation, approval gates, and immutable audit persistence.',
      status: 'Active',
      x: 320,
      y: 200,
      isCore: true,
    },
    {
      id: 1,
      title: 'Brand Constitution',
      badge: 'RULES & GUIDELINES',
      desc: 'Structured repository of active brand terminology, prohibited phrases, required disclaimers, and voice rules with exact source citations.',
      status: 'Available',
      x: 120,
      y: 80,
    },
    {
      id: 2,
      title: 'Claim Ledger & Facts',
      badge: 'TIME-AWARE EVIDENCE',
      desc: 'Verified factual claims ledger with validity timestamps, expiry tracking, source excerpts, and notes field support.',
      status: 'Available',
      x: 520,
      y: 80,
    },
    {
      id: 3,
      title: 'Content Analysis',
      badge: 'MULTI-FORMAT INGEST',
      desc: 'Deterministic pattern matching across plain copy, Markdown, PDF text layers, and structured review drafts.',
      status: 'Available',
      x: 80,
      y: 260,
    },
    {
      id: 4,
      title: 'Visual Compliance',
      badge: 'PALETTE & ASSET REGISTRY',
      desc: 'Pillow CIELAB Delta-E color distance, dominant-color reference ratios, and SHA-256 byte hash verification. Raster OCR and perceptual logo matching are unsupported.',
      status: 'Available (R3)',
      x: 540,
      y: 260,
    },
    {
      id: 5,
      title: 'Human Review & Approval',
      badge: 'APPROVAL GATE',
      desc: 'Strict server-enforced approval gate (HTTP 409) blocking sign-off until all high-risk findings are accepted, edited, or reasoned.',
      status: 'Available',
      x: 180,
      y: 350,
    },
    {
      id: 6,
      title: 'Audit & Impact Tracking',
      badge: 'DEPENDENCY MAPPING',
      desc: 'Append-only audit ledger and dynamic impact map that identifies historical drafts affected by changed or expired facts.',
      status: 'Available (R3)',
      x: 460,
      y: 350,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8F6] text-[#15251E] font-sans selection:bg-[#E9F6F0] selection:text-[#123B2D]">
      {/* 1. TOP ANNOUNCEMENT & SYSTEM STATUS STRIP */}
      <div className="bg-[#123B2D] text-white text-xs py-2 px-4 border-b border-[#0A241B]">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-[#0E9F78] text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
              Demo Mode
            </span>
            <span className="text-[#B3C7BD]">
              Evidence-linked brand governance platform. Local execution with zero cloud lock-in.
            </span>
          </div>
          <div className="flex items-center gap-4 text-[#B3C7BD] text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  systemStatus.readiness === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : systemStatus.readiness === 'ready'
                    ? 'bg-[#0E9F78]'
                    : systemStatus.readiness === 'mismatch'
                    ? 'bg-amber-500'
                    : 'bg-red-400'
                }`}
              />
              {systemStatus.readiness === 'checking'
                ? 'Connecting to backend...'
                : systemStatus.readiness === 'ready'
                ? `FastAPI Online · ${systemStatus.databaseDialect === 'postgresql' ? 'PostgreSQL' : 'SQLite'}`
                : systemStatus.readiness === 'mismatch'
                ? `API Online · ${systemStatus.environmentLabel}`
                : 'Backend Offline'}
            </span>
            <span className="hidden sm:inline text-[#275242]">|</span>
            <span className="hidden sm:inline font-medium text-[#DCE5DF]">
              Environment: {systemStatus.environmentLabel}
            </span>
            <span className="hidden sm:inline text-[#275242]">|</span>
            <span className="hidden sm:inline text-[#A6CDBA]">
              {systemStatus.databaseConnected
                ? `${systemStatus.databaseDialect === 'postgresql' ? 'PostgreSQL' : 'SQLite'} Connected`
                : 'Database Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ENTERPRISE NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#DCE5DF] shadow-[0_1px_3px_rgba(18,59,45,0.03)]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#123B2D] flex items-center justify-center text-white font-black text-lg shadow-sm">
              <Shield size={20} className="text-[#0E9F78]" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#123B2D] block leading-none">
                BRANDTRACE
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#617168] block mt-0.5">
                Brand Governance Platform
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#617168]">
            <a href="#how-it-works" className="hover:text-[#123B2D] transition-colors">
              How It Works
            </a>
            <a href="#platform-modules" className="hover:text-[#123B2D] transition-colors">
              Platform Modules
            </a>
            <a href="#system-architecture" className="hover:text-[#123B2D] transition-colors">
              Architecture
            </a>
            <a href="#evidence-trace" className="hover:text-[#123B2D] transition-colors">
              Evidence Model
            </a>
            <a href="#round3-roadmap" className="hover:text-[#123B2D] transition-colors">
              Round 3 Roadmap
            </a>
          </nav>

          {/* Header Action */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onEnterWorkspace}
              className="btn-primary text-sm shadow-sm"
              aria-label="Open Governance Workspace"
            >
              Open Workspace
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#15251E] hover:bg-[#F0F4F1] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#DCE5DF] bg-white px-4 py-4 space-y-3">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#617168] hover:text-[#123B2D]"
            >
              How It Works
            </a>
            <a
              href="#platform-modules"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#617168] hover:text-[#123B2D]"
            >
              Platform Modules
            </a>
            <a
              href="#system-architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#617168] hover:text-[#123B2D]"
            >
              Architecture
            </a>
            <a
              href="#evidence-trace"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#617168] hover:text-[#123B2D]"
            >
              Evidence Model
            </a>
            <a
              href="#round3-roadmap"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#617168] hover:text-[#123B2D]"
            >
              Round 3 Roadmap
            </a>
            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEnterWorkspace();
                }}
                className="btn-primary w-full justify-center"
              >
                Open Workspace <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION (TWO-COLUMN WITH CONNECTED SYSTEM MAP) */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Brand Governance Messaging */}
            <div className="lg:col-span-6 space-y-6">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E9F6F0] border border-[#A6CDBA] text-[#123B2D] text-xs font-bold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F78]"></span>
                EVIDENCE-LINKED BRAND GOVERNANCE
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold text-[#123B2D] leading-[1.08] tracking-tight">
                Every finding has a source.{' '}
                <span className="text-[#0E9F78]">Every decision has an owner.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-[#617168] leading-relaxed max-w-xl">
                Review brand content before publication against approved guidelines, verified facts and visual rules. Resolve issues with source-linked evidence, preserve reviewer intent and keep an auditable record of every decision.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onEnterWorkspace}
                  className="btn-primary text-base px-6 py-3 min-h-[50px] shadow-md cursor-pointer"
                >
                  Enter the Workspace
                  <ArrowRight size={18} />
                </button>
                {onOpenTour && (
                  <button
                    type="button"
                    onClick={onOpenTour}
                    className="btn-secondary text-base px-6 py-3 min-h-[50px] flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles size={16} className="text-[#0E9F78]" />
                    Take Judge Tour
                  </button>
                )}
                <a
                  href="#how-it-works"
                  className="btn-secondary text-base px-6 py-3 min-h-[50px]"
                >
                  Explore How It Works
                </a>
              </div>

              {/* Trust & Rigor Badges */}
              <div className="pt-6 border-t border-[#DCE5DF] grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-xl font-bold text-[#123B2D]">
                    {systemStatus.readiness === 'ready'
                      ? systemStatus.environmentLabel
                      : systemStatus.readiness === 'checking'
                      ? 'Probing...'
                      : 'Unavailable'}
                  </div>
                  <div className="text-xs text-[#617168] font-medium">Verified Environment</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#0E9F78]">Deterministic</div>
                  <div className="text-xs text-[#617168] font-medium">Rule Engine</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#123B2D]">HTTP 409</div>
                  <div className="text-xs text-[#617168] font-medium">Server Approval Gate</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#0E9F78]">PostgreSQL + SQLite</div>
                  <div className="text-xs text-[#617168] font-medium">Supported Dialects</div>
                </div>
              </div>
            </div>

            {/* Right Column: Connected System Diagram */}
            <div className="lg:col-span-6">
              <div className="bg-white border border-[#DCE5DF] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EBF0EC]">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-[#0E9F78]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#123B2D]">
                      Interactive System Architecture Map
                    </span>
                  </div>
                  <span className="text-[11px] text-[#617168] bg-[#F0F4F1] px-2 py-0.5 rounded font-medium">
                    Click node to inspect
                  </span>
                </div>

                {/* SVG Visual Map */}
                <div className="relative w-full aspect-[640/420] bg-[#F6F8F6] rounded-xl border border-[#EBF0EC] p-2 flex items-center justify-center">
                  <svg
                    viewBox="0 0 640 420"
                    className="w-full h-full"
                    style={{ overflow: 'visible' }}
                    aria-label="BRANDTRACE Architecture Diagram"
                  >
                    {/* Background Connection Grid Lines */}
                    <defs>
                      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#A6CDBA" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#0E9F78" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>

                    {/* Connecting Paths to Center (320, 200) */}
                    <line x1="120" y1="80" x2="320" y2="200" stroke="#A6CDBA" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="520" y1="80" x2="320" y2="200" stroke="#A6CDBA" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="80" y1="260" x2="320" y2="200" stroke="#A6CDBA" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="540" y1="260" x2="320" y2="200" stroke="#A6CDBA" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="180" y1="350" x2="320" y2="200" stroke="#A6CDBA" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="460" y1="350" x2="320" y2="200" stroke="#A6CDBA" strokeWidth="2" strokeDasharray="4 4" />

                    {/* Nodes Render */}
                    {systemNodes.map((node) => {
                      const isSelected = selectedNode === node.id;
                      const isCore = node.isCore;

                      return (
                        <g
                          key={node.id}
                          onClick={() => setSelectedNode(node.id)}
                          className="cursor-pointer transition-transform hover:scale-105"
                          tabIndex={0}
                          role="button"
                          aria-label={`Inspect ${node.title}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setSelectedNode(node.id);
                          }}
                        >
                          {/* Glow pulse on selected or core */}
                          {(isSelected || isCore) && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={isCore ? 54 : 34}
                              fill={isCore ? 'rgba(14, 159, 120, 0.12)' : 'rgba(18, 59, 45, 0.08)'}
                              className="animate-pulse"
                            />
                          )}

                          {/* Outer Circle */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={isCore ? 46 : 28}
                            fill={isCore ? '#123B2D' : '#FFFFFF'}
                            stroke={isSelected ? '#0E9F78' : isCore ? '#0A241B' : '#DCE5DF'}
                            strokeWidth={isSelected ? 3 : 2}
                            filter="drop-shadow(0 2px 4px rgba(18,59,45,0.06))"
                          />

                          {/* Inner Icon or Dot */}
                          {isCore ? (
                            <text
                              x={node.x}
                              y={node.y + 4}
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize="12"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              CORE
                            </text>
                          ) : (
                            <circle cx={node.x} cy={node.y} r={8} fill={isSelected ? '#0E9F78' : '#A6CDBA'} />
                          )}

                          {/* Text Label Below Node */}
                          <text
                            x={node.x}
                            y={node.y + (isCore ? 64 : 42)}
                            textAnchor="middle"
                            fill="#15251E"
                            fontSize="11"
                            fontWeight="600"
                            fontFamily="sans-serif"
                          >
                            {node.title}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Node Detail Box */}
                {selectedNode !== null && (
                  <div className="mt-4 p-4 rounded-xl bg-[#E9F6F0] border border-[#A6CDBA] transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#123B2D] uppercase tracking-wider">
                        {systemNodes[selectedNode].badge}
                      </span>
                      <span className="text-[11px] font-semibold text-[#0E9F78] bg-white px-2 py-0.5 rounded border border-[#A6CDBA]">
                        {systemNodes[selectedNode].status}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#123B2D] mt-1">
                      {systemNodes[selectedNode].title}
                    </div>
                    <p className="text-xs text-[#617168] mt-1 leading-relaxed">
                      {systemNodes[selectedNode].desc}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT PRINCIPLES STRIP */}
      <section className="py-12 bg-white border-y border-[#DCE5DF]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl bg-[#F6F8F6] border border-[#EBF0EC]">
              <div className="w-10 h-10 rounded-lg bg-[#E9F6F0] flex items-center justify-center text-[#123B2D] mb-3">
                <Search size={20} className="text-[#0E9F78]" />
              </div>
              <h3 className="font-bold text-sm text-[#123B2D]">Source-Linked Findings</h3>
              <p className="text-xs text-[#617168] mt-1.5 leading-relaxed">
                Every violation anchors to an exact rule ID, verified fact excerpt, or measured visual property. No phantom claims.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F6F8F6] border border-[#EBF0EC]">
              <div className="w-10 h-10 rounded-lg bg-[#E9F6F0] flex items-center justify-center text-[#123B2D] mb-3">
                <Cpu size={20} className="text-[#0E9F78]" />
              </div>
              <h3 className="font-bold text-sm text-[#123B2D]">Deterministic-First</h3>
              <p className="text-xs text-[#617168] mt-1.5 leading-relaxed">
                Core governance runs with deterministic rules and grounded evidence citations. Unverified claims are flagged for human review.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F6F8F6] border border-[#EBF0EC]">
              <div className="w-10 h-10 rounded-lg bg-[#E9F6F0] flex items-center justify-center text-[#123B2D] mb-3">
                <CheckCircle size={20} className="text-[#0E9F78]" />
              </div>
              <h3 className="font-bold text-sm text-[#123B2D]">Human-Gated Approvals</h3>
              <p className="text-xs text-[#617168] mt-1.5 leading-relaxed">
                High-risk violations physically block approval on the server (HTTP 409). Waivers and dismissals require documented reasons.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F6F8F6] border border-[#EBF0EC]">
              <div className="w-10 h-10 rounded-lg bg-[#E9F6F0] flex items-center justify-center text-[#123B2D] mb-3">
                <History size={20} className="text-[#0E9F78]" />
              </div>
              <h3 className="font-bold text-sm text-[#123B2D]">Immutable Version History</h3>
              <p className="text-xs text-[#617168] mt-1.5 leading-relaxed">
                Every text edit, restored draft, and governance action is permanently captured in point-in-time review versions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "HOW BRANDTRACE WORKS" — 6-STEP CONNECTED WORKFLOW */}
      <section id="how-it-works" className="py-20 md:py-28 bg-[#F6F8F6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#0E9F78] uppercase tracking-wider mb-2">
              End-to-End Governance Lifecycle
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123B2D]">
              How BRANDTRACE Works
            </h2>
            <p className="text-sm sm:text-base text-[#617168] mt-3">
              A transparent, six-step journey from raw creative draft to auditable, published brand communication.
            </p>
          </div>

          {/* 6 Connected Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {[
              {
                num: '01',
                title: 'Define Brand Constitution',
                icon: Shield,
                category: 'INPUT',
                desc: 'Configure approved terminology, prohibited superlatives, required disclaimers, and time-aware factual claims.',
                io: 'Rules & Facts DB',
              },
              {
                num: '02',
                title: 'Submit Content Draft',
                icon: FileText,
                category: 'INGEST',
                desc: 'Authors submit marketing copy, announcements, document drafts (PDF/TXT), or visual graphics via workspace.',
                io: 'Draft Content & Files',
              },
              {
                num: '03',
                title: 'Run Deterministic Analysis',
                icon: Search,
                category: 'ENGINE',
                desc: 'Pattern matcher scans exact passages; claim ledger verifies citations; color science evaluates WCAG and palettes.',
                io: 'Deterministic Evaluation',
              },
              {
                num: '04',
                title: 'Inspect Source Findings',
                icon: Eye,
                category: 'AUDIT',
                desc: 'Review cards display severity (CRITICAL/HIGH/MEDIUM/LOW), cited rule ID, exact matched quote, and source excerpt.',
                io: 'Structured Findings',
              },
              {
                num: '05',
                title: 'Resolve with Precision',
                icon: Zap,
                category: 'DECISION',
                desc: 'Accept neutral suggested corrections, perform manual edits, dismiss with a documented reason, or escalate to brand admin.',
                io: 'Versioned Revisions',
              },
              {
                num: '06',
                title: 'Approval Gate & Impact Map',
                icon: Lock,
                category: 'GOVERNANCE',
                desc: 'Server verifies all high-risk items are resolved before granting approval. Audit history and rule-change impact tracking preserved.',
                io: 'Audit Log & Sign-Off',
              },
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="bg-white border border-[#DCE5DF] rounded-xl p-6 shadow-sm hover:border-[#0E9F78] transition-all relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black text-[#0E9F78] bg-[#E9F6F0] px-2.5 py-1 rounded">
                        STEP {step.num}
                      </span>
                      <span className="text-[11px] font-semibold text-[#617168] uppercase tracking-wider">
                        {step.category}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-[#F0F4F1] flex items-center justify-center text-[#123B2D] mb-4">
                      <Icon size={20} className="text-[#123B2D]" />
                    </div>
                    <h3 className="text-base font-bold text-[#123B2D] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#617168] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#EBF0EC] flex items-center justify-between text-[11px] text-[#617168]">
                    <span className="font-medium">Data Artifact:</span>
                    <span className="font-semibold text-[#123B2D]">{step.io}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. CONNECTED PLATFORM MODULES SECTION */}
      <section id="platform-modules" className="py-20 bg-white border-y border-[#DCE5DF]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#0E9F78] uppercase tracking-wider mb-2">
              Modular Governance Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123B2D]">
              Platform Modules
            </h2>
            <p className="text-sm sm:text-base text-[#617168] mt-3">
              Explore the four core operational groups powering evidence-aware brand compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* GROUP 1: DEFINE */}
            <div className="p-6 rounded-2xl bg-[#F6F8F6] border border-[#DCE5DF] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0E9F78] block mb-2">
                  GROUP 1 &middot; DEFINE
                </span>
                <h3 className="text-lg font-bold text-[#123B2D] mb-3">Brand Standards</h3>
                <ul className="space-y-3 text-xs text-[#617168]">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Brand Constitution:</strong> Central repository of prohibited & required rules.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Claim Ledger:</strong> Timestamped claims with sources & expiration dates.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Asset Registry:</strong> Registered brand assets with SHA-256 hash validation.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-[#DCE5DF]">
                <span className="inline-block text-[11px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] px-2 py-0.5 rounded">
                  Available (Round 3 Complete)
                </span>
              </div>
            </div>

            {/* GROUP 2: ANALYSE */}
            <div className="p-6 rounded-2xl bg-[#F6F8F6] border border-[#DCE5DF] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0E9F78] block mb-2">
                  GROUP 2 &middot; ANALYSE
                </span>
                <h3 className="text-lg font-bold text-[#123B2D] mb-3">Analysis Engines</h3>
                <ul className="space-y-3 text-xs text-[#617168]">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Deterministic Engine:</strong> Exact regex & term match without AI drift.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Fact Audit Engine:</strong> Evaluates claim validity & flags expired citations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Color & Contrast:</strong> CIELAB Delta-E distance & WCAG 2.1 ratio calculation.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-[#DCE5DF]">
                <span className="inline-block text-[11px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] px-2 py-0.5 rounded">
                  Available (Deterministic)
                </span>
              </div>
            </div>

            {/* GROUP 3: REVIEW */}
            <div className="p-6 rounded-2xl bg-[#F6F8F6] border border-[#DCE5DF] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0E9F78] block mb-2">
                  GROUP 3 &middot; REVIEW
                </span>
                <h3 className="text-lg font-bold text-[#123B2D] mb-3">Review & Remediation</h3>
                <ul className="space-y-3 text-xs text-[#617168]">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Exact-Span Replacement:</strong> One-click accept with intent preservation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Reasoned Dismissal:</strong> Mandatory justification for dismissed items.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Review Versioning:</strong> Complete revision snapshot on each edit.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-[#DCE5DF]">
                <span className="inline-block text-[11px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] px-2 py-0.5 rounded">
                  Available
                </span>
              </div>
            </div>

            {/* GROUP 4: CONTROL */}
            <div className="p-6 rounded-2xl bg-[#F6F8F6] border border-[#DCE5DF] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0E9F78] block mb-2">
                  GROUP 4 &middot; CONTROL
                </span>
                <h3 className="text-lg font-bold text-[#123B2D] mb-3">Governance & Insights</h3>
                <ul className="space-y-3 text-xs text-[#617168]">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Server Approval Gate:</strong> HTTP 409 enforcement for high-risk findings.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Rule-Change Impact Map:</strong> Flags historical drafts on claim expiry.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                    <span><strong>Guideline Health Intelligence:</strong> Clarification proposals for ambiguous rules.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-[#DCE5DF]">
                <span className="inline-block text-[11px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] px-2 py-0.5 rounded">
                  Available (Round 3 Complete)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRODUCT PREVIEW SECTION (AUTHENTIC FICTIONAL REVIEW EXPERIENCE) */}
      <section className="py-20 md:py-28 bg-[#F6F8F6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-bold text-[#0E9F78] uppercase tracking-wider mb-2">
              Live Product Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123B2D]">
              Evidence Review in Action
            </h2>
            <p className="text-sm sm:text-base text-[#617168] mt-3">
              Explore how brand managers and reviewers inspect source-linked findings, accept replacements, and verify approval gates.
            </p>
          </div>

          {/* Interactive Mock Review Canvas */}
          <div className="bg-white border border-[#DCE5DF] rounded-2xl shadow-md overflow-hidden max-w-4xl mx-auto">
            {/* Review Canvas Header */}
            <div className="p-5 border-b border-[#DCE5DF] bg-[#F0F4F1] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E9F78] bg-[#E9F6F0] px-2 py-0.5 rounded border border-[#A6CDBA]">
                  Fictional Sample Review
                </span>
                <h3 className="text-base font-bold text-[#123B2D] mt-1">
                  Q4 Enterprise Launch Announcement
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FCD34D]">
                  IN REVIEW
                </span>
                <div className="text-right">
                  <div className="text-xs font-medium text-[#617168]">Clearance Score</div>
                  <div className="text-sm font-black text-[#123B2D]">72 / 100</div>
                </div>
              </div>
            </div>

            {/* Review Content & Findings Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Draft Content */}
              <div className="md:col-span-6 space-y-4">
                <label className="text-xs font-bold text-[#123B2D] uppercase tracking-wider block">
                  Submitted Draft Copy
                </label>
                <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#DCE5DF] text-xs text-[#2D4238] leading-relaxed">
                  <p>
                    Brandtrace provides the <span className="bg-[#FEF2F2] text-[#991B1B] font-bold px-1 border-b-2 border-[#DC2626]">best cheap platform</span> for enterprise teams looking to audit copy. We guarantee zero compliance errors across every channel.
                  </p>
                </div>
                <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#991B1B] flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Approval Gate Enforcement:</strong> Approval is blocked because 1 HIGH severity finding is unresolved.
                  </div>
                </div>
              </div>

              {/* Right Column: Source-Linked Finding Card */}
              <div className="md:col-span-6 space-y-3">
                <label className="text-xs font-bold text-[#123B2D] uppercase tracking-wider block">
                  Active Source Finding
                </label>
                <div className="p-4 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] px-2 py-0.5 rounded uppercase">
                      HIGH SEVERITY &middot; CONTRADICTED
                    </span>
                    <span className="text-[11px] font-mono text-[#617168]">Rule R-VOICE-01</span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#123B2D]">
                      Prohibited Superlative & Price Framing
                    </div>
                    <div className="text-xs text-[#617168] mt-1">
                      Matched: <code className="text-[#991B1B] bg-white px-1 py-0.5 rounded border border-[#FCA5A5]">&quot;best cheap platform&quot;</code>
                    </div>
                  </div>

                  {/* Evidence Citation */}
                  <div className="p-2.5 rounded bg-white border border-[#DCE5DF] text-[11px] space-y-1">
                    <div className="font-semibold text-[#123B2D]">
                      Citation: Brand Tone & Voice Standards 2026
                    </div>
                    <div className="text-[#617168] italic">
                      &quot;Avoid unverified superlatives such as &apos;best&apos;. Position accessibility over discount framing (&apos;cheap&apos;).&quot;
                    </div>
                  </div>

                  {/* Proposed Correction */}
                  <div className="p-2.5 rounded bg-[#F0FDF4] border border-[#86EFAC] text-[11px]">
                    <div className="font-bold text-[#166534]">Proposed Neutral Correction:</div>
                    <div className="text-[#15251E] mt-0.5 font-medium">
                      &quot;an effective, accessible governance platform&quot;
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={onEnterWorkspace}
                      className="btn-primary text-xs py-2 px-3 min-h-[36px]"
                    >
                      Accept Edit
                    </button>
                    <button
                      onClick={onEnterWorkspace}
                      className="btn-secondary text-xs py-2 px-3 min-h-[36px]"
                    >
                      Dismiss with Reason
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SYSTEM ARCHITECTURE BLOCK DIAGRAM */}
      <section id="system-architecture" className="py-20 bg-white border-y border-[#DCE5DF]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#0E9F78] uppercase tracking-wider mb-2">
              Technical Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123B2D]">
              System Architecture & Data Flow
            </h2>
            <p className="text-sm sm:text-base text-[#617168] mt-3">
              Verified data pipeline connecting the React 19 client, FastAPI 0.115 backend, and persistent SQLAlchemy database.
            </p>
          </div>

          {/* Block Diagram Cards */}
          <div className="p-8 rounded-2xl bg-[#F6F8F6] border border-[#DCE5DF] shadow-sm max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Layer 1: Client */}
              <div className="p-5 rounded-xl bg-white border border-[#DCE5DF] shadow-sm space-y-2">
                <span className="text-[10px] font-bold text-[#0E9F78] uppercase tracking-wider block">
                  LAYER 1 &middot; FRONTEND
                </span>
                <h4 className="font-bold text-sm text-[#123B2D]">React 19 + Vite</h4>
                <p className="text-xs text-[#617168] leading-relaxed">
                  TypeScript 5.8 client with Tailwind CSS v4, Lucide icons, Three.js Evidence Prism, and normalized API client (api.ts).
                </p>
              </div>

              {/* Layer 2: API Gateway */}
              <div className="p-5 rounded-xl bg-white border border-[#DCE5DF] shadow-sm space-y-2">
                <span className="text-[10px] font-bold text-[#0E9F78] uppercase tracking-wider block">
                  LAYER 2 &middot; BACKEND API
                </span>
                <h4 className="font-bold text-sm text-[#123B2D]">FastAPI 0.115</h4>
                <p className="text-xs text-[#617168] leading-relaxed">
                  Uvicorn ASGI runner, Pydantic v2 schemas, CORS middleware, simulated role header authentication (X-Demo-Role).
                </p>
              </div>

              {/* Layer 3: Services */}
              <div className="p-5 rounded-xl bg-white border border-[#DCE5DF] shadow-sm space-y-2">
                <span className="text-[10px] font-bold text-[#0E9F78] uppercase tracking-wider block">
                  LAYER 3 &middot; SERVICES
                </span>
                <h4 className="font-bold text-sm text-[#123B2D]">Governance Pipeline</h4>
                <p className="text-xs text-[#617168] leading-relaxed">
                  Deterministic engine (governance.py), Image & WCAG analyzer (image_analyzer.py), PDF parser, and Impact Map.
                </p>
              </div>
            </div>

            {/* Connecting Arrow Bar */}
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#123B2D] py-1 bg-[#E9F6F0] rounded-lg border border-[#A6CDBA]">
              <span>REST JSON Requests</span> &rarr;
              <span>Pydantic Input Validation</span> &rarr;
              <span>Deterministic Rule & Claim Check</span> &rarr;
              <span>SQLAlchemy 2.0 Persistence</span>
            </div>

            {/* Layer 4: Storage */}
            <div className="p-5 rounded-xl bg-white border border-[#DCE5DF] shadow-sm">
              <span className="text-[10px] font-bold text-[#0E9F78] uppercase tracking-wider block mb-2">
                LAYER 4 &middot; DATA PERSISTENCE
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="font-bold text-[#123B2D] block">reviews</span>
                  <span className="text-[#617168]">Content drafts & score</span>
                </div>
                <div>
                  <span className="font-bold text-[#123B2D] block">findings</span>
                  <span className="text-[#617168]">Source-linked findings</span>
                </div>
                <div>
                  <span className="font-bold text-[#123B2D] block">rules & facts</span>
                  <span className="text-[#617168]">Policies with expiry</span>
                </div>
                <div>
                  <span className="font-bold text-[#123B2D] block">audit & versions</span>
                  <span className="text-[#617168]">Append-only history</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. EVIDENCE GRAPH / DECISION TRACEABILITY */}
      <section id="evidence-trace" className="py-20 md:py-28 bg-[#F6F8F6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#0E9F78] uppercase tracking-wider mb-2">
              Decision Integrity Chain
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123B2D]">
              Evidence Graph & Traceability
            </h2>
            <p className="text-sm sm:text-base text-[#617168] mt-3">
              Every brand decision follows an unbroken chain from raw draft words to permanent audit logs.
            </p>
          </div>

          {/* Traceability Flow Nodes */}
          <div className="max-w-4xl mx-auto space-y-4">
            {[
              {
                step: 'A',
                title: 'Draft Passage',
                highlight: '"Get guaranteed results with zero risk."',
                desc: 'Author submits an absolute performance claim in email copy.',
                badge: 'UNVERIFIED PHRASE',
              },
              {
                step: 'B',
                title: 'Rule Violation Flagged',
                highlight: 'Rule R-CLAIM-04 &middot; Absolute Guarantees Policy',
                desc: 'Deterministic matcher detects prohibited guarantee without supporting legal clearance.',
                badge: 'HIGH SEVERITY',
              },
              {
                step: 'C',
                title: 'Approved Fact Ledger Check',
                highlight: 'Fact Ledger: No active indemnification proof exists for zero risk.',
                desc: 'Claim status marked as UNSUPPORTED_BY_APPROVED_EVIDENCE with audit citation.',
                badge: 'TIME-AWARE AUDIT',
              },
              {
                step: 'D',
                title: 'Neutral Suggested Correction',
                highlight: '"Achieve measurable results with proven governance practices."',
                desc: 'Context-sensitive neutral correction preserves marketing intent without violating policy.',
                badge: 'INTENT PRESERVATION',
              },
              {
                step: 'E',
                title: 'Reviewer Decision Recorded',
                highlight: 'Action: ACCEPT_EDIT by reviewer.alice',
                desc: 'Review version incremented to v2; reason recorded; clearance score recalculated.',
                badge: 'IMMUTABLE AUDIT',
              },
            ].map((node) => (
              <div
                key={node.step}
                className="bg-white border border-[#DCE5DF] rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#123B2D] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    {node.step}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#123B2D]">{node.title}</h4>
                      <span className="text-[10px] font-bold text-[#0E9F78] bg-[#E9F6F0] px-2 py-0.5 rounded">
                        {node.badge}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#123B2D] mt-1 font-mono bg-[#F8FAF9] px-2 py-1 rounded border border-[#EBF0EC]">
                      {node.highlight}
                    </div>
                    <p className="text-xs text-[#617168] mt-1">{node.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. ROUND 3 ROADMAP (VERIFIED COMMITMENTS) */}
      <section id="round3-roadmap" className="py-20 bg-white border-y border-[#DCE5DF]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#0E9F78] uppercase tracking-wider mb-2">
              CodeAxis Round 3: The Final Build
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123B2D]">
              Delivered Round 3 Commitments
            </h2>
            <p className="text-sm sm:text-base text-[#617168] mt-3">
              All three hackathon commitments have been implemented, tested, and verified with automated test suites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Commitment 1 */}
            <div className="p-6 rounded-2xl bg-[#F6F8F6] border border-[#DCE5DF] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] px-2 py-0.5 rounded uppercase">
                  DELIVERED &middot; TIME-AWARE BOUNDS
                </span>
                <h3 className="text-base font-bold text-[#123B2D] mt-3">
                  Time-Aware Claim Ledger & Impact Map
                </h3>
                <p className="text-xs text-[#617168] mt-2 leading-relaxed">
                  Fact validity tracking, timezone-safe ISO comparisons, EXPIRING_SOON status (30-day window), and targeted re-review trigger moving affected approved drafts to CHANGES_REQUESTED.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#DCE5DF] text-[11px] text-[#617168]">
                Claim validity windows & impact map
              </div>
            </div>

            {/* Commitment 2 */}
            <div className="p-6 rounded-2xl bg-[#F6F8F6] border border-[#DCE5DF] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] px-2 py-0.5 rounded uppercase">
                  DELIVERED &middot; MEASURED METRICS
                </span>
                <h3 className="text-base font-bold text-[#123B2D] mt-3">
                  Multimodal Visual Compliance & Registry
                </h3>
                <p className="text-xs text-[#617168] mt-2 leading-relaxed">
                  Brand asset registry (brand_assets) with SHA-256 hash matching. Supported finding for approved assets, high-severity finding for restricted assets, and measured Delta-E hex reporting.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#DCE5DF] text-[11px] text-[#617168]">
                CIELAB Delta-E & SHA-256 asset registry
              </div>
            </div>

            {/* Commitment 3 */}
            <div className="p-6 rounded-2xl bg-[#F6F8F6] border border-[#DCE5DF] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] px-2 py-0.5 rounded uppercase">
                  DELIVERED &middot; REVIEWER-GUIDED
                </span>
                <h3 className="text-base font-bold text-[#123B2D] mt-3">
                  Guideline-Health Intelligence & Suggestions
                </h3>
                <p className="text-xs text-[#617168] mt-2 leading-relaxed">
                  Aggregates findings per rule across reviews, detects reviewer disagreement, labels data confidence (SUFFICIENT vs INSUFFICIENT), and logs human suggestion decisions without altering live rules.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#DCE5DF] text-[11px] text-[#617168]">
                Reviewer telemetry & proposal triage
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. CLOSING CALL TO ACTION */}
      <section className="py-20 bg-[#123B2D] text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to review content with complete evidence traceability?
          </h2>
          <p className="text-[#B3C7BD] text-base mt-4 max-w-xl mx-auto">
            Experience deterministic brand governance, exact-span corrections, and server-gated approval workflows in the live workspace.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={onEnterWorkspace}
              className="btn-primary text-base px-8 py-3.5 min-h-[52px] shadow-lg"
            >
              Enter the BRANDTRACE Workspace
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="bg-[#0A241B] text-[#B3C7BD] py-12 border-t border-[#123B2D] text-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#123B2D] flex items-center justify-center text-[#0E9F78]">
              <Shield size={16} />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">BRANDTRACE</span>
              <span className="block text-[11px] text-[#8A9A91]">
                Evidence-Aware Brand Governance Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/bindudharad/BRANDTRACE"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              GitHub Repository <ExternalLink size={12} />
            </a>
            <a
              href="http://127.0.0.1:8000/api/health"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              API Health
            </a>
            <button
              onClick={onEnterWorkspace}
              className="hover:text-white transition-colors"
            >
              Launch Workspace
            </button>
          </div>

          <div className="text-[11px] text-[#8A9A91]">
            &copy; {new Date().getFullYear()} BRANDTRACE. Demonstration Environment.
          </div>
        </div>
      </footer>
    </div>
  );
};
