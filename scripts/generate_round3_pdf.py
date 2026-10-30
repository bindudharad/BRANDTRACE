import os
import sys
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_PDF = REPO_ROOT / "docs" / "BRANDTRACE_ROUND3_FINAL_PRODUCT.pdf"
OUT_PDF.parent.mkdir(parents=True, exist_ok=True)

# Enterprise Color Palette
c_forest = colors.HexColor("#123B2D")
c_emerald = colors.HexColor("#0E9F78")
c_light_bg = colors.HexColor("#F6F8F6")
c_border = colors.HexColor("#DCE5DF")
c_dark_slate = colors.HexColor("#13263A")
c_muted = colors.HexColor("#617168")
c_white = colors.white
c_accent_sky = colors.HexColor("#E6F4F1")
c_card_alt = colors.HexColor("#FAFBF9")
c_crimson = colors.HexColor("#991B1B")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name="CoverPre",
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=14,
    textColor=c_emerald,
    alignment=TA_CENTER,
    spaceAfter=6,
    textTransform="uppercase"
))

styles.add(ParagraphStyle(
    name="CoverTitle",
    fontName="Helvetica-Bold",
    fontSize=28,
    leading=34,
    textColor=c_forest,
    alignment=TA_CENTER,
    spaceAfter=8
))

styles.add(ParagraphStyle(
    name="CoverSub",
    fontName="Helvetica",
    fontSize=13,
    leading=18,
    textColor=c_muted,
    alignment=TA_CENTER,
    spaceAfter=4
))

styles.add(ParagraphStyle(
    name="CoverTag",
    fontName="Helvetica-Bold",
    fontSize=10,
    leading=14,
    textColor=c_dark_slate,
    alignment=TA_CENTER,
    spaceAfter=15
))

styles.add(ParagraphStyle(
    name="SectionH1",
    fontName="Helvetica-Bold",
    fontSize=16,
    leading=20,
    textColor=c_forest,
    spaceBefore=14,
    spaceAfter=8,
    keepWithNext=True
))

styles.add(ParagraphStyle(
    name="SectionH2",
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=15,
    textColor=c_emerald,
    spaceBefore=8,
    spaceAfter=4,
    keepWithNext=True
))

styles.add(ParagraphStyle(
    name="DocBody",
    fontName="Helvetica",
    fontSize=8.5,
    leading=12.5,
    textColor=c_dark_slate,
    spaceAfter=5
))

styles.add(ParagraphStyle(
    name="DocBodyBold",
    fontName="Helvetica-Bold",
    fontSize=8.5,
    leading=12.5,
    textColor=c_dark_slate,
    spaceAfter=5
))

styles.add(ParagraphStyle(
    name="DocSmall",
    fontName="Helvetica",
    fontSize=7.5,
    leading=10.5,
    textColor=c_muted
))

styles.add(ParagraphStyle(
    name="DocSmallBold",
    fontName="Helvetica-Bold",
    fontSize=7.5,
    leading=10.5,
    textColor=c_dark_slate
))

styles.add(ParagraphStyle(
    name="ThCell",
    fontName="Helvetica-Bold",
    fontSize=7.8,
    leading=10.5,
    textColor=c_white
))

styles.add(ParagraphStyle(
    name="TbCell",
    fontName="Helvetica",
    fontSize=7.4,
    leading=10,
    textColor=c_dark_slate
))

styles.add(ParagraphStyle(
    name="TbCellBold",
    fontName="Helvetica-Bold",
    fontSize=7.4,
    leading=10,
    textColor=c_dark_slate
))

