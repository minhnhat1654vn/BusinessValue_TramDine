# TRẦM Reserve (TramDine) — Hệ Thống Quản Trị & Vận Hành Fine Dining Đương Đại

> **Đồ án môn Business Value & Digital Operations**  
> Dự án mô phỏng toàn diện giải pháp chuyển đổi số cho nhà hàng ẩm thực cao cấp **TRẦM Reserve** — mô hình Haute Cuisine / Fine Dining quy mô **15 bàn (40 chỗ ngồi/ca)** (*A01–A05*: 5 bàn 2 chỗ dãy cửa sổ; *B01–B10*: 10 bàn 3 chỗ khu trung tâm quanh bếp mở), phục vụ Bộ Thực đơn Tasting Menu 7 món *"Tiến Vua · Bảy Báu Vật Việt"* với giá niêm yết **1.440.000 đ/khách**.

Hệ thống vận hành theo kiến trúc **Local-first**, cơ sở dữ liệu SQLite độc lập qua Prisma ORM, toàn bộ cổng thanh toán đặt cọc, cơ chế giữ bàn chống xung đột (*Table Hold* 10 phút), thuật toán định mức BOM 7 món 26 nguyên liệu, kiểm soát Food Cost 2 tầng, danh sách mua nguyên liệu trước ca và quy trình chăm sóc khách hàng tự động (*Zalo ZNS / Email / Khảo sát 5 sao*) đều được **mô phỏng nghiệp vụ thực tế chuyên sâu** — không phụ thuộc dịch vụ bên thứ ba.

---

## 🌟 Bản Đồ Tính Năng Theo 2 Vai Trò Nghiệp Vụ (2 Roles)

Hệ thống được thiết kế phân định rành mạch giữa **Trải nghiệm Thực khách (Customer Experience)** và **Vận hành Quản trị (Admin & Operations)**, đáp ứng đầy đủ **33 yêu cầu chức năng (33 FR)**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                TRẦM RESERVE PLATFORM                                   │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│   ROLE 1: KHÁCH HÀNG (CUSTOMER EXPERIENCE)│   ROLE 2: BAN QUẢN LÝ & BẾP TRƯỞNG (ADMIN) │
│   Trải nghiệm Đặt bàn & Hậu mãi cá nhân   │   Vận hành Ca, Kho nguyên liệu & Tài chính │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Câu chuyện Haute Cuisine & 7 Món Tiến Vua│ • Dashboard Doanh thu & Công suất ca (40 chỗ)│
│ • Booking Wizard 6 bước chuẩn mực         │ • Sơ đồ 15 bàn Live & Điều phối ca phục vụ │
│ • Sơ đồ 15 bàn trực quan & Table Hold 10p │ • Quản lý Danh sách chờ thông minh (Waitlist)│
│ • Tùy biến món & Tea pairing (350.000 đ)  │ • Quản lý Định mức BOM 7 món (26 nguyên liệu)│
│ • Ghi nhận dị ứng thực phẩm & Dịp kỷ niệm │ • Kiểm soát Food Cost 34,7% (Khung duyệt 28-35%)│
│ • Tự động nhận diện Khách quen qua SĐT    │ • Đối chiếu tồn kho & Xuất danh sách mua ca│
│ • Áp Voucher tự động (COMBO-TEA15, v.v.)  │ • Khung Giờ Vàng Zalo OA ca 17:30 T4–T6    │
│ • Đặc quyền Miễn cọc 100% VIP Nam Trầm    │ • Mô phỏng What-if với Vạch trần đỏ 35%   │
│ • Khảo sát đánh giá 5 sao (/survey/[code])│ • CRM Thực khách, Mời lại sau 21 ngày      │
│ • Tích lũy điểm thưởng & Thăng 3 hạng thẻ │ • Cài đặt mở/đóng ngày định kỳ (Thứ 2 & 3) │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 📑 Danh Mục 33 Yêu Cầu Chức Năng (33 Functional Requirements)

Toàn bộ hệ thống được quy hoạch thành **33 Yêu Cầu Chức Năng** chuẩn hóa, khớp 100% với Báo cáo Đồ án Chương 4 và Bảng Thông số Demo (`TRAM_Mo_hinh_tai_chinh_2025-2029_VI.pdf`):

