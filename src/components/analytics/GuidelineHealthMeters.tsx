import React from 'react';
import { GuidelineHealthItem, RuleSuggestion, UserRole } from '../../services/api';
import { Activity, AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, ArrowRight, UserCheck } from 'lucide-react';

interface GuidelineHealthMetersProps {
  guidelineHealth: GuidelineHealthItem[];
  acceptedSuggestions?: Record<string, RuleSuggestion>;
  role: UserRole;
  onRuleSuggestionAction?: (ruleId: string, action: 'accept' | 'defer' | 'reject') => void;
  onActivateSuggestion?: (ruleId: string) => void;
}

export const GuidelineHealthMeters: React.FC<GuidelineHealthMetersProps> = ({
  guidelineHealth = [],
  acceptedSuggestions = {},
  role,
  onRuleSuggestionAction,
  onActivateSuggestion,
}) => {
  return (
    <div className="bg-white border border-[#DCE5DF] rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#EBF0EC]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E9F6F0] text-[#0E9F78] text-[11px] font-bold tracking-wider uppercase mb-1">
            <Activity size={12} />
            Round 3 Commitment 3
          </div>
          <h3 className="text-lg font-bold text-[#123B2D] m-0">
            Guideline Health Intelligence
          </h3>
          <p className="text-xs text-[#617168] mt-0.5 m-0">
            Reviewer telemetry & decision support: aggregates reviewer actions across reviews, detects rule-level reviewer disposition divergence, and proposes source-linked clarifications without mutating live rules.
          </p>
        </div>

        <span className="text-xs font-semibold text-[#0E9F78] bg-[#E9F6F0] px-3 py-1 rounded-full border border-[#A6CDBA] self-start sm:self-auto">
          {guidelineHealth.length} Monitored Rules
        </span>
      </div>

      {guidelineHealth.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#8A9A91]">
          No guideline telemetry data recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {guidelineHealth.map((gh) => {
            const totalActions =
              (gh.accepted_count || 0) +
              (gh.dismissed_count || 0) +
              (gh.escalated_count || 0) +
              (gh.waived_count || 0);

            const acceptedPct = totalActions > 0 ? ((gh.accepted_count || 0) / totalActions) * 100 : 0;
            const dismissedPct = totalActions > 0 ? ((gh.dismissed_count || 0) / totalActions) * 100 : 0;
            const escalatedPct = totalActions > 0 ? ((gh.escalated_count || 0) / totalActions) * 100 : 0;
            const waivedPct = totalActions > 0 ? ((gh.waived_count || 0) / totalActions) * 100 : 0;

            const suggestionRecord = acceptedSuggestions[gh.rule_id];
            const hasAccepted = suggestionRecord && suggestionRecord.status === 'ACCEPTED';
            const hasActivated = suggestionRecord && suggestionRecord.status === 'ACTIVATED';

            return (
              <div
                key={gh.rule_id}
                className="bg-[#FAFBF9] border border-[#E2EBE5] rounded-xl p-5 hover:border-[#CAD8D0] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#123B2D]">
                      {gh.rule_title}
                    </span>
                    <span className="text-xs font-mono text-[#617168] bg-white border border-[#DCE5DF] px-2 py-0.5 rounded">
                      {gh.rule_id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]">
                      {gh.rule_severity}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        gh.data_confidence === 'SUFFICIENT'
                          ? 'bg-[#F0FDF4] text-[#166534] border-[#86EFAC]'
                          : 'bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]'
                      }`}
                    >
                      {gh.data_confidence === 'SUFFICIENT' ? 'Sufficient Telemetry' : 'Needs More Data'}
                    </span>
                  </div>

                  {gh.disagreement_detected && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FCA5A5] px-2.5 py-0.5 rounded-full">
                      <AlertTriangle size={12} />
                      <span>Rule-Level Reviewer Disagreement Detected (Disposition Divergence)</span>
                    </div>
                  )}
                </div>

                {/* Telemetry Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-[#E2EBE5]">
                    <span className="text-[10px] text-[#617168] uppercase font-bold block">Findings</span>
                    <span className="text-sm font-extrabold text-[#123B2D]">{gh.finding_count || 0}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-[#E2EBE5]">
                    <span className="text-[10px] text-[#16A34A] uppercase font-bold block">Accepted Edits</span>
                    <span className="text-sm font-extrabold text-[#16A34A]">{gh.accepted_count || 0}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-[#E2EBE5]">
                    <span className="text-[10px] text-[#D97706] uppercase font-bold block">Dismissals</span>
                    <span className="text-sm font-extrabold text-[#D97706]">{gh.dismissed_count || 0}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-[#E2EBE5]">
                    <span className="text-[10px] text-[#DC2626] uppercase font-bold block">Escalated</span>
                    <span className="text-sm font-extrabold text-[#DC2626]">{gh.escalated_count || 0}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-[#E2EBE5]">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold block">Waived</span>
                    <span className="text-sm font-extrabold text-[#64748B]">{gh.waived_count || 0}</span>
                  </div>
                </div>

                {/* Proportional Disposition Meter */}
                {totalActions > 0 && (
                  <div className="mb-4">
                    <div className="h-2.5 w-full bg-[#E2EBE5] rounded-full overflow-hidden flex">
                      {acceptedPct > 0 && (
                        <div style={{ width: `${acceptedPct}%` }} className="bg-[#16A34A] h-full" title={`Accepted: ${Math.round(acceptedPct)}%`} />
                      )}
                      {dismissedPct > 0 && (
                        <div style={{ width: `${dismissedPct}%` }} className="bg-[#D97706] h-full" title={`Dismissed: ${Math.round(dismissedPct)}%`} />
                      )}
                      {escalatedPct > 0 && (
                        <div style={{ width: `${escalatedPct}%` }} className="bg-[#DC2626] h-full" title={`Escalated: ${Math.round(escalatedPct)}%`} />
                      )}
                      {waivedPct > 0 && (
                        <div style={{ width: `${waivedPct}%` }} className="bg-[#64748B] h-full" title={`Waived: ${Math.round(waivedPct)}%`} />
                      )}
                    </div>
                  </div>
                )}

                {/* Reviewer Clarification Proposal Box */}
                {gh.suggestion && (
                  <div className="bg-white border border-[#A6CDBA] rounded-xl p-4 mt-2 shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E9F78] uppercase tracking-wider mb-1.5">
                      <Sparkles size={13} />
                      <span>Proposed Guideline Clarification</span>
                    </div>

                    <p className="text-xs text-[#334155] mb-2 leading-relaxed">
                      <strong>Observed Pattern:</strong> {gh.suggestion.observed_issue}
                    </p>

                    <div className="bg-[#F0F9F5] border border-[#A6CDBA] p-3 rounded-lg text-xs mb-3 text-[#15251E]">
                      <span className="font-bold text-[#0E9F78] block mb-0.5">Proposed Clarification Text:</span>
                      &ldquo;{gh.suggestion.proposed_clarification}&rdquo;
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#EBF0EC] flex-wrap">
                      <span className="text-[11px] text-[#617168]">
                        Ambiguity Addressed: {gh.suggestion.ambiguity_addressed}
                      </span>

                      <div className="flex items-center gap-2">
                        {hasActivated ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#86EFAC] px-3 py-1 rounded-lg">
                            <CheckCircle2 size={13} /> Activated in Constitution
                          </span>
                        ) : hasAccepted ? (
                          role === 'brand_admin' ? (
                            <button
                              type="button"
                              onClick={() => onActivateSuggestion?.(gh.rule_id)}
                              className="px-3 py-1.5 rounded-lg bg-[#0E9F78] text-white text-xs font-bold hover:bg-[#0B8262] cursor-pointer shadow-xs"
                            >
                              Activate Rule Update (Admin)
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-[#0E9F78] bg-[#E9F6F0] px-3 py-1 rounded-lg">
                              Accepted by Reviewer (Awaiting Admin Activation)
                            </span>
                          )
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onRuleSuggestionAction?.(gh.rule_id, 'accept')}
                              className="px-2.5 py-1 rounded-lg bg-[#0E9F78] text-white text-xs font-bold hover:bg-[#0B8262] cursor-pointer"
                            >
                              Accept Proposal
                            </button>
                            <button
                              type="button"
                              onClick={() => onRuleSuggestionAction?.(gh.rule_id, 'defer')}
                              className="px-2.5 py-1 rounded-lg bg-white border border-[#DCE5DF] text-[#617168] text-xs font-semibold hover:bg-[#F0F4F1] cursor-pointer"
                            >
                              Defer
                            </button>
                            <button
                              type="button"
                              onClick={() => onRuleSuggestionAction?.(gh.rule_id, 'reject')}
                              className="px-2.5 py-1 rounded-lg bg-white border border-[#FCA5A5] text-[#DC2626] text-xs font-semibold hover:bg-[#FEF2F2] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
