# BRANDTRACE — Claim Ledger & Impact Map

This document describes the Evidence Ledger data structure, time-based claim expiration, and the Claim Impact Map that models ripple effects when brand policies or evidence change.

---

## 1. The Evidence Ledger (`facts` table)

The Evidence Ledger stores verified corporate facts that marketing claims can cite:

```sql
CREATE TABLE facts (
    id VARCHAR PRIMARY KEY,         -- e.g. 'F-2026-01'
    claim VARCHAR NOT NULL,         -- e.g. 'Available in India'
    source VARCHAR NOT NULL,        -- e.g. 'Press Release PR-2026-03'
    source_excerpt TEXT,            -- e.g. 'Commercial availability confirmed for India region only.'
    category VARCHAR NOT NULL,      -- e.g. 'territory', 'sla', 'productivity'
    effective_from DATETIME,        -- e.g. '2026-01-01 00:00:00'
    valid_until DATETIME,           -- e.g. '2026-12-31 23:59:59'
    created_at DATETIME
);
```

### Time-Aware Validation:
When a submitted draft is evaluated:
- The engine checks whether the current UTC time falls after `fact.valid_until`.
- If expired, the claim cannot be marked `SUPPORTED`. The engine immediately marks it **`OUTDATED`** and raises a High-severity finding.

---

## 2. The Claim Impact Map (`backend/app/impact_map.py`)

In large enterprises, brand guidelines and legal facts frequently evolve:
- An SLA guarantee drops from `99.9%` to `99.5%` following an infrastructure migration.
- A regional distribution license expires on December 31st.
- A brand naming guideline deprecates an old product acronym.

Without an automated impact map, governance teams cannot know which already-published or pending marketing assets contain newly invalidated claims.

### How the Impact Map Works:
1. An endpoint `GET /api/governance/impact-map` executes a dependency query across the repository.
2. The engine evaluates:
   - All rules where `status == 'RETIRED'` or `updated_at > review.created_at`.
   - All facts where `valid_until < NOW()` or `updated_at > review.created_at`.
3. The response returns a structured graph of affected reviews:
   ```json
   {
     "affected_reviews_count": 3,
     "impacted_reviews": [
       {
         "review_id": "review_4d82b09a712f",
         "review_title": "Manual QA — Email Campaign 02",
         "invalidated_citations": [
           {
             "type": "EXPIRED_FACT",
             "id": "F-2026-03",
             "description": "2024 Customer Satisfaction Benchmark expired on 2026-06-30."
           }
         ]
       }
     ]
   }
   ```
4. The frontend visualizes this in **Governance Insights**, allowing brand managers to trigger batch re-reviews with a single click.
