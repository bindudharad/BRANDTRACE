---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 38 — Judge Demonstration Guide

## Purpose

This document provides a concise 3-to-5 minute demonstration script for hackathon judges and evaluators, highlighting the core technical innovations, governance guardrails, and user experience of **BRANDTRACE**.

---

## 1. Demonstration Setup

- **Live Deployed Application**: [https://brandtrace-woad.vercel.app](https://brandtrace-woad.vercel.app)
- **Local Alternative**: `http://localhost:3000` (with backend at `http://localhost:8000`)
- **Default Workspace**: `AuraTech Global` (`ws_default`)

---

## 2. The 5-Minute Walkthrough Script

### Step 1: Overview & Interactive 3D Command Core (0:00 - 0:45)
1. Navigate to the **Overview** view.
2. Highlight the **Executive Governance Telemetry**: clearance score distribution, unresolved violations by severity, and active reviews.
3. Interact with the **3D AI Command Core**:
   - Rotate and zoom the Three.js node graph representing brand guidelines and active review dependencies.
   - Hover over nodes to inspect real-time connection paths.
   - Note the automatic, seamless SVG fallback for devices without WebGL.

### Step 2: Content Review & Deterministic Exact-Span Findings (0:45 - 1:45)
1. Navigate to **Content Reviews** and open the sample draft *"AuraTech Enterprise Q4 Announcement"*.
2. Point out the **Exact-Span Violation Highlighting**:
   - Notice the high-severity violation on the superlative word `"best"`.
   - Click the finding card to inspect the approved brand rule citation (`R-TERM-01`) and the exact source excerpt from the Brand Constitution.
3. Click **Accept Correction**:
   - The editor instantly updates `"best"` to `"effective"`.
   - The finding status updates, and the Governance Clearance Score immediately recalculates upwards.

### Step 3: Hard Approval Gate & RBAC Enforcement (1:45 - 2:30)
1. Using the **Persona Switcher** in the top navigation, switch to `Creator (Author)`.
2. Attempt to approve the draft:
   - Notice the Approval button is disabled or yields an explicit `HTTP 403 Forbidden` message indicating creators cannot self-approve.
3. Switch persona to `Reviewer` or `Brand Admin`.
4. While an unresolved high-risk finding exists, attempt to click **Approve Draft**:
   - Demonstrate the hard architectural guardrail: the backend blocks approval with **`HTTP 409 Conflict`** ("High-risk findings must be resolved before approval").
5. Resolve the remaining finding, then trigger **Approve Draft**:
   - The status updates to `APPROVED` and records an immutable audit record.

### Step 4: Claim Ledger & Targeted Impact Re-Review (2:30 - 3:45)
1. Navigate to the **Time-Aware Claim Ledger**:
   - Show how enterprise claims (e.g., *"99.99% Uptime Guarantee"*) have strict `effective_from` and `expires_at` validity windows.
   - Point out claims marked `EXPIRING_SOON` and `OUTDATED`.
2. Navigate to the **Claim Impact Map**:
   - Show the dependency graph linking the expired claim to previously approved marketing reviews.
3. Click **Run Targeted Re-Review**:
   - Explain the engineering honesty of this feature: it is an **on-demand targeted re-review execution** (not an unverified background cron worker).
   - Show how the previously approved draft is automatically transitioned to `CHANGES_REQUESTED`.

### Step 5: Guideline Health & Audit Trail (3:45 - 5:00)
1. Navigate to **Guideline Health**:
   - Demonstrate **Reviewer Disagreement Detection**: show how conflicting dispositions from different reviewers flag ambiguous guidelines.
   - View the generated rule clarification suggestion and demonstrate its triage queue (`Accepted`, `Deferred`, `Rejected`).
   - Show that only an authorized **Brand Admin** can activate the rule, which increments the version (`v1.0` $\to$ `v1.1`) with optimistic locking.
2. Navigate to the **Compliance Audit Trail**:
   - Inspect the immutable, append-only log proving complete attribution (`actor`, `role`, `timestamp`, `diff`).
