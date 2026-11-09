// FR-27 — Định lượng công thức (BOM) cho bảy món tasting "Hành trình vị Việt"
// Mọi định lượng tính cho MỘT khách (một suất), khối lượng nguyên liệu sống/đã sơ chế.
// Dữ liệu gốc dùng chung cho màn quản trị và API /api/recipes; các FR bếp & kho
// (giá vốn, tồn kho, dự báo) sẽ tham chiếu mã nguyên liệu (id) ở đây.

import { MENU_ITEMS, RESTAURANT, type MenuItem } from "./constants";

// ---------- Danh mục nguyên liệu ----------

export type IngredientUnit = "g" | "ml";

export type IngredientGroup =
  | "PROTEIN"
  | "STARCH"
  | "DAIRY_FAT"
  | "PRODUCE"
  | "FRUIT_NUT"
  | "SEASONING"
  | "AROMATIC";

export const INGREDIENT_GROUP_LABELS: Record<IngredientGroup, string> = {
  PROTEIN: "Đạm (cá, thịt, đậu)",
  STARCH: "Tinh bột",
  DAIRY_FAT: "Sữa & chất béo",
  PRODUCE: "Rau, nấm & thảo mộc",
  FRUIT_NUT: "Trái cây & hạt",
  SEASONING: "Gia vị & nước chấm",
  AROMATIC: "Hương liệu & phụ liệu",
};

/** Thứ tự hiển thị nhóm nguyên liệu */
export const INGREDIENT_GROUP_ORDER: IngredientGroup[] = [
  "PROTEIN",
  "STARCH",
  "DAIRY_FAT",
  "PRODUCE",
  "FRUIT_NUT",
  "SEASONING",
  "AROMATIC",
];

export interface Ingredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  group: IngredientGroup;
  /** Quy cách / trạng thái nguyên liệu khi cân */
  spec?: string;
}

