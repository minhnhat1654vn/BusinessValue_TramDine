// FR-29 — Quản lý tồn kho: theo dõi lượng tồn theo từng nguyên liệu
// và tính tổng giá trị kho cập nhật liên tục theo đơn giá nhập kho hiệu lực.

import {
  DISH_RECIPES,
  INGREDIENTS,
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  getDefaultOptionId,
  getIngredient,
  getRecipeVariant,
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

/** Giới hạn lượng tồn tối đa cho một nguyên liệu (theo đơn vị gốc g hoặc ml) */
export const MAX_STOCK_BASE_QTY = 5_000_000;

export type StorageZone = "Tủ mát 0–2°C" | "Kho mát 8–12°C" | "Kho khô" | "Bếp ngày";

export interface InventoryStockSpec {
  ingredientId: string;
  /** Lượng tồn khởi tạo chuẩn của kho bếp TRẦM (tính theo đơn vị gốc `g` hoặc `ml`) */
  defaultStockQty: number;
  /** Khu vực bảo quản trong bếp */
  storageZone: StorageZone;
}

// Định mức tồn kho chuẩn cho toàn bộ 56 nguyên liệu tại bếp TRẦM (quy mô 42 ghế / ca):
// - Đạm tươi & bún thủ công: dự trữ cho 75–90 suất (khoảng 2 ca phục vụ)
// - Rau rừng, thảo mộc & trái cây tươi: dự trữ 80–150 suất trong kho mát
// - Đồ khô, gia vị ủ chum & tinh chất trầm hương: dự trữ 120–400 suất
export const INVENTORY_STOCK_SPECS: InventoryStockSpec[] = [
  // 1. Đạm (cá, thịt, đậu)
  { ingredientId: "ca-bop", defaultStockQty: 4_800, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "ca-loc", defaultStockQty: 7_500, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "than-bo", defaultStockQty: 6_400, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "ca-duoi", defaultStockQty: 4_000, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "dau-phu", defaultStockQty: 3_200, storageZone: "Tủ mát 0–2°C" },

  // 2. Tinh bột
  { ingredientId: "bot-mi", defaultStockQty: 10_000, storageZone: "Kho khô" },
  { ingredientId: "bot-gao", defaultStockQty: 3_000, storageZone: "Kho khô" },
  { ingredientId: "bot-nang", defaultStockQty: 2_500, storageZone: "Kho khô" },
  { ingredientId: "bun-tuoi", defaultStockQty: 4_000, storageZone: "Bếp ngày" },

  // 3. Sữa & chất béo
  { ingredientId: "bo-lat", defaultStockQty: 3_000, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "sua-tuoi", defaultStockQty: 4_000, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "dau-an", defaultStockQty: 5_000, storageZone: "Kho khô" },

  // 4. Rau, nấm & thảo mộc
  { ingredientId: "rau-dang", defaultStockQty: 900, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "rau-cang-cua", defaultStockQty: 900, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "hoa-chuoi", defaultStockQty: 1_200, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "rau-ram", defaultStockQty: 400, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "hanh-tim", defaultStockQty: 1_500, storageZone: "Kho khô" },
  { ingredientId: "hanh-la", defaultStockQty: 500, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "toi", defaultStockQty: 1_500, storageZone: "Kho khô" },
  { ingredientId: "gung", defaultStockQty: 800, storageZone: "Kho khô" },
  { ingredientId: "sa", defaultStockQty: 1_200, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "ot-hiem", defaultStockQty: 400, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "ot-chi-thien", defaultStockQty: 600, storageZone: "Kho khô" },
  { ingredientId: "kinh-gioi", defaultStockQty: 600, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "tia-to", defaultStockQty: 700, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "rau-nhai", defaultStockQty: 800, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "dot-xoai", defaultStockQty: 600, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "la-coc", defaultStockQty: 600, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "la-lot", defaultStockQty: 400, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "la-moc-mat", defaultStockQty: 500, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "ca-chua", defaultStockQty: 2_400, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "bac-ha", defaultStockQty: 1_800, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "nam-huong", defaultStockQty: 1_000, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "nam-dui-ga", defaultStockQty: 2_000, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "nam-rom", defaultStockQty: 1_200, storageZone: "Kho mát 8–12°C" },

  // 5. Trái cây & hạt
  { ingredientId: "me-chin", defaultStockQty: 3_000, storageZone: "Kho khô" },
  { ingredientId: "chanh", defaultStockQty: 1_500, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "thom", defaultStockQty: 2_500, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "dau-phong", defaultStockQty: 1_500, storageZone: "Kho khô" },
  { ingredientId: "nhan-xuong", defaultStockQty: 4_500, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "hat-sen", defaultStockQty: 2_400, storageZone: "Kho mát 8–12°C" },

  // 6. Gia vị & nước chấm
  { ingredientId: "muoi-bien", defaultStockQty: 3_000, storageZone: "Kho khô" },
  { ingredientId: "muoi-ot-tn", defaultStockQty: 1_200, storageZone: "Kho khô" },
  { ingredientId: "duong-trang", defaultStockQty: 5_000, storageZone: "Kho khô" },
  { ingredientId: "duong-thot-not", defaultStockQty: 2_000, storageZone: "Kho khô" },
  { ingredientId: "duong-phen", defaultStockQty: 3_000, storageZone: "Kho khô" },
  { ingredientId: "mat-ong", defaultStockQty: 2_000, storageZone: "Kho khô" },
  { ingredientId: "nuoc-mam", defaultStockQty: 4_000, storageZone: "Kho khô" },
  { ingredientId: "nuoc-tuong", defaultStockQty: 2_000, storageZone: "Kho khô" },
  { ingredientId: "tuong-bao-lac", defaultStockQty: 3_500, storageZone: "Kho khô" },
  { ingredientId: "tieu-rung", defaultStockQty: 500, storageZone: "Kho khô" },
  { ingredientId: "tieu-den", defaultStockQty: 600, storageZone: "Kho khô" },

  // 7. Hương liệu & phụ liệu
  { ingredientId: "men-tuoi", defaultStockQty: 500, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "tram-huong", defaultStockQty: 25, storageZone: "Kho khô" },
  { ingredientId: "atiso", defaultStockQty: 1_200, storageZone: "Kho khô" },
  { ingredientId: "rom", defaultStockQty: 6_000, storageZone: "Kho khô" },
];

const STOCK_SPEC_MAP: Record<string, InventoryStockSpec> = Object.fromEntries(
  INVENTORY_STOCK_SPECS.map((s) => [s.ingredientId, s]),
);

export function getInventoryStockSpec(ingredientId: string): InventoryStockSpec | undefined {
  return STOCK_SPEC_MAP[ingredientId];
}

/** Chuẩn hóa lượng tồn về khoảng hợp lệ [0, MAX_STOCK_BASE_QTY] và làm tròn 3 chữ số thập phân */
export function clampStockQty(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return roundQty(Math.min(MAX_STOCK_BASE_QTY, Math.max(0, raw)));
}

/** Lấy lượng tồn hiệu lực của một nguyên liệu (ưu tiên override hợp lệ kể cả khi bằng 0) */
export function getEffectiveStockQty(
  ingredientId: string,
  stockOverrides: Record<string, number> = {},
): { stockQty: number; defaultStockQty: number; isCustomStock: boolean; storageZone: StorageZone } {
  const spec = getInventoryStockSpec(ingredientId);
  if (!spec) {
    throw new Error(`Thiếu cấu hình tồn kho cho nguyên liệu "${ingredientId}".`);
  }
  const override = stockOverrides[ingredientId];
  const hasValidOverride =
    typeof override === "number" &&
    Number.isFinite(override) &&
    override >= 0 &&
    override <= MAX_STOCK_BASE_QTY;

  const stockQty = hasValidOverride ? clampStockQty(override) : spec.defaultStockQty;
  return {
    stockQty,
    defaultStockQty: spec.defaultStockQty,
    isCustomStock: stockQty !== spec.defaultStockQty,
    storageZone: spec.storageZone,
  };
}

// ---------- Kiểu dữ liệu báo cáo tồn kho ----------

export interface InventoryItem {
  ingredientId: string;
  name: string;
  group: IngredientGroup;
  unit: IngredientUnit;
  spec?: string;
  origin?: string;
  storageZone: StorageZone;
  /** Lượng tồn hiện tại theo đơn vị gốc BOM (`g` hoặc `ml`) */
  stockQty: number;
  defaultStockQty: number;
  /** Lượng tồn quy đổi sang đơn vị nhập kho (`kg`, `l`, `ml`) để nhập liệu trực quan */
  stockInImportUnit: number;
  isCustomStock: boolean;
  importPrice: number;
  defaultImportPrice: number;
  importUnit: ImportUnit;
  importUnitLabel: string;
  isCustomPrice: boolean;
  costPerBaseUnit: number;
  /** Thành tiền giá trị tồn kho của nguyên liệu này (VND) */
  stockValue: number;
  /** Tỷ trọng giá trị so với tổng kho (%) */
  shareOfValuePct: number;
  /** Định lượng tiêu hao cho 1 khách theo thực đơn chuẩn (0 nếu chỉ dùng cho phương án thay thế) */
  qtyPerGuestStandard: number;
  /** Định lượng tiêu hao lớn nhất cho 1 khách nếu khách chọn phương án thay thế */
  qtyPerGuestMaxVariant: number;
  /** Số suất khách ước tính đáp ứng được từ lượng tồn hiện tại */
  estimatedGuests: number | null;
  isStandardIngredient: boolean;
  standardDishIndexes: number[];
  altDishIndexes: number[];
}

export interface InventoryGroupSummary {
  group: IngredientGroup;
  label: string;
  ingredientCount: number;
  inStockCount: number;
  totalSolidG: number;
  totalLiquidMl: number;
  totalValue: number;
  shareOfValuePct: number;
}

export interface InventoryReport {
  totalIngredients: number;
  inStockCount: number;
  outOfStockCount: number;
  customizedStockCount: number;
  totalSolidG: number;
  totalLiquidMl: number;
  /** Tổng giá trị kho hiện tại (VND) — cập nhật tức thời theo lượng tồn & đơn giá nhập kho */
  totalValue: number;
  /** Tổng giá trị kho chuẩn ban đầu (tính theo đơn giá hiện hành) */
  defaultTotalValue: number;
  /** Chênh lệch tổng giá trị kho so với mức tồn chuẩn */
  deltaVsDefaultValue: number;
  /** Số khách tối đa phục vụ được trọn bộ 7 món chuẩn từ tồn kho hiện tại */
  maxStandardGuests: number;
  /** Nguyên liệu giới hạn số suất chuẩn thấp nhất hiện tại */
  bottleneckIngredient: {
    ingredientId: string;
    name: string;
    estimatedGuests: number;
  } | null;
  groupSummary: InventoryGroupSummary[];
  items: InventoryItem[];
}

// ---------- Tính mức tiêu hao BOM cho từng nguyên liệu ----------

interface UsageMeta {
  qtyPerGuestStandard: number;
  qtyPerGuestMaxVariant: number;
  standardDishIndexes: number[];
  altDishIndexes: number[];
}

function buildIngredientUsageMap(): Map<string, UsageMeta> {
  const map = new Map<string, UsageMeta>();
  for (const ing of INGREDIENTS) {
    map.set(ing.id, {
      qtyPerGuestStandard: 0,
      qtyPerGuestMaxVariant: 0,
      standardDishIndexes: [],
      altDishIndexes: [],
    });
  }

  for (const recipe of DISH_RECIPES) {
    const defId = getDefaultOptionId(recipe.dishIndex);
    const stdVariant = getRecipeVariant(recipe.dishIndex, defId);
    const stdIds = new Set<string>();

    if (stdVariant) {
      for (const line of stdVariant.lines) {
        const meta = map.get(line.ingredientId);
        if (!meta) continue;
        meta.qtyPerGuestStandard = roundQty(meta.qtyPerGuestStandard + line.qty);
        if (!meta.standardDishIndexes.includes(recipe.dishIndex)) {
          meta.standardDishIndexes.push(recipe.dishIndex);
        }
        stdIds.add(line.ingredientId);
      }
    }

    // Tìm mức tiêu hao tối đa của nguyên liệu này trên món `dishIndex` qua mọi phương án
    const maxInDish = new Map<string, number>();
    for (const variant of recipe.variants) {
      for (const line of variant.lines) {
        const prev = maxInDish.get(line.ingredientId) ?? 0;
        if (line.qty > prev) maxInDish.set(line.ingredientId, line.qty);
        if (!stdIds.has(line.ingredientId)) {
          const meta = map.get(line.ingredientId);
          if (meta && !meta.altDishIndexes.includes(recipe.dishIndex)) {
            meta.altDishIndexes.push(recipe.dishIndex);
          }
        }
      }
    }

    for (const [ingId, maxQty] of maxInDish.entries()) {
      const meta = map.get(ingId);
      if (meta) {
        meta.qtyPerGuestMaxVariant = roundQty(meta.qtyPerGuestMaxVariant + maxQty);
      }
    }
  }

  return map;
}

const USAGE_MAP = buildIngredientUsageMap();

// ---------- Hàm tính toán chính ----------

/** Tính toàn bộ báo cáo tồn kho & tổng giá trị kho theo thời gian thực */
export function calculateInventoryReport(
  stockOverrides: Record<string, number> = {},
  priceOverrides: Record<string, number> = {},
): InventoryReport {
  let totalValue = 0;
  let defaultTotalValue = 0;
  let totalSolidG = 0;
  let totalLiquidMl = 0;
  let inStockCount = 0;
  let outOfStockCount = 0;
  let customizedStockCount = 0;

  const rawItems: Omit<InventoryItem, "shareOfValuePct">[] = INGREDIENTS.map((ing) => {
    const stockInfo = getEffectiveStockQty(ing.id, stockOverrides);
    const priceInfo = getEffectiveImportPrice(ing.id, priceOverrides);
    const factor = getImportUnitFactor(priceInfo.importUnit);
    const usage = USAGE_MAP.get(ing.id) ?? {
      qtyPerGuestStandard: 0,
      qtyPerGuestMaxVariant: 0,
      standardDishIndexes: [],
      altDishIndexes: [],
    };

    // Nhân trước chia sau để tránh sai số dấu phẩy động (vd: 6.400 g × 1.650.000 đ / 1.000 = 10.560.000 đ)
    const stockValue = Math.round((stockInfo.stockQty * priceInfo.importPrice) / factor);
    const defaultValue = Math.round((stockInfo.defaultStockQty * priceInfo.importPrice) / factor);

    totalValue += stockValue;
    defaultTotalValue += defaultValue;
    if (ing.unit === "g") totalSolidG = roundQty(totalSolidG + stockInfo.stockQty);
    else totalLiquidMl = roundQty(totalLiquidMl + stockInfo.stockQty);

    if (stockInfo.stockQty > 0) inStockCount += 1;
    else outOfStockCount += 1;
    if (stockInfo.isCustomStock) customizedStockCount += 1;

    const isStandardIngredient = usage.qtyPerGuestStandard > 0;
    const refQtyPerGuest = isStandardIngredient
      ? usage.qtyPerGuestStandard
      : usage.qtyPerGuestMaxVariant;
    const estimatedGuests =
      refQtyPerGuest > 0 ? Math.floor(stockInfo.stockQty / refQtyPerGuest) : null;

    return {
      ingredientId: ing.id,
      name: ing.name,
      group: ing.group,
      unit: ing.unit,
      spec: ing.spec,
      origin: priceInfo.origin,
      storageZone: stockInfo.storageZone,
      stockQty: stockInfo.stockQty,
      defaultStockQty: stockInfo.defaultStockQty,
      stockInImportUnit: roundQty(stockInfo.stockQty / factor),
      isCustomStock: stockInfo.isCustomStock,
      importPrice: priceInfo.importPrice,
      defaultImportPrice: priceInfo.defaultImportPrice,
      importUnit: priceInfo.importUnit,
      importUnitLabel: IMPORT_UNIT_LABELS[priceInfo.importUnit],
      isCustomPrice: priceInfo.isCustom,
      costPerBaseUnit: priceInfo.costPerBaseUnit,
      stockValue,
      qtyPerGuestStandard: usage.qtyPerGuestStandard,
      qtyPerGuestMaxVariant: usage.qtyPerGuestMaxVariant,
      estimatedGuests,
      isStandardIngredient,
      standardDishIndexes: usage.standardDishIndexes,
      altDishIndexes: usage.altDishIndexes,
    };
  });

  const groupRank = (g: IngredientGroup) => INGREDIENT_GROUP_ORDER.indexOf(g);

  const items: InventoryItem[] = rawItems
    .map((item) => ({
      ...item,
      shareOfValuePct:
        totalValue > 0 ? Math.round((item.stockValue / totalValue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => groupRank(a.group) - groupRank(b.group) || b.stockValue - a.stockValue);

  // Tìm số suất chuẩn tối đa kho hiện tại đáp ứng được (nguyên liệu nút thắt)
  let bottleneck: InventoryReport["bottleneckIngredient"] = null;
  for (const item of items) {
    if (!item.isStandardIngredient || item.estimatedGuests === null) continue;
    if (
      bottleneck === null ||
      item.estimatedGuests < bottleneck.estimatedGuests
    ) {
      bottleneck = {
        ingredientId: item.ingredientId,
        name: item.name,
        estimatedGuests: item.estimatedGuests,
      };
    }
  }

  const groupSummary: InventoryGroupSummary[] = INGREDIENT_GROUP_ORDER.map((group) => {
    const groupItems = items.filter((i) => i.group === group);
    const groupValue = groupItems.reduce((sum, i) => sum + i.stockValue, 0);
    const groupSolid = groupItems
      .filter((i) => i.unit === "g")
      .reduce((sum, i) => roundQty(sum + i.stockQty), 0);
    const groupLiquid = groupItems
      .filter((i) => i.unit === "ml")
      .reduce((sum, i) => roundQty(sum + i.stockQty), 0);
    return {
      group,
      label: INGREDIENT_GROUP_LABELS[group],
      ingredientCount: groupItems.length,
      inStockCount: groupItems.filter((i) => i.stockQty > 0).length,
      totalSolidG: groupSolid,
      totalLiquidMl: groupLiquid,
      totalValue: groupValue,
      shareOfValuePct:
        totalValue > 0 ? Math.round((groupValue / totalValue) * 1000) / 10 : 0,
    };
  });

  return {
    totalIngredients: items.length,
    inStockCount,
    outOfStockCount,
    customizedStockCount,
    totalSolidG,
    totalLiquidMl,
    totalValue,
    defaultTotalValue,
    deltaVsDefaultValue: totalValue - defaultTotalValue,
    maxStandardGuests: bottleneck ? bottleneck.estimatedGuests : 0,
    bottleneckIngredient: bottleneck,
    groupSummary,
    items,
  };
}

/**
 * Tính bảng override tồn kho mới sau khi xuất bếp (`OUT`) hoặc nhập bổ sung (`IN`)
 * theo định lượng chuẩn của `guests` khách tasting 7 món.
 */
export function applyStandardServingsMovement(
  currentOverrides: Record<string, number>,
  guests: number,
  direction: "OUT" | "IN",
): Record<string, number> {
  const safeGuests = Math.max(1, Math.round(guests));
  const sign = direction === "OUT" ? -1 : 1;
  const next: Record<string, number> = { ...currentOverrides };

  for (const ing of INGREDIENTS) {
    const usage = USAGE_MAP.get(ing.id);
    if (!usage || usage.qtyPerGuestStandard <= 0) continue;
    const { stockQty, defaultStockQty } = getEffectiveStockQty(ing.id, next);
    const updated = clampStockQty(stockQty + sign * usage.qtyPerGuestStandard * safeGuests);
    if (updated === defaultStockQty) {
      delete next[ing.id];
    } else {
      next[ing.id] = updated;
    }
  }

  return next;
}

/** Kiểm tra mã nguyên liệu hợp lệ */
export function isValidIngredientId(id: string): boolean {
  return Boolean(getIngredient(id));
}

