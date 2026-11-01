"use client";

import { useBookingWizard, type PayPhase } from "@/hooks/use-booking-wizard";
import {
  checkDateBookingAllowed,
  type BookingProgramSettings,
} from "@/lib/tram/booking-settings";
// Wizard đặt bàn 6 bước — TRẦM Reserve
// Bước 1: Ngày & giờ -> Bước 2: Chọn bàn -> Bước 3: Chọn món (Tasting 7 món & tùy biến)
// -> Bước 4: Thông tin khách & Pairing -> Bước 5: Xác nhận & cọc -> Bước 6: Hoàn tất
import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  ChefHat,
  CircleAlert,
  CreditCard,
  Loader2,
  Mail,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  UtensilsCrossed,
  Wallet,
  Wine,
  Coffee,
  Ban,
  Gem,
  Crown,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  MENU_ITEMS,
  PRICES,
  SLOT_TIMES,
  PAIRING_LABELS,
} from "@/lib/tram/constants";
import {
  addDays,
  formatLongDate,
  formatVND,
  WEEKDAY_LABELS,
  weekdayOf,
} from "@/lib/tram/format";
import type { TableAvailability } from "@/lib/tram/types";
import { WaitlistPanel } from "./waitlist-panel";
import { CompletionView } from "./completion-view";

// ---------- Step indicator (Chấm điều hướng bên phải chuẩn phong cách trang chủ TRẦM) ----------
const STEP_DETAILS = [
  { label: "Ngày & giờ", hint: "Khung giờ tối" },
  { label: "Chọn bàn", hint: "Sơ đồ mặt bằng" },
  { label: "Chọn món", hint: "Tùy biến 7 món" },
  { label: "Thông tin", hint: "Khách & Pairing" },
  { label: "Xác nhận & cọc", hint: "Thanh toán cọc" },
];

