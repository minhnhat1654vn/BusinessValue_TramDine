import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MAX_SCALE_GUESTS } from "@/lib/tram/recipes";
import { RESTAURANT } from "@/lib/tram/constants";
import { getIngredientPriceOverrides } from "@/lib/tram/food-cost-server";
import { getInventoryStockOverrides } from "@/lib/tram/inventory-server";
import { calculateShiftPurchaseReport } from "@/lib/tram/purchase";
import { addDays, parseISODate } from "@/lib/tram/format";

// FR-32 — API Danh sách mua trước ca cho bếp trưởng
// GET /api/inventory/purchase-list?date=YYYY-MM-DD&slot=SLOT_1730|SLOT_1945|ALL&guests=1..84
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const slotParam = searchParams.get("slot") ?? "SLOT_1730";
    const guestsRaw = searchParams.get("guests");

    let guests: number;

    if (guestsRaw !== null) {
      const parsed = Number(guestsRaw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_SCALE_GUESTS) {
        return NextResponse.json(
          { error: `Số khách phải là số nguyên từ 1 đến ${MAX_SCALE_GUESTS}.` },
          { status: 400 },
        );
      }
      guests = parsed;
    } else {
      // Tự động tính số khách từ danh sách đặt bàn thực tế của ca
      const dayStart = parseISODate(dateParam);
      const nextDay = parseISODate(addDays(dateParam, 1));

      const whereClause: {
        date: { gte: Date; lt: Date };
        status: { not: string };
        slot?: string;
      } = {
        date: { gte: dayStart, lt: nextDay },
        status: { not: "CANCELLED" },
      };

      if (slotParam === "SLOT_1730" || slotParam === "SLOT_1945") {
        whereClause.slot = slotParam;
      }

      const reservations = await db.reservation.findMany({
        where: whereClause,
        select: { partySize: true },
      });

      const actualGuests = reservations.reduce((sum, r) => sum + r.partySize, 0);
      // Nếu ca chưa có khách đặt thì mặc định kiểm tra định mức cho 1 ca đầy (40 khách)
      guests = actualGuests > 0 ? actualGuests : RESTAURANT.totalSeats;
    }

    const stockStored = getInventoryStockOverrides();
    const priceStored = getIngredientPriceOverrides();

    const report = calculateShiftPurchaseReport(guests, {
      date: dateParam,
      slot: slotParam,
      stockOverrides: stockStored.stock,
      priceOverrides: priceStored.prices,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("GET /api/inventory/purchase-list error:", error);
    return NextResponse.json(
      { error: "Không tải được danh sách mua trước ca." },
      { status: 500 },
    );
  }
}
