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
  // Đạm
  { id: "ca-bop", name: "Cá bớp sông Cửu Long", unit: "g", group: "PROTEIN", spec: "Phi lê, bỏ da" },
  { id: "ca-loc", name: "Cá lóc đồng", unit: "g", group: "PROTEIN", spec: "Đã làm sạch, bỏ ruột" },
  { id: "than-bo", name: "Thăn bò vàng Quảng Nam", unit: "g", group: "PROTEIN", spec: "Thăn ngoại, lọc gân" },
  { id: "ca-duoi", name: "Cá đuối", unit: "g", group: "PROTEIN", spec: "Đã làm sạch nhớt, cắt khúc" },
  { id: "dau-phu", name: "Đậu phụ non Bảo Lạc", unit: "g", group: "PROTEIN", spec: "Đậu phụ làm từ đậu tương" },

  // Tinh bột
  { id: "bot-mi", name: "Bột mì số 13", unit: "g", group: "STARCH", spec: "Bột làm bánh mì" },
  { id: "bot-gao", name: "Bột gạo không gluten", unit: "g", group: "STARCH" },
  { id: "bot-nang", name: "Bột năng", unit: "g", group: "STARCH" },
  { id: "bun-tuoi", name: "Bún tươi sợi nhỏ", unit: "g", group: "STARCH", spec: "Tráng thủ công trong ngày" },

  // Sữa & chất béo
  { id: "bo-lat", name: "Bơ lạt thủ công", unit: "g", group: "DAIRY_FAT" },
  { id: "sua-tuoi", name: "Sữa tươi không đường", unit: "ml", group: "DAIRY_FAT" },
  { id: "dau-an", name: "Dầu ăn thực vật", unit: "ml", group: "DAIRY_FAT" },

  // Rau, nấm & thảo mộc
  { id: "rau-dang", name: "Rau đắng đất", unit: "g", group: "PRODUCE" },
  { id: "rau-cang-cua", name: "Rau càng cua", unit: "g", group: "PRODUCE" },
  { id: "hoa-chuoi", name: "Hoa chuối", unit: "g", group: "PRODUCE", spec: "Bào sợi, ngâm nước chanh" },
  { id: "rau-ram", name: "Rau răm", unit: "g", group: "PRODUCE" },
  { id: "hanh-tim", name: "Hành tím", unit: "g", group: "PRODUCE" },
  { id: "hanh-la", name: "Hành lá", unit: "g", group: "PRODUCE" },
  { id: "toi", name: "Tỏi", unit: "g", group: "PRODUCE", spec: "Đã bóc vỏ" },
  { id: "gung", name: "Gừng", unit: "g", group: "PRODUCE" },
  { id: "sa", name: "Sả cây", unit: "g", group: "PRODUCE" },
  { id: "ot-hiem", name: "Ớt hiểm", unit: "g", group: "PRODUCE" },
  { id: "ot-chi-thien", name: "Ớt chỉ thiên hun khói", unit: "g", group: "PRODUCE" },
  { id: "kinh-gioi", name: "Kinh giới", unit: "g", group: "PRODUCE" },
  { id: "tia-to", name: "Lá tía tô", unit: "g", group: "PRODUCE" },
  { id: "rau-nhai", name: "Rau nhái", unit: "g", group: "PRODUCE" },
  { id: "dot-xoai", name: "Đọt xoài non", unit: "g", group: "PRODUCE" },
  { id: "la-coc", name: "Lá cóc non", unit: "g", group: "PRODUCE" },
  { id: "la-lot", name: "Lá lốt", unit: "g", group: "PRODUCE" },
  { id: "la-moc-mat", name: "Lá móc mật", unit: "g", group: "PRODUCE", spec: "Lá tươi rừng Trà Bồng" },
  { id: "ca-chua", name: "Cà chua", unit: "g", group: "PRODUCE" },
  { id: "bac-ha", name: "Bạc hà (dọc mùng)", unit: "g", group: "PRODUCE", spec: "Tước vỏ, cắt xéo" },
  { id: "nam-huong", name: "Nấm hương rừng tươi", unit: "g", group: "PRODUCE" },
  { id: "nam-dui-ga", name: "Nấm đùi gà", unit: "g", group: "PRODUCE" },
  { id: "nam-rom", name: "Nấm rơm", unit: "g", group: "PRODUCE" },

  // Trái cây & hạt
  { id: "me-chin", name: "Me chín", unit: "g", group: "FRUIT_NUT", spec: "Dầm lấy nước cốt" },
  { id: "chanh", name: "Nước cốt chanh", unit: "ml", group: "FRUIT_NUT" },
  { id: "thom", name: "Thơm (dứa)", unit: "g", group: "FRUIT_NUT", spec: "Đã gọt mắt" },
  { id: "dau-phong", name: "Đậu phộng rang", unit: "g", group: "FRUIT_NUT", spec: "Bỏ vỏ lụa" },
  { id: "nhan-xuong", name: "Nhãn xuồng cơm vàng Long An", unit: "g", group: "FRUIT_NUT", spec: "Cùi đã bóc, bỏ hạt" },
  { id: "hat-sen", name: "Hạt sen tươi Tây Hồ", unit: "g", group: "FRUIT_NUT", spec: "Đã bỏ tim" },

  // Gia vị & nước chấm
  { id: "muoi-bien", name: "Muối biển hạt", unit: "g", group: "SEASONING" },
  { id: "muoi-ot-tn", name: "Muối ớt Tây Ninh", unit: "g", group: "SEASONING" },
  { id: "duong-trang", name: "Đường cát trắng", unit: "g", group: "SEASONING" },
  { id: "duong-thot-not", name: "Đường thốt nốt", unit: "g", group: "SEASONING" },
  { id: "duong-phen", name: "Đường phèn", unit: "g", group: "SEASONING" },
  { id: "mat-ong", name: "Mật ong hoa rừng", unit: "ml", group: "SEASONING" },
  { id: "nuoc-mam", name: "Nước mắm nhĩ Phú Quốc", unit: "ml", group: "SEASONING" },
  { id: "nuoc-tuong", name: "Nước tương nấm (chay)", unit: "ml", group: "SEASONING" },
  { id: "tuong-bao-lac", name: "Tương đậu tương Bảo Lạc", unit: "g", group: "SEASONING", spec: "Ủ chum lên men" },
  { id: "tieu-rung", name: "Tiêu rừng", unit: "g", group: "SEASONING" },
  { id: "tieu-den", name: "Tiêu đen xay", unit: "g", group: "SEASONING" },

  // Hương liệu & phụ liệu
  { id: "men-tuoi", name: "Men tươi", unit: "g", group: "AROMATIC" },
  { id: "tram-huong", name: "Tinh chất trầm hương thực phẩm", unit: "ml", group: "AROMATIC" },
  { id: "atiso", name: "Hoa atiso khô Đà Lạt", unit: "g", group: "AROMATIC", spec: "Ủ lạnh làm trà" },
  { id: "rom", name: "Rơm nếp sạch", unit: "g", group: "AROMATIC", spec: "Dùng để nướng trui" },
];

