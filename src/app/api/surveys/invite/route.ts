// FR-23: API Gửi lời mời đánh giá Google Maps qua SMS/Zalo (mô phỏng)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, customerName, channel, reservationCode } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp số điện thoại đặt cọc của khách hàng." },
        { status: 400 },
      );
    }

    const channelName = channel === "ZALO" ? "Zalo ZNS Official" : "SMS Brandname (TRAM_RESERVE)";
    const reviewLink = "https://maps.app.goo.gl/tram-reserve-contemporary-dining";

    const messageContent =
      channel === "ZALO"
        ? `[TRẦM Reserve Official]\nKính gửi Quý khách ${customerName || "Thực khách"},\nTRẦM Reserve xin chân thành cảm ơn Quý khách đã dùng bữa tối nay.\nChúng tôi trân trọng kính mời Quý khách chia sẻ cảm nhận trải nghiệm tại Google Maps:\n👉 ${reviewLink}\n\n🎁 Tặng ngay 200 điểm tri ân vào tài khoản thành viên sau khi để lại nhận xét.`
        : `[TRAM_RESERVE] Kinh gui Quy khach ${customerName || ""}, cam on Quy khach da dung bua tai TRAM Reserve. Kinh moi Quy khach gui danh gia tai: ${reviewLink} de nhan ngay +200 diem tri an. Hotline: 028.3822.8899`;

    return NextResponse.json({
      success: true,
      message: `Đã gửi thành công lời mời đánh giá Google Maps qua ${channelName} tới SĐT đặt cọc ${phone}.`,
      data: {
        phone,
        customerName,
        channel,
        channelName,
        reviewLink,
        messageContent,
        sentAt: new Date().toISOString(),
        bonusPointsOffered: 200,
        status: "DELIVERED",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Lỗi gửi lời mời đánh giá SMS/Zalo." },
      { status: 500 },
    );
  }
}
