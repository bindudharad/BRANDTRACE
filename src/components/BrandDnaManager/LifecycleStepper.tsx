import React from 'react';
import { LifecycleState } from '../../types/brandDna';
import { Check, ArrowRight, Sparkles, UserCheck, Shield, Flame, AlertCircle, MessageSquare } from 'lucide-react';
import { BorderGlow } from '../BorderGlow';

interface LifecycleStepperProps {
  currentState: LifecycleState;
  onAdvanceState: (newState: LifecycleState) => void;
  onOpenAiExtract?: () => void;
}

const LIFECYCLE_STAGES: Array<{
  state: LifecycleState;
  visualStep: number;
  label: string;
  sub: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    state: 'DRAFT',
    visualStep: 2,
    label: 'Draft',
    sub: 'Raw Guidelines',
    description: 'Raw brand guidelines, sample text, or unformatted notes.',
    icon: <Sparkles className="w-3.5 h-3.5" />
  },
  {
    state: 'AI_GENERATED',
    visualStep: 3,
    label: 'AI-Generated',
    sub: 'Structured Extract',
    description: 'AI model converted raw text into candidate voice & ruleset.',
    icon: <Sparkles className="w-3.5 h-3.5" />
  },
  {
    state: 'USER_REVIEW',
    visualStep: 4,
    label: 'User Review',
    sub: 'Human Tuning',
    description: 'Human checks rules, vocabulary, colors, and weights.',
    icon: <UserCheck className="w-3.5 h-3.5" />
  },
  {
    state: 'APPROVED',
    visualStep: 5,
    label: 'Approved',
    sub: 'Locked & Validated',
    description: 'Human approved profile, ready for activation.',
    icon: <Shield className="w-3.5 h-3.5" />
  },
  {
    state: 'ACTIVE',
    visualStep: 6,
    label: 'Active',
    sub: 'Live Benchmark',
    description: 'Live Brand DNA benchmark used across all audit checks.',
    icon: <Flame className="w-3.5 h-3.5" />
  }
];

