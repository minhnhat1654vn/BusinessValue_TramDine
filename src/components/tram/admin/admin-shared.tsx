"use client";

// Các thành phần dùng chung của màn Quản trị
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  addDays,
  formatLongDate,
  formatShortDate,
  todayLocalISO,
  WEEKDAY_LABELS,
  weekdayOf,
} from "@/lib/tram/format";
import { SLOT_TIMES, STATUS_LABELS } from "@/lib/tram/constants";
import type { Slot } from "@/lib/tram/types";
import {
  checkDateBookingAllowed,
  type BookingProgramSettings,
} from "@/lib/tram/booking-settings";

// ---------- Hook fetch JSON ----------
export function useJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Lỗi tải dữ liệu");
        return body as T;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Lỗi tải dữ liệu");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, refresh };
}

// ---------- Dải chọn ngày giống giao diện Khách hàng (User-like: Nhóm 4-5 tuần, thẻ ngày trực quan, trạng thái mở/nghỉ) ----------
export function DayStrip({
  today,
  selected,
  onSelect,
  settings,
  numWeeks = 5,
}: {
  today: string;
  selected: string;
  onSelect: (iso: string) => void;
  settings?: BookingProgramSettings | null;
  numWeeks?: number;
  days?: number; // tương thích ngược
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Nhóm theo tuần bắt đầu từ Thứ Hai tuần này (chuẩn lịch Việt Nam & ISO, T2 đến CN)
  const weeks = useMemo(() => {
    const dayOfWeek = weekdayOf(today); // 0 = CN, 1 = T2, ..., 6 = T7
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = addDays(today, -daysSinceMonday);
    return Array.from({ length: numWeeks }, (_, w) => {
      const start = addDays(monday, w * 7);
      return {
        label:
          w === 0 ? "Tuần này" : w === 1 ? "Tuần sau" : `Tuần ${w + 1}`,
        days: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
      };
    });
  }, [today, numWeeks]);

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
    const el = document.getElementById(`day-strip-${selected}`);
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
                const isMonday = wd === 1;
                let disabled = isPast;
                let statusLabel = "";
                let titleDesc = formatLongDate(iso);

                if (isPast) {
                  disabled = true;
                  statusLabel = "Qua";
                  titleDesc += " — Ngày đã qua (chương trình đã chạy)";
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
                } else if (isMonday) {
                  disabled = true;
                  statusLabel = "Nghỉ";
                  titleDesc += " — Nghỉ định kỳ Thứ 2";
                }

                if (iso === today) {
                  statusLabel = "Hôm nay";
                  disabled = false;
                }

                const isSelected = selected === iso;
                const dayNum = Number(iso.slice(8, 10));

                return (
                  <button
                    key={iso}
                    id={`day-strip-${iso}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onSelect(iso)}
                    aria-label={titleDesc}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-[72px] w-[46px] sm:w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-all select-none",
                      disabled
                        ? "cursor-not-allowed border-border/50 bg-muted/40 text-muted-foreground/40 opacity-50"
                        : isSelected
                          ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-md shadow-[#b45309]/30 scale-105 z-10 font-bold ring-2 ring-amber-300 cursor-pointer"
                          : "border-border bg-card text-stone-700 hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/60 hover:scale-[1.02] cursor-pointer"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-medium uppercase tracking-wide",
                        isSelected ? "text-amber-100" : "text-muted-foreground"
                      )}
                    >
                      {WEEKDAY_LABELS[wd]}
                    </span>
                    <span className="font-heading text-lg font-semibold leading-none">
                      {dayNum}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-semibold leading-none",
                        isSelected
                          ? "text-amber-100 font-bold"
                          : statusLabel === "Hôm nay"
                            ? "text-[#b45309] font-bold"
                            : statusLabel === "Nghỉ" || statusLabel === "Nghỉ lễ"
                              ? "text-rose-600"
                              : "text-muted-foreground"
                      )}
                    >
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

// ---------- Công tắc khung giờ ----------
export function SlotToggle({
  value,
  onChange,
}: {
  value: Slot;
  onChange: (s: Slot) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-muted p-1" role="group" aria-label="Chọn khung giờ">
      {SLOT_TIMES.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onChange(s.value)}
          aria-pressed={value === s.value}
          className={cn(
            "h-9 min-w-20 rounded-full px-4 text-sm font-medium transition-colors",
            value === s.value
              ? "bg-[#b45309] text-[#fffbf2] shadow-sm"
              : "text-muted-foreground hover:text-[#92400e]",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Huy trạng thái đặt bàn ----------
export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const styles: Record<string, string> = {
    PENDING: "border-[#b45309]/40 bg-[#fdf0d5] text-[#92400e]",
    CONFIRMED: "border-[#b45309]/50 bg-[#fde8c8]/70 text-[#92400e]",
    SEATED: "border-emerald-600/40 bg-emerald-100/70 text-emerald-800",
    NO_SHOW: "border-rose-600/40 bg-rose-100/70 text-rose-700",
    CANCELLED: "border-stone-400/40 bg-stone-100 text-stone-500",
  };
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap font-medium", styles[status])}
    >
      {label}
    </Badge>
  );
}

// ---------- Huy dị ứng (đỏ nổi bật) ----------
export function AllergyBadge({ allergy }: { allergy: string }) {
  return (
    <Badge className="whitespace-nowrap border-[#b3261e] bg-[#b3261e] font-medium text-white hover:bg-[#b3261e]">
      Dị ứng: {allergy}
    </Badge>
  );
}

// ---------- Trạng thái đang tải / lỗi ----------
export function LoadingBlock({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-[#b45309]" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-[#b3261e]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-11 rounded-full border border-[#b45309]/40 px-6 text-sm font-medium text-[#92400e] transition-colors hover:bg-[#fdf0d5]"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

export function useToday() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(todayLocalISO());
  }, []);
  return today;
}

export function adminToastError(e: unknown) {
  toast.error(e instanceof Error ? e.message : "Đã có lỗi xảy ra.");
}
