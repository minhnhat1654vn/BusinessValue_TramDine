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

// 7 món của menu tasting "Hành trình vị Việt" — Concept 2
export const MENU_ITEMS: MenuItem[] = [
  {
    index: 1,
    name: "Tuyết Cá Tầm",
    description:
      "Trứng cá tầm caviar Lâm Đồng ủ lạnh hảo hạng, mở lọ và phục vụ trực tiếp tại bàn.",
    region: "Lâm Đồng",
    image: "/concept2_TrungCaTam.png",
    story: "Khúc dạo đầu thanh tao với caviar trứng cá tầm Lâm Đồng, từng hạt bóng bẩy vỡ tan mang theo vị mặn mòi béo ngậy được mở nắp trang trọng ngay trước mắt thực khách.",
    ingredients: ["Trứng cá tầm Lâm Đồng", "Bánh giòn thảo mộc", "Kem chua vị sương mai"],
    pairingNote: "Rượu vang sủi Sparkling / Champagne ướp lạnh sâu hoặc Trà sen sớm",
    options: [
      { id: "std", name: "Chuẩn vị Caviar mở lọ tại bàn", isDefault: true },
      { id: "extra_blini", name: "Dùng kèm bánh blini nóng giòn", desc: "Tăng độ ấm giòn kết hợp" },
    ],
  },
  {
    index: 2,
    name: "Sá Sùng Muối Tiêu",
    description:
      "Báu vật biển đảo Vân Đồn từng tiến vua, nướng giòn điểm xuyết muối tiêu rừng thơm nồng.",
    region: "Vân Đồn",
    image: "/concept2_SaSung.png",
    story: "Sản vật trân quý ngàn năm từ bãi triều Vân Đồn, mang vị ngọt hậu tự nhiên sâu lắng của biển cả, hòa cùng hạt tiêu rừng cay dịu.",
    ingredients: ["Sá sùng đảo Vân Đồn", "Muối hầm thảo dược", "Tiêu rừng Phú Quốc"],
    pairingNote: "Vang trắng Sauvignon Blanc thanh mát khoáng đạt",
    options: [
      { id: "std", name: "Nướng giòn muối tiêu truyền thống", isDefault: true },
      { id: "crispy_fried", name: "Chiên phồng giòn rụm", desc: "Vị bùi béo đậm đà hơn" },
    ],
  },
  {
    index: 3,
    name: "Bào Ngư Om Rượu Nếp",
    description:
      "Bào ngư biển lạnh Nha Trang om đượm men rượu nếp cái hoa vàng sóng sánh ngậy thơm.",
    region: "Nha Trang",
    image: "/concept2_BaoNgu.png",
    story: "Bào ngư tươi giòn sần sật từ rạn san hô Nha Trang thẩm thấu vị ngọt thanh dịu dàng của men rượu nếp cổ truyền, ấm nồng và vương vấn.",
    ingredients: ["Bào ngư biển Nha Trang", "Rượu nếp cái hoa vàng", "Nước cốt gừng già và táo đỏ"],
    pairingNote: "Trà Ô long thượng đỉnh hoặc Vang trắng Chardonnay ủ gỗ sồi",
    options: [
      { id: "std", name: "Om rượu nếp sóng sánh chuẩn vị", isDefault: true },
      { id: "mild_wine", name: "Giảm độ nồng rượu (Thanh nhẹ)", desc: "Tôn vị ngọt tự nhiên của bào ngư" },
    ],
  },
  {
    index: 4,
    name: "Canh Ngọc Yến",
    description:
      "Yến sào đảo yến Khánh Hòa hòa cùng hạt sen Cổ Ngự Hồ Tây, nghi thức rót tại bàn.",
    region: "Khánh Hòa · Hà Nội",
    image: "/concept2_CanhYen.png",
    story: "Sự kết tinh giữa báu vật yến sào Khánh Hòa và hạt sen Cổ Ngự đài các đất Thăng Long. Nước dùng trong vắt được rót ấm nóng tại bàn, thanh lọc từng giác quan.",
    ingredients: ["Yến sào thiên nhiên Khánh Hòa", "Hạt sen Cổ Ngự Hồ Tây", "Nước dùng bồ câu thanh nhã"],
    pairingNote: "Trà hoa cúc tiến vua ủ ấm",
    options: [
      { id: "std", name: "Nghi thức rót nước dùng nóng tại bàn", isDefault: true },
      { id: "extra_lotus", name: "Thêm hạt sen Cổ Ngự bùi béo", desc: "Tăng vị thơm ngọt dịu mát" },
    ],
  },
  {
    index: 5,
    name: "Thịt Ngọc Áp Chảo",
    description:
      "Thăn phi-lê cá tầm áp chảo xém vàng — cùng một con cá với món Tuyết Cá Tầm mở đầu.",
    region: "Đà Lạt",
    image: "/concept2_ThitNgocApChao.png",
    story: "Tôn vinh triết lý trọn vẹn của ẩm thực đỉnh cao: sử dụng cùng một chú cá tầm quý giá từ phần trứng mở màn đến thớ thịt ngọc áp chảo thơm lừng, da giòn thịt mọng.",
    ingredients: ["Thăn cá tầm tươi", "Bơ thảo mộc núi rừng", "Sốt nhụy hoa nghệ tây và chanh vàng"],
    pairingNote: "Vang trắng Riesling hoặc Vang cam (Orange Wine)",
    options: [
      { id: "std", name: "Áp chảo da giòn thịt mọng", isDefault: true },
      { id: "herb_steamed", name: "Hấp thảo mộc thanh vị", desc: "Dành cho khách chuộng vị thanh đạm" },
    ],
  },
  {
    index: 6,
    name: "Đông Tảo Quay Mắc Khén",
    description:
      "Gà tiến vua Đông Tảo Hưng Yên da giòn đượm hương mắc khén rừng, kèm cơm cháy gạo ST25.",
    region: "Hưng Yên · Tây Bắc",
    image: "/concept2_Ga.png",
    story: "Đặc sản gà Đông Tảo tiến vua trứ danh với thớ thịt săn ngọt giòn sần sật, hòa quyện hương thơm nồng nàn của hạt mắc khén Tây Bắc và hạt cơm cháy ST25 vàng ruộm.",
    ingredients: ["Gà Đông Tảo Hưng Yên", "Hạt mắc khén và hạt dổi rừng", "Cơm cháy gạo tiến vua ST25"],
    pairingNote: "Vang đỏ Pinot Noir hoặc Syrah đậm đà",
    options: [
      { id: "std", name: "Quay da giòn kèm cơm cháy ST25", isDefault: true },
      { id: "mild_spice", name: "Giảm độ nồng mắc khén", desc: "Vị cay thanh dịu nhẹ" },
    ],
  },
  {
    index: 7,
    name: "Trầm và Sen",
    description:
      "Nhãn lồng bọc hạt sen cung đình kết hợp nghi thức trà Shan tuyết cổ thụ 3 lần rót.",
    region: "Cung Đình Huế",
    image: "/concept2_TramvaSen.png",
    story: "Chương kết trọn vẹn của hành trình: hương trầm thoang thoảng quện trong vị ngọt ngào nhãn lồng hạt sen cung đình, hòa cùng nghi thức trà Shan tuyết 3 lần rót thanh tao.",
    ingredients: ["Nhãn lồng mọng nước", "Hạt sen cung đình", "Trà Shan tuyết cổ thụ 300 năm"],
    pairingNote: "Nghi thức trà Shan tuyết cổ thụ 3 lần rót độc bản",
    options: [
      { id: "std", name: "Ngọt thanh vương hương Trầm", isDefault: true },
      { id: "low_sweet", name: "Ít ngọt thanh tao (Low sugar)", desc: "Vị trà Shan tuyết nổi bật" },
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
      "Món Thịt Ngọc Áp Chảo và Canh Ngọc Yến là những đoản khúc thăng hoa nhất tôi được thưởng thức trong năm nay. Wine pairing chọn rượu rất táo bạo và tinh tế.",
    stars: 5,
  },
] as const;
