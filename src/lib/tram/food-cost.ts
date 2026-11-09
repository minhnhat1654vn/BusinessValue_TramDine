// FR-28 — Giá vốn nguyên liệu: tự tính giá vốn mỗi khách từ đơn giá nhập kho
// và đối chiếu với giá bán menu tasting "Tiến Vua · Bảy Báu Vật Việt" (1.440.000 đ/khách)
// cùng ngưỡng mục tiêu food cost 34,7% (trần duyệt 35%).

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

export const MENU_PRICE_PER_GUEST = PRICES.menu; // 1.440.000 đ/khách
export const WINE_PAIRING_PRICE = PRICES.winePairing; // 650.000 đ/khách (ngừng phục vụ từ 2027)
export const TEA_PAIRING_PRICE = PRICES.teaPairing; // 350.000 đ/khách

/** Mục tiêu tỷ lệ chi phí nguyên liệu / doanh thu menu theo mô hình tài chính 2027 (34,7%, giảm về 34,3% năm 2029) */
export const TARGET_FOOD_COST_PCT = 34.7;

/** Trần mục tiêu KPI food cost theo FR-33 (khung duyệt 28–35% doanh thu menu) */
export const TARGET_FOOD_COST_CEILING_PCT = 35;

/** Giá vốn nguyên liệu chuẩn theo BOM sạch cho 1 khách: 472.975 đ (32,85% giá menu 1.440.000 đ) */
export const TARGET_FOOD_COST_PER_GUEST = 472_975;

/** Trần giá vốn tối đa theo ngưỡng duyệt 35%: 1.440.000 × 35% = 504.000 đ */
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