export const INGREDIENTS: Ingredient[] = [
  // Danh mục 34 nguyên liệu theo sheet BOM "Tiến Vua · Bảy Báu Vật Việt" (khớp prisma/seed-bom.ts)
  { id: "caviar-lam-dong", name: "Trứng cá tầm muối Lâm Đồng (caviar) — trung cấp lai", unit: "g", group: "PROTEIN", spec: "Cao nguyên Lâm Đồng · Hũ 30–50g giữ chuỗi lạnh" },
  { id: "sa-sung-van-don", name: "Sá sùng khô đảo Vân Đồn — loại đặc biệt", unit: "g", group: "PROTEIN", spec: "Vân Đồn, Quảng Ninh · Túi zip 500g" },
  { id: "bao-ngu-nha-trang", name: "Bào ngư biển lạnh Nha Trang (nguyên con ~65 g)", unit: "g", group: "PROTEIN", spec: "Nha Trang, Khánh Hòa · Size ~15 con/kg tươi sống" },
  { id: "yen-sao-khanh-hoa", name: "Yến sào tinh chế Khánh Hòa (yến nhà loại 1)", unit: "g", group: "PROTEIN", spec: "Khánh Hòa · Yến tinh chế hộp 100g" },
  { id: "ga-ta-nuoc-dung", name: "Gà ta thả vườn (nước dùng chưng 6 giờ)", unit: "g", group: "PROTEIN", spec: "Nội địa · Gà ta chưng cô 6 giờ lấy nước dùng" },
  { id: "ca-tam-da-lat", name: "Fillet cá tầm Lâm Đồng", unit: "g", group: "PROTEIN", spec: "Cao nguyên Lâm Đồng · Fillet cá tầm tươi sống" },
  { id: "ga-dong-tao", name: "Đùi gà Đông Tảo Hưng Yên (thuần chủng, tuyển)", unit: "g", group: "PROTEIN", spec: "Hưng Yên · Đùi gà thuần chủng đặt lô 5kg" },
  { id: "banh-da-nem", name: "Đế bánh đa nem nướng", unit: "g", group: "STARCH", spec: "Hải Dương / Hải Phòng · Bánh đa khô nướng giòn" },
  { id: "banh-mi-men-tuoi", name: "Bánh mì men tươi artisan — bánh chào mừng", unit: "g", group: "STARCH", spec: "Nội địa · Bếp TRẦM tự làm thủ công" },
  { id: "com-chay-st25", name: "Gạo ST25 (làm cơm cháy)", unit: "g", group: "STARCH", spec: "Sóc Trăng · Gạo ST25 chuẩn xuất khẩu chiên giòn" },
  { id: "kem-chua", name: "Kem chua (sour cream) Tatua đánh bông", unit: "g", group: "DAIRY_FAT", spec: "Nội địa — Hộp 1 kg đánh bông mịn" },
  { id: "bo-lat-president", name: "Bơ lạt President (Pháp)", unit: "g", group: "DAIRY_FAT", spec: "Nhập khẩu Pháp · Bơ lạt sỉ làm bánh & áp chảo" },
  { id: "kem-tuoi-whipping", name: "Kem tươi whipping Anchor (làm kem trầm hương)", unit: "g", group: "DAIRY_FAT", spec: "New Zealand · Whipping Cream Anchor hộp 1 lít" },
  { id: "sen-co-ngu", name: "Hạt sen Cổ Ngự Hồ Tây (tuyển)", unit: "g", group: "FRUIT_NUT", spec: "Hồ Tây, Hà Nội · Sen tươi Cổ Ngự tuyển đặc sản" },
  { id: "hat-dieu-rang-muoi", name: "Hạt điều rang muối (hạt rừng)", unit: "g", group: "FRUIT_NUT", spec: "Bình Phước · Nguyên hạt còn vỏ lụa" },
  { id: "nhan-long-hung-yen", name: "Nhãn lồng Hưng Yên (sơ chế tách hạt)", unit: "g", group: "FRUIT_NUT", spec: "Hưng Yên · Nhãn mọng nước cùi dày" },
  { id: "hoa-tieu-rung", name: "Hoa tiêu rừng Tuyên Quang", unit: "g", group: "SEASONING", spec: "Tuyên Quang · Tiêu rừng Măng Đen / Tuyên Quang" },
  { id: "ruou-nep-cai", name: "Rượu nếp cái hoa vàng — nướng ấm", unit: "ml", group: "SEASONING", spec: "Nội địa · Can 5 lít ủ chum thơm" },
  { id: "nuoc-cot-ga-ta", name: "Nước cốt gà thả vườn — chưng cô (phân bổ)", unit: "ml", group: "SEASONING", spec: "Nội địa · Nước cốt gà ta nguyên chất" },
  { id: "chanh-day-cot", name: "Chanh dây — cốt (Đà Lạt)", unit: "g", group: "SEASONING", spec: "Đà Lạt · Cốt chiết xuất 40% khối lượng" },
  { id: "mat-ong-rung", name: "Mật ong rừng Tây Bắc", unit: "g", group: "SEASONING", spec: "Tây Bắc · Mật ong khoái rừng nguyên chất" },
  { id: "muoi-ot-hoa-trang-tri", name: "Muối ớt & hoa trang trí — chào mừng", unit: "g", group: "SEASONING", spec: "Nội địa · Muối ớt Tây Ninh, hoa & phụ theo phần" },
  { id: "mac-khen-tay-bac", name: "Mắc khén Tây Bắc (rang, giã)", unit: "g", group: "AROMATIC", spec: "Tây Bắc · Hạt mắc khén rang thơm" },
  { id: "huong-tram-tam-uop", name: "Hương trầm — tẩm ướp (phân bổ)", unit: "g", group: "AROMATIC", spec: "Nội địa · Trầm hương tự nhiên phân bổ theo phần" },
  { id: "phu-trang-tri-trang-mieng", name: "Phụ trang trí tráng miệng (vừng rang, hoa, bánh kẹp)", unit: "g", group: "PRODUCE", spec: "Nội địa · Vừng rang, cánh hoa, bánh kẹp giòn" },
  { id: "tra-shan-tuyet", name: "Trà Shan tuyết cổ thụ Tà Xùa", unit: "g", group: "AROMATIC", spec: "Tà Xùa, Tây Bắc · Búp trà cổ thụ >100 tuổi" },
  { id: "gia-vi-mon-1", name: "Gia vị cơ bản & phụ liệu Món 1 (chanh vàng, tía tô non)", unit: "g", group: "PRODUCE", spec: "Chanh vàng vỏ 25g x 50đ + tía tô non 8g x 60đ" },
  { id: "gia-vi-mon-2", name: "Gia vị cơ bản & phụ liệu Món 2 (muối hạt, gừng, sả)", unit: "g", group: "SEASONING", spec: "Muối hạt 6g x 25đ + gừng 7g x 50đ + sả 5g x 40đ" },
  { id: "gia-vi-mon-3", name: "Gia vị cơ bản & phụ liệu Món 3 (hành boa rô)", unit: "g", group: "PRODUCE", spec: "Hành boa rô 10g x 50đ" },
  { id: "gia-vi-mon-4", name: "Gia vị cơ bản & phụ liệu Món 4 (hành khô, gừng)", unit: "g", group: "SEASONING", spec: "Hành khô nướng 4g x 60đ + gừng 2g x 50đ" },
  { id: "gia-vi-mon-6", name: "Gia vị cơ bản & phụ liệu Món 6 (dầu ăn, mắm, tỏi, đường cát)", unit: "g", group: "SEASONING", spec: "Dầu 15ml x 35đ + mắm 8g x 30đ + tỏi 5g x 40đ + đường 3g x 20đ" },
  { id: "gia-vi-mon-7", name: "Gia vị cơ bản & phụ liệu Món 7 (đường phèn, sữa tươi, đường cát)", unit: "g", group: "SEASONING", spec: "Đường phèn 40g x 45đ + sữa tươi 10g x 28đ + đường 5g x 20đ" },
  { id: "than-hoa-hong", name: "Than hoa hồng (than trắng, nướng)", unit: "g", group: "SEASONING", spec: "Nhập khẩu / nội địa · Kỹ thuật nướng (phân bổ)" },
  { id: "rau-thom-hoa-trang-tri", name: "Rau thơm & hoa trang trí đĩa", unit: "g", group: "PRODUCE", spec: "Đà Lạt · Trình bày món (phân bổ)" },
];

