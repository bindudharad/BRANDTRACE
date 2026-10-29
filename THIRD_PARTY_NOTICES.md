# Third-Party Notices and Source Provenance

BRANDTRACE is built on and includes components from third-party projects. This document records the source provenance and licence obligations for inherited and third-party code.

---

## 1. Inherited Scaffold — LoomFrog

**Source:** [https://github.com/kaimir-auth/LoomFrog](https://github.com/kaimir-auth/LoomFrog)  
**Author:** Amir Asadullah Chowdhury  
**Licence:** MIT

BRANDTRACE was initialised from the LoomFrog React/Vite frontend project. The following components from the LoomFrog scaffold remain in this repository, preserved for attribution and licence compliance:

- `src/components/LandingPage/` — Original LoomFrog landing page and hero components
- `src/components/LoomFrogLogo.tsx` — LoomFrog SVG logo and icon components
- `src/components/BrandDnaManager/` — Brand DNA profile manager
- `src/components/AuditStudio/` — LoomFrog diagnostic dashboard
- `src/components/Header.tsx` — Original navigation header
- `src/components/KeyModal.tsx` — API key entry modal
- `src/components/ApiKeySuccessModal.tsx` — API key success modal
- `src/components/OnboardingModal.tsx` — Onboarding flow
- `src/components/PrivacyPanel/` — Privacy information panel
- `src/context/KeyContext.tsx` — API key and profile state context
- `src/services/geminiSemanticEngine.ts` — Gemini AI semantic engine
- `src/services/webExtractor.ts` — Webpage content extractor
- `src/types/brandDna.ts` — Brand DNA type definitions
- `vite.config.ts` — Vite configuration (inherited base)
- `tailwind.config.js` — Tailwind configuration (inherited base)
- `public/` — PWA icons, service worker base

**MIT Notice (LoomFrog):**

```
MIT License

Copyright (c) 2026 Amir Asadullah Chowdhury

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The `LICENSE` file at the root of this repository retains this notice.

**Original BRANDTRACE components** (added independently for this project):
- `backend/` — FastAPI application, governance engine, all backend logic
- `src/components/BrandtraceWorkspace.tsx` — Original governance workspace
- `src/components/BrandtraceWorkspacePremium.tsx` — Premium workspace UI
- `src/components/BrandtraceHero/` — BRANDTRACE landing/hero page
- `src/components/EvidencePrism/` — Three.js Evidence Prism component
- `src/services/api.ts` — Typed API client for the BRANDTRACE backend
- `scripts/smoke_test.py` — Smoke test suite

---

## 2. Frontend Runtime Dependencies

| Package | Version | Licence | Repository |
|---------|---------|---------|-----------|
| react | ^19.0.1 | MIT | https://github.com/facebook/react |
| react-dom | ^19.0.1 | MIT | https://github.com/facebook/react |
| three | ^0.186.0 | MIT | https://github.com/mrdoob/three.js |
| motion | ^12.23.24 | MIT | https://github.com/framer/motion |
| lucide-react | ^0.546.0 | ISC | https://github.com/lucide-icons/lucide |
| dompurify | ^3.4.14 | Apache-2.0 / MPL-2.0 | https://github.com/cure53/DOMPurify |
| @google/genai | ^2.4.0 | Apache-2.0 | https://github.com/google-gemini/generative-ai-js |
| ogl | ^1.0.11 | MIT | https://github.com/oframe/ogl |
| canvas-confetti | ^1.9.4 | ISC | https://github.com/catdad/canvas-confetti |
| mammoth | ^1.12.2 | BSD-2-Clause | https://github.com/mwilliamson/mammoth.js |
| xlsx | ^0.18.5 | Apache-2.0 | https://github.com/SheetJS/sheetjs |
| vite | ^6.2.3 | MIT | https://github.com/vitejs/vite |
| tailwindcss | ^4.1.14 | MIT | https://github.com/tailwindlabs/tailwindcss |
| typescript | ~5.8.2 | Apache-2.0 | https://github.com/microsoft/TypeScript |

---

## 3. Backend Runtime Dependencies

| Package | Licence | Repository |
|---------|---------|-----------|
| fastapi | MIT | https://github.com/tiangolo/fastapi |
| uvicorn | BSD-3-Clause | https://github.com/encode/uvicorn |
| pydantic | MIT | https://github.com/pydantic/pydantic |
| sqlalchemy | MIT | https://github.com/sqlalchemy/sqlalchemy |
| pypdf | BSD-3-Clause | https://github.com/py-pdf/pypdf |
| pillow | HPND | https://github.com/python-pillow/Pillow |
| httpx | BSD-3-Clause | https://github.com/encode/httpx |
| pytest | MIT | https://github.com/pytest-dev/pytest |
| psycopg | LGPL-3.0 | https://github.com/psycopg/psycopg |

---

## 4. Licence compatibility

All retained third-party components are distributed under permissive licences (MIT, Apache-2.0, BSD variants, ISC, HPND). The project-level MIT licence is compatible with all of the above, provided required copyright notices are retained.

DOMPurify dual-licensed under Apache-2.0 and MPL-2.0 — the Apache-2.0 licence is compatible with MIT distribution terms.

psycopg is LGPL-3.0. Use as a linked library (not incorporating source code) is compatible with MIT licensing of the application itself.

---

## 5. Unresolved provenance notes

- The exact commit range from LoomFrog used as the base scaffold is recorded in the Git bundle at `BRANDTRACE_BACKUP_20261025/brandtrace_history.bundle`. The original upstream commits in the local history can be examined for provenance.
- Some LoomFrog UI components (listed in section 1) were modified for integration with BRANDTRACE. The extent of modification varies by component. The MIT licence permits modification.