const INGREDIENT_MAP: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i]),
);

export function getIngredient(id: string): Ingredient | undefined {
  return INGREDIENT_MAP[id];
}

// ---------- Công thức theo món ----------

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

// Món 1 — Bánh mì bơ trầm hương & muối ớt Tây Ninh
const BANH_MI_STD: RecipeLine[] = [
  { ingredientId: "bot-mi", qty: 30 },
  { ingredientId: "men-tuoi", qty: 1, note: "Ủ bột 36 giờ" },
  { ingredientId: "sua-tuoi", qty: 12 },
  { ingredientId: "duong-trang", qty: 2 },
  { ingredientId: "muoi-bien", qty: 0.5 },
  { ingredientId: "bo-lat", qty: 15, note: "Đánh bông cùng trầm hương" },
  { ingredientId: "tram-huong", qty: 0.05 },
  { ingredientId: "muoi-ot-tn", qty: 3 },
];

const BANH_MI_GF: RecipeLine[] = [
  { ingredientId: "bot-gao", qty: 24 },
  { ingredientId: "bot-nang", qty: 8, note: "Tạo độ dai thay gluten" },
  { ingredientId: "men-tuoi", qty: 1 },
  { ingredientId: "sua-tuoi", qty: 14 },
  { ingredientId: "duong-trang", qty: 2 },
  { ingredientId: "muoi-bien", qty: 0.5 },
  { ingredientId: "bo-lat", qty: 15, note: "Đánh bông cùng trầm hương" },
  { ingredientId: "tram-huong", qty: 0.05 },
  { ingredientId: "muoi-ot-tn", qty: 3 },
];