styles.add(ParagraphStyle(
    name="CalloutText",
    fontName="Helvetica",
    fontSize=8.5,
    leading=13,
    textColor=c_forest
))

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 7.5)
        self.setFillColor(c_muted)

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(16 * mm, 285 * mm, "BRANDTRACE — CodeAxis Round 3 Final Product Report")
            self.drawRightString(194 * mm, 285 * mm, "Team_Nexus · 2026-10-30")
            self.setStrokeColor(c_border)
            self.setLineWidth(0.5)
            self.line(16 * mm, 282 * mm, 194 * mm, 282 * mm)

        # Footer (all pages)
        self.setStrokeColor(c_border)
        self.setLineWidth(0.5)
        self.line(16 * mm, 14 * mm, 194 * mm, 14 * mm)
        self.drawString(16 * mm, 9.5 * mm, "BRANDTRACE: Evidence-Aware AI-Assisted Brand Governance Platform")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(194 * mm, 9.5 * mm, page_str)
        self.restoreState()

def p(text, style="DocBody"):
    return Paragraph(text, styles[style])

def create_table(data, widths, is_header=True):
    t = Table(data, colWidths=widths, repeatRows=1 if is_header else 0, hAlign="LEFT")
    ts = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, c_border),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if is_header:
        ts.extend([
            ("BACKGROUND", (0, 0), (-1, 0), c_forest),
            ("TEXTCOLOR", (0, 0), (-1, 0), c_white),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [c_white, c_card_alt]),
        ])
    t.setStyle(TableStyle(ts))
    return t

