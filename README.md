# TRẦM Reserve (TramDine) — Web demo đồ án môn Business Value

Hệ thống đặt bàn trực tuyến và quản lý bàn cho **Nhà hàng TRẦM** (doanh nghiệp giả lập phục vụ đồ án môn Business Value). Ứng dụng chạy hoàn toàn **local**, thanh toán và nhắc tin đều **mô phỏng** — không kết nối dịch vụ bên ngoài nào.

## Tính năng (khớp đặc tả giai đoạn 1 trong gói tư vấn)

| Nhóm | Nội dung |
|------|----------|
| 1. Website & menu | Trang giới thiệu, câu chuyện, menu tasting 7 món "Hành trình vị Việt" (1.190.000 đ/khách), pairing wine/tea, đánh giá khách |
| 2. Đặt bàn trực tuyến | Chọn ngày (4 tuần, nghỉ thứ Hai) → khung giờ (17:30 / 19:45) → số khách 2–8 → chọn bàn trống theo sơ đồ 12 bàn |
| 3. Đặt cọc & nhắc lịch (mô phỏng) | Cọc 300.000 đ/khách qua cổng thanh toán mô phỏng 2 bước; mã đặt bàn TRM-XXXX; dòng thời gian nhắc lịch 48h & 24h kèm bản xem trước nội dung |
| 4. Waitlist thông minh | Đăng ký danh sách chờ khi hết chỗ; quản trị có thể "mời" khách khi có bàn hủy |
| 5. Quản lý bàn theo ca | Sơ đồ 12 bàn theo khung giờ, 4 trạng thái (trống/đã đặt/đã đến/không đến), check-in một chạm, đánh dấu no-show |
| 6. Dashboard vận hành | KPI lượt đặt, tỷ lệ lấp chỗ, no-show, doanh thu dự thu; occupancy theo ngày; nguồn đặt bàn (web/điện thoại/Zalo) |
| 7. Hồ sơ khách tích lũy | Danh sách khách, số lần đến, tổng chi tiêu, lịch sử đặt bàn, ghi chú dị ứng |

## Chạy dự án tại máy local

Yêu cầu: Node.js 20+ (hoặc Bun 1.x).

```bash
# 1) Cài dependencies
npm install        # hoặc: bun install

# 2) Tạo database SQLite + nạp dữ liệu giả lập 4 tuần
npm run db:push
npm run db:seed

# 3) Chạy dev server (port 3000)
npm run dev
```

Mở http://localhost:3000. Database là tệp `db/custom.db`; muốn làm lại dữ liệu demo từ đầu, xóa tệp này rồi chạy lại `db:push` + `db:seed`.

**Mã vào khu vực Quản trị (mô phỏng):** `TRAM2025`

## Đẩy mã nguồn lên GitHub

```bash
cd TramDine
git init
git add .
git commit -m "TRẦM Reserve demo — đồ án Business Value"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản>/TramDine.git
git push -u origin main
```

Tệp `.gitignore` đã loại sẵn `node_modules/`, `.next/` và `db/*.db` — chỉ mã nguồn và cấu hình được đẩy lên.

## Thông số nghiệp vụ dùng chung (giữ nguyên khi chỉnh sửa)

- 12 bàn / 42 chỗ: B01–B05 (2 chỗ), B06–B10 (4 chỗ), B11–B12 (6 chỗ)
- Mở cửa tối Thứ Ba → Chủ Nhật (nghỉ Thứ Hai); 2 khung mỗi tối: 17:30 và 19:45
- Menu tasting 7 món: 1.190.000 đ/khách; wine pairing +650.000 đ; tea pairing +350.000 đ
- Đặt cọc 300.000 đ/khách; hoàn cọc nếu hủy trước 48 giờ

Các con số này khớp với bảng tài chính trong tài liệu tư vấn — **khi chụp ảnh màn hình cho Chương 4 của đồ án, không chỉnh các giá trị này** để số liệu trên ảnh khớp số liệu trong bài.

## Cấu trúc thư mục chính

```
prisma/schema.prisma      # Mô hình dữ liệu: Table, Reservation, WaitlistEntry
prisma/seed.ts             # Dữ liệu giả lập 4 tuần (~66 lượt đặt, 5 lượt chờ)
src/app/page.tsx           # Trang duy nhất — 3 view: Trang chủ / Đặt bàn / Quản trị
src/components/tram/       # Giao diện: home, booking wizard, admin (dashboard, sơ đồ bàn, ...)
src/app/api/               # API: availability, reservations, waitlist, customers, admin/stats
src/lib/tram/              # Hằng số, kiểu dữ liệu, hàm nghiệp vụ dùng chung
```

## Ghi chú

- Đây là sản phẩm demo phục vụ đồ án học tập: cổng thanh toán và tin nhắn nhắc lịch là giao diện mô phỏng, không có giao dịch thật.
- Nguồn dữ liệu thống kê trong Dashboard lấy từ dữ liệu giả lập đã seed (2 tuần quá khứ + 2 tuần tương lai tính từ lúc chạy seed).
- Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma/SQLite.
