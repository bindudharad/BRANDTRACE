import React, { useState, useEffect } from 'react';
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
  Database,
  Cpu,
  Eye,
  AlertTriangle,
  History,
  Lock,
  Palette,
  Check,
  Activity,
  GitBranch,
  UserCheck,
  Copy,
} from 'lucide-react';

import {
  subscribeSystemStatus,
  getCachedSystemStatus,
  probeSystemStatus,
  SystemStatusData,
} from '../../services/environment';

import { EvidenceCore3D, ORBIT_NODES } from '../3d/EvidenceCore3D';
import { EvidenceNetwork3D } from '../3d/EvidenceNetwork3D';
import { PremiumNavbar } from '../navigation/PremiumNavbar';
import { JudgeAccessModal } from '../judge/JudgeAccessModal';
import { JudgeTourModal } from '../judge/JudgeTourModal';

interface BrandtraceHeroProps {
  onEnterWorkspace: () => void;
  onOpenTour?: () => void;
}

export const BrandtraceHero: React.FC<BrandtraceHeroProps> = ({
  onEnterWorkspace,
  onOpenTour: externalOpenTour,
}) => {
  const [selectedNode, setSelectedNode] = useState<number | null>(0);
  const [selectedArchNode, setSelectedArchNode] = useState<number>(0);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData>(getCachedSystemStatus);
  const [judgeAccessOpen, setJudgeAccessOpen] = useState(false);
  const [judgeTourOpen, setJudgeTourOpen] = useState(false);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

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

  useEffect(() => {
    const unsub = subscribeSystemStatus((newStatus) => {
      setSystemStatus(newStatus);
    });
    if (systemStatus.readiness === 'checking') {
      probeSystemStatus();
    }
    return unsub;
  }, []);

  const handleOpenTour = () => {
    if (externalOpenTour) {
      externalOpenTour();
    } else {
      setJudgeTourOpen(true);
    }
  };

  const handleEnterWithRole = (role: string, actor: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bt_demo_role', role);
      sessionStorage.setItem('bt_demo_actor', actor);
    }
    onEnterWorkspace();
  };

  const handleCopyHeader = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRole(id);
    setTimeout(() => setCopiedRole(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F4F8FC] font-sans selection:bg-[#00E6A0]/20 selection:text-[#00E6A0] relative overflow-x-hidden">
      {/* 1. TOP ANNOUNCEMENT & SYSTEM STATUS STRIP */}
      <div className="bg-[#0C1420] text-white text-xs py-2 px-4 border-b border-white/10">
        <div className="max-w-[1340px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-[#00E6A0] text-[#070B12] font-black px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
              {systemStatus.environment === 'staging'
                ? 'Hosted Demo'
                : systemStatus.environment === 'production'
                ? 'Production'
                : 'Local Demo'}
            </span>
            <span className="text-[#9AAABD]">
              {systemStatus.environment === 'staging'
                ? 'Evidence-linked brand governance platform. Hosted staging environment.'
                : systemStatus.environment === 'production'
                ? 'Evidence-linked brand governance platform. Enterprise production deployment.'
                : 'Evidence-linked brand governance platform. Local execution with zero cloud lock-in.'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[#9AAABD] text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  systemStatus.readiness === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : systemStatus.readiness === 'ready'
                    ? 'bg-[#00E6A0] shadow-[0_0_8px_rgba(0,230,160,0.8)]'
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
            <span className="hidden sm:inline text-white/20">|</span>
            <span className="hidden sm:inline text-[#DCE5DF]">
              Environment: {systemStatus.environmentLabel}
            </span>
            <span className="hidden sm:inline text-white/20">|</span>
            <span className="hidden sm:inline text-[#00E6A0]">
              {systemStatus.databaseConnected
                ? `${systemStatus.databaseDialect === 'postgresql' ? 'PostgreSQL' : 'SQLite'} Connected`
                : 'Database Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. FLOATING PREMIUM NAVBAR */}
      <PremiumNavbar
        systemStatus={systemStatus}
        onEnterWorkspace={onEnterWorkspace}
        onOpenJudgeAccess={() => setJudgeAccessOpen(true)}
        onOpenTour={handleOpenTour}
      />

      {/* 3. CINEMATIC 3D HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden">
        {/* Subtle Background Lighting */}
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-[#00E6A0]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/10 w-96 h-96 bg-[#00C8F0]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline and Positioning */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0C1420] border border-[#00E6A0]/30 text-[#00E6A0] text-xs font-bold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-[#00E6A0] shadow-[0_0_8px_rgba(0,230,160,0.8)] animate-pulse" />
                EVIDENCE-LINKED BRAND GOVERNANCE
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-white leading-[1.08] tracking-tight">
                Every finding has a source.{' '}
                <span className="bg-gradient-to-r from-[#00E6A0] via-[#00C8F0] to-[#8467FF] bg-clip-text text-transparent block mt-1">
                  Every decision has an owner.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[#9AAABD] leading-relaxed max-w-xl">
                BRANDTRACE brings brand rules, factual evidence, visual compliance and human decisions into one accountable governance platform. Review content drafts against normative guidelines with deterministic precision.
              </p>

              {/* Primary CTAs (Contains exact 'Enter the Workspace' for QA-03) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onEnterWorkspace}
                  className="btn-primary text-sm sm:text-base px-6 py-3.5 min-h-[50px] shadow-[0_0_25px_rgba(0,230,160,0.4)] cursor-pointer"
                  aria-label="Enter the Workspace"
                >
                  <span>Enter the Workspace</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleOpenTour}
                  className="btn-secondary text-sm sm:text-base px-5 py-3.5 min-h-[50px] flex items-center gap-2 bg-[#111D2A] text-white border-white/10 hover:border-[#00E6A0]/50 hover:bg-[#1A2C3F] cursor-pointer"
                >
                  <Sparkles size={16} className="text-[#00E6A0]" />
                  <span>Take Judge Tour</span>
                </button>

                <button
                  type="button"
                  onClick={() => setJudgeAccessOpen(true)}
                  className="btn-secondary text-sm sm:text-base px-5 py-3.5 min-h-[50px] flex items-center gap-2 bg-[#0C1420] text-[#00C8F0] border-[#00C8F0]/30 hover:bg-[#111D2A] cursor-pointer"
                >
                  <UserCheck size={16} className="text-[#00C8F0]" />
                  <span>Judge Access</span>
                </button>
              </div>

              {/* Trust & Rigor Metrics */}
              <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-xl bg-[#0C1420] border border-white/10">
                  <div className="text-sm sm:text-base font-bold text-white truncate">
                    {systemStatus.readiness === 'ready'
                      ? systemStatus.environmentLabel
                      : systemStatus.readiness === 'checking'
                      ? 'Probing...'
                      : 'Unavailable'}
                  </div>
                  <div className="text-[11px] text-[#9AAABD] font-mono mt-0.5">Verified Runtime</div>
                </div>

                <div className="p-3 rounded-xl bg-[#0C1420] border border-white/10">
                  <div className="text-sm sm:text-base font-bold text-[#00E6A0]">Deterministic</div>
                  <div className="text-[11px] text-[#9AAABD] font-mono mt-0.5">Regex Engine</div>
                </div>

                <div className="p-3 rounded-xl bg-[#0C1420] border border-white/10">
                  <div className="text-sm sm:text-base font-bold text-[#FF657A]">HTTP 409</div>
                  <div className="text-[11px] text-[#9AAABD] font-mono mt-0.5">Server Gate</div>
                </div>

                <div className="p-3 rounded-xl bg-[#0C1420] border border-white/10">
                  <div className="text-sm sm:text-base font-bold text-[#00C8F0]">PostgreSQL + SQLite</div>
                  <div className="text-[11px] text-[#9AAABD] font-mono mt-0.5">Supported Dialects</div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive 3D Evidence Intelligence Core */}
            <div className="lg:col-span-6">
              <EvidenceCore3D
                onSelectNode={(id) => setSelectedNode(id)}
                selectedNodeId={selectedNode}
                onEnterWorkspace={onEnterWorkspace}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROMINENT JUDGE ACCESS BANNER (Addresses Organizer Request) */}
      <section className="py-8 bg-[#0C1420] border-y border-white/10 relative overflow-hidden">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
          <div className="p-6 rounded-2xl bg-[#070B12] border border-[#00E6A0]/30 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E6A0] shadow-[0_0_10px_rgba(0,230,160,0.8)]" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-[#00E6A0]">
                  HACKATHON JUDGE EVALUATION ACCESS
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white font-mono">
                  No Password Required
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Explore BRANDTRACE under four authenticated governance personas
              </h3>
              <p className="text-xs sm:text-sm text-[#9AAABD] max-w-2xl">
                Roles simulate server-enforced RBAC via client headers. Select any role below to launch the workspace with verified privileges.
              </p>
            </div>

            {/* Quick-Select Role Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleEnterWithRole('brand_admin', 'admin@brandtrace.internal')}
                className="px-3.5 py-2.5 rounded-xl bg-[#111D2A] hover:bg-[#1A2C3F] border border-[#00E6A0]/40 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E6A0]" />
                <span>Brand Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleEnterWithRole('reviewer', 'reviewer@brandtrace.internal')}
                className="px-3.5 py-2.5 rounded-xl bg-[#00C8F0]/15 hover:bg-[#00C8F0]/25 border border-[#00C8F0]/50 text-xs font-bold text-[#00C8F0] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C8F0]" />
                <span>Reviewer (Primary)</span>
              </button>

              <button
                type="button"
                onClick={() => handleEnterWithRole('creator', 'creator@brandtrace.internal')}
                className="px-3.5 py-2.5 rounded-xl bg-[#111D2A] hover:bg-[#1A2C3F] border border-white/10 text-xs font-bold text-[#9AAABD] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Creator</span>
              </button>

              <button
                type="button"
                onClick={() => handleEnterWithRole('auditor', 'auditor@brandtrace.internal')}
                className="px-3.5 py-2.5 rounded-xl bg-[#111D2A] hover:bg-[#1A2C3F] border border-[#8467FF]/40 text-xs font-bold text-[#8467FF] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Auditor</span>
              </button>

              <button
                type="button"
                onClick={() => setJudgeAccessOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-[#00E6A0] text-[#070B12] text-xs font-bold flex items-center gap-1 shadow-md hover:bg-[#00c88a] transition-all cursor-pointer"
              >
                <span>Details</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRODUCT PRINCIPLES STRIP */}
      <section className="py-12 bg-[#070B12] border-b border-white/10">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
            <div className="p-5 rounded-2xl bg-[#0C1420] border border-white/10 hover:border-[#00E6A0]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#00E6A0]/10 border border-[#00E6A0]/30 flex items-center justify-center text-[#00E6A0] mb-3">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-sm text-white">Source-Linked Findings</h3>
              <p className="text-xs text-[#9AAABD] mt-1.5 leading-relaxed">
                Every violation anchors to an exact rule ID, verified fact excerpt, or measured visual property. Zero phantom claims.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C1420] border border-white/10 hover:border-[#00C8F0]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#00C8F0]/10 border border-[#00C8F0]/30 flex items-center justify-center text-[#00C8F0] mb-3">
                <Cpu size={20} />
              </div>
              <h3 className="font-bold text-sm text-white">Deterministic-First</h3>
              <p className="text-xs text-[#9AAABD] mt-1.5 leading-relaxed">
                Core governance runs with deterministic rules and grounded evidence citations. Unverified claims are flagged for human review.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C1420] border border-white/10 hover:border-[#FF657A]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FF657A]/10 border border-[#FF657A]/30 flex items-center justify-center text-[#FF657A] mb-3">
                <CheckCircle size={20} />
              </div>
              <h3 className="font-bold text-sm text-white">Human-Gated Approvals</h3>
              <p className="text-xs text-[#9AAABD] mt-1.5 leading-relaxed">
                High-risk violations physically block approval on the server (HTTP 409). Waivers and dismissals require documented reasons.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C1420] border border-white/10 hover:border-[#8467FF]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#8467FF]/10 border border-[#8467FF]/30 flex items-center justify-center text-[#8467FF] mb-3">
                <History size={20} />
              </div>
              <h3 className="font-bold text-sm text-white">Append-Only Audit History</h3>
              <p className="text-xs text-[#9AAABD] mt-1.5 leading-relaxed">
                Every text edit, restored draft, and governance action is permanently captured in point-in-time review versions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. "HOW BRANDTRACE WORKS" — 6-STEP CONNECTED WORKFLOW */}
      <section id="how-it-works" className="py-20 md:py-28 bg-[#0C1420]">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#00E6A0] uppercase tracking-wider mb-2 font-mono">
              End-to-End Governance Lifecycle
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              How BRANDTRACE Works
            </h2>
            <p className="text-sm sm:text-base text-[#9AAABD] mt-3">
              A transparent, six-step journey from raw creative draft to auditable, published brand communication.
            </p>
          </div>

          {/* 6 Connected Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative text-left">
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
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="bg-[#070B12] border border-white/10 rounded-2xl p-6 shadow-xl hover:border-[#00E6A0]/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black text-[#00E6A0] bg-[#00E6A0]/10 border border-[#00E6A0]/30 px-2.5 py-1 rounded">
                        STEP {step.num}
                      </span>
                      <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider font-mono">
                        {step.category}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#111D2A] flex items-center justify-center text-white mb-4">
                      <Icon size={20} className="text-[#00E6A0]" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#9AAABD] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#9AAABD]">
                    <span className="font-medium">Data Artifact:</span>
                    <span className="font-mono text-white font-semibold">{step.io}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. CONNECTED PLATFORM MODULES SECTION */}
      <section id="platform-modules" className="py-20 bg-[#070B12] border-y border-white/10">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#00E6A0] uppercase tracking-wider mb-2 font-mono">
              Modular Governance Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Platform Capabilities
            </h2>
            <p className="text-sm sm:text-base text-[#9AAABD] mt-3">
              Four core operational groups powering evidence-aware brand compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* GROUP 1: DEFINE */}
            <div className="p-6 rounded-2xl bg-[#0C1420] border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00E6A0] block mb-2 font-mono">
                  GROUP 1 · DEFINE
                </span>
                <h3 className="text-lg font-bold text-white mb-3">Brand Standards</h3>
                <ul className="space-y-3 text-xs text-[#9AAABD]">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#00E6A0] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Brand Constitution:</strong> Central repository of prohibited & required rules.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#00E6A0] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Claim Ledger:</strong> Timestamped claims with sources & expiration dates.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#00E6A0] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Asset Registry:</strong> Registered brand assets with SHA-256 hash validation.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-white/10">
                <span className="inline-block text-[11px] font-bold text-[#00E6A0] bg-[#00E6A0]/10 border border-[#00E6A0]/30 px-2 py-0.5 rounded font-mono">
                  Round 3 Complete
                </span>
              </div>
            </div>

            {/* GROUP 2: ANALYSE */}
            <div className="p-6 rounded-2xl bg-[#0C1420] border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00C8F0] block mb-2 font-mono">
                  GROUP 2 · ANALYSE
                </span>
                <h3 className="text-lg font-bold text-white mb-3">Analysis Engines</h3>
                <ul className="space-y-3 text-xs text-[#9AAABD]">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#00C8F0] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Deterministic Engine:</strong> Exact regex & term match without AI drift.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#00C8F0] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Fact Audit Engine:</strong> Evaluates claim validity & flags expired citations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#00C8F0] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Color & Contrast:</strong> CIELAB Delta-E (CIE76) & WCAG 2.1 ratio calculation.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-white/10">
                <span className="inline-block text-[11px] font-bold text-[#00C8F0] bg-[#00C8F0]/10 border border-[#00C8F0]/30 px-2 py-0.5 rounded font-mono">
                  Deterministic Verified
                </span>
              </div>
            </div>

            {/* GROUP 3: REVIEW */}
            <div className="p-6 rounded-2xl bg-[#0C1420] border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FFB84D] block mb-2 font-mono">
                  GROUP 3 · REVIEW
                </span>
                <h3 className="text-lg font-bold text-white mb-3">Review & Remediation</h3>
                <ul className="space-y-3 text-xs text-[#9AAABD]">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#FFB84D] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Exact-Span Replacement:</strong> One-click accept with intent preservation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#FFB84D] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Reasoned Dismissal:</strong> Mandatory justification for dismissed items.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#FFB84D] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Review Versioning:</strong> Complete revision snapshot on each edit.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-white/10">
                <span className="inline-block text-[11px] font-bold text-[#FFB84D] bg-[#FFB84D]/10 border border-[#FFB84D]/30 px-2 py-0.5 rounded font-mono">
                  Human-in-the-Loop
                </span>
              </div>
            </div>

            {/* GROUP 4: CONTROL */}
            <div className="p-6 rounded-2xl bg-[#0C1420] border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#8467FF] block mb-2 font-mono">
                  GROUP 4 · CONTROL
                </span>
                <h3 className="text-lg font-bold text-white mb-3">Governance & Insights</h3>
                <ul className="space-y-3 text-xs text-[#9AAABD]">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#8467FF] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Server Approval Gate:</strong> HTTP 409 enforcement for high-risk findings.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#8467FF] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Rule-Change Impact Map:</strong> Flags historical drafts on claim expiry.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-[#8467FF] mt-0.5 shrink-0" />
                    <span><strong className="text-white">Guideline Health Intelligence:</strong> Clarification proposals for ambiguous rules.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-white/10">
                <span className="inline-block text-[11px] font-bold text-[#8467FF] bg-[#8467FF]/10 border border-[#8467FF]/30 px-2 py-0.5 rounded font-mono">
                  Server-Enforced
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. 3D / INTERACTIVE EVIDENCE NETWORK (SECTION 10 OF BRIEF) */}
      <section id="evidence-trace" className="py-20 md:py-28 bg-[#0C1420]">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
          <EvidenceNetwork3D />
        </div>
      </section>

      {/* 9. SYSTEM ARCHITECTURE BLOCK DIAGRAM */}
      <section id="system-architecture" className="py-20 bg-[#070B12] border-y border-white/10">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#00E6A0] uppercase tracking-wider mb-2 font-mono">
              Technical Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              System Architecture & Data Flow
            </h2>
            <p className="text-sm sm:text-base text-[#9AAABD] mt-3">
              Verified data pipeline connecting the React 19 client, FastAPI 0.115 backend, and persistent SQLAlchemy database.
            </p>
          </div>

          {/* Interactive SVG System Map (Tested by QA-02) */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#0C1420] border border-white/10 shadow-2xl max-w-4xl mx-auto space-y-6 text-left mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-white">Interactive Architecture Map</h3>
                <p className="text-xs text-[#9AAABD] mt-0.5">Click any node to inspect responsibilities and system connections.</p>
              </div>
              <span className="text-[11px] font-mono text-[#00E6A0] bg-[#00E6A0]/10 border border-[#00E6A0]/30 px-2 py-0.5 rounded">
                Connected Topography
              </span>
            </div>

            <div className="relative w-full aspect-[640/420] bg-[#070B12] rounded-xl border border-white/10 p-2 flex items-center justify-center">
              <svg
                viewBox="0 0 640 420"
                className="w-full h-full"
                style={{ overflow: 'visible' }}
                aria-label="BRANDTRACE Architecture Diagram"
              >
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00C8F0" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00E6A0" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Connecting Paths to Center (320, 200) */}
                <line x1="120" y1="80" x2="320" y2="200" stroke="#1A2C3F" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="520" y1="80" x2="320" y2="200" stroke="#1A2C3F" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="80" y1="260" x2="320" y2="200" stroke="#1A2C3F" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="540" y1="260" x2="320" y2="200" stroke="#1A2C3F" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="180" y1="350" x2="320" y2="200" stroke="#1A2C3F" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="460" y1="350" x2="320" y2="200" stroke="#1A2C3F" strokeWidth="2" strokeDasharray="4 4" />

                {/* Active Glowing Highlight Line to Selected Node */}
                {selectedArchNode !== null && selectedArchNode !== 0 && (
                  <line
                    x1={systemNodes[selectedArchNode].x}
                    y1={systemNodes[selectedArchNode].y}
                    x2={320}
                    y2={200}
                    stroke="#00E6A0"
                    strokeWidth="2.5"
                    className="animate-pulse"
                  />
                )}

                {/* Nodes Render */}
                {systemNodes.map((node) => {
                  const isSelected = selectedArchNode === node.id;
                  const isCore = node.isCore;

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedArchNode(node.id)}
                      className="cursor-pointer transition-transform hover:scale-105"
                      tabIndex={0}
                      role="button"
                      aria-label={`Inspect ${node.title}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedArchNode(node.id);
                      }}
                    >
                      {/* Glow pulse on selected or core */}
                      {(isSelected || isCore) && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isCore ? 54 : 34}
                          fill={isCore ? 'rgba(0, 230, 160, 0.15)' : 'rgba(0, 200, 240, 0.15)'}
                          className="animate-pulse"
                        />
                      )}

                      {/* Outer Circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isCore ? 46 : 28}
                        fill={isCore ? '#0C1420' : '#111D2A'}
                        stroke={isSelected ? '#00E6A0' : isCore ? '#00C8F0' : 'rgba(255,255,255,0.15)'}
                        strokeWidth={isSelected ? 3 : 2}
                      />

                      {/* Inner Icon or Dot */}
                      {isCore ? (
                        <text
                          x={node.x}
                          y={node.y + 4}
                          textAnchor="middle"
                          fill="#00E6A0"
                          fontSize="12"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          CORE
                        </text>
                      ) : (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={8}
                          fill={isSelected ? '#00E6A0' : '#00C8F0'}
                        />
                      )}

                      {/* Text Label Below Node */}
                      <text
                        x={node.x}
                        y={node.y + (isCore ? 64 : 42)}
                        textAnchor="middle"
                        fill="#F4F8FC"
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

            {/* Selected Node Details Drawer */}
            {systemNodes[selectedArchNode] && (
              <div className="p-4 rounded-xl bg-[#070B12] border border-[#00E6A0]/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-[#00E6A0] uppercase tracking-wider">
                    {systemNodes[selectedArchNode].badge}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-[#00E6A0] bg-[#00E6A0]/10 px-2 py-0.5 rounded border border-[#00E6A0]/30">
                    {systemNodes[selectedArchNode].status}
                  </span>
                </div>
                <div className="font-bold text-base text-white mt-1">
                  {systemNodes[selectedArchNode].title}
                </div>
                <p className="text-xs text-[#9AAABD] mt-1.5 leading-relaxed">
                  {systemNodes[selectedArchNode].desc}
                </p>
              </div>
            )}
          </div>

          {/* Block Diagram Cards */}
          <div className="p-8 rounded-2xl bg-[#0C1420] border border-white/10 shadow-2xl max-w-4xl mx-auto space-y-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Layer 1: Client */}
              <div className="p-5 rounded-xl bg-[#070B12] border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-[#00E6A0] uppercase tracking-wider block font-mono">
                  LAYER 1 · FRONTEND
                </span>
                <h4 className="font-bold text-sm text-white">React 19 + Three.js</h4>
                <p className="text-xs text-[#9AAABD] leading-relaxed">
                  TypeScript 5.8 client with Tailwind CSS v4, Lucide icons, Three.js 3D Core, and normalized API client (api.ts).
                </p>
              </div>

              {/* Layer 2: API Gateway */}
              <div className="p-5 rounded-xl bg-[#070B12] border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-[#00C8F0] uppercase tracking-wider block font-mono">
                  LAYER 2 · BACKEND API
                </span>
                <h4 className="font-bold text-sm text-white">FastAPI 0.115</h4>
                <p className="text-xs text-[#9AAABD] leading-relaxed">
                  Uvicorn ASGI runner, Pydantic v2 schemas, CORS middleware, simulated role headers, and token authentication.
                </p>
              </div>

              {/* Layer 3: Services */}
              <div className="p-5 rounded-xl bg-[#070B12] border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-[#8467FF] uppercase tracking-wider block font-mono">
                  LAYER 3 · SERVICES
                </span>
                <h4 className="font-bold text-sm text-white">Governance Pipeline</h4>
                <p className="text-xs text-[#9AAABD] leading-relaxed">
                  Deterministic engine (governance.py), Image & Delta-E CIE76 analyzer, pypdf text parser, and Impact Map.
                </p>
              </div>
            </div>

            {/* Connecting Arrow Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[#00E6A0] py-2 px-4 bg-[#070B12] rounded-xl border border-[#00E6A0]/30 font-mono">
              <span>REST JSON Requests</span> &rarr;
              <span>Pydantic Input Validation</span> &rarr;
              <span>Deterministic Rule & Claim Check</span> &rarr;
              <span>SQLAlchemy 2.0 Persistence</span>
            </div>

            {/* Layer 4: Storage */}
            <div className="p-5 rounded-xl bg-[#070B12] border border-white/10">
              <span className="text-[10px] font-bold text-[#00E6A0] uppercase tracking-wider block mb-2 font-mono">
                LAYER 4 · DATA PERSISTENCE (15 TABLES)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="font-bold text-white block">reviews</span>
                  <span className="text-[#9AAABD]">Content drafts & score</span>
                </div>
                <div>
                  <span className="font-bold text-white block">findings</span>
                  <span className="text-[#9AAABD]">Source-linked findings</span>
                </div>
                <div>
                  <span className="font-bold text-white block">rules & facts</span>
                  <span className="text-[#9AAABD]">Policies with expiry</span>
                </div>
                <div>
                  <span className="font-bold text-white block">audit & versions</span>
                  <span className="text-[#9AAABD]">Append-only history</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. ROUND 3 ROADMAP (VERIFIED COMMITMENTS) */}
      <section id="round3-roadmap" className="py-20 bg-[#0C1420]">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-[#00E6A0] uppercase tracking-wider mb-2 font-mono">
              CodeAxis Round 3: The Final Build
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Delivered Round 3 Commitments
            </h2>
            <p className="text-sm sm:text-base text-[#9AAABD] mt-3">
              All three hackathon commitments have been implemented, tested, and verified with automated test suites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
            {/* Commitment 1 */}
            <div className="p-6 rounded-2xl bg-[#070B12] border border-white/10 flex flex-col justify-between hover:border-[#00E6A0]/40 transition-all">
              <div>
                <span className="text-[10px] font-bold text-[#00E6A0] bg-[#00E6A0]/10 border border-[#00E6A0]/30 px-2 py-0.5 rounded uppercase font-mono">
                  DELIVERED · TIME-AWARE BOUNDS
                </span>
                <h3 className="text-base font-bold text-white mt-3">
                  Time-Aware Claim Ledger & Impact Map
                </h3>
                <p className="text-xs text-[#9AAABD] mt-2 leading-relaxed">
                  Fact validity tracking, timezone-safe ISO comparisons, EXPIRING_SOON status (30-day window), and targeted re-review trigger moving affected approved drafts to CHANGES_REQUESTED.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-[#64748B] font-mono">
                Claim validity windows & impact map
              </div>
            </div>

            {/* Commitment 2 */}
            <div className="p-6 rounded-2xl bg-[#070B12] border border-white/10 flex flex-col justify-between hover:border-[#00C8F0]/40 transition-all">
              <div>
                <span className="text-[10px] font-bold text-[#00C8F0] bg-[#00C8F0]/10 border border-[#00C8F0]/30 px-2 py-0.5 rounded uppercase font-mono">
                  DELIVERED · MEASURED METRICS
                </span>
                <h3 className="text-base font-bold text-white mt-3">
                  Multimodal Visual Compliance & Registry
                </h3>
                <p className="text-xs text-[#9AAABD] mt-2 leading-relaxed">
                  Brand asset registry (brand_assets) with SHA-256 hash matching. Supported finding for approved assets, high-severity finding for restricted assets, and measured Delta-E CIE76 hex reporting.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-[#64748B] font-mono">
                CIELAB Delta-E & SHA-256 asset registry
              </div>
            </div>

            {/* Commitment 3 */}
            <div className="p-6 rounded-2xl bg-[#070B12] border border-white/10 flex flex-col justify-between hover:border-[#8467FF]/40 transition-all">
              <div>
                <span className="text-[10px] font-bold text-[#8467FF] bg-[#8467FF]/10 border border-[#8467FF]/30 px-2 py-0.5 rounded uppercase font-mono">
                  DELIVERED · REVIEWER-GUIDED
                </span>
                <h3 className="text-base font-bold text-white mt-3">
                  Guideline-Health Intelligence & Suggestions
                </h3>
                <p className="text-xs text-[#9AAABD] mt-2 leading-relaxed">
                  Aggregates findings per rule across reviews, detects rule-level reviewer disposition divergence, labels data confidence, and logs human suggestion decisions without altering live rules.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-[#64748B] font-mono">
                Reviewer telemetry & proposal triage
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. CLOSING CALL TO ACTION */}
      <section className="py-20 bg-gradient-to-b from-[#0C1420] to-[#070B12] text-white border-t border-white/10">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to review content with complete evidence traceability?
          </h2>
          <p className="text-[#9AAABD] text-sm sm:text-base mt-4 max-w-xl mx-auto">
            Experience deterministic brand governance, exact-span corrections, and server-gated approval workflows in the live workspace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={onEnterWorkspace}
              className="btn-primary text-base px-8 py-3.5 min-h-[52px] shadow-[0_0_30px_rgba(0,230,160,0.4)] cursor-pointer"
            >
              <span>Enter the BRANDTRACE Workspace</span>
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => setJudgeAccessOpen(true)}
              className="btn-secondary text-base px-6 py-3.5 min-h-[52px] bg-[#111D2A] text-white border-white/10 hover:border-[#00E6A0]/40 cursor-pointer"
            >
              <UserCheck size={16} className="text-[#00C8F0]" />
              <span>Judge Access Center</span>
            </button>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="bg-[#070B12] text-[#9AAABD] py-12 border-t border-white/10 text-xs">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0C1420] border border-[#00E6A0]/30 flex items-center justify-center text-[#00E6A0]">
              <Shield size={18} />
            </div>
            <div className="text-left">
              <span className="font-bold text-white tracking-tight block">BRANDTRACE</span>
              <span className="text-[11px] text-[#64748B]">
                Evidence-Aware Brand Governance Platform
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
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
              type="button"
              onClick={onEnterWorkspace}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Launch Workspace
            </button>
          </div>

          <div className="text-[11px] text-[#64748B] text-center sm:text-right">
            Distributed under MIT License. CodeAxis Hackathon Round 3.
          </div>
        </div>
      </footer>

      {/* Judge Access Modal */}
      <JudgeAccessModal
        isOpen={judgeAccessOpen}
        onClose={() => setJudgeAccessOpen(false)}
        onEnterWorkspaceWithRole={(role, actor) => handleEnterWithRole(role, actor)}
      />

      {/* Judge Tour Modal */}
      <JudgeTourModal
        isOpen={judgeTourOpen}
        onClose={() => setJudgeTourOpen(false)}
        onEnterWorkspace={onEnterWorkspace}
      />
    </div>
  );
};
