# -*- coding: utf-8 -*-
"""
Script sinh tài liệu Word (.docx) toàn diện, chuyên sâu và kèm ảnh chụp màn hình minh họa:
TÀI LIỆU THIẾT KẾ LUỒNG VẬN HÀNH & ĐẶC TẢ GIAO DIỆN TOÀN BỘ HỆ THỐNG TRẦM RESERVE
Đầy đủ cho 2 ROLES: Khách hàng (Đặt bàn & Hậu mãi) và Ban Quản lý / Bếp trưởng (Vận hành & Tài chính)
Chuẩn hóa: 10 bàn (30 chỗ ngồi/ca), Lịch T4-CN (nghỉ T2 & T3), Menu 1.440.000đ, Food Cost 34,70%.
"""

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

# ==========================================
# CÁC HÀM TIỆN ÍCH ĐỊNH DẠNG XML WORD
# ==========================================

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D6D3D1", sz="4", val="single"):
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

def add_callout(doc, text, title="LƯU Ý NGHIỆP VỤ / QUY CHUẨN:", border_color="B45309", bg_color="FDF8F0"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.8)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=140)
    
    tcPr = cell._element.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
        f'<w:top w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    
    if title:
        r_title = p.add_run(f"{title}\n")
        r_title.font.name = "Arial"
        r_title.font.size = Pt(9.5)
        r_title.font.bold = True
        r_title.font.color.rgb = RGBColor(146, 64, 14)
        
    r_text = p.add_run(text)
    r_text.font.name = "Arial"
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = RGBColor(68, 64, 60)
    
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_after = Pt(4)

def add_image_with_caption(doc, img_paths, caption_text, width_inch=6.0):
    """
    Thử tìm ảnh trong danh sách các đường dẫn ứng viên img_paths.
    Nếu tìm thấy thì chèn ảnh và chú thích đẹp vào tài liệu.
    """
    found_path = None
    for p in img_paths:
        if os.path.exists(p) and os.path.getsize(p) > 0:
            found_path = p
            break
            
    if not found_path:
        # Nếu không có ảnh, thêm ghi chú mờ
        p_note = doc.add_paragraph()
        p_note.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_n = p_note.add_run(f"[Hình minh họa: {caption_text} - Đang cập nhật snapshot]")
        r_n.font.name = "Arial"
        r_n.font.size = Pt(8.5)
        r_n.font.italic = True
        r_n.font.color.rgb = RGBColor(156, 163, 175)
        return

    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(6)
    p_img.paragraph_format.space_after = Pt(3)
    run_img = p_img.add_run()
    run_img.add_picture(found_path, width=Inches(width_inch))

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(0)
    p_cap.paragraph_format.space_after = Pt(10)
    r_cap = p_cap.add_run(f"Ảnh minh họa: {caption_text}")
    r_cap.font.name = "Arial"
    r_cap.font.size = Pt(8.5)
    r_cap.font.italic = True
    r_cap.font.color.rgb = RGBColor(120, 113, 108)

# ==========================================
# KHỞI TẠO TÀI LIỆU CHÍNH
# ==========================================

