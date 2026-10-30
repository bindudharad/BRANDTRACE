"""
Runs all 14 backend test files under default SQLite configuration.
Ensures DATABASE_URL is not set prior to invocation so that conftest.py
creates isolated temporary SQLite databases for each test run.
"""
import os
import sys
import time
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
TESTS_DIR = BACKEND_DIR / "tests"

test_files = [
    "test_ai_adapter.py",
    "test_api.py",
    "test_color_and_visual.py",
    "test_content_review_actions.py",
    "test_defect_repairs_round3.py",
    "test_disposition_integrity.py",
    "test_groq_and_doc_intelligence.py",
    "test_pdf_parser.py",
    "test_postgresql_compatibility.py",
    "test_production_auth.py",
    "test_qa_comprehensive.py",
    "test_qa_phase2_regression.py",
    "test_round3_claim_ledger.py",
    "test_round3_guideline_health.py",
    "test_round3_visual.py",
    "test_round3_visual_benchmark.py",
]

def main():
    print("=" * 70)
    print("BRANDTRACE - STANDARD SQLITE REGRESSION SUITE RUN")
    print("=" * 70)

    # Ensure DATABASE_URL is completely removed from environment
    env = os.environ.copy()
    if "DATABASE_URL" in env:
        del env["DATABASE_URL"]
    env["PYTHONPATH"] = str(BACKEND_DIR)

    total_passed = 0
    total_skipped = 0
    total_failed = 0
    file_results = []

    dev_db_mtime_before = (REPO_ROOT / "brandtrace.db").stat().st_mtime if (REPO_ROOT / "brandtrace.db").exists() else None

    for tf in test_files:
        test_path = f"backend/tests/{tf}"
        t0 = time.time()
        res = subprocess.run(
            [sys.executable, "-m", "pytest", test_path, "-q"],
            cwd=str(REPO_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        elapsed = time.time() - t0
        output = res.stdout.strip()
        lines = [line.strip() for line in output.splitlines() if line.strip()]
        last_line = lines[-1] if lines else "NO OUTPUT"

        # Parse counts from last line (e.g., "12 passed, 1 skipped in 2.50s")
        passed = 0
        skipped = 0
        failed = 0

        import re
        m_pass = re.search(r"(\d+)\s+passed", last_line)
        m_skip = re.search(r"(\d+)\s+skipped", last_line)
        m_fail = re.search(r"(\d+)\s+failed", last_line)

        if m_pass:
            passed = int(m_pass.group(1))
        if m_skip:
            skipped = int(m_skip.group(1))
        if m_fail:
            failed = int(m_fail.group(1))

        total_passed += passed
        total_skipped += skipped
        total_failed += failed

        status = "PASS" if res.returncode == 0 else "FAIL"
        print(f"[{status}] {tf:<32} {last_line} ({elapsed:.2f}s)")
        file_results.append((tf, status, last_line, elapsed))

    dev_db_mtime_after = (REPO_ROOT / "brandtrace.db").stat().st_mtime if (REPO_ROOT / "brandtrace.db").exists() else None
    assert dev_db_mtime_before == dev_db_mtime_after, "CRITICAL: dev database brandtrace.db was mutated during test run!"

    print("=" * 70)
    print(f"SQLITE REGRESSION SUMMARY:")
    print(f" - Total Passed:  {total_passed}")
    print(f" - Total Skipped: {total_skipped}")
    print(f" - Total Failed:  {total_failed}")
    print(f" - Development database brandtrace.db: UNTOUCHED")
    print("=" * 70)

if __name__ == "__main__":
    main()
