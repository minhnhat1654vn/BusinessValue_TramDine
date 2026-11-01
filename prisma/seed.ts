// Seed dữ liệu giả lập cho TRẦM Reserve
// Chạy: bun run db:seed  (hoặc bun prisma/seed.ts)
//
// Dữ liệu sinh tương đối so với NGÀY CHẠY SEED (2 tuần quá khứ → 2 tuần tương lai),
// đảm bảo dashboard luôn có số liệu tươi khi demo/chụp ảnh.
// Mọi lượt đặt đều hợp nghiệp vụ: không có thứ Hai, không trùng bàn cùng khung.

import { PrismaClient } from "@prisma/client";

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

// ---------- Bảng 12 bàn theo spec ----------
const TABLES = [
  { code: "A01", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "A02", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "A03", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "A04", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "A05", seats: 2, zone: "Khu cửa sổ (Dãy A)" },
  { code: "B01", seats: 4, zone: "Khu trung tâm (Khu B)" },
  { code: "B02", seats: 4, zone: "Khu trung tâm (Khu B)" },
  { code: "B03", seats: 4, zone: "Khu trung tâm (Khu B)" },
  { code: "B04", seats: 4, zone: "Khu trung tâm (Khu B)" },
  { code: "B05", seats: 4, zone: "Khu trung tâm (Khu B)" },
  { code: "B11", seats: 6, zone: "Khu sân sau" },
  { code: "B12", seats: 6, zone: "Khu sân sau" },
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
  const emailDomain = pick(["gmail.com", "gmail.com", "yahoo.com"]);
  return {
    name,
    phone: `09${randInt(10, 99)}${String(randInt(100000, 999999))}`,
    email:
      rng() < 0.7
        ? `${given}.${family}${randInt(1, 99)}@${emailDomain}`
        : null,
  };
}

// ~10 khách "quen" (đến nhiều lần) để hồ sơ khách đẹp
const REGULARS: Customer[] = NAMES.slice(0, 10).map(makeCustomer);
// Khách lẻ
const OTHERS: Customer[] = NAMES.slice(10).map(makeCustomer);

// ---------- Ghi chú / dị ứng ----------
const ALLERGIES = [
  "Hải sản",
  "Hải sản",
  "Tôm, cua",
  "Lạc (đậu phộng)",
  "Gluten",
  "Hải sản",
  "Không dùng rượu",
  "Hải sản",
  "Ớt cay",
  "Sữa",
];
const OCCASION_NOTES = [
  "Kỷ niệm ngày cưới",
  "Đặt bàn sinh nhật — giúp nhà hàng chuẩn bị nến",
  "Tiệc gia đình, ưu tiên chỗ yên tĩnh",
  "Có hai trẻ em đi cùng",
  "Kỷ niệm 5 năm làm việc",
  "Hẹn gặp đối tác, cần bàn hướng cửa sổ",
  "Ăn chay món đầu (bún đậu)",
  "Đón khách nước ngoài lần đầu đến Việt Nam",
];

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

function pickSource(): "WEB" | "PHONE" | "ZALO" {
  const r = rng();
  if (r < 0.55) return "WEB";
  if (r < 0.85) return "PHONE";
  return "ZALO";
}
function pickPairing(): "NONE" | "WINE" | "TEA" {
  const r = rng();
  if (r < 0.5) return "NONE";
  if (r < 0.85) return "WINE";
  return "TEA";
}

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
// PHÂN BỔ CHỖ THEO TỐI (mục tiêu mô phỏng: cuối tuần kín, đầu tuần thưa)
// Mỗi mục tiêu là "số chỗ muốn đặt" của một (ngày, khung).
// =====================================================================
interface EveningTarget {
  date: Date;
  slot: "SLOT_1730" | "SLOT_1945";
  seats: number;
  full?: boolean; // kín hoàn toàn (dùng cho T7 19:45 tương lai → có waitlist)
}

