import { NextResponse } from "next/server";
import { MAX_SCALE_GUESTS } from "@/lib/tram/recipes";
import {
  calculateDishCost,
  calculateMenuFoodCost,
  isValidDishIndex,
} from "@/lib/tram/food-cost";
import {
  getIngredientPriceOverrides,
  resetIngredientPriceOverrides,
  saveIngredientPriceOverrides,
} from "@/lib/tram/food-cost-server";

// FR-28 — API Giá vốn nguyên liệu & Đối chiếu giá menu
// GET    /api/food-cost?guests=1..84&dish=1..7 → Báo cáo giá vốn tự tính từ đơn giá nhập kho
// PUT    /api/food-cost                         → Cập nhật đơn giá nhập kho (tự tính lại giá vốn)
// DELETE /api/food-cost                         → Khôi phục bảng đơn giá nhập kho chuẩn

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
  const dishIndex = dishRaw === null ? null : Number(dishRaw);
  if (dishIndex !== null && (!Number.isInteger(dishIndex) || !isValidDishIndex(dishIndex))) {
    return NextResponse.json(
      { error: "Không tìm thấy món trong menu tasting (mã món từ 1 đến 7)." },
      { status: 404 },
    );
  }

  const optionId = searchParams.get("option") ?? undefined;

  try {
    const stored = getIngredientPriceOverrides();
    const report = calculateMenuFoodCost(guests, stored.prices);
    const dishDetail =
      dishIndex !== null
        ? calculateDishCost(dishIndex, optionId, guests, stored.prices)
        : undefined;

    return NextResponse.json({
      ...report,
      overrides: stored.prices,
      updatedAt: stored.updatedAt,
      ...(dishDetail ? { dishDetail } : {}),
    });
  } catch (error) {
    console.error("GET /api/food-cost error:", error);
    return NextResponse.json(
      { error: "Không tải được dữ liệu giá vốn nguyên liệu." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      prices?: Record<string, number>;
      guests?: number;
    };

    if (!body || !body.prices || typeof body.prices !== "object" || Array.isArray(body.prices)) {
      return NextResponse.json(
        { error: "Dữ liệu đơn giá nhập kho gửi lên không hợp lệ." },
        { status: 400 },
      );
    }

    const guests =
      typeof body.guests === "number" &&
      Number.isInteger(body.guests) &&
      body.guests >= 1 &&
      body.guests <= MAX_SCALE_GUESTS
        ? body.guests
        : 1;

    const stored = saveIngredientPriceOverrides(body.prices);
    const report = calculateMenuFoodCost(guests, stored.prices);

    return NextResponse.json({
      ...report,
      overrides: stored.prices,
      updatedAt: stored.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi cập nhật đơn giá nhập kho.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const stored = resetIngredientPriceOverrides();
    const report = calculateMenuFoodCost(1, stored.prices);
    return NextResponse.json({
      ...report,
      overrides: stored.prices,
      updatedAt: stored.updatedAt,
    });
  } catch (error) {
    console.error("DELETE /api/food-cost error:", error);
    return NextResponse.json(
      { error: "Không khôi phục được đơn giá nhập kho mặc định." },
      { status: 500 },
    );
  }
}

