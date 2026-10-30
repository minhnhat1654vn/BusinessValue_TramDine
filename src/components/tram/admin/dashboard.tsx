"use client";

// 3.1 Dashboard quản trị — KPI, biểu đồ occupancy, nguồn đặt bàn, waitlist
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
        {/* ---- Biểu đồ occupancy 14 ngày ---- */}
        <Card className="border-border/80 bg-card shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-heading text-lg text-[#292524]">
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#b45309]" aria-hidden />
                Occupancy theo ngày
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                14 ngày gần nhất · % chỗ đặt / sức chứa tối (84 chỗ)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full" role="img" aria-label="Biểu đồ cột tỷ lệ lấp chỗ theo ngày">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
                  <Tooltip
                    cursor={{ fill: "rgba(180, 83, 9, 0.06)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof chartData)[number];
                      return (
                        <div className="rounded-lg border border-border bg-[#fffdf9] px-3 py-2 text-xs shadow-md">
                          <p className="mb-1 font-medium text-[#292524]">
                            {p.isMonday
                              ? `${p.label} — nhà hàng nghỉ`
                              : `${p.label} · ${WEEKDAY_FULL_LABELS[p.weekday]}`}
                          </p>
                          {!p.isMonday && (
                            <p className="text-stone-600">
                              {p.occupied}/{p.capacity} chỗ ·{" "}
                              <span className="font-semibold text-[#b45309]">
                                {p.tooltipPercent}%
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="tooltipPercent" radius={[5, 5, 0, 0]} maxBarSize={26}>
                    {chartData.map((p, i) => (
                      <Cell
                        key={i}
                        fill={p.isMonday ? "#e7e1d3" : p.tooltipPercent >= 60 ? "#b45309" : "#d97706"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Cuối tuần kín hơn, đầu tuần (T3–T5 khung 17:30) thưa — đúng phân
              bổ nhu cầu của nhà hàng.
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
