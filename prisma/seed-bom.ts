import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Bảng E: Đơn giá nguyên liệu đặc biệt & gia vị (chuẩn theo Bảng B & E tài liệu Bếp & Kho)
export const CONCEPT2_INGREDIENTS = [
  // 1. Đạm
  {
    id: "caviar-lam-dong",
    name: "Trứng cá tầm muối Lâm Đồng (caviar) — trung cấp lai",
    unit: "g",
    group: "PROTEIN",
    spec: "Cao nguyên Lâm Đồng · Hũ 30–50g giữ chuỗi lạnh",
    defaultImportPrice: 20000000, // 20.000 đ/g (20 tr/kg)
    currentStock: 1200,
    minStock: 300,
  },
  {
    id: "sa-sung-van-don",
    name: "Sá sùng khô đảo Vân Đồn — loại đặc biệt",
    unit: "g",
    group: "PROTEIN",
    spec: "Vân Đồn, Quảng Ninh · Túi zip 500g",
    defaultImportPrice: 6000000, // 6.000 đ/g (6 tr/kg)
    currentStock: 800,
    minStock: 200,
  },
  {
    id: "bao-ngu-nha-trang",
    name: "Bào ngư biển lạnh Nha Trang (nguyên con ~65 g)",
    unit: "g",
    group: "PROTEIN",
    spec: "Nha Trang, Khánh Hòa · Size ~15 con/kg tươi sống",
    defaultImportPrice: 800000, // 800 đ/g (800k/kg)
    currentStock: 2500,
    minStock: 500,
  },
  {
    id: "yen-sao-khanh-hoa",
    name: "Yến sào tinh chế Khánh Hòa (yến nhà loại 1)",
    unit: "g",
    group: "PROTEIN",
    spec: "Khánh Hòa · Yến tinh chế hộp 100g",
    defaultImportPrice: 32000000, // 32.000 đ/g (32 tr/kg)
    currentStock: 350,
    minStock: 100,
  },
  {
    id: "ga-ta-nuoc-dung",
    name: "Gà ta thả vườn (nước dùng chưng 6 giờ)",
    unit: "g",
    group: "PROTEIN",
    spec: "Nội địa · Gà ta chưng cô 6 giờ lấy nước dùng",
    defaultImportPrice: 150000, // 150 đ/g (150k/kg)
    currentStock: 4000,
    minStock: 1000,
  },
  {
    id: "ca-tam-da-lat",
    name: "Fillet cá tầm Lâm Đồng",
    unit: "g",
    group: "PROTEIN",
    spec: "Cao nguyên Lâm Đồng · Fillet cá tầm tươi sống",
    defaultImportPrice: 320000, // 320 đ/g (320k/kg)
    currentStock: 5000,
    minStock: 1500,
  },
  {
    id: "ga-dong-tao",
    name: "Đùi gà Đông Tảo Hưng Yên (thuần chủng, tuyển)",
    unit: "g",
    group: "PROTEIN",
    spec: "Hưng Yên · Đùi gà thuần chủng đặt lô 5kg",
    defaultImportPrice: 1000000, // 1.000 đ/g (1 tr/kg)
    currentStock: 6000,
    minStock: 2000,
  },

  // 2. Tinh bột
  {
    id: "banh-da-nem",
    name: "Đế bánh đa nem nướng",
    unit: "g",
    group: "STARCH",
    spec: "Hải Dương / Hải Phòng · Bánh đa khô nướng giòn",
    defaultImportPrice: 90000, // 90 đ/g (90k/kg)
    currentStock: 2000,
    minStock: 500,
  },
  {
    id: "banh-mi-men-tuoi",
    name: "Bánh mì men tươi artisan — bánh chào mừng",
    unit: "g",
    group: "STARCH",
    spec: "Nội địa · Bếp TRẦM tự làm thủ công",
    defaultImportPrice: 100000, // 100 đ/g (100k/kg)
    currentStock: 3000,
    minStock: 600,
  },
  {
    id: "com-chay-st25",
    name: "Gạo ST25 (làm cơm cháy)",
    unit: "g",
    group: "STARCH",
    spec: "Sóc Trăng · Gạo ST25 chuẩn xuất khẩu chiên giòn",
    defaultImportPrice: 40000, // 40 đ/g (40k/kg)
    currentStock: 3500,
    minStock: 800,
  },

  // 3. Sữa & chất béo
  {
    id: "kem-chua",
    name: "Kem chua (sour cream) Tatua đánh bông",
    unit: "g",
    group: "DAIRY_FAT",
    spec: "Nội địa — Hộp 1 kg đánh bông mịn",
    defaultImportPrice: 200000, // 200 đ/g (200k/kg)
    currentStock: 1500,
    minStock: 400,
  },
  {
    id: "bo-lat-president",
    name: "Bơ lạt President (Pháp)",
    unit: "g",
    group: "DAIRY_FAT",
    spec: "Nhập khẩu Pháp · Bơ lạt sỉ làm bánh & áp chảo",
    defaultImportPrice: 350000, // 350 đ/g (350k/kg)
    currentStock: 1800,
    minStock: 500,
  },
  {
    id: "kem-tuoi-whipping",
    name: "Kem tươi whipping Anchor (làm kem trầm hương)",
    unit: "g",
    group: "DAIRY_FAT",
    spec: "New Zealand · Whipping Cream Anchor hộp 1 lít",
    defaultImportPrice: 160000, // 160 đ/g (160k/kg)
    currentStock: 2000,
    minStock: 500,
  },

  // 4. Trái cây & hạt
  {
    id: "sen-co-ngu",
    name: "Hạt sen Cổ Ngự Hồ Tây (tuyển)",
    unit: "g",
    group: "FRUIT_NUT",
    spec: "Hồ Tây, Hà Nội · Sen tươi Cổ Ngự tuyển đặc sản",
    defaultImportPrice: 700000, // 700 đ/g (700k/kg)
    currentStock: 2000,
    minStock: 500,
  },
  {
    id: "hat-dieu-rang-muoi",
    name: "Hạt điều rang muối (hạt rừng)",
    unit: "g",
    group: "FRUIT_NUT",
    spec: "Bình Phước · Nguyên hạt còn vỏ lụa",
    defaultImportPrice: 300000, // 300 đ/g (300k/kg)
    currentStock: 1500,
    minStock: 400,
  },
  {
    id: "nhan-long-hung-yen",
    name: "Nhãn lồng Hưng Yên (sơ chế tách hạt)",
    unit: "g",
    group: "FRUIT_NUT",
    spec: "Hưng Yên · Nhãn mọng nước cùi dày",
    defaultImportPrice: 120000, // 120 đ/g (120k/kg)
    currentStock: 3500,
    minStock: 800,
  },

  // 5. Gia vị & nước dùng đặc biệt
  {
    id: "hoa-tieu-rung",
    name: "Hoa tiêu rừng Tuyên Quang",
    unit: "g",
    group: "SEASONING",
    spec: "Tuyên Quang · Tiêu rừng Măng Đen / Tuyên Quang",
    defaultImportPrice: 400000, // 400 đ/g (400k/kg)
    currentStock: 1000,
    minStock: 300,
  },
  {
    id: "ruou-nep-cai",
    name: "Rượu nếp cái hoa vàng — nướng ấm",
    unit: "ml",
    group: "SEASONING",
    spec: "Nội địa · Can 5 lít ủ chum thơm",
    defaultImportPrice: 100000, // 100 đ/ml (100k/lít)
    currentStock: 4000,
    minStock: 1000,
  },
  {
    id: "nuoc-cot-ga-ta",
    name: "Nước cốt gà thả vườn — chưng cô (phân bổ)",
    unit: "ml",
    group: "SEASONING",
    spec: "Nội địa · Nước cốt gà ta nguyên chất",
    defaultImportPrice: 190000, // 190 đ/ml (190k/lít)
    currentStock: 3000,
    minStock: 800,
  },
  {
    id: "chanh-day-cot",
    name: "Chanh dây — cốt (Đà Lạt)",
    unit: "g",
    group: "SEASONING",
    spec: "Đà Lạt · Cốt chiết xuất 40% khối lượng",
    defaultImportPrice: 120000, // 120 đ/g (120k/kg)
    currentStock: 2000,
    minStock: 500,
  },
  {
    id: "mat-ong-rung",
    name: "Mật ong rừng Tây Bắc",
    unit: "g",
    group: "SEASONING",
    spec: "Tây Bắc · Mật ong khoái rừng nguyên chất",
    defaultImportPrice: 250000, // 250 đ/g (250k/kg)
    currentStock: 2500,
    minStock: 600,
  },
  {
    id: "muoi-ot-hoa-trang-tri",
    name: "Muối ớt & hoa trang trí — chào mừng",
    unit: "g",
    group: "SEASONING",
    spec: "Nội địa · Muối ớt Tây Ninh, hoa & phụ theo phần",
    defaultImportPrice: 500000, // 500 đ/phần
    currentStock: 1000,
    minStock: 200,
  },

  // 6. Hương liệu & trà
  {
    id: "mac-khen-tay-bac",
    name: "Mắc khén Tây Bắc (rang, giã)",
    unit: "g",
    group: "AROMATIC",
    spec: "Tây Bắc · Hạt mắc khén rang thơm",
    defaultImportPrice: 350000, // 350 đ/g (350k/kg)
    currentStock: 800,
    minStock: 200,
  },
  {
    id: "huong-tram-tam-uop",
    name: "Hương trầm — tẩm ướp (phân bổ)",
    unit: "g",
    group: "AROMATIC",
    spec: "Nội địa · Trầm hương tự nhiên phân bổ theo phần",
    defaultImportPrice: 1200000, // 1.200 đ/phần
    currentStock: 1000,
    minStock: 200,
  },
  {
    id: "phu-trang-tri-trang-mieng",
    name: "Phụ trang trí tráng miệng (vừng rang, hoa, bánh kẹp)",
    unit: "g",
    group: "PRODUCE",
    spec: "Nội địa · Vừng rang, cánh hoa, bánh kẹp giòn",
    defaultImportPrice: 1000000, // 1.000 đ/phần
    currentStock: 1000,
    minStock: 200,
  },
  {
    id: "tra-shan-tuyet",
    name: "Trà Shan tuyết cổ thụ Tà Xùa",
    unit: "g",
    group: "AROMATIC",
    spec: "Tà Xùa, Tây Bắc · Búp trà cổ thụ >100 tuổi",
    defaultImportPrice: 1200000, // 1.200 đ/g (1.200k/kg)
    currentStock: 1500,
    minStock: 400,
  },

  // 7. Các dòng gia vị gộp theo phần (E2)
  {
    id: "gia-vi-mon-1",
    name: "Gia vị cơ bản & phụ liệu Món 1 (chanh vàng, tía tô non)",
    unit: "g",
    group: "PRODUCE",
    spec: "Chanh vàng vỏ 25g x 50đ + tía tô non 8g x 60đ",
    defaultImportPrice: 1730000, // 1.730 đ/phần
    currentStock: 1000,
    minStock: 200,
  },
  {
    id: "gia-vi-mon-2",
    name: "Gia vị cơ bản & phụ liệu Món 2 (muối hạt, gừng, sả)",
    unit: "g",
    group: "SEASONING",
    spec: "Muối hạt 6g x 25đ + gừng 7g x 50đ + sả 5g x 40đ",
    defaultImportPrice: 700000, // 700 đ/phần
    currentStock: 1000,
    minStock: 200,
  },
  {
    id: "gia-vi-mon-3",
    name: "Gia vị cơ bản & phụ liệu Món 3 (hành boa rô)",
    unit: "g",
    group: "PRODUCE",
    spec: "Hành boa rô 10g x 50đ",
    defaultImportPrice: 500000, // 500 đ/phần
    currentStock: 1000,
    minStock: 200,
  },
  {
    id: "gia-vi-mon-4",
    name: "Gia vị cơ bản & phụ liệu Món 4 (hành khô, gừng)",
    unit: "g",
    group: "SEASONING",
    spec: "Hành khô nướng 4g x 60đ + gừng 2g x 50đ",
    defaultImportPrice: 340000, // 340 đ/phần
    currentStock: 1000,
    minStock: 200,
  },
  {
    id: "gia-vi-mon-6",
    name: "Gia vị cơ bản & phụ liệu Món 6 (dầu ăn, mắm, tỏi, đường cát)",
    unit: "g",
    group: "SEASONING",
    spec: "Dầu 15ml x 35đ + mắm 8g x 30đ + tỏi 5g x 40đ + đường 3g x 20đ",
    defaultImportPrice: 1025000, // 1.025 đ/phần
    currentStock: 1000,
    minStock: 200,
  },
  {
    id: "gia-vi-mon-7",
    name: "Gia vị cơ bản & phụ liệu Món 7 (đường phèn, sữa tươi, đường cát)",
    unit: "g",
    group: "SEASONING",
    spec: "Đường phèn 40g x 45đ + sữa tươi 10g x 28đ + đường 5g x 20đ",
    defaultImportPrice: 2180000, // 2.180 đ/phần
    currentStock: 1000,
    minStock: 200,
  },

  // 8. Khoản phân bổ vận hành ngoài 7 món (Bảng E)
  {
    id: "than-hoa-hong",
    name: "Than hoa hồng (than trắng, nướng)",
    unit: "g",
    group: "SEASONING",
    spec: "Nhập khẩu / nội địa · Kỹ thuật nướng (phân bổ)",
    defaultImportPrice: 40000, // 40.000 đ/kg
    currentStock: 20000,
    minStock: 5000,
  },
  {
    id: "rau-thom-hoa-trang-tri",
    name: "Rau thơm & hoa trang trí đĩa",
    unit: "g",
    group: "PRODUCE",
    spec: "Đà Lạt · Trình bày món (phân bổ)",
    defaultImportPrice: 150000, // 150.000 đ/kg
    currentStock: 5000,
    minStock: 1000,
  },
];