| Nhóm nghiệp vụ | Mã FR | Tên yêu cầu chức năng | Phân hệ thực thi |
| :--- | :---: | :--- | :--- |
| **I. ĐẶT BÀN & VẬN HÀNH**<br/>*(18 FRs: FR-01 → FR-18)* | **FR-01** | Trình bày không gian trải nghiệm & Câu chuyện thương hiệu Fine Dining | Trang chủ (`home-view.tsx`) |
| | **FR-02** | Khám phá Thực đơn Tasting Menu 7 món *"Tiến Vua · Bảy Báu Vật Việt"* | Trang chủ & Wizard Step 3 |
| | **FR-03** | Hiển thị chi tiết nguyên liệu, câu chuyện ẩm thực & hình ảnh từng món | Dialog chi tiết món ăn |
| | **FR-04** | Tùy biến công thức & khẩu vị ẩm thực theo từng khách (Custom Options) | Wizard Step 3 (`booking-wizard.tsx`) |
| | **FR-05** | Giới thiệu & Lựa chọn gói Tea Pairing độc bản (+350.000 đ/khách) | Trang chủ & Wizard Step 4 |
| | **FR-06** | Chọn ngày dùng tiệc (Thứ Tư → Chủ Nhật) & Ca phục vụ (17:30 / 19:45) | Wizard Step 1 (`booking-wizard.tsx`) |
| | **FR-07** | Chọn số lượng khách & Kiểm soát quy mô tối đa 3 khách mỗi bàn | Wizard Step 1 (`booking-wizard.tsx`) |
| | **FR-08** | Sơ đồ mặt bằng tương tác kiến trúc 15 bàn (5 bàn A, 10 bàn B) | Wizard Step 2 & Admin Table Map |
| | **FR-09** | Khóa giữ bàn tạm thời 10 phút chống xung đột session (Table Hold) | `/api/table-hold` & Wizard Step 2 |
| | **FR-10** | Đăng ký Danh sách chờ thông minh (Waitlist) khi kín chỗ hoặc ghép bàn | `/api/waitlist` & `waitlist-panel.tsx` |
| | **FR-11** | Ghi nhận thông tin liên hệ, dịp kỷ niệm đặc biệt & dị ứng thực phẩm | Wizard Step 4 (`booking-wizard.tsx`) |
| | **FR-12** | Tự động nhận diện hồ sơ khách hàng & hạng thành viên qua SĐT | Wizard Step 4 & `use-booking-wizard.ts` |
| | **FR-13** | Tính toán tiền đặt cọc 300.000 đ/khách & chính sách hoàn cọc 48h | Wizard Step 5 & `vouchers.ts` |
| | **FR-14** | Áp dụng mã Voucher tự động theo gu (`COMBO-TEA15`, `WELCOME10`, Giờ Vàng) | Wizard Step 5 & `vouchers.ts` |
| | **FR-15** | Cổng thanh toán giả lập đa phương thức (VietQR / Thẻ quốc tế Visa/Master) | Wizard Step 5 (`booking-wizard.tsx`) |
| | **FR-16** | Cấp mã đặt bàn độc nhất dạng `TR-XXXXXX` kèm tóm tắt đơn tiệc | Wizard Step 6 (`completion-view.tsx`) |
| | **FR-17** | Dashboard quản trị doanh thu, lượt đặt & tỷ lệ lấp đầy ca (40 chỗ) | Admin Dashboard (`dashboard.tsx`) |
| | **FR-18** | Sơ đồ 15 bàn Live & Điều phối ca 1 chạm (Check-in, Hoàn tất, No-show, Hủy) | Admin Booking (`booking-unified-view.tsx`) |
| **II. CRM & THÀNH VIÊN**<br/>*(8 FRs: FR-19 → FR-26)* | **FR-19** | Quản lý cơ sở dữ liệu hồ sơ thực khách, lịch sử chi tiêu & khẩu vị | Admin CRM (`crm-view.tsx`) |
| | **FR-20** | Phân hạng 3 bậc thành viên Fine Dining: Hương, Trầm, Nam Trầm | Core Loyalty (`loyalty.ts`) |
| | **FR-21** | Tích lũy điểm thưởng ẩm thực (1.000 đ = 1 pts) kèm hệ số nhân hạng thẻ | Core Loyalty (`loyalty.ts`) |
| | **FR-22** | Đặc quyền Thượng khách Hạng Nam Trầm: Miễn 100% tiền đặt cọc | Wizard Step 5 & Admin Booking |
| | **FR-23** | Trang khảo sát đánh giá 5 sao độc lập sau bữa tiệc (`/survey/[code]`) | `/survey/[code]` & Survey Modal |
| | **FR-24** | Tự động thưởng 200 điểm tích lũy khi hoàn tất phiếu khảo sát dịch vụ | `/api/surveys` |
| | **FR-25** | Chiến dịch tự động mời lại thực khách vắng mặt $\ge 21$ ngày qua ZNS/Email | Admin CRM (`crm-view.tsx`) |
| | **FR-26** | Kích hoạt thông báo thăng hạng tự động kèm voucher quà tặng cá nhân hóa | Admin CRM (`crm-view.tsx`) |
| **III. BẾP & KHO NGUYÊN LIỆU**<br/>*(7 FRs: FR-27 → FR-33)* | **FR-27** | Quản trị định mức kỹ thuật BOM 7 món trên 26 nguyên liệu cao cấp | Admin BOM (`recipes-bom-view.tsx`) |
| | **FR-28** | Kiểm soát giá vốn chuẩn 472.975 đ/khách & KPI Food Cost 34,70% | Core Food Cost (`food-cost.ts`) |
| | **FR-29** | Quản trị tồn kho thời gian thực & Cảnh báo điểm đặt hàng lại (Reorder Point) | Admin Kho (`inventory-view.tsx`) |
| | **FR-30** | Quản lý biến thể công thức (Default/Custom) & Nhập/Xuất BOM JSON/Excel | Admin BOM (`recipes-bom-view.tsx`) |
| | **FR-31** | Cảnh báo thiếu hụt nguyên vật liệu theo dự báo đặt bàn thực tế | `/api/inventory/demand-forecast` |
| | **FR-32** | Báo cáo mua hàng trước ca cho Bếp trưởng (Shift Purchase) & tin Zalo/Email | Admin Mua hàng (`shift-purchase-card.tsx`) |
| | **FR-33** | Mô phỏng tài chính What-if với thanh trượt kép & Vạch trần đỏ 35% | Admin What-if (`food-cost-kpi-widget.tsx`) |

