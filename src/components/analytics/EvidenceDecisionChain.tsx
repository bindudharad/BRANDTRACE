import React, { useState } from 'react';
import { EvidenceFinding } from '../../services/api';
import { CheckCircle2, AlertOctagon, HelpCircle, ArrowRight, Shield, BookOpen, UserCheck, Scale } from 'lucide-react';

interface EvidenceDecisionChainProps {
  finding: EvidenceFinding;
}

export const EvidenceDecisionChain: React.FC<EvidenceDecisionChainProps> = ({ finding }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUPPORTED':
        return <CheckCircle2 size={16} className="text-[#16A34A]" />;
      case 'CONTRADICTED':
        return <AlertOctagon size={16} className="text-[#DC2626]" />;
      default:
        return <HelpCircle size={16} className="text-[#D97706]" />;
    }
  };

  return (
    <div className="bg-[#FAFBF9] border border-[#E2EBE5] rounded-xl p-4 my-3 text-left">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EAEFEA]">
        <div className="flex items-center gap-2">
          <Scale size={14} className="text-[#0E9F78]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#123B2D]">
            Explainable Evidence Decision Chain
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-semibold text-[#0E9F78] hover:text-[#0B8262] cursor-pointer"
        >
          {expanded ? 'Show Less' : 'Full Provenance ›'}
        </button>
      </div>

      {/* Visual Chain Progression */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-stretch">
        {/* Node 1: Passage Span */}
        <div className="p-2.5 rounded-lg bg-white border border-[#DCE5DF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#617168] uppercase tracking-wider block mb-1">
            1. Flagged Passage
          </span>
          <div className="font-mono text-xs font-bold text-[#DC2626] bg-[#FEF2F2] p-1.5 rounded border border-[#FCA5A5] truncate">
            &ldquo;{finding.passage}&rdquo;
          </div>
          <span className="text-[10px] text-[#8A9A91] mt-1.5">
            Severity: <strong>{finding.severity}</strong>
          </span>
        </div>

        {/* Node 2: Normative Rule */}
        <div className="p-2.5 rounded-lg bg-white border border-[#DCE5DF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#617168] uppercase tracking-wider block mb-1">
            2. Triggered Policy
          </span>
          <div className="text-xs font-bold text-[#123B2D] truncate">
            {finding.category || 'Brand Rule'}
          </div>
          <span className="text-[10px] font-mono text-[#0E9F78] mt-1.5">
            Rule ID: {finding.source_id || 'R-VOICE-01'}
          </span>
        </div>

        {/* Node 3: Ground Truth Citation */}
        <div className="p-2.5 rounded-lg bg-white border border-[#DCE5DF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#617168] uppercase tracking-wider block mb-1">
            3. Ground Truth Evidence
          </span>
          <div className="text-xs font-medium text-[#1E293B] truncate">
            {finding.source_title || 'Enterprise Brand Standard'}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#617168] mt-1.5">
            {getStatusIcon(finding.status)}
            <span className="font-bold">{finding.status}</span>
          </div>
        </div>

        {/* Node 4: Engine & Action */}
        <div className="p-2.5 rounded-lg bg-white border border-[#DCE5DF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#617168] uppercase tracking-wider block mb-1">
            4. Reviewer Action
          </span>
          <div className="text-xs font-bold text-[#123B2D]">
            {finding.disposition ? (
              <span className="text-[#0E9F78]">{finding.disposition.replace(/_/g, ' ')}</span>
            ) : (
              <span className="text-[#EA580C]">Pending Review</span>
            )}
          </div>
          <span className="text-[10px] text-[#8A9A91] mt-1.5">
            Method: <strong>{finding.analysis_method || 'DETERMINISTIC'}</strong>
          </span>
        </div>
      </div>

      {/* Expanded provenance detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#EAEFEA] space-y-2 text-xs text-[#334155]">
          {finding.source_excerpt && (
            <div className="bg-white p-2.5 rounded-lg border border-[#DCE5DF]">
              <span className="font-bold text-[#123B2D] block mb-0.5">Approved Ground Truth Excerpt:</span>
              <p className="italic text-[#617168] m-0">&ldquo;{finding.source_excerpt}&rdquo;</p>
            </div>
          )}

          {finding.uncertainty && (
            <div className="bg-[#FFFBEB] p-2.5 rounded-lg border border-[#FCD34D] text-[#92400E]">
              <span className="font-bold block mb-0.5">Uncertainty Note (No Hallucination):</span>
              <p className="m-0">{finding.uncertainty}</p>
            </div>
          )}

          {finding.disposition_reason && (
            <div className="bg-[#F0FDF4] p-2.5 rounded-lg border border-[#86EFAC] text-[#166534]">
              <span className="font-bold block mb-0.5">Documented Reviewer Reason:</span>
              <p className="m-0">&ldquo;{finding.disposition_reason}&rdquo; — {finding.disposition_by || 'Reviewer'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
