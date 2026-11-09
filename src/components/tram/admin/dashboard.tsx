"use client";

import { useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  Banknote,
  CalendarCheck,
  Percent,
  UserX,
  TrendingUp,
  ArrowRight,
  Clock,
  Star,
  Users,
  UtensilsCrossed,
  MessageSquare,
  Sparkles,
  RefreshCw,
  User,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ErrorBlock,
  LoadingBlock,
  StatusBadge,
  useJson,
} from "./admin-shared";
import {
  formatPercent,
  formatVND,
  formatShortDate,
  WEEKDAY_FULL_LABELS,
} from "@/lib/tram/format";
import { SLOT_LABELS } from "@/lib/tram/constants";
import type { AdminStats } from "@/lib/tram/types";
import { cn } from "@/lib/utils";
import { FoodCostKpiWidget } from "./food-cost-kpi-widget";

interface DashboardProps {
  today: string;
  onNavigateTab?: (tab: string, date?: string) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  WEB: "#b45309",
  PHONE: "#c2a37a",
  ZALO: "#854d0e",
};

const SOURCE_LABELS: Record<string, string> = {
  WEB: "Web",
  PHONE: "Điện thoại",
  ZALO: "Zalo",
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <motion.div variants={fadeUpItem} whileHover={{ y: -3, transition: { duration: 0.2 } }}>
      <Card className="border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md h-full">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
              <Icon className="h-4.5 w-4.5" aria-hidden />
            </span>
          </div>
          <p className="font-heading text-[26px] font-semibold leading-tight text-[#292524] sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AdminDashboard({ today, onNavigateTab }: DashboardProps) {
  const { data, loading, error, refresh } = useJson<AdminStats>(
    `/api/admin/stats?today=${today}`,
  );

  // Tự động làm mới khi người dùng quay lại tab hoặc cửa sổ focus
  useEffect(() => {
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  // Cập nhật định kỳ 20 giây để bắt kịp lượt đặt bàn mới nhất
  useEffect(() => {
    const timer = setInterval(() => refresh(), 20000);
    return () => clearInterval(timer);
  }, [refresh]);

  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const revWrapperRef = useRef<HTMLDivElement>(null);
  const revContainerRef = useRef<HTMLDivElement>(null);

  // Cuộn chuột ngang trên biểu đồ Khách giống chọn ngày ở đặt bàn (booking-wizard)
  useEffect(() => {
    const wrapper = chartWrapperRef.current;
    const el = chartContainerRef.current;
    if (!wrapper || !el) return;

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        e.preventDefault();
        el.scrollLeft += delta;
      }
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [data]);

  // Cuộn chuột ngang trên biểu đồ Doanh thu giống chọn ngày ở đặt bàn
  useEffect(() => {
    const wrapper = revWrapperRef.current;
    const el = revContainerRef.current;
    if (!wrapper || !el) return;

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        e.preventDefault();
        el.scrollLeft += delta;
      }
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [data]);

  // Ưu tiên hiển thị tuần hiện tại (cuộn dải ngày 4 tuần tới vị trí ngày hôm nay)
  useEffect(() => {
    if (!chartContainerRef.current || !data?.occupancy?.length) return;
    const timer = setTimeout(() => {
      const container = chartContainerRef.current;
      if (!container) return;
      const todayIndex = data.occupancy.findIndex((p) => p.date === today);
      if (todayIndex !== -1) {
        const totalDays = data.occupancy.length;
        const scrollWidth = container.scrollWidth;
        const dayWidth = scrollWidth / totalDays;
        const targetScroll = todayIndex * dayWidth - container.clientWidth / 2 + dayWidth / 2;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [data, today]);

  // Ưu tiên hiển thị tuần hiện tại cho biểu đồ Doanh thu
  useEffect(() => {
    if (!revContainerRef.current || !data?.occupancy?.length) return;
    const timer = setTimeout(() => {
      const container = revContainerRef.current;
      if (!container) return;
      const todayIndex = data.occupancy.findIndex((p) => p.date === today);
      if (todayIndex !== -1) {
        const totalDays = data.occupancy.length;
        const scrollWidth = container.scrollWidth;
        const dayWidth = scrollWidth / totalDays;
        const targetScroll = todayIndex * dayWidth - container.clientWidth / 2 + dayWidth / 2;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [data, today]);

  const scrollToPast = () => {
    if (chartContainerRef.current) {
      chartContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const scrollToToday = () => {
    if (chartContainerRef.current && data?.occupancy?.length) {
      const container = chartContainerRef.current;
      const todayIndex = data.occupancy.findIndex((p) => p.date === today);
      if (todayIndex !== -1) {
        const totalDays = data.occupancy.length;
        const dayWidth = container.scrollWidth / totalDays;
        const targetScroll = todayIndex * dayWidth - container.clientWidth / 2 + dayWidth / 2;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
      }
    }
  };

  const scrollToFuture = () => {
    if (chartContainerRef.current) {
      chartContainerRef.current.scrollTo({
        left: chartContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  };

  const scrollToRevPast = () => {
    if (revContainerRef.current) {
      revContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const scrollToRevToday = () => {
    if (revContainerRef.current && data?.occupancy?.length) {
      const container = revContainerRef.current;
      const todayIndex = data.occupancy.findIndex((p) => p.date === today);
      if (todayIndex !== -1) {
        const totalDays = data.occupancy.length;
        const dayWidth = container.scrollWidth / totalDays;
        const targetScroll = todayIndex * dayWidth - container.clientWidth / 2 + dayWidth / 2;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
      }
    }
  };

  const scrollToRevFuture = () => {
    if (revContainerRef.current) {
      revContainerRef.current.scrollTo({
        left: revContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  };

  if (loading && !data) return <LoadingBlock label="Đang tổng hợp số liệu..." />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;
  if (!data) return null;

  const chartData = data.occupancy.map((p) => ({
    ...p,
    isMonday: p.weekday === 1,
    tooltipPercent: p.capacity === 0 ? 0 : Math.round(p.percent),
    bar1730: p.weekday === 1 ? 0 : Math.round(p.slot1730Percent ?? 0),
    bar1945: p.weekday === 1 ? 0 : Math.round(p.slot1945Percent ?? 0),
    displayLabel: p.date === today ? `★ ${p.label}` : p.label,
    revenue: p.revenue || 0,
    revenueM: Number(((p.revenue || 0) / 1000000).toFixed(1)),
  }));

  const recentList = data.recentReservations || [];
  const todayList = data.todayReservations || [];
  const surveysList = data.topSurveys || [];

  const totalRev = data.totalRevenue4Weeks || chartData.reduce((sum, p) => sum + p.revenue, 0);
  const activeRevDays = chartData.filter((p) => p.revenue > 0).length || 1;
  const avgDailyRev = Math.round(totalRev / activeRevDays);
  const avgDailyRevM = Number((avgDailyRev / 1000000).toFixed(1));
  const peakRevDay = [...chartData].sort((a, b) => b.revenue - a.revenue)[0];
  const maxRevM = Math.max(...chartData.map((p) => p.revenueM), 45);
  const revMaxTick = Math.ceil((maxRevM * 1.2) / 10) * 10;
  const revTicks = [
    0,
    Math.round(revMaxTick * 0.25),
    Math.round(revMaxTick * 0.5),
    Math.round(revMaxTick * 0.75),
    revMaxTick,
  ];

  // FR-34: Tìm ca chiều T4, T5, T6 gần nhất có lấp đầy <= 50% để cảnh báo kích hoạt Khung Giờ Vàng
  const upcomingGoldenHourAlert =
    data.occupancy.find(
      (p) =>
        p.date >= today &&
        [3, 4, 5].includes(p.weekday) &&
        (p.slot1730Percent ?? 0) <= 50,
    ) ?? null;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Tiêu đề Dashboard & Nút Làm mới dữ liệu */}
      <motion.div variants={fadeUpItem} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#292524] sm:text-2xl">
            Tổng quan Vận hành
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dữ liệu thời gian thực · Đồng bộ tự động với khách đặt bàn mới
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          disabled={loading}
          className="h-8 gap-2 border-stone-300 bg-white text-xs text-stone-700 shadow-xs hover:bg-stone-50 hover:text-[#b45309]"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-[#b45309]", loading && "animate-spin")} />
          Làm mới dữ liệu
        </Button>
      </motion.div>

      {/* ---- 4 KPI ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CalendarCheck}
          label="Lượt đặt 4 tuần"
          value={`${data.totalReservations}`}
          sub="Quanh hôm nay (2 tuần qua + 2 tuần tới)"
        />
        <KpiCard
          icon={Percent}
          label="Tỷ lệ lấp chỗ TB"
          value={formatPercent(data.occupancyRate)}
          sub="Các khung giờ có khách · 40 chỗ/khung (15 bàn) · Mục tiêu 2029: 56%"
        />
        <KpiCard
          icon={UserX}
          label="Tỷ lệ no-show"
          value={formatPercent(data.noShowRate)}
          sub="Baseline 2025: 18,0% → Mục tiêu 2027: 9,5% · 2029: 6,2%"
        />
        <KpiCard
          icon={Banknote}
          label="Doanh thu dự thu"
          value={formatVND(data.expectedRevenue)}
          sub="Menu “Tiến Vua” 1.440k + Tea Pairing 350k (TB 1.615k/khách)"
        />
      </div>

      {/* ---- FR-33: Widget KPI Food cost / Doanh thu menu · Mục tiêu 50% ---- */}
      <motion.div variants={fadeUpItem}>
        <FoodCostKpiWidget
          kpi={data.foodCostKpi}
          futureGuests={data.futureGuests}
          expectedPairingRevenue={data.expectedPairingRevenue}
          onNavigateTab={onNavigateTab}
        />
      </motion.div>

      {/* ---- FR-34: Banner Cảnh báo Kích hoạt Voucher Khung Giờ Vàng (Ca chiều T4, T5, T6) ---- */}
      {upcomingGoldenHourAlert && (
        <motion.div variants={fadeUpItem}>
          <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-500/10 via-[#fdf0d5]/60 to-amber-500/5 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-[#b45309] shrink-0 shadow-xs">
                <Zap className="h-4.5 w-4.5" />
              </span>
              <div>
                <h4 className="font-heading text-sm font-bold text-stone-900">
                  Khung Giờ Vàng — Ca Chiều {upcomingGoldenHourAlert.label} 17:30
                </h4>
              </div>
            </div>

            {onNavigateTab && (
              <Button
                type="button"
                size="sm"
                onClick={() => onNavigateTab("golden-hour")}
                className="h-8 rounded-full bg-[#b45309] text-xs font-semibold text-white hover:bg-[#92400e] gap-1.5 shadow-xs"
              >
                Tung Voucher Zalo OA
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---- Biểu đồ số lượng khách 4 tuần / 1 tháng (Cuộn ngang, ưu tiên tuần hiện tại) ---- */}
        <motion.div variants={fadeUpItem} className="lg:col-span-2">
          <Card className="border-border/80 bg-card shadow-sm h-full">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="inline-flex items-center gap-2 font-heading text-lg text-[#292524]">
                    <TrendingUp className="h-5 w-5 text-[#b45309]" aria-hidden />
                    Số Lượng Khách 2 Khung Giờ (4 Tuần / 1 Tháng)
                  </CardTitle>
                </div>

                {/* Nút lướt nhanh giữa các tuần */}
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={scrollToPast}
                    className="h-7 px-2 text-[11px] text-stone-600 hover:text-stone-900 hover:bg-white"
                    title="Cuộn sang 2 tuần trước"
                  >
                    ◀ 2 tuần trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrollToToday}
                    className="h-7 px-2.5 text-[11px] font-semibold text-[#b45309] bg-white border-amber-300 shadow-xs hover:bg-amber-50"
                    title="Ưu tiên cuộn về tuần hiện tại (Hôm nay)"
                  >
                    ★ Tuần này (Hôm nay)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={scrollToFuture}
                    className="h-7 px-2 text-[11px] text-stone-600 hover:text-stone-900 hover:bg-white"
                    title="Cuộn sang 2 tuần tới"
                  >
                    2 tuần tới ▶
                  </Button>
                </div>
              </div>

              {/* Chú giải Legend */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#0284c7]" />
                    Khung 17:30 (Xanh biển)
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#d97706]" />
                    Khung 19:45 (Vàng hổ phách)
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                    <span className="inline-block w-4 border-b-2 border-dashed border-rose-500" />
                    Mục tiêu 34 chỗ (85% của 40 chỗ)
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Khung biểu đồ với Trục Y cố định bên trái & Vùng cuộn ngang bên phải */}
              <div
                ref={chartWrapperRef}
                onWheel={(e) => {
                  const el = chartContainerRef.current;
                  if (!el) return;
                  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                  if (delta !== 0) el.scrollLeft += delta;
                }}
                className="flex border border-stone-200/80 rounded-xl bg-card overflow-hidden"
              >
                {/* CỘT TRỤC Y CỐ ĐỊNH BÊN TRÁI (LUÔN HIỂN THỊ KHI CUỘN) */}
                <div className="w-12 shrink-0 border-r border-stone-200/80 bg-[#fffdfa] select-none h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 14, right: 8, left: 0, bottom: 48 }}>
                      <YAxis
                        domain={[0, 48]}
                        ticks={[0, 12, 24, 36, 48]}
                        width={44}
                        tick={{ fontSize: 10, fill: "#78716c", fontWeight: 600 }}
                        tickFormatter={(v: number) => `${v}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <XAxis dataKey="displayLabel" hide height={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* VÙNG CUỘN NGANG CÁC CỘT BIỂU ĐỒ 4 TUẦN */}
                <div
                  ref={chartContainerRef}
                  className="flex-1 min-w-0 overflow-x-auto pb-2 tram-scroll select-none"
                  role="region"
                  aria-label="Khu vực cuộn ngang biểu đồ 4 tuần"
                >
                  <div className="min-w-[1600px] h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 14, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e7e1d3" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="displayLabel"
                          tick={(props) => {
                            const { x, y, payload } = props;
                            const isCurrentDay = String(payload.value).startsWith("★");
                            return (
                              <g transform={`translate(${x},${y})`}>
                                <text
                                  x={0}
                                  y={0}
                                  dy={14}
                                  textAnchor="end"
                                  fill={isCurrentDay ? "#b45309" : "#78716c"}
                                  fontWeight={isCurrentDay ? 700 : 400}
                                  fontSize={isCurrentDay ? 11 : 10}
                                  transform="rotate(-40)"
                                >
                                  {payload.value}
                                </text>
                              </g>
                            );
                          }}
                          interval={0}
                          height={48}
                          axisLine={{ stroke: "#e7e1d3" }}
                          tickLine={false}
                        />
                        <YAxis domain={[0, 48]} hide />
                        {/* Đường mục tiêu 34 chỗ (85% của 40 chỗ) */}
                        <ReferenceLine
                          y={34}
                          stroke="#dc2626"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: "34 chỗ (85%)",
                            position: "right",
                            fill: "#dc2626",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(180, 83, 9, 0.05)" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const p = payload[0].payload as (typeof chartData)[number];
                            return (
                              <div className="rounded-xl border border-stone-200 bg-[#fffdfa] px-3.5 py-2.5 text-xs shadow-lg space-y-1.5 min-w-[220px]">
                                <div className="border-b border-stone-200/80 pb-1.5">
                                  <p className="font-bold text-[#292524] flex items-center justify-between">
                                    <span>
                                      {p.isMonday
                                        ? `${p.label} — Nhà hàng nghỉ`
                                        : `${p.label} · ${WEEKDAY_FULL_LABELS[p.weekday]}`}
                                    </span>
                                    {p.date === today && (
                                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                                        HÔM NAY
                                      </span>
                                    )}
                                  </p>
                                  {!p.isMonday && (
                                    <p className="text-[11px] text-stone-500 mt-0.5">
                                      Tổng cả ngày:{" "}
                                      <strong className="text-[#b45309]">
                                        {p.occupied}/{p.capacity} chỗ ({p.tooltipPercent}%)
                                      </strong>
                                    </p>
                                  )}
                                </div>
                                {!p.isMonday ? (
                                  <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-stone-700">
                                        <span className="h-2 w-2 rounded-full bg-[#0284c7]" />
                                        Khung 17:30:
                                      </span>
                                      <span className="font-semibold text-stone-900">
                                        {p.slot1730Occupied}/40 khách ({p.bar1730}%)
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-stone-700">
                                        <span className="h-2 w-2 rounded-full bg-[#d97706]" />
                                        Khung 19:45:
                                      </span>
                                      <span className="font-semibold text-stone-900">
                                        {p.slot1945Occupied}/40 khách ({p.bar1945}%)
                                      </span>
                                    </div>
                                    <div className="mt-1 pt-1 border-t border-dashed border-stone-200 flex items-center justify-between text-[10px]">
                                      <span className="text-stone-500">Mục tiêu 34 chỗ:</span>
                                      <span
                                        className={`font-bold ${p.slot1730Occupied >= 34 || p.slot1945Occupied >= 34
                                            ? "text-emerald-700"
                                            : "text-amber-700"
                                          }`}
                                      >
                                        {p.slot1730Occupied >= 34 && p.slot1945Occupied >= 34
                                          ? "✓ Đạt cả 2 khung"
                                          : p.slot1945Occupied >= 34
                                            ? "✓ Đạt khung 19:45"
                                            : p.slot1730Occupied >= 34
                                              ? "✓ Đạt khung 17:30"
                                              : "Chưa đạt"}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-stone-400 italic">Đóng cửa định kỳ Thứ Hai &amp; Thứ Ba</p>
                                )}
                              </div>
                            );
                          }}
                        />
                        {/* Cột 17:30 (Xanh biển) với số lượng khách trên đỉnh */}
                        <Bar
                          dataKey="slot1730Occupied"
                          name="Khung 17:30"
                          fill="#0284c7"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={18}
                        >
                          <LabelList
                            dataKey="slot1730Occupied"
                            position="top"
                            formatter={(val: number) => (val > 0 ? `${val}` : "")}
                            style={{ fontSize: "9px", fontWeight: "700", fill: "#0369a1" }}
                          />
                        </Bar>
                        {/* Cột 19:45 (Vàng hổ phách) với số lượng khách trên đỉnh */}
                        <Bar
                          dataKey="slot1945Occupied"
                          name="Khung 19:45"
                          fill="#d97706"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={18}
                        >
                          <LabelList
                            dataKey="slot1945Occupied"
                            position="top"
                            formatter={(val: number) => (val > 0 ? `${val}` : "")}
                            style={{ fontSize: "9px", fontWeight: "700", fill: "#b45309" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ---- Nguồn đặt bàn ---- */}
        <motion.div variants={fadeUpItem}>
          <Card className="border-border/80 bg-card shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg text-[#292524]">
                Nguồn đặt bàn
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Tỷ trọng theo kênh · 4 tuần
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {data.sourceShares.map((s) => (
                <div key={s.source}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#292524]">{s.label}</span>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-[#92400e]">
                        {formatPercent(s.percent, 0)}
                      </span>{" "}
                      · {s.count} lượt
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={Math.round(s.percent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Tỷ lệ kênh ${s.label}`}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.percent}%`,
                        backgroundColor: SOURCE_COLORS[s.source],
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ---- BIỂU ĐỒ DOANH THU THEO NGÀY (4 TUẦN / 1 THÁNG) ---- */}
      <motion.div variants={fadeUpItem}>
        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="inline-flex items-center gap-2 font-heading text-lg text-[#292524]">
                    <Banknote className="h-5 w-5 text-emerald-600" aria-hidden />
                    Doanh Thu Theo Ngày (4 Tuần / 1 Tháng)
                  </CardTitle>
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold text-[11px] px-2 py-0.5">
                    Tổng 4 tuần: {formatVND(totalRev)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Doanh thu thực tế đã phục vụ & Doanh thu dự thu · Trung bình {formatVND(avgDailyRev)}/ngày hoạt động
                </p>
              </div>

              {/* Nút lướt nhanh giữa các tuần */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={scrollToRevPast}
                  className="h-7 px-2 text-[11px] text-stone-600 hover:text-stone-900 hover:bg-white"
                  title="Cuộn sang 2 tuần trước"
                >
                  ◀ 2 tuần trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrollToRevToday}
                  className="h-7 px-2.5 text-[11px] font-semibold text-emerald-700 bg-white border-emerald-300 shadow-xs hover:bg-emerald-50"
                  title="Ưu tiên cuộn về tuần hiện tại (Hôm nay)"
                >
                  ★ Tuần này (Hôm nay)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={scrollToRevFuture}
                  className="h-7 px-2 text-[11px] text-stone-600 hover:text-stone-900 hover:bg-white"
                  title="Cuộn sang 2 tuần tới"
                >
                  2 tuần tới ▶
                </Button>
              </div>
            </div>

            {/* Chú giải & Thống kê nổi bật */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                  <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                  Doanh thu ngày (VND)
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                  <span className="inline-block w-4 border-b-2 border-dashed border-emerald-600" />
                  Mức trung bình ({avgDailyRevM} tr/ngày)
                </span>
                {peakRevDay && peakRevDay.revenue > 0 && (
                  <span className="text-[11.5px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                    Đỉnh cao nhất: <strong className="text-emerald-700">{formatShortDate(peakRevDay.date)} ({peakRevDay.revenueM} tr)</strong>
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Khung biểu đồ Doanh thu với Trục Y cố định bên trái & Vùng cuộn ngang bên phải */}
            <div
              ref={revWrapperRef}
              onWheel={(e) => {
                const el = revContainerRef.current;
                if (!el) return;
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (delta !== 0) el.scrollLeft += delta;
              }}
              className="flex border border-stone-200/80 rounded-xl bg-card overflow-hidden"
            >
              {/* CỘT TRỤC Y CỐ ĐỊNH BÊN TRÁI (LUÔN HIỂN THỊ KHI CUỘN) */}
              <div className="w-16 shrink-0 border-r border-stone-200/80 bg-[#fffdfa] select-none h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 14, right: 8, left: 0, bottom: 48 }}>
                    <YAxis
                      domain={[0, revMaxTick]}
                      ticks={revTicks}
                      width={56}
                      tick={{ fontSize: 10, fill: "#78716c", fontWeight: 600 }}
                      tickFormatter={(v: number) => `${v}tr`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <XAxis dataKey="displayLabel" hide height={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* VÙNG CUỘN NGANG CÁC CỘT DOANH THU 4 TUẦN */}
              <div
                ref={revContainerRef}
                className="flex-1 min-w-0 overflow-x-auto pb-2 tram-scroll select-none"
                role="region"
                aria-label="Khu vực cuộn ngang biểu đồ doanh thu"
              >
                <div className="min-w-[1600px] h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 14, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e7e1d3" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="displayLabel"
                        tick={(props) => {
                          const { x, y, payload } = props;
                          const isCurrentDay = String(payload.value).startsWith("★");
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text
                                x={0}
                                y={0}
                                dy={14}
                                textAnchor="end"
                                fill={isCurrentDay ? "#047857" : "#78716c"}
                                fontWeight={isCurrentDay ? 700 : 400}
                                fontSize={isCurrentDay ? 11 : 10}
                                transform="rotate(-40)"
                              >
                                {payload.value}
                              </text>
                            </g>
                          );
                        }}
                        interval={0}
                        height={48}
                        axisLine={{ stroke: "#e7e1d3" }}
                        tickLine={false}
                      />
                      <YAxis domain={[0, revMaxTick]} hide />
                      <ReferenceLine
                        y={avgDailyRevM}
                        stroke="#059669"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: `TB: ${avgDailyRevM} tr`,
                          position: "right",
                          fill: "#047857",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(16, 185, 129, 0.06)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as (typeof chartData)[number];
                          return (
                            <div className="rounded-xl border border-stone-200 bg-[#fffdfa] px-3.5 py-2.5 text-xs shadow-lg space-y-1.5 min-w-[220px]">
                              <div className="border-b border-stone-200/80 pb-1.5">
                                <p className="font-bold text-[#292524] flex items-center justify-between">
                                  <span>
                                    {p.isMonday
                                      ? `${p.label} — Nhà hàng nghỉ`
                                      : `${p.label} · ${WEEKDAY_FULL_LABELS[p.weekday]}`}
                                  </span>
                                  {p.date === today && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                                      HÔM NAY
                                    </span>
                                  )}
                                </p>
                              </div>
                              {!p.isMonday ? (
                                <div className="space-y-1.5 text-[11px]">
                                  <div className="flex items-center justify-between">
                                    <span className="text-stone-600">Doanh thu ngày:</span>
                                    <span className="font-bold text-emerald-700 text-xs">
                                      {formatVND(p.revenue)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-stone-600">Lượt khách dùng bữa:</span>
                                    <span className="font-semibold text-stone-800">
                                      {p.occupied} khách ({p.tooltipPercent}% công suất)
                                    </span>
                                  </div>
                                  <div className="mt-1 pt-1 border-t border-dashed border-stone-200 flex items-center justify-between text-[10px]">
                                    <span className="text-stone-500">Doanh thu TB/khách:</span>
                                    <span className="font-semibold text-stone-700">
                                      {p.occupied > 0 ? formatVND(Math.round(p.revenue / p.occupied)) : "N/A"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-stone-400 italic">Đóng cửa định kỳ thứ Hai</p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="revenueM"
                        name="Doanh thu"
                        fill="#059669"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      >
                        <LabelList
                          dataKey="revenueM"
                          position="top"
                          formatter={(val: number) => (val > 0 ? `${val}tr` : "")}
                          style={{ fontSize: "9px", fontWeight: "700", fill: "#047857" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Doanh thu được tính tự động từ thực đơn Tasting Menu 7 món “Tiến Vua” (1.440.000 đ/khách) kèm gói Tea Pairing (+350.000 đ/khách · hóa đơn trung bình 1.615.000 đ/khách) của các đơn đặt bàn có hiệu lực.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- 3 KHỐI: TOP 5 ĐẶT BÀN MỚI NHẤT, TOP 5 ĐẶT BÀN HÔM NAY, TOP 5 ĐÁNH GIÁ ---- */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* ================= 1. TOP 5 ĐẶT BÀN MỚI NHẤT ================= */}
        <motion.div variants={fadeUpItem} className="h-full">
          <Card className="border-border/80 bg-card shadow-sm flex flex-col justify-between h-full">
            <div>
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="inline-flex items-center gap-2 font-heading text-base text-[#292524]">
                    <Sparkles className="h-4.5 w-4.5 text-[#b45309]" aria-hidden />
                    Khách đặt bàn mới nhất
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab?.("booking")}
                    className="h-8 px-2.5 text-xs text-[#b45309] hover:bg-[#fdf0d5] hover:text-[#92400e]"
                  >
                    Xem chi tiết
                    <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Top 5 khách hàng đặt bàn ghi nhận gần đây nhất
                </p>
              </CardHeader>
              <CardContent className="p-3.5">
                {recentList.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Chưa có lượt đặt bàn nào
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {recentList.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => onNavigateTab?.("booking", r.date)}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-[#fffdfa] p-2.5 transition-all hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/40 hover:shadow-xs cursor-pointer"
                        title="Bấm để xem chi tiết đặt bàn"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-stone-400 shrink-0 group-hover:text-[#b45309]" aria-hidden />
                            <span className="truncate text-xs font-bold text-stone-900 group-hover:text-[#b45309]">
                              {r.customerName}
                            </span>
                            <span className="font-mono text-[10.5px] font-semibold text-[#b45309] bg-amber-50 border border-amber-200/70 px-1 py-0.5 rounded shrink-0">
                              {r.code}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="font-mono text-stone-500 font-medium">{r.phone}</span>
                            <span>•</span>
                            <span className="font-medium text-stone-700">
                              Bàn {r.table?.code}
                            </span>
                            <span>•</span>
                            <span>{SLOT_LABELS[r.slot]}</span>
                            <span>•</span>
                            <span>{formatShortDate(r.date)}</span>
                            <span>•</span>
                            <span>{r.partySize} khách</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge status={r.status} />
                          <span className="text-[10px] text-muted-foreground bg-stone-100 px-1.5 py-0.5 rounded">
                            {SOURCE_LABELS[r.source] || r.source}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
            <div className="px-4 pb-3 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => onNavigateTab?.("booking")}
                className="w-full text-center text-[11.5px] font-medium text-[#b45309] hover:underline"
              >
                Xem tất cả danh sách đặt bàn →
              </button>
            </div>
          </Card>
        </motion.div>

        {/* ================= 2. TOP 5 ĐẶT BÀN HÔM NAY ================= */}
        <motion.div variants={fadeUpItem} className="h-full">
          <Card className="border-border/80 bg-card shadow-sm flex flex-col justify-between h-full">
            <div>
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="inline-flex items-center gap-2 font-heading text-base text-[#292524]">
                    <CalendarCheck className="h-4.5 w-4.5 text-[#b45309]" aria-hidden />
                    Đặt bàn hôm nay
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab?.("booking", today)}
                    className="h-8 px-2.5 text-xs text-[#b45309] hover:bg-[#fdf0d5] hover:text-[#92400e]"
                  >
                    Xem chi tiết
                    <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lượt phục vụ ngày hôm nay ({formatShortDate(today)})
                </p>
              </CardHeader>
              <CardContent className="p-3.5">
                {todayList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <p>Hôm nay chưa có lượt khách nào</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateTab?.("booking", today)}
                      className="mt-1 h-auto text-xs text-[#b45309]"
                    >
                      Mở sơ đồ bàn hôm nay
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {todayList.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => onNavigateTab?.("booking", today)}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-[#fffdfa] p-2.5 transition-all hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/40 hover:shadow-xs cursor-pointer"
                        title="Bấm để xem bàn trên sơ đồ mặt bằng hôm nay"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#b45309]">
                              {r.code}
                            </span>
                            <span className="text-muted-foreground text-[11px]">·</span>
                            <span className="truncate text-xs font-semibold text-stone-800">
                              {r.customerName}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-semibold border-amber-300 bg-amber-50 text-amber-900">
                              Bàn {r.table?.code}
                            </Badge>
                            <span>•</span>
                            <span className="font-medium text-stone-700">{SLOT_LABELS[r.slot]}</span>
                            <span>•</span>
                            <span>{r.partySize} khách</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge status={r.status} />
                          <span className="text-[10px] text-stone-500 font-mono">
                            {r.phone.slice(-4).padStart(r.phone.length, "•")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
            <div className="px-4 pb-3 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => onNavigateTab?.("booking", today)}
                className="w-full text-center text-[11.5px] font-medium text-[#b45309] hover:underline"
              >
                Mở sơ đồ & danh sách hôm nay →
              </button>
            </div>
          </Card>
        </motion.div>

        {/* ================= 3. TOP 5 ĐÁNH GIÁ THỰC KHÁCH ================= */}
        <motion.div variants={fadeUpItem} className="h-full">
          <Card className="border-border/80 bg-card shadow-sm flex flex-col justify-between h-full">
            <div>
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="inline-flex items-center gap-2 font-heading text-base text-[#292524]">
                    <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-400" aria-hidden />
                    Top 5 đánh giá
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab?.("surveys")}
                    className="h-8 px-2.5 text-xs text-[#b45309] hover:bg-[#fdf0d5] hover:text-[#92400e]"
                  >
                    Xem chi tiết
                    <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Phản hồi & khảo sát gần đây của khách
                </p>
              </CardHeader>
              <CardContent className="p-3.5">
                {surveysList.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Chưa có đánh giá khảo sát nào
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {surveysList.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onNavigateTab?.("surveys")}
                        className="group flex flex-col gap-1 rounded-xl border border-border/70 bg-[#fffdfa] p-2.5 transition-all hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/40 hover:shadow-xs cursor-pointer"
                        title="Bấm để xem trang Thống kê khảo sát"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate text-xs font-semibold text-stone-800">
                              {s.customerName}
                            </span>
                            <span className="font-mono text-[10.5px] text-muted-foreground">
                              ({s.reservationCode})
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0" aria-label={`${s.rating} sao`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < s.rating
                                    ? "text-amber-500 fill-amber-400"
                                    : "text-stone-300 fill-stone-100",
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 line-clamp-2 italic">
                          {s.comment ? `“${s.comment}”` : "Khách để lại đánh giá 5★ hài lòng về bữa ăn."}
                        </p>

                        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1">
                            <UtensilsCrossed className="h-3 w-3 text-[#b45309]" />
                            Món: {s.foodRating}★ · Phục vụ: {s.serviceRating}★
                          </span>
                          <span>{formatShortDate(s.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
            <div className="px-4 pb-3 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => onNavigateTab?.("surveys")}
                className="w-full text-center text-[11.5px] font-medium text-[#b45309] hover:underline"
              >
                Xem trang Thống kê khảo sát chi tiết →
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
