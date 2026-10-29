# Evidence Traceability and Citation Lineage

## Defining Evidence Traceability

In conventional content review workflows, feedback is often subjective and detached from authoritative sources. An editor might comment "rephrase this" or "this sounds too aggressive" without citing policy. In regulated industries (e.g., healthcare, financial services, enterprise SaaS), unsubstantiated feedback creates compliance friction and legal ambiguity.

In **BRANDTRACE**, **traceability** is a structural guarantee: **every finding surfaced to a reviewer must possess an unbroken citation lineage connecting the flagged passage directly to an approved rule or fact in the database.**

```
+--------------------------------------------------------------------------+
|                        FINDING CITATION LINEAGE                          |
+--------------------------------------------------------------------------+
  Flagged Passage: "best platform"
        |
        v
  Finding: finding_8a9f2c
        |
        +---> Cited Rule ID: R-VOICE-01
        |     Title: "Avoid unsupported superlatives"
        |     Version: "1.2"
        |
        +---> Source Title: "Brand Voice Standard"
        |     Source Excerpt: "Use precise, evidence-backed language..."
        |
        +---> Human Action: DISMISSED
              Actor: "jane.reviewer@company.com" (Role: reviewer)
              Mandatory Reason: "Permitted in context of quoting external award."
              Audit ID: aud_71c4b9 (Immutable)
```

---

## The Anatomy of an Evidence-Linked Finding

When a finding is generated in `governance.py`, it persists four explicit citation fields:
1. `source_id`: The primary key of the cited rule (`R-VOICE-01`) or fact (`F-2026-01`).
2. `source_title`: The human-readable title of the governing policy document or study (e.g., "Brand Voice Standard").
3. `source_excerpt`: An exact, verifiable textual quotation from that governing source explaining the restriction or substantiation.
4. `source_version`: The specific version number of the policy active at the moment of evaluation.

### Anti-Hallucination Citation Verification
When optional AI models (such as Google Gemini) are active, LLMs can hallucinate plausible-sounding citations. BRANDTRACE enforces a strict server-side pre-indexing check:
* The engine builds an in-memory dictionary of all active `rule.id` and `fact.id` keys.
* When the AI suggests a citation ID, the engine verifies its existence in the active dictionary.
* If the AI invents a nonexistent citation ID, `source_id`, `source_title`, and `source_excerpt` are set to `None`, and the finding is categorized as an unverified AI heuristic candidate.

---

## Evidence-Linked Human Decisions

Traceability extends beyond detection to encompass human adjudication. BRANDTRACE treats human decisions as evidence:

### Why Finding Dismissal Requires a Reason
Authors and reviewers cannot simply click "Dismiss" to make a high-risk finding vanish.
* The API enforces `HTTP 422 Unprocessable` if `payload.reason` is missing for `dismiss` or `edit` actions.
* The justification string is permanently stored in `findings.disposition_reason` and recorded in the `audit` table.
* When external auditors examine why a prohibited term was published, the platform provides the exact justification entered by the reviewer.

### Role Authorization Enforcement
* Contributors (`contributor`) are strictly barred from dismissing compliance findings (`HTTP 403 Forbidden`).
* Only certified reviewers (`reviewer`) and brand administrators (`brand_admin`) possess authority to grant administrative exceptions.

---

## Audit Records as Tamper-Evident Evidence

The `audit` table logs every interaction as a structured, time-stamped proof point:
* When a draft is approved, the system logs `APPROVAL_APPROVE`, capturing the reviewer's identity, timestamp, and active role.
* If a waiver was granted, `APPROVAL_WAIVE` records the mandatory justification for overriding outstanding policy warnings.
* Because the database exposes no endpoints to delete or modify audit rows, the audit trail serves as forensic evidence during regulatory investigations.

---

## Practical Limitations of Traceability

While BRANDTRACE enforces technical lineage, overall governance quality is subject to operational boundaries:
1. **Garbage In, Garbage Out**: The platform cannot verify whether a corporate fact entered by a human administrator is objectively true in the real world; it verifies only that the draft aligns with what is entered in the approved ledger.
2. **Citation Scope**: Traceability guarantees that a finding cites a valid database record, but human reviewers must still judge whether the cited source contextually applies to the draft at hand.
