"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MENU_ITEMS,
  PRICES,
  SLOT_TIMES,
} from "@/lib/tram/constants";
import {
  addDays,
  formatVND,
  isClosedMonday,
  todayLocalISO,
} from "@/lib/tram/format";
import {
  calculateVoucherDiscount,
  getPersonalizedVoucherForCustomer,
  SYSTEM_VOUCHERS,
  type AppliedVoucherResult,
  type VoucherDefinition,
} from "@/lib/tram/vouchers";
import {
  checkDateBookingAllowed,
  type BookingProgramSettings,
} from "@/lib/tram/booking-settings";
import type {
  AvailabilityResponse,
  Pairing,
  ReservationDTO,
  Slot,
  SlotSummary,
  TableAvailability,
} from "@/lib/tram/types";

export type PayPhase = "method" | "processing" | "success";

export type AvailResp = AvailabilityResponse & { closed: boolean };

// Kiểu dữ liệu lựa chọn món cho từng món trong 7 món
export interface DishChoiceItem {
  dishIndex: number;
  dishName: string;
  optionId: string;
  optionName: string;
  customNote?: string;
}

// Khởi tạo 7 món mặc định chuẩn vị
export function getDefaultDishChoices(): Record<number, DishChoiceItem> {
  const result: Record<number, DishChoiceItem> = {};
  MENU_ITEMS.forEach((item) => {
    const defOpt = item.options?.find((o) => o.isDefault) ?? item.options?.[0];
    result[item.index] = {
      dishIndex: item.index,
      dishName: item.name,
      optionId: defOpt?.id ?? "std",
      optionName: defOpt?.name ?? "Chuẩn vị nhà hàng",
    };
  });
  return result;
}

export interface LoyaltyProfile {
  found: boolean;
  name: string;
  visits: number;
  tier: "HUONG" | "TRAM" | "NAM_TRAM";
  points: number;
  depositExempt: boolean;
}

/**
 * Custom Hook chứa toàn bộ nghiệp vụ & state quản lý luồng đặt bàn TRẦM Reserve:
 * - Điều hướng 5 bước wizard & animation trượt ngang
 * - Xử lý ngày (mặc định hôm nay), khung giờ và kiểm tra ca đã qua
 * - Sơ đồ bàn, giữ chỗ 10 phút (table-hold) & xử lý danh sách chờ (waitlist)
 * - Tùy biến thực đơn 7 món
 * - Thông tin khách hàng, thẻ hội viên (Nam Trầm miễn cọc), dị ứng, dịp đặc biệt
 * - Tính toán tài chính (giá menu tasting, pairing, tiền đặt cọc)
 * - Xác thực form & hoàn tất tạo đơn đặt bàn
 */
