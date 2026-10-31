# User Interface, Design Tokens, and Accessibility (a11y)

## Design System Philosophy

The BRANDTRACE user interface is engineered for clarity, high cognitive ergonomics, and deep focus during intense compliance review workflows. The design avoids cluttered corporate dashboard templates in favor of a bespoke, precision-crafted dark workspace inspired by aerospace telemetry and high-end IDE tools.

```
+--------------------------------------------------------------------------+
|                     BRANDTRACE DESIGN ARCHITECTURE                       |
+--------------------------------------------------------------------------+
       |                           |                         |
       v                           v                         v
 [ Dark Theme Tokens ]      [ Typography Stack ]     [ Accessibility (a11y) ]
 - #04080f canvas           - Inter (Body UI)         - WCAG AAA contrast
 - #2dd4bf teal accent      - Lexend (Display)        - prefers-reduced-motion
 - #f59e0b warning          - JetBrains Mono (Code)   - 2px focus-visible rings
 - #f43f5e error                                      - Full ARIA semantics
```

---

## 1. Design Tokens and Theme Variables

The interface styling is defined in `src/index.css` using native CSS custom properties:

```css
:root {
  /* Canvas & Surface Colors */
  --bt-bg-canvas: #04080f;             /* Deep cosmic black base canvas */
  --bt-bg-surface: #0b1528;            /* Elevated card and module surface */
  --bt-bg-surface-elevated: #112240;   /* Modal and floating dropdown surface */

  /* Borders & Dividers */
  --bt-border: #1e3a5f;                /* Structural panel divider */
  --bt-border-focus: #2dd4bf;          /* Interactive focus indicator */

  /* Brand & Evidentiary Accents */
  --bt-teal: #2dd4bf;                  /* Primary brand teal (Verified / Supported) */
  --bt-teal-glow: rgba(45, 212, 191, 0.15);
  --bt-amber: #f59e0b;                 /* Warning / Needs Review */
  --bt-crimson: #f43f5e;               /* Danger / Contradicted / Critical */
  --bt-slate: #64748b;                 /* Inactive / Outdated evidence */

  /* Typography Colors */
  --bt-text-primary: #f8fafc;          /* High-contrast headings and copy */
  --bt-text-secondary: #cbd5e1;        /* Body copy */
  --bt-text-muted: #94a3b8;            /* Metadata, timestamps, and captions */
}
```

---

## 2. Typography Hierarchy

BRANDTRACE utilizes three complementary typography families loaded via `@fontsource` to communicate information hierarchy:

1. **`Inter` (Sans-Serif)**:
   * Used for standard UI labels, buttons, form inputs, and descriptive body paragraphs.
   * Engineered for exceptional legibility at small sizes (12px - 14px) on high-density displays.
2. **`Lexend` (Display Sans-Serif)**:
   * Used for high-impact hero titles, section headers, and governance score gauges.
   * Features expanded letter-spacing and open counters designed to reduce visual fatigue.
   * Headings leverage fluid responsive typography: `font-size: clamp(1.75rem, 4vw, 3rem)`.
3. **`JetBrains Mono` (Monospaced)**:
   * Used for rule identifiers (`R-VOICE-01`), fact codes (`F-2026-01`), exact draft text passages, and raw diff comparisons.

---

## 3. The 3D Evidence Prism & WebGL Accessibility

The hero section features the `EvidencePrism` component (`src/components/EvidencePrism/EvidencePrism.tsx`), an interactive WebGL canvas powered by **Three.js 0.186**:

* **Canvas Isolation**: The WebGL `<canvas>` element applies `pointer-events: none` and `z-index: 0`. This guarantees that floating 3D geometry never intercepts mouse clicks, highlights, or keyboard navigation targeting underlying buttons.
* **Respecting Motion Preferences (`prefers-reduced-motion`)**:
  The component actively monitors the user's OS-level accessibility preferences:
  ```typescript
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mediaQuery.matches) {
    // Disable rotational animation loop and particle physics
    cancelAnimationFrame(animationFrameId);
    renderer.render(scene, camera); // Single static render
  }
  ```
  Users with vestibular disorders or motion sensitivities receive a stable, static rendering without animated rotations.

---

## 4. Keyboard Navigation & Focus Indicators

Compliance review requires fast, reliable keyboard operation without forcing reviewers to reach for the mouse:

* **High-Contrast Focus Rings**: All interactive elements (buttons, inputs, select menus, expandable finding cards) enforce high-contrast focus rings:
  ```css
  :focus-visible {
    outline: 2px solid var(--bt-teal);
    outline-offset: 2px;
  }
  ```
* **Tab Order & ARIA Semantics**:
  * Modals (e.g., `OnboardingModal`, `KeyModal`) implement focus trapping and `aria-modal="true"`.
  * Finding action buttons declare explicit `aria-label` attributes (e.g., `aria-label="Accept suggested correction for finding R-VOICE-01"`).
  * The governance score gauge includes `role="progressbar"` with `aria-valuenow` and `aria-valuemin="0" aria-valuemax="100"`.

---

## 5. Responsive Grid & Scrollbar Customization

* **Adaptive CSS Grid**: The workspace layout (`BrandtraceWorkspacePremium.tsx`) uses responsive CSS grid with breakpoint media queries:
  * Desktop ($>1200\text{px}$): Dual-column split view (Draft editor on left, Finding cards and Score gauge on right).
  * Tablet / Mobile ($<1024\text{px}$): Single-column stacked layout with sticky score header.
* **Custom Dark Scrollbars**:
  ```css
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: var(--bt-bg-canvas);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--bt-border);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--bt-teal);
  }
  ```