// Bảng B: Menu Tiến Vua · Bảy Báu Vật Việt (1.290.000 đ/khách) — Đúng 35 dòng định lượng
export const CONCEPT2_DISHES = [
  {
    dishIndex: 1,
    dishName: "Tuyết Cá Tầm",
    portion: "1 khách",
    method: "Ướp lạnh & Mở hộp tại bàn",
    note: "Khởi đầu tinh tế với caviar Lâm Đồng mở lọ trước mặt thực khách.",
    variants: [
      {
        optionId: "std",
        optionName: "Mở hộp caviar tại bàn",
        isDefault: true,
        note: "Chuẩn vị fine dining",
        lines: [
          { ingredientId: "caviar-lam-dong", qtyPerGuest: 4, unit: "g", prepNote: "Hũ caviar Lâm Đồng trung cấp lai ướp lạnh" },
          { ingredientId: "banh-da-nem", qtyPerGuest: 30, unit: "g", prepNote: "Đế bánh đa nem nướng giòn" },
          { ingredientId: "kem-chua", qtyPerGuest: 15, unit: "g", prepNote: "Kem chua Tatua đánh bông mịn" },
          { ingredientId: "tra-shan-tuyet", qtyPerGuest: 5, unit: "g", prepNote: "Nghi thức trà chào mừng dùng chung cả menu" },
          { ingredientId: "banh-mi-men-tuoi", qtyPerGuest: 60, unit: "g", prepNote: "Bánh mì men tươi artisan chào mừng" },
          { ingredientId: "bo-lat-president", qtyPerGuest: 10, unit: "g", prepNote: "Bơ lạt President ăn kèm bánh chào mừng" },
          { ingredientId: "mat-ong-rung", qtyPerGuest: 5, unit: "g", prepNote: "Mật ong rừng Tây Bắc ăn kèm bánh" },
          { ingredientId: "muoi-ot-hoa-trang-tri", qtyPerGuest: 1, unit: "g", prepNote: "Muối ớt Tây Ninh & hoa trang trí theo phần" },
          { ingredientId: "gia-vi-mon-1", qtyPerGuest: 1, unit: "g", prepNote: "Chanh vàng vỏ bào 25g, tía tô non 8g" },
        ],
      },
    ],
  },
  {
    dishIndex: 2,
    dishName: "Sá Sùng Muối Tiêu",
    portion: "1 khách",
    method: "Nướng than thảo mộc",
    note: "Sản vật bãi triều Vân Đồn từng tiến vua.",
    variants: [
      {
        optionId: "std",
        optionName: "Nướng giòn muối tiêu truyền thống",
        isDefault: true,
        note: "Vị ngọt hậu tự nhiên của sá sùng",
        lines: [
          { ingredientId: "sa-sung-van-don", qtyPerGuest: 3, unit: "g", prepNote: "Sá sùng khô Vân Đồn loại đặc biệt nướng than hoa" },
          { ingredientId: "hoa-tieu-rung", qtyPerGuest: 2, unit: "g", prepNote: "Hoa tiêu rừng Tuyên Quang rang giã thơm" },
          { ingredientId: "gia-vi-mon-2", qtyPerGuest: 1, unit: "g", prepNote: "Muối hạt 6g, gừng tươi 7g, sả tươi 5g" },
        ],
      },
    ],
  },
  {
    dishIndex: 3,
    dishName: "Bào Ngư Om Rượu Nếp",
    portion: "1 khách",
    method: "Om chậm men rượu nếp cái hoa vàng",
    note: "Hòa quyện vị biển Nha Trang và men say đồng bằng.",
    variants: [
      {
        optionId: "std",
        optionName: "Om rượu nếp sóng sánh chuẩn vị",
        isDefault: true,
        note: "Vị ngọt men nồng nàn",
        lines: [
          { ingredientId: "bao-ngu-nha-trang", qtyPerGuest: 65, unit: "g", prepNote: "Bào ngư biển lạnh Nha Trang nguyên con ~65g làm sạch" },
          { ingredientId: "ruou-nep-cai", qtyPerGuest: 30, unit: "ml", prepNote: "Rượu nếp cái hoa vàng nướng ấm khử tanh" },
          { ingredientId: "nuoc-cot-ga-ta", qtyPerGuest: 20, unit: "ml", prepNote: "Nước cốt gà thả vườn chưng cô đặc phân bổ" },
          { ingredientId: "gia-vi-mon-3", qtyPerGuest: 1, unit: "g", prepNote: "Hành boa rô 10g" },
        ],
      },
    ],
  },
  {
    dishIndex: 4,
    dishName: "Canh Ngọc Yến",
    portion: "1 khách",
    method: "Tiềm thanh nhã & Rót tại bàn",
    note: "Sự kết tinh của yến sào Khánh Hòa và sen Cổ Ngự Hồ Tây.",
    variants: [
      {
        optionId: "std",
        optionName: "Nghi thức rót nước dùng nóng tại bàn",
        isDefault: true,
        note: "Nước dùng trong vắt, bốc khói nghi ngút",
        lines: [
          { ingredientId: "yen-sao-khanh-hoa", qtyPerGuest: 2.5, unit: "g", prepNote: "Yến sào tinh chế Khánh Hòa chưng cách thủy" },
          { ingredientId: "sen-co-ngu", qtyPerGuest: 8, unit: "g", prepNote: "Hạt sen Cổ Ngự Hồ Tây tuyển chọn hấp bở" },
          { ingredientId: "ga-ta-nuoc-dung", qtyPerGuest: 75, unit: "g", prepNote: "Nước dùng gà ta thả vườn chưng 6 giờ phân bổ" },
          { ingredientId: "gia-vi-mon-4", qtyPerGuest: 1, unit: "g", prepNote: "Hành khô nướng 4g, gừng 2g" },
        ],
      },
    ],
  },
  {
    dishIndex: 5,
    dishName: "Thịt Ngọc Áp Chảo",
    portion: "1 khách",
    method: "Áp chảo chảo gang bơ thảo mộc",
    note: "Cùng một chú cá tầm với món số 1, triết lý sử dụng trọn vẹn nguyên liệu.",
    variants: [
      {
        optionId: "std",
        optionName: "Áp chảo da giòn thịt mọng",
        isDefault: true,
        note: "Thăn cá mọng nước, da giòn rụm",
        lines: [
          { ingredientId: "ca-tam-da-lat", qtyPerGuest: 100, unit: "g", prepNote: "Fillet cá tầm Lâm Đồng áp chảo da giòn" },
          { ingredientId: "bo-lat-president", qtyPerGuest: 15, unit: "g", prepNote: "Bơ lạt President Pháp áp chảo" },
          { ingredientId: "chanh-day-cot", qtyPerGuest: 15, unit: "g", prepNote: "Cốt chanh dây Đà Lạt tạo vị chua thanh" },
          { ingredientId: "hat-dieu-rang-muoi", qtyPerGuest: 10, unit: "g", prepNote: "Hạt điều rang muối Bình Phước rắc giòn" },
        ],
      },
    ],
  },
  {
    dishIndex: 6,
    dishName: "Đông Tảo Quay Mắc Khén",
    portion: "1 khách",
    method: "Quay giòn da đượm hương rừng Tây Bắc",
    note: "Đặc sản gà tiến vua Hưng Yên kết hợp gia vị đại ngàn và gạo ST25.",
    variants: [
      {
        optionId: "std",
        optionName: "Quay da giòn kèm cơm cháy ST25",
        isDefault: true,
        note: "Da gà giòn sần sật, cơm cháy vàng ruộm",
        lines: [
          { ingredientId: "ga-dong-tao", qtyPerGuest: 110, unit: "g", prepNote: "Đùi gà Đông Tảo Hưng Yên thuần chủng tuyển" },
          { ingredientId: "com-chay-st25", qtyPerGuest: 50, unit: "g", prepNote: "Cơm cháy gạo ST25 chiên giòn ăn kèm" },
          { ingredientId: "mat-ong-rung", qtyPerGuest: 15, unit: "g", prepNote: "Mật ong rừng glaze da gà óng ả" },
          { ingredientId: "mac-khen-tay-bac", qtyPerGuest: 2, unit: "g", prepNote: "Mắc khén Tây Bắc rang giã xát da gà" },
          { ingredientId: "gia-vi-mon-6", qtyPerGuest: 1, unit: "g", prepNote: "Dầu ăn 15ml, nước mắm 8g, tỏi 5g, đường 3g" },
        ],
      },
    ],
  },
  {
    dishIndex: 7,
    dishName: "Trầm và Sen — Chè sen Cổ Ngự, nhãn lồng, kem trầm hương",
    portion: "1 khách",
    method: "Nấu nước đường phèn thanh tao & Nghi thức trà 3 lần rót",
    note: "Chương kết trọn vẹn: hương trầm bảng lảng quện vị ngọt sen nhãn và trà cổ thụ.",
    variants: [
      {
        optionId: "std",
        optionName: "Ngọt thanh vương hương Trầm",
        isDefault: true,
        note: "Hương vị cung đình tao nhã",
        lines: [
          { ingredientId: "nhan-long-hung-yen", qtyPerGuest: 160, unit: "g", prepNote: "Nhãn lồng Hưng Yên sơ chế tách hạt" },
          { ingredientId: "kem-tuoi-whipping", qtyPerGuest: 20, unit: "g", prepNote: "Kem tươi whipping Anchor New Zealand làm kem trầm" },
          { ingredientId: "huong-tram-tam-uop", qtyPerGuest: 1, unit: "g", prepNote: "Hương trầm tẩm ướp phân bổ theo phần" },
          { ingredientId: "phu-trang-tri-trang-mieng", qtyPerGuest: 1, unit: "g", prepNote: "Phụ trang trí tráng miệng (vừng rang, hoa, bánh kẹp)" },
          { ingredientId: "tra-shan-tuyet", qtyPerGuest: 5, unit: "g", prepNote: "Trà Shan tuyết cổ thụ Tà Xùa pha kèm món" },
          { ingredientId: "gia-vi-mon-7", qtyPerGuest: 1, unit: "g", prepNote: "Đường phèn 40g, sữa tươi 10g, đường cát 5g" },
        ],
      },
    ],
  },
];

