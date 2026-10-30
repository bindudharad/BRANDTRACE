import React, { useState } from 'react';
import {
  Shield,
  Check,
  Copy,
  ArrowRight,
  X,
  UserCheck,
  AlertCircle,
  Eye,
  Settings,
  Sparkles,
} from 'lucide-react';

interface JudgeRole {
  role: 'brand_admin' | 'reviewer' | 'creator' | 'auditor';
  label: string;
  actor: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  permissions: string[];
}

const JUDGE_ROLES: JudgeRole[] = [
  {
    role: 'brand_admin',
    label: 'Brand Administrator',
    actor: 'admin@brandtrace.internal',
    title: 'Full Constitutional Authority',
    badge: 'ADMINISTRATOR',
    badgeColor: '#00E6A0',
    description: 'Create and amend brand rules and facts, activate reviewer suggestions, and manage the Brand Asset Registry.',
    permissions: [
      'Create / Edit Rules (HTTP 201)',
      'Add Approved Facts (HTTP 201)',
      'Activate Rule Suggestions',
      'Register Brand Assets (SHA-256)',
      'View Full Audit Ledger',
    ],
  },
  {
    role: 'reviewer',
    label: 'Compliance Reviewer',
    actor: 'reviewer@brandtrace.internal',
    title: 'Primary Evaluation Persona (Recommended)',
    badge: 'REVIEWER (RECOMMENDED)',
    badgeColor: '#00C8F0',
    description: 'Triage findings, accept exact-span replacements, dismiss with reason, test the HTTP 409 approval gate, and trigger targeted re-review.',
    permissions: [
      'Ingest Drafts (Direct Text, PDF, PNG)',
      'Accept Exact-Span Corrections',
      'Dismiss Violations with Mandatory Reason',
      'Approve Drafts (HTTP 409 Gated)',
      'Trigger Targeted Re-Review on Fact Expiry',
    ],
  },
  {
    role: 'creator',
    label: 'Content Creator',
    actor: 'creator@brandtrace.internal',
    title: 'Draft Authoring & Submission',
    badge: 'CONTRIBUTOR',
    badgeColor: '#9AAABD',
    description: 'Submit marketing copy and creative drafts. Restricted from modifying normative rules or approving drafts.',
    permissions: [
      'Author New Content Drafts',
      'Upload Digital PDFs & Assets',
      'Inspect Preliminary Score & Findings',
      'Prohibited from Rule Mutation (HTTP 403)',
      'Prohibited from Draft Approval (HTTP 403)',
    ],
  },
  {
    role: 'auditor',
    label: 'Compliance Auditor',
    actor: 'auditor@brandtrace.internal',
    title: 'Independent Verification & Inspection',
    badge: 'READ-ONLY AUDITOR',
    badgeColor: '#8467FF',
    description: 'Read-only access to verify immutable audit trails, actor attribution, rule versions, and mathematical compliance scores.',
    permissions: [
      'Inspect Append-Only Audit Ledger',
      'Verify Chronological Timestamps',
      'Inspect Historical Rule & Fact Versions',
      'Prohibited from Modifying Reviews (HTTP 403)',
      'Prohibited from Overriding Gates',
    ],
  },
];

interface JudgeAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterWorkspaceWithRole?: (role: 'brand_admin' | 'reviewer' | 'creator' | 'auditor', actor: string) => void;
}

export const JudgeAccessModal: React.FC<JudgeAccessModalProps> = ({
  isOpen,
  onClose,
  onEnterWorkspaceWithRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<JudgeRole>(JUDGE_ROLES[1]); // default to reviewer
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleEnter = () => {
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
      <div className="relative w-full max-w-2xl bg-[#0C1420] border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-left">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00E6A0]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00C8F0]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#9AAABD] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          aria-label="Close Judge Access Modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#00E6A0]/15 border border-[#00E6A0]/40 flex items-center justify-center text-[#00E6A0]">
            <Shield size={20} />
          </div>
          <div>
            <h2 id="judge-access-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Judge & Evaluator Access Center
            </h2>
            <span className="text-xs text-[#00E6A0] font-semibold">
              Simulated Role Architecture · Instant One-Click Evaluation
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#9AAABD] mb-6 leading-relaxed">
          In compliance with CodeAxis Hackathon evaluation standards, demo accounts and role credentials are provided directly in the interface. No password or external signup required.
        </p>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {JUDGE_ROLES.map((r) => {
            const isSelected = selectedRole.role === r.role;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#111D2A] border-[#00E6A0] shadow-[0_0_15px_rgba(0,230,160,0.2)]'
                    : 'bg-[#070B12] border-white/10 hover:border-white/20 text-[#9AAABD]'
                }`}
              >
                <div
                  className="text-[9px] font-black uppercase tracking-wider block mb-1"
                  style={{ color: r.badgeColor }}
                >
                  {r.badge}
                </div>
                <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-[#F4F8FC]'}`}>
                  {r.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Role Deep-Dive Card */}
        <div className="bg-[#070B12] rounded-xl border border-white/10 p-5 mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">{selectedRole.title}</h3>
              <p className="text-xs text-[#9AAABD] mt-0.5">{selectedRole.description}</p>
            </div>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase"
              style={{
                backgroundColor: `${selectedRole.badgeColor}20`,
                color: selectedRole.badgeColor,
                border: `1px solid ${selectedRole.badgeColor}40`,
              }}
            >
              {selectedRole.role}
            </span>
          </div>

          {/* Copyable Simulated Headers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-[#0C1420] p-2.5 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#64748B] block">X-Demo-Role</span>
                <span className="text-white font-semibold">{selectedRole.role}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(selectedRole.role, 'role')}
                className="p-1.5 text-[#9AAABD] hover:text-[#00E6A0] transition-colors"
                title="Copy Role Header"
              >
                {copiedKey === 'role' ? <Check size={14} className="text-[#00E6A0]" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="bg-[#0C1420] p-2.5 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#64748B] block">X-Demo-Actor</span>
                <span className="text-white font-semibold truncate max-w-[170px] block">
                  {selectedRole.actor}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(selectedRole.actor, 'actor')}
                className="p-1.5 text-[#9AAABD] hover:text-[#00E6A0] transition-colors"
                title="Copy Actor Identity"
              >
                {copiedKey === 'actor' ? <Check size={14} className="text-[#00E6A0]" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Tested Server Permissions */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold block mb-2 font-mono">
              Server-Enforced RBAC Capabilities
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {selectedRole.permissions.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-[#9AAABD]">
                  <Check size={12} className="text-[#00E6A0] shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-[#64748B] font-mono text-center sm:text-left">
            Workspace: <span className="text-white font-semibold">ws_default</span> · No password needed
          </div>
          <button
            type="button"
            onClick={handleEnter}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#00E6A0] hover:bg-[#00c88a] text-[#070B12] font-bold text-sm shadow-[0_0_20px_rgba(0,230,160,0.4)] transition-all cursor-pointer"
          >
            <span>Enter as {selectedRole.label}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
