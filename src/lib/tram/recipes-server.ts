// Server library for Recipes & BOM management with SQLite DB & Excel support
import { db } from "@/lib/db";
import { MENU_ITEMS } from "@/lib/tram/constants";
import {
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  type IngredientGroup,
  type IngredientUnit,
} from "@/lib/tram/recipes";
import * as XLSX from "xlsx";
import { seedBomDatabase } from "../../../prisma/seed-bom";

export interface ResolvedRecipeLine {
  id: string;
  ingredientId: string;
  ingredientName: string;
  group: IngredientGroup;
  groupLabel: string;
  spec?: string | null;
  unit: IngredientUnit;
  qtyPerGuest: number;
  qtyTotal: number;
  prepNote?: string | null;
  defaultImportPrice: number;
}

export interface ResolvedRecipeVariant {
  id: string;
  optionId: string;
  optionName: string;
  isDefault: boolean;
  note?: string | null;
  lines: ResolvedRecipeLine[];
  totalsPerGuest: Record<IngredientUnit, number>;
  totalsForGuests: Record<IngredientUnit, number>;
}

export interface ResolvedDishRecipe {
  id: string;
  index: number;
  name: string;
  region: string;
  portion: string;
  method: string;
  note?: string | null;
  defaultOptionId: string;
  variants: ResolvedRecipeVariant[];
}

export interface AggregatedIngredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  group: IngredientGroup;
  groupLabel: string;
  spec?: string | null;
  defaultImportPrice: number;
  qtyPerGuest: number;
  qtyTotal: number;
  dishCount: number;
  dishes: { dishIndex: number; dishName: string; qty: number }[];
}

export interface BomResponse {
  menu: string;
  basis: string;
  guests: number;
  dishes: ResolvedDishRecipe[];
  allIngredients: {
    id: string;
    name: string;
    unit: string;
    group: string;
    groupLabel: string;
    spec?: string | null;
    defaultImportPrice: number;
    currentStock: number;
    minStock: number;
  }[];
  summary: {
    ingredientCount: number;
    totalsPerGuest: Record<IngredientUnit, number>;
    totalsForGuests: Record<IngredientUnit, number>;
    ingredients: AggregatedIngredient[];
  };
}

function sumUnits(items: { unit: string; qty: number }[]): Record<IngredientUnit, number> {
  const res: Record<IngredientUnit, number> = { g: 0, ml: 0 };
  for (const it of items) {
    if (it.unit === "g" || it.unit === "ml") {
      res[it.unit as IngredientUnit] = Number((res[it.unit as IngredientUnit] + it.qty).toFixed(2));
    }
  }
  return res;
}

