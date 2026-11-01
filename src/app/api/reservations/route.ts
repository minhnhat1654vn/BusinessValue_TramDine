// POST /api/reservations — tạo lượt đặt bàn mới (kiểm tra xung đột, trả 409 nếu trùng bàn)
// GET /api/reservations?date=YYYY-MM-DD — danh sách đặt bàn theo ngày (cho màn quản trị)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ACTIVE_STATUSES,
  generateReservationCode,
  serializeReservation,
} from "@/lib/tram/server";
import { PRICES } from "@/lib/tram/constants";
import { releaseTableHold } from "@/lib/tram/hold-manager";
import { checkDateBookingAllowed } from "@/lib/tram/booking-settings";
import { getBookingSettings } from "@/lib/tram/booking-settings-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Tham số date không hợp lệ (YYYY-MM-DD)." },
        { status: 400 },
      );
    }
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T00:00:00.001Z`);
    const reservations = await db.reservation.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      include: { table: true, survey: true },
      orderBy: [{ slot: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({
      date,
      reservations: reservations.map(serializeReservation),
    });
  } catch (error) {
    console.error("GET reservations error", error);
    return NextResponse.json(
      { error: "Không tải được danh sách đặt bàn." },
      { status: 500 },
    );
  }
}

interface CreateBody {
  date?: string;
  slot?: string;
  partySize?: number;
  tableId?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  pairing?: string;
  notes?: string;
  allergy?: string;
  selectedDishes?: string | unknown;
  source?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = (await request.json()) as CreateBody;
    const isAdmin =
      searchParams.get("admin") === "1" ||
      body.source === "PHONE" ||
      body.source === "ZALO";

    // --- Kiểm tra dữ liệu đầu vào ---
    const errors: string[] = [];
    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      errors.push("Ngày đặt không hợp lệ.");
    } else if (!isAdmin) {
      // Kiểm tra quy tắc ngày chương trình & ngày nghỉ từ cài đặt quản trị (chỉ áp dụng cho khách tự đặt)
      const settings = await getBookingSettings();
      const dateCheck = checkDateBookingAllowed(body.date, settings);
      if (!dateCheck.allowed) {
        errors.push(dateCheck.message ?? "Ngày này nhà hàng không áp dụng chương trình đặt bàn.");
      }
    }

    if (body.slot !== "SLOT_1730" && body.slot !== "SLOT_1945") {
      errors.push("Khung giờ không hợp lệ.");
    }
    const partySize = Number(body.partySize);
    if (!Number.isInteger(partySize) || partySize < 2 || partySize > 8) {
      errors.push("Số khách phải từ 2 đến 8.");
    }
    if (!body.customerName || body.customerName.trim().length < 2) {
      errors.push("Vui lòng nhập họ tên khách.");
    }
    if (!body.phone || !/^0\d{9}$/.test(body.phone.trim())) {
      errors.push("Số điện thoại không hợp lệ (vd: 0912345678).");
    }
    if (body.email && body.email.trim() && !/^\S+@\S+\.\S+$/.test(body.email.trim())) {
      errors.push("Email không hợp lệ.");
    }
    if (!["NONE", "WINE", "TEA"].includes(body.pairing ?? "NONE")) {
      errors.push("Lựa chọn pairing không hợp lệ.");
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0], errors }, { status: 400 });
    }

    const table = body.tableId
      ? await db.table.findFirst({
          where: {
            OR: [{ id: body.tableId }, { code: body.tableId }],
          },
        })
      : null;
    if (!table) {
      return NextResponse.json(
        { error: "Bàn không tồn tại." },
        { status: 400 },
      );
    }
    if (table.seats < partySize) {
      return NextResponse.json(
        { error: `Bàn ${table.code} chỉ có ${table.seats} chỗ, không đủ cho ${partySize} khách.` },
        { status: 400 },
      );
    }

    // --- Kiểm tra xung đột: cùng bàn + cùng ngày + cùng khung, chưa hủy ---
    const dayStart = new Date(`${body.date}T00:00:00.000Z`);
    const dayEnd = new Date(`${body.date}T00:00:00.001Z`);
    const conflict = await db.reservation.findFirst({
      where: {
        tableId: table.id,
        date: { gte: dayStart, lte: dayEnd },
        slot: body.slot,
        status: { in: [...ACTIVE_STATUSES] },
      },
    });
    if (conflict) {
      return NextResponse.json(
        {
          error: `Bàn ${table.code} đã có khách trong khung này. Vui lòng chọn bàn khác.`,
        },
        { status: 409 },
      );
    }

    // --- Sinh mã TRM-XXXX duy nhất ---
    const existing = await db.reservation.findMany({
      select: { code: true },
    });
    const code = generateReservationCode(
      new Set(existing.map((r) => r.code)),
    );

    // FR-22: Miễn cọc hạng cao nhất — Khách Nam Trầm (>= 6 lượt đến SEATED) được miễn 100% cọc 300.000 đ/khách
    const pastSeatedCount = await db.reservation.count({
      where: {
        phone: body.phone!.trim(),
        status: "SEATED",
      },
    });
    const isNamTram = pastSeatedCount >= 6;
    const depositAmount = isNamTram ? 0 : PRICES.deposit * partySize;

    const finalNotes = isNamTram
      ? [
        body.notes?.trim(),
        "👑 [Đặc quyền Thượng khách Nam Trầm: Miễn 100% tiền cọc (FR-22)]",
      ]
        .filter(Boolean)
        .join(" · ")
      : body.notes?.trim() || null;

    releaseTableHold(body.date!, body.slot!, table.id);

    const created = await db.reservation.create({
      data: {
        code,
        customerName: body.customerName!.trim(),
        phone: body.phone!.trim(),
        email: body.email?.trim() || null,
        partySize,
        tableId: table.id,
        date: dayStart,
        slot: body.slot!,
        pairing: body.pairing ?? "NONE",
        notes: finalNotes,
        allergy: body.allergy?.trim() || null,
        selectedDishes: body.selectedDishes
          ? typeof body.selectedDishes === "string"
            ? body.selectedDishes
            : JSON.stringify(body.selectedDishes)
          : null,
        status: "CONFIRMED", // cọc đã "thanh toán" (mô phỏng) → xác nhận luôn
        depositAmount: PRICES.deposit * partySize,
        source: body.source === "PHONE" || body.source === "ZALO" ? body.source : "WEB",
      },
      include: { table: true },
    });

    return NextResponse.json(
      { reservation: serializeReservation(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST reservations error", error);
    return NextResponse.json(
      { error: "Không tạo được lượt đặt bàn. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
