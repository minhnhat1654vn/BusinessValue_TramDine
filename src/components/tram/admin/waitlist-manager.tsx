"use client";

// 3.5 Quản lý waitlist — mời khách theo (ngày, khung), ưu tiên khách đặt trước 2 ngày
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BellRing,
  MailCheck,
  Phone,
  Search,
  X,
  Sparkles,
  Calendar,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ErrorBlock,
  LoadingBlock,
  useJson,
  useToday,
} from "./admin-shared";
import {
  formatLongDate,
  formatShortDate,
  WEEKDAY_FULL_LABELS,
  weekdayOf,
} from "@/lib/tram/format";
import { SLOT_LABELS } from "@/lib/tram/constants";
import type { WaitlistEntryDTO } from "@/lib/tram/types";
import { cn } from "@/lib/utils";

interface WaitlistResponse {
  entries: WaitlistEntryDTO[];
}

export function getWaitlistPriority(w: WaitlistEntryDTO, todayStr: string) {
  const mealDate = new Date(`${w.date}T00:00:00Z`).getTime();
  const createdDate = new Date(`${w.createdAt.slice(0, 10)}T00:00:00Z`).getTime();
  const todayDate = new Date(`${todayStr}T00:00:00Z`).getTime();
  const msDay = 86400000;

  // Số ngày book trước ngày dùng bữa (Ví dụ: đặt ngày 30 cho ngày 31 -> 1 ngày; đặt ngày 28 cho ngày 31 -> 3 ngày)
  const daysInAdvance = Math.round((mealDate - createdDate) / msDay);
  // Số ngày còn lại tính từ hôm nay tới ngày dùng bữa
  const daysUntilMeal = Math.round((mealDate - todayDate) / msDay);

  const isBooked2DaysAdvance = daysInAdvance >= 2;
  const isWithin2Days = daysUntilMeal >= 0 && daysUntilMeal <= 2;

  return {
    daysInAdvance,
    daysUntilMeal,
    isBooked2DaysAdvance,
    isWithin2Days,
  };
}

