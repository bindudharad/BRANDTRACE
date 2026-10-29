import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface SeverityBarChartProps {
  bySeverity?: Record<string, number>;
  totalOpen?: number;
}

const SEVERITY_CONFIG = [
  { key: 'CRITICAL', label: 'Critical Risk', deduction: '-30 pts', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  { key: 'HIGH', label: 'High Severity', deduction: '-18 pts', color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' },
  { key: 'MEDIUM', label: 'Medium Risk', deduction: '-10 pts', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  { key: 'LOW', label: 'Low Severity', deduction: '-4 pts', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
];

export const SeverityBarChart: React.FC<SeverityBarChartProps> = ({
  bySeverity = {},
  totalOpen,
}) => {
  const counts = SEVERITY_CONFIG.map((cfg) => ({
    ...cfg,
    count: bySeverity[cfg.key] || 0,
  }));

  const maxVal = Math.max(...counts.map((c) => c.count), 1);
  const sumOpen = totalOpen ?? counts.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="bg-white border border-[#DCE5DF] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EBF0EC]">
        <div>
          <span className="text-[11px] font-bold text-[#0E9F78] uppercase tracking-wider block">
            Deduction Telemetry
          </span>
          <h3 className="text-base font-bold text-[#123B2D] m-0">
            Open Findings by Severity
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold">
          <ShieldAlert size={13} />
          <span>{sumOpen} Unresolved</span>
        </div>
      </div>

      <div className="space-y-3.5 my-auto py-1">
        {counts.map((item) => {
          const percent = Math.round((item.count / maxVal) * 100);

          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-[#15251E]">{item.label}</span>
                  <span className="text-[10px] text-[#8A9A91] font-mono">
                    ({item.deduction})
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-extrabold text-[#123B2D]">{item.count}</span>
                  <span className="text-[11px] text-[#8A9A91]">findings</span>
                </div>
              </div>

              {/* Bar track */}
              <div className="h-2.5 w-full bg-[#F0F4F1] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: item.count === 0 ? '0%' : `${Math.max(percent, 4)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 mt-4 border-t border-[#EBF0EC] text-[11px] text-[#617168] flex items-center justify-between">
        <span>Deterministic Rule Weights:</span>
        <span className="font-semibold text-[#123B2D]">Unresolved High & Critical Block Approval</span>
      </div>
    </div>
  );
};
