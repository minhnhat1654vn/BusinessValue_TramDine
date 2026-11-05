// FR-37 & FR-38: Hệ thống quản lý Voucher cá nhân hóa & Tự động giảm giá
// - Khách mới: Giảm 10% Menu Tasting (WELCOME10)
// - Khách cũ (thỏa mãn cả 2 Option): Luôn có voucher cao hơn (15% + Quà tặng Trà Bánh Signature)
// - Cá nhân hóa từ dữ liệu món ăn FR-36: Gu Trà Bánh (COMBO-TEA15), Gu Rượu Vang (COMBO-WINE15), Gu ẩm thực (LOYAL15)
// - Khóa cứng: Chỉ áp dụng DUY NHẤT 1 voucher / đơn, không cộng dồn.

import { PRICES } from "./constants";
import { formatVND } from "./format";

export type VoucherType = "PERCENT_MENU" | "COMBO_TEA" | "COMBO_WINE" | "FIXED_AMOUNT";

export interface VoucherDefinition {
  code: string;
  name: string;
  description: string;
  type: VoucherType;
  discountPercent?: number; // Ví dụ 10 hoặc 15
  discountAmount?: number; // Giảm tiền mặt cố định
  targetAudience: "NEW" | "RETURNING" | "ALL";
  giftDescription?: string; // Quà tặng kèm (Option 2)
  minPartySize?: number;
}

export const SYSTEM_VOUCHERS: Record<string, VoucherDefinition> = {
  // 1. Voucher chào mừng khách mới
  WELCOME10: {
    code: "WELCOME10",
    name: "Ưu Đãi Chào Mừng Thực Khách Mới",
    description: "Giảm 10% Menu Tasting 7 món cho lần đầu ghé thăm TRẦM",
    type: "PERCENT_MENU",
    discountPercent: 10,
    targetAudience: "NEW",
  },

  // 2. Combo Cá nhân hóa Khách Cũ: Gu Trà & Bánh (FR-38)
  "COMBO-TEA15": {
    code: "COMBO-TEA15",
    name: "Combo Hoàng Gia: Trà & Bánh Trầm Hương",
    description: "Giảm 15% Menu Tasting + Tặng 100% Set Tea Pairing & Tráng miệng Sen",
    type: "COMBO_TEA",
    discountPercent: 15,
    targetAudience: "RETURNING",
    giftDescription: "Tặng 100% Set Trà & Bánh Signature Trầm và Sen (Trị giá 350.000 đ/khách)",
  },

  // 3. Combo Cá nhân hóa Khách Cũ: Gu Rượu Vang (FR-38)
  "COMBO-WINE15": {
    code: "COMBO-WINE15",
    name: "Combo Tinh Tuyển: Bữa Tiệc Rượu Vang",
    description: "Giảm 15% toàn bộ Combo Menu Tasting + Gói Wine Pairing hảo hạng",
    type: "COMBO_WINE",
    discountPercent: 15,
    targetAudience: "RETURNING",
    giftDescription: "Tặng 01 ly vang tráng miệng hảo hạng tuyển chọn từ Sommelier",
  },

  // 4. Khách cũ thân thiết chung (FR-38)
  LOYAL15: {
    code: "LOYAL15",
    name: "Tri Ân Thực Khách Thân Thiết",
    description: "Giảm 15% Menu Tasting 7 món dành riêng cho khách quay lại",
    type: "PERCENT_MENU",
    discountPercent: 15,
    targetAudience: "RETURNING",
    giftDescription: "Tặng 01 Tách Trà Trầm Khai Vị thượng hạng đón chào",
  },

  // 5. Khung Giờ Vàng (FR-34)
  "GOLDEN-T4-1111": {
    code: "GOLDEN-T4-1111",
    name: "Đặc Quyền Khung Giờ Vàng (Ca Chiều 17:30)",
    description: "Giảm 15% Menu Tasting áp dụng cho ca 17:30 Thứ 4",
    type: "PERCENT_MENU",
    discountPercent: 15,
    targetAudience: "ALL",
  },
  "GOLDEN-T6-0611": {
    code: "GOLDEN-T6-0611",
    name: "Đặc Quyền Khung Giờ Vàng (Ca Chiều 17:30)",
    description: "Giảm 15% Menu Tasting áp dụng cho ca 17:30 Thứ 6",
    type: "PERCENT_MENU",
    discountPercent: 15,
    targetAudience: "ALL",
  },
};

export interface AppliedVoucherResult {
  code: string;
  name: string;
  discountAmount: number;
  discountSummary: string;
  giftDescription?: string;
  originalTotal: number;
  finalTotal: number;
  depositAmount: number;
}

/**
 * Phân tích dữ liệu khách hàng từ FR-36 để gợi ý đúng Voucher theo gu ẩm thực
 */
