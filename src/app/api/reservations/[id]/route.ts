// PATCH /api/reservations/[id] — cập nhật trạng thái (check-in / no-show / hủy)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reservationTotal, serializeReservation } from "@/lib/tram/server";
import { LOYALTY_TIERS } from "@/lib/tram/loyalty";
import type { LoyaltyTier } from "@/lib/tram/types";

// Helper tính điểm hóa đơn an toàn (FR-20: 1.000 đ = 1 điểm, thưởng 5-8% theo hạng)
function computeBillPoints(billTotal: number, tier: LoyaltyTier = "MEMBER") {
  const basePoints = Math.floor(billTotal / 1000);
  let bonusPercent = 0;
  if (tier === "SILVER") bonusPercent = 5;
  else if (tier === "GOLD") bonusPercent = 6.5;
  else if (tier === "DIAMOND") bonusPercent = 8;
  const bonusPoints = Math.round(basePoints * (bonusPercent / 100));
  return {
    billTotal,
    basePoints,
    bonusPercent,
    bonusPoints,
    totalEarnedPoints: basePoints + bonusPoints,
  };
}

// Helper tính hạng thân thiết
function computeLoyalty(totalSpend: number, visits: number) {
  const points = Math.floor(totalSpend / 1000);
  let tier: LoyaltyTier = "MEMBER";
  let nextTierPoints = 10000;
  let nextTierName = "TRẦM Thanh Nhã (Bạc)";

  if (points >= 50000 || visits >= 8) {
    tier = "DIAMOND";
    nextTierPoints = 50000;
    nextTierName = "Hạng cao nhất";
  } else if (points >= 25000 || visits >= 5) {
    tier = "GOLD";
    nextTierPoints = 50000;
    nextTierName = "TRẦM Tinh Hoa (Kim Cương)";
  } else if (points >= 10000 || visits >= 2) {
    tier = "SILVER";
    nextTierPoints = 25000;
    nextTierName = "TRẦM Hoàng Kim (Vàng)";
  }

  return {
    tier,
    points,
    nextTierPoints,
    nextTierName,
    tierProgress: Math.min(100, Math.round((points / nextTierPoints) * 100)),
  };
}

function getTierName(tier: LoyaltyTier): string {
  if (LOYALTY_TIERS && LOYALTY_TIERS[tier]?.name) {
    return LOYALTY_TIERS[tier].name;
  }
  switch (tier) {
    case "DIAMOND":
      return "TRẦM Tinh Hoa";
    case "GOLD":
      return "TRẦM Hoàng Kim";
    case "SILVER":
      return "TRẦM Thanh Nhã";
    default:
      return "Hạng Khởi Sắc";
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

    let loyaltyInfo = null;

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