export function AdminWaitlist() {
  const today = useToday();
  const url = today ? `/api/waitlist?today=${today}` : null;
  const { data, loading, error, refresh } = useJson<WaitlistResponse>(url);
  const [inviting, setInviting] = useState<string | null>(null);

  // Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [slotFilter, setSlotFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "ADVANCE_2_DAYS" | "URGENT_2_DAYS">("ALL");

  // Danh sách các ngày duy nhất có waitlist để làm dropdown lọc
  const uniqueDates = useMemo(() => {
    if (!data?.entries) return [];
    const set = new Set(data.entries.map((w) => w.date));
    return Array.from(set).sort();
  }, [data?.entries]);

  // Lọc danh sách chờ theo tên, SĐT, ngày, khung giờ, trạng thái và ưu tiên đặt trước
  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    const t = today || new Date().toISOString().slice(0, 10);

    return data.entries.filter((w) => {
      // 1. Tìm theo tên hoặc SĐT
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchPhone = w.phone.toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      // 2. Lọc theo ngày
      if (dateFilter !== "ALL" && w.date !== dateFilter) {
        return false;
      }
      // 3. Lọc theo khung giờ
      if (slotFilter !== "ALL" && w.slot !== slotFilter) {
        return false;
      }
      // 4. Lọc theo trạng thái
      if (statusFilter !== "ALL" && w.status !== statusFilter) {
        return false;
      }
      // 5. Lọc theo tiêu chí ưu tiên
      const prio = getWaitlistPriority(w, t);
      if (priorityFilter === "ADVANCE_2_DAYS" && !prio.isBooked2DaysAdvance) {
        return false;
      }
      if (priorityFilter === "URGENT_2_DAYS" && !prio.isWithin2Days) {
        return false;
      }

      return true;
    });
  }, [data?.entries, search, dateFilter, slotFilter, statusFilter, priorityFilter, today]);

  // Nhóm theo Ngày|Khung giờ — Ưu tiên sắp xếp nhóm và khách book trước 2 ngày
  const groups = useMemo(() => {
    const map = new Map<string, WaitlistEntryDTO[]>();
    for (const w of filteredEntries) {
      const key = `${w.date}|${w.slot}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }

    const t = today || new Date().toISOString().slice(0, 10);

    // Sắp xếp các nhóm
    return Array.from(map.entries()).sort((a, b) => {
      // Nhóm nào có khách book trước 2 ngày được đưa lên đầu nếu cùng ngày
      return a[0].localeCompare(b[0]);
    });
  }, [filteredEntries, today]);

  const hasFilters =
    search !== "" ||
    dateFilter !== "ALL" ||
    slotFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL";

  function resetFilters() {
    setSearch("");
    setDateFilter("ALL");
    setSlotFilter("ALL");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
  }

  async function invite(entry: WaitlistEntryDTO) {
    setInviting(entry.id);
    try {
      const res = await fetch(`/api/waitlist/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không gửi được lời mời.");
        return;
      }
      toast.success(body.message ?? "Đã gửi lời mời.");
      refresh();
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setInviting(null);
    }
  }

  if (today === null) return <LoadingBlock />;
  if (loading && !data) return <LoadingBlock label="Đang tải danh sách chờ..." />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  // Đếm số lượng khách book trước 2 ngày
  const t = today || new Date().toISOString().slice(0, 10);
  const totalBooked2DaysCount = (data?.entries ?? []).filter(
    (w) => getWaitlistPriority(w, t).isBooked2DaysAdvance,
  ).length;

  return (
    <div className="space-y-5">
      {/* Thanh tìm kiếm & bộ lọc ngày, khung giờ, trạng thái và ưu tiên */}
      <div className="rounded-2xl border border-stone-200/90 bg-[#fffdf9] p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              type="text"
              placeholder="Tìm theo tên thực khách hoặc số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9 pr-8 bg-white border-stone-200 rounded-xl text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Các bộ lọc */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bộ lọc Ưu tiên (Đặc biệt: Ưu tiên khách book trước 2 ngày) */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
              className={cn(
                "h-10 rounded-xl border px-3 text-xs font-semibold shadow-2xs focus:outline-hidden transition-colors",
                priorityFilter !== "ALL"
                  ? "border-[#b45309] bg-[#fdf0d5] text-[#92400e]"
                  : "border-stone-200 bg-white text-stone-700",
              )}
            >
              <option value="ALL">Tất cả (Ưu tiên khách book trước ≥ 2 ngày)</option>
              <option value="ADVANCE_2_DAYS">⭐ Chỉ khách book trước ≥ 2 ngày ({totalBooked2DaysCount})</option>
              <option value="URGENT_2_DAYS">⏳ Khách dùng bữa trong 2 ngày tới</option>
            </select>

            {/* Lọc Ngày */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-2xs focus:outline-hidden"
            >
              <option value="ALL">Mọi ngày</option>
              {uniqueDates.map((d) => (
                <option key={d} value={d}>
                  {formatShortDate(d)} ({WEEKDAY_FULL_LABELS[weekdayOf(d)]})
                </option>
              ))}
            </select>

            {/* Lọc Khung giờ */}
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-2xs focus:outline-hidden"
            >
              <option value="ALL">Mọi khung giờ</option>
              <option value="SLOT_1730">Khung 17:30</option>
              <option value="SLOT_1945">Khung 19:45</option>
            </select>

            {/* Lọc Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-2xs focus:outline-hidden"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="WAITING">Đang chờ</option>
              <option value="INVITED">Đã mời</option>
            </select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-10 rounded-xl text-xs text-amber-900 hover:bg-amber-100/50"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Đặt lại
              </Button>
            )}
          </div>
        </div>

        {/* Thông tin thống kê sau khi lọc & Chú thích ưu tiên */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 pt-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <p>
              Hiển thị <strong className="text-amber-950 font-bold">{filteredEntries.length}</strong> / {data?.entries.length ?? 0} khách chờ
              {groups.length > 0 && ` (${groups.length} khung giờ)`}
            </p>
            {totalBooked2DaysCount > 0 && (
              <Badge className="bg-amber-100 text-[#92400e] border-amber-300 text-[10px] font-semibold">
                Có {totalBooked2DaysCount} khách book trước ≥ 2 ngày (Ưu tiên xếp đầu)
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-[#92400e] font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#b45309]" />
            Thứ tự ưu tiên: Khách đặt trước ≥ 2 ngày được xếp lên trên đầu danh sách mời.
          </p>
        </div>
      </div>

      {groups.length === 0 && (
        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
            <BellRing className="h-8 w-8 text-[#c2a37a]" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Không có khách nào khớp với bộ lọc danh sách chờ đã chọn.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(([key, entries]) => {
          const [dateISO, slot] = key.split("|");
          const weekday = WEEKDAY_FULL_LABELS[weekdayOf(dateISO)];

          // Sắp xếp ưu tiên trong nhóm: Khách book trước 2 ngày xếp lên trên cùng!
          const sortedEntries = entries.slice().sort((a, b) => {
            const prioA = getWaitlistPriority(a, t).isBooked2DaysAdvance ? 1 : 0;
            const prioB = getWaitlistPriority(b, t).isBooked2DaysAdvance ? 1 : 0;
            if (prioA !== prioB) return prioB - prioA; // Khách book trước 2 ngày lên trước
            return a.position - b.position;
          });

          return (
            <Card key={key} className="border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-heading text-lg text-[#292524]">
                  <span>
                    {weekday} · {formatLongDate(dateISO).split(", ")[1]}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-[#b45309]/40 bg-[#fdf0d5] font-medium text-[#92400e]"
                  >
                    Khung {SLOT_LABELS[slot as WaitlistEntryDTO["slot"]]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <ul className="space-y-2.5">
                  {sortedEntries.map((w) => {
                    const prio = getWaitlistPriority(w, t);
                    return (
                      <li
                        key={w.id}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 transition-all",
                          prio.isBooked2DaysAdvance
                            ? "border-amber-300/90 bg-[#fffdf5] shadow-xs"
                            : "border-border/80 bg-[#fffdf9]",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold",
                              prio.isBooked2DaysAdvance
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-[#f5efe4] text-[#92400e]",
                            )}
                            title={`Vị trí gốc: #${w.position}`}
                          >
                            #{w.position}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-[#292524]">
                                {w.name}
                              </p>
                              {prio.isBooked2DaysAdvance && (
                                <Badge className="gap-1 bg-amber-500/15 text-amber-900 border-amber-300 text-[10px] font-bold py-0 h-4.5">
                                  <Sparkles className="h-2.5 w-2.5 text-[#b45309]" />
                                  Book trước {prio.daysInAdvance} ngày
                                </Badge>
                              )}
                              {prio.isWithin2Days && (
                                <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800 text-[9.5px] py-0 h-4.5">
                                  Cận ngày ({prio.daysUntilMeal === 0 ? "Hôm nay" : `${prio.daysUntilMeal} ngày tới`})
                                </Badge>
                              )}
                            </div>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Phone className="h-3 w-3" aria-hidden />
                              {w.phone} · <span className="font-medium text-stone-700">{w.partySize} khách</span>
                              <span className="text-[10px] text-stone-400 ml-1">
                                (Đăng ký: {formatShortDate(w.createdAt.slice(0, 10))})
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {w.status === "INVITED" ? (
                            <Badge className="gap-1 border-emerald-600/40 bg-emerald-100/70 font-medium text-emerald-800 hover:bg-emerald-100/70">
                              <MailCheck className="h-3 w-3" aria-hidden />
                              Đã mời
                            </Badge>
                          ) : (
                            <>
                              <Badge
                                variant="outline"
                                className="border-border bg-muted font-medium text-stone-600"
                              >
                                Đang chờ
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => void invite(w)}
                                disabled={inviting === w.id}
                                className={cn(
                                  "h-9 min-w-11 rounded-full px-4 text-[#fffbf2]",
                                  prio.isBooked2DaysAdvance
                                    ? "bg-amber-600 hover:bg-amber-700 shadow-sm font-semibold"
                                    : "bg-[#b45309] hover:bg-[#92400e]",
                                )}
                              >
                                <BellRing className="h-3.5 w-3.5 mr-1" aria-hidden />
                                {prio.isBooked2DaysAdvance ? "Ưu tiên mời" : "Mời khách"}
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
