// PATCH /api/reservations/[id] — cập nhật trạng thái (check-in / no-show / hủy)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reservationTotal, serializeReservation } from "@/lib/tram/server";
import { LOYALTY_TIERS } from "@/lib/tram/loyalty";
import type { LoyaltyTier } from "@/lib/tram/types";

// Helper tính điểm hóa đơn an toàn (FR-20 & FR-21: 1.000 đ = 1 điểm, thưởng 5% và 8%)
function computeBillPoints(billTotal: number, tier: LoyaltyTier = "HUONG") {
  const basePoints = Math.floor(billTotal / 1000);
  let bonusPercent = 0;
  if (tier === "TRAM") bonusPercent = 5;
  else if (tier === "NAM_TRAM") bonusPercent = 8;
  const bonusPoints = Math.round(basePoints * (bonusPercent / 100));
  return {
    billTotal,
    basePoints,
    bonusPercent,
    bonusPoints,
    totalEarnedPoints: basePoints + bonusPoints,
  };
}

// Helper tính hạng thân thiết theo 3 hạng (FR-21: Hương 0-2, Trầm 3-5, Nam Trầm 6+)
function computeLoyalty(totalSpend: number, visits: number) {
  const points = Math.floor(totalSpend / 1000);
  let tier: LoyaltyTier = "HUONG";
  let nextTierVisits = 3;
  let nextTierName = "Hạng Trầm";
  let tierProgress = 0;

  if (visits >= 6) {
    tier = "NAM_TRAM";
    nextTierVisits = 6;
    nextTierName = "Hạng tối cao";
    tierProgress = 100;
  } else if (visits >= 3) {
    tier = "TRAM";
    nextTierVisits = 6;
    nextTierName = "Hạng Nam Trầm";
    tierProgress = Math.min(100, Math.round(((visits - 3) / 3) * 100));
  } else {
    tier = "HUONG";
    nextTierVisits = 3;
    nextTierName = "Hạng Trầm";
    tierProgress = Math.min(100, Math.round((visits / 3) * 100));
  }

  return {
    tier,
    points,
    visits,
    nextTierVisits,
    nextTierName,
    tierProgress: Math.max(tierProgress, 5),
  };
}

function getTierName(tier: LoyaltyTier): string {
  if (LOYALTY_TIERS && LOYALTY_TIERS[tier]?.name) {
    return LOYALTY_TIERS[tier].name;
  }
  switch (tier) {
    case "NAM_TRAM":
      return "Hạng Nam Trầm";
    case "TRAM":
      return "Hạng Trầm";
    default:
      return "Hạng Hương";
  }
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  checkin: ["CONFIRMED", "PENDING"],
  noshow: ["CONFIRMED", "PENDING"],
  cancel: ["PENDING", "CONFIRMED"],
};

const NEXT_STATUS: Record<string, string> = {
  checkin: "SEATED",
  noshow: "NO_SHOW",
  cancel: "CANCELLED",
};

const ACTION_LABELS: Record<string, string> = {
  checkin: "Check-in",
  noshow: "Đánh dấu không đến",
  cancel: "Hủy đặt bàn",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: string };
    const action = body.action ?? "";

    if (!ALLOWED_TRANSITIONS[action]) {
      return NextResponse.json(
        { error: "Hành động không hợp lệ (checkin | noshow | cancel)." },
        { status: 400 },
      );
    }

    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { table: true },
    });
    if (!reservation) {
      return NextResponse.json(
        { error: "Không tìm thấy lượt đặt bàn." },
        { status: 404 },
      );
    }

    if (!ALLOWED_TRANSITIONS[action].includes(reservation.status)) {
      return NextResponse.json(
        {
          error: `Không thể thực hiện — đặt bàn đang ở trạng thái ${reservation.status}.`,
        },
        { status: 409 },
      );
    }

    let loyaltyInfo: Record<string, unknown> | null = null;

    // FR-20: Tích điểm theo hóa đơn khi đánh dấu "Đã đến" (checkin -> SEATED)
    if (action === "checkin") {
      const billTotal = reservationTotal(
        reservation.partySize,
        reservation.pairing,
      );

      // Tìm các lần đã dùng bữa trước đó của khách để xác định hạng hiện tại
      const prevVisits = await db.reservation.findMany({
        where: {
          customerName: reservation.customerName,
          phone: reservation.phone,
          status: "SEATED",
        },
      });

      const prevSpend = prevVisits.reduce(
        (sum, r) => sum + reservationTotal(r.partySize, r.pairing),
        0,
      );
      const prevLoyalty = computeLoyalty(prevSpend, prevVisits.length);

      // Tính điểm theo hóa đơn với thưởng 5-8% theo hạng (FR-20)
      const pointsReward = computeBillPoints(
        billTotal,
        prevLoyalty.tier,
      );

      // Tính trạng thái mới sau khi cộng bữa này
      const newSpend = prevSpend + billTotal;
      const newLoyalty = computeLoyalty(newSpend, prevVisits.length + 1);
      const isUpgraded = newLoyalty.tier !== prevLoyalty.tier;

      loyaltyInfo = {
        customerName: reservation.customerName,
        phone: reservation.phone,
        billTotal,
        basePoints: pointsReward.basePoints,
        bonusPercent: pointsReward.bonusPercent,
        bonusPoints: pointsReward.bonusPoints,
        totalEarnedPoints: pointsReward.totalEarnedPoints,
        currentTier: prevLoyalty.tier,
        currentTierName: getTierName(prevLoyalty.tier),
        newTier: newLoyalty.tier,
        newTierName: getTierName(newLoyalty.tier),
        isUpgraded,
        newTotalPoints: newLoyalty.points,
      };
    }

    const updated = await db.reservation.update({
      where: { id },
      data: { status: NEXT_STATUS[action] },
      include: { table: true },
    });

    return NextResponse.json({
      reservation: serializeReservation(updated),
      loyalty: loyaltyInfo,
      message: `${ACTION_LABELS[action]} thành công cho đặt bàn ${reservation.code}.`,
    });
  } catch (error) {
    console.error("PATCH reservation error", error);
    return NextResponse.json(
      { error: "Không cập nhật được trạng thái." },
      { status: 500 },
    );
  }
}
