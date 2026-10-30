// FR-19 & FR-20: Quản lý hạng thân thiết và tích điểm theo hóa đơn — TRẦM Reserve
// FR-20: Quy tắc 1.000 đ = 1 điểm; thưởng 5–8% giá trị hóa đơn theo hạng khi khách Đã đến (SEATED)

import type { LoyaltyTier } from "./types";

export interface TierConfig {
  key: LoyaltyTier;
  name: string;
  tagline: string;
  minPoints: number;
  maxPoints: number;
  bonusPercent: number; // Tỷ lệ điểm thưởng theo hạng (FR-20: 5–8%)
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardGradient: string;
  accentColor: string;
  iconName: "Award" | "ShieldCheck" | "Crown" | "Gem";
  benefits: string[];
}

export const LOYALTY_TIERS: Record<LoyaltyTier, TierConfig> = {
  MEMBER: {
    key: "MEMBER",
    name: "Hạng Khởi Sắc",
    tagline: "Thành viên Thân thiết",
    minPoints: 0,
    maxPoints: 10000,
    bonusPercent: 0, // Điểm cơ bản
    badgeBg: "bg-stone-100 dark:bg-stone-800",
    badgeText: "text-stone-700 dark:text-stone-300",
    badgeBorder: "border-stone-300 dark:border-stone-700",
    cardGradient: "from-stone-800 via-stone-700 to-stone-900 text-stone-100",
    accentColor: "#a8a29e",
    iconName: "Award",
    benefits: [
      "Tích lũy 1 điểm cho mỗi 1.000 đ chi tiêu (FR-20)",
      "Quà chúc mừng sinh nhật từ nhà hàng",
      "Nhận bản tin thực đơn theo mùa trước công chúng",
    ],
  },
  SILVER: {
    key: "SILVER",
    name: "TRẦM Thanh Nhã",
    tagline: "Hội viên Bạc",
    minPoints: 10000,
    maxPoints: 25000,
    bonusPercent: 5, // FR-20: Thưởng +5% điểm
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-800 dark:text-slate-200",
    badgeBorder: "border-slate-300 dark:border-slate-600",
    cardGradient: "from-slate-700 via-slate-600 to-slate-800 text-white",
    accentColor: "#cbd5e1",
    iconName: "ShieldCheck",
    benefits: [
      "Thưởng +5% điểm tích lũy trên mỗi hóa đơn (FR-20)",
      "Tất cả quyền lợi hạng Khởi Sắc",
      "Ưu tiên giữ bàn khu cửa sổ khi đặt trước 48h",
      "Tặng trà chào mừng thượng hạng theo mùa",
      "Nhận lời mời sự kiện tasting rượu độc quyền",
    ],
  },
  GOLD: {
    key: "GOLD",
    name: "TRẦM Hoàng Kim",
    tagline: "Hội viên Vàng",
    minPoints: 25000,
    maxPoints: 50000,
    bonusPercent: 6.5, // FR-20: Thưởng +6.5% điểm
    badgeBg: "bg-amber-50 dark:bg-amber-950/50",
    badgeText: "text-amber-800 dark:text-amber-200",
    badgeBorder: "border-amber-400 dark:border-amber-600",
    cardGradient: "from-[#854d0e] via-[#b45309] to-[#78350f] text-amber-50",
    accentColor: "#fcd34d",
    iconName: "Crown",
    benefits: [
      "Thưởng +6.5% điểm tích lũy trên mỗi hóa đơn (FR-20)",
      "Tất cả quyền lợi hạng Thanh Nhã",
      "Miễn phí phí phục vụ mở rượu (corkage fee)",
      "Món tráng miệng đặc biệt chế tác riêng từ Bếp trưởng",
      "Ưu tiên xử lý danh sách chờ (Waitlist Fast-track)",
      "Giữ bàn vào khung giờ vàng cuối tuần",
    ],
  },
  DIAMOND: {
    key: "DIAMOND",
    name: "TRẦM Tinh Hoa",
    tagline: "Thượng khách Kim Cương",
    minPoints: 50000,
    maxPoints: Infinity,
    bonusPercent: 8, // FR-20: Thưởng +8% điểm tối đa
    badgeBg: "bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15",
    badgeText: "text-amber-900 dark:text-amber-100",
    badgeBorder: "border-amber-500/50",
    cardGradient: "from-[#1e1b18] via-[#292524] to-[#0c0a09] border border-amber-500/40 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.2)]",
    accentColor: "#fbbf24",
    iconName: "Gem",
    benefits: [
      "Thưởng tối đa +8% điểm tích lũy trên mỗi hóa đơn (FR-20)",
      "Đặc quyền tối thượng tại TRẦM",
      "Miễn 100% tiền cọc khi đặt bàn trực tuyến",
      "Được Bếp trưởng tư vấn thực đơn tasting cá nhân hóa",
      "Ưu tiên sắp xếp Bàn VIP và không gian riêng tư nhất",
      "Đường dây nóng chăm sóc thượng khách 24/7",
    ],
  },
};

