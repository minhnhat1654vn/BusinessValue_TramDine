# TRẦM Reserve (TramDine) — Hệ Thống Quản Trị & Vận Hành Fine Dining Đương Đại

> **Đồ án môn Business Value & Digital Operations**  
> Dự án mô phỏng toàn diện giải pháp chuyển đổi số cho nhà hàng ẩm thực cao cấp **TRẦM Reserve** — mô hình Haute Cuisine / Fine Dining quy mô **10 bàn (30 chỗ ngồi)**, phục vụ Bộ Thực đơn Tasting Menu 7 món *"Tiến Vua · Bảy Báu Vật Việt"* với giá niêm yết **1.440.000 đ/khách**.

Ứng dụng vận hành theo kiến trúc **Local-first**, cơ sở dữ liệu SQLite độc lập qua Prisma ORM, toàn bộ cổng thanh toán đặt cọc, cơ chế giữ bàn chống xung đột (Table Hold) và hệ thống chăm sóc khách hàng (Zalo ZNS / SMS / Email) đều được **mô phỏng nghiệp vụ chuyên sâu** — không phụ thuộc vào dịch vụ bên thứ ba.

---

## 🌟 Bản Đồ Tính Năng Theo 2 Vai Trò Nghiệp Vụ (2 Roles)

Hệ thống được thiết kế phân định rành mạch giữa **Trải nghiệm Thực khách** và **Vận hành Quản trị**, đáp ứng đầy đủ 39 yêu cầu chức năng (FR-01 → FR-39):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                TRẦM RESERVE PLATFORM                                   │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│   ROLE 1: KHÁCH HÀNG (CUSTOMER EXPERIENCE)│   ROLE 2: BAN QUẢN LÝ & BẾP TRƯỞNG (ADMIN) │
│   Trải nghiệm Đặt bàn & Hậu mãi cá nhân   │   Vận hành Ca, Kho nguyên liệu & Tài chính │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Câu chuyện Haute Cuisine & 7 Món Tiến Vua│ • Dashboard Doanh thu & Công suất ca (30 chỗ)│
│ • Booking Wizard 6 bước chuẩn mực         │ • Sơ đồ 10 bàn Live & Điều phối ca phục vụ │
│ • Sơ đồ 10 bàn trực quan & Table Hold 10p │ • Quản lý Danh sách chờ thông minh (Waitlist)│
│ • Tùy biến món & Đồ uống Pairing (Vang/Trà)│ • Quản lý Định mức BOM 7 món (25 nguyên liệu)│
│ • Ghi nhận dị ứng thực phẩm & Dịp kỷ niệm │ • Kiểm soát Food Cost 34,7% (Khung P&L ≤ 35%)│
│ • Tự động nhận diện Khách quen qua SĐT    │ • Đối chiếu tồn kho & Xuất danh sách mua ca│
│ • Áp Voucher tự động theo Gu ẩm thực (38) │ • Khung Giờ Vàng Zalo OA ca 17:30 T4–T6 (34)│
│ • Đặc quyền Miễn cọc 100% VIP Nam Trầm (22)│ • Mô phỏng What-if với Thanh trượt Kép (39)│
│ • Khảo sát đánh giá 5 sao (/survey/[code])│ • CRM Thực khách, Mời lại sau 21 ngày (25) │
│ • Tích lũy điểm thưởng & Thăng 3 hạng thẻ │ • Cài đặt mở/đóng ngày định kỳ (Thứ 2 & 3) │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 👤 ROLE 1: KHÁCH HÀNG (CUSTOMER EXPERIENCE)

Phân hệ dành cho thực khách trải nghiệm hành trình ẩm thực từ lúc khám phá thực đơn, tự đặt bàn trực tuyến đến dịch vụ chăm sóc và khảo sát hậu mãi.

