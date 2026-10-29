# The BRANDTRACE Governance Engine

## Engine Overview and Philosophy

The BRANDTRACE Governance Engine (`backend/app/governance.py`) is the computational core of the platform. Unlike pure LLM-based assistants that offer conversational critiques, the Governance Engine functions as an **evidence-grounded state machine**. It executes deterministic pattern matching, evaluates temporal fact validity, performs optional AI triage, synthesizes visual accessibility scores, and calculates an authoritative **Governance Clearance Health Score**.

```
                           [ Draft Content Ingested ]
                                       |
                                       v
                     +-----------------------------------+
                     | Step 1: Deterministic Rule Check  |
                     |  - Prohibited phrases (regex)     |
                     |  - Missing required terms         |
                     +-----------------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     | Step 2: Approved Fact Ledger Check|
                     |  - Active verified facts          |
                     |  - Expired facts (OUTDATED)       |
                     +-----------------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     | Step 3: AI / Heuristic Triage     |
                     |  - Offline heuristic triage OR    |
                     |  - Google Gemini 1.5 Flash triage |
                     |  - Strict citation validation     |
                     +-----------------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     | Step 4: Visual Findings Synthesis |
                     |  - WCAG contrast & Delta-E palette|
                     +-----------------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     | Step 5: Health Score Calculation  |
                     |  Score = 100 - Severity Deductions|
                     +-----------------------------------+
```

---

## 1. Deterministic Rule Matching Pipeline

The deterministic pipeline runs in milliseconds and requires no external API keys or network calls:

1. **Active Rule Fetching**: Loads all rules with `status = 'APPROVED'` and verified source excerpts from the database.
2. **Prohibited Phrase Detection**:
   * Evaluates `re.search(re.escape(pattern), content, re.IGNORECASE)`.
   * If a match occurs:
     * Status is assigned as `OUTDATED` (if the rule itself has passed its `expires_at` date) or `CONTRADICTED`.
     * The exact text span is extracted as `passage`.
     * Context-sensitive neutral suggested corrections are applied (e.g., `best` $\to$ `effective`, `cheap` $\to$ `accessible`).
3. **Missing Required Term Verification**:
   * Evaluates mandatory terminology rules (`required_phrase`, `approved_term`).
   * If the required pattern is absent from the draft:
     * Finding created with status `UNSUPPORTED_BY_APPROVED_EVIDENCE`.
     * `suggested_correction` is intentionally set to `None` to prevent automated editorial injections that alter author voice.

---

## 2. Approved Fact Ledger Verification

The engine cross-references draft text against the corporate claim ledger (`facts` table):

* **Expired Evidence Detection**: If the draft includes statements matching an approved fact whose `expires_at` timestamp is in the past:
  * Generates finding with status `OUTDATED` and `HIGH` severity.
  * Informs the reviewer that while the claim was once approved, its evidentiary backing has lapsed.
* **Substantiated Claim Grounding**: If the draft contains claims matching an active, unexpired fact:
  * Generates an informational finding with status `SUPPORTED` and `LOW` severity, validating that the author has adhered to approved messaging.

---

## 3. Evidentiary Status Taxonomy

Every finding produced by the governance engine carries one of five immutable evidence statuses:

| Status Identifier | Meaning in BRANDTRACE | Example Scenario |
| :--- | :--- | :--- |
| `SUPPORTED` | Claim directly substantiated by active approved fact | Copy includes verified "Available in India" claim |
| `CONTRADICTED` | Copy explicitly violates brand rule or territorial restriction | Draft uses prohibited term "best" or claims global availability when fact states "Available only in India" |
| `OUTDATED` | Claim references a fact or rule whose validity has expired | Copy cites a 2024 performance benchmark that expired Jan 2025 |
| `UNSUPPORTED_BY_APPROVED_EVIDENCE`| Mandatory required brand term is missing from draft | Required product name "Brandtrace" is absent from copy |
| `NEEDS_REVIEW` | Broad claim lacks complete evidence or promotional promise made | Copy claims "Available globally" while fact only confirms India; promotional promise "guaranteed results" |

---

## 4. Governance Clearance Score (Health Score)

The Health Score measures draft readiness for final sign-off on a scale from 0 to 100.

### Mathematical Formulation
$$\text{Score} = \max\left(0, 100 - \sum_{f \in \text{Unresolved}} \text{SeverityWeight}(f)\right)$$

### Severity Penalty Weights
* `CRITICAL`: 30 points
* `HIGH`: 18 points
* `MEDIUM`: 10 points
* `LOW`: 4 points

### Disposition Partitioning
The engine partitions finding dispositions into two sets:
* **`UNRESOLVED_DISPOSITIONS`**: `{None, "", "ESCALATED"}`
* **`RESOLVED_DISPOSITIONS`**: `{"ACCEPTED_EDIT", "EDITED", "DISMISSED", "WAIVED"}`

### Audit Semantics
* A score of 100 indicates that all detected issues have reached an authorized disposition.
* Dismissing or waiving a finding grants administrative clearance and restores points, but the finding's underlying evidence status (e.g., `NEEDS_REVIEW`) remains recorded in audit logs.
* Escalated findings (`ESCALATED`) **continue to penalize the score**, ensuring issues cannot be swept into backlog states to falsely inflate readiness.

---

## 5. Optional AI Layer Integration

When `AI_PROVIDER=gemini` is active, the engine augments deterministic checks:
* Calls `GeminiProvider.triage_content()` to scan for subjective promotional promises and complex tone violations.
* **Strict Citation Verification**: Any citation ID emitted by the AI must exist in the active `rules` or `facts` table; hallucinations with fabricated IDs have their citation stripped before persistence.
* **Deduplication**: If the AI flags a passage already captured by deterministic regex, the engine merges the contextual rationale into the existing finding's `uncertainty` field rather than creating duplicate cards.
