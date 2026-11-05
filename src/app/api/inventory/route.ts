import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  INGREDIENT_GROUP_ORDER,
  MAX_SCALE_GUESTS,
  type IngredientGroup,
} from "@/lib/tram/recipes";
import { getIngredientPriceOverrides } from "@/lib/tram/food-cost-server";
import { calculateInventoryReport } from "@/lib/tram/inventory";
import {
  adjustInventoryByDish,
  adjustInventoryByServings,
  getInventoryStockOverrides,
  resetInventoryStockOverrides,
  saveInventoryReorderOverrides,
  saveInventoryStockOverrides,
  type StoredInventoryData,
} from "@/lib/tram/inventory-server";

// FR-29 & FR-30 — API Quản lý tồn kho & Ngưỡng đặt hàng lại
// GET    /api/inventory           → Báo cáo tồn kho, ngưỡng đặt lại & tổng giá trị kho tức thời
// PUT    /api/inventory           → Cập nhật số lượng tồn / mức đặt lại theo nguyên liệu
// POST   /api/inventory           → Xuất bếp / nhập bổ sung nhanh theo số suất khách
// DELETE /api/inventory           → Khôi phục tồn kho & mức đặt lại về chuẩn

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupParam = searchParams.get("group");
  const qParam = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const filterParam = searchParams.get("filter"); // "ALL" | "STANDARD" | "LOW" | "OUT" | "NEEDS_REORDER"

  if (
    groupParam !== null &&
    !INGREDIENT_GROUP_ORDER.includes(groupParam as IngredientGroup)
  ) {
    return NextResponse.json(
      { error: `Nhóm nguyên liệu không hợp lệ: "${groupParam}".` },
      { status: 400 },
    );
  }

  try {
    const stockStored = getInventoryStockOverrides();
    const priceStored = getIngredientPriceOverrides();
    const extraIngredients = await db.ingredient.findMany({ orderBy: { name: "asc" } });
    const report = calculateInventoryReport(
      stockStored.stock,
      priceStored.prices,
      stockStored.reorderPoints,
      extraIngredients,
    );

    const filteredItems = report.items.filter((item) => {
      if (groupParam && item.group !== groupParam) return false;
      if (filterParam === "STANDARD" && !item.isStandardIngredient) return false;
      if (filterParam === "OUT" && item.stockQty > 0) return false;
      if (filterParam === "LOW" && item.status !== "LOW") return false;
      if (filterParam === "NEEDS_REORDER" && !item.needsReorder) return false;
      if (qParam) {
        const hitName = item.name.toLowerCase().includes(qParam);
        const hitOrigin = item.origin?.toLowerCase().includes(qParam) ?? false;
        const hitZone = item.storageZone.toLowerCase().includes(qParam);
        if (!hitName && !hitOrigin && !hitZone) return false;
      }
      return true;
    });

    return NextResponse.json({
      ...report,
      items: filteredItems,
      stockOverrides: stockStored.stock,
      priceOverrides: priceStored.prices,
      reorderOverrides: stockStored.reorderPoints,
      extraIngredients,
      updatedAt: stockStored.updatedAt,
    });
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json(
      { error: "Không tải được dữ liệu tồn kho." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      stock?: Record<string, number>;
      reorderPoints?: Record<string, number>;
      fullReplace?: boolean;
    };

    if (
      !body ||
      ((!body.stock || typeof body.stock !== "object" || Array.isArray(body.stock)) &&
        (!body.reorderPoints || typeof body.reorderPoints !== "object" || Array.isArray(body.reorderPoints)))
    ) {
      return NextResponse.json(
        { error: "Dữ liệu tồn kho hoặc mức đặt lại gửi lên không hợp lệ." },
        { status: 400 },
      );
    }

    let stockStored = getInventoryStockOverrides();
    if (body.stock && typeof body.stock === "object") {
      stockStored = saveInventoryStockOverrides(body.stock, Boolean(body.fullReplace));
      // Đồng bộ tồn kho tức thì vào CSDL SQLite
      try {
        await Promise.all(
          Object.entries(body.stock).map(([id, qty]) =>
            db.ingredient.updateMany({
              where: { id },
              data: { currentStock: Number(qty) },
            })
          )
        );
      } catch (e) {
        console.warn("Lỗi đồng bộ tồn kho vào CSDL:", e);
      }
    }
    if (body.reorderPoints && typeof body.reorderPoints === "object") {
      stockStored = saveInventoryReorderOverrides(body.reorderPoints, Boolean(body.fullReplace));
      // Đồng bộ mức đặt lại tức thì vào CSDL SQLite
      try {
        await Promise.all(
          Object.entries(body.reorderPoints).map(([id, rPoint]) =>
            db.ingredient.updateMany({
              where: { id },
              data: { minStock: Number(rPoint) },
            })
          )
        );
      } catch (e) {
        console.warn("Lỗi đồng bộ mức đặt lại vào CSDL:", e);
      }
    }

    const priceStored = getIngredientPriceOverrides();
    const extraIngredients = await db.ingredient.findMany({ orderBy: { name: "asc" } });
    const report = calculateInventoryReport(
      stockStored.stock,
      priceStored.prices,
      stockStored.reorderPoints,
      extraIngredients,
    );

    return NextResponse.json({
      ...report,
      stockOverrides: stockStored.stock,
      priceOverrides: priceStored.prices,
      reorderOverrides: stockStored.reorderPoints,
      extraIngredients,
      updatedAt: stockStored.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi cập nhật tồn kho.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "deduct_guests" | "restock_guests" | "deduct_dish";
      type?: "DISH" | "SERVINGS";
      dishIndex?: number;
      portions?: number;
      optionId?: string;
      guests?: number;
      direction?: "OUT" | "IN";
    };

    let stockStored: StoredInventoryData;
    let movementSummary: unknown = null;

    if (body.action === "deduct_dish" || body.type === "DISH") {
      const dishIndex = Number(body.dishIndex);
      const portions = Number(body.portions ?? 1);
      if (!Number.isInteger(dishIndex) || dishIndex < 1 || dishIndex > 7) {
        return NextResponse.json(
          { error: "Số thứ tự món ăn không hợp lệ (từ 1 đến 7)." },
          { status: 400 },
        );
      }
      if (!Number.isInteger(portions) || portions < 1 || portions > MAX_SCALE_GUESTS) {
        return NextResponse.json(
          { error: `Số suất xuất món phải từ 1 đến ${MAX_SCALE_GUESTS}.` },
          { status: 400 },
        );
      }
      const result = adjustInventoryByDish(dishIndex, portions, body.optionId);
      stockStored = result.data;
      movementSummary = result.movement;
    } else if (
      body.action === "deduct_guests" ||
      body.action === "restock_guests" ||
      body.type === "SERVINGS"
    ) {
      const guests = Number(body.guests ?? 1);
      if (!Number.isInteger(guests) || guests < 1 || guests > MAX_SCALE_GUESTS) {
        return NextResponse.json(
          { error: `Số suất phải là số nguyên từ 1 đến ${MAX_SCALE_GUESTS}.` },
          { status: 400 },
        );
      }
      const direction =
        body.action === "restock_guests" || body.direction === "IN" ? "IN" : "OUT";
      stockStored = adjustInventoryByServings(guests, direction);
      movementSummary = { type: "SERVINGS", guests, direction };
    } else {
      return NextResponse.json(
        { error: "Thao tác xuất kho không hợp lệ." },
        { status: 400 },
      );
    }

    const priceStored = getIngredientPriceOverrides();
    const extraIngredients = await db.ingredient.findMany({ orderBy: { name: "asc" } });
    const report = calculateInventoryReport(
      stockStored.stock,
      priceStored.prices,
      stockStored.reorderPoints,
      extraIngredients,
    );

    return NextResponse.json({
      ...report,
      extraIngredients,
      movementSummary,
      stockOverrides: stockStored.stock,
      priceOverrides: priceStored.prices,
      reorderOverrides: stockStored.reorderPoints,
      updatedAt: stockStored.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi điều chỉnh tồn kho.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const stockStored = resetInventoryStockOverrides();
    const priceStored = getIngredientPriceOverrides();
    const extraIngredients = await db.ingredient.findMany({ orderBy: { name: "asc" } });
    const report = calculateInventoryReport(
      stockStored.stock,
      priceStored.prices,
      stockStored.reorderPoints,
      extraIngredients,
    );

    return NextResponse.json({
      ...report,
      stockOverrides: stockStored.stock,
      priceOverrides: priceStored.prices,
      reorderOverrides: stockStored.reorderPoints,
      updatedAt: stockStored.updatedAt,
    });
  } catch (error) {
    console.error("DELETE /api/inventory error:", error);
    return NextResponse.json(
      { error: "Không khôi phục được tồn kho chuẩn." },
      { status: 500 },
    );
  }
}