### 1. Khám Phá Câu Chuyện Thương Hiệu & Bộ Thực Đơn (FR-01 – FR-05)
* **Brand Storytelling**: Không gian giới thiệu triết lý ẩm thực Trầm Hương cao cấp, kiến trúc Fine Dining tĩnh lặng giữa lòng Sài Gòn.
* **Tasting Menu 7 món *"Tiến Vua · Bảy Báu Vật Việt"***: Đơn giá cố định **1.440.000 đ/khách** với các phong vị tinh hoa: *Khai vị Trầm Sắc, Gỏi cuốn sò điệp, Súp yến tiềm sen, Cá tầm nướng ống tre, Thăn bò Wagyu sốt tiêu rừng, Cơm niêu ngọc yến, Tráng miệng Chè nhãn lồng*.
* **Gói Đồ Uống Pairing Đẳng Cấp**:
  * **Wine Pairing (+650.000 đ/khách)**: Tuyển chọn 4 dòng vang quốc tế phối vị hài hòa cùng từng tầng món ăn.
  * **Tea Pairing (+350.000 đ/khách)**: Tuyển tập danh trà cổ thụ Tây Bắc và trà thảo mộc thanh tao.

### 2. Quy Trình Đặt Bàn Trực Tuyến 6 Bước (Booking Wizard) (FR-06 – FR-14)
* **Bước 1: Ngày, Khung giờ & Số lượng khách**:
  * Chọn ngày dùng tiệc trong lịch mở cửa **Thứ Tư → Chủ Nhật** (Hệ thống tự động chặn Thứ Hai và Thứ Ba nghỉ định kỳ).
  * Lựa chọn 1 trong 2 khung giờ phục vụ tinh hoa: **17:30** hoặc **19:45**.
  * Chọn số lượng khách (2 đến 8 khách). Bàn tiệc tối đa 4 chỗ; nếu khách chọn đoàn $> 4$ khách, hệ thống hiển thị rõ thông báo xếp bàn ghép và chuyển hướng đăng ký danh sách chờ để nhà hàng liên hệ hỗ trợ chu đáo.
* **Bước 2: Chọn Bàn Trực Quan & Giữ Bàn Tạm Thời (Table Hold 10 phút)**:
  * Hiển thị Sơ đồ tương tác gồm đúng **10 bàn chuẩn mực**: Dãy A bên cửa sổ (A01–A05: 5 bàn 2 chỗ = 10 chỗ) và Khu B trung tâm (B01–B05: 5 bàn 4 chỗ = 20 chỗ). Tổng quy mô ca: **30 chỗ ngồi**.
  * Khi chọn bàn, cơ chế **Table Hold 10 phút** tự động khóa chỗ theo session, ngăn chặn đặt trùng giữa nhiều người dùng cùng lúc.
  * Khi ca kín chỗ hoặc đoàn đông cần ghép bàn, hệ thống tự động kích hoạt **Màn hình Đăng ký Danh sách chờ (Waitlist)**.
* **Bước 3: Chi Tiết & Tùy Biến Thực Đơn**:
  * Thực khách theo dõi chi tiết từng món trong set Tasting 7 món, linh hoạt lựa chọn tùy biến cách chế biến theo khẩu vị riêng.
* **Bước 4: Thông Tin Thực Khách, Pairing & Dị Ứng**:
  * Điền thông tin họ tên, số điện thoại, email liên hệ.
  * Chọn gói Pairing thức uống (Không pairing / Wine pairing / Tea pairing).
  * Ghi chú dị ứng thực phẩm (Hải sản, Đậu phộng, Gluten...) và dịp kỷ niệm đặc biệt (Sinh nhật, Cầu hôn, Tiếp đối tác).
  * **Nhận diện khách thân thiết**: Nhập số điện thoại, hệ thống tự động tra cứu hồ sơ tích lũy, số lần dùng bữa và hạng thành viên hiện tại.
