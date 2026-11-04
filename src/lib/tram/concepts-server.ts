// Server library for Menu Concepts management (Multi-Concept & Seasonal Rotation)
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import {
  getBomFromDb,
  type BomResponse,
  type ResolvedDishRecipe,
  type ResolvedRecipeLine,
  type ResolvedRecipeVariant,
} from "./recipes-server";
import { INGREDIENT_GROUP_LABELS, type IngredientGroup, type IngredientUnit } from "./recipes";

const CONCEPTS_FILE = path.resolve(process.cwd(), "db/concepts.json");

export interface MenuConcept {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "ACTIVE" | "UPCOMING" | "ARCHIVED";
  weekLabel: string; // "Tuần này", "Tuần tiếp theo (10/11 - 16/11)"
  sellingPrice: number;
  targetFoodCostPct: number;
  dishes: ResolvedDishRecipe[];
  createdAt: string;
  updatedAt: string;
}

export interface ConceptsStore {
  activeId: string;
  concepts: MenuConcept[];
}

function loadStore(): ConceptsStore {
  try {
    if (!fs.existsSync(CONCEPTS_FILE)) {
      return { activeId: "concept-2", concepts: [] };
    }
    const raw = fs.readFileSync(CONCEPTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.concepts)) {
      return parsed;
    }
    return { activeId: "concept-2", concepts: [] };
  } catch {
    return { activeId: "concept-2", concepts: [] };
  }
}