function StepIndicator({
  step,
  onStepClick,
  isMobile = false,
}: {
  step: number;
  onStepClick?: (s: number) => void;
  isMobile?: boolean;
}) {
  // Mobile (< md): Thanh trượt ngang gọn gàng ở đầu form
  if (isMobile) {
    return (
      <ol className="tram-scroll flex items-center gap-1 overflow-x-auto pb-1 sm:justify-center">
        {STEP_DETAILS.map((item, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={item.label} className="flex shrink-0 items-center gap-1">
              {n > 1 && (
                <span
                  className={cn("h-px w-3 sm:w-6", done ? "bg-[#b45309]" : "bg-border")}
                  aria-hidden
                />
              )}
              <button
                type="button"
                disabled={!done}
                onClick={() => done && onStepClick?.(n)}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
                  current
                    ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-sm"
                    : done
                      ? "border-[#b45309]/40 bg-[#fdf0d5] text-[#92400e] cursor-pointer hover:bg-[#fde7bf]"
                      : "border-border bg-card text-muted-foreground cursor-not-allowed",
                )}
                aria-current={current ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    current
                      ? "bg-[#fffbf2]/25"
                      : done
                        ? "bg-[#b45309] text-[#fffbf2]"
                        : "bg-muted",
                  )}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden /> : n}
                </span>
                <span className="whitespace-nowrap">
                  {String(n).padStart(2, "0")} {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    );
  }

  // Desktop (>= md): CHẤM ĐIỀU HƯỚNG BÊN PHẢI (GIỐNG 100% TRANG CHỦ TRẦM)
  return (
    <nav
      aria-label="Tiến trình đặt bàn"
      className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-2 md:flex"
    >
      {STEP_DETAILS.map((item, i) => {
        const n = i + 1;
        const isActive = n === step;
        const isDone = n < step;

        return (
          <button
            key={item.label}
            type="button"
            disabled={!isDone}
            onClick={() => isDone && onStepClick?.(n)}
            aria-label={"Bước " + n + ": " + item.label}
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "group flex h-4 items-center gap-2",
              isDone ? "cursor-pointer" : "cursor-default"
            )}
          >
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] shadow-sm transition-opacity",
                "bg-[#fffdf9]/85 text-[#92400e]",
                isActive ? "opacity-100 font-semibold" : "opacity-0 group-hover:opacity-90"
              )}
            >
              {String(n).padStart(2, "0")} {item.label}
            </span>
            <span
              className={cn(
                "block rounded-full transition-all duration-300",
                isActive
                  ? "h-4 w-1.5 bg-[#b45309]"
                  : isDone
                    ? "h-2 w-2 bg-[#b45309]/60 group-hover:bg-[#b45309]"
                    : "h-2 w-2 bg-[#b45309]/35 group-hover:bg-[#b45309]/70"
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}

// ---------- Bước 1: dải ngày cuộn ngang 4 tuần ----------
function DateStrip({
  today,
  selected,
  onSelect,
  settings,
}: {
  today: string;
  selected: string | null;
  onSelect: (iso: string) => void;
  settings?: BookingProgramSettings | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const weeks = useMemo(() => {
    // Nhóm theo tuần bắt đầu từ Thứ Hai (chuẩn lịch Việt Nam & ISO, T2 đến CN)
    const dayOfWeek = weekdayOf(today); // 0 = CN, 1 = T2, ..., 6 = T7
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = addDays(today, -daysSinceMonday);
    return [0, 1, 2, 3].map((w) => {
      const start = addDays(monday, w * 7);
      return {
        label:
          w === 0 ? "Tuần này" : w === 1 ? "Tuần sau" : "Tuần " + (w + 1),
        days: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
      };
    });
  }, [today]);

  // Hỗ trợ cuộn ngang dải ngày bằng con lăn chuột (mouse wheel)
  // Khi chuột nằm trên dải ngày: khóa cuộn dọc trang web và cuộn ngang dải ngày
  // Khi chuột không nằm trên dải ngày: cuộn trang web (scroll page) bình thường
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        e.preventDefault();
        el.scrollLeft += delta;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Tự động cuộn ngày đang chọn vào giữa tầm nhìn nội bộ container (tuyệt đối KHÔNG cuộn window/page)
  useEffect(() => {
    if (!selected) return;
    const container = scrollRef.current;
    const el = document.getElementById(`user-day-strip-${selected}`);
    if (container && el) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.left - containerRect.left - containerRect.width / 2 + elRect.width / 2;
      container.scrollBy({ left: offset, behavior: "smooth" });
    }
  }, [selected]);

  return (
    <div ref={scrollRef} className="tram-scroll -mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex gap-4">
        {weeks.map((week) => (
          <div key={week.label} className="shrink-0">
            <p className="mb-1.5 pl-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {week.label}
            </p>
            <div className="flex gap-1.5">
              {week.days.map((iso) => {
                const wd = weekdayOf(iso);
                const isPast = iso < today;
                let disabled = isPast;
                let statusLabel = "";
                let titleDesc = formatLongDate(iso);

                if (isPast) {
                  disabled = true;
                  statusLabel = "Qua";
                } else if (settings) {
                  const check = checkDateBookingAllowed(iso, settings, today);
                  if (!check.allowed) {
                    disabled = true;
                    if (check.reason === "CLOSED_MONDAY") {
                      statusLabel = "Nghỉ";
                      titleDesc += " — Nghỉ định kỳ Thứ 2";
                    } else if (check.reason === "CLOSED_SPECIAL") {
                      statusLabel = "Nghỉ lễ";
                      titleDesc += " — Ngày nghỉ nhà hàng";
                    } else if (check.reason === "NOT_IN_PROGRAM") {
                      statusLabel = "Khóa";
                      titleDesc += " — Không áp dụng chương trình";
                    } else if (check.reason === "PROGRAM_DISABLED") {
                      statusLabel = "Ngưng";
                      titleDesc += " — Tạm ngưng nhận khách";
                    }
                  }
                } else {
                  const isMonday = wd === 1;
                  disabled = isMonday || isPast;
                  if (isMonday) statusLabel = "Nghỉ";
                }

                const isSelected = selected === iso;
                const dayNum = Number(iso.slice(8, 10));
                return (
                  <button
                    key={iso}
                    id={`user-day-strip-${iso}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onSelect(iso)}
                    aria-label={titleDesc}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-[72px] w-[46px] flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-all sm:w-[52px]",
                      disabled
                        ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground/50"
                        : isSelected
                          ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-md shadow-[#b45309]/25"
                          : "border-border bg-card text-stone-600 hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/60"
                    )}
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide">
                      {WEEKDAY_LABELS[wd]}
                    </span>
                    <span className="font-heading text-lg font-semibold leading-none">
                      {dayNum}
                    </span>
                    <span className="text-[9px] font-semibold leading-none">
                      {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Kích thước và tọa độ chính xác của các bàn trên bản vẽ thiết kế mặt bằng
const FLOORPLAN_COORDINATES: Record<
  string,
  { x: number; y: number; w: number; h: number; shape: "square" | "circle" }
> = {
  // KHU A - CỬA SỔ - SÁT VIEW SÔNG (5 bàn vuông gỗ tự nhiên 2 chỗ: A01 - A05)
  A01: { x: 16.5, y: 19.8, w: 7.2, h: 7.2, shape: "square" },
  A02: { x: 34.8, y: 19.8, w: 7.2, h: 7.2, shape: "square" },
  A03: { x: 53.1, y: 19.8, w: 7.2, h: 7.2, shape: "square" },
  A04: { x: 71.4, y: 19.8, w: 7.2, h: 7.2, shape: "square" },
  A05: { x: 89.6, y: 19.8, w: 7.2, h: 7.2, shape: "square" },

  // KHU B - TRUNG TÂM (5 bàn tròn 4 chỗ bố trí quanh Bếp Mở: B01 - B05)
  B01: { x: 27.5, y: 40.3, w: 7.6, h: 7.6, shape: "circle" },
  B02: { x: 27.5, y: 58.8, w: 7.6, h: 7.6, shape: "circle" },
  B03: { x: 81.1, y: 40.3, w: 7.6, h: 7.6, shape: "circle" },
  B04: { x: 81.1, y: 58.8, w: 7.6, h: 7.6, shape: "circle" },
  B05: { x: 54.5, y: 64.5, w: 7.6, h: 7.6, shape: "circle" },
};

// ---------- Bước 2: SƠ ĐỒ MẶT BẰNG TƯƠNG TÁC TINH TẾ (ARCHITECTURAL FLOOR PLAN) ----------
function TableGrid({
  tables,
  selectedTableId,
  onSelect,
}: {
  tables: TableAvailability[];
  selectedTableId: string | null;
  onSelect: (t: TableAvailability) => void;
}) {
  const validTables = tables.filter(
    (t) => t.table.code !== "B11" && t.table.code !== "B12" && FLOORPLAN_COORDINATES[t.table.code]
  );
  const availableCount = validTables.filter((t) => t.available).length;
  const heldCount = validTables.filter((t) => t.reason === "HELD").length;
  const bookedCount = validTables.filter((t) => t.reason === "BOOKED").length;

  return (
    <div className="space-y-4">
      {/* Khung bản vẽ mặt bằng phong cách kiến trúc Fine Dining */}
      <div className="relative mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-3xl border border-[#c5a059]/40 bg-[#f7f2ea] p-2 shadow-2xl shadow-stone-900/10">
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-stone-300/60 bg-[#fffdfa]">
          <img
            src="/floorplan.jpg"
            alt="Sơ đồ mặt bằng nhà hàng TRẦM"
            className="pointer-events-none h-full w-full select-none object-cover filter contrast-[1.03] brightness-[1.01]"
          />

          {/* Các bàn được đặt vừa khít vào mặt bàn trên bản vẽ (loại bỏ B11 và B12) */}
          {validTables.map((t) => {
            const coord =
              FLOORPLAN_COORDINATES[t.table.code] ?? {
                x: 50,
                y: 50,
                w: 7.2,
                h: 7.2,
                shape: "circle",
              };
            const isSelected = selectedTableId === t.table.id;
            const isHeld = t.reason === "HELD";
            const isBooked = t.reason === "BOOKED";
            const isTooSmall = t.reason === "TOO_SMALL";

            // Style lớp phủ tiệp màu sang trọng theo từng trạng thái
            let stateStyle = "";
            let textStyle = "text-[#6b2b06]";
            let ringGlow = "";

            if (isSelected) {
              stateStyle = "bg-[#b45309] text-[#fffdf9] shadow-lg shadow-[#b45309]/50 scale-105 z-30 ring-2 ring-[#f59e0b]";
              textStyle = "text-white";
              ringGlow = "animate-pulse";
            } else if (isHeld) {
              stateStyle = "bg-amber-500/80 text-white backdrop-blur-[1px] cursor-not-allowed border border-amber-300/80 z-20";
              textStyle = "text-white";
            } else if (isBooked) {
              stateStyle =
                "bg-stone-900/80 text-stone-300 backdrop-blur-[3px] cursor-not-allowed border border-red-500/50 shadow-sm shadow-red-950/20 z-10";
              textStyle = "text-stone-400";
            } else if (isTooSmall) {
              stateStyle = "bg-stone-400/40 text-stone-500 backdrop-blur-[1px] cursor-not-allowed border border-dashed border-stone-400/50";
              textStyle = "text-stone-600";
            } else if (t.available) {
              stateStyle =
                "bg-[#f08c35]/25 hover:bg-[#b45309] hover:text-[#fffdf9] border border-[#b45309]/60 hover:border-white shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 z-20 cursor-pointer";
              textStyle = "text-[#6b2b06] group-hover:text-white";
            }

            return (
              <button
                key={t.table.id}
                type="button"
                disabled={!t.available}
                onClick={() => onSelect(t)}
                style={{
                  left: `${coord.x}%`,
                  top: `${coord.y}%`,
                  width: `${coord.w}%`,
                  height: `${coord.h}%`,
                  transform: "translate(-50%, -50%)",
                }}
                title={`Bàn ${t.table.code}${isBooked ? " — Đã có người đặt" : ""}`}
                aria-label={`Bàn ${t.table.code}${isBooked ? " (Đã có người đặt)" : ""}`}
                className={cn(
                  "group absolute flex flex-col items-center justify-center font-heading transition-all overflow-hidden",
                  coord.shape === "circle" ? "rounded-full" : "rounded-sm",
                  stateStyle,
                  ringGlow,
                )}
              >
                {isBooked ? (
                  <>
                    <span className="text-xs sm:text-sm font-bold leading-none tracking-tight text-stone-300/80 select-none">
                      {t.table.code}
                    </span>
                    <svg
                      className="absolute inset-0 h-full w-full pointer-events-none p-1 sm:p-1.5"
                      viewBox="0 0 100 100"
                      aria-hidden="true"
                    >
                      <line
                        x1="14"
                        y1="14"
                        x2="86"
                        y2="86"
                        stroke="#ef4444"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                      />
                      <line
                        x1="86"
                        y1="14"
                        x2="14"
                        y2="86"
                        stroke="#ef4444"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    <span className={cn("text-xs sm:text-sm font-bold leading-none tracking-tight select-none", textStyle)}>
                      {t.table.code}
                    </span>
                    {isHeld && (
                      <span className={cn("text-[7.5px] sm:text-[8px] font-medium leading-none opacity-90 mt-0.5", textStyle)}>
                        10p
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thanh chú thích tinh tế kèm số lượng bàn thực tế */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-5 rounded-2xl border border-border/80 bg-[#fffdf9]/95 px-4 py-3 text-xs shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
          <span className="h-3 w-3 rounded-full border border-[#b45309]/60 bg-[#f08c35]/30" />
          Bàn trống: <strong className="text-stone-900">{availableCount}</strong>
        </span>
        {heldCount > 0 && (
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
            <span className="h-3 w-3 rounded-full border border-amber-300 bg-amber-500/80" />
            Đang giữ 10p: <strong>{heldCount}</strong>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
          <span className="relative flex h-4 w-4 items-center justify-center rounded-full border border-red-500/60 bg-stone-900/85 overflow-hidden shadow-sm">
            <svg
              className="absolute inset-0 h-full w-full p-0.5"
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <line
                x1="16"
                y1="16"
                x2="84"
                y2="84"
                stroke="#ef4444"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <line
                x1="84"
                y1="16"
                x2="16"
                y2="84"
                stroke="#ef4444"
                strokeWidth="12"
                strokeLinecap="round"
              />
            </svg>
          </span>
          Đã có người đặt: <strong className="text-stone-900">{bookedCount}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-stone-500">
          <span className="h-3 w-3 rounded-full border border-dashed border-stone-400 bg-stone-300/40" />
          Không đủ chỗ
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-[#b45309]">
          <span className="h-3 w-3 rounded-full bg-[#b45309] ring-2 ring-[#f59e0b]" />
          Đang chọn
        </span>
      </div>
    </div>
  );
}

// ---------- Dialog thanh toán mô phỏng ----------
function PaymentDialog({
  open,
  phase,
  amount,
  onClose,
  onSelectMethod,
  onDone,
}: {
  open: boolean;
  phase: PayPhase;
  amount: number;
  onClose: () => void;
  onSelectMethod: (method: string) => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && phase !== "processing" && onClose()}>
      <DialogContent className="max-w-sm border-border bg-card">
        {phase === "method" && (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="font-heading text-xl text-[#292524]">
                Thanh toán đặt cọc
              </DialogTitle>
              <DialogDescription className="text-base">
                <span className="font-heading text-2xl font-semibold text-[#b45309]">
                  {formatVND(amount)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => onSelectMethod("Thẻ ngân hàng")}
                className="flex h-16 w-full items-center gap-3 rounded-xl border border-border bg-[#fffdf9] px-4 text-left transition-all hover:border-[#b45309] hover:bg-[#fdf0d5]/60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                  <CreditCard className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-[#292524]">
                    Thẻ ngân hàng
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Visa · Mastercard · JCB
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMethod("Ví điện tử")}
                className="flex h-16 w-full items-center gap-3 rounded-xl border border-border bg-[#fffdf9] px-4 text-left transition-all hover:border-[#b45309] hover:bg-[#fdf0d5]/60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                  <Wallet className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-[#292524]">
                    Ví điện tử
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    QR một lần chạm
                  </span>
                </span>
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Cổng thanh toán mô phỏng phục vụ demo
            </p>
          </>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2
              className="h-12 w-12 animate-spin text-[#b45309]"
              aria-hidden
            />
            <p className="font-medium text-stone-700">Đang xử lý giao dịch...</p>
            <p className="text-xs text-muted-foreground">
              Vui lòng không đóng cửa sổ này
            </p>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
              <Check className="h-8 w-8" aria-hidden />
            </span>
            <p className="font-heading text-xl font-semibold text-[#292524]">
              Thanh toán thành công
            </p>
            <p className="text-sm text-muted-foreground">
              Đã nhận cọc {formatVND(amount)}
            </p>
            <Button
              onClick={onDone}
              className="mt-2 h-11 min-w-40 rounded-full bg-[#b45309] text-[#fffbf2] hover:bg-[#92400e]"
            >
              Xác nhận đặt bàn
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hiệu ứng trượt ngang mượt mà giữa các bước (Slide horizontal transition)
const stepSlideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 55 : -55,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -55 : 55,
    opacity: 0,
  }),
};

// ---------- Wizard chính ----------
interface BookingWizardProps {
  onGoHome: () => void;
}

export function BookingWizard({ onGoHome }: BookingWizardProps) {
  const {
    today,
    step,
    setStep,
    direction,
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
    tables,
    loadingTables,
    waitlistMode,
    tableId,
    selectedTable,
    handleSelectTable,
    dishChoices,
    handleSelectDishOption,
    handleResetDishes,
    selectedDishesArray,
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    pairing,
    setPairing,
    pairingPrice,
    notes,
    setNotes,
    allergySeafood,
    setAllergySeafood,
    birthday,
    setBirthday,
    anniversary,
    setAnniversary,
    finalAllergy,
    loyaltyProfile,
    setLoyaltyProfile,
    checkingLoyalty,
    checkLoyaltyByPhone,
    isNamTram,
    validateStep4,
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
  } = useBookingWizard();

  // ---------- Bước 6: Hoàn tất ----------
  if (step === 6 && created) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <CompletionView reservation={created} onGoHome={onGoHome} />
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 text-center">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.3em] text-[#b45309]">
            Đặt bàn trực tuyến
          </p>
          <h1 className="font-heading text-3xl font-semibold text-[#292524] sm:text-4xl">
            {bookingSettings?.programName || "Một buổi tối tại TRẦM"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Menu tasting 7 món · {formatVND(PRICES.menu)} / khách · đặt cọc{" "}
            {formatVND(PRICES.deposit)} / khách
          </p>
          {bookingSettings?.notes && (
            <p className="mt-1.5 text-xs font-medium text-[#b45309]/90 italic">
              ✦ {bookingSettings.notes}
            </p>
          )}
        </div>

        {/* Thanh bước compact trên màn hình di động (< md) */}
        <div className="mb-6 md:hidden">
          <StepIndicator step={step} onStepClick={setStep} isMobile />
        </div>

        {/* Bố cục chính: Card đặt bàn rộng rãi, căn giữa */}
        <Card className="border-border/80 bg-card shadow-md overflow-hidden">
            <CardContent className="p-5 sm:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ============ BƯỚC 1: NGÀY & GIỜ ============ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={stepSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
              <div>
                <h2 className="mb-1 font-heading text-xl font-semibold text-[#292524]">
                  1. Ngày &amp; khung giờ
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  TRẦM mở cửa tối Thứ Ba → Chủ Nhật (nghỉ thứ Hai), mỗi tối 2
                  khung.
                </p>

                {bookingSettings && !bookingSettings.programEnabled && (
                  <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3">
                    <Ban className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Hệ thống đặt bàn trực tuyến đang tạm đóng</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nhà hàng hiện đang tạm dừng nhận đơn đặt bàn trực tuyến theo kế hoạch nội bộ. Quý khách vui lòng liên hệ hotline 028 3822 8888 để được hỗ trợ trực tiếp.
                      </p>
                    </div>
                  </div>
                )}
                {today ? (
                  <DateStrip
                    today={today}
                    selected={date}
                    settings={bookingSettings}
                    onSelect={(iso) => {
                      setDate(iso);
                      setSlot(null);
                    }}
                  />
                ) : (
                  <div className="h-[100px] animate-pulse rounded-xl bg-muted" />
                )}
                {date && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[#92400e]">
                      <CalendarCheck className="mr-1 inline h-4 w-4" aria-hidden />
                      {formatLongDate(date)}
                    </p>
                    {selectedDateCheck.allowed ? (
                      <Badge className="bg-emerald-600/90 text-white hover:bg-emerald-600 text-xs font-normal">
                        ✓ Đang mở chương trình
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs font-normal">
                        ✕ {selectedDateCheck.message || "Không thể đặt bàn"}
                      </Badge>
                    )}
                  </div>
                )}
                {date && !selectedDateCheck.allowed && (
                  <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                    <CircleAlert className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Ngày này hiện không nhận đặt bàn</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedDateCheck.message}. Quý khách vui lòng chọn ngày khác trong lịch hoạt động của chương trình ẩm thực.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-2 block text-sm font-medium">
                  Khung giờ
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {SLOT_TIMES.map((s) => {
                    const summary = slotsSummary?.find((x) => x.slot === s.value);
                    const remaining = summary?.remainingSeats ?? null;
                    const full = remaining !== null && remaining === 0;
                    const isSelected = slot === s.value;
                    const isAllowed = selectedDateCheck.allowed;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        disabled={!date || !isAllowed || isSlotPassed(s.value) || full}
                        onClick={() => setSlot(s.value)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-50",
                          isSelected
                            ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-md shadow-[#b45309]/25"
                            : "border-border bg-[#fffdf9] text-stone-700 hover:border-[#b45309]/60 hover:bg-[#fdf0d5]/60",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-heading text-xl font-semibold", isSlotPassed(s.value) && "line-through opacity-70")}>
                            {s.label}
                          </span>
                          {isSlotPassed(s.value) && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Đã qua giờ
                            </span>
                          )}
                        </div>
                        {loadingSlots ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : remaining !== null ? (
                          <span
                            className={cn(
                              "text-xs",
                              full
                                ? "font-medium text-[#b3261e]"
                                : isSelected
                                  ? "text-[#fdf0d5]"
                                  : "text-muted-foreground",
                            )}
                          >
                            {full ? "Hết chỗ" : `Còn ${remaining} chỗ`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            42 chỗ
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-sm font-medium">
                  Số khách
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPartySize((p) => Math.max(2, p - 1))}
                    disabled={partySize <= 2}
                    className="h-11 w-11 rounded-full p-0"
                    aria-label="Giảm số khách"
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </Button>
                  <span className="min-w-24 text-center font-heading text-2xl font-semibold text-[#292524]">
                    {partySize} khách
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPartySize((p) => Math.min(8, p + 1))}
                    disabled={partySize >= 8}
                    className="h-11 w-11 rounded-full p-0"
                    aria-label="Tăng số khách"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                  <p className="hidden text-xs leading-relaxed text-muted-foreground sm:block">
                    Đoàn trên 6 khách: nhà hàng sẽ xếp bàn ghép —
                    <br />
                    vui lòng đăng ký danh sách chờ nếu còn trống.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  disabled={!date || !slot || !selectedDateCheck.allowed}
                  onClick={() => {
                    if (validateStep1()) void goStep2();
                  }}
                  className="h-12 min-w-40 rounded-full bg-[#b45309] px-8 text-[#fffbf2] hover:bg-[#92400e] disabled:opacity-50"
                >
                  Chọn bàn
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ============ BƯỚC 2: CHỌN BÀN hoặc WAITLIST ============ */}
          {step === 2 && waitlistMode && date && slot && (
            <motion.div
              key="step-2-waitlist"
              custom={direction}
              variants={stepSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold text-[#292524]">
                  2. Không còn bàn trống
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="h-11 rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  Quay lại
                </Button>
              </div>
              <WaitlistPanel
                date={date}
                slot={slot}
                initialPartySize={partySize}
                onGoHome={onGoHome}
              />
            </motion.div>
          )}

          {step === 2 && !waitlistMode && (
            <motion.div
              key="step-2-tables"
              custom={direction}
              variants={stepSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="mb-0.5 font-heading text-xl font-semibold text-[#292524]">
                    2. Chọn bàn
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {date ? formatLongDate(date) : ""} ·{" "}
                    {slot === "SLOT_1730" ? "17:30" : "19:45"} · {partySize}{" "}
                    khách
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="h-11 rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  Sửa ngày &amp; giờ
                </Button>
              </div>

              {loadingTables || !tables ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[76px] animate-pulse rounded-xl bg-muted"
                    />
                  ))}
                </div>
              ) : (
                <TableGrid
                  tables={tables}
                  selectedTableId={tableId}
                  onSelect={handleSelectTable}
                />
              )}

              {selectedTable && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b45309]/35 bg-[#fdf0d5]/60 p-4">
                  <p className="text-sm text-stone-700">
                    <span className="font-heading text-lg font-semibold text-[#b45309]">
                      {selectedTable.table.code}
                    </span>{" "}
                    · {selectedTable.table.zone}
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setStep(3)}
                    className="h-12 min-w-40 rounded-full bg-[#b45309] px-8 text-[#fffbf2] hover:bg-[#92400e]"
                  >
                    Chọn thực đơn 7 món
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* ============ BƯỚC 3: CHỌN MÓN ĐẶT BÀN (KẾT HỢP LƯU DB) ============ */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={stepSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-xl font-semibold text-[#292524]">
                    3. Chọn thực đơn &amp; tùy biến 7 món
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Menu Tasting “Hành trình vị Việt” ({formatVND(PRICES.menu)}/khách) — Tùy biến từng món cho {partySize} khách
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(2)}
                    className="h-10 rounded-full"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                    Sửa bàn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDishes}
                    className="h-10 rounded-full border-[#b45309]/40 text-[#92400e] hover:bg-[#fdf0d5]"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    7 món nguyên bản
                  </Button>
                </div>
              </div>

              {/* THÔNG BÁO VỀ THỰC ĐƠN */}
              <div className="flex items-start gap-3 rounded-2xl border border-[#b45309]/25 bg-[#fdf0d5]/50 p-4 text-xs text-stone-700 sm:text-sm">
                <ChefHat className="h-5 w-5 shrink-0 text-[#b45309]" />
                <div>
                  <p className="font-semibold text-[#92400e]">
                    Trải nghiệm Fine Dining cá nhân hóa:
                  </p>
                  <p className="mt-0.5 text-xs text-stone-600">
                    Bếp trưởng TRẦM đã chọn sẵn 7 món chuẩn vị cho bàn của Quý khách. Quý khách có thể lựa chọn các biến thể phù hợp với khẩu vị hoặc thói quen ăn uống (kiêng gluten, ăn chay, ít ngọt, v.v.).
                  </p>
                </div>
              </div>

              {/* DANH SÁCH 7 MÓN VỚI HÌNH ẢNH THỰC TẾ & TÙY CHỌN */}
              <div className="space-y-4">
                {MENU_ITEMS.map((item) => {
                  const choice = dishChoices[item.index];
                  return (
                    <div
                      key={item.index}
                      className="group rounded-2xl border border-border/80 bg-[#fffdf9] p-4 transition-all hover:border-[#b45309]/45 hover:shadow-sm sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        {/* ẢNH THỰC TẾ CỦA MÓN */}
                        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-stone-900/10 sm:h-24 sm:w-32">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <span className="absolute top-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-[#fdf0d5] backdrop-blur-xs">
                            Món 0{item.index}
                          </span>
                        </div>

                        {/* THÔNG TIN MÓN */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b45309]">
                              {item.region}
                            </span>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-xs text-muted-foreground">
                              {item.ingredients?.slice(0, 2).join(", ")}
                            </span>
                          </div>
                          <h3 className="font-heading text-base font-semibold text-[#292524] sm:text-lg">
                            {item.name}
                          </h3>
                          <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* TÙY CHỌN CỦA MÓN ĂN */}
                      {item.options && item.options.length > 0 && (
                        <div className="mt-3.5 border-t border-border/60 pt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Tùy chọn chế biến:
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {item.options.map((opt) => {
                              const active = choice?.optionId === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectDishOption(item.index, opt.id, opt.name)
                                  }
                                  className={cn(
                                    "flex flex-col rounded-xl border p-2.5 text-left text-xs transition-all",
                                    active
                                      ? "border-[#b45309] bg-[#fdf0d5] text-[#92400e] shadow-2xs font-medium"
                                      : "border-border/80 bg-card text-stone-700 hover:border-[#b45309]/50 hover:bg-[#fffdf9]",
                                  )}
                                >
                                  <span className="flex items-center justify-between gap-1">
                                    <span>{opt.name}</span>
                                    {active && (
                                      <Check className="h-3.5 w-3.5 shrink-0 text-[#b45309]" />
                                    )}
                                  </span>
                                  {opt.desc && (
                                    <span className="mt-1 text-[10px] text-muted-foreground">
                                      {opt.desc}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  className="rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Sửa bàn
                </Button>
                <Button
                  size="lg"
                  onClick={() => setStep(4)}
                  className="h-12 min-w-44 rounded-full bg-[#b45309] px-8 text-[#fffbf2] hover:bg-[#92400e]"
                >
                  Tiếp tục: Thông tin khách
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ============ BƯỚC 4: THÔNG TIN KHÁCH & PAIRING ============ */}
          {step === 4 && (
            <motion.div
              key="step-4"
              custom={direction}
              variants={stepSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-semibold text-[#292524]">
                  4. Thông tin khách &amp; Gợi ý Pairing
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(3)}
                  className="h-11 rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  Sửa chọn món
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bk-name">Họ và tên *</Label>
                  <Input
                    id="bk-name"
                    placeholder="vd: Nguyễn Minh Anh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bk-phone">Số điện thoại *</Label>
                  <Input
                    id="bk-phone"
                    placeholder="09xxxxxxxx"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
                      setPhone(val);
                      if (val.length === 10) void checkLoyaltyByPhone(val);
                      else setLoyaltyProfile(null);
                    }}
                    className="h-11"
                  />
                  {checkingLoyalty && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Đang tra cứu hạng thành viên...
                    </p>
                  )}
                  {loyaltyProfile && (
                    <div
                      className={cn(
                        "rounded-lg p-2.5 text-xs transition-all",
                        loyaltyProfile.tier === "NAM_TRAM"
                          ? "border border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-purple-500/15 text-amber-950 font-medium"
                          : loyaltyProfile.tier === "TRAM"
                            ? "border border-amber-300 bg-amber-50 text-amber-900 font-medium"
                            : "border border-stone-200 bg-stone-50 text-stone-700",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {loyaltyProfile.tier === "NAM_TRAM" ? (
                          <Gem className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : loyaltyProfile.tier === "TRAM" ? (
                          <Crown className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : (
                          <Award className="h-4 w-4 text-stone-600 shrink-0" />
                        )}
                        <span>
                          <strong>
                            {loyaltyProfile.tier === "NAM_TRAM"
                              ? "👑 Thượng khách Nam Trầm"
                              : loyaltyProfile.tier === "TRAM"
                                ? "Hạng Trầm"
                                : "Hạng Hương"}
                          </strong>{" "}
                          ({loyaltyProfile.visits} lượt đến · {loyaltyProfile.points.toLocaleString("vi-VN")} pts)
                          {loyaltyProfile.tier === "NAM_TRAM" && (
                            <span className="block mt-0.5 text-emerald-800 font-bold">
                              ✨ Đặc quyền Thượng khách Nam Trầm: Miễn 100% tiền đặt cọc!
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bk-email">Email (nhận xác nhận &amp; thực đơn)</Label>
                <Input
                  id="bk-email"
                  type="email"
                  placeholder="vidu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Gói Pairing đi kèm thực đơn</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { value: "NONE", label: "Không pairing", price: 0, icon: Ban },
                      {
                        value: "WINE",
                        label: "Wine pairing",
                        price: PRICES.winePairing,
                        icon: Wine,
                      },
                      {
                        value: "TEA",
                        label: "Tea pairing",
                        price: PRICES.teaPairing,
                        icon: Coffee,
                      },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = pairing === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPairing(opt.value)}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                          active
                            ? "border-[#b45309] bg-[#fdf0d5]/70 shadow-sm"
                            : "border-border bg-[#fffdf9] hover:border-[#b45309]/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            active
                              ? "bg-[#b45309] text-[#fffbf2]"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-[#292524]">
                            {opt.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {opt.price === 0
                              ? "—"
                              : `+${formatVND(opt.price)} / khách`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bk-notes">Ghi chú cho nhà hàng</Label>
                <Textarea
                  id="bk-notes"
                  placeholder="vd: chỗ yên tĩnh, có trẻ em đi cùng..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-24"
                />
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-stone-700">
                    <Checkbox
                      checked={allergySeafood}
                      onCheckedChange={(v) => setAllergySeafood(v === true)}
                      aria-label="Dị ứng hải sản"
                    />
                    Dị ứng hải sản
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-stone-700">
                    <Checkbox
                      checked={birthday}
                      onCheckedChange={(v) => setBirthday(v === true)}
                      aria-label="Đặt bàn sinh nhật"
                    />
                    Đặt bàn sinh nhật
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-stone-700">
                    <Checkbox
                      checked={anniversary}
                      onCheckedChange={(v) => setAnniversary(v === true)}
                      aria-label="Kỷ niệm"
                    />
                    Kỷ niệm
                  </label>
                </div>
                {allergySeafood && (
                  <p className="flex items-center gap-1.5 text-xs text-[#b3261e]">
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                    Bếp sẽ tự động thay thế nguyên liệu hải sản sang gỏi rau rừng chay &amp; canh nấm thanh ngọt.
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(3)}
                  className="rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Sửa món đã chọn
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    if (validateStep4()) setStep(5);
                  }}
                  className="h-12 min-w-40 rounded-full bg-[#b45309] px-8 text-[#fffbf2] hover:bg-[#92400e]"
                >
                  Xem tổng đơn &amp; cọc
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ============ BƯỚC 5: XÁC NHẬN & ĐẶT CỌC ============ */}
          {step === 5 && selectedTable && (
            <motion.div
              key="step-5"
              custom={direction}
              variants={stepSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-semibold text-[#292524]">
                  5. Xác nhận thông tin &amp; đặt cọc
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(4)}
                  className="h-11 rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  Sửa thông tin
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-border bg-[#fffdf9] p-4 text-sm">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Thông tin đặt bàn
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Ngày</span>
                    <span className="font-medium text-[#292524]">
                      {date ? formatLongDate(date) : ""}
                    </span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Khung giờ</span>
                    <span className="font-medium text-[#292524]">
                      {slot === "SLOT_1730" ? "17:30" : "19:45"}
                    </span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Bàn</span>
                    <span className="font-medium text-[#292524]">
                      {selectedTable.table.code} ({selectedTable.table.zone})
                    </span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Số khách</span>
                    <span className="font-medium text-[#292524]">
                      {partySize} khách
                    </span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Khách đại diện</span>
                    <span className="font-medium text-[#292524]">
                      {name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {phone}
                      </span>
                    </span>
                  </p>
                  {finalAllergy && (
                    <Badge className="mt-1 w-fit border-[#b3261e]/40 bg-[#b3261e]/10 text-[#b3261e] hover:bg-[#b3261e]/10">
                      Dị ứng: {finalAllergy}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-[#fffdf9] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Chi phí &amp; Tiền cọc
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Menu 7 món × {partySize}
                      </span>
                      <span className="font-medium text-[#292524]">
                        {formatVND(PRICES.menu * partySize)}
                      </span>
                    </p>
                    {pairing !== "NONE" && (
                      <p className="flex justify-between gap-2">
                        <span className="text-muted-foreground">
                          {PAIRING_LABELS[pairing]} × {partySize}
                        </span>
                        <span className="font-medium text-[#292524]">
                          {formatVND(pairingPrice * partySize)}
                        </span>
                      </p>
                    )}
                    <Separator className="bg-border" />
                    <p className="flex justify-between gap-2 text-base">
                      <span className="font-medium text-stone-700">
                        Tổng dự kiến
                      </span>
                      <span className="font-heading font-semibold text-[#292524]">
                        {formatVND(totalAmount)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Đặt cọc ({formatVND(PRICES.deposit)} × {partySize})
                      </span>
                      {isNamTram ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs line-through text-stone-400">
                            {formatVND(depositAmount)}
                          </span>
                          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            0 đ (Miễn cọc VIP)
                          </span>
                        </span>
                      ) : (
                        <span className="font-medium text-[#b45309]">
                          {formatVND(depositAmount)}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Phần còn lại thanh toán tại nhà hàng khi dùng bữa. Hoàn cọc nếu hủy trước 48 giờ.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => {
                    setPayPhase("method");
                    setPayOpen(true);
                  }}
                  className="h-14 min-w-72 rounded-full bg-[#b45309] px-10 text-base text-[#fffbf2] shadow-lg shadow-[#b45309]/25 hover:bg-[#92400e]"
                >
                  <ShieldCheck className="mr-2 h-5 w-5" aria-hidden />
                  Thanh toán cọc · {formatVND(depositAmount)}
                </Button>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Mail className="h-3 w-3" aria-hidden />
                  Xác nhận &amp; thực đơn chi tiết sẽ được gửi qua Email / Zalo
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      </Card>

      <PaymentDialog
        open={payOpen}
        phase={payPhase}
        amount={depositAmount}
        onClose={() => setPayOpen(false)}
        onSelectMethod={() => handlePayMethod()}
        onDone={() => void submitReservation()}
      />

      {submitting && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Đang ghi nhận lượt đặt bàn &amp; lưu thực đơn vào hệ thống...
        </p>
      )}
    </main>

      {/* ================= CHẤM ĐIỀU HƯỚNG BÊN PHẢI (GIỐNG TRANG CHỦ TRẦM) ================= */}
      <StepIndicator step={step} onStepClick={setStep} />
    </>
  );
}