* **Bước 5: Áp Dụng Voucher & Thanh Toán Đặt Cọc**:
  * **Áp Voucher tự động (FR-37, FR-38)**: Hỗ trợ mã voucher thông minh theo gu ẩm thực (`COMBO-TEA15`, `COMBO-WINE15`, `WELCOME10`...). Tự động tính tiền giảm màu xanh lá và cập nhật lại mức cọc.
  * **Đặt cọc tiêu chuẩn**: Quy định cọc **300.000 đ/khách** (hoặc 50% tổng đơn sau giảm giá).
  * **Đặc quyền VIP Nam Trầm (FR-22)**: Thực khách đạt hạng Nam Trầm ($\ge 6$ lần dùng bữa) được hệ thống **miễn 100% tiền đặt cọc**.
  * **Cổng thanh toán giả lập**: Hỗ trợ 2 phương thức chuyển khoản QR VietQR hoặc Thẻ tín dụng/ghi nợ quốc tế với hiệu ứng mô phỏng xác thực giao dịch an toàn.
* **Bước 6: Xác Nhận Đặt Chỗ Thành Công**:
  * Cấp mã đặt bàn độc nhất (VD: `TR-892401`), tóm tắt chi tiết bàn, khung giờ, thực đơn và gói đồ uống đã chọn.
  * Hướng dẫn chính sách hoàn cọc linh hoạt (hoàn 100% nếu hủy trước giờ tiệc 48 tiếng).

### 3. Khảo Sát Đánh Giá 5 Sao & Dịch Vụ Hậu Mãi (FR-23, FR-24)
* **Trang Khảo Sát Trải Nghiệm Độc Lập (`/survey/[code]`)**:
  * Sau bữa ăn, khách truy cập link khảo sát theo mã đặt bàn để chấm điểm 5 sao cho 4 trụ cột: **Chất lượng món ăn**, **Không gian & Âm nhạc**, **Tác phong phục vụ**, và **Đồ uống Pairing**.
  * Để lại nhận xét chân thực; hệ thống tự động tặng ngay **200 điểm thưởng (pts)** vào tài khoản thành viên.
* **Chương Trình 3 Hạng Thành Viên**:
  * **Hạng Hương** (0–2 bữa tiệc): Tích lũy 1.000 đ = 1 điểm.
  * **Hạng Trầm** (3–5 bữa tiệc): Nhân hệ số thưởng +5% điểm, ưu tiên giữ bàn giờ cao điểm.
  * **Hạng Nam Trầm** ($\ge 6$ bữa tiệc): Thượng khách cao cấp nhất, nhân hệ số thưởng +8% điểm, miễn cọc 100% và nhận thiệp tri ân định kỳ từ Bếp trưởng.

---

## 👨‍🍳 ROLE 2: BAN QUẢN LÝ & BẾP TRƯỞNG (ADMIN & OPERATIONS)

Phân hệ dành riêng cho Giám đốc vận hành, Quản lý nhà hàng, Bếp trưởng (Executive Chef) và Thu ngân điều phối hoạt động kinh doanh, kho bãi và tài chính.

* **Cổng Đăng Nhập Quản Trị**: Nhấn nút "Quản trị" trên thanh Header, nhập mã PIN quản trị an toàn: **`123456`** (hoặc `TRAM2025`).

### 1. Bảng Điều Khiển Tổng Quan & Doanh Thu (Dashboard)
* Giám sát thời gian thực: Doanh thu ca/ngày, Tỷ lệ lấp đầy (Occupancy Rate %), Tổng số lượt đặt bàn, Tổng lượng khách phục vụ trên sức chứa chuẩn **30 chỗ/ca**.
* Phân bổ trạng thái bàn trực quan (Đã đặt, Đang phục vụ, Bàn trống, Bàn giữ chỗ).
* Thống kê kênh đặt bàn (Web trực tuyến, Điện thoại hotline, Khách vãng lai).

### 2. Quản Trị Đặt Bàn & Sơ Đồ Bàn Theo Ca (Floor Management) (FR-15 – FR-18)
* **Sơ đồ 10 bàn theo thời gian thực**: Theo dõi hiện trạng sơ đồ theo từng ca (17:30 và 19:45) cho toàn bộ 10 bàn (30 chỗ ngồi):
  * Dãy A (A01–A05: 5 bàn × 2 chỗ = 10 chỗ ngồi).
  * Dãy B (B01–B05: 5 bàn × 4 chỗ = 20 chỗ ngồi).
  * **Tổng quy mô**: Đúng 10 bàn — 30 chỗ ngồi chuẩn Fine Dining.
