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
  status: ReservationStatus;
  depositAmount: number;
  source: ReservationSource;
  createdAt: string;
  table: TableDTO;
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

export type LoyaltyTier = "MEMBER" | "SILVER" | "GOLD" | "DIAMOND";

export interface CustomerProfileDTO {
  name: string;
  phone: string;
  visits: number;
  totalSpend: number;
  lastVisit: string;
  notes: string[]; // ghi chú / dị ứng gộp
  reservations: ReservationDTO[];
  tier: LoyaltyTier; // FR-19: Hạng thân thiết
  points: number; // FR-19: Điểm tích lũy hiện tại
  nextTierPoints: number; // Điểm cần để lên hạng tiếp theo
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