const INGREDIENT_MAP: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i]),
);

export function getIngredient(id: string): Ingredient | undefined {
  return INGREDIENT_MAP[id];
}

// ---------- Công thức theo món (Thực đơn Tiến Vua · Bảy Báu Vật Việt — 472.975 đ/khách) ----------

export interface RecipeLine {
  ingredientId: string;
  /** Định lượng cho 1 khách, theo đơn vị của nguyên liệu */
  qty: number;
  note?: string;
}

export interface RecipeVariant {
  /** Khớp `MENU_ITEMS[].options[].id` */
  optionId: string;
  lines: RecipeLine[];
  /** Ghi chú khác biệt so với công thức chuẩn */
  note?: string;
}

export interface DishRecipe {
  dishIndex: number;
  /** Mô tả khẩu phần thành phẩm cho 1 khách */
  portion: string;
  /** Tóm tắt cách chế biến / ra món */
  method: string;
  variants: RecipeVariant[];
}

// Công thức BOM 7 món "Tiến Vua · Bảy Báu Vật Việt" — tổng 472.975 đ/khách (khớp sheet BOM & prisma/seed-bom.ts)
const DISH_1_LINES: RecipeLine[] = [
  { ingredientId: "caviar-lam-dong", qty: 4, note: "Hũ caviar Lâm Đồng trung cấp lai ướp lạnh" },
  { ingredientId: "banh-da-nem", qty: 30, note: "Đế bánh đa nem nướng giòn" },
  { ingredientId: "kem-chua", qty: 15, note: "Kem chua Tatua đánh bông mịn" },
  { ingredientId: "tra-shan-tuyet", qty: 5, note: "Nghi thức trà chào mừng dùng chung cả menu" },
  { ingredientId: "banh-mi-men-tuoi", qty: 60, note: "Bánh mì men tươi artisan chào mừng" },
  { ingredientId: "bo-lat-president", qty: 10, note: "Bơ lạt President ăn kèm bánh chào mừng" },
  { ingredientId: "mat-ong-rung", qty: 5, note: "Mật ong rừng Tây Bắc ăn kèm bánh" },
  { ingredientId: "muoi-ot-hoa-trang-tri", qty: 1, note: "Muối ớt Tây Ninh & hoa trang trí theo phần" },
  { ingredientId: "gia-vi-mon-1", qty: 1, note: "Chanh vàng vỏ bào 25g, tía tô non 8g" },
];

