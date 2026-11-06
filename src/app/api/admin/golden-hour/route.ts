// FR-34: API Quản trị Khung Giờ Vàng (Golden Hour Promotion)
// Hỗ trợ GET (quét ca T4-T6, tính occupancy), POST (tung voucher & bắn Zalo), PUT (cấu hình dải %)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RESTAURANT } from "@/lib/tram/constants";
import {
  evaluateGoldenHourShifts,
  formatGoldenHourDiscount,
  generateGoldenHourVoucherCode,
  buildGoldenHourZaloMessage,
  type GoldenHourCampaign,
  type GoldenHourRuleConfig,
  type GoldenHourDiscountType,
  type GoldenHourAudience,
} from "@/lib/tram/golden-hour";
import {
  getStoredGoldenHourCampaigns,
  getStoredGoldenHourConfig,
  saveStoredGoldenHourCampaign,
  saveStoredGoldenHourConfig,
} from "@/lib/tram/golden-hour-server";
import { addDays, todayLocalISO, weekdayOf } from "@/lib/tram/format";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const today = searchParams.get("today") || todayLocalISO();

    // Cửa sổ 4 tuần: 7 ngày trước đến 21 ngày tới
    const startDate = addDays(today, -7);
    const endDate = addDays(today, 21);

    // Lấy toàn bộ lượt đặt bàn trong cửa sổ ngày
    const reservations = await db.reservation.findMany({
      where: {
        date: {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`),
        },
      },
      select: {
        date: true,
        slot: true,
        partySize: true,
        status: true,
      },
    });

    const config = getStoredGoldenHourConfig();
    const campaigns = getStoredGoldenHourCampaigns();

    const summary = evaluateGoldenHourShifts({
      today,
      reservations,
      campaigns,
      config,
      daysSpan: 28,
    });

    // Thống kê ước tính tệp khách hàng theo đối tượng
    const allCustomers = await db.reservation.findMany({
      select: { customerName: true, phone: true, source: true },
      distinct: ["phone"],
    });

    const totalCustomers = Math.max(allCustomers.length, 36);
    const vipCustomers = Math.max(Math.round(totalCustomers * 0.35), 12);
    const zaloCustomers = Math.max(
      allCustomers.filter((c) => c.source === "ZALO").length,
      Math.round(totalCustomers * 0.45),
    );

    return NextResponse.json({
      success: true,
      summary,
      config,
      audienceStats: {
        ALL: totalCustomers,
        VIP: vipCustomers,
        ZALO_USERS: zaloCustomers,
      },
    });
  } catch (err) {
    console.error("Lỗi GET /api/admin/golden-hour:", err);
    return NextResponse.json(
      { error: "Lỗi tổng hợp dữ liệu Khung Giờ Vàng." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      targetDate,
      slot = "SLOT_1730",
      voucherCode: customVoucherCode,
      discountType = "PERCENT",
      discountValue = 15,
      targetAudience = "ALL",
      customMessage,
    } = body;

    if (!targetDate || typeof targetDate !== "string") {
      return NextResponse.json({ error: "Thiếu ngày áp dụng (targetDate)." }, { status: 400 });
    }

    const wd = weekdayOf(targetDate);
    if (![3, 4, 5].includes(wd)) {
      return NextResponse.json(
        { error: "Khung Giờ Vàng chỉ áp dụng cho ca chiều Thứ 4, Thứ 5 và Thứ 6." },
        { status: 400 },
      );
    }

    // Tính toán số lượng chỗ đã đặt của ca mục tiêu
    const reservations = await db.reservation.findMany({
      where: {
        date: {
          gte: new Date(`${targetDate}T00:00:00.000Z`),
          lte: new Date(`${targetDate}T23:59:59.999Z`),
        },
        slot: "SLOT_1730",
        status: { in: ["CONFIRMED", "SEATED", "PENDING"] },
      },
      select: { partySize: true },
    });

    const bookedSeats = reservations.reduce((sum, r) => sum + r.partySize, 0);
    const capacity = RESTAURANT.totalSeats;
    const availableSeats = Math.max(0, capacity - bookedSeats);
    const occupancyPct = Number(((bookedSeats / capacity) * 100).toFixed(1));

    const finalVoucherCode =
      (customVoucherCode && String(customVoucherCode).trim()) ||
      generateGoldenHourVoucherCode(targetDate, wd);

    const discountSummary = formatGoldenHourDiscount(
      discountType as GoldenHourDiscountType,
      Number(discountValue),
    );

    // Xây dựng nội dung tin Zalo OA ZNS
    const slotData = {
      date: targetDate,
      weekday: wd,
      weekdayLabel: wd === 3 ? "Thứ Tư" : wd === 4 ? "Thứ Năm" : "Thứ Sáu",
      shortWeekdayLabel: wd === 3 ? "T4" : wd === 4 ? "T5" : "T6",
      slot: "SLOT_1730" as const,
      slotLabel: "17:30",
      capacity,
      bookedSeats,
      availableSeats,
      occupancyPct,
      isEligible: true,
      hasActiveCampaign: true,
    };

    const zaloMessageBody =
      customMessage ||
      buildGoldenHourZaloMessage({
        slot: slotData,
        voucherCode: finalVoucherCode,
        discountType: discountType as GoldenHourDiscountType,
        discountValue: Number(discountValue),
      });

    // Mô phỏng số lượng tin gửi theo đối tượng
    let sentCount = 28;
    if (targetAudience === "VIP") sentCount = 12;
    if (targetAudience === "ZALO_USERS") sentCount = 18;

    const newCampaign: GoldenHourCampaign = {
      id: `gh-camp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetDate,
      slot: "SLOT_1730",
      voucherCode: finalVoucherCode,
      discountType: discountType as GoldenHourDiscountType,
      discountValue: Number(discountValue),
      discountSummary,
      occupancyAtLaunch: occupancyPct,
      bookedSeatsAtLaunch: bookedSeats,
      availableSeatsAtLaunch: availableSeats,
      targetAudience: targetAudience as GoldenHourAudience,
      sentCount,
      zaloMessageBody,
      status: "ACTIVE",
    };

    const updatedCampaigns = saveStoredGoldenHourCampaign(newCampaign);

    return NextResponse.json({
      success: true,
      campaign: newCampaign,
      totalCampaigns: updatedCampaigns.length,
      message: `Đã phát hành Voucher ${finalVoucherCode} & mô phỏng gửi thành công ${sentCount} tin Zalo OA!`,
    });
  } catch (err) {
    console.error("Lỗi POST /api/admin/golden-hour:", err);
    return NextResponse.json(
      { error: "Lỗi phát hành chiến dịch Voucher Khung Giờ Vàng." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = saveStoredGoldenHourConfig(body);
    return NextResponse.json({
      success: true,
      config: updated,
      message: "Đã cập nhật cấu hình quy tắc Khung Giờ Vàng.",
    });
  } catch (err) {
    console.error("Lỗi PUT /api/admin/golden-hour:", err);
    return NextResponse.json(
      { error: "Lỗi cập nhật cấu hình quy tắc Khung Giờ Vàng." },
      { status: 500 },
    );
  }
}

