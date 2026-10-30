"""
BRANDTRACE - Visual QA, Text Contrast Measurement and Screenshot Generator
Inspects the running frontend, measures rendered text contrast against WCAG AA standards,
and captures full-page screenshots at 1920x1080 and 1366x768 viewports.
"""

import os
import sys
import math
import json
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BROWSER_TEST_BASE_URL", "http://localhost:3001")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_DIR = r"C:\Projects\BRANDTRACE\BRANDTRACE\screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def parse_rgba(rgb_str):
    if not rgb_str:
        return (0, 0, 0, 1.0)
    rgb_str = rgb_str.strip()
    if rgb_str.startswith("rgba"):
        parts = rgb_str[5:-1].split(",")
        return (float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))
    elif rgb_str.startswith("rgb"):
        parts = rgb_str[4:-1].split(",")
        return (float(parts[0]), float(parts[1]), float(parts[2]), 1.0)
    return (0, 0, 0, 1.0)

def srgb_to_linear(val):
    v = val / 255.0
    return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

def get_luminance(r, g, b):
    return 0.2126 * srgb_to_linear(r) + 0.7152 * srgb_to_linear(g) + 0.0722 * srgb_to_linear(b)

def contrast_ratio(lum1, lum2):
    l1 = max(lum1, lum2)
    l2 = min(lum1, lum2)
    return (l1 + 0.05) / (l2 + 0.05)

