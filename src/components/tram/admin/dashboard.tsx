"use client";

import { useEffect, useRef } from "react";

// 3.1 Dashboard quản trị — KPI, biểu đồ occupancy, nguồn đặt bàn, Top 5 mới nhất, Top 5 hôm nay & Top 5 đánh giá
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
    <Card className="border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
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

  if (loading && !data) return <LoadingBlock label="Đang tổng hợp số liệu..." />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;
  if (!data) return null;

  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Lăn chuột ngang tự nhiên trên biểu đồ 4 tuần
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Ưu tiên hiển thị tuần hiện tại (cuộn dải ngày 4 tuần tới vị trí ngày hôm nay)
  useEffect(() => {
    if (!chartContainerRef.current || !data?.occupancy?.length) return;
    const container = chartContainerRef.current;
    const todayIndex = data.occupancy.findIndex((p) => p.date === today);
    if (todayIndex !== -1) {
      const totalDays = data.occupancy.length;
      const scrollWidth = container.scrollWidth;
      const dayWidth = scrollWidth / totalDays;
      const targetScroll = todayIndex * dayWidth - container.clientWidth / 2 + dayWidth / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
    }
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

  const chartData = data.occupancy.map((p) => ({
    ...p,
    isMonday: p.weekday === 1,
    tooltipPercent: p.capacity === 0 ? 0 : Math.round(p.percent),
    bar1730: p.weekday === 1 ? 0 : Math.round(p.slot1730Percent ?? 0),
    bar1945: p.weekday === 1 ? 0 : Math.round(p.slot1945Percent ?? 0),
    displayLabel: p.date === today ? `★ ${p.label}` : p.label,
  }));

  const recentList = data.recentReservations || [];
  const todayList = data.todayReservations || [];
  const surveysList = data.topSurveys || [];

  return (
    <div className="space-y-6">
      {/* Tiêu đề Dashboard & Nút Làm mới dữ liệu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>

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
          sub="Các khung giờ có khách · 42 chỗ/khung"
        />
        <KpiCard
          icon={UserX}
          label="Tỷ lệ no-show"
          value={formatPercent(data.noShowRate)}
          sub="Trong các tối đã phục vụ (quá khứ)"
        />
        <KpiCard
          icon={Banknote}
          label="Doanh thu dự thu"
          value={formatVND(data.expectedRevenue)}
          sub="Từ đặt bàn tương lai còn hiệu lực"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---- Biểu đồ số lượng khách 4 tuần / 1 tháng (Cuộn ngang, ưu tiên tuần hiện tại) ---- */}
        <Card className="border-border/80 bg-card shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="inline-flex items-center gap-2 font-heading text-lg text-[#292524]">
                  <TrendingUp className="h-5 w-5 text-[#b45309]" aria-hidden />
                  Số Lượng Khách 2 Khung Giờ (4 Tuần / 1 Tháng)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thống kê số chỗ đặt thực tế mỗi ngày · Tối đa 42 chỗ/khung · Đường mục tiêu 36 chỗ (85%)
                </p>
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
                  Mục tiêu 36 chỗ (85%)
                </span>
              </div>
              <span className="text-[11px] text-stone-500 italic">
                ↔ Cuộn chuột ngang để lướt xem 28 ngày
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Vùng cuộn ngang biểu đồ 4 tuần */}
            <div
              ref={chartContainerRef}
              className="w-full overflow-x-auto pb-2 tram-scroll select-none"
              role="region"
              aria-label="Khu vực cuộn ngang biểu đồ 4 tuần"
            >
              <div className="min-w-[1680px] h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 22, right: 20, left: -10, bottom: 0 }}>
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
                    <YAxis
                      domain={[0, 48]}
                      tick={{ fontSize: 10, fill: "#78716c" }}
                      tickFormatter={(v: number) => `${v}`}
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* Đường mục tiêu 36 chỗ (85% của 42 chỗ) */}
                    <ReferenceLine
                      y={36}
                      stroke="#dc2626"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "36 chỗ (85%)",
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
                                    {p.slot1730Occupied}/42 khách ({p.bar1730}%)
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-stone-700">
                                    <span className="h-2 w-2 rounded-full bg-[#d97706]" />
                                    Khung 19:45:
                                  </span>
                                  <span className="font-semibold text-stone-900">
                                    {p.slot1945Occupied}/42 khách ({p.bar1945}%)
                                  </span>
                                </div>
                                <div className="mt-1 pt-1 border-t border-dashed border-stone-200 flex items-center justify-between text-[10px]">
                                  <span className="text-stone-500">Mục tiêu 36 chỗ:</span>
                                  <span
                                    className={`font-bold ${
                                      p.slot1730Occupied >= 36 || p.slot1945Occupied >= 36
                                        ? "text-emerald-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {p.slot1730Occupied >= 36 && p.slot1945Occupied >= 36
                                      ? "✓ Đạt cả 2 khung"
                                      : p.slot1945Occupied >= 36
                                        ? "✓ Đạt khung 19:45"
                                        : p.slot1730Occupied >= 36
                                          ? "✓ Đạt khung 17:30"
                                          : "Chưa đạt"}
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
            <p className="mt-2 text-[11px] text-muted-foreground">
              So sánh 2 khung giờ: Khung 19:45 (vàng hổ phách) thường đạt mục tiêu 36 khách cao hơn khung 17:30 (xanh biển) — tối ưu bài toán yield management và xếp bàn.
            </p>
          </CardContent>
        </Card>

        {/* ---- Nguồn đặt bàn ---- */}
        <Card className="border-border/80 bg-card shadow-sm">
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
            <p className="rounded-lg border border-dashed border-[#b45309]/30 bg-[#fdf0d5]/40 p-2.5 text-[11px] leading-relaxed text-stone-600">
              Kênh Web đang dẫn đầu — kết quả của việc đưa đặt bàn lên mạng
              (trọng tâm chuyển đổi số của đồ án).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ---- 3 KHỐI: TOP 5 ĐẶT BÀN MỚI NHẤT, TOP 5 ĐẶT BÀN HÔM NAY, TOP 5 ĐÁNH GIÁ ---- */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* ================= 1. TOP 5 ĐẶT BÀN MỚI NHẤT ================= */}
        <Card className="border-border/80 bg-card shadow-sm flex flex-col justify-between">
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

        {/* ================= 2. TOP 5 ĐẶT BÀN HÔM NAY ================= */}
        <Card className="border-border/80 bg-card shadow-sm flex flex-col justify-between">
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

        {/* ================= 3. TOP 5 ĐÁNH GIÁ THỰC KHÁCH ================= */}
        <Card className="border-border/80 bg-card shadow-sm flex flex-col justify-between">
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
      </div>

      <p className="pb-2 text-[11px] text-muted-foreground">
        Cửa sổ thống kê: {data.windowLabel}. Số liệu cập nhật thời gian thực phục vụ vận hành nhà hàng TRẦM Reserve.
      </p>
    </div>
  );
}