def generate_document():
    doc = Document()
    
    # Thiết lập lề trang
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    # Thư mục chứa ảnh
    SCR_DIR = os.path.join(os.getcwd(), "docs", "screenshots")
    BRAIN_DIR = r"C:\Users\Admin\.gemini\antigravity\brain\c53c81fd-253b-4131-bc9c-c4cd59f8b6e6"

    # Bảng màu thương hiệu
    COLOR_PRIMARY = RGBColor(180, 83, 9)     # #b45309 Amber-700
    COLOR_SECONDARY = RGBColor(120, 53, 15)  # #78350f Amber-900
    COLOR_DARK = RGBColor(41, 37, 36)        # #292524 Stone-800
    COLOR_MUTED = RGBColor(115, 115, 115)    # Stone-500
    COLOR_BLUE = RGBColor(3, 105, 161)       # Sky-700
    
    HEX_HEADER = "78350F"
    HEX_ZEBRA = "FBF7EE"
    HEX_WHITE = "FFFFFF"

    # ==========================================
    # TIÊU ĐỀ BÁO CÁO (HEADER BLOCK)
    # ==========================================
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(2)
    r_sub = p_sub.add_run("TRẦM RESERVE · HỆ THỐNG QUẢN TRỊ TRẢI NGHIỆM & VẬN HÀNH FINE DINING (TRAMDINE)")
    r_sub.font.name = "Arial"; r_sub.font.size = Pt(10); r_sub.font.bold = True; r_sub.font.color.rgb = COLOR_PRIMARY

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("TÀI LIỆU THIẾT KẾ LUỒNG VẬN HÀNH\n& ĐẶC TẢ GIAO DIỆN TOÀN BỘ HỆ THỐNG")
    r_title.font.name = "Arial"; r_title.font.size = Pt(22); r_title.font.bold = True; r_title.font.color.rgb = COLOR_DARK

    p_desc = doc.add_paragraph()
    p_desc.paragraph_format.space_after = Pt(12)
    r_desc = p_desc.add_run(
        "Tài liệu kỹ thuật và nghiệp vụ chi tiết mô tả kiến trúc hệ thống, quy chuẩn thông số kinh doanh cố định, "
        "đặc tả từng bước tương tác, bố cục wireframe và hình ảnh minh chứng thực tế trên giao diện phần mềm "
        "cho 2 phân hệ người dùng chính: Khách hàng (Trải nghiệm Đặt bàn) và Ban Quản lý / Bếp trưởng (Vận hành Ca & Tài chính)."
    )
    r_desc.font.name = "Arial"; r_desc.font.size = Pt(10); r_desc.font.italic = True; r_desc.font.color.rgb = COLOR_MUTED

    # Bảng Meta Info
    meta_tbl = doc.add_table(rows=5, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_tbl.autofit = False
    meta_tbl.columns[0].width = Inches(2.2)
    meta_tbl.columns[1].width = Inches(4.6)
    set_table_borders(meta_tbl, color="E5E7EB", sz="4")

    meta_data = [
        ("Tên dự án phần mềm", "TRẦM Reserve (TramDine) — Nền tảng Chuyển đổi số Nhà hàng Cao cấp"),
        ("Công nghệ cốt lõi", "Next.js 16 (App Router), React 19, Tailwind CSS 4, SQLite, Prisma ORM (Local-first)"),
        ("Quy mô mặt bằng phục vụ", "10 bàn · 30 chỗ ngồi/ca (5 bàn 2 chỗ Dãy A + 5 bàn 4 chỗ Khu B) | 2 ca: 17:30 & 19:45"),
        ("Khung giá & Chỉ số tài chính", "Menu Tasting: 1.440.000 đ | Cọc: 300.000 đ | Food Cost chuẩn: 34,70% (499.680 đ)"),
        ("Chuẩn hóa kỹ thuật", "Tháng 11 / 2026 — Đã tích hợp đầy đủ 39 FR và chụp ảnh minh chứng thực tế"),
    ]
    for row_idx, (k, v) in enumerate(meta_data):
        row = meta_tbl.rows[row_idx]
        set_cell_margins(row.cells[0], top=50, bottom=50, left=90, right=90)
        set_cell_margins(row.cells[1], top=50, bottom=50, left=90, right=90)
        set_cell_background(row.cells[0], "F9FAFB")
        set_cell_background(row.cells[1], "FFFFFF")
        
        pk = row.cells[0].paragraphs[0]
        rk = pk.add_run(k)
        rk.font.name = "Arial"; rk.font.size = Pt(8.5); rk.font.bold = True; rk.font.color.rgb = COLOR_DARK
        
        pv = row.cells[1].paragraphs[0]
        rv = pv.add_run(v)
        rv.font.name = "Arial"; rv.font.size = Pt(8.5); rv.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ==========================================
    # PHẦN 1: TỔNG QUAN HỆ THỐNG & QUY CHUẨN
    # ==========================================
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(14); h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("1. TỔNG QUAN KIẾN TRÚC & QUY CHUẨN KINH DOANH CỐ ĐỊNH")
    r1.font.name = "Arial"; r1.font.size = Pt(14); r1.font.bold = True; r1.font.color.rgb = COLOR_PRIMARY

    p_arch = doc.add_paragraph()
    p_arch.paragraph_format.line_spacing = 1.15; p_arch.paragraph_format.space_after = Pt(8)
    p_arch.add_run(
        "Hệ thống TRẦM Reserve được thiết kế theo kiến trúc Single Page Application (SPA) hiện đại kết hợp "
        "Server-side API Routes trên nền Next.js 16. Toàn bộ cơ chế lưu trữ dữ liệu, mô phỏng cổng thanh toán cọc VietQR/Thẻ, "
        "và hệ thống thông báo đa kênh (Zalo ZNS / SMS / Email) đều vận hành độc lập theo mô hình Local-first, "
        "đảm bảo tính ổn định tuyệt đối, không phụ thuộc vào kết nối mạng bên thứ ba.\n"
        "Mọi thông số kinh doanh của nhà hàng đều được quy chuẩn nghiêm ngặt và đồng bộ trong toàn bộ cơ sở mã nguồn:"
    )

    const_tbl = doc.add_table(rows=11, cols=3)
    const_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    const_tbl.autofit = False
    const_tbl.columns[0].width = Inches(2.1)
    const_tbl.columns[1].width = Inches(2.1)
    const_tbl.columns[2].width = Inches(2.6)
    set_table_borders(const_tbl, color="E5E7EB", sz="4")

    headers_c = ["Hạng mục nghiệp vụ", "Giá trị chuẩn hóa", "Giải thích kỹ thuật & Tệp áp dụng"]
    for i, h in enumerate(headers_c):
        cell = const_tbl.rows[0].cells[i]
        set_cell_background(cell, HEX_HEADER)
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.name = "Arial"; r.font.size = Pt(9); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)

    const_rows = [
        ("Quy mô số bàn", "10 bàn (30 chỗ ngồi/ca)", "5 bàn 2 chỗ (A01–A05) + 5 bàn 4 chỗ (B01–B05). Không có bàn trên 4 chỗ"),
        ("Sức chứa tối đa ca", "30 khách / ca", "2 ca tối độc lập: ca 1 (17:30) và ca 2 (19:45). Phục vụ tối đa 60 khách/ngày"),
        ("Lịch mở cửa định kỳ", "Thứ Tư → Chủ Nhật", "Nghỉ định kỳ Thứ Hai & Thứ Ba để đội bếp tuyển chọn và chuẩn bị nguyên liệu"),
        ("Giá Tasting Menu", "1.440.000 đ/khách", "Bộ thực đơn 7 món 'Tiến Vua · Bảy Báu Vật Việt' tuyển chọn từ các vùng miền"),
        ("Gói Wine Pairing", "+650.000 đ/khách", "Tuyển chọn 4 dòng vang quốc tế phối vị hài hòa cùng từng món ăn"),
        ("Gói Tea Pairing", "+350.000 đ/khách", "Tuyển tập 4 danh trà cổ thụ Tây Bắc và trà thảo mộc thanh tao"),
        ("Chính sách Đặt cọc", "300.000 đ/khách", "Bắt buộc cọc để giữ chỗ; hoàn 100% nếu hủy bàn trước giờ tiệc 48 tiếng"),
        ("Đặc quyền VIP Nam Trầm", "Miễn cọc 100%", "Tự động nhận diện khách quen ≥ 6 lần dùng bữa, miễn toàn bộ tiền cọc bàn"),
        ("Giá vốn nguyên liệu BOM", "499.680 đ/khách", "Định mức chi tiết 7 món trên 25 nguyên vật liệu cao cấp chuẩn fine dining"),
        ("Tỷ lệ Food Cost chuẩn", "34,70%", "Nằm trọn vẹn trong khung duyệt P&L an toàn (≤ 35%), tuyệt đối dưới trần 50%"),
    ]
    for r_idx, (c1, c2, c3) in enumerate(const_rows, start=1):
        row = const_tbl.rows[r_idx]
        bg = HEX_ZEBRA if r_idx % 2 == 1 else HEX_WHITE
        for col_idx, text in enumerate([c1, c2, c3]):
            cell = row.cells[col_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=50, bottom=50, left=90, right=90)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.name = "Arial"; r.font.size = Pt(8.5)
            if col_idx == 0:
                r.font.bold = True; r.font.color.rgb = COLOR_DARK
            elif col_idx == 1:
                r.font.bold = True; r.font.color.rgb = COLOR_PRIMARY
            else:
                r.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ==========================================
    # PHẦN 2: ĐẶC TẢ CHI TIẾT PHÂN HỆ KHÁCH HÀNG (ROLE 1)
    # ==========================================
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14); h2.paragraph_format.space_after = Pt(6)
    r2 = h2.add_run("2. ĐẶC TẢ LUỒNG VẬN HÀNH & GIAO DIỆN PHÂN HỆ KHÁCH HÀNG (ROLE 1)")
    r2.font.name = "Arial"; r2.font.size = Pt(14); r2.font.bold = True; r2.font.color.rgb = COLOR_PRIMARY

    # 2.1 TRANG CHỦ & STORYTELLING
    p_s1 = doc.add_paragraph()
    r_s1 = p_s1.add_run("2.1. Màn Hình 1 & 2: Trang Chủ, Khám Phá Thương Hiệu & Bộ Thực Đơn Tasting 7 Món")
    r_s1.font.name = "Arial"; r_s1.font.size = Pt(11.5); r_s1.font.bold = True; r_s1.font.color.rgb = COLOR_SECONDARY

    p_s1_desc = doc.add_paragraph()
    p_s1_desc.paragraph_format.line_spacing = 1.15
    p_s1_desc.add_run(
        "• Mục đích nghiệp vụ: Giới thiệu câu chuyện ẩm thực Trầm Hương, xác lập vị thế Fine Dining cao cấp và kích thích thực khách đặt bàn.\n"
        "• Bố cục giao diện (UI Specs):\n"
        "  - Header: Logo TRẦM Reserve chạm nổi mạ đồng; nút điều hướng chuyển nhanh màn hình đặt bàn và cổng quản trị.\n"
        "  - Hero Banner: Typography trang trọng, kèm huy hiệu nhận diện chuẩn hóa: [30 chỗ ngồi · 10 bàn] — [7 món tasting] — [2 khung mỗi tối].\n"
        "  - Section Câu chuyện: Triết lý hương trầm sum vầy; cam kết phục vụ tối đa 30 thực khách mỗi ca để đảm bảo tính riêng tư.\n"
        "  - Section Thực đơn: Trình chiếu 7 món 'Tiến Vua · Bảy Báu Vật Việt' với hình ảnh sắc nét, mô tả nguồn gốc đặc sản (Cá bớp Cần Thơ, Bò thăn Quảng Nam, Yến sào Khánh Hòa, Hạt sen Huế...).\n"
        "  - Bảng giá niêm yết: Set Menu 1.440.000 đ/khách; Gói Wine Pairing +650.000 đ; Gói Tea Pairing +350.000 đ.\n"
        "• Tương tác người dùng: Thực khách cuộn xem câu chuyện, bấm nút 'Đặt bàn ngay' để mở trực tiếp Booking Wizard."
    )

    add_image_with_caption(
        doc,
        [os.path.join(BRAIN_DIR, "01_home_hero.png"), os.path.join(SCR_DIR, "01_home_hero.png")],
        "Giao diện Trang chủ TRẦM Reserve với Hero Banner hiển thị chuẩn xác huy hiệu 30 chỗ ngồi · 10 bàn",
        width_inch=6.2
    )

    add_image_with_caption(
        doc,
        [os.path.join(BRAIN_DIR, "02_home_schedule.png"), os.path.join(SCR_DIR, "02_home_schedule.png")],
        "Khối hiển thị Lịch hoạt động tuần: Mở cửa Thứ Tư đến Chủ Nhật, nghỉ định kỳ Thứ Hai và Thứ Ba",
        width_inch=5.8
    )

    # 2.2 BƯỚC 1: NGÀY, GIỜ, SỐ KHÁCH
    p_s2 = doc.add_paragraph()
    p_s2.paragraph_format.space_before = Pt(8)
    r_s2 = p_s2.add_run("2.2. Màn Hình 3: Bước 1 Booking Wizard — Chọn Ngày, Khung Giờ & Số Khách")
    r_s2.font.name = "Arial"; r_s2.font.size = Pt(11.5); r_s2.font.bold = True; r_s2.font.color.rgb = COLOR_SECONDARY

    p_s2_desc = doc.add_paragraph()
    p_s2_desc.paragraph_format.line_spacing = 1.15
    p_s2_desc.add_run(
        "• Mục đích nghiệp vụ: Xác định thời gian đến tiệc và quy mô đoàn khách để kiểm tra tính khả dụng của mặt bằng.\n"
        "• Thành phần giao diện:\n"
        "  - Lịch chọn ngày: Hỗ trợ đặt trước trong vòng 28 ngày. Tự động làm mờ và khóa các ngày Thứ Hai và Thứ Ba với nhãn cảnh báo 'Nghỉ định kỳ'.\n"
        "  - Nút chọn khung giờ: 2 nút bấm nổi bật cho ca 17:30 và 19:45. Hiển thị trạng thái chỗ trống thời gian thực: 'Còn X chỗ' (màu xanh/nâu rơm) hoặc 'Hết chỗ (Đăng ký chờ)' (màu đỏ rực).\n"
        "  - Bộ chọn số lượng khách: Nút tăng giảm (+ / -) cho phép chọn từ 2 đến 8 khách.\n"
        "• QUY TẮC NGHIỆP VỤ ĐOÀN ĐÔNG (> 4 KHÁCH):\n"
        "  - Do nhà hàng thiết kế bàn tối đa 4 chỗ, khi thực khách chọn số khách = 5, 6, 7 hoặc 8, hệ thống hiển thị dòng ghi chú:\n"
        "    'Đoàn trên 4 khách: nhà hàng sẽ xếp bàn ghép — vui lòng đăng ký danh sách chờ để được sắp xếp chu đáo.'\n"
        "  - Đồng thời, nút bấm chính dưới chân trang tự động chuyển nhãn từ 'Chọn bàn' thành 'Đăng ký danh sách chờ'. Khách nhấp vào sẽ được đưa thẳng sang luồng xếp bàn ghép riêng, tránh gây hoang mang."
    )

    add_image_with_caption(
        doc,
        [os.path.join(BRAIN_DIR, "03_booking_step1.png"), os.path.join(SCR_DIR, "03_booking_step1.png")],
        "Màn hình Bước 1 Booking Wizard: Lịch chọn ngày, 2 ca phục vụ hiển thị số chỗ còn lại và bộ chọn số khách",
        width_inch=6.0
    )

    # 2.3 BƯỚC 2: SƠ ĐỒ BÀN & TABLE HOLD
    p_s3 = doc.add_paragraph()
    p_s3.paragraph_format.space_before = Pt(8)
    r_s3 = p_s3.add_run("2.3. Màn Hình 4 & 5: Bước 2 Booking Wizard — Sơ Đồ Bàn 10 Bàn, Table Hold 10 Phút & Luồng Waitlist")
    r_s3.font.name = "Arial"; r_s3.font.size = Pt(11.5); r_s3.font.bold = True; r_s3.font.color.rgb = COLOR_SECONDARY

    p_s3_desc = doc.add_paragraph()
    p_s3_desc.paragraph_format.line_spacing = 1.15
    p_s3_desc.add_run(
        "• SƠ ĐỒ BÀN 10 BÀN TRỰC QUAN (BƯỚC 2A):\n"
        "  - Mặt bằng nhà hàng gồm 10 bàn chuẩn: Dãy A cạnh cửa kính ngắm phố (A01–A05: 2 chỗ/bàn) và Khu B trung tâm không gian ấm cúng (B01–B05: 4 chỗ/bàn).\n"
        "  - Mã màu trực quan: Vàng rơm (Bàn trống sẵn sàng đón khách), Gạch chéo đỏ xám (Bàn đã có người đặt), Viền nét đứt (Bàn quá nhỏ so với đoàn), Cam hổ phách sáng (Bàn đang chọn).\n"
        "  - Cơ chế Table Hold 10 phút: Khi khách bấm chọn bàn, API /api/reservations/hold được kích hoạt. Bàn được giữ độc quyền trong 600 giây; đếm ngược hiển thị trên thanh trạng thái. Khách khác truy cập cùng lúc sẽ thấy bàn báo 'Đang có người giữ chỗ', triệt tiêu hoàn toàn rủi ro xung đột (double-booking).\n\n"
        "• MÀN HÌNH DANH SÁCH CHỜ WAITLIST (BƯỚC 2B):\n"
        "  - Tự động kích hoạt khi ca kín chỗ (30/30 khách) hoặc khi khách đặt đoàn > 4 người.\n"
        "  - Tiêu đề thông minh: Tự động điều chỉnh theo quy mô đoàn: 'Đăng ký xếp bàn (Đoàn từ 5 khách)' hoặc 'Đăng ký danh sách chờ (Waitlist)'.\n"
        "  - Form tiếp nhận: Họ tên, Số điện thoại liên hệ (xác thực định dạng số Việt Nam), Số lượng khách.\n"
        "  - Kết quả: Thông báo số thứ tự trong hàng chờ và xác nhận nhà hàng sẽ chủ động gọi điện sắp xếp bàn nhả hoặc ghép bàn riêng."
    )

    # 2.4 BƯỚC 3: TÙY BIẾN THỰC ĐƠN
    p_s4 = doc.add_paragraph()
    p_s4.paragraph_format.space_before = Pt(8)
    r_s4 = p_s4.add_run("2.4. Màn Hình 6: Bước 3 Booking Wizard — Chi Tiết & Tùy Biến Thực Đơn 7 Món")
    r_s4.font.name = "Arial"; r_s4.font.size = Pt(11.5); r_s4.font.bold = True; r_s4.font.color.rgb = COLOR_SECONDARY

    p_s4_desc = doc.add_paragraph()
    p_s4_desc.paragraph_format.line_spacing = 1.15
    p_s4_desc.add_run(
        "• Mục đích nghiệp vụ: Cho phép thực khách khám phá sâu nghệ thuật chế biến của từng món và cá nhân hóa trải nghiệm ẩm thực.\n"
        "• Giao diện: Hiển thị 7 thẻ món ăn tương ứng từ Món 01 đến Món 07. Mỗi thẻ bao gồm tên món, xuất xứ nguyên vật liệu, phương pháp nấu tiêu chuẩn và nút lựa chọn tùy biến (om chậm / áp chảo da giòn / sốt tiêu rừng hoặc sốt thảo mộc).\n"
        "• Phản hồi hệ thống: Các tùy biến món ăn được lưu trực tiếp vào cấu trúc reservation.customDishes để phục vụ in thực đơn riêng tại bàn cho khách."
    )

    add_image_with_caption(
        doc,
        [os.path.join(BRAIN_DIR, "04_booking_step3.png"), os.path.join(SCR_DIR, "04_booking_step3.png")],
        "Màn hình Bước 3 Booking Wizard: Chi tiết thực đơn Tasting 7 món Tiến Vua và các tùy chọn cá nhân hóa món ăn",
        width_inch=6.0
    )

    # 2.5 BƯỚC 4: THÔNG TIN & NHẬN DIỆN VIP
    p_s5 = doc.add_paragraph()
    p_s5.paragraph_format.space_before = Pt(8)
    r_s5 = p_s5.add_run("2.5. Màn Hình 7: Bước 4 Booking Wizard — Thông Tin Khách Hàng, Gói Pairing & Nhận Diện Loyalty VIP")
    r_s5.font.name = "Arial"; r_s5.font.size = Pt(11.5); r_s5.font.bold = True; r_s5.font.color.rgb = COLOR_SECONDARY

    p_s5_desc = doc.add_paragraph()
    p_s5_desc.paragraph_format.line_spacing = 1.15
    p_s5_desc.add_run(
        "• Form nhập liệu: Họ tên, Số điện thoại di động, Email nhận thư xác nhận.\n"
        "• Lựa chọn đồ uống Pairing: Nút radio chọn 'Không pairing', 'Wine Pairing (+650.000 đ/khách)' hoặc 'Tea Pairing (+350.000 đ/khách)'.\n"
        "• Ghi nhận dị ứng & Dịp đặc biệt: Checkbox cảnh báo dị ứng (Hải sản, Đậu phộng, Gluten, Sữa...); ô chọn dịp kỷ niệm (Sinh nhật, Cầu hôn, Gặp gỡ đối tác).\n"
        "• CƠ CHẾ TỰ ĐỘNG NHẬN DIỆN LOYALTY (FR-22):\n"
        "  - Khi khách gõ xong 10 số điện thoại, hệ thống tự động gọi API /api/loyalty/profile để tra cứu lịch sử dùng bữa.\n"
        "  - Nếu khách đạt Hạng Nam Trầm (≥ 6 lần đến quán), một huy hiệu vàng rực hiện lên: 'Chào mừng Thượng khách Hạng Nam Trầm! Quý khách được kích hoạt đặc quyền MIỄN CỌC 100% tại bước thanh toán.'"
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR22_step3_namtram_detected.png"), os.path.join(SCR_DIR, "FR22_step4_namtram_detected.png")],
        "Hệ thống tự động phát hiện Thượng khách Hạng Nam Trầm qua Số điện thoại và gửi thông báo đặc quyền",
        width_inch=5.5
    )

    # 2.6 BƯỚC 5: VOUCHER, ĐẶC QUYỀN MIỄN CỌC & THANH TOÁN
    p_s6 = doc.add_paragraph()
    p_s6.paragraph_format.space_before = Pt(8)
    r_s6 = p_s6.add_run("2.6. Màn Hình 8 & 9: Bước 5 Booking Wizard — Áp Dụng Voucher Theo Gu, Miễn Cọc VIP & Cổng Thanh Toán")
    r_s6.font.name = "Arial"; r_s6.font.size = Pt(11.5); r_s6.font.bold = True; r_s6.font.color.rgb = COLOR_SECONDARY

    p_s6_desc = doc.add_paragraph()
    p_s6_desc.paragraph_format.line_spacing = 1.15
    p_s6_desc.add_run(
        "• ÁP DỤNG VOUCHER THÔNG MINH THEO GU ẨM THỰC (FR-37, FR-38):\n"
        "  - Ô nhập mã khuyến mãi hỗ trợ các chiến dịch: COMBO-TEA15 (Gu thanh nhã), COMBO-WINE15 (Gu sành vang), WELCOME10 (Khách mới). Khi áp mã hợp lệ, hệ thống hiển thị dòng chiết khấu màu xanh lá và tự động trừ trực tiếp vào tổng tiền cọc.\n"
        "• ĐẶC QUYỀN MIỄN CỌC VIP NAM TRẦM (FR-22):\n"
        "  - Với khách đạt hạng Nam Trầm, bảng tóm tắt hiển thị: 'Tiền đặt cọc: 0 đ (Được miễn cọc 100% cho Thượng khách)'.\n"
        "  - Nút bấm chính đổi thành 'Xác nhận đặt bàn (Miễn cọc VIP)', khách không cần thanh toán mà được chuyển thẳng sang Bước 6.\n"
        "• CỔNG THANH TOÁN GIẢ LẬP 2 BƯỚC:\n"
        "  - Khách thông thường: Chọn phương thức chuyển khoản QR VietQR (sinh mã QR thanh toán động kèm nội dung chuyển khoản) hoặc Thẻ Quốc tế (Visa/Mastercard). Modal mô phỏng hiển thị trạng thái xử lý giao dịch an toàn trong 1.5 giây."
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR37_auto_discount_step5.png")],
        "Màn hình Bước 5: Áp dụng Voucher thành công, hiển thị chiết khấu xanh lá và tự động cập nhật tiền cọc",
        width_inch=5.8
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR22_step4_deposit_exempted.png")],
        "Đặc quyền miễn cọc 100% được kích hoạt tự động cho Thượng khách Hạng Nam Trầm tại Bước 5",
        width_inch=5.8
    )

    # 2.7 BƯỚC 6 & KHẢO SÁT 5 SAO
    p_s7 = doc.add_paragraph()
    p_s7.paragraph_format.space_before = Pt(8)
    r_s7 = p_s7.add_run("2.7. Màn Hình 10 & 11: Bước 6 Hoàn Tất Đặt Bàn & Khảo Sát 5 Sao Độc Lập (/survey/[code])")
    r_s7.font.name = "Arial"; r_s7.font.size = Pt(11.5); r_s7.font.bold = True; r_s7.font.color.rgb = COLOR_SECONDARY

    p_s7_desc = doc.add_paragraph()
    p_s7_desc.paragraph_format.line_spacing = 1.15
    p_s7_desc.add_run(
        "• MÀN HÌNH HOÀN TẤT ĐẶT BÀN (COMPLETION VIEW):\n"
        "  - Cấp mã đặt bàn độc nhất (VD: TR-782401). Tóm tắt thời gian, số bàn, số khách, gói pairing và mã QR đặt chỗ.\n"
        "  - Hiển thị chính sách hoàn cọc: Nhà hàng hoàn 100% tiền cọc nếu thực khách hủy trước giờ dùng tiệc 48 tiếng qua hotline hoặc email.\n\n"
        "• TRANG KHẢO SÁT 5 SAO HẬU MÃI (/survey/[code]) (FR-23):\n"
        "  - Thực khách truy cập link khảo sát theo mã đặt bàn sau bữa ăn để chấm điểm 5 sao cho 4 trụ cột Fine Dining: (1) Món ăn, (2) Không gian, (3) Phục vụ, (4) Đồ uống Pairing.\n"
        "  - Khung nhận xét chân thực; sau khi gửi, hệ thống tự động cộng ngay 200 điểm thưởng thành viên vào tài khoản."
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR23_post_dining_survey.png")],
        "Trang khảo sát độc lập 5 sao sau bữa tiệc với 4 tiêu chí Fine Dining và tích điểm thưởng tự động",
        width_inch=5.5
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ==========================================
    # PHẦN 3: ĐẶC TẢ CHI TIẾT PHÂN HỆ QUẢN TRỊ (ROLE 2)
    # ==========================================
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(14); h3.paragraph_format.space_after = Pt(6)
    r3 = h3.add_run("3. ĐẶC TẢ LUỒNG VẬN HÀNH & GIAO DIỆN PHÂN HỆ QUẢN TRỊ & BẾP TRƯỞNG (ROLE 2)")
    r3.font.name = "Arial"; r3.font.size = Pt(14); r3.font.bold = True; r3.font.color.rgb = COLOR_PRIMARY

    p_adm_intro = doc.add_paragraph()
    p_adm_intro.paragraph_format.line_spacing = 1.15
    p_adm_intro.add_run(
        "Phân hệ Quản trị dành cho Ban Giám đốc, Quản lý nhà hàng, Bếp trưởng (Executive Chef) và Thu ngân. "
        "Truy cập bảo mật bằng cách nhấn nút 'Quản trị' trên thanh Header và nhập mã PIN chuẩn: 123456 (hoặc TRAM2025)."
    )

    add_image_with_caption(
        doc,
        [os.path.join(BRAIN_DIR, "05_admin_login.png"), os.path.join(SCR_DIR, "05_admin_login.png")],
        "Cổng đăng nhập Quản trị bảo mật với bàn phím số nhập mã PIN truy cập nhanh",
        width_inch=4.5
    )

    # 3.1 DASHBOARD
    p_a1 = doc.add_paragraph()
    p_a1.paragraph_format.space_before = Pt(8)
    r_a1 = p_a1.add_run("3.1. Dashboard Vận Hành, Doanh Thu & Công Suất Ca Thời Gian Thực")
    r_a1.font.name = "Arial"; r_a1.font.size = Pt(11.5); r_a1.font.bold = True; r_a1.font.color.rgb = COLOR_SECONDARY

    p_a1_desc = doc.add_paragraph()
    p_a1_desc.paragraph_format.line_spacing = 1.15
    p_a1_desc.add_run(
        "• Mục đích: Cho phép người quản lý nắm bắt toàn diện hiệu quả kinh doanh và trạng thái lấp đầy mặt bằng.\n"
        "• Bố cục giao diện:\n"
        "  - 4 Thẻ KPI chính: Doanh thu ca/ngày, Tỷ lệ lấp đầy bình quân (Occupancy %), Tỷ lệ No-show, Tổng số khách phục vụ.\n"
        "  - Biểu đồ Cột Đôi Recharts (Công suất 2 ca): Cột xanh (ca 17:30) và cột vàng cam (ca 19:45) đo lường số khách thực tế trên trục chuẩn 30 khách/ca.\n"
        "  - Đường mục tiêu công suất: Đường kẻ đỏ nét đứt tại mốc 25 chỗ (tương ứng 85% sức chứa ca 30 chỗ).\n"
        "  - Bảng danh sách đặt bàn gần nhất: Tra cứu nhanh theo mã bàn, số điện thoại, trạng thái cọc và số lượng khách."
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR24_surveys_analytics.png")],
        "Dashboard Thống kê Doanh thu, Tỷ lệ lấp đầy và Báo cáo Hài lòng Thực khách (CSAT)",
        width_inch=6.0
    )

    # 3.2 ĐIỀU PHỐI BÀN LIVE
    p_a2 = doc.add_paragraph()
    p_a2.paragraph_format.space_before = Pt(8)
    r_a2 = p_a2.add_run("3.2. Quản Trị Sơ Đồ 10 Bàn Live & Điều Phối Ca Phục Vụ (Floor Management)")
    r_a2.font.name = "Arial"; r_a2.font.size = Pt(11.5); r_a2.font.bold = True; r_a2.font.color.rgb = COLOR_SECONDARY

    p_a2_desc = doc.add_paragraph()
    p_a2_desc.paragraph_format.line_spacing = 1.15
    p_a2_desc.add_run(
        "• Giao diện sơ đồ mặt bằng: Hiển thị đồng thời hiện trạng 10 bàn (A01–A05 và B01–B05) cho từng ca 17:30 và 19:45.\n"
        "• Thao tác điều phối 1 chạm:\n"
        "  - Check-in: Chuyển trạng thái khi khách đến, tự động tích lũy điểm thưởng thành viên.\n"
        "  - Đang phục vụ: Theo dõi tiến độ lên 7 món ăn và thời gian tại bàn.\n"
        "  - Hoàn tất: Chốt bill, in hóa đơn và giải phóng bàn.\n"
        "  - No-show / Hủy bàn: Ghi nhận khách vắng mặt, tự động áp dụng quy tắc giữ cọc hoặc hoàn cọc theo mốc 48h."
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR20_checkin_reward_dialog.png")],
        "Hộp thoại Check-in đón tiếp thực khách tại bàn và tự động tính điểm thưởng hóa đơn",
        width_inch=5.2
    )

    # 3.3 ĐỊNH MỨC BOM & FOOD COST
    p_a3 = doc.add_paragraph()
    p_a3.paragraph_format.space_before = Pt(8)
    r_a3 = p_a3.add_run("3.3. Quản Lý Định Mức BOM 7 Món & Kiểm Soát KPI Food Cost 2 Tầng (34,70%)")
    r_a3.font.name = "Arial"; r_a3.font.size = Pt(11.5); r_a3.font.bold = True; r_a3.font.color.rgb = COLOR_SECONDARY

    p_a3_desc = doc.add_paragraph()
    p_a3_desc.paragraph_format.line_spacing = 1.15
    p_a3_desc.add_run(
        "• BẢNG ĐỊNH MỨC KỸ THUẬT BOM 7 MÓN (FR-27):\n"
        "  - Quản lý định lượng chi tiết cho 25 nguyên vật liệu (Bào ngư, Vi cá, Cá bớp, Bò Wagyu, Sen Huế...).\n"
        "  - Bộ lọc co giãn Quick Guests: Co giãn định lượng tự động theo [1 khách, 4 khách, 10 khách, 30 khách trọn ca].\n"
        "• KIỂM SOÁT KPI FOOD COST 2 TẦNG (FR-28, FR-33):\n"
        "  - Tầng 1 (Giá vốn / khách): Tổng chi phí nguyên liệu suất chuẩn = 499.680 đ/khách.\n"
        "  - Tầng 2 (Tỷ lệ Food Cost %): (499.680 đ ÷ 1.440.000 đ) × 100 = 34,70%.\n"
        "  - Thanh tiến trình trực quan: Đạt chuẩn tối ưu (≤ 34,7%), nằm trong khung duyệt P&L (≤ 35%), tuyệt đối an toàn dưới trần tối đa 50%.\n"
        "  - Tách riêng hoàn toàn doanh thu gói Pairing (Vang/Trà) ra khỏi mẫu số tính food cost để phản ánh chính xác hiệu quả ẩm thực."
    )

    add_image_with_caption(
        doc,
        [os.path.join(BRAIN_DIR, "06_admin_bom.png"), os.path.join(SCR_DIR, "FR27_recipes_bom.png")],
        "Màn hình Quản trị Định mức BOM 7 món chi tiết cho 25 nguyên vật liệu và bộ lọc co giãn số khách",
        width_inch=6.0
    )

    add_image_with_caption(
        doc,
        [os.path.join(BRAIN_DIR, "07_admin_food_cost.png"), os.path.join(SCR_DIR, "FR33_food_cost_kpi_2tang.png")],
        "Widget Phân tích KPI Food Cost 2 tầng: Giá vốn 499.680 đ/khách, Tỷ lệ chuẩn 34,70% trong khung P&L ≤ 35%",
        width_inch=6.0
    )

    # 3.4 KHO & DANH SÁCH MUA CA
    p_a4 = doc.add_paragraph()
    p_a4.paragraph_format.space_before = Pt(8)
    r_a4 = p_a4.add_run("3.4. Quản Lý Kho Thực Tế & Danh Sách Mua Hàng Trước Ca Cho Bếp Trưởng (FR-29, FR-32)")
    r_a4.font.name = "Arial"; r_a4.font.size = Pt(11.5); r_a4.font.bold = True; r_a4.font.color.rgb = COLOR_SECONDARY

    p_a4_desc = doc.add_paragraph()
    p_a4_desc.paragraph_format.line_spacing = 1.15
    p_a4_desc.add_run(
        "• Quản lý tồn kho thời gian thực: Bảng theo dõi số lượng tồn thực tế của 25 nguyên liệu, đơn vị tính chuẩn (kg, g, lít, ml, con, lá).\n"
        "• Cảnh báo Điểm đặt hàng lại (Reorder Point): Gắn cờ cảnh báo đỏ khi lượng tồn dưới ngưỡng tối thiểu.\n"
        "• THUẬT TOÁN SHIFT PURCHASE CARD (FR-32):\n"
        "  - Bếp trưởng chọn ngày và ca làm việc (ca 30 khách).\n"
        "  - Hệ thống tự động tính: Lượng cần mua = max(0, Nhu cầu ca 30 khách - Tồn kho thực tế).\n"
        "  - Tính tổng chi phí mua sắm dự kiến cho ca làm việc.\n"
        "  - Nút 'Sao chép danh sách mua': Định dạng sẵn văn bản chi tiết kèm số lượng và quy cách gửi nhà cung cấp thực phẩm qua Zalo/Email chỉ với 1 cú click."
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR29_inventory_overview.png")],
        "Bảng điều khiển Quản lý Kho nguyên liệu thời gian thực và thiết lập Điểm đặt hàng lại (Reorder Point)",
        width_inch=6.0
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR32_shift_purchase_list.png")],
        "Shift Purchase Card: Tự động đối chiếu tồn kho và xuất danh sách mua hàng trước ca cho Bếp trưởng",
        width_inch=6.0
    )

    # 3.5 KHUNG GIỜ VÀNG & WHAT-IF
    p_a5 = doc.add_paragraph()
    p_a5.paragraph_format.space_before = Pt(8)
    r_a5 = p_a5.add_run("3.5. Bảng Điều Khiển Khung Giờ Vàng (Golden Hour) & Mô Phỏng Tài Chính What-If (FR-34, FR-39)")
    r_a5.font.name = "Arial"; r_a5.font.size = Pt(11.5); r_a5.font.bold = True; r_a5.font.color.rgb = COLOR_SECONDARY

    p_a5_desc = doc.add_paragraph()
    p_a5_desc.paragraph_format.line_spacing = 1.15
    p_a5_desc.add_run(
        "• CHIẾN DỊCH KHUNG GIỜ VÀNG ZALO OA (FR-34):\n"
        "  - Hệ thống tự động quét các ca chiều 17:30 ngày giữa tuần (Thứ 4, Thứ 5, Thứ 6) có occupancy thấp (15% – 50%).\n"
        "  - Kích hoạt gửi tin nhắn Zalo OA kèm Voucher giảm giá 15% thực đơn Tasting để kích cầu kéo khách lấp đầy bàn.\n\n"
        "• MÔ PHỎNG TÀI CHÍNH WHAT-IF VỚI THANH TRƯỢT KÉP (FR-39):\n"
        "  - 2 thanh trượt ngang tương tác linh hoạt: Giá Menu Tasting (800k – 2.000k) và Biến động Giá vốn nguyên liệu (±100k).\n"
        "  - Biểu đồ Cột Chồng Recharts cập nhật theo thời gian thực: hiển thị đường trần đỏ 50%, độ lệch lãi gộp Δ, phần trăm Food cost mới và tác động dòng tiền trên quy mô 1 ca đầy 30 khách."
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR34_golden_hour_campaign.png")],
        "Bảng điều khiển Chiến dịch Khung Giờ Vàng: Kích hoạt Voucher giảm 15% ca chiều vắng khách qua Zalo OA",
        width_inch=5.8
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR39_whatif_interactive_slider.png")],
        "Công cụ Mô phỏng What-if với Thanh trượt Kép phân tích tác động dòng tiền trên ca 30 khách",
        width_inch=5.8
    )

    # 3.6 CRM & CHIẾN DỊCH GIỮ CHÂN
    p_a6 = doc.add_paragraph()
    p_a6.paragraph_format.space_before = Pt(8)
    r_a6 = p_a6.add_run("3.6. CRM Thực Khách, 3 Hạng VIP & Chiến Dịch Giữ Chân Tự Động (FR-19, FR-25, FR-26, FR-38)")
    r_a6.font.name = "Arial"; r_a6.font.size = Pt(11.5); r_a6.font.bold = True; r_a6.font.color.rgb = COLOR_SECONDARY

    p_a6_desc = doc.add_paragraph()
    p_a6_desc.paragraph_format.line_spacing = 1.15
    p_a6_desc.add_run(
        "• Hồ sơ khách hàng tích lũy: Quản lý danh bạ, tổng chi tiêu, số lần dùng bữa, gu ẩm thực và phân 3 hạng thẻ (Hương, Trầm, Nam Trầm).\n"
        "• Chiến dịch mời lại khách ≥ 21 ngày (FR-25): Lọc tự động các khách quen lâu chưa ghé; soạn sẵn thư mời tiệc cá nhân hóa kèm Voucher đúng gu (COMBO-TEA15 cho gu thanh nhã, COMBO-WINE15 cho gu sành vang).\n"
        "• Thông báo thăng hạng tự động (FR-26): Gửi thiệp chúc mừng và quà tặng nâng hạng khi khách chạm mốc 3 bữa hoặc 6 bữa."
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR19_customers_list.png")],
        "Danh bạ CRM Quản lý Khách hàng Thân thiết và Phân loại 3 Hạng Thành viên",
        width_inch=6.0
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR25_reengagement_campaign.png"), os.path.join(SCR_DIR, "FR38_reengagement_dialog.png")],
        "Chiến dịch Mời lại Thực khách sau 21 ngày kèm Voucher cá nhân hóa theo gu ẩm thực",
        width_inch=6.0
    )

    add_image_with_caption(
        doc,
        [os.path.join(SCR_DIR, "FR26_tier_upgrade_dialog.png")],
        "Hộp thoại gửi thiệp chúc mừng và kích hoạt đặc quyền nâng hạng Thượng khách tự động",
        width_inch=5.5
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ==========================================
    # PHẦN 4: MA TRẬN ÁNH XẠ 39 FR & API SPEC
    # ==========================================
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(14); h4.paragraph_format.space_after = Pt(6)
    r4 = h4.add_run("4. MA TRẬN ÁNH XẠ 39 YÊU CẦU CHỨC NĂNG & ĐẶC TẢ API ROUTES")
    r4.font.name = "Arial"; r4.font.size = Pt(14); r4.font.bold = True; r4.font.color.rgb = COLOR_PRIMARY

    matrix_tbl = doc.add_table(rows=16, cols=4)
    matrix_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    matrix_tbl.autofit = False
    matrix_tbl.columns[0].width = Inches(1.3)
    matrix_tbl.columns[1].width = Inches(2.2)
    matrix_tbl.columns[2].width = Inches(1.2)
    matrix_tbl.columns[3].width = Inches(2.1)
    set_table_borders(matrix_tbl, color="E5E7EB", sz="4")

    headers_m = ["Mã FR", "Tên chức năng nghiệp vụ", "Vai trò (Role)", "Giao diện / API phụ trách"]
    for i, h in enumerate(headers_m):
        cell = matrix_tbl.rows[0].cells[i]
        set_cell_background(cell, HEX_HEADER)
        set_cell_margins(cell, top=80, bottom=80, left=90, right=90)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.name = "Arial"; r.font.size = Pt(8.5); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)

    matrix_rows = [
        ("FR-01 – FR-05", "Trải nghiệm Thương hiệu & Menu Tasting", "Khách hàng", "home-view.tsx / MenuSection"),
        ("FR-06 – FR-10", "Booking Wizard & Giữ bàn 10 phút", "Khách hàng", "booking-wizard.tsx (Bước 1 - 2)"),
        ("FR-11 – FR-14", "Đặt cọc, Thanh toán & Nhắc lịch", "Khách hàng", "booking-wizard.tsx (Bước 5 - 6)"),
        ("FR-15 – FR-18", "Sơ đồ 10 bàn & Vận hành Ca Live", "Quản lý / Thu ngân", "dashboard.tsx / API /availability"),
        ("FR-19", "Hồ sơ Khách hàng Tích lũy", "Quản lý / CRM", "admin-view.tsx / customers-tab"),
        ("FR-20 – FR-21", "Tích điểm Hóa đơn & 3 Hạng VIP", "Hệ thống / CRM", "lib/tram/loyalty.ts"),
        ("FR-22", "Đặc quyền Miễn cọc VIP Nam Trầm", "Khách hàng / Admin", "booking-wizard.tsx (Step 5)"),
        ("FR-23 – FR-24", "Khảo sát 5 sao & Báo cáo CSAT", "Khách hàng / Admin", "app/survey/[code] / stats-tab"),
        ("FR-25 – FR-26", "Mời lại khách ≥ 21 ngày & Thăng hạng", "Quản lý / CRM", "re-engagement-dialog.tsx"),
        ("FR-27 – FR-28", "Định mức BOM 7 món & Kiểm soát Cost", "Bếp trưởng", "recipes-view.tsx / seed-bom.ts"),
        ("FR-29 & FR-31", "Tồn kho thực tế & Reorder Point", "Bếp trưởng", "inventory-view.tsx / stock-in"),
        ("FR-32", "Danh sách Mua hàng Trước ca (30 khách)", "Bếp trưởng", "shift-purchase-card.tsx"),
        ("FR-33", "KPI Food Cost 2 tầng (34,70%)", "Bếp trưởng / Admin", "food-cost-kpi-widget.tsx"),
        ("FR-34", "Chiến dịch Khung Giờ Vàng Zalo OA", "Quản lý / Admin", "golden-hour-view.tsx"),
        ("FR-37 – FR-39", "Voucher theo Gu & What-if Slider kép", "Khách hàng / Admin", "vouchers.ts / What-if Simulator"),
    ]

    for r_idx, (m1, m2, m3, m4) in enumerate(matrix_rows, start=1):
        row = matrix_tbl.rows[r_idx]
        bg = HEX_ZEBRA if r_idx % 2 == 1 else HEX_WHITE
        for col_idx, text in enumerate([m1, m2, m3, m4]):
            cell = row.cells[col_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=45, bottom=45, left=70, right=70)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.name = "Arial"; r.font.size = Pt(8.5)
            if col_idx == 0:
                r.font.bold = True; r.font.color.rgb = COLOR_PRIMARY
            elif col_idx == 2:
                r.font.bold = True; r.font.color.rgb = COLOR_SECONDARY
            else:
                r.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # DANH MỤC API ROUTES
    p_api_title = doc.add_paragraph()
    r_api_title = p_api_title.add_run("DANH MỤC API ROUTES CHÍNH TRONG HỆ THỐNG:")
    r_api_title.font.name = "Arial"; r_api_title.font.size = Pt(10.5); r_api_title.font.bold = True; r_api_title.font.color.rgb = COLOR_SECONDARY

    p_api_list = doc.add_paragraph()
    p_api_list.paragraph_format.line_spacing = 1.15
    p_api_list.add_run(
        "• GET /api/availability: Truy xuất trạng thái 10 bàn và số chỗ còn lại theo ca/ngày.\n"
        "• POST /api/reservations/hold: Khóa giữ bàn tạm thời 10 phút (Table Hold) theo session.\n"
        "• POST /api/reservations: Tạo mới đơn đặt tiệc, lưu tiền cọc và kích hoạt tin nhắn Zalo/SMS mô phỏng.\n"
        "• POST /api/waitlist: Tiếp nhận khách vào danh sách chờ khi kín ca 30 chỗ hoặc đoàn > 4 khách.\n"
        "• GET /api/admin/stats: Tổng hợp doanh thu, occupancy ca 30 chỗ và phân bổ đánh giá CSAT.\n"
        "• GET /api/admin/golden-hour: Quét và kích hoạt chiến dịch Voucher giảm 15% cho ca chiều 17:30.\n"
        "• GET/POST /api/recipes/concepts: Quản lý định mức BOM 7 món chuẩn Food Cost 34,70%.\n"
        "• GET/POST /api/inventory: Quản lý tồn kho 25 nguyên vật liệu và xuất danh sách mua hàng ca 30 khách."
    )

    # FOOTER
    p_foot = doc.add_paragraph()
    p_foot.paragraph_format.space_before = Pt(16)
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_foot = p_foot.add_run("— HẾT TÀI LIỆU THIẾT KẾ & ĐẶC TẢ GIAO DIỆN HỆ THỐNG TRẦM RESERVE —\nĐồ án môn học Business Value & Digital Operations · 2026")
    r_foot.font.name = "Arial"; r_foot.font.size = Pt(9); r_foot.font.italic = True; r_foot.font.color.rgb = COLOR_MUTED

    # Lưu file
    output_path = os.path.join(os.getcwd(), "docs", "LUONG_VAN_HANH_VA_DAC_TA_GIAO_DIEN_TRAMDINE.docx")
    doc.save(output_path)
    print(f"SUCCESS: Đã xuất tài liệu toàn diện kèm ảnh thành công tại: {output_path}")

if __name__ == "__main__":
    generate_document()
