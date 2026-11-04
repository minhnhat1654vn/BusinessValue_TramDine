// FR-32 — Danh sách mua trước ca cho bếp trưởng:
// Đối chiếu nhu cầu thực tế theo ca với tồn kho, tính số lượng thiếu hụt và chi phí mua.
// Tự động dựng sẵn mẫu tin nhắn chuyên nghiệp gửi nhà cung cấp qua Zalo và Email chuẩn nghiệp vụ nhà hàng.

import { formatLongDate, formatVND } from "./format";
import {
  INGREDIENTS,
  roundQty,
  type IngredientGroup,
  type IngredientUnit,
} from "./recipes";
import {
  IMPORT_UNIT_LABELS,
  getEffectiveImportPrice,
  getImportUnitFactor,
  type ImportUnit,
} from "./food-cost";
import { getEffectiveStockQty, USAGE_MAP } from "./inventory";
import { RESTAURANT, SLOT_LABELS } from "./constants";
import type { Slot } from "./types";

export interface PurchaseListItem {
  ingredientId: string;
  name: string;
  group: IngredientGroup;
  unit: IngredientUnit;
  spec?: string;
  origin?: string;
  /** Nhu cầu định lượng cho ca (đơn vị gốc g hoặc ml) */
  demandQty: number;
  /** Tồn kho hiện có (đơn vị gốc g hoặc ml) */
  stockQty: number;
  /** Số lượng thiếu = Math.max(0, demandQty - stockQty) (đơn vị gốc) */
  shortageQty: number;
  /** Số lượng thiếu quy đổi theo đơn vị nhập kho (kg, lít, ml) */
  shortageInImportUnit: number;
  importUnit: ImportUnit;
  importUnitLabel: string;
  importPrice: number;
  costPerBaseUnit: number;
  /** Chi phí mua = số thiếu × đơn giá (VND) */
  costTotal: number;
  formattedShortage: string;
  formattedCost: string;
}

export interface ShiftPurchaseReport {
  shiftDate: string;
  shiftSlot?: Slot | "ALL" | string;
  shiftLabel: string;
  formattedDate: string;
  deliveryDeadline: string;
  guests: number;
  /** Tổng số nguyên liệu có nhu cầu trong thực đơn ca này */
  totalCheckedIngredients: number;
  /** Số nguyên liệu thiếu cần đặt mua (thiếu > 0) */
  neededCount: number;
  /** Số nguyên liệu đã đủ tồn kho, không cần mua */
  sufficientCount: number;
  /** Tổng chi phí dự kiến để mua đủ số nguyên liệu thiếu (VND) */
  totalCost: number;
  formattedTotalCost: string;
  /** Danh sách nguyên liệu cần mua (chỉ các dòng thiếu > 0) */
  items: PurchaseListItem[];
  /** Đoạn tin nhắn Zalo chuẩn chỉnh, lịch sự sẵn sàng gửi */
  zaloMessage: string;
  /** Tiêu đề thư Email gửi nhà cung cấp */
  emailSubject: string;
  /** Toàn văn nội dung thư Email chính thức gửi nhà cung cấp */
  emailBody: string;
  /** Đoạn văn bản mặc định dùng khi bấm nút Sao chép nhanh */
  clipboardText: string;
}

export interface CalculateShiftPurchaseOptions {
  date?: string;
  slot?: Slot | "ALL" | string;
  shiftLabel?: string;
  stockOverrides?: Record<string, number>;
  priceOverrides?: Record<string, number>;
  customDemands?: Record<string, number>;
}

/**
 * Định dạng số lượng thiếu hiển thị gọn gàng, tránh lặp lại đơn vị:
 * - Dưới 1.000: "46 g", "330 g", "15 ml"
 * - Từ 1.000 trở lên: "3,36 kg (3.360 g)", "2 lít (2.000 ml)"
 */
export function formatPurchaseQty(
  qty: number,
  unit: IngredientUnit,
  importUnit: ImportUnit,
): string {
  const rounded = roundQty(qty);
  if (rounded <= 0) return `0 ${unit}`;

  const baseFormatted = `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(rounded)} ${unit}`;

  if (importUnit === "kg" && rounded >= 1000) {
    const kg = roundQty(rounded / 1000);
    const kgStr = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(kg);
    return `${kgStr} kg (${baseFormatted})`;
  }

  if (importUnit === "l" && rounded >= 1000) {
    const l = roundQty(rounded / 1000);
    const lStr = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(l);
    return `${lStr} lít (${baseFormatted})`;
  }

  return baseFormatted;
}

