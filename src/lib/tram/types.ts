// Kiểu dữ liệu dùng chung cho TRẦM Reserve
// Các "enum" ứng dụng (SQLite của Prisma không hỗ trợ enum thật)

export type Slot = "SLOT_1730" | "SLOT_1945";
export type Pairing = "NONE" | "WINE" | "TEA";
export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SEATED"
  | "NO_SHOW"
  | "CANCELLED";
export type ReservationSource = "WEB" | "PHONE" | "ZALO";
export type WaitlistStatus = "WAITING" | "INVITED";

export interface TableDTO {
  id: string;
  code: string;
  seats: number;
  zone: string;
}

export interface ReservationDTO {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  email: string | null;
  partySize: number;
  date: string; // YYYY-MM-DD
  slot: Slot;
  pairing: Pairing;
  notes: string | null;
  allergy: string | null;
  selectedDishes?: string | null;
  status: ReservationStatus;
  depositAmount: number;
  source: ReservationSource;
  createdAt: string;
  table: TableDTO;
  survey?: SurveyDTO | null;
}

export interface WaitlistEntryDTO {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  date: string; // YYYY-MM-DD
  slot: Slot;
  position: number;
  status: WaitlistStatus;
  createdAt: string;
}

export interface SlotSummary {
  slot: Slot;
  capacity: number; // 42
  bookedSeats: number;
  remainingSeats: number;
}

export interface TableAvailability {
  table: TableDTO;
  available: boolean; // trống và đủ chỗ cho số khách
  reason: null | "BOOKED" | "TOO_SMALL";
  reservation: ReservationDTO | null; // đặt bàn chiếm chỗ (nếu có)
}

export interface AvailabilityResponse {
  date: string;
  slots: SlotSummary[];
  tables: TableAvailability[] | null; // chỉ trả về khi có tham số slot
}

// FR-21: Chương trình ba hạng thân thiết (Bảng 8 nhóm 8):
// - Hạng HƯƠNG (0–2 lượt đến)
// - Hạng TRẦM (3–5 lượt đến)
// - Hạng NAM TRẦM (6+ lượt đến)
export type LoyaltyTier = "HUONG" | "TRAM" | "NAM_TRAM";

export interface CustomerProfileDTO {
  name: string;
  phone: string;
  visits: number;
  totalSpend: number;
  lastVisit: string;
  notes: string[]; // ghi chú / dị ứng gộp
  reservations: ReservationDTO[];
  tier: LoyaltyTier; // FR-21: Hạng thân thiết (HUONG, TRAM, NAM_TRAM)
  points: number; // FR-20: Điểm tích lũy hiện tại (1.000 đ = 1 pt)
  nextTierVisits?: number; // FR-21: Lượt cần để lên hạng (0-2 -> 3-5 -> 6+)
  nextTierPoints?: number; // Điểm cần để lên hạng tiếp theo
  nextTierName: string; // Tên hạng tiếp theo
  tierProgress: number; // 0..100 (%) tiến độ lên hạng
}

export interface OccupancyPoint {
  date: string;
  label: string; // vd "T6 24/10"
  weekday: number; // 0=CN..6=T7
  occupied: number; // số chỗ đã đặt
  capacity: number; // 84 (2 khung × 42) hoặc 0 nếu nghỉ
  percent: number; // 0..100
}

export interface SourceShare {
  source: ReservationSource;
  label: string;
  count: number;
  percent: number;
}

export interface AdminStats {
  totalReservations: number; // lượt đặt trong 4 tuần
  occupancyRate: number; // tỷ lệ lấp chỗ trung bình (các khung có khách)
  noShowRate: number; // tỷ lệ không đến
  expectedRevenue: number; // doanh thu dự thu (tương lai)
  occupancy: OccupancyPoint[]; // 14 ngày gần nhất
  sourceShares: SourceShare[];
  waitlistToday: WaitlistEntryDTO[];
  waitlistWeekend: WaitlistEntryDTO[];
  windowLabel: string; // mô tả khoảng thời gian thống kê
}

// FR-23: Khảo sát sau bữa ăn — Thăm dò 5 sao gắn với lượt đã phục vụ
export interface SurveyDTO {
  id: string;
  reservationId: string;
  rating: number; // 1..5 sao tổng quan
  foodRating: number; // 1..5 sao món ăn
  serviceRating: number; // 1..5 sao phục vụ
  ambianceRating: number; // 1..5 sao không gian
  pairingRating: number; // 1..5 sao đồ uống
  comment: string | null;
  recommend: boolean;
  bonusPointsGiven: number;
  createdAt: string;
}

// FR-24: Phân bố sao đánh giá (5★ -> 1★)
export interface StarDistributionItem {
  star: number; // 5, 4, 3, 2, 1
  count: number;
  percent: number; // 0..100 (%)
}

export interface SurveyStatsDTO {
  totalSurveys: number;
  averageRating: number;
  avgFood: number;
  avgService: number;
  avgAmbiance: number;
  avgPairing: number;
  recommendPercent: number;
  starDistribution: StarDistributionItem[];
  recentSurveys: (SurveyDTO & {
    reservationCode: string;
    customerName: string;
    phone: string;
    date: string;
  })[];
}