/** Lấy toàn bộ công thức BOM từ SQLite theo số lượng khách */
export async function getBomFromDb(guests: number = 1, dishFilter?: number | null): Promise<BomResponse> {
  // Đảm bảo CSDL có dữ liệu, nếu trống thì seed tự động
  const count = await db.dishRecipe.count();
  if (count === 0) {
    await seedBomDatabase();
  }

  // 1. Lấy tất cả nguyên liệu trong DB
  const rawIngredients = await db.ingredient.findMany({
    orderBy: { name: "asc" },
  });

  const ingredientMap = new Map<string, (typeof rawIngredients)[0]>();
  for (const ing of rawIngredients) {
    ingredientMap.set(ing.id, ing);
  }

  // 2. Lấy công thức món ăn kèm variants và lines
  const rawDishes = await db.dishRecipe.findMany({
    where: dishFilter ? { dishIndex: dishFilter } : undefined,
    orderBy: { dishIndex: "asc" },
    include: {
      variants: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        include: {
          lines: {
            include: {
              ingredient: true,
            },
          },
        },
      },
    },
  });

  // Gom nhóm tổng hợp nguyên liệu cho toàn bộ menu (chỉ tính variant default)
  const menuAggMap = new Map<
    string,
    {
      ingredient: (typeof rawIngredients)[0];
      qtyPerGuest: number;
      dishes: { dishIndex: number; dishName: string; qty: number }[];
    }
  >();

  const dishes: ResolvedDishRecipe[] = rawDishes.map((d: any) => {
    const menuItem = MENU_ITEMS.find((m) => m.index === d.dishIndex);
    const defaultVariant = d.variants.find((v: any) => v.isDefault) ?? d.variants[0];

    const variants: ResolvedRecipeVariant[] = d.variants.map((v: any) => {
      const lines: ResolvedRecipeLine[] = v.lines.map((l: any) => {
        const ing = l.ingredient ?? ingredientMap.get(l.ingredientId);
        const groupKey = (ing?.group ?? "SEASONING") as IngredientGroup;
        const groupLabel = INGREDIENT_GROUP_LABELS[groupKey] ?? groupKey;
        const unit = (l.unit || ing?.unit || "g") as IngredientUnit;
        const qtyPerGuest = l.qtyPerGuest;
        const qtyTotal = Number((qtyPerGuest * guests).toFixed(2));

        return {
          id: l.id,
          ingredientId: l.ingredientId,
          ingredientName: ing?.name ?? l.ingredientId,
          group: groupKey,
          groupLabel,
          spec: ing?.spec ?? null,
          unit,
          qtyPerGuest,
          qtyTotal,
          prepNote: l.prepNote ?? null,
          defaultImportPrice: ing?.defaultImportPrice ?? 0,
        };
      });

      // Nếu là variant mặc định, cộng vào aggregateMenu
      if (v.isDefault) {
        for (const line of lines) {
          const ing = ingredientMap.get(line.ingredientId);
          if (!ing) continue;
          const current = menuAggMap.get(line.ingredientId);
          if (current) {
            current.qtyPerGuest = Number((current.qtyPerGuest + line.qtyPerGuest).toFixed(2));
            current.dishes.push({
              dishIndex: d.dishIndex,
              dishName: d.dishName,
              qty: line.qtyPerGuest,
            });
          } else {
            menuAggMap.set(line.ingredientId, {
              ingredient: ing,
              qtyPerGuest: line.qtyPerGuest,
              dishes: [
                {
                  dishIndex: d.dishIndex,
                  dishName: d.dishName,
                  qty: line.qtyPerGuest,
                },
              ],
            });
          }
        }
      }

      return {
        id: v.id,
        optionId: v.optionId,
        optionName: v.optionName,
        isDefault: v.isDefault,
        note: v.note,
        lines,
        totalsPerGuest: sumUnits(lines.map((l) => ({ unit: l.unit, qty: l.qtyPerGuest }))),
        totalsForGuests: sumUnits(lines.map((l) => ({ unit: l.unit, qty: l.qtyTotal }))),
      };
    });

    return {
      id: d.id,
      index: d.dishIndex,
      name: d.dishName,
      region: menuItem?.region ?? "",
      portion: d.portion,
      method: d.method,
      note: d.note,
      defaultOptionId: defaultVariant?.optionId ?? "std",
      variants,
    };
  });

  // Chuyển menuAggMap thành danh sách tổng hợp
  const aggregatedIngredients: AggregatedIngredient[] = Array.from(menuAggMap.values())
    .map((item) => {
      const gKey = (item.ingredient.group || "SEASONING") as IngredientGroup;
      const unit = (item.ingredient.unit || "g") as IngredientUnit;
      const qtyTotal = Number((item.qtyPerGuest * guests).toFixed(2));

      return {
        id: item.ingredient.id,
        name: item.ingredient.name,
        unit,
        group: gKey,
        groupLabel: INGREDIENT_GROUP_LABELS[gKey] ?? gKey,
        spec: item.ingredient.spec,
        defaultImportPrice: item.ingredient.defaultImportPrice,
        qtyPerGuest: item.qtyPerGuest,
        qtyTotal,
        dishCount: item.dishes.length,
        dishes: item.dishes,
      };
    })
    .sort((a, b) => {
      const orderA = INGREDIENT_GROUP_ORDER.indexOf(a.group);
      const orderB = INGREDIENT_GROUP_ORDER.indexOf(b.group);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, "vi");
    });

  return {
    menu: "Hành trình vị Việt — Tasting Menu 7 món",
    basis: "Định lượng chuẩn cho 1 khách từ CSDL TRẦM Reserve",
    guests,
    dishes,
    allIngredients: rawIngredients.map((i: any) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      group: i.group,
      groupLabel: INGREDIENT_GROUP_LABELS[i.group as IngredientGroup] ?? i.group,
      spec: i.spec,
      defaultImportPrice: i.defaultImportPrice,
      currentStock: i.currentStock,
      minStock: i.minStock,
    })),
    summary: {
      ingredientCount: aggregatedIngredients.length,
      totalsPerGuest: sumUnits(aggregatedIngredients.map((a) => ({ unit: a.unit, qty: a.qtyPerGuest }))),
      totalsForGuests: sumUnits(aggregatedIngredients.map((a) => ({ unit: a.unit, qty: a.qtyTotal }))),
      ingredients: aggregatedIngredients,
    },
  };
}

