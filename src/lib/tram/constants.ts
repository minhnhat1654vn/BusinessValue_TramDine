// Thông số nghiệp vụ cố định của TRẦM — khớp tài liệu tư vấn, không thay đổi

export const RESTAURANT = {
  name: "TRẦM",
  tagline: "Hành trình vị Việt — bảy món, một câu chuyện",
  address: "Số 12 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
  hotline: "0901 234 567",
  email: "hello@tramreserve.vn",
  totalSeats: 42,
  totalTables: 12,
} as const;

export const PRICES = {
  menu: 1_190_000, // đ/khách — menu tasting "Hành trình vị Việt"
  winePairing: 650_000, // đ/khách
  teaPairing: 350_000, // đ/khách
  deposit: 300_000, // đ/khách
} as const;

export const SLOT_LABELS: Record<string, string> = {
  SLOT_1730: "17:30",
  SLOT_1945: "19:45",
};

export const SLOT_TIMES: { value: "SLOT_1730" | "SLOT_1945"; label: string }[] = [
  { value: "SLOT_1730", label: "17:30" },
  { value: "SLOT_1945", label: "19:45" },
];

export const PAIRING_LABELS: Record<string, string> = {
  NONE: "Không pairing",
  WINE: "Wine pairing",
  TEA: "Tea pairing",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ cọc",
  CONFIRMED: "Đã đặt",
  SEATED: "Đã đến",
  NO_SHOW: "Không đến",
  CANCELLED: "Đã hủy",
};

export const SOURCE_LABELS: Record<string, string> = {
  WEB: "Web",
  PHONE: "Điện thoại",
  ZALO: "Zalo",
};

export const ADMIN_CODE = "TRAM2025";

export interface MenuItem {
  index: number;
  name: string;
  description: string;
  region: string;
}

// 7 món của menu tasting "Hành trình vị Việt"
export const MENU_ITEMS: MenuItem[] = [
  {
    index: 1,
    name: "Bánh mì bơ trầm hương & muối ớt Tây Ninh",
    description:
      "Bánh mì men tươi nướng giòn, quết bơ trầm hương thượng hạng và muối ớt Tây Ninh cay dịu.",
    region: "Mở đầu",
  },
  {
    index: 2,
    name: "Gỏi cá bớp sông Cửu Long",
    description:
      "Cá bớp tươi sống tẩm gia vị chua ngọt, hoà cùng rau thơn đồng bằng và nước cốt me.",
    region: "Sông nước",
  },
  {
    index: 3,
    name: "Bún đậu tương Bảo Lạc",
    description:
      "Đậu tương Cao Bằng ủ men truyền thống, kèm bún tươi và tương ớt chấm đậm đà.",
    region: "Cao nguyên",
  },
  {
    index: 4,
    name: "Cá lóc nướng trui rau rừng",
    description:
      "Cá lóc đồng nướng trui trên rơm thơm, ăn kèm rau rừng hoang dã và muối tiêu chanh.",
    region: "Miền quê",
  },
  {
    index: 5,
    name: "Bò Quảng Nam nướng lá móc mật",
    description:
      "Thịt bò Quảng Nam ướp mật ong, nướng trên lá móc mật dậy mùi thơm nồng đặc trưng.",
    region: "Trung bộ",
  },
  {
    index: 6,
    name: "Canh chành cá đuối tía tô",
    description:
      "Canh chua cá đuối thanh mát, dịu vị tía tô và me chua — món giải nhiệt khép lại hành trình mặn.",
    region: "Thanh lọc",
  },
  {
    index: 7,
    name: "Chè trầm nhãn Long An kèm trà atiso",
    description:
      "Chè nhãn Long An ngọt thanh hương trầm, uống cùng trà atiso Đà Lạt ủ lạnh.",
    region: "Khép lại",
  },
];

export const REVIEWS = [
  {
    name: "Nguyễn Minh Anh",
    title: "Kỷ niệm 10 năm ngày cưới",
    content:
      "Bảy món như bảy chương của một câu chuyện. Đội ngũ phục vụ nhớ cả tên chúng tôi — một tối đáng nhớ đúng nghĩa.",
    stars: 5,
  },
  {
    name: "Trần Quốc Bảo",
    title: "Doanh nhân, khách quen",
    content:
      "Đặt bàn trên web chỉ mất hai phút, nhắc lịch qua Zalo rất đúng giờ. Trải nghiệm đúng chuẩn fine dining mà vẫn rất Việt Nam.",
    stars: 5,
  },
  {
    name: "Lê Thu Hằng",
    title: "Food blogger",
    content:
      "Món cá lóc nướng trui là đoản khúc hay nhất tôi ăn trong năm nay. Wine pairing chọn rượu Việt rất táo bạo và rất đúng.",
    stars: 5,
  },
] as const;