* **Điều phối ca phục vụ 1 chạm**:
  * Thao tác **Check-in** tiếp đón khách vào bàn.
  * Chuyển trạng thái **Hoàn tất tiệc** khi khách thanh toán xong.
  * Ghi nhận **No-show** (khách không đến) hoặc **Hủy đặt bàn** kèm quy trình hoàn cọc tự động theo quy định 48h.

### 3. Quản Lý Danh Sách Chờ (Waitlist Management)
* Quản lý tập trung các yêu cầu đăng ký chờ khi ca kín chỗ (30/30 khách) hoặc khách đoàn đông cần ghép bàn riêng.
* Tự động hiển thị thứ tự hàng đợi (Queue Position), số lượng khách và số điện thoại liên hệ.
* Tính năng **Mời khách vào bàn**: Khi có bàn trống nhả ra, quản lý có thể kích hoạt duyệt chuyển khách từ Waitlist sang Đặt bàn chính thức chỉ với 1 cú click.

### 4. Định Mức BOM 7 Món & Kiểm Soát Food Cost (FR-27, FR-28, FR-33)
* **Công thức Định mức Kỹ thuật (Bill of Materials - BOM)**:
  * Quản lý chi tiết định lượng từng gram, ml, lá, cọng cho **25 loại nguyên vật liệu thượng hạng** (Bào ngư, Vi cá, Cá bớp, Bò Wagyu, Yến sào...).
  * Tự động co giãn (scale) định lượng linh hoạt theo số khách: [1 khách, 4 khách, 10 khách, 30 khách trọn ca].
* **Kiểm Soát KPI Food Cost 2 Tầng Chuẩn Mực**:
  * **Tầng 1 (Giá vốn / suất)**: $\sum(\text{Định lượng} \times \text{Đơn giá nhập kho})$ của 7 món = **499.680 đ/khách**.
  * **Tầng 2 (Tỷ lệ Food Cost %)**: $(\text{Giá vốn} \div \text{Giá menu } 1.440.000\text{ đ}) \times 100 = \mathbf{34,70\%}$.
  * Tỷ lệ 34,70% nằm trọn vẹn trong **khung kiểm soát P&L tối ưu ($\le 35\%$)**, tuyệt đối an toàn dưới trần cảnh báo trần tối đa $50\%$.
  * Tách biệt hoàn toàn doanh thu gói đồ uống Pairing ra khỏi mẫu số tính food cost để phản ánh chính xác hiệu quả ẩm thực.

### 5. Quản Lý Kho & Danh Sách Mua Hàng Trước Ca Cho Bếp Trưởng (FR-29, FR-31, FR-32)
* Quản lý kho thời gian thực cho toàn bộ danh mục nguyên vật liệu; hỗ trợ cập nhật nhập kho và điều chỉnh tồn kho tức thì.
* Thiết lập **Điểm đặt hàng lại (Reorder Point)**: Tự động gắn nhãn cảnh báo đỏ khi lượng tồn kho xuống dưới ngưỡng an toàn.
* **Danh sách Mua hàng Trước ca (Shift Purchase List)**:
  * Thuật toán tự động đối chiếu nhu cầu ca đầy (30 khách) với tồn kho:
    $$\text{Lượng cần mua} = \max(0, \text{Nhu cầu ca} - \text{Tồn kho})$$
  * Tự động tính tổng chi phí mua sắm dự kiến cho ca làm việc.
  * Nút **"Sao chép danh sách mua"**: Định dạng sẵn văn bản chuyên nghiệp gửi ngay cho nhà cung cấp thực phẩm qua Zalo/Email.

