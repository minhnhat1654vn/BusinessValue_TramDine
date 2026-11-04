// FR-28 — Giá vốn nguyên liệu: tự tính giá vốn mỗi khách từ đơn giá nhập kho
// và đối chiếu với giá bán menu tasting "Hành trình vị Việt" (1.190.000 đ/khách)
// cùng ngưỡng mục tiêu food cost 33,5%.

import { MENU_ITEMS, PRICES } from "./constants";
import { formatVND } from "./format";
import {
  DISH_RECIPES,
  INGREDIENTS,
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  getDefaultOptionId,
  getIngredient,
  getMenuItem,
  getRecipeVariant,
  roundQty,
  type IngredientGroup,
  type IngredientUnit,
} from "./recipes";

// ---------- Hằng số nghiệp vụ đối chiếu ----------

export const MENU_PRICE_PER_GUEST = PRICES.menu; // 1.190.000 đ/khách
export const WINE_PAIRING_PRICE = PRICES.winePairing; // 650.000 đ/khách
export const TEA_PAIRING_PRICE = PRICES.teaPairing; // 350.000 đ/khách

/** Mục tiêu tỷ lệ chi phí nguyên liệu / doanh thu menu (mục 5 & FR-33 tài liệu FR) */
export const TARGET_FOOD_COST_PCT = 33.5;

/** Trần mục tiêu KPI food cost theo FR-33 (ngưỡng an toàn tối đa 50% doanh thu menu) */
export const TARGET_FOOD_COST_CEILING_PCT = 50;

/** Trần giá vốn nguyên liệu mục tiêu cho 1 khách: 1.190.000 × 33,5% = 398.650 đ */
export const TARGET_FOOD_COST_PER_GUEST = Math.round(
  (MENU_PRICE_PER_GUEST * TARGET_FOOD_COST_PCT) / 100,
);

/** Trần giá vốn tối đa theo ngưỡng mục tiêu 50%: 1.190.000 × 50% = 595.000 đ */
export const CEILING_FOOD_COST_PER_GUEST = Math.round(
  (MENU_PRICE_PER_GUEST * TARGET_FOOD_COST_CEILING_PCT) / 100,
);

/** Giới hạn hợp lệ khi nhập đơn giá kho (VND) */
export const MIN_IMPORT_PRICE = 1_000;
export const MAX_IMPORT_PRICE = 50_000_000;

// ---------- Đơn giá nhập kho chuẩn ----------

export type ImportUnit = "kg" | "l" | "ml";

export interface IngredientPriceSpec {
  ingredientId: string;
  /** Đơn giá nhập kho mặc định (VND trên mỗi `importUnit`) */
  defaultImportPrice: number;
  /** Đơn vị tính khi nhập kho: kg (1.000 g), l (1.000 ml), hoặc ml (1 ml cho tinh chất quý) */
  importUnit: ImportUnit;
  /** Xuất xứ / nhà cung cấp tham chiếu */
  origin?: string;
}

/** Hệ số quy đổi từ đơn vị nhập kho về đơn vị định lượng BOM (g hoặc ml) */
export function getImportUnitFactor(importUnit: ImportUnit): number {
  return importUnit === "ml" ? 1 : 1000;
}

export const IMPORT_UNIT_LABELS: Record<ImportUnit, string> = {
  kg: "kg",
  l: "lít",
  ml: "ml",
};

