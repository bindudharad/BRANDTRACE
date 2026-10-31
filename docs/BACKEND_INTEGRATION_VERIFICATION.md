# BRANDTRACE — BACKEND INTEGRATION & DATA TRACEABILITY
**Traceability Scope:** UI Interaction &rarr; REST API Route &rarr; Service Function &rarr; Database Entity.  
**Verification Date:** 2026-10-31 04:03:46 UTC  

| UI Action / Feature | Frontend Service Call | Backend API Route | Service Logic | Database Entity | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Add Brand Rule** | `api.createRule()` | `POST /api/rules` | `governance.py` | `rules`, `rule_versions` | **VERIFIED** |
| **Save Visual Profile** | `api.updateBrandProfile()`| `POST /api/brand-profile` | `models.py` | `brand_profiles` | **VERIFIED** |
| **Record Fact** | `api.createFact()` | `POST /api/facts` | `models.py` | `facts` | **VERIFIED** |
| **Import Guidelines** | `api.importGuidelines()` | `POST /api/constitution/import-guidelines`| `guideline_importer.py` | `guideline_candidate_rules` | **VERIFIED** |
| **Submit Draft** | `api.submitReview()` | `POST /api/reviews` | `governance.py` | `reviews`, `findings` | **VERIFIED** |
| **Dismiss Finding** | `api.findingAction()` | `POST /api/reviews/{id}/findings/{fid}/actions` | `finding_actions.py` | `findings.disposition` | **VERIFIED** |
| **Apply Replacement** | `api.applyEdit()` | `POST /api/reviews/{id}/findings/{fid}/actions` | `finding_actions.py` | `reviews.content`, `review_versions` | **VERIFIED** |
| **Compliance Approval**| `api.approveReview()` | `POST /api/reviews/{id}/approval` | `main.py` | `reviews.status = 'APPROVED'` | **VERIFIED** |
| **OCR Text Extraction** | `api.analyzeOcr()` | `POST /api/ocr/analyze` | `ocr_service.py` | Non-persisted analysis | **VERIFIED** |
| **Logo Placement** | `api.detectLogo()` | `POST /api/visual/detect-logo` | `logo_detector.py` | Visual compliance findings | **VERIFIED** |
| **Font Identification** | `api.detectFont()` | `POST /api/visual/detect-font` | `font_detector.py` | Visual compliance findings | **VERIFIED** |
| **Guideline Health** | `api.guidelineHealth()` | `GET /api/governance/guideline-health` | `guideline_health.py` | Rule telemetry aggregation | **VERIFIED** |
| **Impact Map** | `api.getImpactMap()` | `GET /api/governance/impact-map` | `expiry_monitor.py` | `evidence_dependencies` | **VERIFIED** |
