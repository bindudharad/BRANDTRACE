# Brand Rules and Terminology Governance

## The Role of Codified Brand Rules

In traditional corporate environments, brand guidelines exist as lengthy, static brand manuals. Authors rarely read them in full, and compliance reviewers must manually remember hundreds of vocabulary constraints. 

BRANDTRACE converts static guidelines into **executable brand rules**. Rules are versioned, machine-readable records that specify exact patterns, severity levels, policy requirements, and source citations.

```
+--------------------------------------------------------------------------+
|                            BRAND RULE STRUCTURE                          |
+--------------------------------------------------------------------------+
  - Rule ID (e.g. R-VOICE-01)          - Pattern (e.g. "best", "cheap")
  - Title & Category                   - Requirement Directive
  - Severity (LOW..CRITICAL)           - Source Title & Verifiable Excerpt
  - Kind (prohibited / required / etc) - Validity Timestamps (effective/expires)
```

---

## Detailed Entity Schema (`rules` table)

Every rule in BRANDTRACE comprises structured metadata:
* `id`: Unique identifier formatted by policy domain (e.g., `R-VOICE-01`, `R-TERM-02`, `R-LEGAL-05`).
* `category`: Broad governance domain (`terminology`, `voice`, `claims`, `legal`, `style`).
* `kind`: Operational rule type:
  * `prohibited_phrase` / `forbidden_term`: Terms that must not appear in publishable copy.
  * `required_phrase` / `approved_term`: Mandatory phrasing that must be present in copy.
  * `tone_rule`: Stylistic or tonality guidance evaluated contextually.
* `pattern`: Exact string or regular expression executed against draft content.
* `requirement`: Plain-language directive instructing authors on proper compliance behavior.
* `severity`: Risk weighting applied if violated (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
* `source_title` & `source_excerpt`: Verifiable citation pointing to the originating policy manual.
* `version`: Semantic version string (e.g., `1.0`, `1.2`).
* `status`: Operational lifecycle state (`APPROVED`, `DRAFT`, `RETIRED`).
* `effective_at` / `expires_at`: ISO 8601 validity window.

---

## The Baseline Demo Rules Catalog

When initialized via `POST /api/demo/setup` or `POST /api/demo/reset`, BRANDTRACE seeds three representative brand rules:

### 1. `R-VOICE-01`: Avoid Unsupported Superlatives
* **Category**: `voice`
* **Kind**: `prohibited_phrase`
* **Pattern**: `best`
* **Severity**: `HIGH`
* **Requirement**: "Avoid unsubstantiated superlatives in customer communications."
* **Source Title**: "Brand Voice Standard"
* **Source Excerpt**: "Use precise, evidence-backed language rather than subjective superlatives."
* **Correction Logic**: Maps `best` $\to$ `effective` (or `best choice` $\to$ `effective choice`).

### 2. `R-TERM-02`: Enforce Approved Platform Name
* **Category**: `terminology`
* **Kind**: `required_phrase`
* **Pattern**: `Brandtrace`
* **Severity**: `MEDIUM`
* **Requirement**: "Use the approved product capitalization in all copy."
* **Source Title**: "Naming Guide"
* **Source Excerpt**: "The product name is Brandtrace in body copy."
* **Correction Logic**: Sets `suggested_correction = None`. Missing mandatory terms require author composition rather than automated editorial injection.

### 3. `R-TERM-03`: Avoid Cheap Vocabulary
* **Category**: `terminology`
* **Kind**: `forbidden_term`
* **Pattern**: `cheap`
* **Severity**: `HIGH`
* **Requirement**: "Do not position the service as cheap or low-cost."
* **Source Title**: "Messaging Guide"
* **Source Excerpt**: "Use accessible, efficient, or cost-effective instead of cheap."
* **Correction Logic**: Replaces `cheap` $\to$ `accessible`.

---

## Prohibited vs. Required Phrasing Mechanics

The governance engine handles prohibited and required terms with fundamentally different verification algorithms:

```
+--------------------------------------------------------------------------+
|                     PROHIBITED PHRASE LOGIC                              |
| Content: "Our platform is the best option."                              |
| Match: "best" found -> Flagged as CONTRADICTED -> Suggests "effective"   |
+--------------------------------------------------------------------------+

+--------------------------------------------------------------------------+
|                      REQUIRED PHRASE LOGIC                               |
| Content: "Our tool automates marketing governance."                      |
| Match: "Brandtrace" absent -> Flagged as UNSUPPORTED -> Suggests NULL    |
+--------------------------------------------------------------------------+
```

### Prohibited Phrases
* Tested via regex search.
* If present in the draft, a finding is generated immediately.
* The matching passage is tagged for exact-span replacement.

### Required Phrases
* Tested for presence.
* If absent, a finding is generated with status `UNSUPPORTED_BY_APPROVED_EVIDENCE`.
* **Editorial Separation**: The system deliberately leaves `suggested_correction` as `None`. Automated tools should not guess where in the draft a missing brand name should be inserted.
* **Dynamic Re-evaluation**: When an author manually edits the draft and includes the missing term, Guard 3 in `main.py` detects the addition and automatically transitions the finding to `SUPPORTED` and `ACCEPTED_EDIT`.

---

## Rule Change Impact & Deprecation Behavior

Brand rules evolve. When a rule is updated or retired:
1. **Rule Versioning**: When `R-VOICE-01` bumps from `1.0` to `1.2`, historical drafts retain their frozen `rule_versions` JSON snapshot.
2. **Impact Map Registration**: `impact_map.py` identifies drafts that were reviewed under superseded or retired rule versions.
3. **Targeted Re-Review**: Review teams can filter historical drafts impacted by rule modifications without invalidating unaffected collateral.