const targets: EveningTarget[] = [];
{
  // đếm số buổi đã dùng theo thứ trong tuần để rải đều 4 tuần
  const seen: Record<number, number> = {};
  for (let offset = -14; offset <= 14; offset++) {
    const date = dayAt(offset);
    const wd = date.getUTCDay();
    seen[wd] = (seen[wd] ?? 0) + 1;
    const n = seen[wd];

    if (wd === 1) continue; // thứ Hai nghỉ

    if (wd === 6) {
      // Thứ Bảy: 19:45 — tương lai kín 100% (khơi waitlist), quá khứ ~70%
      targets.push({
        date,
        slot: "SLOT_1945",
        seats: !isPast(date) ? 42 : 30,
        full: !isPast(date),
      });
      // Thứ Bảy: 17:30 — một buổi vừa phải
      if (n === 2) {
        targets.push({ date, slot: "SLOT_1730", seats: 14 });
      }
    } else if (wd === 0) {
      // Chủ nhật: 19:45 một buổi; 17:30 một buổi thưa
      if (n === 1) {
        targets.push({ date, slot: "SLOT_1945", seats: 20 });
        targets.push({ date, slot: "SLOT_1730", seats: 8 });
      }
    } else if (wd === 5) {
      // Thứ Sáu: 19:45 một buổi
      if (n === 1) {
        targets.push({ date, slot: "SLOT_1945", seats: 14 });
      }
    } else if (wd === 2) {
      // Thứ Ba 17:30: một buổi rất thưa (đúng spec "đầu tuần thưa")
      if (n === 1) {
        targets.push({ date, slot: "SLOT_1730", seats: 4 });
      }
    } else if (wd === 4) {
      // Thứ Năm 17:30: một buổi thưa
      if (n === 2) {
        targets.push({ date, slot: "SLOT_1730", seats: 6 });
      }
    }
  }

  // Đảm bảo HÔM NAY (nếu không phải thứ Hai) luôn có khách — màn quản trị
  // mở mặc định theo ngày hiện tại nên cần dữ liệu để demo.
  const todayHasTarget = targets.some(
    (t) => t.date.getTime() === TODAY.getTime(),
  );
  if (TODAY.getUTCDay() !== 1 && !todayHasTarget) {
    targets.push({ date: TODAY, slot: "SLOT_1945", seats: 16 });
  }
}

// =====================================================================
// SINH RESERVATIONS
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
  source: string;
  createdAt: Date;
}

const reservations: SeedReservation[] = [];

for (const t of targets) {
  // Xáo trộn bàn rồi lấy dần đến khi đạt mục tiêu chỗ
  const shuffled = [...TABLES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let acc = 0;
  for (const table of shuffled) {
    if (acc >= t.seats) break;
    // Quy mô đoàn: thường đúng sức bàn, thỉnh thoảng thiếu 1 người
    let party = table.seats;
    if (table.seats >= 4 && rng() < 0.28) party = table.seats - 1;
    if (t.full) party = table.seats; // tối kín: đoàn đúng sức bàn
    if (acc + party > t.seats && !t.full) continue;
    if (acc + party > t.seats && t.full) party = t.seats - acc;
    if (party < 2) continue;

    // Chọn khách: 30% là khách quen
    const customer =
      rng() < 0.3 ? pick(REGULARS) : pick(OTHERS);

    // Trạng thái theo mốc thời gian
    let status: string;
    if (isPast(t.date)) {
      status = "SEATED";
    } else {
      status = rng() < 0.12 ? "PENDING" : "CONFIRMED";
    }

    let createdAt = new Date(t.date);
    createdAt.setUTCDate(createdAt.getUTCDate() - randInt(1, 9));
    if (createdAt.getTime() > TODAY.getTime()) {
      createdAt = new Date(TODAY);
      createdAt.setUTCDate(createdAt.getUTCDate() - randInt(1, 5));
    }

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
      notes: rng() < 0.3 ? pick(OCCASION_NOTES) : null,
      allergy: null, // gán tập trung ở dưới
      status,
      depositAmount: 300000 * party,
      source: pickSource(),
      createdAt,
    });
    acc += party;
  }
}

// --- Đánh dấu no-show (quá khứ) ---
const pastIdx = reservations
  .map((r, i) => ({ r, i }))
  .filter((x) => isPast(x.r.date) && x.r.status === "SEATED")
  .map((x) => x.i);
const noShowCount = Math.min(6, pastIdx.length);
for (let k = 0; k < noShowCount; k++) {
  const idx = pastIdx.splice(Math.floor(rng() * pastIdx.length), 1)[0];
  reservations[idx].status = "NO_SHOW";
}

// --- Hủy bàn: vài lượt trong quá khứ và tương lai (tránh các tối thứ Bảy
// khung 19:45 tương lai — hai tối này phải kín 100% để demo waitlist) ---
const cancellable = reservations.map((r, i) => ({ r, i })).filter(
  (x) =>
    !["NO_SHOW"].includes(x.r.status) &&
    !(
      !isPast(x.r.date) &&
      x.r.date.getUTCDay() === 6 &&
      x.r.slot === "SLOT_1945"
    ) &&
    (isPast(x.r.date) ? x.r.status === "SEATED" : true),
);
let cancelled = 0;
for (const c of cancellable) {
  if (cancelled >= 5) break;
  if (rng() < 0.09) {
    c.r.status = "CANCELLED";
    cancelled += 1;
  }
}
// Bù thêm nếu ngẫu nhiên cho quá ít lượt hủy (cần "vài lượt" cho dashboard)
if (cancelled < 4) {
  const need = 4 - cancelled;
  const futureOnes = cancellable.filter(
    (c) => c.r.status !== "CANCELLED" && !isPast(c.r.date),
  );
  const pastOnes = cancellable.filter(
    (c) => c.r.status !== "CANCELLED" && isPast(c.r.date),
  );
  const extra: { r: SeedReservation }[] = [];
  for (let k = 0; extra.length < need; k++) {
    if (k < futureOnes.length) extra.push(futureOnes[k]);
    if (extra.length >= need) break;
    if (k < pastOnes.length) extra.push(pastOnes[k]);
    if (k >= futureOnes.length && k >= pastOnes.length) break;
  }
  for (const c of extra) {
    c.r.status = "CANCELLED";
    cancelled += 1;
  }
}

