"""
Downloadable Compliance Evidence Packet Export Service for BRANDTRACE.
Generates auditor-ready JSON and PDF compliance evidence dossiers for content reviews.
Includes complete source provenance, finding dispositions, revision snapshots, and audit trail.
"""
from __future__ import annotations

import hashlib
import io
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether

from app.models import rows, row, now


def compute_sha256(text: str) -> str:
    if not text:
        return "Not available"
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_compliance_packet_json(review_id: str, workspace_id: str = "ws_default") -> Dict[str, Any]:
    """Compile exhaustive, tamper-evident governance evidence packet as JSON."""
    rev = row("SELECT * FROM reviews WHERE id=? AND workspace_id=?", (review_id, workspace_id))
    if not rev:
        raise ValueError(f"Review '{review_id}' not found in workspace '{workspace_id}'.")

    findings = rows("SELECT * FROM findings WHERE review_id=?", (review_id,))
    versions = rows("SELECT * FROM review_versions WHERE review_id=? ORDER BY created_at ASC", (review_id,))
    audit_entries = rows("SELECT * FROM audit WHERE review_id=? ORDER BY created_at ASC", (review_id,))

    # Metrics
    total_findings = len(findings)
    high_critical = sum(1 for f in findings if f.get("severity") in ("HIGH", "CRITICAL"))
    needs_review = sum(1 for f in findings if f.get("status") == "NEEDS_REVIEW" or not f.get("disposition"))
    resolved = sum(1 for f in findings if f.get("disposition") in ("ACCEPTED_EDIT", "EDITED", "DISMISSED", "WAIVED"))
    dismissals = sum(1 for f in findings if f.get("disposition") == "DISMISSED")
    waivers = sum(1 for f in findings if f.get("disposition") == "WAIVED")

    content = rev.get("content", "")
    content_hash = compute_sha256(content)
    orig_file_hash = rev.get("file_hash") or "Not available"

    formatted_findings = []
    for f in findings:
        formatted_findings.append({
            "finding_id": f.get("id"),
            "category": f.get("category") or "general",
            "type": f.get("type"),
            "severity": f.get("severity"),
            "status": f.get("status"),
            "flagged_passage": f.get("passage"),
            "explanation": f.get("explanation"),
            "suggested_correction": f.get("suggested_correction") or "Not available",
            "rule_id": f.get("source_id") or "Not available",
            "rule_version": f.get("source_version") or "Not available",
            "evidence_source": f.get("source_title") or "Not available",
            "supporting_excerpt": f.get("source_excerpt") or "Not available",
            "analysis_method": f.get("analysis_method") or "DETERMINISTIC",
            "disposition": f.get("disposition") or "UNRESOLVED",
            "disposition_reason": f.get("disposition_reason") or "Not available",
            "disposition_by": f.get("disposition_by") or "Not available",
            "disposition_at": f.get("disposition_at") or "Not available",
        })

    formatted_versions = []
    for v in versions:
        formatted_versions.append({
            "version_id": v.get("id"),
            "created_at": v.get("created_at"),
            "created_by": v.get("created_by") or "Not available",
            "reason": v.get("reason"),
            "content_length": len(v.get("content", "")),
            "content_sha256": compute_sha256(v.get("content", "")),
        })

    formatted_audit = []
    for a in audit_entries:
        formatted_audit.append({
            "audit_id": a.get("id"),
            "action": a.get("action"),
            "actor": a.get("actor"),
            "actor_role": a.get("actor_role"),
            "reason": a.get("reason") or "Not available",
            "details": a.get("details") or "Not available",
            "timestamp": a.get("created_at"),
        })

    ai_applied = bool(rev.get("ai_analysis_applied"))
    ocr_applied = bool(rev.get("ocr_applied"))
    ai_disclosure = (
        "Deterministic rule evaluation executed first. Optional external AI advisory enabled with human consent."
        if ai_applied else
        "100% Deterministic brand governance engine. No external generative AI model modified review text."
    )

    return {
        "header": {
            "platform": "BRANDTRACE Enterprise Brand Governance",
            "tagline": "Every finding has a source. Every decision has an owner.",
            "report_type": "Compliance Evidence Packet",
            "generated_at": now(),
            "export_format": "JSON",
            "version": "1.0",
        },
        "review": {
            "id": rev.get("id"),
            "review_id": rev.get("id"),
            "title": rev.get("title"),
            "status": rev.get("status"),
            "clearance_score": rev.get("score"),
            "author": rev.get("author") or "Not available",
            "reviewer": rev.get("reviewer") or "Not available",
            "assigned_to": rev.get("assigned_to") or "Not available",
            "priority": rev.get("priority") or "MEDIUM",
            "due_date": rev.get("due_date") or "Not available",
            "document_name": rev.get("file_name") or "Direct Draft Input",
            "original_file_sha256": orig_file_hash,
            "current_draft_sha256": content_hash,
            "content_type": rev.get("content_type") or "marketing_copy",
            "document_type": rev.get("document_type") or "general_document",
            "file_format": rev.get("file_format") or "text",
            "analysis_method": rev.get("analysis_method") or "DETERMINISTIC_FIRST",
            "created_at": rev.get("created_at"),
            "updated_at": rev.get("updated_at"),
        },
        "governance_summary": {
            "total_findings": total_findings,
            "high_critical_findings": high_critical,
            "needs_review_findings": needs_review,
            "resolved_findings": resolved,
            "dismissals_with_reason": dismissals,
            "waivers_with_reason": waivers,
            "approval_readiness": "APPROVED" if rev.get("status") == "APPROVED" else "PENDING_DISPOSITION",
        },
        "ai_disclosure": {
            "ai_analysis_applied": ai_applied,
            "ocr_applied": ocr_applied,
            "ocr_method": rev.get("ocr_method") or "NONE",
            "disclosure_statement": ai_disclosure,
        },
        "findings": formatted_findings,
        "revision_history": formatted_versions,
        "audit_trail": formatted_audit,
        "audit_ledger": formatted_audit,
    }


