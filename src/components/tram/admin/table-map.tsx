"use client";

// 3.2 Sơ đồ bàn — chọn ngày + khung, 12 bàn màu theo trạng thái,
// click để xem chi tiết và check-in / đánh dấu không đến
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  DoorOpen,
  LogIn,
  UserX,
  UtensilsCrossed,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DayStrip, LoadingBlock, SlotToggle, StatusBadge, useJson } from "./admin-shared";
import { formatLongDate, formatVND } from "@/lib/tram/format";
import { PAIRING_LABELS } from "@/lib/tram/constants";
import type { AvailabilityResponse, ReservationDTO, Slot, TableAvailability } from "@/lib/tram/types";
import {
  CheckinRewardDialog,
  type CheckinLoyaltyReward,
} from "./checkin-reward-dialog";
import { SurveyDialog } from "../survey/survey-dialog";
import { TableCourseTracker } from "./table-course-tracker";

type AvailResp = AvailabilityResponse & { closed: boolean };

const ZONES = [
  { name: "Khu cửa sổ", hint: "bàn 2 chỗ" },
  { name: "Khu trung tâm", hint: "bàn 4 chỗ" },
  { name: "Phòng riêng Trầm Hương", hint: "bàn 6 chỗ" },
];

function tableState(t: TableAvailability): "EMPTY" | "BOOKED" | "SEATED" | "COMPLETED" | "NO_SHOW" {
  if (!t.reservation) return "EMPTY";
  const s = t.reservation.status;
  if (s === "SEATED") return "SEATED";
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "NO_SHOW") return "NO_SHOW";
  return "BOOKED"; // PENDING / CONFIRMED
}

const STATE_STYLES: Record<string, { box: string; label: string }> = {
  EMPTY: {
    box: "border-dashed border-stone-300 bg-[#fffdf9] text-stone-500 hover:border-[#b45309]/60",
    label: "Trống",
  },
  BOOKED: {
    box: "border-[#b45309] bg-[#fdf0d5] text-[#92400e] hover:brightness-[0.98]",
    label: "Đã đặt",
  },
  SEATED: {
    box: "border-emerald-600 bg-emerald-100 text-emerald-800 hover:brightness-[0.98]",
    label: "Đang phục vụ",
  },
  COMPLETED: {
    box: "border-sky-500 bg-sky-100 text-sky-800 hover:brightness-[0.98]",
    label: "Đã hoàn tất",
  },
  NO_SHOW: {
    box: "border-rose-500 bg-rose-100 text-rose-700 hover:brightness-[0.98]",
    label: "Không đến",
  },
};

interface TableMapProps {
  today: string;
}

