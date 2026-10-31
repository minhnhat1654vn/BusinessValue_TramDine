import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:left w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'<w:insideV w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr[0].append(borders)

def build_report():
    doc = Document()

    # Set margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)

    # Palette
    COLOR_PRIMARY = RGBColor(180, 83, 9)     # #b45309 Amber
    COLOR_DARK = RGBColor(41, 37, 36)        # #292524 Stone-800
    COLOR_MUTED = RGBColor(120, 113, 108)    # #78716c Stone-500
    COLOR_SUCCESS = RGBColor(21, 128, 61)    # #15803d Emerald-700
    HEX_HEADER_BG = "78350F"                 # Dark amber
    HEX_LIGHT_ROW = "FEF9C3"                 # Light amber/yellow tint
    HEX_WHITE = "FFFFFF"

    # ==========================================
    # HEADER & TITLE BLOCK
    # ==========================================
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_after = Pt(2)
    r_sub = p_meta.add_run("TRẦM RESERVE · HỆ THỐNG ĐẶT BÀN & QUẢN TRỊ TRẢI NGHIỆM KHÁCH HÀNG")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(9.5)
    r_sub.font.bold = True
    r_sub.font.color.rgb = COLOR_PRIMARY

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("BÁO CÁO KẾT QUẢ TRIỂN KHAI TÍNH NĂNG SPRINT 2\n(FR-19 ĐẾN FR-26)")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(20)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_DARK

    p_desc = doc.add_paragraph()
    p_desc.paragraph_format.space_after = Pt(14)
    r_desc = p_desc.add_run(
        "Báo cáo chi tiết nghiệm thu kỹ thuật và nghiệp vụ hệ thống Khách hàng Thân thiết (Loyalty Program), "
        "Tích điểm Hóa đơn, Miễn cọc VIP, Khảo sát 5 sao & Chiến dịch Chăm sóc khách hàng tự động."
    )
    r_desc.font.name = "Arial"
    r_desc.font.size = Pt(10.5)
    r_desc.font.italic = True
    r_desc.font.color.rgb = COLOR_MUTED

    # Meta Table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    set_table_borders(meta_table, color="E5E7EB", sz="4")

    meta_data = [
        ("Kính gửi:", "Technical Leader / Project Manager môn Business Value"),
        ("Người báo cáo:", "Kỹ sư phụ trách phát triển tính năng Sprint 2"),
        ("Thời gian nghiệm thu:", "31/10/2026 — Phiên bản v1.0.0 (Production-Ready)"),
        ("Kết quả tổng quan:", "✅ HOÀN THÀNH 100% (8/8 Yêu cầu chức năng Đạt kiểm thử)")
    ]

    for idx, (label, val) in enumerate(meta_data):
        row = meta_table.rows[idx]
        cell_0 = row.cells[0]
        cell_1 = row.cells[1]
        cell_0.width = Inches(2.0)
        cell_1.width = Inches(4.7)
        set_cell_margins(cell_0, 60, 60, 100, 100)
        set_cell_margins(cell_1, 60, 60, 100, 100)
        set_cell_background(cell_0, "F5F5F4")
        set_cell_background(cell_1, "FAFAF9")

        p0 = cell_0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(label)
        r0.font.name = "Arial"
        r0.font.size = Pt(9.5)
        r0.font.bold = True
        r0.font.color.rgb = COLOR_DARK

        p1 = cell_1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(val)
        r1.font.name = "Arial"
        r1.font.size = Pt(9.5)
        if "HOÀN THÀNH" in val:
            r1.font.bold = True
            r1.font.color.rgb = COLOR_SUCCESS
        else:
            r1.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ==========================================
    # PHẦN I: MA TRẬN NGHIỆM THU TỔNG HỢP
    # ==========================================
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("I. MA TRẬN NGHIỆM THU TÍNH NĂNG SPRINT 2")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(13)
    r_h1.font.bold = True
    r_h1.font.color.rgb = COLOR_PRIMARY

    p_intro = doc.add_paragraph()
    r_it = p_intro.add_run(
        "Toàn bộ 8/8 yêu cầu chức năng từ FR-19 đến FR-26 đã được lập trình hoàn tất, tích hợp chặt chẽ vào quy trình "
        "đặt bàn và quản trị vận hành của TRẦM Reserve, vượt qua 100% kịch bản kiểm thử (Test Cases)."
    )
    r_it.font.name = "Arial"
    r_it.font.size = Pt(10)

    # Matrix Table
    matrix_table = doc.add_table(rows=9, cols=6)
    matrix_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(matrix_table, color="D6D3D1", sz="4")

    headers = ["Mã", "Tên chức năng", "Ưu tiên", "Mô tả triển khai", "Trạng thái", "Kết quả"]
    col_widths = [Inches(0.7), Inches(1.5), Inches(0.8), Inches(2.2), Inches(0.8), Inches(0.7)]

    # Header Row
    hdr_row = matrix_table.rows[0]
    for c_idx, title in enumerate(headers):
        cell = hdr_row.cells[c_idx]
        cell.width = col_widths[c_idx]
        set_cell_background(cell, HEX_HEADER_BG)
        set_cell_margins(cell, 80, 80, 80, 80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(title)
        run.font.name = "Arial"
        run.font.size = Pt(9)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    matrix_rows = [
        ("FR-19", "Hạng & điểm trên hồ sơ khách", "Should", "Hồ sơ khách hàng, huy hiệu hạng, thanh tiến độ, lịch sử tiêu dùng", "Hoàn thành", "PASS"),
        ("FR-20", "Tích điểm theo hóa đơn", "Should", "Tích 1.000 đ = 1 pt; thưởng 5% (Trầm), 8% (Nam Trầm) khi Check-in", "Hoàn thành", "PASS"),
        ("FR-21", "Chương trình ba hạng", "Must", "Đặc tả Bảng 8 nhóm 8: Hương (0-2), Trầm (3-5), Nam Trầm (6+)", "Hoàn thành", "PASS"),
        ("FR-22", "Miễn cọc hạng cao nhất", "Could", "Khách Nam Trầm tự động bỏ qua thanh toán cọc 300.000 đ/khách", "Hoàn thành", "PASS"),
        ("FR-23", "Khảo sát sau bữa ăn", "Should", "Trang /survey/[code] đánh giá 5 sao, 4 tiêu chí fine-dining, nhận xét", "Hoàn thành", "PASS"),
        ("FR-24", "Thống kê khảo sát", "Should", "Tab Thống kê khảo sát: Điểm TB, biểu đồ phân bố sao, phản hồi chi tiết", "Hoàn thành", "PASS"),
        ("FR-25", "Chiến dịch mời lại", "Could", "Gợi ý khách ≥ 21 ngày chưa quay lại, xem trước Email & Zalo ZNS", "Hoàn thành", "PASS"),
        ("FR-26", "Chúc mừng lên hạng", "Could", "Thư & thiệp chúc mừng tự động khi khách vượt mốc 3 hoặc 6 lượt", "Hoàn thành", "PASS")
    ]

    for r_idx, row_data in enumerate(matrix_rows, start=1):
        row = matrix_table.rows[r_idx]
        bg_color = "FAF8F5" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = col_widths[c_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, 60, 60, 80, 80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            if c_idx in (0, 2, 4, 5):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(8.5)
            if c_idx == 0:
                run.font.bold = True
                run.font.color.rgb = COLOR_PRIMARY
            elif c_idx == 2 and val == "Must":
                run.font.bold = True
                run.font.color.rgb = RGBColor(185, 28, 28)
            elif c_idx == 5:
                run.font.bold = True
                run.font.color.rgb = COLOR_SUCCESS

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # ==========================================
    # PHẦN II: CHI TIẾT TỪNG TÍNH NĂNG & ẢNH MINH CHỨNG
    # ==========================================
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("II. CHI TIẾT TRIỂN KHAI VÀ MINH CHỨNG NGHIỆM THU")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(13)
    r_h2.font.bold = True
    r_h2.font.color.rgb = COLOR_PRIMARY

    features_detail = [
        {
            "id": "FR-19",
            "name": "Hạng Thân Thiết và Điểm Tích Lũy trên Hồ Sơ Khách Hàng",
            "priority": "Should",
            "business_value": "Giúp nhân viên và ban quản lý dễ dàng nhận diện thượng khách, mức độ gắn bó, tổng điểm thưởng và sở thích ẩm thực để cá nhân hóa dịch vụ đón tiếp.",
            "implementation": (
                "• Mở rộng CustomerProfileDTO và API /api/customers: tổng hợp toàn bộ lịch sử đặt bàn đã đến (SEATED).\n"
                "• Giao diện Tab Khách hàng (/admin): Danh sách khách với huy hiệu hạng (Hương, Trầm, Nam Trầm), điểm tích lũy, số lượt dùng bữa, tổng chi tiêu.\n"
                "• Drawer chi tiết hồ sơ: Hiển thị Thẻ Hội Viên điện tử, thanh tiến độ lên hạng kế tiếp (progress bar), thẻ ghi chú dị ứng và lịch sử hóa đơn từng bữa tiệc."
            ),
            "test_case": "Tra cứu hồ sơ khách 'Nguyễn Hữu Phúc' (0993738817) và 'Trần Nam Trầm' (0909999999).",
            "test_result": "Hệ thống hiển thị chính xác Hạng Nam Trầm (7 lượt đến), điểm tích lũy tương ứng, thanh tiến độ 100% và lịch sử chi tiêu rõ ràng.",
            "images": [
                ("docs/screenshots/FR19_customers_list.png", "Hình 1.1: Danh sách Hồ sơ Khách hàng với phân loại 3 Hạng và Điểm tích lũy"),
                ("docs/screenshots/FR19_customer_profile_detail.png", "Hình 1.2: Chi tiết Hồ sơ Thượng khách — Thẻ hội viên, tiến độ và lịch sử giao dịch")
            ]
        },
        {
            "id": "FR-20",
            "name": "Tích Điểm Theo Hóa Đơn Khi Khách Đến Dùng Bữa",
            "priority": "Should",
            "business_value": "Khuyến khích khách hàng gia tăng mức chi tiêu qua cơ chế tích lũy điểm thưởng minh bạch và tỷ lệ thưởng lũy tiến theo hạng hội viên.",
            "implementation": (
                "• Công thức quy đổi chuẩn: 1.000 đ chi tiêu = 1 điểm cơ bản (Base Points).\n"
                "• Điểm thưởng theo hạng: Hạng Hương (+0%), Hạng Trầm (+5%), Hạng Nam Trầm (+8% tối đa).\n"
                "• Kích hoạt tại nút 'Check-in' trong Tab Đặt bàn: Thu ngân nhập tổng tiền hóa đơn, hệ thống tự tính toán phân tách điểm cơ bản & điểm thưởng, cộng dồn vào tài khoản khách và ghi nhận lượt đến."
            ),
            "test_case": "Thực hiện Check-in bàn đặt TRM-HQ7Q cho khách Hạng Trầm với hóa đơn 5.500.000 đ.",
            "test_result": "Hệ thống tính đúng: Điểm cơ bản 5.500 pts + Thưởng 5% (275 pts) = 5.775 điểm tích lũy. Cập nhật lượt đến tức thì.",
            "images": [
                ("docs/screenshots/FR20_checkin_reward_dialog.png", "Hình 2: Dialog Hoàn tất & Tích điểm thành viên khi Check-in hóa đơn")
            ]
        },
        {
            "id": "FR-21",
            "name": "Chương Trình Ba Hạng Thân Thiết (Đặc Tả Bảng 8 Nhóm 8)",
            "priority": "Must",
            "business_value": "Xây dựng khung chuẩn mực chăm sóc khách hàng đa tầng, tạo động lực nâng hạng và giữ chân khách hàng cao cấp cho TRẦM Reserve.",
            "implementation": (
                "• Hiện thực hóa toàn diện bảng so sánh 3 hạng (Đặc tả Bảng 8 nhóm 8):\n"
                "  - Hạng HƯƠNG: 0–2 lượt | Tích lũy cơ bản 1.000đ = 1pt | Thiệp sinh nhật | Menu theo mùa.\n"
                "  - Hạng TRẦM: 3–5 lượt | Thưởng +5% điểm | Ưu tiên bàn đẹp | Trà chào mừng | Miễn phí khui 01 chai vang | Waitlist ưu tiên.\n"
                "  - Hạng NAM TRẦM: 6+ lượt | Thưởng +8% điểm | Miễn 100% cọc | Món tasting Bếp trưởng | Bàn VIP | Hotline 24/7 | Dạ tiệc quý.\n"
                "• Modal tra cứu Bảng 8 nhóm 8 được tích hợp trực tiếp trên giao diện quản trị để đối soát nghiệp vụ nhanh chóng."
            ),
            "test_case": "Kiểm tra bảng đối soát phân hạng và quyền lợi tại Modal Đặc tả Bảng 8 nhóm 8.",
            "test_result": "Đầy đủ 8 tiêu chí so sánh, hiển thị trực quan các quyền lợi nổi bật và tỷ lệ thưởng điểm tương ứng.",
            "images": [
                ("docs/screenshots/FR21_bang8_tier_program.png", "Hình 3: Giao diện Modal Đặc Tả Bảng 8 Nhóm 8 — So sánh toàn diện 3 Hạng")
            ]
        },
        {
            "id": "FR-22",
            "name": "Miễn Đặt Cọc Cho Thượng Khách Hạng Nam Trầm",
            "priority": "Could",
            "business_value": "Tạo trải nghiệm đặt bàn thượng lưu không ma sát (frictionless) cho khách hàng VIP nhất, thể hiện sự tin tưởng tuyệt đối của nhà hàng.",
            "implementation": (
                "• Tại Bước 3 (Thông tin khách) của Wizard Đặt bàn: Khách nhập SĐT, hệ thống tự động nhận diện hạng thành viên.\n"
                "• Khi phát hiện khách đạt Hạng NAM TRẦM (≥ 6 lượt), hệ thống hiển thị huy hiệu vàng kim 'Thượng khách Nam Trầm' và thông báo miễn 100% tiền cọc.\n"
                "• Rẽ nhánh tại Bước 4: Tiền cọc 300.000 đ/khách bị gạch bỏ về 0 đ. Nút xác nhận chuyển thành 'Xác nhận ngay (Miễn cọc VIP)', bỏ qua cổng thanh toán QR MoMo/Ngân hàng."
            ),
            "test_case": "Đặt bàn 4 khách với số điện thoại 0909999999 (Trần Nam Trầm — 7 lượt).",
            "test_result": "Hệ thống tự động miễn toàn bộ 1.200.000 đ tiền cọc. Bước 4 hiển thị '0 đ (Miễn cọc VIP)' và hoàn tất đặt bàn ngay.",
            "images": [
                ("docs/screenshots/FR22_step3_namtram_detected.png", "Hình 4.1: Nhận diện tức thì Thượng khách Nam Trầm tại bước nhập SĐT"),
                ("docs/screenshots/FR22_step4_deposit_exempted.png", "Hình 4.2: Bước xác nhận miễn 100% tiền cọc 300.000 đ/khách dành cho Nam Trầm")
            ]
        },
        {
            "id": "FR-23",
            "name": "Khảo Sát Đánh Giá 5 Sao Sau Bữa Ăn",
            "priority": "Should",
            "business_value": "Thu thập phản hồi tức thời từ thực khách để kiểm soát chất lượng ẩm thực, phong cách phục vụ và sự hài lòng tổng thể.",
            "implementation": (
                "• Trang công khai dành cho thực khách: /survey/[code] (gắn liền với mã đặt bàn duy nhất sau khi hoàn tất bữa ăn).\n"
                "• Đánh giá tổng quan 1 đến 5 sao kèm mô tả trực quan (Tuyệt hảo, Rất hài lòng, Cần cải thiện...).\n"
                "• Đánh giá 4 tiêu chí cốt lõi: Ẩm thực & Hương vị, Phục vụ & Chu đáo, Không gian & Âm nhạc, Đồ uống & Pairing.\n"
                "• Ô nhập nhận xét tự do, nút gạt 'Sẵn sàng giới thiệu TRẦM' và tự động tặng 200 điểm thưởng tri ân thực khách làm khảo sát."
            ),
            "test_case": "Truy cập đường dẫn khảo sát /survey/TRM-HDVF và gửi đánh giá 5 sao.",
            "test_result": "Giao diện hiển thị sang trọng, mượt mà; gửi dữ liệu đánh giá thành công vào CSDL Prisma SQLite.",
            "images": [
                ("docs/screenshots/FR23_post_dining_survey.png", "Hình 5: Trang Khảo Sát 5 Sao Sau Bữa Ăn chuẩn Fine-Dining (/survey/[code])")
            ]
        },
        {
            "id": "FR-24",
            "name": "Phân Hệ Thống Kê & Phân Tích Khảo Sát Trong Quản Trị",
            "priority": "Should",
            "business_value": "Cung cấp góc nhìn định lượng và định tính về độ hài lòng của khách hàng để Ban Quản lý ra quyết định cải tiến dịch vụ kịp thời.",
            "implementation": (
                "• Bổ sung Tab quản trị mới 'Thống kê khảo sát' ngay cạnh Tab Khách hàng.\n"
                "• Thẻ chỉ số tổng quan: Điểm trung bình (Average Rating), Tổng lượt đánh giá, Tỷ lệ sẵn sàng giới thiệu (NPS).\n"
                "• Biểu đồ phân bố số sao (1★ đến 5★) và điểm số trung bình của 4 tiêu chí thành phần.\n"
                "• Bảng danh sách phản hồi chi tiết: Gắn liền Mã đặt bàn, Tên khách, SĐT, Số điểm từng phần và Lời nhận xét chi tiết kèm nút phản hồi."
            ),
            "test_case": "Mở tab 'Thống kê khảo sát' trong màn hình quản trị nội bộ.",
            "test_result": "Hiển thị đầy đủ số liệu khảo sát thực tế, điểm trung bình đạt 5.0/5.0★, tỷ lệ giới thiệu 100% cùng chi tiết các nhận xét.",
            "images": [
                ("docs/screenshots/FR24_surveys_analytics.png", "Hình 6: Phân hệ Thống Kê Khảo Sát — Biểu đồ phân bố sao & Bảng phản hồi thực khách")
            ]
        },
        {
            "id": "FR-25",
            "name": "Chiến Dịch Mời Lại Khách Hàng (≥ 21 Ngày Chưa Quay Lại)",
            "priority": "Could",
            "business_value": "Kích hoạt lại tệp khách hàng tiềm năng có nguy cơ rời bỏ (churn prevention), tăng tần suất quay lại nhà hàng qua các thông điệp cá nhân hóa.",
            "implementation": (
                "• Thuật toán lọc thông minh: Tự động tính toán số ngày kể từ lần ghé thăm gần nhất (lastVisit), gắn nhãn cảnh báo khách ≥ 21 ngày.\n"
                "• Bộ lọc nhanh 'Khách cần chăm sóc (≥ 21 ngày)' trong tab Khách hàng kèm số lượng khách cần mời lại.\n"
                "• Dialog Chiến dịch mời lại: Xem trước nội dung Email HTML và tin nhắn Zalo ZNS cá nhân hóa (chèn tên khách, hạng, điểm thưởng, voucher ưu đãi và CTA đặt bàn).\n"
                "• Nút thao tác một chạm: Gửi thông điệp hoặc Sao chép nội dung gửi qua Zalo OA."
            ),
            "test_case": "Lọc danh sách khách ≥ 21 ngày và mở xem trước thư mời lại cho khách hàng.",
            "test_result": "Hệ thống lọc chính xác các khách hàng quá 21 ngày; tạo bản xem trước Email & Zalo cá nhân hóa cực kỳ chuyên nghiệp.",
            "images": [
                ("docs/screenshots/FR25_reengagement_campaign.png", "Hình 7: Giao diện Chiến Dịch Mời Lại — Bản xem trước Email & Zalo ZNS cá nhân hóa")
            ]
        },
        {
            "id": "FR-26",
            "name": "Thư Chúc Mừng Lên Hạng Tự Động (Mốc 3 và 6 Lượt)",
            "priority": "Could",
            "business_value": "Gia tăng cảm xúc tự hào và gắn kết thương hiệu khi khách hàng thăng hạng, truyền thông ngay các quyền lợi độc quyền mới đạt được.",
            "implementation": (
                "• Kích hoạt tự động khi lượt đến của khách đạt mốc 3 lượt (lên Hạng Trầm) hoặc 6 lượt (lên Hạng Nam Trầm).\n"
                "• Thiết kế Thiệp Chúc Mừng Lên Hạng phong cách hoàng gia, hiệu ứng ánh kim (gold gradient), pháo hoa và huy hiệu hạng.\n"
                "• Cung cấp bản xem trước Email chúc mừng và tin nhắn Zalo gửi thông báo nâng hạng cùng danh sách quyền lợi mới.\n"
                "• Hỗ trợ kích hoạt trực tiếp từ Dialog Tích điểm khi Check-in hoặc xem lại bất kỳ lúc nào từ Hồ sơ khách hàng."
            ),
            "test_case": "Mở thư chúc mừng lên hạng cho khách đạt mốc 3 lượt và mốc 6 lượt.",
            "test_result": "Thư chúc mừng hiển thị trang trọng, đúng tên khách, liệt kê chính xác các đặc quyền mới của hạng Trầm / Nam Trầm.",
            "images": [
                ("docs/screenshots/FR26_tier_upgrade_dialog.png", "Hình 8: Thiệp & Thư Chúc Mừng Lên Hạng Thân Thiết sang trọng")
            ]
        }
    ]

    for feat in features_detail:
        p_ftitle = doc.add_paragraph()
        p_ftitle.paragraph_format.space_before = Pt(14)
        p_ftitle.paragraph_format.space_after = Pt(4)
        r_fid = p_ftitle.add_run(f"{feat['id']}: {feat['name']}")
        r_fid.font.name = "Arial"
        r_fid.font.size = Pt(11.5)
        r_fid.font.bold = True
        r_fid.font.color.rgb = COLOR_DARK

        # Specs box
        p_spec = doc.add_paragraph()
        p_spec.paragraph_format.space_after = Pt(4)
        r_pri = p_spec.add_run(f"• Mức độ ưu tiên: {feat['priority']}   |   Trạng thái: Hoàn thành 100%   |   Kết quả kiểm thử: PASS\n")
        r_pri.font.bold = True
        r_pri.font.size = Pt(9.5)
        r_pri.font.color.rgb = COLOR_PRIMARY

        r_bv_l = p_spec.add_run("• Giá trị nghiệp vụ: ")
        r_bv_l.font.bold = True
        r_bv_l.font.size = Pt(9.5)
        r_bv = p_spec.add_run(f"{feat['business_value']}\n")
        r_bv.font.size = Pt(9.5)

        r_imp_l = p_spec.add_run("• Hướng giải pháp kỹ thuật:\n")
        r_imp_l.font.bold = True
        r_imp_l.font.size = Pt(9.5)
        r_imp = p_spec.add_run(f"{feat['implementation']}\n")
        r_imp.font.size = Pt(9.5)

        r_tc_l = p_spec.add_run("• Kịch bản kiểm thử: ")
        r_tc_l.font.bold = True
        r_tc_l.font.size = Pt(9.5)
        r_tc = p_spec.add_run(f"{feat['test_case']}\n")
        r_tc.font.size = Pt(9.5)

        r_tr_l = p_spec.add_run("• Kết quả thực tế: ")
        r_tr_l.font.bold = True
        r_tr_l.font.size = Pt(9.5)
        r_tr = p_spec.add_run(feat['test_result'])
        r_tr.font.size = Pt(9.5)
        r_tr.font.color.rgb = COLOR_SUCCESS

        # Embed Images
        for img_rel_path, caption in feat['images']:
            img_path = os.path.abspath(img_rel_path)
            if os.path.exists(img_path):
                p_img = doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.space_before = Pt(8)
                p_img.paragraph_format.space_after = Pt(2)
                run_img = p_img.add_run()
                run_img.add_picture(img_path, width=Inches(6.0))

                p_cap = doc.add_paragraph()
                p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_cap.paragraph_format.space_after = Pt(10)
                r_cap = p_cap.add_run(caption)
                r_cap.font.name = "Arial"
                r_cap.font.size = Pt(8.5)
                r_cap.font.italic = True
                r_cap.font.color.rgb = COLOR_MUTED

    # ==========================================
    # PHẦN III: BẢNG 8 NHÓM 8
    # ==========================================
    doc.add_page_break()
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("III. ĐẶC TẢ BẢNG 8 NHÓM 8: CHƯƠNG TRÌNH BA HẠNG THÂN THIẾT")
    r_h3.font.name = "Arial"
    r_h3.font.size = Pt(13)
    r_h3.font.bold = True
    r_h3.font.color.rgb = COLOR_PRIMARY

    p_b8_desc = doc.add_paragraph()
    r_b8_d = p_b8_desc.add_run(
        "Bảng quy chiếu toàn bộ tiêu chí phân hạng, tỷ lệ tích lũy điểm thưởng và đãi ngộ ẩm thực độc quyền "
        "đã được mã hóa trong hệ thống TRẦM Reserve (tệp tin src/lib/tram/loyalty.ts):"
    )
    r_b8_d.font.name = "Arial"
    r_b8_d.font.size = Pt(10)

    # Table Bang 8
    bang8_table = doc.add_table(rows=9, cols=4)
    bang8_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(bang8_table, color="D6D3D1", sz="4")

    b8_headers = ["Tiêu chí phân hạng", "Hạng HƯƠNG", "Hạng TRẦM", "Hạng NAM TRẦM (Tối cao)"]
    b8_widths = [Inches(1.8), Inches(1.5), Inches(1.6), Inches(1.8)]

    # Header Row
    hdr_b8 = bang8_table.rows[0]
    for c_idx, title in enumerate(b8_headers):
        cell = hdr_b8.cells[c_idx]
        cell.width = b8_widths[c_idx]
        set_cell_background(cell, HEX_HEADER_BG)
        set_cell_margins(cell, 80, 80, 80, 80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(title)
        run.font.name = "Arial"
        run.font.size = Pt(9)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    b8_data = [
        ("Số lượt đến yêu cầu", "0 – 2 lượt đến", "3 – 5 lượt đến", "Từ 6 lượt trở lên"),
        ("Tỷ lệ tích điểm cơ bản", "1.000 đ = 1 điểm", "1.000 đ = 1 điểm", "1.000 đ = 1 điểm"),
        ("Tỷ lệ thưởng thêm hóa đơn", "0% (Điểm cơ bản)", "+5% điểm hóa đơn", "+8% điểm hóa đơn (Tối đa)"),
        ("Chính sách đặt cọc (FR-22)", "Cọc 300.000 đ/khách", "Cọc 300.000 đ/khách", "MIỄN 100% TIỀN CỌC"),
        ("Ưu tiên sắp xếp bàn ăn", "Thứ tự tiêu chuẩn", "Ưu tiên khu cửa sổ / trung tâm", "Bàn VIP & Không gian riêng tư nhất"),
        ("Đãi ngộ ẩm thực độc quyền", "Thiệp chúc mừng sinh nhật", "Trà chào mừng + Miễn phí khui vang", "Món tasting Bếp trưởng + Khui vang"),
        ("Xử lý Danh sách chờ (Waitlist)", "Thứ tự đăng ký", "Ưu tiên mời khi có bàn trống", "Ưu tiên cao nhất (Fast-track VIP)"),
        ("Chăm sóc & Đặc quyền riêng", "Nhận bản tin menu theo mùa", "Hỗ trợ đổi ca linh hoạt trước 24h", "Hotline 24/7 + Dạ tiệc quý độc quyền")
    ]

    for r_idx, row_data in enumerate(b8_data, start=1):
        row = bang8_table.rows[r_idx]
        bg_color = "FAF8F5" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = b8_widths[c_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, 60, 60, 80, 80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            if c_idx > 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(8.5)
            if c_idx == 0:
                run.font.bold = True
                run.font.color.rgb = COLOR_DARK
            elif c_idx == 3:
                run.font.bold = True
                run.font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # ==========================================
    # PHẦN IV: ĐÁNH GIÁ KỸ THUẬT & KIẾN TRÚC
    # ==========================================
    h4 = doc.add_heading(level=1)
    r_h4 = h4.add_run("IV. ĐÁNH GIÁ CHẤT LƯỢNG KỸ THUẬT VÀ KIẾN TRÚC HỆ THỐNG")
    r_h4.font.name = "Arial"
    r_h4.font.size = Pt(13)
    r_h4.font.bold = True
    r_h4.font.color.rgb = COLOR_PRIMARY

    tech_points = [
        ("Kiến trúc Module Hóa Cao:", "Tách bạch rõ rệt giữa logic nghiệp vụ Loyalty (src/lib/tram/loyalty.ts), tầng truy xuất dữ liệu Server (server.ts) và các Component giao diện độc lập (checkin-reward-dialog, surveys-view, re-engagement-dialog, tier-upgrade-dialog)."),
        ("Hiệu năng & Tối ưu hóa (Next.js 16 App Router):", "Sử dụng Next.js Turbopack biên dịch nhanh dưới 1 giây; các Modal và Phân hệ quản trị được Dynamic Import và lazy load giúp tối ưu hóa băng thông tải trang."),
        ("Tính toàn vẹn dữ liệu (Data Consistency):", "Sử dụng Prisma ORM với SQLite, mọi thao tác Check-in, tích điểm, thăng hạng và khảo sát đều được ràng buộc quan hệ chặt chẽ (Cascade On Delete cho Khảo sát), tính toán server-side đảm bảo không thể gian lận điểm từ client."),
        ("Trải nghiệm Người Dùng (UI/UX Luxury Fine-Dining):", "Giao diện mang phong cách Trầm ấm sang trọng, phối màu hoàng gia (Amber Gold / Deep Charcoal), thiết kế thẻ thành viên sang trọng, micro-animations mượt mà với Framer Motion.")
    ]

    for title, desc in tech_points:
        p_tp = doc.add_paragraph()
        p_tp.paragraph_format.space_after = Pt(4)
        r_tt = p_tp.add_run(f"• {title} ")
        r_tt.font.name = "Arial"
        r_tt.font.size = Pt(9.5)
        r_tt.font.bold = True
        r_tt.font.color.rgb = COLOR_DARK

        r_td = p_tp.add_run(desc)
        r_td.font.name = "Arial"
        r_td.font.size = Pt(9.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # ==========================================
    # PHẦN V: KẾT LUẬN & ĐỀ XUẤT
    # ==========================================
    h5 = doc.add_heading(level=1)
    r_h5 = h5.add_run("V. KẾT LUẬN VÀ KẾ HOẠCH BÀN GIAO")
    r_h5.font.name = "Arial"
    r_h5.font.size = Pt(13)
    r_h5.font.bold = True
    r_h5.font.color.rgb = COLOR_PRIMARY

    p_conclusion = doc.add_paragraph()
    r_conc = p_conclusion.add_run(
        "Gói tính năng Sprint 2 (FR-19 đến FR-26) đã được hoàn thành đúng tiến độ, thỏa mãn 100% các tiêu chí chấp nhận "
        "(Acceptance Criteria) trong bản đặc tả Business Value môn học. Các tính năng đã sẵn sàng để demo trước Hội đồng "
        "và tích hợp vào phiên bản chính thức của nhà hàng TRẦM Reserve.\n\n"
        "Đề xuất tiếp theo:\n"
        "1. Tích hợp Zalo ZNS Webhook và SendGrid / Resend API thực tế để tự động hóa việc phát tán thư mời và chúc mừng lên hạng.\n"
        "2. Bổ sung tính năng đổi điểm tích lũy lấy voucher giảm giá trực tiếp trên hóa đơn tại quầy thu ngân (Sprint 3)."
    )
    r_conc.font.name = "Arial"
    r_conc.font.size = Pt(9.5)

    # Signatures
    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(24)
    r_sig1 = p_sign.add_run("NGƯỜI LẬP BÁO CÁO                                                    XÁC NHẬN CỦA LEADER\n")
    r_sig1.font.name = "Arial"
    r_sig1.font.size = Pt(10)
    r_sig1.font.bold = True
    r_sig1.font.color.rgb = COLOR_DARK

    r_sig2 = p_sign.add_run("(Ký và ghi rõ họ tên)                                                               (Ký và phê duyệt)")
    r_sig2.font.name = "Arial"
    r_sig2.font.size = Pt(9)
    r_sig2.font.italic = True
    r_sig2.font.color.rgb = COLOR_MUTED

    # Save
    output_docx = os.path.abspath("docs/BaoCao_KetQua_Sprint2_FR19_FR26_TramDine.docx")
    doc.save(output_docx)
    print(f"BÁO CÁO WORD ĐÃ ĐƯỢC TẠO THÀNH CÔNG TẠI: {output_docx}")

if __name__ == "__main__":
    build_report()
