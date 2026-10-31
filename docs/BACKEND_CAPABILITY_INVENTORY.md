# BRANDTRACE — BACKEND CAPABILITY INVENTORY

**Evaluation Standard:** Zero-Assumption API & Business Logic Classification  
**Source Router:** `backend/app/main.py`  
**Total Registered Functional Endpoints:** 69  
**Status Taxonomy Applied:**
- `IMPLEMENTED_AND_CONNECTED`: Implemented, tested, and accessible via active UI workflow.
- `IMPLEMENTED_BUT_HIDDEN`: Implemented in backend and mapped in API client, but lacks discoverable UI control.
- `IMPLEMENTED_BUT_NOT_CONNECTED`: Implemented in backend, but lacks frontend API client binding or UI connection.
- `PARTIALLY_IMPLEMENTED`: Implementation in progress or limited to subset of capability.
- `MOCKED_OR_DEMO_ONLY`: Synthetic response; not connected to live persistent storage.
- `BROKEN`: Failing requests or schema mismatch.
- `ROADMAP_ONLY`: Documented for future releases.
- `NOT_IMPLEMENTED`: Stubbed without real handler logic.
- `DEPLOYMENT_NOT_SYNCHRONIZED`: Implemented and passing locally, but pending cloud redeployment.

---

## 1. System & Health

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/health` | `GET` | `Internal health probe` | `None` | Public | `IMPLEMENTED_AND_CONNECTED` | src/components/system/SystemStatus.tsx |
| `/api/ready` | `GET` | `models.init_db & DB ping` | `Database ping` | Public | `IMPLEMENTED_AND_CONNECTED` | src/components/system/SystemStatus.tsx |
| `/api/overview` | `GET` | `Aggregated metrics & recent reviews` | `reviews, rules, facts, brand_profiles` | Role-aware (Demo) | `IMPLEMENTED_AND_CONNECTED` | src/components/BrandtraceWorkspacePremium.tsx |
| `/api/insights` | `GET` | `Recurring finding analytics` | `findings, reviews` | Role-aware (Demo) | `IMPLEMENTED_AND_CONNECTED` | src/components/BrandtraceWorkspacePremium.tsx |
| `/api/bootstrap` | `POST` | `Initial schema & system seeding` | `All 21 tables` | Admin secret | `IMPLEMENTED_BUT_NOT_CONNECTED` | Internal only |

## 2. Demo Environment & Safety Controls

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/demo/setup` | `POST` | `models.seed_demo_data` | `rules, facts, reviews, brand_profiles` | Local/demo only | `IMPLEMENTED_AND_CONNECTED` | src/services/api.ts |
| `/api/demo/reset` | `POST` | `models.reset_demo_data` | `All tables (scoped to workspace)` | Fail-closed (Local/demo secret) | `IMPLEMENTED_AND_CONNECTED` | src/components/BrandtraceWorkspacePremium.tsx |

## 3. Brand Constitution (Rules)

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/rules` | `GET` | `governance.py` | `rules, evidence_sources` | Brand Admin for write, All for read | `IMPLEMENTED_AND_CONNECTED` | Brand Constitution view |
| `/api/rules/{rule_id}` | `PUT` | `governance.py (Version increment)` | `rules, rule_versions` | Brand Admin | `IMPLEMENTED_AND_CONNECTED` | Brand Constitution rule edit modal |
| `/api/rules/{rule_id}/versions` | `GET` | `governance.py` | `rule_versions` | All roles | `IMPLEMENTED_AND_CONNECTED` | Brand Constitution history drawer |
| `/api/rules/check-conflicts` | `POST` | `rule_conflict_detector.py` | `rules` | Brand Admin / Reviewer | `IMPLEMENTED_BUT_HIDDEN` | src/services/api.ts (needs modal integration) |

## 4. Corporate Claim Ledger (Facts)

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/facts` | `GET` | `governance.py` | `facts, evidence_sources` | Brand Admin for write, All for read | `IMPLEMENTED_AND_CONNECTED` | Brand Constitution facts tab |
| `/api/facts/{fact_id}` | `PUT` | `governance.py (Version increment)` | `facts, fact_versions` | Brand Admin | `IMPLEMENTED_AND_CONNECTED` | Brand Constitution fact edit modal |
| `/api/facts/{fact_id}/versions` | `GET` | `governance.py` | `fact_versions` | All roles | `IMPLEMENTED_AND_CONNECTED` | Brand Constitution fact history drawer |

