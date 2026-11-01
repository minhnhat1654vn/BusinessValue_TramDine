// GET /api/admin/stats?today=YYYY-MM-DD — số liệu dashboard quản trị
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ACTIVE_STATUSES,
  reservationTotal,
  serializeWaitlist,
} from "@/lib/tram/server";
import {
  addDays,
  formatShortDate,
  parseISODate,
  toISODate,
  weekdayOf,
} from "@/lib/tram/format";
import type {
  AdminStats,
  OccupancyPoint,
  SourceShare,
} from "@/lib/tram/types";

const SEATS_PER_SLOT = 42; // 5×2 + 5×4 + 2×6

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const todayParam = searchParams.get("today");
    const today =
      todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
        ? todayParam
        : toISODate(new Date());

    const windowStart = addDays(today, -14); // 2 tuần quá khứ
    const windowEnd = addDays(today, 14); // 2 tuần tương lai
    const chartStart = addDays(today, -13); // 14 ngày gần nhất

    const start = parseISODate(windowStart);
    const end = parseISODate(windowEnd);

    const [windowReservations, waitlistAll] = await Promise.all([
      db.reservation.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        include: { table: true },
      }),
      db.waitlistEntry.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: [{ date: "asc" }, { slot: "asc" }, { position: "asc" }],
      }),
    ]);

    // --- KPI 1: Lượt đặt trong 4 tuần ---
    const totalReservations = windowReservations.length;

    // --- KPI 2: Tỷ lệ lấp chỗ trung bình (các khung giờ có khách) ---
    const activePerSlot = new Map<string, number>(); // key: date|slot → số chỗ đặt
    for (const r of windowReservations) {
      if (r.status === "CANCELLED") continue;
      const key = `${toISODate(r.date)}|${r.slot}`;
      activePerSlot.set(key, (activePerSlot.get(key) ?? 0) + r.partySize);
    }
    let fillSum = 0;
    let activeSlots = 0;
    for (const seats of activePerSlot.values()) {
      fillSum += Math.min(1, seats / SEATS_PER_SLOT);
      activeSlots += 1;
    }
    const occupancyRate =
      activeSlots > 0 ? (fillSum / activeSlots) * 100 : 0;

    // --- KPI 3: Tỷ lệ no-show (quá khứ) ---
    const past = windowReservations.filter(
      (r) => toISODate(r.date) < today && r.status !== "CANCELLED",
    );
    const seatedCount = past.filter((r) => r.status === "SEATED").length;
    const noShowCount = past.filter((r) => r.status === "NO_SHOW").length;
    const noShowRate =
      seatedCount + noShowCount > 0
        ? (noShowCount / (seatedCount + noShowCount)) * 100
        : 0;

    // --- KPI 4: Doanh thu dự thu (đặt bàn tương lai còn hiệu lực) ---
    const expectedRevenue = windowReservations
      .filter(
        (r) =>
          toISODate(r.date) >= today &&
          (r.status === "CONFIRMED" || r.status === "PENDING"),
      )
      .reduce((sum, r) => sum + reservationTotal(r.partySize, r.pairing), 0);

    // --- Biểu đồ occupancy 14 ngày gần nhất (FR-14: ghép hai khung 17:30 và 19:45) ---
    const byDaySlot = new Map<string, number>();
    for (const r of windowReservations) {
      if (r.status === "CANCELLED") continue;
      const key = `${toISODate(r.date)}|${r.slot}`;
      byDaySlot.set(key, (byDaySlot.get(key) ?? 0) + r.partySize);
    }
    const occupancy: OccupancyPoint[] = [];
    for (let i = 0; i < 14; i++) {
      const dateISO = addDays(chartStart, i);
      const wd = weekdayOf(dateISO);
      if (wd === 1) {
        occupancy.push({
          date: dateISO,
          label: formatShortDate(dateISO),
          weekday: wd,
          occupied: 0,
          capacity: 0,
          percent: 0,
          slot1730Occupied: 0,
          slot1730Percent: 0,
          slot1945Occupied: 0,
          slot1945Percent: 0,
        });
        continue;
      }
      const occ1730 = byDaySlot.get(`${dateISO}|SLOT_1730`) ?? 0;
      const occ1945 = byDaySlot.get(`${dateISO}|SLOT_1945`) ?? 0;
      const occupied = occ1730 + occ1945;
      const capacity = SEATS_PER_SLOT * 2;
      const slot1730Percent = Math.min(100, Math.round((occ1730 / SEATS_PER_SLOT) * 100));
      const slot1945Percent = Math.min(100, Math.round((occ1945 / SEATS_PER_SLOT) * 100));
      occupancy.push({
        date: dateISO,
        label: formatShortDate(dateISO),
        weekday: wd,
        occupied,
        capacity,
        percent: Math.min(100, (occupied / capacity) * 100),
        slot1730Occupied: occ1730,
        slot1730Percent,
        slot1945Occupied: occ1945,
        slot1945Percent,
      });
    }

    // --- Nguồn đặt bàn ---
    const sources: { key: string; label: string }[] = [
      { key: "WEB", label: "Web" },
      { key: "PHONE", label: "Điện thoại" },
      { key: "ZALO", label: "Zalo" },
    ];
    const sourceTotal = windowReservations.length || 1;
    const sourceShares: SourceShare[] = sources.map((s) => {
      const count = windowReservations.filter((r) => r.source === s.key).length;
      return {
        source: s.key as SourceShare["source"],
        label: s.label,
        count,
        percent: (count / sourceTotal) * 100,
      };
    });

    // --- Waitlist hôm nay & cuối tuần ---
    const todayStart = parseISODate(today);
    const waitlistToday = waitlistAll
      .filter((w) => w.date.getTime() === todayStart.getTime())
      .map(serializeWaitlist);

    // cuối tuần gần nhất trong tương lai (T7 + CN)
    const todayWd = weekdayOf(today);
    let saturday = todayWd === 6 ? today : addDays(today, (6 - todayWd + 7) % 7);
    if (todayWd === 6) saturday = today; // hôm nay là thứ Bảy
    const sunday = addDays(saturday, 1);
    const weekendStart = parseISODate(saturday);
    const weekendEnd = parseISODate(addDays(sunday, 1));
    const waitlistWeekend = waitlistAll
      .filter(
        (w) => w.date.getTime() >= weekendStart.getTime() && w.date.getTime() < weekendEnd.getTime(),
      )
      .map(serializeWaitlist);

    const stats: AdminStats = {
      totalReservations,
      occupancyRate,
      noShowRate,
      expectedRevenue,
      occupancy,
      sourceShares,
      waitlistToday,
      waitlistWeekend,
      windowLabel: `4 tuần quanh hôm nay (${windowStart} → ${windowEnd})`,
    };
    return NextResponse.json(stats);
  } catch (error) {
    console.error("admin stats error", error);
    return NextResponse.json(
      { error: "Không tải được số liệu dashboard." },
      { status: 500 },
    );
  }
}
