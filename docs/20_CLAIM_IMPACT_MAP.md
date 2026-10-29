# The Claim Impact Map and Temporal Dependency Graph

## Purpose of the Claim Impact Map

Enterprise marketing libraries contain hundreds or thousands of active collateral pieces: landing pages, product brochures, email sequences, and press releases. Over time, corporate policies change:
* An approved benchmark claim ("Processes 10,000 transactions per second") expires.
* A competitor certification lapses.
* A trademark or brand voice rule is updated to forbid a previously acceptable phrase.

Traditionally, finding which published assets contain the invalidated statement requires tedious manual searches or grep scripts across fragmented CMS exports.

The **Claim Impact Map** (`backend/app/impact_map.py`) solves this by tracking bi-directional dependencies between approved rules/facts and historical review drafts, enabling targeted compliance remediation.

```
+--------------------------------------------------------------------------+
|                        CLAIM IMPACT DEPENDENCY GRAPH                     |
+--------------------------------------------------------------------------+
               [ Expired Fact: F-2026-01 "Available in India" ]
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
 [ Draft: rev_launch_q4 ]                                [ Draft: rev_apac_web ]
 Content: "...claims in India."                          Content: "...launch in India."
 Impact Urgency: URGENT                                  Impact Urgency: URGENT
 Reason: "Fact F-2026-01 expired on 2027-01-01"          Reason: "Fact F-2026-01 expired"
```

---

## Technical Implementation (`impact_map.py`)

The dependency calculation is orchestrated by `calculate_impact_map()`. It systematically scans two dependency vectors across all historical reviews in the database:

### 1. Fact Expiration Vector
* Queries all rows in `facts`.
* Flags any fact where `expires_at < now()` or `status == 'RETIRED'`.
* Scans all reviews in the database to identify:
  * Drafts whose `content` contains the fact's approved text value.
  * Drafts with active findings citing the fact's `source_id`.
* Tagged with urgency level:
  * `URGENT`: If the fact has actively passed its hard expiration timestamp.
  * `RECOMMENDED`: If the fact was administratively retired without hard expiration.

### 2. Rule Version & Retirement Vector
* Queries all rows in `rules`.
* Flags any rule that is expired (`expires_at < now()`) or marked `status == 'RETIRED'`.
* Inspects each review's frozen `rule_versions` JSON column (which records active rule versions at the time of submission) and `findings` records.
* Tags impacted drafts for recommended re-review.

---

## REST Endpoint & Response Schema

The impact map is accessed via `GET /api/governance/impact-map`:

```json
{
  "total_impacted_drafts": 2,
  "items": [
    {
      "item_type": "FACT",
      "item_id": "F-2026-01",
      "item_title": "Product availability",
      "status": "EXPIRED",
      "expires_at": "2027-01-01T00:00:00+00:00",
      "affected_review_ids": ["rev_launch_q4", "rev_email_promo"],
      "affected_review_titles": ["Launch announcement — Q4", "Customer Announcement Email"],
      "re_review_urgency": "URGENT",
      "affected_drafts": [
        {
          "id": "rev_launch_q4",
          "title": "Launch announcement — Q4",
          "status": "APPROVED"
        }
      ]
    }
  ]
}
```

---

## Re-Review Triggers (`POST /api/governance/re-review-impact`)

When brand administrators review the impact map, they can trigger batch remediation via `POST /api/governance/re-review-impact`:
* Locates all unique draft IDs identified by the impact engine.
* Re-triggers `run_governance_analysis()` against each impacted review.
* Re-evaluates findings: previously `SUPPORTED` claims transition to `OUTDATED`.
* Automatically recalculates the review's health score to reflect the expired evidence.
* Logs an audit record noting that the draft was flagged for re-review due to upstream policy deprecation.

---

## Architectural Limitations & Boundaries

The Claim Impact Map provides immediate operational visibility, but adheres to defined architectural boundaries:
1. **Textual and Citation Matching**: The engine matches dependencies via exact citation IDs (`source_id`), frozen `rule_versions` manifests, and substring occurrences of the fact value. It does not perform fuzzy semantic inference or external web scraping.
2. **On-Demand Execution**: In the current release, the impact map is computed dynamically on query. Background cron workers and automated outbound webhook notifications are scheduled for Round 3 development.
