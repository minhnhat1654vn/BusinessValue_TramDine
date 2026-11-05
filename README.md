# TRẦM Reserve (TramDine) — Hệ Thống Quản Trị & Vận Hành Fine Dining

> **Đồ án môn Business Value & Digital Operations**  
> Dự án mô phỏng toàn diện giải pháp chuyển đổi số cho nhà hàng **TRẦM Reserve** — mô hình ẩm thực cao cấp (Haute Cuisine / Fine Dining) quy mô 12 bàn (42 chỗ), phục vụ Bộ Thực đơn Tasting 7 món *"Hành trình vị Việt"*.

Ứng dụng chạy hoàn toàn **Local-first**, cơ sở dữ liệu SQLite độc lập, các cổng thanh toán đặt cọc và hệ thống gửi tin nhắn thông báo (Zalo ZNS / SMS / Email) đều được **mô phỏng nghiệp vụ thực tế chuyên sâu** — không phụ thuộc dịch vụ bên ngoài của bên thứ ba.

---

## 🌟 Tổng quan Hệ Thống Tính Năng (Sprint 1 → Sprint 3)

Hệ thống được thiết kế và triển khai chặt chẽ theo đặc tả yêu cầu chức năng (Functional Requirements - FR) từ tài liệu tư vấn Business Value:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRẦM RESERVE PLATFORM                           │
├──────────────────────────┬─────────────────────────────────────────────┤
│   FRONTEND ĐẶT BÀN       │           ADMIN DASHBOARD & VẬN HÀNH        │
│   (Khách hàng trải nghiệm)│           (Quản trị, Bếp trưởng & CRM)     │
├──────────────────────────┼─────────────────────────────────────────────┤
│ • Câu chuyện Haute Cuisine│ • Sơ đồ 12 bàn theo ca (Live Floor Map)     │
│ • Menu Tasting & Pairing │ • Quản lý Đặt bàn & Danh sách chờ (Waitlist)│
│ • Booking Wizard 5 bước  │ • Báo cáo Doanh thu & Dự báo Chi phí (FR-33)│
│ • Table Hold (10 phút)   │ • Công thức định mức BOM 7 món (FR-27)      │
│ • Nhận diện Khách quen   │ • Kiểm soát Food Cost trần 50% (FR-28, 33)  │
│ • Miễn cọc VIP (Nam Trầm)│ • Quản lý Kho & Danh sách mua trước ca (32) │
│ • Áp Voucher tự động(37) │ • Khung Giờ Vàng T4-T6 Zalo OA (FR-34)      │
│ • Khảo sát 5 sao (/survey)│ • CRM Khách hàng & Gu Ẩm thực (FR-19, 38)   │
│                          │ • Mô phỏng What-if với Slider kép (FR-39)   │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 📋 Danh mục Chi tiết Yêu cầu Chức năng (FR-01 → FR-39)

### 1. Giai đoạn Cốt lõi: Đặt bàn Trực tuyến & Vận hành Ca (Sprint 1)
| Mã FR | Tên tính năng | Mô tả nghiệp vụ chi tiết |
| :---: | :--- | :--- |
| **FR-01 – FR-05** | **Trải nghiệm Thương hiệu & Menu** | Giới thiệu câu chuyện ẩm thực Trầm Hương; Menu Tasting 7 món (1.190.000 đ/khách); Gói Wine Pairing (650.000 đ) & Tea Pairing (350.000 đ). |
| **FR-06 – FR-10** | **Booking Wizard 5 bước & Table Hold** | Luồng đặt bàn chuẩn mực 5 bước: (1) Ngày & Khung giờ → (2) Chọn vị trí bàn theo sơ đồ 12 bàn → (3) Chọn đồ uống Pairing → (4) Thông tin khách & dị ứng → (5) Thanh toán cọc.<br/>*Cơ chế Table Hold 10 phút khóa bàn tạm thời chống xung đột đặt trùng chỗ.* |
| **FR-11 – FR-14** | **Đặt cọc & Dòng thời gian nhắc lịch** | Đặt cọc 300.000 đ/khách qua cổng mô phỏng 2 bước (QR Pay / Thẻ VIP); Hoàn cọc nếu hủy trước 48h; Dòng thời gian nhắc lịch tự động trước 48h và 24h qua Zalo/SMS. |
| **FR-15 – FR-18** | **Waitlist & Quản trị Bàn theo ca** | Danh sách chờ thông minh tự động kích hoạt khi ca kín 100% chỗ, quản trị mời khách 1 chạm khi có bàn hủy; Sơ đồ 12 bàn hiển thị thời gian thực theo 2 khung giờ (17:30 & 19:45), check-in và đánh dấu No-show. |

