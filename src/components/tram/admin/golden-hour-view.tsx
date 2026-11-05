"use client";

// FR-34: Phân hệ Quản trị Khung Giờ Vàng (Golden Hour Promotion)
// Rà soát tỷ lệ lấp đầy ca chiều (17:30) các ngày Thứ 4, Thứ 5, Thứ 6
// Tung Voucher kích cầu qua Zalo OA khi tỷ lệ lấp đầy nằm trong dải cấu hình
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Gift,
  HelpCircle,
  MessageCircle,
  Percent,
  RefreshCw,
  Send,
  Sliders,
  Sparkles,
  TicketPercent,
  TrendingDown,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ErrorBlock, LoadingBlock, useJson } from "./admin-shared";
import { formatPercent, formatVND } from "@/lib/tram/format";
import {
  type GoldenHourCampaign,
  type GoldenHourRuleConfig,
  type GoldenHourShiftSlot,
  type GoldenHourSummary,
} from "@/lib/tram/golden-hour";
import { GoldenHourZaloModal } from "./golden-hour-zalo-modal";

interface GoldenHourApiResponse {
  success: boolean;
  summary: GoldenHourSummary;
  config: GoldenHourRuleConfig;
  audienceStats: {
    ALL: number;
    VIP: number;
    ZALO_USERS: number;
  };
}

interface GoldenHourViewProps {
  today: string;
  onNavigateTab?: (tab: string) => void;
}