export function useBookingWizard() {
  const [today, setToday] = useState<string | null>(null);
  const [step, setStepState] = useState(1);
  const [direction, setDirection] = useState(1);

  const setStep = useCallback((newStep: number | ((prev: number) => number)) => {
    setStepState((prev) => {
      const next = typeof newStep === "function" ? newStep(prev) : newStep;
      setDirection(next >= prev ? 1 : -1);
      return next;
    });
  }, []);

  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [partySize, setPartySize] = useState(2);

  // Cấu hình ngày chương trình & ngày nghỉ từ Admin
  const [bookingSettings, setBookingSettings] = useState<BookingProgramSettings | null>(null);

  const [slotsSummary, setSlotsSummary] = useState<SlotSummary[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [tables, setTables] = useState<TableAvailability[] | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [waitlistMode, setWaitlistMode] = useState(false);

  const [tableId, setTableId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(0);

  // Trạng thái chọn 7 món và tùy chọn ẩm thực
  const [dishChoices, setDishChoices] = useState<Record<number, DishChoiceItem>>(
    getDefaultDishChoices
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pairing, setPairing] = useState<Pairing>("NONE");
  const [notes, setNotes] = useState("");
  const [allergySeafood, setAllergySeafood] = useState(false);
  const [birthday, setBirthday] = useState(false);
  const [anniversary, setAnniversary] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payPhase, setPayPhase] = useState<PayPhase>("method");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ReservationDTO | null>(null);

  // FR-22: Tra cứu hạng hội viên theo SĐT để áp dụng miễn cọc Nam Trầm
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile | null>(null);
  const [checkingLoyalty, setCheckingLoyalty] = useState(false);

  // FR-37 & FR-38: Voucher & Giảm giá tự động theo gu ẩm thực
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [recommendedVoucher, setRecommendedVoucher] = useState<VoucherDefinition | null>(null);

  const checkLoyaltyByPhone = useCallback(async (phoneNum: string) => {
    const clean = phoneNum.trim();
    if (!/^0\d{9}$/.test(clean)) {
      setLoyaltyProfile(null);
      setRecommendedVoucher(null);
      return;
    }
    setCheckingLoyalty(true);
    try {
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          setLoyaltyProfile({
            found: true,
            name: data.customer.name,
            visits: data.customer.visits,
            tier: data.customer.tier,
            points: data.customer.points,
            depositExempt: data.customer.tier === "NAM_TRAM",
          });
          setName((prev) => (prev.trim() ? prev : data.customer.name));

          // Gợi ý voucher cá nhân hóa cho khách cũ theo gu (FR-38)
          const pastPairings = data.customer.reservations?.map((r: any) => r.pairing) ?? [];
          const rec = getPersonalizedVoucherForCustomer({
            visits: data.customer.visits,
            pastPairings,
          });
          setRecommendedVoucher(rec);
        } else {
          setLoyaltyProfile(null);
          // Gợi ý voucher chào mừng khách mới (FR-38)
          setRecommendedVoucher(SYSTEM_VOUCHERS.WELCOME10);
        }
      }
    } catch (e) {
      console.error("Lookup error", e);
    } finally {
      setCheckingLoyalty(false);
    }
  }, []);

  const isNamTram = loyaltyProfile?.tier === "NAM_TRAM";

  // Kiểm tra khung giờ đã qua so với thời gian hiện tại (nếu chọn ngày hôm nay)
  const isSlotPassed = useCallback(
    (slotValue: Slot) => {
      if (!today || date !== today) return false;
      const now = new Date();
      const currentTotalMin = now.getHours() * 60 + now.getMinutes();
      const slotTotalMin = slotValue === "SLOT_1730" ? 17 * 60 + 30 : 19 * 60 + 45;
      return currentTotalMin >= slotTotalMin;
    },
    [today, date]
  );

  useEffect(() => {
    const cur = todayLocalISO();
    setToday(cur);

    // Tải cấu hình cài đặt đặt bàn từ Admin
    fetch("/api/booking-settings")
      .then((r) => r.json())
      .then((data: BookingProgramSettings) => {
        setBookingSettings(data);
        // Kiểm tra tính hợp lệ của ngày hôm nay theo cài đặt admin
        const check = checkDateBookingAllowed(cur, data, cur);
        if (check.allowed) {
          setDate((prev) => prev ?? cur);
        } else {
          // Nếu hôm nay không có chương trình hoặc nghỉ, tìm ngày mở gần nhất
          let foundDate: string | null = null;
          for (let i = 1; i <= 28; i++) {
            const nextDay = addDays(cur, i);
            if (checkDateBookingAllowed(nextDay, data, cur).allowed) {
              foundDate = nextDay;
              break;
            }
          }
          setDate((prev) => prev ?? (foundDate ?? cur));
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải booking-settings:", err);
        setDate((prev) => prev ?? (isClosedMonday(cur) ? addDays(cur, 1) : cur));
      });

    // Khởi tạo hoặc lấy sessionId ẩn danh để nhận diện trình duyệt
    let sid = sessionStorage.getItem("tram_booking_session");
    if (!sid) {
      sid = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
      sessionStorage.setItem("tram_booking_session", sid);
    }
    setSessionId(sid);
  }, []);

  // Tải chỗ còn trống khi đổi ngày
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoadingSlots(true);
    fetch(`/api/availability?date=${date}`)
      .then((r) => r.json())
      .then((data: AvailResp) => {
        if (cancelled) return;
        setSlotsSummary(data.slots ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Không tải được chỗ còn trống.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Chuyển sang bước 2: tải trạng thái 12 bàn
  const goStep2 = useCallback(async () => {
    if (!date || !slot) return;
    setLoadingTables(true);
    setStep(2);
    try {
      const res = await fetch(
        `/api/availability?date=${date}&slot=${slot}&partySize=${partySize}&sessionId=${sessionId}`
      );
      const data: AvailResp = await res.json();
      const list = data.tables ?? [];
      setTables(list);
      setWaitlistMode(!list.some((t) => t.available));
      setTableId(null);
    } catch {
      toast.error("Không tải được sơ đồ bàn.");
    } finally {
      setLoadingTables(false);
    }
  }, [date, slot, partySize, sessionId, setStep]);

  const selectedTable = useMemo(
    () => tables?.find((t) => t.table.id === tableId) ?? null,
    [tables, tableId]
  );

  // Đếm ngược 10 phút giữ chỗ bàn
  useEffect(() => {
    if (!holdSecondsLeft || holdSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setHoldSecondsLeft((prev) => {
        if (prev <= 1) {
          toast.warning("Hết 10 phút giữ bàn. Bàn đã được mở lại cho khách khác.");
          setTableId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [holdSecondsLeft]);

  // Hàm chọn bàn kèm gọi API giữ bàn 10 phút
  const handleSelectTable = useCallback(
    async (t: TableAvailability) => {
      if (!t.available || !date || !slot || !sessionId) return;
      try {
        const res = await fetch("/api/table-hold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "hold",
            date,
            slot,
            tableId: t.table.id,
            sessionId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Không thể chọn bàn này lúc này.");
          void goStep2();
          return;
        }
        setTableId(t.table.id);
        setHoldSecondsLeft(data.remainingSeconds ?? 600);
        toast.success(`Đã giữ bàn ${t.table.code} trong 10 phút để bạn hoàn tất đặt bàn!`);
      } catch {
        toast.error("Lỗi khi giữ bàn, vui lòng thử lại.");
      }
    },
    [date, slot, sessionId, goStep2]
  );

  const pairingPrice =
    pairing === "WINE"
      ? PRICES.winePairing
      : pairing === "TEA"
        ? PRICES.teaPairing
        : 0;

  const rawTotal = partySize * (PRICES.menu + pairingPrice);

  // Tự động tính toán chiết khấu Voucher theo FR-37 & FR-38
  const voucherCalc = useMemo<AppliedVoucherResult | null>(() => {
    if (!appliedVoucherCode) return null;
    const res = calculateVoucherDiscount({
      code: appliedVoucherCode,
      partySize,
      pairing,
      isReturningCustomer: (loyaltyProfile?.visits ?? 0) > 0,
      date: date ?? undefined,
      slot: slot ?? undefined,
    });
    return res.success ? res.result : null;
  }, [appliedVoucherCode, partySize, pairing, loyaltyProfile?.visits, date, slot]);

  const discountAmount = voucherCalc?.discountAmount ?? 0;
  const totalAmount = Math.max(0, rawTotal - discountAmount);
  const depositAmount = isNamTram ? 0 : Math.min(totalAmount, partySize * PRICES.deposit);

  const applyVoucher = useCallback(
    (codeToApply?: string) => {
      const code = (codeToApply ?? voucherInput).trim().toUpperCase();
      if (!code) {
        setVoucherError("Vui lòng nhập mã ưu đãi.");
        return false;
      }

      const res = calculateVoucherDiscount({
        code,
        partySize,
        pairing,
        isReturningCustomer: (loyaltyProfile?.visits ?? 0) > 0,
        date: date ?? undefined,
        slot: slot ?? undefined,
      });

      if (!res.success) {
        setVoucherError(res.error);
        toast.error(res.error);
        return false;
      }

      setAppliedVoucherCode(code);
      setVoucherInput(code);
      setVoucherError(null);
      toast.success(`Đã áp dụng thành công mã "${code}": ${res.result.discountSummary}`);
      return true;
    },
    [voucherInput, partySize, pairing, loyaltyProfile?.visits, date, slot]
  );

  const removeVoucher = useCallback(() => {
    setAppliedVoucherCode(null);
    setVoucherInput("");
    setVoucherError(null);
    toast.info("Đã hủy mã ưu đãi.");
  }, []);

  const finalNotes = useMemo(() => {
    const extra: string[] = [];
    if (birthday) extra.push("Đặt bàn sinh nhật");
    if (anniversary) extra.push("Kỷ niệm");
    if (voucherCalc) {
      extra.push(
        `[VOUCHER: ${voucherCalc.code} - Giảm ${formatVND(voucherCalc.discountAmount)}${
          voucherCalc.giftDescription ? ` + ${voucherCalc.giftDescription}` : ""
        }]`
      );
    }
    return [extra.join(" · "), notes.trim()].filter(Boolean).join("\n") || null;
  }, [birthday, anniversary, notes, voucherCalc]);

  const finalAllergy = allergySeafood ? "Hải sản" : null;

  // Kiểm tra ngày đang chọn có được phép đặt bàn theo cài đặt Admin hay không
  const selectedDateCheck = useMemo(() => {
    if (!date || !bookingSettings) return { allowed: true };
    return checkDateBookingAllowed(date, bookingSettings, today ?? todayLocalISO());
  }, [date, bookingSettings, today]);

  function validateStep1(): boolean {
    if (!date) {
      toast.error("Vui lòng chọn ngày đến.");
      return false;
    }
    if (!selectedDateCheck.allowed) {
      toast.error(selectedDateCheck.message ?? "Ngày này không áp dụng chương trình đặt bàn.");
      return false;
    }
    if (!slot) {
      toast.error("Vui lòng chọn khung giờ.");
      return false;
    }
    return true;
  }

  function validateStep4(): boolean {
    if (name.trim().length < 2) {
      toast.error("Vui lòng nhập họ tên khách.");
      return false;
    }
    if (!/^0\d{9}$/.test(phone.trim())) {
      toast.error("Số điện thoại không hợp lệ (vd: 0912345678).");
      return false;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Email không hợp lệ.");
      return false;
    }
    return true;
  }

  // Cập nhật tùy chọn cho 1 món
  function handleSelectDishOption(dishIndex: number, optionId: string, optionName: string) {
    setDishChoices((prev) => ({
      ...prev,
      [dishIndex]: {
        ...prev[dishIndex],
        dishIndex,
        dishName: MENU_ITEMS.find((m) => m.index === dishIndex)?.name ?? "",
        optionId,
        optionName,
      },
    }));
  }

  // Đặt lại toàn bộ về chuẩn vị của Bếp trưởng
  function handleResetDishes() {
    setDishChoices(getDefaultDishChoices());
    toast.info("Đã khôi phục 7 món theo công thức nguyên bản của Bếp trưởng.");
  }

  // Danh sách mảng chuẩn bị lưu vào cơ sở dữ liệu
  const selectedDishesArray = useMemo(() => {
    return MENU_ITEMS.map((item) => {
      const choice = dishChoices[item.index];
      return {
        index: item.index,
        name: item.name,
        region: item.region,
        image: item.image,
        optionId: choice?.optionId ?? "std",
        optionName: choice?.optionName ?? "Chuẩn vị nhà hàng",
      };
    });
  }, [dishChoices]);

  // Sau khi "thanh toán" xong → tạo đặt bàn thật trên API kèm selectedDishes lưu DB
  async function submitReservation() {
    if (!date || !slot || !tableId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slot,
          partySize,
          tableId,
          customerName: name,
          phone,
          email,
          pairing,
          notes: finalNotes,
          allergy: finalAllergy,
          selectedDishes: JSON.stringify(selectedDishesArray),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không tạo được lượt đặt bàn.");
        if (res.status === 409) {
          // bàn vừa bị chiếm — quay lại bước 2
          setPayOpen(false);
          setStep(2);
          void goStep2();
        }
        return;
      }
      setCreated(data.reservation as ReservationDTO);
      setPayOpen(false);
      setStep(6);
      toast.success(
        `Đặt bàn thành công — mã ${data.reservation.code} và thực đơn đã được lưu trữ an toàn.`
      );
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePayMethod() {
    setPayPhase("processing");
    window.setTimeout(() => setPayPhase("success"), 1500);
  }

  return {
    // Navigation & steps
    today,
    step,
    setStep,
    direction,

    // Step 1: Date & Time
    date,
    setDate,
    slot,
    setSlot,
    partySize,
    setPartySize,
    bookingSettings,
    selectedDateCheck,
    slotsSummary,
    loadingSlots,
    isSlotPassed,
    validateStep1,
    goStep2,

    // Step 2: Tables & Waitlist
    tables,
    loadingTables,
    waitlistMode,
    setWaitlistMode,
    tableId,
    setTableId,
    selectedTable,
    sessionId,
    holdSecondsLeft,
    handleSelectTable,

    // Step 3: Dishes & Customization
    dishChoices,
    handleSelectDishOption,
    handleResetDishes,
    selectedDishesArray,

    // Step 4: Customer & Pairing
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    pairing,
    setPairing,
    notes,
    setNotes,
    allergySeafood,
    setAllergySeafood,
    birthday,
    setBirthday,
    anniversary,
    setAnniversary,
    finalNotes,
    finalAllergy,
    loyaltyProfile,
    setLoyaltyProfile,
    checkingLoyalty,
    checkLoyaltyByPhone,
    isNamTram,
    validateStep4,

    // FR-37 & FR-38: Voucher & Giảm giá
    voucherInput,
    setVoucherInput,
    appliedVoucherCode,
    voucherCalc,
    voucherError,
    recommendedVoucher,
    applyVoucher,
    removeVoucher,
    rawTotal,
    discountAmount,

    // Step 5 & 6: Pricing, Payment, Completion
    pairingPrice,
    totalAmount,
    depositAmount,
    payOpen,
    setPayOpen,
    payPhase,
    setPayPhase,
    submitting,
    created,
    handlePayMethod,
    submitReservation,
  };
}
