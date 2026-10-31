"""
Pydantic Request & Response Schemas for BRANDTRACE API.
"""
from __future__ import annotations

from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

from .config import MAX_CONTENT_CHARS

class WorkspaceOut(BaseModel):
    id: str
    name: str
    demo_mode: bool = True

class BrandProfileIn(BaseModel):
    brand_name: str = Field(..., min_length=2, max_length=120)
    primary_color: str = Field(..., pattern=r"^#?[0-9a-fA-F]{6}$")
    secondary_color: str = Field(..., pattern=r"^#?[0-9a-fA-F]{6}$")
    accent_colors: List[str] = Field(default_factory=list)
    min_contrast_ratio: float = Field(4.5, ge=1.0, le=21.0)
    approved_logo_aspect: Optional[float] = Field(None, ge=0.1, le=10.0)

class BrandProfileOut(BrandProfileIn):
    id: str
    workspace_id: str
    updated_at: str

class RuleIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    category: str = Field("terminology", max_length=60)
    kind: Literal["required_phrase", "prohibited_phrase", "approved_term", "forbidden_term", "tone_rule"]
    pattern: str = Field(..., min_length=1, max_length=200)
    requirement: str = Field(..., min_length=2, max_length=500)
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "HIGH"
    source_title: str = Field(..., min_length=2, max_length=160)
    source_excerpt: str = Field(..., min_length=3, max_length=600)
    version: str = "1.0"
    status: Literal["APPROVED", "DRAFT", "RETIRED"] = "APPROVED"
    owner: str = Field("Brand Admin", max_length=120)
    effective_at: Optional[str] = None
    expires_at: Optional[str] = None
    applicable_document_types: Optional[str] = "all"

class RuleUpdateIn(BaseModel):
    expected_version: Optional[str] = None
    reason: Optional[str] = None
    title: Optional[str] = Field(None, min_length=2, max_length=120)
    category: Optional[str] = None
    kind: Optional[Literal["required_phrase", "prohibited_phrase", "approved_term", "forbidden_term", "tone_rule"]] = None
    pattern: Optional[str] = None
    requirement: Optional[str] = None
    severity: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None
    status: Optional[Literal["APPROVED", "DRAFT", "RETIRED"]] = None
    version: Optional[str] = None
    source_title: Optional[str] = None
    source_excerpt: Optional[str] = None
    expires_at: Optional[str] = None

class RuleOut(BaseModel):
    id: str
    workspace_id: str = "ws_default"
    title: str
    category: str
    kind: str
    pattern: str
    requirement: str
    severity: str
    version: str
    status: str
    owner: str
    source_title: str
    source_excerpt: str
    effective_at: Optional[str] = None
    expires_at: Optional[str] = None
    applicable_document_types: Optional[str] = "all"

class FactIn(BaseModel):
    claim: str = Field(..., min_length=2, max_length=200)
    value: str = Field(..., min_length=1, max_length=500)
    owner: str = Field(..., min_length=2, max_length=120)
    source_title: str = Field(..., min_length=2, max_length=160)
    source_excerpt: str = Field(..., min_length=3, max_length=600)
    version: str = "1.0"
    status: Literal["APPROVED", "DRAFT", "RETIRED"] = "APPROVED"
    review_at: Optional[str] = None
    effective_at: Optional[str] = None
    expires_at: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)

class FactUpdateIn(BaseModel):
    expected_version: Optional[str] = None
    reason: Optional[str] = None
    claim: Optional[str] = None
    value: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[Literal["APPROVED", "DRAFT", "RETIRED"]] = None
    version: Optional[str] = None
    source_title: Optional[str] = None
    source_excerpt: Optional[str] = None
    review_at: Optional[str] = None
    effective_at: Optional[str] = None
    expires_at: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)

class FactOut(BaseModel):
    id: str
    workspace_id: str = "ws_default"
    claim: str
    value: str
    owner: str
    status: str
    version: str
    source_title: str
    source_excerpt: str
    review_at: Optional[str] = None
    effective_at: Optional[str] = None
    expires_at: Optional[str] = None
    notes: Optional[str] = None

class ReviewIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=160)
    content: str = Field(..., min_length=1, max_length=MAX_CONTENT_CHARS)
    content_type: str = "marketing_copy"
    document_type: Optional[str] = "general_document"
    consent_ocr: Optional[bool] = False
    consent_ai: Optional[bool] = False