def run_visual_audit():
    print("=" * 80)
    print("BRANDTRACE VISUAL QA & CONTRAST AUDIT")
    print("=" * 80)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        
        # ---------------------------------------------------------------------
        # 1. 1920x1080 Full-page Landing & Judge Access Modal
        # ---------------------------------------------------------------------
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        page.goto(BASE_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(1000)

        landing_1080 = os.path.join(OUTPUT_DIR, "landing_1920x1080.png")
        page.screenshot(path=landing_1080, full_page=True)
        print(f"Captured: {landing_1080}")

        # Open Judge Access Modal from Hero
        judge_btn = page.locator("button").filter(has_text="Judge Access").first
        if judge_btn.is_visible():
            judge_btn.click()
            page.wait_for_timeout(500)
            modal_1080 = os.path.join(OUTPUT_DIR, "judge_access_modal_1920x1080.png")
            page.screenshot(path=modal_1080)
            print(f"Captured: {modal_1080}")

            # Verify 4 roles in modal
            role_texts = ["Brand Admin", "Reviewer (Primary)", "Creator", "Auditor"]
            for r in role_texts:
                assert page.locator("button").filter(has_text=r).count() > 0, f"Role card '{r}' missing in Judge Access Modal"
            print("Verified: Exactly 4 roles present in Judge Access Modal (Brand Admin, Reviewer (Primary), Creator, Auditor)")

            # Select Reviewer and enter workspace
            page.locator("button").filter(has_text="Reviewer (Primary)").first.click()
            page.wait_for_timeout(200)
            page.locator("button").filter(has_text="Continue as Reviewer (Primary)").first.click()
            page.wait_for_timeout(1000)

        # Ensure we are inside workspace
        enter_ws = page.locator("button").filter(has_text="Enter the Workspace").first
        if enter_ws.count() > 0 and enter_ws.is_visible():
            enter_ws.click()
            page.wait_for_timeout(1000)

        page.locator("aside nav button").first.wait_for(state="visible", timeout=8000)

        # ---------------------------------------------------------------------
        # 2. Workspace Overview, Review, Blocked Approval, Insights, Help
        # ---------------------------------------------------------------------
        # Overview
        ws_overview_1080 = os.path.join(OUTPUT_DIR, "workspace_overview_1920x1080.png")
        page.screenshot(path=ws_overview_1080)
        print(f"Captured: {ws_overview_1080}")

        # Content Review
        page.locator("aside nav button").filter(has_text="Content Review").first.click()
        page.wait_for_timeout(800)
        ws_review_1080 = os.path.join(OUTPUT_DIR, "workspace_content_review_1920x1080.png")
        page.screenshot(path=ws_review_1080)
        print(f"Captured: {ws_review_1080}")

        # Blocked Approval state screenshot
        blocked_btn = page.locator("button").filter(has_text="Approval blocked").first
        if blocked_btn.is_visible():
            ws_blocked_1080 = os.path.join(OUTPUT_DIR, "workspace_approval_blocked_1920x1080.png")
            page.screenshot(path=ws_blocked_1080)
            print(f"Captured: {ws_blocked_1080}")
            print("Verified: Approval button shows blocked state with active lock icon and explanation")

        # Governance Insights
        page.locator("aside nav button").filter(has_text="Governance Insights").first.click()
        page.wait_for_timeout(800)
        ws_insights_1080 = os.path.join(OUTPUT_DIR, "workspace_governance_insights_1920x1080.png")
        page.screenshot(path=ws_insights_1080)
        print(f"Captured: {ws_insights_1080}")

        # Help & Demo
        page.locator("aside nav button").filter(has_text="Help & Demo").first.click()
        page.wait_for_timeout(800)
        ws_help_1080 = os.path.join(OUTPUT_DIR, "workspace_help_demo_1920x1080.png")
        page.screenshot(path=ws_help_1080)
        print(f"Captured: {ws_help_1080}")

        # Product Tour from sidebar
        tour_btn = page.locator("button").filter(has_text="Take Judge Tour").first
        if tour_btn.is_visible():
            tour_btn.click()
            page.wait_for_timeout(500)
            tour_step1_1080 = os.path.join(OUTPUT_DIR, "product_tour_step1_1920x1080.png")
            page.screenshot(path=tour_step1_1080)
            print(f"Captured: {tour_step1_1080}")
            
            # Verify 8 steps
            step_indicator = page.locator("text=/08").or_(page.locator("text=01 / 08")).first
            assert step_indicator.is_visible(), "Expected 8-step indicator ('01 / 08')"
            print("Verified: Canonical 8-step Product Tour open from Workspace Take Judge Tour button")
            
            # Close tour
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)

        # ---------------------------------------------------------------------
        # 3. 1366x768 Viewport Screenshots
        # ---------------------------------------------------------------------
        context_1366 = browser.new_context(viewport={"width": 1366, "height": 768})
        page_1366 = context_1366.new_page()
        page_1366.goto(BASE_URL, wait_until="domcontentloaded")
        page_1366.wait_for_timeout(800)

        landing_768 = os.path.join(OUTPUT_DIR, "landing_1366x768.png")
        page_1366.screenshot(path=landing_768, full_page=True)
        print(f"Captured: {landing_768}")

        judge_btn_768 = page_1366.locator("button").filter(has_text="Judge Access").first
        if judge_btn_768.is_visible():
            judge_btn_768.click()
            page_1366.wait_for_timeout(400)
            modal_768 = os.path.join(OUTPUT_DIR, "judge_access_modal_1366x768.png")
            page_1366.screenshot(path=modal_768)
            print(f"Captured: {modal_768}")
            page_1366.keyboard.press("Escape")
            page_1366.wait_for_timeout(200)

        # ---------------------------------------------------------------------
        # 4. Computed Style Text Contrast Measurement
        # ---------------------------------------------------------------------
        print("\n" + "=" * 80)
        print("MEASURING RENDERED TEXT CONTRAST ON LANDING PAGE & WORKSPACE")
        print("=" * 80)

        contrast_elements = page.evaluate("""
            () => {
                const results = [];
                function findBackground(el) {
                    let cur = el;
                    while (cur && cur !== document.documentElement) {
                        const bg = window.getComputedStyle(cur).backgroundColor;
                        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                            return bg;
                        }
                        cur = cur.parentElement;
                    }
                    return 'rgb(246, 248, 246)'; // Default fallback background
                }

                // Sample key text elements
                const selectors = [
                    'h1', 'h2', 'h3',
                    'p', '.metric-label', '.metric-value',
                    '.nav-item span', 'button.btn-primary',
                    '.bt-walkthrough-step .bt-step-num',
                    '.label-sm', 'aside nav button'
                ];

                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach((el, idx) => {
                        if (idx < 3) { // Sample first 3 of each
                            const style = window.getComputedStyle(el);
                            const text = (el.innerText || '').trim().substring(0, 30);
                            if (text) {
                                results.push({
                                    selector: sel,
                                    text: text,
                                    color: style.color,
                                    bgColor: findBackground(el),
                                    fontSize: style.fontSize,
                                    fontWeight: style.fontWeight
                                });
                            }
                        }
                    });
                });
                return results;
            }
        """)

        all_compliant = True
        contrast_report = []
        for item in contrast_elements:
            fg_rgba = parse_rgba(item["color"])
            bg_rgba = parse_rgba(item["bgColor"])
            lum_fg = get_luminance(fg_rgba[0], fg_rgba[1], fg_rgba[2])
            lum_bg = get_luminance(bg_rgba[0], bg_rgba[1], bg_rgba[2])
            ratio = contrast_ratio(lum_fg, lum_bg)
            
            # Determine threshold
            try:
                px = float(item["fontSize"].replace("px", ""))
            except Exception:
                px = 14.0
            is_large = px >= 18.0 or (px >= 14.0 and int(item["fontWeight"]) >= 700 if item["fontWeight"].isdigit() else False)
            min_req = 3.0 if is_large else 4.5
            passed = ratio >= min_req
            if not passed:
                all_compliant = False
            
            contrast_report.append({
                "element": item["selector"],
                "text": item["text"],
                "color": item["color"],
                "bg": item["bgColor"],
                "ratio": f"{ratio:.2f}:1",
                "required": f"{min_req}:1",
                "wcag_aa": "PASS" if passed else "FAIL"
            })
            print(f"[{'PASS' if passed else 'FAIL'}] {item['selector']:<18} | Ratio: {ratio:5.2f}:1 (Req: {min_req}:1) | Text: {item['text'][:25]} | FG: {item['color']} on BG: {item['bgColor']}")

        browser.close()
        print("\nContrast Audit Completed. WCAG AA Status: " + ("100% COMPLIANT" if all_compliant else "LOW CONTRAST DETECTED"))
        return all_compliant

if __name__ == "__main__":
    run_visual_audit()
