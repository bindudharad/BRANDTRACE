import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  X,
  CheckCircle2,
} from 'lucide-react';

export type JudgeRoleType = 'brand_admin' | 'reviewer' | 'creator' | 'auditor';

export interface JudgeRole {
  role: JudgeRoleType;
  label: string;
  actor: string;
  description: string;
  badge?: string;
  accentColor: string;
}

export const JUDGE_ROLES: JudgeRole[] = [
  {
    role: 'brand_admin',
    label: 'Brand Admin',
    actor: 'admin@brandtrace.internal',
    description: 'Manage brand rules, factual records, approved policy suggestions and authorized governance actions.',
    accentColor: '#00E6A0',
  },
  {
    role: 'reviewer',
    label: 'Reviewer (Primary)',
    actor: 'reviewer@brandtrace.internal',
    description: 'Review findings, inspect evidence, accept corrections, dismiss with reasons and initiate eligible approval workflows.',
    badge: 'DEFAULT',
    accentColor: '#00C8F0',
  },
  {
    role: 'creator',
    label: 'Creator',
    actor: 'creator@brandtrace.internal',
    description: 'Create drafts, upload supported content and resolve review findings.',
    accentColor: '#9AAABD',
  },
  {
    role: 'auditor',
    label: 'Auditor',
    actor: 'auditor@brandtrace.internal',
    description: 'Inspect evidence, governance decisions, version history and audit information using read-only access.',
    accentColor: '#8467FF',
  },
];

interface JudgeAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterWorkspaceWithRole?: (role: JudgeRoleType, actor: string) => void;
  initialRole?: JudgeRoleType;
}

export const JudgeAccessModal: React.FC<JudgeAccessModalProps> = ({
  isOpen,
  onClose,
  onEnterWorkspaceWithRole,
  initialRole,
}) => {
  const [selectedRoleType, setSelectedRoleType] = useState<JudgeRoleType>(initialRole || 'reviewer');

  if (!isOpen) return null;

  const selectedRole = JUDGE_ROLES.find((r) => r.role === selectedRoleType) || JUDGE_ROLES[1];

  const handleContinue = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bt_demo_role', selectedRole.role);
      sessionStorage.setItem('bt_demo_actor', selectedRole.actor);
    }
    if (onEnterWorkspaceWithRole) {
      onEnterWorkspaceWithRole(selectedRole.role, selectedRole.actor);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judge-access-title"
    >
      <div className="relative w-full max-w-xl bg-[#0C1420] border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 text-left text-white overflow-hidden">
        {/* Subtle Ambient Accents */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00E6A0]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00C8F0]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#9AAABD] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00E6A0]/15 border border-[#00E6A0]/40 flex items-center justify-center text-[#00E6A0]">
              <Shield size={16} />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider text-[#00E6A0] uppercase">
              BRANDTRACE
            </span>
          </div>
          <h2 id="judge-access-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Choose a role
          </h2>
          <p className="text-xs sm:text-sm text-[#9AAABD] mt-1">
            Select a demonstration role to evaluate governance and permission boundaries.
          </p>
        </div>

        {/* 4 Role Cards in 2x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {JUDGE_ROLES.map((r) => {
            const isSelected = selectedRoleType === r.role;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => setSelectedRoleType(r.role)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[110px] ${
                  isSelected
                    ? 'bg-[#111D2A] border-[#00E6A0] shadow-[0_0_20px_rgba(0,230,160,0.25)] ring-1 ring-[#00E6A0]'
                    : 'bg-[#070B12] border-white/10 hover:border-white/20 hover:bg-[#0C1420]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-[#F4F8FC]'}`}>
                      {r.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 size={16} className="text-[#00E6A0] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#9AAABD] leading-relaxed">
                    {r.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Actions & Trust Disclosure */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#00E6A0] hover:bg-[#00c88a] text-[#070B12] font-bold text-sm shadow-[0_0_20px_rgba(0,230,160,0.35)] transition-all cursor-pointer"
          >
            <span>Continue as {selectedRole.label}</span>
            <ArrowRight size={16} />
          </button>

          <p className="text-[11px] text-[#64748B] text-center leading-normal">
            Role simulation configures demo permissions for evaluation. It does not represent genuine user authentication.
          </p>
        </div>
      </div>
    </div>
  );
};
