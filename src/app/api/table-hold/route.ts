// POST /api/table-hold — Giữ chỗ hoặc giải phóng giữ chỗ bàn 10 phút
import { NextRequest, NextResponse } from "next/server";
import { acquireTableHold, releaseTableHold } from "@/lib/tram/hold-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, date, slot, tableId, sessionId } = body;

    if (!date || !slot || !tableId || !sessionId) {
      return NextResponse.json(
        { error: "Thiếu thông tin giữ bàn (date, slot, tableId, sessionId)." },
        { status: 400 },
      );
    }

    if (action === "release") {
      releaseTableHold(date, slot, tableId, sessionId);
      return NextResponse.json({ success: true, message: "Đã hủy giữ bàn." });
    }

    // Mặc định là action = "hold"
    const result = await acquireTableHold(date, slot, tableId, sessionId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Không thể giữ bàn này." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Giữ bàn thành công trong 10 phút.",
      remainingSeconds: result.remainingSeconds,
    });
  } catch (error) {
    console.error("table-hold error", error);
    return NextResponse.json(
      { error: "Lỗi xử lý giữ bàn." },
      { status: 500 },
    );
  }
}