---

## 👤 ROLE 1: TRẢI NGHIỆM THỰC KHÁCH (CUSTOMER EXPERIENCE)

Phân hệ dành cho thực khách trải nghiệm hành trình ẩm thực từ lúc khám phá thực đơn, tự đặt bàn trực tuyến đến dịch vụ chăm sóc và khảo sát hậu mãi.

### 1. Khám Phá Câu Chuyện Thương Hiệu & Thực Đơn 7 Món (FR-01 → FR-05)
* **Brand Storytelling (FR-01)**: Giao diện trượt full-page cuốn hút giới thiệu triết lý ẩm thực Trầm Hương cao cấp, không gian kiến trúc tĩnh lặng giữa lòng Quận 3, TP. Hồ Chí Minh.
* **Tasting Menu 7 món *"Tiến Vua · Bảy Báu Vật Việt"* (FR-02, FR-03)**: Giá niêm yết cố định **1.440.000 đ/khách** với 7 chương ẩm thực tinh tế:
  1. **Tuyết Cá Tầm**: Trứng cá tầm caviar Lâm Đồng ủ lạnh hảo hạng, mở lọ trang trọng và phục vụ trực tiếp tại bàn.
  2. **Sá Sùng Muối Tiêu**: Báu vật bãi triều Vân Đồn từng tiến vua nướng giòn điểm xuyết muối tiêu rừng thơm nồng.
  3. **Bào Ngư Om Rượu Nếp**: Bào ngư biển Nha Trang om đượm men rượu nếp cái hoa vàng sóng sánh ngậy thơm.
  4. **Canh Ngọc Yến**: Yến sào đảo yến Khánh Hòa hòa cùng hạt sen Cổ Ngự Hồ Tây, nghi thức rót nước dùng thanh nhã tại bàn.
  5. **Thịt Ngọc Áp Chảo**: Thăn phi-lê cá tầm áp chảo xém vàng, da giòn thịt mọng — sử dụng trọn vẹn cùng một con cá với món Tuyết Cá Tầm mở đầu.
  6. **Đông Tảo Quay Mắc Khén**: Gà tiến vua Đông Tảo Hưng Yên da giòn thơm nồng mắc khén rừng, dùng kèm cơm cháy gạo tiến vua ST25.
  7. **Trầm và Sen**: Nhãn lồng bọc hạt sen cung đình kết hợp nghi thức trà Shan tuyết cổ thụ 300 năm 3 lần rót.
* **Tùy biến món ăn theo khẩu vị (FR-04)**: Tùy biến chi tiết cách chế biến cho từng món (VD: mở hộp caviar tại bàn, giảm độ nồng rượu, thêm hạt sen Cổ Ngự, ít ngọt thanh tao).
* **Gói Tea Pairing độc bản (FR-05)**: Tuyển tập 4 tầng danh trà Việt (**+350.000 đ/khách**), nâng đỡ trọn vẹn hương vị món ăn mà không dùng cồn. Mục tiêu 50% thực khách lựa chọn. *(Gói Wine pairing đã ngừng phục vụ theo spec demo mới)*.

### 2. Quy Trình Đặt Bàn Trực Tuyến 6 Bước (Booking Wizard) (FR-06 → FR-16)
* **Bước 1: Ngày, Khung giờ & Số lượng khách (FR-06, FR-07)**:
  * Chọn ngày dùng tiệc trong lịch mở cửa **Thứ Tư → Chủ Nhật** (hệ thống tự động chặn Thứ Hai và Thứ Ba nghỉ định kỳ).
  * Lựa chọn 1 trong 2 khung giờ phục vụ tinh hoa: **17:30** hoặc **19:45**.
  * Chọn số lượng khách: **Tối đa 3 khách mỗi bàn**. Đoàn $> 3$ khách: nhà hàng hiển thị thông báo hướng dẫn đăng ký Danh sách chờ để lễ tân liên hệ xếp bàn ghép chu đáo.
* **Bước 2: Chọn Bàn Trực Quan & Giữ Bàn Tạm Thời (FR-08, FR-09, FR-10)**:
  * Hiển thị Sơ đồ tương tác kiến trúc gồm đúng **15 bàn chuẩn mực**:
    * **Dãy A (Dãy cửa sổ)**: 5 bàn vuông gỗ tự nhiên 2 chỗ (*A01–A05* = 10 chỗ ngồi).
    * **Khu B (Khu trung tâm)**: 10 bàn 3 chỗ bố trí quanh Bếp Mở (*B01–B10* = 30 chỗ ngồi).
    * **Tổng công suất**: Đúng 15 bàn — **40 chỗ ngồi mỗi ca**.
  * **Cơ chế Table Hold 10 phút (FR-09)**: Tự động khóa giữ bàn theo session trình duyệt, ngăn chặn hoàn toàn việc đặt trùng bàn giữa nhiều khách hàng cùng lúc.
  * **Danh sách chờ Waitlist (FR-10)**: Tự động kích hoạt khi khung giờ kín chỗ (40/40 khách) hoặc khi khách đi đoàn đông cần ghép bàn.