// Món 2 — Gỏi cá bớp sông Cửu Long
const GOI_CA_BOP_STD: RecipeLine[] = [
  { ingredientId: "ca-bop", qty: 60, note: "Thái lát mỏng 3 mm" },
  { ingredientId: "me-chin", qty: 12 },
  { ingredientId: "duong-thot-not", qty: 4 },
  { ingredientId: "nuoc-mam", qty: 5 },
  { ingredientId: "chanh", qty: 5 },
  { ingredientId: "rau-dang", qty: 10 },
  { ingredientId: "rau-cang-cua", qty: 10 },
  { ingredientId: "hanh-tim", qty: 5, note: "Thái mỏng, ngâm đá" },
  { ingredientId: "ot-hiem", qty: 1 },
  { ingredientId: "dau-phong", qty: 5 },
];

const GOI_CA_BOP_COOKED: RecipeLine[] = [
  { ingredientId: "ca-bop", qty: 60, note: "Áp chảo chín tới" },
  { ingredientId: "dau-an", qty: 3 },
  { ingredientId: "me-chin", qty: 12 },
  { ingredientId: "duong-thot-not", qty: 4 },
  { ingredientId: "nuoc-mam", qty: 5 },
  { ingredientId: "chanh", qty: 5 },
  { ingredientId: "rau-dang", qty: 10 },
  { ingredientId: "rau-cang-cua", qty: 10 },
  { ingredientId: "hanh-tim", qty: 5, note: "Thái mỏng, ngâm đá" },
  { ingredientId: "ot-hiem", qty: 1 },
  { ingredientId: "dau-phong", qty: 5 },
];

const GOI_CA_BOP_VEG: RecipeLine[] = [
  { ingredientId: "hoa-chuoi", qty: 40 },
  { ingredientId: "rau-dang", qty: 10 },
  { ingredientId: "rau-cang-cua", qty: 10 },
  { ingredientId: "rau-ram", qty: 3 },
  { ingredientId: "me-chin", qty: 12 },
  { ingredientId: "duong-thot-not", qty: 4 },
  { ingredientId: "nuoc-tuong", qty: 5, note: "Thay nước mắm" },
  { ingredientId: "chanh", qty: 5 },
  { ingredientId: "ot-hiem", qty: 1 },
  { ingredientId: "dau-phong", qty: 8 },
];

// Món 3 — Bún đậu tương Bảo Lạc
const BUN_DAU_STD: RecipeLine[] = [
  { ingredientId: "bun-tuoi", qty: 50 },
  { ingredientId: "dau-phu", qty: 40, note: "Chiên vàng giòn" },
  { ingredientId: "tuong-bao-lac", qty: 20 },
  { ingredientId: "ot-chi-thien", qty: 2 },
  { ingredientId: "toi", qty: 2 },
  { ingredientId: "duong-trang", qty: 2 },
  { ingredientId: "dau-an", qty: 5 },
  { ingredientId: "kinh-gioi", qty: 5 },
  { ingredientId: "tia-to", qty: 3 },
];

// Món 4 — Cá lóc nướng trui rau rừng
const CA_LOC_STD: RecipeLine[] = [
  { ingredientId: "ca-loc", qty: 100 },
  { ingredientId: "rom", qty: 50, note: "Đốt phủ cá khoảng 12 phút" },
  { ingredientId: "rau-nhai", qty: 8 },
  { ingredientId: "dot-xoai", qty: 6 },
  { ingredientId: "la-coc", qty: 6 },
  { ingredientId: "muoi-bien", qty: 2, note: "Hầm cùng tiêu rừng" },
  { ingredientId: "tieu-rung", qty: 1 },
  { ingredientId: "chanh", qty: 5 },
];

const CA_LOC_STEAMED: RecipeLine[] = [
  { ingredientId: "ca-loc", qty: 100 },
  { ingredientId: "la-lot", qty: 6 },
  { ingredientId: "nam-huong", qty: 25 },
  { ingredientId: "gung", qty: 3 },
  { ingredientId: "hanh-la", qty: 3 },
  { ingredientId: "nuoc-mam", qty: 3 },
  { ingredientId: "rau-nhai", qty: 8 },
  { ingredientId: "dot-xoai", qty: 6 },
  { ingredientId: "muoi-bien", qty: 1 },
  { ingredientId: "tieu-rung", qty: 1 },
];