class FindingAction(BaseModel):
    action: Literal["accept", "edit", "dismiss", "escalate"]
    reason: Optional[str] = Field(None, max_length=500)
    replacement: Optional[str] = Field(None, max_length=MAX_CONTENT_CHARS)

class ApprovalAction(BaseModel):
    action: Literal["approve", "request_changes", "waive"]
    reason: Optional[str] = Field(None, max_length=500)

class EvidenceFinding(BaseModel):
    id: str
    review_id: str
    category: str
    type: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    status: Literal["SUPPORTED", "CONTRADICTED", "OUTDATED", "UNSUPPORTED_BY_APPROVED_EVIDENCE", "NEEDS_REVIEW"]
    passage: str
    explanation: str
    suggested_correction: Optional[str] = None
    source_id: Optional[str] = None
    source_title: Optional[str] = None
    source_excerpt: Optional[str] = None
    source_version: Optional[str] = None
    analysis_method: str = "DETERMINISTIC"
    uncertainty: Optional[str] = None
    disposition: Optional[str] = None
    disposition_reason: Optional[str] = None
    disposition_by: Optional[str] = None
    disposition_at: Optional[str] = None

class DraftVersion(BaseModel):
    id: str
    review_id: str
    content: str
    created_at: str
    created_by: str = "creator"
    reason: str

class ReviewOut(BaseModel):
    id: str
    workspace_id: str = "ws_default"
    title: str
    content: str
    content_type: str
    status: str
    score: int
    author: str = "creator@demo.com"
    reviewer: Optional[str] = None
    file_name: Optional[str] = None
    file_mime: Optional[str] = None
    file_size: Optional[int] = None
    document_type: Optional[str] = "general_document"
    file_format: Optional[str] = "text"
    ocr_applied: Optional[bool] = False
    ocr_method: Optional[str] = "NONE"
    ai_consent_granted: Optional[bool] = False
    ai_analysis_applied: Optional[bool] = False
    document_summary: Optional[str] = None
    analysis_method: str = "DETERMINISTIC_FIRST"
    rule_versions: str
    assigned_to: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    due_date: Optional[str] = None
    created_at: str
    updated_at: str
    findings: List[EvidenceFinding] = Field(default_factory=list)
    versions: Optional[List[DraftVersion]] = None

class AuditEntry(BaseModel):
    id: str
    workspace_id: str = "ws_default"
    review_id: str
    action: str
    actor: str
    actor_role: str = "reviewer"
    reason: Optional[str] = None
    details: Optional[str] = None
    created_at: str

class OverviewMetrics(BaseModel):
    total_reviews: int
    open_findings: int
    pending_approval: int
    approved: int
    rules_count: int = 0
    facts_count: int = 0

class OverviewOut(BaseModel):
    workspace: WorkspaceOut
    reviews: List[ReviewOut]
    metrics: Dict[str, int]
    brand_profile: Optional[BrandProfileOut] = None

class InsightsOut(BaseModel):
    recurring: List[Dict[str, Any]]
    unresolved: int
    dismissed: int
    unclear_rules: List[Dict[str, Any]]
    by_severity: Dict[str, int] = Field(default_factory=dict)
    by_evidence_status: Dict[str, int] = Field(default_factory=dict)
    disagreements_count: int = 0
    active_rules_count: int = 0
    draft_rules_count: int = 0
    conflicting_rules_count: int = 0
    duplicate_rules_count: int = 0
    expired_facts_count: int = 0
    approaching_expiry_facts_count: int = 0
    rules_without_sources_count: int = 0
    active_alerts_count: int = 0
    evidence_sources_count: int = 0

class ImpactItem(BaseModel):
    item_type: Literal["FACT", "RULE"]
    item_id: str
    item_title: str
    status: str
    expires_at: Optional[str] = None
    expiry_date: Optional[str] = None
    affected_review_ids: List[str]
    affected_review_titles: List[str]
    affected_count: int = 0
    re_review_urgency: Literal["URGENT", "RECOMMENDED", "INFORMATIONAL"]

class ImpactMapOut(BaseModel):
    total_impacted_drafts: int
    items: List[ImpactItem]

# ---------------------------------------------------------------------------
# Round 3 schemas
# ---------------------------------------------------------------------------

class BrandAssetIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    asset_type: str = Field("image", max_length=50)
    content_hash: Optional[str] = Field(None, max_length=128)
    source: Optional[str] = Field(None, max_length=300)
    license_status: Literal["APPROVED", "RESTRICTED", "UNKNOWN", "REVIEW_REQUIRED"] = "UNKNOWN"
    license_notes: Optional[str] = Field(None, max_length=500)
    approval_status: Literal["APPROVED", "RESTRICTED", "UNKNOWN", "REVIEW_REQUIRED"] = "REVIEW_REQUIRED"

class BrandAssetOut(BaseModel):
    id: str
    name: str
    asset_type: str
    content_hash: Optional[str] = None
    source: Optional[str] = None
    license_status: str
    license_notes: Optional[str] = None
    approval_status: str
    workspace_id: str = "ws_default"
    created_at: str
    updated_at: str

class GuidelineSuggestion(BaseModel):
    observed_issue: str
    proposed_clarification: str
    ambiguity_addressed: str

class GuidelineHealthItem(BaseModel):
    rule_id: str
    rule_title: str
    rule_severity: str
    affected_draft_count: int
    finding_count: int
    accepted_count: int
    dismissed_count: int
    escalated_count: int
    waived_count: int
    disagreement_detected: bool
    data_confidence: Literal["SUFFICIENT", "INSUFFICIENT"]
    representative_finding_ids: List[str]
    suggestion: Optional[GuidelineSuggestion] = None

class RuleSuggestionAction(BaseModel):
    action: Literal["accept", "defer", "reject"]

class RuleActivationIn(BaseModel):
    expected_rule_version: str = Field(..., min_length=1, max_length=64)
    new_requirement: Optional[str] = Field(None, min_length=2, max_length=500)
    reason: Optional[str] = Field(None, max_length=500)

class RuleSuggestionOut(BaseModel):
    id: str
    rule_id: str
    observed_issue: Optional[str] = None
    proposed_clarification: Optional[str] = None
    ambiguity_addressed: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str

class WorkspaceMemberIn(BaseModel):
    actor: str = Field(..., min_length=2, max_length=120)
    role: Literal["creator", "reviewer", "brand_admin", "auditor"] = "reviewer"

class WorkspaceMemberOut(BaseModel):
    workspace_id: str
    actor: str
    role: str
    created_at: str

class WorkspaceIn(BaseModel):
    id: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-zA-Z0-9_\-]+$")
    name: str = Field(..., min_length=2, max_length=120)

class BootstrapOut(BaseModel):
    status: str
    workspace_id: str
    admin: str
    created_at: str

# ---------------------------------------------------------------------------
# Enterprise Features Schemas (Round 3 Release)
# ---------------------------------------------------------------------------

class ConstitutionImportOut(BaseModel):
    id: str
    workspace_id: str
    filename: str
    document_hash: str
    file_size: int
    page_count: int
    candidate_count: int
    approved_count: int
    rejected_count: int
    status: str
    imported_by: str
    created_at: str

class ImportCandidateOut(BaseModel):
    id: str
    import_id: str
    workspace_id: str
    candidate_type: str
    category: str
    kind: str
    pattern: str
    requirement: str
    severity: str
    page_number: Optional[int] = None
    section_heading: Optional[str] = None
    original_excerpt: str
    extraction_method: str
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_decision: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str

class CandidateUpdateIn(BaseModel):
    pattern: Optional[str] = Field(None, min_length=1, max_length=200)
    requirement: Optional[str] = Field(None, min_length=2, max_length=500)
    category: Optional[str] = Field(None, max_length=60)
    kind: Optional[Literal["required_phrase", "prohibited_phrase", "approved_term", "forbidden_term", "tone_rule", "fact"]] = None
    severity: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None

class CandidateRejectIn(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)

class EvidenceSourceIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=160)
    source_type: str = Field("BRAND_GUIDELINE", max_length=50)
    file_name: Optional[str] = Field(None, max_length=255)
    url: Optional[str] = Field(None, max_length=500)
    content_hash: Optional[str] = Field(None, max_length=128)
    version: str = Field("1.0", max_length=32)
    page_reference: Optional[str] = Field(None, max_length=100)
    section_reference: Optional[str] = Field(None, max_length=200)
    excerpt: str = Field(..., min_length=3, max_length=1000)
    owner: str = Field("Brand Admin", max_length=120)
    verification_status: Literal["VERIFIED", "PENDING_VERIFICATION", "EXPIRED", "SUPERSEDED"] = "VERIFIED"
    effective_at: Optional[str] = None
    expires_at: Optional[str] = None