* **Bước 3: Chi Tiết & Tùy Biến Thực Đơn (FR-03, FR-04)**:
  * Xem thẻ ảnh món, nguồn gốc địa phương và chọn các tùy biến gia vị/cách nấu theo sở thích.
* **Bước 4: Thông Tin Thực Khách, Pairing & Dị Ứng (FR-11, FR-12)**:
  * Nhập họ tên, số điện thoại, email liên hệ.
  * Tự động tra cứu hồ sơ tích lũy, số lần dùng bữa và hạng thẻ thành viên ngay khi nhập SĐT.
  * Chọn gói Pairing thức uống (Không pairing / Tea pairing 350.000 đ).
  * Ghi chú dị ứng thực phẩm (Hải sản, Đậu phộng, Gluten, Không cồn...) và dịp kỷ niệm (Sinh nhật, Hẹn hò, Tiếp đối tác).
* **Bước 5: Áp Dụng Voucher & Thanh Toán Đặt Cọc (FR-13, FR-14, FR-15)**:
  * **Hệ thống Voucher thông minh (FR-14)**: Tự động áp dụng mã ưu đãi theo gu ẩm thực: `COMBO-TEA15` (giảm 15% gói trà), `WELCOME10` (giảm 10% khách mới), `Giờ Vàng 15%` (ca 17:30 T4–T6).
  * **Đặt cọc tiêu chuẩn (FR-13)**: Mức cọc **300.000 đ/khách**.
  * **Đặc quyền VIP Nam Trầm (FR-22)**: Thực khách hạng Nam Trầm ($\ge 6$ bữa tiệc) được hệ thống **miễn 100% tiền cọc (0 đ)**.
  * **Cổng thanh toán giả lập (FR-15)**: Mô phỏng thanh toán chuyển khoản QR VietQR hoặc Thẻ thanh toán quốc tế Visa/MasterCard kèm phản hồi xác thực giao dịch thời gian thực.
* **Bước 6: Xác Nhận Đặt Chỗ Thành Công (FR-16)**:
  * Cấp mã đặt bàn độc nhất (VD: `TR-892401`), tóm tắt đầy đủ bàn tiệc, khung giờ, thực đơn, gói pairing và mã QR xác nhận.
  * Quy định hoàn cọc: Hoàn tiền 100% nếu thông báo hủy trước giờ tiệc $\ge 48$ tiếng.

### 3. Khảo Sát Đánh Giá 5 Sao & Dịch Vụ Hậu Mãi (FR-23 → FR-26)
* **Trang Khảo Sát Độc Lập (`/survey/[code]`) (FR-23)**:
  * Sau khi hoàn tất bữa tiệc (trạng thái `SEATED` hoặc `COMPLETED`), khách mở link khảo sát theo mã đặt bàn để chấm điểm 5 sao cho 4 tiêu chí cốt lõi: **Chất lượng món ăn**, **Không gian & Âm nhạc**, **Tác phong phục vụ**, và **Đồ uống Pairing**.
  * Để lại nhận xét trải nghiệm thực tế; hệ thống tự động cộng ngay **200 điểm thưởng (pts)** vào tài khoản thành viên (FR-24).
* **Chương Trình 3 Hạng Thành Viên Fine Dining (FR-20, FR-21, FR-22)**:
  * **Hạng Hương** (0–2 lần dùng tiệc): Tích lũy 1.000 đ = 1 điểm.
  * **Hạng Trầm** (3–5 lần dùng tiệc): Tặng thưởng thêm **+5% điểm**, ưu tiên giữ bàn giờ cao điểm.
  * **Hạng Nam Trầm** ($\ge 6$ lần dùng tiệc): Thượng khách cao cấp nhất, tặng thêm **+8% điểm**, **miễn 100% tiền đặt cọc**, nhận thiệp tri ân và phục vụ riêng biệt từ Bếp trưởng.

---

## 👨‍🍳 ROLE 2: BAN QUẢN LÝ & BẾP TRƯỞNG (ADMIN & OPERATIONS)

Phân hệ dành riêng cho Giám đốc vận hành, Quản lý nhà hàng, Bếp trưởng (Executive Chef) và Thu ngân điều phối toàn diện hoạt động kinh doanh, kho bãi và tài chính.

* **Cổng Đăng Nhập Quản Trị**: Nhấn nút "Quản trị" trên thanh Header, nhập mã PIN quản trị an toàn: **`123456`** (hoặc `TRAM2025`).

