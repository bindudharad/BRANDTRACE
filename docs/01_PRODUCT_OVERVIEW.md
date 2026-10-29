# BRANDTRACE Product Overview

## Executive Summary

**BRANDTRACE** is an Evidence-Aware Brand Governance and Content Review Platform engineered to eliminate compliance drift, unsubstantiated promotional claims, and untraceable approvals across enterprise marketing, public relations, and legal review workflows. Rather than treating brand guidelines as static PDF manuals or relying solely on opaque, non-deterministic large language model prompts, BRANDTRACE formalizes brand voice, terminology rules, and factual claims into an authoritative, queryable governance substrate.

Every draft submitted to BRANDTRACE—whether raw marketing copy, corporate communications, social collateral, ingested PDF documents, or promotional imagery—is systematically audited against this substrate using a **deterministic-first** evaluation pipeline. Discrepancies are surfaced not as generic advice, but as verifiable **findings** bound directly to codified rules, approved corporate facts, and immutable source excerpts.

---

## Product Purpose & Core Value Proposition

Modern distributed organizations operate under intense pressure to publish high volumes of marketing copy across omnichannel touchpoints. This velocity inevitably introduces four failure modes:
1. **Brand Drift**: Outdated positioning, forbidden vocabulary, and unapproved tone erode brand equity.
2. **Regulatory & Legal Exposure**: Unsubstantiated claims regarding security, uptime percentages, market leadership, and geographical availability expose organizations to civil liability and regulatory enforcement.
3. **Silent Evidence Expiry**: Marketing assets remain live long after underlying performance benchmarks, certifications, or legal clearance windows have lapsed.
4. **Untraceable Approvals**: Sign-offs conducted over chat or email lack structured records of what was evaluated, what exceptions were granted, and who authorized publication.

BRANDTRACE addresses these challenges by transforming content governance into an active, auditable verification system. The platform guarantees that no high-risk claim reaches publication without explicit, substantiated evidence or a documented, role-authorized administrative waiver.

---

## Intended Users & Persona Workflows

BRANDTRACE supports four distinct operational roles, each mapped to specific permissions and governance responsibilities:

### 1. Contributors (`contributor` / `creator`)
* **Profile**: Content creators, copywriters, agency partners, and product marketing managers.
* **Responsibilities**: Drafts promotional copy, uploads campaign assets (PDF, PNG, JPEG), and iterates on revisions.
* **Platform Capabilities**:
  * Submits drafts for automated governance analysis.
  * Reviews highlighted findings and inspects cited brand evidence.
  * Applies automated neutral corrections or manually edits flagged copy.
  * Requests formal review and tracks governance health score progression.
  * Restricted from dismissing compliance findings or authorizing final publication.

### 2. Reviewers (`reviewer`)
* **Profile**: Editorial leads, brand managers, and senior compliance reviewers.
* **Responsibilities**: Evaluates flagged passages, judges claim validity, and acts on findings.
* **Platform Capabilities**:
  * Accepts, edits, dismisses, or escalates individual findings with mandatory justifications.
  * Triggers draft revisions or requests changes back to the contributor.
  * Evaluates health scores and checks rule citation lineage.

### 3. Brand Administrators (`brand_admin`)
* **Profile**: Heads of Brand, General Counsel, and Director-level Governance Officers.
* **Responsibilities**: Defines and maintains authoritative brand rules, the approved claim ledger, and visual style tokens.
* **Platform Capabilities**:
  * Creates, updates, and retires brand rules and fact entries with strict versioning and expiration timestamps.
  * Grants governance waivers for high-risk findings under exceptional, documented circumstances.
  * Executes final review sign-off and approval transitions.
  * Inspects the Claim Impact Map to identify active collateral compromised by expiring rules or retired claims.

### 4. Auditors (`auditor`)
* **Profile**: Internal compliance auditors, legal counsel, and external regulatory examiners.
* **Responsibilities**: Verifies governance integrity, inspects historical sign-offs, and validates compliance trails.
* **Platform Capabilities**:
  * Read-only access across all workspaces, drafts, versions, and finding histories.
  * Full inspection of append-only audit logs detailing every finding action, actor identity, role, timestamp, and justification.

---

## Product Principles

The engineering and design of BRANDTRACE are guided by four fundamental architectural principles:

```
[ Deterministic-First ] ---> [ Evidence-Linked ] ---> [ Human-Gated ] ---> [ Immutable Audit ]
```

### 1. Deterministic-First Verification
Automated checks must be reproducible, instantaneous, and fully functional without mandatory external cloud AI dependencies. Deterministic regex matching against approved rule patterns and exact date checks against the claim ledger execute locally in milliseconds. Cloud-based generative AI (Google Gemini) functions strictly as an optional secondary layer for nuanced tone triage and promotional claim candidate detection.

### 2. Evidence-Linked Findings
Every finding generated by BRANDTRACE must link to an explicit, database-backed record: either an approved brand rule (`R-XXXX-XX`) or an approved factual entry (`F-XXXX-XX`). Speculative critiques without a cited source title and verified source excerpt are prohibited from the core governance pipeline.

### 3. Human-Gated Approval Workflows
AI and automated algorithms advise; humans decide. Automated systems never grant unilateral publication clearance. Furthermore, server-side enforcement hard-blocks draft approval whenever any unresolved `HIGH` or `CRITICAL` severity finding remains outstanding, returning an explicit `HTTP 409 Conflict`.

### 4. Immutable Audit & Traceability
Trust requires immutability. Every content edit, finding disposition (acceptance, dismissal, escalation, waiver), and status transition is recorded in an append-only audit trail. The platform provides no database endpoints or UI controls to modify or delete audit entries.

---

## System Scope: Boundaries & Non-Goals

To maintain high reliability and audit precision, BRANDTRACE defines clear operational boundaries:

### What BRANDTRACE Does
* Analyzes raw text, multi-page PDFs, and visual brand assets against codified policies.
* Enforces exact-span text replacements without duplicating surrounding words.
* Re-evaluates mandatory brand terminology in real-time as authors edit drafts.
* Maps dependencies between approved factual claims and historical drafts via a dynamic Claim Impact Map.
* Measures brand color compliance via CIELAB Delta-E distance and WCAG 2.1 contrast ratios.
* Generates versioned draft snapshots on every content modification with full rollback capabilities.

### What BRANDTRACE Does Not Do (Non-Goals)
* **Unsupervised Auto-Publishing**: BRANDTRACE is not a headless content management system or social media auto-publisher.
* **Generative Copy Replacement**: The platform does not hallucinate long-form marketing text to replace flagged sections.
* **Deep OCR & Font Layout Analysis**: Text extraction from images and desktop publishing layout analysis (e.g., InDesign, Illustrator) are outside current release boundaries.
* **Enterprise Identity Management**: The demo build implements simulated role switching via HTTP headers (`X-Demo-Role`); enterprise SAML/OIDC and SCIM provisioning are designed for downstream production deployment.