const DISH_2_LINES: RecipeLine[] = [
  { ingredientId: "sa-sung-van-don", qty: 3, note: "Sá sùng khô Vân Đồn loại đặc biệt nướng than hoa" },
  { ingredientId: "hoa-tieu-rung", qty: 2, note: "Hoa tiêu rừng Tuyên Quang rang giã thơm" },
  { ingredientId: "gia-vi-mon-2", qty: 1, note: "Muối hạt 6g, gừng tươi 7g, sả tươi 5g" },
];

const DISH_3_LINES: RecipeLine[] = [
  { ingredientId: "bao-ngu-nha-trang", qty: 65, note: "Bào ngư biển lạnh Nha Trang nguyên con ~65g làm sạch" },
  { ingredientId: "ruou-nep-cai", qty: 30, note: "Rượu nếp cái hoa vàng nướng ấm khử tanh" },
  { ingredientId: "nuoc-cot-ga-ta", qty: 20, note: "Nước cốt gà thả vườn chưng cô đặc phân bổ" },
  { ingredientId: "gia-vi-mon-3", qty: 1, note: "Hành boa rô 10g" },
];

const DISH_4_LINES: RecipeLine[] = [
  { ingredientId: "yen-sao-khanh-hoa", qty: 2.5, note: "Yến sào tinh chế Khánh Hòa chưng cách thủy" },
  { ingredientId: "sen-co-ngu", qty: 8, note: "Hạt sen Cổ Ngự Hồ Tây tuyển chọn hấp bở" },
  { ingredientId: "ga-ta-nuoc-dung", qty: 75, note: "Nước dùng gà ta thả vườn chưng 6 giờ phân bổ" },
  { ingredientId: "gia-vi-mon-4", qty: 1, note: "Hành khô nướng 4g, gừng 2g" },
];

const DISH_5_LINES: RecipeLine[] = [
  { ingredientId: "ca-tam-da-lat", qty: 100, note: "Fillet cá tầm Lâm Đồng áp chảo da giòn" },
  { ingredientId: "bo-lat-president", qty: 15, note: "Bơ lạt President Pháp áp chảo" },
  { ingredientId: "chanh-day-cot", qty: 15, note: "Cốt chanh dây Đà Lạt tạo vị chua thanh" },
  { ingredientId: "hat-dieu-rang-muoi", qty: 10, note: "Hạt điều rang muối Bình Phước rắc giòn" },
];

const DISH_6_LINES: RecipeLine[] = [
  { ingredientId: "ga-dong-tao", qty: 110, note: "Đùi gà Đông Tảo Hưng Yên thuần chủng tuyển" },
  { ingredientId: "com-chay-st25", qty: 50, note: "Cơm cháy gạo ST25 chiên giòn ăn kèm" },
  { ingredientId: "mat-ong-rung", qty: 15, note: "Mật ong rừng glaze da gà óng ả" },
  { ingredientId: "mac-khen-tay-bac", qty: 2, note: "Mắc khén Tây Bắc rang giã xát da gà" },
  { ingredientId: "gia-vi-mon-6", qty: 1, note: "Dầu ăn 15ml, nước mắm 8g, tỏi 5g, đường 3g" },
];

const DISH_7_LINES: RecipeLine[] = [
  { ingredientId: "nhan-long-hung-yen", qty: 160, note: "Nhãn lồng Hưng Yên sơ chế tách hạt" },
  { ingredientId: "kem-tuoi-whipping", qty: 20, note: "Kem tươi whipping Anchor New Zealand làm kem trầm" },
  { ingredientId: "huong-tram-tam-uop", qty: 1, note: "Hương trầm tẩm ướp phân bổ theo phần" },
  { ingredientId: "phu-trang-tri-trang-mieng", qty: 1, note: "Phụ trang trí tráng miệng (vừng rang, hoa, bánh kẹp)" },
  { ingredientId: "tra-shan-tuyet", qty: 5, note: "Trà Shan tuyết cổ thụ Tà Xùa pha kèm món" },
  { ingredientId: "gia-vi-mon-7", qty: 1, note: "Đường phèn 40g, sữa tươi 10g, đường cát 5g" },
];

