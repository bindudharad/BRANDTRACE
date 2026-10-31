export type FindingStatus =
  | 'SUPPORTED'
  | 'CONTRADICTED'
  | 'OUTDATED'
  | 'UNSUPPORTED_BY_APPROVED_EVIDENCE'
  | 'NEEDS_REVIEW';

export type UserRole = 'creator' | 'reviewer' | 'brand_admin' | 'auditor';

export interface EvidenceFinding {
  id: string;
  review_id: string;
  category: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: FindingStatus;
  passage: string;
  explanation: string;
  suggested_correction?: string;
  source_id?: string;
  source_title?: string;
  source_excerpt?: string;
  source_version?: string;
  analysis_method: string;
  uncertainty?: string;
  disposition?: 'ACCEPTED_EDIT' | 'EDITED' | 'DISMISSED' | 'ESCALATED' | 'WAIVED';
  disposition_reason?: string;
  disposition_by?: string;
  disposition_at?: string;
}

export interface DraftVersion {
  id: string;
  review_id: string;
  content: string;
  created_at: string;
  created_by: string;
  reason: string;
}

export interface Review {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  content_type: string;
  document_type?: string;
  file_format?: string;
  status: 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'WAIVED';
  score: number;
  author: string;
  reviewer?: string;
  file_name?: string;
  file_mime?: string;
  file_size?: number;
  ocr_applied?: boolean;
  ocr_method?: string;
  ai_consent_granted?: boolean;
  ai_analysis_applied?: boolean;
  document_summary?: string;
  analysis_method: string;
  rule_versions: string;
  assigned_to?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  due_date?: string;
  created_at: string;
  updated_at: string;
  findings: EvidenceFinding[];
  versions?: DraftVersion[];
}

export interface Rule {
  id: string;
  workspace_id?: string;
  title: string;
  category: string;
  kind: 'required_phrase' | 'prohibited_phrase' | 'approved_term' | 'forbidden_term' | 'tone_rule';
  pattern: string;
  requirement: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  version: string;
  status: 'APPROVED' | 'DRAFT' | 'RETIRED';
  owner: string;
  source_id?: string;
  source_title: string;
  source_excerpt: string;
  effective_at?: string;
  expires_at?: string;
  created_at?: string;
  notes?: string;
}

export interface Fact {
  id: string;
  workspace_id?: string;
  claim: string;
  value: string;
  owner: string;
  status: 'APPROVED' | 'DRAFT' | 'RETIRED';
  version: string;
  source_id?: string;
  source_title: string;
  source_excerpt: string;
  review_at?: string;
  effective_at?: string;
  expires_at?: string;
  created_at?: string;
  notes?: string;
}

export interface FactVersion {
  id: string;
  fact_id: string;
  version: string;
  claim: string;
  value: string;
  source_id?: string;
  source_title: string;
  source_excerpt: string;
  effective_at?: string;
  expires_at?: string;
  status: string;
  change_reason?: string;
  changed_by?: string;
  created_at: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
}

export interface ReadyStatus {
  status: string;
  database: string;
  elapsed_ms?: number;
  environment?: string;
  groq_configured?: boolean;
  groq_vision_model?: string;
  groq_text_model?: string;
  ocr_available?: boolean;
  digital_pdf_available?: boolean;
  image_analysis_available?: boolean;
}

export interface BrandProfile {
  id: string;
  workspace_id: string;
  brand_name: string;
  primary_color: string;
  secondary_color: string;
  accent_colors: string[];
  min_contrast_ratio: number;
  approved_logo_aspect?: number;
  updated_at: string;
}

export interface Overview {
  workspace: { id: string; name: string; demo_mode: boolean };
  reviews: Review[];
  metrics: Record<string, number>;
  brand_profile?: BrandProfile;
}

export interface AuditEntry {
  id: string;
  workspace_id: string;
  review_id: string;
  action: string;
  actor: string;
  actor_role: string;
  reason?: string;
  details?: string;
  created_at: string;
}

