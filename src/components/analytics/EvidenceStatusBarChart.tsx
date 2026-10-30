import React from 'react';
import { CheckCircle2, AlertOctagon, Clock, HelpCircle, FileX } from 'lucide-react';

interface EvidenceStatusBarChartProps {
  byStatus?: Record<string, number>;
}

const STATUS_CONFIG = [
  { key: 'SUPPORTED', label: 'Supported', color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle2 },
  { key: 'CONTRADICTED', label: 'Contradicted', color: '#DC2626', bg: '#FEF2F2', icon: AlertOctagon },
  { key: 'OUTDATED', label: 'Outdated / Expired', color: '#EA580C', bg: '#FFF7ED', icon: Clock },
  { key: 'UNSUPPORTED_BY_APPROVED_EVIDENCE', label: 'Unsupported', color: '#D97706', bg: '#FFFBEB', icon: FileX },
  { key: 'NEEDS_REVIEW', label: 'Needs Review', color: '#0284C7', bg: '#F0F9FF', icon: HelpCircle },
];

export const EvidenceStatusBarChart: React.FC<EvidenceStatusBarChartProps> = ({
  byStatus = {},
}) => {
  const items = STATUS_CONFIG.map((cfg) => ({
    ...cfg,
    count: byStatus[cfg.key] || 0,
  }));

  const total = items.reduce((acc, i) => acc + i.count, 0);

  return (
    <div className="bg-white border border-[#DCE5DF] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EBF0EC]">
        <div>
          <span className="text-[11px] font-bold text-[#0E9F78] uppercase tracking-wider block">
            Factual Verification
          </span>
          <h3 className="text-base font-bold text-[#123B2D] m-0">
            Evidence Linkage Breakdown
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#617168] bg-[#F0F4F1] px-2.5 py-1 rounded-full">
          {total} Evaluated Assertions
        </span>
      </div>

      {total === 0 ? (
        <div className="py-8 text-center text-xs text-[#8A9A91]">
          No factual claims evaluated in current review session.
        </div>
      ) : (
        <div className="space-y-3 my-auto py-1">
          {/* Segmented bar view */}
          <div className="h-3.5 w-full bg-[#F0F4F1] rounded-full overflow-hidden flex">
            {items.map((item) => {
              if (item.count === 0) return null;
              const pct = (item.count / total) * 100;
              return (
                <div
                  key={item.key}
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                  className="h-full transition-all duration-300 relative group"
                  title={`${item.label}: ${item.count} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          {/* Cards for each status */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2">
            {items.map((item) => {
              const Icon = item.icon;
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;

              return (
                <div
                  key={item.key}
                  className="p-3 rounded-xl border border-[#E2EBE5] bg-[#FAFBF9] flex flex-col justify-between min-w-0"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon size={14} style={{ color: item.color }} className="shrink-0" />
                    <span className="text-[11px] font-bold text-[#15251E] leading-snug break-words">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-auto">
                    <span className="text-base font-extrabold text-[#123B2D]">
                      {item.count}
                    </span>
                    <span className="text-[10px] font-semibold text-[#8A9A91]">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-3 mt-4 border-t border-[#EBF0EC] text-[11px] text-[#617168] flex items-center justify-between">
        <span>Evidence Engine:</span>
        <span className="font-semibold text-[#123B2D]">Uncited Claims Trigger NEEDS_REVIEW (No False Certitude)</span>
      </div>
    </div>
  );
};
