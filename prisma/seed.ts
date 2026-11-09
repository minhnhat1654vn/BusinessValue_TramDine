// Seed dữ liệu giả lập cho TRẦM Reserve
// Chạy: npm run db:seed  (hoặc tsx prisma/seed.ts)
//
// Dữ liệu sinh bao phủ đầy đủ các ngày trong tuần (Thứ 3 -> Chủ Nhật)
// từ 3 tuần quá khứ đến 2 tuần tương lai, đảm bảo mọi dashboard, báo cáo
// doanh thu, biểu đồ lấp đầy bàn, quản lý đặt bàn và khảo sát đều phong phú.
//
// Mọi lượt đặt đều có NGUỒN RÕ RÀNG:
//   - WEB (Website đặt bàn trực tuyến ~52%)
//   - PHONE (Hotline lễ tân tiếp nhận ~30%)
//   - ZALO (Zalo Official Account CSKH ~18%)
// Kèm ghi chú tương ứng với từng kênh nguồn và khảo sát đánh giá 5 sao.

import { PrismaClient } from "@prisma/client";
import { seedBomDatabase } from "./seed-bom";
import fs from "fs";
import path from "path";

const db = new PrismaClient();

// ---------- RNG có hạt giống cố định để dữ liệu demo tái lập được ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20251020);
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const randInt = (min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

// ---------- Bảng 15 bàn theo spec (40 chỗ/ca) ----------
const TABLES = [
  { code: "A01", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "A02", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "A03", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "A04", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "A05", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "B01", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B02", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B03", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B04", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B05", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B06", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B07", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B08", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B09", seats: 3, zone: "Khu trung tâm (Khu B)" },
  { code: "B10", seats: 3, zone: "Khu trung tâm (Khu B)" },
];

// ---------- Khách hàng giả lập ----------
interface Customer {
  name: string;
  phone: string;
  email: string | null;
}

const NAMES = [
  "Nguyễn Minh Anh",
  "Trần Quốc Bảo",
  "Lê Thu Hằng",
  "Phạm Đức Long",
  "Hoàng Ngọc Mai",
  "Vũ Thanh Tùng",
  "Đặng Khánh Linh",
  "Bùi Tiến Dũng",
  "Nguyễn Thanh Hà",
  "Phạm Hoàng Nam",
  "Trịnh Bảo Châu",
  "Đỗ Nhật Minh",
  "Nguyễn Khánh Vy",
  "Lâm Quang Huy",
  "Hồ Thu Trang",
  "Ngô Gia Bảo",
  "Nguyễn Hữu Phúc",
  "Tạ Diễm My",
  "Đinh Công Anh",
  "Dương Mỹ Duyên",
  "Phan Hải Đăng",
  "Vũ Khánh Ngân",
  "Trần Phú Quý",
  "Lý Ngọc Tâm",
  "Nguyễn Quang Trung",
  "Phan Bích Ngọc",
  "Trần Hải Yến",
  "Nguyễn Vân Khanh",
  "Hoàng Trọng Nhân",
  "Lê Kiều Trinh",
  "Phạm Tấn Thành",
  "Nguyễn Anh Thư",
  "Võ Minh Khang",
  "Đỗ Thảo Nguyên",
  "Lưu Gia Hân",
  "Bùi Hoàng Bách",
  "Trần Thùy Dương",
  "Ngô Tuấn Kiệt",
  "Lương Mai Phương",
  "Huỳnh Tấn Phát",
  "Trương Ngọc Ánh",
  "Nguyễn Đức Trí",
  "Hà Thảo My",
  "Đoàn Minh Quân",
  "Phùng Gia Linh",
  "Dương Quốc Cường",
  "Cao Thị Kim Ngân",
  "Mai Văn Thịnh",
  "Vũ Quỳnh Nga",
  "Tống Gia Huy",
  "Đào Thúy Hạnh",
  "Lê Bá Thông",
  "Nguyễn Hoàng Long",
  "Đinh Thị Trúc Mai",
  "Phan Tấn Tài",
  "Trần Mai Chi",
  "Lý Gia Hưng",
  "Phạm Như Quỳnh",
  "Bùi Đình Trọng",
  "Hoàng Hải Nam",
  "Võ Thị Tuyết Nhung",
  "Nguyễn Thành Đạt",
];

function unaccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

function makeCustomer(name: string): Customer {
  const parts = name.split(" ");
  const given = unaccent(parts[parts.length - 1]);
  const family = unaccent(parts[0]);
  const emailDomain = pick(["gmail.com", "gmail.com", "yahoo.com", "outlook.com"]);
  return {
    name,
    phone: `09${randInt(10, 99)}${String(randInt(100000, 999999))}`,
    email:
      rng() < 0.75
        ? `${given}.${family}${randInt(1, 99)}@${emailDomain}`
        : null,
  };
}

// 15 khách quen để hồ sơ khách hàng tích lũy điểm và phân hạng VIP đẹp
const REGULARS: Customer[] = NAMES.slice(0, 15).map(makeCustomer);
// Khách vãng lai / mới
const OTHERS: Customer[] = NAMES.slice(15).map(makeCustomer);

// FR-21 & FR-22: Thượng khách Hạng Nam Trầm cố định để phục vụ demo đặc quyền
const NAM_TRAM_CUSTOMER: Customer = {
  name: "Trần Nam Trầm",
  phone: "0909999999",
  email: "namtram@tramreserve.vn",
};

// ---------- Ghi chú theo nguồn đặt bàn & Dịp dùng bữa ----------
const ALLERGIES = [
  "Hải sản",
  "Tôm, cua biển",
  "Lạc (đậu phộng)",
  "Gluten",
  "Không dùng rượu bia",
  "Ớt cay, tiêu nồng",
  "Sữa & chế phẩm từ sữa",
  "Ăn thuần chay món khai vị",
  "Hành, tỏi tươi",
  "Mẫn cảm nấm hương",
];

const OCCASIONS = [
  "Kỷ niệm 5 năm ngày cưới, chuẩn bị góc hoa và nến ấm cúng",
  "Tiệc sinh nhật ấm cúng, nhà hàng hỗ trợ chuẩn bị nến chúc mừng",
  "Tiếp đối tác quan trọng, ưu tiên bàn yên tĩnh nhìn ra vườn",
  "Hẹn hò lãng mạn 2 người, bàn góc riêng tư",
  "Gặp mặt gia đình sum họp cuối tuần",
  "Tiệc chiêu đãi đối tác nước ngoài trải nghiệm ẩm thực Việt Nam đương đại",
  "Kỷ niệm ngày yêu nhau, tư vấn set Wine Pairing phù hợp",
  "Ăn tối mừng ký hợp đồng dự án mới",
  "Gia đình có người lớn tuổi, bố trí bàn cạnh lối đi thoáng",
  "Thưởng thức thực đơn Tasting Menu mới của bếp trưởng",
];

// Hàm sinh nguồn và ghi chú chuẩn xác theo từng kênh (có nguồn gốc rõ ràng)
function pickSourceAndNotes(): {
  source: "WEB" | "PHONE" | "ZALO";
  notes: string | null;
} {
  const r = rng();
  const occasion = rng() < 0.7 ? pick(OCCASIONS) : null;

  if (r < 0.52) {
    // 1. Nguồn WEB (~52%) — Khách đặt trực tuyến qua website tramreserve.vn
    const source = "WEB";
    if (!occasion) {
      return {
        source,
        notes: rng() < 0.35 ? "Đặt trực tuyến qua website tramreserve.vn" : null,
      };
    }
    const webPrefix = pick([
      "Đặt trực tuyến qua web:",
      "Website booking:",
      "Khách ghi chú qua web:",
      "Ghi chú đặt trực tuyến:",
    ]);
    return {
      source,
      notes: `${webPrefix} ${occasion}`,
    };
  } else if (r < 0.82) {
    // 2. Nguồn PHONE (~30%) — Khách gọi Hotline lễ tân 0901 234 567
    const source = "PHONE";
    const phonePrefix = pick([
      "Hotline 0901 234 567:",
      "Lễ tân tiếp nhận cuộc gọi:",
      "Khách gọi hotline nhà hàng:",
      "Điện thoại trực tiếp:",
      "Hotline CSKH:",
    ]);
    const phoneDetail = occasion ?? pick([
      "Khách nhờ giữ bàn view đẹp nhìn ra sân sau",
      "Khách quen gọi điện đặt trước 3 ngày",
      "Hỏi chi tiết về thực đơn Tasting Menu 7 món",
      "Yêu cầu không gian yên tĩnh để trao đổi công việc",
      "Khách gọi hỏi chỗ đỗ xe ô tô và bàn cho 4 người",
    ]);
    return {
      source,
      notes: `${phonePrefix} ${phoneDetail}`,
    };
  } else {
    // 3. Nguồn ZALO (~18%) — Khách chat và chốt bàn qua Zalo OA
    const source = "ZALO";
    const zaloPrefix = pick([
      "Zalo OA TRẦM Reserve:",
      "Tư vấn qua Zalo OA:",
      "Khách nhắn tin Zalo:",
      "Zalo CSKH tiếp nhận:",
      "Kênh Zalo Official:",
    ]);
    const zaloDetail = occasion ?? pick([
      "Khách đã chuyển khoản cọc và gửi ủy nhiệm chi qua Zalo",
      "Tư vấn thực đơn Tasting và gói Wine Pairing",
      "Khách hỏi chi tiết set Tea Pairing không cồn",
      "Đã xác nhận đặt bàn đôi qua tin nhắn Zalo",
      "Khách gửi yêu cầu cắm hoa tươi trên bàn tiệc",
    ]);
    return {
      source,
      notes: `${zaloPrefix} ${zaloDetail}`,
    };
  }
}

function pickPairing(): "NONE" | "WINE" | "TEA" {
  const r = rng();
  if (r < 0.42) return "NONE";
  if (r < 0.8) return "WINE";
  return "TEA";
}

// ---------- Ngày tiện ích ----------
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const TODAY = (() => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
})();

