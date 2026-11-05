"use client";

// FR-32 — Card "Danh sách mua trước ca" cho bếp trưởng:
// Đối chiếu nhu cầu thực tế theo ca với tồn kho, tự động tính số lượng thiếu (thiếu = max(0, nhu cầu - tồn kho)),
// chỉ xuất những dòng thiếu > 0 kèm chi phí mua = số thiếu × đơn giá.

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
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
import { useTramEventListener } from "@/lib/tram/events";

interface ShiftPurchaseCardProps {
  stockOverrides: Record<string, number>;
  priceOverrides: Record<string, number>;
  today?: string | null;
  className?: string;
  onStockIn?: (ingredientId: string, suggestedQty?: number) => void;
}

const QUICK_GUESTS_BUTTONS = [4, 10, 20, 42];

export function ShiftPurchaseCard({
  stockOverrides,
  priceOverrides,
  today,
  className,
  onStockIn,
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
  const fetchShiftReservations = useCallback(() => {
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

  useEffect(() => {
    return fetchShiftReservations();
  }, [fetchShiftReservations]);

  useTramEventListener(
    useCallback(
      (event) => {
        if (event.type === "RESERVATION_CHANGED") {
          fetchShiftReservations();
        }
      },
      [fetchShiftReservations],
    ),
  );

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
        "min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 font-heading shadow-sm transition-all",
        className,
      )}
    >
      {/* ==================== 1. CARD HEADER ==================== */}
      <CardHeader className="gap-3 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-[#292524]">
              <ShoppingCart className="h-4 w-4 text-[#7c2d12]" aria-hidden />
              Danh sách mua trước ca
              {report.neededCount > 0 ? (
                <span className="text-xs font-semibold italic text-rose-800">
                  — cần mua {report.neededCount}/{report.totalCheckedIngredients} món
                </span>
              ) : (
                <span className="text-xs font-semibold italic text-emerald-800">
                  — đủ tồn kho 100%
                </span>
              )}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Đối chiếu nhu cầu thực tế theo ca với tồn kho · Dự toán chi phí nhập hàng đầu ca
            </p>
          </div>

          {/* Các nút sao chép nhanh Zalo & Email */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => copyTextToClipboard(report.zaloMessage, "zalo")}
              className={cn(
                "h-8 rounded-sm px-3 font-heading text-xs font-semibold shadow-none transition-colors",
                copiedChannel === "zalo"
                  ? "bg-emerald-800 text-white hover:bg-emerald-900"
                  : "bg-[#7c2d12] text-[#fdf0d5] hover:bg-[#5f200c]",
              )}
            >
              {copiedChannel === "zalo" ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Đã chép Zalo
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
                "h-8 rounded-sm border-stone-300 bg-transparent px-3 font-heading text-xs font-semibold transition-colors",
                copiedChannel === "email"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "text-stone-700 hover:border-[#7c2d12] hover:text-[#7c2d12]",
              )}
            >
              {copiedChannel === "email" ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-700" />
                  Đã chép Email
                </>
              ) : (
                <>
                  <Mail className="mr-1.5 h-3.5 w-3.5 text-[#7c2d12]" />
                  Sao chép Email
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ==================== 2. THANH ĐIỀU KHIỂN CA PHỤC VỤ ==================== */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          {/* Chọn Ngày & Ca */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#7c2d12]" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Ngày:
              </span>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 w-36 rounded-sm text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#7c2d12]" aria-hidden />
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
                    aria-pressed={active}
                    className={cn(
                      "rounded-sm border px-2.5 py-1 font-heading text-xs font-semibold transition-colors cursor-pointer",
                      active
                        ? "border-[#7c2d12] bg-[#7c2d12] text-[#fdf0d5]"
                        : "border-stone-300 bg-transparent text-stone-600 hover:border-[#7c2d12] hover:text-[#7c2d12]",
                    )}
                  >
                    {slotItem.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Điều khiển số suất khách của ca */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#7c2d12]" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Quy mô ca:
              </span>
              {loadingReservations ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin text-[#7c2d12]" />
                  Đang tải...
                </span>
              ) : actualBookedGuests !== null && actualBookedGuests > 0 ? (
                <span className="text-xs font-semibold text-emerald-800">
                  (Đặt thật: {actualBookedGuests} khách)
                </span>
              ) : null}
            </div>

            {/* Stepper điều chỉnh số khách */}
            <div className="flex items-center rounded-sm border border-stone-300 bg-[#fffdf8] p-0.5">
              <button
                type="button"
                onClick={() => applyGuests(guests - 1)}
                disabled={guests <= 1}
                className="flex h-6 w-6 items-center justify-center rounded-sm text-stone-600 hover:bg-[#fdf0d5] disabled:opacity-30 cursor-pointer"
                aria-label="Giảm 1 khách"
              >
                <Minus className="h-3 w-3" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={guestsInput}
                onChange={handleGuestsInputChange}
                className="h-6 w-11 border-0 bg-transparent text-center font-heading text-xs font-bold tabular-nums text-stone-900 focus:outline-none"
                aria-label="Số lượng khách của ca"
              />
              <button
                type="button"
                onClick={() => applyGuests(guests + 1)}
                disabled={guests >= MAX_SCALE_GUESTS}
                className="flex h-6 w-6 items-center justify-center rounded-sm text-stone-600 hover:bg-[#fdf0d5] disabled:opacity-30 cursor-pointer"
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
                    "rounded-sm border px-2 py-0.5 font-heading text-[11px] font-semibold tabular-nums transition-colors cursor-pointer",
                    guests === q
                      ? "border-[#7c2d12] bg-[#7c2d12] text-[#fdf0d5]"
                      : "border-stone-300 bg-transparent text-stone-600 hover:border-[#7c2d12]",
                  )}
                >
                  {q === 42 ? "42 (Đầy ca)" : `${q} khách`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== 3. THỐNG KÊ NHANH (3 THẺ TỔNG KẾT) ==================== */}
        <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-3">
          <div className="rounded-sm border border-stone-200/90 bg-[#fffdf8] p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                Nguyên liệu cần mua
              </span>
              <ShoppingCart className="h-3.5 w-3.5 text-[#7c2d12]" />
            </div>
            <div
              className={cn(
                "mt-1 font-heading text-lg font-bold tabular-nums",
                report.neededCount > 0 ? "text-rose-800" : "text-emerald-800",
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

          <div className="rounded-sm border border-stone-200/90 bg-[#fffdf8] p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                Nguyên liệu đủ tồn kho
              </span>
              <PackageCheck className="h-3.5 w-3.5 text-emerald-700" />
            </div>
            <div className="mt-1 font-heading text-lg font-bold tabular-nums text-emerald-800">
              {report.sufficientCount} nguyên liệu
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Đủ tồn kho — không xuất để tránh mua thừa
            </p>
          </div>

          <div className="rounded-sm border border-stone-200/90 bg-[#fffdf8] p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                Tổng chi phí dự kiến
              </span>
              <Coins className="h-3.5 w-3.5 text-[#92400e]" />
            </div>
            <div className="mt-1 font-heading text-lg font-bold tabular-nums text-[#92400e]">
              {report.formattedTotalCost}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tính bằng số thiếu × đơn giá nhập kho
            </p>
          </div>
        </div>
      </CardHeader>

      {/* ==================== 4. BẢNG CHI TIẾT DANH SÁCH MUA ==================== */}
      <CardContent className="p-0">
        {report.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <Check className="h-6 w-6 text-emerald-700" />
            <p className="text-sm font-semibold text-stone-800">
              Tồn kho hiện tại đã đáp ứng trọn vẹn ca {report.shiftLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              Tất cả {report.totalCheckedIngredients} nguyên liệu trong thực đơn đều đủ định mức dự trữ.
            </p>
          </div>
        ) : (
          <Table className="min-w-[860px] font-heading">
            <TableHeader>
              <TableRow className="border-b-2 border-[#7c2d12]/50 bg-[#f6efe0] hover:bg-[#f6efe0]">
                <TableHead className="pl-4 text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pl-5">
                  Nguyên liệu
                </TableHead>
                <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Nhu cầu ca
                </TableHead>
                <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Số lượng tồn
                </TableHead>
                <TableHead className="w-40 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Cần mua (Thiếu)
                </TableHead>
                <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Đơn giá kho
                </TableHead>
                <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Thành tiền
                </TableHead>
                {onStockIn && (
                  <TableHead className="w-24 pr-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pr-5">
                    Thao tác
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {report.items.map((item) => (
                <TableRow
                  key={item.ingredientId}
                  className="border-b border-stone-200/80 bg-[#fffdf8] transition-colors hover:bg-[#fdf0d5]/30"
                >
                  <TableCell className="pl-4 sm:pl-5">
                    <div className="flex flex-col">
                      <span className="font-heading font-semibold text-[#292524]">{item.name}</span>
                      {item.origin && (
                        <span className="truncate text-[10.5px] text-muted-foreground">
                          {item.origin}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-heading text-sm font-bold tabular-nums text-stone-900">
                    {item.demandQty} {item.unit}
                  </TableCell>

                  <TableCell className="text-right font-heading text-sm font-bold tabular-nums text-stone-700">
                    {item.stockQty} {item.unit}
                  </TableCell>

                  <TableCell className="text-right font-heading text-sm font-bold tabular-nums text-rose-800">
                    {item.formattedShortage}
                  </TableCell>

                  <TableCell className="text-right text-xs tabular-nums text-stone-600">
                    {formatVND(item.importPrice)}/{item.importUnitLabel}
                  </TableCell>

                  <TableCell className="text-right font-heading font-semibold tabular-nums text-rose-800">
                    {item.formattedCost}
                  </TableCell>

                  {onStockIn && (
                    <TableCell className="pr-4 text-center sm:pr-5">
                      <button
                        type="button"
                        onClick={() => onStockIn(item.ingredientId, Math.ceil(item.shortageQty))}
                        className="inline-flex h-6 items-center gap-1 rounded-sm border border-rose-700 bg-rose-700 px-2 text-[10.5px] font-semibold text-white transition-colors hover:bg-rose-800 cursor-pointer"
                        title={`Nhập ngay ${item.formattedShortage} cho ${item.name}`}
                      >
                        <ArrowDownToLine className="h-3 w-3" />
                        Nhập
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
