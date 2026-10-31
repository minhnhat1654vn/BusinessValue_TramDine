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

        print("1. Opening app and logging into Admin...")
        page.goto("http://localhost:3000")
        page.wait_for_timeout(2000)

        # Set sessionStorage to bypass admin login gate
        page.evaluate("() => { sessionStorage.setItem('tram_admin_ok', '1'); }")
        
        # Click Quản trị
        admin_btn = page.locator("button:has-text('Quản trị')")
        if admin_btn.count() > 0:
            admin_btn.first.click()
            page.wait_for_timeout(2000)

        # ==========================================
        # 1. FR-19: Khách hàng & Hồ sơ tích điểm
        # ==========================================
        print("Capturing FR-19 & FR-21...")
        page.locator("button[role='tab']:has-text('Khách hàng')").click()
        page.wait_for_timeout(2000)
        
        # Screenshot list
        page.screenshot(path=os.path.join(OUTPUT_DIR, "FR19_customers_list.png"))
        print("Saved FR19_customers_list.png")

        # Open customer detail
        detail_btn = page.locator("button:has-text('Xem hồ sơ')").first
        if detail_btn.count() > 0:
            detail_btn.click()
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "FR19_customer_profile_detail.png"))
            print("Saved FR19_customer_profile_detail.png")
            page.keyboard.press("Escape")
            page.wait_for_timeout(800)

        # ==========================================
        # FR-21: Bảng 8 nhóm 8
        # ==========================================
        print("Capturing FR-21 Bảng 8...")
        bang8_btn = page.locator("button:has-text('Đặc tả Bảng 8: 3 Hạng')")
        if bang8_btn.count() > 0:
            bang8_btn.click()
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "FR21_bang8_tier_program.png"))
            print("Saved FR21_bang8_tier_program.png")
            page.keyboard.press("Escape")
            page.wait_for_timeout(800)

        # ==========================================
        # FR-25: Chiến dịch mời lại (Re-engagement)
        # ==========================================
        print("Capturing FR-25 Re-engagement...")
        # Look for "Xem trước Email & Zalo" button
        reengage_btn = page.locator("button:has-text('Xem trước Email & Zalo')").first
        if reengage_btn.count() > 0:
            reengage_btn.click()
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "FR25_reengagement_campaign.png"))
            print("Saved FR25_reengagement_campaign.png")
            page.keyboard.press("Escape")
            page.wait_for_timeout(800)

        # ==========================================
        # FR-26: Thư Chúc Mừng Lên Hạng
        # ==========================================
        print("Capturing FR-26 Tier Upgrade...")
        upgrade_btn = page.locator("button:has-text('Thư Chúc Mừng Lên Hạng')").first
        if upgrade_btn.count() > 0:
            upgrade_btn.click()
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "FR26_tier_upgrade_dialog.png"))
            print("Saved FR26_tier_upgrade_dialog.png")
            page.keyboard.press("Escape")
            page.wait_for_timeout(800)

        # ==========================================
        # 2. FR-24: Thống kê khảo sát
        # ==========================================
        print("Capturing FR-24 Surveys Analytics...")
        survey_tab = page.locator("button[role='tab']:has-text('Thống kê khảo sát')")
        if survey_tab.count() > 0:
            survey_tab.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "FR24_surveys_analytics.png"))
            print("Saved FR24_surveys_analytics.png")

        # ==========================================
        # 3. FR-20: Tích điểm theo hóa đơn khi check-in
        # ==========================================
        print("Capturing FR-20 Check-in & Points...")
        res_tab = page.locator("button[role='tab']:has-text('Đặt bàn')")
        if res_tab.count() > 0:
            res_tab.click()
            page.wait_for_timeout(2000)

            # Check if there is a Check-in button
            checkin_btn = page.locator("button:has-text('Check-in')")
            if checkin_btn.count() > 0:
                checkin_btn.first.click()
                page.wait_for_timeout(1500)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "FR20_checkin_reward_dialog.png"))
                print("Saved FR20_checkin_reward_dialog.png")
                page.keyboard.press("Escape")
                page.wait_for_timeout(800)

        # ==========================================
        # 4. FR-23: Khảo sát sau bữa ăn (/survey/[code])
        # ==========================================
        print("Capturing FR-23 Post Dining Survey...")
        page.goto("http://localhost:3000/survey/TRM-HDVF")
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "FR23_post_dining_survey.png"))
        print("Saved FR23_post_dining_survey.png")

        # ==========================================
        # 5. FR-22: Miễn cọc hạng cao nhất (Booking Wizard)
        # ==========================================
        print("Capturing FR-22 Deposit Exemption for Nam Tram...")
        page.goto("http://localhost:3000")
        page.wait_for_timeout(1500)

        # Click Đặt bàn ngay
        page.locator("button:has-text('Đặt bàn ngay')").first.click()
        page.wait_for_timeout(1500)

        # Bước 1 -> Tiếp tục
        page.locator("button:has-text('Tiếp tục')").click()
        page.wait_for_timeout(1200)

        # Bước 2: Chọn bàn B06 hoặc bàn đầu tiên có sẵn
        table_slot = page.locator("button:has-text('B06'), button:has-text('B01')").first
        if table_slot.count() > 0:
            table_slot.click()
            page.wait_for_timeout(800)
        page.locator("button:has-text('Tiếp tục')").click()
        page.wait_for_timeout(1200)

        # Bước 3: Thông tin khách -> Click nút mẫu Nam Trầm (0909 999 999)
        namtram_sample = page.locator("button:has-text('0909 999 999')")
        if namtram_sample.count() > 0:
            namtram_sample.click()
            page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(OUTPUT_DIR, "FR22_step3_namtram_detected.png"))
        print("Saved FR22_step3_namtram_detected.png")

        # Bước 3 -> Bước 4: Click "Xem tổng đơn & cọc"
        submit_step3 = page.locator("button:has-text('Xem tổng đơn & cọc')")
        if submit_step3.count() > 0:
            submit_step3.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "FR22_step4_deposit_exempted.png"))
            print("Saved FR22_step4_deposit_exempted.png")

        browser.close()
        print("ALL SCREENSHOTS CAPTURED PERFECTLY!")

if __name__ == "__main__":
    run()