class EvidenceSourceUpdateIn(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=160)
    source_type: Optional[str] = Field(None, max_length=50)
    excerpt: Optional[str] = Field(None, min_length=3, max_length=1000)
    version: Optional[str] = Field(None, max_length=32)
    verification_status: Optional[Literal["VERIFIED", "PENDING_VERIFICATION", "EXPIRED", "SUPERSEDED"]] = None
    owner: Optional[str] = Field(None, max_length=120)
    page_reference: Optional[str] = None
    section_reference: Optional[str] = None
    expires_at: Optional[str] = None

class EvidenceSourceOut(BaseModel):
    id: str
    workspace_id: str = "ws_default"
    title: str
    source_type: str
    file_name: Optional[str] = None
    url: Optional[str] = None
    content_hash: Optional[str] = None
    version: str
    page_reference: Optional[str] = None
    section_reference: Optional[str] = None
    excerpt: str
    owner: str
    verification_status: str
    last_verified_at: Optional[str] = None
    effective_at: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: str
    updated_at: str
    linked_rules_count: int = 0
    linked_facts_count: int = 0

class RuleConflictOut(BaseModel):
    conflict_type: str
    severity: str
    rule_a_id: str
    rule_a_title: str
    rule_a_kind: str
    rule_a_pattern: str
    rule_b_id: str
    rule_b_title: str
    rule_b_kind: str
    rule_b_pattern: str
    explanation: str
    resolution_recommendation: str

class ReviewAssignmentIn(BaseModel):
    assigned_to: Optional[str] = Field(None, max_length=120)
    priority: Optional[Literal["LOW", "MEDIUM", "HIGH", "URGENT"]] = None
    due_date: Optional[str] = Field(None, max_length=64)

class ReviewCommentIn(BaseModel):
    comment: str = Field(..., min_length=1, max_length=2000)
    finding_id: Optional[str] = Field(None, max_length=64)

class ReviewCommentOut(BaseModel):
    id: str
    workspace_id: str = "ws_default"
    review_id: str
    finding_id: Optional[str] = None
    author: str
    author_role: str = "reviewer"
    comment: str
    created_at: str

class GovernanceAlertOut(BaseModel):
    id: str
    workspace_id: str = "ws_default"
    alert_type: str
    target_type: str
    target_id: str
    target_title: str
    severity: str
    message: str
    idempotency_key: str
    status: str
    created_at: str

class ExpiryScanOut(BaseModel):
    status: str
    scanned_items: int
    new_alerts_created: int
    re_reviews_generated: Optional[int] = 0
    scan_timestamp: str
    intervals_checked: Optional[List[str]] = None
    notification_outcome: Optional[str] = None
    external_notifications: Optional[str] = "In-app alerts and notification notices dispatched."

class OcrResponseOut(BaseModel):
    status: str
    file_type: str
    total_pages: int
    scanned_pages: int
    digital_pages: int
    extracted_text: str
    confidence: float
    words_detected: int
    extraction_method: str
    pages: Optional[List[Dict[str, Any]]] = None

class LogoPlacementOut(BaseModel):
    matched: bool
    match_confidence: float
    match_threshold: float
    bounding_box: Optional[Dict[str, Any]] = None
    relative_position: Optional[Dict[str, Any]] = None
    scale_percent: Optional[float] = None
    clearspace_margin_ratio: Optional[float] = None
    required_clearspace_ratio: float = 0.5
    clearspace_compliant: bool
    placement_compliant: bool
    findings: List[Dict[str, Any]] = []

class TypographyComplianceOut(BaseModel):
    analysis_mode: str
    approved_fonts: List[str]
    detected_fonts: List[Dict[str, Any]]
    compliant: bool
    findings: List[Dict[str, Any]] = []

class WorkerStatusOut(BaseModel):
    scheduler_active: bool
    check_interval_seconds: int
    last_run_timestamp: Optional[str] = None
    total_scheduler_runs: int
    recent_jobs: List[Dict[str, Any]] = []
