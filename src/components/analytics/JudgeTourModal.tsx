import React, { useState } from 'react';
import {
  Shield,
  FileCheck,
  Search,
  History,
  BarChart3,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { View } from '../BrandtraceWorkspacePremium';

interface TourStep {
  title: string;
  tagline: string;
  badge: string;
  content: string;
  highlights: string[];
  targetView: View;
  actionText: string;
  evidenceCode: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Brand Constitution & Time-Aware Claim Ledger',
    tagline: 'Defensible guidelines with verifiable source citations and validity bounds.',
    badge: 'Step 1 of 5',
    content:
      'BRANDTRACE separates subjective marketing opinions from verifiable rules. Rules specify exact pattern matching, required phrases, and forbidden claims with source document citations. The Claim Ledger records corporate claims with explicit effective and expiration dates.',
    highlights: [
      'Time-aware fact ledger with 30-day expiring-soon and expired states',
      'Immutable rule version history with expected_version optimistic concurrency',
      'Visual brand profile (primary/secondary colors, WCAG AA 4.5:1 contrast)',
      'SHA-256 binary hash matching for brand assets in brand_assets registry',
    ],
    targetView: 'Brand Constitution',
    actionText: 'Inspect Constitution & Ledger',
    evidenceCode: 'GET /api/rules • GET /api/facts • GET /api/brand-profile',
  },
  {
    title: '2. Multi-Format Content Analysis & Deterministic Engine',
    tagline: 'Source-grounded evaluations. Exact passage spans with neutral replacements.',
    badge: 'Step 2 of 5',
    content:
      'Content (plain copy, Markdown, or PDF text layers) is analyzed through our deterministic first engine. Rules fire on exact regex and string boundaries. When rules are triggered, the engine proposes replacements only if a strictly neutral alternative exists, avoiding word duplication and broken grammar.',
    highlights: [
      'Base 100 clearance score with dynamic point deductions (Critical -30, High -18, Medium -10, Low -4)',
      'Option B deterministic OCR unsupported notice (transparent limitations)',
      'Neutral replacements preserve exact sentence grammar without word duplication',
      'Broad geographic assertions evaluated as NEEDS_REVIEW against territory facts',
    ],
    targetView: 'Content Review',
    actionText: 'Try Content Review',
    evidenceCode: 'POST /api/reviews • POST /api/reviews/upload',
  },
  {
    title: '3. Human Reviewer Workflow & Server-Enforced Approval Gate',
    tagline: 'Strict HTTP 409 Conflict blocks premature publication sign-off.',
    badge: 'Step 3 of 5',
    content:
      'Reviewers inspect findings side-by-side with original source citations. Actions (Accept Edit, Edit Draft, Dismiss with Reason, Escalate) update the draft and re-score the content. The backend strictly prevents publication: drafts with unresolved HIGH or CRITICAL findings cannot be approved.',
    highlights: [
      'Server-side gate returns HTTP 409 Conflict on unresolved high-severity findings',
      'Dismissals require auditable reason strings (reason cannot overwrite draft copy)',
      'QA metadata contamination strictly rejected with HTTP 422 Unprocessable Entity',
      'Simulated demo roles (Reviewer, Creator, Brand Admin, Auditor) with server-enforced authorization',
    ],
    targetView: 'Content Review',
    actionText: 'View Human Review Gate',
    evidenceCode: 'POST /api/reviews/{review_id}/approval • HTTP 409 Conflict Gate',
  },
  {
    title: '4. Immutable Version History & Chronological Audit Ledger',
    tagline: 'Every keystroke, edit, disposition, and rollback recorded with full provenance.',
    badge: 'Step 4 of 5',
    content:
      'Every accepted recommendation or manual draft revision creates an immutable version snapshot. Reviewers can inspect historical diffs and execute one-click rollbacks with audit trail logging.',
    highlights: [
      'One-click draft version rollback with VERSION_RESTORED audit event',
      'Cross-workspace tenant isolation enforced server-side (HTTP 403 on foreign tenant)',
      'Durable system_state bootstrap tracking prevents duplicate or corrupted setup',
      'Administrator self-lockout prevention (HTTP 422 on self-removal)',
    ],
    targetView: 'Audit History',
    actionText: 'Inspect Audit Ledger',
    evidenceCode: 'GET /api/reviews/{review_id}/versions • GET /api/reviews/{review_id}/audit',
  },
  {
    title: '5. Rule-Change Impact Map & Guideline Health Intelligence',
    tagline: 'Understand the downstream impact of changing a rule or expiring a fact.',
    badge: 'Step 5 of 5',
    content:
      'When an engineering metric changes or a regulatory claim expires, the Claim Impact Map traces every historical draft dependent on that fact and calculates re-review urgency. Guideline Health Intelligence detects reviewer disagreements and suggests rule clarifications.',
    highlights: [
      'Claim Impact Map identifies affected historical drafts with URGENT / RECOMMENDED tiers',
      'Targeted re-review trigger updates affected reviews without full database reset',
      'Reviewer disagreement telemetry detects conflicting dispositions across actors',
      'Reviewer-guided rule clarification lifecycle: PENDING → ACCEPTED → ACTIVATED',
    ],
    targetView: 'Governance Insights',
    actionText: 'Explore Impact & Telemetry',
    evidenceCode: 'GET /api/governance/impact-map • GET /api/governance/guideline-health',
  },
];

