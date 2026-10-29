# Corrections, Data Integrity Guards, and Version History

## The Problem of Content Corruption During Remediation

In automated review tools, applying corrections frequently introduces subtle text corruptions:
1. **Word Duplication**: Naive replacement strings often duplicate adjacent prepositions or articles (e.g., replacing "the best" with "the effective" when the passage was only "best", resulting in "the the effective").
2. **Draft Truncation**: Replacing an entire sentence or paragraph to fix a single word can discard surrounding nuance.
3. **Audit Contamination**: Reviewers accidentally paste internal QA justifications ("Approved by Legal per ticket #402") into the publishable draft field instead of the disposition reason field.

BRANDTRACE introduces **exact-span replacement mechanics** combined with strict **server-side validation guards** to eliminate these risks.

```
+--------------------------------------------------------------------------+
|                        EXACT-SPAN REPLACEMENT FLOW                       |
+--------------------------------------------------------------------------+
  Original Draft: "Brandtrace is the best choice for fast growth."
                                      |
  Matched Passage: "best choice"      | (Exact sub-string match)
  Suggested Replacement: "effective choice"
                                      |
  Resulting Draft: "Brandtrace is the effective choice for fast growth."
  (Zero duplication of surrounding words 'the' or 'for')
```

---

## Exact-Span Replacement Mechanics

To ensure textual integrity:
1. **Passage Pinpointing**: When the Governance Engine detects a violation, `passage` captures the exact substring that caused the trigger (e.g., `"best"`, `"cheap"`).
2. **Span Replacement**: When an `accept` or `edit` action is executed in `main.py`, the replacement is applied directly to the matching span:
   ```python
   # When suggested replacement applies to an exact span:
   new_content = current_content.replace(finding["passage"], clean_replacement, 1)
   ```
3. **Span Verification**: If the passage no longer exists in `current_content` (because an earlier edit modified that sentence), the server raises an explicit `HTTP 422` error, preventing corrupted out-of-sync overwrites.

---

## Defensive Data Integrity Guards

Whenever a replacement string is submitted via `POST /api/reviews/{id}/findings/{fid}/actions`, the backend executes three strict validation guards:

### Guard 1: Cross-Contamination Check
```python
if payload.reason and clean_rep.lower() == payload.reason.strip().lower():
    raise HTTPException(
        422,
        "Data integrity error: The working draft content cannot be identical to the documented disposition reason.",
    )
```
* **Purpose**: Prevents reviewers from accidentally saving their justification note into the publishable copy.

### Guard 2: QA Metadata Prefix Guard
```python
if clean_rep.lower().startswith((
    "manual qa:", "qa:", "reason:", "disposition reason:", "justification:", "audit note:"
)):
    raise HTTPException(
        422,
        "Data integrity error: Draft content appears to be an audit reason or QA comment rather than publishable copy.",
    )
```
* **Purpose**: Rejects copy containing typical compliance ticket annotations, preventing internal notes from leaking into customer-facing text.

### Guard 3: Mandatory Term Preservation Guard
```python
if finding.get("type") in ("required_phrase", "approved_term"):
    required_term = (finding.get("passage") or "").strip().lower()
    if required_term and required_term not in clean_rep.lower():
        raise HTTPException(
            422,
            f"The replacement text must include the required term '{finding.get('passage')}'.",
        )
```
* **Purpose**: Guarantees that when an author claims to resolve a missing-term finding via custom text, the required term is actually present in the replacement text.

---

## Point-in-Time Version History (`review_versions`)

Every change to draft content is automatically snapshotted as an immutable row in the `review_versions` table:

```
+-----------------------------------------------------------------------------------+
| id           | review_id    | created_at           | created_by        | reason   |
+--------------+--------------+----------------------+-------------------+----------+
| version_001  | rev_launch   | 2026-10-24T10:00:00Z | creator@demo.com  | ORIGINAL |
| version_002  | rev_launch   | 2026-10-24T10:05:00Z | jane.reviewer     | FINDING_ACCEPT |
| version_003  | rev_launch   | 2026-10-24T10:12:00Z | jane.reviewer     | FINDING_EDIT |
+-----------------------------------------------------------------------------------+
```

### Table Structure
* `id`: Unique version identifier (`version_<hex>`).
* `review_id`: Foreign key referencing `reviews.id`.
* `content`: Complete draft text at this exact point in time.
* `created_at`: UTC ISO timestamp.
* `created_by`: Actor identity who triggered the version snapshot.
* `reason`: Descriptive trigger event enum (`ORIGINAL_SUBMISSION`, `FINDING_ACCEPT`, `FINDING_EDIT`, `RESTORED_VERSION_{id}`).

---

## Snapshot Restoration (Rollback)

Authors and reviewers can inspect historical versions and restore earlier drafts via `POST /api/reviews/{id}/restore/{version_id}`:
1. The server fetches the snapshot content from `review_versions`.
2. Overwrites `reviews.content` with the historical text.
3. Automatically triggers `run_governance_analysis()` to re-evaluate findings against the restored text.
4. Snapshots a new version recording `reason = "RESTORED_VERSION_{version_id}"`.
5. Logs an immutable entry in the `audit` table.
