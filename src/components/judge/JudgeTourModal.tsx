import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Shield,
  Layers,
  Database,
  Palette,
  Eye,
  Activity,
  Lock,
  GitBranch,
  Sparkles,
} from 'lucide-react';

interface TourStep {
  step: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  keyPoints: string[];
  systemInvariant: string;
  targetView: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: '01 / 08',
    badge: 'THE GOVERNANCE PROBLEM',
    title: 'Unchecked Generative Copy & Brand Drift',
    subtitle: 'Why modern enterprises fail brand and compliance reviews',
    description: 'Generative AI can create marketing drafts in seconds, but often hallucinates outdated SLA metrics, prohibited superlatives, and improper trademark capitalization. Manual review cannot keep pace, and fragmented PDF brand manuals lead to compliance violations.',
    keyPoints: [
      'Informal superlatives violate advertising standards',
      'Fact expiration leads to false advertising liabilities',
      'Audit trails are lost in email threads and chat messages',
    ],
    systemInvariant: 'BRANDTRACE provides automated deterministic verification with human accountability.',
    targetView: 'Overview',
    icon: <Shield size={28} className="text-[#FF657A]" />,
  },
  {
    step: '02 / 08',
    badge: 'EVIDENCE INTELLIGENCE',
    title: 'Deterministic Matching & Grounded Evidence',
    subtitle: 'Rule-based compliance you can mathematically verify',
    description: 'BRANDTRACE avoids ungrounded AI judgments. Prohibited phrases, required terminology, and voice rules are evaluated via deterministic exact-span regular expressions. Every finding is linked directly to an active, approved constitutional rule.',
    keyPoints: [
      'Exact-span token identification in ingested text',
      'Strict source title and excerpt citation attached to every finding',
      'Mathematical clearance scoring from 0 to 100 based on severity penalties',
    ],
    systemInvariant: 'Rule evaluation is 100% deterministic, repeatable, and citation-backed.',
    targetView: 'Brand Constitution',
    icon: <Layers size={28} className="text-[#00E6A0]" />,
  },
  {
    step: '03 / 08',
    badge: 'CLAIM LEDGER',
    title: 'Time-Aware Facts & Expiration Monitoring',
    subtitle: 'Preventing outdated corporate claims from reaching publication',
    description: 'Enterprise facts carry explicit validity windows (effective_at and expires_at). Facts within 30 days of expiration trigger proactive yellow warning badges. Expired facts instantly flag dependent copy as OUTDATED.',
    keyPoints: [
      'Proactive 30-day expiring-soon alerts in Claim Ledger',
      'Immutable fact version snapshots preserved upon amendment',
      'Operational notes field support for audit trail context',
    ],
    systemInvariant: 'Fact validity is evaluated deterministically against evaluation timestamps.',
    targetView: 'Claim Ledger & Verified Facts',
    icon: <Database size={28} className="text-[#00C8F0]" />,
  },
  {
    step: '04 / 08',
    badge: 'VISUAL COMPLIANCE',
    title: 'Color Science, Asset Hashes & Truth-in-Advertising',
    subtitle: 'Transparent disclosures and verifiable visual standards',
    description: 'BRANDTRACE evaluates visual identity through Pillow CIELAB Delta-E (CIE76) color distance, W3C WCAG 2.1 relative luminance contrast on semantic token pairs, and cryptographic SHA-256 byte hashing against the Brand Asset Registry.',
    keyPoints: [
      'Pillow CIELAB Delta-E CIE76 color distance calculations',
      'Exact SHA-256 hash matching identifies APPROVED vs RESTRICTED assets',
      'Transparent disclosure: Raster OCR and semantic logo recognition are unsupported',
    ],
    systemInvariant: 'Bounded 64KB streaming guard prevents buffer overflow attacks on upload.',
    targetView: 'Brand Asset Registry',
    icon: <Palette size={28} className="text-[#8467FF]" />,
  },
  {
    step: '05 / 08',
    badge: 'HUMAN REVIEW',
    title: 'Exact-Span Corrections & Documented Dispositions',
    subtitle: 'Preserving human intent with zero editorial duplication',
    description: 'When a reviewer accepts a suggested correction, the platform executes a precise exact-span string replacement, ensuring zero accidental word duplication. When a reviewer overrides a finding, documented reason text is strictly mandatory.',
    keyPoints: [
      'Single-click exact-span text correction with zero duplication',
      'Mandatory justification reason required to dismiss any finding',
      'Contamination guards (HTTP 422) reject reasoning text in publishable drafts',
    ],
    systemInvariant: 'Every finding decision records an authenticated actor, timestamp, and rationale.',
    targetView: 'Content Review',
    icon: <Eye size={28} className="text-[#00E6A0]" />,
  },
  {
    step: '06 / 08',
    badge: 'GUIDELINE HEALTH',
    title: 'Reviewer Telemetry & Rule Suggestions',
    subtitle: 'Closing the loop between compliance reviews and normative rules',
    description: 'The platform aggregates reviewer decisions across multiple review drafts. When human reviewers repeatedly dismiss or edit a specific rule, the engine flags Rule-Level Reviewer Disposition Divergence and proposes source-linked clarifications for administrator activation.',
    keyPoints: [
      'Aggregated finding counts, acceptances, dismissals, and escalations per rule',
      'Rule-level disposition divergence alerts when reviewers disagree across drafts',
      'Optimistic locking rule suggestion activation creates new rule versions',
    ],
    systemInvariant: 'Candidate suggestions never mutate live rules without human admin activation.',
    targetView: 'Governance Insights',
    icon: <Activity size={28} className="text-[#FFB84D]" />,
  },
  {
    step: '07 / 08',
    badge: 'APPROVAL GATE',
    title: 'Server-Enforced Approval Boundary (HTTP 409)',
    subtitle: 'Blocking publication until critical violations are cleared',
    description: 'The approval gate is enforced directly in the FastAPI backend service. If a review has unresolved HIGH or CRITICAL severity violations, the server strictly rejects approval requests with HTTP 409 Conflict, even if attempted via direct API calls.',
    keyPoints: [
      'Client approval button is guarded with descriptive tooltip',
      'POST /api/reviews/{id}/approval returns HTTP 409 Conflict when blocked',
      'Resolving or waiving all high violations immediately clears the gate',
    ],
    systemInvariant: 'HTTP 409 invariant is server-enforced; cannot be bypassed via UI manipulation.',
    targetView: 'Content Review',
    icon: <Lock size={28} className="text-[#FF657A]" />,
  },
  {
    step: '08 / 08',
    badge: 'AUDIT & IMPACT',
    title: 'Append-Only Ledger & Rule-Change Impact Map',
    subtitle: 'Complete accountability and targeted re-review orchestration',
    description: 'Every state transition appends an immutable compliance record to the database audit table. The dynamic Impact Map identifies all published or draft reviews citing an expired fact, and enables batch targeted re-review with one click.',
    keyPoints: [
      'Append-only audit ledger records actor, timestamp, action, and rationale',
      'Bi-directional evidence dependency tracking across rules, facts, and drafts',
      'Targeted re-review transitions affected approved drafts to CHANGES_REQUESTED',
    ],
    systemInvariant: 'Full compliance history can be reconstructed from the audit ledger at any time.',
    targetView: 'Audit History',
    icon: <GitBranch size={28} className="text-[#20DDA4]" />,
  },
];