function dayAt(offset: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

const isPast = (d: Date) => d.getTime() < TODAY.getTime();

// ---------- Sinh mã TRM-XXXX không trùng ----------
const usedCodes = new Set<string>();
function reservationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "TRM-";
    for (let i = 0; i < 4; i++)
      code += chars[Math.floor(rng() * chars.length)];
  } while (usedCodes.has(code));
  usedCodes.add(code);
  return code;
}

// =====================================================================
// PHÂN BỔ MỤC TIÊU ĐẶT BÀN (TỪ -21 NGÀY QUÁ KHỨ ĐẾN +14 NGÀY TƯƠNG LAI)
// =====================================================================
interface EveningTarget {
  date: Date;
  slot: "SLOT_1730" | "SLOT_1945";
  seats: number;
  full?: boolean; // kín 100% (42/42 chỗ)
}

const targets: EveningTarget[] = [];

// Quét từ -21 ngày đến +14 ngày (tổng cộng 35 ngày)
for (let offset = -21; offset <= 14; offset++) {
  const date = dayAt(offset);
  const wd = date.getUTCDay();

  // Thứ Hai (wd === 1): Nhà hàng thường nghỉ định kỳ
  if (wd === 1) {
    // Chỉ tạo 1 sự kiện tiệc riêng ở quá khứ (-7 ngày) để báo cáo phong phú
    if (offset === -7) {
      targets.push({ date, slot: "SLOT_1945", seats: 12 });
    }
    continue;
  }

  // Thứ Bảy (wd === 6): Cuối tuần cao điểm
  if (wd === 6) {
    // 17:30: Rất đông (26 - 34 chỗ)
    targets.push({
      date,
      slot: "SLOT_1730",
      seats: randInt(26, 34),
    });
    // 19:45: Kín 100% (42 chỗ) để kích hoạt danh sách chờ Waitlist
    targets.push({
      date,
      slot: "SLOT_1945",
      seats: 42,
      full: true,
    });
  }
  // Chủ Nhật (wd === 0): Cuối tuần ấm cúng
  else if (wd === 0) {
    targets.push({
      date,
      slot: "SLOT_1730",
      seats: randInt(18, 28),
    });
    targets.push({
      date,
      slot: "SLOT_1945",
      seats: randInt(30, 40),
    });
  }
  // Thứ Sáu (wd === 5): Tối mở màn cuối tuần
  else if (wd === 5) {
    targets.push({
      date,
      slot: "SLOT_1730",
      seats: randInt(16, 26),
    });
    targets.push({
      date,
      slot: "SLOT_1945",
      seats: randInt(36, 42),
      full: randInt(1, 2) === 1,
    });
  }
  // Thứ Tư (wd === 3) & Thứ Năm (wd === 4): Giữa tuần thanh lịch
  else if (wd === 3 || wd === 4) {
    // 17:30: Khung giờ vàng (12 - 20 chỗ ~ 28% - 47% lấp đầy)
    targets.push({
      date,
      slot: "SLOT_1730",
      seats: randInt(12, 20),
    });
    // 19:45: Giờ ăn tối chính (24 - 34 chỗ)
    targets.push({
      date,
      slot: "SLOT_1945",
      seats: randInt(24, 34),
    });
  }
  // Thứ Ba (wd === 2): Mở đầu tuần sau ngày nghỉ
  else if (wd === 2) {
    targets.push({
      date,
      slot: "SLOT_1730",
      seats: randInt(8, 16),
    });
    targets.push({
      date,
      slot: "SLOT_1945",
      seats: randInt(18, 28),
    });
  }
}