interface JudgeTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
}

export const JudgeTourModal: React.FC<JudgeTourModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStepIdx];
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === TOUR_STEPS.length - 1;

  const handleJump = () => {
    onNavigate(step.targetView);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A241B]/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#DCE5DF] rounded-3xl max-w-2xl w-full p-7 sm:p-8 shadow-2xl relative text-[#15251E] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple-style Top Bar */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EBF0EC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#123B2D] flex items-center justify-center text-white shadow-sm">
              <Sparkles size={16} className="text-[#0E9F78]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#0E9F78] uppercase tracking-wider block">
                Judge & First-Time Walkthrough
              </span>
              <h2 id="tour-modal-title" className="text-base font-bold text-[#123B2D] m-0">
                BRANDTRACE Product Tour
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tour"
            className="w-8 h-8 rounded-full border border-[#DCE5DF] flex items-center justify-center text-[#617168] hover:bg-[#F0F4F1] hover:text-[#123B2D] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-2 mb-6">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setCurrentStepIdx(idx)}
              aria-label={`Go to step ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                idx === currentStepIdx
                  ? 'w-10 bg-[#0E9F78]'
                  : idx < currentStepIdx
                  ? 'w-4 bg-[#123B2D]'
                  : 'w-4 bg-[#E2EBE5] hover:bg-[#CAD8D0]'
              }`}
            />
          ))}
          <span className="ml-auto text-xs font-bold text-[#617168]">
            {step.badge}
          </span>
        </div>

        {/* Step Content */}
        <div className="space-y-4 mb-7">
          <div>
            <h3 className="text-xl font-extrabold text-[#123B2D] tracking-tight m-0 mb-1">
              {step.title}
            </h3>
            <p className="text-sm font-semibold text-[#0E9F78] m-0">
              {step.tagline}
            </p>
          </div>

          <p className="text-sm text-[#334155] leading-relaxed m-0 bg-[#F8FAF9] p-4 rounded-xl border border-[#EBF0EC]">
            {step.content}
          </p>

          {/* Key Verification Highlights */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold uppercase tracking-wider text-[#617168]">
              Verified Capabilities & Rigor:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {step.highlights.map((h) => (
                <div
                  key={h}
                  className="flex items-start gap-2 text-xs text-[#1E293B] bg-white p-2.5 rounded-lg border border-[#E2EBE5]"
                >
                  <CheckCircle2 size={14} className="text-[#0E9F78] mt-0.5 flex-shrink-0" />
                  <span className="leading-snug">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* API Verification Badge */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#617168] bg-[#F1F5F3] px-3 py-1.5 rounded-lg border border-[#DCE5DF]">
            <Lock size={12} className="text-[#0E9F78]" />
            <span>Underlying Real Endpoints: <strong>{step.evidenceCode}</strong></span>
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#EBF0EC] gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleJump}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E9F6F0] text-[#0E9F78] border border-[#A6CDBA] text-xs font-bold hover:bg-[#D4EFE4] transition-colors cursor-pointer"
          >
            {step.actionText}
            <ExternalLink size={13} />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setCurrentStepIdx((prev) => prev - 1)}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-[#DCE5DF] bg-white text-xs font-semibold text-[#15251E] hover:bg-[#F0F4F1] transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                onClick={() => setCurrentStepIdx((prev) => prev + 1)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#123B2D] text-white text-xs font-semibold hover:bg-[#1A4E3D] transition-colors cursor-pointer shadow-sm"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJump}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#0E9F78] text-white text-xs font-bold hover:bg-[#0B8262] transition-colors cursor-pointer shadow-sm"
              >
                Enter App & Explore Live
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
