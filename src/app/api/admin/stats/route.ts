// GET /api/admin/stats?today=YYYY-MM-DD — số liệu dashboard quản trị
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ACTIVE_STATUSES,
  reservationTotal,
  serializeReservation,
  serializeWaitlist,
} from "@/lib/tram/server";
import {
  addDays,
  formatShortDate,
  parseISODate,
  toISODate,
  weekdayOf,
} from "@/lib/tram/format";
import { PRICES } from "@/lib/tram/constants";
import { getFoodCostKpiSummary } from "@/lib/tram/food-cost";
import { getIngredientPriceOverrides } from "@/lib/tram/food-cost-server";
import type {
  AdminStats,
  OccupancyPoint,
  SourceShare,
} from "@/lib/tram/types";

const SEATS_PER_SLOT = 42; // 5×2 + 5×4 + 2×6

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const chartStart = addDays(today, -14); // 28 ngày (4 tuần quanh hôm nay)

    const start = parseISODate(windowStart);
    const end = parseISODate(windowEnd);
    const todayStart = parseISODate(today);

    const [windowReservations, waitlistAll, recentRaw, todayRaw, surveysRaw] = await Promise.all([
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
      // Top 5 đặt bàn mới nhất (tạo gần đây nhất)
      db.reservation.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { table: true },
      }),
      // Top 5 đặt bàn hôm nay
      db.reservation.findMany({
        where: { date: todayStart },
        take: 5,
        orderBy: [{ slot: "asc" }, { table: { code: "asc" } }, { createdAt: "desc" }],
        include: { table: true },
      }),
      // Top 5 đánh giá thực khách mới nhất
      db.survey.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          reservation: {
            select: {
              code: true,
              customerName: true,
              phone: true,
              date: true,
            },
          },
        },
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
    const futureReservations = windowReservations.filter(
      (r) =>
        toISODate(r.date) >= today &&
        (r.status === "CONFIRMED" || r.status === "PENDING"),
    );
    const expectedRevenue = futureReservations.reduce(
      (sum, r) => sum + reservationTotal(r.partySize, r.pairing),
      0,
    );
    const futureGuests = futureReservations.reduce((sum, r) => sum + r.partySize, 0);
    const expectedMenuRevenue = futureGuests * PRICES.menu;
    const expectedPairingRevenue = Math.max(0, expectedRevenue - expectedMenuRevenue);

    // FR-33: Tính KPI Food Cost đối chiếu doanh thu menu dự thu
    const priceStored = getIngredientPriceOverrides();
    const foodCostKpi = getFoodCostKpiSummary(priceStored.prices, {
      futureGuests,
      expectedPairingRevenue,
    });

    // --- Biểu đồ occupancy 14 ngày gần nhất (FR-14: ghép hai khung 17:30 và 19:45) ---
    const byDaySlot = new Map<string, number>();
    const byDayRevenue = new Map<string, number>();
    for (const r of windowReservations) {
      if (r.status === "CANCELLED") continue;
      const dateKey = toISODate(r.date);
      const key = `${dateKey}|${r.slot}`;
      byDaySlot.set(key, (byDaySlot.get(key) ?? 0) + r.partySize);
      const total = reservationTotal(r.partySize, r.pairing);
      byDayRevenue.set(dateKey, (byDayRevenue.get(dateKey) ?? 0) + total);
    }
    const occupancy: OccupancyPoint[] = [];
    for (let i = 0; i < 28; i++) {
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
          isToday: dateISO === today,
          revenue: 0,
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
        isToday: dateISO === today,
        revenue: byDayRevenue.get(dateISO) ?? 0,
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

    // --- Waitlist hôm nay & cuối tuần (giữ lại hỗ trợ) ---
    const waitlistToday = waitlistAll
      .filter((w) => w.date.getTime() === todayStart.getTime())
      .map(serializeWaitlist);

    const todayWd = weekdayOf(today);
    let saturday = todayWd === 6 ? today : addDays(today, (6 - todayWd + 7) % 7);
    if (todayWd === 6) saturday = today;
    const sunday = addDays(saturday, 1);
    const weekendStart = parseISODate(saturday);
    const weekendEnd = parseISODate(addDays(sunday, 1));
    const waitlistWeekend = waitlistAll
      .filter(
        (w) => w.date.getTime() >= weekendStart.getTime() && w.date.getTime() < weekendEnd.getTime(),
      )
      .map(serializeWaitlist);

    // Serialize Top 5 mới
    const recentReservations = recentRaw.map(serializeReservation);
    const todayReservations = todayRaw.map(serializeReservation);
    const topSurveys = surveysRaw.map((s) => ({
      id: s.id,
      reservationId: s.reservationId,
      rating: s.rating,
      foodRating: s.foodRating,
      serviceRating: s.serviceRating,
      ambianceRating: s.ambianceRating,
      pairingRating: s.pairingRating,
      comment: s.comment,
      recommend: s.recommend,
      bonusPointsGiven: s.bonusPointsGiven,
      createdAt: s.createdAt.toISOString(),
      reservationCode: s.reservation.code,
      customerName: s.reservation.customerName,
      phone: s.reservation.phone,
      date: toISODate(s.reservation.date),
    }));

    const totalRevenue4Weeks = occupancy.reduce((sum, p) => sum + p.revenue, 0);

    const stats: AdminStats = {
      totalRevenue4Weeks,
      totalReservations,
      occupancyRate,
      noShowRate,
      expectedRevenue,
      expectedMenuRevenue,
      expectedPairingRevenue,
      futureGuests,
      foodCostKpi,
      occupancy,
      sourceShares,
      waitlistToday,
      waitlistWeekend,
      recentReservations,
      todayReservations,
      topSurveys,
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