export const DISH_RECIPES: DishRecipe[] = [
  {
    dishIndex: 1,
    portion: "1 khách",
    method: "Ướp lạnh & Mở hộp tại bàn",
    variants: [
      { optionId: "std", lines: DISH_1_LINES, note: "Chuẩn vị fine dining" },
      { optionId: "extra_blini", lines: DISH_1_LINES, note: "Giữ nguyên định lượng chuẩn; bánh blini phục vụ thêm theo yêu cầu." },
    ],
  },
  {
    dishIndex: 2,
    portion: "1 khách",
    method: "Nướng than thảo mộc",
    variants: [
      { optionId: "std", lines: DISH_2_LINES, note: "Vị ngọt hậu tự nhiên của sá sùng" },
      { optionId: "crispy_fried", lines: DISH_2_LINES, note: "Giữ nguyên định lượng; đổi kỹ thuật chiên phồng." },
    ],
  },
  {
    dishIndex: 3,
    portion: "1 khách",
    method: "Om chậm men rượu nếp cái hoa vàng",
    variants: [
      { optionId: "std", lines: DISH_3_LINES, note: "Vị ngọt men nồng nàn" },
      { optionId: "mild_wine", lines: DISH_3_LINES, note: "Giữ nguyên định lượng; giảm thời gian om rượu." },
    ],
  },
  {
    dishIndex: 4,
    portion: "1 khách",
    method: "Tiềm thanh nhã & Rót tại bàn",
    variants: [
      { optionId: "std", lines: DISH_4_LINES, note: "Nước dùng trong vắt, bốc khói nghi ngút" },
      { optionId: "extra_lotus", lines: DISH_4_LINES, note: "Giữ nguyên định lượng chuẩn; hạt sen thêm theo yêu cầu." },
    ],
  },
  {
    dishIndex: 5,
    portion: "1 khách",
    method: "Áp chảo chảo gang bơ thảo mộc",
    variants: [
      { optionId: "std", lines: DISH_5_LINES, note: "Thăn cá mọng nước, da giòn rụm" },
      { optionId: "herb_steamed", lines: DISH_5_LINES, note: "Giữ nguyên định lượng; đổi kỹ thuật hấp thảo mộc." },
    ],
  },
  {
    dishIndex: 6,
    portion: "1 khách",
    method: "Quay giòn da đượm hương rừng Tây Bắc",
    variants: [
      { optionId: "std", lines: DISH_6_LINES, note: "Da gà giòn sần sật, cơm cháy vàng ruộm" },
      { optionId: "mild_spice", lines: DISH_6_LINES, note: "Giữ nguyên định lượng; giảm lượng mắc khén khi ra món." },
    ],
  },
  {
    dishIndex: 7,
    portion: "1 khách",
    method: "Nấu nước đường phèn thanh tao & Nghi thức trà 3 lần rót",
    variants: [
      { optionId: "std", lines: DISH_7_LINES, note: "Hương vị cung đình tao nhã" },
      { optionId: "low_sweet", lines: DISH_7_LINES, note: "Giữ nguyên định lượng; giảm đường khi nấu." },
    ],
  },
];

// ---------- Hàm tra cứu & tính toán ----------

export interface ResolvedRecipeLine {
  ingredientId: string;
  name: string;
  unit: IngredientUnit;
  group: IngredientGroup;
  spec?: string;
  qtyPerGuest: number;
  qtyTotal: number;
  note?: string;
}

/** Làm tròn số thực để tránh sai số dấu phẩy động (vd. 0,05 × 3) */
export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function getDishRecipe(dishIndex: number): DishRecipe | undefined {
  return DISH_RECIPES.find((r) => r.dishIndex === dishIndex);
}

export function getMenuItem(dishIndex: number): MenuItem | undefined {
  return MENU_ITEMS.find((m) => m.index === dishIndex);
}

/** Mã phương án mặc định của món (theo `isDefault` trong MENU_ITEMS) */
export function getDefaultOptionId(dishIndex: number): string {
  const item = getMenuItem(dishIndex);
  const def = item?.options?.find((o) => o.isDefault) ?? item?.options?.[0];
  return def?.id ?? "std";
}

