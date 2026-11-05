"use client";

// 3.3 Danh sách đặt bàn theo ngày — filter khung giờ + trạng thái, dialog chi tiết
import { useMemo, useState } from "react";
import { Clock, Eye, LogIn, Star, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AllergyBadge,
  DayStrip,
  ErrorBlock,
  LoadingBlock,
  StatusBadge,
  useJson,
} from "./admin-shared";
import { formatCheckinTime, formatLongDate, formatVND, relativeDayLabel } from "@/lib/tram/format";
import { parseReservationDishes } from "@/lib/tram/dishes";
import {
  PAIRING_LABELS,
  SLOT_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "@/lib/tram/constants";
import type { ReservationDTO } from "@/lib/tram/types";
import {
  CheckinRewardDialog,
  type CheckinLoyaltyReward,
} from "./checkin-reward-dialog";
import { SurveyDialog } from "../survey/survey-dialog";

interface ListResponse {
  date: string;
  reservations: ReservationDTO[];
}

const STATUS_OPTIONS = [
  "ALL",
  "CONFIRMED",
  "PENDING",
  "SEATED",
  "NO_SHOW",
  "CANCELLED",
] as const;

interface ReservationsListProps {
  today: string;
}

export function AdminReservationsList({ today }: ReservationsListProps) {
  const [date, setDate] = useState(today);
  const [slotFilter, setSlotFilter] = useState<"ALL" | "SLOT_1730" | "SLOT_1945">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [detail, setDetail] = useState<ReservationDTO | null>(null);
  const [surveyTarget, setSurveyTarget] = useState<ReservationDTO | null>(null);
  const [rewardData, setRewardData] = useState<CheckinLoyaltyReward | null>(null);
  const [acting, setActing] = useState(false);

  const { data, loading, error, refresh } = useJson<ListResponse>(
    `/api/reservations?date=${date}`,
  );

  async function handleCheckin(id: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không thể check-in.");
        return;
      }
      toast.success(body.message ?? "Check-in thành công.");
      if (body.loyalty) {
        setRewardData(body.loyalty);
      }
      if (detail && detail.id === id) {
        setDetail(body.reservation);
      }
      refresh();
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setActing(false);
    }
  }

  const filtered = useMemo(() => {
    const list = data?.reservations ?? [];
    return list.filter(
      (r) =>
        (slotFilter === "ALL" || r.slot === slotFilter) &&
        (statusFilter === "ALL" || r.status === statusFilter),
    );
  }, [data, slotFilter, statusFilter]);

  const seatsCount = (data?.reservations ?? [])
    .filter((r) => r.status !== "CANCELLED")
    .reduce((s, r) => s + r.partySize, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <DayStrip today={today} selected={date} onSelect={setDate} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Select
            value={slotFilter}
            onValueChange={(v) => setSlotFilter(v as typeof slotFilter)}
          >
            <SelectTrigger className="h-11 w-36 rounded-full bg-card text-sm">
              <SelectValue placeholder="Khung giờ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Cả hai khung</SelectItem>
              <SelectItem value="SLOT_1730">Khung 17:30</SelectItem>
              <SelectItem value="SLOT_1945">Khung 19:45</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-44 rounded-full bg-card text-sm">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {STATUS_OPTIONS.slice(1).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tóm tắt nhanh */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-border bg-[#fffdf9] px-4 py-3 text-sm">
        <p className="font-medium text-[#92400e]">{formatLongDate(date)}</p>
        <p className="text-muted-foreground">
          <span className="font-semibold text-[#292524]">
            {data?.reservations.length ?? 0}
          </span>{" "}
          lượt đặt
        </p>
        <p className="text-muted-foreground">
          <span className="font-semibold text-[#292524]">{seatsCount}</span> chỗ
          hiệu lực / 84
        </p>
        <p className="text-muted-foreground">
          Hiển thị <span className="font-semibold text-[#292524]">{filtered.length}</span> dòng
        </p>
      </div>

      {loading && !data ? (
        <LoadingBlock label="Đang tải danh sách đặt bàn..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (
        <div className="tram-scroll overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-[#f5efe4] hover:bg-[#f5efe4]">
                <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Mã
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Khung
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Khách
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  SĐT
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Số khách
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Bàn
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Pairing
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Nguồn
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Trạng thái
                </TableHead>
                <TableHead className="pr-4 text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Ghi chú
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Không có lượt đặt nào khớp bộ lọc ở ngày này.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer border-border/70 hover:bg-[#fdf0d5]/40"
                  onClick={() => setDetail(r)}
                >
                  <TableCell className="pl-4 font-mono text-[13px] font-semibold text-[#92400e]">
                    {r.code}
                  </TableCell>
                  <TableCell className="font-medium text-[#292524]">
                    {SLOT_LABELS[r.slot]}
                  </TableCell>
                  <TableCell className="font-medium text-[#292524]">
                    {r.customerName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.phone}</TableCell>
                  <TableCell>{r.partySize}</TableCell>
                  <TableCell className="font-medium text-[#292524]">
                    {r.table.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.pairing === "NONE"
                      ? "—"
                      : r.pairing === "WINE"
                        ? "Wine"
                        : "Tea"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-border bg-[#f5efe4] text-[11px] font-medium text-stone-600"
                    >
                      {SOURCE_LABELS[r.source]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={r.status} />
                      {r.survey && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {r.survey.rating}/5 
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.allergy && <AllergyBadge allergy={r.allergy} />}
                      {r.notes && (
                        <span className="max-w-40 truncate text-xs text-muted-foreground">
                          {r.notes}
                        </span>
                      )}
                      {(r.status === "CONFIRMED" || r.status === "PENDING") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7.5 gap-1 rounded-full border-emerald-600/40 bg-emerald-50 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCheckin(r.id);
                          }}
                          disabled={acting}
                        >
                          <LogIn className="h-3 w-3" />
                          Check-in
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-[#b45309] hover:bg-[#fdf0d5]"
                        aria-label={`Xem chi tiết đặt bàn ${r.code}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetail(r);
                        }}
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog chi tiết */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-md border-border bg-card">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading text-xl text-[#292524]">
                  Đặt bàn {detail.code}
                </DialogTitle>
                <DialogDescription>
                  {formatLongDate(detail.date)} · khung{" "}
                  {SLOT_LABELS[detail.slot]} · bàn {detail.table.code}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 text-sm">
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Khách</span>
                  <span className="font-medium text-[#292524]">
                    {detail.customerName}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Liên hệ</span>
                  <span className="text-[#292524]">
                    {detail.phone}
                    {detail.email ? ` · ${detail.email}` : ""}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Số khách</span>
                  <span className="text-[#292524]">{detail.partySize}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Bàn</span>
                  <span className="text-[#292524]">
                    {detail.table.code} · {detail.table.seats} chỗ ·{" "}
                    {detail.table.zone}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Pairing</span>
                  <span className="text-[#292524]">
                    {PAIRING_LABELS[detail.pairing]}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Nguồn</span>
                  <span className="text-[#292524]">
                    {SOURCE_LABELS[detail.source]}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Đặt cọc</span>
                  <span className="text-[#292524] font-medium">
                    {detail.depositAmount === 0 ? (
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        0 đ (Miễn cọc Nam Trầm)
                      </span>
                    ) : (
                      formatVND(detail.depositAmount)
                    )}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <StatusBadge status={detail.status} />
                </p>

                {/* Ngày giờ check-in nếu đã đến */}
                {detail.status === "SEATED" && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-xs text-emerald-900 font-medium">
                    <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Đã Check-in vào bàn lúc: <strong>{formatCheckinTime(detail)}</strong></span>
                  </div>
                )}

                <Separator className="my-2 bg-border" />
                {detail.allergy && (
                  <p className="pb-1">
                    <AllergyBadge allergy={detail.allergy} />
                  </p>
                )}
                {detail.notes && (
                  <p className="whitespace-pre-wrap rounded-md bg-muted/60 p-2.5 text-xs leading-relaxed text-stone-600">
                    {detail.notes}
                  </p>
                )}

                {/* Thực đơn 7 món Tasting Menu */}
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-2.5 text-xs space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#92400e] flex items-center gap-1.5 uppercase text-[10px] tracking-wide">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-[#b45309]" />
                      Thực đơn bữa tiệc (7 món Tasting Menu)
                    </span>
                    <Badge variant="outline" className="text-[10px] border-amber-300 bg-white text-amber-900">
                      {PAIRING_LABELS[detail.pairing]}
                    </Badge>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {parseReservationDishes(detail.selectedDishes).map((dish) => (
                      <div key={dish.index} className="flex items-center justify-between gap-1.5 rounded-md bg-white/90 px-2 py-1 border border-stone-200/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#b45309] text-[9px] font-bold text-white">
                            {dish.index}
                          </span>
                          <span className="font-medium text-stone-900 text-[11px] truncate">
                            {dish.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 shrink-0 italic">
                          {dish.optionName || dish.region}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="pt-1 text-[11px] text-muted-foreground">
                  Tạo lúc {new Date(detail.createdAt).toLocaleString("vi-VN")} ·
                  Ngày đến: {relativeDayLabel(detail.date, today)}
                </p>

                {(detail.status === "CONFIRMED" || detail.status === "PENDING") && (
                  <Button
                    onClick={() => void handleCheckin(detail.id)}
                    disabled={acting}
                    className="w-full mt-3 h-11 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 font-semibold shadow-xs"
                  >
                    <LogIn className="mr-1.5 h-4 w-4" />
                    Check-in & Tích Điểm Thưởng
                  </Button>
                )}

                {detail.status === "SEATED" && (
                  <Button
                    onClick={() => {
                      const res = detail;
                      setDetail(null);
                      setSurveyTarget(res);
                    }}
                    className="w-full mt-3 h-11 rounded-full border border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:from-amber-600 hover:to-amber-700 shadow-xs"
                  >
                    <Star className="mr-1.5 h-4 w-4 fill-white text-white" />
                    {detail.survey ? `Xem đánh giá 5 sao (${detail.survey.rating}/5 )` : "Khảo sát sau bữa ăn"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* FR-20: Pop-up chúc mừng tích điểm và thăng hạng khi Check-in */}
      <CheckinRewardDialog
        reward={rewardData}
        open={rewardData !== null}
        onClose={() => setRewardData(null)}
      />

      {/* FR-23: Pop-up Khảo sát sau bữa ăn */}
      <SurveyDialog
        reservation={surveyTarget}
        open={surveyTarget !== null}
        onClose={() => setSurveyTarget(null)}
        onSubmitted={() => {
          setSurveyTarget(null);
          refresh();
        }}
      />
    </div>
  );
}
