"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  BarChart3,
  Sliders,
  TrendingUp,
  Utensils,
  Wine,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatPercent, formatVND } from "@/lib/tram/format";
import {
  CEILING_FOOD_COST_PER_GUEST,
  MENU_PRICE_PER_GUEST,
  TARGET_FOOD_COST_CEILING_PCT,
  TARGET_FOOD_COST_PCT,
  getFoodCostKpiSummary,
  type FoodCostKpiSummary,
} from "@/lib/tram/food-cost";

interface FoodCostKpiWidgetProps {
  /** Dữ liệu KPI đã tính toán từ server hoặc client */
  kpi?: FoodCostKpiSummary | null;
  /** Bảng đơn giá kho ghi đè (nếu có để tự tính lại tức thời) */
  priceOverrides?: Record<string, number>;
  /** Số khách tương lai dùng để đối chiếu doanh thu dự thu */
  futureGuests?: number;
  /** Doanh thu pairing dự thu để hiển thị tách bạch */
  expectedPairingRevenue?: number;
  /** Điều hướng tab trong màn quản trị */
  onNavigateTab?: (tab: string) => void;
  /** Chế độ thu gọn (hiển thị dạng card KPI trên Dashboard) hoặc đầy đủ */
  compact?: boolean;
}

interface TooltipPayloadItem {
  payload: {
    label: string;
    scenario: string;
    price: number;
    cost: number;
    profit: number;
    foodCostPct: number;
    marginPct: number;
    isCurrent: boolean;
    isBaseline: boolean;
  };
}

function WhatIfChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="rounded-xl border border-amber-300 bg-white p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-stone-200 pb-1">
          <span className="font-bold text-stone-900">{d.scenario}</span>
          {d.isCurrent && (
            <span className="rounded-full bg-amber-100 text-[#92400e] px-1.5 py-0.2 text-[10px] font-bold">
              Đang chọn
            </span>
          )}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-stone-600">
            <span>Giá menu:</span>
            <strong className="text-stone-900 font-mono">{formatVND(d.price)}</strong>
          </div>
          <div className="flex justify-between text-[#b45309]">
            <span>Giá vốn nguyên liệu:</span>
            <strong className="font-mono">
              {formatVND(d.cost)} ({d.foodCostPct}%)
            </strong>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Lợi nhuận gộp:</span>
            <strong className="font-mono">
              {formatVND(d.profit)} ({d.marginPct}%)
            </strong>
          </div>
        </div>
        <div className="pt-1.5 text-[10px] border-t border-stone-100 flex items-center justify-between font-semibold">
          <span>Trần duyệt 35%:</span>
          <span className={d.foodCostPct <= TARGET_FOOD_COST_CEILING_PCT ? "text-emerald-700" : "text-rose-700 font-bold"}>
            {d.foodCostPct <= TARGET_FOOD_COST_CEILING_PCT ? "✓ Đạt khung (28–35%)" : "⚠️ Vượt trần 35%"}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function FoodCostKpiWidget({
  kpi: initialKpi,
  priceOverrides = {},
  futureGuests = 0,
  expectedPairingRevenue = 0,
  onNavigateTab,
  compact = false,
}: FoodCostKpiWidgetProps) {
  // Trạng thái mô phỏng "What-if"
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [simMenuPrice, setSimMenuPrice] = useState<number>(MENU_PRICE_PER_GUEST);
  const [simCostDelta, setSimCostDelta] = useState<number>(0);

  // Tính KPI thực tế từ props / overrides
  const liveKpi = useMemo(() => {
    if (initialKpi && Object.keys(priceOverrides).length === 0) {
      return initialKpi;
    }
    return getFoodCostKpiSummary(priceOverrides, {
      futureGuests,
      expectedPairingRevenue,
    });
  }, [initialKpi, priceOverrides, futureGuests, expectedPairingRevenue]);

  // Kết quả sau mô phỏng What-if
  const simulatedCostPerGuest = Math.max(10_000, liveKpi.costPerGuest + simCostDelta);
  const simulatedFoodCostPct =
    simMenuPrice > 0
      ? Number(((simulatedCostPerGuest / simMenuPrice) * 100).toFixed(2))
      : 0;
  const isSimulatedSafe = simulatedFoodCostPct <= TARGET_FOOD_COST_CEILING_PCT;

  // Tính toán số liệu phân tích sơ đồ kịch bản What-if
  const baselineMenuPrice = MENU_PRICE_PER_GUEST;
  const baselineCostPerGuest = liveKpi.costPerGuest;
  const baselineFoodCostPct = liveKpi.foodCostPct;
  const baselineGrossProfit = liveKpi.grossProfitPerGuest;

  const simulatedGrossProfit = simMenuPrice - simulatedCostPerGuest;
  const simulatedGrossMarginPct = Number((100 - simulatedFoodCostPct).toFixed(1));

  const deltaMenuPrice = simMenuPrice - baselineMenuPrice;
  const deltaCost = simulatedCostPerGuest - baselineCostPerGuest;
  const deltaGrossProfit = simulatedGrossProfit - baselineGrossProfit;
  const deltaFoodCostPct = Number((simulatedFoodCostPct - baselineFoodCostPct).toFixed(1));
  const shiftImpact = deltaGrossProfit * 40; // Tác động 1 ca 40 khách chuẩn (15 bàn)

  const bufferPct = Number((TARGET_FOOD_COST_CEILING_PCT - simulatedFoodCostPct).toFixed(1));
  const bufferVND = Math.round(simMenuPrice * (TARGET_FOOD_COST_CEILING_PCT / 100) - simulatedCostPerGuest);

  // Dữ liệu cho Biểu đồ Cột Chồng What-if (Recharts BarChart)
  // Luôn đảm bảo có 4 cột so sánh trực quan, trong đó 1 cột luôn đại diện cho simMenuPrice đang kéo
  const scenarioChartData = useMemo(() => {
    const basePillars = [1_200_000, 1_440_000, 1_615_000, 1_800_000];
    let chartPrices: number[];
    if (basePillars.includes(simMenuPrice)) {
      chartPrices = basePillars;
    } else {
      // Thay thế cột đối chiếu tương ứng để bảo toàn mốc gốc 1.440k và giữ đúng 4 cột đều đẹp
      if (simMenuPrice < 1_440_000) {
        chartPrices = [simMenuPrice, 1_440_000, 1_615_000, 1_800_000];
      } else if (simMenuPrice < 1_615_000) {
        chartPrices = [1_200_000, 1_440_000, simMenuPrice, 1_800_000];
      } else if (simMenuPrice < 1_800_000) {
        chartPrices = [1_200_000, 1_440_000, simMenuPrice, 1_900_000];
      } else {
        chartPrices = [1_200_000, 1_440_000, 1_615_000, simMenuPrice];
      }
    }

    const uniqueSorted = Array.from(new Set(chartPrices)).sort((a, b) => a - b);

    return uniqueSorted.map((price) => {
      const cost = Math.max(10_000, liveKpi.costPerGuest + simCostDelta);
      const profit = Math.max(0, price - cost);
      const foodCostPct = Number(((cost / price) * 100).toFixed(1));
      const marginPct = Number((100 - foodCostPct).toFixed(1));
      const isCurrent = price === simMenuPrice;
      const isBaseline = price === MENU_PRICE_PER_GUEST && simCostDelta === 0;

      return {
        label: `${(price / 1000).toLocaleString("vi-VN")}k`,
        scenario: price === MENU_PRICE_PER_GUEST ? "Gốc (1.440k)" : `${formatVND(price)}/khách`,
        price,
        cost,
        profit,
        foodCostPct,
        marginPct,
        isCurrent,
        isBaseline,
        topLabel: isCurrent ? `★ ${foodCostPct}%` : `${foodCostPct}%`,
      };
    });
  }, [simMenuPrice, liveKpi.costPerGuest, simCostDelta]);

  const isSafe = liveKpi.isWithinTarget;
  const ceilingPct = liveKpi.targetCeilingPct; // 35%
  const currentPct = liveKpi.foodCostPct;

  // Thanh đo phần trăm (tối đa hiển thị 100%)
  const gaugePercent = Math.min(100, Math.max(0, currentPct));

  return (
    <Card
      className={cn(
        "border-border/80 bg-card shadow-sm transition-all overflow-hidden",
        !isSafe && "border-rose-300/80 bg-rose-50/20",
      )}
    >
      <CardHeader className="pb-3 border-b border-border/60 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs",
                isSafe
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800",
              )}
            >
              <Calculator className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="font-heading text-base font-bold text-[#292524] sm:text-lg flex items-center gap-2">
                Food cost / doanh thu menu “Tiến Vua” · Khung duyệt 28–35%
                {isSafe ? (
                  <Badge className="border-emerald-300 bg-emerald-100/90 text-emerald-800 text-[10.5px] font-semibold gap-1 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                    Đạt khung duyệt (≤ 35% · Mục tiêu 2027: 34,7%)
                  </Badge>
                ) : (
                  <Badge className="border-rose-300 bg-rose-100 text-rose-800 text-[10.5px] font-bold gap-1 hover:bg-rose-100 animate-pulse">
                    <AlertTriangle className="h-3 w-3 text-rose-700" />
                    Vượt trần mục tiêu 35%
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tính trên doanh thu phần menu 1.440.000 đ/khách (chưa gồm Tea pairing 350.000 đ) · Clean BOM 32,85% (472.975 đ/khách)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowWhatIf((prev) => !prev)}
              className={cn(
                "h-8 gap-1.5 rounded-full text-xs font-semibold shadow-xs transition-colors",
                showWhatIf
                  ? "border-[#b45309] bg-[#fdf0d5] text-[#92400e]"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
              )}
            >
              <Sliders className="h-3.5 w-3.5 text-[#b45309]" />
              Mô phỏng What-if
              {showWhatIf ? (
                <ChevronUp className="h-3 w-3 ml-0.5" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-0.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* ==================== PHÉP TÍNH 2 TẦNG (FR-33) ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TẦNG 1: GIÁ VỐN NGUYÊN LIỆU / KHÁCH */}
          <div className="rounded-xl border border-border/80 bg-stone-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[#b45309] text-[10px] font-extrabold">
                  1
                </span>
                Tầng 1: Giá vốn nguyên liệu / khách
              </span>
              <span className="text-xs text-stone-500 font-medium">BOM 7 món “Tiến Vua”</span>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div>
                <p className="font-heading text-2xl font-bold tabular-nums text-[#292524] sm:text-3xl">
                  {formatVND(liveKpi.costPerGuest)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500">Trần 35% cho phép</span>
                <p className="font-heading text-base font-semibold tabular-nums text-stone-700">
                  {formatVND(CEILING_FOOD_COST_PER_GUEST)}
                </p>
              </div>
            </div>

            {/* Món đắt nhất (Top cost driver) */}
            <div className="mt-3.5 rounded-lg border border-amber-200/90 bg-[#fdf0d5]/60 p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Utensils className="h-3.5 w-3.5 text-[#b45309] shrink-0" />
                <span className="font-semibold text-stone-800 truncate">
                  Món đắt nhất:{" "}
                  <span className="text-[#92400e]">
                    Món {liveKpi.topCostDish.dishIndex} — {liveKpi.topCostDish.name}
                  </span>
                </span>
              </div>
              <div className="shrink-0 font-bold tabular-nums text-[#92400e] text-right pl-2">
                {formatVND(liveKpi.topCostDish.costPerGuest)}/khách{" "}
                <span className="text-[10px] font-normal text-stone-500">
                  ({liveKpi.topCostDish.shareOfFoodCostPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* TẦNG 2: FOOD COST % ĐỐI CHIẾU DOANH THU MENU */}
          <div
            className={cn(
              "rounded-xl border p-4 transition-colors",
              isSafe
                ? "border-emerald-200/90 bg-emerald-50/40"
                : "border-rose-300 bg-rose-50/70",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold",
                    isSafe
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-rose-200 text-rose-800",
                  )}
                >
                  2
                </span>
                Tầng 2: Food cost % / Giá menu
              </span>
              <span className="text-xs font-semibold tabular-nums text-stone-600">
                Khung duyệt: 28–35% (Mục tiêu 34,7%)
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div>
                <p
                  className={cn(
                    "font-heading text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl",
                    isSafe ? "text-emerald-800" : "text-rose-700",
                  )}
                >
                  {formatPercent(currentPct, 1)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500">Lãi gộp / khách</span>
                <p className="font-heading text-base font-bold tabular-nums text-emerald-800">
                  {formatVND(liveKpi.grossProfitPerGuest)}
                </p>
                <span className="text-[10.5px] text-stone-500">
                  Biên {formatPercent(liveKpi.grossMarginPct, 1)}
                </span>
              </div>
            </div>

            {/* Thanh đo trực quan (Progress Gauge vs 35% ceiling) */}
            <div className="mt-3.5 space-y-1">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-stone-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${gaugePercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full transition-all",
                    currentPct <= TARGET_FOOD_COST_PCT
                      ? "bg-emerald-600"
                      : isSafe
                        ? "bg-amber-500"
                        : "bg-rose-600",
                  )}
                />
                {/* Vạch mốc trần 35% */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-900 z-10"
                  style={{ left: `${TARGET_FOOD_COST_CEILING_PCT}%` }}
                  title="Ngưỡng trần tối đa 35%"
                />
              </div>
              <div className="flex justify-between text-[10px] tabular-nums text-stone-500 font-medium">
                <span>0%</span>
                <span className="text-emerald-700">Mục tiêu {TARGET_FOOD_COST_PCT}% (2027)</span>
                <span className="font-bold text-rose-700">Trần 35% (2025: 44%)</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SỐ LIỆU DOANH THU PHẦN MENU DỰ THU ==================== */}
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#b45309]" />
              <h4 className="font-heading text-sm font-bold text-stone-900">
                Đối chiếu trên Doanh thu Dự thu tương lai
              </h4>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground italic">
              * Chưa gồm pairing (pairing là doanh thu thêm không ăn vào định lượng nguyên liệu)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-stone-50 p-3 border border-border/60">
              <span className="text-[10.5px] font-medium text-muted-foreground uppercase">
                Quy mô dự thu
              </span>
              <p className="mt-1 font-heading text-lg font-bold tabular-nums text-[#292524]">
                {liveKpi.futureGuests > 0 ? `${liveKpi.futureGuests} khách` : "1 khách chuẩn"}
              </p>
              <p className="text-[10px] text-muted-foreground">Từ đặt bàn tương lai</p>
            </div>

            <div className="rounded-lg bg-stone-50 p-3 border border-border/60">
              <span className="text-[10.5px] font-medium text-stone-600 uppercase">
                Doanh thu menu
              </span>
              <p className="mt-1 font-heading text-lg font-bold tabular-nums text-[#b45309]">
                {formatVND(
                  liveKpi.futureGuests > 0
                    ? liveKpi.expectedMenuRevenue
                    : liveKpi.menuPricePerGuest,
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatVND(liveKpi.menuPricePerGuest)}/khách
              </p>
            </div>

            <div className="rounded-lg bg-stone-50 p-3 border border-border/60">
              <span className="text-[10.5px] font-medium text-stone-600 uppercase">
                Chi phí nguyên liệu
              </span>
              <p className="mt-1 font-heading text-lg font-bold tabular-nums text-stone-800">
                {formatVND(
                  liveKpi.futureGuests > 0 ? liveKpi.expectedFoodCost : liveKpi.costPerGuest,
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatPercent(liveKpi.foodCostPct, 1)} doanh thu menu
              </p>
            </div>

            <div className="rounded-lg bg-stone-50 p-3 border border-border/60">
              <span className="text-[10.5px] font-medium text-emerald-800 uppercase">
                Lãi gộp menu
              </span>
              <p className="mt-1 font-heading text-lg font-bold tabular-nums text-emerald-800">
                {formatVND(
                  liveKpi.futureGuests > 0
                    ? liveKpi.expectedGrossProfit
                    : liveKpi.grossProfitPerGuest,
                )}
              </p>
              <p className="text-[10px] text-emerald-700">
                Biên {formatPercent(liveKpi.grossMarginPct, 1)}
              </p>
            </div>
          </div>

          {liveKpi.expectedPairingRevenue > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs bg-amber-50/60 rounded-lg p-2.5 border border-amber-200/70">
              <div className="flex items-center gap-2">
                <Wine className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <span className="text-stone-700">
                  Doanh thu tea pairing dự thu:{" "}
                  <strong className="text-stone-900">
                    {formatVND(liveKpi.expectedPairingRevenue)}
                  </strong>
                </span>
              </div>
              <span className="text-[10.5px] text-stone-500 font-medium">
                Doanh thu phụ trợ (không tính vào định mức food cost món)
              </span>
            </div>
          )}
        </div>

        {/* ==================== 3 LỰA CHỌN QUẢN TRỊ KHI VƯỢT TRẦN ==================== */}
        {!isSafe && (
          <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-900">
              <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0" />
              <h4 className="font-heading text-sm font-bold">
                Ý nghĩa quản trị: Food cost vượt trần 35% → 3 Lựa chọn hành động
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-white/90 p-3 border border-rose-200">
                <p className="font-bold text-rose-950 flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  Tăng giá menu
                </p>
                <p className="mt-1 text-stone-600 leading-relaxed">
                  Tăng giá bán suất tasting “Tiến Vua” (từ {formatVND(liveKpi.menuPricePerGuest)}) để bù đắp chi phí nguyên liệu đầu vào.
                </p>
              </div>

              <div className="rounded-lg bg-white/90 p-3 border border-rose-200">
                <p className="font-bold text-rose-950 flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-[10px]">
                    2
                  </span>
                  Đàm phán đơn giá
                </p>
                <p className="mt-1 text-stone-600 leading-relaxed">
                  Đàm phán lại đơn giá nhập kho với các NCC chủ lực, đặc biệt là nguyên liệu cho{" "}
                  <strong>Món {liveKpi.topCostDish.dishIndex} ({liveKpi.topCostDish.name})</strong>.
                </p>
              </div>

              <div className="rounded-lg bg-white/90 p-3 border border-rose-200">
                <p className="font-bold text-rose-950 flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-[10px]">
                    3
                  </span>
                  Đổi nguyên liệu (BOM)
                </p>
                <p className="mt-1 text-stone-600 leading-relaxed">
                  Thay thế hoặc điều chỉnh định lượng nguyên liệu đắt đỏ sang phương án thay thế trong công thức BOM 7 món “Tiến Vua”.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== MÔ PHỎNG WHAT-IF (INTERACTIVE) ==================== */}
        <AnimatePresence>
          {showWhatIf && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl border border-amber-300 bg-[#fdf0d5]/40 p-4 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <div className="flex items-center gap-2 text-stone-900">
                  <Sliders className="h-4 w-4 text-[#b45309]" />
                  <h4 className="font-heading text-sm font-bold">
                    Bảng Mô phỏng "What-if" — Thay đổi đơn giá kho &amp; giá menu
                  </h4>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSimMenuPrice(MENU_PRICE_PER_GUEST);
                    setSimCostDelta(0);
                  }}
                  className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900"
                >
                  Đặt lại mặc định
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* 1. Thử thay đổi Giá Menu bằng Thanh trượt ngang */}
                <div className="rounded-xl border border-amber-300/80 bg-white/95 p-3.5 sm:p-4 space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-[#b45309]" />
                      1. Thử điều chỉnh giá menu (Kéo thanh trượt):
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-lg sm:text-xl font-extrabold text-[#b45309] tabular-nums tracking-tight">
                        {formatVND(simMenuPrice)}
                      </span>
                      {simMenuPrice === baselineMenuPrice ? (
                        <Badge variant="outline" className="text-[10px] bg-stone-100 text-stone-600 border-stone-300 font-semibold">
                          Giá gốc
                        </Badge>
                      ) : simMenuPrice > baselineMenuPrice ? (
                        <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          +{formatVND(simMenuPrice - baselineMenuPrice)} (+{(((simMenuPrice - baselineMenuPrice) / baselineMenuPrice) * 100).toFixed(1)}%)
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] font-bold bg-rose-100 text-rose-800 border-rose-300">
                          {formatVND(simMenuPrice - baselineMenuPrice)} ({(((simMenuPrice - baselineMenuPrice) / baselineMenuPrice) * 100).toFixed(1)}%)
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Thanh trượt ngang Slider Giá menu */}
                  <div className="pt-1 px-1">
                    <Slider
                      value={[simMenuPrice]}
                      min={1_000_000}
                      max={2_200_000}
                      step={10_000}
                      onValueChange={(vals) => setSimMenuPrice(vals[0])}
                      className="py-2.5 cursor-grab active:cursor-grabbing [&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:bg-stone-200 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-amber-600 [&_[data-slot=slider-range]]:to-[#b45309] [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-[#b45309] [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:hover:scale-110"
                    />
                    <div className="flex justify-between text-[10px] text-stone-500 font-medium pt-1">
                      <span>1.000.000 đ</span>
                      <span className="text-[#92400e] font-semibold">1.440.000 đ (Gốc)</span>
                      <span>2.200.000 đ</span>
                    </div>
                  </div>
                </div>

                {/* 2. Thử thay đổi Giá vốn nguyên liệu bằng Thanh trượt ngang */}
                <div className="rounded-xl border border-amber-300/80 bg-white/95 p-3.5 sm:p-4 space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-[#b45309]" />
                      2. Thử thay đổi giá vốn nguyên liệu (Kéo thanh trượt):
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-heading text-lg sm:text-xl font-extrabold tabular-nums tracking-tight",
                          simCostDelta > 0
                            ? "text-rose-700"
                            : simCostDelta < 0
                              ? "text-emerald-700"
                              : "text-stone-800",
                        )}
                      >
                        {simCostDelta > 0
                          ? `+${formatVND(simCostDelta)}`
                          : simCostDelta < 0
                            ? formatVND(simCostDelta)
                            : "0 đ"}
                      </span>
                      {simCostDelta === 0 ? (
                        <Badge variant="outline" className="text-[10px] bg-stone-100 text-stone-600 border-stone-300 font-semibold">
                          Giá gốc
                        </Badge>
                      ) : simCostDelta > 0 ? (
                        <Badge className="text-[10px] font-bold bg-rose-100 text-rose-800 border-rose-300">
                          Tăng vốn
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                          Tiết kiệm
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Thanh trượt ngang Slider Giá vốn */}
                  <div className="pt-1 px-1">
                    <Slider
                      value={[simCostDelta]}
                      min={-100_000}
                      max={100_000}
                      step={5_000}
                      onValueChange={(vals) => setSimCostDelta(vals[0])}
                      className="py-2.5 cursor-grab active:cursor-grabbing [&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:bg-stone-200 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-emerald-600 [&_[data-slot=slider-range]]:to-[#b45309] [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-[#b45309] [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:hover:scale-110"
                    />
                    <div className="flex justify-between text-[10px] text-stone-500 font-medium pt-1">
                      <span className="text-emerald-700 font-semibold">-100.000 đ (Tiết kiệm)</span>
                      <span className="text-[#92400e] font-semibold">0 đ (Gốc)</span>
                      <span className="text-rose-700 font-semibold">+100.000 đ (Tăng)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kết quả mô phỏng */}
              <div className="rounded-lg border border-amber-200 bg-white p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-stone-500">Kết quả sau mô phỏng:</span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="font-heading text-lg font-bold tabular-nums text-stone-900">
                      Food Cost {formatPercent(simulatedFoodCostPct, 1)}
                    </span>
                    <span className="text-stone-500 font-normal">
                      (Giá vốn {formatVND(simulatedCostPerGuest)} / Giá menu {formatVND(simMenuPrice)})
                    </span>
                    {isSimulatedSafe ? (
                      <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ✓ Trong khung duyệt ≤ 35%
                      </Badge>
                    ) : (
                      <Badge className="border-rose-300 bg-rose-100 text-rose-800 text-[10px] font-bold">
                        ⚠️ Vượt trần cảnh báo đỏ 35%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigateTab && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onNavigateTab("inventory")}
                      className="h-8 rounded-full bg-[#b45309] text-xs font-semibold text-[#fffbf2] hover:bg-[#92400e]"
                    >
                      Đến Quản lý Tồn kho để đổi đơn giá thực tế
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* BIỂU ĐỒ CỘT CHỒNG ĐỐI CHIẾU KỊCH BẢN & PHÂN BỔ DÒNG TIỀN */}
              <div className="rounded-xl border border-amber-200/90 bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-[#b45309]">
                      <BarChart3 className="h-3.5 w-3.5" />
                    </span>
                    <h5 className="font-heading text-xs font-bold uppercase tracking-wider text-stone-900">
                      Biểu đồ Cột Chồng Đối chiếu Kịch bản &amp; Cơ cấu Doanh thu (What-if)
                    </h5>
                  </div>
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold gap-1",
                      isSimulatedSafe
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-rose-300 bg-rose-50 text-rose-800",
                    )}
                  >
                    {isSimulatedSafe ? (
                      <>
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        Đệm an toàn: +{bufferPct}% ({formatVND(bufferVND)}/khách)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 text-rose-600" />
                        Vượt trần: +{Math.abs(bufferPct)}% ({formatVND(Math.abs(bufferVND))}/khách)
                      </>
                    )}
                  </Badge>
                </div>

                {/* 1. BIỂU ĐỒ CỘT CHỒNG RECHARTS */}
                <div className="w-full pt-1">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={scenarioChartData}
                        margin={{ top: 25, right: 130, left: 10, bottom: 5 }}
                        maxBarSize={52}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5efe4" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={{ stroke: "#e7e5e4" }}
                          tick={{ fontSize: 11, fill: "#57534e", fontWeight: 600 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={{ stroke: "#e7e5e4" }}
                          tick={{ fontSize: 10, fill: "#78716c" }}
                          tickFormatter={(v) => `${(v / 1000).toLocaleString("vi-VN")}k`}
                          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                        />
                        <RechartsTooltip content={<WhatIfChartTooltip />} />
                        <ReferenceLine
                          y={Math.round(simMenuPrice * (TARGET_FOOD_COST_CEILING_PCT / 100))}
                          stroke="#e11d48"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: `Vạch trần đỏ 35% (${formatVND(Math.round(simMenuPrice * (TARGET_FOOD_COST_CEILING_PCT / 100)))})`,
                            position: "right",
                            fill: "#be123c",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        />
                        <Bar
                          dataKey="cost"
                          stackId="scenario"
                          name="Giá vốn nguyên liệu"
                          radius={[0, 0, 4, 4]}
                        >
                          {scenarioChartData.map((entry, index) => (
                            <Cell
                              key={`cell-cost-${index}`}
                              fill={
                                entry.foodCostPct > TARGET_FOOD_COST_CEILING_PCT
                                  ? "#e11d48"
                                  : entry.isCurrent
                                    ? "#92400e"
                                    : "#b45309"
                              }
                              stroke={entry.isCurrent ? "#78350f" : "transparent"}
                              strokeWidth={entry.isCurrent ? 2 : 0}
                            />
                          ))}
                        </Bar>
                        <Bar
                          dataKey="profit"
                          stackId="scenario"
                          name="Lợi nhuận gộp"
                          radius={[4, 4, 0, 0]}
                        >
                          {scenarioChartData.map((entry, index) => (
                            <Cell
                              key={`cell-profit-${index}`}
                              fill={entry.isCurrent ? "#047857" : "#059669"}
                              stroke={entry.isCurrent ? "#065f46" : "transparent"}
                              strokeWidth={entry.isCurrent ? 2 : 0}
                            />
                          ))}
                          <LabelList
                            dataKey="topLabel"
                            position="top"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              fill: "#292524",
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Chú giải Legend của biểu đồ */}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-5 text-xs text-stone-600 border-t border-stone-100 pt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-xs bg-[#b45309]" />
                      <span>Giá vốn nguyên liệu (Food Cost)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-xs bg-emerald-600" />
                      <span>Lợi nhuận gộp (Gross Margin)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 bg-rose-600 border-b border-dashed border-rose-600" />
                      <span className="font-semibold text-rose-700">Ngưỡng trần tối đa 35%</span>
                    </span>
                    <span className="text-[10.5px] text-stone-400 italic">
                      * Cột có dấu ★ là mức giá đang chọn
                    </span>
                  </div>
                </div>

                {/* 2. SƠ ĐỒ ĐỐI CHIẾU 3 KHỐI: HIỆN HÀNH -> ĐỘ LỆCH -> MÔ PHỎNG */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Khối Hiện hành */}
                  <div className="rounded-lg border border-stone-200 bg-stone-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                      <span>Kịch bản Hiện hành</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Gốc</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-stone-600">
                        <span>Giá menu:</span>
                        <strong className="text-stone-900">{formatVND(baselineMenuPrice)}</strong>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Giá vốn:</span>
                        <strong className="text-stone-900">{formatVND(baselineCostPerGuest)}</strong>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Food Cost %:</span>
                        <strong className="text-[#b45309]">
                          {formatPercent(baselineFoodCostPct, 1)}
                        </strong>
                      </div>
                      <div className="flex justify-between text-stone-600 pt-1 border-t border-stone-200">
                        <span>Lãi gộp/khách:</span>
                        <strong className="text-emerald-700">
                          {formatVND(baselineGrossProfit)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Khối Tác động (Delta) */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#92400e]">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Độ lệch dịch chuyển (Δ)
                      </span>
                      <span className="text-[10px] font-normal text-amber-700">What-if</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-600">Δ Giá menu:</span>
                        <strong
                          className={cn(
                            deltaMenuPrice > 0
                              ? "text-emerald-700"
                              : deltaMenuPrice < 0
                                ? "text-rose-700"
                                : "text-stone-700",
                          )}
                        >
                          {deltaMenuPrice > 0
                            ? `+${formatVND(deltaMenuPrice)}`
                            : formatVND(deltaMenuPrice)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">Δ Giá vốn:</span>
                        <strong
                          className={cn(
                            deltaCost > 0
                              ? "text-rose-700"
                              : deltaCost < 0
                                ? "text-emerald-700"
                                : "text-stone-700",
                          )}
                        >
                          {deltaCost > 0 ? `+${formatVND(deltaCost)}` : formatVND(deltaCost)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">Δ Food Cost:</span>
                        <strong
                          className={cn(
                            deltaFoodCostPct < 0
                              ? "text-emerald-700"
                              : deltaFoodCostPct > 0
                                ? "text-rose-700"
                                : "text-stone-700",
                          )}
                        >
                          {deltaFoodCostPct > 0 ? `+${deltaFoodCostPct}%` : `${deltaFoodCostPct}%`}
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-amber-200">
                        <span className="text-stone-600">Δ 1 ca (40 khách):</span>
                        <strong
                          className={cn(
                            "font-bold",
                            shiftImpact >= 0 ? "text-emerald-700" : "text-rose-700",
                          )}
                        >
                          {shiftImpact > 0 ? `+${formatVND(shiftImpact)}` : formatVND(shiftImpact)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Khối Kịch bản Mô phỏng */}
                  <div
                    className={cn(
                      "rounded-lg border p-3 space-y-2",
                      isSimulatedSafe
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-rose-300 bg-rose-50/70",
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-800">
                      <span>Kịch bản Sau mô phỏng</span>
                      <Badge
                        className={cn(
                          "text-[9px] px-1.5 py-0",
                          isSimulatedSafe
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-rose-100 text-rose-800 border-rose-300",
                        )}
                      >
                        {isSimulatedSafe ? "✓ ≤ 35%" : "⚠️ > 35%"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-stone-600">
                        <span>Giá menu mới:</span>
                        <strong className="text-stone-900">{formatVND(simMenuPrice)}</strong>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Giá vốn mới:</span>
                        <strong className="text-stone-900">
                          {formatVND(simulatedCostPerGuest)}
                        </strong>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Food Cost mới:</span>
                        <strong
                          className={cn(
                            "font-heading text-sm font-bold",
                            isSimulatedSafe ? "text-emerald-800" : "text-rose-700",
                          )}
                        >
                          {formatPercent(simulatedFoodCostPct, 1)}
                        </strong>
                      </div>
                      <div className="flex justify-between text-stone-600 pt-1 border-t border-border/60">
                        <span>Lãi gộp mới:</span>
                        <strong className="text-emerald-800">
                          {formatVND(simulatedGrossProfit)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