/** Lấy công thức của một phương án; không tìm thấy thì trả về phương án mặc định */
export function getRecipeVariant(dishIndex: number, optionId?: string): RecipeVariant | undefined {
  const recipe = getDishRecipe(dishIndex);
  if (!recipe) return undefined;
  const wanted = optionId ?? getDefaultOptionId(dishIndex);
  return (
    recipe.variants.find((v) => v.optionId === wanted) ??
    recipe.variants.find((v) => v.optionId === getDefaultOptionId(dishIndex)) ??
    recipe.variants[0]
  );
}

/** Ghép thông tin nguyên liệu và nhân định lượng theo số khách */
export function resolveLines(lines: RecipeLine[], guests = 1): ResolvedRecipeLine[] {
  return lines.map((line) => {
    const ing = getIngredient(line.ingredientId);
    if (!ing) {
      throw new Error(`Thiếu nguyên liệu "${line.ingredientId}" trong danh mục.`);
    }
    return {
      ingredientId: ing.id,
      name: ing.name,
      unit: ing.unit,
      group: ing.group,
      spec: ing.spec,
      qtyPerGuest: line.qty,
      qtyTotal: roundQty(line.qty * guests),
      note: line.note,
    };
  });
}

/** Tổng khối lượng (g) và thể tích (ml) của một danh sách định lượng */
export function sumByUnit(lines: { unit: IngredientUnit; qty: number }[]): Record<IngredientUnit, number> {
  const totals: Record<IngredientUnit, number> = { g: 0, ml: 0 };
  for (const l of lines) totals[l.unit] = roundQty(totals[l.unit] + l.qty);
  return totals;
}

export interface AggregatedIngredient {
  ingredientId: string;
  name: string;
  unit: IngredientUnit;
  group: IngredientGroup;
  spec?: string;
  qtyPerGuest: number;
  qtyTotal: number;
  /** Các món (số thứ tự) có dùng nguyên liệu này */
  dishIndexes: number[];
}

/**
 * Tổng hợp định lượng một suất tasting 7 món cho mỗi khách.
 * `selection` cho phép chọn phương án từng món (mặc định: phương án chuẩn).
 */
export function aggregateMenu(
  guests = 1,
  selection: Record<number, string> = {},
): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>();
  for (const recipe of DISH_RECIPES) {
    const variant = getRecipeVariant(recipe.dishIndex, selection[recipe.dishIndex]);
    if (!variant) continue;
    for (const line of variant.lines) {
      const ing = getIngredient(line.ingredientId);
      if (!ing) continue;
      const current = map.get(ing.id);
      if (current) {
        current.qtyPerGuest = roundQty(current.qtyPerGuest + line.qty);
        if (!current.dishIndexes.includes(recipe.dishIndex)) current.dishIndexes.push(recipe.dishIndex);
      } else {
        map.set(ing.id, {
          ingredientId: ing.id,
          name: ing.name,
          unit: ing.unit,
          group: ing.group,
          spec: ing.spec,
          qtyPerGuest: line.qty,
          qtyTotal: 0,
          dishIndexes: [recipe.dishIndex],
        });
      }
    }
  }
  const groupRank = (g: IngredientGroup) => INGREDIENT_GROUP_ORDER.indexOf(g);
  return Array.from(map.values())
    .map((a) => ({ ...a, qtyTotal: roundQty(a.qtyPerGuest * guests) }))
    .sort((a, b) => groupRank(a.group) - groupRank(b.group) || b.qtyPerGuest - a.qtyPerGuest);
}

// ---------- Định dạng hiển thị ----------

const QTY_FORMAT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

/** Định dạng số lượng kiểu Việt Nam (dấu phẩy thập phân) */
export function formatNumberVi(value: number): string {
  return QTY_FORMAT.format(value);
}

/** Định dạng định lượng; tự quy đổi sang kg / l khi từ 1.000 trở lên */
export function formatQty(value: number, unit: IngredientUnit): string {
  if (value >= 1000) {
    return `${QTY_FORMAT.format(value / 1000)} ${unit === "g" ? "kg" : "l"}`;
  }
  return `${QTY_FORMAT.format(value)} ${unit}`;
}

/** Giới hạn số khách quy đổi: tối đa 2 ca × số chỗ ngồi */
export const MAX_SCALE_GUESTS = RESTAURANT.totalSeats * 2;
