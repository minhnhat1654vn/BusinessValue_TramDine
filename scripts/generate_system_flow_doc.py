# -*- coding: utf-8 -*-
"""
Script sinh tài liệu Word (.docx):
TÀI LIỆU THIẾT KẾ LUỒNG VẬN HÀNH & ĐẶC TẢ GIAO DIỆN TOÀN BỘ HỆ THỐNG
TRẦM RESERVE (TRAMDINE) — HỆ THỐNG QUẢN TRỊ & VẬN HÀNH FINE DINING
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

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
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
    set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
    
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
    p_spacer.paragraph_format.space_after = Pt(6)

def format_row(row, heights, text_list, bold=False, color_rgb=None, font_size=9.5, align=WD_ALIGN_PARAGRAPH.LEFT):
    for i, cell in enumerate(row.cells):
        p = cell.paragraphs[0]
        p.alignment = align
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(str(text_list[i]))
        r.font.name = "Arial"
        r.font.size = Pt(font_size)
        r.font.bold = bold
        if color_rgb:
            r.font.color.rgb = color_rgb
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

# ==========================================
# KHỞI TẠO TÀI LIỆU CHÍNH
# ==========================================

def generate_document():
    doc = Document()
    
    # Thiết lập lề trang
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.85)
        s.right_margin = Inches(0.85)

    # Bảng màu thương hiệu Fine Dining TRẦM
    COLOR_PRIMARY = RGBColor(180, 83, 9)     # #b45309 Amber-700
    COLOR_SECONDARY = RGBColor(120, 53, 15)  # #78350f Amber-900
    COLOR_DARK = RGBColor(41, 37, 36)        # #292524 Stone-800
    COLOR_MUTED = RGBColor(115, 115, 115)    # Stone-500
    COLOR_SUCCESS = RGBColor(21, 128, 61)    # Emerald-700
    
    HEX_HEADER = "78350F"
    HEX_ZEBRA = "FBF7EE"
    HEX_WHITE = "FFFFFF"

    # ==========================================
    # PHẦN TIÊU ĐỀ TRANG BÌA (HEADER BLOCK)
    # ==========================================
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(2)
    r_sub = p_sub.add_run("TRẦM RESERVE · BUSINESS VALUE & DIGITAL OPERATIONS PLATFORM")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(10)
    r_sub.font.bold = True
    r_sub.font.color.rgb = COLOR_PRIMARY

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("TÀI LIỆU THIẾT KẾ LUỒNG VẬN HÀNH\n& ĐẶC TẢ GIAO DIỆN TOÀN BỘ HỆ THỐNG")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_DARK

    p_desc = doc.add_paragraph()
    p_desc.paragraph_format.space_after = Pt(14)
    r_desc = p_desc.add_run(
        "Đặc tả toàn diện hành trình người dùng (User Flows), thiết kế layout giao diện, cơ chế kiểm soát dữ liệu "
        "thời gian thực và ma trận chức năng cho 2 vai trò: Khách hàng (Đặt bàn trực tuyến) và Ban Quản lý / Bếp trưởng (Vận hành ca)."
    )
    r_desc.font.name = "Arial"
    r_desc.font.size = Pt(10.5)
    r_desc.font.italic = True
    r_desc.font.color.rgb = COLOR_MUTED

    # Bảng thông tin meta đồ án
    meta_tbl = doc.add_table(rows=5, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_tbl.autofit = False
    meta_tbl.columns[0].width = Inches(2.2)
    meta_tbl.columns[1].width = Inches(4.6)
    set_table_borders(meta_tbl, color="E5E7EB", sz="4")

    meta_data = [
        ("Hệ thống phần mềm", "TRẦM Reserve (TramDine) — Fine Dining Platform"),
        ("Kiến trúc triển khai", "Next.js 16 (App Router) + SQLite + Prisma ORM (Local-first)"),
        ("Quy chuẩn vận hành", "10 bàn · 30 chỗ ngồi/ca | 2 ca tối (17:30 & 19:45) | Lịch T4 → CN"),
        ("Thông số tài chính", "Menu Tasting: 1.440.000 đ/khách | Cọc: 300.000 đ | Food Cost: 34,70%"),
        ("Ngày chuẩn hóa", "Tháng 11 / 2026 — Hoàn tất kiểm thử kỹ thuật và đồng bộ 2 Roles"),
    ]
    for row_idx, (k, v) in enumerate(meta_data):
        row = meta_tbl.rows[row_idx]
        set_cell_margins(row.cells[0], top=60, bottom=60, left=100, right=100)
        set_cell_margins(row.cells[1], top=60, bottom=60, left=100, right=100)
        set_cell_background(row.cells[0], "F9FAFB")
        set_cell_background(row.cells[1], "FFFFFF")
        
        pk = row.cells[0].paragraphs[0]
        rk = pk.add_run(k)
        rk.font.name = "Arial"; rk.font.size = Pt(9); rk.font.bold = True; rk.font.color.rgb = COLOR_DARK
        
        pv = row.cells[1].paragraphs[0]
        rv = pv.add_run(v)
        rv.font.name = "Arial"; rv.font.size = Pt(9); rv.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ==========================================
    # PHẦN 1: TỔNG QUAN KIẾN TRÚC & THÔNG SỐ CỐ ĐỊNH
    # ==========================================
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(6)
    r1 = h1.add_run("1. TỔNG QUAN KIẾN TRÚC VÀ THÔNG SỐ CỐ ĐỊNH CỦA HỆ THỐNG")
    r1.font.name = "Arial"; r1.font.size = Pt(14); r1.font.bold = True; r1.font.color.rgb = COLOR_PRIMARY

    p_intro = doc.add_paragraph()
    p_intro.paragraph_format.line_spacing = 1.2
    p_intro.paragraph_format.space_after = Pt(8)
    p_intro.add_run(
        "Hệ thống TRẦM Reserve được xây dựng theo mô hình Single Page Application (SPA) trên nền tảng Next.js 16, "
        "kết hợp kiến trúc Client-side State Machine để kiểm soát luồng đặt bàn 6 bước không cần reload trang. "
        "Mọi thông số kinh doanh của nhà hàng đều được khóa cố định trong module constants để bảo toàn tính toàn vẹn:"
    )

    # Bảng thông số chuẩn
    const_tbl = doc.add_table(rows=11, cols=3)
    const_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    const_tbl.autofit = False
    const_tbl.columns[0].width = Inches(2.2)
    const_tbl.columns[1].width = Inches(2.0)
    const_tbl.columns[2].width = Inches(2.6)
    set_table_borders(const_tbl, color="E5E7EB", sz="4")

    headers = ["Thông số nghiệp vụ", "Giá trị chuẩn hóa", "Giải thích kỹ thuật & Phạm vi áp dụng"]
    for i, h in enumerate(headers):
        cell = const_tbl.rows[0].cells[i]
        set_cell_background(cell, HEX_HEADER)
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.name = "Arial"; r.font.size = Pt(9.5); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)

    const_rows = [
        ("Quy mô mặt bằng", "10 bàn · 30 chỗ", "5 bàn 2 chỗ (Dãy A) + 5 bàn 4 chỗ (Khu B)"),
        ("Sức chứa mỗi ca", "30 khách / ca", "Tối đa 60 khách/ngày qua 2 ca phục vụ độc lập"),
        ("Khung giờ phục vụ", "17:30 và 19:45", "Mỗi ca kéo dài 2 tiếng, cách nhau 15 phút giãn ca"),
        ("Lịch hoạt động tuần", "Thứ Tư → Chủ Nhật", "Nghỉ định kỳ Thứ Hai và Thứ Ba để chuẩn bị nguyên liệu"),
        ("Giá Menu Tasting", "1.440.000 đ/khách", "Set 7 món 'Tiến Vua · Bảy Báu Vật Việt'"),
        ("Wine Pairing", "+650.000 đ/khách", "Tuyển chọn 4 dòng vang quốc tế cao cấp"),
        ("Tea Pairing", "+350.000 đ/khách", "Tuyển tập 4 danh trà cổ thụ thượng hạng"),
        ("Mức tiền cọc bàn", "300.000 đ/khách", "Bắt buộc cọc; hoàn 100% nếu hủy trước 48 tiếng"),
        ("Đặc quyền VIP Nam Trầm", "Miễn cọc 100%", "Áp dụng tự động cho thực khách từ 6 lần ghé thăm"),
        ("Mục tiêu Food Cost", "34,70% (499.680 đ)", "Khung P&L an toàn ≤ 35%, tuyệt đối dưới trần 50%"),
    ]
    for r_idx, (c1, c2, c3) in enumerate(const_rows, start=1):
        row = const_tbl.rows[r_idx]
        bg = HEX_ZEBRA if r_idx % 2 == 1 else HEX_WHITE
        for col_idx, text in enumerate([c1, c2, c3]):
            cell = row.cells[col_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.name = "Arial"; r.font.size = Pt(9)
            if col_idx == 0:
                r.font.bold = True; r.font.color.rgb = COLOR_DARK
            elif col_idx == 1:
                r.font.bold = True; r.font.color.rgb = COLOR_PRIMARY
            else:
                r.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ==========================================
    # PHẦN 2: ĐẶC TẢ PHÂN HỆ KHÁCH HÀNG (ROLE 1)
    # ==========================================
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    r2 = h2.add_run("2. ĐẶC TẢ LUỒNG VẬN HÀNH & GIAO DIỆN PHÂN HỆ KHÁCH HÀNG (ROLE 1)")
    r2.font.name = "Arial"; r2.font.size = Pt(14); r2.font.bold = True; r2.font.color.rgb = COLOR_PRIMARY

    # LUỒNG 1: TRANG CHỦ & BRAND STORYTELLING
    p_l1 = doc.add_paragraph()
    p_l1.paragraph_format.space_before = Pt(6)
    r_l1 = p_l1.add_run("2.1. Luồng 1: Khám Phá Thương Hiệu & Thực Đơn Tasting 7 Món (Trang Chủ)")
    r_l1.font.name = "Arial"; r_l1.font.size = Pt(11.5); r_l1.font.bold = True; r_l1.font.color.rgb = COLOR_SECONDARY

    p_l1_desc = doc.add_paragraph()
    p_l1_desc.paragraph_format.line_spacing = 1.15
    p_l1_desc.add_run(
        "• Mục đích: Truyền tải triết lý ẩm thực Fine Dining, khẳng định quy mô nhà hàng và kích thích khách đặt bàn.\n"
        "• Các thành phần giao diện (UI Specs):\n"
        "  - Header Navigation: Logo TRẦM Reserve, Nút 'Đặt bàn ngay' (anchor chuyển view), Nút 'Quản trị' (mở popup PIN).\n"
        "  - Hero Banner: Typography trang trọng, Huy hiệu nổi bật '30 chỗ ngồi · 10 bàn' | '7 món tasting' | '2 khung mỗi tối'.\n"
        "  - Câu chuyện Trầm Hương: Mô tả nguồn gốc nguyên liệu miền Trung - Nam, không gian 30 chỗ ấm cúng.\n"
        "  - Trình diễn Thực đơn: Hiển thị 7 món ăn với ảnh chụp chất lượng cao, ghi chú xuất xứ địa phương, giá niêm yết 1.440.000 đ/khách.\n"
        "  - Giới thiệu 2 gói Pairing: Wine Pairing (+650.000 đ) và Tea Pairing (+350.000 đ)."
    )

    # LUỒNG 2: BOOKING WIZARD 6 BƯỚC
    p_l2 = doc.add_paragraph()
    p_l2.paragraph_format.space_before = Pt(8)
    r_l2 = p_l2.add_run("2.2. Luồng 2: Quy Trình Đặt Bàn Trực Tuyến 6 Bước (Booking Wizard)")
    r_l2.font.name = "Arial"; r_l2.font.size = Pt(11.5); r_l2.font.bold = True; r_l2.font.color.rgb = COLOR_SECONDARY

    p_step1 = doc.add_paragraph()
    p_step1.paragraph_format.line_spacing = 1.15
    p_step1.add_run(
        "• BƯỚC 1: CHỌN NGÀY, KHUNG GIỜ VÀ SỐ LƯỢNG KHÁCH\n"
        "  - Giao diện: Lịch chọn ngày trong tháng; Nút chọn ca 17:30 và 19:45; Bộ đếm khách tăng/giảm (+/-) từ 2 đến 8 khách.\n"
        "  - Logic kiểm soát ngày: Tự động chặn Thứ Hai và Thứ Ba (hiển thị nhãn 'Nghỉ định kỳ'). Chỉ cho phép đặt từ Thứ Tư đến Chủ Nhật.\n"
        "  - Hiển thị chỗ trống theo thời gian thực: API /api/availability trả về số chỗ còn lại. Ví dụ: 'Còn 14 chỗ', hoặc 'Hết chỗ (Đăng ký chờ)'.\n"
        "  - QUY CHUẨN ĐOÀN ĐÔNG (> 4 KHÁCH): Do 1 bàn tối đa 4 chỗ, khi khách chọn 5–8 khách hoặc số chỗ còn lại không đủ cho đoàn, nút bấm chân trang tự động đổi thành 'Đăng ký danh sách chờ' kèm lời nhắc: 'Đoàn trên 4 khách: nhà hàng sẽ xếp bàn ghép — vui lòng đăng ký danh sách chờ để được sắp xếp chu đáo.'"
    )

    p_step2 = doc.add_paragraph()
    p_step2.paragraph_format.line_spacing = 1.15
    p_step2.add_run(
        "• BƯỚC 2A: CHỌN VỊ TRÍ BÀN & GIỮ BÀN TẠM THỜI (TABLE HOLD 10 PHÚT)\n"
        "  - Giao diện Sơ đồ bàn: Bản vẽ kiến trúc 10 bàn tương tác trực quan:\n"
        "    + Dãy A (Cửa sổ): A01, A02, A03, A04, A05 (5 bàn × 2 chỗ = 10 chỗ).\n"
        "    + Khu B (Trung tâm): B01, B02, B03, B04, B05 (5 bàn × 4 chỗ = 20 chỗ).\n"
        "  - Màu sắc trạng thái bàn: Màu vàng rơm = Bàn trống khả dụng; Màu đá xám gạch chéo = Đã có người đặt; Viền nét đứt = Bàn không đủ chỗ cho đoàn; Màu cam đậm tỏa sáng = Bàn đang chọn.\n"
        "  - Cơ chế Table Hold 10 phút: Ngay khi click chọn bàn, hệ thống tạo khóa session và đếm ngược 600 giây. Trong thời gian này, khách khác vào xem cùng ca sẽ thấy bàn báo 'Đang có người giữ chỗ', triệt tiêu 100% nguy cơ đặt trùng."
    )

    p_step2b = doc.add_paragraph()
    p_step2b.paragraph_format.line_spacing = 1.15
    p_step2b.add_run(
        "• BƯỚC 2B: LUỒNG DANH SÁCH CHỜ (WAITLIST) KHI HẾT BÀN HOẶC ĐOÀN ĐÔNG\n"
        "  - Điều kiện kích hoạt: Khi ca kín 30/30 chỗ, hoặc khách chọn đoàn > 4 khách cần ghép bàn, hệ thống tự động mở WaitlistPanel.\n"
        "  - Giao diện thông minh: Tiêu đề tự động thích ứng:\n"
        "    + Nếu đoàn > 4 khách: Tiêu đề 'Đăng ký xếp bàn (Đoàn từ 5 khách)' kèm giải thích bàn online tối đa 4 chỗ, nhà hàng sẽ liên hệ ghép bàn riêng.\n"
        "    + Nếu ca hết chỗ: Tiêu đề 'Đăng ký danh sách chờ (Waitlist)'.\n"
        "  - Form đăng ký: Nhập Họ tên, Số điện thoại (kiểm tra Regex 10 số đầu 0), Số lượng khách.\n"
        "  - Kết quả: Cấp số thứ tự trong hàng chờ (Position Queue) và lưu vào cơ sở dữ liệu để ban quản lý xử lý."
    )

    p_step3_6 = doc.add_paragraph()
    p_step3_6.paragraph_format.line_spacing = 1.15
    p_step3_6.add_run(
        "• BƯỚC 3: CHI TIẾT & TÙY BIẾN THỰC ĐƠN TASTING 7 MÓN\n"
        "  - Giao diện: Danh sách 7 thẻ món ăn. Khách có thể nhấn xem thành phần nguyên liệu và tùy biến cách nấu (om chậm / áp chảo da giòn...).\n\n"
        "• BƯỚC 4: THÔNG TIN KHÁCH HÀNG, GÓI PAIRING & DỊ ỨNG\n"
        "  - Nhập Họ tên, SĐT, Email liên hệ.\n"
        "  - Chọn đồ uống: 'Không pairing', 'Wine pairing (+650k)', hoặc 'Tea pairing (+350k)'.\n"
        "  - Ghi nhận dị ứng thực phẩm (tự động gắn cờ cho bếp) và dịp đặc biệt (Sinh nhật, Kỷ niệm, Đối tác).\n"
        "  - Tự động nhận diện Loyalty: Nhập SĐT, hệ thống ngầm đối chiếu CRM để phát hiện khách quen và phân loại hạng thành viên.\n\n"
        "• BƯỚC 5: ÁP DỤNG VOUCHER & THANH TOÁN TIỀN CỌC\n"
        "  - Ô nhập Voucher thông minh: Hỗ trợ mã cá nhân hóa theo gu (COMBO-TEA15, COMBO-WINE15, WELCOME10...).\n"
        "  - Tính toán chiết khấu: Hiển thị dòng giảm trừ màu xanh lá và tự động giảm mức cọc cần thanh toán.\n"
        "  - Mức cọc: Chuẩn 300.000 đ/khách (hoặc 50% sau voucher).\n"
        "  - ĐẶC QUYỀN VIP NAM TRẦM (FR-22): Nhận diện khách hạng Nam Trầm (≥ 6 lần đến tiệc) và MIỄN 100% CỌC, nút bấm chuyển thẳng sang 'Xác nhận đặt bàn (Miễn cọc VIP)'.\n"
        "  - Modal thanh toán mô phỏng: Cổng VietQR hiển thị mã QR động hoặc Cổng Thẻ Quốc tế với hiệu ứng xác thực 2 bước.\n\n"
        "• BƯỚC 6: XÁC NHẬN HOÀN TẤT & CẤP MÃ ĐẶT CHỖ\n"
        "  - Giao diện màn hình thành công: Cấp mã đặt chỗ bảo mật (VD: TR-381924), tóm tắt đầy đủ thông tin bàn, giờ, thực đơn, gói pairing.\n"
        "  - Hướng dẫn quy định hoàn cọc: Hoàn 100% tiền cọc nếu thực khách hủy bàn trước 48 giờ."
    )

    # LUỒNG 3: KHẢO SÁT 5 SAO HẬU MÃI
    p_l3 = doc.add_paragraph()
    p_l3.paragraph_format.space_before = Pt(8)
    r_l3 = p_l3.add_run("2.3. Luồng 3: Khảo Sát Đánh Giá Trải Nghiệm 5 Sao (/survey/[code])")
    r_l3.font.name = "Arial"; r_l3.font.size = Pt(11.5); r_l3.font.bold = True; r_l3.font.color.rgb = COLOR_SECONDARY

    p_l3_desc = doc.add_paragraph()
    p_l3_desc.paragraph_format.line_spacing = 1.15
    p_l3_desc.add_run(
        "• Mục đích: Thu thập phản hồi thực tế sau bữa tiệc, tính toán chỉ số CSAT và tích điểm thưởng tri ân.\n"
        "• Giao diện độc lập: Truy cập theo đường dẫn /survey/[mã_đặt_bàn] (VD: /survey/TR-102948).\n"
        "• 4 tiêu chí Fine Dining: Đánh giá xếp hạng 1–5 sao cho: (1) Món ăn, (2) Không gian, (3) Phục vụ, (4) Đồ uống.\n"
        "• Khung nhận xét & Điểm thưởng: Ô nhập cảm nghĩ tự do; sau khi gửi, hệ thống tự động cộng 200 điểm thưởng (pts) vào tài khoản khách."
    )

    add_callout(
        doc,
        "Tại phân hệ Khách hàng, mọi thông số sức chứa đều tuyệt đối tuân thủ quy chuẩn 10 bàn (30 chỗ ngồi/ca). "
        "Bàn lớn nhất trên sơ đồ chỉ chứa tối đa 4 người. Khách đặt đoàn từ 5 đến 8 người bắt buộc chuyển hướng sang Waitlist "
        "để nhà hàng chủ động liên hệ xếp bàn ghép riêng, bảo đảm không gian trải nghiệm Fine Dining hoàn hảo.",
        title="LƯU Ý NGHIỆP VỤ BÀN GHẾ & ĐOÀN ĐÔNG (ROLE 1):"
    )

    # ==========================================
    # PHẦN 3: ĐẶC TẢ PHÂN HỆ QUẢN TRỊ (ROLE 2)
    # ==========================================
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)
    r3 = h3.add_run("3. ĐẶC TẢ LUỒNG VẬN HÀNH & GIAO DIỆN PHÂN HỆ QUẢN TRỊ & BẾP TRƯỞNG (ROLE 2)")
    r3.font.name = "Arial"; r3.font.size = Pt(14); r3.font.bold = True; r3.font.color.rgb = COLOR_PRIMARY

    p_admin_gate = doc.add_paragraph()
    p_admin_gate.paragraph_format.line_spacing = 1.15
    p_admin_gate.add_run(
        "• Cổng đăng nhập bảo mật (Admin Gate): Bấm nút 'Quản trị' góc phải Header. Nhập mã PIN bảo mật: 123456 (hoặc TRAM2025). "
        "Giao diện phân hệ Quản trị bao gồm thanh điều hướng Tab chuẩn và các phân khu chức năng chuyên sâu:"
    )

    admin_features = [
        ("3.1. Dashboard Vận Hành & Doanh Thu Thời Gian Thực",
         "• Giao diện: 4 thẻ KPI đầu trang (Doanh thu ca, Tỷ lệ lấp đầy %, Tỷ lệ No-show, Tổng số khách).\n"
         "• Biểu đồ Công suất lấp đầy (Recharts): Đo lường số khách thực tế của 2 ca (17:30 & 19:45) trên thang chuẩn 30 khách/ca.\n"
         "• Đường mục tiêu công suất: Đường kẻ đỏ nét đứt tại mốc 25 chỗ (tương ứng 85% của ca 30 chỗ).\n"
         "• Danh sách đặt bàn gần nhất: Lọc nhanh khách hôm nay, trạng thái cọc và số điện thoại liên hệ."),

        ("3.2. Quản Trị Sơ Đồ Bàn & Điều Phối Ca Live (Floor Management)",
         "• Sơ đồ 10 bàn thời gian thực: Hiển thị trực quan trạng thái 10 bàn (A01–A05 và B01–B05) cho từng ca tối.\n"
         "• Thao tác điều phối 1 chạm: Nhấp vào từng bàn để thực hiện: Check-in đón khách, Đang phục vụ tiệc, Hoàn tất thanh toán, hoặc Đánh dấu No-show/Hủy bàn kèm chính sách hoàn cọc."),

        ("3.3. Quản Lý Danh Sách Chờ (Waitlist Management)",
         "• Bảng dữ liệu hàng đợi: Quản lý khách đăng ký chờ khi ca kín chỗ hoặc khách đoàn đông (5–8 người) cần xếp bàn ghép.\n"
         "• Thao tác 'Mời khách vào bàn': Khi có bàn nhả hoặc sắp xếp xong bàn ghép, bấm nút mời khách để chuyển đổi tức thời từ Waitlist sang Đặt bàn chính thức."),

        ("3.4. Quản Lý Định Mức BOM & Kiểm Soát Food Cost (FR-27, FR-28, FR-33)",
         "• Bảng công thức BOM 7 món: Quản lý định lượng chi tiết cho 25 nguyên vật liệu (Bào ngư, Vi cá, Bò Wagyu, Cá bớp...).\n"
         "• Bộ lọc co giãn số khách (Quick Guests): Co giãn định lượng tự động theo [1 khách, 4 khách, 10 khách, 30 khách trọn ca].\n"
         "• Công thức tính KPI Food Cost 2 tầng chuẩn mực:\n"
         "  + Tầng 1 (Giá vốn / khách): Tổng chi phí nguyên liệu 7 món = 499.680 đ/khách.\n"
         "  + Tầng 2 (Tỷ lệ Food Cost %): (499.680 đ ÷ 1.440.000 đ) × 100 = 34,70%.\n"
         "• Thanh tiến trình đo kiểm: Đánh dấu vùng an toàn tối ưu (≤ 34,7%), khung duyệt P&L (≤ 35%) và giới hạn cảnh báo trần đỏ (50%)."),

        ("3.5. Quản Lý Kho & Danh Sách Mua Hàng Trước Ca Cho Bếp Trưởng (FR-29, FR-31, FR-32)",
         "• Theo dõi tồn kho thực tế: Bảng danh mục 25 nguyên liệu, đơn vị tính chuẩn (kg, g, lít, ml, con, lá).\n"
         "• Cảnh báo Điểm đặt hàng lại (Reorder Point): Tự động gắn nhãn đỏ khi lượng tồn thực tế dưới ngưỡng an toàn.\n"
         "• Shift Purchase Card (Nhu cầu mua hàng ca): Tự động đối chiếu Nhu cầu ca 30 khách với Tồn kho thực tế:\n"
         "  Lượng cần mua = max(0, Nhu cầu ca 30 khách - Tồn kho thực tế)\n"
         "• Tính tổng chi phí mua sắm dự kiến cho ca làm việc.\n"
         "• Nút 'Sao chép danh sách mua': Định dạng sẵn văn bản chi tiết kèm số lượng và quy cách gửi nhà cung cấp qua Zalo/Email."),

        ("3.6. Bảng Điều Khiển Khung Giờ Vàng (Golden Hour Campaign - FR-34)",
         "• Giám sát tự động: Phát hiện các ca 17:30 ngày giữa tuần (Thứ 4, Thứ 5, Thứ 6) có tỷ lệ lấp đầy thấp (15% – 50%).\n"
         "• Kích hoạt chiến dịch Zalo OA: Gửi tin nhắn thông báo kèm Voucher độc quyền giảm 15% thực đơn Tasting để kích cầu lấp đầy chỗ trống."),

        ("3.7. Mô Phỏng Tài Chính What-If Với Thanh Trượt Kép (FR-39)",
         "• 2 thanh trượt tương tác: Thanh trượt Giá bán Menu (800k – 2.000k) và Thanh trượt Giá vốn nguyên liệu (±100k).\n"
         "• Biểu đồ Cột Chồng Recharts: Cập nhật thời gian thực độ lệch lãi gộp Δ, phần trăm Food cost mới và tác động dòng tiền trên quy mô 1 ca đầy 30 khách."),

        ("3.8. CRM Thực Khách & Chiến Dịch Giữ Chân Tự Động (FR-19, FR-25, FR-26, FR-38)",
         "• Hồ sơ khách hàng tích lũy: Quản lý tổng chi tiêu, số lần ghé, gu ẩm thực (Gu thanh nhã / Gu sành vang) và phân 3 hạng thẻ (Hương, Trầm, Nam Trầm).\n"
         "• Chiến dịch mời lại thực khách (FR-25): Lọc danh sách khách quen ≥ 21 ngày chưa quay lại, soạn sẵn thiệp mời Zalo/Email kèm voucher đúng gu.\n"
         "• Báo cáo chất lượng CSAT: Thống kê đánh giá 5 sao và đánh giá mô phỏng Google Maps Places API."),

        ("3.9. Cài Đặt Chương Trình Đặt Bàn (Booking Program Settings)",
         "• Cấu hình khoảng ngày áp dụng chương trình thực đơn mùa.\n"
         "• Quản lý danh sách các ngày nghỉ đột xuất, bảo trì, lễ tết.\n"
         "• Nút gạt điều khiển: 'Mở phục vụ ngày nghỉ định kỳ (Thứ Hai & Thứ Ba)' — mở thêm ca phục vụ sự kiện riêng theo chỉ đạo của ban quản trị.")
    ]

    for title, content in admin_features:
        p_title = doc.add_paragraph()
        p_title.paragraph_format.space_before = Pt(8)
        p_title.paragraph_format.space_after = Pt(2)
        r_title = p_title.add_run(title)
        r_title.font.name = "Arial"; r_title.font.size = Pt(11); r_title.font.bold = True; r_title.font.color.rgb = COLOR_SECONDARY

        p_cnt = doc.add_paragraph()
        p_cnt.paragraph_format.line_spacing = 1.15
        p_cnt.paragraph_format.space_after = Pt(6)
        r_cnt = p_cnt.add_run(content)
        r_cnt.font.name = "Arial"; r_cnt.font.size = Pt(9.5); r_cnt.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==========================================
    # PHẦN 4: MA TRẬN ÁNH XẠ CHỨC NĂNG (FR MATRIX)
    # ==========================================
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(14)
    h4.paragraph_format.space_after = Pt(6)
    r4 = h4.add_run("4. MA TRẬN ÁNH XẠ 39 YÊU CẦU CHỨC NĂNG (FR-01 → FR-39)")
    r4.font.name = "Arial"; r4.font.size = Pt(14); r4.font.bold = True; r4.font.color.rgb = COLOR_PRIMARY

    p_matrix_desc = doc.add_paragraph()
    p_matrix_desc.paragraph_format.line_spacing = 1.15
    p_matrix_desc.paragraph_format.space_after = Pt(8)
    p_matrix_desc.add_run(
        "Bảng tổng hợp đối chiếu toàn bộ 39 yêu cầu chức năng (FR) được quy định trong tài liệu tư vấn Business Value, "
        "phân định rõ vai trò người dùng (Role), phân hệ giao diện và API Backend phụ trách:"
    )

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
        set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.name = "Arial"; r.font.size = Pt(9); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)

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
            set_cell_margins(cell, top=50, bottom=50, left=80, right=80)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.name = "Arial"; r.font.size = Pt(8.5)
            if col_idx == 0:
                r.font.bold = True; r.font.color.rgb = COLOR_PRIMARY
            elif col_idx == 2:
                r.font.bold = True; r.font.color.rgb = COLOR_SECONDARY
            else:
                r.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # ==========================================
    # PHẦN 5: ĐẶC TẢ HẠ TẦNG KỸ THUẬT & API REST
    # ==========================================
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(14)
    h5.paragraph_format.space_after = Pt(6)
    r5 = h5.add_run("5. HẠ TẦNG KỸ THUẬT, BẢO MẬT VÀ DANH MỤC API ROUTES")
    r5.font.name = "Arial"; r5.font.size = Pt(14); r5.font.bold = True; r5.font.color.rgb = COLOR_PRIMARY

    p_api_desc = doc.add_paragraph()
    p_api_desc.paragraph_format.line_spacing = 1.15
    p_api_desc.add_run(
        "Toàn bộ ứng dụng được xây dựng trên kiến trúc Next.js App Router (Server-side & Client-side kết hợp). "
        "Dữ liệu được lưu trữ an toàn trong SQLite thông qua Prisma ORM Client, đảm bảo khả năng chạy hoàn toàn độc lập (Offline/Local-first):\n"
        "• GET /api/availability: Lấy tình trạng 10 bàn và tính toán số chỗ còn lại theo ca/ngày.\n"
        "• POST /api/reservations/hold: Kích hoạt khóa tạm thời 10 phút (Table Hold) theo session.\n"
        "• POST /api/reservations: Khởi tạo lượt đặt bàn chính thức, lưu cọc và gửi thông báo Zalo/SMS mô phỏng.\n"
        "• POST /api/waitlist: Tiếp nhận yêu cầu đăng ký danh sách chờ khi kín chỗ hoặc khách đoàn đông cần ghép bàn.\n"
        "• GET /api/admin/stats: Tổng hợp số liệu KPI doanh thu, tỷ lệ lấp đầy ca 30 chỗ và biểu đồ phân bổ.\n"
        "• GET /api/admin/golden-hour: Quét và phát hiện ca chiều lấp đầy thấp để kích hoạt chiến dịch voucher.\n"
        "• GET/POST /api/recipes/concepts: Đồng bộ và quản lý công thức định mức BOM 7 món chuẩn Food Cost 34,70%.\n"
        "• GET/POST /api/inventory: Quản lý số liệu nhập xuất tồn kho và danh mục mua hàng trước ca của Bếp trưởng."
    )

    # Lời kết và bản quyền
    doc.add_paragraph().paragraph_format.space_after = Pt(10)
    p_footer = doc.add_paragraph()
    p_footer.paragraph_format.space_before = Pt(14)
    p_footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_foot = p_footer.add_run("— HẾT TÀI LIỆU THIẾT KẾ & ĐẶC TẢ GIAO DIỆN HỆ THỐNG TRẦM RESERVE —\nBản quyền thuộc Đồ án môn học Business Value & Digital Operations · 2026")
    r_foot.font.name = "Arial"; r_foot.font.size = Pt(9); r_foot.font.italic = True; r_foot.font.color.rgb = COLOR_MUTED

    # Lưu tài liệu
    output_dir = os.path.join(os.getcwd(), "docs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "LUONG_VAN_HANH_VA_DAC_TA_GIAO_DIEN_TRAMDINE.docx")
    doc.save(output_path)
    print(f"SUCCESS: Đã xuất tài liệu Word thành công tại: {output_path}")

if __name__ == "__main__":
    generate_document()