// Bảng đơn giá nhập kho chuẩn cho toàn bộ 56 nguyên liệu trong danh mục bếp TRẦM.
// Mức giá phản ánh nguồn nguyên liệu tuyển chọn chuẩn Fine Dining Việt Nam
// (tổng giá vốn suất chuẩn 7 món = 388.407 đ/khách ≈ 32,6% giá menu, đạt mục tiêu ≤ 33,5%).
export const INGREDIENT_PRICE_SPECS: IngredientPriceSpec[] = [
  // 1. Đạm (cá, thịt, đậu)
  { ingredientId: "ca-bop", defaultImportPrice: 950_000, importUnit: "kg", origin: "Cần Thơ · phi lê chuẩn sashimi" },
  { ingredientId: "ca-loc", defaultImportPrice: 520_000, importUnit: "kg", origin: "Đồng Tháp · cá đồng tự nhiên" },
  { ingredientId: "than-bo", defaultImportPrice: 1_650_000, importUnit: "kg", origin: "Quảng Nam · thăn ngoại bò vàng" },
  { ingredientId: "ca-duoi", defaultImportPrice: 720_000, importUnit: "kg", origin: "Vũng Tàu · đánh bắt trong ngày" },
  { ingredientId: "dau-phu", defaultImportPrice: 140_000, importUnit: "kg", origin: "Cao Bằng · làm thủ công" },

  // 2. Tinh bột
  { ingredientId: "bot-mi", defaultImportPrice: 45_000, importUnit: "kg", origin: "Bột mì protein cao" },
  { ingredientId: "bot-gao", defaultImportPrice: 52_000, importUnit: "kg", origin: "Gạo hữu cơ xay mịn" },
  { ingredientId: "bot-nang", defaultImportPrice: 48_000, importUnit: "kg", origin: "Tinh bột khoai mì lọc" },
  { ingredientId: "bun-tuoi", defaultImportPrice: 65_000, importUnit: "kg", origin: "Lò bún thủ công TP.HCM" },

  // 3. Sữa & chất béo
  { ingredientId: "bo-lat", defaultImportPrice: 520_000, importUnit: "kg", origin: "Bơ lạt lên men thủ công" },
  { ingredientId: "sua-tuoi", defaultImportPrice: 45_000, importUnit: "l", origin: "Đà Lạt · thanh trùng" },
  { ingredientId: "dau-an", defaultImportPrice: 58_000, importUnit: "l", origin: "Dầu hạt cải ép lạnh" },

  // 4. Rau, nấm & thảo mộc
  { ingredientId: "rau-dang", defaultImportPrice: 140_000, importUnit: "kg", origin: "Đồng bằng sông Cửu Long" },
  { ingredientId: "rau-cang-cua", defaultImportPrice: 120_000, importUnit: "kg", origin: "Vườn hữu cơ Củ Chi" },
  { ingredientId: "hoa-chuoi", defaultImportPrice: 75_000, importUnit: "kg", origin: "Hoa chuối hột miền Tây" },
  { ingredientId: "rau-ram", defaultImportPrice: 95_000, importUnit: "kg", origin: "Đà Lạt" },
  { ingredientId: "hanh-tim", defaultImportPrice: 85_000, importUnit: "kg", origin: "Vĩnh Châu, Sóc Trăng" },
  { ingredientId: "hanh-la", defaultImportPrice: 75_000, importUnit: "kg", origin: "Đà Lạt" },
  { ingredientId: "toi", defaultImportPrice: 180_000, importUnit: "kg", origin: "Tỏi cô đơn Lý Sơn" },
  { ingredientId: "gung", defaultImportPrice: 70_000, importUnit: "kg", origin: "Gừng sẻ Tây Nguyên" },
  { ingredientId: "sa", defaultImportPrice: 45_000, importUnit: "kg", origin: "Tiền Giang" },
  { ingredientId: "ot-hiem", defaultImportPrice: 130_000, importUnit: "kg", origin: "Ớt hiểm xanh miền Trung" },
  { ingredientId: "ot-chi-thien", defaultImportPrice: 450_000, importUnit: "kg", origin: "Bảo Lạc · hun khói củi" },
  { ingredientId: "kinh-gioi", defaultImportPrice: 95_000, importUnit: "kg", origin: "Vườn thảo mộc Đà Lạt" },
  { ingredientId: "tia-to", defaultImportPrice: 110_000, importUnit: "kg", origin: "Vườn thảo mộc Đà Lạt" },
  { ingredientId: "rau-nhai", defaultImportPrice: 160_000, importUnit: "kg", origin: "Rau rừng Tây Ninh" },
  { ingredientId: "dot-xoai", defaultImportPrice: 150_000, importUnit: "kg", origin: "Đồng Tháp" },
  { ingredientId: "la-coc", defaultImportPrice: 150_000, importUnit: "kg", origin: "Miền Tây Nam Bộ" },
  { ingredientId: "la-lot", defaultImportPrice: 110_000, importUnit: "kg", origin: "Củ Chi" },
  { ingredientId: "la-moc-mat", defaultImportPrice: 240_000, importUnit: "kg", origin: "Trà Bồng, Quảng Ngãi" },
  { ingredientId: "ca-chua", defaultImportPrice: 65_000, importUnit: "kg", origin: "Cà chua hữu cơ Đà Lạt" },
  { ingredientId: "bac-ha", defaultImportPrice: 60_000, importUnit: "kg", origin: "Tiền Giang" },
  { ingredientId: "nam-huong", defaultImportPrice: 380_000, importUnit: "kg", origin: "Nấm hương tươi Sapa" },
  { ingredientId: "nam-dui-ga", defaultImportPrice: 220_000, importUnit: "kg", origin: "Trại nấm hữu cơ Đà Lạt" },
  { ingredientId: "nam-rom", defaultImportPrice: 210_000, importUnit: "kg", origin: "Nấm rơm búp Đồng Tháp" },

  // 5. Trái cây & hạt
  { ingredientId: "me-chin", defaultImportPrice: 90_000, importUnit: "kg", origin: "Me chín An Giang" },
  { ingredientId: "chanh", defaultImportPrice: 90_000, importUnit: "l", origin: "Chanh bông tím Long An" },
  { ingredientId: "thom", defaultImportPrice: 55_000, importUnit: "kg", origin: "Khóm Cầu Đúc, Hậu Giang" },
  { ingredientId: "dau-phong", defaultImportPrice: 110_000, importUnit: "kg", origin: "Đậu phộng sẻ Quảng Nam" },
  { ingredientId: "nhan-xuong", defaultImportPrice: 360_000, importUnit: "kg", origin: "Long An · cùi nhãn xuồng bóc hạt" },
  { ingredientId: "hat-sen", defaultImportPrice: 480_000, importUnit: "kg", origin: "Tây Hồ · sen tươi bỏ tim" },

  // 6. Gia vị & nước chấm
  { ingredientId: "muoi-bien", defaultImportPrice: 28_000, importUnit: "kg", origin: "Muối hầm Sa Huỳnh" },
  { ingredientId: "muoi-ot-tn", defaultImportPrice: 180_000, importUnit: "kg", origin: "Tây Ninh · muối ớt hạt ngọc" },
  { ingredientId: "duong-trang", defaultImportPrice: 32_000, importUnit: "kg", origin: "Đường mía tinh luyện" },
  { ingredientId: "duong-thot-not", defaultImportPrice: 95_000, importUnit: "kg", origin: "Tri Tôn, An Giang" },
  { ingredientId: "duong-phen", defaultImportPrice: 85_000, importUnit: "kg", origin: "Quảng Ngãi · kết tinh thủ công" },
  { ingredientId: "mat-ong", defaultImportPrice: 550_000, importUnit: "l", origin: "Mật ong rừng Trà My" },
  { ingredientId: "nuoc-mam", defaultImportPrice: 260_000, importUnit: "l", origin: "Phú Quốc · mắm nhĩ 43°N" },
  { ingredientId: "nuoc-tuong", defaultImportPrice: 165_000, importUnit: "l", origin: "Ủ lên men tự nhiên từ nấm" },
  { ingredientId: "tuong-bao-lac", defaultImportPrice: 380_000, importUnit: "kg", origin: "Bảo Lạc, Cao Bằng · ủ chum sành" },
  { ingredientId: "tieu-rung", defaultImportPrice: 680_000, importUnit: "kg", origin: "Tiêu rừng Măng Đen" },
  { ingredientId: "tieu-den", defaultImportPrice: 360_000, importUnit: "kg", origin: "Tiêu đen chín cây Phú Quốc" },

  // 7. Hương liệu & phụ liệu
  { ingredientId: "men-tuoi", defaultImportPrice: 320_000, importUnit: "kg", origin: "Men bánh mì tươi nhập khẩu" },
  { ingredientId: "tram-huong", defaultImportPrice: 240_000, importUnit: "ml", origin: "Khánh Hòa · tinh chất thực phẩm" },
  { ingredientId: "atiso", defaultImportPrice: 650_000, importUnit: "kg", origin: "Đà Lạt · hoa atiso sấy lạnh" },
  { ingredientId: "rom", defaultImportPrice: 60_000, importUnit: "kg", origin: "Rơm nếp sạch phơi nắng" },
];

