# 14 — DATABASE SCHEMA AND DATA DICTIONARY
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    WORKSPACES ||--o{ RULES : contains
    WORKSPACES ||--o{ FACTS : contains
    WORKSPACES ||--o{ REVIEWS : contains
    WORKSPACES ||--o{ BRAND_ASSETS : contains
    REVIEWS ||--o{ FINDINGS : generates
    REVIEWS ||--o{ REVIEW_VERSIONS : tracks
    REVIEWS ||--o{ AUDIT : logs
    REVIEWS ||--o{ REVIEW_COMMENTS : contains
    RULES ||--o{ RULE_VERSIONS : snapshots
    FACTS ||--o{ EVIDENCE_DEPENDENCIES : references
    REVIEWS ||--o{ EVIDENCE_DEPENDENCIES : links
    WORKSPACES ||--o{ GOVERNANCE_ALERTS : alerts

    REVIEWS {
        string id PK
        string workspace_id FK
        string title
        text content
        string status
        int score
        string priority
        string assigned_to
        string due_date
        string file_hash
        string created_at
    }

    FINDINGS {
        string id PK
        string review_id FK
        string category
        string type
        string severity
        string status
        string passage
        string suggested_correction
        string source_title
        string source_excerpt
        string disposition
        string disposition_reason
    }

    RULES {
        string id PK
        string workspace_id FK
        string title
        string category
        string kind
        string pattern
        string severity
        string version
        string status
        string expires_at
    }

    FACTS {
        string id PK
        string workspace_id FK
        string claim
        string value
        string owner
        string status
        string version
        string effective_at
        string expires_at
        text notes
    }
```

---

## 2. Table Inventory (All 16 Schema Tables)

1. `workspaces`: Multi-tenant organization boundaries.
2. `rules`: Brand Constitution policies across voice, terminology, and claims.
3. `rule_versions`: Immutable historical snapshots of modified rules.
4. `facts`: Corporate Claim Ledger entries with validity dates and owner attribution.
5. `reviews`: Content submissions with clearance scores and workflow states.
6. `findings`: Exact-span compliance violations linked to source rules and evidence.
7. `review_versions`: Content draft revision snapshots preserving author history.
8. `audit`: Append-only chronological event ledger with actor attribution.
9. `brand_assets`: Registered visual creative assets with SHA-256 binary hashes.
10. `brand_profiles`: Workspace brand design tokens and reference color palettes.
11. `rule_suggestions`: Telemetry-generated clarification proposals requiring admin gate.
12. `evidence_dependencies`: Bi-directional mapping between reviews, facts, and rules.
13. `guideline_candidate_rules`: Digital PDF extracted candidate rules awaiting approval.
14. `review_comments`: Collaborative reviewer discussion notes.
15. `governance_alerts`: Deduplicated proactive expiry notifications.
16. `governance_jobs`: Background worker execution tracking and retry ledger.
