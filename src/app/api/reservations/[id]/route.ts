// PATCH & DELETE /api/reservations/[id] — Cập nhật thông tin, trạng thái, check-in, no-show, hoặc xóa mềm (hủy)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ACTIVE_STATUSES,
  reservationTotal,
  serializeReservation,
} from "@/lib/tram/server";
import { LOYALTY_TIERS } from "@/lib/tram/loyalty";
import type { LoyaltyTier, Pairing, ReservationStatus, Slot } from "@/lib/tram/types";

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
  soft_delete: ["PENDING", "CONFIRMED", "SEATED", "NO_SHOW"],
  restore: ["CANCELLED"],
};

const NEXT_STATUS: Record<string, string> = {
  checkin: "SEATED",
  noshow: "NO_SHOW",
  cancel: "CANCELLED",
  soft_delete: "CANCELLED",
  restore: "CONFIRMED",
};

const ACTION_LABELS: Record<string, string> = {
  checkin: "Check-in",
  noshow: "Đánh dấu không đến",
  cancel: "Hủy đặt bàn",
  soft_delete: "Xóa mềm đặt bàn",
  restore: "Khôi phục đặt bàn",
};

interface EditPayload {
  customerName?: string;
  phone?: string;
  email?: string;
  partySize?: number;
  tableId?: string;
  slot?: Slot;
  pairing?: Pairing;
  notes?: string;
  allergy?: string;
  status?: ReservationStatus;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { table: true, survey: true },
    });
    if (!reservation) {
      return NextResponse.json(
        { error: "Không tìm thấy lượt đặt bàn." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      reservation: serializeReservation(reservation),
    });
  } catch (error) {
    console.error("GET reservation error", error);
    return NextResponse.json(
      { error: "Không tải được thông tin đặt bàn." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: string } & EditPayload;
    const action = body.action ?? "";

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

    // --- TRƯỜNG HỢP 1: SỬA ĐẶT BÀN (EDIT RESERVATION) ---
    if (action === "edit" || (!action && (body.customerName || body.tableId || body.slot || body.partySize))) {
      const targetTableId = body.tableId ?? reservation.tableId;
      const targetSlot = body.slot ?? (reservation.slot as Slot);
      const targetPartySize = body.partySize ? Number(body.partySize) : reservation.partySize;

      if (targetPartySize < 2 || targetPartySize > 8) {
        return NextResponse.json(
          { error: "Số khách phải từ 2 đến 8." },
          { status: 400 },
        );
      }

      if (body.customerName && body.customerName.trim().length < 2) {
        return NextResponse.json(
          { error: "Họ tên khách hàng tối thiểu 2 ký tự." },
          { status: 400 },
        );
      }

      if (body.phone && !/^0\d{9}$/.test(body.phone.trim())) {
        return NextResponse.json(
          { error: "Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)." },
          { status: 400 },
        );
      }

      // Kiểm tra bàn tồn tại & sức chứa
      const targetTable = await db.table.findFirst({
        where: {
          OR: [{ id: targetTableId }, { code: targetTableId }],
        },
      });
      if (!targetTable) {
        return NextResponse.json(
          { error: "Bàn được chọn không tồn tại." },
          { status: 400 },
        );
      }

      if (targetTable.seats < targetPartySize) {
        return NextResponse.json(
          { error: `Bàn ${targetTable.code} chỉ có ${targetTable.seats} chỗ, không đủ cho ${targetPartySize} khách.` },
          { status: 400 },
        );
      }

      // Nếu đổi bàn hoặc đổi khung giờ: kiểm tra xung đột với đơn khác đang hoạt động
      if (targetTableId !== reservation.tableId || targetSlot !== reservation.slot) {
        const conflict = await db.reservation.findFirst({
          where: {
            id: { not: id },
            tableId: targetTableId,
            date: reservation.date,
            slot: targetSlot,
            status: { in: [...ACTIVE_STATUSES] },
          },
        });
        if (conflict) {
          return NextResponse.json(
            { error: `Bàn ${targetTable.code} đã có người đặt trong ca này. Vui lòng chọn bàn khác.` },
            { status: 409 },
          );
        }
      }

      const updated = await db.reservation.update({
        where: { id },
        data: {
          customerName: body.customerName?.trim() || reservation.customerName,
          phone: body.phone?.trim() || reservation.phone,
          email: body.email !== undefined ? (body.email?.trim() || null) : reservation.email,
          partySize: targetPartySize,
          tableId: targetTableId,
          slot: targetSlot,
          pairing: body.pairing ?? (reservation.pairing as Pairing),
          notes: body.notes !== undefined ? (body.notes?.trim() || null) : reservation.notes,
          allergy: body.allergy !== undefined ? (body.allergy?.trim() || null) : reservation.allergy,
          status: body.status ?? (reservation.status as ReservationStatus),
        },
        include: { table: true },
      });

      return NextResponse.json({
        reservation: serializeReservation(updated),
        message: `Đã cập nhật thông tin đặt bàn ${reservation.code} thành công.`,
      });
    }

    // --- TRƯỜNG HỢP 2: CÁC ACTION TRẠNG THÁI (checkin, noshow, cancel, soft_delete, restore) ---
    if (!ALLOWED_TRANSITIONS[action]) {
      return NextResponse.json(
        { error: "Hành động không hợp lệ (checkin | noshow | cancel | soft_delete | restore | edit)." },
        { status: 400 },
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

    // Nếu khôi phục đơn đã xóa mềm (restore): kiểm tra bàn có đang bị đơn khác chiếm không
    if (action === "restore") {
      const conflict = await db.reservation.findFirst({
        where: {
          id: { not: id },
          tableId: reservation.tableId,
          date: reservation.date,
          slot: reservation.slot,
          status: { in: [...ACTIVE_STATUSES] },
        },
      });
      if (conflict) {
        return NextResponse.json(
          {
            error: `Bàn ${reservation.table.code} hiện đã có khách khác trong ca này. Vui lòng bấm Sửa để chọn bàn trống trước khi khôi phục.`,
          },
          { status: 409 },
        );
      }
    }

    let loyaltyInfo: Record<string, unknown> | null = null;

    // FR-20: Tích điểm theo hóa đơn khi đánh dấu "Đã đến" (checkin -> SEATED)
    if (action === "checkin") {
      const billTotal = reservationTotal(
        reservation.partySize,
        reservation.pairing,
      );

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

      const pointsReward = computeBillPoints(
        billTotal,
        prevLoyalty.tier,
      );

      const newSpend = prevSpend + billTotal;
      const prevVisitsCount = prevVisits.length;
      const newVisitsCount = prevVisitsCount + 1;
      const newLoyalty = computeLoyalty(newSpend, newVisitsCount);
      const isUpgraded = newLoyalty.tier !== prevLoyalty.tier;

      let upgradeMilestone: 3 | 6 | null = null;
      if (prevVisitsCount < 3 && newVisitsCount >= 3) {
        upgradeMilestone = 3;
      } else if (prevVisitsCount < 6 && newVisitsCount >= 6) {
        upgradeMilestone = 6;
      }

      loyaltyInfo = {
        reservationCode: reservation.code,
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
        upgradeMilestone,
        visitsCount: newVisitsCount,
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
      { error: "Không cập nhật được đặt bàn." },
      { status: 500 },
    );
  }
}

// Xóa mềm đặt bàn (Soft-delete: status -> CANCELLED, giải phóng bàn)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const updated = await db.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { table: true },
    });

    return NextResponse.json({
      reservation: serializeReservation(updated),
      message: `Đã xóa mềm (hủy) đặt bàn ${reservation.code}. Bàn ${reservation.table.code} đã được giải phóng.`,
    });
  } catch (error) {
    console.error("DELETE reservation error", error);
    return NextResponse.json(
      { error: "Không thể xóa đặt bàn." },
      { status: 500 },
    );
  }
}
