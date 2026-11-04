import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const CONCEPT2_INGREDIENTS = [
  // Đạm
  {
    id: "caviar-lam-dong",
    name: "Trứng cá tầm Caviar Lâm Đồng",
    unit: "g",
    group: "PROTEIN",
    spec: "Lọ 20g ướp lạnh, mở tại bàn",
    defaultImportPrice: 2500000,
    currentStock: 1200,
    minStock: 300,
  },
  {
    id: "sa-sung-van-don",
    name: "Sá sùng đảo Vân Đồn",
    unit: "g",
    group: "PROTEIN",
    spec: "Sấy khô thượng hạng, nướng giòn",
    defaultImportPrice: 4200000,
    currentStock: 800,
    minStock: 200,
  },
  {
    id: "bao-ngu-nha-trang",
    name: "Bào ngư biển Nha Trang",
    unit: "g",
    group: "PROTEIN",
    spec: "Bào ngư sống, khía hoa thị",
    defaultImportPrice: 1200000,
    currentStock: 2500,
    minStock: 500,
  },
  {
    id: "yen-sao-khanh-hoa",
    name: "Yến sào thiên nhiên Khánh Hòa",
    unit: "g",
    group: "PROTEIN",
    spec: "Tổ yến tinh chế hấp chín",
    defaultImportPrice: 38000000,
    currentStock: 350,
    minStock: 100,
  },
  {
    id: "ca-tam-da-lat",
    name: "Thăn cá tầm Đà Lạt",
    unit: "g",
    group: "PROTEIN",
    spec: "Phi lê rút xương, da khía mỏng",
    defaultImportPrice: 320000,
    currentStock: 5000,
    minStock: 1500,
  },
  {
    id: "ga-dong-tao",
    name: "Gà tiến vua Đông Tảo Hưng Yên",
    unit: "g",
    group: "PROTEIN",
    spec: "Thịt giòn sần sật, ướp mắc khén",
    defaultImportPrice: 450000,
    currentStock: 6000,
    minStock: 2000,
  },

  // Tinh bột
  {
    id: "banh-blini",
    name: "Bánh blini kiều mạch",
    unit: "g",
    group: "STARCH",
    spec: "Nướng nóng giòn tại bếp bánh",
    defaultImportPrice: 90000,
    currentStock: 2000,
    minStock: 500,
  },
  {
    id: "com-chay-st25",
    name: "Cơm cháy gạo ST25",
    unit: "g",
    group: "STARCH",
    spec: "Ép mỏng chiên phồng giòn ruộm",
    defaultImportPrice: 80000,
    currentStock: 3500,
    minStock: 800,
  },

  // Sữa & chất béo
  {
    id: "kem-chua",
    name: "Kem chua thảo mộc (Sour cream)",
    unit: "g",
    group: "DAIRY_FAT",
    spec: "Đánh mịn, bảo quản lạnh",
    defaultImportPrice: 180000,
    currentStock: 1500,
    minStock: 400,
  },
  {
    id: "bo-thao-moc",
    name: "Bơ thảo mộc núi rừng Đà Lạt",
    unit: "g",
    group: "DAIRY_FAT",
    spec: "Bơ lạt ngâm xạ hương, hương thảo",
    defaultImportPrice: 260000,
    currentStock: 1800,
    minStock: 500,
  },
  {
    id: "dau-thuc-vat",
    name: "Dầu thực vật cao cấp",
    unit: "ml",
    group: "DAIRY_FAT",
    spec: "Dầu hạt cải ép lạnh",
    defaultImportPrice: 65000,
    currentStock: 8000,
    minStock: 2000,
  },

  // Rau củ & nấm
  {
    id: "he-la-nho",
    name: "Hẹ lá nhỏ hữu cơ",
    unit: "g",
    group: "PRODUCE",
    spec: "Thái mịn rắc mặt",
    defaultImportPrice: 60000,
    currentStock: 800,
    minStock: 200,
  },
  {
    id: "rau-ram-rung",
    name: "Rau răm rừng và lá chanh",
    unit: "g",
    group: "PRODUCE",
    spec: "Nhặt búp non",
    defaultImportPrice: 50000,
    currentStock: 1000,
    minStock: 300,
  },
  {
    id: "nam-dong-trung",
    name: "Đông trùng hạ thảo tươi",
    unit: "g",
    group: "PRODUCE",
    spec: "Ngọn nấm tươi vàng ươm",
    defaultImportPrice: 800000,
    currentStock: 400,
    minStock: 100,
  },
  {
    id: "mang-tay-da-lat",
    name: "Măng tây xanh Đà Lạt",
    unit: "g",
    group: "PRODUCE",
    spec: "Áp chảo giòn ngọt",
    defaultImportPrice: 95000,
    currentStock: 2500,
    minStock: 600,
  },
  {
    id: "rau-rung-tay-bac",
    name: "Rau thơm và hoa chuối rừng",
    unit: "g",
    group: "PRODUCE",
    spec: "Thái sợi ngâm chanh giòn",
    defaultImportPrice: 40000,
    currentStock: 1500,
    minStock: 400,
  },
  {
    id: "canh-sen-hong",
    name: "Cánh sen hồng và hoa nhài tươi",
    unit: "g",
    group: "PRODUCE",
    spec: "Trang trí và ướp hương chè",
    defaultImportPrice: 150000,
    currentStock: 500,
    minStock: 150,
  },

  // Trái cây & hạt
  {
    id: "tao-do-tan-cuong",
    name: "Táo đỏ và kỷ tử hữu cơ",
    unit: "g",
    group: "FRUIT_NUT",
    spec: "Ngâm nở mềm, bỏ hạt",
    defaultImportPrice: 280000,
    currentStock: 1200,
    minStock: 300,
  },
  {
    id: "sen-co-ngu",
    name: "Hạt sen Cổ Ngự Hồ Tây",
    unit: "g",
    group: "FRUIT_NUT",
    spec: "Sen tươi hấp chín bùi",
    defaultImportPrice: 350000,
    currentStock: 2000,
    minStock: 500,
  },
  {
    id: "nhan-long-hung-yen",
    name: "Nhãn lồng Hưng Yên mọng nước",
    unit: "g",
    group: "FRUIT_NUT",
    spec: "Bóc vỏ khéo léo, tách hạt",
    defaultImportPrice: 120000,
    currentStock: 3500,
    minStock: 800,
  },
  {
    id: "hat-sen-cung-dinh",
    name: "Hạt sen cung đình Huế",
    unit: "g",
    group: "FRUIT_NUT",
    spec: "Ninh nhừ lồng trong cùi nhãn",
    defaultImportPrice: 240000,
    currentStock: 2500,
    minStock: 600,
  },

  // Gia vị & nước dùng
  {
    id: "muoi-ham-thao-duoc",
    name: "Muối hầm thảo dược Hoàng Liên Sơn",
    unit: "g",
    group: "SEASONING",
    spec: "Rang khô thảo dược",
    defaultImportPrice: 80000,
    currentStock: 2000,
    minStock: 500,
  },
  {
    id: "tieu-rung-phu-quoc",
    name: "Tiêu rừng Phú Quốc",
    unit: "g",
    group: "SEASONING",
    spec: "Đập dập thơm cay",
    defaultImportPrice: 350000,
    currentStock: 1000,
    minStock: 300,
  },
  {
    id: "chanh-vang-da-lat",
    name: "Nước cốt chanh vàng Đà Lạt",
    unit: "ml",
    group: "SEASONING",
    spec: "Vắt tươi trong ngày",
    defaultImportPrice: 70000,
    currentStock: 2000,
    minStock: 500,
  },
  {
    id: "men-ruou-nep",
    name: "Rượu nếp cái hoa vàng",
    unit: "ml",
    group: "SEASONING",
    spec: "Rượu nếp ủ chum 6 tháng",
    defaultImportPrice: 120000,
    currentStock: 4000,
    minStock: 1000,
  },
  {
    id: "nuoc-dung-nam",
    name: "Nước dùng nấm đông cô ninh cô đặc",
    unit: "ml",
    group: "SEASONING",
    spec: "Ninh ngọt thanh tự nhiên",
    defaultImportPrice: 90000,
    currentStock: 5000,
    minStock: 1500,
  },
  {
    id: "nuoc-dung-bo-cau",
    name: "Nước dùng bồ câu tiềm sâm",
    unit: "ml",
    group: "SEASONING",
    spec: "Nước dùng trong vắt, rót nóng tại bàn",
    defaultImportPrice: 150000,
    currentStock: 6000,
    minStock: 2000,
  },
  {
    id: "sot-saffron",
    name: "Sốt nhụy hoa nghệ tây và chanh vàng",
    unit: "ml",
    group: "SEASONING",
    spec: "Nấu sánh vàng óng",
    defaultImportPrice: 650000,
    currentStock: 1800,
    minStock: 400,
  },
  {
    id: "nuoc-cham-tieu-rung",
    name: "Nước chấm sốt tiêu rừng và lá chanh",
    unit: "ml",
    group: "SEASONING",
    spec: "Chua ngọt cay nồng",
    defaultImportPrice: 60000,
    currentStock: 2500,
    minStock: 600,
  },
  {
    id: "duong-phen-quang-ngai",
    name: "Đường phèn kết tinh tự nhiên",
    unit: "g",
    group: "SEASONING",
    spec: "Nấu nước đường trong vắt",
    defaultImportPrice: 55000,
    currentStock: 5000,
    minStock: 1000,
  },

  // Hương liệu
  {
    id: "gung-gia-son-la",
    name: "Gừng già Sơn La",
    unit: "g",
    group: "AROMATIC",
    spec: "Thái chỉ sao thơm",
    defaultImportPrice: 45000,
    currentStock: 1500,
    minStock: 400,
  },
  {
    id: "mac-khen-doi",
    name: "Hạt mắc khén và hạt dổi rừng",
    unit: "g",
    group: "AROMATIC",
    spec: "Nướng than giã nhỏ",
    defaultImportPrice: 480000,
    currentStock: 800,
    minStock: 200,
  },
  {
    id: "tra-shan-tuyet",
    name: "Trà Shan tuyết cổ thụ Tây Côn Lĩnh",
    unit: "g",
    group: "AROMATIC",
    spec: "Búp trà 1 tôm 2 lá cổ thụ 300 năm",
    defaultImportPrice: 3800000,
    currentStock: 1000,
    minStock: 250,
  },
  {
    id: "tram-huong-quang-nam",
    name: "Trầm hương tự nhiên xông phòng",
    unit: "g",
    group: "AROMATIC",
    spec: "Mẩu trầm đốt lư đồng tạo hương",
    defaultImportPrice: 15000000,
    currentStock: 200,
    minStock: 50,
  },
];

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
          { ingredientId: "caviar-lam-dong", qtyPerGuest: 20, unit: "g", prepNote: "Lọ 20g ướp đá thạch anh" },
          { ingredientId: "kem-chua", qtyPerGuest: 15, unit: "g", prepNote: "Đánh bông mịn" },
          { ingredientId: "banh-blini", qtyPerGuest: 30, unit: "g", prepNote: "Nướng giòn nhẹ" },
          { ingredientId: "he-la-nho", qtyPerGuest: 5, unit: "g", prepNote: "Rắc mặt đĩa" },
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
          { ingredientId: "sa-sung-van-don", qtyPerGuest: 35, unit: "g", prepNote: "Nướng chín vàng đều" },
          { ingredientId: "muoi-ham-thao-duoc", qtyPerGuest: 5, unit: "g", prepNote: "Rang cùng tiêu rừng" },
          { ingredientId: "tieu-rung-phu-quoc", qtyPerGuest: 3, unit: "g", prepNote: "Đập dập thơm" },
          { ingredientId: "chanh-vang-da-lat", qtyPerGuest: 10, unit: "ml", prepNote: "Vắt tươi chấm kèm" },
          { ingredientId: "rau-ram-rung", qtyPerGuest: 10, unit: "g", prepNote: "Ăn kèm" },
        ],
      },
      {
        optionId: "crispy_fried",
        optionName: "Chiên phồng giòn rụm",
        isDefault: false,
        note: "Vị bùi béo đậm đà hơn",
        lines: [
          { ingredientId: "sa-sung-van-don", qtyPerGuest: 35, unit: "g", prepNote: "Chiên ngập dầu nhanh" },
          { ingredientId: "dau-thuc-vat", qtyPerGuest: 25, unit: "ml", prepNote: "Dầu sôi 180°C" },
          { ingredientId: "muoi-ham-thao-duoc", qtyPerGuest: 5, unit: "g", prepNote: "Lắc nhẹ sau chiên" },
          { ingredientId: "tieu-rung-phu-quoc", qtyPerGuest: 3, unit: "g", prepNote: "Rắc thơm" },
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
          { ingredientId: "bao-ngu-nha-trang", qtyPerGuest: 80, unit: "g", prepNote: "Làm sạch, khía vảy rồng" },
          { ingredientId: "men-ruou-nep", qtyPerGuest: 30, unit: "ml", prepNote: "Khử mùi tanh và om mềm" },
          { ingredientId: "gung-gia-son-la", qtyPerGuest: 10, unit: "g", prepNote: "Phi thơm" },
          { ingredientId: "tao-do-tan-cuong", qtyPerGuest: 15, unit: "g", prepNote: "Nấu cùng nước om" },
          { ingredientId: "nuoc-dung-nam", qtyPerGuest: 60, unit: "ml", prepNote: "Tạo độ sánh ngọt" },
        ],
      },
      {
        optionId: "mild_wine",
        optionName: "Giảm độ nồng rượu (Thanh nhẹ)",
        isDefault: false,
        note: "Tôn vị tự nhiên của bào ngư",
        lines: [
          { ingredientId: "bao-ngu-nha-trang", qtyPerGuest: 80, unit: "g", prepNote: "Khía hoa thị đẹp mắt" },
          { ingredientId: "men-ruou-nep", qtyPerGuest: 15, unit: "ml", prepNote: "Giảm lượng rượu" },
          { ingredientId: "gung-gia-son-la", qtyPerGuest: 8, unit: "g", prepNote: "Hương nhẹ" },
          { ingredientId: "nuoc-dung-nam", qtyPerGuest: 75, unit: "ml", prepNote: "Bù thêm nước dùng" },
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
          { ingredientId: "yen-sao-khanh-hoa", qtyPerGuest: 15, unit: "g", prepNote: "Chưng cách thủy riêng" },
          { ingredientId: "sen-co-ngu", qtyPerGuest: 30, unit: "g", prepNote: "Hấp bở tơi" },
          { ingredientId: "nuoc-dung-bo-cau", qtyPerGuest: 120, unit: "ml", prepNote: "Rót từ bình gốm ấm" },
          { ingredientId: "nam-dong-trung", qtyPerGuest: 5, unit: "g", prepNote: "Đặt điểm xuyết" },
        ],
      },
      {
        optionId: "extra_lotus",
        optionName: "Thêm hạt sen Cổ Ngự bùi béo",
        isDefault: false,
        note: "Tăng độ thơm mát của sen Thăng Long",
        lines: [
          { ingredientId: "yen-sao-khanh-hoa", qtyPerGuest: 15, unit: "g", prepNote: "Chưng cách thủy riêng" },
          { ingredientId: "sen-co-ngu", qtyPerGuest: 50, unit: "g", prepNote: "Tăng lượng hạt sen" },
          { ingredientId: "nuoc-dung-bo-cau", qtyPerGuest: 120, unit: "ml", prepNote: "Rót tại bàn" },
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
          { ingredientId: "ca-tam-da-lat", qtyPerGuest: 120, unit: "g", prepNote: "Áp chảo da trước" },
          { ingredientId: "bo-thao-moc", qtyPerGuest: 20, unit: "g", prepNote: "Tưới bơ liên tục (basting)" },
          { ingredientId: "sot-saffron", qtyPerGuest: 25, unit: "ml", prepNote: "Vẽ sốt viền đĩa" },
          { ingredientId: "mang-tay-da-lat", qtyPerGuest: 40, unit: "g", prepNote: "Áp chảo kèm" },
        ],
      },
      {
        optionId: "herb_steamed",
        optionName: "Hấp thảo mộc thanh vị",
        isDefault: false,
        note: "Dành cho khách chuộng vị thanh đạm",
        lines: [
          { ingredientId: "ca-tam-da-lat", qtyPerGuest: 120, unit: "g", prepNote: "Hấp chín tới" },
          { ingredientId: "sot-saffron", qtyPerGuest: 25, unit: "ml", prepNote: "Rưới nhẹ" },
          { ingredientId: "mang-tay-da-lat", qtyPerGuest: 40, unit: "g", prepNote: "Hấp giòn" },
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
          { ingredientId: "ga-dong-tao", qtyPerGuest: 140, unit: "g", prepNote: "Tẩm ướp mắc khén 4 giờ" },
          { ingredientId: "mac-khen-doi", qtyPerGuest: 5, unit: "g", prepNote: "Rang thơm xát da" },
          { ingredientId: "com-chay-st25", qtyPerGuest: 50, unit: "g", prepNote: "Chiên giòn ăn kèm" },
          { ingredientId: "nuoc-cham-tieu-rung", qtyPerGuest: 20, unit: "ml", prepNote: "Chấm thịt gà" },
          { ingredientId: "rau-rung-tay-bac", qtyPerGuest: 30, unit: "g", prepNote: "Trộn gỏi thanh mát" },
        ],
      },
      {
        optionId: "mild_spice",
        optionName: "Giảm độ nồng mắc khén",
        isDefault: false,
        note: "Vị cay dịu nhẹ cho thực khách nhạy cảm",
        lines: [
          { ingredientId: "ga-dong-tao", qtyPerGuest: 140, unit: "g", prepNote: "Ướp nhẹ" },
          { ingredientId: "mac-khen-doi", qtyPerGuest: 2, unit: "g", prepNote: "Giảm lượng mắc khén" },
          { ingredientId: "com-chay-st25", qtyPerGuest: 50, unit: "g", prepNote: "Chiên giòn" },
          { ingredientId: "nuoc-cham-tieu-rung", qtyPerGuest: 20, unit: "ml", prepNote: "Nước chấm thanh" },
        ],
      },
    ],
  },
  {
    dishIndex: 7,
    dishName: "Trầm và Sen — Nhãn lồng hạt sen cung đình",
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
          { ingredientId: "nhan-long-hung-yen", qtyPerGuest: 60, unit: "g", prepNote: "Tách hạt, lồng hạt sen" },
          { ingredientId: "hat-sen-cung-dinh", qtyPerGuest: 40, unit: "g", prepNote: "Ninh mềm thơm ngọt" },
          { ingredientId: "duong-phen-quang-ngai", qtyPerGuest: 15, unit: "g", prepNote: "Nấu nước đường trong" },
          { ingredientId: "tra-shan-tuyet", qtyPerGuest: 8, unit: "g", prepNote: "Hãm ấm đất nung, rót 3 lần" },
          { ingredientId: "tram-huong-quang-nam", qtyPerGuest: 2, unit: "g", prepNote: "Đốt lư xông khói ấm" },
          { ingredientId: "canh-sen-hong", qtyPerGuest: 5, unit: "g", prepNote: "Rắc điểm xuyết" },
        ],
      },
      {
        optionId: "low_sweet",
        optionName: "Ít ngọt thanh tao (Low sugar)",
        isDefault: false,
        note: "Tôn vị trà Shan tuyết nổi bật",
        lines: [
          { ingredientId: "nhan-long-hung-yen", qtyPerGuest: 60, unit: "g", prepNote: "Tách hạt cẩn thận" },
          { ingredientId: "hat-sen-cung-dinh", qtyPerGuest: 40, unit: "g", prepNote: "Hạt sen bùi tự nhiên" },
          { ingredientId: "duong-phen-quang-ngai", qtyPerGuest: 7, unit: "g", prepNote: "Giảm 50% đường" },
          { ingredientId: "tra-shan-tuyet", qtyPerGuest: 8, unit: "g", prepNote: "Nghi thức trà Shan tuyết" },
          { ingredientId: "tram-huong-quang-nam", qtyPerGuest: 2, unit: "g", prepNote: "Xông trầm" },
        ],
      },
    ],
  },
];

export async function seedBomDatabase() {
  console.log("🌱 Bắt đầu seed phân hệ Công thức BOM Concept 2...");

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

  console.log(`✅ Đã seed 7 món công thức BOM Concept 2 thành công!`);
}

// Chạy trực tiếp nếu file được gọi từ CLI
if (require.main === module) {
  seedBomDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

