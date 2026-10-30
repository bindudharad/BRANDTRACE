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
  BrandAsset,
  GuidelineHealthItem,
  RuleSuggestion,
  AuditEntry,
  FactVersion,
} from '../services/api';
import { SystemStatus } from './system/SystemStatus';
import {
  getCachedSystemStatus,
  subscribeSystemStatus,
  getDisplayEnvironmentBadge,
  SystemStatusData,
} from '../services/environment';
import { JudgeTourModal } from './judge/JudgeTourModal';
import { JudgeAccessModal } from './judge/JudgeAccessModal';
import { Edit2 } from 'lucide-react';
import {
  WorkflowStepper,
  ReviewOutcomeDonut,
  SeverityBarChart,
  EvidenceStatusBarChart,
  ActivityTimeline,
  InteractiveImpactGraph,
  EvidenceDecisionChain,
  GuidelineHealthMeters,
  HonestLimitationsBanner,
} from './analytics';
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
  Lock,
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
  Palette,
  Cpu,
  Copy,
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

export function formatMethodLabel(method?: string): string {
  if (!method) return 'Verified rule match';
  const m = method.toUpperCase();
  if (m.includes('GROQ_VISION') || m.includes('OCR')) return 'AI-assisted extraction';
  if (m.includes('GROQ_AI') || m.includes('AI_ANALYSIS')) return 'AI-assisted insights';
  if (m.includes('OFFLINE')) return 'Automated preliminary check';
  if (m.includes('DETERMINISTIC') || m.includes('EXACT')) return 'Verified rule match';
  if (m.includes('PYPDF') || m.includes('DIGITAL')) return 'Digital text extraction';
  return method.replace(/_/g, ' ');
}

interface BrandtraceWorkspacePremiumProps {
  onBackToHero?: () => void;
  initialTourOpen?: boolean;
  onTourClosed?: () => void;
}

