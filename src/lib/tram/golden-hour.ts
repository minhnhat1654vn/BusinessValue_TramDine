// FR-34: Tính năng Khung Giờ Vàng (Golden Hour Promotion)
// Tự động rà soát tỷ lệ lấp đầy ca chiều (17:30) các ngày Thứ 4, Thứ 5, Thứ 6
// Tung Voucher kích cầu qua kênh Zalo OA thông báo tỷ lệ lấp đầy minh bạch cho khách hàng

import { RESTAURANT, PRICES } from "./constants";
import {
  WEEKDAY_FULL_LABELS,
  WEEKDAY_LABELS,
  formatPercent,
  formatVND,
  parseISODate,
  toISODate,
  weekdayOf,
} from "./format";

export type GoldenHourDiscountType = "PERCENT" | "AMOUNT" | "TEA_PAIRING";
export type GoldenHourAudience = "ALL" | "VIP" | "ZALO_USERS";

export interface GoldenHourRuleConfig {
  applicableDays: number[]; // [3, 4, 5] ứng với Thứ 4, Thứ 5, Thứ 6
  applicableSlot: "SLOT_1730";
  minOccupancyPct: number; // Mặc định 0%
  maxOccupancyPct: number; // Mặc định 50%
  defaultDiscountType: GoldenHourDiscountType;
  defaultDiscountValue: number; // 15 (%) hoặc 200000 (đ) hoặc 350000 (Tea pairing)
  autoAlertOnDashboard: boolean;
}

export const DEFAULT_GOLDEN_HOUR_CONFIG: GoldenHourRuleConfig = {
  applicableDays: [3, 4, 5], // Thứ 4, Thứ 5, Thứ 6
  applicableSlot: "SLOT_1730",
  minOccupancyPct: 0,
  maxOccupancyPct: 50,
  defaultDiscountType: "PERCENT",
  defaultDiscountValue: 15, // Giảm 15%
  autoAlertOnDashboard: true,
};

export interface GoldenHourCampaign {
  id: string; // "gh-camp-xxxx"
  createdAt: string; // ISO string
  targetDate: string; // YYYY-MM-DD
  slot: "SLOT_1730";
  voucherCode: string;
  discountType: GoldenHourDiscountType;
  discountValue: number;
  discountSummary: string;
  occupancyAtLaunch: number; // % lấp đầy tại thời điểm tung voucher
  bookedSeatsAtLaunch: number;
  availableSeatsAtLaunch: number;
  targetAudience: GoldenHourAudience;
  sentCount: number;
  zaloMessageBody: string;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
}

export interface GoldenHourShiftSlot {
  date: string; // YYYY-MM-DD
  weekday: number; // 3, 4, 5
  weekdayLabel: string; // "Thứ Tư", "Thứ Năm", "Thứ Sáu"
  shortWeekdayLabel: string; // "T4", "T5", "T6"
  slot: "SLOT_1730";
  slotLabel: string; // "17:30"
  capacity: number; // 40 chỗ
  bookedSeats: number;
  availableSeats: number;
  occupancyPct: number; // % lấp đầy hiện thời
  isEligible: boolean; // Nằm trong dải Min% - Max% cần kích cầu
  hasActiveCampaign: boolean;
  activeCampaign?: GoldenHourCampaign;
}

export interface GoldenHourSummary {
  config: GoldenHourRuleConfig;
  slots: GoldenHourShiftSlot[];
  campaigns: GoldenHourCampaign[];
  totalEligibleShifts: number;
  avgOccupancyPct: number;
  totalCampaignsLaunched: number;
  totalVouchersSent: number;
  rescuedSeatsEstimated: number;
}

/** Kiểm tra ca có thuộc phạm vi Khung Giờ Vàng không (Thứ 4, 5, 6 ca 17:30) */
export function isGoldenHourShift(
  date: string,
  slot: string,
  config: GoldenHourRuleConfig = DEFAULT_GOLDEN_HOUR_CONFIG,
): boolean {
  if (slot !== config.applicableSlot) return false;
  const wd = weekdayOf(date);
  return config.applicableDays.includes(wd);
}

