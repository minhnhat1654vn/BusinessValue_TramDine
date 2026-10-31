// GET /api/availability?date=YYYY-MM-DD[&slot=SLOT_1730|SLOT_1945][&partySize=n]
// Trả về chỗ còn trống từng khung + trạng thái 12 bàn (khi có slot)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ACTIVE_STATUSES, serializeReservation } from "@/lib/tram/server";
import { getActiveHold } from "@/lib/tram/hold-manager";
import { isClosedMonday } from "@/lib/tram/format";
import type {
  AvailabilityResponse,
  SlotSummary,
  Slot,
  TableAvailability,
} from "@/lib/tram/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const slot = searchParams.get("slot");
    const partySize = Number(searchParams.get("partySize") ?? "2");
    const sessionId = searchParams.get("sessionId") ?? undefined;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Tham số date không hợp lệ (YYYY-MM-DD)." },
        { status: 400 },
      );
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T00:00:00.001Z`);

    const [tables, dayReservations] = await Promise.all([
      db.table.findMany({ orderBy: { code: "asc" } }),
      db.reservation.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          status: { in: [...ACTIVE_STATUSES] },
        },
        include: { table: true },
      }),
    ]);

    // Tóm tắt chỗ còn trống của từng khung
    const slots: SlotSummary[] = (["SLOT_1730", "SLOT_1945"] as Slot[]).map(
      (s) => {
        const bookedSeats = dayReservations
          .filter((r) => r.slot === s)
          .reduce((sum, r) => sum + r.partySize, 0);
        const capacity = tables.reduce((sum, t) => sum + t.seats, 0);
        return {
          slot: s,
          capacity,
          bookedSeats,
          remainingSeats: Math.max(0, capacity - bookedSeats),
        };
      },
    );

    let tableAvailability: TableAvailability[] | null = null;
    if (slot === "SLOT_1730" || slot === "SLOT_1945") {
      const slotReservations = dayReservations.filter((r) => r.slot === slot);
      tableAvailability = tables.map((t) => {
        const booked = slotReservations.find((r) => r.tableId === t.id);
        if (booked) {
          return {
            table: t,
            available: false,
            reason: "BOOKED" as const,
            reservation: serializeReservation(booked),
          };
        }
        // Kiểm tra bàn có đang bị người khác giữ chỗ (trong vòng 10 phút) hay không
        const holdInfo = getActiveHold(date, slot, t.id, sessionId);
        if (holdInfo.isHeldByOther) {
          return {
            table: t,
            available: false,
            reason: "HELD" as const,
            reservation: null,
            holdRemainingSeconds: Math.ceil(holdInfo.remainingMs / 1000),
          };
        }

        if (t.seats < partySize) {
          return {
            table: t,
            available: false,
            reason: "TOO_SMALL" as const,
            reservation: null,
          };
        }
        return { table: t, available: true, reason: null, reservation: null };
      });
    }

    const response: AvailabilityResponse & { closed: boolean } = {
      date,
      closed: isClosedMonday(date),
      slots,
      tables: tableAvailability,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("availability error", error);
    return NextResponse.json(
      { error: "Không tải được dữ liệu chỗ trống." },
      { status: 500 },
    );
  }
}