### 1. Bảng Điều Khiển Tổng Quan & Doanh Thu (Dashboard) (FR-17)
* Giám sát thời gian thực:
  * Doanh thu ca / ngày / 4 tuần quanh mốc demo (tháng 3/2027).
  * **Tỷ lệ lấp đầy (Occupancy Rate)**: Tính toán chính xác theo công thức:
    $$\text{Tỷ lệ lấp đầy} = \frac{\text{Số khách thực tế}}{40\text{ chỗ}} \times 100\%$$
  * Biểu đồ Recharts 2 ca (17:30 cột xanh biển, 19:45 cột hổ phách), hiển thị số khách trên đỉnh cột, đường mục tiêu 85% lấp đầy (**34 chỗ**), và cảnh báo ca đạt/chưa đạt.
  * Thống kê cơ cấu nguồn đặt bàn: **Web trực tuyến (~52%)**, **Hotline lễ tân (~30%)**, **Zalo OA (~18%)**.

### 2. Quản Trị Đặt Bàn & Sơ Đồ Bàn Theo Ca (Floor Management) (FR-18)
* **Sơ đồ 15 bàn theo thời gian thực**: Theo dõi trực quan hiện trạng bàn theo từng ca (17:30 và 19:45) cho toàn bộ 15 bàn (40 chỗ ngồi):
  * Dãy A (*A01–A05*): 5 bàn vuông × 2 chỗ = 10 chỗ ngồi.
  * Khu B (*B01–B10*): 10 bàn tròn × 3 chỗ = 30 chỗ ngồi.
  * Trạng thái hiển thị theo màu chuẩn mực: *Bàn trống* (vàng nhạt), *Đã đặt* (xanh/viền đỏ), *Đang phục vụ* (xanh ngọc), *Hoàn tất* (xám), *No-show* (đỏ).
* **Điều phối ca phục vụ 1 chạm**:
  * Tiếp đón và **Check-in** khách vào bàn, ghi nhận thời gian đón khách thực tế.
  * Chuyển trạng thái **Hoàn tất tiệc** sau khi khách dùng xong món tráng miệng.
  * Đánh dấu **No-show** (khách không đến) hoặc **Hủy đặt bàn** kèm quy trình hoàn cọc tự động theo quy định 48h.

### 3. Quản Lý Danh Sách Chờ (Waitlist Management) (FR-10)
* Quản lý tập trung các lượt đăng ký chờ khi ca kín chỗ (40/40 khách) hoặc khách đoàn trên 3 khách cần ghép bàn riêng.
* Hiển thị thứ tự hàng đợi (*Queue Position*), quy mô đoàn, khung giờ và ghi chú.
* Tính năng **Mời khách vào bàn**: Khi có bàn trống nhả ra, quản lý có thể kích hoạt duyệt chuyển khách từ Waitlist sang Đặt bàn chính thức chỉ với 1 cú click.

### 4. Định Mức BOM 7 Món & Kiểm Soát Food Cost (FR-27, FR-28, FR-30)
* **Công thức Định mức Kỹ thuật (Bill of Materials - BOM) (FR-27)**:
  * Quản lý chi tiết định lượng từng gram, ml, lá, cọng cho **26 loại nguyên vật liệu thượng hạng** (Trứng cá tầm caviar Lâm Đồng, Sá sùng Vân Đồn, Bào ngư Nha Trang, Yến sào Khánh Hòa, Cá tầm Đà Lạt, Gà Đông Tảo Hưng Yên, Sen Cổ Ngự, Nhãn lồng...).
  * Tự động co giãn (scale) định lượng linh hoạt theo số khách: [1 khách, 4 khách, 10 khách, 40 khách trọn ca].
* **Kiểm Soát KPI Food Cost 2 Tầng Chuẩn Mực (FR-28)**:
  * **Tầng 1 (Giá vốn / suất)**: $\sum(\text{Định lượng} \times \text{Đơn giá nhập kho})$ của 7 món = **472.975 đ/khách** (khớp chính xác 100% sheet BOM tài chính).
  * **Tầng 2 (Tỷ lệ Food Cost %)**: $(\text{Giá vốn} \div \text{Giá menu } 1.440.000\text{ đ}) \times 100 = \mathbf{34,70\%}$ (năm 2027).
  * Khung kiểm soát P&L duyệt trong khoảng **28% – 35%**, mục tiêu tối ưu **28%**, **vạch cảnh báo đỏ đặt tại 35%** (không phải 50%).
  * Tách biệt hoàn toàn doanh thu gói đồ uống Tea Pairing ra khỏi mẫu số tính food cost để phản ánh chính xác hiệu quả ẩm thực.
* **Quản lý biến thể & Nhập/Xuất BOM (FR-30)**:
  * Quản lý các biến thể món (Tiêu chuẩn / Tùy biến gia vị).
  * Nhập/Xuất cấu trúc BOM linh hoạt qua định dạng JSON và Excel.