/** Diễn giải mô tả ưu đãi */
export function formatGoldenHourDiscount(
  type: GoldenHourDiscountType,
  value: number,
): string {
  switch (type) {
    case "PERCENT":
      return `Giảm ${value}% Menu Tasting (Chỉ ${formatVND(
        Math.round(PRICES.menu * (1 - value / 100)),
      )}/khách)`;
    case "AMOUNT":
      return `Giảm ${formatVND(value)}/khách trên hóa đơn Tasting Menu`;
    case "TEA_PAIRING":
      return `Tặng 01 Set Tea Pairing cao cấp (${formatVND(PRICES.teaPairing)}/khách)`;
    default:
      return "Ưu đãi Khung Giờ Vàng";
  }
}

/** Sinh mã voucher duy nhất gắn với ngày & thứ */
export function generateGoldenHourVoucherCode(date: string, weekday: number): string {
  const parts = date.split("-");
  const ddmm = parts.length === 3 ? `${parts[2]}${parts[1]}` : "1730";
  const wdTag = weekday === 3 ? "T4" : weekday === 4 ? "T5" : weekday === 5 ? "T6" : "1730";
  return `GOLDEN-${wdTag}-${ddmm}`;
}

/**
 * Xây dựng nội dung tin nhắn Zalo OA ZNS chuyên nghiệp
 * Thông báo minh bạch tỷ lệ lấp đầy hiện tại cho khách hàng theo yêu cầu FR-34
 */
export function buildGoldenHourZaloMessage(params: {
  slot: GoldenHourShiftSlot;
  voucherCode: string;
  discountType: GoldenHourDiscountType;
  discountValue: number;
  customerName?: string;
}): string {
  const { slot, voucherCode, discountType, discountValue, customerName = "Quý khách" } = params;
  const discountText = formatGoldenHourDiscount(discountType, discountValue);

  return `[TRẦM RESERVE · ZALO OFFICIAL ACCOUNT]
⚡ ĐẶC QUYỀN KHUNG GIỜ VÀNG — CA CHIỀU 17:30

Kính gửi ${customerName},

TRẦM trân trọng thông báo: Ca chiều 17:30 ${slot.weekdayLabel} (ngày ${slot.date.split("-").reverse().join("/")}) hiện đang đạt tỷ lệ lấp đầy ${formatPercent(slot.occupancyPct, 1)} (chỉ còn lại ${slot.availableSeats} chỗ trống / ${slot.capacity} chỗ).

Nhằm tối ưu trải nghiệm ẩm thực thư thái vào đầu buổi tối, TRẦM dành tặng Thượng khách mã Voucher Khung Giờ Vàng độc quyền:

🏷️ MÃ VOUCHER: ${voucherCode}
🎁 ƯU ĐÃI: ${discountText}
⏰ KHUNG GIỜ ÁP DỤNG: 17:30 ${slot.weekdayLabel} (Ca chiều sớm)
📍 ĐỊA ĐIỂM: ${RESTAURANT.name} — ${RESTAURANT.address}

* Lưu ý: Số lượng voucher có giới hạn theo số chỗ trống còn lại. Quý khách vui lòng đặt bàn trước 16:00 cùng ngày để TRẦM chuẩn bị nguyên liệu tiếp đón chu đáo nhất.

Quý khách bấm nút "Nhận Voucher & Đặt Bàn Ngay" bên dưới hoặc liên hệ Hotline ${RESTAURANT.hotline} để được giữ chỗ ưu tiên!`;
}

/**
 * Phân tích danh sách các ca chiều T4-T6 trong cửa sổ ngày
 */