const PRICE_SPEC_MAP: Record<string, IngredientPriceSpec> = Object.fromEntries(
  INGREDIENT_PRICE_SPECS.map((s) => [s.ingredientId, s]),
);

export function getIngredientPriceSpec(ingredientId: string): IngredientPriceSpec | undefined {
  return PRICE_SPEC_MAP[ingredientId];
}

/** Lấy đơn giá nhập kho hiệu lực (ưu tiên giá tùy chỉnh hợp lệ nếu có) */
export function getEffectiveImportPrice(
  ingredientId: string,
  overrides: Record<string, number> = {},
): { importPrice: number; defaultImportPrice: number; importUnit: ImportUnit; isCustom: boolean; costPerBaseUnit: number; origin?: string } {
  const spec = getIngredientPriceSpec(ingredientId);
  if (!spec) {
    throw new Error(`Thiếu đơn giá nhập kho cho nguyên liệu "${ingredientId}".`);
  }
  const custom = overrides[ingredientId];
  const hasValidCustom =
    typeof custom === "number" &&
    Number.isFinite(custom) &&
    custom >= MIN_IMPORT_PRICE &&
    custom <= MAX_IMPORT_PRICE &&
    Math.round(custom) !== spec.defaultImportPrice;

  const importPrice = hasValidCustom ? Math.round(custom) : spec.defaultImportPrice;
  const factor = getImportUnitFactor(spec.importUnit);
  const costPerBaseUnit = importPrice / factor;

  return {
    importPrice,
    defaultImportPrice: spec.defaultImportPrice,
    importUnit: spec.importUnit,
    isCustom: hasValidCustom,
    costPerBaseUnit,
    origin: spec.origin,
  };
}