### 5. Quản Lý Kho & Danh Sách Mua Hàng Trước Ca (FR-29, FR-31, FR-32)
* Quản lý kho thời gian thực cho toàn bộ danh mục 26 nguyên vật liệu; hỗ trợ cập nhật nhập kho và điều chỉnh tồn kho tức thì (FR-29).
* Thiết lập **Điểm đặt hàng lại (Reorder Point)**: Tự động gắn nhãn cảnh báo đỏ khi lượng tồn kho xuống dưới ngưỡng an toàn.
* **Danh sách Mua hàng Trước ca (Shift Purchase List) (FR-32)**:
  * Thuật toán tự động đối chiếu nhu cầu ca đầy (**40 khách**) với tồn kho:
    $$\text{Lượng cần mua} = \max(0, \text{Nhu cầu ca} - \text{Tồn kho})$$
  * Tự động tính tổng chi phí mua sắm dự kiến cho ca làm việc.
  * Nút **"Sao chép danh sách mua"**: Định dạng sẵn văn bản chuẩn mực gửi ngay cho nhà cung cấp thực phẩm qua Zalo OA hoặc Email chính thức.

### 6. Chiến Dịch Khung Giờ Vàng (Golden Hour Campaign)
* Hệ thống tự động giám sát các ca 17:30 ngày giữa tuần (Thứ Tư, Thứ Năm, Thứ Sáu) có tỷ lệ lấp đầy thấp ($15\% - 50\%$).
* Bảng điều khiển cho phép kích hoạt phát hành voucher giảm giá $15\%$ thực đơn Tasting (`Giờ Vàng 15%`) gửi qua Zalo OA đến tệp khách hàng tiềm năng, nhanh chóng nâng tỷ lệ lấp đầy đạt mục tiêu $85\%$.

### 7. Mô Phỏng Tài Chính What-If Với Thanh Trượt Kép (FR-33)
* Công cụ dự báo tài chính chuyên sâu với **2 thanh trượt ngang tương tác**:
  * Thanh trượt 1: Giá Menu Tasting (từ 800.000 đ đến 2.000.000 đ).
  * Thanh trượt 2: Biến động Giá vốn nguyên liệu ($\pm 100.000$ đ).
* Biểu đồ Cột Chồng Recharts cập nhật theo thời gian thực: hiển thị **vạch cảnh báo đỏ ở 35%** (không phải 50%), độ lệch $\Delta$, phần trăm lãi gộp và tác động dòng tiền cụ thể trên quy mô **1 ca đầy 40 khách**.

### 8. CRM Khách Hàng, Khảo Sát & Chiến Dịch Giữ Chân (FR-19, FR-25, FR-26)
* **Hồ Sơ Khách Hàng Tích Lũy (FR-19)**: Quản lý lịch sử chi tiêu, số lần ghé thăm, ghi chú khẩu vị, dị ứng và phân hạng 3 bậc (Hương, Trầm, Nam Trầm).
* **Chiến Dịch Mời Lại Thực Khách (FR-25)**: Tự động lọc danh sách khách quen $\ge 21$ ngày chưa quay lại; soạn sẵn kịch bản mời tiệc Zalo ZNS / Email Marketing kèm voucher cá nhân hóa theo khẩu vị (`COMBO-TEA15`, `WELCOME10`, `LOYAL15`).
* **Thông Báo Thăng Hạng Tự Động (FR-26)**: Hệ thống tự động kích hoạt thư chúc mừng và quà tặng nâng hạng khi khách chạm mốc 3 bữa hoặc 6 bữa.
* **Báo Cáo Chất Lượng Dịch Vụ CSAT**: Thống kê chỉ số hài lòng thực khách từ khảo sát 5 sao, phân bổ điểm sao theo từng tiêu chí và đồng bộ đánh giá Google Maps mô phỏng.

### 9. Cài Đặt Chương Trình Đặt Bàn (Booking Program Settings)
* Thiết lập tên chương trình thực đơn mùa, ngày bắt đầu và kết thúc áp dụng.
* Quản lý danh sách các ngày nghỉ đột xuất / bảo trì lễ tết.
* Nút gạt điều khiển: **"Mở phục vụ ngày nghỉ định kỳ (Thứ Hai & Thứ Ba)"** — cho phép mở thêm ca phục vụ khi có nhu cầu tiệc riêng của ban quản trị.

---

## 💼 Bảng Thông Số Nghiệp Vụ Chuẩn Toàn Dự Án

