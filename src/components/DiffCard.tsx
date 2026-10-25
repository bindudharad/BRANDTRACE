import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { Check, Sparkles, AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { SeverityLevel } from '../types/brandDna';
import { BorderGlow, GlowColor } from './BorderGlow';

interface DiffCardProps {
  ruleId: string;
  severity: SeverityLevel;
  confidence: number;
  evidenceQuote: string;
  findingSummary: string;
  suggestedRewrite: string;
  onApplyRewrite: (original: string, replacement: string) => void;
}

export const DiffCard: React.FC<DiffCardProps> = ({
  ruleId,
  severity,
  confidence,
  evidenceQuote,
  findingSummary,
  suggestedRewrite,
  onApplyRewrite
}) => {
  const [isApplied, setIsApplied] = useState(false);

  const getSeverityBadge = () => {
    switch (severity) {
      case 'CRITICAL':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
          label: 'CRITICAL',
          classes: 'bg-rose-950/50 border-rose-500/40 text-rose-300'
        };
      case 'HIGH':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
          label: 'HIGH',
          classes: 'bg-rose-950/30 border-rose-500/30 text-rose-300'
        };
      case 'MEDIUM':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: 'MEDIUM',
          classes: 'bg-amber-950/30 border-amber-500/30 text-amber-300'
        };
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'LOW',
          classes: 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
        };
    }
  };

  const badge = getSeverityBadge();

  // Sanitize all untrusted AI outputs with DOMPurify
  const sanitizedEvidence = DOMPurify.sanitize(evidenceQuote);
  const sanitizedSummary = DOMPurify.sanitize(findingSummary);
  const sanitizedRewrite = DOMPurify.sanitize(suggestedRewrite);

  const handleApply = () => {
    onApplyRewrite(evidenceQuote, suggestedRewrite);
    setIsApplied(true);
    setTimeout(() => {
      setIsApplied(false);
    }, 2000);
  };

  // Format rule label nicely (e.g., "R-TONE-01" -> "Tone", "R-PRECISION-02" -> "Precision", "R-CLARITY-03" -> "Clarity")
  const getRuleCategoryLabel = (id: string) => {
    const upper = id.toUpperCase();
    if (upper.includes('TONE')) return 'Tone';
    if (upper.includes('PRECISION')) return 'Precision';
    if (upper.includes('CLARITY')) return 'Clarity';
    if (upper.includes('COLOR') || upper.includes('VIS')) return 'Visual';
    if (upper.includes('VOCAB') || upper.includes('TERM')) return 'Precision';
    // Fallback: clean up any leading R- and trailing numbers
    return id.replace(/^R-?/i, '').replace(/-\d+$/, '');
  };

  const ruleLabel = getRuleCategoryLabel(ruleId);

  const glowColor: GlowColor = isApplied
    ? 'teal'
    : severity === 'CRITICAL' || severity === 'HIGH'
    ? 'rose'
    : severity === 'MEDIUM'
    ? 'amber'
    : 'cyan';

  return (
    <BorderGlow
      borderRadius="rounded-2xl"
      glowColor={glowColor}
      active={isApplied}
      intensity={severity === 'CRITICAL' ? 'strong' : 'subtle'}
    >
      <div className={`p-5 rounded-2xl border transition-all ${
        isApplied 
          ? 'border-teal-400 bg-[#030818] shadow-[0_0_30px_rgba(20,184,166,0.3)]' 
          : 'border-cyan-500/20 bg-[#030818]/80 backdrop-blur-md hover:border-cyan-500/40'
      }`}>
        {/* Top Header with Category Word on left and Severity Badge on right */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-lexend">
            {ruleLabel}
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badge.classes}`}>
            {badge.icon}
            {badge.label}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {ruleId}
          </span>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Confidence: <span className="font-bold text-white">{Math.round(confidence * 100)}%</span>
        </div>
      </div>

      {/* Finding Diagnostic Summary */}
      <p className="text-xs text-slate-300 mb-3.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizedSummary }} />

      {/* Side-by-Side Visual Diff */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-3 rounded-xl bg-black/40 border border-cyan-500/20">
        {/* Flagged Original Text */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Detected Issue
          </div>
          <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs text-rose-200 line-through decoration-rose-400 decoration-1 leading-relaxed">
            &ldquo;{sanitizedEvidence}&rdquo;
          </div>
        </div>

        {/* Suggested Rewrite */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Suggested Alignment
          </div>
          <div className="p-3 rounded-lg bg-teal-950/20 border border-teal-500/30 text-xs text-teal-100 leading-relaxed">
            &ldquo;{sanitizedRewrite}&rdquo;
          </div>
        </div>
      </div>

      {/* 1-Click Action Bar */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleApply}
          disabled={isApplied}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
            isApplied
              ? 'bg-teal-500 text-black'
              : 'neo-liquid-btn-primary text-white shadow-cyan-500/30'
          }`}
        >
          {isApplied ? (
            <>
              <Check className="w-4 h-4" />
              Applied to Draft!
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-cyan-200" />
              Apply Suggestion
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </>
          )}
        </button>
      </div>
    </div>
    </BorderGlow>
  );
};
