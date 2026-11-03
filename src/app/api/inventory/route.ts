import { NextResponse } from "next/server";
import {
  INGREDIENT_GROUP_ORDER,
  MAX_SCALE_GUESTS,
  type IngredientGroup,
} from "@/lib/tram/recipes";
import { getIngredientPriceOverrides } from "@/lib/tram/food-cost-server";
import { calculateInventoryReport } from "@/lib/tram/inventory";
import {
  adjustInventoryByServings,
  getInventoryStockOverrides,
  resetInventoryStockOverrides,
  saveInventoryStockOverrides,
} from "@/lib/tram/inventory-server";

// FR-29 — API Quản lý tồn kho (tồn theo từng nguyên liệu, tổng giá trị kho cập nhật liên tục)
// GET    /api/inventory           → Báo cáo tồn kho & tổng giá trị kho tức thời
// PUT    /api/inventory           → Cập nhật số lượng tồn theo nguyên liệu
// POST   /api/inventory           → Xuất bếp / nhập bổ sung nhanh theo số suất khách
// DELETE /api/inventory           → Khôi phục tồn kho về định mức chuẩn

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupParam = searchParams.get("group");
  const qParam = searchParams.get("q")?.trim().toLowerCase() ?? "";

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
    const report = calculateInventoryReport(stockStored.stock, priceStored.prices);

    const filteredItems = report.items.filter((item) => {
      if (groupParam && item.group !== groupParam) return false;
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
      fullReplace?: boolean;
    };

    if (!body || !body.stock || typeof body.stock !== "object" || Array.isArray(body.stock)) {
      return NextResponse.json(
        { error: "Dữ liệu tồn kho gửi lên không hợp lệ." },
        { status: 400 },
      );
    }

    const stockStored = saveInventoryStockOverrides(body.stock, Boolean(body.fullReplace));
    const priceStored = getIngredientPriceOverrides();
    const report = calculateInventoryReport(stockStored.stock, priceStored.prices);

    return NextResponse.json({
      ...report,
      stockOverrides: stockStored.stock,
      priceOverrides: priceStored.prices,
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
      action?: "deduct_guests" | "restock_guests";
      guests?: number;
    };

    if (
      !body ||
      (body.action !== "deduct_guests" && body.action !== "restock_guests")
    ) {
      return NextResponse.json(
        { error: "Thao tác kho không hợp lệ." },
        { status: 400 },
      );
    }

    const guests = Number(body.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > MAX_SCALE_GUESTS) {
      return NextResponse.json(
        { error: `Số suất phải là số nguyên từ 1 đến ${MAX_SCALE_GUESTS}.` },
        { status: 400 },
      );
    }

    const direction = body.action === "deduct_guests" ? "OUT" : "IN";
    const stockStored = adjustInventoryByServings(guests, direction);
    const priceStored = getIngredientPriceOverrides();
    const report = calculateInventoryReport(stockStored.stock, priceStored.prices);

    return NextResponse.json({
      ...report,
      stockOverrides: stockStored.stock,
      priceOverrides: priceStored.prices,
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
    const report = calculateInventoryReport(stockStored.stock, priceStored.prices);

    return NextResponse.json({
      ...report,
      stockOverrides: stockStored.stock,
      priceOverrides: priceStored.prices,
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

