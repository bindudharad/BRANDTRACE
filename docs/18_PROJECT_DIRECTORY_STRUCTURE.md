# 18 — PROJECT DIRECTORY STRUCTURE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

```
BRANDTRACE/
├── backend/                            # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py                     # API router & endpoints
│   │   ├── models.py                   # SQLAlchemy models & init_db
│   │   ├── schemas.py                  # Pydantic request/response schemas
│   │   ├── governance.py               # Deterministic rule evaluation
│   │   ├── image_analyzer.py           # Visual compliance & color science
│   │   ├── pdf_parser.py               # PDF document text extraction
│   │   ├── ai_adapter.py               # Optional Groq AI adapter
│   │   └── services/                   # Enterprise service modules
│   │       ├── guideline_importer.py   # Guideline PDF rule extractor
│   │       ├── compliance_exporter.py  # ReportLab PDF/JSON dossier exporter
│   │       ├── rule_conflict_detector.py # Deterministic conflict detector
│   │       ├── expiry_monitor.py       # Expiry worker & re-review task engine
│   │       └── visual_intelligence.py  # 64-bit dHash & logo clearspace
│   ├── tests/                          # 25 automated Pytest suites (190 passing)
│   │   ├── test_mandatory_e2e_journey.py # 22-step enterprise simulation
│   │   ├── test_round3_advanced_capabilities.py # Visual & expiry tests
│   │   └── test_enterprise_features_round3.py   # Enterprise capabilities
│   └── requirements.txt                # Python package dependencies
├── src/                                # React 19 + TypeScript Frontend
│   ├── App.tsx                         # Root router & theme provider
│   ├── index.css                       # Enterprise design system & tokens
│   ├── components/                     # Workspace views & UI modals
│   └── services/api.ts                 # Typed backend API client
├── docs/                               # 48 Comprehensive Technical Markdown Specs
├── scripts/                            # Operational & QA test runners
│   ├── run_isolated_browser_qa.py      # Playwright 32-scenario browser QA
│   ├── verify_sqlite_regression.py     # SQLite regression suite runner
│   ├── smoke_test.py                   # API smoke test runner
│   └── prerender.ts                    # Vite static HTML prerenderer
├── package.json                        # Node dependencies & build scripts
├── vite.config.ts                      # Vite build configuration
└── README.md                           # Master GitHub landing page
```