// Bảng đơn giá nhập kho chuẩn cho 34 nguyên liệu trong danh mục bếp TRẦM (theo sheet BOM).
// Mức giá phản ánh nguồn nguyên liệu tuyển chọn chuẩn Fine Dining Việt Nam
// (tổng giá vốn suất chuẩn 7 món = 472.975 đ/khách theo sheet BOM, khung duyệt 28–35%).
export const INGREDIENT_PRICE_SPECS: IngredientPriceSpec[] = [
  { ingredientId: "caviar-lam-dong", defaultImportPrice: 20000000, importUnit: "kg", origin: "Cao nguyên Lâm Đồng · Hũ 30–50g giữ chuỗi lạnh" },
  { ingredientId: "sa-sung-van-don", defaultImportPrice: 6000000, importUnit: "kg", origin: "Vân Đồn, Quảng Ninh · Túi zip 500g" },
  { ingredientId: "bao-ngu-nha-trang", defaultImportPrice: 800000, importUnit: "kg", origin: "Nha Trang, Khánh Hòa · Size ~15 con/kg tươi sống" },
  { ingredientId: "yen-sao-khanh-hoa", defaultImportPrice: 32000000, importUnit: "kg", origin: "Khánh Hòa · Yến tinh chế hộp 100g" },
  { ingredientId: "ga-ta-nuoc-dung", defaultImportPrice: 150000, importUnit: "kg", origin: "Nội địa · Gà ta chưng cô 6 giờ lấy nước dùng" },
  { ingredientId: "ca-tam-da-lat", defaultImportPrice: 320000, importUnit: "kg", origin: "Cao nguyên Lâm Đồng · Fillet cá tầm tươi sống" },
  { ingredientId: "ga-dong-tao", defaultImportPrice: 1000000, importUnit: "kg", origin: "Hưng Yên · Đùi gà thuần chủng đặt lô 5kg" },
  { ingredientId: "banh-da-nem", defaultImportPrice: 90000, importUnit: "kg", origin: "Hải Dương / Hải Phòng · Bánh đa khô nướng giòn" },
  { ingredientId: "banh-mi-men-tuoi", defaultImportPrice: 100000, importUnit: "kg", origin: "Nội địa · Bếp TRẦM tự làm thủ công" },
  { ingredientId: "com-chay-st25", defaultImportPrice: 40000, importUnit: "kg", origin: "Sóc Trăng · Gạo ST25 chuẩn xuất khẩu chiên giòn" },
  { ingredientId: "kem-chua", defaultImportPrice: 200000, importUnit: "kg", origin: "Nội địa — Hộp 1 kg đánh bông mịn" },
  { ingredientId: "bo-lat-president", defaultImportPrice: 350000, importUnit: "kg", origin: "Nhập khẩu Pháp · Bơ lạt sỉ làm bánh & áp chảo" },
  { ingredientId: "kem-tuoi-whipping", defaultImportPrice: 160000, importUnit: "kg", origin: "New Zealand · Whipping Cream Anchor hộp 1 lít" },
  { ingredientId: "sen-co-ngu", defaultImportPrice: 700000, importUnit: "kg", origin: "Hồ Tây, Hà Nội · Sen tươi Cổ Ngự tuyển đặc sản" },
  { ingredientId: "hat-dieu-rang-muoi", defaultImportPrice: 300000, importUnit: "kg", origin: "Bình Phước · Nguyên hạt còn vỏ lụa" },
  { ingredientId: "nhan-long-hung-yen", defaultImportPrice: 120000, importUnit: "kg", origin: "Hưng Yên · Nhãn mọng nước cùi dày" },
  { ingredientId: "hoa-tieu-rung", defaultImportPrice: 400000, importUnit: "kg", origin: "Tuyên Quang · Tiêu rừng Măng Đen / Tuyên Quang" },
  { ingredientId: "ruou-nep-cai", defaultImportPrice: 100000, importUnit: "l", origin: "Nội địa · Can 5 lít ủ chum thơm" },
  { ingredientId: "nuoc-cot-ga-ta", defaultImportPrice: 190000, importUnit: "l", origin: "Nội địa · Nước cốt gà ta nguyên chất" },
  { ingredientId: "chanh-day-cot", defaultImportPrice: 120000, importUnit: "kg", origin: "Đà Lạt · Cốt chiết xuất 40% khối lượng" },
  { ingredientId: "mat-ong-rung", defaultImportPrice: 250000, importUnit: "kg", origin: "Tây Bắc · Mật ong khoái rừng nguyên chất" },
  { ingredientId: "muoi-ot-hoa-trang-tri", defaultImportPrice: 500000, importUnit: "kg", origin: "Nội địa · Muối ớt Tây Ninh, hoa & phụ theo phần" },
  { ingredientId: "mac-khen-tay-bac", defaultImportPrice: 350000, importUnit: "kg", origin: "Tây Bắc · Hạt mắc khén rang thơm" },
  { ingredientId: "huong-tram-tam-uop", defaultImportPrice: 1200000, importUnit: "kg", origin: "Nội địa · Trầm hương tự nhiên phân bổ theo phần" },
  { ingredientId: "phu-trang-tri-trang-mieng", defaultImportPrice: 1000000, importUnit: "kg", origin: "Nội địa · Vừng rang, cánh hoa, bánh kẹp giòn" },
  { ingredientId: "tra-shan-tuyet", defaultImportPrice: 1200000, importUnit: "kg", origin: "Tà Xùa, Tây Bắc · Búp trà cổ thụ >100 tuổi" },
  { ingredientId: "gia-vi-mon-1", defaultImportPrice: 1730000, importUnit: "kg", origin: "Chanh vàng vỏ 25g x 50đ + tía tô non 8g x 60đ" },
  { ingredientId: "gia-vi-mon-2", defaultImportPrice: 700000, importUnit: "kg", origin: "Muối hạt 6g x 25đ + gừng 7g x 50đ + sả 5g x 40đ" },
  { ingredientId: "gia-vi-mon-3", defaultImportPrice: 500000, importUnit: "kg", origin: "Hành boa rô 10g x 50đ" },
  { ingredientId: "gia-vi-mon-4", defaultImportPrice: 340000, importUnit: "kg", origin: "Hành khô nướng 4g x 60đ + gừng 2g x 50đ" },
  { ingredientId: "gia-vi-mon-6", defaultImportPrice: 1025000, importUnit: "kg", origin: "Dầu 15ml x 35đ + mắm 8g x 30đ + tỏi 5g x 40đ + đường 3g x 20đ" },
  { ingredientId: "gia-vi-mon-7", defaultImportPrice: 2180000, importUnit: "kg", origin: "Đường phèn 40g x 45đ + sữa tươi 10g x 28đ + đường 5g x 20đ" },
  { ingredientId: "than-hoa-hong", defaultImportPrice: 40000, importUnit: "kg", origin: "Nhập khẩu / nội địa · Kỹ thuật nướng (phân bổ)" },
  { ingredientId: "rau-thom-hoa-trang-tri", defaultImportPrice: 150000, importUnit: "kg", origin: "Đà Lạt · Trình bày món (phân bổ)" },
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
  fallbackPrice = 100_000,
  fallbackUnit: ImportUnit = "kg",
): { importPrice: number; defaultImportPrice: number; importUnit: ImportUnit; isCustom: boolean; costPerBaseUnit: number; origin?: string } {
  const spec = getIngredientPriceSpec(ingredientId) ?? {
    ingredientId,
    defaultImportPrice: fallbackPrice,
    importUnit: fallbackUnit,
  };
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

// ---------- FR-33: KPI Food Cost đối chiếu doanh thu menu dự thu (Trần 35%) ----------

export interface FoodCostKpiSummary {
  /** Giá vốn nguyên liệu 1 khách (Tầng 1): Tổng định lượng × đơn giá trên 7 món */
  costPerGuest: number;
  /** Giá bán 1 suất menu (mặc định 1.440.000 đ) */
  menuPricePerGuest: number;
  /** Tỷ lệ Food Cost % (Tầng 2): Giá vốn ÷ Giá menu × 100 */
  foodCostPct: number;
  /** Trần mục tiêu theo FR-33 (35%) */
  targetCeilingPct: number;
  /** Mục tiêu lý tưởng chuẩn (34,7%) */
  targetStandardPct: number;
  /** Đạt mục tiêu nếu foodCostPct <= 35% */
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
 * Tầng 2: Food cost % = Giá vốn ÷ Giá menu × 100 (đối chiếu mục tiêu trần 35%)
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

