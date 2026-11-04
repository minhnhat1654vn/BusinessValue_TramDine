"use client";

// FR-32 — Card "Danh sách mua trước ca" cho bếp trưởng:
// Đối chiếu nhu cầu thực tế theo ca với tồn kho, tự động tính số lượng thiếu (thiếu = max(0, nhu cầu - tồn kho)),
// chỉ xuất những dòng thiếu > 0 kèm chi phí mua = số thiếu × đơn giá.
// Bản xem trước tin nhắn gửi nhà cung cấp (Zalo/Email) chuyên nghiệp, chuẩn mực nghiệp vụ nhà hàng Fine Dining.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
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
import { RESTAURANT, SLOT_LABELS } from "@/lib/tram/constants";
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
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [activeChannel, setActiveChannel] = useState<"zalo" | "email">("zalo");

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

  function handleOpenEmailClient() {
    const subject = encodeURIComponent(report.emailSubject);
    const body = encodeURIComponent(report.emailBody);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  function handleOpenZaloWeb() {
    window.open("https://chat.zalo.me", "_blank");
  }

  return (
    <Card
      className={cn(
        "min-w-0 gap-0 overflow-hidden border-2 border-[#b45309]/30 bg-card py-0 shadow-sm transition-all",
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
                Đối chiếu nhu cầu thực tế theo ca với tồn kho · Xuất chi phí &amp; bản tin nhắn gửi nhà cung cấp
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
            <Table>
              <TableHeader>
                <TableRow className="bg-[#fdf0d5]/50 hover:bg-[#fdf0d5]/50">
                  <TableHead className="pl-4 text-[11px] font-semibold uppercase tracking-wider text-stone-700">
                    Nguyên liệu (Mã)
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
                        <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <code className="rounded bg-muted px-1 py-0.2 font-mono text-[10px] text-stone-600">
                            {item.ingredientId}
                          </code>
                          {item.origin && <span className="truncate">· {item.origin}</span>}
                        </div>
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

        {/* ==================== 5. BẢN XEM TRƯỚC TIN NHẮN GỬI NHÀ CUNG CẤP (ZALO / EMAIL) ==================== */}
        <div className="overflow-hidden rounded-2xl border border-stone-300/80 bg-white shadow-xs">
          {/* Header khu vực xem trước kèm Tab chuyển đổi kênh Zalo / Email */}
          <div className="flex flex-col gap-2.5 border-b border-border/80 bg-[#fbf9f5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309]/15 text-[#b45309]">
                <Send className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#292524]">
                  Bản xem trước tin nhắn gửi Nhà Cung Cấp
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Định dạng bài bản, chuyên nghiệp — sẵn sàng gửi qua Zalo hoặc thư Email
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 2 Tabs chuyển kênh Zalo / Email */}
              <div className="flex rounded-xl border border-border/80 bg-background p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveChannel("zalo")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                    activeChannel === "zalo"
                      ? "bg-[#0068ff] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900",
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Zalo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel("email")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                    activeChannel === "email"
                      ? "bg-[#b45309] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900",
                  )}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </button>
              </div>

              {/* Nút thu gọn / mở rộng */}
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-stone-500 hover:bg-muted"
                aria-label={showPreview ? "Thu gọn bản xem trước" : "Mở rộng bản xem trước"}
              >
                {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="p-4 sm:p-5 space-y-4">
              {activeChannel === "zalo" ? (
                /* ==================== GIAO DIỆN XEM TRƯỚC ZALO ==================== */
                <div className="space-y-3">
                  {/* Bong bóng chat Zalo sang trọng */}
                  <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-[#f4f8ff] to-[#edf4ff] p-4 sm:p-5 shadow-inner space-y-3">
                    <div className="flex items-center gap-2 border-b border-blue-200/60 pb-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0068ff] text-white font-heading font-bold text-xs shadow-xs">
                        TRẦM
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <span>Bếp trưởng TRẦM Reserve</span>
                          <span className="text-[10px] font-normal text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded-full">
                            Đã xác minh
                          </span>
                        </div>
                        <div className="text-[10.5px] text-muted-foreground">
                          Gửi đến: Nhà cung cấp nguyên liệu · {report.formattedDate}
                        </div>
                      </div>
                    </div>

                    {/* Nội dung tin nhắn Zalo có format đẹp */}
                    <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-2xs space-y-3 font-sans text-xs leading-relaxed text-stone-800">
                      <div className="font-bold text-sm text-[#1e3a8a] border-b border-blue-100 pb-2">
                        🌿 NHÀ HÀNG TRẦM RESERVE — ĐƠN ĐẶT NGUYÊN LIỆU ĐẦU CA
                      </div>

                      <p className="text-stone-700">
                        Kính gửi Quý Nhà cung cấp / Anh/Chị phụ trách điều phối,
                      </p>
                      <p className="text-stone-700">
                        Bếp TRẦM Reserve ({RESTAURANT.address}) xin gửi đơn đặt nguyên liệu cần giao trước ca phục vụ:
                      </p>

                      <div className="rounded-lg bg-blue-50/70 p-3 space-y-1 text-[11.5px] text-blue-950 border border-blue-100/70">
                        <div className="font-semibold text-blue-900">📍 THÔNG TIN GIAO HÀNG:</div>
                        <div>• <strong>Ca phục vụ:</strong> {report.shiftLabel}</div>
                        <div>• <strong>Ngày giao:</strong> {report.formattedDate} (Quy mô: {report.guests} khách)</div>
                        <div>• <strong>Thời gian nhận yêu cầu:</strong> {report.deliveryDeadline}</div>
                        <div>• <strong>Địa điểm nhận hàng:</strong> Cửa nhập nguyên liệu Bếp TRẦM — {RESTAURANT.address}</div>
                      </div>

                      {report.items.length === 0 ? (
                        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800 border border-emerald-200">
                          ✅ Tồn kho hiện tại đã ĐỦ cho ca phục vụ ({report.sufficientCount}/{report.totalCheckedIngredients} nguyên liệu đạt định mức). Không cần đặt mua bổ sung.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="font-semibold text-stone-900">
                            📦 DANH SÁCH NGUYÊN LIỆU CẦN GIAO ({report.items.length} mặt hàng):
                          </div>
                          <div className="space-y-2">
                            {report.items.map((item, idx) => (
                              <div
                                key={`zalo-item-${item.ingredientId}`}
                                className="rounded-lg border border-border/80 bg-muted/20 p-2.5 space-y-1"
                              >
                                <div className="font-bold text-stone-900">
                                  {idx + 1}. {item.name}{" "}
                                  <span className="font-mono text-[10px] text-stone-500 font-normal">
                                    (Mã: {item.ingredientId})
                                  </span>
                                </div>
                                {(item.spec || item.origin) && (
                                  <div className="text-[11px] text-stone-600">
                                    • Quy cách: {[item.spec, item.origin].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center justify-between gap-1 text-[11.5px]">
                                  <span>
                                    • Số lượng đặt: <strong className="text-rose-700">{item.formattedShortage}</strong>
                                  </span>
                                  <span>
                                    Đơn giá: {formatVND(item.importPrice)}/{item.importUnitLabel}
                                  </span>
                                  <span className="font-bold text-[#b45309]">
                                    Thành tiền: {item.formattedCost}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-right">
                            <span className="text-stone-700 mr-2 text-xs">TỔNG CỘNG ĐƠN HÀNG DỰ KIẾN:</span>
                            <span className="font-heading text-base font-bold text-[#92400e]">
                              {report.formattedTotalCost}
                            </span>
                          </div>

                          <div className="rounded-lg bg-rose-50/70 p-2.5 text-[11px] text-rose-950 border border-rose-100">
                            <div className="font-semibold text-rose-900 mb-0.5">⚠️ LƯU Ý GIAO HÀNG &amp; BẢO QUẢN:</div>
                            <div>- Nguyên liệu tươi sống bảo quản nhiệt độ chuẩn (thùng lạnh 0–2°C).</div>
                            <div>- Kèm phiếu giao hàng và hóa đơn để Bếp trưởng kiểm định chất lượng khi nhận.</div>
                            <div>- Vui lòng phản hồi tin nhắn này để xác nhận đơn hàng và thời gian giao dự kiến.</div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border/60 text-stone-600 space-y-0.5">
                        <p>Trân trọng cảm ơn Quý đối tác!</p>
                        <p className="font-semibold text-stone-900">
                          Bếp trưởng TRẦM Reserve · Hotline Bếp: {RESTAURANT.hotline}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Thanh nút hành động Zalo */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Bấm sao chép để dán trực tiếp vào nhóm Zalo NCC hoặc chat riêng
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleOpenZaloWeb}
                        className="h-8 text-xs font-semibold text-[#0068ff] border-[#0068ff]/40 hover:bg-blue-50"
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Mở Zalo Web
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => copyTextToClipboard(report.zaloMessage, "zalo")}
                        className="h-8 rounded-lg bg-[#0068ff] text-xs font-semibold text-white hover:bg-[#0052cc] shadow-2xs"
                      >
                        {copiedChannel === "zalo" ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Đã sao chép tin Zalo!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Sao chép tin nhắn Zalo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ==================== GIAO DIỆN XEM TRƯỚC EMAIL ==================== */
                <div className="space-y-3">
                  {/* Cửa sổ Email composer chuyên nghiệp */}
                  <div className="rounded-2xl border border-stone-300 bg-white shadow-sm overflow-hidden text-xs">
                    {/* Header thông tin thư */}
                    <div className="border-b border-border bg-stone-50/80 p-3 space-y-1.5 text-stone-700">
                      <div className="flex items-center gap-2">
                        <span className="w-16 font-semibold text-muted-foreground text-[11px]">Từ:</span>
                        <span className="font-medium text-stone-900">
                          {RESTAURANT.email}{" "}
                          <span className="text-muted-foreground font-normal">(Bếp TRẦM Reserve)</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-16 font-semibold text-muted-foreground text-[11px]">Đến:</span>
                        <span className="text-stone-800">Quý Nhà cung cấp nguyên liệu ẩm thực</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <span className="w-16 font-semibold text-muted-foreground text-[11px]">Tiêu đề:</span>
                        <span className="font-bold text-[#b45309]">{report.emailSubject}</span>
                      </div>
                    </div>

                    {/* Thân thư Email */}
                    <div className="p-4 sm:p-5 space-y-4 text-stone-800 leading-relaxed font-sans">
                      <p>Kính gửi: Ban Giám đốc / Bộ phận Điều phối Giao nhận Quý Nhà cung cấp,</p>
                      <p>
                        Bộ phận Bếp Nhà hàng TRẦM Reserve trân trọng gửi đơn đặt mua nguyên liệu chuẩn bị cho ca phục vụ ẩm thực tại nhà hàng:
                      </p>

                      {/* Phần I: Thông tin giao nhận */}
                      <div className="space-y-1 rounded-lg border border-border/80 bg-stone-50/60 p-3">
                        <div className="font-bold text-stone-900 uppercase tracking-wide text-[11px]">
                          I. THÔNG TIN ĐƠN ĐẶT HÀNG &amp; ĐỊA ĐIỂM GIAO NHẬN
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11.5px] pt-1">
                          <div>• <strong>Đơn vị đặt hàng:</strong> Nhà hàng TRẦM Reserve (Bếp)</div>
                          <div>• <strong>Ca phục vụ:</strong> {report.shiftLabel}</div>
                          <div>• <strong>Ngày giao hàng:</strong> {report.formattedDate}</div>
                          <div>• <strong>Quy mô ca:</strong> {report.guests} khách tasting</div>
                          <div>• <strong>Giờ giao yêu cầu:</strong> <span className="text-rose-700 font-semibold">{report.deliveryDeadline}</span></div>
                          <div>• <strong>Hotline tiếp nhận:</strong> {RESTAURANT.hotline}</div>
                        </div>
                        <div className="text-[11.5px] pt-1 border-t border-border/60">
                          • <strong>Địa điểm giao hàng:</strong> Cửa nhập hàng Bếp TRẦM — {RESTAURANT.address}
                        </div>
                      </div>

                      {/* Phần II: Bảng chi tiết nguyên liệu */}
                      <div className="space-y-2">
                        <div className="font-bold text-stone-900 uppercase tracking-wide text-[11px]">
                          II. BẢNG CHI TIẾT NGUYÊN LIỆU CẦN CUNG CẤP
                        </div>

                        {report.items.length === 0 ? (
                          <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-3 text-emerald-800">
                            Tồn kho hiện hữu tại nhà hàng đã đảm bảo đủ 100% định mức phục vụ cho ca này. Chưa phát sinh mặt hàng cần mua bổ sung.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-border/80">
                            <table className="w-full text-left text-[11.5px]">
                              <thead className="bg-[#fdf0d5]/60 text-stone-800 font-semibold border-b border-border">
                                <tr>
                                  <th className="py-2 pl-3 w-10">STT</th>
                                  <th className="py-2 px-2">Mã NL</th>
                                  <th className="py-2 px-2">Tên nguyên liệu</th>
                                  <th className="py-2 px-2">Quy cách / Nguồn gốc</th>
                                  <th className="py-2 px-2 text-right">Số lượng đặt</th>
                                  <th className="py-2 px-2 text-right">Đơn giá kho</th>
                                  <th className="py-2 pr-3 text-right">Thành tiền</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {report.items.map((item, idx) => (
                                  <tr key={`email-table-${item.ingredientId}`} className="hover:bg-stone-50">
                                    <td className="py-2 pl-3 tabular-nums text-stone-500 font-medium">
                                      {String(idx + 1).padStart(2, "0")}
                                    </td>
                                    <td className="py-2 px-2 font-mono text-[10.5px] text-stone-600">
                                      {item.ingredientId}
                                    </td>
                                    <td className="py-2 px-2 font-bold text-stone-900">
                                      {item.name}
                                    </td>
                                    <td className="py-2 px-2 text-stone-600">
                                      {[item.spec, item.origin].filter(Boolean).join(" · ") || "Theo quy chuẩn Bếp"}
                                    </td>
                                    <td className="py-2 px-2 text-right font-bold text-rose-700 tabular-nums">
                                      {item.formattedShortage}
                                    </td>
                                    <td className="py-2 px-2 text-right tabular-nums text-stone-600">
                                      {formatVND(item.importPrice)}/{item.importUnitLabel}
                                    </td>
                                    <td className="py-2 pr-3 text-right font-bold tabular-nums text-[#92400e]">
                                      {item.formattedCost}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-[#fdf0d5]/40 border-t border-border font-semibold">
                                <tr>
                                  <td colSpan={6} className="py-2 pl-3 text-stone-700">
                                    Tổng cộng ({report.items.length} mặt hàng cần cung cấp · {report.sufficientCount} món đủ tồn):
                                  </td>
                                  <td className="py-2 pr-3 text-right text-sm font-bold tabular-nums text-[#92400e]">
                                    {report.formattedTotalCost}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Phần III: Quy chuẩn kiểm soát */}
                      <div className="space-y-1 text-[11px] text-stone-600 rounded-lg bg-stone-50 p-3 border border-border/70">
                        <div className="font-bold text-stone-900 uppercase tracking-wide">
                          III. QUY CHUẨN KIỂM SOÁT CHẤT LƯỢNG FINE DINING
                        </div>
                        <div>1. Đạm tươi sống bảo quản chuỗi lạnh 0–2°C, rau thơm &amp; nấm bảo quản 8–12°C.</div>
                        <div>2. Kèm Biên bản giao nhận hàng hóa ghi rõ ngày sản xuất, hạn sử dụng và chữ ký giao hàng.</div>
                        <div>3. Bếp trưởng TRẦM Reserve trực tiếp kiểm tra cảm quan và cân lại khối lượng thực tế khi ký nhận.</div>
                      </div>

                      {/* Chữ ký email chuyên nghiệp */}
                      <div className="pt-3 border-t border-border/80 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b45309] text-white font-heading font-bold text-sm">
                          TRẦM
                        </div>
                        <div className="text-[11px] space-y-0.5 text-stone-600">
                          <div className="font-bold text-stone-900 text-xs uppercase">
                            BỘ PHẬN BẾP &amp; QUẢN TRỊ TỒN KHO — NHÀ HÀNG TRẦM RESERVE
                          </div>
                          <div>Địa chỉ: {RESTAURANT.address}</div>
                          <div>Hotline Bếp: {RESTAURANT.hotline} · Email: {RESTAURANT.email} · Website: tramreserve.vn</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thanh nút hành động Email */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Bấm sao chép để dán vào Gmail / Outlook hoặc mở trực tiếp ứng dụng Email
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleOpenEmailClient}
                        className="h-8 text-xs font-semibold text-[#b45309] border-[#b45309]/40 hover:bg-[#fdf0d5]"
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Mở ứng dụng Email
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => copyTextToClipboard(report.emailBody, "email")}
                        className="h-8 rounded-lg bg-[#b45309] text-xs font-semibold text-white hover:bg-[#92400e] shadow-2xs"
                      >
                        {copiedChannel === "email" ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Đã sao chép Email!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Sao chép toàn bộ Email
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
