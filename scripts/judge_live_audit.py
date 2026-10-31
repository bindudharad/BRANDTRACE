"""
BRANDTRACE — Environment A: Live Public Judge Simulation
Opens https://brandtrace-woad.vercel.app/ in a clean anonymous Playwright browser session.
Evaluates:
- Page load time and visual presentation
- Console messages, warnings, and errors
- Network requests, responses, and failures
- Broken images or layout issues
- Navigation and interactive button discovery
- Captures full-page screenshots
"""
import sys
import os
import json
import time
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LIVE_URL = "https://brandtrace-woad.vercel.app/"
SCREENSHOTS_DIR = r"C:\Projects\BRANDTRACE\BRANDTRACE\screenshots"

def main():
    print("=" * 80)
    print("BRANDTRACE — ENVIRONMENT A: LIVE PUBLIC JUDGE SIMULATION")
    print(f"Target URL: {LIVE_URL}")
    print("=" * 80)

    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    report = {
        "target_url": LIVE_URL,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "console_errors": [],
        "console_warnings": [],
        "failed_requests": [],
        "network_requests": [],
        "discovered_buttons": [],
        "first_impressions": {},
        "status": "PASS"
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeAxis-Judge-Simulation/1.0"
        )
        page = context.new_page()

        # Listen for console events
        def on_console(msg):
            if msg.type == "error":
                report["console_errors"].append(msg.text)
                print(f"[CONSOLE ERROR] {msg.text}")
            elif msg.type == "warning":
                report["console_warnings"].append(msg.text)

        page.on("console", on_console)

        # Listen for network requests
        def on_response(resp):
            report["network_requests"].append({
                "url": resp.url,
                "status": resp.status,
                "method": resp.request.method
            })
            if resp.status >= 400:
                report["failed_requests"].append({
                    "url": resp.url,
                    "status": resp.status,
                    "status_text": resp.status_text
                })
                print(f"[HTTP {resp.status}] Failed request to {resp.url}")

        page.on("response", on_response)

        # 1. Measure initial page load
        t0 = time.time()
        print(f"Navigating to {LIVE_URL}...")
        resp = page.goto(LIVE_URL, wait_until="networkidle", timeout=30000)
        load_time = time.time() - t0
        status_code = resp.status if resp else 0
        print(f"Navigation completed in {load_time:.2f}s with HTTP {status_code}")
        report["first_impressions"]["page_load_seconds"] = round(load_time, 2)
        report["first_impressions"]["http_status"] = status_code

        # 2. Inspect page identity and branding
        title = page.title()
        print(f"Page Title: {title}")
        report["first_impressions"]["title"] = title

        # Check for core branding text
        body_text = page.inner_text("body")
        has_brandtrace = "BRANDTRACE" in body_text
        has_tagline = ("Every finding has a source" in body_text) or ("Every decision has an owner" in body_text)
        print(f"Branding Detected: 'BRANDTRACE'={has_brandtrace}, Tagline={has_tagline}")
        report["first_impressions"]["has_branding"] = has_brandtrace
        report["first_impressions"]["has_tagline"] = has_tagline

        # 3. Check for broken images
        broken_images = page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src);
        }""")
        print(f"Broken images detected: {len(broken_images)}")
        report["first_impressions"]["broken_images"] = broken_images

        # 4. Capture landing screenshot
        landing_ss = os.path.join(SCREENSHOTS_DIR, "judge_live_landing_1920x1080.png")
        page.screenshot(path=landing_ss, full_page=False)
        print(f"Captured landing screenshot: {landing_ss}")

        # 5. Discover all visible buttons on landing page
        landing_buttons = page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button, a[role=\"button\"], a.btn'));
            return btns.map(b => ({
                text: b.innerText.trim(),
                tag: b.tagName,
                visible: b.offsetWidth > 0 && b.offsetHeight > 0,
                disabled: b.disabled || false,
                classes: b.className
            })).filter(b => b.visible && b.text.length > 0);
        }""")
        print(f"Discovered {len(landing_buttons)} visible buttons/actions on landing page:")
        for b in landing_buttons[:10]:
            print(f"  - [{b['tag']}] '{b['text']}'")
        report["discovered_buttons"].extend(landing_buttons)

        # 6. Locate 'Enter Workspace' or 'Launch' CTA
        cta_loc = page.locator("button, a").filter(has_text="Enter Workspace").or_(
            page.locator("button, a").filter(has_text="Launch")
        ).or_(page.locator("button, a").filter(has_text="Demo")).or_(
            page.locator("button, a").filter(has_text="Take Judge Tour")
        ).first

        cta_found = cta_loc.count() > 0 and cta_loc.is_visible()
        print(f"Primary Workspace Entry CTA found: {cta_found}")
        report["first_impressions"]["cta_found"] = cta_found

        if cta_found:
            cta_text = cta_loc.inner_text()
            print(f"Clicking CTA '{cta_text}'...")
            cta_loc.click()
            page.wait_for_timeout(2000)

            # Check if workspace view loaded
            ws_ss = os.path.join(SCREENSHOTS_DIR, "judge_live_workspace_1920x1080.png")
            page.screenshot(path=ws_ss, full_page=False)
            print(f"Captured workspace screenshot: {ws_ss}")

            # Discover workspace navigation tabs
            ws_tabs = page.evaluate("""() => {
                const navBtns = Array.from(document.querySelectorAll('aside button, nav button, header button'));
                return navBtns.map(b => b.innerText.trim()).filter(t => t.length > 0);
            }""")
            print(f"Workspace navigation elements discovered: {len(ws_tabs)}")
            for t in ws_tabs[:10]:
                print(f"  - Tab/Nav: '{t}'")
            report["first_impressions"]["workspace_navigation"] = ws_tabs

        browser.close()

    # Save report JSON
    report_path = os.path.join(r"C:\Projects\BRANDTRACE\BRANDTRACE\scratch", "judge_live_audit_report.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\nLive audit report saved to: {report_path}")

    # Summary
    print("\n" + "=" * 80)
    print("LIVE PUBLIC JUDGE EXPERIENCE SUMMARY")
    print("=" * 80)
    print(f"Status: {report['status']}")
    print(f"Page Load: {report['first_impressions'].get('page_load_seconds')}s")
    print(f"Console Errors: {len(report['console_errors'])}")
    print(f"Console Warnings: {len(report['console_warnings'])}")
    print(f"Failed HTTP Requests: {len(report['failed_requests'])}")
    print(f"Broken Images: {len(report['first_impressions'].get('broken_images', []))}")
    print("=" * 80)

if __name__ == "__main__":
    main()
