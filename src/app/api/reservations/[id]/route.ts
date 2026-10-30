// PATCH /api/reservations/[id] — cập nhật trạng thái (check-in / no-show / hủy)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeReservation } from "@/lib/tram/server";

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

    const updated = await db.reservation.update({
      where: { id },
      data: { status: NEXT_STATUS[action] },
      include: { table: true },
    });

    return NextResponse.json({
      reservation: serializeReservation(updated),
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
