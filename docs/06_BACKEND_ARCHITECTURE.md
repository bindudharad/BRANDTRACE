# BRANDTRACE Backend Architecture

## Architectural Principles

The BRANDTRACE backend is a high-performance Python application built on **FastAPI (>=0.115)**, **Uvicorn**, **Pydantic v2**, and **SQLAlchemy 2.0**. It is engineered according to three foundational architectural imperatives:
1. **Stateless Request Processing**: All state is externalized to the relational database, enabling frictionless vertical or horizontal scaling.
2. **Defensive Validation & Guardrails**: Incoming payloads and outgoing transitions pass through dual validation layers: structural Pydantic schema validation and business-logic data integrity guards.
3. **Explicit Error Boundaries**: System failures and validation conflicts emit clear, semantic HTTP status codes accompanied by structured JSON error payloads, preventing silent failures.

```
+---------------------------------------------------------------------------------+
|                               HTTP / REST Layer                                 |
|                         backend/app/main.py (~1060 lines)                       |
+---------------------------------------------------------------------------------+
       |                                      |                               |
       v                                      v                               v
+---------------------+             +--------------------+          +---------------------+
| Governance Service  |             | AI Adapter Layer   |          | Impact Engine       |
| (governance.py)     | <---------> | (ai_adapter.py)    |          | (impact_map.py)     |
+---------------------+             +--------------------+          +---------------------+
       |                                                                      |
       +-----------------------------------+----------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------+
|                       Database Access & Connection Manager                      |
|                               backend/app/models.py                             |
+---------------------------------------------------------------------------------+
                                           |
                                           v
                             [ SQLite / PostgreSQL Database ]
```

---

## Route Organization (`main.py`)

All FastAPI route handlers are consolidated in `backend/app/main.py` to maintain unified lifecycle visibility. Routes are logically grouped by domain:

* **System Health & Readiness**:
  * `GET /api/health`: Immediate liveness check reporting uptime and provider mode.
  * `GET /api/ready`: Readiness probe verifying database connectivity.
* **Demo Environment Management**:
  * `POST /api/demo/setup`: Idempotently seeds baseline workspace, rules, facts, and profile.
  * `POST /api/demo/reset`: Wipes existing records and restores clean demo fixtures.
* **Workspace & Brand Profile**:
  * `GET /api/overview`: Aggregated workspace statistics, recent reviews, and active profile.
  * `GET /api/brand-profile` & `PUT /api/brand-profile`: Manages brand colors and contrast thresholds.
* **Rules & Facts Management**:
  * `GET /api/rules`, `POST /api/rules`, `PUT /api/rules/{id}`: Governance rule catalog.
  * `GET /api/facts`, `POST /api/facts`, `PUT /api/facts/{id}`: Approved claim ledger.
* **Review & Finding Lifecycle**:
  * `GET /api/reviews`, `POST /api/reviews`: Submits and lists content review drafts.
  * `POST /api/reviews/upload`: Multipart ingestion for text documents, PDFs, and images.
  * `GET /api/reviews/{id}`: Full review details, including findings and version list.
  * `POST /api/reviews/{id}/findings/{fid}/actions`: Applies finding dispositions (`accept`, `edit`, `dismiss`, `escalate`).
  * `POST /api/reviews/{id}/approval`: Evaluates the approval gate and transitions status.
  * `POST /api/reviews/{id}/restore/{vid}`: Rolls back draft content to a historical snapshot.
* **Audit, Versions, & Governance Insights**:
  * `GET /api/reviews/{id}/audit`: Retrieves chronological append-only audit trail.
  * `GET /api/reviews/{id}/versions`: Lists historical content versions.
  * `GET /api/insights`: Aggregates recurring rule violations and disposition statistics.
  * `GET /api/governance/impact-map`: Computes draft dependencies on expired or updated rules/facts.

---

## Service Layer Architecture

Business logic is encapsulated in dedicated service modules rather than inlined inside route controllers:

### 1. Unified Governance Engine (`governance.py`)
Orchestrates the sequential evaluation of content against codified policies. It executes deterministic regex matches, inspects the active fact ledger for expired sources, invokes the AI provider, and persists generated findings. Crucially, it houses `calculate_health_score()`, calculating draft clearance:
$$\text{Score} = \max\left(0, 100 - \sum \text{Severity Deductions}\right)$$
Deductions apply strictly to unresolved findings (`CRITICAL`: 30, `HIGH`: 18, `MEDIUM`: 10, `LOW`: 4). Findings marked `ESCALATED` continue to penalize the score until definitively resolved.

### 2. Multi-Mode AI Adapter (`ai_adapter.py`)
Defines a pluggable provider abstraction (`BaseAIProvider`). Supports `OfflineProvider` (regex and token heuristics) and `GeminiProvider` (Google Gemini 1.5 Flash). Regardless of the provider, all candidate citations are strictly validated against active database IDs before being returned as findings.

### 3. Claim Impact Engine (`impact_map.py`)
Computes temporal dependencies across the content repository. When a fact expires or a rule version updates, `calculate_impact_map()` cross-references historical drafts (via content mentions, finding citations, and `rule_versions` JSON manifests) to generate an actionable re-review list tagged with urgency levels (`URGENT`, `RECOMMENDED`).

---

## Database Access Pattern: Context-Managed Transactions

Database access in `backend/app/models.py` avoids complex ORM mapping layers in favor of lightweight, direct SQL execution via SQLAlchemy 2.0 with transactional context managers:

```python
@contextmanager
def db():
    """Transactional database connection context manager."""
    with get_engine().begin() as connection:
        yield Connection(connection)
```

### Key Helper Primitives
* `rows(query, params)`: Executes a query and returns all matching rows as Python dictionaries using SQLAlchemy's `_mapping`.
* `row(query, params)`: Executes a query and returns the first row as a dictionary, or `None`.
* Parameter binding: The internal `_statement()` function automatically converts positional `?` placeholders to named `:p0`, `:p1` parameters compatible with SQLAlchemy 2.0.

---

## Defensive Validation & Server-Side Integrity Guards

In addition to structural Pydantic validation (`schemas.py`), the backend enforces strict server-side integrity guards:

1. **Reason / Draft Contamination Guard (`Guard 1`)**:
   Rejects finding edits where the replacement text is identical to the disposition reason (`HTTP 422`).
2. **QA Metadata Prefix Guard (`Guard 2`)**:
   Rejects replacements beginning with audit prefixes like `Manual QA:`, `QA:`, `Reason:`, or `Audit note:` (`HTTP 422`).
3. **Mandatory Term Enforcement Guard (`Guard 3`)**:
   When resolving a missing-term finding (`required_phrase`), the submitted replacement text must contain the required term; otherwise, the server rejects the edit (`HTTP 422`).
4. **Approval Block Gate**:
   Draft approval or waiver is blocked if any `HIGH` or `CRITICAL` finding remains unresolved (`HTTP 409 Conflict`).

---

## Semantic HTTP Status Codes

The backend uses explicit HTTP status codes across all endpoints:

| Status Code | Meaning in BRANDTRACE | Example Scenario |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Draft fetched, finding updated, audit log returned |
| `201 Created` | Entity successfully persisted | New brand rule or fact created |
| `400 Bad Request` | Malformed input or unparseable payload | Unreadable file stream, invalid JSON |
| `403 Forbidden` | Role permission violation | Contributor attempting to dismiss a compliance finding |
| `404 Not Found` | Entity does not exist | Invalid `review_id` or `finding_id` |
| `409 Conflict` | Business policy gate conflict | Attempting to approve draft with unresolved `HIGH` findings |
| `422 Unprocessable` | Semantic validation failure | Replacement equals reason, missing justification string |
| `500 Server Error` | Unhandled backend exception | Database connection timeout or fatal driver failure |