// Đảm bảo HÔM NAY luôn có khách ở cả 2 ca
const todayTargets = targets.filter(
  (t) => t.date.getTime() === TODAY.getTime(),
);
if (todayTargets.length === 0 && TODAY.getUTCDay() !== 1) {
  targets.push({ date: TODAY, slot: "SLOT_1730", seats: 20 });
  targets.push({ date: TODAY, slot: "SLOT_1945", seats: 34 });
}

// =====================================================================
// SINH BẢN GHI ĐẶT BÀN (ĐẢM BẢO CÓ NGUỒN VÀ KHÔNG TRÙNG BÀN)
// =====================================================================
interface SeedReservation {
  code: string;
  customerName: string;
  phone: string;
  email: string | null;
  partySize: number;
  tableCode: string;
  date: Date;
  slot: string;
  pairing: string;
  notes: string | null;
  allergy: string | null;
  status: string;
  depositAmount: number;
  source: "WEB" | "PHONE" | "ZALO";
  createdAt: Date;
}

const reservations: SeedReservation[] = [];

for (const t of targets) {
  // Xáo trộn bàn ngẫu nhiên
  const shuffled = [...TABLES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let acc = 0;
  for (const table of shuffled) {
    if (acc >= t.seats) break;

    // Quy mô đoàn khớp với sức chứa bàn
    let party = table.seats;
    if (table.seats >= 4 && rng() < 0.25) party = table.seats - 1;
    if (t.full) party = table.seats;
    if (acc + party > t.seats && !t.full) continue;
    if (acc + party > t.seats && t.full) party = t.seats - acc;
    if (party < 2) continue;

    // Chọn khách hàng (35% khách quen, 65% khách mới)
    const customer = rng() < 0.35 ? pick(REGULARS) : pick(OTHERS);

    // Xác định trạng thái theo mốc thời gian
    let status: string;
    const isToday = t.date.getTime() === TODAY.getTime();
    if (isPast(t.date)) {
      const rStatus = rng();
      if (rStatus < 0.88) {
        status = "SEATED";
      } else if (rStatus < 0.94) {
        status = "CANCELLED";
      } else {
        status = "NO_SHOW";
      }
    } else if (isToday) {
      if (t.slot === "SLOT_1730") {
        status = rng() < 0.8 ? "SEATED" : "CONFIRMED";
      } else {
        const rStatus = rng();
        if (rStatus < 0.72) status = "CONFIRMED";
        else if (rStatus < 0.9) status = "PENDING";
        else status = "CANCELLED";
      }
    } else {
      const rStatus = rng();
      if (rStatus < 0.76) status = "CONFIRMED";
      else if (rStatus < 0.92) status = "PENDING";
      else status = "CANCELLED";
    }

    // Thời điểm tạo: trước ngày dùng bữa từ 1 đến 10 ngày
    let createdAt = new Date(t.date);
    createdAt.setUTCDate(createdAt.getUTCDate() - randInt(1, 10));
    if (createdAt.getTime() > TODAY.getTime()) {
      createdAt = new Date(TODAY);
      createdAt.setUTCDate(createdAt.getUTCDate() - randInt(1, 4));
    }

    // Nguồn đặt bàn và ghi chú ngữ cảnh tương ứng
    const { source, notes } = pickSourceAndNotes();

    // Dị ứng (khoảng 18% khách có ghi nhận dị ứng)
    const allergy = rng() < 0.18 ? pick(ALLERGIES) : null;

    reservations.push({
      code: reservationCode(),
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      partySize: party,
      tableCode: table.code,
      date: t.date,
      slot: t.slot,
      pairing: pickPairing(),
      notes,
      allergy,
      status,
      depositAmount: 300000 * party,
      source,
      createdAt,
    });
    acc += party;
  }
}

// =====================================================================
// KHÁCH HÀNG THÂN THIẾT & VIP THEO SPEC (FR-21, FR-22)
// =====================================================================
// Gán cố định mã đặt bàn TRM-HDVF (SEATED) và TRM-HQ7Q (CONFIRMED hôm nay)
// để các script kiểm thử tự động và tài liệu Word báo cáo hoạt động đúng.

const seatedList = reservations.filter(
  (r) => isPast(r.date) && r.status === "SEATED",
);

// Gán 7 lượt SEATED cho Trần Nam Trầm (0909999999)
const namTramCount = Math.min(7, seatedList.length);
for (let i = 0; i < namTramCount; i++) {
  const item = seatedList[i];
  if (i === 0) item.code = "TRM-HDVF"; // Dành riêng cho test case khảo sát /survey/TRM-HDVF
  item.customerName = NAM_TRAM_CUSTOMER.name;
  item.phone = NAM_TRAM_CUSTOMER.phone;
  item.email = NAM_TRAM_CUSTOMER.email;
  item.notes = "👑 Thượng khách Nam Trầm quen thuộc của nhà hàng";
  item.depositAmount = 0; // Nam Trầm được miễn cọc theo đặc quyền FR-22
  item.source = i % 2 === 0 ? "WEB" : "PHONE";
}

// Gán 1 lượt hôm nay cho Trần Nam Trầm với mã TRM-HQ7Q để demo check-in
const todayCandidates = reservations.filter(
  (r) => r.date.getTime() === TODAY.getTime() && r.slot === "SLOT_1945",
);
if (todayCandidates.length > 0) {
  const target = todayCandidates[0];
  target.code = "TRM-HQ7Q";
  target.customerName = NAM_TRAM_CUSTOMER.name;
  target.phone = NAM_TRAM_CUSTOMER.phone;
  target.email = NAM_TRAM_CUSTOMER.email;
  target.status = "CONFIRMED";
  target.notes = "👑 Thượng khách Nam Trầm — Tiệc check-in tiếp đón đối tác";
  target.source = "WEB";
}

// Gán 6 lượt SEATED cho Nguyễn Hữu Phúc (Hạng Nam Trầm)
for (let i = 7; i < Math.min(13, seatedList.length); i++) {
  const item = seatedList[i];
  item.customerName = "Nguyễn Hữu Phúc";
  item.phone = "0993738817";
  item.email = "phuc.nguyen@gmail.com";
  item.notes = "Thượng khách Hạng Nam Trầm (ưu tiên Wine Pairing)";
  item.pairing = "WINE";
  item.source = "PHONE";
}

// Gán 3 lượt SEATED cho Trần Hải Yến (Hạng Hương)
for (let i = 13; i < Math.min(16, seatedList.length); i++) {
  const item = seatedList[i];
  item.customerName = "Trần Hải Yến";
  item.phone = "0998593177";
  item.email = "yen.tran@gmail.com";
  item.notes = "Khách quen Hạng Hương";
  item.source = "ZALO";
}

// Gán 2 lượt SEATED cho Lê Thu Hằng (Hạng Hương)
for (let i = 16; i < Math.min(18, seatedList.length); i++) {
  const item = seatedList[i];
  item.customerName = "Lê Thu Hằng";
  item.phone = "0913889848";
  item.email = "hang.le@gmail.com";
  item.notes = "Khách quen Hạng Hương (ưa chuộng Tea Pairing)";
  item.pairing = "TEA";
  item.source = "WEB";
}

// =====================================================================
// WAITLIST — Danh sách chờ cho các tối Thứ Bảy kín chỗ (SLOT_1945)
// =====================================================================
const upcomingSaturdays: Date[] = [];
for (let offset = 1; offset <= 14; offset++) {
  const d = dayAt(offset);
  if (d.getUTCDay() === 6) upcomingSaturdays.push(d);
}

const WAITLIST_NAMES = [
  "Nguyễn Đăng Khoa",
  "Phạm Bảo Thảo Vy",
  "Lý Tuấn Kiệt",
  "Đặng Hải Đăng",
  "Hoàng Mỹ Linh",
  "Võ Quốc Huy",
  "Trịnh Thu Thảo",
];

const waitlist: {
  name: string;
  phone: string;
  partySize: number;
  date: Date;
  slot: string;
  position: number;
  status: string;
}[] = [];

let wlIdx = 0;
for (const sat of upcomingSaturdays.slice(0, 2)) {
  const count = sat === upcomingSaturdays[0] ? 4 : 3;
  for (let p = 1; p <= count; p++) {
    waitlist.push({
      name: WAITLIST_NAMES[wlIdx % WAITLIST_NAMES.length],
      phone: `09${randInt(10, 99)}${String(randInt(100000, 999999))}`,
      partySize: pick([2, 2, 4, 4]),
      date: sat,
      slot: "SLOT_1945",
      position: p,
      status: p === 1 ? "INVITED" : "WAITING",
    });
    wlIdx++;
  }
}

// =====================================================================
// KHẢO SÁT ĐÁNH GIÁ (SURVEY) — FR-23 CHO CÁC LƯỢT SEATED TRONG QUÁ KHỨ
// =====================================================================
const SURVEY_COMMENTS = [
  "Món súp bồ câu tiềm sen rất đậm đà và thanh mát. Không gian ấm cúng, nhạc nền êm dịu.",
  "Tasting Menu 7 món được dẫn dắt rất cuốn hút. Nhân viên giải thích chi tiết nguồn gốc nguyên liệu.",
  "Gói Wine Pairing kết hợp với món cá tuyết và bò sốt tiêu rừng vô cùng xuất sắc!",
  "Đêm kỷ niệm ngày cưới thật trọn vẹn tại TRẦM. Cảm ơn nhà hàng đã chuẩn bị nến và hoa chu đáo.",
  "Món chè sen long nhãn tráng miệng và trà Shan Tuyết cổ thụ để lại hậu vị khó quên.",
  "Phục vụ nhẹ nhàng, chuyên nghiệp và rất tinh tế. Chắc chắn sẽ quay lại cùng đối tác.",
  "Món ăn rất ngon và tinh hoa ẩm thực Việt. Ca tối khá đông khách nhưng mọi thứ vẫn chỉn chu.",
  "Bàn hướng ra sân sau rất thoáng và riêng tư. Bò nướng lá chuối mềm mọng nước tuyệt vời.",
  "Rất ấn tượng với set Tea Pairing không cồn, thơm phức hương trà hoa và thảo mộc vùng cao.",
  "Trải nghiệm fine dining hương vị Việt đúng nghĩa. Đã giới thiệu cho nhiều bạn bè.",
  "Không gian trầm hương dễ chịu, ánh sáng vừa phải tạo cảm giác thư giãn tuyệt đối sau ngày làm việc.",
  "Món khai vị bánh tôm giòn rụm và nước chấm pha chuẩn vị Bắc. Rất đáng tiền!",
];

// =====================================================================
// THỰC THI GHI VÀO DATABASE
// =====================================================================
async function main() {
  console.log("Xóa dữ liệu cũ...");
  await db.survey.deleteMany();
  await db.waitlistEntry.deleteMany();
  await db.reservation.deleteMany();
  await db.table.deleteMany();

  console.log("Tạo 12 bàn...");
  const tableRows = await db.table.createMany({
    data: TABLES,
  });
  console.log(`  → Đã tạo ${tableRows.count} bàn`);

  const tableMap = new Map<string, string>();
  for (const t of await db.table.findMany()) {
    tableMap.set(t.code, t.id);
  }

  console.log("Tạo lượt đặt bàn...");
  const reservationData = reservations
    .map((r) => {
      const tableId = tableMap.get(r.tableCode);
      if (!tableId) return null;
      return {
        code: r.code,
        customerName: r.customerName,
        phone: r.phone,
        email: r.email,
        partySize: r.partySize,
        tableId,
        date: r.date,
        slot: r.slot,
        pairing: r.pairing,
        notes: r.notes,
        allergy: r.allergy,
        status: r.status,
        depositAmount: r.depositAmount,
        source: r.source,
        createdAt: r.createdAt,
      };
    })
    .filter(Boolean) as any[];

  await db.reservation.createMany({
    data: reservationData,
  });
  console.log(`  → Đã tạo ${reservationData.length} lượt đặt bàn`);

  console.log("Tạo danh sách chờ (Waitlist)...");
  await db.waitlistEntry.createMany({
    data: waitlist,
  });
  console.log(`  → Đã tạo ${waitlist.length} lượt chờ`);

  console.log("Tạo dữ liệu khảo sát 5 sao (FR-23)...");
  const seatedReservations = await db.reservation.findMany({
    where: { status: "SEATED" },
    select: { id: true, code: true, date: true },
  });

  const surveyData: any[] = [];
  for (const res of seatedReservations) {
    // Không tạo survey cho TRM-HDVF để đường dẫn /survey/TRM-HDVF dùng được cho test case trực tiếp
    if (res.code === "TRM-HDVF") continue;

    // Khoảng 65% khách đã dùng bữa gửi khảo sát phản hồi
    if (rng() < 0.65) {
      const isFiveStar = rng() < 0.78;
      const overallRating = isFiveStar ? 5 : 4;
      surveyData.push({
        reservationId: res.id,
        rating: overallRating,
        foodRating: isFiveStar ? 5 : pick([4, 5]),
        serviceRating: isFiveStar ? 5 : pick([4, 5]),
        ambianceRating: isFiveStar ? 5 : pick([4, 5]),
        pairingRating: isFiveStar ? 5 : pick([4, 5]),
        comment: rng() < 0.88 ? pick(SURVEY_COMMENTS) : null,
        recommend: true,
        bonusPointsGiven: 200,
        createdAt: new Date(
          res.date.getTime() + randInt(2, 6) * 3600 * 1000,
        ),
      });
    }
  }

  await db.survey.createMany({
    data: surveyData,
  });
  const surveyCount = surveyData.length;
  console.log(`  → Đã tạo ${surveyCount} bản ghi khảo sát chất lượng`);

  console.log("Cập nhật cài đặt chương trình đặt bàn mở rộng...");
  await db.bookingSetting.upsert({
    where: { id: "default" },
    update: {
      programEnabled: true,
      programName: "Thực đơn “Tiến Vua” - Tasting Menu 7 món (1.440.000 đ/khách)",
      programMode: "range",
      programStartDate: "2026-10-15",
      programEndDate: "2026-11-30",
      closedDates: "[]",
      allowMonday: false,
      notes: "Chương trình thực đơn “Tiến Vua” 7 món · 15 bàn (40 chỗ/ca) · Mở cửa Thứ Tư → Chủ Nhật",
    },
    create: {
      id: "default",
      programEnabled: true,
      programName: "Thực đơn “Tiến Vua” - Tasting Menu 7 món (1.440.000 đ/khách)",
      programMode: "range",
      programStartDate: "2026-10-15",
      programEndDate: "2026-11-30",
      closedDates: "[]",
      allowMonday: false,
      notes: "Chương trình thực đơn “Tiến Vua” 7 món · 15 bàn (40 chỗ/ca) · Mở cửa Thứ Tư → Chủ Nhật",
    },
  });

  // Đồng bộ file backup JSON
  try {
    const backupPath = path.resolve(process.cwd(), "db/booking-settings.json");
    const jsonContent = {
      programEnabled: true,
      programName: "Thực đơn “Tiến Vua” - Tasting Menu 7 món (1.440.000 đ/khách)",
      programMode: "range",
      programStartDate: "2026-10-15",
      programEndDate: "2026-11-30",
      programDays: [],
      closedDates: [],
      allowMonday: false,
      notes: "Chương trình thực đơn “Tiến Vua” 7 món · 15 bàn (40 chỗ/ca) · Mở cửa Thứ Tư → Chủ Nhật",
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(backupPath, JSON.stringify(jsonContent, null, 2), "utf8");
    console.log("  → Đã đồng bộ db/booking-settings.json");
  } catch (err) {
    console.warn("  ⚠ Không ghi được file JSON backup:", err);
  }

  // Thống kê nghiệm thu dữ liệu
  const all = await db.reservation.findMany();
  const sourceStats = { WEB: 0, PHONE: 0, ZALO: 0 };
  const statusStats: Record<string, number> = {};
  for (const r of all) {
    sourceStats[r.source as keyof typeof sourceStats] =
      (sourceStats[r.source as keyof typeof sourceStats] ?? 0) + 1;
    statusStats[r.status] = (statusStats[r.status] ?? 0) + 1;
  }

  const uniqueDates = new Set(all.map((r) => isoDate(r.date)));

  console.log("────────────────────────────────────────────────────────");
  console.log(`📊 TỔNG KẾT DỮ LIỆU ĐÃ SEED:`);
  console.log(`- Tổng lượt đặt bàn: ${all.length}`);
  console.log(`- Số ngày có lượt đặt: ${uniqueDates.size} ngày`);
  console.log(
    `- Phân bổ NGUỒN: Web: ${sourceStats.WEB} (${((sourceStats.WEB / all.length) * 100).toFixed(1)}%) | Hotline: ${sourceStats.PHONE} (${((sourceStats.PHONE / all.length) * 100).toFixed(1)}%) | Zalo: ${sourceStats.ZALO} (${((sourceStats.ZALO / all.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `- Trạng thái: SEATED: ${statusStats["SEATED"] || 0} | CONFIRMED: ${statusStats["CONFIRMED"] || 0} | PENDING: ${statusStats["PENDING"] || 0} | CANCELLED: ${statusStats["CANCELLED"] || 0} | NO_SHOW: ${statusStats["NO_SHOW"] || 0}`,
  );
  console.log(`- Tổng số khảo sát đánh giá: ${surveyCount}`);
  console.log(`- Khách VIP Nam Trầm: ${NAM_TRAM_CUSTOMER.name} (0909999999) - Có mã test TRM-HDVF và TRM-HQ7Q`);
  console.log("────────────────────────────────────────────────────────");
  await seedBomDatabase();
  console.log("Seed hoàn tất thành công ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
