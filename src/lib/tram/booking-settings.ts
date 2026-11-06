import { addDays, isClosedMonday, todayLocalISO } from "./format";

export interface BookingProgramSettings {
  programEnabled: boolean;
  programName: string;
  programMode: "range" | "specific"; // "range" = khoảng ngày, "specific" = chọn từng ngày
  programStartDate: string; // YYYY-MM-DD
  programEndDate: string; // YYYY-MM-DD
  programDays: string[]; // Danh sách các ngày cụ thể [YYYY-MM-DD]
  closedDates: string[]; // Danh sách ngày nghỉ đột xuất/lễ tết [YYYY-MM-DD]
  allowMonday: boolean; // Có mở cửa ngày nghỉ định kỳ (Thứ Hai & Thứ Ba) hay không
  notes?: string;
  updatedAt: string;
}

/** Lấy cấu hình mặc định (4 tuần kể từ hôm nay) */
export function getDefaultSettings(): BookingProgramSettings {
  const today = todayLocalISO();
  return {
    programEnabled: true,
    programName: "Hành trình vị Việt - Tasting Menu 7 món",
    programMode: "range",
    programStartDate: addDays(today, -14), // Mở từ 2 tuần trước để xem dữ liệu demo
    programEndDate: addDays(today, 28), // Kéo dài 4 tuần tới
    programDays: [],
    closedDates: [],
    allowMonday: false,
    notes: "Chương trình thực đơn mùa đặc sắc của TRẦM",
    updatedAt: new Date().toISOString(),
  };
}

export type DateCheckReason =
  | "PAST_DATE"
  | "PROGRAM_DISABLED"
  | "CLOSED_SPECIAL"
  | "CLOSED_MONDAY"
  | "NOT_IN_PROGRAM";

/**
 * Kiểm tra xem một ngày có được phép đặt bàn hay không theo cấu hình của Admin:
 * - Nếu không chọn ngày chương trình -> không chạy được chương trình.
 * - Nếu là ngày nghỉ của nhà hàng -> chặn đặt bàn.
 */
export function checkDateBookingAllowed(
  iso: string,
  settings: BookingProgramSettings,
  today: string = todayLocalISO()
): { allowed: boolean; reason?: DateCheckReason; message?: string } {
  // 1. Ngày trong quá khứ
  if (iso < today) {
    return {
      allowed: false,
      reason: "PAST_DATE",
      message: "Ngày này đã trôi qua.",
    };
  }

  // 2. Chương trình đặt bàn đang bị Admin tạm dừng
  if (!settings.programEnabled) {
    return {
      allowed: false,
      reason: "PROGRAM_DISABLED",
      message: "Nhà hàng hiện đang tạm dừng nhận đặt bàn trực tuyến.",
    };
  }

  // 3. Ngày nghỉ đặc biệt do Admin thiết lập
  if (settings.closedDates.includes(iso)) {
    return {
      allowed: false,
      reason: "CLOSED_SPECIAL",
      message: "Nhà hàng nghỉ phục vụ (Ngày nghỉ đã lên lịch).",
    };
  }

  // 4. Nghỉ Thứ Hai và Thứ Ba định kỳ (mở cửa Thứ Tư → Chủ Nhật)
  if (!settings.allowMonday && isClosedMonday(iso)) {
    return {
      allowed: false,
      reason: "CLOSED_MONDAY",
      message: "TRẦM mở cửa Thứ Tư → Chủ Nhật (nghỉ Thứ Hai và Thứ Ba).",
    };
  }

  // 5. Kiểm tra ngày có thuộc chương trình hay không
  if (settings.programMode === "range") {
    if (iso < settings.programStartDate || iso > settings.programEndDate) {
      return {
        allowed: false,
        reason: "NOT_IN_PROGRAM",
        message: "Ngày này không nằm trong lịch trình áp dụng chương trình của nhà hàng.",
      };
    }
  } else if (settings.programMode === "specific") {
    if (!settings.programDays.includes(iso)) {
      return {
        allowed: false,
        reason: "NOT_IN_PROGRAM",
        message: "Nhà hàng không tổ chức chương trình ẩm thực vào ngày này.",
      };
    }
  }

  return { allowed: true };
}
