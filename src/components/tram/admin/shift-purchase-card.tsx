"use client";

// FR-32 — Card "Danh sách mua trước ca" cho bếp trưởng:
// Đối chiếu nhu cầu thực tế theo ca với tồn kho, tự động tính số lượng thiếu (thiếu = max(0, nhu cầu - tồn kho)),
// chỉ xuất những dòng thiếu > 0 kèm chi phí mua = số thiếu × đơn giá.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  Clock,
  Coins,
  Mail,
  MessageSquare,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingCart,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/tram/format";
import { MAX_SCALE_GUESTS } from "@/lib/tram/recipes";
import { SLOT_LABELS } from "@/lib/tram/constants";
import { calculateShiftPurchaseReport } from "@/lib/tram/purchase";
import type { Slot } from "@/lib/tram/types";

interface ShiftPurchaseCardProps {
  stockOverrides: Record<string, number>;
  priceOverrides: Record<string, number>;
  today?: string | null;
  className?: string;
}

const QUICK_GUESTS_BUTTONS = [4, 10, 20, 42];

export function ShiftPurchaseCard({
  stockOverrides,
  priceOverrides,
  today,
  className,
}: ShiftPurchaseCardProps) {
  const effectiveToday = today ?? new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(effectiveToday);
  const [selectedSlot, setSelectedSlot] = useState<Slot | "ALL">("SLOT_1730");
  const [guests, setGuests] = useState<number>(42);
  const [guestsInput, setGuestsInput] = useState<string>("42");
  const [actualBookedGuests, setActualBookedGuests] = useState<number | null>(null);
  const [loadingReservations, setLoadingReservations] = useState<boolean>(false);
  const [copiedChannel, setCopiedChannel] = useState<"zalo" | "email" | null>(null);

  // Đồng bộ ngày nếu prop today thay đổi
  useEffect(() => {
    if (today && today !== selectedDate) {
      setSelectedDate(today);
    }
  }, [today]);

  // Tự động tải số khách từ danh sách đặt bàn thực tế của ca được chọn
  useEffect(() => {
    let cancelled = false;
    setLoadingReservations(true);

    fetch(`/api/reservations?date=${selectedDate}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.reservations)) {
          setLoadingReservations(false);
          return;
        }

        const validReservations = data.reservations.filter(
          (r: { status?: string; slot?: string; partySize?: number }) => {
            if (r.status === "CANCELLED") return false;
            if (selectedSlot !== "ALL" && r.slot !== selectedSlot) return false;
            return true;
          },
        );

        const totalGuests = validReservations.reduce(
          (sum: number, r: { partySize?: number }) => sum + (r.partySize ?? 0),
          0,
        );

        if (!cancelled) {
          setActualBookedGuests(totalGuests);
          // Nếu ca đó có khách đặt thật thì ưu tiên lấy số khách đặt thật; nếu 0 thì mặc định 1 ca đầy (42 khách)
          const targetGuests = totalGuests > 0 ? totalGuests : 42;
          setGuests(targetGuests);
          setGuestsInput(String(targetGuests));
          setLoadingReservations(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingReservations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedSlot]);

  function applyGuests(value: number) {
    const clamped = Math.min(MAX_SCALE_GUESTS, Math.max(1, Math.round(value)));
    setGuests(clamped);
    setGuestsInput(String(clamped));
  }

  function handleGuestsInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 3);
    setGuestsInput(raw);
    const parsed = Number(raw);
    if (raw !== "" && parsed >= 1 && parsed <= MAX_SCALE_GUESTS) {
      setGuests(parsed);
    }
  }

  // Nghiệp vụ FR-32: Tính danh sách mua và đối chiếu nhu cầu - tồn kho thời gian thực
  const report = useMemo(() => {
    return calculateShiftPurchaseReport(guests, {
      date: selectedDate,
      slot: selectedSlot,
      stockOverrides,
      priceOverrides,
    });
  }, [guests, selectedDate, selectedSlot, stockOverrides, priceOverrides]);

  // Sao chép tin nhắn vào clipboard với fallback an toàn
  async function copyTextToClipboard(text: string, channel: "zalo" | "email") {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedChannel(channel);
      toast.success(
        channel === "zalo"
          ? "Đã sao chép tin nhắn Zalo gửi Nhà cung cấp!"
          : "Đã sao chép toàn bộ thư Email đặt hàng gửi Nhà cung cấp!",
      );
      setTimeout(() => setCopiedChannel(null), 2400);
    } catch {
      toast.error("Không thể tự động sao chép. Vui lòng chọn và sao chép thủ công.");
    }
  }

  return (
    <Card
      className={cn(
        "min-w-0 gap-0 overflow-hidden border-2 border-[#b45309]/30 bg-card py-0 font-heading shadow-sm transition-all",
        className,
      )}
    >
      {/* ==================== 1. CARD HEADER ==================== */}
      <CardHeader className="border-b border-border/70 bg-gradient-to-r from-[#fffcf7] via-[#fdf8f0] to-[#fffbf2] px-4 py-3.5 sm:px-5 [.border-b]:pb-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#b45309] text-white shadow-2xs">
              <ShoppingCart className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-heading text-base font-bold text-[#292524] sm:text-lg">
                  Danh sách mua trước ca
                </CardTitle>
                {report.neededCount > 0 ? (
                  <Badge className="border-0 bg-rose-600 px-2 py-0.5 text-[10.5px] font-bold text-white shadow-2xs">
                    Cần mua {report.neededCount}/{report.totalCheckedIngredients} món
                  </Badge>
                ) : (
                  <Badge className="border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                    Đủ tồn kho 100%
                  </Badge>
                )}
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                Đối chiếu nhu cầu thực tế theo ca với tồn kho · Dự toán chi phí nhập hàng đầu ca
              </p>
            </div>
          </div>

          {/* Các nút sao chép nhanh Zalo & Email */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => copyTextToClipboard(report.zaloMessage, "zalo")}
              className={cn(
                "h-8.5 rounded-xl px-3 text-xs font-semibold shadow-xs transition-all",
                copiedChannel === "zalo"
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : "bg-[#0068ff] text-white hover:bg-[#0052cc]",
              )}
            >
              {copiedChannel === "zalo" ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Đã chép Zalo!
                </>
              ) : (
                <>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Sao chép Zalo
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copyTextToClipboard(report.emailBody, "email")}
              className={cn(
                "h-8.5 rounded-xl px-3 text-xs font-semibold transition-all border-[#b45309]/40",
                copiedChannel === "email"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-400"
                  : "text-[#92400e] hover:bg-[#fdf0d5] hover:text-[#78350f]",
              )}
            >
              {copiedChannel === "email" ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-700" />
                  Đã chép Email!
                </>
              ) : (
                <>
                  <Mail className="mr-1.5 h-3.5 w-3.5 text-[#b45309]" />
                  Sao chép Email
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* ==================== 2. THANH ĐIỀU KHIỂN CA PHỤC VỤ ==================== */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Chọn Ngày & Ca */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#b45309]" aria-hidden />
                <span className="text-xs font-semibold text-stone-700">Ngày:</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 w-36 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="h-4 w-px bg-border/80 hidden sm:block" />

              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#b45309] mr-0.5" aria-hidden />
                {(
                  [
                    { key: "SLOT_1730" as const, label: SLOT_LABELS.SLOT_1730 },
                    { key: "SLOT_1945" as const, label: SLOT_LABELS.SLOT_1945 },
                    { key: "ALL" as const, label: "Cả 2 ca" },
                  ]
                ).map((slotItem) => {
                  const active = selectedSlot === slotItem.key;
                  return (
                    <button
                      key={slotItem.key}
                      type="button"
                      onClick={() => setSelectedSlot(slotItem.key)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                        active
                          ? "bg-[#b45309] text-white shadow-2xs"
                          : "border border-border/80 bg-background text-stone-600 hover:border-[#b45309]/40 hover:bg-[#fdf0d5]/40",
                      )}
                    >
                      {slotItem.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Điều khiển số suất khách của ca */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 lg:border-t-0 lg:pt-0">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#b45309]" aria-hidden />
                <span className="text-xs font-semibold text-stone-700">Quy mô ca:</span>
                {loadingReservations ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin text-[#b45309]" />
                    Đang tải đơn...
                  </span>
                ) : actualBookedGuests !== null && actualBookedGuests > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-[10.5px] font-semibold text-emerald-800"
                    title="Số khách thực tế từ các đơn đặt bàn chưa hủy của ca này"
                  >
                    Đơn đặt thật: {actualBookedGuests} khách
                  </Badge>
                ) : null}
              </div>

              {/* Stepper điều chỉnh số khách */}
              <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => applyGuests(guests - 1)}
                  disabled={guests <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-muted disabled:opacity-30"
                  aria-label="Giảm 1 khách"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={guestsInput}
                  onChange={handleGuestsInputChange}
                  className="h-7 w-11 border-0 bg-transparent text-center font-heading text-sm font-bold tabular-nums text-stone-900 focus:outline-none"
                  aria-label="Số lượng khách của ca"
                />
                <button
                  type="button"
                  onClick={() => applyGuests(guests + 1)}
                  disabled={guests >= MAX_SCALE_GUESTS}
                  className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-muted disabled:opacity-30"
                  aria-label="Tăng 1 khách"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Nút chọn nhanh */}
              <div className="flex items-center gap-1">
                {QUICK_GUESTS_BUTTONS.map((q) => (
                  <button
                    key={`q-btn-${q}`}
                    type="button"
                    onClick={() => applyGuests(q)}
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums transition-colors",
                      guests === q
                        ? "bg-stone-800 text-white"
                        : "border border-border/80 bg-background text-stone-600 hover:border-stone-400",
                    )}
                  >
                    {q === 42 ? "42 (Đầy ca)" : `${q}k`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 3. THỐNG KÊ NHANH (3 THẺ TỔNG KẾT) ==================== */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-[#fffdfa] p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-600">Nguyên liệu cần mua</span>
              <ShoppingCart className="h-3.5 w-3.5 text-[#b45309]" />
            </div>
            <div
              className={cn(
                "mt-1 font-heading text-xl font-bold tabular-nums",
                report.neededCount > 0 ? "text-rose-700" : "text-emerald-700",
              )}
            >
              {report.neededCount} / {report.totalCheckedIngredients} món
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {report.neededCount > 0
                ? "Chỉ xuất các dòng thiếu > 0 theo nhu cầu thực"
                : "Không có nguyên liệu nào bị thiếu"}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-[#fffdfa] p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-600">Nguyên liệu đủ tồn kho</span>
              <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 font-heading text-xl font-bold tabular-nums text-emerald-800">
              {report.sufficientCount} nguyên liệu
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Đủ tồn kho — không xuất để tránh mua thừa
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-[#fffdfa] p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-600">Tổng chi phí dự kiến</span>
              <Coins className="h-3.5 w-3.5 text-[#b45309]" />
            </div>
            <div className="mt-1 font-heading text-xl font-bold tabular-nums text-[#92400e]">
              {report.formattedTotalCost}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tính bằng số thiếu × đơn giá nhập kho
            </p>
          </div>
        </div>

        {/* ==================== 4. BẢNG CHI TIẾT DANH SÁCH MUA ==================== */}
        {report.items.length === 0 ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-5 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-5 w-5" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-emerald-900">
              Tồn kho hiện tại đã đáp ứng trọn vẹn ca {report.shiftLabel}
            </h4>
            <p className="mt-1 text-xs text-emerald-700">
              Tất cả {report.totalCheckedIngredients} nguyên liệu trong thực đơn đều đủ định mức dự trữ.
              Không cần mua thêm — giúp tối ưu vốn lưu động và tránh tồn kho dư thừa.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80">
            <Table className="font-heading">
              <TableHeader>
                <TableRow className="bg-[#fdf0d5]/50 hover:bg-[#fdf0d5]/50">
                  <TableHead className="pl-4 text-[11px] font-semibold uppercase tracking-wider text-stone-700">
                    Nguyên liệu
                  </TableHead>
                  <TableHead className="w-28 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-700">
                    Nhu cầu ca
                  </TableHead>
                  <TableHead className="w-28 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-700">
                    Tồn kho
                  </TableHead>
                  <TableHead className="w-40 text-right text-[11px] font-semibold uppercase tracking-wider text-rose-800">
                    Cần mua (Thiếu)
                  </TableHead>
                  <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-700">
                    Đơn giá kho
                  </TableHead>
                  <TableHead className="w-32 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#92400e]">
                    Thành tiền
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {report.items.map((item) => (
                  <TableRow key={item.ingredientId} className="hover:bg-muted/30">
                    <TableCell className="pl-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#292524]">{item.name}</span>
                        {item.origin && (
                          <span className="truncate text-[10.5px] text-muted-foreground">
                            {item.origin}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right text-xs tabular-nums text-stone-700">
                      {item.demandQty} {item.unit}
                    </TableCell>

                    <TableCell className="text-right text-xs tabular-nums text-stone-600">
                      {item.stockQty} {item.unit}
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge className="border-0 bg-rose-100 text-rose-800 px-2 py-0.5 text-xs font-bold tabular-nums">
                        {item.formattedShortage}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right text-xs tabular-nums text-stone-600">
                      {formatVND(item.importPrice)}/{item.importUnitLabel}
                    </TableCell>

                    <TableCell className="pr-4 text-right font-heading text-xs font-bold tabular-nums text-[#92400e]">
                      {item.formattedCost}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
