// PATCH /api/waitlist/[id] — mời khách khỏi danh sách chờ
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeWaitlist } from "@/lib/tram/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: string };
    if (body.action !== "invite") {
      return NextResponse.json(
        { error: "Hành động không hợp lệ (invite)." },
        { status: 400 },
      );
    }

    const entry = await db.waitlistEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json(
        { error: "Không tìm thấy lượt đăng ký chờ." },
        { status: 404 },
      );
    }
    if (entry.status === "INVITED") {
      return NextResponse.json(
        { error: "Khách này đã được mời trước đó." },
        { status: 409 },
      );
    }

    const updated = await db.waitlistEntry.update({
      where: { id },
      data: { status: "INVITED" },
    });

    return NextResponse.json({
      entry: serializeWaitlist(updated),
      message: `Đã gửi lời mời đến ${entry.name} (0${entry.phone.slice(0, 3)} ${entry.phone.slice(3, 6)} ${entry.phone.slice(6)}) — mô phỏng.`,
    });
  } catch (error) {
    console.error("PATCH waitlist error", error);
    return NextResponse.json(
      { error: "Không cập nhật được danh sách chờ." },
      { status: 500 },
    );
  }
}