// --- Gán dị ứng cho ~9 lượt đặt (ưu tiên khung tương lai để badge đỏ lộ rõ) ---
let allergyCount = 0;
for (const r of reservations) {
  if (allergyCount >= 9) break;
  if (!r.allergy && r.status !== "CANCELLED" && rng() < 0.16) {
    r.allergy = pick(ALLERGIES);
    allergyCount += 1;
  }
}

// =====================================================================
// WAITLIST — 5 lượt chờ cho 2 thứ Bảy tới, khung 19:45 (đã kín bàn)
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
{
  let idx = 0;
  const sats = upcomingSaturdays.slice(0, 2);
  for (const sat of sats) {
    const per = sat === sats[0] ? 3 : 2; // thứ Bảy gần nhất: 3 người chờ
    for (let p = 1; p <= per; p++) {
      waitlist.push({
        name: WAITLIST_NAMES[idx % WAITLIST_NAMES.length],
        phone: `09${randInt(10, 99)}${String(randInt(100000, 999999))}`,
        partySize: pick([2, 2, 3, 4]),
        date: sat,
        slot: "SLOT_1945",
        position: p,
        status: idx === 0 || idx === 3 ? "INVITED" : "WAITING",
      });
      idx += 1;
    }
  }
}

// =====================================================================
// GHI VÀO DATABASE
// =====================================================================
async function main() {
  console.log("Xóa dữ liệu cũ...");
  await db.waitlistEntry.deleteMany();
  await db.reservation.deleteMany();
  await db.table.deleteMany();

  console.log("Tạo 12 bàn...");
  const tableRows = await db.table.createMany({
    data: TABLES,
  });
  console.log(`  → ${tableRows.count} bàn`);

  const tableMap = new Map<string, string>(); // code → id
  for (const t of await db.table.findMany()) tableMap.set(t.code, t.id);

  console.log("Tạo lượt đặt bàn...");
  for (const r of reservations) {
    await db.reservation.create({
      data: {
        code: r.code,
        customerName: r.customerName,
        phone: r.phone,
        email: r.email,
        partySize: r.partySize,
        tableId: tableMap.get(r.tableCode)!,
        date: r.date,
        slot: r.slot,
        pairing: r.pairing,
        notes: r.notes,
        allergy: r.allergy,
        status: r.status,
        depositAmount: r.depositAmount,
        source: r.source,
        createdAt: r.createdAt,
      },
    });
  }
  console.log(`  → ${reservations.length} lượt đặt bàn`);

  console.log("Tạo danh sách chờ...");
  for (const w of waitlist) {
    await db.waitlistEntry.create({ data: w });
  }
  console.log(`  → ${waitlist.length} lượt chờ`);

  // Thống kê nhanh để kiểm chứng
  const all = await db.reservation.findMany();
  const activeSlotKey = new Map<string, number>();
  for (const r of all) {
    if (r.status === "CANCELLED") continue;
    const key = `${isoDate(r.date)}|${r.slot}`;
    activeSlotKey.set(key, (activeSlotKey.get(key) ?? 0) + r.partySize);
  }
  const fill =
    Array.from(activeSlotKey.values()).reduce((s, v) => s + v / 42, 0) /
    Math.max(1, activeSlotKey.size);
  const sourceCount = { WEB: 0, PHONE: 0, ZALO: 0 };
  for (const r of all) sourceCount[r.source as keyof typeof sourceCount]++;
  console.log("────────────────────────────────────────");
  console.log(`Tổng lượt đặt: ${all.length}`);
  console.log(
    `Lấp chỗ trung bình (các khung có khách): ${(fill * 100).toFixed(1)}%`,
  );
  console.log(
    `Nguồn: Web ${sourceCount.WEB} / Điện thoại ${sourceCount.PHONE} / Zalo ${sourceCount.ZALO}`,
  );
  console.log("Seed hoàn tất ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
