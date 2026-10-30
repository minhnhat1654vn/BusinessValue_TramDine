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

export interface DishCustomOption {
  id: string;
  name: string;
  desc?: string;
  isDefault?: boolean;
}

export interface MenuItem {
  index: number;
  name: string;
  description: string;
  region: string;
  image: string;
  story?: string;
  ingredients?: string[];
  pairingNote?: string;
  options?: DishCustomOption[];
}

// 7 món của menu tasting "Hành trình vị Việt"
export const MENU_ITEMS: MenuItem[] = [
  {
    index: 1,
    name: "Bánh mì bơ trầm hương & muối ớt Tây Ninh",
    description:
      "Bánh mì men tươi nướng giòn, quết bơ trầm hương thượng hạng và muối ớt Tây Ninh cay dịu.",
    region: "Mở đầu",
    image: "/banh-mi-bo.jpg",
    story: "Khúc dạo đầu khơi mở vị giác với hương trầm thoang thoảng quện trong bơ béo mượt mà và vị cay nồng đặc trưng của muối ớt núi Bà Đen.",
    ingredients: ["Men tươi 36h", "Bơ thủ công hương trầm", "Muối ớt Tây Ninh hạt ngọc"],
    pairingNote: "Rượu vang sủi bọt Đà Lạt hoặc Trà hoa cúc tiến vua ủ lạnh",
    options: [
      { id: "std", name: "Chuẩn vị men tươi & bơ trầm hương", isDefault: true },
      { id: "gf", name: "Bánh mì gạo không gluten (Gluten-Free)", desc: "Dành cho khách kiêng gluten" },
    ],
  },
  {
    index: 2,
    name: "Gỏi cá bớp sông Cửu Long",
    description:
      "Cá bớp tươi sống tẩm gia vị chua ngọt, hoà cùng rau thơn đồng bằng và nước cốt me.",
    region: "Sông nước",
    image: "/goi-ca-bop.png",
    story: "Lấy cảm hứng từ nét phóng khoáng của miền Tây Nam Bộ, thớ cá bớp tươi giòn ngọt tự nhiên kết hợp cùng rau rừng ven bờ kinh.",
    ingredients: ["Cá bớp sông Cửu Long", "Nước cốt me vườn", "Rau đắng đất & rau càng cua"],
    pairingNote: "Vang trắng Sauvignon Blanc ủ thùng sồi nhẹ",
    options: [
      { id: "std", name: "Cá bớp tươi sống sốt me chua dịu", isDefault: true },
      { id: "cooked", name: "Cá bớp áp chảo chín tới", desc: "Thích hợp cho khách không quen ăn sống" },
      { id: "veg", name: "Đổi gỏi rau rừng hoa chuối chay", desc: "Dành cho khách dị ứng hải sản / ăn chay" },
    ],
  },
  {
    index: 3,
    name: "Bún đậu tương Bảo Lạc",
    description:
      "Đậu tương Cao Bằng ủ men truyền thống, kèm bún tươi và tương ớt chấm đậm đà.",
    region: "Cao nguyên",
    image: "/bun-dau.png",
    story: "Hạt đậu tương vùng cao Bảo Lạc được ủ chum đất sành theo phương thức cổ truyền, mang lại vị umami sâu lắng khó quên.",
    ingredients: ["Đậu tương Bảo Lạc lên men", "Bún sợi nhỏ tráng thủ công", "Ớt chỉ thiên hun khói"],
    pairingNote: "Trà Shan Tuyết cổ thụ Hà Giang",
    options: [
      { id: "std", name: "Chuẩn vị tương ớt hun khói Bảo Lạc", isDefault: true },
      { id: "mild", name: "Giảm cay — để tương ớt riêng", desc: "Vị thanh ngọt đậu tương nổi bật" },
    ],
  },
  {
    index: 4,
    name: "Cá lóc nướng trui rau rừng",
    description:
      "Cá lóc đồng nướng trui trên rơm thơm, ăn kèm rau rừng hoang dã và muối tiêu chanh.",
    region: "Miền quê",
    image: "/ca-loc-nuong.png",
    story: "Rơm lúa mới được đốt để bao bọc vị cá lóc đồng ngọt thanh. Khi mở ra, mùi khói rơm quyện lớp da giòn sém gợi nhớ đồng quê chiều muộn.",
    ingredients: ["Cá lóc đồng tự nhiên", "Rau nhái, lá cóc, đọt xoài", "Muối hầm tiêu rừng"],
    pairingNote: "Vang cam (Skin-contact Orange Wine) hoặc Trà Ô long nướng",
    options: [
      { id: "std", name: "Nướng trui rơm truyền thống", isDefault: true },
      { id: "steamed", name: "Cá lóc hấp tiêu lốt và nấm rừng", desc: "Vị ngọt thanh dịu nhẹ" },
    ],
  },
  {
    index: 5,
    name: "Bò Quảng Nam nướng lá móc mật",
    description:
      "Thịt bò Quảng Nam ướp mật ong, nướng trên lá móc mật dậy mùi thơm nồng đặc trưng.",
    region: "Trung bộ",
    image: "/bo-nuong-la-moc.png",
    story: "Thăn bò vàng Quảng Nam nuôi cỏ tự nhiên, đượm tinh dầu móc mật rừng Trà Bồng tạo nên điểm nhấn cao trào cho bàn tiệc.",
    ingredients: ["Thăn bò Quảng Nam", "Lá móc mật rừng", "Mật ong hoa rừng nguyên chất"],
    pairingNote: "Vang đỏ Pinot Noir hoặc Shiraz đậm đà",
    options: [
      { id: "med", name: "Thịt bò nướng tái vừa (Medium Rare)", isDefault: true },
      { id: "welldone", name: "Thịt bò nướng chín kỹ (Well Done)", desc: "Vẫn giữ độ ẩm mọng" },
      { id: "mushroom", name: "Đổi nấm đùi gà áp chảo sốt tiêu đen", desc: "Lựa chọn thanh nhẹ không thịt đỏ" },
    ],
  },
  {
    index: 6,
    name: "Canh chành cá đuối tía tô",
    description:
      "Canh chua cá đuối thanh mát, dịu vị tía tô và me chua — món giải nhiệt khép lại hành trình mặn.",
    region: "Thanh lọc",
    image: "/canh-ca-duoi.png",
    story: "Vị chua thanh mát lành của me chín và hương tía tô nồng dịu giúp thanh tẩy vòm họng sau món bò nướng, tạo bước đệm hoàn hảo tới món tráng miệng.",
    ingredients: ["Cá đuối tươi làm sạch", "Lá tía tô vườn", "Me chua thanh lọc"],
    pairingNote: "Nước khoáng có ga ướp thảo mộc tươi",
    options: [
      { id: "std", name: "Canh chua cá đuối tía tô thanh vị", isDefault: true },
      { id: "veg_soup", name: "Canh nấm hạt sen tươi tía tô", desc: "Không dùng hải sản" },
    ],
  },
  {
    index: 7,
    name: "Chè trầm nhãn Long An kèm trà atiso",
    description:
      "Chè nhãn Long An ngọt thanh hương trầm, uống cùng trà atiso Đà Lạt ủ lạnh.",
    region: "Khép lại",
    image: "/che-tram.png",
    story: "Nhãn xuồng cơm vàng Long An bọc hạt sen Tây Hồ, điểm xuyết một giọt sương trầm hương dịu ngọt, kết thúc bằng chén trà atiso mát lành thanh tao.",
    ingredients: ["Nhãn xuồng Long An", "Hạt sen tươi Tây Hồ", "Trà hoa Atiso Đà Lạt ủ lạnh"],
    pairingNote: "Trà atiso Đà Lạt ủ lạnh nguyên chất",
    options: [
      { id: "std", name: "Ngọt thanh chuẩn vị Trầm", isDefault: true },
      { id: "low_sugar", name: "Ít ngọt (Thanh nhẹ)", desc: "Giảm 50% đường phèn tự nhiên" },
    ],
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