export interface Insights {
  recurring: Array<{ label: string; count: number }>;
  unresolved: number;
  dismissed: number;
  unclear_rules: Array<{ label: string; count: number }>;
  by_severity?: Record<string, number>;
  by_evidence_status?: Record<string, number>;
  disagreements_count?: number;
  active_rules_count?: number;
  draft_rules_count?: number;
  conflicting_rules_count?: number;
  duplicate_rules_count?: number;
  expired_facts_count?: number;
  approaching_expiry_facts_count?: number;
  rules_without_sources_count?: number;
  active_alerts_count?: number;
  evidence_sources_count?: number;
}

export interface ImpactItem {
  item_type: 'FACT' | 'RULE';
  item_id: string;
  item_title: string;
  status: string;
  expires_at?: string;
  expiry_date?: string;
  affected_review_ids: string[];
  affected_review_titles: string[];
  affected_drafts?: Array<{ id: string; title: string; status: string }>;
  affected_count?: number;
  re_review_urgency: 'URGENT' | 'RECOMMENDED' | 'INFORMATIONAL';
  reason?: string;
}

export interface BrandAsset {
  id: string;
  name: string;
  asset_type: string;
  content_hash?: string;
  source?: string;
  license_status: string;
  license_notes?: string;
  approval_status: string;
  workspace_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GuidelineHealthItem {
  rule_id: string;
  rule_title: string;
  rule_severity: string;
  affected_draft_count: number;
  finding_count: number;
  accepted_count: number;
  dismissed_count: number;
  escalated_count: number;
  waived_count: number;
  disagreement_detected: boolean;
  data_confidence: 'SUFFICIENT' | 'INSUFFICIENT';
  representative_finding_ids: string[];
  suggestion?: {
    observed_issue: string;
    proposed_clarification: string;
    ambiguity_addressed: string;
  };
}

export interface RuleSuggestion {
  id: string;
  rule_id: string;
  status: string;
  observed_issue?: string;
  proposed_clarification?: string;
  ambiguity_addressed?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface RuleActivationResult {
  suggestion_id: string;
  rule_id: string;
  status: 'ACTIVATED';
  old_version: string;
  new_version: string;
}

export interface ImpactMap {
  total_impacted_drafts: number;
  items: ImpactItem[];
}

export interface ConstitutionImport {
  id: string;
  workspace_id: string;
  filename: string;
  document_hash: string;
  file_size: number;
  page_count: number;
  candidate_count: number;
  approved_count: number;
  rejected_count: number;
  status: string;
  imported_by: string;
  created_at: string;
}

export interface ImportCandidate {
  id: string;
  import_id: string;
  workspace_id: string;
  candidate_type: 'rule' | 'fact';
  category: string;
  kind: string;
  pattern: string;
  requirement: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  page_number?: number;
  section_heading?: string;
  original_excerpt: string;
  extraction_method: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  reviewed_by?: string;
  reviewed_at?: string;
  review_decision?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface EvidenceSource {
  id: string;
  workspace_id: string;
  title: string;
  source_type: string;
  file_name?: string;
  url?: string;
  content_hash?: string;
  version: string;
  page_reference?: string;
  section_reference?: string;
  excerpt: string;
  owner: string;
  verification_status: 'VERIFIED' | 'PENDING_VERIFICATION' | 'EXPIRED' | 'SUPERSEDED';
  last_verified_at?: string;
  effective_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  linked_rules_count?: number;
  linked_facts_count?: number;
  linked_rules?: Array<{ id: string; title: string; kind: string; pattern: string; severity: string; status: string }>;
  linked_facts?: Array<{ id: string; claim: string; value: string; status: string; expires_at?: string }>;
}

export interface RuleConflict {
  conflict_type: 'HARD_CONFLICT' | 'POTENTIAL_CONFLICT' | 'DUPLICATE_RULE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  rule_a_id: string;
  rule_a_title: string;
  rule_a_kind: string;
  rule_a_pattern: string;
  rule_b_id: string;
  rule_b_title: string;
  rule_b_kind: string;
  rule_b_pattern: string;
  explanation: string;
  resolution_recommendation: string;
}

export interface ReviewComment {
  id: string;
  workspace_id: string;
  review_id: string;
  finding_id?: string;
  author: string;
  author_role: string;
  comment: string;
  created_at: string;
}

export interface GovernanceAlert {
  id: string;
  workspace_id: string;
  alert_type: string;
  target_type: string;
  target_id: string;
  target_title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  idempotency_key: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  created_at: string;
}

let activeRole: UserRole = 'reviewer';
let activeActor: string = 'demo.reviewer';
let activeWorkspace: string = 'ws_default';

export function setSimulatedWorkspace(workspace: string) {
  activeWorkspace = workspace || 'ws_default';
}

export function getSimulatedWorkspace(): string {
  return activeWorkspace;
}

export function setSimulatedUser(role: UserRole, actor?: string, workspace?: string) {
  activeRole = role;
  activeActor = actor || `demo.${role}`;
  if (workspace) activeWorkspace = workspace;
}

export function getSimulatedUser(): { role: UserRole; actor: string; workspace: string } {
  return { role: activeRole, actor: activeActor, workspace: activeWorkspace };
}

const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const base = rawBase.endsWith('/api') ? rawBase.slice(0, -4) : rawBase;

export function getApiBaseUrl(): string {
  return base;
}

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    'X-Demo-Role': activeRole,
    'X-Demo-Actor': activeActor,
    'X-Workspace-Id': activeWorkspace,
    ...(options.headers as Record<string, string> || {}),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    const isNetworkErr = err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('fetch');
    if (isNetworkErr) {
      const target = base || (typeof window !== 'undefined' ? window.location.origin : 'API server');
      throw new Error(
        `Backend service is currently unavailable or unreachable at ${target}. Please verify that the API server is running and CORS is permitted.`
      );
    }
    throw err;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    let errorMsg = '';
    if (typeof error.detail === 'string') {
      errorMsg = error.detail;
    } else if (Array.isArray(error.detail)) {
      errorMsg = error.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join('; ');
    } else if (error.detail && typeof error.detail === 'object') {
      errorMsg = JSON.stringify(error.detail);
    } else {
      errorMsg = error.message || `Request failed with status ${response.status}`;
    }
    throw new Error(errorMsg);
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }
  const text = await response.text();
  if (!text || !text.trim()) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  setup: () => call<Overview>('/api/demo/setup', { method: 'POST' }),
  reset: () => call<Overview>('/api/demo/reset', { method: 'POST' }),
  overview: () => call<Overview>('/api/overview'),
  rules: () => call<Rule[]>('/api/rules'),
  facts: () => call<Fact[]>('/api/facts'),
  brandProfile: () => call<BrandProfile>('/api/brand-profile'),
  updateBrandProfile: (body: Partial<BrandProfile>) =>
    call<BrandProfile>('/api/brand-profile', { method: 'PUT', body: JSON.stringify(body) }),
  reviews: () => call<Review[]>('/api/reviews'),
  getReview: (id: string) => call<Review>(`/api/reviews/${id}`),
  createRule: (body: Partial<Rule>) =>
    call<Rule>('/api/rules', { method: 'POST', body: JSON.stringify(body) }),
  updateRule: (id: string, body: Partial<Rule>) =>
    call<Rule>(`/api/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  createFact: (body: Partial<Fact>) =>
    call<Fact>('/api/facts', { method: 'POST', body: JSON.stringify(body) }),
  updateFact: (id: string, body: Partial<Fact>) =>
    call<Fact>(`/api/facts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  createReview: (body: {
    title: string;
    content: string;
    content_type: string;
    document_type?: string;
    consent_ai?: boolean;
  }) =>
    call<Review>('/api/reviews', { method: 'POST', body: JSON.stringify(body) }),
  uploadReview: (formData: FormData) =>
    call<Review>('/api/reviews/upload', { method: 'POST', body: formData }),
  findingAction: (
    reviewId: string,
    findingId: string,
    action: string,
    reason?: string,
    replacement?: string
  ) =>
    call<Review>(`/api/reviews/${reviewId}/findings/${findingId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action, reason, replacement }),
    }),
  approval: (
    reviewId: string,
    action: 'approve' | 'request_changes' | 'waive',
    reason?: string
  ) =>
    call<Review>(`/api/reviews/${reviewId}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    }),
  restoreVersion: (reviewId: string, versionId: string) =>
    call<Review>(`/api/reviews/${reviewId}/restore/${versionId}`, { method: 'POST' }),
  audit: (reviewId: string) => call<AuditEntry[]>(`/api/reviews/${reviewId}/audit`),
  versions: (reviewId: string) => call<DraftVersion[]>(`/api/reviews/${reviewId}/versions`),
  insights: () => call<Insights>('/api/insights'),
  impactMap: () => call<ImpactMap>('/api/governance/impact-map'),
  reReviewImpact: (itemId: string) => {
    const fd = new FormData();
    fd.append('item_id', itemId);
    return call<{ message: string; affected_count: number }>('/api/governance/re-review-impact', {
      method: 'POST',
      body: fd,
    });
  },
  guidelineHealth: () => call<GuidelineHealthItem[]>('/api/governance/guideline-health'),
  ruleSuggestions: () => call<RuleSuggestion[]>('/api/governance/rule-suggestions'),
  ruleSuggestion: (ruleId: string, action: 'accept' | 'defer' | 'reject') =>
    call<RuleSuggestion>(`/api/governance/rule-suggestions/${ruleId}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  activateRuleSuggestion: (suggestionId: string, expectedRuleVersion: string, newRequirement?: string, reason?: string) =>
    call<RuleActivationResult>(`/api/governance/rule-suggestions/${suggestionId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ expected_rule_version: expectedRuleVersion, new_requirement: newRequirement, reason }),
    }),
  factVersions: (factId: string) => call<FactVersion[]>(`/api/facts/${factId}/versions`),
  ruleVersions: (ruleId: string) => call<Rule[]>(`/api/rules/${ruleId}/versions`),
  health: () => call<HealthStatus>('/api/health'),
  ready: () => call<ReadyStatus>('/api/ready'),
  brandAssets: () => call<BrandAsset[]>('/api/brand-assets'),
  registerAsset: (body: Partial<BrandAsset>) =>
    call<BrandAsset>('/api/brand-assets', { method: 'POST', body: JSON.stringify(body) }),
  updateAsset: (id: string, body: Partial<BrandAsset>) =>
    call<BrandAsset>(`/api/brand-assets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAsset: (id: string) =>
    call<void>(`/api/brand-assets/${id}`, { method: 'DELETE' }),

  // Feature 1: Brand Guideline Import
  importBrandGuidelines: (file: File, consentAi: boolean = false) => {
    const fd = new FormData();
    fd.append('file', file);
    if (consentAi) fd.append('consent_ai', 'true');
    return call<ConstitutionImport>('/api/constitution/import-guidelines', {
      method: 'POST',
      body: fd,
    });
  },
  constitutionImports: () => call<ConstitutionImport[]>('/api/constitution/imports'),
  importCandidates: (importId: string) => call<ImportCandidate[]>(`/api/constitution/imports/${importId}/candidates`),
  updateCandidate: (candidateId: string, body: Partial<ImportCandidate>) =>
    call<ImportCandidate>(`/api/constitution/candidates/${candidateId}`, { method: 'PUT', body: JSON.stringify(body) }),
  approveCandidate: (candidateId: string) =>
    call<{ status: string; candidate_id: string; created_entity_id: string; candidate_type: string }>(`/api/constitution/candidates/${candidateId}/approve`, { method: 'POST' }),
  rejectCandidate: (candidateId: string, reason?: string) =>
    call<{ status: string; candidate_id: string; reason?: string }>(`/api/constitution/candidates/${candidateId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Feature 2: Evidence Source Vault
  evidenceSources: () => call<EvidenceSource[]>('/api/evidence-sources'),
  createEvidenceSource: (body: Partial<EvidenceSource>) =>
    call<EvidenceSource>('/api/evidence-sources', { method: 'POST', body: JSON.stringify(body) }),
  evidenceSource: (id: string) => call<EvidenceSource>(`/api/evidence-sources/${id}`),
  updateEvidenceSource: (id: string, body: Partial<EvidenceSource>) =>
    call<EvidenceSource>(`/api/evidence-sources/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEvidenceSource: (id: string) =>
    call<void>(`/api/evidence-sources/${id}`, { method: 'DELETE' }),

  // Feature 3: Deterministic Rule Conflict Detection
  checkRuleConflicts: (body: Partial<Rule>) =>
    call<RuleConflict[]>('/api/rules/check-conflicts', { method: 'POST', body: JSON.stringify(body) }),
  ruleConflicts: () => call<RuleConflict[]>('/api/governance/rule-conflicts'),

  // Feature 4: Compliance Evidence Packet Export
  exportEvidenceUrl: (reviewId: string, format: 'pdf' | 'json' = 'pdf') =>
    `${base}/api/reviews/${reviewId}/export-evidence?format=${format}`,
  exportEvidenceJson: (reviewId: string) =>
    call<any>(`/api/reviews/${reviewId}/export-evidence?format=json`),
  downloadEvidencePdf: async (reviewId: string): Promise<Blob> => {
    const headers: Record<string, string> = {
      'X-Demo-Role': activeRole,
      'X-Demo-Actor': activeActor,
      'X-Workspace-Id': activeWorkspace,
    };
    const res = await fetch(`${base}/api/reviews/${reviewId}/export-evidence?format=pdf`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to download PDF.' }));
      throw new Error(err.detail || 'Failed to download compliance evidence PDF.');
    }
    return res.blob();
  },

  // Feature 5: Review Assignment & Collaboration
  updateReviewAssignment: (reviewId: string, assignment: { assigned_to?: string; priority?: string; due_date?: string }) =>
    call<Review>(`/api/reviews/${reviewId}/assignment`, { method: 'PATCH', body: JSON.stringify(assignment) }),
  reviewComments: (reviewId: string) =>
    call<ReviewComment[]>(`/api/reviews/${reviewId}/comments`),
  addReviewComment: (reviewId: string, comment: string, findingId?: string) =>
    call<ReviewComment>(`/api/reviews/${reviewId}/comments`, { method: 'POST', body: JSON.stringify({ comment, finding_id: findingId }) }),

  // Feature 6: Proactive Expiry Monitoring & Governance Alerts
  triggerExpiryScan: () =>
    call<{ status: string; scanned_items: number; new_alerts_created: number; scan_timestamp: string }>('/api/governance/expiry-scan', { method: 'POST' }),
  triggerExpiryWorker: () =>
    call<{ status: string; job_id: string; job_status: string; scanned_items: number; new_alerts_created: number; re_reviews_generated: number }>('/api/governance/expiry-worker/trigger', { method: 'POST' }),
  expiryJobs: (limit: number = 20) =>
    call<any[]>(`/api/governance/expiry-jobs?limit=${limit}`),
  governanceAlerts: (status?: string) =>
    call<GovernanceAlert[]>(`/api/governance/expiry-alerts${status ? `?status=${status}` : ''}`),
  acknowledgeAlert: (alertId: string) =>
    call<{ status: string; alert_id: string }>(`/api/governance/expiry-alerts/${alertId}/acknowledge`, { method: 'POST' }),

  // Feature 7: Advanced Visual Intelligence
  checkAssetSimilarity: (assetId: string, targetAssetId: string) =>
    call<{ asset_1: string; asset_2: string; similarity_score: number; is_perceptually_equivalent: boolean }>(
      `/api/brand-assets/${assetId}/similarity?target_asset_id=${targetAssetId}`
    ),
};