// ---------- Kiểu dữ liệu kết quả tính giá vốn ----------

export interface DishCostLine {
  ingredientId: string;
  name: string;
  group: IngredientGroup;
  unit: IngredientUnit;
  spec?: string;
  origin?: string;
  qtyPerGuest: number;
  qtyTotal: number;
  importPrice: number;
  defaultImportPrice: number;
  importUnit: ImportUnit;
  isCustomPrice: boolean;
  costPerBaseUnit: number;
  costPerGuest: number;
  costTotal: number;
  shareOfDishPct: number;
  note?: string;
}

export interface DishCostDetail {
  dishIndex: number;
  name: string;
  region: string;
  image: string;
  portion: string;
  optionId: string;
  optionName: string;
  isDefault: boolean;
  variantNote?: string;
  lines: DishCostLine[];
  costPerGuest: number;
  costTotal: number;
  defaultCostPerGuest: number;
  deltaVsDefaultPerGuest: number;
  pctOfMenuPrice: number;
}

export interface DishCostSummaryItem {
  dishIndex: number;
  name: string;
  region: string;
  image: string;
  ingredientCount: number;
  variantCount: number;
  costPerGuest: number;
  costTotal: number;
  minVariantCostPerGuest: number;
  maxVariantCostPerGuest: number;
  shareOfFoodCostPct: number;
  pctOfMenuPrice: number;
}

export interface GroupCostBreakdownItem {
  group: IngredientGroup;
  label: string;
  ingredientCount: number;
  costPerGuest: number;
  costTotal: number;
  shareOfFoodCostPct: number;
}

export interface WarehouseIngredientCostItem {
  ingredientId: string;
  name: string;
  group: IngredientGroup;
  unit: IngredientUnit;
  spec?: string;
  origin?: string;
  importPrice: number;
  defaultImportPrice: number;
  importUnit: ImportUnit;
  isCustomPrice: boolean;
  costPerBaseUnit: number;
  /** Các món dùng trong phương án chuẩn */
  standardDishIndexes: number[];
  /** Các món dùng trong phương án thay thế (nhưng không nằm ở phương án chuẩn của món đó) */
  altDishIndexes: number[];
  qtyPerGuestStandard: number;
  qtyTotalStandard: number;
  costPerGuestStandard: number;
  costTotalStandard: number;
}

export interface MenuFoodCostReport {
  guests: number;
  menuPricePerGuest: number;
  menuRevenueTotal: number;
  targetFoodCostPct: number;
  targetFoodCostPerGuest: number;
  targetFoodCostTotal: number;
  costPerGuest: number;
  costTotal: number;
  foodCostPct: number;
  grossProfitPerGuest: number;
  grossProfitTotal: number;
  grossMarginPct: number;
  /** Âm = tiết kiệm hơn mục tiêu; Dương = vượt trần mục tiêu */
  varianceVsTargetPerGuest: number;
  variancePctPoints: number;
  isWithinTarget: boolean;
  /** Đối chiếu khi khách dùng kèm Tea / Wine Pairing */
  pairingBenchmarks: {
    none: { pricePerGuest: number; foodCostPct: number; grossProfitPerGuest: number };
    tea: { pricePerGuest: number; foodCostPct: number; grossProfitPerGuest: number };
    wine: { pricePerGuest: number; foodCostPct: number; grossProfitPerGuest: number };
  };
  dishes: DishCostSummaryItem[];
  groupBreakdown: GroupCostBreakdownItem[];
  warehouseItems: WarehouseIngredientCostItem[];
  customizedCount: number;
}

