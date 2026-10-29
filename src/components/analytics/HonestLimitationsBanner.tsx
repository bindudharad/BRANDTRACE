import React, { useState } from 'react';
import { Info, Shield, CheckCircle2, AlertTriangle, Lock, ExternalLink, X } from 'lucide-react';

export const HonestLimitationsBanner: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Subdued, elegant info pill */}
      <div className="bg-[#FAFBF9] border border-[#DCE5DF] rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <Info size={14} className="text-[#0E9F78] flex-shrink-0" />
          <span className="text-[#334155] truncate">
            <strong>Architecture & Scope Transparency:</strong> Single-enterprise partition security, deterministic engine, and honest AI boundaries.
          </span>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-[#0E9F78] hover:text-[#0B8262] font-semibold flex items-center gap-1 flex-shrink-0 cursor-pointer"
        >
          Inspect System Scope ›
        </button>
      </div>

      {/* Detail Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A241B]/70 backdrop-blur-md animate-fadeIn"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white border border-[#DCE5DF] rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative text-[#15251E]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EBF0EC]">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-[#0E9F78]" />
                <h3 className="text-base font-bold text-[#123B2D] m-0">
                  Documented System Boundaries & AI Scope
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full border border-[#DCE5DF] flex items-center justify-center text-[#617168] hover:bg-[#F0F4F1] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-[#334155]">
              <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2EBE5]">
                <div className="flex items-center gap-1.5 font-bold text-[#123B2D] mb-1">
                  <CheckCircle2 size={14} className="text-[#16A34A]" />
                  <span>Hosted Staging Verified (10/10 Checks Passed)</span>
                </div>
                <p className="text-[11px] text-[#617168] m-0">
                  Full PostgreSQL 18 schema verification, idempotency, review workflows, and lockout prevention verified against remote Neon infrastructure. Production cutover remains formally uncompleted.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2EBE5]">
                <div className="flex items-center gap-1.5 font-bold text-[#123B2D] mb-1">
                  <AlertTriangle size={14} className="text-[#D97706]" />
                  <span>OCR Text Extraction (Option B Transparent Notice)</span>
                </div>
                <p className="text-[11px] text-[#617168] m-0">
                  Option B OCR text extraction deterministically reports an unsupported status with a <span className="font-mono text-[#D97706]">NEEDS_REVIEW</span> tag, preventing false confidence in unsegmented image text.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2EBE5]">
                <div className="flex items-center gap-1.5 font-bold text-[#123B2D] mb-1">
                  <CheckCircle2 size={14} className="text-[#16A34A]" />
                  <span>Asset Matching via Cryptographic SHA-256</span>
                </div>
                <p className="text-[11px] text-[#617168] m-0">
                  Visual asset verification uses exact binary SHA-256 hash matching against the registered <span className="font-mono text-[#123B2D]">brand_assets</span> table rather than opaque or probabilistic computer-vision models.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2EBE5]">
                <div className="flex items-center gap-1.5 font-bold text-[#123B2D] mb-1">
                  <Lock size={14} className="text-[#0E9F78]" />
                  <span>Single-Enterprise Partitions vs. Multi-Tenant SaaS</span>
                </div>
                <p className="text-[11px] text-[#617168] m-0">
                  The platform partitions internal business units (<span className="font-mono text-[#0E9F78]">ws_default</span>, <span className="font-mono text-[#0E9F78]">ws_legal</span>, <span className="font-mono text-[#0E9F78]">ws_marketing</span>) with server-side authorization. Multi-tenant public customer onboarding requires database-backed per-tenant keys or OIDC.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#EBF0EC] flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#123B2D] text-white text-xs font-semibold hover:bg-[#1A4E3D] cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
