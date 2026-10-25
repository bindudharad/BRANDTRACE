from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

OUT = Path(__file__).resolve().parents[1] / "output" / "pdf" / "BRANDTRACE_Round2_Submission.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

navy = colors.HexColor("#07111f")
ink = colors.HexColor("#13263a")
teal = colors.HexColor("#087f78")
sky = colors.HexColor("#d9f4f2")
muted = colors.HexColor("#5c7186")
line = colors.HexColor("#c8d8e2")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=31, leading=36, textColor=navy, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["BodyText"], fontName="Helvetica", fontSize=12, leading=18, textColor=muted, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1B", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=24, textColor=navy, spaceBefore=10, spaceAfter=8))
styles.add(ParagraphStyle(name="H2B", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=teal, spaceBefore=7, spaceAfter=4))
styles.add(ParagraphStyle(name="BodyB", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.4, leading=14, textColor=ink, spaceAfter=6))
styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=muted))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=15, textColor=navy, backColor=sky, borderColor=colors.HexColor("#62bdb8"), borderWidth=.6, borderPadding=10, spaceBefore=6, spaceAfter=12))

def p(value, style="BodyB"):
    return Paragraph(value, styles[style])

def section(title, body):
    return [p(title, "H2B"), p(body)]

def table(rows, widths):
    t = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), navy), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 8.2),
        ("LEADING", (0, 0), (-1, -1), 11), ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("TEXTCOLOR", (0, 1), (-1, -1), ink), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), .35, line), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f8fa")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(line); canvas.line(16*mm, 14*mm, 194*mm, 14*mm)
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(muted)
    canvas.drawString(16*mm, 9*mm, "BRANDTRACE - CodeAxis Round 2 submission")
    canvas.drawRightString(194*mm, 9*mm, f"Page {doc.page}")
    canvas.restoreState()