### 6. Chiến Dịch Khung Giờ Vàng (Golden Hour Campaign) (FR-34)
* Hệ thống tự động giám sát các ca 17:30 ngày giữa tuần (Thứ Tư, Thứ Năm, Thứ Sáu) có tỷ lệ lấp đầy thấp ($15\% - 50\%$).
* Bảng điều khiển cho phép kích hoạt phát hành voucher giảm giá $15\%$ thực đơn Tasting gửi qua Zalo OA đến tệp khách hàng tiềm năng, nhanh chóng nâng tỷ lệ lấp đầy đạt mục tiêu $85\%$.

### 7. Mô Phỏng Tài Chính What-If Với Thanh Trượt Kép (FR-39)
* Công cụ dự báo tài chính chuyên sâu với **2 thanh trượt ngang tương tác**:
  * Thanh trượt 1: Giá Menu Tasting (từ 800.000 đ đến 2.000.000 đ).
  * Thanh trượt 2: Biến động Giá vốn nguyên liệu ($\pm 100.000$ đ).
* Biểu đồ Cột Chồng Recharts cập nhật theo thời gian thực: hiển thị đường giới hạn trần đỏ 50%, độ lệch $\Delta$, phần trăm lãi gộp và tác động dòng tiền cụ thể trên quy mô 1 ca đầy 30 khách.

### 8. CRM Khách Hàng, Khảo Sát & Chiến Dịch Giữ Chân (FR-19, FR-24, FR-25, FR-26, FR-38)
* **Hồ Sơ Khách Hàng Tích Lũy**: Quản lý lịch sử chi tiêu, số lần ghé thăm, ghi chú khẩu vị, dị ứng và phân hạng 3 bậc (Hương, Trầm, Nam Trầm).
* **Chiến Dịch Mời Lại Thực Khách (FR-25)**: Tự động lọc danh sách khách quen $\ge 21$ ngày chưa quay lại; soạn sẵn kịch bản mời tiệc Zalo ZNS / Email Marketing kèm voucher cá nhân hóa theo khẩu vị (`COMBO-TEA15` cho gu thanh nhã, `COMBO-WINE15` cho gu sành vang).
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
| **Quy mô nhà hàng** | **10 bàn · 30 chỗ ngồi** | • 5 bàn 2 chỗ (A01–A05: 10 chỗ ngồi)<br/>• 5 bàn 4 chỗ (B01–B05: 20 chỗ ngồi)<br/>• Bàn lớn nhất 4 chỗ; đoàn > 4 khách đăng ký Waitlist để xếp bàn ghép |
| **Lịch hoạt động** | **Thứ Tư → Chủ Nhật** | Nghỉ định kỳ Thứ Hai và Thứ Ba; Phục vụ 2 ca tối: **17:30** & **19:45** |
| **Giá thực đơn Tasting** | **1.440.000 đ/khách** | Bộ thực đơn 7 món *"Tiến Vua · Bảy Báu Vật Việt"* |
| **Giá gói Wine Pairing** | **+650.000 đ/khách** | Tuyển chọn 4 ly vang quốc tế cao cấp phối vị |
| **Giá gói Tea Pairing** | **+350.000 đ/khách** | Tuyển tập 4 tuần trà danh trà Việt Nam |
| **Chính sách Đặt cọc** | **300.000 đ/khách** | Hoàn cọc 100% nếu hủy trước 48h; **Miễn cọc 100% cho hạng Nam Trầm** |
| **Giá vốn nguyên liệu BOM** | **499.680 đ/khách** | Định mức chuẩn 7 món trên 25 nguyên vật liệu tuyển chọn |
| **Tỷ lệ Food Cost chuẩn** | **34,70%** | Nằm trong khung duyệt P&L $\le 35\%$, tuyệt đối an toàn dưới trần $50\%$ |
| **Mã PIN Quản trị** | **`123456`** (hoặc `TRAM2025`) | Cổng truy cập bảng điều khiển quản lý và bếp trưởng |

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