export function AdminGoldenHourView({ today, onNavigateTab }: GoldenHourViewProps) {
  const { data, loading, error, refresh } = useJson<GoldenHourApiResponse>(
    `/api/admin/golden-hour?today=${today}`,
  );

  // Bộ lọc ca
  const [filterMode, setFilterMode] = useState<"ALL" | "ELIGIBLE" | "HEALTHY" | "ACTIVE">("ALL");

  // Modal bắn tin Zalo OA
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<GoldenHourShiftSlot | null>(null);

  // Cấu hình dải tỷ lệ lấp đầy kích hoạt
  const [editingConfig, setEditingConfig] = useState(false);
  const [minPctInput, setMinPctInput] = useState<number>(0);
  const [maxPctInput, setMaxPctInput] = useState<number>(50);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Đồng bộ giá trị cấu hình ban đầu
  const activeConfig = useMemo(() => {
    return data?.config ?? {
      applicableDays: [3, 4, 5],
      applicableSlot: "SLOT_1730" as const,
      minOccupancyPct: 0,
      maxOccupancyPct: 50,
      defaultDiscountType: "PERCENT" as const,
      defaultDiscountValue: 15,
      autoAlertOnDashboard: true,
    };
  }, [data?.config]);

  // Lưu cấu hình ngưỡng tỷ lệ lấp đầy
  async function handleSaveConfig() {
    setIsSavingConfig(true);
    try {
      const res = await fetch("/api/admin/golden-hour", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minOccupancyPct: minPctInput,
          maxOccupancyPct: maxPctInput,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Lỗi lưu cấu hình.");

      toast.success(
        `Đã cập nhật ngưỡng kích hoạt: ${minPctInput}% – ${maxPctInput}% tỷ lệ lấp đầy.`,
      );
      setEditingConfig(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu cấu hình.");
    } finally {
      setIsSavingConfig(false);
    }
  }

  if (loading && !data) return <LoadingBlock label="Đang quét dữ liệu Khung Giờ Vàng..." />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;
  if (!data) return null;

  const summary = data.summary;
  const slots = summary.slots;
  const audienceStats = data.audienceStats;

  // Lọc danh sách ca theo tab
  const filteredSlots = slots.filter((slot) => {
    if (filterMode === "ELIGIBLE") return slot.isEligible && !slot.hasActiveCampaign;
    if (filterMode === "HEALTHY") return !slot.isEligible;
    if (filterMode === "ACTIVE") return slot.hasActiveCampaign;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ==================== 1. TIÊU ĐỀ PHÂN HỆ & NÚT LÀM MỚI ==================== */}
      <div className="flex flex-col gap-2 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
              Chiến Dịch Kích Cầu · Marketing Zalo OA
            </span>
            <Badge className="border-amber-300 bg-amber-100/90 text-[#92400e] text-[10px] font-bold">
              FR-34
            </Badge>
          </div>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524] flex items-center gap-2">
            Khung Giờ Vàng — Ca Chiều Thứ 4, Thứ 5, Thứ 6
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tự động theo dõi tỷ lệ lấp đầy ca 17:30 · Tung voucher qua Zalo OA kích hoạt khi lấp đầy trong dải {activeConfig.minOccupancyPct}% – {activeConfig.maxOccupancyPct}%
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="h-8 gap-1.5 rounded-full border-stone-300 bg-white text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 hover:text-[#b45309]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[#b45309]", loading && "animate-spin")} />
            Làm mới số liệu
          </Button>
        </div>
      </div>

      {/* ==================== 2. THẺ CHỈ SỐ TỔNG QUAN (4 METRIC CARDS) ==================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Thẻ 1: Số ca cần kích cầu */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Ca chiều cần kích cầu
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-[#b45309]">
                <Zap className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="font-heading text-2xl font-bold tabular-nums text-amber-700 sm:text-3xl">
              {summary.totalEligibleShifts} ca
            </p>
            <p className="text-[11px] text-muted-foreground">
              Lấp đầy ≤ {activeConfig.maxOccupancyPct}% (tương lai)
            </p>
          </CardContent>
        </Card>

        {/* Thẻ 2: Tỷ lệ lấp đầy TB ca chiều T4-T6 */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Lấp đầy TB ca 17:30
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                <Percent className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="font-heading text-2xl font-bold tabular-nums text-stone-900 sm:text-3xl">
              {formatPercent(summary.avgOccupancyPct, 1)}
            </p>
            <p className="text-[11px] text-muted-foreground">Toàn bộ ca T4, T5, T6 trong 4 tuần</p>
          </CardContent>
        </Card>

        {/* Thẻ 3: Chiến dịch Voucher đã tung */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Chiến dịch đã tung
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <TicketPercent className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="font-heading text-2xl font-bold tabular-nums text-emerald-800 sm:text-3xl">
              {summary.totalCampaignsLaunched} đợt
            </p>
            <p className="text-[11px] text-muted-foreground">
              {summary.totalVouchersSent} tin nhắn Zalo OA đã gửi
            </p>
          </CardContent>
        </Card>

        {/* Thẻ 4: Ước tính chỗ trống đã cứu */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Tệp khách hàng Zalo
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Users className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="font-heading text-2xl font-bold tabular-nums text-[#0068ff] sm:text-3xl">
              ~{audienceStats.ALL} khách
            </p>
            <p className="text-[11px] text-muted-foreground">
              {audienceStats.VIP} khách VIP · {audienceStats.ZALO_USERS} khách Zalo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ==================== 3. BẢNG CẤU HÌNH NGƯỠNG TỶ LỆ LẤP ĐẦY ==================== */}
      <Card className="border-amber-300 bg-[#fdf0d5]/30 shadow-xs">
        <CardHeader className="pb-3 border-b border-amber-200/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#b45309]" />
              <CardTitle className="font-heading text-sm font-bold text-stone-900">
                Cấu hình Dải Tỷ Lệ Lấp Đầy Kích Hoạt Voucher Khung Giờ Vàng
              </CardTitle>
            </div>
            {!editingConfig ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMinPctInput(activeConfig.minOccupancyPct);
                  setMaxPctInput(activeConfig.maxOccupancyPct);
                  setEditingConfig(true);
                }}
                className="h-7 text-xs border-amber-300 text-[#92400e] bg-white hover:bg-amber-50"
              >
                Chỉnh sửa ngưỡng
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingConfig(false)}
                  className="h-7 text-xs text-stone-600"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="h-7 text-xs bg-[#b45309] text-white hover:bg-[#92400e]"
                >
                  {isSavingConfig ? "Đang lưu..." : "Lưu cài đặt"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {editingConfig && (
              <div className="rounded-lg border border-amber-300 bg-white p-3 flex items-center gap-3">
                <div>
                  <label className="text-[10.5px] font-bold text-stone-600 uppercase block mb-1">
                    Ngưỡng Min (%):
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={minPctInput}
                    onChange={(e) => setMinPctInput(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="h-8 w-20 text-center font-mono font-bold text-xs"
                  />
                </div>
                <span className="text-stone-400 mt-4">đến</span>
                <div>
                  <label className="text-[10.5px] font-bold text-stone-600 uppercase block mb-1">
                    Ngưỡng Max (%):
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={maxPctInput}
                    onChange={(e) => setMaxPctInput(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="h-8 w-20 text-center font-mono font-bold text-xs text-rose-700"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ==================== 4. LƯỚI DANH SÁCH CÁC CA CHIỀU T4, T5, T6 ==================== */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-base font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#b45309]" />
                Lịch Các Ca Chiều 17:30 (Thứ 4, Thứ 5, Thứ 6) Trong 4 Tuần
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chỉ tính các ca chiều 17:30 (42 chỗ/ca) theo đúng yêu cầu FR-34
              </p>
            </div>

            {/* Bộ lọc tab ca */}
            <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setFilterMode("ALL")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-colors",
                  filterMode === "ALL"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                Tất cả ca ({slots.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("ELIGIBLE")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-colors flex items-center gap-1",
                  filterMode === "ELIGIBLE"
                    ? "bg-amber-100 text-[#92400e] shadow-2xs"
                    : "text-stone-600 hover:text-[#92400e]",
                )}
              >
                <Zap className="h-3 w-3 text-amber-600" />
                Cần kích cầu ({slots.filter((s) => s.isEligible && !s.hasActiveCampaign).length})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("ACTIVE")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-colors flex items-center gap-1",
                  filterMode === "ACTIVE"
                    ? "bg-[#0068ff] text-white shadow-2xs"
                    : "text-stone-600 hover:text-[#0068ff]",
                )}
              >
                <TicketPercent className="h-3 w-3" />
                Đang chạy Voucher ({slots.filter((s) => s.hasActiveCampaign).length})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("HEALTHY")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-colors",
                  filterMode === "HEALTHY"
                    ? "bg-emerald-100 text-emerald-800 shadow-2xs"
                    : "text-stone-600 hover:text-emerald-800",
                )}
              >
                Lấp đầy tốt ({slots.filter((s) => !s.isEligible).length})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {filteredSlots.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Không có ca nào phù hợp với bộ lọc đã chọn.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSlots.map((slot) => {
                const isPast = slot.date < today;
                return (
                  <div
                    key={slot.date}
                    className={cn(
                      "rounded-xl border p-4 space-y-3 transition-all",
                      slot.hasActiveCampaign
                        ? "border-[#0068ff]/40 bg-blue-50/20 shadow-xs"
                        : slot.isEligible
                          ? "border-amber-300 bg-amber-50/30 shadow-xs"
                          : "border-border/70 bg-stone-50/40",
                      isPast && "opacity-60",
                    )}
                  >
                    {/* Header ca: Thứ, Ngày, Giờ */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs",
                            slot.weekday === 3
                              ? "bg-amber-100 text-amber-900"
                              : slot.weekday === 4
                                ? "bg-orange-100 text-orange-900"
                                : "bg-rose-100 text-rose-900",
                          )}
                        >
                          {slot.shortWeekdayLabel}
                        </span>
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{slot.weekdayLabel}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {slot.date.split("-").reverse().join("/")}
                          </p>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                        {slot.slotLabel}
                      </Badge>
                    </div>

                    {/* Thanh tiến trình tỷ lệ lấp đầy */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">Lấp đầy ca:</span>
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            slot.occupancyPct <= 50 ? "text-amber-700" : "text-emerald-700",
                          )}
                        >
                          {formatPercent(slot.occupancyPct, 1)}{" "}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            ({slot.bookedSeats}/42 chỗ)
                          </span>
                        </span>
                      </div>

                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            slot.occupancyPct <= 50 ? "bg-amber-500" : "bg-emerald-600",
                          )}
                          style={{ width: `${Math.min(100, slot.occupancyPct)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-stone-500">
                        <span>Trống: {slot.availableSeats} chỗ</span>
                        <span>Ngưỡng kích hoạt: ≤ {activeConfig.maxOccupancyPct}%</span>
                      </div>
                    </div>

                    {/* Trạng thái & Nút hành động */}
                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between gap-2">
                      {slot.hasActiveCampaign ? (
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#0068ff]">
                            <TicketPercent className="h-3 w-3 shrink-0" />
                            Đang chạy: {slot.activeCampaign?.voucherCode}
                          </span>
                          <span className="text-[10px] text-stone-500 block truncate">
                            {slot.activeCampaign?.sentCount} tin Zalo đã gửi
                          </span>
                        </div>
                      ) : slot.isEligible ? (
                        <Badge className="border-amber-300 bg-amber-100 text-[#92400e] text-[10px] font-bold gap-1">
                          <Zap className="h-3 w-3 text-amber-700" />
                          Cần kích cầu (≤ {activeConfig.maxOccupancyPct}%)
                        </Badge>
                      ) : (
                        <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-semibold gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Lấp đầy tốt (&gt; {activeConfig.maxOccupancyPct}%)
                        </Badge>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        disabled={isPast}
                        onClick={() => setSelectedSlotForModal(slot)}
                        className={cn(
                          "h-7 rounded-lg text-xs font-semibold px-2.5 transition-colors shadow-2xs",
                          slot.hasActiveCampaign
                            ? "bg-white border border-[#0068ff] text-[#0068ff] hover:bg-blue-50"
                            : slot.isEligible
                              ? "bg-[#b45309] text-white hover:bg-[#92400e]"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200",
                        )}
                      >
                        {slot.hasActiveCampaign ? (
                          <>Gửi lại Zalo</>
                        ) : slot.isEligible ? (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Tung Voucher Zalo
                          </>
                        ) : (
                          <>Xem tin Zalo</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== 5. BẢNG LỊCH SỬ CHIẾN DỊCH ĐÃ PHÁT HÀNH ==================== */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <TicketPercent className="h-4 w-4 text-[#b45309]" />
            <CardTitle className="font-heading text-sm font-bold text-stone-900">
              Lịch Sử Các Chiến Dịch Voucher Khung Giờ Vàng Đã Tung
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {summary.campaigns.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Chưa có chiến dịch Khung Giờ Vàng nào được phát hành. Chọn một ca chiều T4-T6 ở trên để bắt đầu!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#fdf0d5]/40 border-b border-stone-200/80 text-[11px] font-semibold uppercase text-stone-600">
                  <tr>
                    <th className="py-2.5 pl-4 sm:pl-5">Mã Voucher</th>
                    <th className="py-2.5 px-3">Ca áp dụng</th>
                    <th className="py-2.5 px-3">Ưu đãi</th>
                    <th className="py-2.5 px-3 text-right">Lấp đầy lúc tung</th>
                    <th className="py-2.5 px-3 text-right">Số tin Zalo đã gửi</th>
                    <th className="py-2.5 px-3">Tệp khách</th>
                    <th className="py-2.5 pr-4 sm:pr-5 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {summary.campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-2.5 pl-4 sm:pl-5 font-mono font-bold text-[#92400e]">
                        {camp.voucherCode}
                      </td>
                      <td className="py-2.5 px-3 text-stone-800">
                        Ca 17:30 · {camp.targetDate.split("-").reverse().join("/")}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-stone-700">
                        {camp.discountSummary}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-amber-700">
                        {formatPercent(camp.occupancyAtLaunch, 1)} ({camp.bookedSeatsAtLaunch}/42)
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums text-[#0068ff]">
                        {camp.sentCount} tin
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        {camp.targetAudience === "VIP"
                          ? "Khách VIP"
                          : camp.targetAudience === "ZALO_USERS"
                            ? "Khách Zalo"
                            : "Toàn bộ khách"}
                      </td>
                      <td className="py-2.5 pr-4 sm:pr-5 text-right">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                          ✓ Đang hiệu lực
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== 6. MODAL BẮN TIN ZALO OA ==================== */}
      <GoldenHourZaloModal
        open={!!selectedSlotForModal}
        onClose={() => setSelectedSlotForModal(null)}
        slot={selectedSlotForModal}
        audienceStats={audienceStats}
        onSuccess={() => {
          refresh();
        }}
      />
    </div>
  );
}
