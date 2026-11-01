import { NextResponse } from "next/server";
import { getBookingSettings } from "@/lib/tram/booking-settings-server";

export async function GET() {
  try {
    const settings = await getBookingSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/booking-settings error:", error);
    return NextResponse.json(
      { error: "Không tải được cài đặt chương trình đặt bàn." },
      { status: 500 }
    );
  }
}