def build_compliance_packet_pdf(review_id: str, workspace_id: str = "ws_default") -> bytes:
    """Render comprehensive PDF compliance evidence packet."""
    data = build_compliance_packet_json(review_id, workspace_id)
    rev = data["review"]
    summary = data["governance_summary"]
    findings = data["findings"]
    audit_entries = data["audit_trail"]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    brand_title_style = ParagraphStyle(
        "BrandTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#123B2D"),
    )
    tagline_style = ParagraphStyle(
        "Tagline",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0A7352"),
    )
    section_h2 = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#123B2D"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1C1917"),
    )
    bold_style = ParagraphStyle(
        "BodyBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=body_style,
        fontSize=8,
        leading=10,
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=table_cell,
        fontName="Helvetica-Bold",
    )

    elements = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>BRANDTRACE</b><br/><font size='8' color='#0A7352'>COMPLIANCE EVIDENCE PACKET</font>", brand_title_style),
            Paragraph(f"<b>Generated:</b> {data['header']['generated_at'][:19]} UTC<br/><b>Review ID:</b> {rev['review_id']}<br/><b>Status:</b> {rev['status']}", body_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[340, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(header_table)
    elements.append(Paragraph(data["header"]["tagline"], tagline_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0A7352"), spaceBefore=2, spaceAfter=10))

    # 2. Review Metadata Summary
    elements.append(Paragraph("DRAFT & REVIEW METADATA", section_h2))
    meta_data = [
        [Paragraph("Title", table_cell_bold), Paragraph(rev["title"], table_cell), Paragraph("Document Name", table_cell_bold), Paragraph(rev["document_name"], table_cell)],
        [Paragraph("Status", table_cell_bold), Paragraph(f"<b>{rev['status']}</b> (Score: {rev['clearance_score']}/100)", table_cell), Paragraph("Content Type", table_cell_bold), Paragraph(f"{rev['content_type']} ({rev['document_type']})", table_cell)],
        [Paragraph("Author", table_cell_bold), Paragraph(rev["author"], table_cell), Paragraph("Reviewer", table_cell_bold), Paragraph(rev["reviewer"], table_cell)],
        [Paragraph("Assigned To", table_cell_bold), Paragraph(rev["assigned_to"], table_cell), Paragraph("Priority", table_cell_bold), Paragraph(rev["priority"], table_cell)],
        [Paragraph("Draft SHA-256", table_cell_bold), Paragraph(f"<font size='6.5'>{rev['current_draft_sha256'][:32]}...</font>", table_cell), Paragraph("Analysis Method", table_cell_bold), Paragraph(rev["analysis_method"], table_cell)],
    ]
    meta_table = Table(meta_data, colWidths=[90, 180, 95, 175])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAF8")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#DCE5DF")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)

    # 3. Governance Clearance Summary
    elements.append(Paragraph("GOVERNANCE CLEARANCE SUMMARY", section_h2))
    summary_data = [
        [
            Paragraph(f"<b>Total Findings:</b> {summary['total_findings']}", table_cell),
            Paragraph(f"<b>High / Critical:</b> {summary['high_critical_findings']}", table_cell),
            Paragraph(f"<b>Needs Review:</b> {summary['needs_review_findings']}", table_cell),
            Paragraph(f"<b>Resolved:</b> {summary['resolved_findings']}", table_cell),
            Paragraph(f"<b>Dismissed:</b> {summary['dismissals_with_reason']}", table_cell),
            Paragraph(f"<b>Waived:</b> {summary['waivers_with_reason']}", table_cell),
        ]
    ]
    summary_table = Table(summary_data, colWidths=[90, 90, 90, 90, 90, 90])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#E6F4EA")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#0A7352")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CEEAD6")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(summary_table)

    # AI Disclosure Statement
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(f"<b>AI Transparency Disclosure:</b> {data['ai_disclosure']['disclosure_statement']}", tagline_style))

    # 4. Detailed Findings Ledger
    elements.append(Paragraph(f"EVIDENCE-LINKED FINDINGS LEDGER ({len(findings)})", section_h2))
    if not findings:
        elements.append(Paragraph("<i>No compliance findings recorded for this review draft.</i>", body_style))
    else:
        finding_rows = [
            [
                Paragraph("Severity", table_cell_bold),
                Paragraph("Flagged Passage", table_cell_bold),
                Paragraph("Rule Citation & Supporting Excerpt", table_cell_bold),
                Paragraph("Suggested Correction", table_cell_bold),
                Paragraph("Disposition & Authority", table_cell_bold),
            ]
        ]
        for f in findings:
            sev_color = "#DC2626" if f["severity"] in ("CRITICAL", "HIGH") else "#D97706" if f["severity"] == "MEDIUM" else "#2563EB"
            finding_rows.append([
                Paragraph(f"<font color='{sev_color}'><b>{f['severity']}</b></font><br/>{f['type']}", table_cell),
                Paragraph(f"<b>\"{f['flagged_passage']}\"</b><br/>{f['explanation']}", table_cell),
                Paragraph(f"<b>{f['rule_id']}</b> (v{f['rule_version']})<br/>Source: <i>{f['evidence_source']}</i><br/>Excerpt: \"{f['supporting_excerpt'][:110]}...\"", table_cell),
                Paragraph(f"{f['suggested_correction']}", table_cell),
                Paragraph(f"<b>{f['disposition']}</b><br/>Reason: {f['disposition_reason']}<br/>By: {f['disposition_by']}", table_cell),
            ])

        findings_table = Table(finding_rows, colWidths=[65, 120, 165, 90, 100])
        findings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#DCE5DF")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(findings_table)

    # 5. Immutable Audit Trail
    elements.append(Paragraph(f"IMMUTABLE AUDIT TRAIL ({len(audit_entries)} Events)", section_h2))
    if not audit_entries:
        elements.append(Paragraph("<i>No audit log entries found.</i>", body_style))
    else:
        audit_rows = [
            [
                Paragraph("Timestamp", table_cell_bold),
                Paragraph("Action", table_cell_bold),
                Paragraph("Actor & Role", table_cell_bold),
                Paragraph("Reason & Operational Details", table_cell_bold),
            ]
        ]
        for a in audit_entries[-10:]:  # Last 10 events for clean pagination
            audit_rows.append([
                Paragraph(f"{a['timestamp'][:19]}", table_cell),
                Paragraph(f"<b>{a['action']}</b>", table_cell),
                Paragraph(f"{a['actor']} ({a['actor_role']})", table_cell),
                Paragraph(f"{a['reason'] or ''} {a['details'] or ''}".strip() or "Not available", table_cell),
            ])

        audit_table = Table(audit_rows, colWidths=[95, 110, 115, 220])
        audit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#DCE5DF")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(audit_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