// ---------- Hàm tính toán chính ----------

/** Tính chi phí nguyên liệu của một phương án món ăn cho `guests` khách */
export function calculateDishCost(
  dishIndex: number,
  optionId?: string,
  guests = 1,
  overrides: Record<string, number> = {},
): DishCostDetail {
  const recipe = DISH_RECIPES.find((r) => r.dishIndex === dishIndex);
  if (!recipe) {
    throw new Error(`Không tìm thấy công thức món số ${dishIndex}.`);
  }
  const menuItem = getMenuItem(dishIndex);
  const defaultOptionId = getDefaultOptionId(dishIndex);
  const targetOptionId = optionId ?? defaultOptionId;
  const variant = getRecipeVariant(dishIndex, targetOptionId) ?? recipe.variants[0];
  const optionMeta = menuItem?.options?.find((o) => o.id === variant.optionId);

  const rawLines = variant.lines.map((line) => {
    const ing = getIngredient(line.ingredientId);
    if (!ing) {
      throw new Error(`Thiếu nguyên liệu "${line.ingredientId}" trong danh mục.`);
    }
    const priceInfo = getEffectiveImportPrice(ing.id, overrides);
    const costPerGuest = Math.round(line.qty * priceInfo.costPerBaseUnit);
    return {
      ingredientId: ing.id,
      name: ing.name,
      group: ing.group,
      unit: ing.unit,
      spec: ing.spec,
      origin: priceInfo.origin,
      qtyPerGuest: line.qty,
      qtyTotal: roundQty(line.qty * guests),
      importPrice: priceInfo.importPrice,
      defaultImportPrice: priceInfo.defaultImportPrice,
      importUnit: priceInfo.importUnit,
      isCustomPrice: priceInfo.isCustom,
      costPerBaseUnit: priceInfo.costPerBaseUnit,
      costPerGuest,
      costTotal: costPerGuest * guests,
      note: line.note,
    };
  });

  const costPerGuest = rawLines.reduce((sum, l) => sum + l.costPerGuest, 0);
  const costTotal = costPerGuest * guests;

  const lines: DishCostLine[] = rawLines.map((l) => ({
    ...l,
    shareOfDishPct: costPerGuest > 0 ? Number(((l.costPerGuest / costPerGuest) * 100).toFixed(1)) : 0,
  }));

  // Giá vốn phương án mặc định để đối chiếu chênh lệch
  let defaultCostPerGuest = costPerGuest;
  if (variant.optionId !== defaultOptionId) {
    const stdVariant = getRecipeVariant(dishIndex, defaultOptionId);
    if (stdVariant) {
      defaultCostPerGuest = stdVariant.lines.reduce((sum, l) => {
        const p = getEffectiveImportPrice(l.ingredientId, overrides);
        return sum + Math.round(l.qty * p.costPerBaseUnit);
      }, 0);
    }
  }

  return {
    dishIndex,
    name: menuItem?.name ?? `Món ${dishIndex}`,
    region: menuItem?.region ?? "",
    image: menuItem?.image ?? "",
    portion: recipe.portion,
    optionId: variant.optionId,
    optionName: optionMeta?.name ?? variant.optionId,
    isDefault: variant.optionId === defaultOptionId,
    variantNote: variant.note,
    lines,
    costPerGuest,
    costTotal,
    defaultCostPerGuest,
    deltaVsDefaultPerGuest: costPerGuest - defaultCostPerGuest,
    pctOfMenuPrice: Number(((costPerGuest / MENU_PRICE_PER_GUEST) * 100).toFixed(2)),
  };
}

/**
 * Tự động tính toàn bộ báo cáo giá vốn nguyên liệu & đối chiếu giá menu
 * cho một suất tasting 7 món (quy đổi theo `guests` khách).
 */