export interface BillPointsReward {
  billTotal: number;
  basePoints: number; // 1.000 đ = 1 điểm
  bonusPercent: number; // 0%, 5%, 6.5%, 8%
  bonusPoints: number; // Điểm thưởng thêm
  totalEarnedPoints: number; // basePoints + bonusPoints
}

/**
 * FR-20: Tính điểm tích lũy từ hóa đơn một bữa ăn:
 * - 1.000 đ = 1 điểm
 * - Thưởng thêm 5% - 8% giá trị theo hạng thân thiết
 */
export function calculatePointsFromBill(
  billTotal: number,
  tier: LoyaltyTier = "MEMBER",
): BillPointsReward {
  const basePoints = Math.floor(billTotal / 1000);
  const bonusPercent = LOYALTY_TIERS[tier].bonusPercent;
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
 * Tính toán điểm tích lũy tổng hợp và xác định hạng thân thiết
 * Quy ước:
 * - 1.000 VNĐ chi tiêu = 1 điểm tích lũy cơ bản
 * - Khách đến từ 8 lần trở lên tự động thăng hạng DIAMOND (>= 50.000 pts)
 * - Khách đến từ 5 lần trở lên tự động tối thiểu hạng GOLD (>= 25.000 pts)
 * - Khách đến từ 2 lần trở lên tự động tối thiểu hạng SILVER (>= 10.000 pts)
 */
export function calculateLoyalty(totalSpend: number, visits: number) {
  const points = Math.floor(totalSpend / 1000);
  let tier: LoyaltyTier = "MEMBER";
  let nextTierPoints = 10000;
  let currentTierMin = 0;
  let nextTierName = "TRẦM Thanh Nhã (Bạc)";

  if (points >= 50000 || visits >= 8) {
    tier = "DIAMOND";
    currentTierMin = 50000;
    nextTierPoints = 50000;
    nextTierName = "Hạng cao nhất";
  } else if (points >= 25000 || visits >= 5) {
    tier = "GOLD";
    currentTierMin = 25000;
    nextTierPoints = 50000;
    nextTierName = "TRẦM Tinh Hoa (Kim Cương)";
  } else if (points >= 10000 || visits >= 2) {
    tier = "SILVER";
    currentTierMin = 10000;
    nextTierPoints = 25000;
    nextTierName = "TRẦM Hoàng Kim (Vàng)";
  } else {
    tier = "MEMBER";
    currentTierMin = 0;
    nextTierPoints = 10000;
    nextTierName = "TRẦM Thanh Nhã (Bạc)";
  }

  const tierProgress =
    tier === "DIAMOND"
      ? 100
      : Math.min(
          100,
          Math.max(
            5,
            Math.round(
              ((points - currentTierMin) / (nextTierPoints - currentTierMin)) *
                100,
            ),
          ),
        );

  return {
    tier,
    points,
    nextTierPoints,
    nextTierName,
    tierProgress,
  };
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("vi-VN").format(points);
}
