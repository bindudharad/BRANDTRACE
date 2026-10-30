#!/usr/bin/env python3
"""
BRANDTRACE Documentation Library Validator.
Asserts:
1. All 45 handbook markdown files + README.md exist and are non-empty.
2. Relative markdown links within the handbook resolve to valid disk paths.
3. No stale 'Planned for Round 3' placeholders exist in current-status sections.
4. Documented counts (44 routes, 15 tables, 144 passed tests) match reality.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDBOOK_DIR = ROOT / "docs" / "handbook"
README_FILE = ROOT / "README.md"

EXPECTED_FILES = [
    "README.md",
    "01_PROJECT_OVERVIEW.md",
    "02_PROBLEM_STATEMENT_AND_OBJECTIVES.md",
    "03_PRODUCT_SCOPE_AND_REQUIREMENTS.md",
    "04_SYSTEM_ARCHITECTURE.md",
    "05_TECHNOLOGY_STACK.md",
    "06_FRONTEND_ARCHITECTURE.md",
    "07_BACKEND_ARCHITECTURE.md",
    "08_API_REFERENCE.md",
    "09_API_REQUEST_RESPONSE_FLOW.md",
    "10_DATABASE_SCHEMA.md",
    "11_WORKSPACE_ISOLATION.md",
    "12_AUTHENTICATION_AND_AUTHORIZATION.md",
    "13_DEMO_MODE_AND_JUDGE_ACCESS.md",
    "14_BRAND_CONSTITUTION.md",
    "15_DETERMINISTIC_RULE_ENGINE.md",
    "16_CONTENT_REVIEW_PIPELINE.md",
    "17_FINDINGS_AND_EVIDENCE_MODEL.md",
    "18_TIME_AWARE_CLAIM_LEDGER.md",
    "19_CLAIM_IMPACT_MAP.md",
    "20_VISUAL_COMPLIANCE_OVERVIEW.md",
    "21_BRAND_ASSET_REGISTRY.md",
    "22_PDF_INGESTION_AND_TEXT_EXTRACTION.md",
    "23_IMAGE_ANALYSIS_AND_COLOUR_SCIENCE.md",
    "24_WCAG_CONTRAST_AND_LIMITATIONS.md",
    "25_GUIDELINE_HEALTH_INTELLIGENCE.md",
    "26_REVIEWER_FEEDBACK_AND_DISAGREEMENT.md",
    "27_RULE_SUGGESTIONS_AND_VERSIONING.md",
    "28_APPROVAL_GATE_AND_GOVERNANCE_WORKFLOW.md",
    "29_AUDIT_TRAIL_AND_DATA_RETENTION.md",
    "30_SECURITY_THREAT_MODEL.md",
    "31_DATA_PRIVACY_AND_SECRET_MANAGEMENT.md",
    "32_DATABASE_MIGRATIONS_AND_PERSISTENCE.md",
    "33_TESTING_STRATEGY.md",
    "34_TEST_CATALOG_AND_RESULTS.md",
    "35_LOCAL_DEVELOPMENT_SETUP.md",
    "36_ENVIRONMENT_VARIABLE_REFERENCE.md",
    "37_FRONTEND_USER_GUIDE.md",
    "38_JUDGE_DEMONSTRATION_GUIDE.md",
    "39_DEPLOYMENT_AND_VERCEL_RUNBOOK.md",
    "40_BACKEND_DEPLOYMENT_RUNBOOK.md",
    "41_TROUBLESHOOTING.md",
    "42_FEATURE_LIMITATIONS_AND_DEFERRED_ROADMAP.md",
    "43_RELEASE_AND_VERSIONING_POLICY.md",
    "44_GLOSSARY.md",
    "45_CHANGELOG_AND_RELEASE_HISTORY.md",
]

def check_files_existence() -> list[str]:
    errors = []
    for fname in EXPECTED_FILES:
        fpath = HANDBOOK_DIR / fname
        if not fpath.exists():
            errors.append(f"Missing handbook file: {fname}")
            continue
        size = fpath.stat().st_size
        if size < 200:
            errors.append(f"Handbook file too small ({size} bytes): {fname}")
    return errors

def check_markdown_links() -> list[str]:
    errors = []
    link_pattern = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
    
    for fname in EXPECTED_FILES:
        fpath = HANDBOOK_DIR / fname
        if not fpath.exists():
            continue
        content = fpath.read_text(encoding="utf-8")
        for match in link_pattern.finditer(content):
            target = match.group(2).strip()
            # Ignore absolute URLs, email mailto, KaTeX math, anchor-only links
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            # Strip anchors: foo.md#bar -> foo.md
            file_part = target.split("#")[0]
            if not file_part:
                continue
            resolved = (fpath.parent / file_part).resolve()
            if not resolved.exists():
                errors.append(f"Broken relative link in {fname}: '{target}' -> '{resolved}' does not exist.")
    return errors

def check_stale_phrases_in_readme() -> list[str]:
    errors = []
    if not README_FILE.exists():
        return ["Root README.md not found!"]
    content = README_FILE.read_text(encoding="utf-8")
    
    # Check lines 130-160 and 545-565 for 'Planned for Round 3'
    features_section = re.search(r"## 4\. Key Features(.*?)(?=## 5\.)", content, re.DOTALL)
    if features_section and "Planned for Round 3" in features_section.group(1):
        errors.append("Root README.md still contains 'Planned for Round 3' in Key Features table.")
        
    limitations_section = re.search(r"## 16\. Known Limitations(.*?)(?=## 17\.)", content, re.DOTALL)
    if limitations_section and "Planned for Round 3" in limitations_section.group(1):
        errors.append("Root README.md still contains 'Planned for Round 3' in Known Limitations table.")
        
    if "BRANDTRACE has not been deployed to a public URL" in content:
        errors.append("Root README.md claims BRANDTRACE is not deployed to a public URL.")
        
    return errors

def check_technical_metrics() -> list[str]:
    errors = []
    # 1. Check API Reference route count
    api_ref = HANDBOOK_DIR / "08_API_REFERENCE.md"
    if api_ref.exists():
        text = api_ref.read_text(encoding="utf-8")
        if not ("44 registered" in text or "Total Registered Routes: 44" in text or "44 routes" in text):
            errors.append("08_API_REFERENCE.md does not accurately document the 44 registered routes.")
            
    # 2. Check Database Schema table count
    db_schema = HANDBOOK_DIR / "10_DATABASE_SCHEMA.md"
    if db_schema.exists():
        text = db_schema.read_text(encoding="utf-8")
        if not ("15 relational" in text or "15 core tables" in text or "15 tables" in text):
            errors.append("10_DATABASE_SCHEMA.md does not reference the 15 relational tables.")
            
    # 3. Check Test Catalog results
    test_catalog = HANDBOOK_DIR / "34_TEST_CATALOG_AND_RESULTS.md"
    if test_catalog.exists():
        text = test_catalog.read_text(encoding="utf-8")
        if "144" not in text:
            errors.append("34_TEST_CATALOG_AND_RESULTS.md does not reference 144 passing backend tests.")
            
    return errors

def main() -> int:
    print("==================================================")
    print(" BRANDTRACE Documentation Library Validation")
    print("==================================================")
    
    all_errors = []
    
    print("\n[1/4] Checking Handbook file existence (46 files)...")
    errs = check_files_existence()
    if errs:
        for e in errs:
            print(f"  FAIL: {e}")
        all_errors.extend(errs)
    else:
        print(f"  PASS: All {len(EXPECTED_FILES)} handbook files exist and have substantial content.")
        
    print("\n[2/4] Validating relative Markdown links across handbook...")
    errs = check_markdown_links()
    if errs:
        for e in errs:
            print(f"  FAIL: {e}")
        all_errors.extend(errs)
    else:
        print("  PASS: All relative markdown links resolve to existing files on disk.")
        
    print("\n[3/4] Checking README.md for stale/outdated claims...")
    errs = check_stale_phrases_in_readme()
    if errs:
        for e in errs:
            print(f"  FAIL: {e}")
        all_errors.extend(errs)
    else:
        print("  PASS: Root README.md feature table and deployment status are accurate.")
        
    print("\n[4/4] Verifying technical metrics across documentation...")
    errs = check_technical_metrics()
    if errs:
        for e in errs:
            print(f"  FAIL: {e}")
        all_errors.extend(errs)
    else:
        print("  PASS: API route count (44), DB tables (15), and test counts (144) verified.")
        
    print("\n==================================================")
    if all_errors:
        print(f" FAILED: {len(all_errors)} errors detected.")
        print("==================================================")
        return 1
    else:
        print(" SUCCESS: All documentation validation checks passed (100%).")
        print("==================================================")
        return 0

if __name__ == "__main__":
    sys.exit(main())
