---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 14 — Brand Constitution

## Purpose

This document details the **Brand Constitution** module in BRANDTRACE, specifying how normative guidelines, prohibited phrases, required disclaimers, voice rules, and visual brand standards are modeled, stored, and managed.

---

## What is the Brand Constitution?

The Brand Constitution is the centralized repository of normative brand standards for an organization. Rather than relying on static, ambiguous PDF manuals, BRANDTRACE structures brand policies into computable, machine-verifiable definitions:

```mermaid
graph TD
    BC["Brand Constitution"]
    
    subgraph Normative Rules ["rules Table"]
        R1["Prohibited Phrases ('cheap', 'best')"]
        R2["Required Terminology ('BRANDTRACE')"]
        R3["Superlative & Guarantee Claims"]
        R4["Regulatory Disclaimers"]
    end

    subgraph Visual Standards ["brand_profiles Table"]
        V1["Primary Color (#0f766e)"]
        V2["Secondary Color (#2dd4bf)"]
        V3["WCAG Contrast Standard (>= 4.5:1)"]
        V4["Reference Logo Aspect Ratio"]
    end

    BC --> Normative Rules
    BC --> Visual Standards
```

---

## Rule Data Model & Schema

Every rule in the Brand Constitution is stored in the `rules` table with the following mandatory attributes:

1. **`id`**: Unique rule code adhering to category naming conventions:
   - `R-VOICE-01`: Voice and tone standards (e.g., prohibiting unanchored superlatives).
   - `R-TERM-02`: Required brand capitalization and terminology.
   - `R-TERM-03`: Prohibited low-value adjectives (e.g., banning "cheap").
2. **`pattern`**: A regular expression evaluated by Python's `re` module. Examples:
   - `\b(best|cheapest|world-leading)\b`
   - `\b(cheap|bargain)\b`
3. **`kind`**: Rule enforcement behavior:
   - `prohibited_phrase`: Flags any occurrence of the matched pattern as an infraction.
   - `required_term`: Asserts that specific terminology must appear in the text; flags its absence.
4. **`severity`**: Risk weight applied during clearance score calculation:
   - `CRITICAL`: Legal or severe regulatory violation ($-30\text{ pts}$, blocks approval).
   - `HIGH`: Major brand policy or unsupported empirical claim ($-18\text{ pts}$, blocks approval).
   - `MEDIUM`: Adjective drift or tone infraction ($-10\text{ pts}$).
   - `LOW`: Minor formatting or visual styling warning ($-4\text{ pts}$).
5. **`source_title` & `source_excerpt`**: Verifiable citations grounding the rule in authoritative company policy.

---

## Baseline Pre-Seeded Rules

In standard demonstration workspaces, BRANDTRACE initializes with three baseline rules:

| Rule ID | Title | Pattern / Constraint | Severity | Source Document |
| :--- | :--- | :--- | :---: | :--- |
| **`R-VOICE-01`** | Prohibit Superlatives | `\b(best|greatest|unmatched)\b` | `HIGH` | Global Marketing Policy §3.2 |
| **`R-TERM-02`** | Required Brand Terminology | Requires literal `BRANDTRACE` | `HIGH` | Trademark Guidelines §1.1 |
| **`R-TERM-03`** | Prohibit "Cheap" | `\b(cheap|dirt-cheap)\b` | `MEDIUM` | Brand Positioning Manual §4.1 |

---

## Visual Brand Profile Standards

Visual standards are stored in `brand_profiles` per workspace:
- **Primary Brand Color:** `#0f766e` (Deep Brand Teal)
- **Secondary Accent:** `#2dd4bf` (Vibrant Mint)
- **Minimum Contrast Ratio:** `4.5:1` (WCAG 2.1 Level AA for normal text)
- **Approved Logo Aspect Ratio:** `3.0` (Width / Height)

When graphic assets or mockups are submitted, these profile parameters define the mathematical thresholds for Delta-E distance calculations and luminance compliance.

---

## Rule Immutability & Version Snapshots

Brand rules are never overwritten without provenance:
1. When an administrator updates a rule (`PUT /api/rules/{id}`), an immutable snapshot is automatically recorded in `rule_versions`.
2. Content reviews permanently record the exact rule version active at the time of evaluation in `reviews.rule_versions`.
3. If an active rule is modified later, historical review records retain their original evaluated citations and version history.

---

## Related Documentation

- [08 — API Reference](./08_API_REFERENCE.md)
- [10 — Database Schema](./10_DATABASE_SCHEMA.md)
- [15 — Deterministic Rule Engine](./15_DETERMINISTIC_RULE_ENGINE.md)
- [27 — Rule Suggestions and Versioning](./27_RULE_SUGGESTIONS_AND_VERSIONING.md)