export const LifecycleStepper: React.FC<LifecycleStepperProps> = ({
  currentState,
  onAdvanceState,
  onOpenAiExtract
}) => {
  const currentStageIndex = LIFECYCLE_STAGES.findIndex((s) => s.state === currentState);

  const handleStageClick = (targetState: LifecycleState) => {
    // Enforcement rule: AI_GENERATED cannot silently skip directly to ACTIVE
    if ((currentState === 'AI_GENERATED' || currentState === 'DRAFT') && targetState === 'ACTIVE') {
      alert('Safety Constraint: AI-generated profiles must be reviewed and approved by a human before activation.');
      onAdvanceState('USER_REVIEW');
      return;
    }
    onAdvanceState(targetState);
  };

  const handleNext = () => {
    if (currentStageIndex < LIFECYCLE_STAGES.length - 1) {
      onAdvanceState(LIFECYCLE_STAGES[currentStageIndex + 1].state);
    }
  };

  const handlePrev = () => {
    if (currentStageIndex > 0) {
      onAdvanceState(LIFECYCLE_STAGES[currentStageIndex - 1].state);
    }
  };

  return (
    <BorderGlow borderRadius="rounded-[6px]" glowColor="cyan">
      <div className="p-5 rounded-[6px] neo-liquid-panel space-y-4 relative overflow-hidden border border-[#1F2937]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-2">
            <span>Brand DNA Lifecycle Pipeline</span>
            <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-[2px] bg-[#0B0F17] text-cyan-300 border border-[#1F2937]">
              6 Visual Stages &bull; 5 State Pipeline
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Guaranteed human-in-the-loop: AI-generated profiles require human review and approval before becoming Active.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenAiExtract && (
            <button
              onClick={onOpenAiExtract}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-cyan-300 bg-[#0B0F17] hover:bg-white/[0.04] border border-[#1F2937] hover:border-cyan-500/40 transition-colors cursor-pointer"
              title="Open conversational AI drafting interface"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Conversational AI Drafter</span>
            </button>
          )}

          {currentStageIndex > 0 && (
            <button
              onClick={handlePrev}
              className="px-3 py-1.5 rounded-[4px] text-xs font-medium text-slate-300 hover:text-white bg-[#0B0F17] hover:bg-white/[0.04] border border-[#1F2937] transition-colors cursor-pointer"
            >
              Previous Stage
            </button>
          )}

          {currentState === 'USER_REVIEW' && (
            <button
              onClick={() => onAdvanceState('APPROVED')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-medium text-white bg-teal-600 hover:bg-teal-500 border border-teal-400/40 transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Approve Profile
            </button>
          )}

          {currentState === 'APPROVED' && (
            <button
              onClick={() => onAdvanceState('ACTIVE')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-medium text-[#0B0F17] bg-cyan-400 hover:bg-cyan-300 border border-cyan-300 transition-colors cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              Set as Active
            </button>
          )}

          {currentState !== 'USER_REVIEW' && currentState !== 'APPROVED' && currentStageIndex < LIFECYCLE_STAGES.length - 1 && (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-medium text-[#0B0F17] bg-cyan-400 hover:bg-cyan-300 transition-colors cursor-pointer"
            >
              <span>Advance to {LIFECYCLE_STAGES[currentStageIndex + 1].label}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Safety Notice if AI_GENERATED */}
      {currentState === 'AI_GENERATED' && (
        <div className="p-3 rounded-[4px] bg-[#111827] border border-teal-500/40 text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>
              <strong className="text-teal-300 font-medium">Review Required:</strong> This profile was extracted by AI. A human must review and approve it before it can become the Active audit benchmark.
            </span>
          </div>
          <button
            onClick={() => onAdvanceState('USER_REVIEW')}
            className="w-full sm:w-auto text-center px-3 py-1.5 rounded-[4px] bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 font-medium border border-teal-500/40 text-xs whitespace-nowrap cursor-pointer transition-colors shrink-0"
          >
            Start User Review &rarr;
          </button>
        </div>
      )}

      {/* 6-Step Visual Stepper Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
        {/* Step 1 (Visual Only): Describe Your Brand -> Launches AI Extraction Modal */}
        <div
          onClick={() => onOpenAiExtract && onOpenAiExtract()}
          className={`p-3 rounded-[4px] border transition-colors cursor-pointer relative ${
            currentState === 'DRAFT' || currentState === 'AI_GENERATED'
              ? 'bg-[#111827] border-cyan-500/50 text-white'
              : 'bg-[#0B0F17] border-[#1F2937] hover:border-[#374151] text-slate-300'
          }`}
          title="Click to describe your brand in conversational language with Gemini"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-[2px] bg-[#0B0F17] text-cyan-300 border border-[#1F2937]">
              01
            </span>
            <div className="text-cyan-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="font-medium text-xs text-white truncate font-mono uppercase tracking-wider flex items-center gap-1">
            <span>Describe</span>
            <Sparkles className="w-3 h-3 text-cyan-400 inline shrink-0" />
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">Conversational AI</div>
        </div>

        {/* Steps 2-6 (Visual): Mapped to existing 5 real LifecycleState data models */}
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const isPassed = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;

          return (
            <div
              key={stage.state}
              onClick={() => handleStageClick(stage.state)}
              className={`p-3 rounded-[4px] border transition-colors cursor-pointer relative ${
                isCurrent
                  ? 'bg-[#111827] border-cyan-400 text-white'
                  : isPassed
                  ? 'bg-[#111827] border-[#1F2937] hover:border-[#374151] text-slate-200'
                  : 'bg-[#0B0F17] border-[#1F2937]/50 text-slate-500 hover:border-[#1F2937]'
              }`}
            >
              {/* Top Step Number & Icon */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-[2px] ${
                  isCurrent
                    ? 'bg-cyan-500 text-[#0B0F17]'
                    : isPassed
                    ? 'bg-[#0B0F17] text-teal-300 border border-[#1F2937]'
                    : 'bg-[#0B0F17] text-slate-500 border border-[#1F2937]/50'
                }`}>
                  0{stage.visualStep}
                </span>

                <div className={isCurrent ? 'text-cyan-400' : isPassed ? 'text-teal-400' : 'text-slate-500'}>
                  {isPassed ? <Check className="w-3.5 h-3.5" /> : stage.icon}
                </div>
              </div>

              <div className="font-medium text-xs text-white truncate font-mono uppercase tracking-wider">{stage.label}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{stage.sub}</div>

              {isCurrent && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
    </BorderGlow>
  );
};