Toàn bộ hệ thống tuân thủ nghiêm ngặt các thông số cố định tại [`src/lib/tram/constants.ts`](file:///g:/BusinessValue_TramDine/src/lib/tram/constants.ts) và [`src/lib/tram/food-cost.ts`](file:///g:/BusinessValue_TramDine/src/lib/tram/food-cost.ts):

| Hạng mục thông số | Giá trị chuẩn hóa | Ghi chú nghiệp vụ |
| :--- | :--- | :--- |
| **Quy mô nhà hàng** | **15 bàn · 40 chỗ ngồi/ca** | • 5 bàn 2 chỗ (A01–A05: dãy cửa sổ = 10 chỗ)<br/>• 10 bàn 3 chỗ (B01–B10: khu trung tâm = 30 chỗ)<br/>• Tối đa 3 khách/bàn; đoàn > 3 khách đăng ký Waitlist ghép bàn |
| **Lịch hoạt động** | **Thứ Tư → Chủ Nhật** | Nghỉ định kỳ Thứ Hai và Thứ Ba; Phục vụ 2 ca tối: **17:30** & **19:45** |
| **Giá thực đơn Tasting** | **1.440.000 đ/khách** | Bộ thực đơn 7 món *"Tiến Vua · Bảy Báu Vật Việt"* |
| **Gói Tea Pairing** | **+350.000 đ/khách** | Tuyển tập 4 tầng danh trà Việt (mục tiêu 50% khách chọn; bỏ wine pairing) |
| **Voucher áp dụng** | **COMBO-TEA15, WELCOME10, Giờ Vàng 15%** | Giờ vàng 17:30 T4–T6; bỏ COMBO-WINE15 |
| **Chính sách Đặt cọc** | **300.000 đ/khách** | Hoàn cọc 100% nếu hủy trước $\ge 48$h; **Miễn cọc 100% cho hạng Nam Trầm** |
| **Giá vốn nguyên liệu BOM** | **472.975 đ/khách** | Định mức chuẩn 7 món trên 26 nguyên vật liệu tuyển chọn (khớp 100% sheet BOM) |
| **Tỷ lệ Food Cost KPI** | **34,70%** (2027) | Khung duyệt P&L 28–35%, mục tiêu 28%, **vạch cảnh báo đỏ ở 35%** |
| **Biểu đồ What-if** | **Vạch trần đỏ 35%** | Đánh giá tác động theo quy mô **ca đầy 40 khách** (không phải 30 khách) |
| **Mốc dữ liệu mẫu** | **Tháng 3/2027** | Giai đoạn hoạt động sau go-live (mốc go-live 01/2027) |
| **Mã PIN Quản trị** | **`123456`** (hoặc `TRAM2025`) | Cổng truy cập bảng điều khiển quản lý và bếp trưởng |

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

* **Nền tảng & Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions, API Routes, Turbopack)
* **Thư viện Giao diện**: React 19, [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
* **Hiệu ứng & Chuyển cảnh**: [Framer Motion](https://www.framer.com/motion/)
* **Trực quan hóa Dữ liệu**: [Recharts](https://recharts.org/) (Biểu đồ What-if cột chồng, occupancy chart, rating breakdown)
* **Biểu tượng & Thông báo**: [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)
* **Cơ sở Dữ liệu & ORM**: [SQLite](https://www.sqlite.org/) + [Prisma ORM 6](https://www.prisma.io/)
* **Ngôn ngữ & Kiểm thử**: TypeScript 5, Playwright, Python automation scripts.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
BusinessValue_TramDine/
├── db/                                # Cơ sở dữ liệu SQLite local & các file cấu hình nghiệp vụ
│   ├── booking-settings.json          # Cấu hình mùa thực đơn & chính sách ngày nghỉ
│   ├── concepts.json                  # Dữ liệu tuần concept thực đơn 7 món
│   ├── custom-customers.json          # Hồ sơ khách hàng tích lũy bổ sung
│   ├── golden-hour-campaigns.json     # Lịch sử chiến dịch Khung Giờ Vàng đã kích hoạt
│   ├── ingredient-prices.json         # Đơn giá nhập kho nguyên vật liệu
│   └── inventory-stock.json           # Tồn kho thực tế của 26 nguyên liệu
├── prisma/
│   ├── schema.prisma                  # Lược đồ quan hệ: Table, Reservation, Survey, Waitlist, DishRecipe, Ingredient...
│   ├── seed.ts                        # Script nạp 610 lượt đặt bàn, 15 bàn 40 chỗ, mốc tháng 3/2027
│   └── seed-bom.ts                    # Script nạp định mức BOM 7 món chuẩn Food Cost 34,70% (472.975 đ/khách)
├── public/                            # Hình ảnh 7 món concept 2, sơ đồ mặt bằng floorplan.jpg, logo.svg
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── api/                       # Hệ thống REST APIs chuyên sâu:
│   │   │   ├── admin/                 # APIs: stats (dashboard), golden-hour, settings
│   │   │   ├── availability/          # API tính toán bàn trống theo ngày/ca/số khách
│   │   │   ├── booking-settings/      # API cấu hình ngày mở cửa
│   │   │   ├── customers/             # API quản lý hồ sơ khách hàng
│   │   │   ├── food-cost/             # API kiểm soát food cost & BOM
│   │   │   ├── inventory/             # APIs: demand-forecast, purchase-list, stock-in
│   │   │   ├── recipes/               # APIs: concepts, export, import, ingredients, lines
│   │   │   ├── reservations/          # APIs: danh sách, check-in, hủy đặt bàn
│   │   │   ├── surveys/               # APIs: tiếp nhận đánh giá, google-maps sync
│   │   │   ├── table-hold/            # API khóa giữ bàn tạm 10 phút
│   │   │   └── waitlist/              # API đăng ký & duyệt danh sách chờ
│   │   ├── survey/[code]/             # Trang khảo sát độc lập 5 sao sau bữa tiệc
│   │   ├── layout.tsx                 # Root layout & providers
│   │   └── page.tsx                   # Trang chủ ứng dụng TRẦM Reserve
│   ├── components/
│   │   ├── tram/
│   │   │   ├── booking/               # Phân hệ Đặt bàn Thực khách:
│   │   │   │   ├── booking-wizard.tsx # Wizard đặt bàn 6 bước & Sơ đồ 15 bàn
│   │   │   │   ├── waitlist-panel.tsx # Màn hình đăng ký danh sách chờ
│   │   │   │   └── completion-view.tsx# Màn hình xác nhận thành công mã TR-XXXXXX
│   │   │   ├── admin/                 # Phân hệ Quản trị & Bếp trưởng:
│   │   │   │   ├── admin-view.tsx     # Shell giao diện quản trị tổng thể
│   │   │   │   ├── dashboard.tsx      # Dashboard doanh thu & công suất 40 chỗ
│   │   │   │   ├── booking-unified-view.tsx # Sơ đồ 15 bàn Live & danh sách lượt đặt
│   │   │   │   ├── table-map.tsx      # Sơ đồ điều phối bàn tiệc
│   │   │   │   ├── waitlist-manager.tsx# Quản lý hàng đợi Waitlist & mời khách
│   │   │   │   ├── recipes-bom-view.tsx# Quản trị định mức BOM 7 món 26 nguyên liệu
│   │   │   │   ├── food-cost-view.tsx # Báo cáo phân tích KPI Food Cost
│   │   │   │   ├── food-cost-kpi-widget.tsx # Biểu đồ What-if vạch trần đỏ 35%
│   │   │   │   ├── inventory-view.tsx # Quản lý kho nguyên liệu thời gian thực
│   │   │   │   ├── shift-purchase-card.tsx # Danh sách mua trước ca cho bếp trưởng
│   │   │   │   ├── golden-hour-view.tsx# Điều hành chiến dịch Khung Giờ Vàng
│   │   │   │   ├── crm-view.tsx       # Quản lý khách hàng, hạng thẻ & mời lại
│   │   │   │   └── booking-settings-view.tsx # Cài đặt lịch mở cửa & ngày nghỉ
│   │   │   ├── home-view.tsx          # Giao diện Trang chủ & Bộ thực đơn Tasting 7 món
│   │   │   ├── site-header.tsx        # Header chính & nút truy cập Quản trị
│   │   │   └── site-footer.tsx        # Chân trang chính
│   │   └── ui/                        # Bộ thư viện UI primitives (shadcn/ui, Radix UI)
│   ├── hooks/
│   │   └── use-booking-wizard.ts      # State machine quản lý toàn bộ luồng đặt bàn & tính voucher
│   └── lib/tram/                      # Core business logic & thuật toán nghiệp vụ:
│       ├── constants.ts               # Hằng số chuẩn (1.440.000đ, 40 chỗ, 15 bàn, T4-CN)
│       ├── food-cost.ts               # Tính toán KPI Food cost 2 tầng (34,7% / trần cảnh báo đỏ 35%)
│       ├── purchase.ts                # Thuật toán đối chiếu tồn kho & xuất danh sách mua ca (FR-32)
│       ├── vouchers.ts                # Thuật toán gợi ý & tính chiết khấu voucher theo gu (FR-14)
│       ├── loyalty.ts                 # Quy tắc tích lũy điểm & phân 3 hạng thành viên
│       ├── booking-settings.ts        # Kiểm tra lịch mở cửa & chính sách ngày nghỉ định kỳ
│       ├── dishes.ts                  # Tiện ích phân tích thực đơn và biến thể món
│       └── format.ts                  # Tiện ích định dạng ngày tháng, tiền tệ VND, tỷ lệ %
└── README.md                          # Tài liệu thuyết minh & hướng dẫn hệ thống toàn diện
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu cầu môi trường
* **Node.js**: Phiên bản 20 trở lên (khuyến nghị v20.x hoặc v22.x LTS)
* **Trình duyệt**: Google Chrome, Microsoft Edge, Safari hiện đại

### Các bước khởi chạy chi tiết
```bash
# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Đồng bộ lược đồ cơ sở dữ liệu SQLite
npm run db:push

# 3. Nạp dữ liệu giả lập chuẩn nghiệp vụ (15 bàn / 40 chỗ, BOM 472.975đ, mốc tháng 3/2027)
npm run db:seed

# 4. Khởi động máy chủ phát triển
npm run dev
```

Mở trình duyệt và truy cập hệ thống tại: **`http://localhost:3000`**

### Truy cập phân hệ Quản trị:
* Bấm vào nút **"Quản trị"** ở góc phải Header trang chủ.
* Nhập mã PIN truy cập: **`123456`** (hoặc `TRAM2025`).

### Dữ liệu mẫu dùng cho nghiệm thu & demo:
* **Thượng khách VIP Nam Trầm (Miễn 100% cọc)**: SĐT `0909999999` (Trần Nam Trầm).
* **Mã thử nghiệm Khảo sát 5 sao**: Truy cập trực tiếp link `/survey/TRM-HDVF`.
* **Mã thử nghiệm Check-in hôm nay**: Mã `TRM-HQ7Q` tại ca 19:45 ngày demo (`17/03/2027`).
