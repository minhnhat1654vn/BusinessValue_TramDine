"use client";

// 3.1 Dashboard quản trị — KPI, biểu đồ occupancy, nguồn đặt bàn, waitlist
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  CalendarCheck,
  Percent,
  UserX,
  BellRing,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ErrorBlock,
  LoadingBlock,
  StatusBadge,
  useJson,
} from "./admin-shared";
import { formatPercent, formatVND, formatLongDate, WEEKDAY_FULL_LABELS, weekdayOf } from "@/lib/tram/format";
import { SLOT_LABELS } from "@/lib/tram/constants";
import type { AdminStats } from "@/lib/tram/types";

interface DashboardProps {
  today: string;
}

const SOURCE_COLORS: Record<string, string> = {
  WEB: "#b45309",
  PHONE: "#c2a37a",
  ZALO: "#854d0e",
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

export function AdminDashboard({ today }: DashboardProps) {
  const { data, loading, error, refresh } = useJson<AdminStats>(
    `/api/admin/stats?today=${today}`,
  );

  if (loading && !data) return <LoadingBlock label="Đang tổng hợp số liệu..." />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;
  if (!data) return null;

  const chartData = data.occupancy.map((p) => ({
    ...p,
    isMonday: p.weekday === 1,
    tooltipPercent: p.capacity === 0 ? 0 : Math.round(p.percent),
    bar1730: p.weekday === 1 ? 0 : Math.round(p.slot1730Percent ?? 0),
    bar1945: p.weekday === 1 ? 0 : Math.round(p.slot1945Percent ?? 0),
  }));

  return (
    <div className="space-y-6">
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
        {/* ---- Biểu đồ occupancy 14 ngày (FR-14: Cột ghép 2 khung 17:30 và 19:45 + Target 85%) ---- */}
        <Card className="border-border/80 bg-card shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="inline-flex items-center gap-2 font-heading text-lg text-[#292524]">
                <TrendingUp className="h-5 w-5 text-[#b45309]" aria-hidden />
                Occupancy 2 Khung Giờ Theo Ngày
              </CardTitle>
              {/* FR-14 Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-stone-700">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#d97706]" />
                  Khung 17:30
                </span>
                <span className="inline-flex items-center gap-1.5 text-stone-700">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#b45309]" />
                  Khung 19:45
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                  <span className="inline-block w-4 border-b-2 border-dashed border-rose-500" />
                  Mục tiêu 85%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              14 ngày gần nhất · % lấp chỗ trên sức chứa mỗi khung (42 chỗ/khung)
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full" role="img" aria-label="Biểu đồ cột ghép tỷ lệ lấp chỗ 2 khung giờ">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 14, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e7e1d3" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#78716c" }}
                    interval={0}
                    angle={-38}
                    textAnchor="end"
                    height={46}
                    axisLine={{ stroke: "#e7e1d3" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#78716c" }}
                    tickFormatter={(v: number) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* FR-14: Đường mục tiêu 85% nét đứt */}
                  <ReferenceLine
                    y={85}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "85%",
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
                        <div className="rounded-xl border border-stone-200 bg-[#fffdfa] px-3.5 py-2.5 text-xs shadow-lg space-y-1.5 min-w-[210px]">
                          <div className="border-b border-stone-200/80 pb-1.5">
                            <p className="font-bold text-[#292524]">
                              {p.isMonday
                                ? `${p.label} — Nhà hàng đóng cửa`
                                : `${p.label} · ${WEEKDAY_FULL_LABELS[p.weekday]}`}
                            </p>
                            {!p.isMonday && (
                              <p className="text-[11px] text-stone-500">
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
                                  <span className="h-2 w-2 rounded-full bg-[#d97706]" />
                                  Khung 17:30:
                                </span>
                                <span className="font-semibold text-stone-900">
                                  {p.slot1730Occupied}/42 chỗ ({p.bar1730}%)
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-stone-700">
                                  <span className="h-2 w-2 rounded-full bg-[#b45309]" />
                                  Khung 19:45:
                                </span>
                                <span className="font-semibold text-stone-900">
                                  {p.slot1945Occupied}/42 chỗ ({p.bar1945}%)
                                </span>
                              </div>
                              <div className="mt-1 pt-1 border-t border-dashed border-stone-200 flex items-center justify-between text-[10px]">
                                <span className="text-stone-500">Mục tiêu 85%:</span>
                                <span
                                  className={`font-bold ${
                                    p.bar1730 >= 85 || p.bar1945 >= 85
                                      ? "text-emerald-700"
                                      : "text-amber-700"
                                  }`}
                                >
                                  {p.bar1730 >= 85 && p.bar1945 >= 85
                                    ? "✓ Đạt cả 2 khung"
                                    : p.bar1945 >= 85
                                      ? "✓ Đạt khung 19:45"
                                      : p.bar1730 >= 85
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
                  {/* FR-14: Hai cột ghép đại diện cho 2 khung 17:30 và 19:45 */}
                  <Bar
                    dataKey="bar1730"
                    name="Khung 17:30"
                    fill="#d97706"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={15}
                  />
                  <Bar
                    dataKey="bar1945"
                    name="Khung 19:45"
                    fill="#b45309"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={15}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              So sánh 2 khung giờ: Khung 19:45 thường đạt mục tiêu 85% cao hơn khung 17:30 — tối ưu bài toán yield management.
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

      {/* ---- Waitlist hôm nay & cuối tuần ---- */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-heading text-lg text-[#292524]">
            <BellRing className="h-5 w-5 text-[#b45309]" aria-hidden />
            Danh sách chờ
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Hôm nay và cuối tuần gần nhất
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            { title: "Hôm nay", entries: data.waitlistToday },
            { title: "Cuối tuần tới", entries: data.waitlistWeekend },
          ].map((group) => (
            <div
              key={group.title}
              className="rounded-xl border border-border bg-[#fffdf9] p-4"
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              {group.entries.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Không có khách chờ
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {group.entries.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#292524]">
                          #{w.position} · {w.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatLongDate(w.date).split(", ")[1]} ·{" "}
                          {SLOT_LABELS[w.slot]} · {w.partySize} khách
                        </p>
                      </div>
                      <StatusBadge
                        status={w.status === "INVITED" ? "CONFIRMED" : "PENDING"}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="pb-2 text-[11px] text-muted-foreground">
        Cửa sổ thống kê: {data.windowLabel}. Số liệu mô phỏng phục vụ đồ án
        Business Value.
      </p>
    </div>
  );
}