---

### 2. Giai đoạn Nâng cao: CRM Khách hàng Thân thiết & Khảo sát 5 sao (Sprint 2)
| Mã FR | Tên tính năng | Mô tả nghiệp vụ chi tiết |
| :---: | :--- | :--- |
| **FR-19** | **Hồ sơ Khách hàng Tích lũy** | Quản lý danh bạ khách, số lần ghé thăm, tổng chi tiêu tích lũy, phân loại hạng thành viên, ghi chú dị ứng và sở thích bàn ngồi. |
| **FR-20** | **Tích điểm Hóa đơn** | Tích lũy 1.000 đ = 1 điểm thưởng (pts); nhân hệ số thưởng 5% (hạng Trầm) và 8% (hạng Nam Trầm) khi hoàn tất bữa ăn. |
| **FR-21** | **Chương trình 3 Hạng Thành viên** | Phân hạng tự động theo chuẩn Bảng 8 nhóm 8: **Hương** (0–2 bữa), **Trầm** (3–5 bữa), **Nam Trầm** (≥ 6 bữa dùng tiệc). |
| **FR-22** | **Đặc quyền Miễn cọc Thượng khách** | Thực khách Hạng Nam Trầm khi nhập SĐT tại bước đặt bàn được hệ thống tự động nhận diện và **miễn 100% tiền cọc 300.000 đ/khách**. |
| **FR-23** | **Khảo sát Trải nghiệm 5 sao** | Trang đánh giá độc lập `/survey/[code]` sau bữa tiệc với 4 tiêu chí Fine Dining: Món ăn, Phục vụ, Không gian, Đồ uống; Tặng 200 điểm thưởng khi gửi đánh giá. |
| **FR-24** | **Thống kê Khảo sát & Google Maps** | Bảng phân tích chỉ số hài lòng (CSAT), phân bổ điểm sao, danh sách nhận xét; Đồng bộ dữ liệu đánh giá Google Maps Places API mô phỏng. |
| **FR-25** | **Chiến dịch Mời lại Thực khách** | Tự động phát hiện khách quen ≥ 21 ngày chưa quay lại; Soạn sẵn kịch bản mời tiệc Zalo ZNS và Email Marketing VIP. |
| **FR-26** | **Thông báo Thăng hạng Tự động** | Tự động gửi thiệp chúc mừng và quà tặng nâng hạng khi khách chạm ngưỡng 3 bữa (Lên Trầm) hoặc 6 bữa (Lên Nam Trầm). |

---

