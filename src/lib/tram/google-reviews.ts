
import type { GoogleMapsReviewDTO, GoogleMapsSyncStats } from "./types";

// Thống kê Places API đồng bộ cho TRẦM Reserve
export const INITIAL_GOOGLE_MAPS_STATS: GoogleMapsSyncStats = {
  placeName: "TRẦM Reserve — Contemporary Fine Dining & Tea Pairing",
  address: "Số 18 Đường Mạc Đĩnh Chi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  overallRating: 4.9,
  totalReviews: 128,
  regionalAvgRating: 4.3, // Điểm trung bình các nhà hàng Fine Dining lân cận tại Quận 1
  ratingDifference: 0.6, // Vượt trội +0.6 sao so với khu vực
  starDistribution: [
    { star: 5, count: 118, percent: 92.2 },
    { star: 4, count: 8, percent: 6.3 },
    { star: 3, count: 2, percent: 1.5 },
    { star: 2, count: 0, percent: 0 },
    { star: 1, count: 0, percent: 0 },
  ],
  highlightTags: [
    { tag: "Bò Wagyu A5 mềm tan", count: 48 },
    { tag: "Pairing trà độc bản", count: 35 },
    { tag: "Không gian ấm cúng", count: 29 },
    { tag: "Dịch vụ 5 sao chu đáo", count: 26 },
    { tag: "Rượu vang chọn lọc", count: 19 },
    { tag: "Âm nhạc tinh tế riêng tư", count: 15 },
  ],
  lastSyncedAt: new Date().toISOString(),
};

