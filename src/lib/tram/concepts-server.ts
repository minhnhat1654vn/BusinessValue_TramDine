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
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
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
      weekLabel: "02/11/2026 - 08/11/2026",
      startDate: "2026-11-02",
      endDate: "2026-11-08",
      sellingPrice: 1190000,
      targetFoodCostPct: 33.5,
      dishes: liveBom.dishes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Concept 3 để trống theo yêu cầu: khi chuyển sang concept mới không hiển thị các item/section từ concept cũ
    const upcomingConcept: MenuConcept = {
      id: "concept-3",
      code: "C3",
      name: "Concept 3: Đông Vị - Hương Sắc Đất Trầm",
      description: "Thực đơn Tasting chuẩn bị áp dụng (09/11 - 15/11/2026)",
      status: "UPCOMING",
      weekLabel: "09/11/2026 - 15/11/2026",
      startDate: "2026-11-09",
      endDate: "2026-11-15",
      sellingPrice: 1190000,
      targetFoodCostPct: 33.5,
      dishes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.activeId = "concept-2";
    store.concepts = [activeConcept, upcomingConcept];
    saveStore(store);
  } else {
    let changed = false;
    for (const c of store.concepts) {
      if (c.id === "concept-2" && (!c.startDate || !c.endDate)) {
        c.startDate = "2026-11-02";
        c.endDate = "2026-11-08";
        c.weekLabel = "02/11/2026 - 08/11/2026";
        changed = true;
      }
    }
    if (changed) saveStore(store);
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
  startDate,
  endDate,
  cloneFromId,
}: {
  name: string;
  description?: string;
  weekLabel?: string;
  startDate?: string;
  endDate?: string;
  cloneFromId?: string;
}): Promise<MenuConcept> {
  const store = await ensureConceptsInitialized();
  const nextNum = store.concepts.length + 1;
  const newId = `concept-${Date.now().toString(36)}`;
  const code = `C${nextNum}`;

  let dishesToUse: ResolvedDishRecipe[] = [];

  if (cloneFromId && cloneFromId !== "blank") {
    const source = store.concepts.find((c) => c.id === cloneFromId);
    if (source) {
      dishesToUse = JSON.parse(JSON.stringify(source.dishes));
    }
  }
  // Nếu không chỉ định clone hoặc cloneFromId === "blank", dishesToUse = [] để trống hoàn toàn

  const formatPeriod = () => {
    if (startDate && endDate) {
      const s = startDate.split("-").reverse().join("/");
      const e = endDate.split("-").reverse().join("/");
      return `${s} - ${e}`;
    }
    if (startDate) return `Áp dụng từ ${startDate.split("-").reverse().join("/")}`;
    return "Kế hoạch mới";
  };

  const effectiveWeekLabel = weekLabel?.trim() || formatPeriod();

  const newConcept: MenuConcept = {
    id: newId,
    code,
    name: name.trim() || `Concept ${nextNum}: Thực đơn Tuần ${nextNum}`,
    description: description?.trim() || "Thực đơn Tasting tuần mới của TRẦM",
    status: "UPCOMING",
    weekLabel: effectiveWeekLabel,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
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
 * Cập nhật thông tin Concept thực đơn (Sửa Concept)
 */
export async function updateConcept({
  conceptId,
  name,
  description,
  weekLabel,
  startDate,
  endDate,
  sellingPrice,
  targetFoodCostPct,
}: {
  conceptId: string;
  name?: string;
  description?: string;
  weekLabel?: string;
  startDate?: string;
  endDate?: string;
  sellingPrice?: number;
  targetFoodCostPct?: number;
}): Promise<MenuConcept> {
  const store = await ensureConceptsInitialized();
  const target = store.concepts.find((c) => c.id === conceptId);
  if (!target) throw new Error("Concept không tồn tại.");

  if (name !== undefined && name.trim()) target.name = name.trim();
  if (description !== undefined) target.description = description.trim();
  if (startDate !== undefined) target.startDate = startDate || undefined;
  if (endDate !== undefined) target.endDate = endDate || undefined;

  const formatPeriod = () => {
    if (target.startDate && target.endDate) {
      const s = target.startDate.split("-").reverse().join("/");
      const e = target.endDate.split("-").reverse().join("/");
      return `${s} - ${e}`;
    }
    if (target.startDate) return `Áp dụng từ ${target.startDate.split("-").reverse().join("/")}`;
    return target.weekLabel || "Kế hoạch mới";
  };

  if (weekLabel !== undefined && weekLabel.trim()) {
    target.weekLabel = weekLabel.trim();
  } else if (startDate || endDate) {
    target.weekLabel = formatPeriod();
  }

  if (sellingPrice !== undefined && Number(sellingPrice) > 0) {
    target.sellingPrice = Number(sellingPrice);
  }
  if (targetFoodCostPct !== undefined && Number(targetFoodCostPct) > 0) {
    target.targetFoodCostPct = Number(targetFoodCostPct);
  }

  target.updatedAt = new Date().toISOString();
  saveStore(store);

  // Nếu là concept đang phục vụ (activeId), đồng bộ tên chương trình vào CSDL BookingSetting
  if (conceptId === store.activeId && name) {
    try {
      await db.bookingSetting.upsert({
        where: { id: "default" },
        update: { programName: target.name },
        create: { id: "default", programName: target.name, programEnabled: true },
      });
    } catch (e) {
      console.warn("Could not sync programName to BookingSetting:", e);
    }
  }

  return target;
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
            // Đảm bảo nguyên liệu tồn tại trong SQLite Ingredient để tránh Foreign Key Violation
            const exists = await tx.ingredient.findUnique({ where: { id: l.ingredientId } });
            if (!exists) {
              await tx.ingredient.create({
                data: {
                  id: l.ingredientId,
                  name: l.ingredientName || l.ingredientId,
                  unit: l.unit || 'g',
                  group: (l.group || 'SEASONING') as string,
                  spec: l.prepNote || null,
                  defaultImportPrice: l.defaultImportPrice || 100000,
                  currentStock: 1000,
                  minStock: 200,
                },
              });
            }

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
/**
 * Lưu chỉnh sửa dòng BOM hoặc Món ăn vào Concept cụ thể
 */
export async function saveDishOrLineToConcept({
  conceptId,
  action,
  payload,
}: {
  conceptId: string;
  action: "create-dish" | "update-dish" | "delete-dish" | "save-line" | "delete-line";
  payload: any;
}) {
  const store = await ensureConceptsInitialized();
  const concept = store.concepts.find((c) => c.id === conceptId);
  if (!concept) throw new Error("Concept không tồn tại.");

  if (action === "create-dish") {
    const { name, region, portion, method, note } = payload;
    const maxIdx = concept.dishes.length > 0 ? Math.max(...concept.dishes.map((d) => d.index)) : 0;
    const nextIdx = payload.index ? Number(payload.index) : maxIdx + 1;
    const newDish: ResolvedDishRecipe = {
      id: `dish-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      index: nextIdx,
      name: name.trim(),
      region: region?.trim() || "TRẦM",
      portion: portion || "1 khách",
      method: method || "Chế biến thủ công",
      note: note || "",
      defaultOptionId: "std",
      variants: [
        {
          id: `var-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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
    concept.dishes.sort((a, b) => a.index - b.index);
  } else if (action === "update-dish") {
    const { index, name, region, portion, method, note } = payload;
    const dish = concept.dishes.find((d) => d.index === Number(index));
    if (dish) {
      if (name) dish.name = name.trim();
      if (region !== undefined) dish.region = region.trim();
      if (portion !== undefined) dish.portion = portion.trim();
      if (method !== undefined) dish.method = method.trim();
      if (note !== undefined) dish.note = note.trim();
    }
  } else if (action === "delete-dish") {
    const { index } = payload;
    concept.dishes = concept.dishes.filter((d) => d.index !== Number(index));
  } else if (action === "save-line") {
    const { dishIndex, variantId, ingredientId, qtyPerGuest, unit, prepNote } = payload;
    
    // Tìm thông tin chi tiết nguyên liệu từ CSDL
    let ingName = ingredientId;
    let ingGroup: IngredientGroup = "SEASONING";
    let ingGroupLabel = "Gia vị & nước chấm";
    let ingUnit: IngredientUnit = unit || "g";
    let importPrice = 100000;

    try {
      const dbIng = await db.ingredient.findUnique({ where: { id: ingredientId } });
      if (dbIng) {
        ingName = dbIng.name;
        ingGroup = dbIng.group as IngredientGroup;
        ingGroupLabel = INGREDIENT_GROUP_LABELS[ingGroup] ?? dbIng.group;
        ingUnit = (unit || dbIng.unit || "g") as IngredientUnit;
        importPrice = dbIng.defaultImportPrice;
      }
    } catch (e) {
      console.warn("Could not query ingredient:", e);
    }

    const targetDish = dishIndex !== undefined 
      ? concept.dishes.find((d) => d.index === Number(dishIndex))
      : concept.dishes.find((d) => d.variants.some((v) => v.id === variantId));

    if (targetDish) {
      for (const v of targetDish.variants) {
        if (!variantId || v.id === variantId || v.optionId === "std") {
          const existingLineIdx = v.lines.findIndex((l) => l.ingredientId === ingredientId);
          if (existingLineIdx >= 0) {
            v.lines[existingLineIdx].qtyPerGuest = Number(qtyPerGuest);
            v.lines[existingLineIdx].qtyTotal = Number(qtyPerGuest);
            v.lines[existingLineIdx].unit = ingUnit;
            if (prepNote !== undefined) v.lines[existingLineIdx].prepNote = prepNote;
            v.lines[existingLineIdx].ingredientName = ingName;
            v.lines[existingLineIdx].group = ingGroup;
            v.lines[existingLineIdx].groupLabel = ingGroupLabel;
            v.lines[existingLineIdx].defaultImportPrice = importPrice;
          } else {
            v.lines.push({
              id: `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              ingredientId,
              ingredientName: ingName,
              group: ingGroup,
              groupLabel: ingGroupLabel,
              unit: ingUnit,
              qtyPerGuest: Number(qtyPerGuest),
              qtyTotal: Number(qtyPerGuest),
              defaultImportPrice: importPrice,
              prepNote: prepNote || undefined,
            });
          }

          // Recalculate variant totals
          const totalsPerGuest = { g: 0, ml: 0 };
          for (const l of v.lines) {
            if (l.unit === "g" || l.unit === "ml") {
              totalsPerGuest[l.unit] = Number((totalsPerGuest[l.unit] + l.qtyPerGuest).toFixed(2));
            }
          }
          v.totalsPerGuest = totalsPerGuest;
          v.totalsForGuests = totalsPerGuest;
        }
      }
    }
  } else if (action === "delete-line") {
    const { lineId, dishIndex } = payload;
    for (const d of concept.dishes) {
      if (dishIndex === undefined || d.index === Number(dishIndex)) {
        for (const v of d.variants) {
          v.lines = v.lines.filter((l) => l.id !== lineId && l.ingredientId !== lineId);
          
          // Recalculate variant totals
          const totalsPerGuest = { g: 0, ml: 0 };
          for (const l of v.lines) {
            if (l.unit === "g" || l.unit === "ml") {
              totalsPerGuest[l.unit] = Number((totalsPerGuest[l.unit] + l.qtyPerGuest).toFixed(2));
            }
          }
          v.totalsPerGuest = totalsPerGuest;
          v.totalsForGuests = totalsPerGuest;
        }
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

