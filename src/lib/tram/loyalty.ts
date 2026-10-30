// FR-21: Chương trình ba hạng thân thiết — TRẦM Reserve (Đặc tả Bảng 8 nhóm 8)
// 3 Hạng:
// 1. Hạng HƯƠNG (0–2 lượt đến)
// 2. Hạng TRẦM (3–5 lượt đến)
// 3. Hạng NAM TRẦM (6+ lượt đến)

import type { LoyaltyTier } from "./types";

export interface TierConfig {
  key: LoyaltyTier;
  name: string;
  tagline: string;
  minVisits: number;
  maxVisits: number;
  bonusPercent: number; // Tỷ lệ điểm thưởng theo hạng (FR-20 & FR-21: 0%, 5%, 8%)
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardGradient: string;
  accentColor: string;
  iconName: "Award" | "Crown" | "Gem";
  benefits: string[];
}

export const LOYALTY_TIERS: Record<LoyaltyTier, TierConfig> = {
  HUONG: {
    key: "HUONG",
    name: "Hạng Hương",
    tagline: "Khởi sắc phong vị (0–2 lượt)",
    minVisits: 0,
    maxVisits: 2,
    bonusPercent: 0, // Điểm cơ bản 1.000 đ = 1 pt
    badgeBg: "bg-stone-100 dark:bg-stone-800",
    badgeText: "text-stone-800 dark:text-stone-200 font-bold",
    badgeBorder: "border-stone-400 dark:border-stone-600",
    cardGradient: "bg-gradient-to-br from-[#292524] via-[#38332f] to-[#1c1917] text-stone-100",
    accentColor: "#a8a29e",
    iconName: "Award",
    benefits: [
      "Áp dụng cho khách từ 0 đến 2 lượt đến TRẦM Reserve",
      "Tích lũy 1 điểm cho mỗi 1.000 đ chi tiêu hóa đơn (FR-20)",
      "Thiệp chúc mừng và quà tặng sinh nhật từ nhà hàng",
      "Nhận trước thông tin thực đơn tasting theo mùa",
      "Hỗ trợ đổi ca đặt bàn linh hoạt trước 24 giờ",
    ],
  },
  TRAM: {
    key: "TRAM",
    name: "Hạng Trầm",
    tagline: "Tri kỷ phong vị (3–5 lượt)",
    minVisits: 3,
    maxVisits: 5,
    bonusPercent: 5, // Thưởng thêm 5% giá trị hóa đơn
    badgeBg: "bg-amber-100 dark:bg-amber-950/70",
    badgeText: "text-amber-900 dark:text-amber-100 font-bold",
    badgeBorder: "border-amber-500/60 dark:border-amber-600",
    cardGradient: "bg-gradient-to-br from-[#78350f] via-[#92400e] to-[#451a03] text-amber-50",
    accentColor: "#fcd34d",
    iconName: "Crown",
    benefits: [
      "Áp dụng cho khách từ 3 đến 5 lượt đến TRẦM Reserve",
      "Thưởng thêm +5% điểm tích lũy trên mỗi hóa đơn dùng bữa",
      "Ưu tiên chọn và giữ bàn đẹp (khu vực cửa sổ / trung tâm)",
      "Tặng trà chào mừng thượng hạng chế tác riêng theo mùa",
      "Miễn phí phí phục vụ mở rượu (corkage fee) cho 01 chai vang",
      "Ưu tiên xử lý danh sách chờ (Waitlist Fast-track) khi kín chỗ",
    ],
  },
  NAM_TRAM: {
    key: "NAM_TRAM",
    name: "Hạng Nam Trầm",
    tagline: "Thượng khách tinh hoa (6+ lượt)",
    minVisits: 6,
    maxVisits: Infinity,
    bonusPercent: 8, // Thưởng tối đa 8% giá trị hóa đơn
    badgeBg: "bg-gradient-to-r from-amber-500/25 via-rose-500/25 to-purple-500/25",
    badgeText: "text-amber-950 dark:text-amber-100 font-extrabold",
    badgeBorder: "border-amber-500/70",
    cardGradient: "bg-gradient-to-br from-[#12081f] via-[#24133b] to-[#0c0514] border-b border-amber-500/50 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.25)]",
    accentColor: "#fbbf24",
    iconName: "Gem",
    benefits: [
      "Áp dụng cho khách từ 6 lượt đến trở lên (Hạng cao nhất)",
      "Thưởng tối đa +8% điểm tích lũy trên mỗi hóa đơn dùng bữa",
      "Miễn 100% tiền đặt cọc khi đặt bàn trực tuyến",
      "Tặng món tasting độc bản sáng tạo riêng từ Bếp trưởng",
      "Ưu tiên sắp xếp Bàn VIP và không gian riêng tư tối đa",
      "Đường dây nóng chăm sóc Thượng khách Nam Trầm 24/7",
      "Thư mời tham dự Dạ tiệc Tasting Rượu & Trà độc quyền hàng quý",
    ],
  },
};

