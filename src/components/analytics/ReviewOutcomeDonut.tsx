import React, { useState } from 'react';
import { Review } from '../../services/api';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ReviewOutcomeDonutProps {
  reviews: Review[];
}

export const ReviewOutcomeDonut: React.FC<ReviewOutcomeDonutProps> = ({ reviews }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = reviews.length;

  const approved = reviews.filter((r) => r.status === 'APPROVED').length;
  const changesReq = reviews.filter((r) => r.status === 'CHANGES_REQUESTED').length;
  const inReview = reviews.filter((r) => r.status === 'IN_REVIEW').length;
  const waived = reviews.filter((r) => r.status === 'WAIVED').length;

  const segments = [
    { label: 'Approved', count: approved, color: '#0E9F78', bg: '#E9F6F0', icon: CheckCircle2 },
    { label: 'In Review', count: inReview, color: '#0284C7', bg: '#F0F9FF', icon: Clock },
    { label: 'Changes Requested', count: changesReq, color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle },
    { label: 'Waived Exception', count: waived, color: '#64748B', bg: '#F1F5F9', icon: ShieldCheck },
  ].filter((s) => total === 0 || s.count >= 0);

  // SVG Donut calculation
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const passRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="bg-white border border-[#DCE5DF] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EBF0EC]">
        <div>
          <span className="text-[11px] font-bold text-[#0E9F78] uppercase tracking-wider block">
            Verification Pipeline
          </span>
          <h3 className="text-base font-bold text-[#123B2D] m-0">
            Review Outcome Distribution
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#617168] bg-[#F0F4F1] px-2.5 py-1 rounded-full">
          {total} Total Reviews
        </span>
      </div>

      {total === 0 ? (
        <div className="py-10 text-center text-xs text-[#8A9A91]">
          No review records available yet.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 my-auto py-2">
          {/* SVG Donut */}
          <div className="relative w-[160px] h-[160px] flex-shrink-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
              aria-label="Review Outcome Donut Chart"
            >
              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#F0F4F1"
                strokeWidth={strokeWidth}
              />

              {/* Segment Strokes */}
              {segments.map((seg, idx) => {
                if (seg.count === 0) return null;
                const percent = seg.count / total;
                const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
                const strokeDashoffset = -circumference * accumulatedPercent;
                accumulatedPercent += percent;

                const isHovered = hoveredIdx === idx;

                return (
                  <circle
                    key={seg.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-black text-[#123B2D] tracking-tight leading-none">
                {passRate}%
              </span>
              <span className="text-[10px] font-bold text-[#617168] uppercase tracking-wider mt-1">
                Approved Rate
              </span>
            </div>
          </div>

          {/* Accessible Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 flex-1 w-full text-xs">
            {segments.map((seg, idx) => {
              const Icon = seg.icon;
              const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={seg.label}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'border-[#0E9F78] bg-[#F0F9F5] shadow-xs'
                      : 'border-transparent hover:border-[#E2EBE5] hover:bg-[#F8FAF9]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-medium text-[#1E293B] truncate">
                      {seg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#123B2D]">
                      {seg.count}
                    </span>
                    <span className="text-[11px] font-semibold text-[#8A9A91] w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Summary Bar */}
      <div className="pt-3 mt-2 border-t border-[#EBF0EC] flex items-center justify-between text-[11px] text-[#617168]">
        <span>Strict Gate Status:</span>
        <span className="font-bold text-[#123B2D]">
          {changesReq > 0 ? `${changesReq} Blocking Sign-off` : 'Clearance Unblocked'}
        </span>
      </div>
    </div>
  );
};
