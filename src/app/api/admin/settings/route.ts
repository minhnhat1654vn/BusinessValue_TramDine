import { NextRequest, NextResponse } from "next/server";
import { type BookingProgramSettings } from "@/lib/tram/booking-settings";
import {
  getBookingSettings,
  saveBookingSettings,
} from "@/lib/tram/booking-settings-server";

export async function GET() {
  try {
    const settings = await getBookingSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json(
      { error: "Không tải được cài đặt đặt bàn." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<BookingProgramSettings>;

    // Lưu vào SQLite DB và backup JSON
    const saved = await saveBookingSettings(body);
    return NextResponse.json({
      success: true,
      message: "Đã cập nhật cài đặt đặt bàn thành công vào cơ sở dữ liệu.",
      settings: saved,
    });
  } catch (error) {
    console.error("POST /api/admin/settings error:", error);
    return NextResponse.json(
      { error: "Không lưu được cài đặt đặt bàn." },
      { status: 500 }
    );
  }
}