* **Nền tảng & Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions, API Routes)
* **Thư viện Giao diện**: React 19, [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
* **Hiệu ứng & Chuyển cảnh**: [Framer Motion](https://www.framer.com/motion/)
* **Trực quan hóa Dữ liệu**: [Recharts](https://recharts.org/) (Biểu đồ What-if cột chồng, occupancy chart, rating breakdown)
* **Biểu tượng & Thông báo**: [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/)
* **Cơ sở Dữ liệu & ORM**: [SQLite](https://www.sqlite.org/) + [Prisma ORM 6](https://www.prisma.io/)
* **Ngôn ngữ & Kiểm thử**: TypeScript 5, Playwright, Python automation scripts.

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

# 3. Nạp dữ liệu giả lập chuẩn nghiệp vụ 4 tuần (Seed Data 10 bàn / 30 chỗ, T4-CN, 1.440.000đ)
npm run db:seed

# 4. Khởi động máy chủ phát triển
npm run dev
```

Mở trình duyệt và truy cập hệ thống tại: **`http://localhost:3000`**

### Truy cập phân hệ Quản trị:
* Bấm vào nút **"Quản trị"** ở góc phải Header trang chủ.
* Nhập mã PIN truy cập: **`123456`** (hoặc `TRAM2025`).

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
BusinessValue_TramDine/
├── db/                                # Cơ sở dữ liệu SQLite local (custom.db)
├── docs/                              # Tài liệu đồ án, báo cáo & hình ảnh nghiệm thu
├── prisma/
│   ├── schema.prisma                  # Lược đồ thực thể quan hệ: Table, Reservation, Survey, Waitlist...
│   ├── seed.ts                        # Script sinh dữ liệu 4 tuần (10 bàn / 30 chỗ, lịch T4-CN)
│   └── seed-bom.ts                    # Script nạp định lượng BOM 7 món chuẩn Food Cost 34,7%
├── src/
│   ├── app/                           # Next.js App Router (page.tsx, layout, API routes)
│   │   ├── api/                       # REST APIs: availability, reservations, food-cost, inventory, waitlist...
│   │   └── survey/[code]/             # Trang khảo sát độc lập 5 sao sau bữa tiệc
│   ├── components/
│   │   ├── tram/
│   │   │   ├── booking/               # Luồng Đặt bàn Booking Wizard (booking-wizard.tsx, waitlist-panel.tsx)
│   │   │   ├── admin/                 # Phân hệ Quản trị (dashboard, recipes, food-cost, inventory, golden-hour...)
│   │   │   └── home-view.tsx          # Giao diện Trang chủ & Bộ thực đơn Tasting 7 món
│   │   └── ui/                        # Bộ thư viện UI primitives (shadcn/ui, Radix UI)
│   ├── hooks/
│   │   └── use-booking-wizard.ts      # State machine quản lý toàn bộ luồng đặt bàn & tính voucher
│   └── lib/tram/                      # Core business logic & thuật toán nghiệp vụ
│       ├── constants.ts               # Hằng số chuẩn (1.440.000đ, 30 chỗ, 10 bàn, T4-CN)
│       ├── food-cost.ts               # Tính toán KPI Food cost 2 tầng (34,7% / trần 50%)
│       ├── purchase.ts                # Thuật toán đối chiếu tồn kho & xuất danh sách mua ca (FR-32)
│       ├── vouchers.ts                # Thuật toán gợi ý & tính chiết khấu voucher theo gu (FR-37, FR-38)
│       ├── loyalty.ts                 # Quy tắc tích lũy điểm & phân 3 hạng thành viên
│       └── booking-settings.ts        # Kiểm tra lịch mở cửa & chính sách ngày nghỉ định kỳ
└── README.md                          # Tài liệu thuyết minh & hướng dẫn hệ thống
```

---

## 📌 Ghi Chú Bản Quyền & Nghiệm Thu
* Dự án được xây dựng phục vụ nghiên cứu và nghiệm thu đồ án môn học **Business Value & Digital Operations**.
* Toàn bộ dữ liệu khách hàng, hóa đơn thanh toán và các chiến dịch gửi thông báo Zalo OA / Email đều vận hành dưới dạng **mô phỏng nghiệp vụ chuyên sâu**, an toàn và độc lập cục bộ.