export interface JudgeTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView?: (viewName: string) => void;
  onNavigate?: (viewName: string) => void;
  onEnterWorkspace?: () => void;
}

export const JudgeTourModal: React.FC<JudgeTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
  onNavigate,
  onEnterWorkspace,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleLaunchModule = () => {
    if (onNavigateToView) {
      onNavigateToView(step.targetView);
    } else if (onNavigate) {
      onNavigate(step.targetView);
    } else if (onEnterWorkspace) {
      onEnterWorkspace();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judge-tour-title"
    >
      <div className="relative w-full max-w-2xl bg-[#0C1420] border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-left">
        {/* Glow Background */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#00E6A0]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#00C8F0]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar: Progress and Close */}
        <div className="flex items-center justify-between gap-4 mb-5 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#00E6A0]">
              JUDGE EXPERIENCE TOUR
            </span>
            <span className="text-white/20">|</span>
            <span className="text-xs font-mono text-[#9AAABD]">{step.step}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9AAABD] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Close Product Tour"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00E6A0] via-[#00C8F0] to-[#8467FF] transition-all duration-300 rounded-full"
            style={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#070B12] border border-white/10 flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-[#00E6A0] block">
                {step.badge}
              </span>
              <h2 id="judge-tour-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                {step.title}
              </h2>
              <p className="text-xs text-[#9AAABD] mt-0.5">{step.subtitle}</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#F4F8FC] leading-relaxed pt-2">
            {step.description}
          </p>

          {/* Key Bullet Points */}
          <div className="bg-[#070B12] rounded-xl border border-white/10 p-4 space-y-2 text-xs">
            {step.keyPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[#9AAABD]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00E6A0] mt-1.5 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>

          {/* System Invariant Pill */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#00E6A0]/10 border border-[#00E6A0]/30 text-xs">
            <Sparkles size={14} className="text-[#00E6A0] shrink-0" />
            <span className="text-white font-medium">
              <span className="text-[#00E6A0] font-bold">Verifiable Guarantee: </span>
              {step.systemInvariant}
            </span>
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLaunchModule}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00E6A0] hover:text-[#00c88a] transition-colors cursor-pointer"
          >
            <span>Jump directly to {step.targetView}</span>
            <ArrowRight size={14} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
              className="px-3 py-2 rounded-lg bg-[#070B12] border border-white/10 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={handleLaunchModule}
                className="px-4 py-2 rounded-lg bg-[#00E6A0] hover:bg-[#00c88a] text-[#070B12] text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,230,160,0.4)] flex items-center gap-1 cursor-pointer"
              >
                <span>Enter Workspace</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1))}
                className="px-4 py-2 rounded-lg bg-[#00E6A0] hover:bg-[#00c88a] text-[#070B12] text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,230,160,0.4)] flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
