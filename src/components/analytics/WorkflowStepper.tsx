import React from 'react';
import { Shield, FileCheck, Search, History, BarChart3, ArrowRight } from 'lucide-react';
import { View } from '../BrandtraceWorkspacePremium';

interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  targetView: View;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  badge: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: 'Manage Guidelines',
    description: 'Normative rules, approved claims, visual brand palettes, and asset SHA-256 hashes.',
    targetView: 'Brand Constitution',
    icon: Shield,
    badge: 'Rules & Facts',
  },
  {
    step: 2,
    title: 'Review Claims & Assets',
    description: 'Ingest plain text, Markdown, PDF text layers, and brand graphics for compliance check.',
    targetView: 'Content Review',
    icon: FileCheck,
    badge: 'Multi-Format',
  },
  {
    step: 3,
    title: 'Inspect Findings & Evidence',
    description: 'Deterministic rule findings with exact passage spans, citations, and neutral suggestions.',
    targetView: 'Content Review',
    icon: Search,
    badge: 'Zero Hallucination',
  },
  {
    step: 4,
    title: 'Track Changes & History',
    description: 'Time-aware Claim Ledger, version rollback, and immutable append-only audit trail.',
    targetView: 'Audit History',
    icon: History,
    badge: 'Audit Ledger',
  },
  {
    step: 5,
    title: 'Improve Governance',
    description: 'Rule-Change Impact Map, reviewer disagreement telemetry, and autonomous clarification.',
    targetView: 'Governance Insights',
    icon: BarChart3,
    badge: 'Telemetry',
  },
];

interface WorkflowStepperProps {
  currentView: View;
  onSelectView: (view: View) => void;
  onOpenTour?: () => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentView,
  onSelectView,
  onOpenTour,
}) => {
  return (
    <div className="bg-white border border-[#DCE5DF] rounded-2xl p-6 shadow-sm mb-6 transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#EBF0EC]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E9F6F0] text-[#0E9F78] text-[11px] font-bold tracking-wider uppercase mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F78]" />
            End-to-End Governance Lifecycle
          </div>
          <h2 className="text-lg font-bold text-[#123B2D] tracking-tight m-0">
            How BRANDTRACE Works
          </h2>
          <p className="text-xs text-[#617168] mt-0.5 m-0">
            A deterministic, evidence-linked pipeline designed for verifiable brand risk assurance.
          </p>
        </div>

        {onOpenTour && (
          <button
            type="button"
            onClick={onOpenTour}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#123B2D] text-white text-xs font-semibold hover:bg-[#1A4E3D] active:scale-[0.98] transition-all shadow-sm self-start sm:self-auto cursor-pointer"
          >
            Take 2-Min Judge Tour
            <ArrowRight size={14} className="text-[#0E9F78]" />
          </button>
        )}
      </div>

      {/* 5-Step Visual Stepper Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {WORKFLOW_STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isTargetActive = currentView === s.targetView;

          return (
            <div
              key={s.step}
              onClick={() => onSelectView(s.targetView)}
              className={`group relative flex flex-col justify-between p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                isTargetActive
                  ? 'bg-[#F0F9F5] border-[#0E9F78] shadow-sm'
                  : 'bg-[#FAFBF9] border-[#E2EBE5] hover:bg-white hover:border-[#CAD8D0] hover:shadow-sm hover:-translate-y-0.5'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold ${
                      isTargetActive
                        ? 'bg-[#0E9F78] text-white'
                        : 'bg-[#EBF0EC] text-[#617168] group-hover:bg-[#123B2D] group-hover:text-white transition-colors'
                    }`}
                  >
                    {s.step}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider text-[#617168] uppercase bg-white border border-[#E2EBE5] px-1.5 py-0.5 rounded">
                    {s.badge}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <Icon
                    size={15}
                    className={isTargetActive ? 'text-[#0E9F78]' : 'text-[#617168] group-hover:text-[#123B2D]'}
                  />
                  <h3 className="text-xs font-bold text-[#15251E] m-0 tracking-tight">
                    {s.title}
                  </h3>
                </div>

                <p className="text-[11px] text-[#617168] leading-relaxed m-0">
                  {s.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#EAEFEA] flex items-center justify-between text-[11px] font-semibold">
                <span className={isTargetActive ? 'text-[#0E9F78]' : 'text-[#8A9A91] group-hover:text-[#123B2D]'}>
                  {isTargetActive ? 'Active View' : 'Explore View'}
                </span>
                <ArrowRight
                  size={12}
                  className={`transition-transform group-hover:translate-x-0.5 ${
                    isTargetActive ? 'text-[#0E9F78]' : 'text-[#8A9A91] group-hover:text-[#123B2D]'
                  }`}
                />
              </div>

              {/* Connecting arrow indicator for large screens */}
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-[#CAD8D0]">
                  ›
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
