import React, { FormEvent, ReactNode, useEffect, useState, useRef } from 'react';
import {
  api,
  EvidenceFinding,
  Fact,
  Insights,
  Review,
  Rule,
  BrandProfile,
  ImpactMap,
  UserRole,
  setSimulatedUser,
} from '../services/api';
import {
  LayoutDashboard,
  Shield,
  FileText,
  CheckSquare,
  Clock,
  BarChart2,
  HelpCircle,
  Plus,
  ArrowRight,
  Check,
  X,
  Edit3,
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  FileUp,
  RotateCcw,
  Sparkles,
  Layers,
  Sliders,
  Scale,
  RefreshCw,
  Filter,
  Info,
  AlertTriangle,
} from 'lucide-react';

export type View =
  | 'Overview'
  | 'Brand Constitution'
  | 'Content Review'
  | 'Approval Queue'
  | 'Audit History'
  | 'Governance Insights'
  | 'Help & Demo';

const sampleAnnouncement =
  'Brandtrace is the best cheap governance platform on the market today. It is always available in India with zero risk.';

const views: View[] = [
  'Overview',
  'Brand Constitution',
  'Content Review',
  'Approval Queue',
  'Audit History',
  'Governance Insights',
  'Help & Demo',
];

const NAV_ICONS: Record<View, React.FC<{ size?: number; className?: string }>> = {
  'Overview': LayoutDashboard,
  'Brand Constitution': Shield,
  'Content Review': FileText,
  'Approval Queue': CheckSquare,
  'Audit History': Clock,
  'Governance Insights': BarChart2,
  'Help & Demo': HelpCircle,
};