export function BrandtraceWorkspacePremium({ onBackToHero, initialTourOpen, onTourClosed }: BrandtraceWorkspacePremiumProps) {
  const [view, setView] = useState<View>('Overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<UserRole>('reviewer');
  const [isJudgeAccessOpen, setIsJudgeAccessOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData>(getCachedSystemStatus);

  useEffect(() => {
    return subscribeSystemStatus(setSystemStatus);
  }, []);

  const [rules, setRules] = useState<Rule[]>([]);
  const [ruleHistory, setRuleHistory] = useState<Record<string, Rule[]>>({});
  const [factHistory, setFactHistory] = useState<Record<string, FactVersion[]>>({});
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editRuleForm, setEditRuleForm] = useState<Partial<Rule> & { reason: string }>({ reason: '' });
  const [editRuleError, setEditRuleError] = useState('');
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [editFactForm, setEditFactForm] = useState<Partial<Fact> & { reason: string }>({ reason: '' });
  const [editFactError, setEditFactError] = useState('');
  const [facts, setFacts] = useState<Fact[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [impactMap, setImpactMap] = useState<ImpactMap | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [selected, setSelected] = useState<Review | null>(null);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [guidelineHealth, setGuidelineHealth] = useState<GuidelineHealthItem[]>([]);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Record<string, RuleSuggestion>>({});
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [isTourModalOpen, setIsTourModalOpen] = useState(initialTourOpen || false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<BrandAsset>>({
    name: '',
    asset_type: 'image',
    content_hash: '',
    source: '',
    license_status: 'APPROVED',
    approval_status: 'APPROVED',
    license_notes: '',
  });

  // Review submission state
  const [title, setTitle] = useState('Launch announcement — Q4');
  const [content, setContent] = useState(sampleAnnouncement);
  const [contentType, setContentType] = useState('marketing_copy');
  const [reason, setReason] = useState('');
  const [manualEdit, setManualEdit] = useState('');
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Constitution tabs & modals
  const [constTab, setConstTab] = useState<'rules' | 'facts' | 'assets' | 'profile'>('rules');
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
    notes: '',
  });
  const [profileDraft, setProfileDraft] = useState<Partial<BrandProfile>>({});

  // File upload and document intelligence state
  const [submissionTab, setSubmissionTab] = useState<'text' | 'file'>('file');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('general_document');
  const [consentOcr, setConsentOcr] = useState<boolean>(false);
  const [consentAi, setConsentAi] = useState<boolean>(false);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
    brand_admin: 'Brand Admin',
    reviewer: 'Reviewer (Primary)',
    creator: 'Creator',
    auditor: 'Auditor',
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setSimulatedUser(newRole);
    const roleName = ROLE_DISPLAY_NAMES[newRole] || newRole;
    setSuccess(`Demo role switched to ${roleName}. Backend authorization checks remain enforced.`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const refresh = async () => {
    try {
      const [, r, f, v, i, bp, im, assets, gHealth, suggestions] = await Promise.all([
        api.overview(),
        api.rules(),
        api.facts(),
        api.reviews(),
        api.insights(),
        api.brandProfile().catch(() => null),
        api.impactMap().catch(() => null),
        api.brandAssets().catch(() => []),
        api.guidelineHealth().catch(() => []),
        api.ruleSuggestions().catch(() => []),
      ]);
      setRules(r);
      setFacts(f);
      setReviews(v);
      setInsights(i);
      if (v && v.length > 0) {
        api.audit(v[0].id).then(setAuditEntries).catch(() => {});
      }
      if (bp) {
        setBrandProfile(bp);
        setProfileDraft(bp);
      }
      if (im) setImpactMap(im);
      if (assets) setBrandAssets(assets);
      if (gHealth) setGuidelineHealth(gHealth);
      if (suggestions && Array.isArray(suggestions)) {
        const acceptedMap: Record<string, RuleSuggestion> = {};
        for (const s of suggestions) {
          if (s.status === 'ACCEPTED') {
            acceptedMap[s.rule_id] = s;
          }
        }
        setAcceptedSuggestions(acceptedMap);
      }
      if (selected) {
        try {
          const full = await api.getReview(selected.id);
          setSelected(full);
          const auditLog = await api.audit(selected.id).catch(() => []);
          setAuditEntries(auditLog);
        } catch {
          setSelected(v.find((x) => x.id === selected.id) || null);
        }
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
      const r = await api.createReview({
        title,
        content,
        content_type: contentType,
        document_type: documentType,
        consent_ai: consentAi,
      });
      setSelected(r);
      await refresh();
      setView('Content Review');
      const aiNote = r.ai_analysis_applied ? ' with optional AI insights' : '';
      setSuccess(`Draft analyzed${aiNote} and persisted with evidence findings.`);
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
    setUploadStage('Uploading document…');
    try {
      const fd = new FormData();
      fd.append('title', title || uploadFile.name.replace(/\.[^/.]+$/, ''));
      fd.append('content_type', contentType);
      fd.append('document_type', documentType);
      fd.append('consent_ocr', consentOcr ? 'true' : 'false');
      fd.append('consent_ai', consentAi ? 'true' : 'false');
      fd.append('file', uploadFile);

      setUploadStage('Checking document compliance…');
      const r = await api.uploadReview(fd);
      setSelected(r);
      await refresh();
      setView('Content Review');
      const ocrNote = r.ocr_applied ? ' (AI-assisted text extraction)' : '';
      const aiNote = r.ai_analysis_applied ? ' with optional AI insights' : '';
      setSuccess(`File "${uploadFile.name}" successfully processed${ocrNote}${aiNote} and evaluated against brand standards.`);
      setTimeout(() => setSuccess(''), 5000);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setUploadStage('');
    }
  };

  const handleFindingAction = async (
    f: EvidenceFinding,
    a: string,
    customReplacement?: string,
    customReason?: string,
  ): Promise<boolean> => {
    if (!selected) return false;
    setError('');

    if (role === 'auditor') {
      setError('Auditor role has read-only access. Switch role to Reviewer or Brand Admin to perform finding actions.');
      return false;
    }

    if (a === 'dismiss' && role === 'creator') {
      setError('Reviewer or Brand Admin role is required to dismiss a compliance finding.');
      return false;
    }

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
            if (!selected.content.includes(f.passage)) {
              setError(`Cannot accept replacement: original passage "${f.passage}" was not found in the current working copy. Please use Edit Manually.`);
              return false;
            }
            const occurrences = selected.content.split(f.passage).length - 1;
            if (occurrences > 1) {
              setError(`Multiple occurrences of "${f.passage}" detected in draft. Please use Edit Manually to resolve the specific instance.`);
              return false;
            }
            rep = selected.content.replace(f.passage, f.suggested_correction);
            recReason = recReason || `Accepted suggested replacement "${f.suggested_correction}" for "${f.passage}".`;
            actionToSend = 'accept';
          } else {
            setError('No suggested replacement available for this finding. Please use Edit Manually to update the draft.');
            return false;
          }
        } else {
          actionToSend = 'accept';
          recReason = recReason || (isMissingTerm ? `Placed mandatory required term '${f.passage}'.` : `Applied replacement for '${f.passage}'.`);
        }
      } else if (a === 'edit') {
        actionToSend = 'edit';
        recReason = recReason || `Manual edit to resolve finding on '${f.passage}'.`;
        if (!recReason) {
          setError('A documented reason is required when editing a finding.');
          return false;
        }
        if (!rep) {
          if (!manualEdit.trim()) {
            setError('Please provide modified draft content in the edit input.');
            return false;
          }
          rep = manualEdit.trim();
        }
      } else if (a === 'dismiss') {
        actionToSend = 'dismiss';
        if (!recReason) {
          setError('A documented reason is required to dismiss a compliance finding.');
          return false;
        }
      } else if (a === 'escalate') {
        actionToSend = 'escalate';
        recReason = recReason || 'Escalated to brand leadership for compliance review.';
      }

      // Cross-contamination safeguard: draft content cannot equal disposition reason
      if (rep && recReason && rep.trim().toLowerCase() === recReason.trim().toLowerCase()) {
        setError('Data integrity check failed: draft content cannot be identical to the documented disposition reason.');
        return false;
      }
      if (rep && rep.trim().toLowerCase().startsWith('manual qa:')) {
        setError('Data integrity check failed: draft content cannot begin with QA comment metadata.');
        return false;
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
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const handleApproval = async (
    a: 'approve' | 'request_changes' | 'waive',
    customReason?: string,
  ): Promise<boolean> => {
    if (!selected) return false;
    setError('');

    if (role === 'auditor') {
      setError('Auditor role has read-only access. Switch role to Reviewer or Brand Admin to perform approval decisions.');
      return false;
    }
    if (role !== 'reviewer' && role !== 'brand_admin') {
      setError('Reviewer or Brand Admin role required for approval decisions.');
      return false;
    }

    const unresolvedHigh = selected.findings.filter(
      (f) => !f.disposition && ['HIGH', 'CRITICAL'].includes(f.severity)
    );
    if ((a === 'approve' || a === 'waive') && unresolvedHigh.length > 0) {
      setError(`Approval blocked — ${unresolvedHigh.length} high-risk finding${unresolvedHigh.length > 1 ? 's' : ''} must be resolved before sign-off.`);
      return false;
    }

    const decReason = customReason?.trim() || reason?.trim();
    if (a === 'waive' && !decReason) {
      setError('A documented reason is required for a governance waiver.');
      return false;
    }

    try {
      const r = await api.approval(selected.id, a, decReason || undefined);
      setSelected(r);
      await refresh();
      setReason('');
      const statusMsg = a === 'approve' ? 'Approved for publication' : a === 'request_changes' ? 'Changes requested' : 'Governance waiver recorded';
      setSuccess(`Review transitioned to ${r.status} (${statusMsg}). Append-only audit record created.`);
      setTimeout(() => setSuccess(''), 5000);
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('409') || msg.toLowerCase().includes('high-risk findings')) {
        setError('Approval blocked: Unresolved high-risk findings must be resolved before approval or waiver.');
        await refresh();
      } else {
        setError(msg);
      }
      return false;
    }
  };

  const selectReview = async (r: Review | null) => {
    if (!r) {
      setSelected(null);
      return;
    }
    setSelected(r);
    try {
      const full = await api.getReview(r.id);
      setSelected(full);
      const auditLog = await api.audit(r.id).catch(() => []);
      setAuditEntries(auditLog);
    } catch {
      // Keep shallow copy if full fetch fails
    }
  };

  const handleOpenEditRule = (r: Rule) => {
    setEditingRule(r);
    setEditRuleForm({
      title: r.title,
      kind: r.kind,
      pattern: r.pattern,
      requirement: r.requirement,
      severity: r.severity,
      source_title: r.source_title,
      source_excerpt: r.source_excerpt,
      expires_at: r.expires_at || '',
      reason: '',
    });
    setEditRuleError('');
  };

  const handleSaveEditRule = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    setBusy(true);
    setEditRuleError('');
    try {
      await api.updateRule(editingRule.id, {
        ...editRuleForm,
        expected_version: editingRule.version,
      });
      setSuccess(`Rule '${editingRule.title}' updated with immutable version history.`);
      setTimeout(() => setSuccess(''), 4000);
      setEditingRule(null);
      await refresh();
    } catch (err) {
      const msg = (err as Error).message || String(err);
      if (msg.includes('409') || msg.toLowerCase().includes('stale') || msg.toLowerCase().includes('conflict')) {
        setEditRuleError('Stale version conflict: This rule was updated by another administrator. Please refresh before saving.');
      } else {
        setEditRuleError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenEditFact = (f: Fact) => {
    setEditingFact(f);
    setEditFactForm({
      claim: f.claim,
      value: f.value,
      source_title: f.source_title,
      source_excerpt: f.source_excerpt,
      owner: f.owner,
      status: f.status,
      expires_at: f.expires_at ? f.expires_at.split('T')[0] : '',
      notes: f.notes || '',
      reason: '',
    });
    setEditFactError('');
  };

  const handleSaveEditFact = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingFact) return;
    setBusy(true);
    setEditFactError('');
    try {
      await api.updateFact(editingFact.id, {
        ...editFactForm,
        expected_version: editingFact.version,
      });
      setSuccess(`Fact '${editingFact.claim}' updated with immutable version history.`);
      setTimeout(() => setSuccess(''), 4000);
      setEditingFact(null);
      await refresh();
    } catch (err) {
      const msg = (err as Error).message || String(err);
      if (msg.includes('409') || msg.toLowerCase().includes('stale') || msg.toLowerCase().includes('conflict')) {
        setEditFactError('Stale version conflict: This fact was updated by another administrator. Please refresh before saving.');
      } else {
        setEditFactError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLoadFactHistory = async (factId: string) => {
    try {
      const vers = await api.factVersions(factId);
      setFactHistory((prev) => ({ ...prev, [factId]: vers }));
    } catch (e) {
      setError('Failed to fetch fact history: ' + (e as Error).message);
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

  const handleLoadRuleHistory = async (ruleId: string) => {
    setError('');
    try {
      const history = await api.ruleVersions(ruleId);
      setRuleHistory(current => ({ ...current, [ruleId]: history }));
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
        notes: '',
      });
      await refresh();
      setSuccess('Approved fact recorded in claim ledger.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleUpdateBrandProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const updated = await api.updateBrandProfile({
        brand_name: profileDraft.brand_name,
        primary_color: profileDraft.primary_color,
        secondary_color: profileDraft.secondary_color,
        accent_colors: profileDraft.accent_colors || [],
        min_contrast_ratio: Number(profileDraft.min_contrast_ratio || 4.5),
        approved_logo_aspect: profileDraft.approved_logo_aspect,
      });
      setBrandProfile(updated);
      setProfileDraft(updated);
      await refresh();
      setSuccess('Visual brand profile saved for this workspace.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCreateAsset = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAsset.name) return;
    try {
      await api.registerAsset(newAsset);
      await refresh();
      setIsAssetModalOpen(false);
      setSuccess(`Asset '${newAsset.name}' registered in brand registry.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!confirm(`Remove asset '${name}' from registry?`)) return;
    try {
      await api.deleteAsset(id);
      await refresh();
      setSuccess(`Asset '${name}' removed from registry.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRuleSuggestionAction = async (ruleId: string, action: 'accept' | 'defer' | 'reject') => {
    try {
      const suggestion = await api.ruleSuggestion(ruleId, action);
      if (action === 'accept') {
        setAcceptedSuggestions(current => ({ ...current, [ruleId]: suggestion }));
      }
      await refresh();
      setSuccess(action === 'accept'
        ? 'Suggestion approved. Review it, then explicitly activate a new rule version.'
        : `Guideline suggestion for ${ruleId} marked as ${action.toUpperCase()}.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleActivateSuggestion = async (ruleId: string) => {
    const suggestion = acceptedSuggestions[ruleId];
    const rule = rules.find(item => item.id === ruleId);
    if (!suggestion || !rule) return;
    const candidateText = window.prompt(
      `Review and refine candidate policy requirement for "${rule.title}" before activation:`,
      suggestion.proposed_clarification || rule.requirement
    );
    if (candidateText === null) return;
    const trimmed = candidateText.trim();
    if (!trimmed) {
      setError('Activation cancelled: candidate policy requirement cannot be empty.');
      return;
    }
    try {
      const result = await api.activateRuleSuggestion(suggestion.id, rule.version, trimmed);
      setAcceptedSuggestions(current => {
        const next = { ...current };
        delete next[ruleId];
        return next;
      });
      await refresh();
      setSuccess(`Rule version ${result.new_version} activated with reviewed policy text.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes('409') || msg.toLowerCase().includes('stale') || msg.toLowerCase().includes('version has changed')) {
        setError('Activation conflict (409): The active rule version has changed since this proposal was generated. Please review the updated rule in Brand Guidelines before deciding.');
      } else {
        setError(msg);
      }
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
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{
          background: 'radial-gradient(ellipse at top, #0C1420 0%, #070B12 100%)',
          color: '#F4F8FC',
        }}
        aria-label="Workspace Loading State"
      >
        {/* Glowing Logo Icon */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0C1420] border border-[#00E6A0]/40 flex items-center justify-center text-[#00E6A0] text-3xl shadow-[0_0_30px_rgba(0,230,160,0.25)] animate-pulse">
            ◈
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#00E6A0]/20 to-[#00C8F0]/20 blur-sm -z-10" />
        </div>

        <div className="text-2xl font-black tracking-wider text-white mb-2">
          BRANDTRACE
        </div>

        {error ? (
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#0C1420] border border-[#EF4444]/40 shadow-xl space-y-4">
            <div className="text-[#FCA5A5] text-sm leading-relaxed">
              {error}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => {
                  setError('');
                  setLoadTimeout(false);
                  api
                    .setup()
                    .then(refresh)
                    .then(() => setReady(true))
                    .catch((e) =>
                      setError(`Backend unavailable: ${(e as Error).message}. Ensure FastAPI server is running.`)
                    );
                }}
              >
                <RefreshCw size={14} /> Retry Connection
              </button>
              {onBackToHero && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={onBackToHero}
                  style={{ background: 'transparent', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  Back to Overview
                </button>
              )}
            </div>
          </div>
        ) : loadTimeout ? (
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#0C1420] border border-[#F59E0B]/40 shadow-xl space-y-4">
            <p className="text-[#FCD34D] text-sm font-semibold m-0">
              Connection to the FastAPI backend is taking longer than expected.
            </p>
            <p className="text-[#9AAABD] text-xs m-0">
              Ensure the FastAPI backend server is accessible and reachable.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
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
              {onBackToHero && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={onBackToHero}
                  style={{ background: 'transparent', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  Back to Overview
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-sm mx-auto">
            <p className="text-[#C1CDDA] text-sm font-medium m-0">
              Initializing evidence-linked brand governance workspace…
            </p>
            {/* Indeterminate Animated Pulse Bar */}
            <div className="w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-[#00E6A0] to-[#00C8F0] animate-pulse rounded-full" />
            </div>
            {onBackToHero && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onBackToHero}
                  className="text-xs text-[#9AAABD] hover:text-white transition-colors cursor-pointer"
                >
                  &larr; Return to Overview
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#F6F8F6',
        color: '#15251E',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: 260,
          background: '#123B2D',
          borderRight: '1px solid #0A241B',
          color: '#FFFFFF',
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
        <div style={{ padding: '0 6px 16px', borderBottom: '1px solid #1A4E3D', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: '#0E9F78',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#fff',
                boxShadow: '0 2px 8px rgba(14, 159, 120, 0.3)',
              }}
            >
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', color: '#FFFFFF' }}>
                BRANDTRACE
              </div>
              <div style={{ fontSize: 10, color: '#A6CDBA', letterSpacing: '0.05em', fontWeight: 700 }}>
                GOVERNANCE
              </div>
            </div>
          </div>
        </div>

        {/* Environment Badge */}
        {(() => {
          const envBadge = getDisplayEnvironmentBadge(systemStatus);
          return (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${envBadge.dotColor}50`,
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 11,
                color: '#FFFFFF',
                fontWeight: 700,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: envBadge.dotColor }} />
              <span>{envBadge.text}</span>
            </div>
          );
        })()}

        {/* Quick Tour Trigger */}
        <button
          type="button"
          onClick={() => setIsTourModalOpen(true)}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: 'all 160ms ease',
          }}
        >
          <Sparkles size={13} style={{ color: '#0E9F78' }} />
          <span>Take Judge Tour</span>
        </button>

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

        {/* Return to Platform Overview (Hero) */}
        {onBackToHero && (
          <button
            className="btn-secondary btn-sm"
            onClick={onBackToHero}
            style={{ width: '100%', marginBottom: 12, justifyContent: 'center', fontSize: 12, background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}
          >
            <Sparkles size={14} /> Back to Platform Overview
          </button>
        )}

        {/* Active Role Card & Switch Action */}
        <div style={{ borderTop: '1px solid #1A4E3D', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: '#B3C7BD', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Active Role
            </span>
            <button
              type="button"
              onClick={() => setIsJudgeAccessOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00E6A0',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
              title="Open Role Chooser Modal"
            >
              <span>Switch Role</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: '#0A241B',
              border: '1px solid #1A4E3D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: role === 'brand_admin' ? '#00E6A0' : role === 'reviewer' ? '#00C8F0' : role === 'auditor' ? '#8467FF' : '#9AAABD' }} />
              <span>{ROLE_DISPLAY_NAMES[role]}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsJudgeAccessOpen(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#A6CDBA',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Change
            </button>
          </div>
        </div>

        {/* Governance Policy Notice */}
        <div style={{ borderTop: '1px solid #1A4E3D', paddingTop: 12, fontSize: 11, color: '#B3C7BD', lineHeight: 1.5 }}>
          <p><b style={{ color: '#FFFFFF' }}>Deterministic First:</b> Exact rules run independently of external AI.</p>
          <p style={{ marginTop: 6 }}><b style={{ color: '#FFFFFF' }}>NEEDS_REVIEW:</b> Unverified claims require human review.</p>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Sticky Header */}
        <header
          style={{
            padding: '16px 36px',
            borderBottom: '1px solid #DCE5DF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.92)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'blur(16px)',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#617168', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ color: '#0E9F78' }}>BRANDTRACE</span>
                <span>/</span>
                <span>{view}</span>
              </div>
              <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: '#123B2D' }}>
                {view === 'Overview' ? 'Executive Governance Summary' : view}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Workspace Context Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 8,
                background: '#FAFBF9',
                border: '1px solid #DCE5DF',
                fontSize: 11,
                fontWeight: 600,
                color: '#15251E',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E9F78' }} />
              <span>Workspace: <strong>ws_default</strong></span>
            </div>

            {/* Current Role Badge & Switch Action */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 8,
                background: '#FAFBF9',
                border: '1px solid #DCE5DF',
                fontSize: 11,
                fontWeight: 600,
                color: '#15251E',
              }}
            >
              <span style={{ fontSize: 10, color: '#617168', textTransform: 'uppercase' }}>Role:</span>
              <strong style={{ color: '#123B2D' }}>{ROLE_DISPLAY_NAMES[role]}</strong>
              <button
                type="button"
                onClick={() => setIsJudgeAccessOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0E9F78',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: 2,
                  padding: '2px 4px',
                }}
                title="Switch Evaluation Role"
              >
                Switch
              </button>
            </div>

            {/* Quick Tour Trigger */}
            <button
              type="button"
              onClick={() => setIsTourModalOpen(true)}
              className="btn-secondary btn-sm"
              style={{ fontSize: 12, padding: '6px 12px', minHeight: 36 }}
            >
              <Sparkles size={13} style={{ color: '#0E9F78' }} />
              <span>Judge Tour</span>
            </button>

            <button
              className="btn-primary btn-sm"
              onClick={() => {
                setView('Content Review');
                setSelected(null);
              }}
              style={{ fontSize: 12, minHeight: 36 }}
            >
              <Plus size={15} /> New Review
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
              {/* Executive Overview Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #123B2D 0%, #0A241B 100%)',
                  borderRadius: 16,
                  padding: '24px 28px',
                  color: '#FFFFFF',
                  marginBottom: 24,
                  boxShadow: '0 4px 16px rgba(18, 59, 45, 0.12)',
                  border: '1px solid #0A241B',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ maxWidth: 840 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          background: '#0E9F78',
                          color: '#FFFFFF',
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}
                      >
                        Evidence-Linked Governance
                      </span>
                      <SystemStatus variant="inline" className="text-white text-xs" />
                    </div>
                    <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                      Executive Governance Summary
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#DCE5DF', lineHeight: 1.6 }}>
                      BRANDTRACE helps teams monitor brand claims, evaluate content against governance rules, understand the impact of rule changes, and review evidence behind compliance findings.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setIsTourModalOpen(true)}
                      className="btn-secondary btn-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#FFFFFF',
                        fontSize: 12,
                      }}
                    >
                      <Sparkles size={13} style={{ color: '#0E9F78' }} /> Judge Tour
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive 5-Step Workflow Stepper */}
              <WorkflowStepper
                currentView={view}
                onSelectView={(v) => setView(v)}
                onOpenTour={() => setIsTourModalOpen(true)}
              />

              {/* Architectural Scope & Transparency Banner */}
              <HonestLimitationsBanner />

              {/* Truthful System & Environment Status Card */}
              <SystemStatus variant="card" className="mb-6" showRefresh />

              {/* 4 Key Executive Performance Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {[
                  { title: 'Total Reviews', value: reviews.length, hint: 'Stored draft records', icon: FileText, color: '#0E9F78' },
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
                  <div key={title} className="metric-card apple-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="metric-label">{title}</div>
                      <Icon size={18} color={color} />
                    </div>
                    <div className="metric-value" style={{ color }}>{value}</div>
                    <div className="metric-sub">{hint}</div>
                  </div>
                ))}
              </div>

              {/* Interactive Data Visualizations Grid (Outcome, Severity, Status) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 20,
                  marginBottom: 24,
                }}
              >
                <ReviewOutcomeDonut reviews={reviews} />
                <SeverityBarChart bySeverity={insights?.by_severity} totalOpen={insights?.unresolved} />
                <EvidenceStatusBarChart byStatus={insights?.by_evidence_status} />
              </div>

              {/* Two Column Layout: Recent Reviews Table & Provenance Timeline */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
                <div className="card-premium apple-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <span className="section-eyebrow" style={{ fontSize: 10 }}>SUBMISSIONS</span>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Recent Content Reviews</h2>
                    </div>
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
                      selectReview(r);
                      setView('Content Review');
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <ActivityTimeline
                    reviews={reviews}
                    auditEntries={auditEntries}
                    onSelectReview={(r) => {
                      setSelected(r);
                      setView('Content Review');
                    }}
                    onViewAllAudit={() => setView('Audit History')}
                  />

                  <div className="card-premium apple-card">
                    <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Active Brand Guidelines</h2>
                    <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #DCE5DF' }}>
                        <span style={{ color: '#617168' }}>Primary Brand Palette:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 18, height: 18, borderRadius: 4, background: brandProfile?.primary_color || '#0f766e', border: '1px solid rgba(255,255,255,0.2)' }} />
                          <code>{brandProfile?.primary_color || '#0f766e'}</code>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #DCE5DF' }}>
                        <span style={{ color: '#617168' }}>Secondary Accent:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 18, height: 18, borderRadius: 4, background: brandProfile?.secondary_color || '#2dd4bf', border: '1px solid rgba(255,255,255,0.2)' }} />
                          <code>{brandProfile?.secondary_color || '#2dd4bf'}</code>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #DCE5DF' }}>
                        <span style={{ color: '#617168' }}>WCAG Contrast Standard:</span>
                        <strong style={{ color: '#0E9F78' }}>{brandProfile?.min_contrast_ratio || 4.5}:1 (Normal text AA)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #DCE5DF' }}>
                        <span style={{ color: '#617168' }}>Active Constitution Rules:</span>
                        <strong>{rules.length} verified rules</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#617168' }}>Approved Claim Ledger:</span>
                        <strong>{facts.length} verified assertions</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===
             VIEW B: BRAND CONSTITUTION
             ========================================================================= */}
          {view === 'Brand Constitution' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #DCE5DF', paddingBottom: 12 }}>
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
                  className={`btn-secondary btn-sm ${constTab === 'assets' ? 'btn-primary' : ''}`}
                  onClick={() => setConstTab('assets')}
                >
                  <Palette size={14} /> Brand Asset Registry ({brandAssets.length})
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
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#617168' }}>
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
                          background: '#F8FAF8',
                          border: '1px solid #DCE5DF',
                          borderRadius: 10,
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'start',
                          gap: 16,
                          flexWrap: 'wrap',
                        }}
                      >
                        <StatusBadge value={r.status} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--bt-forest)' }}>{r.title}</div>
                          <p style={{ margin: '6px 0', fontSize: 13, color: '#617168' }}>
                            <code style={{ color: '#2dd4bf', background: '#E9F6F0', padding: '2px 6px', borderRadius: 4 }}>{r.kind}</code> · Pattern: “{r.pattern}” · v{r.version} · Category: <i>{r.category}</i>
                          </p>
                          <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--bt-text-secondary)' }}>{r.requirement}</p>
                          <div style={{ fontSize: 11, color: '#8A9A91', marginTop: 8 }}>
                            Source: <b>{r.source_title}</b>: “{r.source_excerpt}” (Owner: {r.owner})
                            {r.expires_at && ` · Expires: ${new Date(r.expires_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                          <StatusBadge value={r.severity} />
                          <div style={{ display: 'flex', gap: 6 }}>
                            {role === 'brand_admin' && (
                              <button className="btn-secondary btn-sm" onClick={() => handleOpenEditRule(r)}>
                                <Edit2 size={13} /> Edit
                              </button>
                            )}
                            <button className="btn-secondary btn-sm" onClick={() => handleLoadRuleHistory(r.id)}>
                              <Clock size={13} /> Version history
                            </button>
                          </div>
                        </div>
                        {ruleHistory[r.id] && (
                          <div style={{ flexBasis: '100%', borderTop: '1px solid #DCE5DF', paddingTop: 10, fontSize: 12, color: '#617168' }}>
                            <b>Immutable version history:</b>{' '}
                            {ruleHistory[r.id].map((version) => `v${version.version}`).join(' → ') || 'No snapshots available.'}
                          </div>
                        )}
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
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#617168' }}>
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
                          background: '#F8FAF8',
                          border: '1px solid #DCE5DF',
                          borderRadius: 10,
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          gap: 16,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--bt-forest)' }}>{f.claim}</div>
                          <p style={{ margin: '6px 0', fontSize: 13, color: 'var(--bt-text-secondary)' }}>
                            Approved Assertion: <span style={{ color: '#2dd4bf', fontWeight: 600 }}>“{f.value}”</span>
                          </p>
                          <div style={{ fontSize: 11, color: '#8A9A91', marginTop: 6 }}>
                            Source: <b>{f.source_title}</b>: “{f.source_excerpt}”<br />
                            Owner: {f.owner} · Version: v{f.version} · Expires:{' '}
                            {f.expires_at ? new Date(f.expires_at).toLocaleDateString() : 'Active indefinitely'}
                          </div>
                          {f.notes && (
                            <div style={{ fontSize: 11, color: '#0E9F78', marginTop: 4, fontStyle: 'italic' }}>
                              Notes: {f.notes}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                          <StatusBadge value={f.status} />
                          <div style={{ display: 'flex', gap: 6 }}>
                            {role === 'brand_admin' && (
                              <button className="btn-secondary btn-sm" onClick={() => handleOpenEditFact(f)}>
                                <Edit2 size={13} /> Edit
                              </button>
                            )}
                            <button className="btn-secondary btn-sm" onClick={() => handleLoadFactHistory(f.id)}>
                              <Clock size={13} /> Version history
                            </button>
                          </div>
                        </div>
                        {factHistory[f.id] && (
                          <div style={{ flexBasis: '100%', borderTop: '1px solid #DCE5DF', paddingTop: 10, fontSize: 12, color: '#617168' }}>
                            <b>Immutable fact version history:</b>{' '}
                            {factHistory[f.id].map((v) => `v${v.version} (${v.change_reason || 'SNAPSHOT'})`).join(' → ') || 'Initial version'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand Asset Registry Tab (Round 3) */}
              {constTab === 'assets' && (
                <div className="card-premium">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Brand Asset Registry</h2>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#617168' }}>
                        Cryptographically registered brand assets with SHA-256 hash validation and license status tracking.
                      </p>
                    </div>
                    {role === 'brand_admin' && (
                      <button className="btn-primary btn-sm" onClick={() => setIsAssetModalOpen(true)}>
                        <Plus size={14} /> Register Brand Asset
                      </button>
                    )}
                  </div>

                  {brandAssets.length > 0 ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {brandAssets.map((asset) => (
                        <div
                          key={asset.id}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid var(--bt-border)',
                            borderRadius: 10,
                            padding: '16px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            gap: 16,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--bt-forest)' }}>{asset.name}</span>
                              <StatusBadge value={asset.approval_status} />
                              <span style={{ fontSize: 11, color: '#0E9F78', background: '#E9F6F0', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                                {asset.asset_type.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#617168', marginTop: 6 }}>
                              {asset.content_hash ? (
                                <span>Hash (SHA-256): <code style={{ color: '#123B2D', background: '#F0F4F1', padding: '1px 4px', borderRadius: 3 }}>{asset.content_hash.slice(0, 24)}...</code> &middot; </span>
                              ) : null}
                              License: <b>{asset.license_status}</b> &middot; Source: {asset.source || 'Internal'}
                            </div>
                            {asset.license_notes && (
                              <div style={{ fontSize: 11, color: '#617168', marginTop: 4, fontStyle: 'italic' }}>
                                Notes: {asset.license_notes}
                              </div>
                            )}
                          </div>
                          {role === 'brand_admin' && (
                            <button
                              className="btn-danger btn-sm"
                              onClick={() => handleDeleteAsset(asset.id, asset.name)}
                              style={{ padding: '4px 10px', fontSize: 11, minHeight: 32 }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '36px 20px', color: '#617168' }}>
                      <p style={{ margin: 0 }}>No assets registered yet. Brand Admins can register logos, hero imagery, and design files.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Visual Brand Profile Tab */}
              {constTab === 'profile' && (
                <div className="card-premium">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Visual Brand Standards & Palette</h2>
                    {role === 'brand_admin' && <span className="badge-status badge-supported">Editable by Brand Admin</span>}
                  </div>
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
                      <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 15, color: 'var(--bt-forest)' }}>
                        {brandProfile?.approved_logo_aspect || 3.0}:1 standard landscape logo
                      </p>
                    </div>
                    <div
                      style={{
                        background: 'rgba(13, 42, 64, 0.4)',
                        border: '1px solid #DCE5DF',
                        borderRadius: 8,
                        padding: '14px 18px',
                        fontSize: 13,
                        color: '#617168',
                        lineHeight: 1.5,
                      }}
                    >
                      Visual rules are evaluated deterministically on uploaded images using Pillow quantization,
                      CIELAB Delta-E colour distance, and W3C WCAG 2.1 relative luminance formulas.
                    </div>
                    {role === 'brand_admin' && (
                      <form onSubmit={handleUpdateBrandProfile} style={{ display: 'grid', gap: 12, borderTop: '1px solid #DCE5DF', paddingTop: 18 }}>
                        <div className="label-sm">Update this workspace profile</div>
                        <input className="input-premium" required placeholder="Brand name" value={profileDraft.brand_name || ''} onChange={(e) => setProfileDraft({ ...profileDraft, brand_name: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <input className="input-premium" required pattern="^#?[0-9a-fA-F]{6}$" placeholder="#0f766e" value={profileDraft.primary_color || ''} onChange={(e) => setProfileDraft({ ...profileDraft, primary_color: e.target.value })} />
                          <input className="input-premium" required pattern="^#?[0-9a-fA-F]{6}$" placeholder="#040b14" value={profileDraft.secondary_color || ''} onChange={(e) => setProfileDraft({ ...profileDraft, secondary_color: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <input className="input-premium" type="number" min="1" max="21" step="0.1" value={profileDraft.min_contrast_ratio || 4.5} onChange={(e) => setProfileDraft({ ...profileDraft, min_contrast_ratio: Number(e.target.value) })} />
                          <input className="input-premium" type="number" min="0.1" max="10" step="0.1" placeholder="Logo aspect ratio" value={profileDraft.approved_logo_aspect || ''} onChange={(e) => setProfileDraft({ ...profileDraft, approved_logo_aspect: e.target.value ? Number(e.target.value) : undefined })} />
                        </div>
                        <button className="btn-primary btn-sm" type="submit">Save Visual Brand Profile</button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
             VIEW C & D: CONTENT SUBMISSION & FINDINGS WORKSPACE
             ========================================================================= */}
          {view === 'Content Review' && (
            <div className="bt-content-review-container">
              {/* Header row with Title, Subtitle, and Draft Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--bt-forest)', letterSpacing: '-0.02em' }}>
                      Content Review
                    </h1>
                    <span style={{ fontSize: 11, background: '#E9F6F0', color: '#0E9F78', fontWeight: 700, padding: '2px 8px', borderRadius: 12, border: '1px solid #A6CDBA' }}>
                      Evidence Engine
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#617168' }}>
                    Submit documents, inspect evidence and review governance findings.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {reviews.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select
                        className="input-premium"
                        value={selected?.id || ''}
                        onChange={(e) => {
                          const targetId = e.target.value;
                          if (!targetId) {
                            setSelected(null);
                          } else {
                            const match = reviews.find((r) => r.id === targetId);
                            if (match) setSelected(match);
                          }
                        }}
                        style={{ minHeight: 38, fontSize: 13, minWidth: 260 }}
                      >
                        <option value="">{selected ? `-- Active: ${selected.title.slice(0, 30)} --` : `-- Select from ${reviews.length} stored drafts --`}</option>
                        {reviews.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title} ({r.score} pts · {r.status})
                          </option>
                        ))}
                      </select>
                      {selected && (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 38 }}
                          onClick={() => setSelected(null)}
                        >
                          <Plus size={14} /> New Document Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!selected ? (
                /* =========================================================================
                   MODE 1: NEW DOCUMENT REVIEW (Full-Width Upload Canvas)
                   ========================================================================= */
                <div>
                  <div className="card-premium bt-upload-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #DCE5DF', paddingBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          New Document Review
                        </div>
                        <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--bt-forest)' }}>
                          Submit Document for Evidence Analysis
                        </h2>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className={`btn-secondary btn-sm ${submissionTab === 'file' ? 'btn-primary' : ''}`}
                          onClick={() => setSubmissionTab('file')}
                          style={{ fontSize: 12 }}
                        >
                          Upload File (PDF / Image)
                        </button>
                        <button
                          type="button"
                          className={`btn-secondary btn-sm ${submissionTab === 'text' ? 'btn-primary' : ''}`}
                          onClick={() => setSubmissionTab('text')}
                          style={{ fontSize: 12 }}
                        >
                          Direct Text / Markdown
                        </button>
                      </div>
                    </div>

                    {submissionTab === 'file' ? (
                      <form onSubmit={submitFileReview} style={{ display: 'grid', gap: 18 }}>
                        {/* Full-Width Document Title */}
                        <div>
                          <label className="label-sm">Document Title</label>
                          <input
                            className="input-premium"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Q4 Brand Launch Deck, Product Whitepaper, Resume"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            required
                          />
                        </div>

                        {/* Responsive 2-Column Grid: File Format & Document Category */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                          <div>
                            <label className="label-sm">File Format Target</label>
                            <select
                              className="input-premium"
                              value={contentType}
                              onChange={(e) => setContentType(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="document">PDF Document</option>
                              <option value="image">Graphic / Image Asset</option>
                            </select>
                          </div>
                          <div>
                            <label className="label-sm">Document Category & Scope</label>
                            <select
                              className="input-premium"
                              value={documentType}
                              onChange={(e) => setDocumentType(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="general_document">General Document</option>
                              <option value="marketing_copy">Marketing Copy / Press Release</option>
                              <option value="social_media">Social Media Post</option>
                              <option value="advertisement">Advertisement / Paid Media</option>
                              <option value="resume_cv">Resume / CV (Personal Document)</option>
                              <option value="academic_assignment">Academic Paper / Assignment</option>
                              <option value="technical_doc">Technical Documentation / Spec</option>
                              <option value="policy_doc">Policy / Legal Document</option>
                            </select>
                          </div>
                        </div>

                        {/* Personal Document / Resume Notice */}
                        {(documentType === 'resume_cv' || /resume|curriculum|cv\b/i.test(title) || (uploadFile && /resume|curriculum|cv\b/i.test(uploadFile.name))) && (
                          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1E40AF', display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Shield size={18} style={{ color: '#2563EB', flexShrink: 0 }} />
                            <div>
                              <strong>Privacy & Scoping Notice:</strong> Career and personal documents are automatically scoped to prevent inappropriate commercial marketing brand language checks (such as mandatory &ldquo;Brandtrace&rdquo; mentions). External AI and OCR are optional and disabled by default.
                            </div>
                          </div>
                        )}

                        {/* Drag and Drop Area */}
                        <div
                          className={`bt-dropzone ${isDragging ? 'active' : ''}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              const f = e.dataTransfer.files[0];
                              setUploadFile(f);
                              if (!title || title.startsWith('Launch') || title.trim() === '') {
                                setTitle(f.name.replace(/\.[^/.]+$/, ''));
                              }
                              if (/resume|curriculum|cv\b/i.test(f.name)) {
                                setDocumentType('resume_cv');
                              }
                            }
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
                                const f = e.target.files[0];
                                setUploadFile(f);
                                if (!title || title.startsWith('Launch') || title.trim() === '') {
                                  setTitle(f.name.replace(/\.[^/.]+$/, ''));
                                }
                                if (/resume|curriculum|cv\b/i.test(f.name)) {
                                  setDocumentType('resume_cv');
                                }
                              }
                            }}
                          />
                          {uploadFile ? (
                            <div className="bt-file-preview-card" onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: '#E9F6F0', color: '#0E9F78', width: 44, height: 44, borderRadius: 8, display: 'grid', placeContent: 'center', flexShrink: 0 }}>
                                  <FileText size={22} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bt-forest)' }}>{uploadFile.name}</div>
                                  <div style={{ fontSize: 12, color: '#617168', marginTop: 2 }}>
                                    {(uploadFile.size / 1024).toFixed(1)} KB · {uploadFile.type || 'Document'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  onClick={() => fileInputRef.current?.click()}
                                  style={{ fontSize: 12, padding: '4px 10px' }}
                                >
                                  Change file
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  onClick={() => setUploadFile(null)}
                                  style={{ fontSize: 12, padding: '4px 8px', color: '#dc2626' }}
                                  title="Remove file"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <FileUp size={38} style={{ color: '#2dd4bf', margin: '0 auto 10px' }} />
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--bt-forest)' }}>
                                Drag your file here or Browse Files
                              </p>
                              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8A9A91' }}>
                                PDF · PNG · JPG · TXT · Markdown
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Optional Processing Box */}
                        <div style={{ background: '#F8FAF8', border: '1px solid #DCE5DF', borderRadius: 8, padding: '16px 20px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bt-forest)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sparkles size={16} style={{ color: '#2dd4bf' }} />
                            Optional Processing
                          </div>

                          <div style={{ display: 'grid', gap: 14 }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--bt-text-primary)' }}>
                              <input
                                type="checkbox"
                                checked={consentAi}
                                onChange={(e) => setConsentAi(e.target.checked)}
                                style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer' }}
                              />
                              <div>
                                <span style={{ fontWeight: 600 }}>AI analysis (optional)</span>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#617168', lineHeight: 1.45 }}>
                                  Use AI to generate additional document insights. Your document is processed only when you enable this option.
                                </p>
                              </div>
                            </label>

                            {(contentType === 'document' || !uploadFile || uploadFile.name.toLowerCase().endsWith('.pdf')) && (
                              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--bt-text-primary)' }}>
                                <input
                                  type="checkbox"
                                  checked={consentOcr}
                                  onChange={(e) => setConsentOcr(e.target.checked)}
                                  style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer' }}
                                />
                                <div>
                                  <span style={{ fontWeight: 600 }}>AI-assisted text extraction (optional)</span>
                                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#617168', lineHeight: 1.45 }}>
                                    Transcribes text from scanned or image-based pages. Digital text is always extracted directly first.
                                  </p>
                                </div>
                              </label>
                            )}

                            <div style={{ fontSize: 12, color: '#617168', borderTop: '1px solid #E5E7EB', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Info size={14} style={{ color: '#8A9A91', flexShrink: 0 }} />
                                <span>External processing notice: When enabled, document text is sent to an external AI service to generate advisory insights.</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsTermsOpen(true)}
                                style={{ background: 'none', border: 'none', padding: 0, color: '#0E9F78', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                              >
                                View data processing terms
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Progress Status Banner */}
                        {busy && (
                          <div style={{ background: '#E9F6F0', border: '1px solid #A6CDBA', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#0E9F78', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 16, height: 16, border: '2px solid #0E9F78', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontWeight: 600 }}>
                              {uploadStage === 'UPLOADING_FILE' && 'Uploading document…'}
                              {uploadStage === 'EXTRACTING_DIGITAL_TEXT' && 'Extracting digital text & running compliance engine…'}
                              {uploadStage === 'EXTRACTING_TEXT_AND_OCR' && 'Running AI-assisted text extraction…'}
                              {uploadStage === 'RULE_ANALYSIS_IN_PROGRESS' && 'Evaluating brand rules against evidence…'}
                              {!uploadStage && 'Checking document compliance…'}
                            </span>
                          </div>
                        )}

                        <button
                          className="btn-primary"
                          style={{ width: '100%', minHeight: 48, fontSize: 15, fontWeight: 700 }}
                          disabled={busy || !uploadFile}
                        >
                          {busy ? 'Extracting & Evaluating…' : 'Upload & Analyze Document'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={submitTextReview} style={{ display: 'grid', gap: 18 }}>
                        <div>
                          <label className="label-sm">Draft Title</label>
                          <input
                            className="input-premium"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Q4 Brand Announcement Copy"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            required
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                          <div>
                            <label className="label-sm">Content Channel</label>
                            <select
                              className="input-premium"
                              value={contentType}
                              onChange={(e) => setContentType(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="marketing_copy">Marketing Copy</option>
                              <option value="email">Email Campaign</option>
                              <option value="social">Social Media Post</option>
                              <option value="web">Web Copy</option>
                              <option value="document">General Document</option>
                            </select>
                          </div>
                          <div>
                            <label className="label-sm">Document Category & Scope</label>
                            <select
                              className="input-premium"
                              value={documentType}
                              onChange={(e) => setDocumentType(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="general_document">General Document</option>
                              <option value="marketing_copy">Marketing Copy / Press Release</option>
                              <option value="social_media">Social Media Post</option>
                              <option value="advertisement">Advertisement / Paid Media</option>
                              <option value="resume_cv">Resume / CV (Personal Document)</option>
                              <option value="academic_assignment">Academic Paper / Assignment</option>
                              <option value="technical_doc">Technical Documentation / Spec</option>
                              <option value="policy_doc">Policy / Legal Document</option>
                            </select>
                          </div>
                        </div>

                        {(documentType === 'resume_cv' || /resume|curriculum|cv\b/i.test(title)) && (
                          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1E40AF', display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Shield size={18} style={{ color: '#2563EB', flexShrink: 0 }} />
                            <div>
                              <strong>Privacy & Scoping Notice:</strong> Career and personal documents are automatically scoped to prevent inappropriate commercial marketing brand language checks.
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="label-sm">Draft Text (Plain text & Markdown supported)</label>
                          <textarea
                            className="input-premium"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={50000}
                            style={{ minHeight: 200, width: '100%', boxSizing: 'border-box' }}
                            placeholder="Paste your draft text or announcement here for governance analysis..."
                            required
                          />
                        </div>

                        {/* Optional AI Analysis for Text */}
                        <div style={{ background: '#F8FAF8', border: '1px solid #DCE5DF', borderRadius: 8, padding: '16px 20px' }}>
                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--bt-text-primary)' }}>
                            <input
                              type="checkbox"
                              checked={consentAi}
                              onChange={(e) => setConsentAi(e.target.checked)}
                              style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer' }}
                            />
                            <div>
                              <span style={{ fontWeight: 600 }}>AI analysis (optional)</span>
                              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#617168', lineHeight: 1.45 }}>
                                Use AI to generate additional document insights. Your document is processed only when you enable this option.
                              </p>
                            </div>
                          </label>

                          <div style={{ fontSize: 12, color: '#617168', borderTop: '1px solid #E5E7EB', paddingTop: 12, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Info size={14} style={{ color: '#8A9A91', flexShrink: 0 }} />
                              <span>External processing notice: When enabled, document text is sent to an external AI service to generate advisory insights.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsTermsOpen(true)}
                              style={{ background: 'none', border: 'none', padding: 0, color: '#0E9F78', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                            >
                              View data processing terms
                            </button>
                          </div>
                        </div>

                        {busy && (
                          <div style={{ background: '#E9F6F0', border: '1px solid #A6CDBA', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#0E9F78', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 16, height: 16, border: '2px solid #0E9F78', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontWeight: 600 }}>Checking document compliance…</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
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
                    )}
                  </div>

                  {/* Compact Evidence Placeholder Card Below */}
                  <div className="card-premium" style={{ marginTop: 24, padding: '32px 24px', textAlign: 'center', background: '#FAFCFA', border: '1px dashed #DCE5DF' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0FDF4', color: '#2dd4bf', display: 'grid', placeContent: 'center', margin: '0 auto 12px' }}>
                      <Shield size={22} />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--bt-forest)' }}>
                      Evidence Findings
                    </h3>
                    <p style={{ margin: '0 auto', fontSize: 13, color: '#617168', maxWidth: 440, lineHeight: 1.5 }}>
                      Your evidence findings will appear here once a document has been analyzed. Upload a document above or select a previously reviewed draft to inspect governance results.
                    </p>
                  </div>
                </div>
              ) : (
                /* =========================================================================
                   MODE 2: ACTIVE DRAFT REVIEW WORKSPACE (2-Column Canvas)
                   ========================================================================= */
                <div className="bt-content-review-grid">
                  {/* Left Column: Active Draft Context */}
                  <div className="bt-review-left-col">
                    <div className="card-premium bt-draft-context-sticky">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#2dd4bf', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Draft Context
                          </div>
                          <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--bt-forest)' }}>
                            {selected.title}
                          </h3>
                        </div>
                        <StatusBadge value={selected.status} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 12px', background: '#F8FAF8', borderRadius: 8, border: '1px solid #DCE5DF', marginBottom: 14, fontSize: 12 }}>
                        <div>
                          <span style={{ color: '#8A9A91' }}>Scope: </span>
                          <strong style={{ color: 'var(--bt-text-secondary)' }}>{selected.document_type || selected.content_type}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#8A9A91' }}>Format: </span>
                          <strong style={{ color: 'var(--bt-text-secondary)' }}>{selected.file_format || selected.content_type}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#8A9A91' }}>Score: </span>
                          <strong style={{ color: selected.score >= 80 ? '#2dd4bf' : selected.score >= 60 ? '#fbbf24' : '#f87171' }}>
                            {selected.score}/100
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#8A9A91' }}>OCR / Intel: </span>
                          <span style={{ color: selected.ocr_applied ? '#6D28D9' : '#617168', fontWeight: selected.ocr_applied ? 700 : 400 }}>
                            {selected.ocr_applied ? 'AI-assisted OCR' : 'Digital extraction'}
                          </span>
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="label-sm" style={{ margin: 0 }}>Working Draft Copy</span>
                          <span style={{ fontSize: 11, color: '#8A9A91' }}>
                            {selected.content.length} characters
                          </span>
                        </div>
                        <div
                          style={{
                            background: '#F8FAF8',
                            border: '1px solid #DCE5DF',
                            borderRadius: 8,
                            padding: '14px 16px',
                            color: 'var(--bt-text-primary)',
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
                          <Plus size={14} /> Submit Another Document
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Findings & Correction Workspace Panel */}
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
                    currentRole={role}
                  />
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
             VIEW F: APPROVAL QUEUE
             ========================================================================= */}
          {view === 'Approval Queue' && (
            <div className="card-premium">
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Human Governance Approval Queue</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#617168' }}>
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
              guidelineHealth={guidelineHealth}
              acceptedSuggestions={acceptedSuggestions}
              role={role}
              onRuleSuggestionAction={handleRuleSuggestionAction}
              onActivateSuggestion={handleActivateSuggestion}
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
              onResetDemo={
                systemStatus?.environment === 'local' || systemStatus?.environment === 'demo'
                  ? async () => {
                      setBusy(true);
                      setError('');
                      try {
                        await api.reset();
                        await refresh();
                        setSelected(null);
                        setSuccess('Demo data has been reset to pristine initial state.');
                        setTimeout(() => setSuccess(''), 4000);
                      } catch (e) {
                        setError('Failed to reset demo data: ' + (e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }
                  : undefined
              }
              isHostedEnvironment={
                systemStatus?.environment === 'staging' ||
                systemStatus?.environment === 'production' ||
                systemStatus?.environment === 'unknown'
              }
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
            {/* Brand Asset Registration Modal (Round 3) */}
      {isAssetModalOpen && (
        <div className="bt-modal-backdrop" onClick={() => setIsAssetModalOpen(false)}>
          <div className="bt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bt-modal-head">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Register Brand Asset</h2>
              <button className="btn-secondary btn-sm" onClick={() => setIsAssetModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateAsset} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="label-sm">Asset Name</label>
                <input
                  className="input-premium"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  placeholder="e.g. Primary Horizontal Logo 2026"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label-sm">Asset Type</label>
                  <select
                    className="input-premium"
                    value={newAsset.asset_type}
                    onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })}
                  >
                    <option value="image">Image / Graphic</option>
                    <option value="logo">Brand Logo</option>
                    <option value="document">Design Asset / PDF</option>
                  </select>
                </div>
                <div>
                  <label className="label-sm">Approval Status</label>
                  <select
                    className="input-premium"
                    value={newAsset.approval_status}
                    onChange={(e) => setNewAsset({ ...newAsset, approval_status: e.target.value as any })}
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                    <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-sm">Content SHA-256 Hash (Optional for matching)</label>
                <input
                  className="input-premium"
                  value={newAsset.content_hash || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, content_hash: e.target.value })}
                  placeholder="Computed hex digest of asset bytes"
                />
              </div>
              <div>
                <label className="label-sm">License / Source Specification</label>
                <input
                  className="input-premium"
                  value={newAsset.source || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, source: e.target.value })}
                  placeholder="e.g. Corporate Brand Guidelines Figma"
                />
              </div>
              <div>
                <label className="label-sm">License Restrictions & Usage Notes</label>
                <textarea
                  className="input-premium"
                  value={newAsset.license_notes || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, license_notes: e.target.value })}
                  placeholder="Usage limits, regional rights, expiration, or editorial instructions..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setIsAssetModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm">
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="bt-modal-backdrop" onClick={() => setEditingRule(null)}>
          <div className="bt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bt-modal-head">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Approved Brand Rule</h2>
              <button className="btn-icon" onClick={() => setEditingRule(null)}>
                <X size={16} />
              </button>
            </div>
            {editRuleError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {editRuleError}
              </div>
            )}
            <form onSubmit={handleSaveEditRule} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="label-sm">Rule Title</label>
                <input
                  className="input-premium"
                  value={editRuleForm.title || ''}
                  onChange={(e) => setEditRuleForm({ ...editRuleForm, title: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label-sm">Severity</label>
                  <select
                    className="input-premium"
                    value={editRuleForm.severity || 'MEDIUM'}
                    onChange={(e) => setEditRuleForm({ ...editRuleForm, severity: e.target.value as any })}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="label-sm">Expected Version (Concurrency Check)</label>
                  <input
                    className="input-premium"
                    value={`v${editingRule.version} (Active)`}
                    disabled
                    style={{ background: '#F0F4F1', color: '#617168' }}
                  />
                </div>
              </div>
              <div>
                <label className="label-sm">Match Pattern</label>
                <input
                  className="input-premium"
                  value={editRuleForm.pattern || ''}
                  onChange={(e) => setEditRuleForm({ ...editRuleForm, pattern: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label-sm">Requirement Description</label>
                <textarea
                  className="input-premium"
                  value={editRuleForm.requirement || ''}
                  onChange={(e) => setEditRuleForm({ ...editRuleForm, requirement: e.target.value })}
                  required
                  style={{ minHeight: 70 }}
                />
              </div>
              <div>
                <label className="label-sm">Documented Change Reason (Required for Audit Trail)</label>
                <input
                  className="input-premium"
                  value={editRuleForm.reason || ''}
                  onChange={(e) => setEditRuleForm({ ...editRuleForm, reason: e.target.value })}
                  placeholder="e.g. Q4 Tone of voice update approved by Brand Council"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setEditingRule(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm" disabled={busy}>
                  {busy ? 'Saving…' : 'Save Rule Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fact Modal */}
      {editingFact && (
        <div className="bt-modal-backdrop" onClick={() => setEditingFact(null)}>
          <div className="bt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bt-modal-head">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Approved Fact / Claim</h2>
              <button className="btn-icon" onClick={() => setEditingFact(null)}>
                <X size={16} />
              </button>
            </div>
            {editFactError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {editFactError}
              </div>
            )}
            <form onSubmit={handleSaveEditFact} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="label-sm">Claim Title</label>
                <input
                  className="input-premium"
                  value={editFactForm.claim || ''}
                  onChange={(e) => setEditFactForm({ ...editFactForm, claim: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label-sm">Approved Assertion Value</label>
                <input
                  className="input-premium"
                  value={editFactForm.value || ''}
                  onChange={(e) => setEditFactForm({ ...editFactForm, value: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label-sm">Status</label>
                  <select
                    className="input-premium"
                    value={editFactForm.status || 'APPROVED'}
                    onChange={(e) => setEditFactForm({ ...editFactForm, status: e.target.value as any })}
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="RETIRED">RETIRED</option>
                  </select>
                </div>
                <div>
                  <label className="label-sm">Expected Version</label>
                  <input
                    className="input-premium"
                    value={`v${editingFact.version} (Active)`}
                    disabled
                    style={{ background: '#F0F4F1', color: '#617168' }}
                  />
                </div>
              </div>
              <div>
                <label className="label-sm">Expiration Date (Optional)</label>
                <input
                  type="date"
                  className="input-premium"
                  value={editFactForm.expires_at || ''}
                  onChange={(e) => setEditFactForm({ ...editFactForm, expires_at: e.target.value })}
                />
              </div>
              <div>
                <label className="label-sm">Change Reason (Required for Audit Trail)</label>
                <input
                  className="input-premium"
                  value={editFactForm.reason || ''}
                  onChange={(e) => setEditFactForm({ ...editFactForm, reason: e.target.value })}
                  placeholder="e.g. Updated SLA benchmark from recent SOC2 audit"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setEditingFact(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm" disabled={busy}>
                  {busy ? 'Saving…' : 'Save Fact Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Judge Interactive Walkthrough Modal */}
      {/* Canonical Judge Tour Modal */}
      <JudgeTourModal
        isOpen={isTourModalOpen}
        onClose={() => {
          setIsTourModalOpen(false);
          if (onTourClosed) onTourClosed();
        }}
        onNavigate={(stepView) => {
          setView(stepView as any);
          setIsTourModalOpen(false);
        }}
      />

      {/* Canonical Judge Access Modal */}
      <JudgeAccessModal
        isOpen={isJudgeAccessOpen}
        onClose={() => setIsJudgeAccessOpen(false)}
        initialRole={role}
        onEnterWorkspaceWithRole={(newRole) => {
          handleRoleChange(newRole);
          setIsJudgeAccessOpen(false);
        }}
      />

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
              <div>
                <label className="label-sm">Provenance & Review Notes (Optional)</label>
                <textarea
                  className="input-premium"
                  value={newFact.notes || ''}
                  onChange={(e) => setNewFact({ ...newFact, notes: e.target.value })}
                  placeholder="Auditor provenance notes, scope limitations, or third-party audit details..."
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

      {/* Canonical Data Processing Notice Modal */}
      {isTermsOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 23, 16, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'grid',
            placeContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsTermsOpen(false)}
        >
          <div
            className="bt-terms-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={20} style={{ color: '#0E9F78' }} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--bt-forest)' }}>
                  Data Processing Notice
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9A91', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14, fontSize: 13, color: '#334155', lineHeight: 1.55 }}>
              <div style={{ background: '#F8FAF8', border: '1px solid #DCE5DF', borderRadius: 8, padding: 12 }}>
                <strong style={{ color: 'var(--bt-forest)', display: 'block', marginBottom: 2 }}>1. Processing on Request</strong>
                Documents are sent to external AI services only when you explicitly select an optional AI feature. If disabled, all processing remains strictly internal and deterministic.
              </div>

              <div style={{ background: '#F8FAF8', border: '1px solid #DCE5DF', borderRadius: 8, padding: 12 }}>
                <strong style={{ color: 'var(--bt-forest)', display: 'block', marginBottom: 2 }}>2. Document Purpose</strong>
                Your content is processed solely to generate compliance suggestions, text extraction and document summaries. It is never used to train foundational AI models.
              </div>

              <div style={{ background: '#F8FAF8', border: '1px solid #DCE5DF', borderRadius: 8, padding: 12 }}>
                <strong style={{ color: 'var(--bt-forest)', display: 'block', marginBottom: 2 }}>3. Rule Engine Independence</strong>
                Rule compliance decisions are always evaluated by our local governance engine, not by external models. AI suggestions are strictly advisory.
              </div>

              <div style={{ background: '#F8FAF8', border: '1px solid #DCE5DF', borderRadius: 8, padding: 12 }}>
                <strong style={{ color: 'var(--bt-forest)', display: 'block', marginBottom: 2 }}>4. Data Retention</strong>
                Data is processed in accordance with enterprise data protection standards and the external provider&apos;s data retention policies, with zero persistent storage of confidential document payload.
              </div>

              <div style={{ background: '#F8FAF8', border: '1px solid #DCE5DF', borderRadius: 8, padding: 12 }}>
                <strong style={{ color: 'var(--bt-forest)', display: 'block', marginBottom: 2 }}>5. Personal Document Privacy</strong>
                Resumes, CVs and personal documents are automatically scoped to prevent inappropriate marketing rule checks and protect sensitive personal information.
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                type="button"
                className="btn-primary btn-sm"
                style={{ minHeight: 36, padding: '0 20px' }}
                onClick={() => setIsTermsOpen(false)}
              >
                Close
              </button>
            </div>
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
    return <p style={{ color: '#8A9A91', fontSize: 13, margin: '14px 0' }}>No review records found.</p>;
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
            border: '1px solid #DCE5DF',
            borderRadius: 8,
            background: '#F8FAF8',
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
            (e.currentTarget as HTMLElement).style.borderColor = '#DCE5DF';
            (e.currentTarget as HTMLElement).style.background = '#F8FAF8';
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: '#8A9A91', marginTop: 2 }}>
              {new Date(r.created_at).toLocaleString()} · {r.content_type}
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#617168' }}>{r.findings?.length || 0} findings</span>
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
  currentRole = 'reviewer',
}: {
  review: Review | null;
  onFindingAction: (f: EvidenceFinding, action: string, customReplacement?: string, customReason?: string) => Promise<boolean>;
  reason: string;
  setReason: (val: string) => void;
  manualEdit: string;
  setManualEdit: (val: string) => void;
  editingFindingId: string | null;
  setEditingFindingId: (id: string | null) => void;
  onApproval: (action: 'approve' | 'request_changes' | 'waive', customReason?: string) => Promise<boolean>;
  onRestoreVersion: (versionId: string) => void;
  currentRole?: UserRole;
}) {
  const [activeTab, setActiveTab] = useState<'findings' | 'preview' | 'ai_summary' | 'versions'>('findings');
  const [filter, setFilter] = useState<'all' | 'high_critical' | 'needs_review' | 'resolved'>('all');
  const [copyNotice, setCopyNotice] = useState(false);
  const [dismissPromptId, setDismissPromptId] = useState<string | null>(null);
  const [inlineDismissReason, setInlineDismissReason] = useState('');
  const [dismissError, setDismissError] = useState('');
  const [placementFindingId, setPlacementFindingId] = useState<string | null>(null);
  const [customPlacementText, setCustomPlacementText] = useState('');
  const [inlineEditReason, setInlineEditReason] = useState('');
  const [inlineEditError, setInlineEditError] = useState('');
  const [savingFindingId, setSavingFindingId] = useState<string | null>(null);
  const [isRequestChangesOpen, setIsRequestChangesOpen] = useState(false);
  const [requestChangesNotes, setRequestChangesNotes] = useState('');
  const [requestChangesError, setRequestChangesError] = useState('');
  const [isWaiveDialogOpen, setIsWaiveDialogOpen] = useState(false);
  const [waiveReasonText, setWaiveReasonText] = useState('');
  const [waiveError, setWaiveError] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);

  if (!review) {
    return (
      <div className="card-premium" style={{ display: 'grid', placeContent: 'center', textAlign: 'center', minHeight: 400 }}>
        <div style={{ fontSize: 40, color: '#2dd4bf', marginBottom: 12 }}>◈</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Evidence Findings & Governance Panel</h2>
        <p style={{ color: '#617168', fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
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
            <span style={{ fontSize: 11, color: '#8A9A91', fontWeight: 700 }}>ID: {review.id}</span>
            <StatusBadge value={review.status} />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{review.title}</h2>
          <div style={{ fontSize: 12, color: '#617168', marginTop: 4 }}>
            Submitted by {review.author} · Method: <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{formatMethodLabel(review.analysis_method)}</span>
          </div>

          {/* Document Intelligence Metadata Badges */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <span style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
              SCOPE: {(review.document_type || review.content_type || 'general_document').toUpperCase()}
            </span>
            <span style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
              FORMAT: {(review.file_format || 'text').toUpperCase()}
            </span>
            {review.ocr_applied && (
              <span style={{ background: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                ⚡ AI-ASSISTED TEXT EXTRACTION
              </span>
            )}
            {review.ai_analysis_applied && (
              <span style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                ✨ OPTIONAL AI INSIGHTS
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{review.score}</div>
          <div style={{ fontSize: 11, color: '#8A9A91', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
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

      {/* Segmented Workspace Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #DCE5DF', paddingBottom: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn-secondary btn-sm ${activeTab === 'findings' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('findings')}
        >
          Compliance Findings ({totalFindings})
        </button>
        <button
          type="button"
          className={`btn-secondary btn-sm ${activeTab === 'preview' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          Extracted Document Text
        </button>
        {(review.document_summary || review.ai_analysis_applied) && (
          <button
            type="button"
            className={`btn-secondary btn-sm ${activeTab === 'ai_summary' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('ai_summary')}
          >
            Additional AI insights
          </button>
        )}
        <button
          type="button"
          className={`btn-secondary btn-sm ${activeTab === 'versions' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          Draft Revisions ({review.versions?.length || 1})
        </button>
      </div>

      {activeTab === 'findings' && (
        <>
          {/* Approval Blocker Warning Banner */}
          {unresolvedHigh.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                color: '#991B1B',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
              <div style={{ flex: 1, color: '#991B1B' }}>
                <strong style={{ color: '#7F1D1D', fontWeight: 700 }}>Approval Gate Locked:</strong>{' '}
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
              background: '#F8FAF8',
              border: '1px solid #DCE5DF',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: '#8A9A91', textTransform: 'uppercase', fontWeight: 600 }}>Total Findings</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--bt-forest)' }}>{totalFindings}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', fontWeight: 600 }}>High / Critical</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: unresolvedHigh.length > 0 ? '#f87171' : '#86efac' }}>
                {unresolvedHigh.length} <span style={{ fontSize: 11, fontWeight: 500, color: '#8A9A91' }}>open ({highCriticalFindings.length})</span>
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
            <span style={{ fontSize: 11, color: '#8A9A91', fontWeight: 700, textTransform: 'uppercase', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
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
          <div style={{ background: '#F8FAF8', borderRadius: 8, padding: '14px 18px', border: '1px solid #DCE5DF', marginBottom: 18 }}>
            <div className="label-sm">Current Working Draft Content</div>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--bt-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
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
                background: '#F8FAF8',
                borderRadius: 8,
                border: '1px dashed #DCE5DF',
                color: '#617168',
                marginBottom: 16,
              }}
            >
              <Filter size={24} style={{ color: '#8A9A91', margin: '0 auto 8px' }} />
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
                            {f.category === 'visual_palette' && (
                              <span style={{ background: '#E9F6F0', color: '#0E9F78', border: '1px solid #A6CDBA', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                🎨 PALETTE
                              </span>
                            )}
                            {f.category === 'visual_accessibility' && (
                              <span style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                ♿ CONTRAST
                              </span>
                            )}
                            {f.category === 'visual_asset' && (
                              <span style={{ background: '#F0F9FF', color: '#075985', border: '1px solid #BAE6FD', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                🖼️ ASSET REGISTRY
                              </span>
                            )}
                            {isMissingTerm && (
                              <span style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #7DD3FC', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                MISSING MANDATORY TERM
                              </span>
                            )}
                            {f.disposition && <StatusBadge value={f.disposition} />}
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#2dd4bf', background: '#E9F6F0', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                              {formatMethodLabel(f.analysis_method)}
                            </span>
                          </div>

                          {isMissingTerm ? (
                            <div style={{ background: '#F0F9FF', border: '1px dashed #38bdf8', borderRadius: 8, padding: '10px 14px', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', flexShrink: 0, boxShadow: '0 0 6px #38bdf8' }} />
                              <div style={{ fontSize: 13, color: '#0369a1' }}>
                                Required brand language absent from copy: <strong style={{ color: '#075985' }}>“{f.passage}”</strong>
                              </div>
                            </div>
                          ) : (
                            <div className={`finding-passage ${f.status.toLowerCase().includes('contradicted') ? 'contradicted' : f.status.toLowerCase().includes('outdated') ? 'outdated' : f.status.toLowerCase().includes('supported') && !f.status.toLowerCase().includes('un') ? 'supported' : ''}`}>
                              “{f.passage}”
                            </div>
                          )}

                          <p style={{ color: '#617168', fontSize: 14, lineHeight: 1.6, margin: '8px 0' }}>
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

                          {/* Explainable Decision Chain Visualization */}
                          <EvidenceDecisionChain finding={f} />

                          {/* Intent-Preserving Suggested Correction or Missing Term Placement */}
                          {isMissingTerm ? (
                            <div
                              style={{
                                marginTop: 12,
                                background: '#F0F9FF',
                                border: '1px solid #BAE6FD',
                                borderRadius: 8,
                                padding: '12px 14px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                                <div>
                                  <div style={{ fontSize: 11, color: '#0369A1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Required Brand Term Placement
                                  </div>
                                  <div style={{ fontSize: 13, marginTop: 4, color: 'var(--bt-text-secondary)' }}>
                                    Mandatory term <strong style={{ color: '#075985' }}>“{f.passage}”</strong> must appear in published copy.
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
                                background: '#E9F6F0',
                                border: '1px solid #A6CDBA',
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
                                <div style={{ fontSize: 11, color: '#0E9F78', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Intent-Preserving Correction
                                </div>
                                <div style={{ fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ textDecoration: 'line-through', color: '#f87171' }}>“{f.passage}”</span>
                                  <span style={{ color: '#8A9A91' }}>→</span>
                                  <span style={{ color: '#0B8262', fontWeight: 700 }}>“{f.suggested_correction}”</span>
                                </div>
                              </div>
                              {!f.disposition && editingFindingId !== f.id && (
                                <button
                                  type="button"
                                  className="btn-primary btn-sm"
                                  disabled={Boolean(savingFindingId) || Boolean(f.disposition)}
                                  onClick={async () => {
                                    setSavingFindingId(f.id);
                                    try {
                                      await onFindingAction(f, 'accept');
                                    } finally {
                                      setSavingFindingId(null);
                                    }
                                  }}
                                  style={{ padding: '6px 14px', fontSize: 12, minHeight: 34 }}
                                >
                                  {savingFindingId === f.id ? 'Applying…' : <><Check size={13} /> Accept Replacement</>}
                                </button>
                              )}
                            </div>
                          ) : null}

                          {/* Inline Dismiss Prompt when reason is missing */}
                          {dismissPromptId === f.id && (
                            <div style={{ marginTop: 12, background: '#FEF2F2', padding: 14, borderRadius: 8, border: '1px solid #FCA5A5' }}>
                              <div className="label-sm" style={{ color: '#991B1B' }}>
                                Document Justification to Dismiss Finding
                              </div>
                              <input
                                className="input-premium"
                                value={inlineDismissReason}
                                onChange={(e) => {
                                  setInlineDismissReason(e.target.value);
                                  setDismissError('');
                                }}
                                placeholder="e.g. Approved exception supported by source; context-specific rule does not apply"
                                style={{ marginTop: 6 }}
                              />
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                <span style={{ fontSize: 11, color: '#7F1D1D', fontWeight: 600 }}>Standard exceptions:</span>
                                {[
                                  'Approved exception supported by source',
                                  'Context-specific rule does not apply',
                                  'Evidence reviewed and confirmed applicable exception',
                                ].map((sample) => (
                                  <button
                                    key={sample}
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    style={{ fontSize: 11, padding: '2px 8px', minHeight: 24, background: '#FFF' }}
                                    onClick={() => {
                                      setInlineDismissReason(sample);
                                      setDismissError('');
                                    }}
                                  >
                                    {sample}
                                  </button>
                                ))}
                              </div>
                              {dismissError && (
                                <div style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 500 }}>
                                  {dismissError}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button
                                  type="button"
                                  className="btn-danger btn-sm"
                                  disabled={savingFindingId === f.id}
                                  onClick={async () => {
                                    const reasonText = inlineDismissReason.trim();
                                    if (!reasonText) {
                                      setDismissError('Please provide a documented reason before dismissing this finding.');
                                      return;
                                    }
                                    setSavingFindingId(f.id);
                                    setDismissError('');
                                    try {
                                      const success = await onFindingAction(f, 'dismiss', undefined, reasonText);
                                      if (success) {
                                        setDismissPromptId(null);
                                        setInlineDismissReason('');
                                      }
                                    } catch (err) {
                                      setDismissError((err as Error).message);
                                    } finally {
                                      setSavingFindingId(null);
                                    }
                                  }}
                                >
                                  {savingFindingId === f.id ? 'Dismissing…' : 'Confirm Dismissal'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  disabled={savingFindingId === f.id}
                                  onClick={() => {
                                    setDismissPromptId(null);
                                    setInlineDismissReason('');
                                    setDismissError('');
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Manual Edit Input Box */}
                          {editingFindingId === f.id && (
                            <div style={{ marginTop: 12, background: '#F8FAF8', padding: 16, borderRadius: 8, border: '1px solid #DCE5DF' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div className="label-sm" style={{ margin: 0 }}>
                                  {isMissingTerm ? `Update Draft to Include Required Term “${f.passage}”` : `Edit Working Draft to Resolve “${f.passage}”`}
                                </div>
                                {f.suggested_correction && manualEdit.includes(f.passage) && (
                                  <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    style={{ fontSize: 11, padding: '2px 8px', minHeight: 24 }}
                                    onClick={() => {
                                      setManualEdit(manualEdit.replace(f.passage, f.suggested_correction || ''));
                                      setInlineEditError('');
                                    }}
                                  >
                                    <Sparkles size={11} /> Pre-apply Correction: “{f.suggested_correction}”
                                  </button>
                                )}
                              </div>
                              <textarea
                                className="input-premium"
                                value={manualEdit}
                                onChange={(e) => {
                                  setManualEdit(e.target.value);
                                  setInlineEditError('');
                                }}
                                placeholder="Edit draft content to resolve compliance issue"
                                style={{ marginTop: 4, minHeight: 120, width: '100%', fontSize: 13, lineHeight: 1.5 }}
                              />
                              <div style={{ marginTop: 10 }}>
                                <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>
                                  Remediation Reason / Audit Note (Required)
                                </label>
                                <input
                                  className="input-premium"
                                  value={inlineEditReason}
                                  onChange={(e) => {
                                    setInlineEditReason(e.target.value);
                                    setInlineEditError('');
                                  }}
                                  placeholder="e.g. Revised working draft to remove unapproved superlative"
                                  style={{ width: '100%' }}
                                />
                              </div>
                              {inlineEditError && (
                                <div style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 500 }}>
                                  {inlineEditError}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button
                                  type="button"
                                  className="btn-primary btn-sm"
                                  disabled={savingFindingId === f.id || !manualEdit.trim()}
                                  onClick={async () => {
                                    if (!manualEdit.trim()) {
                                      setInlineEditError('Draft content cannot be empty.');
                                      return;
                                    }
                                    const reasonToUse = inlineEditReason.trim() || reason.trim();
                                    if (!reasonToUse) {
                                      setInlineEditError('A documented reason is required when editing a finding.');
                                      return;
                                    }
                                    setSavingFindingId(f.id);
                                    setInlineEditError('');
                                    try {
                                      const success = await onFindingAction(f, 'edit', manualEdit.trim(), reasonToUse);
                                      if (success) {
                                        setEditingFindingId(null);
                                        setManualEdit('');
                                        setInlineEditReason('');
                                      }
                                    } catch (err) {
                                      setInlineEditError((err as Error).message);
                                    } finally {
                                      setSavingFindingId(null);
                                    }
                                  }}
                                >
                                  {savingFindingId === f.id ? 'Applying Edit…' : 'Apply Edit'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary btn-sm"
                                  disabled={savingFindingId === f.id}
                                  onClick={() => {
                                    setEditingFindingId(null);
                                    setManualEdit('');
                                    setInlineEditReason('');
                                    setInlineEditError('');
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Finding Action Buttons */}
                          {!f.disposition && editingFindingId !== f.id && dismissPromptId !== f.id && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid #DCE5DF' }}>
                              {isMissingTerm ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn-primary btn-sm"
                                    disabled={Boolean(savingFindingId)}
                                    onClick={async () => {
                                      setSavingFindingId(f.id);
                                      try {
                                        await onFindingAction(f, 'insert');
                                      } finally {
                                        setSavingFindingId(null);
                                      }
                                    }}
                                  >
                                    <Plus size={14} /> Insert Term
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    disabled={Boolean(savingFindingId)}
                                    onClick={() => {
                                      setEditingFindingId(f.id);
                                      setManualEdit(review.content);
                                      setInlineEditReason(`Placed required term '${f.passage}' in draft`);
                                      setInlineEditError('');
                                    }}
                                  >
                                    <Edit3 size={14} /> Edit Draft to Place Term
                                  </button>
                                </>
                              ) : (
                                <>
                                  {f.suggested_correction && (
                                    <button
                                      type="button"
                                      className="btn-primary btn-sm"
                                      disabled={Boolean(savingFindingId)}
                                      onClick={async () => {
                                        setSavingFindingId(f.id);
                                        try {
                                          await onFindingAction(f, 'accept');
                                        } finally {
                                          setSavingFindingId(null);
                                        }
                                      }}
                                    >
                                      {savingFindingId === f.id ? 'Applying…' : <><Check size={14} /> Accept Replacement</>}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    disabled={Boolean(savingFindingId)}
                                    onClick={() => {
                                      setEditingFindingId(f.id);
                                      setManualEdit(review.content);
                                      setInlineEditReason(
                                        f.suggested_correction
                                          ? `Replace '${f.passage}' with '${f.suggested_correction}'`
                                          : `Revised draft to address finding on '${f.passage}'`
                                      );
                                      setInlineEditError('');
                                    }}
                                  >
                                    <Edit3 size={14} /> Edit Manually
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                disabled={Boolean(savingFindingId) || currentRole === 'creator'}
                                title={currentRole === 'creator' ? 'Creators cannot dismiss compliance findings' : 'Document justification to dismiss finding'}
                                onClick={() => {
                                  setDismissPromptId(f.id);
                                  setInlineDismissReason(reason.trim());
                                  setDismissError('');
                                }}
                              >
                                <X size={14} /> Dismiss with Reason
                              </button>
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                disabled={Boolean(savingFindingId) || currentRole === 'auditor'}
                                title={currentRole === 'auditor' ? 'Auditors have read-only access' : 'Escalate finding to brand leadership'}
                                onClick={async () => {
                                  setSavingFindingId(f.id);
                                  try {
                                    await onFindingAction(f, 'escalate');
                                  } finally {
                                    setSavingFindingId(null);
                                  }
                                }}
                              >
                                {savingFindingId === f.id ? 'Escalating…' : <><ArrowUpRight size={14} /> Escalate</>}
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
              flexDirection: 'column',
              gap: 16,
              borderTop: '1px solid #DCE5DF',
              paddingTop: 20,
              marginTop: 24,
            }}
          >
            {/* Request Changes Section (when active) */}
            {isRequestChangesOpen && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#92400E' }}>
                    Request Changes from Content Creator
                  </h4>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setIsRequestChangesOpen(false);
                      setRequestChangesNotes('');
                      setRequestChangesError('');
                    }}
                    style={{ minHeight: 26, padding: '2px 8px' }}
                  >
                    <X size={13} />
                  </button>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#78350F' }}>
                  Provide clear remediation notes and required adjustments before this draft can be approved.
                </p>
                <textarea
                  className="input-premium"
                  rows={3}
                  value={requestChangesNotes}
                  onChange={(e) => {
                    setRequestChangesNotes(e.target.value);
                    setRequestChangesError('');
                  }}
                  placeholder="e.g. Please replace superlative 'best' with evidence-backed claims and ensure required brand disclaimers are present."
                  style={{ width: '100%', fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}>Quick notes:</span>
                  {[
                    'Remove unverified superlatives and replace with verified evidence citations.',
                    'Include required brand name and approved legal disclaimer.',
                    'Contrast ratio does not meet WCAG AA requirements; adjust color palette.',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px', minHeight: 24, background: '#FFF' }}
                      onClick={() => {
                        setRequestChangesNotes(sample);
                        setRequestChangesError('');
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
                {requestChangesError && (
                  <div style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 500 }}>
                    {requestChangesError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={approvalBusy}
                    onClick={async () => {
                      const notes = requestChangesNotes.trim();
                      if (!notes) {
                        setRequestChangesError('Please provide explanation or remediation notes for the creator.');
                        return;
                      }
                      setApprovalBusy(true);
                      setRequestChangesError('');
                      try {
                        const success = await onApproval('request_changes', notes);
                        if (success) {
                          setIsRequestChangesOpen(false);
                          setRequestChangesNotes('');
                        }
                      } finally {
                        setApprovalBusy(false);
                      }
                    }}
                    style={{ fontWeight: 600 }}
                  >
                    {approvalBusy ? 'Submitting…' : 'Submit Changes Request'}
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    disabled={approvalBusy}
                    onClick={() => {
                      setIsRequestChangesOpen(false);
                      setRequestChangesNotes('');
                      setRequestChangesError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Waive with Reason Section (when active) */}
            {isWaiveDialogOpen && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#991B1B' }}>
                    Governance Policy Waiver Sign-off
                  </h4>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setIsWaiveDialogOpen(false);
                      setWaiveReasonText('');
                      setWaiveError('');
                    }}
                    style={{ minHeight: 26, padding: '2px 8px' }}
                  >
                    <X size={13} />
                  </button>
                </div>
                {unresolvedHigh.length > 0 ? (
                  <div style={{ background: '#FFF', border: '1px solid #FCA5A5', borderRadius: 6, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#991B1B' }}>
                    <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4, color: '#DC2626' }} />
                    <strong>Waiver Blocked:</strong> Approval policy requires that {unresolvedHigh.length} high-risk finding{unresolvedHigh.length > 1 ? 's' : ''} have individual exceptions documented before review-level waiver can be granted.
                  </div>
                ) : (
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#7F1D1D' }}>
                    A governance waiver signs off this draft despite open warnings and records an immutable audit log entry.
                  </p>
                )}
                <label className="label-sm" style={{ color: '#991B1B' }}>
                  Document Justification / Executive Exemption Authority (Required)
                </label>
                <textarea
                  className="input-premium"
                  rows={3}
                  value={waiveReasonText}
                  onChange={(e) => {
                    setWaiveReasonText(e.target.value);
                    setWaiveError('');
                  }}
                  placeholder="e.g. Executive exemption granted by VP Brand Marketing under quarterly partnership agreement."
                  style={{ width: '100%', fontSize: 13, marginTop: 4 }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 600 }}>Standard waiver authorities:</span>
                  {[
                    'Executive exception authorized by VP of Brand Marketing',
                    'Time-critical regulatory filing under approved compliance exemption',
                    'Partner co-branding contract overrides standard phraseology rules',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px', minHeight: 24, background: '#FFF' }}
                      onClick={() => {
                        setWaiveReasonText(sample);
                        setWaiveError('');
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
                {waiveError && (
                  <div style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 500 }}>
                    {waiveError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    disabled={approvalBusy || unresolvedHigh.length > 0}
                    onClick={async () => {
                      const reasonText = waiveReasonText.trim();
                      if (!reasonText) {
                        setWaiveError('A documented reason is required for a governance waiver.');
                        return;
                      }
                      setApprovalBusy(true);
                      setWaiveError('');
                      try {
                        const success = await onApproval('waive', reasonText);
                        if (success) {
                          setIsWaiveDialogOpen(false);
                          setWaiveReasonText('');
                        }
                      } finally {
                        setApprovalBusy(false);
                      }
                    }}
                  >
                    {approvalBusy ? 'Submitting Waiver…' : 'Confirm Governance Waiver'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={approvalBusy}
                    onClick={() => {
                      setIsWaiveDialogOpen(false);
                      setWaiveReasonText('');
                      setWaiveError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {unresolvedHigh.length > 0 ? (
                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled
                    style={{
                      minHeight: 48,
                      opacity: 0.65,
                      cursor: 'not-allowed',
                      backgroundColor: '#F3F4F6',
                      borderColor: '#D1D5DB',
                      color: '#6B7280',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 600,
                    }}
                    title="Resolve all required HIGH and CRITICAL findings before approval."
                  >
                    <Lock size={16} style={{ color: '#DC2626' }} />
                    <span>Approval blocked &mdash; Resolve {unresolvedHigh.length} high-risk finding{unresolvedHigh.length > 1 ? 's' : ''}</span>
                  </button>
                  <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 500 }}>
                    Resolve all required HIGH and CRITICAL findings before approval.
                  </span>
                </div>
              ) : currentRole !== 'reviewer' && currentRole !== 'brand_admin' ? (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled
                  style={{ minHeight: 48, opacity: 0.65, cursor: 'not-allowed' }}
                  title="Reviewer or Brand Admin role required for approval decisions."
                >
                  <Lock size={16} /> Approval requires Reviewer / Admin
                </button>
              ) : review.status === 'APPROVED' ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled
                  style={{ minHeight: 48, background: '#0E9F78', borderColor: '#0E9F78', opacity: 0.9 }}
                >
                  <CheckCircle size={16} /> Approved for Publication
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    setApprovalBusy(true);
                    try {
                      await onApproval('approve');
                    } finally {
                      setApprovalBusy(false);
                    }
                  }}
                  disabled={approvalBusy}
                  style={{ minHeight: 48 }}
                  title="Approve draft for publication hand-off"
                >
                  {approvalBusy ? 'Approving…' : <><CheckCircle size={16} /> Approve Review</>}
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setIsRequestChangesOpen(true);
                  setIsWaiveDialogOpen(false);
                }}
                disabled={approvalBusy || (currentRole !== 'reviewer' && currentRole !== 'brand_admin')}
                style={{ minHeight: 48 }}
              >
                Request Changes
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  setIsWaiveDialogOpen(true);
                  setIsRequestChangesOpen(false);
                }}
                disabled={approvalBusy || (currentRole !== 'reviewer' && currentRole !== 'brand_admin')}
                style={{ minHeight: 48 }}
              >
                Waive with Reason
              </button>
            </div>
          </footer>
        </>
      )}

      {/* Segment: Extracted Document Text Preview */}
      {activeTab === 'preview' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAF8', padding: '12px 16px', borderRadius: 8, border: '1px solid #DCE5DF', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8A9A91', textTransform: 'uppercase' }}>Extraction Provenance</div>
              <div style={{ fontSize: 13, color: 'var(--bt-forest)', marginTop: 2, fontWeight: 600 }}>
                {review.ocr_applied
                  ? `Processed via AI-assisted OCR (${formatMethodLabel(review.ocr_method)})`
                  : review.file_format === 'pdf'
                  ? 'Extracted via direct digital text engine'
                  : 'Ingested via direct draft editor'}
                {' · '}{review.content.length} characters ({review.content.split(/\s+/).filter(Boolean).length} words)
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(review.content);
                setCopyNotice(true);
                setTimeout(() => setCopyNotice(false), 2000);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {copyNotice ? <><Check size={14} /> Copied to Clipboard!</> : <><Copy size={14} /> Copy Document Text</>}
            </button>
          </div>

          <div className="bt-extracted-text-box">
            {review.content}
          </div>
        </div>
      )}

      {/* Segment: Additional AI insights */}
      {activeTab === 'ai_summary' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="bt-advisory-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
                <strong style={{ fontSize: 15, color: '#15803D' }}>Additional AI Insights</strong>
              </div>
              <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                AI-generated · Advisory only
              </span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
              These insights are generated by AI to help you review the document. Rule compliance decisions are determined separately by the governance engine.
            </p>
            <div style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: 8, padding: '14px 18px', color: '#14532D', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {review.document_summary || 'No advisory insights generated for this document.'}
            </div>
          </div>
        </div>
      )}

      {/* Segment: Draft Revisions History */}
      {activeTab === 'versions' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {review.versions?.map((v) => (
            <div
              key={v.id}
              style={{
                border: '1px solid #DCE5DF',
                padding: '16px 20px',
                borderRadius: 10,
                background: '#F8FAF8',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bt-forest)' }}>Revision: {v.reason}</div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => onRestoreVersion(v.id)}
                >
                  <RotateCcw size={14} /> Restore This Revision
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#8A9A91', marginTop: 4 }}>
                Created by {v.created_by} at {new Date(v.created_at).toLocaleString()}
              </div>
              <p style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: 'var(--bt-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
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
          <p style={{ color: '#8A9A91', fontSize: 13 }}>No review records found. Submit a draft first.</p>
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
                  border: `1px solid ${selected?.id === r.id ? 'rgba(14,159,120,0.5)' : '#DCE5DF'}`,
                  borderRadius: 8,
                  background: selected?.id === r.id ? '#E9F6F0' : '#F8FAF8',
                  color: '#e8f0f8',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: selected?.id === r.id ? '#2dd4bf' : '#e8f0f8' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#8A9A91', marginTop: 2 }}>
                    {new Date(r.created_at).toLocaleString()} &middot; {r.content_type}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#617168' }}>{r.findings?.length || 0} findings</span>
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
          <p style={{ color: '#8A9A91', fontSize: 13 }}>
            Select a review record from the left to inspect its append-only audit timeline during retained workspace lifecycle.
          </p>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#617168' }}>
            <RefreshCw size={28} style={{ color: '#2dd4bf', marginBottom: 12 }} />
            <p style={{ fontSize: 13 }}>Loading audit trail&hellip;</p>
          </div>
        ) : auditError ? (
          <div className="toast-error" style={{ margin: '14px 0' }}>
            <AlertCircle size={16} /> Failed to load audit trail: {auditError}
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A9A91' }}>
            <Clock size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No audit events recorded for this review yet.</p>
          </div>
        ) : (
          <div>
            <div className="section-eyebrow" style={{ marginBottom: 12 }}>
              APPEND-ONLY AUDIT TRAIL FOR {selected.id}
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
                          color: '#0E9F78',
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
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--bt-text-secondary)' }}>
                        Documented Reason: &ldquo;{e.reason}&rdquo;
                      </p>
                    )}
                    {e.details && (
                      <div style={{ fontSize: 11, color: '#8A9A91', marginTop: 2 }}>
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
  guidelineHealth = [],
  acceptedSuggestions = {},
  role,
  onRuleSuggestionAction,
  onActivateSuggestion,
  onTriggerReReview,
  onNavigateToDraft,
}: {
  insights: Insights | null;
  impactMap: ImpactMap | null;
  guidelineHealth?: GuidelineHealthItem[];
  acceptedSuggestions?: Record<string, RuleSuggestion>;
  role: UserRole;
  onRuleSuggestionAction?: (ruleId: string, action: 'accept' | 'defer' | 'reject') => void;
  onActivateSuggestion?: (ruleId: string) => void;
  onTriggerReReview: (id: string) => void;
  onNavigateToDraft?: (reviewId: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { title: 'Open Findings', value: insights?.unresolved || 0, hint: 'Need reviewer action', color: '#fbbf24' },
          { title: 'Dismissals', value: insights?.dismissed || 0, hint: 'Documented exceptions', color: '#0E9F78' },
          { title: 'Disagreements', value: insights?.disagreements_count || 0, hint: 'Reviewer overrides', color: '#f87171' },
          { title: 'Impacted Drafts', value: impactMap?.total_impacted_drafts || 0, hint: 'Rule/fact changes', color: '#2dd4bf' },
        ].map(({ title, value, hint, color }) => (
          <div key={title} className="metric-card apple-card">
            <div className="metric-label">{title}</div>
            <div className="metric-value" style={{ color }}>{value}</div>
            <div className="metric-sub">{hint}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div className="card-premium apple-card">
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Recurring Policy Findings</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#617168' }}>
            Most frequently violated rule categories across historical drafts.
          </p>
          <Bars values={insights?.recurring || []} />
        </div>

        <div className="card-premium apple-card">
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Candidate Rules for Clarification</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#617168' }}>
            Rules with high triage or dismissal rates suggesting ambiguous guidelines.
          </p>
          <Bars values={insights?.unclear_rules || []} />
        </div>
      </div>

      {/* Guideline Health Intelligence (Round 3 Commitment 3) */}
      <GuidelineHealthMeters
        guidelineHealth={guidelineHealth}
        acceptedSuggestions={acceptedSuggestions}
        role={role}
        onRuleSuggestionAction={onRuleSuggestionAction}
        onActivateSuggestion={onActivateSuggestion}
      />

      {/* Time-Aware Claim Ledger & Rule-Change Impact Map */}
      <InteractiveImpactGraph
        impactMap={impactMap}
        onTriggerReReview={onTriggerReReview}
        onNavigateToDraft={onNavigateToDraft}
      />
    </div>
  );
}

function HelpWalkthroughView({
  onLoadDemo,
  onResetDemo,
  isHostedEnvironment,
}: {
  onLoadDemo: () => void;
  onResetDemo?: () => void;
  isHostedEnvironment?: boolean;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="card-premium" style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', lineHeight: 1.6 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#0B1E17' }}>
            Judge Evaluation Walkthrough &mdash; Verification Script
          </h2>
          <p style={{ color: '#617168', fontSize: 14, margin: 0 }}>
            Welcome to the BRANDTRACE governance workspace. Follow this step-by-step verification script to test
            all core capabilities without requiring an external AI API key:
          </p>
        </div>

        {/* Demo Environment Notice & Reset Control */}
        <div
          style={{
            background: 'rgba(13, 148, 136, 0.08)',
            border: '1px solid rgba(45, 212, 191, 0.3)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0E9F78', letterSpacing: '0.04em', marginBottom: 4 }}>
              FICTIONAL DEMO ENVIRONMENT
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#52635B' }}>
              All workspace data, brand rules, facts, and reviews are fictional demonstration records.
              No real organisation data is used. Demo role simulation changes client request headers with server-enforced RBAC.
            </p>
          </div>

          {onResetDemo ? (
            confirmReset ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#991B1B', fontWeight: 600 }}>Reset all records?</span>
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
          ) : isHostedEnvironment ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(21, 37, 30, 0.05)',
                border: '1px solid rgba(21, 37, 30, 0.12)',
                fontSize: 12,
                color: '#617168',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <Shield size={14} style={{ color: '#0E9F78' }} />
              <span>Hosted Staging &bull; Reset Restricted to Local Demo</span>
            </div>
          ) : null}
        </div>

        {/* Balanced 2-Column Responsive Walkthrough Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            {
              step: '1',
              title: 'Brand Constitution & Claim Ledger',
              desc: 'Inspect active rules (prohibited phrases, required platform capitalization, forbidden terms) and the approved fact ledger with explicit effective and expiration dates.',
            },
            {
              step: '2',
              title: 'Submit Test Draft with Intentional Violations',
              desc: 'Load a pre-built announcement draft containing prohibited superlatives ("best"), forbidden terms ("cheap"), and absolute assertions ("always").',
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
              title: 'Test Server-Side Approval Gate (HTTP 409)',
              desc: 'Try clicking Approve Review before resolving high-risk findings. The backend returns a strict HTTP 409 Conflict preventing premature publication sign-off.',
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#15251E' }}>{title}</div>
                <p style={{ margin: '6px 0 0', color: '#617168', fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
                {action}
              </div>
            </div>
          ))}
        </div>

        {/* Technical Disclosures Card */}
        <div
          style={{
            borderTop: '1px solid #DCE5DF',
            paddingTop: 20,
          }}
        >
          <div className="section-eyebrow" style={{ marginBottom: 12 }}>Technical Disclosures</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 12,
              fontSize: 13,
              color: '#617168',
            }}
          >
            <div>&bull; Automated regression test suites are executed in offline CI pipelines; runtime UI displays live backend connectivity and readiness rather than static test counters.</div>
            <div>&bull; Deterministic policy checks run first; AI triage is additive and optional.</div>
            <div>&bull; No external API key required for core demo &mdash; deterministic rule matching and offline analysis cover primary governance workflows.</div>
            <div>&bull; Demo role simulation changes client request headers (X-Demo-Role); backend authorization checks remain strictly enforced.</div>
            <div>&bull; Digital PDF text extraction supported; raster OCR and semantic logo recognition are not supported (Option B transparent notice).</div>
          </div>
        </div>
      </div>
    </div>
  );
}


function Bars({ values }: { values: { label: string; count: number }[] }) {
  const max = Math.max(...values.map((x) => x.count), 1);

  if (!values.length) {
    return <p style={{ color: '#8A9A91', fontSize: 13, margin: '12px 0' }}>No trend data recorded yet.</p>;
  }

  const humanizeLabel = (raw: string): string => {
    const map: Record<string, string> = {
      claim_triage: 'Claim Triage',
      forbidden_term: 'Forbidden Term',
      prohibited_phrase: 'Prohibited Phrase',
      verified_fact: 'Verified Fact',
      unsupported_by_approved_evidence: 'Unsupported by Evidence',
      needs_review: 'Needs Review',
      contradicted: 'Contradicted',
      outdated: 'Outdated / Expired',
      unsupported: 'Unsupported Claim',
    };
    const key = raw.toLowerCase().trim();
    if (map[key]) return map[key];
    return raw
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {values.map((x) => (
        <div
          key={x.label}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(160px, 190px) 1fr 36px',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: '#15251E',
              fontWeight: 600,
              wordBreak: 'break-word',
              lineHeight: 1.3,
            }}
            title={x.label}
          >
            {humanizeLabel(x.label)}
          </span>
          <div style={{ height: 8, background: '#F0F4F1', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #0E9F78, #2dd4bf)',
                width: `${(x.count / max) * 100}%`,
                borderRadius: 4,
              }}
            />
          </div>
          <strong style={{ fontSize: 13, color: '#123B2D', textAlign: 'right' }}>{x.count}</strong>
        </div>
      ))}
    </div>
  );
}

export default BrandtraceWorkspacePremium;
