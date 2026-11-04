import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toISODate } from "@/lib/tram/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Current simulated date anchored to 2026-11-05
    const today = new Date("2026-11-05T00:00:00.000Z");
    const todayTs = today.getTime();
    
    // Fetch reservations from today onwards up to 14 days
    const reservations = await db.reservation.findMany({
      where: {
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        code: true,
        date: true,
        slot: true,
        partySize: true,
        customerName: true,
        status: true,
        table: {
          select: {
            code: true,
            seats: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    // Group reservations by date
    const dateMap = new Map<string, { tableCount: number; guestCount: number; reservations: any[] }>();

    for (const r of reservations) {
      const dt = new Date(r.date);
      const iso = toISODate(dt);
      
      // Only include from 2026-11-05 onwards
      if (iso < "2026-11-05") continue;

      const curr = dateMap.get(iso) ?? { tableCount: 0, guestCount: 0, reservations: [] };
      curr.tableCount += 1;
      curr.guestCount += r.partySize;
      curr.reservations.push(r);
      dateMap.set(iso, curr);
    }

    // Build next 14 consecutive days
    const days: Array<{
      date: string;
      dayIndex: number;
      dayLabel: string;
      tableCount: number;
      guestCount: number;
    }> = [];

    const DAY_NAMES = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

    for (let i = 0; i < 14; i++) {
      const targetDate = new Date(today);
      targetDate.setUTCDate(today.getUTCDate() + i);
      const iso = toISODate(targetDate);
      const dayOfWeek = DAY_NAMES[targetDate.getUTCDay()];
      const dayMonth = `${String(targetDate.getUTCDate()).padStart(2, "0")}/${String(targetDate.getUTCMonth() + 1).padStart(2, "0")}`;

      let label = `${dayOfWeek} (${dayMonth})`;
      if (i === 0) label = `Hôm nay (${dayMonth})`;
      else if (i === 1) label = `Ngày mai (${dayMonth})`;

      const entry = dateMap.get(iso) ?? { tableCount: 0, guestCount: 0, reservations: [] };

      days.push({
        date: iso,
        dayIndex: i + 1,
        dayLabel: label,
        tableCount: entry.tableCount,
        guestCount: entry.guestCount,
      });
    }

    return NextResponse.json({
      todayStr: "2026-11-05",
      days,
    });
  } catch (error) {
    console.error("GET /api/inventory/demand-forecast error:", error);
    return NextResponse.json(
      { error: "Không tải được dự báo nhu cầu đặt bàn." },
      { status: 500 }
    );
  }
}
