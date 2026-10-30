---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 42 — Feature Limitations and Deferred Roadmap

## Purpose

This document provides a transparent, rigorous accounting of implemented features, partially implemented capabilities, and explicitly deferred roadmap items in **BRANDTRACE**, ensuring complete technical honesty for hackathon evaluators, enterprise architects, and auditors.

---

## 1. Feature Status Classification Matrix

```mermaid
graph TD
    classDef impl fill:#0f766e,stroke:#2dd4bf,stroke-width:2px,color:#fff;
    classDef partial fill:#b45309,stroke:#fbbf24,stroke-width:2px,color:#fff;
    classDef deferred fill:#991b1b,stroke:#f87171,stroke-width:2px,color:#fff;

    subgraph Tier1 ["Tier 1: Fully Implemented"]
        F1["Deterministic Rule Engine"]:::impl
        F2["Time-Aware Claim Ledger"]:::impl
        F3["Targeted Impact Re-Review"]:::impl
        F4["Guideline Health & Disagreement"]:::impl
        F5["Human-in-the-Loop Rule Activation"]:::impl
        F6["Approval Gate (HTTP 409 Blocking)"]:::impl
        F7["CIE76 Delta-E & WCAG 2.1 Math"]:::impl
        F8["Digital PDF Extraction (pypdf)"]:::impl
        F9["SHA-256 Asset Hash Matching"]:::impl
        F10["Multi-Tenant Workspace Isolation"]:::impl
        F11["3D Three.js Command Core + SVG Fallback"]:::impl
    end

    subgraph Tier2 ["Tier 2: Partially Implemented"]
        P1["Contextual AI Triage (Mock + Gemini)"]:::partial
        P2["Visual Palette Compliance"]:::partial
    end

    subgraph Tier3 ["Tier 3: Explicitly Deferred"]
        D1["Raster & Scanned PDF OCR"]:::deferred
        D2["Perceptual Logo Bounding Box Detection"]:::deferred
        D3["Font Family Identification"]:::deferred
        D4["Autonomous AI Policy Mutation"]:::deferred
        D5["Background Cron Re-Review Worker"]:::deferred
    end
```

---

## 2. Detailed Accounting by Capability

### 1. Ingestion & Document Parsing
- **Implemented**: Digital PDF text extraction (`pypdf`), raw copy/markdown ingestion, image file uploading (`.png`, `.jpg`).
- **Deferred — Raster OCR**: BRANDTRACE does **not** perform optical character recognition (OCR) on flattened raster images or scanned non-digital PDFs. Ingested PDFs must contain an extractable digital text layer.

### 2. Visual Compliance & Asset Verification
- **Implemented**: Exact binary SHA-256 hash matching against the Brand Asset Registry, aspect ratio verification, dominant palette extraction via Pillow quantization, CIE76 Delta-E color distance math, and WCAG 2.1 AA relative luminance and contrast calculations on declared color pairs.
- **Deferred — Logo Object Detection**: Bounding-box perceptual object detection (e.g. YOLO/detectron for locating logos inside complex photographic scenes) is **not implemented**. BRANDTRACE matches discrete uploaded brand assets against registered cryptographic hashes.
- **Deferred — Font Identification**: Automatic typographic font family identification from rendered raster images is **not implemented**.

### 3. Claim Lifecycle & Governance
- **Implemented**: Time-Aware Claim Ledger with ISO-8601 UTC validity windows, 30-day `EXPIRING_SOON` warnings, dependency tracking between facts and draft reviews, and on-demand **targeted re-review execution** (`POST /api/governance/re-review-impact`).
- **Deferred — Automated Background Daemon**: Automated recurring background cron worker polling for expired facts is **not implemented**. Re-review is triggered intentionally by authorized users.

### 4. Rule Evolution & AI Policy Refinement
- **Implemented**: Empirical telemetry aggregation, reviewer friction scores, multi-actor disagreement detection, deterministic suggestion generation, triage workflows (`ACCEPTED`, `DEFERRED`, `REJECTED`), and human-gated activation with optimistic locking.
- **Excluded by Design — Autonomous AI Mutation**: Autonomous, unverified LLM modification of active enterprise brand guidelines is **explicitly rejected**. All rule modifications require explicit human authorization and version bumping.

### 5. Contextual AI Triage
- **Partially Implemented**: Pluggable AI adapter architecture (`backend/app/ai_adapter.py`). Operates entirely offline with a deterministic heuristic mock by default, with an optional Google Gemini Interactions SDK adapter enabled when `AI_PROVIDER=gemini` and API credentials are supplied.
