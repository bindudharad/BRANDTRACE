import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  Link,
  ArrowRight,
  Database,
  Lock,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface NetworkNode {
  id: string;
  step: number;
  label: string;
  type: 'FACT' | 'CLAIM' | 'DRAFT' | 'RULE' | 'FINDING' | 'HUMAN_REVIEW' | 'APPROVAL' | 'AUDIT';
  badge: string;
  title: string;
  description: string;
  payload: Record<string, string>;
  color: string;
  icon: React.ReactNode;
}

const NETWORK_STEPS: NetworkNode[] = [
  {
    id: 'node-fact',
    step: 1,
    label: 'Normative Fact',
    type: 'FACT',
    badge: 'CONSTITUTIONAL EVIDENCE',
    title: 'Enterprise Fact Snapshot',
    description: 'Verified enterprise statement carrying cryptographic hash, effective date, and owner attribution.',
    payload: {
      claim: 'Cloud SLA guarantee of 99.9% uptime',
      effective_at: '2026-01-01T00:00:00Z',
      expires_at: '2026-12-31T23:59:59Z',
      owner: 'Infrastructure VP',
      status: 'ACTIVE',
    },
    color: '#00E6A0',
    icon: <Database size={16} className="text-[#00E6A0]" />,
  },
  {
    id: 'node-claim',
    step: 2,
    label: 'Extracted Claim',
    type: 'CLAIM',
    badge: 'TIME-AWARE ANCHOR',
    title: 'Grounded Claim Reference',
    description: 'Extracted from content draft and bound to fact version. Subject to 30-day proactive expiry alerts.',
    payload: {
      extracted_token: '99.9% reliability guarantee',
      bound_fact_id: 'fact_999_sla',
      validity_status: 'CURRENT',
      impact_window: 'Expires in 62 days',
    },
    color: '#00C8F0',
    icon: <Link size={16} className="text-[#00C8F0]" />,
  },
  {
    id: 'node-draft',
    step: 3,
    label: 'Content Draft',
    type: 'DRAFT',
    badge: 'INPUT INGESTION',
    title: 'Review Submission rev_launch_q4',
    description: 'Marketing draft ingested via Direct Text or 64KB bounded digital PDF text extraction.',
    payload: {
      draft_id: 'rev_launch_q4',
      format: 'text/markdown',
      author: 'creator@brandtrace.demo',
      stream_guard: '64KB chunk buffer verified',
    },
    color: '#9AAABD',
    icon: <FileText size={16} className="text-[#9AAABD]" />,
  },
  {
    id: 'node-rule',
    step: 4,
    label: 'Brand Rule Match',
    type: 'RULE',
    badge: 'DETERMINISTIC EVAL',
    title: 'Rule Trigger R-VOICE-01',
    description: 'Exact-span regular expression pattern matched against draft content. Zero AI hallucination.',
    payload: {
      rule_id: 'R-VOICE-01',
      kind: 'prohibited_phrase',
      pattern: '\\b(the best|industry leader)\\b',
      severity: 'HIGH',
      requirement: 'Avoid unverified informal superlatives.',
    },
    color: '#FFB84D',
    icon: <AlertTriangle size={16} className="text-[#FFB84D]" />,
  },
  {
    id: 'node-finding',
    step: 5,
    label: 'Compliance Finding',
    type: 'FINDING',
    badge: 'SEVERITY CONFLICT',
    title: 'Finding fnd_8829a1: Superlative',
    description: 'Flagged violation with exact span highlight, mathematical score penalty, and neutral suggested edit.',
    payload: {
      passage: '"the best cloud analytics on the market"',
      suggested_edit: '"effective enterprise cloud analytics"',
      penalty: '-15 pts (Clearance Score drops to 85)',
      status: 'NEEDS_REVIEW',
    },
    color: '#FF657A',
    icon: <ShieldAlert size={16} className="text-[#FF657A]" />,
  },
  {
    id: 'node-review',
    step: 6,
    label: 'Human Review',
    type: 'HUMAN_REVIEW',
    badge: 'ACCOUNTABLE DISPOSITION',
    title: 'Reviewer Action & Exact-Span Edit',
    description: 'Authorized human reviewer accepts exact-span replacement (0 word duplication) or dismisses with reason.',
    payload: {
      action: 'ACCEPT_CORRECTION',
      actor: 'compliance.lead@brandtrace.internal',
      disposition_reason: 'Replaced superlative with factual descriptor.',
      new_clearance_score: '100 / 100',
    },
    color: '#8467FF',
    icon: <Eye size={16} className="text-[#8467FF]" />,
  },
  {
    id: 'node-approval',
    step: 7,
    label: 'Approval Gate',
    type: 'APPROVAL',
    badge: 'SERVER-SIDE GATE',
    title: 'POST /api/reviews/{id}/approval',
    description: 'Server validates unresolved findings. Blocks approval with HTTP 409 Conflict if violations remain.',
    payload: {
      gate_status: 'UNBLOCKED (0 High/Critical findings)',
      resulting_status: 'APPROVED',
      server_endpoint: 'POST /api/reviews/rev_launch_q4/approval',
      http_gate: 'Enforced via FastAPI dependency',
    },
    color: '#00E6A0',
    icon: <CheckCircle2 size={16} className="text-[#00E6A0]" />,
  },
  {
    id: 'node-audit',
    step: 8,
    label: 'Audit Ledger',
    type: 'AUDIT',
    badge: 'APPEND-ONLY LEDGER',
    title: 'Cryptographic Audit Snapshot',
    description: 'Permanent append-only compliance event recorded in database audit table with timestamp and actor attribution.',
    payload: {
      audit_id: 'aud_9281a742b',
      action: 'REVIEW_APPROVED',
      actor: 'compliance.lead@brandtrace.internal',
      created_at: '2026-10-30T17:35:00Z',
      integrity: 'Immutable historical record',
    },
    color: '#20DDA4',
    icon: <Lock size={16} className="text-[#20DDA4]" />,
  },
];