## 5. Content Review Pipeline

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/reviews` | `GET` | `governance.evaluate_content` | `reviews, findings, audit, evidence_dependencies` | Creator / Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | Content Review direct text tab |
| `/api/reviews/upload` | `POST` | `pdf_parser.py, image_analyzer.py, ocr_service.py` | `reviews, findings, audit, evidence_dependencies` | Creator / Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | Content Review file upload tab |
| `/api/reviews/{review_id}` | `GET` | `governance.py` | `reviews, findings, review_versions` | All roles | `IMPLEMENTED_AND_CONNECTED` | Content Review detail panel |
| `/api/reviews/{review_id}/findings/{finding_id}/actions` | `POST` | `governance.apply_finding_action` | `findings, reviews, review_versions, audit` | Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | Content Review finding cards |
| `/api/reviews/{review_id}/approval` | `POST` | `governance.execute_approval_decision` | `reviews, audit` | Reviewer / Admin (Server-side gate check) | `IMPLEMENTED_AND_CONNECTED` | Approval Queue / Review header |
| `/api/reviews/{review_id}/restore/{version_id}` | `POST` | `governance.restore_review_version` | `reviews, review_versions, audit` | Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | Content Review versions drawer |
| `/api/reviews/{review_id}/audit` | `GET` | `models.py` | `audit` | All roles | `IMPLEMENTED_AND_CONNECTED` | Audit History view |
| `/api/reviews/{review_id}/versions` | `GET` | `models.py` | `review_versions` | All roles | `IMPLEMENTED_AND_CONNECTED` | Content Review versions drawer |
| `/api/reviews/{review_id}/assignment` | `PATCH` | `models.py` | `reviews` | Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | ReviewAssignmentModal |
| `/api/reviews/{review_id}/comments` | `GET` | `models.py` | `review_comments` | All roles | `IMPLEMENTED_AND_CONNECTED` | ReviewCommentsPanel |

## 6. Visual Brand Assets & Standards

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/brand-assets` | `GET` | `visual_intelligence.py` | `brand_assets` | Admin / Reviewer | `IMPLEMENTED_AND_CONNECTED` | Brand Constitution assets tab |
| `/api/brand-assets/{asset_id}` | `PUT` | `visual_intelligence.py` | `brand_assets` | Admin | `IMPLEMENTED_BUT_HIDDEN` | Brand Constitution assets tab (delete connected; update needs modal) |
| `/api/brand-assets/{asset_id}/similarity` | `GET` | `visual_intelligence.py` | `brand_assets` | All roles | `IMPLEMENTED_BUT_HIDDEN` | src/services/api.ts (needs UI trigger in assets tab) |
| `/api/brand-assets/placement-check` | `POST` | `logo_detector.py` | `brand_profiles` | All roles | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |
| `/api/brand-profile` | `GET` | `color_science.py` | `brand_profiles` | Admin for write, All for read | `IMPLEMENTED_AND_CONNECTED` | Brand Constitution visual profile tab |

## 7. Document Intelligence & Typography

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/documents/ocr` | `POST` | `ocr_service.py & groq_vision_ocr.py` | `None` | All roles | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |
| `/api/documents/typography-check` | `POST` | `typography_analyzer.py` | `None` | All roles | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |

## 8. Evidence Source Vault

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/evidence-sources` | `GET` | `models.py` | `evidence_sources` | Admin / Reviewer | `IMPLEMENTED_AND_CONNECTED` | EvidenceSourceVault tab |
| `/api/evidence-sources/{source_id}` | `GET` | `models.py` | `evidence_sources` | Admin | `IMPLEMENTED_BUT_HIDDEN` | EvidenceSourceVault (read/delete connected; update needs modal) |

