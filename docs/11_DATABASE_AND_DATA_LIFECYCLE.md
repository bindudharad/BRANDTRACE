# Database Architecture and Data Lifecycle

## Database Lifecycle Overview

BRANDTRACE adopts an explicit, developer-friendly database lifecycle architecture designed to minimize initial friction while guaranteeing total audit verifiability. The database layer automatically initializes schema structures on application startup, isolates automated test runs using ephemeral databases, and enforces strict append-only constraints on sensitive compliance records.

```
+--------------------------------------------------------------------------+
|                         APPLICATION STARTUP (main.py)                    |
|                         Calls init_db() in models.py                     |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                     IDEMPOTENT SCHEMA INITIALIZATION                     |
|  - CREATE TABLE IF NOT EXISTS (workspaces, rules, facts, reviews, etc.)   |
|  - _safe_add_column() handles incremental column additions cleanly        |
+--------------------------------------------------------------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  Demo Seeding Route   |                       |  Isolated Test Run    |
|  POST /api/demo/setup |                       |  tempfile.NamedTemp.. |
+-----------------------+                       +-----------------------+
```

---

## Schema Initialization & Migration Strategy

Database initialization is managed by `init_db()` in `backend/app/models.py`. The initialization routine executes automatically upon FastAPI startup:

1. **Idempotent DDL Execution**: Tables are created using `CREATE TABLE IF NOT EXISTS` statements for:
   * `workspaces`: Enterprise tenancy records.
   * `brand_profiles`: Visual style tokens and contrast thresholds.
   * `rules`: Codified brand guidelines and forbidden phrases.
   * `facts`: Authoritative corporate claim ledger.
   * `reviews`: Content submission drafts and scores.
   * `review_versions`: Point-in-time draft content snapshots.
   * `findings`: Detected compliance and claim violations.
   * `audit`: Immutable, append-only event ledger.
2. **Safe Incremental Column Migrations (`_safe_add_column`)**:
   When new columns are introduced (such as `analysis_method`, `disposition_reason`, or `actor_role`), `_safe_add_column()` issues non-destructive `ALTER TABLE {table} ADD COLUMN {col} {type}` commands wrapped in exception handlers. This ensures existing developer databases seamlessly upgrade without data loss.

---

## Demo Seeding & Environment Reset Mechanics

To support predictable demonstrations and regression testing, the backend provides two administrative endpoints:

### 1. `POST /api/demo/setup` (Idempotent Seed)
Checks for existing records before writing. If empty, it creates:
* Workspace: `ws_default` ("Northstar demo workspace").
* Brand Profile: Brandtrace (`#0f766e`, `#2dd4bf`, min contrast 4.5).
* Three Baseline Rules:
  * `R-VOICE-01`: Prohibits superlative "best" (`HIGH` severity).
  * `R-TERM-02`: Requires product name "Brandtrace" (`MEDIUM` severity).
  * `R-TERM-03`: Forbids term "cheap" in favor of "accessible" (`HIGH` severity).
* Baseline Fact:
  * `F-2026-01`: "Available in India", valid through `2027-01-01`.

### 2. `POST /api/demo/reset` (Pristine Environment Restore)
Executes a complete truncation and reset of all operational tables:
* Deletes all rows from `findings`, `review_versions`, `reviews`, `audit`, `rules`, `facts`, `brand_profiles`, and `workspaces`.
* Re-seeds default baseline records.
* Automatically creates a pre-analyzed demo draft (`rev_launch_q4`) with active findings to allow immediate UI exploration.

---

## Test Database Isolation: The Tempfile Pattern

A critical software engineering guarantee in BRANDTRACE is that automated test suites **never mutate developer databases or shared state**.

Every test file across `backend/tests/` implements the `tempfile` SQLite isolation fixture pattern:

```python
@pytest.fixture(autouse=True)
def isolated_db(monkeypatch):
    """Create an isolated, temporary SQLite database for each test file."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
        temp_db_path = tf.name
    temp_url = f"sqlite:///{temp_db_path}"
    monkeypatch.setenv("DATABASE_URL", temp_url)
    
    # Re-bind the engine and initialize clean schema
    get_engine()
    init_db()
    yield
    
    # Clean up file descriptor and temporary file on disk
    try:
        os.remove(temp_db_path)
    except Exception:
        pass
```

Because each test file receives a pristine, dedicated database file, tests can execute concurrently without cross-test pollution or flaky race conditions.

---

## Content Versioning Lifecycle (`review_versions`)

Draft text integrity is guaranteed through automatic version snapshotting managed by `save_version()`:
* **Trigger Events**: A new version row is inserted whenever draft content changes:
  1. `ORIGINAL_SUBMISSION`: Ingestion of initial draft text or file upload.
  2. `FINDING_ACCEPT`: Applying an automated suggested correction.
  3. `FINDING_EDIT`: Reviewer applying a manual copy replacement.
  4. `VERSION_RESTORED`: Rolling back to an earlier historical version.
* **Point-in-Time Restoration**: Invoking `POST /api/reviews/{id}/restore/{version_id}` copies the snapshot's text back into `reviews.content`, re-triggers `run_governance_analysis()`, logs an audit entry, and saves a restoration snapshot.

---

## Append-Only Audit Integrity (`audit`)

The `audit` table represents the legal and compliance backbone of BRANDTRACE:
* **Strict Append-Only Semantics**: The API provides no `DELETE`, `PUT`, or `PATCH` endpoints for audit records.
* **Granular Event Capture**: Every lifecycle transition is recorded with timestamp, actor name, actor role, action enum, optional justification reason, and finding ID details.
* **Zero Modification**: Once written, audit rows remain untouched, guaranteeing that enterprise compliance examiners can verify historical decisions.