export function calculateMenuFoodCost(
  guests = 1,
  overrides: Record<string, number> = {},
): MenuFoodCostReport {
  // 1. Tính chi tiết từng món ở phương án chuẩn + khoảng giá các phương án thay thế
  const dishDetails = DISH_RECIPES.map((recipe) => {
    const stdDetail = calculateDishCost(recipe.dishIndex, undefined, guests, overrides);
    const variantCosts = recipe.variants.map((v) =>
      calculateDishCost(recipe.dishIndex, v.optionId, 1, overrides).costPerGuest,
    );
    return {
      recipe,
      stdDetail,
      minVariantCostPerGuest: Math.min(...variantCosts),
      maxVariantCostPerGuest: Math.max(...variantCosts),
    };
  });

  const costPerGuest = dishDetails.reduce((sum, d) => sum + d.stdDetail.costPerGuest, 0);
  const costTotal = costPerGuest * guests;

  const menuPricePerGuest = MENU_PRICE_PER_GUEST;
  const menuRevenueTotal = menuPricePerGuest * guests;
  const targetFoodCostPerGuest = TARGET_FOOD_COST_PER_GUEST;
  const targetFoodCostTotal = targetFoodCostPerGuest * guests;

  const foodCostPct = Number(((costPerGuest / menuPricePerGuest) * 100).toFixed(2));
  const grossProfitPerGuest = menuPricePerGuest - costPerGuest;
  const grossProfitTotal = menuRevenueTotal - costTotal;
  const grossMarginPct = Number(((grossProfitPerGuest / menuPricePerGuest) * 100).toFixed(2));

  const varianceVsTargetPerGuest = costPerGuest - targetFoodCostPerGuest;
  const variancePctPoints = Number((foodCostPct - TARGET_FOOD_COST_PCT).toFixed(2));
  const isWithinTarget = costPerGuest <= targetFoodCostPerGuest;

  const dishes: DishCostSummaryItem[] = dishDetails.map((d) => ({
    dishIndex: d.stdDetail.dishIndex,
    name: d.stdDetail.name,
    region: d.stdDetail.region,
    image: d.stdDetail.image,
    ingredientCount: d.stdDetail.lines.length,
    variantCount: d.recipe.variants.length,
    costPerGuest: d.stdDetail.costPerGuest,
    costTotal: d.stdDetail.costTotal,
    minVariantCostPerGuest: d.minVariantCostPerGuest,
    maxVariantCostPerGuest: d.maxVariantCostPerGuest,
    shareOfFoodCostPct:
      costPerGuest > 0 ? Number(((d.stdDetail.costPerGuest / costPerGuest) * 100).toFixed(1)) : 0,
    pctOfMenuPrice: d.stdDetail.pctOfMenuPrice,
  }));

  // 2. Gom bảng 56 nguyên liệu kho kèm định lượng & chi phí trên suất chuẩn
  const stdUsageMap = new Map<string, { qty: number; cost: number; dishes: number[] }>();
  const altDishesMap = new Map<string, number[]>();

  for (const d of dishDetails) {
    const stdIds = new Set<string>();
    for (const line of d.stdDetail.lines) {
      stdIds.add(line.ingredientId);
      const cur = stdUsageMap.get(line.ingredientId);
      if (cur) {
        cur.qty = roundQty(cur.qty + line.qtyPerGuest);
        cur.cost += line.costPerGuest;
        if (!cur.dishes.includes(d.recipe.dishIndex)) cur.dishes.push(d.recipe.dishIndex);
      } else {
        stdUsageMap.set(line.ingredientId, {
          qty: line.qtyPerGuest,
          cost: line.costPerGuest,
          dishes: [d.recipe.dishIndex],
        });
      }
    }
    for (const v of d.recipe.variants) {
      for (const l of v.lines) {
        if (!stdIds.has(l.ingredientId)) {
          const arr = altDishesMap.get(l.ingredientId) ?? [];
          if (!arr.includes(d.recipe.dishIndex)) arr.push(d.recipe.dishIndex);
          altDishesMap.set(l.ingredientId, arr);
        }
      }
    }
  }

  const groupRank = (g: IngredientGroup) => INGREDIENT_GROUP_ORDER.indexOf(g);
  let customizedCount = 0;

  const warehouseItems: WarehouseIngredientCostItem[] = INGREDIENTS.map((ing) => {
    const p = getEffectiveImportPrice(ing.id, overrides);
    if (p.isCustom) customizedCount += 1;
    const stdUsage = stdUsageMap.get(ing.id);
    const qtyPerGuestStandard = stdUsage?.qty ?? 0;
    const costPerGuestStandard = stdUsage?.cost ?? 0;
    return {
      ingredientId: ing.id,
      name: ing.name,
      group: ing.group,
      unit: ing.unit,
      spec: ing.spec,
      origin: p.origin,
      importPrice: p.importPrice,
      defaultImportPrice: p.defaultImportPrice,
      importUnit: p.importUnit,
      isCustomPrice: p.isCustom,
      costPerBaseUnit: p.costPerBaseUnit,
      standardDishIndexes: stdUsage?.dishes ?? [],
      altDishIndexes: altDishesMap.get(ing.id) ?? [],
      qtyPerGuestStandard,
      qtyTotalStandard: roundQty(qtyPerGuestStandard * guests),
      costPerGuestStandard,
      costTotalStandard: costPerGuestStandard * guests,
    };
  }).sort(
    (a, b) =>
      groupRank(a.group) - groupRank(b.group) ||
      b.costPerGuestStandard - a.costPerGuestStandard ||
      b.importPrice - a.importPrice,
  );

  // 3. Cơ cấu giá vốn theo 7 nhóm nguyên liệu
  const groupBreakdown: GroupCostBreakdownItem[] = INGREDIENT_GROUP_ORDER.map((group) => {
    const inGroup = warehouseItems.filter(
      (w) => w.group === group && w.qtyPerGuestStandard > 0,
    );
    const gCostPerGuest = inGroup.reduce((s, w) => s + w.costPerGuestStandard, 0);
    return {
      group,
      label: INGREDIENT_GROUP_LABELS[group],
      ingredientCount: inGroup.length,
      costPerGuest: gCostPerGuest,
      costTotal: gCostPerGuest * guests,
      shareOfFoodCostPct:
        costPerGuest > 0 ? Number(((gCostPerGuest / costPerGuest) * 100).toFixed(1)) : 0,
    };
  });

  const teaTotalPerGuest = menuPricePerGuest + TEA_PAIRING_PRICE;
  const wineTotalPerGuest = menuPricePerGuest + WINE_PAIRING_PRICE;

  return {
    guests,
    menuPricePerGuest,
    menuRevenueTotal,
    targetFoodCostPct: TARGET_FOOD_COST_PCT,
    targetFoodCostPerGuest,
    targetFoodCostTotal,
    costPerGuest,
    costTotal,
    foodCostPct,
    grossProfitPerGuest,
    grossProfitTotal,
    grossMarginPct,
    varianceVsTargetPerGuest,
    variancePctPoints,
    isWithinTarget,
    pairingBenchmarks: {
      none: {
        pricePerGuest: menuPricePerGuest,
        foodCostPct,
        grossProfitPerGuest,
      },
      tea: {
        pricePerGuest: teaTotalPerGuest,
        foodCostPct: Number(((costPerGuest / teaTotalPerGuest) * 100).toFixed(1)),
        grossProfitPerGuest: teaTotalPerGuest - costPerGuest,
      },
      wine: {
        pricePerGuest: wineTotalPerGuest,
        foodCostPct: Number(((costPerGuest / wineTotalPerGuest) * 100).toFixed(1)),
        grossProfitPerGuest: wineTotalPerGuest - costPerGuest,
      },
    },
    dishes,
    groupBreakdown,
    warehouseItems,
    customizedCount,
  };
}

