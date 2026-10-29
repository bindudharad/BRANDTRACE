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
    content_type: Literal["marketing_copy", "email", "social", "web", "document", "image"] = "marketing_copy"

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
    analysis_method: str = "DETERMINISTIC_FIRST"
    rule_versions: str
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
