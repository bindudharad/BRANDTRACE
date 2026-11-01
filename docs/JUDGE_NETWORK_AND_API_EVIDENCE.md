# BRANDTRACE — JUDGE NETWORK & API EVIDENCE REPORT
**Telemetry Framework:** Playwright Network Event Interception
**Total Requests Recorded:** 557
**Verification Date:** 2026-11-01 00:10:36 UTC

## 1. Network Telemetry Summary

During the browser judge simulation, all frontend interactions were monitored for HTTP status codes, latencies, and security headers.

* **Failed Network Requests (5xx / Unhandled Errors):** **0**
* **Strict Server-Side Approval Enforcement:** Confirmed `HTTP 409 Conflict` response when approving drafts with unresolved HIGH severity findings.
* **Anti-Contamination Security Guard:** Confirmed `HTTP 422 Unprocessable Entity` prevents reviewer justification text from overwriting publishable draft content.
* **Zero Secret Leakage:** No API keys, JWT secrets, or administrative database credentials exposed in network payloads.

## 2. API Request Trace

| Timestamp | Method | Endpoint / Resource | Status | Result |
| :---: | :---: | :--- | :---: | :---: |
| 00:11:03 | `GET` | `3055/` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/main.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/@vite/client` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/.vite/deps/react.js?v=fab81a30` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=fab81a30` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/App.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/vite/dist/client/env.mjs` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/.vite/deps/chunk-G3PMV62Z.js?v=fab81a30` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/index.css` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/.vite/deps/chunk-XG5U26FK.js?v=fab81a30` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/BrandtraceHero/index.ts` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/context/KeyContext.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=In` | `200 ` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/.vite/deps/react-dom_client.js?v=fab81a30` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/data/sampleBrandProfiles.ts` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/services/geminiSemanticEngine.ts` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/BrandtraceHero/BrandtraceHero.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/BrandtraceWorkspacePremium.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/.vite/deps/chunk-6QHJW7VW.js?v=fab81a30` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/services/environment.ts` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/judge/JudgeAccessModal.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/navigation/PremiumNavbar.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/3d/EvidenceNetwork3D.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/3d/EvidenceCore3D.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/judge/JudgeTourModal.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/services/api.ts` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/BrandConstitution/GuidelineImportModal.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/BrandConstitution/RuleConflictModal.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/BrandConstitution/EvidenceSourceVault.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/ContentReview/ExportEvidenceButton.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/ContentReview/ReviewAssignmentModal.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/VisualIntelligence/VisualIntelligenceModal.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/ContentReview/ReviewCommentsPanel.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/QualityMetricsCards.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/system/SystemStatus.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/index.ts` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/.vite/deps/lucide-react.js?v=fab81a30` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/SeverityBarChart.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/ActivityTimeline.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/JudgeTourModal.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/ReviewOutcomeDonut.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/WorkflowStepper.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/EvidenceStatusBarChart.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/HonestLimitationsBanner.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/EvidenceDecisionChain.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/InteractiveImpactGraph.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/GuidelineHealthMeters.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/src/components/analytics/ExpiryWorkerPanel.tsx` | `200 OK` | Verified |
| 00:11:03 | `GET` | `3055/node_modules/.vite/deps/three.js?v=fab81a30` | `200 OK` | Verified |
| 00:11:04 | `GET` | `3055/api/ready` | `200 OK` | Verified |
| 00:11:04 | `GET` | `3055/favicon.svg?v=4` | `200 OK` | Verified |
| 00:11:05 | `GET` | `3055/favicon.svg?v=4` | `200 OK` | Verified |
| 00:11:05 | `POST` | `3055/api/demo/setup` | `200 OK` | Verified |
| 00:11:05 | `GET` | `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw` | `200 ` | Verified |
| 00:11:05 | `GET` | `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw` | `200 ` | Verified |
| 00:11:05 | `GET` | `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw` | `200 ` | Verified |
| 00:11:06 | `POST` | `3055/api/demo/setup` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/overview` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/facts` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/rules` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/reviews` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/brand-profile` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/insights` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/overview` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/governance/guideline-health` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/brand-assets` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/governance/impact-map` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/governance/rule-suggestions` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/facts` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/rules` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/brand-profile` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/reviews` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/insights` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/brand-assets` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/governance/guideline-health` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/governance/impact-map` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/governance/rule-suggestions` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/governance/expiry-alerts` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/reviews/rev_launch_q4/audit` | `200 OK` | Verified |
| 00:11:06 | `GET` | `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw` | `200 ` | Verified |
| 00:11:06 | `GET` | `3055/api/governance/expiry-alerts` | `200 OK` | Verified |
| 00:11:06 | `GET` | `3055/api/reviews/rev_launch_q4/audit` | `200 OK` | Verified |
| 00:11:10 | `PUT` | `3055/api/brand-profile` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/overview` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/rules` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/facts` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/reviews` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/brand-profile` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/governance/impact-map` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/brand-assets` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/governance/rule-suggestions` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/insights` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/governance/guideline-health` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/governance/expiry-alerts` | `200 OK` | Verified |
| 00:11:10 | `GET` | `3055/api/reviews/rev_launch_q4/audit` | `200 OK` | Verified |
| 00:11:14 | `POST` | `3055/api/rules` | `201 Created` | Verified |
| 00:11:14 | `GET` | `3055/api/overview` | `200 OK` | Verified |
| 00:11:14 | `GET` | `3055/api/brand-profile` | `200 OK` | Verified |
| 00:11:14 | `GET` | `3055/api/facts` | `200 OK` | Verified |
| 00:11:14 | `GET` | `3055/api/rules` | `200 OK` | Verified |
