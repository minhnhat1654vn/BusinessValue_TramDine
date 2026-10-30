// Hàm tiện ích ngày tháng & định dạng — mọi phép tính ngày đều dựa trên UTC
// để tránh lệch múi giờ giữa client và server (date chỉ mang phần ngày)

export const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const WEEKDAY_FULL_LABELS = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

/** Ngày hiện tại (client) dạng YYYY-MM-DD theo giờ địa phương */
export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Chuyển Date (UTC midnight) → YYYY-MM-DD */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Chuyển YYYY-MM-DD → Date tại 00:00 UTC (an toàn với timezone) */
export function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Thêm n ngày (giữ UTC midnight) */
export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Thứ trong tuần của một ngày ISO (0 = Chủ nhật) */
export function weekdayOf(iso: string): number {
  return parseISODate(iso).getUTCDay();
}

/** Nhà hàng nghỉ thứ Hai */
export function isClosedMonday(iso: string): boolean {
  return weekdayOf(iso) === 1;
}

/** Nhãn ngắn: "T6 24/10" */
export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  const wd = WEEKDAY_LABELS[d.getUTCDay()];
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  return `${wd} ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

/** Nhãn dài: "Thứ Bảy, 25/10/2025" */
export function formatLongDate(iso: string): string {
  const d = parseISODate(iso);
  const wd = WEEKDAY_FULL_LABELS[d.getUTCDay()];
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return `${wd}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** Nhãn thân thiện cho dòng thời gian nhắc lịch */
export function relativeDayLabel(iso: string, todayISO: string): string {
  const diff = Math.round(
    (parseISODate(iso).getTime() - parseISODate(todayISO).getTime()) / 86400000,
  );
  if (diff === 0) return "hôm nay";
  if (diff === 1) return "ngày mai";
  if (diff > 1) return `sau ${diff} ngày`;
  return `${Math.abs(diff)} ngày trước`;
}

/** Định dạng tiền VND: 1.190.000 đ */
export function formatVND(amount: number): string {
  const parts = Math.round(amount).toString().split("");
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const remaining = parts.length - i;
    out += parts[i];
    if (remaining > 1 && remaining % 3 === 1) out += ".";
  }
  return `${out} đ`;
}

/** Định dạng phần trăm kiểu Việt Nam: "52,4%" */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}
