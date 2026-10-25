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
  status: 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'WAIVED';
  score: number;
  author: string;
  reviewer?: string;
  file_name?: string;
  file_mime?: string;
  file_size?: number;
  analysis_method: string;
  rule_versions: string;
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
}

export interface ImpactItem {
  item_type: 'FACT' | 'RULE';
  item_id: string;
  item_title: string;
  status: string;
  expires_at?: string;
  affected_review_ids: string[];
  affected_review_titles: string[];
  affected_drafts?: Array<{ id: string; title: string; status: string }>;
  re_review_urgency: 'URGENT' | 'RECOMMENDED' | 'INFORMATIONAL';
}

export interface ImpactMap {
  total_impacted_drafts: number;
  items: ImpactItem[];
}

let activeRole: UserRole = 'reviewer';
let activeActor: string = 'demo.reviewer';

export function setSimulatedUser(role: UserRole, actor?: string) {
  activeRole = role;
  activeActor = actor || `demo.${role}`;
}

export function getSimulatedUser(): { role: UserRole; actor: string } {
  return { role: activeRole, actor: activeActor };
}

const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const base = rawBase.endsWith('/api') ? rawBase.slice(0, -4) : rawBase;

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    'X-Demo-Role': activeRole,
    'X-Demo-Actor': activeActor,
    ...(options.headers as Record<string, string> || {}),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || error.message || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  setup: () => call<Overview>('/api/demo/setup', { method: 'POST' }),
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
  createReview: (body: { title: string; content: string; content_type: string }) =>
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
};