// Món 5 — Bò Quảng Nam nướng lá móc mật
const BO_STD: RecipeLine[] = [
  { ingredientId: "than-bo", qty: 80 },
  { ingredientId: "la-moc-mat", qty: 3, note: "Lót vỉ nướng" },
  { ingredientId: "mat-ong", qty: 8 },
  { ingredientId: "sa", qty: 5 },
  { ingredientId: "toi", qty: 3 },
  { ingredientId: "nuoc-mam", qty: 4 },
  { ingredientId: "tieu-den", qty: 0.5 },
  { ingredientId: "dau-an", qty: 3 },
];

const BO_MUSHROOM: RecipeLine[] = [
  { ingredientId: "nam-dui-ga", qty: 100, note: "Áp chảo khứa vảy rồng" },
  { ingredientId: "bo-lat", qty: 8 },
  { ingredientId: "la-moc-mat", qty: 3, note: "Lót chảo" },
  { ingredientId: "mat-ong", qty: 5 },
  { ingredientId: "toi", qty: 3 },
  { ingredientId: "nuoc-tuong", qty: 5, note: "Thay nước mắm" },
  { ingredientId: "tieu-den", qty: 1.5 },
  { ingredientId: "dau-an", qty: 3 },
];

// Món 6 — Canh chành cá đuối tía tô
const CANH_CA_DUOI_STD: RecipeLine[] = [
  { ingredientId: "ca-duoi", qty: 50 },
  { ingredientId: "me-chin", qty: 10 },
  { ingredientId: "ca-chua", qty: 20 },
  { ingredientId: "thom", qty: 15 },
  { ingredientId: "bac-ha", qty: 15 },
  { ingredientId: "tia-to", qty: 4, note: "Cho vào khi tắt bếp" },
  { ingredientId: "hanh-tim", qty: 2 },
  { ingredientId: "nuoc-mam", qty: 4 },
  { ingredientId: "duong-trang", qty: 3 },
  { ingredientId: "ot-hiem", qty: 0.5 },
];

const CANH_NAM_SEN: RecipeLine[] = [
  { ingredientId: "nam-rom", qty: 40 },
  { ingredientId: "hat-sen", qty: 20 },
  { ingredientId: "me-chin", qty: 10 },
  { ingredientId: "ca-chua", qty: 20 },
  { ingredientId: "thom", qty: 15 },
  { ingredientId: "bac-ha", qty: 15 },
  { ingredientId: "tia-to", qty: 4, note: "Cho vào khi tắt bếp" },
  { ingredientId: "nuoc-tuong", qty: 4, note: "Thay nước mắm" },
  { ingredientId: "duong-trang", qty: 3 },
];

// Món 7 — Chè trầm nhãn Long An kèm trà atiso
const CHE_STD: RecipeLine[] = [
  { ingredientId: "nhan-xuong", qty: 50 },
  { ingredientId: "hat-sen", qty: 20, note: "Bọc trong cùi nhãn" },
  { ingredientId: "duong-phen", qty: 12 },
  { ingredientId: "bot-nang", qty: 3, note: "Tạo độ sánh" },
  { ingredientId: "tram-huong", qty: 0.05 },
  { ingredientId: "atiso", qty: 3, note: "Ủ lạnh 8 giờ" },
];

const CHE_LOW_SUGAR: RecipeLine[] = [
  { ingredientId: "nhan-xuong", qty: 50 },
  { ingredientId: "hat-sen", qty: 20, note: "Bọc trong cùi nhãn" },
  { ingredientId: "duong-phen", qty: 6, note: "Giảm 50% đường phèn" },
  { ingredientId: "bot-nang", qty: 3, note: "Tạo độ sánh" },
  { ingredientId: "tram-huong", qty: 0.05 },
  { ingredientId: "atiso", qty: 3, note: "Ủ lạnh 8 giờ" },
];

