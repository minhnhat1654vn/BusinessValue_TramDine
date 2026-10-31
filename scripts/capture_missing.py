import os
import sys
import time
from playwright.sync_api import sync_playwright

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

OUTPUT_DIR = os.path.abspath("docs/screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 950})
        page = context.new_page()

        # 1. Capture Bảng 8
        print("1. Capturing FR21 Bảng 8...")
        page.goto("http://localhost:3000")
        page.wait_for_timeout(1500)
        page.evaluate("() => { sessionStorage.setItem('tram_admin_ok', '1'); }")
        page.locator("button:has-text('Quản trị')").first.click()
        page.wait_for_timeout(2000)

        page.locator("button[role='tab']:has-text('Khách hàng')").click()
        page.wait_for_timeout(1500)

        bang8_btn = page.locator("button:has-text('Xem Đặc Tả Bảng 8')")
        if bang8_btn.count() > 0:
            bang8_btn.first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "FR21_bang8_tier_program.png"))
            print("Saved FR21_bang8_tier_program.png")
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)

        # 2. Capture FR-22 Booking Flow
        print("2. Capturing FR-22 Booking Flow...")
        page.goto("http://localhost:3000")
        page.wait_for_timeout(1500)

        # Click "Đặt bàn ngay"
        page.locator("button:has-text('Đặt bàn ngay')").first.click()
        page.wait_for_timeout(1500)

        # Step 1: Click slot 17:30 or 19:45
        slot_btn = page.locator("button:has-text('17:30')").first
        if slot_btn.count() > 0:
            slot_btn.click()
            page.wait_for_timeout(500)

        page.locator("button:has-text('Chọn bàn')").first.click()
        page.wait_for_timeout(1500)

        # Step 2: Select first available table
        # Tables have buttons with table code
        table_btn = page.locator("button:has-text('B0')").first
        if table_btn.count() > 0:
            table_btn.click()
            page.wait_for_timeout(800)

        page.locator("button:has-text('Nhập thông tin')").first.click()
        page.wait_for_timeout(1500)

        # Step 3: Information - Click sample Nam Tram button
        namtram_btn = page.locator("button:has-text('0909 999 999')").first
        if namtram_btn.count() > 0:
            namtram_btn.click()
            page.wait_for_timeout(1200)

        page.screenshot(path=os.path.join(OUTPUT_DIR, "FR22_step3_namtram_detected.png"))
        print("Saved FR22_step3_namtram_detected.png")

        # Step 3 -> Step 4
        page.locator("button:has-text('Xem tổng đơn & cọc')").first.click()
        page.wait_for_timeout(1500)

        page.screenshot(path=os.path.join(OUTPUT_DIR, "FR22_step4_deposit_exempted.png"))
        print("Saved FR22_step4_deposit_exempted.png")

        browser.close()
        print("Done capturing missing screenshots!")

if __name__ == "__main__":
    run()
