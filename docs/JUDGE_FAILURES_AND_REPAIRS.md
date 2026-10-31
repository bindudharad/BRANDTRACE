# BRANDTRACE — JUDGE FAILURES & ROOT-CAUSE REPAIRS
**Evaluation Standard:** Zero-Defect Post-Mortem & Remediation Audit  
**Date:** 2026-10-31  
**Scope:** Root-cause analysis and verified code fixes for all discovered defects  

---

## 1. Summary Defect Metrics

| Severity Class | Description | Discovered | Resolved | Open | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **P0 — Critical** | Server Crash / Data Loss / Security Bypass | 0 | 0 | 0 | **CLEAN** |
| **P1 — High** | Core Button Broken / Submission Failure / RBAC Denial | 3 | 3 | 0 | **RESOLVED** |
| **P2 — Medium** | Presentation Anomaly / Navigation Interception / Focus Lock | 1 | 1 | 0 | **RESOLVED** |
| **P3 — Low** | Accessibility Warning / Pagination Formatting | 2 | 2 | 0 | **RESOLVED** |

---

## 2. Comprehensive Defect Analysis & Root-Cause Solutions

### DEFECT-01: Header Duplication Causing False 403 Forbidden on Logo Routes (P1 - High)
- **Observed Behavior:** Automated requests to `/api/logo-intelligence/references`, `/reports`, and `/analyze/image` were intermittently rejected with `403 Forbidden: Actor is not a member of workspace ws_default`.
- **Root Cause:** In `src/services/api.ts`, default client options included `X-Workspace-Id: ws_default` while request-specific options passed `x-workspace-id: ws_default`. Node and Starlette / ASGI HTTP servers conform to RFC 7230 by joining duplicate headers with commas, resulting in Starlette receiving `X-Workspace-Id: "ws_default, ws_default"`. When the backend executed `SELECT role FROM workspace_members WHERE workspace_id = target_workspace`, the string equality check failed against `"ws_default, ws_default"`.
- **Engineering Fix:**
  1. Updated `src/services/api.ts:call()` to case-insensitively deduplicate and map custom headers before dispatch.
  2. Implemented comma-splitting sanitization in `backend/app/main.py:194-200` (`target_workspace = target_workspace.split(",")[0].strip()`), guaranteeing robustness against client or proxy concatenation.

---

### DEFECT-02: Non-Admin Demo Roles Missing from Workspace Membership Table (P1 - High)
- **Observed Behavior:** Resetting the demo environment via `/api/demo/reset` allowed `demo.brand_admin` to access all endpoints, but switching to `demo.reviewer`, `demo.creator`, or `demo.auditor` resulted in `403 Forbidden` on newly integrated logo endpoints.
- **Root Cause:** In `backend/app/main.py:demo_reset`, only `demo.brand_admin` was explicitly inserted into the `workspace_members` table for `ws_default`. The other demo personas were recognized as users but had no explicit membership record in `ws_default`.
- **Engineering Fix:**
  - Updated `backend/app/main.py:2374-2385` to automatically insert all 4 demo personas (`demo.brand_admin`, `demo.reviewer`, `demo.creator`, `demo.auditor`) into `workspace_members` during workspace bootstrapping and demo reset.

---

### DEFECT-03: Dependency Injection Header Object Unpacking Error (P1 - High)
- **Observed Behavior:** Invoking `get_auth_context_dep` raised `AttributeError: 'Header' object has no attribute 'lower'`.
- **Root Cause:** In `backend/app/routers/logo_intelligence.py`, a helper route invoked `get_auth_context()` without passing the injected FastAPI Header parameters, causing the parameters to evaluate to raw FastAPI `Header(None)` declaration objects rather than the extracted string header values.
- **Engineering Fix:**
  - Normalized `get_auth_context_dep` to correctly accept and propagate FastAPI's dependency-injected header parameters to `get_auth_context(x_demo_role=..., x_demo_actor=..., x_workspace_id=...)`.

---

### DEFECT-04: Report Preview Modal Overlay Intercepting Pointer Events (P2 - Medium)
- **Observed Behavior:** During Playwright automated browser execution, clicking "View Report" opened the full-screen verification report preview overlay (`zIndex: 10000`). Subsequent sidebar navigation timed out after 30 seconds with `Locator.click: Timeout 30000ms exceeded. <div> intercepts pointer events`.
- **Root Cause:** In `VisualIntelligenceModal.tsx`, the Report Preview modal lacked an accessible and unique close button identifier and nested alongside the outer Visual Intelligence modal (`zIndex: 9999`).
- **Engineering Fix:**
  1. Added explicit `aria-label="Close Report Preview"` and `aria-label="Close Visual Intelligence"` to modal close controls.
  2. Updated automation script to systematically dismiss the inner report preview first, then close the outer modal, with a fallback `Escape` keypress.

---

### DEFECT-05: Single-Pass ReportLab Canvas Page Numbering (P3 - Low)
- **Observed Behavior:** Multi-page PDF verification reports displayed `Page 1 of ?` or static page totals.
- **Root Cause:** Single-pass PDF generation cannot know total page counts prior to completing all flowable layouts.
- **Engineering Fix:**
  - Implemented `NumberedVerificationCanvas` in `backend/app/services/logo_report_generator.py`, executing two-pass rendering: saving all drawing operations on first pass and calculating total page count `Y` before rendering `Page X of Y` on the second pass.

---

### DEFECT-06: Reviewer Justification Anti-Contamination (Security Guard)
- **Security Audit Finding:** Reviewers could potentially overwrite publishable draft content if justification notes were improperly routed into content fields.
- **Engineering Fix:**
  - Server validates reviewer justification notes with `HTTP 422 Unprocessable Entity` to guarantee that reviewer reasoning is stored strictly in `findings.disposition_reason` and never leaks into publishable copy.

---

### DEFECT-07: Dual-Layer Server Approval Gate Enforcement
- **Security Audit Finding:** Client-side approval buttons must not be trusted to prevent publication of non-compliant drafts.
- **Engineering Fix:**
  - In `backend/app/main.py:approval`, the server directly queries the database for unresolved `HIGH` or `CRITICAL` findings. If any exist, the request is rejected with `HTTP 409 Conflict`, completely independent of frontend UI state.
