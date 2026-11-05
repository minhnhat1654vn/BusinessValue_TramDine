"use client";

// FR-34: Modal Xem trước & Bắn tin Zalo OA Khung Giờ Vàng
// Cho phép Admin tùy chỉnh ưu đãi, tệp khách hàng và phát hành voucher kích cầu ca chiều T4-T6
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Gift,
  Phone,
  Send,
  Sparkles,
  TicketPercent,
  TrendingDown,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RESTAURANT, PRICES } from "@/lib/tram/constants";
import { formatPercent, formatVND } from "@/lib/tram/format";
import {
  buildGoldenHourZaloMessage,
  formatGoldenHourDiscount,
  generateGoldenHourVoucherCode,
  type GoldenHourAudience,
  type GoldenHourCampaign,
  type GoldenHourDiscountType,
  type GoldenHourShiftSlot,
} from "@/lib/tram/golden-hour";

interface GoldenHourZaloModalProps {
  open: boolean;
  onClose: () => void;
  slot: GoldenHourShiftSlot | null;
  onSuccess?: (campaign: GoldenHourCampaign) => void;
  audienceStats?: {
    ALL: number;
    VIP: number;
    ZALO_USERS: number;
  };
}

export function GoldenHourZaloModal({
  open,
  onClose,
  slot,
  onSuccess,
  audienceStats = { ALL: 36, VIP: 12, ZALO_USERS: 18 },
}: GoldenHourZaloModalProps) {
  // Trạng thái tùy chỉnh Voucher
  const [discountType, setDiscountType] = useState<GoldenHourDiscountType>("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [targetAudience, setTargetAudience] = useState<GoldenHourAudience>("ALL");
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>("");

  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Sinh mã voucher mặc định theo ca
  const defaultCode = useMemo(() => {
    if (!slot) return "GOLDEN-1730";
    return generateGoldenHourVoucherCode(slot.date, slot.weekday);
  }, [slot]);

  const activeVoucherCode = voucherCodeInput.trim() || defaultCode;
  const discountSummary = formatGoldenHourDiscount(discountType, discountValue);

  // Nội dung tin nhắn Zalo OA ZNS
  const zaloMessage = useMemo(() => {
    if (!slot) return "";
    return buildGoldenHourZaloMessage({
      slot,
      voucherCode: activeVoucherCode,
      discountType,
      discountValue,
      customerName: "Quý khách",
    });
  }, [slot, activeVoucherCode, discountType, discountValue]);

  async function handleLaunchCampaign() {
    if (!slot) return;
    setIsSending(true);

    try {
      const res = await fetch("/api/admin/golden-hour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: slot.date,
          slot: slot.slot,
          voucherCode: activeVoucherCode,
          discountType,
          discountValue,
          targetAudience,
          customMessage: zaloMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tung chiến dịch.");

      setSentSuccess(true);
      toast.success(`Đã phát hành Voucher ${activeVoucherCode}!`, {
        description: `Mô phỏng gửi thành công tin nhắn Zalo OA đến tệp khách hàng.`,
      });

      if (onSuccess && data.campaign) {
        onSuccess(data.campaign);
      }

      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi kích hoạt chiến dịch.");
    } finally {
      setIsSending(false);
    }
  }

  if (!slot) return null;

  const currentAudienceCount = audienceStats[targetAudience] ?? 24;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 border-amber-300">
        <DialogHeader className="p-4 sm:p-5 border-b border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-[#fdf0d5]/40 to-transparent">
          <div className="flex items-center gap-2 text-[#92400e]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-[#b45309]">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <DialogTitle className="font-heading text-lg font-bold text-stone-900">
                Tung Voucher Khung Giờ Vàng — Ca Chiều {slot.weekdayLabel} 17:30
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-600 mt-0.5">
                Kích cầu lấp đầy ca {slot.weekdayLabel} (ngày {slot.date.split("-").reverse().join("/")}) qua thông báo Zalo OA
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ==================== CỘT TRÁI (5 PHẦN): TÙY CHỈNH CHIẾN DỊCH ==================== */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. Thẻ thông tin Ca mục tiêu */}
            <div className="rounded-xl border border-amber-200 bg-[#fdf0d5]/50 p-3.5 space-y-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#92400e] block">
                Thông tin Ca mục tiêu
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">
                  {slot.weekdayLabel} · {slot.date.split("-").reverse().join("/")}
                </span>
                <Badge className="bg-[#b45309] text-white text-[10px]">17:30 (Ca chiều)</Badge>
              </div>

              {/* Tỷ lệ lấp đầy & số chỗ trống */}
              <div className="pt-2 border-t border-amber-200/70 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Tỷ lệ lấp đầy hiện tại:</span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      slot.occupancyPct <= 50 ? "text-amber-700" : "text-emerald-700",
                    )}
                  >
                    {formatPercent(slot.occupancyPct, 1)} ({slot.bookedSeats}/42 chỗ)
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-700 font-semibold">
                  <span>Số chỗ còn trống:</span>
                  <span className="tabular-nums">{slot.availableSeats} chỗ cần lấp</span>
                </div>
              </div>
            </div>

            {/* 2. Chọn Ưu đãi Voucher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-800 flex items-center justify-between">
                <span>Ưu đãi áp dụng:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType("PERCENT");
                    setDiscountValue(15);
                  }}
                  className={cn(
                    "rounded-lg border p-2 text-left transition-colors font-medium",
                    discountType === "PERCENT" && discountValue === 15
                      ? "border-[#b45309] bg-[#b45309] text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-400",
                  )}
                >
                  <span className="block font-bold">Giảm 15%</span>
                  <span className="text-[10px] opacity-80">Menu Tasting</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDiscountType("PERCENT");
                    setDiscountValue(20);
                  }}
                  className={cn(
                    "rounded-lg border p-2 text-left transition-colors font-medium",
                    discountType === "PERCENT" && discountValue === 20
                      ? "border-[#b45309] bg-[#b45309] text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-400",
                  )}
                >
                  <span className="block font-bold">Giảm 20%</span>
                  <span className="text-[10px] opacity-80">Menu Tasting</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDiscountType("TEA_PAIRING");
                    setDiscountValue(PRICES.teaPairing);
                  }}
                  className={cn(
                    "rounded-lg border p-2 text-left transition-colors font-medium",
                    discountType === "TEA_PAIRING"
                      ? "border-[#b45309] bg-[#b45309] text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-400",
                  )}
                >
                  <span className="block font-bold">Tặng Tea Pairing</span>
                  <span className="text-[10px] opacity-80">Trị giá 350.000 đ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDiscountType("AMOUNT");
                    setDiscountValue(200_000);
                  }}
                  className={cn(
                    "rounded-lg border p-2 text-left transition-colors font-medium",
                    discountType === "AMOUNT"
                      ? "border-[#b45309] bg-[#b45309] text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-400",
                  )}
                >
                  <span className="block font-bold">Giảm 200k/khách</span>
                  <span className="text-[10px] opacity-80">Trừ trực tiếp</span>
                </button>
              </div>
            </div>

            {/* 3. Tùy chỉnh Mã Voucher */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-800">Mã Voucher Khung Giờ Vàng:</label>
              <Input
                type="text"
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                placeholder={defaultCode}
                className="h-8 font-mono text-xs uppercase font-bold text-[#92400e] border-amber-300"
              />
            </div>

            {/* 4. Chọn Tệp Khách hàng (Audience) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-800 flex items-center justify-between">
                <span>Tệp nhận tin Zalo OA:</span>
                <span className="text-[11px] font-bold text-emerald-700">
                  {currentAudienceCount} khách hàng
                </span>
              </label>
              <div className="space-y-1 text-xs">
                {[
                  {
                    id: "ALL",
                    label: "Toàn bộ khách hàng trong CRM",
                    count: audienceStats.ALL,
                    desc: "Gửi diện rộng để lấp đầy nhanh nhất",
                  },
                  {
                    id: "VIP",
                    label: "Khách thân thiết VIP (Trầm & Nam Trầm)",
                    count: audienceStats.VIP,
                    desc: "Tỷ lệ chuyển đổi cao, tri ân khách quen",
                  },
                  {
                    id: "ZALO_USERS",
                    label: "Khách từng liên hệ qua Zalo / Hotline",
                    count: audienceStats.ZALO_USERS,
                    desc: "Tương tác tốt trên ứng dụng Zalo",
                  },
                ].map((aud) => (
                  <label
                    key={aud.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-2 cursor-pointer transition-colors",
                      targetAudience === aud.id
                        ? "border-[#b45309] bg-[#fdf0d5]/40"
                        : "border-stone-200 bg-white hover:bg-stone-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="targetAudience"
                      checked={targetAudience === aud.id}
                      onChange={() => setTargetAudience(aud.id as GoldenHourAudience)}
                      className="mt-0.5 accent-[#b45309]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-900">{aud.label}</span>
                        <span className="font-bold tabular-nums text-stone-600">~{aud.count}</span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">{aud.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ==================== CỘT PHẢI (7 PHẦN): MÔ PHỎNG GIAO DIỆN ZALO OA ==================== */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
            <div>
              {/* Khung mô phỏng điện thoại Zalo OA */}
              <div className="rounded-2xl border-2 border-[#0068ff]/30 bg-[#e8ecf2] p-3 shadow-inner">
                {/* Header Zalo OA */}
                <div className="rounded-t-xl bg-white p-2.5 flex items-center justify-between border-b border-stone-200 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#92400e] text-[#fffbf2] font-bold text-xs shrink-0 shadow-xs">
                      TRẦM
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-stone-900 truncate">
                          {RESTAURANT.name} Reserve · Fine Dining
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#0068ff] shrink-0" />
                      </div>
                      <span className="text-[10px] text-stone-500 block">Zalo Official Account</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9.5px] border-emerald-300 text-emerald-800 bg-emerald-50">
                    Xác thực
                  </Badge>
                </div>

                {/* Bong bóng chat ZNS Khung Giờ Vàng */}
                <div className="mt-3 rounded-xl bg-white p-4 shadow-sm border border-stone-200/80 space-y-3">
                  {/* Tiêu đề thông báo ZNS */}
                  <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-[#b45309]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h5 className="font-heading text-xs font-bold text-[#92400e] uppercase tracking-wide">
                        Đặc Quyền Khung Giờ Vàng — Ca Chiều 17:30
                      </h5>
                      <span className="text-[10px] text-stone-500">Thông báo tự động từ TRẦM Reserve</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed">
                    Kính gửi <strong>Thượng khách</strong>,
                  </p>

                  {/* Khối thông báo tỷ lệ lấp đầy theo yêu cầu FR-34 */}
                  <div className="rounded-lg bg-amber-50/70 border border-amber-300/80 p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[#92400e] font-semibold text-[11px]">
                      <span>📊 Tình trạng lấp chỗ ca chiều:</span>
                      <span className="tabular-nums font-bold">
                        Đã lấp {formatPercent(slot.occupancyPct, 1)}
                      </span>
                    </div>
                    <p className="text-stone-700 leading-snug">
                      Ca chiều <strong>17:30 {slot.weekdayLabel}</strong> (ngày{" "}
                      {slot.date.split("-").reverse().join("/")}) hiện mới có{" "}
                      <strong>{slot.bookedSeats} khách</strong> — còn lại{" "}
                      <strong className="text-rose-700">{slot.availableSeats} chỗ trống</strong> / 42 chỗ tiêu chuẩn.
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, slot.occupancyPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Thẻ Voucher Khung Giờ Vàng */}
                  <div className="rounded-xl border-2 border-dashed border-[#b45309] bg-gradient-to-r from-[#fdf0d5] to-amber-50 p-3 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
                      Mã Voucher Khung Giờ Vàng Độc Quyền
                    </span>
                    <span className="font-mono text-base font-extrabold tracking-wider text-[#92400e] block">
                      {activeVoucherCode}
                    </span>
                    <Badge className="bg-[#b45309] text-white text-[10px] font-semibold">
                      {discountSummary}
                    </Badge>
                    <p className="text-[10px] text-stone-600 pt-1">
                      Áp dụng duy nhất cho ca 17:30 {slot.weekdayLabel} ({slot.date.split("-").reverse().join("/")})
                    </p>
                  </div>

                  {/* Nút bấm CTA mô phỏng trong Zalo */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full rounded-lg bg-[#b45309] py-2 text-center text-xs font-bold text-white shadow-xs cursor-pointer hover:bg-[#92400e] flex items-center justify-center gap-1.5">
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                      Nhận Voucher &amp; Đặt Bàn Ngay
                    </div>
                    <div className="w-full rounded-lg bg-stone-100 py-1.5 text-center text-[11px] font-medium text-stone-700 cursor-pointer hover:bg-stone-200 flex items-center justify-center gap-1">
                      <Phone className="h-3 w-3 text-stone-600" />
                      Hotline Quản lý: {RESTAURANT.hotline}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ==================== NÚT HÀNH ĐỘNG GỬI TIN ==================== */}
            <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSending}>
                  Hủy
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleLaunchCampaign}
                  disabled={isSending || sentSuccess}
                  className="bg-[#0068ff] text-white hover:bg-[#0052cc] text-xs font-semibold gap-1.5 shadow-sm"
                >
                  {isSending ? (
                    <>Đang bắn tin Zalo OA...</>
                  ) : sentSuccess ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Đã gửi thành công!
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Tung Voucher &amp; Bắn Tin Zalo OA
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
