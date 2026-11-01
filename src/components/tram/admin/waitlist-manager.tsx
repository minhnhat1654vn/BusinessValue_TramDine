"use client";

// 3.5 Quản lý waitlist — mời khách theo (ngày, khung)
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, MailCheck, Phone, Search, Filter, X } from "lucide-react";
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
import { formatLongDate, formatShortDate, WEEKDAY_FULL_LABELS, weekdayOf } from "@/lib/tram/format";
import { SLOT_LABELS } from "@/lib/tram/constants";
import type { WaitlistEntryDTO } from "@/lib/tram/types";

interface WaitlistResponse {
  entries: WaitlistEntryDTO[];
}

export function AdminWaitlist() {
  const today = useToday();
  const url = today ? `/api/waitlist?today=${today}` : null;
  const { data, loading, error, refresh } = useJson<WaitlistResponse>(url);
  const [inviting, setInviting] = useState<string | null>(null);

  // FR-13: Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [slotFilter, setSlotFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Danh sách các ngày duy nhất có waitlist để làm dropdown lọc
  const uniqueDates = useMemo(() => {
    if (!data?.entries) return [];
    const set = new Set(data.entries.map((w) => w.date));
    return Array.from(set).sort();
  }, [data?.entries]);

  // Lọc danh sách chờ theo tên, SĐT, ngày, khung giờ và trạng thái
  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
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
      return true;
    });
  }, [data?.entries, search, dateFilter, slotFilter, statusFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, WaitlistEntryDTO[]>();
    for (const w of filteredEntries) {
      const key = `${w.date}|${w.slot}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [filteredEntries]);

  const hasFilters = search !== "" || dateFilter !== "ALL" || slotFilter !== "ALL" || statusFilter !== "ALL";

  function resetFilters() {
    setSearch("");
    setDateFilter("ALL");
    setSlotFilter("ALL");
    setStatusFilter("ALL");
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

  return (
    <div className="space-y-5">
      {/* FR-13: Thanh tìm kiếm & bộ lọc ngày, khung giờ, trạng thái */}
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

        {/* Thông tin thống kê sau khi lọc */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 pt-2.5 text-xs text-muted-foreground">
          <p>
            Hiển thị <strong className="text-amber-950 font-bold">{filteredEntries.length}</strong> / {data?.entries.length ?? 0} khách chờ
            {groups.length > 0 && ` (${groups.length} khung giờ)`}
          </p>
          <p className="text-[11px]">
            Thứ tự ưu tiên xếp theo số thứ tự đăng ký danh sách chờ.
          </p>
        </div>
      </div>

      {groups.length === 0 && (
        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
            <BellRing className="h-8 w-8 text-[#c2a37a]" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Hiện không có khách nào trong danh sách chờ.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(([key, entries]) => {
          const [dateISO, slot] = key.split("|");
          const weekday = WEEKDAY_FULL_LABELS[weekdayOf(dateISO)];
          return (
            <Card key={key} className="border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-heading text-lg text-[#292524]">
                  <span>
                    {weekday} ·{" "}
                    {formatLongDate(dateISO).split(", ")[1]}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-[#b45309]/40 bg-[#fdf0d5] font-medium text-[#92400e]"
                  >
                    Khung {SLOT_LABELS[slot as WaitlistEntryDTO["slot"]]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {entries
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((w) => (
                      <li
                        key={w.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-[#fffdf9] px-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5efe4] font-heading text-sm font-semibold text-[#92400e]">
                            {w.position}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#292524]">
                              {w.name}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" aria-hidden />
                              {w.phone} · {w.partySize} khách
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
                                className="h-9 min-w-11 rounded-full bg-[#b45309] px-4 text-[#fffbf2] hover:bg-[#92400e]"
                              >
                                <BellRing className="h-3.5 w-3.5" aria-hidden />
                                Mời khách
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