def build_pdf():
    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="BRANDTRACE CodeAxis Round 3 Final Product Report",
        author="Team_Nexus"
    )

    story = []

    # =========================================================================
    # COVER / HEADER BLOCK
    # =========================================================================
    story.append(Spacer(1, 10 * mm))
    story.append(p("CodeAxis Hackathon Round 3: The Final Build", "CoverPre"))
    story.append(p("BRANDTRACE", "CoverTitle"))
    story.append(p("Evidence-Aware AI-Assisted Brand Governance Platform", "CoverSub"))
    story.append(p("Team: <b>Team_Nexus</b> &nbsp;|&nbsp; Repository: <code>C:\\Projects\\BRANDTRACE\\BRANDTRACE</code> &nbsp;|&nbsp; Date: <b>2026-10-30</b>", "CoverTag"))

    # Core Principle Callout
    principle_box = [
        [
            p("<b>CORE PRODUCT PRINCIPLE:</b><br/>"
              "<i>&ldquo;Every finding has a source. Every decision has an owner.&rdquo;</i><br/>"
              "<font size='7.5' color='#617168'>BRANDTRACE insists that compliance findings link directly to active approved brand rules and facts. High-risk violations programmatically block publication sign-off at the server level until an authorized human records a documented disposition.</font>",
              "CalloutText")
        ]
    ]
    t_principle = Table(principle_box, colWidths=[178 * mm])
    t_principle.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), c_accent_sky),
        ("BOX", (0, 0), (-1, -1), 0.8, c_emerald),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t_principle)
    story.append(Spacer(1, 6 * mm))

    # Executive Summary Status Card
    status_summary = [
        [p("VERIFICATION VECTOR", "ThCell"), p("GROUND-TRUTH RESULT", "ThCell"), p("STATUS & EVIDENCE", "ThCell")],
        [p("Backend Test Suite"), p("<b>133 passed, 1 skipped</b> (0 failed across 18 test files)"), p("126 baseline + 7 Round 3 acceptance suites; pytest Python 3.10")],
        [p("Automated Browser QA"), p("<b>32 / 32 PASSED (100%)</b>"), p("Playwright Chrome 156 against dedicated isolated backend 8031 & frontend 3001")],
        [p("Isolated PostgreSQL 18 Live"), p("<b>ALL 11 PHASES & 4 PYTESTS PASSED (100%)</b>"), p("36 assertions verified on disposable cluster 5438; host 5432 & dev DB untouched")],
        [p("Hosted Neon Staging Runbook"), p("<b>10 / 10 CHECKS PASSED (100%)</b>"), p("Neon PostgreSQL port 8017 verified; rule_6db288b87ba4 retained artifact")],
        [p("TypeScript & Production Build"), p("<b>0 errors · 51,297 chars prerendered</b>"), p("1,691 modules transformed; production bundle verified via npm run build")],
        [p("API Route Inventory"), p("<b>39 registered routes (100% accounted)</b>"), p("30 user-facing UI active, 5 internal admin, 2 demo lifecycle, 2 diagnostics")],
    ]
    story.append(create_table(status_summary, [42 * mm, 68 * mm, 68 * mm]))
    story.append(Spacer(1, 6 * mm))

    # =========================================================================
    # SECTION 1: PRODUCT WORKFLOW & STATE MACHINE
    # =========================================================================
    story.append(p("1. Product Workflow & Server-Enforced Governance Gate", "SectionH1"))
    story.append(p(
        "BRANDTRACE reviews content drafts (plain text, markdown, PDF documents, or raster images) against deterministic brand rules and time-aware facts. "
        "The application enforces a rigorous five-stage state machine that prevents unverified content publication:",
        "DocBody"
    ))

    flow_data = [
        [p("Workflow Stage", "ThCell"), p("Engine Action & Architectural Enforcement", "ThCell"), p("Resulting Record State", "ThCell")],
        [
            p("1. Submission & Ingestion"),
            p("Draft submitted via Direct Text, PDF upload (pypdf), or Image upload. 64KB bounded streaming size guard prevents buffer overflow attacks (HTTP 413 guard)."),
            p("Status: <code>IN_REVIEW</code><br/>Initial version snapshot created in <code>review_versions</code>.")
        ],
        [
            p("2. Deterministic Analysis"),
            p("Evaluates prohibited phrases, required product terms, fact validity dates, and CIELAB color distances. Links every finding to a source rule/fact."),
            p("Clearance Score computed (0–100). Status: <code>CONTRADICTED</code>, <code>OUTDATED</code>, <code>NEEDS_REVIEW</code>.")
        ],
        [
            p("3. Evidence Decision Chain"),
            p("Reviewer inspects flagged passage, triggered rule, and grounded fact. Can Accept (exact-span replacement, 0 word duplication), Edit, or Dismiss."),
            p("Finding status: <code>RESOLVED</code>.<br/>Dismissal strictly requires human reason text.")
        ],
        [
            p("4. Approval Gate Boundary"),
            p("Server-enforced boundary: <code>POST /api/reviews/{review_id}/approval</code> checks for unresolved HIGH/CRITICAL findings. Returns HTTP 409 Conflict if blocked."),
            p("Draft remains <code>IN_REVIEW</code> if blocked.<br/>Transitions to <code>APPROVED</code> once cleared.")
        ],
        [
            p("5. Audit & Rollback Ledger"),
            p("Every mutation appends an immutable compliance record to <code>audit</code>. Prior revisions can be restored with automatic compliance re-analysis."),
            p("Immutable version history maintained; zero destructive in-place overwrites.")
        ],
    ]
    story.append(create_table(flow_data, [35 * mm, 98 * mm, 45 * mm]))
    story.append(PageBreak())

    # =========================================================================
    # SECTION 2: SYSTEM ARCHITECTURE & DATA MODEL
    # =========================================================================
    story.append(p("2. System Architecture & Relational Persistence", "SectionH1"))
    story.append(p(
        "BRANDTRACE operates a decoupled, enterprise architecture connecting an Apple-inspired React 19 frontend to an asynchronous FastAPI backend. "
        "Persistence is abstracted via SQLAlchemy, supporting seamless portability between local SQLite development and PostgreSQL 18 / hosted Neon production.",
        "DocBody"
    ))

    arch_data = [
        [p("Layer / Component", "ThCell"), p("Technologies & Libraries", "ThCell"), p("Key Responsibilities & Operational Guarantees", "ThCell")],
        [
            p("Frontend Client"),
            p("React 19, TypeScript, Vite 6.4.5, TailwindCSS, Lucide-React"),
            p("Single-page workspace with 9 specialized views, interactive SVG analytics, responsive navigation (375px mobile to 4K desktop), and accessible contrast.")
        ],
        [
            p("API Client Layer"),
            p("Typed REST client (<code>src/services/api.ts</code>)"),
            p("Provides 34 typed client SDK methods spanning all user-facing, demo, and diagnostic routes with role simulation headers; 5 admin routes managed via CLI/runbooks.")
        ],
        [
            p("API Service Boundary"),
            p("FastAPI 0.115, Uvicorn, Pydantic v2"),
            p("Strict request validation, Bearer/API-key token auth in production mode, tenant isolation, and centralized HTTP error mapping (401, 403, 409, 413, 422).")
        ],
        [
            p("Governance Core"),
            p("Python 3.10 standard library, pypdf, Pillow"),
            p("Deterministic exact-span regex matching, CIELAB Delta-E color distance, W3C WCAG 2.1 relative luminance, and cryptographic SHA-256 byte hashing.")
        ],
        [
            p("Relational Persistence"),
            p("SQLAlchemy 2.0, Psycopg 3, SQLite & PostgreSQL 18"),
            p("15 normalized tables: <code>workspaces</code>, <code>workspace_members</code>, <code>system_state</code>, <code>rules</code>, <code>rule_versions</code>, <code>facts</code>, <code>fact_versions</code>, <code>brand_profiles</code>, <code>brand_assets</code>, <code>reviews</code>, <code>review_versions</code>, <code>findings</code>, <code>evidence_dependencies</code>, <code>rule_suggestions</code>, <code>audit</code>.")
        ],
    ]
    story.append(create_table(arch_data, [35 * mm, 45 * mm, 98 * mm]))
    story.append(Spacer(1, 4 * mm))

    story.append(p("Relational Schema Integrity & Workspace Tenant Isolation", "SectionH2"))
    story.append(p(
        "All data-bearing tables enforce workspace isolation via <code>workspace_id</code> columns. In Phase 1 audit remediation, <code>guideline-health</code> "
        "and <code>rule-suggestions</code> were updated to scope findings through their parent reviews (<code>LEFT JOIN reviews r ON f.review_id = r.id</code>). "
        "Foreign-workspace queries and writes are rejected with <code>HTTP 403 Forbidden</code> with zero database modifications. "
        "Demo reset (<code>POST /api/demo/reset</code>) is defensively constrained to <code>workspace_id = 'ws_default'</code>, safeguarding other workspace partitions.",
        "DocBody"
    ))
    story.append(Spacer(1, 4 * mm))

    # =========================================================================
    # SECTION 3: THREE ROUND 3 COMMITMENTS
    # =========================================================================
    story.append(p("3. Three Major Round 3 Commitments: Verified Implementations", "SectionH1"))

    commitments_data = [
        [p("Commitment", "ThCell"), p("Architectural Implementation & User-Facing Path", "ThCell"), p("Acceptance Test & Verified Proof", "ThCell"), p("Limitations Disclosed", "ThCell")],
        [
            p("<b>1. Time-Aware Claim Ledger & Impact Map</b>"),
            p("Facts carry validity windows (<code>effective_from</code>, <code>valid_until</code>) and notes. 30-day expiring-soon badge and hard expiration alerting. Bi-directional dependency tracking in <code>evidence_dependencies</code>. Interactive SVG impact graph. Targeted re-review (<code>POST /api/governance/re-review-impact</code>)."),
            p("<b>test_scenario_a_claim_ledger_acceptance.py (PASS)</b><br/>"
              "Verified: 1 approved fact expired with 3 dependent drafts + 1 unrelated draft. Exactly the 3 dependent drafts transitioned to <code>CHANGES_REQUESTED</code>; unrelated draft stayed <code>APPROVED</code>."),
            p("Impact graph relies on explicitly tracked rule/fact links; arbitrary unlinked semantic inference is not attempted.")
        ],
        [
            p("<b>2. Multimodal Visual Brand Compliance</b>"),
            p("PDF text extraction via pypdf. 64KB bounded streaming upload guard. Pillow-based dominant palette extraction with CIELAB Delta-E color distance against visual brand profile. W3C WCAG 2.1 relative luminance contrast on design tokens. Cryptographic SHA-256 asset registry (<code>GET/POST /api/brand-assets</code>, <code>DELETE /api/brand-assets/{asset_id}</code>)."),
            p("<b>test_scenario_b_visual_compliance_acceptance.py (PASS)</b><br/>"
              "Verified: 6 design-token pairs evaluated with 100% precision & recall (TP=3, TN=3, FP=0, FN=0). Asset registry flags exact binary matches (APPROVED/RESTRICTED)."),
            p("Upload-derived contrast is reference-only (<code>NEEDS_REVIEW</code>) due to indeterminate text roles. Pure-raster OCR is unsupported (Option B).")
        ],
        [
            p("<b>3. Guideline-Health Intelligence & Feedback</b>"),
            p("Aggregates finding telemetry, dismissals, and reviewer disagreements. Distinct-actor disagreement detection. Traceable clarification proposals (<code>GET /api/governance/rule-suggestions</code>). Reviewer triage (<code>POST /api/governance/rule-suggestions/{rule_id}</code>). Admin activation (<code>POST /api/governance/rule-suggestions/{suggestion_id}/activate</code>) with optimistic concurrency (HTTP 409)."),
            p("<b>test_scenario_c_guideline_health_acceptance.py (PASS)</b><br/>"
              "Verified: Disagreement detected across 3 independent drafts. Reviewer proposal acceptance rejected (HTTP 403); admin accepted (HTTP 200). Stale version rejected (409); valid activation promoted rule to v2 with audit."),
            p("Suggestions provide deterministic advisory text; automated policy mutation without administrator sign-off is prohibited.")
        ],
    ]
    story.append(create_table(commitments_data, [35 * mm, 55 * mm, 50 * mm, 38 * mm]))
    story.append(PageBreak())

    # =========================================================================
    # SECTION 4: TESTING & VERIFICATION EVIDENCE
    # =========================================================================
    story.append(p("4. Comprehensive Verification Evidence & QA Proof", "SectionH1"))
    story.append(p(
        "Every layer of BRANDTRACE has been subjected to rigorous, repeatable automated testing using dedicated isolated processes and disposable databases. "
        "The live development database (<code>brandtrace.db</code>) and host services remained 100% untouched throughout all runs.",
        "DocBody"
    ))

    test_matrix = [
        [p("Test Suite / Harness", "ThCell"), p("Target & Execution Mode", "ThCell"), p("Coverage & Assertions Verified", "ThCell"), p("Result & Proof", "ThCell")],
        [
            p("Standard SQLite Regression<br/>(<code>scripts/verify_sqlite_regression.py</code>)"),
            p("Dedicated disposable SQLite database; 14 test modules"),
            p("Baseline API endpoints, color science, PDF parser, production auth, disposition integrity, QA regression, claim ledger, visual benchmark, guideline health, defect repairs."),
            p("<b>126 passed, 1 skipped</b><br/>(22.8s runtime, 0 failed)")
        ],
        [
            p("Round 3 Security & Acceptance<br/>(<code>backend/tests/test_scenario_*.py</code>)"),
            p("Ephemeral pytest process; 4 test suites"),
            p("Phase 1 security access control (401 unauth, 403 foreign workspace, 0 writes), Scenario A (claim ledger & impact re-review), Scenario B (visual compliance & contrast), Scenario C (guideline health & activation)."),
            p("<b>7 passed, 0 failed</b><br/>(2.36s runtime)")
        ],
        [
            p("Combined Backend Pytest"),
            p("All 18 test files in <code>backend/tests</code>"),
            p("Full test suite across both baseline and Round 3 security/scenario acceptance suites."),
            p("<b>133 passed, 1 skipped</b><br/>(1 skipped requires Gemini key)")
        ],
        [
            p("Isolated Browser QA Suite<br/>(<code>scripts/run_isolated_browser_qa.py</code>)"),
            p("Headless Chrome 156; isolated backend port 8031, Vite frontend port 3001, disposable DB"),
            p("Full 32-scenario end-to-end journey: Hero navigation, tour, draft submission, neutral corrections, missing terms, broad claims, contamination guards, approval gate (409), dismissal reasons, PDF upload, image palette, role simulation, asset registry, impact map, guideline health, fact notes, profile editing, rule version history, empty/error states, cross-workspace denial (403)."),
            p("<b>32 / 32 PASSED (100%)</b><br/>(56.4s runtime, 0 failed)")
        ],
        [
            p("Isolated PostgreSQL 18 Live<br/>(<code>scripts/test_postgresql_isolated_live.py</code>)"),
            p("Disposable PostgreSQL 18 cluster (port 5438); SCRAM-SHA-256 auth; strict <code>ASSERT_POSTGRESQL=1</code>"),
            p("15 public tables schema initialization, idempotency, bootstrap lifecycle (401, 403, 201, 409), core CRUD & JSON datatypes, strict cross-workspace isolation (ws_alpha vs ws_beta zero leakage), review lifecycle & approval gate, transaction rollback, and 4 pytest suites (36 live PG assertions)."),
            p("<b>ALL 11 PHASES PASSED</b><br/>(Host port 5432 & dev DB untouched)")
        ],
        [
            p("Hosted Neon Staging Runbook<br/>(<code>scripts/verify_hosted_staging.ps1</code>)"),
            p("Hosted Neon PostgreSQL cluster; dedicated port 8017"),
            p("10 acceptance checks: schema verified, /api/health and /api/ready HTTP 200, unauth 401, reviewer bootstrap 403, idempotent bootstrap 409, rule creation 201, rule version history 200, foreign workspace 403, member provisioning 201, lockout prevention 422. Retained acceptance artifact <code>rule_6db288b87ba4</code>."),
            p("<b>10 / 10 CHECKS PASSED</b><br/>(Clean run, process stopped)")
        ],
        [
            p("Frontend Static Typecheck<br/>(<code>npx tsc --noEmit</code>)"),
            p("TypeScript compiler (Node v20)"),
            p("Strict type validation across all React components, analytics charts, modals, and API client interfaces."),
            p("<b>0 errors</b>")
        ],
        [
            p("Production Build & Prerender<br/>(<code>npm run build</code>)"),
            p("Vite 6.4.5 + TSX prerenderer"),
            p("Production bundle compilation, chunk optimization, gzip size computation, and static HTML prerendering."),
            p("<b>Passed</b><br/>(1,691 modules transformed, 51,297 chars prerendered)")
        ],
    ]
    story.append(create_table(test_matrix, [38 * mm, 42 * mm, 62 * mm, 36 * mm]))
    story.append(Spacer(1, 4 * mm))

    # =========================================================================
    # SECTION 5: UI & ANALYTICS VISUALIZATION SYSTEM
    # =========================================================================
    story.append(p("5. Apple-Inspired UI Design & Analytics Architecture", "SectionH1"))
    story.append(p(
        "BRANDTRACE features a cohesive, light enterprise design system inspired by the precision, whitespace, and typographic restraint of Apple, Mitigata, and Gordon. "
        "The interface balances clean executive presentation with deep evidentiary inspectability:",
        "DocBody"
    ))

    ui_features = [
        [p("Component / View", "ThCell"), p("Design Execution & Interactive Capability", "ThCell"), p("Evidentiary Truth & Data Binding", "ThCell")],
        [
            p("BrandtraceHero & Evidence Prism"),
            p("Interactive marketing landing page with live dynamic <code>/api/ready</code> status probe, 15-second value proposition, and two primary CTAs: 'Enter Workspace' and 'Take Judge Tour'."),
            p("Dynamic health badge; displays live database dialect from server. Zero hardcoded passing test claims.")
        ],
        [
            p("Workflow Stepper<br/>(<code>WorkflowStepper.tsx</code>)"),
            p("5-stage interactive progression stepper linking Brand Constitution, Content Review, Evidence Triage, Governance Approval, and Guideline Telemetry."),
            p("Reflects real workflow stages; allows one-click navigation across workspace views.")
        ],
        [
            p("Review Outcome Donut<br/>(<code>ReviewOutcomeDonut.tsx</code>)"),
            p("Interactive SVG donut chart displaying distribution across Approved, In Review, Changes Requested, and Waived drafts with hover tooltips and clearance pass rates."),
            p("Directly computed from <code>reviews</code> array; reflects real database status counts.")
        ],
        [
            p("Severity & Status Bar Charts<br/>(<code>SeverityBarChart.tsx</code>, <code>EvidenceStatusBarChart.tsx</code>)"),
            p("Proportional stacked bar charts showing findings by severity (CRITICAL, HIGH, MEDIUM, LOW) and evidence status (CONTRADICTED, OUTDATED, UNSUPPORTED, NEEDS_REVIEW)."),
            p("Directly bound to <code>insights.by_severity</code> and <code>insights.by_evidence_status</code> from <code>/api/insights</code>.")
        ],
        [
            p("Activity Timeline<br/>(<code>ActivityTimeline.tsx</code>)"),
            p("Chronological provenance timeline showing recent submissions, approvals, waivers, and rule updates with actor badges and relative timestamps."),
            p("Bound to real <code>audit</code> records and <code>reviews</code> metadata; no synthetic events.")
        ],
        [
            p("Interactive Impact Graph<br/>(<code>InteractiveImpactGraph.tsx</code>)"),
            p("SVG dependency graph linking verified facts to dependent drafts. Displays expiring-soon alerts, hard expiration badges, and includes a tabular list fallback."),
            p("Constructed strictly from <code>evidence_dependencies</code>, <code>facts</code>, and <code>reviews</code>.")
        ],
        [
            p("Evidence Decision Chain<br/>(<code>EvidenceDecisionChain.tsx</code>)"),
            p("Four-node provenance progression rendered on every finding card: 1. Flagged Passage → 2. Policy Rule → 3. Grounded Evidence → 4. Human Disposition."),
            p("Displays actual passage text, rule ID, fact excerpt, source URL, and recorded reviewer reason.")
        ],
        [
            p("Guided Judge Tour Modal<br/>(<code>JudgeTourModal.tsx</code>)"),
            p("Step-by-step interactive walkthrough guiding evaluators through the 7 core pillars of BRANDTRACE with keyboard navigation (Esc, arrows) and view navigation."),
            p("Informational walkthrough; performs zero destructive mutations during tour navigation.")
        ],
    ]
    story.append(create_table(ui_features, [35 * mm, 80 * mm, 63 * mm]))
    story.append(PageBreak())

    # =========================================================================
    # SECTION 6: SECURITY, HUMAN OVERSIGHT & TRANSPARENCY
    # =========================================================================
    story.append(p("6. Security Architecture & Honest Technical Limitations", "SectionH1"))

    story.append(p("Security, RBAC, and Authentication Boundaries", "SectionH2"))
    story.append(p(
        "• <b>Production vs Demo Mode:</b> When <code>ALLOW_DEMO_AUTH=False</code>, all synthetic demo headers (<code>X-Demo-Role</code>, <code>X-Demo-Actor</code>) "
        "are strictly rejected with HTTP 401. Production requests require Bearer tokens or verified API keys.<br/>"
        "• <b>Permanent One-Way Bootstrap:</b> <code>POST /api/bootstrap</code> records a durable completion marker in <code>system_state</code>. "
        "Subsequent bootstrap attempts return HTTP 409 Conflict.<br/>"
        "• <b>Lockout Prevention:</b> Workspace administrators cannot remove their own membership (HTTP 422 Unprocessable Entity), preventing accidental organizational lockout.<br/>"
        "• <b>Zero Client Secrets:</b> Privileged database credentials, admin API keys, and server-side connection strings are never exposed in frontend bundles or <code>VITE_*</code> environment variables.",
        "DocBody"
    ))
    story.append(Spacer(1, 4 * mm))

    story.append(p("Transparent Disclosure of Technical Boundaries", "SectionH2"))

    limits_data = [
        [p("Capability Area", "ThCell"), p("What BRANDTRACE Implements", "ThCell"), p("Explicit Limitation / What Is NOT Claimed", "ThCell")],
        [
            p("Visual Contrast Analysis"),
            p("W3C WCAG 2.1 relative luminance calculation on semantic foreground/background design token pairs (verified across 6 benchmark pairs with 100% precision/recall)."),
            p("Dominant-color ratios extracted from uploaded raster images are heuristic indicators labelled <code>NEEDS_REVIEW</code>. Automatic WCAG text pass/fail is NOT claimed for unsegmented graphics.")
        ],
        [
            p("Brand Asset Verification"),
            p("Cryptographic SHA-256 binary hash matching against registered brand assets with status tracking (<code>APPROVED</code>, <code>RESTRICTED</code>, <code>NEEDS_REVIEW</code>)."),
            p("Does NOT perform semantic vector matching, scale/rotation-invariant computer vision, or perceptual logo identification.")
        ],
        [
            p("Document & Image OCR"),
            p("Pure-Python text layer extraction from PDF documents via <code>pypdf</code> with comprehensive corrupt/blank/encrypted file handling."),
            p("Pure-raster OCR is intentionally UNSUPPORTED (Option B). The system emits explicit <code>ocr_unsupported</code> notices rather than fabricating heuristic extractions.")
        ],
        [
            p("Multi-Tenant Architecture"),
            p("Single-enterprise multi-workspace partitioning (<code>workspace_id</code> scoping) with server-enforced tenant boundaries."),
            p("Does NOT provide public multi-tenant SaaS isolation with self-service tenant registration. Full multi-tenant SaaS requires external OIDC/OAuth2 IdP federation.")
        ],
    ]
    story.append(create_table(limits_data, [35 * mm, 72 * mm, 71 * mm]))
    story.append(Spacer(1, 6 * mm))

    # =========================================================================
    # SECTION 7: SUBMISSION & RELEASE READINESS
    # =========================================================================
    story.append(p("7. Team Contributions & Submission Package", "SectionH1"))

    meta_data = [
        [p("Metadata Attribute", "ThCell"), p("Submission Detail & Verification Reference", "ThCell")],
        [p("Hackathon / Round"), p("<b>CodeAxis Hackathon — Round 3: The Final Build</b>")],
        [p("Project Name"), p("<b>BRANDTRACE — Evidence-Aware AI-Assisted Brand Governance Platform</b>")],
        [p("Team Name"), p("<b>Team_Nexus</b>")],
        [p("Core Deliverables"), p("1. Time-Aware Claim Ledger & Impact Map &nbsp;|&nbsp; 2. Multimodal Visual Compliance &nbsp;|&nbsp; 3. Guideline-Health Intelligence")],
        [p("Backend Test Verification"), p("<b>133 passed, 1 skipped</b> across 18 test files (pytest, Python 3.10.11)")],
        [p("Browser QA Verification"), p("<b>32 / 32 PASSED (100%)</b> (Playwright Chrome 156 against isolated ports 8031/3001)")],
        [p("PostgreSQL Verification"), p("<b>ALL 11 PHASES PASSED</b> (PostgreSQL 18 live cluster) &nbsp;|&nbsp; <b>10/10 CHECKS PASSED</b> (Hosted Neon staging)")],
        [p("Production Build Verification"), p("<b>0 errors</b> (TypeScript <code>tsc --noEmit</code>) &nbsp;|&nbsp; <b>51,297 chars prerendered</b> (Vite production build)")],
        [p("Working Tree State"), p("Clean, verified on commit <code>a6d5678</code>. No uncommitted modifications or secrets.")],
        [p("Remaining Manual Actions"), p("User deployment to public hosting (Vercel/Render), upload of this PDF to Google Drive, and submission of the official Round 3 Google Form.")],
    ]
    story.append(create_table(meta_data, [45 * mm, 133 * mm]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF: {OUT_PDF}")

if __name__ == "__main__":
    build_pdf()