story = [Spacer(1, 30*mm), p("BRANDTRACE", "CoverTitle"), p("Evidence-linked brand governance", "CoverSub"), Spacer(1, 7*mm), p("CodeAxis Round 2 Submission", "CoverSub"), Spacer(1, 16*mm)]
story.append(Table([[p("SUBMISSION STATUS", "Small"), p("IMPLEMENTED NOW", "Small"), p("NOT CLAIMED", "Small")], [p("No public deployment URL has been created or verified."), p("Local no-key demo, FastAPI workflow, persisted evidence/audit data, SQLite local mode and PostgreSQL deployment adapter."), p("Production deployment, managed PostgreSQL runtime verification, authentication, visual/OCR analysis, user research and performance benchmarks.")]], colWidths=[54*mm, 63*mm, 61*mm], style=TableStyle([("BACKGROUND", (0,0), (-1,0), sky), ("GRID",(0,0),(-1,-1),.35,line), ("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),8), ("RIGHTPADDING",(0,0),(-1,-1),8), ("TOPPADDING",(0,0),(-1,-1),8), ("BOTTOMPADDING",(0,0),(-1,-1),8)])))
story += [Spacer(1, 16*mm), p("Verified repository baseline: <link href='https://github.com/kaimir-auth/LoomFrog' color='#087f78'>github.com/kaimir-auth/LoomFrog</link>", "CoverSub"), p("This is the inherited LoomFrog remote, retained as an attribution link. A separate public BRANDTRACE project/repository URL has not been created.", "Small"), PageBreak()]

story += [p("1. Product and completed workflow", "H1B"), p("BRANDTRACE is a brand-governance prototype that insists findings be evidence-linked or explicitly identified as requiring verification. The demo is fictional and requires no external AI key."), p("Implemented end-to-end flow", "H2B")]
story.append(table([
    [p("Step", "Small"), p("Verified behavior", "Small")],
    [p("1. Seed and submit"), p("The API creates a fictional brand workspace with approved rules/facts and persists the original submitted draft plus rule-version snapshot.")],
    [p("2. Analyze"), p("Deterministic prohibited, forbidden, required and approved-term checks run without an external LLM. Findings display exact passages, stored source ID/title/excerpt/version and status.")],
    [p("3. Distinguish evidence"), p("Rule violations are CONTRADICTED; missing required approved language is UNSUPPORTED_BY_APPROVED_EVIDENCE; expired source material is OUTDATED; offline claim triage is NEEDS_REVIEW and carries no citation.")],
    [p("4. Human gate"), p("Dismissal/edit require a reason. High/critical findings block approval or waiver until a disposition is recorded. There is no publish endpoint.")],
    [p("5. Preserve history"), p("Original and revised drafts are stored as separate versions. Review creation, dispositions and approvals are recorded in the audit ledger.")],
], [31*mm, 147*mm]))
story += [Spacer(1, 7*mm), p("Honest scope boundary", "H2B"), p("The current UI supports pasted text and Markdown-oriented review. It does not claim working PDF upload, image analysis, OCR, logo detection, font identification, secure authentication, a real external model, or a public deployment."), PageBreak()]

story += [p("2. Architecture and technology choices", "H1B"), p("Architecture", "H2B"), p("React 19 + TypeScript + Vite provides the browser workspace. A typed client calls FastAPI. FastAPI validates Pydantic request models, applies the evidence gate and validates every decision. SQLAlchemy provides a shared persistence adapter: SQLite is used for the local no-setup demo; PostgreSQL URLs use Psycopg for deployed data. The service exposes health/readiness and Swagger at <font color='#087f78'>/docs</font>."), p("Evidence and safety design", "H2B"), p("The API resolves findings against records stored in its own rule/fact tables before displaying a source. Missing support is not represented as a proven falsehood. Source expiry is handled as OUTDATED. Original content, revisions, rule versions and audit events are persisted. Browser content is rendered as text, no client API secret is required, input length is bounded, and CORS origins are configured by environment."), p("Deployment preparation", "H2B"), p("A Docker Compose configuration provisions PostgreSQL 16 with a persistent volume, then starts the FastAPI API and static frontend. The deployment template separates server secrets (DATABASE_URL, CORS_ORIGINS and optional AI provider settings) from the public VITE_API_BASE_URL. No provider credentials or account access were available here, so public deployment and managed-PostgreSQL connection testing are unverified."), p("Technology inventory", "H2B")]
story.append(table([
    [p("Layer", "Small"), p("Used", "Small"), p("Why", "Small")],
    [p("Frontend"), p("React 19, TypeScript, Vite"), p("Retains the existing client foundation and provides a responsive judge workflow.")],
    [p("Backend"), p("FastAPI, Pydantic, Uvicorn"), p("Typed endpoints, validation, OpenAPI and predictable errors.")],
    [p("Persistence"), p("SQLAlchemy, SQLite, Psycopg/PostgreSQL"), p("Zero-setup local demo plus deployed-data adapter.")],
    [p("Testing"), p("pytest, httpx; TypeScript; Vite build"), p("Workflow integration, type checking and production-bundle verification.")],
], [30*mm, 55*mm, 93*mm]))
story += [PageBreak()]

story += [p("3. Verification, provenance and next steps", "H1B"), p("Executed verification", "H2B")]
story.append(table([
    [p("Check", "Small"), p("Actual result", "Small")],
    [p("python -m pytest backend/tests -q"), p("3 passed. Covers evidence statuses, expired facts, no-source triage, server-side validation, original/revised draft versions, blocked approval, invalid IDs/actions, harmless text and PostgreSQL URL normalization.")],
    [p("npm run lint"), p("Passed TypeScript type check.")],
    [p("npm run build"), p("Passed Vite production build and prerender. The build emits a non-blocking bundle-size warning (about 607 kB JavaScript).")],
    [p("Live local smoke test"), p("Verified browser-to-API connection, source ID/excerpt rendering, NEEDS_REVIEW distinction, approval rejection for unresolved high-risk findings and data persistence across API restart.")],
    [p("Not executed"), p("Docker runtime validation was unavailable because Docker is not installed. PostgreSQL server connection and public URL testing were not possible without credentials/provider access.")],
], [60*mm, 118*mm]))
story += [p("Round 1 deviation and contributions", "H2B"), p("The inherited LoomFrog foundation was client-side and BYOK-oriented. This pass adds a FastAPI boundary, persisted evidence records, deterministic evidence statuses, original-version preservation, decision validation, guarded approval and audit history. This implementation pass contributed the FastAPI service, React workspace integration, integration tests, PostgreSQL-ready deployment configuration, documentation and this submission package. No user-feedback study is claimed."), p("Licences and AI assistance", "H2B"), p("LoomFrog is retained under the repository MIT licence. The sibling reference repositories were inspected only; no code, model weights or assets were copied. FastAPI, Pydantic, Uvicorn, SQLAlchemy, Psycopg, PyPDF and pytest are dependency-distributed libraries. Development used AI assistance; this report distinguishes executed results from planned or unverified work."), p("Round 3 improvements", "H2B")]
story.append(table([
    [p("Improvement", "Small"), p("User value and acceptance test", "Small")],
    [p("Time-aware claim ledger and impact map"), p("Immutable fact/rule versions and review dependencies will identify affected drafts. Acceptance: expire one fact referenced by three drafts and flag exactly those three for re-review.")],
    [p("Tested multimodal visual compliance"), p("Bounded server-side palette/contrast checks with fixture benchmarks and licensed asset analysis only after validation. Acceptance: labelled fixtures demonstrate correct known pass/fail palette and contrast results.")],
    [p("Guideline-health intelligence"), p("Aggregate recurring issues and reviewer disagreements into source-linked clarification proposals. Acceptance: seeded disagreement data surfaces the top disputed rule and every proposal cites its evidence and counts.")],
], [59*mm, 119*mm]))

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=16*mm, rightMargin=16*mm, topMargin=16*mm, bottomMargin=20*mm, title="BRANDTRACE CodeAxis Round 2 Submission", author="BRANDTRACE Team")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
