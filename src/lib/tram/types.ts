// Kiểu dữ liệu dùng chung cho TRẦM Reserve
// Các "enum" ứng dụng (SQLite của Prisma không hỗ trợ enum thật)

import type { FoodCostKpiSummary } from "./food-cost";

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
  reason: null | "BOOKED" | "HELD" | "TOO_SMALL" | (string & {});
  reservation: ReservationDTO | null; // đặt bàn chiếm chỗ (nếu có)
  holdRemainingSeconds?: number;
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
  isManual?: boolean; // Khách hàng được quản lý thêm thủ công
}

export interface OccupancyPoint {
  date: string;
  label: string; // vd "T6 24/10"
  weekday: number; // 0=CN..6=T7
  occupied: number; // tổng số chỗ đã đặt
  capacity: number; // 84 (2 khung × 42) hoặc 0 nếu nghỉ
  percent: number; // 0..100
  slot1730Occupied: number; // chỗ đặt khung 17:30
  slot1730Percent: number; // % lấp chỗ khung 17:30 (trên 42 chỗ)
  slot1945Occupied: number; // chỗ đặt khung 19:45
  slot1945Percent: number;
  isToday?: boolean;
  revenue: number; // Doanh thu ngày (VND)
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
  expectedMenuRevenue?: number; // FR-33: doanh thu phần menu dự thu (chưa gồm pairing)
  expectedPairingRevenue?: number; // FR-33: doanh thu pairing dự thu
  futureGuests?: number; // FR-33: tổng khách đặt trước tương lai
  foodCostKpi?: FoodCostKpiSummary; // FR-33: KPI food cost đối chiếu doanh thu menu
  totalRevenue4Weeks?: number; // tổng doanh thu 4 tuần
  occupancy: OccupancyPoint[]; // 14 ngày gần nhất
  sourceShares: SourceShare[];
    waitlistToday?: WaitlistEntryDTO[];
  waitlistWeekend?: WaitlistEntryDTO[];
  recentReservations: ReservationDTO[];
  todayReservations: ReservationDTO[];
  topSurveys: (SurveyDTO & { reservationCode: string; customerName: string; phone: string; date: string })[];
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
  starDistribution?: StarDistributionItem[];
  recentSurveys: (SurveyDTO & {
    reservationCode: string;
    customerName: string;
    phone: string;
    date: string;
  })[];
}

// FR-24: Đánh giá Google Maps (Mô phỏng Places API)
export interface GoogleMapsReviewDTO {
  id: string;
  authorName: string;
  authorPhoto?: string;
  isLocalGuide?: boolean;
  localGuideLevel?: number;
  rating: number; // 1..5
  relativeTime: string;
  content: string;
  depositPhone?: string; // SĐT đặt cọc nhận diện khách hàng
  customerName?: string;
  reservationCode?: string;
  tags: string[]; // Tag nổi bật (vd: "Bò Wagyu A5", "Pairing trà")
  pointsAwarded: boolean; // Đã tặng 200 điểm tri ân hay chưa
  reply?: {
    content: string;
    repliedAt: string;
    repliedBy: string;
  } | null;
}

export interface GoogleMapsSyncStats {
  placeName: string;
  address: string;
  overallRating: number; // vd 4.9
  totalReviews: number; // vd 128
  regionalAvgRating: number; // vd 4.3 (khu vực Q1)
  ratingDifference: number; // +0.6
  starDistribution: {
    star: number;
    count: number;
    percent: number;
  }[];
  highlightTags: {
    tag: string;
    count: number;
  }[];
  lastSyncedAt: string;
}