export function getPersonalizedVoucherForCustomer(customer: {
  visits?: number;
  pastPairings?: string[];
  notes?: string;
}): VoucherDefinition {
  const visits = customer.visits ?? 0;

  // Khách mới (chưa từng dùng bữa tại TRẦM)
  if (visits === 0) {
    return SYSTEM_VOUCHERS.WELCOME10;
  }

  // Khách cũ: Phân tích thói quen đồ uống & món ăn từ FR-36
  const pastPairings = customer.pastPairings ?? [];
  const teaCount = pastPairings.filter((p) => p === "TEA").length;
  const wineCount = pastPairings.filter((p) => p === "WINE").length;

  if (teaCount > 0 && teaCount >= wineCount) {
    return SYSTEM_VOUCHERS["COMBO-TEA15"];
  }

  if (wineCount > 0) {
    return SYSTEM_VOUCHERS["COMBO-WINE15"];
  }

  // Mặc định khách cũ
  return SYSTEM_VOUCHERS.LOYAL15;
}

/**
 * Tính toán tự động giảm giá khi áp mã Voucher (FR-37 & FR-38)
 */
export function calculateVoucherDiscount(params: {
  code: string;
  partySize: number;
  pairing: "NONE" | "WINE" | "TEA";
  isReturningCustomer: boolean;
  date?: string;
  slot?: string;
}): { success: true; result: AppliedVoucherResult } | { success: false; error: string } {
  const normalizedCode = params.code.trim().toUpperCase();
  const voucher = SYSTEM_VOUCHERS[normalizedCode];

  if (!voucher) {
    return {
      success: false,
      error: `Mã ưu đãi "${params.code}" không tồn tại hoặc đã hết hạn sử dụng.`,
    };
  }

  // Kiểm tra đối tượng áp dụng
  if (voucher.targetAudience === "NEW" && params.isReturningCustomer) {
    return {
      success: false,
      error: `Mã "${voucher.code}" chỉ dành cho khách mới. Là khách thân thiết, bạn có mã ưu đãi cao hơn 15% là "COMBO-TEA15" hoặc "LOYAL15"!`,
    };
  }

  if (voucher.targetAudience === "RETURNING" && !params.isReturningCustomer) {
    return {
      success: false,
      error: `Mã "${voucher.code}" dành riêng cho thực khách thân thiết quay lại. Vui lòng áp dụng mã chào mừng "WELCOME10" (Giảm 10%)!`,
    };
  }

  const partySize = Math.max(1, params.partySize);
  const pairingPrice =
    params.pairing === "WINE"
      ? PRICES.winePairing
      : params.pairing === "TEA"
        ? PRICES.teaPairing
        : 0;

  const menuBaseTotal = partySize * PRICES.menu;
  const pairingTotal = partySize * pairingPrice;
  const originalTotal = menuBaseTotal + pairingTotal;

  let discountAmount = 0;
  let discountSummary = "";

  switch (voucher.type) {
    case "PERCENT_MENU": {
      // Giảm % trên phần Menu Tasting (1.190k)
      const pct = voucher.discountPercent ?? 10;
      discountAmount = Math.round(menuBaseTotal * (pct / 100));
      discountSummary = `Giảm ${pct}% Menu Tasting (${formatVND(discountAmount)})`;
      break;
    }

    case "COMBO_TEA": {
      // Giảm 15% Menu Tasting + Miễn phí hoàn toàn gói Tea Pairing nếu khách chọn
      const pct = voucher.discountPercent ?? 15;
      const menuDiscount = Math.round(menuBaseTotal * (pct / 100));
      // Nếu khách chọn gói TEA thì miễn phí trọn vẹn tiền Tea Pairing
      const teaDiscount = params.pairing === "TEA" ? pairingTotal : 0;
      discountAmount = menuDiscount + teaDiscount;
      discountSummary =
        params.pairing === "TEA"
          ? `Giảm 15% Menu + Miễn phí 100% Set Trà (${formatVND(discountAmount)})`
          : `Giảm 15% Menu Tasting (${formatVND(menuDiscount)})`;
      break;
    }

    case "COMBO_WINE": {
      // Giảm 15% trên toàn bộ Combo Menu + Wine Pairing
      const pct = voucher.discountPercent ?? 15;
      discountAmount = Math.round(originalTotal * (pct / 100));
      discountSummary = `Giảm ${pct}% toàn bộ Combo Menu & Rượu Vang (${formatVND(discountAmount)})`;
      break;
    }

    case "FIXED_AMOUNT": {
      discountAmount = Math.min(originalTotal, voucher.discountAmount ?? 0);
      discountSummary = `Giảm trực tiếp ${formatVND(discountAmount)}`;
      break;
    }
  }

  const finalTotal = Math.max(0, originalTotal - discountAmount);

  // Tiền đặt cọc theo tỷ lệ sau giảm
  const depositAmount = Math.min(finalTotal, partySize * PRICES.deposit);

  return {
    success: true,
    result: {
      code: voucher.code,
      name: voucher.name,
      discountAmount,
      discountSummary,
      giftDescription: voucher.giftDescription,
      originalTotal,
      finalTotal,
      depositAmount,
    },
  };
}
