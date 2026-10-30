// Tiện ích phía server: chuyển đổi bản ghi Prisma sang DTO và tính toán giá
import type {
  Pairing,
  ReservationDTO,
  ReservationSource,
  ReservationStatus,
  Slot,
  WaitlistEntryDTO,
  WaitlistStatus,
} from "./types";
import { PRICES } from "./constants";
import { toISODate } from "./format";

type ReservationWithTable = {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  email: string | null;
  partySize: number;
  date: Date;
  slot: string;
  pairing: string;
  notes: string | null;
  allergy: string | null;
  status: string;
  depositAmount: number;
  source: string;
  createdAt: Date;
  table: { id: string; code: string; seats: number; zone: string };
};

export function serializeReservation(r: ReservationWithTable): ReservationDTO {
  return {
    id: r.id,
    code: r.code,
    customerName: r.customerName,
    phone: r.phone,
    email: r.email,
    partySize: r.partySize,
    date: toISODate(r.date),
    slot: r.slot as Slot,
    pairing: r.pairing as Pairing,
    notes: r.notes,
    allergy: r.allergy,
    status: r.status as ReservationStatus,
    depositAmount: r.depositAmount,
    source: r.source as ReservationSource,
    createdAt: r.createdAt.toISOString(),
    table: r.table,
  };
}

type WaitlistRow = {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  date: Date;
  slot: string;
  position: number;
  status: string;
  createdAt: Date;
};

export function serializeWaitlist(w: WaitlistRow): WaitlistEntryDTO {
  return {
    id: w.id,
    name: w.name,
    phone: w.phone,
    partySize: w.partySize,
    date: toISODate(w.date),
    slot: w.slot as Slot,
    position: w.position,
    status: w.status as WaitlistStatus,
    createdAt: w.createdAt.toISOString(),
  };
}

/** Tổng hóa đơn lý thuyết của một lượt đặt (chưa trừ cọc) */
export function reservationTotal(partySize: number, pairing: string): number {
  const pairingPrice =
    pairing === "WINE"
      ? PRICES.winePairing
      : pairing === "TEA"
        ? PRICES.teaPairing
        : 0;
  return partySize * (PRICES.menu + pairingPrice);
}

/** Sinh mã đặt bàn TRM-XXXX (tránh trùng với các mã đã tồn tại) */
export function generateReservationCode(
  existingCodes: Set<string>,
): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 cho dễ đọc
  let code = "";
  do {
    code = "TRM-";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (existingCodes.has(code));
  return code;
}

/** Các trạng thái vẫn chiếm chỗ bàn (chưa hủy) */
export const ACTIVE_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SEATED",
  "NO_SHOW",
] as const;