// ---------- Định dạng hiển thị tiền tệ có dấu ----------

/** Định dạng chênh lệch tiền VND an toàn cho cả số âm, 0 và số dương (vd. "+7.234 đ", "−10.243 đ") */
export function formatSignedVND(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return "0 đ";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${formatVND(Math.abs(rounded))}`;
}

/** Định dạng đơn giá quy đổi trên đơn vị cơ sở (g hoặc ml), giữ phần thập phân nếu cần */
export function formatBaseUnitCost(costPerBaseUnit: number, unit: IngredientUnit): string {
  const rounded = Math.round(costPerBaseUnit * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${formatVND(rounded).replace(" đ", "")} đ/${unit}`;
  }
  const formatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(rounded);
  return `${formatted} đ/${unit}`;
}

/** Tiện ích kiểm tra xem món có tồn tại không */
export function isValidDishIndex(index: number): boolean {
  return MENU_ITEMS.some((m) => m.index === index);
}

// ---------- FR-33: KPI Food Cost đối chiếu doanh thu menu dự thu (Mục tiêu 50%) ----------

export interface FoodCostKpiSummary {
  /** Giá vốn nguyên liệu 1 khách (Tầng 1): Tổng định lượng × đơn giá trên 7 món */
  costPerGuest: number;
  /** Giá bán 1 suất menu (mặc định 1.190.000 đ) */
  menuPricePerGuest: number;
  /** Tỷ lệ Food Cost % (Tầng 2): Giá vốn ÷ Giá menu × 100 */
  foodCostPct: number;
  /** Trần mục tiêu theo FR-33 (50%) */
  targetCeilingPct: number;
  /** Mục tiêu lý tưởng chuẩn (33,5%) */
  targetStandardPct: number;
  /** Đạt mục tiêu nếu foodCostPct <= 50% */
  isWithinTarget: boolean;
  /** Món có chi phí nguyên liệu cao nhất (Top Cost Driver) */
  topCostDish: {
    dishIndex: number;
    name: string;
    region?: string;
    costPerGuest: number;
    shareOfFoodCostPct: number;
  };
  /** Lợi nhuận gộp 1 khách */
  grossProfitPerGuest: number;
  grossMarginPct: number;
  /** Số khách dự kiến phục vụ (từ đặt bàn tương lai) */
  futureGuests: number;
  /** Doanh thu phần menu dự thu (chưa gồm pairing) */
  expectedMenuRevenue: number;
  /** Chi phí nguyên liệu dự chi */
  expectedFoodCost: number;
  /** Lợi nhuận gộp menu dự thu */
  expectedGrossProfit: number;
  /** Doanh thu pairing (để riêng đối chiếu, không ăn vào định lượng) */
  expectedPairingRevenue: number;
  /** Tổng doanh thu dự thu (Menu + Pairing) */
  expectedTotalRevenue: number;
}