export const DISH_RECIPES: DishRecipe[] = [
  {
    dishIndex: 1,
    portion: "1 ổ bánh mì nhỏ khoảng 45 g kèm 15 g bơ trầm hương",
    method: "Ủ bột lạnh 36 giờ, nướng 190 °C trong 14 phút; bơ đánh bông với trầm hương, rắc muối ớt khi ra món.",
    variants: [
      { optionId: "std", lines: BANH_MI_STD },
      { optionId: "gf", lines: BANH_MI_GF, note: "Thay bột mì bằng bột gạo và bột năng; chế biến trên khu vực riêng không gluten." },
    ],
  },
  {
    dishIndex: 2,
    portion: "1 đĩa gỏi khoảng 120 g",
    method: "Cá thái lát mỏng giữ lạnh 2 °C, trộn nước me ngay trước khi ra món; rắc đậu phộng sau cùng.",
    variants: [
      { optionId: "std", lines: GOI_CA_BOP_STD },
      { optionId: "cooked", lines: GOI_CA_BOP_COOKED, note: "Cá áp chảo chín tới, thêm dầu ăn; các thành phần còn lại giữ nguyên." },
      { optionId: "veg", lines: GOI_CA_BOP_VEG, note: "Thay cá bằng hoa chuối, nước tương thay nước mắm, bỏ hành tím." },
    ],
  },
  {
    dishIndex: 3,
    portion: "1 phần bún khoảng 130 g kèm chén tương 20 g",
    method: "Đậu phụ chiên vàng, tương Bảo Lạc phi tỏi và ớt hun khói, bún tươi cuộn lá kinh giới.",
    variants: [
      { optionId: "std", lines: BUN_DAU_STD },
      { optionId: "mild", lines: BUN_DAU_STD, note: "Giữ nguyên định lượng; ớt hun khói để riêng chén nhỏ để khách tự gia giảm." },
    ],
  },
  {
    dishIndex: 4,
    portion: "1 khúc cá lóc khoảng 80 g thành phẩm kèm rau rừng",
    method: "Cá xiên que, phủ rơm đốt khoảng 12 phút đến khi da sém giòn; cạo lớp cháy, ăn kèm rau rừng và muối tiêu chanh.",
    variants: [
      { optionId: "std", lines: CA_LOC_STD },
      { optionId: "steamed", lines: CA_LOC_STEAMED, note: "Không dùng rơm; cá hấp cùng lá lốt, nấm hương, gừng — bỏ lá cóc và chanh." },
    ],
  },
  {
    dishIndex: 5,
    portion: "1 phần bò khoảng 70 g thành phẩm",
    method: "Ướp mật ong, sả, tỏi 2 giờ; nướng trên lá móc mật lửa than, nghỉ thịt 3 phút trước khi thái.",
    variants: [
      { optionId: "med", lines: BO_STD },
      { optionId: "welldone", lines: BO_STD, note: "Giữ nguyên định lượng; nướng thêm 2–3 phút đến chín kỹ." },
      { optionId: "mushroom", lines: BO_MUSHROOM, note: "Thay thăn bò bằng nấm đùi gà áp bơ; nước tương thay nước mắm, bỏ sả." },
    ],
  },
  {
    dishIndex: 6,
    portion: "1 chén canh khoảng 150 ml",
    method: "Nấu với khoảng 120 ml nước lọc (không tính trong BOM); dầm me lấy nước cốt, cho cá khi nước sôi, tía tô thả sau cùng.",
    variants: [
      { optionId: "std", lines: CANH_CA_DUOI_STD },
      { optionId: "veg_soup", lines: CANH_NAM_SEN, note: "Thay cá đuối bằng nấm rơm và hạt sen; nước tương thay nước mắm, bỏ hành tím và ớt." },
    ],
  },
  {
    dishIndex: 7,
    portion: "1 chén chè khoảng 100 g kèm 100 ml trà atiso",
    method: "Nhãn bọc hạt sen, nấu chè lửa nhỏ với đường phèn; nhỏ trầm hương khi nguội. Trà atiso ủ lạnh 8 giờ với khoảng 100 ml nước lọc.",
    variants: [
      { optionId: "std", lines: CHE_STD },
      { optionId: "low_sugar", lines: CHE_LOW_SUGAR, note: "Giảm 50% đường phèn (12 g → 6 g); các thành phần còn lại giữ nguyên." },
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