/**
 * Đặc tả Bảng 8 nhóm 8: Bảng so sánh 3 hạng và toàn bộ quyền lợi
 */
export const BANG_8_TIER_COMPARISON = [
  {
    criterion: "Số lượt đến yêu cầu",
    huong: "0 – 2 lượt",
    tram: "3 – 5 lượt",
    namTram: "Từ 6 lượt trở lên",
    highlight: true,
  },
  {
    criterion: "Tỷ lệ tích điểm cơ bản",
    huong: "1.000 đ = 1 điểm",
    tram: "1.000 đ = 1 điểm",
    namTram: "1.000 đ = 1 điểm",
    highlight: false,
  },
  {
    criterion: "Thưởng điểm hóa đơn (FR-20)",
    huong: "0% (Cơ bản)",
    tram: "+5% điểm hóa đơn",
    namTram: "+8% điểm hóa đơn (Tối đa)",
    highlight: true,
  },
  {
    criterion: "Chính sách đặt cọc",
    huong: "Cọc 300.000 đ/khách",
    tram: "Cọc 300.000 đ/khách",
    namTram: "Miễn 100% tiền cọc",
    highlight: true,
  },
  {
    criterion: "Ưu tiên xếp bàn",
    huong: "Sắp xếp theo thứ tự",
    tram: "Ưu tiên khu cửa sổ / trung tâm",
    namTram: "Bàn VIP & Không gian riêng tư nhất",
    highlight: false,
  },
  {
    criterion: "Đãi ngộ ẩm thực độc quyền",
    huong: "Thiệp chúc mừng sinh nhật",
    tram: "Trà chào mừng + Miễn phí khui vang",
    namTram: "Món tasting bếp trưởng + Khui vang",
    highlight: true,
  },
  {
    criterion: "Xử lý danh sách chờ (Waitlist)",
    huong: "Thứ tự tiêu chuẩn",
    tram: "Ưu tiên gọi mời khi có bàn hủy",
    namTram: "Ưu tiên cao nhất (Fast-track)",
    highlight: false,
  },
  {
    criterion: "Chăm sóc & Đặc quyền riêng",
    huong: "Bản tin menu theo mùa",
    tram: "Đổi ca linh hoạt trước 24h",
    namTram: "Hotline Thượng khách 24/7 + Yến tiệc quý",
    highlight: true,
  },
];

export interface BillPointsReward {
  billTotal: number;
  basePoints: number; // 1.000 đ = 1 điểm
  bonusPercent: number; // 0%, 5%, 8%
  bonusPoints: number; // Điểm thưởng thêm
  totalEarnedPoints: number; // basePoints + bonusPoints
}

/**
 * FR-20 & FR-21: Tính điểm tích lũy từ hóa đơn:
 * - 1.000 đ = 1 điểm
 * - Thưởng thêm theo 3 hạng: Hương (0%), Trầm (5%), Nam Trầm (8%)
 */
export function calculatePointsFromBill(
  billTotal: number,
  tier: LoyaltyTier = "HUONG",
): BillPointsReward {
  const basePoints = Math.floor(billTotal / 1000);
  const bonusPercent = LOYALTY_TIERS[tier]?.bonusPercent ?? 0;
  const bonusPoints = Math.round(basePoints * (bonusPercent / 100));
  const totalEarnedPoints = basePoints + bonusPoints;

  return {
    billTotal,
    basePoints,
    bonusPercent,
    bonusPoints,
    totalEarnedPoints,
  };
}

/**
 * FR-21: Xác định hạng thân thiết và tiến độ theo 3 hạng:
 * - Hạng HƯƠNG: 0 – 2 lượt đến
 * - Hạng TRẦM: 3 – 5 lượt đến
 * - Hạng NAM TRẦM: 6+ lượt đến
 */
export function calculateLoyalty(totalSpend: number, visits: number) {
  const points = Math.floor(totalSpend / 1000);
  let tier: LoyaltyTier = "HUONG";
  let nextTierVisits = 3;
  let nextTierName = "Hạng Trầm";
  let tierProgress = 0;

  if (visits >= 6) {
    tier = "NAM_TRAM";
    nextTierVisits = 6;
    nextTierName = "Hạng tối cao";
    tierProgress = 100;
  } else if (visits >= 3) {
    tier = "TRAM";
    nextTierVisits = 6;
    nextTierName = "Hạng Nam Trầm";
    // Tiến độ từ 3 lên 6 lượt: (visits - 3) / (6 - 3)
    tierProgress = Math.min(100, Math.round(((visits - 3) / 3) * 100));
  } else {
    tier = "HUONG";
    nextTierVisits = 3;
    nextTierName = "Hạng Trầm";
    // Tiến độ từ 0 lên 3 lượt: visits / 3
    tierProgress = Math.min(100, Math.round((visits / 3) * 100));
  }

  return {
    tier,
    points,
    visits,
    nextTierVisits,
    nextTierName,
    tierProgress: Math.max(tierProgress, 5), // tối thiểu 5% cho thanh hiển thị đẹp
  };
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("vi-VN").format(points);
}