## 9. Brand Guideline Importer

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/constitution/import-guidelines` | `POST` | `guideline_importer.py` | `constitution_imports, imported_rule_candidates` | Brand Admin | `IMPLEMENTED_AND_CONNECTED` | GuidelineImportModal |
| `/api/constitution/imports` | `GET` | `models.py` | `constitution_imports` | Brand Admin | `IMPLEMENTED_AND_CONNECTED` | GuidelineImportModal |
| `/api/constitution/imports/{import_id}/candidates` | `GET` | `models.py` | `imported_rule_candidates` | Brand Admin | `IMPLEMENTED_AND_CONNECTED` | GuidelineImportModal |
| `/api/constitution/candidates/{candidate_id}` | `PUT` | `models.py` | `imported_rule_candidates` | Brand Admin | `IMPLEMENTED_AND_CONNECTED` | GuidelineImportModal candidate editor |
| `/api/constitution/candidates/{candidate_id}/approve` | `POST` | `guideline_importer.approve_candidate` | `imported_rule_candidates, rules, facts, audit` | Brand Admin | `IMPLEMENTED_AND_CONNECTED` | GuidelineImportModal approve button |
| `/api/constitution/candidates/{candidate_id}/reject` | `POST` | `guideline_importer.reject_candidate` | `imported_rule_candidates, audit` | Brand Admin | `IMPLEMENTED_AND_CONNECTED` | GuidelineImportModal reject button |

## 10. Time-Aware Impact & Expiry Intelligence

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/governance/impact-map` | `GET` | `impact_map.py` | `facts, rules, evidence_dependencies, reviews` | All roles | `IMPLEMENTED_AND_CONNECTED` | Governance Insights impact graph |
| `/api/governance/re-review-impact` | `POST` | `impact_map.trigger_targeted_re_review` | `reviews, findings, audit` | Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | Governance Insights re-review trigger |
| `/api/governance/guideline-health` | `GET` | `guideline_health.py` | `rules, findings, reviews` | All roles | `IMPLEMENTED_AND_CONNECTED` | Governance Insights guideline health meters |
| `/api/governance/rule-suggestions` | `GET` | `guideline_health.py` | `rule_suggestions` | All roles | `IMPLEMENTED_AND_CONNECTED` | Governance Insights suggestions list |
| `/api/governance/rule-suggestions/{rule_id}` | `POST` | `guideline_health.py` | `rule_suggestions` | Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | Governance Insights triage buttons |
| `/api/governance/rule-suggestions/{suggestion_id}/activate` | `POST` | `guideline_health.activate_suggestion` | `rules, rule_versions, rule_suggestions, audit` | Brand Admin (Optimistic 409 guard) | `IMPLEMENTED_AND_CONNECTED` | Governance Insights activate button |
| `/api/governance/rule-conflicts` | `GET` | `rule_conflict_detector.py` | `rules` | All roles | `IMPLEMENTED_AND_CONNECTED` | RuleConflictModal |
| `/api/governance/expiry-alerts` | `GET` | `expiry_monitor.py` | `governance_alerts` | All roles | `IMPLEMENTED_AND_CONNECTED` | Governance Insights alerts list |
| `/api/governance/expiry-alerts/{alert_id}/acknowledge` | `POST` | `expiry_monitor.py` | `governance_alerts, audit` | Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | Governance Insights alert acknowledge button |
| `/api/governance/expiry-scan` | `POST` | `expiry_monitor.run_expiry_scan` | `facts, rules, governance_alerts, governance_jobs` | Reviewer / Admin | `IMPLEMENTED_AND_CONNECTED` | Governance Insights run scan button |

## 11. Automated Expiry Worker

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/governance/expiry-worker/trigger` | `POST` | `expiry_worker.run_worker_job` | `governance_jobs, governance_alerts` | Admin | `IMPLEMENTED_BUT_HIDDEN` | src/services/api.ts (needs UI trigger in governance settings) |
| `/api/governance/expiry-worker/status` | `GET` | `expiry_worker.get_status` | `system_state, governance_jobs` | Admin | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |
| `/api/governance/expiry-worker/start-scheduler` | `POST` | `expiry_worker.start_scheduler` | `system_state` | Admin | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |
| `/api/governance/expiry-worker/stop-scheduler` | `POST` | `expiry_worker.stop_scheduler` | `system_state` | Admin | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |
| `/api/governance/expiry-jobs` | `GET` | `models.py` | `governance_jobs` | All roles | `IMPLEMENTED_BUT_HIDDEN` | src/services/api.ts (needs UI table in insights) |

## 12. Compliance Evidence Export

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/reviews/{review_id}/export-evidence` | `GET` | `compliance_exporter.py` | `reviews, findings, audit, brand_profiles` | All roles | `IMPLEMENTED_AND_CONNECTED` | ExportEvidenceButton component |

## 13. Multi-Workspace Members

| Route Path | Method | Handler / Service | Database Models | Auth | Status | Frontend Consumer |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/workspaces` | `POST` | `models.py` | `workspaces, workspace_members` | Admin | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |
| `/api/workspaces/{workspace_id}/members` | `GET` | `models.py` | `workspace_members` | Admin | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |
| `/api/workspaces/{workspace_id}/members/{actor_id}` | `DELETE` | `models.py` | `workspace_members` | Admin | `IMPLEMENTED_BUT_NOT_CONNECTED` | Not connected in api.ts or UI |

