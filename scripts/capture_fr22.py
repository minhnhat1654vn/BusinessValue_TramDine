import os
import sys
from playwright.sync_api import sync_playwright

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

OUTPUT_DIR = os.path.abspath("docs/screenshots")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 950})

    page.goto("http://localhost:3000")
    page.wait_for_timeout(1500)
    page.locator("button:has-text('Đặt bàn ngay')").first.click()
    page.wait_for_timeout(1500)

    # Click first enabled date button in the date strip
    enabled_date = page.locator("div.flex.gap-1\\.5 button:not([disabled])").first
    if enabled_date.count() > 0:
        enabled_date.click()
        page.wait_for_timeout(800)

    # Click slot 17:30
    page.locator("button:has-text('17:30')").first.click()
    page.wait_for_timeout(500)

    # Click Chọn bàn
    page.locator("button:has-text('Chọn bàn')").first.click()
    page.wait_for_timeout(1500)

    # Find any table that can be selected (look for table code that is not disabled)
    # Click table card or button
    tables = page.locator("button[aria-label*='chỗ']:not([disabled])")
    if tables.count() > 0:
        tables.first.click()
        page.wait_for_timeout(800)

    # Click Nhập thông tin
    page.locator("button:has-text('Nhập thông tin')").first.click()
    page.wait_for_timeout(1500)

    # Click quick sample Nam Tram button
    namtram_btn = page.locator("button:has-text('0909 999 999')").first
    if namtram_btn.count() > 0:
        namtram_btn.click()
        page.wait_for_timeout(1200)

    page.screenshot(path=os.path.join(OUTPUT_DIR, "FR22_step3_namtram_detected.png"))
    print("Saved FR22_step3_namtram_detected.png")

    # Click Xem tổng đơn & cọc
    page.locator("button:has-text('Xem tổng đơn & cọc')").first.click()
    page.wait_for_timeout(1500)

    page.screenshot(path=os.path.join(OUTPUT_DIR, "FR22_step4_deposit_exempted.png"))
    print("Saved FR22_step4_deposit_exempted.png")

    browser.close()
    print("FR-22 screenshots saved successfully!")
