// GET /api/waitlist?today=YYYY-MM-DD — các lượt đăng ký chờ sắp tới
// POST /api/waitlist — đăng ký danh sách chờ
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeWaitlist } from "@/lib/tram/server";
import { parseISODate, toISODate } from "@/lib/tram/format";
import { isClosedMonday } from "@/lib/tram/format";

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
    const start = parseISODate(today);

    const entries = await db.waitlistEntry.findMany({
      where: { date: { gte: start } },
      orderBy: [{ date: "asc" }, { slot: "asc" }, { position: "asc" }],
    });
    return NextResponse.json(
      {
        entries: entries.map(serializeWaitlist),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("GET waitlist error", error);
    return NextResponse.json(
      { error: "Không tải được danh sách chờ." },
      { status: 500 },
    );
  }
}

interface CreateBody {
  name?: string;
  phone?: string;
  partySize?: number;
  date?: string;
  slot?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateBody;

    const errors: string[] = [];
    if (!body.name || body.name.trim().length < 2) {
      errors.push("Vui lòng nhập họ tên.");
    }
    const cleanPhone = (body.phone ?? "").replace(/[\s.-]/g, "").trim();
    if (!cleanPhone || !/^0\d{9}$/.test(cleanPhone)) {
      errors.push("Số điện thoại không hợp lệ (vd: 0912345678).");
    }
    const partySize = Number(body.partySize);
    if (!Number.isInteger(partySize) || partySize < 2 || partySize > 8) {
      errors.push("Số khách phải từ 2 đến 8.");
    }
    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      errors.push("Ngày không hợp lệ.");
    }
    if (body.slot !== "SLOT_1730" && body.slot !== "SLOT_1945") {
      errors.push("Khung giờ không hợp lệ.");
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0] }, { status: 400 });
    }

    const dayStart = new Date(`${body.date}T00:00:00.000Z`);
    if (isClosedMonday(body.date!)) {
      return NextResponse.json(
        { error: "Nhà hàng nghỉ thứ Hai — vui lòng chọn ngày khác." },
        { status: 400 },
      );
    }

    // Vị trí = số lượt chờ hiện có của (ngày, khung) + 1
    const sameSlot = await db.waitlistEntry.findMany({
      where: { date: dayStart, slot: body.slot! },
    });
    const position = sameSlot.length + 1;

    const created = await db.waitlistEntry.create({
      data: {
        name: body.name!.trim(),
        phone: cleanPhone,
        partySize,
        date: dayStart,
        slot: body.slot!,
        position,
        status: "WAITING",
      },
    });

    return NextResponse.json(
      { entry: serializeWaitlist(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST waitlist error", error);
    return NextResponse.json(
      { error: "Không đăng ký được danh sách chờ." },
      { status: 500 },
    );
  }
}