### 3. Giai đoạn Tối ưu: Định mức BOM, Food Cost, Kho & Khung Giờ Vàng (Sprint 3)
| Mã FR | Tên tính năng | Mô tả nghiệp vụ chi tiết |
| :---: | :--- | :--- |
| **FR-27** | **Định mức Công thức BOM 7 món** | Quản lý Bill of Materials chi tiết từng gram/ml cho 25 nguyên vật liệu cao cấp; Tự động co giãn (scale) định lượng linh hoạt theo số khách (2–8 khách). |
| **FR-28** | **Kiểm soát Food Cost Trần 50%** | Kiểm soát chi phí nguyên vật liệu không vượt quá 50% giá bán menu tasting chuẩn fine dining; Cảnh báo 3 hướng xử lý khi vượt ngưỡng. |
| **FR-29 & FR-31** | **Quản lý Tồn kho & Điểm đặt hàng lại** | Theo dõi tồn kho thực tế, nhập kho tức thời, thiết lập ngưỡng cảnh báo đặt hàng lại (Reorder Point) cho từng nguyên vật liệu. |
| **FR-32** | **Danh sách Mua trước ca cho Bếp trưởng** | Tự động đối chiếu: `Số lượng thiếu = max(0, Nhu cầu ca - Tồn kho)`. Chỉ xuất nguyên liệu thiếu > 0 kèm chi phí mua; Nút **"Sao chép danh sách mua"** dựng sẵn text gửi NCC qua Zalo/Email. |
| **FR-33** | **KPI Food Cost 2 tầng & Dự báo** | • **Tầng 1**: Giá vốn nguyên liệu / khách = Σ(định lượng × đơn giá) trên 7 món.<br/>• **Tầng 2**: Food Cost % = (Giá vốn ÷ Giá menu) × 100 ≤ 50%.<br/>*Tách biệt hoàn toàn doanh thu gói Pairing bổ trợ ra khỏi mẫu số tính food cost.* |
| **FR-34** | **Chiến dịch Khung Giờ Vàng (Golden Hour)** | Giám sát các ca chiều Thứ 4, Thứ 5, Thứ 6 lúc 17:30 có tỷ lệ lấp đầy thấp (15% – 50%); Kích hoạt tung voucher giảm 15% Menu qua Zalo OA để kéo khách kín bàn. |
| **FR-37** | **Tự động Giảm giá Voucher** | Nhập mã voucher tại Bước 5 đặt bàn; Hệ thống tự tính chiết khấu, hiển thị dòng giảm tiền màu xanh lá (`- 276.000 đ`) và tự động cập nhật lại số tiền cọc 50%. |
| **FR-38** | **Voucher Giữ chân Theo Gu Ẩm thực** | Đọc dữ liệu lịch sử món ăn (FR-36) để phân loại khẩu vị: **Gu Thanh Nhã** (Trà & Bánh `COMBO-TEA15`: Giảm 15% + Miễn phí 100% Set Trà Bánh 350k); **Gu Sành Vang** (`COMBO-WINE15`: Giảm 15% Combo Menu + Vang + Tặng ly vang tráng miệng); Khách mới (`WELCOME10`: 10%).<br/>*Ràng buộc: Khách cũ luôn được giảm cao hơn khách mới; Khóa cứng duy nhất 1 voucher/đơn.* |
| **FR-39** | **Mô phỏng What-if với Thanh trượt Kép** | Nâng cấp công cụ phân tích kịch bản tài chính với **2 thanh trượt ngang linh hoạt**: Giá Menu (800k – 2.000k) và Giá Vốn (±100k); Tự động cập nhật thời gian thực đường kẻ trần đỏ 50% trên Biểu đồ Cột Chồng Recharts, độ lệch dịch chuyển Δ và tác động dòng tiền 1 ca 42 khách. |

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server & Client Components)
- **UI Library**: React 19, [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **State & Animation**: [Framer Motion](https://www.framer.com/motion/) (Chuyển cảnh mượt mà, layout transitions)
- **Charts**: [Recharts](https://recharts.org/) (Biểu đồ cột chồng What-if, phân bổ rating, xu hướng occupancy)
- **Icons & Notifications**: [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)
- **Database & ORM**: [SQLite](https://www.sqlite.org/) + [Prisma ORM 6](https://www.prisma.io/)
- **Testing & Tooling**: Playwright, Python-docx (Sinh báo cáo Word tự động), TypeScript 5.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### Yêu cầu môi trường
- **Node.js**: Phiên bản 20 trở lên (hoặc Bun 1.x)
- **Trình duyệt**: Chrome, Edge, Safari hoặc Firefox hiện đại

### Các bước khởi chạy
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Đồng bộ lược đồ cơ sở dữ liệu SQLite
npm run db:push

# 3. Nạp dữ liệu giả lập chuẩn nghiệp vụ 4 tuần (Seed Data)
npm run db:seed

# 4. Khởi động máy chủ phát triển (Port 3000)
npm run dev
```

Truy cập hệ thống tại: **`http://localhost:3000`**

### Thông tin Đăng nhập Quản trị
- Nhấp vào nút **`Quản trị`** trên thanh điều hướng đầu trang.
- **Mã truy cập quản trị (Demo Gate):** `TRAM2025`

---

## 💼 Thông Số Nghiệp Vụ Cố Định (Business Constants)

Các chỉ số tài chính và vận hành của TRẦM Reserve được quy chuẩn đồng nhất trong toàn bộ hệ thống (`src/lib/tram/constants.ts`):

- **Quy mô nhà hàng**: 12 bàn / 42 chỗ ngồi (B01–B05: bàn 2 chỗ, B06–B10: bàn 4 chỗ, B11–B12: bàn 6 chỗ).
- **Lịch phục vụ**: Mở cửa từ Thứ Ba đến Chủ Nhật (Thứ Hai nghỉ); Mỗi tối 2 ca phục vụ: **17:30** và **19:45**.
- **Đơn giá thực đơn Tasting**: `1.190.000 đ/khách` (Set 7 món "Hành trình vị Việt").
- **Gói Đồ uống Pairing**: Wine Pairing `+650.000 đ/khách`, Tea Pairing `+350.000 đ/khách`.
- **Chính sách Đặt cọc**: `300.000 đ/khách`; Miễn cọc 100% cho khách Hạng Nam Trầm (≥ 6 lần dùng bữa).
- **Ngưỡng an toàn Food Cost**: Trần tối đa **≤ 50%** doanh thu thực đơn menu.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
BusinessValue_TramDine/
├── db/                                # Cơ sở dữ liệu SQLite local (custom.db)
├── docs/                              # Tài liệu đồ án, kế hoạch & ảnh chụp nghiệm thu
│   ├── screenshots/                   # Hình ảnh minh chứng tính năng thực tế (FR-19..FR-39)
│   └── BAO_CAO_NGHIEM_THU_*.docx      # Báo cáo nghiệm thu Word tự động sinh
├── prisma/
│   ├── schema.prisma                  # Lược đồ quan hệ: Table, Reservation, Survey, Waitlist...
│   └── seed.ts                        # Script sinh dữ liệu giả lập 4 tuần chuẩn nghiệp vụ
├── scripts/
│   ├── capture_sprint3.py             # Script chụp màn hình tự động bằng Playwright
│   └── generate_sprint3_docx.py       # Script sinh tài liệu Báo cáo nghiệm thu chuẩn Word
├── src/
│   ├── app/                           # Next.js App Router (page.tsx, layout, API routes)
│   │   ├── api/                       # REST APIs: reservations, customers, food-cost, inventory...
│   │   └── survey/[code]/             # Trang khảo sát độc lập 5 sao cho khách
│   ├── components/
│   │   ├── tram/
│   │   │   ├── booking/               # Luồng đặt bàn Booking Wizard 5 bước (booking-wizard.tsx)
│   │   │   ├── admin/                 # Phân hệ Quản trị (dashboard, customers, food-cost, inventory...)
│   │   │   │   ├── food-cost-kpi-widget.tsx   # Widget Food Cost & Mô phỏng What-if với Slider kép
│   │   │   │   ├── shift-purchase-card.tsx    # Card Danh sách mua trước ca cho Bếp trưởng
│   │   │   │   ├── golden-hour-view.tsx       # Bảng điều khiển Khung Giờ Vàng Zalo OA
│   │   │   │   └── re-engagement-dialog.tsx   # Modal Chiến dịch mời lại kèm Voucher theo gu
│   │   │   └── home-view.tsx          # Giao diện Trang chủ & Menu Tasting 7 món
│   │   └── ui/                        # Bộ thư viện UI primitives (shadcn/ui, Radix UI)
│   ├── hooks/
│   │   └── use-booking-wizard.ts      # State machine quản lý toàn bộ luồng đặt bàn & tính voucher
│   └── lib/tram/                      # Core business logic & thuật toán nghiệp vụ
│       ├── constants.ts               # Hằng số thực đơn, bàn, giá cọc
│       ├── food-cost.ts               # Phép tính KPI Food cost 2 tầng & trần 50%
│       ├── purchase.ts                # Thuật toán đối chiếu tồn kho & xuất danh sách mua (FR-32)
│       ├── vouchers.ts                # Thuật toán phân tích gu món ăn & tính giảm giá (FR-37, FR-38)
│       ├── loyalty.ts                 # Quy tắc tích điểm & phân hạng 3 bậc (Hương, Trầm, Nam Trầm)
│       └── recipes.ts                 # Danh mục 25 nguyên liệu & định mức BOM 7 món
└── README.md                          # Tài liệu hướng dẫn dự án (File này)
```

---

## 📌 Ghi Chú Bản Quyền & Học Thuật
- Toàn bộ sản phẩm được xây dựng phục vụ mục đích nghiên cứu, học tập và nghiệm thu đề tài môn học **Business Value**.
- Dữ liệu khách hàng, hóa đơn thanh toán và các chiến dịch gửi tin nhắn đều mang tính chất mô phỏng giả lập logic thực tế, tuân thủ tiêu chuẩn an toàn dữ liệu.
