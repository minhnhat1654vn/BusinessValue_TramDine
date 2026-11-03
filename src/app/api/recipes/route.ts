import { NextResponse } from "next/server";
import {
  DISH_RECIPES,
  INGREDIENT_GROUP_LABELS,
  MAX_SCALE_GUESTS,
  aggregateMenu,
  getDefaultOptionId,
  getMenuItem,
  resolveLines,
  sumByUnit,
} from "@/lib/tram/recipes";

// FR-27 — Bảng định lượng công thức (BOM) theo món, tính cho mỗi khách.
// GET /api/recipes                 → 7 món, định lượng cho 1 khách
// GET /api/recipes?guests=4        → kèm cột tổng quy đổi cho 4 khách
// GET /api/recipes?dish=5          → chỉ món số 5
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const guestsRaw = searchParams.get("guests");
  const guests = guestsRaw === null ? 1 : Number(guestsRaw);
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_SCALE_GUESTS) {
    return NextResponse.json(
      { error: `Số khách phải là số nguyên từ 1 đến ${MAX_SCALE_GUESTS}.` },
      { status: 400 },
    );
  }

  const dishRaw = searchParams.get("dish");
  const dishFilter = dishRaw === null ? null : Number(dishRaw);
  if (dishFilter !== null && !DISH_RECIPES.some((r) => r.dishIndex === dishFilter)) {
    return NextResponse.json(
      { error: "Không tìm thấy món trong menu tasting (mã món từ 1 đến 7)." },
      { status: 404 },
    );
  }

  try {
    const dishes = DISH_RECIPES.filter((r) => dishFilter === null || r.dishIndex === dishFilter).map(
      (recipe) => {
        const item = getMenuItem(recipe.dishIndex);
        const defaultOptionId = getDefaultOptionId(recipe.dishIndex);
        return {
          index: recipe.dishIndex,
          name: item?.name ?? `Món ${recipe.dishIndex}`,
          region: item?.region ?? "",
          portion: recipe.portion,
          method: recipe.method,
          defaultOptionId,
          variants: recipe.variants.map((variant) => {
            const option = item?.options?.find((o) => o.id === variant.optionId);
            const lines = resolveLines(variant.lines, guests);
            return {
              optionId: variant.optionId,
              optionName: option?.name ?? variant.optionId,
              isDefault: variant.optionId === defaultOptionId,
              note: variant.note ?? null,
              lines,
              totalsPerGuest: sumByUnit(lines.map((l) => ({ unit: l.unit, qty: l.qtyPerGuest }))),
              totalsForGuests: sumByUnit(lines.map((l) => ({ unit: l.unit, qty: l.qtyTotal }))),
            };
          }),
        };
      },
    );

    const ingredients = aggregateMenu(guests).map((a) => ({
      ...a,
      groupLabel: INGREDIENT_GROUP_LABELS[a.group],
    }));

    return NextResponse.json({
      menu: "Hành trình vị Việt — tasting 7 món",
      basis: "Định lượng cho 1 khách, nguyên liệu sống/đã sơ chế, không tính nước lọc",
      guests,
      dishes,
      summary: {
        ingredientCount: ingredients.length,
        totalsPerGuest: sumByUnit(ingredients.map((a) => ({ unit: a.unit, qty: a.qtyPerGuest }))),
        totalsForGuests: sumByUnit(ingredients.map((a) => ({ unit: a.unit, qty: a.qtyTotal }))),
        ingredients,
      },
    });
  } catch (error) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json({ error: "Không tải được bảng định lượng công thức." }, { status: 500 });
  }
}