function saveStore(store: ConceptsStore) {
  const dir = path.dirname(CONCEPTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONCEPTS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Khởi tạo dữ liệu Concepts mặc định nếu chưa có file
 */
export async function ensureConceptsInitialized(): Promise<ConceptsStore> {
  const store = loadStore();
  if (store.concepts.length === 0) {
    const liveBom = await getBomFromDb(1);
    const activeConcept: MenuConcept = {
      id: "concept-2",
      code: "C2",
      name: "Concept 2: Hành trình vị Việt",
      description: "Thực đơn Tasting 7 món đang phục vụ tuần này tại TRẦM",
      status: "ACTIVE",
      weekLabel: "Tuần này (Đang phục vụ)",
      sellingPrice: 1190000,
      targetFoodCostPct: 33.5,
      dishes: liveBom.dishes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Tạo sẵn 1 Concept 3 mẫu cho tuần tiếp theo (nhân bản từ C2 với ghi chú kế hoạch)
    const upcomingDishes = JSON.parse(JSON.stringify(liveBom.dishes));
    const upcomingConcept: MenuConcept = {
      id: "concept-3",
      code: "C3",
      name: "Concept 3: Đông Vị - Hương Sắc Đất Trầm",
      description: "Thực đơn Tasting chuẩn bị cho tuần tiếp theo (Kế hoạch luân chuyển thực đơn)",
      status: "UPCOMING",
      weekLabel: "Tuần tiếp theo (Dự kiến)",
      sellingPrice: 1190000,
      targetFoodCostPct: 33.5,
      dishes: upcomingDishes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.activeId = "concept-2";
    store.concepts = [activeConcept, upcomingConcept];
    saveStore(store);
  }
  return store;
}

/**
 * Lấy danh sách tất cả các concepts
 */
export async function getAllConcepts(): Promise<{ activeId: string; concepts: MenuConcept[] }> {
  const store = await ensureConceptsInitialized();
  return {
    activeId: store.activeId,
    concepts: store.concepts,
  };
}

/**
 * Lấy BOM của một concept cụ thể
 */
export async function getConceptBom(conceptId?: string, guests: number = 1): Promise<BomResponse> {
  const store = await ensureConceptsInitialized();
  const targetId = conceptId || store.activeId;

  // Nếu là concept ACTIVE, lấy trực tiếp từ CSDL SQLite
  if (targetId === store.activeId) {
    const liveBom = await getBomFromDb(guests);
    // Cập nhật lại snapshot cho active concept trong file concepts.json
    const cIndex = store.concepts.findIndex((c) => c.id === targetId);
    if (cIndex >= 0) {
      store.concepts[cIndex].dishes = liveBom.dishes;
      store.concepts[cIndex].updatedAt = new Date().toISOString();
      saveStore(store);
    }
    return liveBom;
  }

  // Nếu là concept DRAFT/UPCOMING, đọc từ store
  const found = store.concepts.find((c) => c.id === targetId);
  if (!found) {
    // Fallback sang active concept
    return getBomFromDb(guests);
  }

  // Lấy giá nguyên liệu hiện tại để tính toán chính xác
  const rawIngredients = await db.ingredient.findMany({ orderBy: { name: "asc" } });
  const ingMap = new Map<string, (typeof rawIngredients)[0]>();
  for (const ing of rawIngredients) ingMap.set(ing.id, ing);

  // Recalculate quantities according to guests
  const dishes: ResolvedDishRecipe[] = found.dishes.map((d) => {
    const variants: ResolvedRecipeVariant[] = d.variants.map((v) => {
      const lines: ResolvedRecipeLine[] = v.lines.map((l) => {
        const ing = ingMap.get(l.ingredientId);
        const groupKey = (ing?.group ?? l.group ?? "SEASONING") as IngredientGroup;
        const groupLabel = INGREDIENT_GROUP_LABELS[groupKey] ?? groupKey;
        const unit = (l.unit || ing?.unit || "g") as IngredientUnit;
        const qtyPerGuest = l.qtyPerGuest;
        const qtyTotal = Number((qtyPerGuest * guests).toFixed(2));
        const price = ing?.defaultImportPrice ?? l.defaultImportPrice ?? 0;

        return {
          ...l,
          ingredientName: ing?.name ?? l.ingredientName,
          group: groupKey,
          groupLabel,
          unit,
          qtyPerGuest,
          qtyTotal,
          defaultImportPrice: price,
        };
      });

      const totalsPerGuest = { g: 0, ml: 0 };
      const totalsForGuests = { g: 0, ml: 0 };
      for (const line of lines) {
        if (line.unit === "g" || line.unit === "ml") {
          totalsPerGuest[line.unit] = Number((totalsPerGuest[line.unit] + line.qtyPerGuest).toFixed(2));
          totalsForGuests[line.unit] = Number((totalsForGuests[line.unit] + line.qtyTotal).toFixed(2));
        }
      }

      return {
        ...v,
        lines,
        totalsPerGuest,
        totalsForGuests,
      };
    });

    return {
      ...d,
      variants,
    };
  });

  const totalsPerGuest = { g: 0, ml: 0 };
  const totalsForGuests = { g: 0, ml: 0 };
  for (const d of dishes) {
    const def = d.variants.find((v) => v.isDefault) ?? d.variants[0];
    if (def) {
      totalsPerGuest.g += def.totalsPerGuest.g;
      totalsPerGuest.ml += def.totalsPerGuest.ml;
      totalsForGuests.g += def.totalsForGuests.g;
      totalsForGuests.ml += def.totalsForGuests.ml;
    }
  }

  const allIngredients = rawIngredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    group: i.group,
    groupLabel: INGREDIENT_GROUP_LABELS[i.group as IngredientGroup] ?? i.group,
    spec: i.spec,
    defaultImportPrice: i.defaultImportPrice,
    currentStock: i.currentStock,
    minStock: i.minStock,
  }));

  return {
    menu: `${found.name} (${found.weekLabel || "Kế hoạch"})`,
    basis: `Định lượng cho ${guests} khách`,
    guests,
    dishes,
    allIngredients,
    summary: {
      ingredientCount: rawIngredients.length,
      totalsPerGuest,
      totalsForGuests,
      ingredients: [],
    },
  };
}

/**
 * Tạo mới Concept thực đơn cho tuần tiếp theo
 */
export async function createConcept({
  name,
  description,
  weekLabel,
  cloneFromId,
}: {
  name: string;
  description?: string;
  weekLabel?: string;
  cloneFromId?: string;
}): Promise<MenuConcept> {
  const store = await ensureConceptsInitialized();
  const nextNum = store.concepts.length + 1;
  const newId = `concept-${Date.now().toString(36)}`;
  const code = `C${nextNum}`;

  let dishesToUse: ResolvedDishRecipe[] = [];

  if (cloneFromId) {
    const source = store.concepts.find((c) => c.id === cloneFromId);
    if (source) {
      dishesToUse = JSON.parse(JSON.stringify(source.dishes));
    }
  }

  // Nếu không clone hoặc nguồn rỗng, lấy từ active concept
  if (dishesToUse.length === 0) {
    const active = store.concepts.find((c) => c.id === store.activeId);
    if (active && active.dishes.length > 0) {
      dishesToUse = JSON.parse(JSON.stringify(active.dishes));
    } else {
      const live = await getBomFromDb(1);
      dishesToUse = JSON.parse(JSON.stringify(live.dishes));
    }
  }

  const newConcept: MenuConcept = {
    id: newId,
    code,
    name: name.trim() || `Concept ${nextNum}: Thực đơn Tuần ${nextNum}`,
    description: description?.trim() || "Thực đơn Tasting tuần mới của TRẦM",
    status: "UPCOMING",
    weekLabel: weekLabel?.trim() || "Tuần tiếp theo (Dự kiến)",
    sellingPrice: 1190000,
    targetFoodCostPct: 33.5,
    dishes: dishesToUse,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.concepts.push(newConcept);
  saveStore(store);
  return newConcept;
}

/**
 * Áp dụng Concept làm Thực đơn chính thức (Set as Active)
 * Đồng bộ toàn bộ món ăn và dòng BOM vào CSDL SQLite DishRecipe
 */
export async function setActiveConcept(conceptId: string): Promise<MenuConcept> {
  const store = await ensureConceptsInitialized();
  const target = store.concepts.find((c) => c.id === conceptId);
  if (!target) throw new Error("Không tìm thấy concept yêu cầu.");

  // 1. Cập nhật trạng thái trong store
  for (const c of store.concepts) {
    if (c.id === conceptId) {
      c.status = "ACTIVE";
      c.weekLabel = "Tuần này (Đang phục vụ)";
    } else if (c.status === "ACTIVE") {
      c.status = "ARCHIVED";
      c.weekLabel = "Đã lưu trữ";
    }
  }
  store.activeId = conceptId;
  saveStore(store);

  // 2. Ghi đè vào CSDL SQLite DishRecipe để toàn bộ hệ thống (Booking, POS, Bếp) nhận concept mới
  if (target.dishes && target.dishes.length > 0) {
    await db.$transaction(async (tx) => {
      // Xóa công thức cũ
      await tx.recipeLine.deleteMany({});
      await tx.recipeVariant.deleteMany({});
      await tx.dishRecipe.deleteMany({});

      // Tạo lại từng món của Concept mới
      for (const d of target.dishes) {
        const dish = await tx.dishRecipe.create({
          data: {
            dishIndex: d.index,
            dishName: d.name,
            portion: d.portion || "1 khách",
            method: d.method || "Chế biến thủ công",
            note: d.note || null,
          },
        });

        for (const v of d.variants) {
          const variant = await tx.recipeVariant.create({
            data: {
              recipeId: dish.id,
              optionId: v.optionId || "std",
              optionName: v.optionName || "Chuẩn vị",
              isDefault: v.isDefault ?? true,
              note: v.note || null,
            },
          });

          for (const l of v.lines) {
            await tx.recipeLine.create({
              data: {
                variantId: variant.id,
                ingredientId: l.ingredientId,
                qtyPerGuest: l.qtyPerGuest,
                unit: l.unit,
                prepNote: l.prepNote || null,
              },
            });
          }
        }
      }

      // Cập nhật tên chương trình trong BookingSetting
      await tx.bookingSetting.upsert({
        where: { id: "default" },
        update: { programName: target.name },
        create: {
          id: "default",
          programName: target.name,
          programEnabled: true,
        },
      });
    });
  }

  return target;
}

/**
 * Xóa một concept (chỉ cho phép xóa bản nháp / lưu trữ, không thể xóa concept đang hoạt động)
 */
export async function deleteConcept(conceptId: string): Promise<boolean> {
  const store = await ensureConceptsInitialized();
  if (conceptId === store.activeId) {
    throw new Error("Không thể xóa Concept đang hoạt động.");
  }
  store.concepts = store.concepts.filter((c) => c.id !== conceptId);
  saveStore(store);
  return true;
}

/**
 * Lưu chỉnh sửa dòng BOM hoặc Món ăn vào Concept cụ thể
 */
export async function saveDishOrLineToConcept({
  conceptId,
  action,
  payload,
}: {
  conceptId: string;
  action: "create-dish" | "delete-dish" | "save-line" | "delete-line";
  payload: any;
}) {
  const store = await ensureConceptsInitialized();
  const concept = store.concepts.find((c) => c.id === conceptId);
  if (!concept) throw new Error("Concept không tồn tại.");

  if (action === "create-dish") {
    const { name, region, portion, method, note } = payload;
    const maxIdx = concept.dishes.length > 0 ? Math.max(...concept.dishes.map((d) => d.index)) : 0;
    const nextIdx = maxIdx + 1;
    const newDish: ResolvedDishRecipe = {
      id: `dish-${Date.now().toString(36)}`,
      index: nextIdx,
      name: name.trim(),
      region: region?.trim() || "TRẦM",
      portion: portion || "1 khách",
      method: method || "Chế biến thủ công",
      note: note || "",
      defaultOptionId: "std",
      variants: [
        {
          id: `var-${Date.now().toString(36)}`,
          optionId: "std",
          optionName: "Chuẩn vị",
          isDefault: true,
          lines: [],
          totalsPerGuest: { g: 0, ml: 0 },
          totalsForGuests: { g: 0, ml: 0 },
        },
      ],
    };
    concept.dishes.push(newDish);
  } else if (action === "delete-dish") {
    const { index } = payload;
    concept.dishes = concept.dishes.filter((d) => d.index !== Number(index));
  } else if (action === "save-line") {
    const { variantId, ingredientId, qtyPerGuest, unit } = payload;
    for (const d of concept.dishes) {
      for (const v of d.variants) {
        if (v.id === variantId || v.optionId === "std") {
          const existingLineIdx = v.lines.findIndex((l) => l.ingredientId === ingredientId);
          if (existingLineIdx >= 0) {
            v.lines[existingLineIdx].qtyPerGuest = Number(qtyPerGuest);
            v.lines[existingLineIdx].unit = unit;
          } else {
            v.lines.push({
              id: `line-${Date.now().toString(36)}`,
              ingredientId,
              ingredientName: ingredientId,
              group: "SEASONING",
              groupLabel: "Gia vị",
              unit,
              qtyPerGuest: Number(qtyPerGuest),
              qtyTotal: Number(qtyPerGuest),
              defaultImportPrice: 100000,
            });
          }
        }
      }
    }
  } else if (action === "delete-line") {
    const { lineId } = payload;
    for (const d of concept.dishes) {
      for (const v of d.variants) {
        v.lines = v.lines.filter((l) => l.id !== lineId);
      }
    }
  }

  concept.updatedAt = new Date().toISOString();
  saveStore(store);

  // Nếu concept này đang là ACTIVE, đồng bộ cả vào SQLite
  if (conceptId === store.activeId) {
    await setActiveConcept(conceptId);
  }

  return concept;
}
