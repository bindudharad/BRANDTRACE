# BRANDTRACE Frontend Architecture

## Architectural Philosophy

The BRANDTRACE frontend is built with **React 19**, **TypeScript 5.8**, and **Vite 6**, styled using modern CSS custom properties and **Tailwind CSS v4**. It emphasizes immediate responsiveness, deterministic visual state, and hardware-accelerated feedback without introducing heavy state management abstractions like Redux or MobX.

```
+-------------------------------------------------------------------------+
|                                App.tsx                                  |
|   (Route switching, global role simulation state, toast notifications)  |
+-------------------------------------------------------------------------+
       |                                                   |
       v                                                   v
+------------------------+             +----------------------------------+
|    BrandtraceHero      |             |   BrandtraceWorkspacePremium     |
|  - Three.js 3D Prism   |             |  - Draft Editor & Diff Card      |
|  - Value proposition   |             |  - Finding Cards & Dispositions  |
|  - CTA to Workspace    |             |  - Health Score Gauge            |
+------------------------+             |  - Version History & Rollback    |
                                       |  - Audit Log Timeline            |
                                       |  - Brand Rules & Facts Panels    |
                                       +----------------------------------+
                                                       |
                                                       v
                                       +----------------------------------+
                                       |         src/services/api.ts      |
                                       |  Typed REST client + Auth Header |
                                       +----------------------------------+
```

---

## Entry Points and Component Hierarchy

The frontend application mounts via standard Vite conventions:
* `src/main.tsx`: Entry point rendering the React root with strict error boundary checks.
* `src/App.tsx`: Top-level orchestrator maintaining current view mode (`hero`, `workspace`, `audit_studio`), active user role simulation, and global notification banners.

### Primary Component Tree

```
App.tsx
├── Header.tsx (Global navigation, role switcher, system health status)
├── BrandtraceHero/
│   ├── BrandtraceHero.tsx (Hero copy, quick metric counters, launch triggers)
│   └── EvidencePrism/
│       └── EvidencePrism.tsx (Three.js WebGL canvas, refractive prism animation)
├── BrandtraceWorkspacePremium.tsx (Main governance work environment)
│   ├── ScoreGauge.tsx (Circular SVG gauge displaying governance health score)
│   ├── DiffCard.tsx (Visual diff comparison between versions and proposed edits)
│   ├── UnifiedInputPanel.tsx (Raw text drafting and drag-and-drop file upload)
│   ├── CanvasColorInspector.tsx (Palette swatch display, WCAG contrast chips)
│   └── DiagnosticDashboard.tsx (Claim Impact Map view, recurring rule metrics)
└── Modals / Overlays
    ├── OnboardingModal.tsx (First-time user walkthrough)
    ├── CreateProfileModal.tsx (Brand profile and visual token editor)
    └── KeyModal.tsx (Optional Gemini API key configuration)
```

---

## State Management Architecture

BRANDTRACE deliberately avoids heavyweight third-party state managers (such as Redux, Zustand, or Recoil) in favor of **colocated React component state (`useState`, `useEffect`, `useCallback`)** combined with focused React Context providers where appropriate (`KeyContext.tsx`).

### State Management Principles
1. **Single Source of Truth for Server Entities**: The current active review, findings array, brand rules, and audit entries are owned by `BrandtraceWorkspacePremium.tsx`. When finding actions or content edits execute, the server returns the updated review record, which immediately overwrites local state.
2. **Predictable Unidirectional Data Flow**: Child components receive data via strictly typed TypeScript props and notify parents of mutations via callback handlers (e.g., `onFindingAction(findingId, action, reason, replacement)`).
3. **No Stale Client Cache**: Because governance scores and finding dispositions depend on strict backend evaluations, the client refetches or consumes server-returned payloads on every state change, preventing client-side calculation discrepancies.

---

## API Client Architecture (`src/services/api.ts`)

All network communication with the FastAPI backend is encapsulated in `src/services/api.ts`. The client provides fully typed wrappers around standard `window.fetch`.

### Role Simulation Injection
To support friction-free persona testing without requiring complex authentication infrastructure, `api.ts` intercepts all outgoing requests and automatically attaches role headers:

```typescript
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Demo-Role": currentRole,     // 'contributor' | 'reviewer' | 'brand_admin' | 'auditor'
  "X-Demo-Actor": currentActorName, // e.g. 'Jane Doe (Brand Admin)'
};
```

### Client Methods
* `api.getOverview()`: Fetches workspace metadata, recent drafts, and aggregate metrics.
* `api.getReview(reviewId)`: Loads a review draft including all findings and version snapshots.
* `api.submitReview(title, content, type)`: Submits new text for full analysis.
* `api.uploadFile(file, title)`: Multipart upload for PDF, PNG, or JPEG assets.
* `api.executeFindingAction(reviewId, findingId, action, reason, replacement)`: Posts a finding disposition.
* `api.submitApproval(reviewId, action, reason)`: Requests review approval, changes, or waiver.
* `api.restoreVersion(reviewId, versionId)`: Rolls back draft to a historical version.
* `api.getImpactMap()`: Retrieves the temporal dependency map for expired rules/facts.

---

## Three.js Evidence Prism Integration

The `EvidencePrism` component (`src/components/EvidencePrism/EvidencePrism.tsx`) delivers an interactive 3D WebGL visualization rendered via **Three.js 0.186**.

### Visual Metaphor
The Prism symbolizes content passing through an evidentiary filter: raw claims enter the prism, which refracts them into distinct spectral rays corresponding to evidence states:
* Teal (`#2dd4bf`): `SUPPORTED`
* Amber (`#f59e0b`): `NEEDS_REVIEW`
* Crimson (`#f43f5e`): `CONTRADICTED`
* Slate (`#64748b`): `OUTDATED`

### Technical Considerations & Accessibility
* **Pointer Events**: The canvas style specifies `pointer-events: none` to prevent interfering with background mouse clicks or scrolling.
* **Prefers-Reduced-Motion**: The component actively listens for `(prefers-reduced-motion: reduce)`. When detected, 3D rotation animations and floating particle physics are completely disabled, presenting a static, accessible rendering.
* **Clean Resource Disposal**: On component unmount, geometry buffers, material shaders, and animation frame request loops are cleanly disposed to prevent WebGL memory leaks.

---

## CSS Design Tokens & Styling Architecture

The application implements a custom dark-mode design system defined in `src/index.css` using CSS custom properties:

```css
:root {
  --bt-bg-canvas: #04080f;     /* Deep space canvas background */
  --bt-bg-surface: #0b1528;    /* Elevated card and panel surface */
  --bt-bg-surface-elevated: #112240;
  --bt-border: #1e3a5f;        /* Subtle panel border */
  --bt-border-focus: #2dd4bf;  /* Focus ring accent */
  --bt-text-primary: #f8fafc;  /* High-contrast readable typography */
  --bt-text-muted: #94a3b8;    /* Secondary descriptions and metadata */
  --bt-teal: #2dd4bf;          /* Primary brand accent */
  --bt-teal-glow: rgba(45, 212, 191, 0.15);
  --bt-amber: #f59e0b;         /* Warning / Needs Review */
  --bt-crimson: #f43f5e;       /* Error / Contradicted */
}
```

### Typography and Accessibility
* **Fonts**: `Inter` for general UI legibility, `Lexend` for high-impact brand headings, and `JetBrains Mono` for code snippets, rule IDs, and exact text passages.
* **Focus States**: High-contrast outline `focus-visible: 2px solid var(--bt-teal)` ensures seamless keyboard navigation across all interactive inputs, buttons, and finding cards.
