"use client";

// Các thành phần dùng chung của màn Quản trị
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  addDays,
  formatShortDate,
  todayLocalISO,
  WEEKDAY_LABELS,
  weekdayOf,
} from "@/lib/tram/format";
import { SLOT_TIMES, STATUS_LABELS } from "@/lib/tram/constants";
import type { Slot } from "@/lib/tram/types";

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

// ---------- Dải chọn ngày (hôm qua → 10 ngày tới) ----------
export function DayStrip({
  today,
  selected,
  onSelect,
  days = 11,
}: {
  today: string;
  selected: string;
  onSelect: (iso: string) => void;
  days?: number;
}) {
  const list = Array.from({ length: days }, (_, i) => addDays(addDays(today, -1), i));
  return (
    <div className="tram-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
      {list.map((iso) => {
        const wd = weekdayOf(iso);
        const isMonday = wd === 1;
        const isSelected = selected === iso;
        const dayNum = Number(iso.slice(8, 10));
        return (
          <button
            key={iso}
            type="button"
            disabled={isMonday}
            onClick={() => onSelect(iso)}
            aria-pressed={isSelected}
            aria-label={`Chọn ngày ${iso}`}
            className={cn(
              "flex h-[62px] w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-all",
              isMonday
                ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground/50"
                : isSelected
                  ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-md shadow-[#b45309]/25"
                  : "border-border bg-card text-stone-600 hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/60",
            )}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide">
              {WEEKDAY_LABELS[wd]}
            </span>
            <span className="font-heading text-lg font-semibold leading-none">
              {dayNum}
            </span>
            <span className="text-[9px] leading-none">
              {iso === today ? "Hôm nay" : isMonday ? "Nghỉ" : ""}
            </span>
          </button>
        );
      })}
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