/**
 * Dựng tin nhắn Zalo gửi Nhà cung cấp — ngắn gọn, đủ thông tin, có emoji nhận diện, lời chào và lưu ý giao hàng
 */
export function buildZaloMessage(
  report: Omit<ShiftPurchaseReport, "zaloMessage" | "emailSubject" | "emailBody" | "clipboardText">,
): string {
  const lines: string[] = [];

  lines.push(`🌿 NHÀ HÀNG TRẦM RESERVE — ĐƠN ĐẶT NGUYÊN LIỆU ĐẦU CA`);
  lines.push(`Kính gửi Quý Nhà cung cấp / Anh/Chị phụ trách điều phối,`);
  lines.push(``);
  lines.push(`Bếp TRẦM Reserve (${RESTAURANT.address}) xin gửi đơn đặt nguyên liệu cần giao trước ca phục vụ:`);
  lines.push(``);
  lines.push(`📍 THÔNG TIN GIAO HÀNG:`);
  lines.push(`• Ca phục vụ: ${report.shiftLabel}`);
  lines.push(`• Ngày giao: ${report.formattedDate} (Quy mô: ${report.guests} khách)`);
  lines.push(`• Thời gian nhận yêu cầu: ${report.deliveryDeadline}`);
  lines.push(`• Địa điểm: Cửa nhập nguyên liệu Bếp TRẦM — ${RESTAURANT.address}`);
  lines.push(``);

  if (report.items.length === 0) {
    lines.push(`✅ Tồn kho hiện tại đã ĐỦ cho ca phục vụ (${report.sufficientCount}/${report.totalCheckedIngredients} nguyên liệu đạt định mức).`);
    lines.push(`Không có nguyên liệu nào bị thiếu — Nhà hàng chưa cần đặt mua bổ sung.`);
  } else {
    lines.push(`📦 DANH SÁCH NGUYÊN LIỆU CẦN GIAO (${report.items.length} mặt hàng):`);
    report.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name} (Mã: ${item.ingredientId})`);
      if (item.spec || item.origin) {
        const desc = [item.spec, item.origin].filter(Boolean).join(" · ");
        lines.push(`   • Quy cách: ${desc}`);
      }
      lines.push(`   • Số lượng đặt: ${item.formattedShortage}`);
      lines.push(`   • Đơn giá kho: ${formatVND(item.importPrice)}/${item.importUnitLabel}`);
      lines.push(`   • Thành tiền: ${item.formattedCost}`);
      lines.push(``);
    });

    lines.push(`💰 TỔNG GIÁ TRỊ ĐƠN HÀNG DỰ KIẾN: ${report.formattedTotalCost}`);
    lines.push(`(Đã đối chiếu nhu cầu ca thực tế, ${report.sufficientCount} nguyên liệu còn lại đã đủ tồn kho)`);
    lines.push(``);
    lines.push(`⚠️ LƯU Ý GIAO HÀNG & BẢO QUẢN:`);
    lines.push(`- Hàng tươi sống vận chuyển bằng thùng giữ lạnh chuẩn (0–2°C), đảm bảo độ tươi tuyệt đối.`);
    lines.push(`- Kèm phiếu giao hàng và hóa đơn để Bếp trưởng kiểm định chất lượng khi nhận.`);
    lines.push(`- Vui lòng phản hồi tin nhắn này để xác nhận đơn hàng và giờ giao dự kiến.`);
  }

  lines.push(``);
  lines.push(`Trân trọng cảm ơn Quý đối tác!`);
  lines.push(`Bếp trưởng TRẦM Reserve · Hotline Bếp: ${RESTAURANT.hotline}`);

  return lines.join("\n");
}

/**
 * Dựng thư Email chính thức gửi Nhà cung cấp — có đầy đủ tiêu đề, kính gửi, bảng danh sách và quy chuẩn Fine Dining
 */
export function buildEmailOrder(
  report: Omit<ShiftPurchaseReport, "zaloMessage" | "emailSubject" | "emailBody" | "clipboardText">,
): { subject: string; body: string } {
  const subject = `[TRẦM Reserve] Đơn đặt nguyên liệu trước ca - ${report.shiftLabel} (${report.formattedDate})`;

  const lines: string[] = [];
  lines.push(`Kính gửi: Ban Giám đốc / Bộ phận Điều phối Giao nhận Quý Nhà cung cấp,`);
  lines.push(``);
  lines.push(`Bộ phận Bếp Nhà hàng TRẦM Reserve trân trọng gửi đơn đặt mua nguyên liệu chuẩn bị cho ca phục vụ ẩm thực tại nhà hàng:`);
  lines.push(``);
  lines.push(`I. THÔNG TIN ĐƠN ĐẶT HÀNG & ĐỊA ĐIỂM GIAO NHẬN`);
  lines.push(`• Đơn vị đặt hàng: Nhà hàng TRẦM Reserve (Bộ phận Bếp)`);
  lines.push(`• Ca phục vụ: ${report.shiftLabel}`);
  lines.push(`• Ngày giao hàng: ${report.formattedDate}`);
  lines.push(`• Quy mô phục vụ: ${report.guests} khách tasting menu`);
  lines.push(`• Thời gian yêu cầu có mặt tại bếp: ${report.deliveryDeadline}`);
  lines.push(`• Địa điểm nhận hàng: Cửa nhập hàng Bếp TRẦM — ${RESTAURANT.address}`);
  lines.push(`• Người liên hệ nhận hàng: Bếp trưởng TRẦM Reserve · SĐT: ${RESTAURANT.hotline}`);
  lines.push(``);

  if (report.items.length === 0) {
    lines.push(`II. TÌNH TRẠNG NGUYÊN LIỆU`);
    lines.push(`Tồn kho hiện hữu tại nhà hàng đã đảm bảo 100% định mức phục vụ cho ca này (${report.sufficientCount}/${report.totalCheckedIngredients} nguyên liệu đạt chuẩn).`);
    lines.push(`Nhà hàng chưa phát sinh đơn đặt hàng bổ sung cho ca phục vụ trên.`);
  } else {
    lines.push(`II. BẢNG CHI TIẾT NGUYÊN LIỆU CẦN CUNG CẤP`);
    lines.push(`STT | Mã NL | Tên nguyên liệu | Quy cách / Nguồn gốc | Số lượng cần giao | Đơn vị tính | Đơn giá | Thành tiền`);
    lines.push(`----+--------+----------------+----------------------+--------------------+-------------+---------+-----------`);
    report.items.forEach((item, index) => {
      const stt = String(index + 1).padStart(2, "0");
      const specText = [item.spec, item.origin].filter(Boolean).join(" · ") || "Theo quy chuẩn Bếp";
      lines.push(`${stt}  | ${item.ingredientId.padEnd(8)} | ${item.name} | ${specText} | ${item.formattedShortage} | ${item.importUnitLabel} | ${formatVND(item.importPrice)} | ${item.formattedCost}`);
    });
    lines.push(``);
    lines.push(`• Tổng số mặt hàng cần cung cấp: ${report.items.length} mặt hàng (${report.sufficientCount} nguyên liệu còn lại đã đủ tồn kho).`);
    lines.push(`• TỔNG GIÁ TRỊ ĐƠN HÀNG DỰ KIẾN: ${report.formattedTotalCost}`);
    lines.push(``);
    lines.push(`III. QUY CHUẨN KIỂM SOÁT CHẤT LƯỢNG FINE DINING`);
    lines.push(`1. Đối với đạm tươi sống & rau quả: Đảm bảo chuỗi bảo quản lạnh xuyên suốt (0–2°C với thịt cá, 8–12°C với thảo mộc).`);
    lines.push(`2. Hồ sơ đi kèm: Mỗi đợt giao phải có Biên bản giao nhận hàng hóa / Phiếu xuất kho thể hiện rõ ngày đóng gói, nguồn gốc xuất xứ.`);
    lines.push(`3. Kiểm định khi giao: Bếp trưởng sẽ trực tiếp kiểm tra cảm quan và cân lại khối lượng thực tế trước khi ký nhận.`);
    lines.push(``);
    lines.push(`Kính đề nghị Quý đối tác kiểm tra và phản hồi xác nhận đơn hàng qua Email này hoặc Hotline: ${RESTAURANT.hotline}.`);
  }

  lines.push(``);
  lines.push(`Trân trọng cảm ơn sự đồng hành và hợp tác của Quý đối tác!`);
  lines.push(``);
  lines.push(`--`);
  lines.push(`BỘ PHẬN BẾP & QUẢN TRỊ TỒN KHO — NHÀ HÀNG TRẦM RESERVE`);
  lines.push(`Địa chỉ: ${RESTAURANT.address}`);
  lines.push(`Hotline: ${RESTAURANT.hotline} | Email: ${RESTAURANT.email}`);

  return { subject, body: lines.join("\n") };
}

/**
 * Tính danh sách mua trước ca theo yêu cầu FR-32 và dựng sẵn tin nhắn Zalo/Email chuẩn mực
 */
export function calculateShiftPurchaseReport(
  guests: number,
  options: CalculateShiftPurchaseOptions = {},
): ShiftPurchaseReport {
  const safeGuests = Math.max(1, Math.round(guests));
  const stockOverrides = options.stockOverrides ?? {};
  const priceOverrides = options.priceOverrides ?? {};
  const customDemands = options.customDemands ?? {};

  const shiftDate = options.date ?? new Date().toISOString().slice(0, 10);
  const shiftSlot = options.slot ?? "SLOT_1730";

  let slotLabel = "Ca tối";
  let deliveryDeadline = "Trước giờ ca 60 phút";

  if (shiftSlot === "SLOT_1730") {
    slotLabel = `Ca 1 (${SLOT_LABELS.SLOT_1730})`;
    deliveryDeadline = "Trước 16:30 (trước ca 60 phút để sơ chế)";
  } else if (shiftSlot === "SLOT_1945") {
    slotLabel = `Ca 2 (${SLOT_LABELS.SLOT_1945})`;
    deliveryDeadline = "Trước 18:45 (trước ca 60 phút để sơ chế)";
  } else if (shiftSlot === "ALL") {
    slotLabel = "Cả ngày (2 ca: 17:30 & 19:45)";
    deliveryDeadline = "Trước 16:00 (đầu giờ chiều trước ca 1)";
  } else if (options.shiftLabel) {
    slotLabel = options.shiftLabel;
  }

  const shiftLabel = `${slotLabel} · ${safeGuests} khách`;
  const formattedDate = formatLongDate(shiftDate);

  let totalCheckedIngredients = 0;
  let totalCost = 0;
  const items: PurchaseListItem[] = [];

  for (const ing of INGREDIENTS) {
    const usage = USAGE_MAP.get(ing.id);
    const standardUsage = usage?.qtyPerGuestStandard ?? 0;

    const demandFromBom = roundQty(standardUsage * safeGuests);
    const customDemand = customDemands[ing.id];
    const demandQty =
      typeof customDemand === "number" && Number.isFinite(customDemand) && customDemand >= 0
        ? roundQty(customDemand)
        : demandFromBom;

    if (demandQty <= 0) continue;

    totalCheckedIngredients += 1;

    const stockInfo = getEffectiveStockQty(ing.id, stockOverrides);
    const stockQty = stockInfo.stockQty;

    // FR-32: thiếu = max(0, nhu cầu - tồn kho)
    const shortageQty = Math.max(0, roundQty(demandQty - stockQty));

    if (shortageQty > 0) {
      const priceInfo = getEffectiveImportPrice(ing.id, priceOverrides);
      const factor = getImportUnitFactor(priceInfo.importUnit);
      const shortageInImportUnit = roundQty(shortageQty / factor);

      // Chi phí mua = số thiếu × đơn giá
      const costTotal = Math.round(shortageQty * priceInfo.costPerBaseUnit);
      totalCost += costTotal;

      const formattedShortage = formatPurchaseQty(shortageQty, ing.unit, priceInfo.importUnit);
      const formattedCost = formatVND(costTotal);

      items.push({
        ingredientId: ing.id,
        name: ing.name,
        group: ing.group,
        unit: ing.unit,
        spec: ing.spec,
        origin: priceInfo.origin,
        demandQty,
        stockQty,
        shortageQty,
        shortageInImportUnit,
        importUnit: priceInfo.importUnit,
        importUnitLabel: IMPORT_UNIT_LABELS[priceInfo.importUnit],
        importPrice: priceInfo.importPrice,
        costPerBaseUnit: priceInfo.costPerBaseUnit,
        costTotal,
        formattedShortage,
        formattedCost,
      });
    }
  }

  items.sort((a, b) => b.costTotal - a.costTotal);

  const neededCount = items.length;
  const sufficientCount = Math.max(0, totalCheckedIngredients - neededCount);
  const formattedTotalCost = formatVND(totalCost);

  const baseReport = {
    shiftDate,
    shiftSlot,
    shiftLabel,
    formattedDate,
    deliveryDeadline,
    guests: safeGuests,
    totalCheckedIngredients,
    neededCount,
    sufficientCount,
    totalCost,
    formattedTotalCost,
    items,
  };

  const zaloMessage = buildZaloMessage(baseReport);
  const { subject: emailSubject, body: emailBody } = buildEmailOrder(baseReport);

  return {
    ...baseReport,
    zaloMessage,
    emailSubject,
    emailBody,
    clipboardText: zaloMessage, // Mặc định nút sao chép nhanh dùng bản Zalo
  };
}