/** Thêm hoặc sửa nguyên liệu */
export async function upsertIngredient(data: {
  id?: string;
  name: string;
  unit: string;
  group: string;
  spec?: string;
  defaultImportPrice?: number;
  currentStock?: number;
  minStock?: number;
}) {
  const slug =
    data.id && data.id.trim()
      ? data.id.trim().toLowerCase()
      : data.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[đĐ]/g, "d")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

  return await db.ingredient.upsert({
    where: { id: slug },
    update: {
      name: data.name,
      unit: data.unit,
      group: data.group,
      spec: data.spec ?? null,
      defaultImportPrice: Number(data.defaultImportPrice) || 0,
      currentStock: Number(data.currentStock) || 0,
      minStock: Number(data.minStock) || 0,
    },
    create: {
      id: slug,
      name: data.name,
      unit: data.unit,
      group: data.group,
      spec: data.spec ?? null,
      defaultImportPrice: Number(data.defaultImportPrice) || 0,
      currentStock: Number(data.currentStock) || 0,
      minStock: Number(data.minStock) || 0,
    },
  });
}

/** Xóa nguyên liệu (kiểm tra ràng buộc) */
export async function deleteIngredient(id: string) {
  const lineCount = await db.recipeLine.count({
    where: { ingredientId: id },
  });
  if (lineCount > 0) {
    throw new Error(`Không thể xóa: Nguyên liệu đang được sử dụng trong ${lineCount} công thức món.`);
  }
  return await db.ingredient.delete({
    where: { id },
  });
}

/** Thêm hoặc cập nhật dòng định lượng */
export async function upsertRecipeLine(data: {
  id?: string;
  variantId: string;
  ingredientId: string;
  qtyPerGuest: number;
  unit: string;
  prepNote?: string;
}) {
  if (data.id) {
    return await db.recipeLine.update({
      where: { id: data.id },
      data: {
        qtyPerGuest: Number(data.qtyPerGuest),
        unit: data.unit,
        prepNote: data.prepNote ?? null,
        ingredientId: data.ingredientId,
      },
    });
  }

  return await db.recipeLine.upsert({
    where: {
      variantId_ingredientId: {
        variantId: data.variantId,
        ingredientId: data.ingredientId,
      },
    },
    update: {
      qtyPerGuest: Number(data.qtyPerGuest),
      unit: data.unit,
      prepNote: data.prepNote ?? null,
    },
    create: {
      variantId: data.variantId,
      ingredientId: data.ingredientId,
      qtyPerGuest: Number(data.qtyPerGuest),
      unit: data.unit,
      prepNote: data.prepNote ?? null,
    },
  });
}

/** Xóa dòng định lượng */
export async function deleteRecipeLine(id: string) {
  return await db.recipeLine.delete({
    where: { id },
  });
}