export function AdminTableMap({ today }: TableMapProps) {
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<Slot>("SLOT_1945");
  const [selected, setSelected] = useState<TableAvailability | null>(null);
  const [confirmNoShow, setConfirmNoShow] = useState(false);
  const [acting, setActing] = useState(false);
  const [rewardData, setRewardData] = useState<CheckinLoyaltyReward | null>(null);
  const [surveyTarget, setSurveyTarget] = useState<ReservationDTO | null>(null);

  const { data, loading, refresh } = useJson<AvailResp>(
    `/api/availability?date=${date}&slot=${slot}&partySize=2`,
  );

  const tables = useMemo(() => data?.tables ?? null, [data]);
  const selectedReservation: ReservationDTO | null =
    selected?.reservation ?? null;

  async function doAction(action: "checkin" | "noshow") {
    if (!selectedReservation) return;
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${selectedReservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không cập nhật được trạng thái.");
        return;
      }
      toast.success(body.message ?? "Đã cập nhật trạng thái.");
      if (action === "checkin" && body.loyalty) {
        setRewardData(body.loyalty);
      }
      setConfirmNoShow(false);
      setSelected(null);
      refresh();
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <DayStrip today={today} selected={date} onSelect={setDate} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SlotToggle value={slot} onChange={setSlot} />
          <p className="text-sm font-medium text-[#92400e]">
            {formatLongDate(date)} · {slot === "SLOT_1730" ? "17:30" : "19:45"}
          </p>
        </div>
      </div>

      {/* Mặt bằng */}
      <div className="rounded-2xl border border-border bg-[#fffdf9] p-3 shadow-sm sm:p-5">
        {/* Quầy bếp */}
        <div className="mb-4 flex h-10 items-center justify-center gap-2 rounded-lg border border-[#b45309]/25 bg-[#f5efe4] text-xs font-medium uppercase tracking-[0.2em] text-[#92400e]">
          <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
          Bếp · khu phục vụ
        </div>

        {loading && !tables ? (
          <LoadingBlock label="Đang tải sơ đồ bàn..." />
        ) : tables ? (
          <div className="space-y-5">
            {ZONES.map((zone) => {
              const zoneTables = tables.filter(
                (t) => t.table.zone === zone.name,
              );
              if (zoneTables.length === 0) return null;
              return (
                <div key={zone.name}>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {zone.name}{" "}
                    <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                      · {zone.hint}
                    </span>
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {zoneTables.map((t) => {
                      const state = tableState(t);
                      const style = STATE_STYLES[state];
                      return (
                        <button
                          key={t.table.id}
                          type="button"
                          onClick={() => setSelected(t)}
                          aria-label={`Bàn ${t.table.code} — ${style.label}`}
                          className={cn(
                            "flex h-[78px] flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all",
                            style.box,
                          )}
                        >
                          <span className="font-heading text-base font-semibold">
                            {t.table.code}
                          </span>
                          <span className="text-[11px] opacity-80">
                            {t.table.seats} chỗ
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wide">
                            {style.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Lối vào + chú giải */}
        <div className="mt-4 flex h-9 items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 text-xs font-medium uppercase tracking-[0.2em] text-stone-400">
          <DoorOpen className="h-3.5 w-3.5" aria-hidden />
          Lối vào · lễ tân
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {(["EMPTY", "BOOKED", "SEATED", "NO_SHOW"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded border-2",
                  s === "EMPTY" && "border-dashed border-stone-300 bg-[#fffdf9]",
                  s === "BOOKED" && "border-[#b45309] bg-[#fdf0d5]",
                  s === "SEATED" && "border-emerald-600 bg-emerald-100",
                  s === "NO_SHOW" && "border-rose-500 bg-rose-100",
                )}
              />
              {STATE_STYLES[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* Dialog chi tiết bàn */}
      <Dialog
        open={selected !== null}
        onOpenChange={(v) => !v && setSelected(null)}
      >
        <DialogContent className="max-w-md border-border bg-card">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 font-heading text-xl text-[#292524]">
                  Bàn {selected.table.code}
                  <span className="text-sm font-normal text-muted-foreground">
                    {selected.table.seats} chỗ · {selected.table.zone}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {formatLongDate(date)} ·{" "}
                  {slot === "SLOT_1730" ? "17:30" : "19:45"}
                </DialogDescription>
              </DialogHeader>

              {selectedReservation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-[#292524]">
                        {selectedReservation.customerName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedReservation.phone} ·{" "}
                        {selectedReservation.partySize} khách
                      </p>
                    </div>
                    <StatusBadge status={selectedReservation.status} />
                  </div>
                  <Separator className="bg-border" />
                  <div className="space-y-1.5 text-sm">
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Mã đặt bàn</span>
                      <span className="font-medium text-[#292524]">
                        {selectedReservation.code}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Pairing</span>
                      <span className="text-[#292524]">
                        {PAIRING_LABELS[selectedReservation.pairing]}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Đặt cọc</span>
                      <span className="text-[#292524] font-medium">
                        {selectedReservation.depositAmount === 0 ? (
                          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            0 đ (Miễn cọc Nam Trầm)
                          </span>
                        ) : (
                          formatVND(selectedReservation.depositAmount)
                        )}
                      </span>
                    </p>
                    {selectedReservation.notes && (
                      <p className="flex justify-between gap-2">
                        <span className="shrink-0 text-muted-foreground">Ghi chú</span>
                        <span className="max-w-[60%] text-right text-[#292524]">
                          {selectedReservation.notes}
                        </span>
                      </p>
                    )}
                    {selectedReservation.allergy && (
                      <p className="rounded-md border border-[#b3261e]/40 bg-[#b3261e]/10 px-2 py-1 text-xs font-medium text-[#b3261e]">
                        Dị ứng: {selectedReservation.allergy}
                      </p>
                    )}
                  </div>

                  {(selectedReservation.status === "CONFIRMED" ||
                    selectedReservation.status === "PENDING") && (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          onClick={() => void doAction("checkin")}
                          disabled={acting}
                          className="h-11 flex-1 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 font-bold"
                        >
                          <LogIn className="mr-1.5 h-4 w-4" aria-hidden />
                          Khách đã đến &amp; Check-in
                        </Button>
                        <Button
                          onClick={() => setConfirmNoShow(true)}
                          disabled={acting}
                          variant="outline"
                          className="h-11 flex-1 rounded-full border-[#b3261e]/50 text-[#b3261e] hover:bg-[#b3261e]/10 hover:text-[#b3261e]"
                        >
                          <UserX className="mr-1.5 h-4 w-4" aria-hidden />
                          Đánh dấu không đến
                        </Button>
                      </div>

                      <TableCourseTracker
                        reservation={selectedReservation}
                        onUpdate={() => void loadData()}
                        acting={acting}
                        setActing={setActing}
                        onCheckin={() => void doAction("checkin")}
                      />
                    </div>
                  )}

                  {selectedReservation.status === "SEATED" && (
                    <div className="space-y-3 pt-2">
                      <TableCourseTracker
                        reservation={selectedReservation}
                        onUpdate={() => void loadData()}
                        acting={acting}
                        setActing={setActing}
                        onCheckoutSuccess={() => {
                          setSelected(null);
                          void loadData();
                        }}
                      />

                      <Button
                        onClick={() => {
                          const res = selectedReservation;
                          setSelected(null);
                          setSurveyTarget(res);
                        }}
                        variant="outline"
                        className="w-full h-9 rounded-full border border-amber-300 text-amber-900 bg-amber-50/50 text-xs font-semibold hover:bg-amber-100/70"
                      >
                        <Star className="mr-1.5 h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {selectedReservation.survey
                          ? `Đã có đánh giá: ${selectedReservation.survey.rating}/5 sao`
                          : "Gửi khảo sát đánh giá"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 py-2 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f5efe4] text-stone-400">
                    <CheckCircle2 className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="text-sm text-stone-600">
                    Bàn đang trống khung này — nhận đặt{" "}
                    <span className="font-medium text-[#92400e]">walk-in</span>{" "}
                    hoặc gọi khách từ danh sách chờ.
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Xác nhận no-show */}
      <AlertDialog open={confirmNoShow} onOpenChange={setConfirmNoShow}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg text-[#292524]">
              Đánh dấu khách không đến?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              Đặt bàn {selectedReservation?.code} của{" "}
              {selectedReservation?.customerName} sẽ chuyển sang trạng thái
              “Không đến”.{" "}
              <span className="font-medium text-[#b3261e]">
                Cọc sẽ không hoàn lại theo chính sách.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row">
            <AlertDialogCancel className="h-11 rounded-full">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void doAction("noshow")}
              className="h-11 rounded-full bg-[#b3261e] text-white hover:bg-[#99231c]"
            >
              Xác nhận không đến
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          void refresh();
        }}
      />
    </div>
  );
}