export const EvidenceNetwork3D: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<NetworkNode>(NETWORK_STEPS[4]); // default to Finding

  return (
    <div className="w-full bg-[#0C1420] rounded-2xl border border-white/10 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00E6A0]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#00C8F0]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 z-10 relative">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E6A0]/10 border border-[#00E6A0]/30 text-[#00E6A0] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} />
            EVIDENCE INTEGRITY FLOW
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            The 8-Stage Evidence & Accountability Chain
          </h3>
          <p className="text-xs sm:text-sm text-[#9AAABD] max-w-2xl mt-1">
            Every publication decision is grounded in a deterministic sequence connecting facts, rules, human actions, and server-side verification gates.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs text-[#64748B] block font-mono">INTERACTIVE TRACE</span>
          <span className="text-xs font-bold text-[#00E6A0]">Click any node to inspect payload</span>
        </div>
      </div>

      {/* Node Path Sequence Grid */}
      <div className="relative z-10 mb-8 overflow-x-auto pb-4 pt-2">
        <div className="flex items-center min-w-[760px] justify-between relative px-2">
          {/* Connecting line */}
          <div className="absolute top-6 left-8 right-8 h-0.5 bg-gradient-to-r from-[#00E6A0] via-[#00C8F0] to-[#20DDA4] opacity-30 pointer-events-none" />

          {NETWORK_STEPS.map((node, idx) => {
            const isSelected = selectedNode.id === node.id;
            return (
              <div key={node.id} className="flex flex-col items-center relative z-10">
                <button
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'scale-115 ring-3 shadow-[0_0_20px_rgba(0,230,160,0.5)] bg-[#111D2A]'
                      : 'bg-[#070B12] hover:bg-[#111D2A] hover:scale-105 border border-white/10'
                  }`}
                  style={{
                    borderColor: isSelected ? node.color : 'rgba(255,255,255,0.12)',
                  }}
                  aria-label={`Inspect ${node.label}`}
                >
                  {node.icon}
                </button>
                <span className="text-[10px] font-mono text-[#64748B] mt-2 block">
                  0{node.step}
                </span>
                <span
                  className={`text-[11px] font-bold text-center mt-0.5 max-w-[80px] leading-tight ${
                    isSelected ? 'text-white' : 'text-[#9AAABD]'
                  }`}
                >
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Data Payload Card */}
      <div className="relative z-10 bg-[#070B12] rounded-xl border border-white/10 p-5 sm:p-6 shadow-inner">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Summary */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10"
                style={{ color: selectedNode.color }}
              >
                {selectedNode.badge}
              </span>
              <span className="text-xs text-[#64748B] font-mono">Stage 0{selectedNode.step} of 08</span>
            </div>
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              {selectedNode.icon}
              {selectedNode.title}
            </h4>
            <p className="text-xs text-[#9AAABD] leading-relaxed">
              {selectedNode.description}
            </p>
          </div>

          {/* Right Verified JSON Payload */}
          <div className="lg:col-span-7 bg-[#0C1420] rounded-lg border border-white/10 p-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
              <span>Verified System Invariant</span>
              <span className="text-[#00E6A0]">REST API Contract</span>
            </div>
            <div className="space-y-1.5 overflow-x-auto text-[#F4F8FC]">
              {Object.entries(selectedNode.payload).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2">
                  <span className="text-[#00C8F0] select-none font-semibold">&quot;{k}&quot;:</span>
                  <span className="text-[#00E6A0] break-all">&quot;{v}&quot;</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