/** Xuất file Excel (.xlsx) gồm Sheet dữ liệu & Sheet hướng dẫn */
export async function exportBomToExcelBuffer(isTemplateOnly: boolean = false): Promise<Buffer> {
  const bom = await getBomFromDb(1);

  // Sheet 1: CongThuc_BOM
  const rows: any[] = [];
  if (!isTemplateOnly) {
    for (const dish of bom.dishes) {
      for (const variant of dish.variants) {
        for (const line of variant.lines) {
          rows.push({
            "STT Món": dish.index,
            "Tên Món": dish.name,
            "Mã Biến Thể": variant.optionId,
            "Tên Biến Thể": variant.optionName,
            "Mặc Định (1=Có, 0=Không)": variant.isDefault ? 1 : 0,
            "Mã Nguyên Liệu": line.ingredientId,
            "Tên Nguyên Liệu": line.ingredientName,
            "Nhóm": line.group,
            "Đơn Vị": line.unit,
            "Định Lượng / 1 Khách": line.qtyPerGuest,
            "Quy Cách / Sơ Chế": line.prepNote || line.spec || "",
            "Đơn Giá Nhập (VND/đơn vị)": line.defaultImportPrice || 0,
          });
        }
      }
    }
  } else {
    // Thêm 2 dòng mẫu đại diện
    rows.push({
      "STT Món": 1,
      "Tên Món": "Tuyết Cá Tầm",
      "Mã Biến Thể": "std",
      "Tên Biến Thể": "Mở hộp caviar tại bàn",
      "Mặc Định (1=Có, 0=Không)": 1,
      "Mã Nguyên Liệu": "caviar-lam-dong",
      "Tên Nguyên Liệu": "Trứng cá tầm Caviar Lâm Đồng",
      "Nhóm": "PROTEIN",
      "Đơn Vị": "g",
      "Định Lượng / 1 Khách": 20,
      "Quy Cách / Sơ Chế": "Lọ 20g ướp lạnh, mở tại bàn",
      "Đơn Giá Nhập (VND/đơn vị)": 2500000,
    });
    rows.push({
      "STT Món": 7,
      "Tên Món": "Trầm và Sen — Nhãn lồng hạt sen cung đình",
      "Mã Biến Thể": "std",
      "Tên Biến Thể": "Ngọt thanh vương hương Trầm",
      "Mặc Định (1=Có, 0=Không)": 1,
      "Mã Nguyên Liệu": "nhan-long-hung-yen",
      "Tên Nguyên Liệu": "Nhãn lồng Hưng Yên mọng nước",
      "Nhóm": "FRUIT_NUT",
      "Đơn Vị": "g",
      "Định Lượng / 1 Khách": 60,
      "Quy Cách / Sơ Chế": "Tách hạt khéo léo",
      "Đơn Giá Nhập (VND/đơn vị)": 120000,
    });
  }

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(rows);

  // Đặt độ rộng cột cho sheet 1
  ws1["!cols"] = [
    { wch: 10 }, // STT Món
    { wch: 32 }, // Tên Món
    { wch: 14 }, // Mã Biến Thể
    { wch: 28 }, // Tên Biến Thể
    { wch: 22 }, // Mặc Định
    { wch: 22 }, // Mã Nguyên Liệu
    { wch: 32 }, // Tên Nguyên Liệu
    { wch: 14 }, // Nhóm
    { wch: 10 }, // Đơn Vị
    { wch: 22 }, // Định Lượng / 1 Khách
    { wch: 35 }, // Quy Cách / Sơ Chế
    { wch: 24 }, // Đơn Giá Nhập
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "CongThuc_BOM");

  // Sheet 2: HuongDan_DanhMuc
  const guideRows = [
    {
      "Mã Nhóm (Cột 'Nhóm')": "PROTEIN",
      "Tên Nhóm": "Đạm (cá, thịt, gia cầm, hải sản)",
      "Ví dụ": "Trứng cá tầm, Sá sùng, Bào ngư, Cá tầm, Gà Đông Tảo",
    },
    {
      "Mã Nhóm (Cột 'Nhóm')": "STARCH",
      "Tên Nhóm": "Tinh bột",
      "Ví dụ": "Bánh blini, Cơm cháy ST25, Bột năng",
    },
    {
      "Mã Nhóm (Cột 'Nhóm')": "DAIRY_FAT",
      "Tên Nhóm": "Sữa & chất béo",
      "Ví dụ": "Kem chua, Bơ thảo mộc, Dầu thực vật",
    },
    {
      "Mã Nhóm (Cột 'Nhóm')": "PRODUCE",
      "Tên Nhóm": "Rau củ, nấm & thảo mộc",
      "Ví dụ": "Măng tây xanh, Đông trùng hạ thảo, Rau răm rừng",
    },
    {
      "Mã Nhóm (Cột 'Nhóm')": "FRUIT_NUT",
      "Tên Nhóm": "Trái cây & hạt",
      "Ví dụ": "Nhãn lồng Hưng Yên, Hạt sen Cung đình, Táo đỏ",
    },
    {
      "Mã Nhóm (Cột 'Nhóm')": "SEASONING",
      "Tên Nhóm": "Gia vị & nước dùng",
      "Ví dụ": "Muối hầm, Tiêu rừng, Nước dùng bồ câu, Nước dùng nấm",
    },
    {
      "Mã Nhóm (Cột 'Nhóm')": "AROMATIC",
      "Tên Nhóm": "Hương liệu & phụ liệu",
      "Ví dụ": "Trầm hương tự nhiên, Trà Shan tuyết cổ thụ, Mắc khén",
    },
  ];

  const ws2 = XLSX.utils.json_to_sheet(guideRows);
  ws2["!cols"] = [{ wch: 24 }, { wch: 35 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws2, "HuongDan_DanhMuc");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

/** Nhập file Excel (.xlsx) để cập nhật hoặc tạo mới BOM vào SQLite */
export async function importBomFromExcelBuffer(buffer: Buffer): Promise<{
  success: boolean;
  insertedLines: number;
  updatedIngredients: number;
  errors: string[];
}> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames.includes("CongThuc_BOM") ? "CongThuc_BOM" : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error("Không tìm thấy sheet dữ liệu công thức trong file Excel.");
  }

  const rawRows: any[] = XLSX.utils.sheet_to_json(ws);
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error("Tệp Excel không có dòng dữ liệu nào.");
  }

  const errors: string[] = [];
  let updatedIngredients = 0;
  let insertedLines = 0;

  // Xử lý từng dòng dữ liệu trong transaction
  await db.$transaction(async (tx: any) => {
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNo = i + 2; // Dòng excel tính từ 2 (dòng 1 là header)

      const dishIndex = Number(row["STT Món"] || row["Món"] || row["dishIndex"]);
      const dishName = String(row["Tên Món"] || row["dishName"] || `Món ${dishIndex}`).trim();
      const optionId = String(row["Mã Biến Thể"] || row["optionId"] || "std").trim();
      const optionName = String(row["Tên Biến Thể"] || row["optionName"] || "Chuẩn vị").trim();
      const isDefault = Number(row["Mặc Định (1=Có, 0=Không)"] ?? 1) === 1;

      const rawIngId = String(row["Mã Nguyên Liệu"] || row["ingredientId"] || "").trim();
      const ingName = String(row["Tên Nguyên Liệu"] || row["ingredientName"] || "").trim();
      const group = String(row["Nhóm"] || row["group"] || "SEASONING").trim().toUpperCase();
      const unit = String(row["Đơn Vị"] || row["unit"] || "g").trim().toLowerCase();
      const qtyPerGuest = Number(row["Định Lượng / 1 Khách"] || row["qtyPerGuest"] || 0);
      const prepNote = String(row["Quy Cách / Sơ Chế"] || row["prepNote"] || "").trim();
      const price = Number(row["Đơn Giá Nhập (VND/đơn vị)"] || row["defaultImportPrice"] || 0);

      // Validate
      if (!dishIndex || dishIndex < 1 || dishIndex > 7) {
        errors.push(`Dòng ${lineNo}: 'STT Món' phải là số từ 1 đến 7.`);
        continue;
      }
      if (!ingName) {
        errors.push(`Dòng ${lineNo}: Thiếu 'Tên Nguyên Liệu'.`);
        continue;
      }
      if (qtyPerGuest <= 0) {
        errors.push(`Dòng ${lineNo}: 'Định Lượng / 1 Khách' phải lớn hơn 0.`);
        continue;
      }
      if (unit !== "g" && unit !== "ml") {
        errors.push(`Dòng ${lineNo}: Đơn vị phải là 'g' hoặc 'ml' (nhận '${unit}').`);
        continue;
      }

      const ingId =
        rawIngId ||
        ingName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[đĐ]/g, "d")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      // 1. Upsert Ingredient
      await tx.ingredient.upsert({
        where: { id: ingId },
        update: {
          name: ingName,
          unit,
          group,
          spec: prepNote || undefined,
          defaultImportPrice: price > 0 ? price : undefined,
        },
        create: {
          id: ingId,
          name: ingName,
          unit,
          group,
          spec: prepNote || null,
          defaultImportPrice: price || 0,
        },
      });
      updatedIngredients++;

      // 2. Upsert DishRecipe
      const dishRecord = await tx.dishRecipe.upsert({
        where: { dishIndex },
        update: { dishName },
        create: {
          dishIndex,
          dishName,
          portion: "1 khách",
        },
      });

      // 3. Upsert RecipeVariant
      const variantRecord = await tx.recipeVariant.upsert({
        where: {
          recipeId_optionId: {
            recipeId: dishRecord.id,
            optionId,
          },
        },
        update: {
          optionName,
          isDefault,
        },
        create: {
          recipeId: dishRecord.id,
          optionId,
          optionName,
          isDefault,
        },
      });

      // 4. Upsert RecipeLine
      await tx.recipeLine.upsert({
        where: {
          variantId_ingredientId: {
            variantId: variantRecord.id,
            ingredientId: ingId,
          },
        },
        update: {
          qtyPerGuest,
          unit,
          prepNote: prepNote || null,
        },
        create: {
          variantId: variantRecord.id,
          ingredientId: ingId,
          qtyPerGuest,
          unit,
          prepNote: prepNote || null,
        },
      });
      insertedLines++;
    }
  });

  return {
    success: errors.length === 0,
    insertedLines,
    updatedIngredients,
    errors,
  };
}
