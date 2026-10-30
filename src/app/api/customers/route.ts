// GET /api/customers — hồ sơ khách hàng tổng hợp từ các lượt đặt đã đến (SEATED)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reservationTotal, serializeReservation } from "@/lib/tram/server";
import { calculateLoyalty } from "@/lib/tram/loyalty";
import type { CustomerProfileDTO, ReservationDTO } from "@/lib/tram/types";

export async function GET() {
  try {
    const seated = await db.reservation.findMany({
      where: { status: "SEATED" },
      include: { table: true },
      orderBy: { date: "desc" },
    });

    // Gộp theo (tên, SĐT) — mỗi khách một hồ sơ
    const map = new Map<
      string,
      { name: string; phone: string; reservations: ReservationDTO[] }
    >();
    for (const r of seated) {
      const key = `${r.customerName}|${r.phone}`;
      if (!map.has(key)) {
        map.set(key, {
          name: r.customerName,
          phone: r.phone,
          reservations: [],
        });
      }
      map.get(key)!.reservations.push(serializeReservation(r));
    }

    const customers: CustomerProfileDTO[] = Array.from(map.values())
      .map((c) => {
        const visits = c.reservations.length;
        const totalSpend = c.reservations.reduce(
          (sum, r) => sum + reservationTotal(r.partySize, r.pairing),
          0,
        );
        const lastVisit = c.reservations
          .map((r) => r.date)
          .sort()
          .at(-1)!;
        const notes = Array.from(
          new Set(
            c.reservations
              .flatMap((r) => [r.allergy, r.notes])
              .filter((n): n is string => Boolean(n && n.trim())),
          ),
        );
        const loyalty = calculateLoyalty(totalSpend, visits);

        return {
          name: c.name,
          phone: c.phone,
          visits,
          totalSpend,
          lastVisit,
          notes,
          reservations: c.reservations,
          tier: loyalty.tier,
          points: loyalty.points,
          nextTierPoints: loyalty.nextTierPoints,
          nextTierName: loyalty.nextTierName,
          tierProgress: loyalty.tierProgress,
        };
      })
      .sort((a, b) => b.points - a.points);

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("customers error", error);
    return NextResponse.json(
      { error: "Không tải được hồ sơ khách hàng." },
      { status: 500 },
    );
  }
}