export const INITIAL_GOOGLE_REVIEWS: GoogleMapsReviewDTO[] = [
  {
    id: "g_rev_001",
    authorName: "Nguyễn Minh Anh",
    isLocalGuide: true,
    localGuideLevel: 7,
    rating: 5,
    relativeTime: "2 ngày trước",
    content:
      "Trải nghiệm ẩm thực hoàn hảo nhất từng có tại Sài Gòn. Từng món trong set menu 7 món đều là một tác phẩm nghệ thuật, đặc biệt là Bò Wagyu A5 mềm tan như bơ quyện cùng sốt tiêu đen thượng hạng. Set trà pairing làm tôi vô cùng bất ngờ vì độ hòa quyện thanh tao. Phục vụ chu đáo, tinh tế từng cử chỉ.",
    depositPhone: "0912345678",
    customerName: "Nguyễn Minh Anh",
    reservationCode: "TR-8921",
    tags: ["Bò Wagyu A5 mềm tan", "Pairing trà độc bản", "Dịch vụ 5 sao chu đáo"],
    pointsAwarded: true,
    reply: {
      content:
        "TRẦM Reserve xin chân thành cảm ơn chị Minh Anh đã dành những lời khen ngợi quý giá cho set menu và trà pairing độc bản. Đội ngũ bếp trưởng và nhân viên luôn sẵn sàng chào đón chị trở lại trong những dịp đặc biệt tiếp theo!",
      repliedAt: "1 ngày trước",
      repliedBy: "Quản lý nhà hàng TRẦM Reserve",
    },
  },
  {
    id: "g_rev_002",
    authorName: "Trần Quốc Bảo",
    isLocalGuide: true,
    localGuideLevel: 6,
    rating: 5,
    relativeTime: "4 ngày trước",
    content:
      "Một không gian ấm cúng sang trọng hiếm có giữa lòng Quận 1. Ánh sáng vàng dịu, mùi hương trầm nhẹ thoang thoảng mang lại cảm giác thư thái tuyệt đối. Món cá tuyết nướng miso và tráng miệng sô-cô-la nấm truffle rất ấn tượng. Rất khuyến khích các cặp đôi đặt bàn khu cửa sổ cho kỷ niệm ngày cưới.",
    depositPhone: "0938765432",
    customerName: "Trần Quốc Bảo",
    reservationCode: "TR-4712",
    tags: ["Không gian ấm cúng", "Âm nhạc tinh tế riêng tư"],
    pointsAwarded: false,
    reply: null,
  },
  {
    id: "g_rev_003",
    authorName: "Lê Thu Hằng",
    isLocalGuide: true,
    localGuideLevel: 8,
    rating: 5,
    relativeTime: "1 tuần trước",
    content:
      "Bộ sưu tập trà Shan Tuyết cổ thụ ghép đôi với ẩm thực cao cấp là một đột phá xuất sắc. Sommelier giải thích cặn kẽ nguồn gốc từng búp trà Tây Bắc. Khâu đặt cọc qua web nhanh gọn, xác nhận SMS tức thì. Sẽ đưa đối tác quay lại thường xuyên.",
    depositPhone: "0909112233",
    customerName: "Lê Thu Hằng",
    reservationCode: "TR-5633",
    tags: ["Pairing trà độc bản", "Dịch vụ 5 sao chu đáo"],
    pointsAwarded: true,
    reply: {
      content:
        "Cảm ơn chị Thu Hằng đã tin tưởng chọn TRẦM Reserve để đón tiếp đối tác. Trân trọng hẹn gặp lại chị trong trải nghiệm ẩm thực mùa mới sắp tới!",
      repliedAt: "6 ngày trước",
      repliedBy: "Bộ phận Chăm sóc khách hàng VIP",
    },
  },
  {
    id: "g_rev_004",
    authorName: "Vũ Thanh Tùng",
    isLocalGuide: false,
    rating: 4,
    relativeTime: "1 tuần trước",
    content:
      "Món ăn rất ngon và trình bày xuất sắc, nêm nếm vừa vặn. Không gian riêng tư, nhạc jazz nhẹ nhàng. Điểm trừ duy nhất là bãi đỗ xe hơi giờ cao điểm hơi đông một chút, nhưng các bạn bảo vệ hỗ trợ đưa xe vào rất tận tình.",
    depositPhone: "0987654321",
    customerName: "Vũ Thanh Tùng",
    reservationCode: "TR-3108",
    tags: ["Không gian ấm cúng", "Bò Wagyu A5 mềm tan"],
    pointsAwarded: false,
    reply: null,
  },
  {
    id: "g_rev_005",
    authorName: "Đặng Khánh Linh",
    isLocalGuide: true,
    localGuideLevel: 5,
    rating: 5,
    relativeTime: "2 tuần trước",
    content:
      "Được nhận tin nhắn mời đánh giá kèm lời tri ân sau bữa tối sinh nhật. Nhà hàng đã chuẩn bị sẵn thiệp chúc mừng viết tay cùng một món quà nhỏ cho bàn của mình — một chi tiết chạm đến cảm xúc. Xứng đáng 5 sao tròn trịa!",
    depositPhone: "0918889999",
    customerName: "Đặng Khánh Linh",
    reservationCode: "TR-9041",
    tags: ["Dịch vụ 5 sao chu đáo", "Không gian ấm cúng"],
    pointsAwarded: true,
    reply: {
      content:
        "Chúc mừng sinh nhật chị Khánh Linh một lần nữa! Rất vinh hạnh vì TRẦM Reserve được đồng hành cùng khoảnh khắc ý nghĩa này của chị.",
      repliedAt: "13 ngày trước",
      repliedBy: "Quản lý nhà hàng TRẦM Reserve",
    },
  },
  {
    id: "g_rev_006",
    authorName: "Hoàng Ngọc Mai",
    isLocalGuide: false,
    rating: 5,
    relativeTime: "3 tuần trước",
    content:
      "Rượu vang tự chọn theo tư vấn của chuyên viên rất vừa miệng với món thịt bồ câu Pháp. Phục vụ chuyên nghiệp theo đúng chuẩn fine dining quốc tế nhưng vẫn giữ được nét ấm áp Việt Nam.",
    depositPhone: "0903334455",
    customerName: "Hoàng Ngọc Mai",
    reservationCode: "TR-2245",
    tags: ["Rượu vang chọn lọc", "Dịch vụ 5 sao chu đáo"],
    pointsAwarded: false,
    reply: null,
  },
];

// In-memory store cho review tương tác (để trả lời review & tặng điểm hoạt động mượt mà)
let currentReviews = [...INITIAL_GOOGLE_REVIEWS];

export function getStoredGoogleReviews(): GoogleMapsReviewDTO[] {
  return currentReviews;
}

export function addReplyToReview(
  reviewId: string,
  content: string,
  repliedBy: string = "Quản lý nhà hàng TRẦM Reserve",
): GoogleMapsReviewDTO | null {
  const target = currentReviews.find((r) => r.id === reviewId);
  if (!target) return null;
  target.reply = {
    content,
    repliedAt: "Vừa xong",
    repliedBy,
  };
  return target;
}

export function awardPointsToReview(reviewId: string): GoogleMapsReviewDTO | null {
  const target = currentReviews.find((r) => r.id === reviewId);
  if (!target) return null;
  target.pointsAwarded = true;
  return target;
}