export interface FoodCostKpiOptions {
  futureGuests?: number;
  expectedPairingRevenue?: number;
  menuPriceOverride?: number;
}

/**
 * Tự động tính chỉ số KPI Food Cost theo phép tính 2 tầng quy định tại FR-33:
 * Tầng 1: Giá vốn = Σ(định lượng × đơn giá) trên 7 món + tìm món đắt nhất
 * Tầng 2: Food cost % = Giá vốn ÷ Giá menu × 100 (đối chiếu mục tiêu trần 50%)
 * Doanh thu tính riêng phần menu (loại trừ pairing).
 */
export function getFoodCostKpiSummary(
  overrides: Record<string, number> = {},
  options?: FoodCostKpiOptions,
): FoodCostKpiSummary {
  const report = calculateMenuFoodCost(1, overrides);
  const costPerGuest = report.costPerGuest;
  const menuPrice =
    options?.menuPriceOverride && options.menuPriceOverride > 0
      ? Math.round(options.menuPriceOverride)
      : MENU_PRICE_PER_GUEST;

  const foodCostPct = menuPrice > 0 ? Number(((costPerGuest / menuPrice) * 100).toFixed(2)) : 0;
  const isWithinTarget = foodCostPct <= TARGET_FOOD_COST_CEILING_PCT;

  const sortedDishes = [...report.dishes].sort((a, b) => b.costPerGuest - a.costPerGuest);
  const top = sortedDishes[0] ?? {
    dishIndex: 1,
    name: "Món 1",
    region: "",
    costPerGuest: 0,
    shareOfFoodCostPct: 0,
  };

  const futureGuests =
    typeof options?.futureGuests === "number" && options.futureGuests > 0
      ? Math.round(options.futureGuests)
      : 0;

  const expectedMenuRevenue = futureGuests * menuPrice;
  const expectedFoodCost = futureGuests * costPerGuest;
  const expectedGrossProfit = expectedMenuRevenue - expectedFoodCost;
  const expectedPairingRevenue = Math.max(0, options?.expectedPairingRevenue ?? 0);
  const expectedTotalRevenue = expectedMenuRevenue + expectedPairingRevenue;

  const grossProfitPerGuest = menuPrice - costPerGuest;
  const grossMarginPct =
    menuPrice > 0 ? Number(((grossProfitPerGuest / menuPrice) * 100).toFixed(2)) : 0;

  return {
    costPerGuest,
    menuPricePerGuest: menuPrice,
    foodCostPct,
    targetCeilingPct: TARGET_FOOD_COST_CEILING_PCT,
    targetStandardPct: TARGET_FOOD_COST_PCT,
    isWithinTarget,
    topCostDish: {
      dishIndex: top.dishIndex,
      name: top.name,
      region: top.region,
      costPerGuest: top.costPerGuest,
      shareOfFoodCostPct: top.shareOfFoodCostPct,
    },
    grossProfitPerGuest,
    grossMarginPct,
    futureGuests,
    expectedMenuRevenue,
    expectedFoodCost,
    expectedGrossProfit,
    expectedPairingRevenue,
    expectedTotalRevenue,
  };
}

