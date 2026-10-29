# Deterministic and AI Analysis Modes

## Architectural Philosophy: Deterministic-First

A core tenet of BRANDTRACE is that enterprise compliance cannot depend entirely on non-deterministic, probabilistic AI models. While large language models excel at natural language synthesis, their outputs can vary between invocations, suffer from latency or rate limiting, hallucinate false citations, and fail entirely in air-gapped network environments.

To provide unconditional reliability, BRANDTRACE implements a **deterministic-first** architecture with an **optional cloud AI enhancement layer**.

```
+--------------------------------------------------------------------------+
|                       ANALYSIS EXECUTION STRATEGY                        |
+--------------------------------------------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
    [ Deterministic Engine ]                     [ Optional AI Provider ]
  - Regex pattern matching                     - Semantic tone analysis
  - Fact ledger date verification              - Promotional claim triage
  - 100% reproducible                          - Requires GEMINI_API_KEY
  - Zero API key required                      - Strict citation validation
  - Sub-millisecond latency                    - Graceful offline fallback
               |                                           |
               +---------------------+---------------------+
                                     |
                                     v
                       [ Unified Findings List ]
                       - Severity deductions applied
                       - Human adjudication required
```

---

## Mode 1: Deterministic Offline Mode (`AI_PROVIDER=offline`)

This is the default operating mode for local development, automated testing, and offline demonstration:

### How it Operates
* Controlled by environment variable: `AI_PROVIDER=offline`.
* Factory function `get_ai_provider()` instantiates `OfflineProvider` (`backend/app/ai_adapter.py`).
* Leverages Python's native `re` module and localized token heuristics:
  * Scans for codified prohibited phrases (`R-VOICE-01`, `R-TERM-03`).
  * Scans for missing mandatory terms (`R-TERM-02`).
  * Checks dates against the active fact ledger (`F-2026-01`).
  * Employs keyword token triage to detect unverified promotional promises (e.g., `"always"`, `"guarantee"`, `"100% risk free"`, `"uninterrupted"`).
  * Executes BM25 token similarity matching against the active claim ledger.

### Key Advantages
1. **Zero External Dependencies**: Operates with no internet connection, no external vendor accounts, and zero API costs.
2. **Absolute Reproducibility**: Given identical input text and database state, the output findings and health score are mathematically identical across every run.
3. **Instantaneous Execution**: Completes in less than 5 milliseconds, enabling real-time linting as authors type.

---

## Mode 2: Cloud AI Mode (`AI_PROVIDER=gemini`)

When semantic depth is required, the platform can be configured to use Google's Gemini 1.5 Flash model:

### How it Operates
* Configured via:
  ```powershell
  $env:AI_PROVIDER = "gemini"
  $env:GEMINI_API_KEY = "AIzaSy..."
  ```
* Factory function instantiates `GeminiProvider`.
* Constructs a structured prompt containing:
  * The submitted review content.
  * A serialized JSON catalog of all active brand rules.
  * A serialized JSON catalog of all active approved facts.
* Calls the Gemini REST endpoint, requesting structured JSON output conforming to the `AIFindingCandidate` schema.
* **Semantic Capabilities**:
  * Detects subtle tone issues (e.g., passive-aggressive customer messaging, condescending technical explanations).
  * Identifies implied promotional claims that evade simple regex keyword matching (e.g., claiming to be "the undisputed industry benchmark").

---

## Defensive Guardrails in AI Mode

To ensure the AI layer cannot corrupt governance integrity, three safeguards are enforced:

### 1. Strict Citation Validation
LLMs frequently hallucinate plausible-sounding policy IDs (e.g., inventing `R-VOICE-99`). In `governance.py`, the backend maintains an in-memory set of all active database rule and fact IDs. If Gemini emits a finding citing an ID not in this set, `source_id` is stripped and the citation is marked unverified.

### 2. Graceful Fallback on Missing / Invalid Credentials
If `AI_PROVIDER=gemini` is configured but `GEMINI_API_KEY` is omitted, malformed, or rejected by Google's API (e.g., quota exhausted or network failure), `get_ai_provider()` automatically catches the exception and **falls back to `OfflineProvider`**. The review continues without error.

### 3. Human Review is Mandatory
Regardless of whether a finding originates from deterministic regex or Gemini AI, **the AI never approves a draft**. All findings require human review, and unresolved high-risk findings continue to trigger the server-side `HTTP 409` approval block.

---

## Mode Comparison Summary

| Metric / Capability | Offline Mode (`offline`) | Gemini AI Mode (`gemini`) |
| :--- | :--- | :--- |
| **API Key Required** | None (Zero Setup) | `GEMINI_API_KEY` |
| **Network Access** | Completely Air-Gapped | Outbound HTTPS to Google API |
| **Execution Latency** | < 5 ms | 800 ms - 2,500 ms |
| **Deterministic Guarantee** | 100% Identical Output | Minor non-deterministic variance |
| **Prohibited Phrase Detection** | Exact & Regex | Exact & Regex |
| **Nuanced Tone Analysis** | Keyword Heuristics | Deep Contextual Semantics |
| **Citation Integrity** | 100% Database Linked | Validated against Database IDs |
| **Approval Gate Enforcement** | Strict Server-Side HTTP 409 | Strict Server-Side HTTP 409 |
