// FR-24: API Đồng bộ đánh giá Google Maps (Mô phỏng Places API)
import { NextRequest, NextResponse } from "next/server";
import {
  INITIAL_GOOGLE_MAPS_STATS,
  getStoredGoogleReviews,
  addReplyToReview,
  awardPointsToReview,
} from "@/lib/tram/google-reviews";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sync = searchParams.get("sync");

    const stats = {
      ...INITIAL_GOOGLE_MAPS_STATS,
      lastSyncedAt: sync ? new Date().toISOString() : INITIAL_GOOGLE_MAPS_STATS.lastSyncedAt,
    };
    const reviews = getStoredGoogleReviews();

    return NextResponse.json({
      success: true,
      stats,
      reviews,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Lỗi đồng bộ dữ liệu Google Maps Places API." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, reviewId, replyContent, repliedBy } = body;

    if (action === "reply") {
      if (!reviewId || !replyContent) {
        return NextResponse.json(
          { error: "Thiếu mã đánh giá hoặc nội dung phản hồi." },
          { status: 400 },
        );
      }
      const updated = addReplyToReview(reviewId, replyContent, repliedBy);
      if (!updated) {
        return NextResponse.json(
          { error: "Không tìm thấy đánh giá Google Maps." },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        message: "Đã đăng câu trả lời phản hồi công khai lên Google Maps.",
        review: updated,
      });
    }

    if (action === "reward") {
      if (!reviewId) {
        return NextResponse.json(
          { error: "Thiếu mã đánh giá cần tặng điểm." },
          { status: 400 },
        );
      }
      const updated = awardPointsToReview(reviewId);
      if (!updated) {
        return NextResponse.json(
          { error: "Không tìm thấy đánh giá Google Maps." },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        message: `Đã tặng thành công +200 điểm tri ân cho khách hàng theo SĐT đặt cọc ${updated.depositPhone ?? ""}.`,
        review: updated,
      });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Lỗi xử lý thao tác đánh giá Google Maps." },
      { status: 500 },
    );
  }
}
