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
  getSimulatedUser,
} from '../services/api';
import { SystemStatus } from './system/SystemStatus';

type View =
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

const Status = ({ value }: { value: string }) => (
  <span className={`bt-status ${value.toLowerCase().replaceAll('_', '-')}`}>
    {value.replaceAll('_', ' ')}
  </span>
);

export function BrandtraceWorkspace() {
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
    const roleName = newRole === 'creator' ? 'Creator' : newRole === 'reviewer' ? 'Reviewer' : newRole === 'brand_admin' ? 'Brand Admin' : 'Auditor';
    setSuccess(`Demo role switched to ${roleName}. Backend authorization checks remain enforced.`);
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

  const handleFindingAction = async (f: EvidenceFinding, a: string, customReplacement?: string) => {
    if (!selected) return;
    setError('');
    try {
      let rep: string | undefined = customReplacement;
      let recReason: string | undefined = reason || undefined;
      let actionToSend = a;

      const isMissingTerm = f.type === 'required_phrase' || f.type === 'approved_term';

      if (a === 'accept' || a === 'insert') {
        if (!rep) {
          if (isMissingTerm) {
            const trimmed = selected.content.trim();
            const sep = trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?') ? ' ' : '. ';
            rep = `${trimmed}${sep}${f.passage}.`;
            recReason = recReason || `Inserted mandatory required term '${f.passage}'.`;
            actionToSend = 'accept';
          } else if (f.suggested_correction) {
            rep = selected.content.replace(f.passage, f.suggested_correction);
          }
        }
      } else if (a === 'edit') {
        if (!manualEdit.trim()) {
          setError('Please provide replacement or updated wording in the edit input.');
          return;
        }
        if (!reason.trim()) {
          setError('A documented reason is required when editing a finding.');
          return;
        }
        if (isMissingTerm) {
          if (manualEdit.includes(f.passage)) {
            rep = manualEdit.trim();
          } else {
            const trimmed = selected.content.trim();
            const sep = trimmed.endsWith('.') ? ' ' : '. ';
            rep = `${trimmed}${sep}${manualEdit.trim()}`;
          }
        } else {
          if (selected.content.includes(f.passage)) {
            rep = selected.content.replace(f.passage, manualEdit);
          } else {
            rep = manualEdit;
          }
        }
      } else if (a === 'dismiss') {
        if (!reason.trim()) {
          setError('A documented reason is required to dismiss a compliance finding.');
          return;
        }
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

  if (!ready) {
    return (
      <main className="bt-loading">
        <strong>BRANDTRACE</strong>
        <p>{error || 'Initializing evidence-linked brand governance workspace…'}</p>
      </main>
    );
  }

  return (
    <div className="bt-app">
      {/* Sidebar */}
      <aside className="bt-sidebar">
        <div className="bt-brand">
          ◈{' '}
          <span>
            BRANDTRACE
            <small>Evidence-Linked Governance</small>
          </span>
        </div>

        <div className="bt-demo">
          <SystemStatus variant="inline" className="text-xs" />
        </div>

        <nav>
          {views.map((v) => (
            <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {v}
            </button>
          ))}
        </nav>

        <div className="bt-side-note">
          <p>
            <b>Deterministic First:</b> Prohibited terms and missing disclaimers are flagged deterministically.
          </p>
          <p style={{ marginTop: '8px' }}>
            Unverified assertions return <b>NEEDS REVIEW</b> for human determination, citing only grounded sources.
          </p>
        </div>
      </aside>

      {/* Main Container */}
      <main className="bt-main">
        {/* Top Header & Role Simulator */}
        <header className="bt-top">
          <div>
            <p className="eyebrow">NORTHSTAR DEMO WORKSPACE / ROUND 2 EVALUATION</p>
            <h1>{view}</h1>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="bt-role-bar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Simulated Role:</span>
                <select value={role} onChange={(e) => handleRoleChange(e.target.value as UserRole)}>
                  <option value="reviewer">Reviewer (Approval & Actions)</option>
                  <option value="creator">Creator (Draft Submissions)</option>
                  <option value="brand_admin">Brand Admin (Full Control)</option>
                  <option value="auditor">Auditor (Read-Only)</option>
                </select>
              </div>
              <span style={{ fontSize: '11px', color: '#617168', maxWidth: '340px', lineHeight: 1.2 }}>
                Demo role simulation changes the request context for this demonstration. It does not create a real user account or grant independent production permissions.
              </span>
            </div>

            <button
              className="bt-primary"
              onClick={() => {
                setView('Content Review');
                setSelected(null);
              }}
            >
              + New Review
            </button>
          </div>
        </header>

        {/* Global Notifications */}
        {error && (
          <div className="bt-notice error">
            <span>{error}</span>
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        {success && (
          <div className="bt-notice success">
            <span>{success}</span>
            <button onClick={() => setSuccess('')}>Dismiss</button>
          </div>
        )}

        {/* VIEW A: OVERVIEW */}
        {view === 'Overview' && (
          <>
            <section className="bt-metrics">
              <Metric title="Total Reviews" value={reviews.length} hint="Stored draft records" />
              <Metric title="Open Findings" value={insights?.unresolved || 0} hint="Awaiting disposition" />
              <Metric
                title="Pending Approval"
                value={reviews.filter((r) => ['IN_REVIEW', 'CHANGES_REQUESTED'].includes(r.status)).length}
                hint="Human approval gate"
              />
              <Metric title="Approved Drafts" value={reviews.filter((r) => r.status === 'APPROVED').length} hint="Publication ready" />
            </section>

            <div className="bt-grid">
              <Card title="Recent Reviews">
                <ReviewTable
                  reviews={reviews.slice(0, 6)}
                  open={(r) => {
                    setSelected(r);
                    setView('Content Review');
                  }}
                />
              </Card>

              <div>
                <Card title="Active Brand Guidelines">
                  <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3850', paddingBottom: '8px' }}>
                      <span className="bt-muted">Primary Brand Palette:</span>
                      <span>
                        <span className="bt-swatch" style={{ background: brandProfile?.primary_color || '#0f766e' }} />
                        <code>{brandProfile?.primary_color || '#0f766e'}</code>
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3850', paddingBottom: '8px' }}>
                      <span className="bt-muted">Secondary Accent:</span>
                      <span>
                        <span className="bt-swatch" style={{ background: brandProfile?.secondary_color || '#2dd4bf' }} />
                        <code>{brandProfile?.secondary_color || '#2dd4bf'}</code>
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3850', paddingBottom: '8px' }}>
                      <span className="bt-muted">WCAG Contrast Threshold:</span>
                      <strong>{brandProfile?.min_contrast_ratio || 4.5}:1 (Normal text AA)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e3850', paddingBottom: '8px' }}>
                      <span className="bt-muted">Active Constitution Rules:</span>
                      <strong>{rules.length} verified rules</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="bt-muted">Approved Claim Ledger:</span>
                      <strong>{facts.length} verified assertions</strong>
                    </div>
                  </div>
                </Card>

                <div className="bt-callout" style={{ marginTop: '14px' }}>
                  <b>Evidence-Linked Governance Active:</b> Every finding is tied to an approved rule or fact ID.
                  Absence of evidence is marked <i>UNSUPPORTED</i> rather than assumed false. Unresolved high/critical findings
                  strictly block approval server-side.
                </div>
              </div>
            </div>
          </>
        )}

        {/* VIEW B: BRAND CONSTITUTION */}
        {view === 'Brand Constitution' && (
          <>
            <div className="bt-tab-row">
              <button
                className={`bt-tab-btn ${constTab === 'rules' ? 'active' : ''}`}
                onClick={() => setConstTab('rules')}
              >
                Approved Brand Rules ({rules.length})
              </button>
              <button
                className={`bt-tab-btn ${constTab === 'facts' ? 'active' : ''}`}
                onClick={() => setConstTab('facts')}
              >
                Claim Ledger & Verified Facts ({facts.length})
              </button>
              <button
                className={`bt-tab-btn ${constTab === 'profile' ? 'active' : ''}`}
                onClick={() => setConstTab('profile')}
              >
                Visual Brand Profile
              </button>
            </div>

            {constTab === 'rules' && (
              <Card
                title="Approved Brand Rules"
                action={
                  <button className="bt-outline" onClick={() => setIsRuleModalOpen(true)}>
                    + Add Brand Rule
                  </button>
                }
              >
                <div className="bt-rule-list">
                  {rules.map((r) => (
                    <article key={r.id}>
                      <Status value={r.status} />
                      <div>
                        <b>{r.title}</b>
                        <p>
                          <code>{r.kind}</code> · “{r.pattern}” · v{r.version} · Category: <i>{r.category}</i>
                        </p>
                        <p style={{ fontSize: '12px', color: '#cbd5e1' }}>{r.requirement}</p>
                        <small>
                          Source: <b>{r.source_title}</b>: “{r.source_excerpt}” (Owner: {r.owner})
                          {r.expires_at && ` · Expires: ${new Date(r.expires_at).toLocaleDateString()}`}
                        </small>
                      </div>
                      <Status value={r.severity} />
                    </article>
                  ))}
                </div>
              </Card>
            )}

            {constTab === 'facts' && (
              <Card
                title="Approved Fact & Claim Ledger"
                action={
                  <button className="bt-outline" onClick={() => setIsFactModalOpen(true)}>
                    + Add Approved Fact
                  </button>
                }
              >
                <div style={{ display: 'grid', gap: '14px' }}>
                  {facts.map((f) => (
                    <article className="bt-fact" key={f.id}>
                      <div>
                        <b>{f.claim}</b>
                        <p>
                          Approved Assertion: <span style={{ color: '#5eead4' }}>“{f.value}”</span>
                        </p>
                        <small>
                          Source: <b>{f.source_title}</b>: “{f.source_excerpt}”
                          <br />
                          Owner: {f.owner} · Version: v{f.version} · Expires:{' '}
                          {f.expires_at ? new Date(f.expires_at).toLocaleDateString() : 'Active indefinitely'}
                        </small>
                      </div>
                      <Status value={f.status} />
                    </article>
                  ))}
                </div>
              </Card>
            )}

            {constTab === 'profile' && (
              <Card title="Visual Brand Standards & Palette">
                <div style={{ maxWidth: '600px', display: 'grid', gap: '16px' }}>
                  <div>
                    <label className="bt-muted">Primary Brand Colour:</label>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                      <span className="bt-swatch" style={{ background: brandProfile?.primary_color || '#0f766e' }} />
                      <code>{brandProfile?.primary_color || '#0f766e'}</code>
                    </div>
                  </div>
                  <div>
                    <label className="bt-muted">Secondary Accent Colour:</label>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                      <span className="bt-swatch" style={{ background: brandProfile?.secondary_color || '#2dd4bf' }} />
                      <code>{brandProfile?.secondary_color || '#2dd4bf'}</code>
                    </div>
                  </div>
                  <div>
                    <label className="bt-muted">WCAG 2.1 Contrast Ratio Standard:</label>
                    <p style={{ marginTop: '4px', fontWeight: 'bold' }}>
                      {brandProfile?.min_contrast_ratio || 4.5}:1 (Normal text Level AA compliance)
                    </p>
                  </div>
                  <div>
                    <label className="bt-muted">Approved Logo Aspect Ratio Fixture:</label>
                    <p style={{ marginTop: '4px', fontWeight: 'bold' }}>
                      {brandProfile?.approved_logo_aspect || 3.0}:1 standard landscape logo
                    </p>
                  </div>
                  <div className="bt-callout">
                    Visual rules are evaluated deterministically on uploaded images using Pillow quantization,
                    CIELAB Delta-E colour distance, and W3C WCAG 2.1 relative luminance formulas.
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* VIEW C & D: CONTENT SUBMISSION & FINDINGS */}
        {view === 'Content Review' && (
          <section className="bt-grid review-layout">
            <div className="bt-card bt-editor">
              <div className="bt-tab-row">
                <button
                  type="button"
                  className={`bt-tab-btn ${submissionTab === 'text' ? 'active' : ''}`}
                  onClick={() => setSubmissionTab('text')}
                >
                  Direct Text / Markdown
                </button>
                <button
                  type="button"
                  className={`bt-tab-btn ${submissionTab === 'file' ? 'active' : ''}`}
                  onClick={() => setSubmissionTab('file')}
                >
                  Upload File (PDF / Image)
                </button>
              </div>

              {submissionTab === 'text' ? (
                <form onSubmit={submitTextReview}>
                  <label>
                    Draft Title
                    <input value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </label>
                  <label>
                    Content Type
                    <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                      <option value="marketing_copy">Marketing Copy</option>
                      <option value="email">Email Campaign</option>
                      <option value="social">Social Media Post</option>
                      <option value="web">Web Copy</option>
                      <option value="document">Document</option>
                    </select>
                  </label>
                  <label>
                    Draft Text (Plain text & Markdown supported)
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={50000}
                      required
                    />
                  </label>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="bt-outline"
                      onClick={() => setContent(sampleAnnouncement)}
                    >
                      Prefill Test Sample
                    </button>
                    <button className="bt-primary" disabled={busy}>
                      {busy ? 'Evaluating Evidence…' : 'Start Evidence Review'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={submitFileReview}>
                  <label>
                    Document Title
                    <input value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </label>
                  <label>
                    Content Type
                    <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                      <option value="document">PDF Document</option>
                      <option value="image">Graphic / Image Asset</option>
                    </select>
                  </label>

                  <div
                    className="bt-file-drop"
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
                    {uploadFile ? (
                      <div>
                        <strong>{uploadFile.name}</strong>
                        <p className="bt-muted" style={{ margin: '6px 0 0' }}>
                          {(uploadFile.size / 1024).toFixed(1)} KB · Click to change file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>Click to select a file</p>
                        <p className="bt-muted" style={{ margin: '6px 0 0', fontSize: '12px' }}>
                          Supported: Digital PDF text extraction, PNG/JPEG palette analysis (CIELAB Delta-E), and SHA-256 asset verification. Raster OCR and semantic logo recognition are unsupported.
                        </p>
                      </div>
                    )}
                  </div>

                  <button className="bt-primary" style={{ width: '100%' }} disabled={busy || !uploadFile}>
                    {busy ? 'Extracting & Evaluating…' : 'Upload & Analyze File'}
                  </button>
                </form>
              )}
            </div>

            {/* Findings & Correction Panel */}
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
          </section>
        )}

        {/* VIEW F: APPROVAL QUEUE */}
        {view === 'Approval Queue' && (
          <Card title="Human Governance Approval Queue">
            <p className="bt-muted" style={{ marginBottom: '14px' }}>
              Drafts requiring review disposition or publication sign-off. High-risk findings must be resolved before
              approval can be granted.
            </p>
            <ReviewTable
              reviews={reviews.filter((r) => ['IN_REVIEW', 'CHANGES_REQUESTED'].includes(r.status))}
              open={(r) => {
                setSelected(r);
                setView('Content Review');
              }}
            />
          </Card>
        )}

        {/* VIEW G: AUDIT HISTORY */}
        {view === 'Audit History' && (
          <AuditView
            reviews={reviews}
            selected={selected}
            setSelected={setSelected}
          />
        )}

        {/* VIEW H: GOVERNANCE INSIGHTS */}
        {view === 'Governance Insights' && (
          <InsightsView
            insights={insights}
            impactMap={impactMap}
            onTriggerReReview={handleTriggerImpactReReview}
          />
        )}

        {/* VIEW I: HELP & DEMO */}
        {view === 'Help & Demo' && (
          <HelpWalkthroughView
            onLoadDemo={() => {
              setTitle('Launch announcement — Q4');
              setContent(sampleAnnouncement);
              setView('Content Review');
            }}
          />
        )}

        {/* RULE MODAL */}
        {isRuleModalOpen && (
          <div className="bt-modal-backdrop" onClick={() => setIsRuleModalOpen(false)}>
            <div className="bt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bt-modal-head">
                <h2>Add Approved Brand Rule</h2>
                <button className="bt-outline" onClick={() => setIsRuleModalOpen(false)}>
                  ✕
                </button>
              </div>
              <form className="bt-rule-form" onSubmit={handleCreateRule}>
                <label>
                  Rule Title
                  <input
                    value={newRule.title}
                    onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                    required
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label>
                    Rule Kind
                    <select
                      value={newRule.kind}
                      onChange={(e) => setNewRule({ ...newRule, kind: e.target.value as any })}
                    >
                      <option value="prohibited_phrase">Prohibited Phrase</option>
                      <option value="required_phrase">Required Phrase</option>
                      <option value="forbidden_term">Forbidden Term</option>
                      <option value="approved_term">Approved Term</option>
                      <option value="tone_rule">Tone Rule</option>
                    </select>
                  </label>
                  <label>
                    Severity
                    <select
                      value={newRule.severity}
                      onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as any })}
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </label>
                </div>
                <label>
                  Match Pattern
                  <input
                    value={newRule.pattern}
                    onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                    placeholder="e.g. cheap, best, or disclaimer phrase"
                    required
                  />
                </label>
                <label>
                  Requirement Description
                  <input
                    value={newRule.requirement}
                    onChange={(e) => setNewRule({ ...newRule, requirement: e.target.value })}
                    placeholder="Describe approved guidelines and replacement instructions"
                    required
                  />
                </label>
                <label>
                  Approved Source Title
                  <input
                    value={newRule.source_title}
                    onChange={(e) => setNewRule({ ...newRule, source_title: e.target.value })}
                    placeholder="e.g. Brand Voice Standard 2026"
                    required
                  />
                </label>
                <label>
                  Source Excerpt / Citation
                  <input
                    value={newRule.source_excerpt}
                    onChange={(e) => setNewRule({ ...newRule, source_excerpt: e.target.value })}
                    placeholder="Exact quotation from approved policy"
                    required
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                  <button type="button" className="bt-outline" onClick={() => setIsRuleModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="bt-primary">
                    Save Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FACT MODAL */}
        {isFactModalOpen && (
          <div className="bt-modal-backdrop" onClick={() => setIsFactModalOpen(false)}>
            <div className="bt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bt-modal-head">
                <h2>Record Approved Fact / Claim</h2>
                <button className="bt-outline" onClick={() => setIsFactModalOpen(false)}>
                  ✕
                </button>
              </div>
              <form className="bt-rule-form" onSubmit={handleCreateFact}>
                <label>
                  Claim Topic / Assertion Title
                  <input
                    value={newFact.claim}
                    onChange={(e) => setNewFact({ ...newFact, claim: e.target.value })}
                    placeholder="e.g. Encryption Standard"
                    required
                  />
                </label>
                <label>
                  Approved Fact Value
                  <input
                    value={newFact.value}
                    onChange={(e) => setNewFact({ ...newFact, value: e.target.value })}
                    placeholder="Exact factual assertion (e.g. AES-256)"
                    required
                  />
                </label>
                <label>
                  Owner Department
                  <input
                    value={newFact.owner}
                    onChange={(e) => setNewFact({ ...newFact, owner: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Source Document Title
                  <input
                    value={newFact.source_title}
                    onChange={(e) => setNewFact({ ...newFact, source_title: e.target.value })}
                    placeholder="e.g. Product Security Whitepaper"
                    required
                  />
                </label>
                <label>
                  Source Excerpt
                  <input
                    value={newFact.source_excerpt}
                    onChange={(e) => setNewFact({ ...newFact, source_excerpt: e.target.value })}
                    placeholder="Quoted assertion from approved source"
                    required
                  />
                </label>
                <label>
                  Expiration Date (Optional)
                  <input
                    type="date"
                    value={newFact.expires_at}
                    onChange={(e) =>
                      setNewFact({
                        ...newFact,
                        expires_at: e.target.value ? new Date(e.target.value).toISOString() : '',
                      })
                    }
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                  <button type="button" className="bt-outline" onClick={() => setIsFactModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="bt-primary">
                    Record Fact
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------

function Metric({ title, value, hint }: { title: string; value: string | number; hint: string }) {
  return (
    <div className="bt-metric">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bt-card">
      <div className="bt-card-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ReviewTable({ reviews, open }: { reviews: Review[]; open: (r: Review) => void }) {
  return (
    <div className="bt-table">
      {reviews.length ? (
        reviews.map((r) => (
          <button key={r.id} onClick={() => open(r)}>
            <span>
              <b>{r.title}</b>
              <small>
                {new Date(r.created_at).toLocaleString()} · {r.content_type}
              </small>
            </span>
            <span>{r.findings?.length || 0} findings</span>
            <Status value={r.status} />
            <strong className="bt-score">{r.score}</strong>
          </button>
        ))
      ) : (
        <p className="bt-muted">No review records found.</p>
      )}
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
  onFindingAction: (f: EvidenceFinding, action: string) => void;
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

  if (!review) {
    return (
      <section className="bt-card bt-empty">
        <h2>Evidence Findings & Governance Panel</h2>
        <p>Select an existing review or submit a draft to inspect evidence-linked brand compliance findings.</p>
      </section>
    );
  }

  const unresolvedHigh = review.findings.filter(
    (f) => !f.disposition && ['HIGH', 'CRITICAL'].includes(f.severity)
  );

  return (
    <section className="bt-card bt-findings">
      <div className="bt-card-head">
        <div>
          <p className="eyebrow">
            REVIEW ID: {review.id} · STATUS: <Status value={review.status} />
          </p>
          <h2>{review.title}</h2>
          <small className="bt-muted">
            Submitted by {review.author} · Method: {review.analysis_method}
          </small>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong className="bt-score">{review.score}</strong>
          <small style={{ display: 'block', color: '#94a3b8' }}>Health Score</small>
        </div>
      </div>

      <div className="bt-tab-row">
        <button
          className={`bt-tab-btn ${activeTab === 'findings' ? 'active' : ''}`}
          onClick={() => setActiveTab('findings')}
        >
          Compliance Findings ({review.findings.length})
        </button>
        <button
          className={`bt-tab-btn ${activeTab === 'versions' ? 'active' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          Draft Revisions ({review.versions?.length || 1})
        </button>
      </div>

      {activeTab === 'findings' ? (
        <>
          <div className="bt-original">
            <b>Current Working Draft Content:</b>
            <p>{review.content}</p>
          </div>

          <label>
            Recorded Disposition Reason (Required for Dismissal, Manual Edit & Waiver)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Legal exception granted, Contextual partner agreement"
            />
          </label>

          {review.findings.length === 0 ? (
            <div className="bt-notice success">
              ✓ No compliance violations detected. Human review sign-off is still required.
            </div>
          ) : (
            review.findings.map((f) => {
              const isMissingTerm = f.type === 'required_phrase' || f.type === 'approved_term';
              return (
              <article className="bt-finding" key={f.id}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Status value={f.severity} />
                  <Status value={f.status} />
                  {isMissingTerm && (
                    <span style={{ background: '#0e3a5f', color: '#7dd3fc', border: '1px solid #0284c7', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold' }}>
                      MISSING TERM
                    </span>
                  )}
                  {f.disposition && <Status value={f.disposition} />}
                  <span style={{ fontSize: '11px', color: '#7dd3fc', marginLeft: 'auto' }}>
                    {f.analysis_method}
                  </span>
                </div>

                {isMissingTerm ? (
                  <p style={{ background: '#071626', border: '1px dashed #38bdf8', padding: '8px 12px', borderRadius: '4px', color: '#93c5fd', margin: '8px 0' }}>
                    <strong>Missing Brand Term:</strong> Required approved term “{f.passage}” is absent from draft copy.
                  </p>
                ) : (
                  <blockquote>“{f.passage}”</blockquote>
                )}
                <p>{f.explanation}</p>

                {f.source_id ? (
                  <div className="bt-evidence">
                    <b>
                      Source: {f.source_title} · ID: {f.source_id} · v{f.source_version || '1.0'}
                    </b>
                    <span>“{f.source_excerpt}”</span>
                  </div>
                ) : (
                  <div className="bt-evidence uncertain">
                    <b>HUMAN VERIFICATION REQUIRED (NO APPROVED CITATION ASSERTED)</b>
                    <span>{f.uncertainty || 'Offline AI triage detected an unverified assertion.'}</span>
                  </div>
                )}

                {isMissingTerm ? (
                  <p className="bt-correction" style={{ color: '#38bdf8' }}>
                    <b>Action Required:</b> Append required term “{f.passage}” or edit copy to include it.
                  </p>
                ) : f.suggested_correction ? (
                  <p className="bt-correction">
                    <b>Suggested Correction:</b> “{f.suggested_correction}”
                  </p>
                ) : null}

                {/* Edit input when manual edit is toggled */}
                {editingFindingId === f.id && (
                  <div style={{ marginTop: '10px', background: '#071624', padding: '10px', borderRadius: '6px' }}>
                    <label style={{ margin: 0 }}>
                      {isMissingTerm ? `Update Draft to Include Term “${f.passage}”:` : `Replacement Text for “${f.passage}”:`}
                      {isMissingTerm ? (
                        <textarea
                          value={manualEdit}
                          onChange={(e) => setManualEdit(e.target.value)}
                          placeholder="Edit complete draft to include required terminology"
                          style={{ minHeight: '100px' }}
                        />
                      ) : (
                        <input
                          value={manualEdit}
                          onChange={(e) => setManualEdit(e.target.value)}
                          placeholder="Enter modified wording"
                        />
                      )}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button className="bt-primary" onClick={() => onFindingAction(f, 'edit')}>
                        Apply Edit
                      </button>
                      <button className="bt-outline" onClick={() => setEditingFindingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!f.disposition && editingFindingId !== f.id && (
                  <div className="bt-actions">
                    {isMissingTerm ? (
                      <>
                        <button className="bt-primary" onClick={() => onFindingAction(f, 'insert')}>
                          Insert Term
                        </button>
                        <button
                          onClick={() => {
                            setEditingFindingId(f.id);
                            setManualEdit(review.content);
                          }}
                        >
                          Edit Draft
                        </button>
                      </>
                    ) : (
                      <>
                        {f.suggested_correction && (
                          <button onClick={() => onFindingAction(f, 'accept')}>Accept Replacement</button>
                        )}
                        <button
                          onClick={() => {
                            setEditingFindingId(f.id);
                            setManualEdit(f.suggested_correction || f.passage);
                          }}
                        >
                          Edit Manually
                        </button>
                      </>
                    )}
                    <button onClick={() => onFindingAction(f, 'dismiss')}>Dismiss with Reason</button>
                    <button onClick={() => onFindingAction(f, 'escalate')}>Escalate</button>
                  </div>
                )}
              </article>
            );
            })
          )}

          {/* Approval Controls */}
          <footer className="bt-approval">
            <button
              className="bt-primary"
              onClick={() => onApproval('approve')}
              title={
                unresolvedHigh.length > 0
                  ? `${unresolvedHigh.length} high-risk findings must be resolved before approval`
                  : 'Approve draft for publication hand-off'
              }
            >
              Approve Review {unresolvedHigh.length > 0 && `(${unresolvedHigh.length} High Risk Blocked)`}
            </button>
            <button className="bt-outline" onClick={() => onApproval('request_changes')}>
              Request Changes
            </button>
            <button className="bt-link danger" onClick={() => onApproval('waive')}>
              Waive with Reason
            </button>
          </footer>
        </>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {review.versions?.map((v) => (
            <div
              key={v.id}
              style={{
                border: '1px solid #1f3f58',
                padding: '14px',
                borderRadius: '8px',
                background: '#0a1d2e',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>Revision: {v.reason}</b>
                <button className="bt-outline" style={{ fontSize: '11px' }} onClick={() => onRestoreVersion(v.id)}>
                  Restore This Revision
                </button>
              </div>
              <small className="bt-muted">
                Created by {v.created_by} at {new Date(v.created_at).toLocaleString()}
              </small>
              <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{v.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
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

  useEffect(() => {
    if (selected) {
      api.audit(selected.id).then(setEvents).catch(() => setEvents([]));
    }
  }, [selected]);

  return (
    <section className="bt-grid audit-grid">
      <Card title="Stored Reviews">
        <ReviewTable reviews={reviews} open={setSelected} />
      </Card>
      <Card title="Reconstructable Decision History">
        {!selected ? (
          <p className="bt-muted">Select a review record from the left to inspect its immutable audit timeline.</p>
        ) : (
          <div className="bt-timeline">
            <p className="eyebrow" style={{ marginBottom: '10px' }}>
              TIMELINE FOR {selected.id}
            </p>
            {events.map((e) => (
              <article key={e.id}>
                <b>{e.action.replaceAll('_', ' ')}</b>
                <span>
                  Actor: {e.actor} ({e.actor_role}) · {new Date(e.created_at).toLocaleString()}
                </span>
                {e.reason && <p>Documented Reason: “{e.reason}”</p>}
                {e.details && <small className="bt-muted">Details: {e.details}</small>}
              </article>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

function InsightsView({
  insights,
  impactMap,
  onTriggerReReview,
}: {
  insights: Insights | null;
  impactMap: ImpactMap | null;
  onTriggerReReview: (id: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <section className="bt-metrics">
        <Metric title="Open Findings" value={insights?.unresolved || 0} hint="Need reviewer action" />
        <Metric title="Dismissals" value={insights?.dismissed || 0} hint="Documented exceptions" />
        <Metric title="Disagreements" value={insights?.disagreements_count || 0} hint="Reviewer overrides" />
        <Metric title="Impacted Drafts" value={impactMap?.total_impacted_drafts || 0} hint="Rule/fact changes" />
      </section>

      <section className="bt-grid audit-grid">
        <Card title="Recurring Policy Findings">
          <p className="bt-muted" style={{ marginBottom: '12px' }}>
            Most frequently violated rule categories across all historical drafts.
          </p>
          <Bars values={insights?.recurring || []} />
        </Card>

        <Card title="Candidate Rules for Clarification">
          <p className="bt-muted" style={{ marginBottom: '12px' }}>
            Rules with high triage or dismissal rates suggesting ambiguous guidelines.
          </p>
          <Bars values={insights?.unclear_rules || []} />
        </Card>
      </section>

      {/* Time-Aware Claim Ledger & Impact Map (Round 3 Foundation) */}
      <Card title="Time-Aware Claim Ledger & Rule-Change Impact Map">
        <p className="bt-muted" style={{ marginBottom: '14px' }}>
          Targeted re-review engine: when an approved fact or rule expires or changes, BRANDTRACE pinpoints exactly
          which drafts depend on it.
        </p>

        {impactMap && impactMap.items.length > 0 ? (
          impactMap.items.map((item) => (
            <div className="bt-impact-item" key={item.item_id}>
              <div>
                <span className={`bt-badge ${item.re_review_urgency.toLowerCase()}`}>
                  {item.re_review_urgency} · {item.item_type} {item.status}
                </span>
                <p style={{ margin: '6px 0 2px', fontWeight: 'bold' }}>
                  {item.item_title} (ID: {item.item_id})
                </p>
                <small className="bt-muted">
                  Affects {item.affected_review_ids.length} draft(s): {item.affected_review_titles.join(', ')}
                </small>
              </div>
              <button
                className="bt-outline"
                style={{ fontSize: '11px' }}
                onClick={() => onTriggerReReview(item.item_id)}
              >
                Trigger Targeted Re-Review
              </button>
            </div>
          ))
        ) : (
          <p className="bt-muted">No expired sources currently impacting active drafts.</p>
        )}
      </Card>
    </div>
  );
}

function HelpWalkthroughView({ onLoadDemo }: { onLoadDemo: () => void }) {
  return (
    <Card title="Judge Evaluation Walkthrough — Local Verification Guide">
      <div style={{ maxWidth: '800px', lineHeight: '1.6' }}>
        <p>
          Welcome to the BRANDTRACE governance workspace. Follow this concise step-by-step evaluation script to test
          all core capabilities without requiring an external AI API key:
        </p>

        <div className="bt-walkthrough-step">
          <div className="bt-step-num">1</div>
          <div>
            <b>Brand Constitution & Claim Ledger</b>
            <p className="bt-muted" style={{ margin: '4px 0 0' }}>
              Navigate to <b>Brand Constitution</b> to inspect active rules (prohibited phrases, required platform
              capitalization, forbidden terms) and the approved fact ledger with expiration dates.
            </p>
          </div>
        </div>

        <div className="bt-walkthrough-step">
          <div className="bt-step-num">2</div>
          <div>
            <b>Submit Test Draft with Intentional Violations</b>
            <p className="bt-muted" style={{ margin: '4px 0 0' }}>
              Click the button below to load an announcement draft containing superlatives (“best”), forbidden terms
              (“cheap”), and absolute promotional assertions (“always”).
            </p>
            <button className="bt-primary" style={{ marginTop: '10px' }} onClick={onLoadDemo}>
              Load Announcement Sample in Reviewer
            </button>
          </div>
        </div>

        <div className="bt-walkthrough-step">
          <div className="bt-step-num">3</div>
          <div>
            <b>Inspect Evidence-Linked Findings</b>
            <p className="bt-muted" style={{ margin: '4px 0 0' }}>
              Notice how exact rules produce <code>CONTRADICTED</code> with verified source IDs and excerpts, while
              unsubstantiated claims produce <code>NEEDS REVIEW</code> without hallucinated citations.
            </p>
          </div>
        </div>

        <div className="bt-walkthrough-step">
          <div className="bt-step-num">4</div>
          <div>
            <b>Test Server-Side Approval Gate</b>
            <p className="bt-muted" style={{ margin: '4px 0 0' }}>
              Try clicking <b>Approve Review</b> before resolving the high-risk findings. The backend returns a strict{' '}
              <code>409 Conflict</code> preventing premature sign-off.
            </p>
          </div>
        </div>

        <div className="bt-walkthrough-step">
          <div className="bt-step-num">5</div>
          <div>
            <b>Apply Corrections & Document Justifications</b>
            <p className="bt-muted" style={{ margin: '4px 0 0' }}>
              Use <b>Accept Edit</b> to replace “best” or “cheap” with approved wording, and <b>Dismiss with Reason</b>{' '}
              to record an exception. Once resolved, <b>Approve Review</b> succeeds.
            </p>
          </div>
        </div>

        <div className="bt-walkthrough-step">
          <div className="bt-step-num">6</div>
          <div>
            <b>Audit History & Governance Intelligence</b>
            <p className="bt-muted" style={{ margin: '4px 0 0' }}>
              Inspect <b>Audit History</b> to verify reconstructable event logs with actor, timestamp, and justification,
              and check <b>Governance Insights</b> for recurring violations and the Rule-Change Impact Map.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Bars({ values }: { values: { label: string; count: number }[] }) {
  const max = Math.max(...values.map((x) => x.count), 1);
  return (
    <div className="bt-bars">
      {values.length ? (
        values.map((x) => (
          <div key={x.label}>
            <span>{x.label}</span>
            <i>
              <b style={{ width: `${(x.count / max) * 100}%` }} />
            </i>
            <strong>{x.count}</strong>
          </div>
        ))
      ) : (
        <p className="bt-muted">No trend data recorded yet.</p>
      )}
    </div>
  );
}
