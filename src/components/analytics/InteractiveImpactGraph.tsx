import React, { useState } from 'react';
import { ImpactMap, ImpactItem } from '../../services/api';
import { Network, RefreshCw, AlertTriangle, ArrowRight, List, GitBranch, FileText, CheckCircle2 } from 'lucide-react';

interface InteractiveImpactGraphProps {
  impactMap: ImpactMap | null;
  onTriggerReReview: (itemId: string) => void;
  onNavigateToDraft?: (reviewId: string) => void;
}

export const InteractiveImpactGraph: React.FC<InteractiveImpactGraphProps> = ({
  impactMap,
  onTriggerReReview,
  onNavigateToDraft,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [reReviewingId, setReReviewingId] = useState<string | null>(null);

  const items = impactMap?.items || [];
  const selectedItem = items.find((i) => i.item_id === selectedItemId) || items[0] || null;

  const handleReReview = async (id: string) => {
    setReReviewingId(id);
    try {
      await onTriggerReReview(id);
    } finally {
      setReReviewingId(null);
    }
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'URGENT':
        return { badge: 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]', ring: 'border-[#DC2626]', dot: 'bg-[#DC2626]' };
      case 'RECOMMENDED':
        return { badge: 'bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]', ring: 'border-[#D97706]', dot: 'bg-[#D97706]' };
      default:
        return { badge: 'bg-[#F0FDF4] text-[#166534] border-[#86EFAC]', ring: 'border-[#16A34A]', dot: 'bg-[#16A34A]' };
    }
  };

  return (
    <div className="bg-white border border-[#DCE5DF] rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#EBF0EC]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E9F6F0] text-[#0E9F78] text-[11px] font-bold tracking-wider uppercase mb-1">
            <Network size={12} />
            Round 3 Dependency Telemetry
          </div>
          <h3 className="text-lg font-bold text-[#123B2D] m-0">
            Rule-Change & Fact-Expiry Impact Map
          </h3>
          <p className="text-xs text-[#617168] mt-0.5 m-0">
            Visual graph mapping changed or expiring guidelines to dependent historical drafts requiring re-review.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View mode toggle */}
          <div className="flex items-center bg-[#F0F4F1] p-1 rounded-xl border border-[#DCE5DF]">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'graph'
                  ? 'bg-white text-[#123B2D] shadow-xs'
                  : 'text-[#617168] hover:text-[#123B2D]'
              }`}
            >
              <GitBranch size={13} />
              <span>Graph View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#123B2D] shadow-xs'
                  : 'text-[#617168] hover:text-[#123B2D]'
              }`}
            >
              <List size={13} />
              <span>List View</span>
            </button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#8A9A91]">
          No impacted drafts detected. All guidelines and facts are currently valid and up to date.
        </div>
      ) : viewMode === 'graph' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Source Guidelines Nodes */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#617168] mb-2 flex items-center justify-between">
              <span>Modified or Expiring Guidelines</span>
              <span className="text-[11px] text-[#0E9F78] font-semibold">{items.length} Trigger Nodes</span>
            </div>

            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {items.map((item) => {
                const isSelected = selectedItem?.item_id === item.item_id;
                const urgency = getUrgencyStyles(item.re_review_urgency);
                const draftCount = item.affected_drafts?.length || item.affected_review_ids?.length || 0;

                return (
                  <div
                    key={item.item_id}
                    onClick={() => setSelectedItemId(item.item_id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#F0F9F5] border-[#0E9F78] shadow-sm ring-1 ring-[#0E9F78]'
                        : 'bg-[#FAFBF9] border-[#E2EBE5] hover:bg-white hover:border-[#CAD8D0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${urgency.dot}`} />
                        <span className="text-xs font-mono font-bold text-[#617168]">
                          {item.item_id}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#DCE5DF] text-[#123B2D]">
                          {item.item_type}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${urgency.badge}`}>
                        {item.re_review_urgency}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#15251E] m-0 mb-1 leading-snug">
                      {item.item_title}
                    </h4>

                    {item.reason && (
                      <p className="text-[11px] text-[#617168] line-clamp-2 m-0 mb-2">
                        {item.reason}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] font-semibold pt-2 border-t border-[#EAEFEA]">
                      <span className="text-[#0E9F78]">
                        {draftCount} Affected Draft{draftCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-[#8A9A91] group-hover:text-[#123B2D] flex items-center gap-1">
                        Inspect Nodes ›
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Connected Dependent Drafts */}
          <div className="lg:col-span-7 bg-[#FAFBF9] border border-[#E2EBE5] rounded-xl p-5 min-h-[380px] flex flex-col justify-between">
            {selectedItem ? (
              <div>
                {/* Node Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#E2EBE5]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-[#0E9F78]">
                        {selectedItem.item_id}
                      </span>
                      <span className="text-[11px] font-bold text-[#123B2D]">
                        {selectedItem.item_title}
                      </span>
                    </div>
                    <span className="text-xs text-[#617168]">
                      {selectedItem.reason || 'Impact triggered by recent policy revision or expiration.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleReReview(selectedItem.item_id)}
                    disabled={reReviewingId === selectedItem.item_id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E9F78] text-white text-xs font-bold hover:bg-[#0B8262] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer shadow-xs self-start sm:self-auto"
                  >
                    <RefreshCw size={12} className={reReviewingId === selectedItem.item_id ? 'animate-spin' : ''} />
                    <span>{reReviewingId === selectedItem.item_id ? 'Re-reviewing...' : 'Trigger Re-Review'}</span>
                  </button>
                </div>

                {/* Dependent Drafts List */}
                <div className="space-y-2 mb-4">
                  <div className="text-xs font-bold text-[#617168] uppercase tracking-wider mb-2">
                    Dependent Drafts Requiring Re-Review:
                  </div>

                  {selectedItem.affected_drafts && selectedItem.affected_drafts.length > 0 ? (
                    selectedItem.affected_drafts.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-lg bg-white border border-[#DCE5DF] flex items-center justify-between gap-3 hover:border-[#0E9F78] transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText size={15} className="text-[#0E9F78] flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#15251E] block truncate">
                              {d.title}
                            </span>
                            <span className="text-[10px] text-[#8A9A91] font-mono">
                              ID: {d.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#123B2D]">
                            {d.status}
                          </span>
                          {onNavigateToDraft && (
                            <button
                              type="button"
                              onClick={() => onNavigateToDraft(d.id)}
                              className="text-xs font-semibold text-[#0E9F78] hover:text-[#0B8262] flex items-center gap-1 cursor-pointer"
                            >
                              Open Draft <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-[#8A9A91] py-6 text-center">
                      No drafts directly linked to this guideline.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="my-auto text-center text-xs text-[#8A9A91]">
                Select a guideline node on the left to inspect its dependency relationships.
              </div>
            )}

            <div className="pt-3 border-t border-[#E2EBE5] flex items-center justify-between text-[11px] text-[#617168]">
              <span>Targeted Re-Review:</span>
              <span className="font-semibold text-[#123B2D]">Zero Full-Database Resets Required</span>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible Table/List View */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#DCE5DF] bg-[#FAFBF9] text-[#617168] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Guideline ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Title / Claim</th>
                <th className="py-2.5 px-3">Urgency</th>
                <th className="py-2.5 px-3">Affected Drafts</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBF0EC]">
              {items.map((item) => {
                const urgency = getUrgencyStyles(item.re_review_urgency);
                const count = item.affected_drafts?.length || item.affected_review_ids?.length || 0;

                return (
                  <tr key={item.item_id} className="hover:bg-[#F8FAF9]">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#123B2D]">
                      {item.item_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-[#F0F4F1] font-semibold text-[10px]">
                        {item.item_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#15251E] max-w-xs truncate">
                      {item.item_title}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${urgency.badge}`}>
                        {item.re_review_urgency}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#0E9F78]">
                      {count} draft{count === 1 ? '' : 's'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleReReview(item.item_id)}
                        className="px-2.5 py-1 rounded bg-[#0E9F78] text-white font-bold text-[11px] hover:bg-[#0B8262] cursor-pointer"
                      >
                        Re-Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