export async function seedBomDatabase() {
  console.log("🌱 Bắt đầu seed phân hệ Công thức BOM Bảng B & Bảng E...");

  // 1. Seed Ingredients
  for (const ing of CONCEPT2_INGREDIENTS) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: {
        name: ing.name,
        unit: ing.unit,
        group: ing.group,
        spec: ing.spec,
        defaultImportPrice: ing.defaultImportPrice,
        currentStock: ing.currentStock,
        minStock: ing.minStock,
      },
      create: ing,
    });
  }
  console.log(`✅ Đã seed ${CONCEPT2_INGREDIENTS.length} nguyên liệu.`);

  // 2. Seed Dishes & Variants & Lines
  for (const dish of CONCEPT2_DISHES) {
    const dishRecord = await prisma.dishRecipe.upsert({
      where: { dishIndex: dish.dishIndex },
      update: {
        dishName: dish.dishName,
        portion: dish.portion,
        method: dish.method,
        note: dish.note,
      },
      create: {
        dishIndex: dish.dishIndex,
        dishName: dish.dishName,
        portion: dish.portion,
        method: dish.method,
        note: dish.note,
      },
    });

    // Xóa các biến thể cũ không còn dùng trong cấu hình mới của món
    const currentOptionIds = dish.variants.map((v) => v.optionId);
    await prisma.recipeVariant.deleteMany({
      where: {
        recipeId: dishRecord.id,
        optionId: { notIn: currentOptionIds },
      },
    });

    for (const variant of dish.variants) {
      const variantRecord = await prisma.recipeVariant.upsert({
        where: {
          recipeId_optionId: {
            recipeId: dishRecord.id,
            optionId: variant.optionId,
          },
        },
        update: {
          optionName: variant.optionName,
          isDefault: variant.isDefault,
          note: variant.note,
        },
        create: {
          recipeId: dishRecord.id,
          optionId: variant.optionId,
          optionName: variant.optionName,
          isDefault: variant.isDefault,
          note: variant.note,
        },
      });

      // Clear old lines for this variant before inserting new lines
      await prisma.recipeLine.deleteMany({
        where: { variantId: variantRecord.id },
      });

      for (const line of variant.lines) {
        await prisma.recipeLine.create({
          data: {
            variantId: variantRecord.id,
            ingredientId: line.ingredientId,
            qtyPerGuest: line.qtyPerGuest,
            unit: line.unit,
            prepNote: line.prepNote,
          },
        });
      }
    }
  }

  console.log(`✅ Đã seed 7 món công thức BOM Bảng B (35 dòng) thành công!`);
}

// Chạy trực tiếp nếu file được gọi từ CLI (tsx / node)
const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]?.replace(/\\/g, "/").endsWith("seed-bom.ts"));

if (isDirectRun) {
  seedBomDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
