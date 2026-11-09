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

/** Ngưỡng cảnh báo tồn kho tối thiểu theo yêu cầu nghiệp vụ: 32% định mức chuẩn */
export const WARNING_THRESHOLD_PERCENT = 32;

export type StorageZone = "Tủ mát 0–2°C" | "Kho mát 8–12°C" | "Kho khô" | "Bếp ngày";

export type StockStatus = "OK" | "LOW" | "OUT";

export interface InventoryStockSpec {
  ingredientId: string;
  /** Lượng tồn khởi tạo chuẩn của kho bếp TRẦM (tính theo đơn vị gốc `g` hoặc `ml`) */
  defaultStockQty: number;
  /** Ngưỡng đặt hàng lại mặc định (tính theo đơn vị gốc `g` hoặc `ml`) */
  defaultReorderPoint: number;
  /** Khu vực bảo quản trong bếp */
  storageZone: StorageZone;
}

// Định mức tồn kho chuẩn cho 34 nguyên liệu BOM tại bếp TRẦM (quy mô 40 ghế / ca, 15 bàn):
// - Đạm tươi & bún thủ công: dự trữ cho 75–90 suất; ngưỡng đặt lại là 40 suất (1 ca đầy)
// - Rau rừng, thảo mộc & trái cây tươi: dự trữ 80–150 suất trong kho mát; ngưỡng đặt lại 35–45 suất
// - Đồ khô, gia vị ủ chum & tinh chất trầm hương: dự trữ 120–400 suất; ngưỡng an toàn 30–40% tồn chuẩn
export const INVENTORY_STOCK_SPECS: InventoryStockSpec[] = [
  // Tồn chuẩn = định lượng/khách × 100 suất (≈ 1 tuần 2,5 ca đầy 40 khách); ngưỡng đặt lại 32%
  { ingredientId: "caviar-lam-dong", defaultStockQty: 400, defaultReorderPoint: 128, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "sa-sung-van-don", defaultStockQty: 300, defaultReorderPoint: 96, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "bao-ngu-nha-trang", defaultStockQty: 6500, defaultReorderPoint: 2080, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "yen-sao-khanh-hoa", defaultStockQty: 250, defaultReorderPoint: 80, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "ga-ta-nuoc-dung", defaultStockQty: 7500, defaultReorderPoint: 2400, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "ca-tam-da-lat", defaultStockQty: 10000, defaultReorderPoint: 3200, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "ga-dong-tao", defaultStockQty: 11000, defaultReorderPoint: 3520, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "banh-da-nem", defaultStockQty: 3000, defaultReorderPoint: 960, storageZone: "Kho khô" },
  { ingredientId: "banh-mi-men-tuoi", defaultStockQty: 6000, defaultReorderPoint: 1920, storageZone: "Kho khô" },
  { ingredientId: "com-chay-st25", defaultStockQty: 5000, defaultReorderPoint: 1600, storageZone: "Kho khô" },
  { ingredientId: "kem-chua", defaultStockQty: 1500, defaultReorderPoint: 480, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "bo-lat-president", defaultStockQty: 2500, defaultReorderPoint: 800, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "kem-tuoi-whipping", defaultStockQty: 2000, defaultReorderPoint: 640, storageZone: "Tủ mát 0–2°C" },
  { ingredientId: "sen-co-ngu", defaultStockQty: 800, defaultReorderPoint: 256, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "hat-dieu-rang-muoi", defaultStockQty: 1000, defaultReorderPoint: 320, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "nhan-long-hung-yen", defaultStockQty: 16000, defaultReorderPoint: 5120, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "hoa-tieu-rung", defaultStockQty: 200, defaultReorderPoint: 64, storageZone: "Kho khô" },
  { ingredientId: "ruou-nep-cai", defaultStockQty: 3000, defaultReorderPoint: 960, storageZone: "Kho khô" },
  { ingredientId: "nuoc-cot-ga-ta", defaultStockQty: 2000, defaultReorderPoint: 640, storageZone: "Kho khô" },
  { ingredientId: "chanh-day-cot", defaultStockQty: 1500, defaultReorderPoint: 480, storageZone: "Kho khô" },
  { ingredientId: "mat-ong-rung", defaultStockQty: 2000, defaultReorderPoint: 640, storageZone: "Kho khô" },
  { ingredientId: "muoi-ot-hoa-trang-tri", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho khô" },
  { ingredientId: "mac-khen-tay-bac", defaultStockQty: 200, defaultReorderPoint: 64, storageZone: "Kho khô" },
  { ingredientId: "huong-tram-tam-uop", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho khô" },
  { ingredientId: "phu-trang-tri-trang-mieng", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "tra-shan-tuyet", defaultStockQty: 1000, defaultReorderPoint: 320, storageZone: "Kho khô" },
  { ingredientId: "gia-vi-mon-1", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "gia-vi-mon-2", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho khô" },
  { ingredientId: "gia-vi-mon-3", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho mát 8–12°C" },
  { ingredientId: "gia-vi-mon-4", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho khô" },
  { ingredientId: "gia-vi-mon-6", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho khô" },
  { ingredientId: "gia-vi-mon-7", defaultStockQty: 100, defaultReorderPoint: 32, storageZone: "Kho khô" },
  { ingredientId: "than-hoa-hong", defaultStockQty: 5000, defaultReorderPoint: 1600, storageZone: "Kho khô" },
  { ingredientId: "rau-thom-hoa-trang-tri", defaultStockQty: 5000, defaultReorderPoint: 1600, storageZone: "Kho mát 8–12°C" },
];

const STOCK_SPEC_MAP: Record<string, InventoryStockSpec> = Object.fromEntries(
  INVENTORY_STOCK_SPECS.map((s) => [s.ingredientId, s]),
);

/** Thời hạn sử dụng / bảo quản chuẩn (số ngày) của 34 nguyên liệu tại bếp TRẦM */
export const DEFAULT_SHELF_LIFE_DAYS: Record<string, number> = {
  "caviar-lam-dong": 3,
  "sa-sung-van-don": 3,
  "bao-ngu-nha-trang": 3,
  "yen-sao-khanh-hoa": 3,
  "ga-ta-nuoc-dung": 3,
  "ca-tam-da-lat": 3,
  "ga-dong-tao": 3,
  "banh-da-nem": 30,
  "banh-mi-men-tuoi": 30,
  "com-chay-st25": 30,
  "kem-chua": 10,
  "bo-lat-president": 10,
  "kem-tuoi-whipping": 10,
  "sen-co-ngu": 7,
  "hat-dieu-rang-muoi": 7,
  "nhan-long-hung-yen": 7,
  "hoa-tieu-rung": 90,
  "ruou-nep-cai": 90,
  "nuoc-cot-ga-ta": 90,
  "chanh-day-cot": 90,
  "mat-ong-rung": 90,
  "muoi-ot-hoa-trang-tri": 90,
  "mac-khen-tay-bac": 180,
  "huong-tram-tam-uop": 180,
  "phu-trang-tri-trang-mieng": 4,
  "tra-shan-tuyet": 180,
  "gia-vi-mon-1": 4,
  "gia-vi-mon-2": 90,
  "gia-vi-mon-3": 4,
  "gia-vi-mon-4": 90,
  "gia-vi-mon-6": 90,
  "gia-vi-mon-7": 90,
  "than-hoa-hong": 90,
  "rau-thom-hoa-trang-tri": 4,
};

export function getInventoryStockSpec(ingredientId: string): InventoryStockSpec | undefined {
  return STOCK_SPEC_MAP[ingredientId];
}

/** Chuẩn hóa lượng tồn về khoảng hợp lệ [0, MAX_STOCK_BASE_QTY] và làm tròn 3 chữ số thập phân */
export function clampStockQty(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return roundQty(Math.min(MAX_STOCK_BASE_QTY, Math.max(0, raw)));
}

/** Lấy lượng tồn hiệu lực của một nguyên liệu (ưu tiên override hợp lệ kể cả khi bằng 0) */
export interface ExtraInventoryIngredient {
  id: string;
  name: string;
  group: string;
  unit: string;
  spec?: string | null;
  defaultImportPrice?: number;
  currentStock?: number;
  minStock?: number;
}

export function getEffectiveStockQty(
  ingredientId: string,
  stockOverrides: Record<string, number> = {},
  fallbackDefaultStock = 1_000,
): { stockQty: number; defaultStockQty: number; isCustomStock: boolean; storageZone: StorageZone } {
  const spec = getInventoryStockSpec(ingredientId) ?? {
    ingredientId,
    defaultStockQty: fallbackDefaultStock,
    defaultReorderPoint: Math.round((fallbackDefaultStock * WARNING_THRESHOLD_PERCENT) / 100),
    storageZone: "Kho mát 8–12°C" as StorageZone,
  };
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

/** Lấy mức đặt lại (ngưỡng đặt hàng lại) hiệu lực của một nguyên liệu (chuẩn 32% định mức) */
export function getEffectiveReorderPoint(
  ingredientId: string,
  reorderOverrides: Record<string, number> = {},
  fallbackDefaultStock = 1_000,
): { reorderPoint: number; defaultReorderPoint: number; isCustomReorderPoint: boolean } {
  const spec = getInventoryStockSpec(ingredientId) ?? {
    ingredientId,
    defaultStockQty: fallbackDefaultStock,
    defaultReorderPoint: Math.round((fallbackDefaultStock * WARNING_THRESHOLD_PERCENT) / 100),
    storageZone: "Kho mát 8–12°C" as StorageZone,
  };
  const defaultReorderPoint = Math.round(
    (spec.defaultStockQty * WARNING_THRESHOLD_PERCENT) / 100,
  );
  const override = reorderOverrides[ingredientId];
  const hasValidOverride =
    typeof override === "number" &&
    Number.isFinite(override) &&
    override >= 0 &&
    override <= MAX_STOCK_BASE_QTY;

  const reorderPoint = hasValidOverride ? clampStockQty(override) : defaultReorderPoint;
  return {
    reorderPoint,
    defaultReorderPoint,
    isCustomReorderPoint: reorderPoint !== defaultReorderPoint,
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
  /** Tỷ lệ tồn kho hiện tại so với định mức (%) */
  stockPercent: number;
  /** Ngưỡng cảnh báo theo quy định (32%) */
  reorderPercent: number;
  /** Đang ở ngưỡng cảnh báo (< 32% hoặc hết tồn) -> Highlight ĐỎ */
  isWarning: boolean;
  /** Đang ở ngưỡng còn (>= 32%) -> Highlight XANH */
  isSafe: boolean;
  /** Lượng tồn quy đổi sang đơn vị nhập kho (`kg`, `l`, `ml`) để nhập liệu trực quan */
  stockInImportUnit: number;
  isCustomStock: boolean;
  /** Ngưỡng đặt hàng lại theo đơn vị gốc BOM (`g` hoặc `ml`) */
  reorderPoint: number;
  defaultReorderPoint: number;
  /** Ngưỡng đặt hàng lại quy đổi sang đơn vị nhập kho (`kg`, `l`, `ml`) */
  reorderPointInImportUnit: number;
  isCustomReorderPoint: boolean;
  /** Trạng thái tồn kho: "OK" (đủ tồn), "LOW" (dưới ngưỡng cần mua), "OUT" (hết tồn) */
  status: StockStatus;
  /** Cần mua hàng lại (tồn dưới ngưỡng hoặc hết tồn) */
  needsReorder: boolean;
  /** Lượng thiếu hụt so với ngưỡng đặt lại (đơn vị gốc) */
  shortageQty: number;
  /** Lượng đề xuất mua bổ sung để trở về mức tồn chuẩn (đơn vị gốc) */
  suggestedReorderQty: number;
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
  /** Số ngày còn sử dụng được / Thời hạn bảo quản còn lại (ngày) */
  shelfLifeDays: number;
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
  /** Số nguyên liệu dưới ngưỡng đặt hàng lại (tồn > 0 nhưng < ngưỡng 32%) */
  lowStockCount: number;
  /** Tổng số nguyên liệu cần mua / cảnh báo (hết tồn + dưới 32%) -> Highlight ĐỎ */
  needsReorderCount: number;
  /** Số nguyên liệu ở ngưỡng an toàn (>= 32%) -> Highlight XANH */
  safeCount: number;
  /** Ngưỡng phần trăm cảnh báo (32%) */
  warningThresholdPercent: number;
  customizedStockCount: number;
  customizedReorderCount: number;
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

export interface UsageMeta {
  qtyPerGuestStandard: number;
  qtyPerGuestMaxVariant: number;
  standardDishIndexes: number[];
  altDishIndexes: number[];
  /** Số ngày còn sử dụng được / Thời hạn bảo quản còn lại (ngày) */
  shelfLifeDays: number;
}

export function buildIngredientUsageMap(): Map<string, UsageMeta> {
  const map = new Map<string, UsageMeta>();
  for (const ing of INGREDIENTS) {
    map.set(ing.id, {
      qtyPerGuestStandard: 0,
      qtyPerGuestMaxVariant: 0,
      standardDishIndexes: [],
      altDishIndexes: [],
      shelfLifeDays: 7,
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

export const USAGE_MAP = buildIngredientUsageMap();

// ---------- Hàm tính toán chính ----------

/** Tính toàn bộ báo cáo tồn kho & tổng giá trị kho theo thời gian thực */
export function calculateInventoryReport(
  stockOverrides: Record<string, number> = {},
  priceOverrides: Record<string, number> = {},
  reorderOverrides: Record<string, number> = {},
  extraIngredients: ExtraInventoryIngredient[] = [],
): InventoryReport {
  let totalValue = 0;
  let defaultTotalValue = 0;
  let totalSolidG = 0;
  let totalLiquidMl = 0;
  let inStockCount = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;
  let customizedStockCount = 0;
  let customizedReorderCount = 0;

  const staticIds = new Set(INGREDIENTS.map((i) => i.id));
  const mergedIngredients: Array<{
    id: string;
    name: string;
    group: IngredientGroup;
    unit: IngredientUnit;
    spec?: string;
    fallbackStock?: number;
    fallbackPrice?: number;
  }> = [
    ...INGREDIENTS.map((i) => ({ ...i })),
    ...extraIngredients
      .filter((e) => e && e.id && !staticIds.has(e.id))
      .map((e) => ({
        id: e.id,
        name: e.name,
        group: (INGREDIENT_GROUP_ORDER.includes(e.group as IngredientGroup)
          ? e.group
          : "PROTEIN") as IngredientGroup,
        unit: (e.unit === "ml" ? "ml" : "g") as IngredientUnit,
        spec: e.spec ?? undefined,
        fallbackStock: typeof e.currentStock === "number" && e.currentStock > 0 ? e.currentStock : 1_000,
        fallbackPrice: typeof e.defaultImportPrice === "number" && e.defaultImportPrice > 0 ? e.defaultImportPrice : 100_000,
      })),
  ];

  const rawItems: Omit<InventoryItem, "shareOfValuePct">[] = mergedIngredients.map((ing) => {
    const stockInfo = getEffectiveStockQty(ing.id, stockOverrides, ing.fallbackStock ?? 1_000);
    const priceInfo = getEffectiveImportPrice(
      ing.id,
      priceOverrides,
      ing.fallbackPrice ?? 100_000,
      ing.unit === "ml" ? "l" : "kg",
    );
    const reorderInfo = getEffectiveReorderPoint(ing.id, reorderOverrides, ing.fallbackStock ?? 1_000);
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

    const stockPercent =
      stockInfo.defaultStockQty > 0
        ? Math.round((stockInfo.stockQty / stockInfo.defaultStockQty) * 1000) / 10
        : 0;

    let status: StockStatus = "OK";
    if (stockInfo.stockQty === 0) {
      status = "OUT";
      outOfStockCount += 1;
    } else if (
      stockPercent < WARNING_THRESHOLD_PERCENT ||
      stockInfo.stockQty < reorderInfo.reorderPoint
    ) {
      status = "LOW";
      lowStockCount += 1;
    }

    if (stockInfo.stockQty > 0) inStockCount += 1;
    if (stockInfo.isCustomStock) customizedStockCount += 1;
    if (reorderInfo.isCustomReorderPoint) customizedReorderCount += 1;

    const isStandardIngredient = usage.qtyPerGuestStandard > 0;
    const refQtyPerGuest = isStandardIngredient
      ? usage.qtyPerGuestStandard
      : usage.qtyPerGuestMaxVariant;
    const estimatedGuests =
      refQtyPerGuest > 0 ? Math.floor(stockInfo.stockQty / refQtyPerGuest) : null;

    const shortageQty = Math.max(0, reorderInfo.reorderPoint - stockInfo.stockQty);
    const suggestedReorderQty = Math.max(0, stockInfo.defaultStockQty - stockInfo.stockQty);

    const isWarning = status !== "OK";
    const isSafe = status === "OK" && stockInfo.stockQty > 0;

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
      stockPercent,
      reorderPercent: WARNING_THRESHOLD_PERCENT,
      isWarning,
      isSafe,
      stockInImportUnit: roundQty(stockInfo.stockQty / factor),
      isCustomStock: stockInfo.isCustomStock,
      reorderPoint: reorderInfo.reorderPoint,
      defaultReorderPoint: reorderInfo.defaultReorderPoint,
      reorderPointInImportUnit: roundQty(reorderInfo.reorderPoint / factor),
      isCustomReorderPoint: reorderInfo.isCustomReorderPoint,
      status,
      needsReorder: status !== "OK",
      shortageQty,
      suggestedReorderQty,
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
      shelfLifeDays: DEFAULT_SHELF_LIFE_DAYS[ing.id] ?? 7,
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
    lowStockCount,
    needsReorderCount: outOfStockCount + lowStockCount,
    safeCount: Math.max(0, inStockCount - lowStockCount),
    warningThresholdPercent: WARNING_THRESHOLD_PERCENT,
    customizedStockCount,
    customizedReorderCount,
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

export interface DishDeductionSummary {
  ingredientId: string;
  name: string;
  unit: string;
  deductedQty: number;
  remainingQty: number;
}

export interface DishMovementResult {
  nextOverrides: Record<string, number>;
  dishIndex: number;
  portions: number;
  deductions: DishDeductionSummary[];
}

/**
 * Trừ tồn kho tự động theo thời gian thực (real-time) dựa trên định lượng BOM của món ăn
 * khi bếp chế biến và xuất món cho khách hàng.
 */
export function applyDishMovement(
  currentOverrides: Record<string, number>,
  dishIndex: number,
  portions: number,
  optionId?: string,
): DishMovementResult {
  const safePortions = Math.max(1, Math.round(portions));
  const variant = getRecipeVariant(dishIndex, optionId);
  const next: Record<string, number> = { ...currentOverrides };
  const deductions: DishDeductionSummary[] = [];

  if (variant) {
    for (const line of variant.lines) {
      const ing = getIngredient(line.ingredientId);
      if (!ing) continue;
      const { stockQty, defaultStockQty } = getEffectiveStockQty(line.ingredientId, next);
      const deduct = roundQty(line.qty * safePortions);
      const updated = clampStockQty(stockQty - deduct);
      if (updated === defaultStockQty) {
        delete next[line.ingredientId];
      } else {
        next[line.ingredientId] = updated;
      }
      deductions.push({
        ingredientId: line.ingredientId,
        name: ing.name,
        unit: ing.unit,
        deductedQty: deduct,
        remainingQty: updated,
      });
    }
  }

  return {
    nextOverrides: next,
    dishIndex,
    portions: safePortions,
    deductions,
  };
}

/** Kiểm tra mã nguyên liệu hợp lệ */
export function isValidIngredientId(id: string): boolean {
  return Boolean(getIngredient(id));
}

