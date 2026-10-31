# 12 — FRONTEND ARCHITECTURE & DESIGN SYSTEM
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Technical Stack & Component Topology

- **Core Framework:** React 19 (`react`, `react-dom`)
- **Language:** TypeScript 5.7 (Strict mode enabled, 0 type errors)
- **Bundler & Tooling:** Vite 6.4.5 with static HTML prerender script (`scripts/prerender.ts`)
- **Iconography:** Lucide React
- **Visual Palette:** Light Enterprise Design System (Warm canvas `#F6F8F6`, forest green `#123B2D`, emerald `#0E9F78`)

```
src/
├── App.tsx                             # Top-level application router & theme wrapper
├── index.css                           # Enterprise design tokens & WCAG color variables
├── components/
│   ├── BrandtraceHero.tsx              # Public landing page & interactive SVG architecture map
│   ├── BrandtraceWorkspacePremium.tsx  # Central operational workspace (12 functional views)
│   ├── ContentReview/                  # Content Review modular extensions
│   │   ├── ExportEvidenceButton.tsx    # PDF / JSON compliance evidence exporter
│   │   ├── ReviewAssignmentModal.tsx   # Reviewer workload assignment dialog
│   │   └── ReviewCommentsPanel.tsx     # Collaborative reviewer discussion thread
│   ├── BrandConstitution/             # Brand Constitution modular extensions
│   │   ├── EvidenceSourceVault.tsx     # Centralized evidence registry & document hasher
│   │   ├── GuidelineImportModal.tsx    # Digital PDF guideline candidate importer
│   │   └── RuleConflictModal.tsx       # Deterministic rule conflict detector dialog
│   └── analytics/
│       └── QualityMetricsCards.tsx     # Governance quality telemetry dashboard
└── services/
    └── api.ts                          # Fully-typed HTTP client & backend SDK
```

---

## 2. View Routing & State Management

The operational workspace (`BrandtraceWorkspacePremium.tsx`) implements clean tab-based view switching across 12 primary views without heavy router overhead:
`'Overview'`, `'Brand Constitution'`, `'Content Review'`, `'Claim Ledger'`, `'Visual Compliance'`, `'Impact Map'`, `'Guideline Health'`, `'Review Queue'`, `'Audit History'`, `'Evidence Vault'`, `'Team Management'`, and `'Settings'`.
