"use client";

// 3.5 Quản lý waitlist — mời khách theo (ngày, khung), ưu tiên khách đặt trước 2 ngày
// Hỗ trợ thêm khách thủ công, xóa/hủy lượt chờ, tự động làm mới & điều hướng nhanh
import { useEffect, useMemo, useState } from "react";
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
  PlusCircle,
  RefreshCw,
  Trash2,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  addDays,
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

  // Số ngày book trước ngày dùng bữa
  const daysInAdvance = Math.round((mealDate - createdDate) / msDay);
  // Số ngày còn lại tính từ hôm nay tới ngày dùng bữa
  const daysUntilMeal = Math.round((mealDate - todayDate) / msDay);

  const isBooked2DaysAdvance = daysInAdvance >= 2;
  const isWithin2Days = daysUntilMeal >= 0 && daysUntilMeal <= 2;

  // Lượt đăng ký mới trong vòng 24 giờ
  const isNewlyCreated = Date.now() - new Date(w.createdAt).getTime() < 24 * 60 * 60 * 1000;

  return {
    daysInAdvance,
    daysUntilMeal,
    isBooked2DaysAdvance,
    isWithin2Days,
    isNewlyCreated,
  };
}

export function AdminWaitlist({
  onNavigateToBooking,
}: {
  onNavigateToBooking?: () => void;
}) {
  const today = useToday();
  const url = today ? `/api/waitlist?today=${today}` : null;
  const { data, loading, error, refresh } = useJson<WaitlistResponse>(url);
  const [inviting, setInviting] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Tự động làm mới dữ liệu khi người dùng quay lại tab trình duyệt & định kỳ 20 giây
  useEffect(() => {
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(refresh, 20000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [refresh]);

  // Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [slotFilter, setSlotFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "ADVANCE_2_DAYS" | "URGENT_2_DAYS">("ALL");

  // Modal thêm khách thủ công
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPartySize, setNewPartySize] = useState(2);
  const [newDate, setNewDate] = useState("");
  const [newSlot, setNewSlot] = useState<"SLOT_1730" | "SLOT_1945">("SLOT_1945");

  // Khởi tạo ngày mặc định cho modal thêm khách
  useEffect(() => {
    if (today && !newDate) {
      setNewDate(addDays(today, 1));
    }
  }, [today, newDate]);

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

    // Sắp xếp các nhóm theo ngày tăng dần
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEntries]);

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

  async function deleteEntry(entry: WaitlistEntryDTO) {
    if (!confirm(`Xác nhận xóa lượt chờ của khách ${entry.name}?`)) return;
    setDeletingId(entry.id);
    try {
      const res = await fetch(`/api/waitlist/${entry.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không thể xóa lượt chờ.");
        return;
      }
      toast.success(body.message ?? "Đã xóa lượt chờ.");
      refresh();
    } catch {
      toast.error("Lỗi kết nối khi xóa.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim().length < 2) {
      toast.error("Vui lòng nhập họ tên khách.");
      return;
    }
    const cleanPhone = newPhone.replace(/[\s.-]/g, "").trim();
    if (!/^0\d{9}$/.test(cleanPhone)) {
      toast.error("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
      return;
    }
    if (!newDate) {
      toast.error("Vui lòng chọn ngày dùng bữa.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          phone: cleanPhone,
          partySize: newPartySize,
          date: newDate,
          slot: newSlot,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        toast.error(resData.error ?? "Không thể thêm vào danh sách chờ.");
        return;
      }
      toast.success(`Đã thêm ${newName} vào danh sách chờ thành công!`);
      setCreateOpen(false);
      setNewName("");
      setNewPhone("");
      refresh();
    } catch {
      toast.error("Lỗi kết nối khi tạo lượt chờ.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  if (today === null) return <LoadingBlock />;
  if (loading && !data) return <LoadingBlock label="Đang tải danh sách chờ..." />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  // Đếm số lượng khách book trước 2 ngày & khách mới đăng ký
  const t = today || new Date().toISOString().slice(0, 10);
  const totalBooked2DaysCount = (data?.entries ?? []).filter(
    (w) => getWaitlistPriority(w, t).isBooked2DaysAdvance,
  ).length;
  const newCountToday = (data?.entries ?? []).filter(
    (w) => getWaitlistPriority(w, t).isNewlyCreated,
  ).length;

  return (
    <div className="space-y-5">
      {/* Banner phân biệt rõ giữa Waitlist (xếp hàng chờ) và Đặt bàn chính thức */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-[#fffbf2] to-[#fffdf9] p-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#b45309]">
            <BellRing className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#292524]">
              Danh sách chờ tự động (Waitlist)
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {onNavigateToBooking && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToBooking}
              className="h-9 rounded-xl border-amber-300 text-xs font-semibold text-[#92400e] hover:bg-amber-100/60"
            >
              Xem Đặt bàn &amp; Sơ đồ
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

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

          {/* Các nút thao tác & bộ lọc */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Làm mới */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={loading}
              className="h-10 rounded-xl border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50"
              title="Làm mới danh sách chờ ngay lập tức"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin text-[#b45309]")} />
              Làm mới
            </Button>

            {/* Nút Thêm khách chờ thủ công */}
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-10 rounded-xl bg-[#b45309] px-3.5 text-xs font-semibold text-[#fffbf2] shadow-xs hover:bg-[#92400e]"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Thêm khách chờ
            </Button>

            {/* Bộ lọc Ưu tiên */}
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
              <option value="ALL">Tất cả ưu tiên</option>
              <option value="ADVANCE_2_DAYS">⭐ Khách book trước ≥ 2 ngày ({totalBooked2DaysCount})</option>
              <option value="URGENT_2_DAYS">⏳ Dùng bữa trong 2 ngày tới</option>
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

        {/* Thông tin thống kê sau khi lọc */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 pt-2.5 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <p>
              Hiển thị <strong className="text-amber-950 font-bold">{filteredEntries.length}</strong> / {data?.entries.length ?? 0} khách chờ
              {groups.length > 0 && ` (${groups.length} nhóm ngày & khung)`}
            </p>
          </div>
        </div>
      </div>

      {groups.length === 0 && (
        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100/70 text-[#b45309]">
              <BellRing className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-base font-semibold text-stone-800">
                {hasFilters ? "Không có lượt chờ nào khớp với bộ lọc" : "Hiện chưa có khách nào trong danh sách chờ"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Khi thực khách đăng ký chờ trực tuyến hoặc qua hotline khi kín bàn, thông tin sẽ tự động xuất hiện tại đây theo từng nhóm ngày và khung giờ.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="h-9 rounded-xl bg-[#b45309] text-xs font-semibold text-white hover:bg-[#92400e]"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Thêm lượt chờ mới
              </Button>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 rounded-xl text-xs"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hiển thị các thẻ theo Ngày|Khung giờ — grid responsive tự co giãn */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(([key, entries]) => {
          const [dateISO, slot] = key.split("|");
          const weekday = WEEKDAY_FULL_LABELS[weekdayOf(dateISO)];

          // Sắp xếp ưu tiên trong nhóm: Khách book trước 2 ngày xếp lên trên cùng!
          const sortedEntries = entries.slice().sort((a, b) => {
            const prioA = getWaitlistPriority(a, t).isBooked2DaysAdvance ? 1 : 0;
            const prioB = getWaitlistPriority(b, t).isBooked2DaysAdvance ? 1 : 0;
            if (prioA !== prioB) return prioB - prioA;
            return a.position - b.position;
          });

          return (
            <Card key={key} className="border-border/80 bg-card shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50 bg-[#fffdfa] rounded-t-xl">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-heading text-base text-[#292524]">
                  <span>
                    {weekday} · {formatLongDate(dateISO).split(", ")[1]}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="border-[#b45309]/40 bg-[#fdf0d5] font-semibold text-[#92400e] text-xs"
                    >
                      {SLOT_LABELS[slot as WaitlistEntryDTO["slot"]]}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] font-medium text-stone-600 bg-stone-100">
                      {entries.length} khách
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 flex-1">
                <ul className="space-y-2.5">
                  {sortedEntries.map((w) => {
                    const prio = getWaitlistPriority(w, t);
                    return (
                      <li
                        key={w.id}
                        className={cn(
                          "rounded-xl border p-3.5 transition-all space-y-2.5",
                          prio.isNewlyCreated
                            ? "border-emerald-300 bg-emerald-50/25 shadow-xs ring-1 ring-emerald-400/40"
                            : prio.isBooked2DaysAdvance
                              ? "border-amber-300/90 bg-[#fffdf5] shadow-xs"
                              : "border-border/80 bg-[#fffdf9]",
                        )}
                      >
                        {/* Hàng 1: Số thứ tự + Tên khách + Trạng thái & Xóa */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold shadow-2xs",
                                prio.isBooked2DaysAdvance
                                  ? "bg-amber-500 text-white"
                                  : "bg-[#f5efe4] text-[#92400e]",
                              )}
                              title={`Vị trí: #${w.position}`}
                            >
                              #{w.position}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#292524] leading-tight break-words">
                                {w.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {w.status === "INVITED" ? (
                              <Badge className="gap-1 border-emerald-600/40 bg-emerald-100/80 font-medium text-emerald-800 text-[11px] py-0.5 px-2">
                                <MailCheck className="h-3 w-3" aria-hidden />
                                Đã mời
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-border bg-stone-100 font-medium text-stone-600 text-[11px] py-0.5 px-2"
                              >
                                Đang chờ
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === w.id}
                              onClick={() => void deleteEntry(w)}
                              className="h-7 w-7 rounded-full p-0 text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Xóa lượt chờ này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Hàng 2: Badges ưu tiên (Mới đăng ký, Book trước X ngày...) */}
                        {(prio.isNewlyCreated || prio.isBooked2DaysAdvance || prio.isWithin2Days) && (
                          <div className="flex flex-wrap items-center gap-1.5 pl-0.5">
                            {prio.isNewlyCreated && (
                              <Badge className="bg-emerald-600 text-white text-[10px] font-bold py-0.5 px-2">
                                Mới đăng ký
                              </Badge>
                            )}
                            {prio.isBooked2DaysAdvance && (
                              <Badge className="gap-1 bg-amber-500/15 text-amber-900 border-amber-300 text-[10px] font-bold py-0.5 px-2">
                                <Sparkles className="h-2.5 w-2.5 text-[#b45309]" />
                                Book trước {prio.daysInAdvance} ngày
                              </Badge>
                            )}
                            {prio.isWithin2Days && (
                              <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800 text-[10px] py-0.5 px-2">
                                Cận ngày ({prio.daysUntilMeal === 0 ? "Hôm nay" : `${prio.daysUntilMeal} ngày tới`})
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Hàng 3: SĐT, Khách, Ngày tạo + Nút Mời / Ưu tiên mời */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/60">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-stone-600">
                            <span className="flex items-center gap-1 font-medium text-stone-700">
                              <Phone className="h-3 w-3 text-stone-400" />
                              {w.phone}
                            </span>
                            <span>·</span>
                            <span className="font-semibold text-amber-900">{w.partySize} khách</span>
                            <span>·</span>
                            <span className="text-[11px] text-stone-400">
                              {formatShortDate(w.createdAt.slice(0, 10))}
                            </span>
                          </div>

                          {w.status !== "INVITED" && (
                            <Button
                              size="sm"
                              onClick={() => void invite(w)}
                              disabled={inviting === w.id}
                              className={cn(
                                "h-7.5 rounded-full px-3 text-xs text-[#fffbf2] shadow-2xs font-semibold shrink-0",
                                prio.isBooked2DaysAdvance
                                  ? "bg-amber-600 hover:bg-amber-700"
                                  : "bg-[#b45309] hover:bg-[#92400e]",
                              )}
                            >
                              <BellRing className="h-3 w-3 mr-1" aria-hidden />
                              {prio.isBooked2DaysAdvance ? "Ưu tiên mời" : "Mời"}
                            </Button>
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

      {/* Modal thêm khách vào danh sách chờ thủ công */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-[#292524] flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-[#b45309]" />
              Thêm khách vào danh sách chờ
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nhập thông tin khách yêu cầu xếp hàng chờ khi nhà hàng kín bàn hoặc khách liên hệ hotline/Zalo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWaitlist} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="create-wl-name" className="text-xs font-semibold">
                Họ và tên khách <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="create-wl-name"
                placeholder="vd: Nguyễn Minh Anh"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-wl-phone" className="text-xs font-semibold">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="create-wl-phone"
                placeholder="09xxxxxxxx"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-wl-date" className="text-xs font-semibold">
                  Ngày dùng bữa <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="create-wl-date"
                  type="date"
                  min={today || undefined}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Khung giờ <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value as typeof newSlot)}
                  className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-800"
                >
                  <option value="SLOT_1730">Khung 17:30 - 19:30</option>
                  <option value="SLOT_1945">Khung 19:45 - 21:45</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Số lượng khách</Label>
              <div className="flex items-center gap-3">
                <select
                  value={newPartySize}
                  onChange={(e) => setNewPartySize(Number(e.target.value))}
                  className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-800 w-32"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} khách
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  (Bàn tiêu chuẩn từ 2 đến 8 khách)
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="h-10 rounded-xl text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createSubmitting}
                className="h-10 rounded-xl bg-[#b45309] px-5 text-xs font-semibold text-white hover:bg-[#92400e]"
              >
                {createSubmitting ? "Đang lưu..." : "Xác nhận thêm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