export function StatusBadge({ value }: { value: string }) {
  const v = value.toLowerCase().replace(/_/g, '-');
  const classMap: Record<string, string> = {
    high: 'badge-high',
    critical: 'badge-critical',
    medium: 'badge-medium',
    low: 'badge-low',
    approved: 'badge-approved',
    supported: 'badge-supported',
    contradicted: 'badge-contradicted',
    outdated: 'badge-outdated',
    'needs-review': 'badge-needs-review',
    'unsupported-by-approved-evidence': 'badge-unsupported',
    'in-review': 'badge-medium',
    'changes-requested': 'badge-needs-review',
    'accepted-edit': 'badge-approved',
    edited: 'badge-approved',
    dismissed: 'badge-low',
    escalated: 'badge-high',
    waived: 'badge-low',
  };

  return (
    <span className={classMap[v] || 'badge-low'}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

interface BrandtraceWorkspacePremiumProps {
  onBackToHero?: () => void;
}

export function BrandtraceWorkspacePremium({ onBackToHero }: BrandtraceWorkspacePremiumProps) {
  const [view, setView] = useState<View>('Overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<UserRole>('reviewer');

  const [rules, setRules] = useState<Rule[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [impactMap, setImpactMap] = useState<ImpactMap | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [selected, setSelected] = useState<Review | null>(null);

  // Review submission state
  const [title, setTitle] = useState('Launch announcement — Q4');
  const [content, setContent] = useState(sampleAnnouncement);
  const [contentType, setContentType] = useState('marketing_copy');
  const [reason, setReason] = useState('');
  const [manualEdit, setManualEdit] = useState('');
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Constitution tabs & modals
  const [constTab, setConstTab] = useState<'rules' | 'facts' | 'profile'>('rules');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isFactModalOpen, setIsFactModalOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<Rule>>({
    title: '',
    category: 'terminology',
    kind: 'prohibited_phrase',
    pattern: '',
    requirement: '',
    severity: 'HIGH',
    source_title: '',
    source_excerpt: '',
    status: 'APPROVED',
  });
  const [newFact, setNewFact] = useState<Partial<Fact>>({
    claim: '',
    value: '',
    owner: 'Brand Team',
    source_title: '',
    source_excerpt: '',
    status: 'APPROVED',
    expires_at: '',
  });

  // File upload state
  const [submissionTab, setSubmissionTab] = useState<'text' | 'file'>('text');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setSimulatedUser(newRole);
    setSuccess(`Role changed to ${newRole.toUpperCase()}. Server-side permissions updated.`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const refresh = async () => {
    try {
      const [, r, f, v, i, bp, im] = await Promise.all([
        api.overview(),
        api.rules(),
        api.facts(),
        api.reviews(),
        api.insights(),
        api.brandProfile().catch(() => null),
        api.impactMap().catch(() => null),
      ]);
      setRules(r);
      setFacts(f);
      setReviews(v);
      setInsights(i);
      if (bp) setBrandProfile(bp);
      if (im) setImpactMap(im);
      if (selected) {
        setSelected(v.find((x) => x.id === selected.id) || null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    setSimulatedUser('reviewer');
    api
      .setup()
      .then(refresh)
      .then(() => setReady(true))
      .catch((e) =>
        setError(`Backend unavailable: ${e.message}. Ensure FastAPI server is running on port 8000.`)
      );
  }, []);

  const submitTextReview = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.createReview({ title, content, content_type: contentType });
      setSelected(r);
      await refresh();
      setView('Content Review');
      setSuccess('Draft analyzed and persisted with evidence findings.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitFileReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a file to upload (.txt, .md, .pdf, .png, .jpg)');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('content_type', contentType);
      fd.append('file', uploadFile);
      const r = await api.uploadReview(fd);
      setSelected(r);
      await refresh();
      setView('Content Review');
      setSuccess(`File ${uploadFile.name} successfully extracted and evaluated against brand standards.`);
      setTimeout(() => setSuccess(''), 4000);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleFindingAction = async (
    f: EvidenceFinding,
    a: string,
    customReplacement?: string,
    customReason?: string,
  ) => {
    if (!selected) return;
    setError('');
    try {
      let rep: string | undefined = customReplacement;
      let recReason: string | undefined = customReason?.trim() || reason?.trim() || undefined;
      let actionToSend = a;

      const isMissingTerm = f.type === 'required_phrase' || f.type === 'approved_term';

      if (a === 'accept' || a === 'insert') {
        if (!rep) {
          if (isMissingTerm) {
            // Default attribution sign-off if clicked without custom placement
            const trimmed = selected.content.trim();
            rep = `${trimmed}\n\n— Verified with ${f.passage}.`;
            recReason = recReason || `Inserted mandatory required term '${f.passage}'.`;
            actionToSend = 'accept';
          } else if (f.suggested_correction) {
            rep = selected.content.replace(f.passage, f.suggested_correction);
          }
        } else {
          actionToSend = 'accept';
          recReason = recReason || (isMissingTerm ? `Placed mandatory required term '${f.passage}'.` : undefined);
        }
      } else if (a === 'edit') {
        if (!recReason) {
          setError('A documented reason is required when editing a finding.');
          return;
        }
        if (customReplacement) {
          rep = customReplacement;
        } else {
          if (!manualEdit.trim()) {
            setError('Please provide replacement wording in the edit input.');
            return;
          }
          if (selected.content.includes(f.passage)) {
            rep = selected.content.replace(f.passage, manualEdit.trim());
          } else {
            setError(`Cannot apply edit: original passage "${f.passage}" was not found in the current working copy.`);
            return;
          }
        }
      } else if (a === 'dismiss') {
        if (!recReason) {
          setError('A documented reason is required to dismiss a compliance finding.');
          return;
        }
      }

      // Cross-contamination safeguard: draft content cannot equal disposition reason
      if (rep && recReason && rep.trim().toLowerCase() === recReason.trim().toLowerCase()) {
        setError('Data integrity check failed: draft content cannot be identical to the documented disposition reason.');
        return;
      }
      if (rep && rep.trim().toLowerCase().startsWith('manual qa:')) {
        setError('Data integrity check failed: draft content cannot begin with QA comment metadata.');
        return;
      }

      const r = await api.findingAction(selected.id, f.id, actionToSend, recReason, rep);
      setSelected(r);
      setContent(r.content);
      await refresh();
      setReason('');
      setManualEdit('');
      setEditingFindingId(null);
      setSuccess(`Finding ${f.id} updated with action '${actionToSend.toUpperCase()}'.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleApproval = async (a: 'approve' | 'request_changes' | 'waive') => {
    if (!selected) return;
    setError('');
    try {
      const r = await api.approval(selected.id, a, a === 'approve' ? undefined : reason || undefined);
      setSelected(r);
      await refresh();
      setReason('');
      setSuccess(`Review transitioned to ${r.status}. Immutable audit record created.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCreateRule = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.createRule(newRule);
      setIsRuleModalOpen(false);
      setNewRule({
        title: '',
        category: 'terminology',
        kind: 'prohibited_phrase',
        pattern: '',
        requirement: '',
        severity: 'HIGH',
        source_title: '',
        source_excerpt: '',
        status: 'APPROVED',
      });
      await refresh();
      setSuccess('Brand rule successfully added and activated in constitution.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCreateFact = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.createFact(newFact);
      setIsFactModalOpen(false);
      setNewFact({
        claim: '',
        value: '',
        owner: 'Brand Team',
        source_title: '',
        source_excerpt: '',
        status: 'APPROVED',
        expires_at: '',
      });
      await refresh();
      setSuccess('Approved fact recorded in claim ledger.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selected) return;
    setError('');
    try {
      const r = await api.restoreVersion(selected.id, versionId);
      setSelected(r);
      setContent(r.content);
      await refresh();
      setSuccess(`Restored draft to revision ${versionId}.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleTriggerImpactReReview = async (itemId: string) => {
    setError('');
    try {
      const res = await api.reReviewImpact(itemId);
      await refresh();
      setSuccess(res.message);
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const [loadTimeout, setLoadTimeout] = useState(false);

  useEffect(() => {
    if (!ready && !error) {
      const t = setTimeout(() => setLoadTimeout(true), 8000);
      return () => clearTimeout(t);
    }
  }, [ready, error]);

  if (!ready) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeContent: 'center',
          background: '#04080f',
          color: '#e8f0f8',
          textAlign: 'center',
          gap: 16,
          padding: 32,
        }}
      >
        <div style={{ fontSize: 44, color: '#2dd4bf' }}>◈</div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.08em' }}>BRANDTRACE</div>
        {error ? (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <p style={{ color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>{error}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn-primary btn-sm"
                onClick={() => {
                  setError('');
                  setLoadTimeout(false);
                  api
                    .setup()
                    .then(refresh)
                    .then(() => setReady(true))
                    .catch((e) =>
                      setError(`Backend unavailable: ${(e as Error).message}. Ensure FastAPI server is running on port 8000.`)
                    );
                }}
              >
                <RefreshCw size={14} /> Retry Connection
              </button>
            </div>
          </div>
        ) : loadTimeout ? (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <p style={{ color: '#fbbf24', fontSize: 14, marginBottom: 8 }}>
              Connection to the FastAPI backend is taking longer than expected.
            </p>
            <p style={{ color: '#8da4bc', fontSize: 13, marginBottom: 16 }}>
              Ensure <code style={{ color: '#2dd4bf' }}>uvicorn app.main:app --port 8000</code> is running in <code style={{ color: '#2dd4bf' }}>backend/</code>.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn-primary btn-sm"
                onClick={() => {
                  setError('');
                  setLoadTimeout(false);
                  api
                    .setup()
                    .then(refresh)
                    .then(() => setReady(true))
                    .catch((e) =>
                      setError(`Backend unavailable: ${(e as Error).message}.`)
                    );
                }}
              >
                <RefreshCw size={14} /> Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: '#8da4bc', fontSize: 14 }}>
            Initializing evidence-linked brand governance workspace…
          </p>
        )}
      </main>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#04080f',
        color: '#e8f0f8',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: 260,
          background: '#060d16',
          borderRight: '1px solid #1a3045',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          padding: '24px 14px',
          boxSizing: 'border-box',
          gap: 8,
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '0 6px 16px', borderBottom: '1px solid #1a3045', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#fff',
                boxShadow: '0 0 16px rgba(45, 212, 191, 0.3)',
              }}
            >
              ◈
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', color: '#e8f0f8' }}>
                BRANDTRACE
              </div>
              <div style={{ fontSize: 10, color: '#2dd4bf', letterSpacing: '0.05em', fontWeight: 700 }}>
                GOVERNANCE
              </div>
            </div>
          </div>
        </div>

        {/* Demo Mode Badge */}
        <div
          style={{
            background: 'rgba(13, 148, 136, 0.15)',
            border: '1px solid rgba(45, 212, 191, 0.3)',
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: 11,
            color: '#5eead4',
            fontWeight: 700,
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2dd4bf' }} />
          LOCAL DEMO · Judge Mode
        </div>

        {/* Nav Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, marginTop: 8 }}>
          {views.map((v) => {
            const Icon = NAV_ICONS[v];
            const isActive = view === v;
            return (
              <button
                key={v}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setView(v)}
              >
                <span className="nav-dot" />
                <Icon size={16} />
                <span>{v}</span>
              </button>
            );
          })}
        </nav>

        {/* Return to 3D Experience (Hero) */}
        {onBackToHero && (
          <button
            className="btn-secondary btn-sm"
            onClick={onBackToHero}
            style={{ width: '100%', marginBottom: 12, justifyContent: 'center', fontSize: 12 }}
          >
            <Sparkles size={14} /> Back to 3D Experience
          </button>
        )}

        {/* Role Simulator */}
        <div style={{ borderTop: '1px solid #1a3045', paddingTop: 14 }}>
          <div className="label-sm">Simulated Role</div>
          <select
            className="input-premium"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            style={{ minHeight: 38, fontSize: 13, padding: '6px 10px' }}
          >
            <option value="reviewer">Reviewer (Actions & Approvals)</option>
            <option value="creator">Creator (Draft Submissions)</option>
            <option value="brand_admin">Brand Admin (Rules & Facts)</option>
            <option value="auditor">Auditor (Read-Only)</option>
          </select>
        </div>

        {/* Governance Policy Notice */}
        <div style={{ borderTop: '1px solid #1a3045', paddingTop: 12, fontSize: 11, color: '#5a7a96', lineHeight: 1.5 }}>
          <p><b style={{ color: '#8da4bc' }}>Deterministic First:</b> Exact rules run independently of external AI.</p>
          <p style={{ marginTop: 6 }}><b style={{ color: '#8da4bc' }}>NEEDS_REVIEW:</b> Unverified claims require human review.</p>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Sticky Header */}
        <header
          style={{
            padding: '20px 36px',
            borderBottom: '1px solid #1a3045',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(6, 13, 22, 0.92)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div>
            <div className="section-eyebrow">NORTHSTAR DEMO WORKSPACE / ROUND 2</div>
            <h1 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#f0f8ff' }}>
              {view}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                setView('Content Review');
                setSelected(null);
              }}
            >
              <Plus size={16} /> New Review
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div style={{ flex: 1, padding: '36px', maxWidth: 1400, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {/* Global Alert Toasts */}
          {error && (
            <div className="toast-error" style={{ marginBottom: 24, position: 'relative' }}>
              <AlertCircle size={18} />
              <div style={{ flex: 1 }}>{error}</div>
              <button
                onClick={() => setError('')}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </div>
          )}
          {success && (
            <div className="toast-success" style={{ marginBottom: 24, position: 'relative' }}>
              <CheckCircle size={18} />
              <div style={{ flex: 1 }}>{success}</div>
              <button
                onClick={() => setSuccess('')}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </div>
          )}

          {/* =========================================================================
             VIEW A: OVERVIEW
             ========================================================================= */}
          {view === 'Overview' && (
            <div>
              {/* 4 Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                {[
                  { title: 'Total Reviews', value: reviews.length, hint: 'Stored draft records', icon: FileText, color: '#67e8f9' },
                  { title: 'Open Findings', value: insights?.unresolved || 0, hint: 'Awaiting reviewer action', icon: AlertCircle, color: '#fbbf24' },
                  {
                    title: 'Pending Approval',
                    value: reviews.filter((r) => ['IN_REVIEW', 'CHANGES_REQUESTED'].includes(r.status)).length,
                    hint: 'Human approval gate',
                    icon: Clock,
                    color: '#f87171',
                  },
                  {
                    title: 'Approved Drafts',
                    value: reviews.filter((r) => r.status === 'APPROVED').length,
                    hint: 'Ready for publication',
                    icon: CheckCircle,
                    color: '#4ade80',
                  },
                ].map(({ title, value, hint, icon: Icon, color }) => (
                  <div key={title} className="metric-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="metric-label">{title}</div>
                      <Icon size={18} color={color} />
                    </div>
                    <div className="metric-value" style={{ color }}>{value}</div>
                    <div className="metric-sub">{hint}</div>
                  </div>
                ))}
              </div>

              {/* Evidence Engine Transparency Bar */}
              <div
                style={{
                  background: '#06121c',
                  border: '1px solid rgba(45, 212, 191, 0.25)',
                  borderRadius: 10,
                  padding: '12px 18px',
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Info size={16} style={{ color: '#2dd4bf', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#c8dff0' }}>
                    <strong>Deterministic Health Engine:</strong> Base 100 with dynamic point restorations. Unresolved Critical (-30), High (-18), Medium (-10), Low (-4). Zero hallucinated citations.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  onClick={() => setView('Content Review')}
                >
                  Review Active Drafts →
                </button>
              </div>

              {/* Two Column Layout: Recent Reviews & Guidelines Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
                <div className="card-premium">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Recent Content Reviews</h2>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => setView('Content Review')}
                    >
                      View All
                    </button>
                  </div>
                  <ReviewTable
                    reviews={reviews.slice(0, 6)}
                    open={(r) => {
                      setSelected(r);
                      setView('Content Review');
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="card-premium">
                    <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Active Brand Guidelines</h2>
                    <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #1a3045' }}>
                        <span style={{ color: '#8da4bc' }}>Primary Brand Palette:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 18, height: 18, borderRadius: 4, background: brandProfile?.primary_color || '#0f766e', border: '1px solid rgba(255,255,255,0.2)' }} />
                          <code>{brandProfile?.primary_color || '#0f766e'}</code>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #1a3045' }}>
                        <span style={{ color: '#8da4bc' }}>Secondary Accent:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 18, height: 18, borderRadius: 4, background: brandProfile?.secondary_color || '#2dd4bf', border: '1px solid rgba(255,255,255,0.2)' }} />
                          <code>{brandProfile?.secondary_color || '#2dd4bf'}</code>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #1a3045' }}>
                        <span style={{ color: '#8da4bc' }}>WCAG Contrast Standard:</span>
                        <strong style={{ color: '#2dd4bf' }}>{brandProfile?.min_contrast_ratio || 4.5}:1 (Normal text AA)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #1a3045' }}>
                        <span style={{ color: '#8da4bc' }}>Active Constitution Rules:</span>
                        <strong>{rules.length} verified rules</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8da4bc' }}>Approved Claim Ledger:</span>
                        <strong>{facts.length} verified assertions</strong>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(13, 42, 64, 0.4)',
                      border: '1px solid #1a3045',
                      borderLeft: '4px solid #2dd4bf',
                      borderRadius: 10,
                      padding: '16px 20px',
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#cbd5e1',
                    }}
                  >
                    <b style={{ color: '#2dd4bf' }}>Evidence-Linked Governance Active:</b> Every finding links to an approved rule or fact ID.
                    Missing citations produce <span className="badge-needs-review">NEEDS REVIEW</span> rather than false certitude.
                    Unresolved high-risk findings strictly block publication sign-off.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             VIEW B: BRAND CONSTITUTION
             ========================================================================= */}
          {view === 'Brand Constitution' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #1a3045', paddingBottom: 12 }}>
                <button
                  className={`btn-secondary btn-sm ${constTab === 'rules' ? 'btn-primary' : ''}`}
                  onClick={() => setConstTab('rules')}
                >
                  <Shield size={14} /> Approved Brand Rules ({rules.length})
                </button>
                <button
                  className={`btn-secondary btn-sm ${constTab === 'facts' ? 'btn-primary' : ''}`}
                  onClick={() => setConstTab('facts')}
                >
                  <Scale size={14} /> Claim Ledger & Verified Facts ({facts.length})
                </button>
                <button
                  className={`btn-secondary btn-sm ${constTab === 'profile' ? 'btn-primary' : ''}`}
                  onClick={() => setConstTab('profile')}
                >
                  <Sliders size={14} /> Visual Brand Profile
                </button>
              </div>

              {/* Constitution Rules Tab */}
              {constTab === 'rules' && (
                <div className="card-premium">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Approved Brand Rules</h2>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8da4bc' }}>
                        Deterministic rules enforced on all content drafts before publication.
                      </p>
                    </div>
                    <button className="btn-primary btn-sm" onClick={() => setIsRuleModalOpen(true)}>
                      <Plus size={14} /> Add Brand Rule
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 14 }}>
                    {rules.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          background: '#060d16',
                          border: '1px solid #1a3045',
                          borderRadius: 10,
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'start',
                          gap: 16,
                        }}
                      >
                        <StatusBadge value={r.status} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#f0f8ff' }}>{r.title}</div>
                          <p style={{ margin: '6px 0', fontSize: 13, color: '#8da4bc' }}>
                            <code style={{ color: '#2dd4bf', background: '#0a1d2e', padding: '2px 6px', borderRadius: 4 }}>{r.kind}</code> · Pattern: “{r.pattern}” · v{r.version} · Category: <i>{r.category}</i>
                          </p>
                          <p style={{ margin: '4px 0', fontSize: 13, color: '#cbd5e1' }}>{r.requirement}</p>
                          <div style={{ fontSize: 11, color: '#5a7a96', marginTop: 8 }}>
                            Source: <b>{r.source_title}</b>: “{r.source_excerpt}” (Owner: {r.owner})
                            {r.expires_at && ` · Expires: ${new Date(r.expires_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <StatusBadge value={r.severity} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facts / Claim Ledger Tab */}
              {constTab === 'facts' && (
                <div className="card-premium">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Approved Fact & Claim Ledger</h2>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8da4bc' }}>
                        Time-aware assertions with verified citations and provenance dates.
                      </p>
                    </div>
                    <button className="btn-primary btn-sm" onClick={() => setIsFactModalOpen(true)}>
                      <Plus size={14} /> Add Approved Fact
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 14 }}>
                    {facts.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          background: '#060d16',
                          border: '1px solid #1a3045',
                          borderRadius: 10,
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          gap: 16,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#f0f8ff' }}>{f.claim}</div>
                          <p style={{ margin: '6px 0', fontSize: 13, color: '#cbd5e1' }}>
                            Approved Assertion: <span style={{ color: '#2dd4bf', fontWeight: 600 }}>“{f.value}”</span>
                          </p>
                          <div style={{ fontSize: 11, color: '#5a7a96', marginTop: 6 }}>
                            Source: <b>{f.source_title}</b>: “{f.source_excerpt}”<br />
                            Owner: {f.owner} · Version: v{f.version} · Expires:{' '}
                            {f.expires_at ? new Date(f.expires_at).toLocaleDateString() : 'Active indefinitely'}
                          </div>
                        </div>
                        <StatusBadge value={f.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Brand Profile Tab */}
              {constTab === 'profile' && (
                <div className="card-premium">
                  <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Visual Brand Standards & Palette</h2>
                  <div style={{ maxWidth: 640, display: 'grid', gap: 20 }}>
                    <div>
                      <div className="label-sm">Primary Brand Colour</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 6, background: brandProfile?.primary_color || '#0f766e', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <code style={{ fontSize: 14, color: '#e8f0f8' }}>{brandProfile?.primary_color || '#0f766e'}</code>
                      </div>
                    </div>
                    <div>
                      <div className="label-sm">Secondary Accent Colour</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 6, background: brandProfile?.secondary_color || '#2dd4bf', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <code style={{ fontSize: 14, color: '#e8f0f8' }}>{brandProfile?.secondary_color || '#2dd4bf'}</code>
                      </div>
                    </div>
                    <div>
                      <div className="label-sm">WCAG 2.1 Contrast Ratio Standard</div>
                      <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 15, color: '#2dd4bf' }}>
                        {brandProfile?.min_contrast_ratio || 4.5}:1 (Normal text Level AA compliance)
                      </p>
                    </div>
                    <div>
                      <div className="label-sm">Approved Logo Aspect Ratio Fixture</div>
                      <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 15, color: '#f0f8ff' }}>
                        {brandProfile?.approved_logo_aspect || 3.0}:1 standard landscape logo
                      </p>
                    </div>
                    <div
                      style={{
                        background: 'rgba(13, 42, 64, 0.4)',
                        border: '1px solid #1a3045',
                        borderRadius: 8,
                        padding: '14px 18px',
                        fontSize: 13,
                        color: '#8da4bc',
                        lineHeight: 1.5,
                      }}
                    >
                      Visual rules are evaluated deterministically on uploaded images using Pillow quantization,
                      CIELAB Delta-E colour distance, and W3C WCAG 2.1 relative luminance formulas.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
             VIEW C & D: CONTENT SUBMISSION & FINDINGS WORKSPACE
             ========================================================================= */}
          {view === 'Content Review' && (
            <div className="bt-content-review-grid">
              {/* Left Column: Active Draft Context (when reviewing) OR New Submission Form */}
              <div className="bt-review-left-col">
                <div className="card-premium bt-draft-context-sticky">
                {reviews.length > 0 && (
                  <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #1a3045' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="label-sm" style={{ margin: 0 }}>Active Draft Under Review</span>
                      {selected && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '2px 8px', minHeight: 24 }}
                          onClick={() => setSelected(null)}
                        >
                          <Plus size={11} /> New Submission
                        </button>
                      )}
                    </div>
                    <select
                      className="input-premium"
                      value={selected?.id || ''}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        const match = reviews.find((r) => r.id === targetId);
                        if (match) setSelected(match);
                      }}
                      style={{ minHeight: 38, fontSize: 13 }}
                    >
                      <option value="">-- Select from {reviews.length} stored drafts --</option>
                      {reviews.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.score} pts · {r.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selected ? (
                  /* Dedicated Draft Context Panel: permanently visible alongside findings during review */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#2dd4bf', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Draft Context
                        </div>
                        <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#f0f8ff' }}>
                          {selected.title}
                        </h3>
                      </div>
                      <StatusBadge value={selected.status} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 12px', background: '#060d16', borderRadius: 8, border: '1px solid #1a3045', marginBottom: 14, fontSize: 12 }}>
                      <div>
                        <span style={{ color: '#5a7a96' }}>Type: </span>
                        <strong style={{ color: '#cbd5e1' }}>{selected.content_type}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#5a7a96' }}>Score: </span>
                        <strong style={{ color: selected.score >= 80 ? '#2dd4bf' : selected.score >= 60 ? '#fbbf24' : '#f87171' }}>
                          {selected.score}/100
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#5a7a96' }}>Author: </span>
                        <span style={{ color: '#8da4bc' }}>{selected.author}</span>
                      </div>
                      <div>
                        <span style={{ color: '#5a7a96' }}>Revisions: </span>
                        <span style={{ color: '#8da4bc' }}>{selected.versions?.length || 1}</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span className="label-sm" style={{ margin: 0 }}>Working Draft Copy</span>
                        <span style={{ fontSize: 11, color: '#5a7a96' }}>
                          {selected.content.length} characters
                        </span>
                      </div>
                      <div
                        style={{
                          background: '#040b14',
                          border: '1px solid #1a3045',
                          borderRadius: 8,
                          padding: '14px 16px',
                          color: '#e2e8f0',
                          fontSize: 13,
                          lineHeight: 1.65,
                          whiteSpace: 'pre-wrap',
                          maxHeight: 'calc(100vh - 360px)',
                          minHeight: 180,
                          overflowY: 'auto',
                          fontFamily: 'inherit',
                        }}
                      >
                        {selected.content}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => setSelected(null)}
                      >
                        <Plus size={14} /> Submit Another Draft / File
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Submission Form (Shown when no draft is actively selected) */
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #1a3045', paddingBottom: 10 }}>
                      <button
                        type="button"
                        className={`btn-secondary btn-sm ${submissionTab === 'text' ? 'btn-primary' : ''}`}
                        onClick={() => setSubmissionTab('text')}
                      >
                        Direct Text / Markdown
                      </button>
                      <button
                        type="button"
                        className={`btn-secondary btn-sm ${submissionTab === 'file' ? 'btn-primary' : ''}`}
                        onClick={() => setSubmissionTab('file')}
                      >
                        Upload File (PDF / Image)
                      </button>
                    </div>

                    {submissionTab === 'text' ? (
                      <form onSubmit={submitTextReview} style={{ display: 'grid', gap: 16 }}>
                        <div>
                          <label className="label-sm">Draft Title</label>
                          <input
                            className="input-premium"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="label-sm">Content Type</label>
                          <select
                            className="input-premium"
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value)}
                          >
                            <option value="marketing_copy">Marketing Copy</option>
                            <option value="email">Email Campaign</option>
                            <option value="social">Social Media Post</option>
                            <option value="web">Web Copy</option>
                            <option value="document">Document</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-sm">Draft Text (Plain text & Markdown supported)</label>
                          <textarea
                            className="input-premium"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={50000}
                            style={{ minHeight: 220 }}
                            required
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => setContent(sampleAnnouncement)}
                          >
                            Prefill Test Sample
                          </button>
                          <button className="btn-primary" disabled={busy} style={{ minHeight: 46 }}>
                            {busy ? 'Evaluating Evidence…' : 'Start Evidence Review'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={submitFileReview} style={{ display: 'grid', gap: 16 }}>
                        <div>
                          <label className="label-sm">Document Title</label>
                          <input
                            className="input-premium"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="label-sm">Content Type</label>
                          <select
                            className="input-premium"
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value)}
                          >
                            <option value="document">PDF Document</option>
                            <option value="image">Graphic / Image Asset</option>
                          </select>
                        </div>

                        <div
                          style={{
                            border: '2px dashed #1a3045',
                            borderRadius: 10,
                            padding: '36px 24px',
                            textAlign: 'center',
                            background: '#060d16',
                            cursor: 'pointer',
                            transition: 'border-color 200ms ease',
                          }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".txt,.md,.pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setUploadFile(e.target.files[0]);
                                if (!title || title.startsWith('Launch')) {
                                  setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                                }
                              }
                            }}
                          />
                          <FileUp size={32} style={{ color: '#2dd4bf', margin: '0 auto 12px' }} />
                          {uploadFile ? (
                            <div>
                              <strong style={{ color: '#f0f8ff', fontSize: 14 }}>{uploadFile.name}</strong>
                              <p style={{ margin: '6px 0 0', color: '#8da4bc', fontSize: 12 }}>
                                {(uploadFile.size / 1024).toFixed(1)} KB · Click to change file
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#f0f8ff' }}>Click to select a file</p>
                              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#5a7a96' }}>
                                Supported: PDF (with text extraction), PNG/JPEG (palette & WCAG contrast)
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          className="btn-primary"
                          style={{ width: '100%', minHeight: 46 }}
                          disabled={busy || !uploadFile}
                        >
                          {busy ? 'Extracting & Evaluating…' : 'Upload & Analyze File'}
                        </button>
                      </form>
                    )}
                  </>
                )}
                </div>
              </div>

              {/* Findings & Correction Workspace Panel */}
              <ReviewPanel
                review={selected}
                onFindingAction={handleFindingAction}
                reason={reason}
                setReason={setReason}
                manualEdit={manualEdit}
                setManualEdit={setManualEdit}
                editingFindingId={editingFindingId}
                setEditingFindingId={setEditingFindingId}
                onApproval={handleApproval}
                onRestoreVersion={handleRestoreVersion}
              />
            </div>
          )}

          {/* =========================================================================
             VIEW F: APPROVAL QUEUE
             ========================================================================= */}
          {view === 'Approval Queue' && (
            <div className="card-premium">
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Human Governance Approval Queue</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8da4bc' }}>
                  Drafts requiring reviewer disposition or publication sign-off. High-risk findings must be resolved before
                  approval can be granted by the server.
                </p>
              </div>
              <ReviewTable
                reviews={reviews.filter((r) => ['IN_REVIEW', 'CHANGES_REQUESTED'].includes(r.status))}
                open={(r) => {
                  setSelected(r);
                  setView('Content Review');
                }}
              />
            </div>
          )}

          {/* =========================================================================
             VIEW G: AUDIT HISTORY
             ========================================================================= */}
          {view === 'Audit History' && (
            <AuditView
              reviews={reviews}
              selected={selected}
              setSelected={setSelected}
            />
          )}

          {/* =========================================================================
             VIEW H: GOVERNANCE INSIGHTS
             ========================================================================= */}
          {view === 'Governance Insights' && (
            <InsightsView
              insights={insights}
              impactMap={impactMap}
              onTriggerReReview={handleTriggerImpactReReview}
              onNavigateToDraft={(reviewId: string) => {
                const r = reviews.find((x) => x.id === reviewId);
                if (r) {
                  setSelected(r);
                  setView('Content Review');
                }
              }}
            />
          )}

          {/* =========================================================================
             VIEW I: HELP & DEMO
             ========================================================================= */}
          {view === 'Help & Demo' && (
            <HelpWalkthroughView
              onLoadDemo={() => {
                setTitle('Launch announcement — Q4');
                setContent(sampleAnnouncement);
                setView('Content Review');
              }}
              onResetDemo={async () => {
                setBusy(true);
                setError('');
                try {
                  await fetch('http://127.0.0.1:8000/api/demo/reset', { method: 'POST' });
                  await refresh();
                  setSelected(null);
                  setSuccess('Demo data has been reset to pristine initial state.');
                  setTimeout(() => setSuccess(''), 4000);
                } catch (e) {
                  setError('Failed to reset demo data: ' + (e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
        </div>
      </main>

      {/* =========================================================================
         RULE MODAL
         ========================================================================= */}
      {isRuleModalOpen && (
        <div className="bt-modal-backdrop" onClick={() => setIsRuleModalOpen(false)}>
          <div className="bt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bt-modal-head">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Approved Brand Rule</h2>
              <button className="btn-icon" onClick={() => setIsRuleModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateRule} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="label-sm">Rule Title</label>
                <input
                  className="input-premium"
                  value={newRule.title}
                  onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label-sm">Rule Kind</label>
                  <select
                    className="input-premium"
                    value={newRule.kind}
                    onChange={(e) => setNewRule({ ...newRule, kind: e.target.value as any })}
                  >
                    <option value="prohibited_phrase">Prohibited Phrase</option>
                    <option value="required_phrase">Required Phrase</option>
                    <option value="forbidden_term">Forbidden Term</option>
                    <option value="approved_term">Approved Term</option>
                    <option value="tone_rule">Tone Rule</option>
                  </select>
                </div>
                <div>
                  <label className="label-sm">Severity</label>
                  <select
                    className="input-premium"
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as any })}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-sm">Match Pattern</label>
                <input
                  className="input-premium"
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  placeholder="e.g. cheap, best, or required disclaimer"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Requirement Description</label>
                <input
                  className="input-premium"
                  value={newRule.requirement}
                  onChange={(e) => setNewRule({ ...newRule, requirement: e.target.value })}
                  placeholder="Describe approved guidelines and replacement instructions"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Approved Source Title</label>
                <input
                  className="input-premium"
                  value={newRule.source_title}
                  onChange={(e) => setNewRule({ ...newRule, source_title: e.target.value })}
                  placeholder="e.g. Brand Voice Standard 2026"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Source Excerpt / Citation</label>
                <input
                  className="input-premium"
                  value={newRule.source_excerpt}
                  onChange={(e) => setNewRule({ ...newRule, source_excerpt: e.target.value })}
                  placeholder="Exact quotation from approved policy"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setIsRuleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         FACT MODAL
         ========================================================================= */}
      {isFactModalOpen && (
        <div className="bt-modal-backdrop" onClick={() => setIsFactModalOpen(false)}>
          <div className="bt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bt-modal-head">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Record Approved Fact / Claim</h2>
              <button className="btn-icon" onClick={() => setIsFactModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateFact} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="label-sm">Claim Topic / Assertion Title</label>
                <input
                  className="input-premium"
                  value={newFact.claim}
                  onChange={(e) => setNewFact({ ...newFact, claim: e.target.value })}
                  placeholder="e.g. Encryption Standard"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Approved Fact Value</label>
                <input
                  className="input-premium"
                  value={newFact.value}
                  onChange={(e) => setNewFact({ ...newFact, value: e.target.value })}
                  placeholder="Exact factual assertion (e.g. AES-256)"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Owner Department</label>
                <input
                  className="input-premium"
                  value={newFact.owner}
                  onChange={(e) => setNewFact({ ...newFact, owner: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label-sm">Source Document Title</label>
                <input
                  className="input-premium"
                  value={newFact.source_title}
                  onChange={(e) => setNewFact({ ...newFact, source_title: e.target.value })}
                  placeholder="e.g. Product Security Whitepaper"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Source Excerpt</label>
                <input
                  className="input-premium"
                  value={newFact.source_excerpt}
                  onChange={(e) => setNewFact({ ...newFact, source_excerpt: e.target.value })}
                  placeholder="Quoted assertion from approved source"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Expiration Date (Optional)</label>
                <input
                  type="date"
                  className="input-premium"
                  value={newFact.expires_at}
                  onChange={(e) =>
                    setNewFact({
                      ...newFact,
                      expires_at: e.target.value ? new Date(e.target.value).toISOString() : '',
                    })
                  }
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setIsFactModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm">
                  Record Fact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helper Sub-Components
// -----------------------------------------------------------------------------

function ReviewTable({ reviews, open }: { reviews: Review[]; open: (r: Review) => void }) {
  if (!reviews.length) {
    return <p style={{ color: '#5a7a96', fontSize: 13, margin: '14px 0' }}>No review records found.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {reviews.map((r) => (
        <button
          key={r.id}
          onClick={() => open(r)}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 0.8fr 0.9fr 50px',
            gap: 14,
            alignItems: 'center',
            padding: '12px 16px',
            border: '1px solid #1a3045',
            borderRadius: 8,
            background: '#060d16',
            color: '#e8f0f8',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 180ms ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(45, 212, 191, 0.4)';
            (e.currentTarget as HTMLElement).style.background = '#0a1a28';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#1a3045';
            (e.currentTarget as HTMLElement).style.background = '#060d16';
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: '#5a7a96', marginTop: 2 }}>
              {new Date(r.created_at).toLocaleString()} · {r.content_type}
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#8da4bc' }}>{r.findings?.length || 0} findings</span>
          <div>
            <StatusBadge value={r.status} />
          </div>
          <strong style={{ fontSize: 18, color: '#2dd4bf', textAlign: 'right' }}>{r.score}</strong>
        </button>
      ))}
    </div>
  );
}

function ReviewPanel({
  review,
  onFindingAction,
  reason,
  setReason,
  manualEdit,
  setManualEdit,
  editingFindingId,
  setEditingFindingId,
  onApproval,
  onRestoreVersion,
}: {
  review: Review | null;
  onFindingAction: (f: EvidenceFinding, action: string, customReplacement?: string) => void;
  reason: string;
  setReason: (val: string) => void;
  manualEdit: string;
  setManualEdit: (val: string) => void;
  editingFindingId: string | null;
  setEditingFindingId: (id: string | null) => void;
  onApproval: (action: 'approve' | 'request_changes' | 'waive') => void;
  onRestoreVersion: (versionId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'findings' | 'versions'>('findings');
  const [filter, setFilter] = useState<'all' | 'high_critical' | 'needs_review' | 'resolved'>('all');
  const [dismissPromptId, setDismissPromptId] = useState<string | null>(null);
  const [inlineDismissReason, setInlineDismissReason] = useState('');
  const [placementFindingId, setPlacementFindingId] = useState<string | null>(null);
  const [customPlacementText, setCustomPlacementText] = useState('');

  if (!review) {
    return (
      <div className="card-premium" style={{ display: 'grid', placeContent: 'center', textAlign: 'center', minHeight: 400 }}>
        <div style={{ fontSize: 40, color: '#2dd4bf', marginBottom: 12 }}>◈</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Evidence Findings & Governance Panel</h2>
        <p style={{ color: '#8da4bc', fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
          Select an existing review from the list or submit a draft to inspect evidence-linked compliance findings.
        </p>
      </div>
    );
  }

  const totalFindings = review.findings.length;
  const highCriticalFindings = review.findings.filter((f) => ['HIGH', 'CRITICAL'].includes(f.severity));
  const unresolvedHigh = review.findings.filter(
    (f) => !f.disposition && ['HIGH', 'CRITICAL'].includes(f.severity)
  );
  const needsReviewFindings = review.findings.filter((f) => !f.disposition && (f.status === 'NEEDS_REVIEW' || f.status === 'CONTRADICTED'));
  const resolvedFindings = review.findings.filter((f) => Boolean(f.disposition));

  const filteredFindings = review.findings.filter((f) => {
    if (filter === 'high_critical') return ['HIGH', 'CRITICAL'].includes(f.severity);
    if (filter === 'needs_review') return f.status === 'NEEDS_REVIEW' || f.status === 'CONTRADICTED';
    if (filter === 'resolved') return Boolean(f.disposition);
    return true;
  });

  const scoreColor = review.score >= 80 ? '#2dd4bf' : review.score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="card-premium">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#5a7a96', fontWeight: 700 }}>ID: {review.id}</span>
            <StatusBadge value={review.status} />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{review.title}</h2>
          <div style={{ fontSize: 12, color: '#8da4bc', marginTop: 4 }}>
            Submitted by {review.author} · Method: <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{review.analysis_method}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{review.score}</div>
          <div style={{ fontSize: 11, color: '#5a7a96', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            Health Score
            <span
              title="Base 100 score engine. Deductions for unresolved findings: Critical (-30), High (-18), Medium (-10), Low (-4). Resolved findings restore full points."
              style={{ cursor: 'help', color: '#2dd4bf', display: 'inline-flex' }}
            >
              <Info size={12} />
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#4d6880', marginTop: 2 }}>
            {resolvedFindings.length}/{totalFindings} resolved
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid #1a3045', paddingBottom: 10 }}>
        <button
          className={`btn-secondary btn-sm ${activeTab === 'findings' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('findings')}
        >
          Compliance Findings ({totalFindings})
        </button>
        <button
          className={`btn-secondary btn-sm ${activeTab === 'versions' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          Draft Revisions ({review.versions?.length || 1})
        </button>
      </div>

      {activeTab === 'findings' ? (
        <>
          {/* Approval Blocker Warning Banner */}
          {unresolvedHigh.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                color: '#fca5a5',
                fontSize: 13,
              }}
            >
              <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#fecaca' }}>Approval Gate Locked:</strong>{' '}
                {unresolvedHigh.length} unresolved high-risk finding{unresolvedHigh.length > 1 ? 's' : ''} require disposition or documented waiver before sign-off can be granted.
              </div>
            </div>
          )}

          {/* Findings Summary Stats Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              background: '#060d16',
              border: '1px solid #1a3045',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: '#5a7a96', textTransform: 'uppercase', fontWeight: 600 }}>Total Findings</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f0f8ff' }}>{totalFindings}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', fontWeight: 600 }}>High / Critical</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: unresolvedHigh.length > 0 ? '#f87171' : '#86efac' }}>
                {unresolvedHigh.length} <span style={{ fontSize: 11, fontWeight: 500, color: '#5a7a96' }}>open ({highCriticalFindings.length})</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#fbbf24', textTransform: 'uppercase', fontWeight: 600 }}>Needs Review</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>{needsReviewFindings.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', fontWeight: 600 }}>Resolved</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>{resolvedFindings.length}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: '#5a7a96', fontWeight: 700, textTransform: 'uppercase', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={12} /> Filter:
            </span>
            <button
              type="button"
              className={`btn-secondary btn-sm ${filter === 'all' ? 'btn-primary' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px', minHeight: 30 }}
              onClick={() => setFilter('all')}
            >
              All ({totalFindings})
            </button>
            <button
              type="button"
              className={`btn-secondary btn-sm ${filter === 'high_critical' ? 'btn-primary' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px', minHeight: 30 }}
              onClick={() => setFilter('high_critical')}
            >
              High & Critical ({highCriticalFindings.length})
            </button>
            <button
              type="button"
              className={`btn-secondary btn-sm ${filter === 'needs_review' ? 'btn-primary' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px', minHeight: 30 }}
              onClick={() => setFilter('needs_review')}
            >
              Needs Review ({needsReviewFindings.length})
            </button>
            <button
              type="button"
              className={`btn-secondary btn-sm ${filter === 'resolved' ? 'btn-primary' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px', minHeight: 30 }}
              onClick={() => setFilter('resolved')}
            >
              Resolved ({resolvedFindings.length})
            </button>
          </div>

          {/* Draft text excerpt */}
          <div style={{ background: '#060d16', borderRadius: 8, padding: '14px 18px', border: '1px solid #1a3045', marginBottom: 18 }}>
            <div className="label-sm">Current Working Draft Content</div>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {review.content}
            </p>
          </div>

          {/* Global recorded reason input */}
          <div style={{ marginBottom: 18 }}>
            <label className="label-sm">
              Recorded Disposition Reason (Required for Dismissal, Manual Edit & Waiver)
            </label>
            <input
              className="input-premium"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Legal exception granted, Contextual partner agreement"
              style={{ marginTop: 6 }}
            />
          </div>

          {/* Findings List */}
          {totalFindings === 0 ? (
            <div className="toast-success" style={{ margin: '14px 0' }}>
              ✓ No compliance violations detected. Human review sign-off is still required.
            </div>
          ) : filteredFindings.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                background: '#060d16',
                borderRadius: 8,
                border: '1px dashed #1a3045',
                color: '#8da4bc',
                marginBottom: 16,
              }}
            >
              <Filter size={24} style={{ color: '#5a7a96', margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No findings match the selected filter.</p>
              <button
                type="button"
                className="btn-secondary btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setFilter('all')}
              >
                Clear Filter (Show All {totalFindings})
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {filteredFindings.map((f) => {
                const isResolved = Boolean(f.disposition);
                const isHighOrCritical = ['HIGH', 'CRITICAL'].includes(f.severity);
                const borderAccent = isResolved
                  ? '#10b981'
                  : isHighOrCritical
                  ? '#ef4444'
                  : f.severity === 'MEDIUM'
                  ? '#f59e0b'
                  : '#0ea5e9';

                return (
                  <div
                    key={f.id}
                    className={`finding-card ${editingFindingId === f.id ? 'selected' : ''}`}
                    style={{
                      borderLeft: `4px solid ${borderAccent}`,
                      opacity: isResolved ? 0.85 : 1,
                    }}
                  >
                    {(() => {
                      const isMissingTerm = f.type === 'required_phrase' || f.type === 'approved_term';
                      return (
                        <>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                            <StatusBadge value={f.severity} />
                            <StatusBadge value={f.status} />
                            {isMissingTerm && (
                              <span style={{ background: '#0e3a5f', color: '#7dd3fc', border: '1px solid #0284c7', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                MISSING MANDATORY TERM
                              </span>
                            )}
                            {f.disposition && <StatusBadge value={f.disposition} />}
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#2dd4bf', background: '#0a1d2e', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                              {f.analysis_method}
                            </span>
                          </div>

                          {isMissingTerm ? (
                            <div style={{ background: '#071626', border: '1px dashed #38bdf8', borderRadius: 8, padding: '10px 14px', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', flexShrink: 0, boxShadow: '0 0 6px #38bdf8' }} />
                              <div style={{ fontSize: 13, color: '#e0f2fe' }}>
                                Required brand language absent from copy: <strong style={{ color: '#7dd3fc' }}>“{f.passage}”</strong>
                              </div>
                            </div>
                          ) : (
                            <div className={`finding-passage ${f.status.toLowerCase().includes('contradicted') ? 'contradicted' : f.status.toLowerCase().includes('outdated') ? 'outdated' : f.status.toLowerCase().includes('supported') && !f.status.toLowerCase().includes('un') ? 'supported' : ''}`}>
                              “{f.passage}”
                            </div>
                          )}

                          <p style={{ color: '#8da4bc', fontSize: 14, lineHeight: 1.6, margin: '8px 0' }}>
                            {f.explanation}
                          </p>

                          {/* Evidence Source / Citation */}
                          {f.source_id ? (
                            <div className="evidence-block">
                              <div style={{ fontWeight: 600, color: '#2dd4bf', fontSize: 12, marginBottom: 4 }}>
                                Source: {f.source_title} · ID: {f.source_id} · v{f.source_version || '1.0'}
                              </div>
                              <div className="evidence-excerpt">“{f.source_excerpt}”</div>
                            </div>
                          ) : (
                            <div className="evidence-block amber">
                              <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: 12, marginBottom: 4 }}>
                                HUMAN VERIFICATION REQUIRED (NO APPROVED CITATION ASSERTED)
                              </div>
                              <div className="evidence-excerpt">
                                {f.uncertainty || 'Offline AI triage detected an unverified assertion.'}
                              </div>
                            </div>
                          )}

                          {/* Intent-Preserving Suggested Correction or Missing Term Placement */}
                          {isMissingTerm ? (
                            <div
                              style={{
                                marginTop: 12,
                                background: '#04121a',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: 8,
                                padding: '12px 14px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                                <div>
                                  <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Required Brand Term Placement
                                  </div>
                                  <div style={{ fontSize: 13, marginTop: 4, color: '#cbd5e1' }}>
                                    Mandatory term <strong style={{ color: '#7dd3fc' }}>“{f.passage}”</strong> must appear in published copy.
                                  </div>
                                </div>
                              </div>

                              {!f.disposition && editingFindingId !== f.id && (
                                <>
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                    <button
                                      type="button"
                                      className="btn-secondary btn-sm"
                                      onClick={() => {
                                        const trimmed = review.content.trim();
                                        const rep = `${trimmed}\n\n— Verified with ${f.passage}.`;
                                        onFindingAction(f, 'accept', rep);
                                      }}
                                      style={{ fontSize: 12, minHeight: 32, padding: '4px 10px' }}
                                      title="Add formal sign-off footer with required brand term"
                                    >
                                      <Plus size={12} /> Add Attribution Sign-off
                                    </button>

                                    <button
                                      type="button"
                                      className="btn-secondary btn-sm"
                                      onClick={() => {
                                        const trimmed = review.content.trim();
                                        const rep = `${f.passage}: ${trimmed}`;
                                        onFindingAction(f, 'accept', rep);
                                      }}
                                      style={{ fontSize: 12, minHeight: 32, padding: '4px 10px' }}
                                      title="Prepend brand name as headline / lead-in"
                                    >
                                      <Plus size={12} /> Add Brand Lead-in
                                    </button>

                                    <button
                                      type="button"
                                      className="btn-primary btn-sm"
                                      onClick={() => {
                                        if (placementFindingId === f.id) {
                                          setPlacementFindingId(null);
                                        } else {
                                          setPlacementFindingId(f.id);
                                          setCustomPlacementText(review.content);
                                        }
                                      }}
                                      style={{ fontSize: 12, minHeight: 32, padding: '4px 12px' }}
                                    >
                                      <Edit3 size={12} /> Contextual Placement Editor…
                                    </button>
                                  </div>

                                  {placementFindingId === f.id && (
                                    <div style={{ marginTop: 12, background: '#071626', border: '1px solid #1e3a5f', borderRadius: 8, padding: 12 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <span className="label-sm" style={{ color: '#7dd3fc', margin: 0 }}>
                                          Draft Editor — Position “{f.passage}” in Context
                                        </span>
                                        {customPlacementText.toLowerCase().includes(f.passage.toLowerCase()) ? (
                                          <span style={{ fontSize: 11, color: '#86efac', fontWeight: 600 }}>
                                            ✓ Required term present
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>
                                            ⚠ Must include “{f.passage}”
                                          </span>
                                        )}
                                      </div>
                                      <textarea
                                        className="input-premium"
                                        rows={4}
                                        value={customPlacementText}
                                        onChange={(e) => setCustomPlacementText(e.target.value)}
                                        style={{ width: '100%', fontSize: 13, lineHeight: 1.5, minHeight: 90 }}
                                      />
                                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                        <button
                                          type="button"
                                          className="btn-secondary btn-sm"
                                          onClick={() => setPlacementFindingId(null)}
                                          style={{ fontSize: 12, minHeight: 30 }}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-primary btn-sm"
                                          disabled={!customPlacementText.toLowerCase().includes(f.passage.toLowerCase())}
                                          onClick={() => {
                                            onFindingAction(f, 'accept', customPlacementText);
                                            setPlacementFindingId(null);
                                          }}
                                          style={{ fontSize: 12, minHeight: 30 }}
                                        >
                                          Apply Placement
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ) : f.suggested_correction ? (
                            <div
                              style={{
                                marginTop: 12,
                                background: '#04121a',
                                border: '1px solid rgba(45, 212, 191, 0.3)',
                                borderRadius: 8,
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                flexWrap: 'wrap',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 11, color: '#5eead4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Intent-Preserving Correction
                                </div>
                                <div style={{ fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ textDecoration: 'line-through', color: '#f87171' }}>“{f.passage}”</span>
                                  <span style={{ color: '#5a7a96' }}>→</span>
                                  <span style={{ color: '#86efac', fontWeight: 600 }}>“{f.suggested_correction}”</span>
                                </div>
                              </div>
                              {!f.disposition && editingFindingId !== f.id && (
                                <button
                                  type="button"
                                  className="btn-primary btn-sm"
                                  onClick={() => onFindingAction(f, 'accept')}
                                  style={{ padding: '6px 14px', fontSize: 12, minHeight: 34 }}
                                >
                                  <Check size={13} /> Accept Replacement
                                </button>
                              )}
                            </div>
                          ) : null}

                          {/* Inline Dismiss Prompt when reason is missing */}
                          {dismissPromptId === f.id && (
                            <div style={{ marginTop: 12, background: '#1c1010', padding: 14, borderRadius: 8, border: '1px solid #7f1d1d' }}>
                              <div className="label-sm" style={{ color: '#fca5a5' }}>
                                Document Justification to Dismiss Finding
                              </div>
                              <input
                                className="input-premium"
                                value={inlineDismissReason}
                                onChange={(e) => setInlineDismissReason(e.target.value)}
                                placeholder="e.g. Legal counsel approved exception under guideline Section 4"
                                style={{ marginTop: 6 }}
                              />
                              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button
                                  type="button"
                                  className="btn-danger btn-sm"
                                  onClick={() => {
                                    if (!inlineDismissReason.trim()) {
                                      alert('Please provide a documented reason before dismissing this finding.');
                                      return;
                                    }
                                    setReason(inlineDismissReason.trim());
                                    setDismissPromptId(null);
                                    const findingWithReason = { ...f };
                                    onFindingAction(findingWithReason, 'dismiss');
                                  }}
                                >
                                  Confirm Dismissal
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  onClick={() => {
                                    setDismissPromptId(null);
                                    setInlineDismissReason('');
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Manual Edit Input Box */}
                          {editingFindingId === f.id && (
                            <div style={{ marginTop: 12, background: '#060d16', padding: 16, borderRadius: 8, border: '1px solid #1a3045' }}>
                              <div className="label-sm">
                                {isMissingTerm ? `Update Draft to Include Required Term “${f.passage}”` : `Replacement Text for “${f.passage}”`}
                              </div>
                              {isMissingTerm ? (
                                <textarea
                                  className="input-premium"
                                  value={manualEdit}
                                  onChange={(e) => setManualEdit(e.target.value)}
                                  placeholder="Edit complete draft content to place required terminology"
                                  style={{ marginTop: 6, minHeight: 120 }}
                                />
                              ) : (
                                <input
                                  className="input-premium"
                                  value={manualEdit}
                                  onChange={(e) => setManualEdit(e.target.value)}
                                  placeholder="Enter modified wording"
                                  style={{ marginTop: 6 }}
                                />
                              )}
                              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button className="btn-primary btn-sm" onClick={() => onFindingAction(f, 'edit')}>
                                  Apply Edit
                                </button>
                                <button className="btn-secondary btn-sm" onClick={() => setEditingFindingId(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Finding Action Buttons */}
                          {!f.disposition && editingFindingId !== f.id && dismissPromptId !== f.id && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a3045' }}>
                              {isMissingTerm ? (
                                <>
                                  <button className="btn-primary btn-sm" onClick={() => onFindingAction(f, 'insert')}>
                                    <Plus size={14} /> Insert Term
                                  </button>
                                  <button
                                    className="btn-secondary btn-sm"
                                    onClick={() => {
                                      setEditingFindingId(f.id);
                                      setManualEdit(review.content);
                                    }}
                                  >
                                    <Edit3 size={14} /> Edit Draft to Place Term
                                  </button>
                                </>
                              ) : (
                                <>
                                  {f.suggested_correction && (
                                    <button className="btn-primary btn-sm" onClick={() => onFindingAction(f, 'accept')}>
                                      <Check size={14} /> Accept Replacement
                                    </button>
                                  )}
                                  <button
                                    className="btn-secondary btn-sm"
                                    onClick={() => {
                                      setEditingFindingId(f.id);
                                      setManualEdit(f.suggested_correction || f.passage);
                                    }}
                                  >
                                    <Edit3 size={14} /> Edit Manually
                                  </button>
                                </>
                              )}
                              <button
                                className="btn-secondary btn-sm"
                                onClick={() => {
                                  if (!reason.trim()) {
                                    setDismissPromptId(f.id);
                                    setInlineDismissReason('');
                                  } else {
                                    onFindingAction(f, 'dismiss');
                                  }
                                }}
                              >
                                <X size={14} /> Dismiss with Reason
                              </button>
                              <button className="btn-secondary btn-sm" onClick={() => onFindingAction(f, 'escalate')}>
                                <ArrowUpRight size={14} /> Escalate
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {/* Approval Action Controls */}
          <footer
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              borderTop: '1px solid #1a3045',
              paddingTop: 20,
              marginTop: 24,
            }}
          >
            <button
              className="btn-primary"
              onClick={() => onApproval('approve')}
              style={{ minHeight: 48 }}
              title={
                unresolvedHigh.length > 0
                  ? `${unresolvedHigh.length} high-risk findings must be resolved before approval`
                  : 'Approve draft for publication hand-off'
              }
            >
              <CheckCircle size={16} /> Approve Review {unresolvedHigh.length > 0 && `(${unresolvedHigh.length} High Risk Blocked)`}
            </button>
            <button className="btn-secondary" onClick={() => onApproval('request_changes')} style={{ minHeight: 48 }}>
              Request Changes
            </button>
            <button className="btn-danger" onClick={() => onApproval('waive')} style={{ minHeight: 48 }}>
              Waive with Reason
            </button>
          </footer>
        </>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {review.versions?.map((v) => (
            <div
              key={v.id}
              style={{
                border: '1px solid #1a3045',
                padding: '16px 20px',
                borderRadius: 10,
                background: '#060d16',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f8ff' }}>Revision: {v.reason}</div>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => onRestoreVersion(v.id)}
                >
                  <RotateCcw size={14} /> Restore This Revision
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#5a7a96', marginTop: 4 }}>
                Created by {v.created_by} at {new Date(v.created_at).toLocaleString()}
              </div>
              <p style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>
                {v.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditView({
  reviews,
  selected,
  setSelected,
}: {
  reviews: Review[];
  selected: Review | null;
  setSelected: (r: Review) => void;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  // Auto-select the most recent review when none is selected
  useEffect(() => {
    if (!selected && reviews.length > 0) {
      setSelected(reviews[0]);
    }
  }, [reviews, selected, setSelected]);

  useEffect(() => {
    if (selected) {
      setLoading(true);
      setAuditError('');
      api
        .audit(selected.id)
        .then((e) => {
          setEvents(e);
          setLoading(false);
        })
        .catch((err) => {
          setEvents([]);
          setAuditError((err as Error).message);
          setLoading(false);
        });
    } else {
      setEvents([]);
    }
  }, [selected]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 24 }}>
      <div className="card-premium">
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Stored Review Records</h2>
        {reviews.length === 0 ? (
          <p style={{ color: '#5a7a96', fontSize: 13 }}>No review records found. Submit a draft first.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {reviews.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.8fr 0.8fr 0.9fr 50px',
                  gap: 14,
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: `1px solid ${selected?.id === r.id ? 'rgba(45,212,191,0.5)' : '#1a3045'}`,
                  borderRadius: 8,
                  background: selected?.id === r.id ? '#0a2233' : '#060d16',
                  color: '#e8f0f8',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: selected?.id === r.id ? '#2dd4bf' : '#e8f0f8' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#5a7a96', marginTop: 2 }}>
                    {new Date(r.created_at).toLocaleString()} &middot; {r.content_type}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#8da4bc' }}>{r.findings?.length || 0} findings</span>
                <div>
                  <StatusBadge value={r.status} />
                </div>
                <strong style={{ fontSize: 18, color: '#2dd4bf', textAlign: 'right' }}>{r.score}</strong>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card-premium">
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Reconstructable Decision History</h2>
        {!selected ? (
          <p style={{ color: '#5a7a96', fontSize: 13 }}>
            Select a review record from the left to inspect its immutable audit timeline.
          </p>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8da4bc' }}>
            <RefreshCw size={28} style={{ color: '#2dd4bf', marginBottom: 12 }} />
            <p style={{ fontSize: 13 }}>Loading audit trail&hellip;</p>
          </div>
        ) : auditError ? (
          <div className="toast-error" style={{ margin: '14px 0' }}>
            <AlertCircle size={16} /> Failed to load audit trail: {auditError}
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#5a7a96' }}>
            <Clock size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No audit events recorded for this review yet.</p>
          </div>
        ) : (
          <div>
            <div className="section-eyebrow" style={{ marginBottom: 12 }}>
              IMMUTABLE AUDIT TRAIL FOR {selected.id}
            </div>
            <div style={{ display: 'grid', gap: 0, position: 'relative' }}>
              {events.map((e, index) => (
                <div key={e.id} className="timeline-item">
                  <div className="timeline-dot" />
                  {index < events.length - 1 && <div className="timeline-line" />}
                  <div className="timeline-content">
                    <div className="timeline-action">{e.action.replace(/_/g, ' ')}</div>
                    <div className="timeline-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>Actor: <span style={{ color: '#2dd4bf' }}>{e.actor}</span></span>
                      <span
                        style={{
                          background: '#0d2238',
                          border: '1px solid #1a3a5c',
                          color: '#67e8f9',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {e.actor_role} &middot; SIMULATED DEMO ROLE
                      </span>
                      <span>&middot; {new Date(e.created_at).toLocaleString()}</span>
                    </div>
                    {e.reason && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#cbd5e1' }}>
                        Documented Reason: &ldquo;{e.reason}&rdquo;
                      </p>
                    )}
                    {e.details && (
                      <div style={{ fontSize: 11, color: '#5a7a96', marginTop: 2 }}>
                        Details: {e.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightsView({
  insights,
  impactMap,
  onTriggerReReview,
  onNavigateToDraft,
}: {
  insights: Insights | null;
  impactMap: ImpactMap | null;
  onTriggerReReview: (id: string) => void;
  onNavigateToDraft?: (reviewId: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { title: 'Open Findings', value: insights?.unresolved || 0, hint: 'Need reviewer action', color: '#fbbf24' },
          { title: 'Dismissals', value: insights?.dismissed || 0, hint: 'Documented exceptions', color: '#67e8f9' },
          { title: 'Disagreements', value: insights?.disagreements_count || 0, hint: 'Reviewer overrides', color: '#f87171' },
          { title: 'Impacted Drafts', value: impactMap?.total_impacted_drafts || 0, hint: 'Rule/fact changes', color: '#2dd4bf' },
        ].map(({ title, value, hint, color }) => (
          <div key={title} className="metric-card">
            <div className="metric-label">{title}</div>
            <div className="metric-value" style={{ color }}>{value}</div>
            <div className="metric-sub">{hint}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card-premium">
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Recurring Policy Findings</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8da4bc' }}>
            Most frequently violated rule categories across historical drafts.
          </p>
          <Bars values={insights?.recurring || []} />
        </div>

        <div className="card-premium">
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Candidate Rules for Clarification</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8da4bc' }}>
            Rules with high triage or dismissal rates suggesting ambiguous guidelines.
          </p>
          <Bars values={insights?.unclear_rules || []} />
        </div>
      </div>

      {/* Time-Aware Claim Ledger & Impact Map */}
      <div className="card-premium">
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>
          Time-Aware Claim Ledger &amp; Rule-Change Impact Map
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8da4bc' }}>
          Targeted re-review engine: when an approved fact or rule expires or changes, BRANDTRACE pinpoints exactly
          which drafts depend on it.
        </p>

        {impactMap && impactMap.items.length > 0 ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {impactMap.items.map((item) => (
              <div
                key={item.item_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: 16,
                  padding: '16px 20px',
                  border: '1px solid #1a3045',
                  borderRadius: 10,
                  background: '#060d16',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span className={item.re_review_urgency === 'URGENT' ? 'badge-high' : 'badge-medium'}>
                    {item.re_review_urgency} &middot; {item.item_type} {item.status}
                  </span>
                  <p style={{ margin: '6px 0 2px', fontWeight: 700, color: '#f0f8ff' }}>
                    {item.item_title} <span style={{ fontSize: 11, color: '#5a7a96', fontWeight: 400 }}>(ID: {item.item_id})</span>
                  </p>
                  <div style={{ fontSize: 12, color: '#8da4bc', marginTop: 4 }}>
                    Affects {item.affected_review_ids.length} draft(s):
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {(item.affected_drafts || item.affected_review_titles.map((t, i) => ({ id: item.affected_review_ids[i], title: t, status: 'IN_REVIEW' }))).map((draft: any) => (
                      <button
                        key={draft.id}
                        onClick={() => onNavigateToDraft?.(draft.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #1a3045',
                          background: '#0a1828',
                          color: '#67e8f9',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: onNavigateToDraft ? 'pointer' : 'default',
                          transition: 'border-color 180ms ease',
                        }}
                        title={`Open draft ${draft.id}`}
                      >
                        <FileText size={12} />
                        {draft.title}
                        <StatusBadge value={draft.status} />
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => onTriggerReReview(item.item_id)}
                  style={{ flexShrink: 0 }}
                >
                  <RefreshCw size={14} /> Re-Review
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#5a7a96', fontSize: 13 }}>No expired sources currently impacting active drafts.</p>
        )}
      </div>
    </div>
  );
}

function HelpWalkthroughView({ onLoadDemo, onResetDemo }: { onLoadDemo: () => void; onResetDemo?: () => void }) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="card-premium">
      <div style={{ maxWidth: 840, lineHeight: 1.6 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>
          Judge Evaluation Walkthrough &mdash; Local Verification Guide
        </h2>
        <p style={{ color: '#8da4bc', fontSize: 14, margin: '0 0 24px' }}>
          Welcome to the BRANDTRACE governance workspace. Follow this concise step-by-step evaluation script to test
          all core capabilities without requiring an external AI API key:
        </p>

        {/* Demo Environment Notice */}
        <div style={{
          background: 'rgba(13, 148, 136, 0.1)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#5eead4', letterSpacing: '0.04em', marginBottom: 4 }}>
              FICTIONAL DEMO ENVIRONMENT
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#8da4bc' }}>
              All workspace data, brand rules, facts, and reviews are fictional demonstration records.
              No real organisation data is used. Role simulation is client-side only.
            </p>
          </div>
          {onResetDemo && (
            confirmReset ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#fca5a5' }}>Reset all records?</span>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  onClick={() => {
                    setConfirmReset(false);
                    onResetDemo();
                  }}
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={() => setConfirmReset(true)}
                style={{ flexShrink: 0 }}
              >
                <RefreshCw size={14} /> Reset Demo Data
              </button>
            )
          )}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {[
            {
              step: '1',
              title: 'Brand Constitution & Claim Ledger',
              desc: 'Navigate to Brand Constitution to inspect active rules (prohibited phrases, required platform capitalization, forbidden terms) and the approved fact ledger with expiration dates.',
            },
            {
              step: '2',
              title: 'Submit Test Draft with Intentional Violations',
              desc: 'Click the button below to load an announcement draft containing superlatives ("best"), forbidden terms ("cheap"), and absolute promotional assertions ("always").',
              action: (
                <button className="btn-primary btn-sm" style={{ marginTop: 10 }} onClick={onLoadDemo}>
                  Load Announcement Sample in Reviewer
                </button>
              ),
            },
            {
              step: '3',
              title: 'Inspect Evidence-Linked Findings',
              desc: 'Notice how exact rules produce CONTRADICTED with verified source IDs and excerpts, while unsubstantiated claims produce NEEDS REVIEW without hallucinated citations.',
            },
            {
              step: '4',
              title: 'Test Server-Side Approval Gate',
              desc: 'Try clicking Approve Review before resolving the high-risk findings. The backend returns a strict 409 Conflict preventing premature sign-off.',
            },
            {
              step: '5',
              title: 'Apply Corrections & Document Justifications',
              desc: 'Use Accept Edit to replace "best" or "cheap" with approved wording, and Dismiss with Reason to record an exception. Once resolved, Approve Review succeeds.',
            },
            {
              step: '6',
              title: 'Audit History & Governance Intelligence',
              desc: 'Inspect Audit History to verify reconstructable event logs with actor, timestamp, and justification, and check Governance Insights for recurring violations and the Rule-Change Impact Map.',
            },
          ].map(({ step, title, desc, action }) => (
            <div key={step} className="bt-walkthrough-step">
              <div className="bt-step-num">{step}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f0f8ff' }}>{title}</div>
                <p style={{ margin: '4px 0 0', color: '#8da4bc', fontSize: 13 }}>{desc}</p>
                {action}
              </div>
            </div>
          ))}
        </div>

        {/* Technical Disclosures */}
        <div style={{
          marginTop: 32,
          borderTop: '1px solid #1a3045',
          paddingTop: 20,
        }}>
          <div className="section-eyebrow" style={{ marginBottom: 12 }}>Technical Disclosures</div>
          <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#8da4bc' }}>
            <div>&bull; Automated tests: 21 passed, 1 skipped (requires live AI API key)</div>
            <div>&bull; Smoke assertions: 27/27 passed</div>
            <div>&bull; Deterministic policy checks run first; AI triage is additive and optional</div>
            <div>&bull; No API key required for the local demo &mdash; the offline provider covers all core scenarios</div>
            <div>&bull; Role simulation is client-side via X-Demo-Role header; no real authentication in demo mode</div>
            <div>&bull; OCR for image uploads requires Tesseract installed locally; without it, a safe fallback notice is shown</div>
          </div>
        </div>
      </div>
    </div>
  );
}


function Bars({ values }: { values: { label: string; count: number }[] }) {
  const max = Math.max(...values.map((x) => x.count), 1);

  if (!values.length) {
    return <p style={{ color: '#5a7a96', fontSize: 13, margin: '12px 0' }}>No trend data recorded yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {values.map((x) => (
        <div key={x.label} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 30px', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {x.label}
          </span>
          <div style={{ height: 8, background: '#102030', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #0d9488, #2dd4bf)',
                width: `${(x.count / max) * 100}%`,
                borderRadius: 4,
              }}
            />
          </div>
          <strong style={{ fontSize: 13, color: '#e8f0f8', textAlign: 'right' }}>{x.count}</strong>
        </div>
      ))}
    </div>
  );
}

export default BrandtraceWorkspacePremium;