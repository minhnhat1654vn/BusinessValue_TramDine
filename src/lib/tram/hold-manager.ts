// Quản lý giữ chỗ tạm thời (Table Hold / Seat Lock) 10 phút
// Đảm bảo không người thứ 2 nào chọn trùng bàn khi đang có khách thực hiện đặt bàn
import { db } from "@/lib/db";
import { ACTIVE_STATUSES } from "./server";

export interface TableHold {
  tableId: string;
  date: string; // YYYY-MM-DD
  slot: string; // SLOT_1730 | SLOT_1945
  sessionId: string;
  expiresAt: number; // timestamp ms
}

declare global {
  // eslint-disable-next-line no-var
  var __tramTableHolds: Map<string, TableHold> | undefined;
}

if (!globalThis.__tramTableHolds) {
  globalThis.__tramTableHolds = new Map<string, TableHold>();
}

const holds = globalThis.__tramTableHolds;
export const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 phút

function makeKey(date: string, slot: string, tableId: string): string {
  return `${date}_${slot}_${tableId}`;
}

/** Dọn dẹp các lượt giữ chỗ đã hết hạn */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, hold] of holds.entries()) {
    if (hold.expiresAt <= now) {
      holds.delete(key);
    }
  }
}

/**
 * Kiểm tra xem bàn có đang bị người khác giữ chỗ hay không.
 * Trả về thông tin hold nếu đang bị giữ bởi sessionId khác.
 */
export function getActiveHold(
  date: string,
  slot: string,
  tableId: string,
  currentSessionId?: string,
): { isHeldByOther: boolean; remainingMs: number } {
  cleanupExpired();
  const key = makeKey(date, slot, tableId);
  const hold = holds.get(key);

  if (!hold) return { isHeldByOther: false, remainingMs: 0 };

  const now = Date.now();
  if (hold.expiresAt <= now) {
    holds.delete(key);
    return { isHeldByOther: false, remainingMs: 0 };
  }

  const isHeldByOther = !currentSessionId || hold.sessionId !== currentSessionId;
  const remainingMs = Math.max(0, hold.expiresAt - now);

  return { isHeldByOther, remainingMs };
}

/**
 * Giữ chỗ bàn trong 10 phút cho một sessionId
 */
export async function acquireTableHold(
  date: string,
  slot: string,
  tableId: string,
  sessionId: string,
): Promise<{ success: boolean; error?: string; remainingSeconds?: number }> {
  cleanupExpired();

  // 1. Kiểm tra database xem bàn đã bị đặt chính thức chưa
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T00:00:00.001Z`);
  const booked = await db.reservation.findFirst({
    where: {
      tableId,
      date: { gte: dayStart, lte: dayEnd },
      slot,
      status: { in: [...ACTIVE_STATUSES] },
    },
  });

  if (booked) {
    return { success: false, error: "Bàn này đã được khách khác đặt thành công." };
  }

  // 2. Kiểm tra xem có người khác đang giữ chỗ không
  const key = makeKey(date, slot, tableId);
  const existing = holds.get(key);
  const now = Date.now();

  if (existing && existing.expiresAt > now && existing.sessionId !== sessionId) {
    const mins = Math.ceil((existing.expiresAt - now) / 60000);
    return {
      success: false,
      error: `Bàn này đang có khách giữ chỗ để hoàn tất đặt bàn (còn khoảng ${mins} phút). Vui lòng chọn bàn khác.`,
    };
  }

  // Xóa các bàn khác mà session này đang giữ cho cùng ngày & ca (nếu có)
  for (const [k, h] of holds.entries()) {
    if (h.sessionId === sessionId && h.date === date && h.slot === slot) {
      holds.delete(k);
    }
  }

  // Tạo hold mới 10 phút
  const expiresAt = now + HOLD_DURATION_MS;
  holds.set(key, {
    tableId,
    date,
    slot,
    sessionId,
    expiresAt,
  });

  return { success: true, remainingSeconds: Math.floor(HOLD_DURATION_MS / 1000) };
}

/**
 * Giải phóng giữ chỗ (khi hủy chọn hoặc hoàn tất đặt bàn)
 */
export function releaseTableHold(
  date: string,
  slot: string,
  tableId: string,
  sessionId?: string,
) {
  const key = makeKey(date, slot, tableId);
  const existing = holds.get(key);
  if (!existing) return;

  if (!sessionId || existing.sessionId === sessionId) {
    holds.delete(key);
  }
}