export function evaluateGoldenHourShifts(params: {
  today: string;
  reservations: Array<{
    date: string | Date;
    slot: string;
    partySize: number;
    status: string;
  }>;
  campaigns: GoldenHourCampaign[];
  config?: GoldenHourRuleConfig;
  daysSpan?: number; // Mặc định 28 ngày (4 tuần quanh hôm nay)
}): GoldenHourSummary {
  const config = params.config ?? DEFAULT_GOLDEN_HOUR_CONFIG;
  const today = params.today;
  const daysSpan = params.daysSpan ?? 28;

  // Bản đồ tổng số khách theo ngày
  const bookedByDate = new Map<string, number>();
  for (const r of params.reservations) {
    if (r.slot !== config.applicableSlot) continue;
    if (r.status !== "CONFIRMED" && r.status !== "SEATED" && r.status !== "PENDING") {
      continue;
    }
    const isoDate = typeof r.date === "string" ? r.date.slice(0, 10) : toISODate(r.date);
    const prev = bookedByDate.get(isoDate) ?? 0;
    bookedByDate.set(isoDate, prev + r.partySize);
  }

  // Bản đồ chiến dịch theo ngày
  const campaignByDate = new Map<string, GoldenHourCampaign>();
  for (const camp of params.campaigns) {
    if (camp.status === "ACTIVE") {
      campaignByDate.set(camp.targetDate, camp);
    }
  }

  // Quét các ngày T4, T5, T6 trong 4 tuần (từ hôm nay - 7 ngày đến hôm nay + 21 ngày)
  const slots: GoldenHourShiftSlot[] = [];
  const startDay = parseISODate(today);
  startDay.setUTCDate(startDay.getUTCDate() - 7);

  for (let i = 0; i < daysSpan; i++) {
    const cur = new Date(startDay);
    cur.setUTCDate(cur.getUTCDate() + i);
    const isoDate = toISODate(cur);
    const wd = weekdayOf(isoDate);

    // Chỉ lọc Thứ 4 (3), Thứ 5 (4), Thứ 6 (5)
    if (!config.applicableDays.includes(wd)) continue;

    const booked = bookedByDate.get(isoDate) ?? 0;
    const capacity = RESTAURANT.totalSeats; // Cố định 12 bàn 40 chỗ
    const available = Math.max(0, capacity - booked);
    const occupancyPct = Number(((booked / capacity) * 100).toFixed(1));

    // Ca đủ điều kiện kích cầu nếu nằm trong khoảng [minOccupancyPct, maxOccupancyPct]
    const isEligible =
      occupancyPct >= config.minOccupancyPct && occupancyPct <= config.maxOccupancyPct;

    const activeCampaign = campaignByDate.get(isoDate);

    slots.push({
      date: isoDate,
      weekday: wd,
      weekdayLabel: WEEKDAY_FULL_LABELS[wd],
      shortWeekdayLabel: WEEKDAY_LABELS[wd],
      slot: "SLOT_1730",
      slotLabel: "17:30",
      capacity,
      bookedSeats: booked,
      availableSeats: available,
      occupancyPct,
      isEligible,
      hasActiveCampaign: !!activeCampaign,
      activeCampaign,
    });
  }

  // Sắp xếp theo ngày tăng dần
  slots.sort((a, b) => a.date.localeCompare(b.date));

  const eligibleSlots = slots.filter((s) => s.isEligible && s.date >= today);
  const totalOccupancy = slots.reduce((sum, s) => sum + s.occupancyPct, 0);
  const avgOccupancyPct =
    slots.length > 0 ? Number((totalOccupancy / slots.length).toFixed(1)) : 0;

  const totalVouchersSent = params.campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const rescuedSeatsEstimated = params.campaigns.reduce(
    (sum, c) => sum + Math.min(12, Math.round(c.sentCount * 0.15)),
    0,
  );

  return {
    config,
    slots,
    campaigns: params.campaigns,
    totalEligibleShifts: eligibleSlots.length,
    avgOccupancyPct,
    totalCampaignsLaunched: params.campaigns.length,
    totalVouchersSent,
    rescuedSeatsEstimated,
  };
}

