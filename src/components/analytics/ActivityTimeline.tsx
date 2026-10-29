import React from 'react';
import { Review, AuditEntry } from '../../services/api';
import { FileText, CheckCircle, AlertTriangle, Shield, User, ArrowRight, Clock } from 'lucide-react';

interface ActivityTimelineProps {
  reviews: Review[];
  auditEntries?: AuditEntry[];
  onSelectReview?: (review: Review) => void;
  onViewAllAudit?: () => void;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  reviews,
  auditEntries = [],
  onSelectReview,
  onViewAllAudit,
}) => {
  // Combine reviews and audit entries into a normalized timeline
  interface TimelineItem {
    id: string;
    type: 'review' | 'audit';
    title: string;
    subtitle: string;
    actor: string;
    timestamp: string;
    statusBadge?: string;
    statusColor?: string;
    reviewRef?: Review;
  }

  const items: TimelineItem[] = [
    ...reviews.map((r) => ({
      id: `rev-${r.id}`,
      type: 'review' as const,
      title: r.title || 'Untitled Draft Review',
      subtitle: `${r.findings?.length || 0} findings evaluated • Score: ${r.score}/100`,
      actor: r.author || 'Reviewer',
      timestamp: r.updated_at || r.created_at || 'Recently',
      statusBadge: r.status.replace(/_/g, ' '),
      statusColor:
        r.status === 'APPROVED'
          ? '#16A34A'
          : r.status === 'CHANGES_REQUESTED'
          ? '#DC2626'
          : '#D97706',
      reviewRef: r,
    })),
    ...auditEntries.map((a) => ({
      id: `audit-${a.id}`,
      type: 'audit' as const,
      title: `Action: ${a.action}`,
      subtitle: a.details || a.reason || 'Audit event logged',
      actor: `${a.actor} (${a.actor_role})`,
      timestamp: a.created_at || 'Recently',
      statusBadge: 'AUDIT',
      statusColor: '#0E9F78',
    })),
  ].slice(0, 7);

  const formatTime = (ts: string) => {
    if (!ts || ts === 'Recently') return 'Recently';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="bg-white border border-[#DCE5DF] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EBF0EC]">
        <div>
          <span className="text-[11px] font-bold text-[#0E9F78] uppercase tracking-wider block">
            Chronological Provenance
          </span>
          <h3 className="text-base font-bold text-[#123B2D] m-0">
            Recent Activity & Audit Stream
          </h3>
        </div>
        {onViewAllAudit && (
          <button
            type="button"
            onClick={onViewAllAudit}
            className="text-xs font-semibold text-[#0E9F78] hover:text-[#0B8262] flex items-center gap-1 cursor-pointer"
          >
            Audit Log <ArrowRight size={13} />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#8A9A91]">
          No recorded review or audit activity yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 my-auto py-1">
          {/* Timeline continuous vertical line */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#E2EBE5]" />

          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => item.reviewRef && onSelectReview?.(item.reviewRef)}
              className={`relative flex items-start gap-3 group text-left ${
                item.reviewRef ? 'cursor-pointer' : ''
              }`}
            >
              {/* Timeline Node Dot */}
              <div
                className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-xs"
                style={{ borderColor: item.statusColor || '#0E9F78' }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: item.statusColor || '#0E9F78' }}
                />
              </div>

              <div className="flex-1 min-w-0 bg-[#FAFBF9] border border-[#E2EBE5] rounded-xl p-3 hover:bg-white hover:border-[#CAD8D0] hover:shadow-xs transition-all">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-[#15251E] truncate">
                      {item.title}
                    </span>
                    {item.statusBadge && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                        style={{
                          color: item.statusColor || '#0E9F78',
                          backgroundColor: `${item.statusColor}15` || '#E9F6F0',
                        }}
                      >
                        {item.statusBadge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#8A9A91] flex items-center gap-1 flex-shrink-0">
                    <Clock size={10} />
                    {formatTime(item.timestamp)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#617168]">
                  <span className="truncate">{item.subtitle}</span>
                  <span className="text-[#8A9A91] font-mono text-[10px] ml-2 flex-shrink-0">
                    {item.actor}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-3 mt-4 border-t border-[#EBF0EC] text-[11px] text-[#617168] flex items-center justify-between">
        <span>Immutable Provenance:</span>
        <span className="font-semibold text-[#123B2D]">Append-Only Audit Ledger</span>
      </div>
    </div>
  );
};
