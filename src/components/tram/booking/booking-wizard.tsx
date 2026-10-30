"use client";

// Wizard đặt bàn 5 bước — TRẦM Reserve
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  CircleAlert,
  CreditCard,
  Loader2,
  Mail,
  Minus,
  Plus,
  ShieldCheck,
  Users,
  Wallet,
  Wine,
  Coffee,
  Ban,
  Gem,
  Crown,
  Award,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  PRICES,
  SLOT_TIMES,
  PAIRING_LABELS,
} from "@/lib/tram/constants";
import {
  addDays,
  formatLongDate,
  formatVND,
  todayLocalISO,
  WEEKDAY_LABELS,
  weekdayOf,
} from "@/lib/tram/format";
import type {
  AvailabilityResponse,
  Pairing,
  ReservationDTO,
  Slot,
  SlotSummary,
  TableAvailability,
} from "@/lib/tram/types";
import { WaitlistPanel } from "./waitlist-panel";
import { CompletionView } from "./completion-view";

type AvailResp = AvailabilityResponse & { closed: boolean };

const STEP_LABELS = [
  "Ngày & giờ",
  "Chọn bàn",
  "Thông tin",
  "Xác nhận & cọc",
  "Hoàn tất",
];

// ---------- Step indicator ----------
function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="tram-scroll mb-8 flex items-center gap-1 overflow-x-auto pb-1 sm:justify-center">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className="flex shrink-0 items-center gap-1">
            {n > 1 && (
              <span
                className={cn(
                  "h-px w-4 sm:w-8",
                  done ? "bg-[#b45309]" : "bg-border",
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
                current
                  ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-sm"
                  : done
                    ? "border-[#b45309]/40 bg-[#fdf0d5] text-[#92400e]"
                    : "border-border bg-card text-muted-foreground",
              )}
              aria-current={current ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  current
                    ? "bg-[#fffbf2]/25"
                    : done
                      ? "bg-[#b45309] text-[#fffbf2]"
                      : "bg-muted",
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden /> : n}
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Bước 1: dải ngày cuộn ngang 4 tuần ----------
function DateStrip({
  today,
  selected,
  onSelect,
}: {
  today: string;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const weeks = useMemo(() => {
    // Chủ nhật của tuần hiện tại
    const firstSunday = addDays(today, -weekdayOf(today));
    return [0, 1, 2, 3].map((w) => {
      const start = addDays(firstSunday, w * 7);
      return {
        label:
          w === 0 ? "Tuần này" : w === 1 ? "Tuần sau" : `Tuần ${w + 1}`,
        days: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
      };
    });
  }, [today]);

  return (
    <div className="tram-scroll -mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex gap-4">
        {weeks.map((week) => (
          <div key={week.label} className="shrink-0">
            <p className="mb-1.5 pl-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {week.label}
            </p>
            <div className="flex gap-1.5">
              {week.days.map((iso) => {
                const wd = weekdayOf(iso);
                const isMonday = wd === 1;
                const isPast = iso < today;
                const disabled = isMonday || isPast;
                const isSelected = selected === iso;
                const dayNum = Number(iso.slice(8, 10));
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(iso)}
                    aria-label={`${formatLongDate(iso)}${isMonday ? " — nghỉ" : ""}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-[72px] w-[46px] flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-all sm:w-[52px]",
                      disabled
                        ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground/50"
                        : isSelected
                          ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-md shadow-[#b45309]/25"
                          : "border-border bg-card text-stone-600 hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/60",
                    )}
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide">
                      {WEEKDAY_LABELS[wd]}
                    </span>
                    <span className="font-heading text-lg font-semibold leading-none">
                      {dayNum}
                    </span>
                    <span className="text-[9px] leading-none">
                      {isMonday ? "Nghỉ" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Bước 2: sơ đồ bàn ----------
function TableGrid({
  tables,
  selectedTableId,
  onSelect,
}: {
  tables: TableAvailability[];
  selectedTableId: string | null;
  onSelect: (t: TableAvailability) => void;
}) {
  const zones = [
    { name: "Khu cửa sổ", hint: "Bàn 2 chỗ — tầm nhìn ra khu vườn" },
    { name: "Khu trung tâm", hint: "Bàn 4 chỗ — giữa phòng" },
    { name: "Khu sân sau", hint: "Bàn 6 chỗ — không gian riêng" },
  ];
  return (
    <div className="space-y-5">
      {zones.map((zone) => {
        const zoneTables = tables.filter((t) => t.table.zone === zone.name);
        if (zoneTables.length === 0) return null;
        return (
          <div key={zone.name}>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {zone.name}
              <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/70">
                {zone.hint}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {zoneTables.map((t) => {
                const isSelected = selectedTableId === t.table.id;
                const statusLabel = t.available
                  ? "Trống"
                  : t.reason === "BOOKED"
                    ? "Đã đặt"
                    : "Không đủ chỗ";
                return (
                  <button
                    key={t.table.id}
                    type="button"
                    disabled={!t.available}
                    onClick={() => onSelect(t)}
                    aria-label={`Bàn ${t.table.code}, ${t.table.seats} chỗ, ${statusLabel}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-[76px] flex-col items-center justify-center gap-1 rounded-xl border transition-all",
                      t.available
                        ? isSelected
                          ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-md shadow-[#b45309]/25"
                          : "border-[#b45309]/45 bg-[#fffdf9] text-stone-700 hover:-translate-y-0.5 hover:border-[#b45309] hover:bg-[#fdf0d5] hover:shadow"
                        : "cursor-not-allowed border-border/60 bg-muted/50 text-muted-foreground/60",
                    )}
                  >
                    <span className="font-heading text-base font-semibold">
                      {t.table.code}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Users className="h-3 w-3" aria-hidden />
                      {t.table.seats} chỗ
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[10px]",
                        t.reason === "BOOKED" && "text-[#b3261e]/70",
                      )}
                    >
                      {!t.available && (
                        <Ban className="h-2.5 w-2.5" aria-hidden />
                      )}
                      {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-[#b45309]/45 bg-[#fffdf9]" />
          Trống — chọn được
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-border/60 bg-muted/50" />
          Đã đặt / không đủ chỗ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#b45309]" />
          Đang chọn
        </span>
      </div>
    </div>
  );
}

// ---------- Dialog thanh toán mô phỏng ----------
type PayPhase = "method" | "processing" | "success";

function PaymentDialog({
  open,
  phase,
  amount,
  onClose,
  onSelectMethod,
  onDone,
}: {
  open: boolean;
  phase: PayPhase;
  amount: number;
  onClose: () => void;
  onSelectMethod: (method: string) => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && phase !== "processing" && onClose()}>
      <DialogContent className="max-w-sm border-border bg-card">
        {phase === "method" && (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="font-heading text-xl text-[#292524]">
                Thanh toán đặt cọc
              </DialogTitle>
              <DialogDescription className="text-base">
                <span className="font-heading text-2xl font-semibold text-[#b45309]">
                  {formatVND(amount)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => onSelectMethod("Thẻ ngân hàng")}
                className="flex h-16 w-full items-center gap-3 rounded-xl border border-border bg-[#fffdf9] px-4 text-left transition-all hover:border-[#b45309] hover:bg-[#fdf0d5]/60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                  <CreditCard className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-[#292524]">
                    Thẻ ngân hàng
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Visa · Mastercard · JCB
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMethod("Ví điện tử")}
                className="flex h-16 w-full items-center gap-3 rounded-xl border border-border bg-[#fffdf9] px-4 text-left transition-all hover:border-[#b45309] hover:bg-[#fdf0d5]/60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                  <Wallet className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-[#292524]">
                    Ví điện tử
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    QR một lần chạm
                  </span>
                </span>
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Cổng thanh toán mô phỏng phục vụ demo
            </p>
          </>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2
              className="h-12 w-12 animate-spin text-[#b45309]"
              aria-hidden
            />
            <p className="font-medium text-stone-700">Đang xử lý giao dịch...</p>
            <p className="text-xs text-muted-foreground">
              Vui lòng không đóng cửa sổ này
            </p>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
              <Check className="h-8 w-8" aria-hidden />
            </span>
            <p className="font-heading text-xl font-semibold text-[#292524]">
              Thanh toán thành công
            </p>
            <p className="text-sm text-muted-foreground">
              Đã nhận cọc {formatVND(amount)}
            </p>
            <Button
              onClick={onDone}
              className="mt-2 h-11 min-w-40 rounded-full bg-[#b45309] text-[#fffbf2] hover:bg-[#92400e]"
            >
              Xác nhận đặt bàn
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Wizard chính ----------
interface BookingWizardProps {
  onGoHome: () => void;
}

export function BookingWizard({ onGoHome }: BookingWizardProps) {
  const [today, setToday] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [partySize, setPartySize] = useState(2);

  const [slotsSummary, setSlotsSummary] = useState<SlotSummary[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [tables, setTables] = useState<TableAvailability[] | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [waitlistMode, setWaitlistMode] = useState(false);

  const [tableId, setTableId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pairing, setPairing] = useState<Pairing>("NONE");
  const [notes, setNotes] = useState("");
  const [allergySeafood, setAllergySeafood] = useState(false);
  const [birthday, setBirthday] = useState(false);
  const [anniversary, setAnniversary] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payPhase, setPayPhase] = useState<PayPhase>("method");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ReservationDTO | null>(null);

  // FR-22: Tra cứu hạng hội viên theo SĐT để áp dụng miễn cọc Nam Trầm
  const [loyaltyProfile, setLoyaltyProfile] = useState<{
    found: boolean;
    name: string;
    visits: number;
    tier: "HUONG" | "TRAM" | "NAM_TRAM";
    points: number;
    depositExempt: boolean;
  } | null>(null);
  const [checkingLoyalty, setCheckingLoyalty] = useState(false);

  const checkLoyaltyByPhone = useCallback(async (phoneNum: string) => {
    const clean = phoneNum.trim();
    if (!/^0\d{9}$/.test(clean)) {
      setLoyaltyProfile(null);
      return;
    }
    setCheckingLoyalty(true);
    try {
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          setLoyaltyProfile({
            found: true,
            name: data.customer.name,
            visits: data.customer.visits,
            tier: data.customer.tier,
            points: data.customer.points,
            depositExempt: data.customer.tier === "NAM_TRAM",
          });
          setName((prev) => (prev.trim() ? prev : data.customer.name));
        } else {
          setLoyaltyProfile(null);
        }
      }
    } catch (e) {
      console.error("Lookup error", e);
    } finally {
      setCheckingLoyalty(false);
    }
  }, []);

  const isNamTram = loyaltyProfile?.tier === "NAM_TRAM";

  useEffect(() => {
    setToday(todayLocalISO());
  }, []);

  // Tải chỗ còn trống khi đổi ngày
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoadingSlots(true);
    fetch(`/api/availability?date=${date}`)
      .then((r) => r.json())
      .then((data: AvailResp) => {
        if (cancelled) return;
        setSlotsSummary(data.slots ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Không tải được chỗ còn trống.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Chuyển sang bước 2: tải trạng thái 12 bàn
  const goStep2 = useCallback(async () => {
    if (!date || !slot) return;
    setLoadingTables(true);
    setStep(2);
    try {
      const res = await fetch(
        `/api/availability?date=${date}&slot=${slot}&partySize=${partySize}`,
      );
      const data: AvailResp = await res.json();
      const list = data.tables ?? [];
      setTables(list);
      setWaitlistMode(!list.some((t) => t.available));
      setTableId(null);
    } catch {
      toast.error("Không tải được sơ đồ bàn.");
    } finally {
      setLoadingTables(false);
    }
  }, [date, slot, partySize]);

  const selectedTable = useMemo(
    () => tables?.find((t) => t.table.id === tableId) ?? null,
    [tables, tableId],
  );

  const pairingPrice =
    pairing === "WINE"
      ? PRICES.winePairing
      : pairing === "TEA"
        ? PRICES.teaPairing
        : 0;
  const totalAmount = partySize * (PRICES.menu + pairingPrice);
  const depositAmount = partySize * PRICES.deposit;

  const finalNotes = useMemo(() => {
    const extra: string[] = [];
    if (birthday) extra.push("Đặt bàn sinh nhật");
    if (anniversary) extra.push("Kỷ niệm");
    return [extra.join(" · "), notes.trim()].filter(Boolean).join("\n") || null;
  }, [birthday, anniversary, notes]);

  const finalAllergy = allergySeafood ? "Hải sản" : null;

  function validateStep1(): boolean {
    if (!date) {
      toast.error("Vui lòng chọn ngày đến.");
      return false;
    }
    if (!slot) {
      toast.error("Vui lòng chọn khung giờ.");
      return false;
    }
    return true;
  }

  function validateStep3(): boolean {
    if (name.trim().length < 2) {
      toast.error("Vui lòng nhập họ tên khách.");
      return false;
    }
    if (!/^0\d{9}$/.test(phone.trim())) {
      toast.error("Số điện thoại không hợp lệ (vd: 0912345678).");
      return false;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Email không hợp lệ.");
      return false;
    }
    return true;
  }

  // Sau khi "thanh toán" xong → tạo đặt bàn thật trên API
  async function submitReservation() {
    if (!date || !slot || !tableId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slot,
          partySize,
          tableId,
          customerName: name,
          phone,
          email,
          pairing,
          notes: finalNotes,
          allergy: finalAllergy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không tạo được lượt đặt bàn.");
        if (res.status === 409) {
          // bàn vừa bị chiếm — quay lại bước 2
          setPayOpen(false);
          setStep(2);
          void goStep2();
        }
        return;
      }
      setCreated(data.reservation as ReservationDTO);
      setPayOpen(false);
      setStep(5);
      toast.success(
        `Đặt bàn thành công — mã ${data.reservation.code} đã được gửi qua email.`,
      );
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePayMethod() {
    setPayPhase("processing");
    window.setTimeout(() => setPayPhase("success"), 1500);
  }

  // ---------- Bước 5 ----------
  if (step === 5 && created) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <CompletionView reservation={created} onGoHome={onGoHome} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.3em] text-[#b45309]">
          Đặt bàn trực tuyến
        </p>
        <h1 className="font-heading text-3xl font-semibold text-[#292524] sm:text-4xl">
          Một buổi tối tại TRẦM
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Menu tasting 7 món · {formatVND(PRICES.menu)} / khách · đặt cọc{" "}
          {formatVND(PRICES.deposit)} / khách
        </p>
      </div>

      <StepIndicator step={step} />

      <Card className="border-border/80 bg-card shadow-md">
        <CardContent className="p-5 sm:p-8">
          {/* ============ BƯỚC 1 ============ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-1 font-heading text-xl font-semibold text-[#292524]">
                  1. Ngày &amp; khung giờ
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  TRẦM mở cửa tối Thứ Ba → Chủ Nhật (nghỉ thứ Hai), mỗi tối 2
                  khung.
                </p>
                {today ? (
                  <DateStrip
                    today={today}
                    selected={date}
                    onSelect={(iso) => {
                      setDate(iso);
                      setSlot(null);
                    }}
                  />
                ) : (
                  <div className="h-[100px] animate-pulse rounded-xl bg-muted" />
                )}
                {date && (
                  <p className="mt-3 text-sm font-medium text-[#92400e]">
                    <CalendarCheck className="mr-1 inline h-4 w-4" aria-hidden />
                    {formatLongDate(date)}
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block text-sm font-medium">
                  Khung giờ
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {SLOT_TIMES.map((s) => {
                    const summary = slotsSummary?.find((x) => x.slot === s.value);
                    const remaining = summary?.remainingSeats ?? null;
                    const full = remaining !== null && remaining === 0;
                    const isSelected = slot === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        disabled={!date}
                        onClick={() => setSlot(s.value)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-50",
                          isSelected
                            ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-md shadow-[#b45309]/25"
                            : "border-border bg-[#fffdf9] text-stone-700 hover:border-[#b45309]/60 hover:bg-[#fdf0d5]/60",
                        )}
                      >
                        <span className="font-heading text-xl font-semibold">
                          {s.label}
                        </span>
                        {loadingSlots ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : remaining !== null ? (
                          <span
                            className={cn(
                              "text-xs",
                              full
                                ? "font-medium text-[#b3261e]"
                                : isSelected
                                  ? "text-[#fdf0d5]"
                                  : "text-muted-foreground",
                            )}
                          >
                            {full ? "Hết chỗ" : `Còn ${remaining} chỗ`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            42 chỗ
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-sm font-medium">
                  Số khách
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPartySize((p) => Math.max(2, p - 1))}
                    disabled={partySize <= 2}
                    className="h-11 w-11 rounded-full p-0"
                    aria-label="Giảm số khách"
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </Button>
                  <span className="min-w-24 text-center font-heading text-2xl font-semibold text-[#292524]">
                    {partySize} khách
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPartySize((p) => Math.min(8, p + 1))}
                    disabled={partySize >= 8}
                    className="h-11 w-11 rounded-full p-0"
                    aria-label="Tăng số khách"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                  <p className="hidden text-xs leading-relaxed text-muted-foreground sm:block">
                    Đoàn trên 6 khách: nhà hàng sẽ xếp bàn ghép —
                    <br />
                    vui lòng đăng ký danh sách chờ nếu còn trống.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={() => {
                    if (validateStep1()) void goStep2();
                  }}
                  className="h-12 min-w-40 rounded-full bg-[#b45309] px-8 text-[#fffbf2] hover:bg-[#92400e]"
                >
                  Chọn bàn
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          )}

          {/* ============ BƯỚC 2: CHỌN BÀN hoặc WAITLIST ============ */}
          {step === 2 && waitlistMode && date && slot && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold text-[#292524]">
                  2. Không còn bàn trống
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="h-11 rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  Quay lại
                </Button>
              </div>
              <WaitlistPanel
                date={date}
                slot={slot}
                initialPartySize={partySize}
                onGoHome={onGoHome}
              />
            </div>
          )}

          {step === 2 && !waitlistMode && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="mb-0.5 font-heading text-xl font-semibold text-[#292524]">
                    2. Chọn bàn
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {date ? formatLongDate(date) : ""} ·{" "}
                    {slot === "SLOT_1730" ? "17:30" : "19:45"} · {partySize}{" "}
                    khách
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="h-11 rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  Sửa ngày &amp; giờ
                </Button>
              </div>

              {loadingTables || !tables ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[76px] animate-pulse rounded-xl bg-muted"
                    />
                  ))}
                </div>
              ) : (
                <TableGrid
                  tables={tables}
                  selectedTableId={tableId}
                  onSelect={(t) => setTableId(t.table.id)}
                />
              )}

              {selectedTable && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b45309]/35 bg-[#fdf0d5]/60 p-4">
                  <p className="text-sm text-stone-700">
                    <span className="font-heading text-lg font-semibold text-[#b45309]">
                      {selectedTable.table.code}
                    </span>{" "}
                    · {selectedTable.table.seats} chỗ ·{" "}
                    {selectedTable.table.zone}
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setStep(3)}
                    className="h-12 min-w-40 rounded-full bg-[#b45309] px-8 text-[#fffbf2] hover:bg-[#92400e]"
                  >
                    Nhập thông tin
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ============ BƯỚC 3 ============ */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-semibold text-[#292524]">
                  3. Thông tin khách
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="h-11 rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  Sửa bàn
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bk-name">Họ và tên *</Label>
                  <Input
                    id="bk-name"
                    placeholder="vd: Nguyễn Minh Anh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bk-phone">Số điện thoại *</Label>
                  <Input
                    id="bk-phone"
                    placeholder="09xxxxxxxx"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
                      setPhone(val);
                      if (val.length === 10) void checkLoyaltyByPhone(val);
                      else setLoyaltyProfile(null);
                    }}
                    className="h-11"
                  />
                  {checkingLoyalty && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Đang tra cứu hạng thành viên...
                    </p>
                  )}
                  {loyaltyProfile && (
                    <div
                      className={cn(
                        "rounded-lg p-2.5 text-xs transition-all",
                        loyaltyProfile.tier === "NAM_TRAM"
                          ? "border border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-purple-500/15 text-amber-950 font-medium"
                          : loyaltyProfile.tier === "TRAM"
                            ? "border border-amber-300 bg-amber-50 text-amber-900 font-medium"
                            : "border border-stone-200 bg-stone-50 text-stone-700",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {loyaltyProfile.tier === "NAM_TRAM" ? (
                          <Gem className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : loyaltyProfile.tier === "TRAM" ? (
                          <Crown className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : (
                          <Award className="h-4 w-4 text-stone-600 shrink-0" />
                        )}
                        <span>
                          <strong>
                            {loyaltyProfile.tier === "NAM_TRAM"
                              ? "👑 Thượng khách Nam Trầm"
                              : loyaltyProfile.tier === "TRAM"
                                ? "Hạng Trầm"
                                : "Hạng Hương"}
                          </strong>{" "}
                          ({loyaltyProfile.visits} lượt đến · {loyaltyProfile.points.toLocaleString("vi-VN")} pts)
                          {loyaltyProfile.tier === "NAM_TRAM" && (
                            <span className="block mt-0.5 text-emerald-800 font-bold">
                              ✨ Đặc quyền FR-22: Miễn 100% tiền đặt cọc khi đặt bàn trực tuyến!
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Thanh chọn nhanh thử nghiệm FR-22 */}
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      ⚡ Thử nghiệm nhanh tính năng FR-22 (Miễn cọc Nam Trầm):
                    </p>
                    <p className="text-[11px] text-amber-800/80">
                      Bấm vào số mẫu để tự động điền &amp; kích hoạt luồng miễn cọc
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setName("Trần Nam Trầm");
                        setPhone("0909999999");
                        setEmail("namtram@tramreserve.vn");
                        void checkLoyaltyByPhone("0909999999");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/60 bg-gradient-to-r from-amber-400 to-amber-200 px-3 py-1 text-xs font-extrabold text-stone-950 shadow-xs hover:brightness-105 transition-all"
                    >
                      <Gem className="h-3.5 w-3.5 text-amber-900" />
                      0909 999 999 (Nam Trầm · 7 lượt)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setName("Nguyễn Hữu Phúc");
                        setPhone("0993738817");
                        setEmail("phuc.nguyen@gmail.com");
                        void checkLoyaltyByPhone("0993738817");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-200 transition-colors"
                    >
                      <Crown className="h-3.5 w-3.5 text-amber-700" />
                      0993 738 817 (Nam Trầm · 7 lượt)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setName("Lê Thu Hằng");
                        setPhone("0913889848");
                        setEmail("hang.le@gmail.com");
                        void checkLoyaltyByPhone("0913889848");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                    >
                      <Award className="h-3.5 w-3.5 text-stone-500" />
                      0913 889 848 (Hạng Hương · Cọc 300k)
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk-email">Email (nhận xác nhận &amp; nhắc lịch)</Label>
                <Input
                  id="bk-email"
                  type="email"
                  placeholder="vidu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Pairing đi kèm</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { value: "NONE", label: "Không pairing", price: 0, icon: Ban },
                      {
                        value: "WINE",
                        label: "Wine pairing",
                        price: PRICES.winePairing,
                        icon: Wine,
                      },
                      {
                        value: "TEA",
                        label: "Tea pairing",
                        price: PRICES.teaPairing,
                        icon: Coffee,
                      },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = pairing === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPairing(opt.value)}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                          active
                            ? "border-[#b45309] bg-[#fdf0d5]/70 shadow-sm"
                            : "border-border bg-[#fffdf9] hover:border-[#b45309]/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            active
                              ? "bg-[#b45309] text-[#fffbf2]"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-[#292524]">
                            {opt.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {opt.price === 0
                              ? "—"
                              : `+${formatVND(opt.price)} / khách`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bk-notes">Ghi chú cho nhà hàng</Label>
                <Textarea
                  id="bk-notes"
                  placeholder="vd: chỗ yên tĩnh, có trẻ em đi cùng..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-24"
                />
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-stone-700">
                    <Checkbox
                      checked={allergySeafood}
                      onCheckedChange={(v) => setAllergySeafood(v === true)}
                      aria-label="Dị ứng hải sản"
                    />
                    Dị ứng hải sản
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-stone-700">
                    <Checkbox
                      checked={birthday}
                      onCheckedChange={(v) => setBirthday(v === true)}
                      aria-label="Đặt bàn sinh nhật"
                    />
                    Đặt bàn sinh nhật
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-stone-700">
                    <Checkbox
                      checked={anniversary}
                      onCheckedChange={(v) => setAnniversary(v === true)}
                      aria-label="Kỷ niệm"
                    />
                    Kỷ niệm
                  </label>
                </div>
                {allergySeafood && (
                  <p className="flex items-center gap-1.5 text-xs text-[#b3261e]">
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                    Bếp sẽ thay món gỏi cá bớp cho Quý khách bị dị ứng hải sản.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={async () => {
                    if (validateStep3()) {
                      if (!loyaltyProfile && phone.trim().length === 10) {
                        await checkLoyaltyByPhone(phone.trim());
                      }
                      setStep(4);
                    }
                  }}
                  className="h-12 min-w-40 rounded-full bg-[#b45309] px-8 text-[#fffbf2] hover:bg-[#92400e]"
                >
                  Xem tổng đơn &amp; cọc
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          )}

          {/* ============ BƯỚC 4 ============ */}
          {step === 4 && selectedTable && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-semibold text-[#292524]">
                  4. Xác nhận &amp; đặt cọc
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(3)}
                  className="h-11 rounded-full"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  Sửa thông tin
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-border bg-[#fffdf9] p-4 text-sm">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Lượt đặt
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Ngày</span>
                    <span className="font-medium text-[#292524]">
                      {date ? formatLongDate(date) : ""}
                    </span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Khung giờ</span>
                    <span className="font-medium text-[#292524]">
                      {slot === "SLOT_1730" ? "17:30" : "19:45"}
                    </span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Bàn</span>
                    <span className="font-medium text-[#292524]">
                      {selectedTable.table.code} · {selectedTable.table.seats} chỗ
                    </span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Số khách</span>
                    <span className="font-medium text-[#292524]">
                      {partySize} khách
                    </span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Khách</span>
                    <span className="font-medium text-[#292524]">
                      {name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {phone}
                      </span>
                    </span>
                  </p>
                  {finalAllergy && (
                    <Badge className="mt-1 w-fit border-[#b3261e]/40 bg-[#b3261e]/10 text-[#b3261e] hover:bg-[#b3261e]/10">
                      Dị ứng: {finalAllergy}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-[#fffdf9] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tổng chi phí
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Menu 7 món × {partySize}
                      </span>
                      <span className="font-medium text-[#292524]">
                        {formatVND(PRICES.menu * partySize)}
                      </span>
                    </p>
                    {pairing !== "NONE" && (
                      <p className="flex justify-between gap-2">
                        <span className="text-muted-foreground">
                          {PAIRING_LABELS[pairing]} × {partySize}
                        </span>
                        <span className="font-medium text-[#292524]">
                          {formatVND(pairingPrice * partySize)}
                        </span>
                      </p>
                    )}
                    <Separator className="bg-border" />
                    <p className="flex justify-between gap-2 text-base">
                      <span className="font-medium text-stone-700">
                        Tổng dự kiến
                      </span>
                      <span className="font-heading font-semibold text-[#292524]">
                        {formatVND(totalAmount)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Đặt cọc ({formatVND(PRICES.deposit)} × {partySize})
                      </span>
                      {isNamTram ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs line-through text-stone-400">
                            {formatVND(depositAmount)}
                          </span>
                          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            0 đ (Miễn cọc VIP)
                          </span>
                        </span>
                      ) : (
                        <span className="font-medium text-[#b45309]">
                          {formatVND(depositAmount)}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {isNamTram
                      ? "Áp dụng đặc quyền Hạng Nam Trầm (FR-22): Miễn 100% tiền cọc. Thanh toán toàn bộ tại nhà hàng."
                      : "Phần còn lại thanh toán tại nhà hàng. Hoàn cọc nếu hủy trước 48 giờ."}
                  </p>
                </div>
              </div>

              {/* FR-22: Banner Đặc quyền Thượng khách Nam Trầm */}
              {isNamTram && (
                <div className="w-full rounded-2xl border border-amber-500/50 bg-gradient-to-br from-[#12081f] via-[#24133b] to-[#0c0514] p-5 text-white shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-stone-950 font-bold shadow-md">
                        <Gem className="h-4 w-4 text-amber-950" />
                      </span>
                      <div>
                        <span className="text-xs font-extrabold tracking-widest text-amber-300 uppercase">
                          Đặc quyền Thượng khách Nam Trầm (FR-22)
                        </span>
                        <p className="text-[11px] text-stone-300">
                          Hạng thành viên cao nhất tại TRẦM Reserve ({loyaltyProfile?.visits} lượt đến)
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-400/60 bg-amber-400/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                      Miễn 100% Tiền Cọc
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-amber-100/90">
                    Kính chào Thượng khách <strong>{name}</strong>! Quý khách được áp dụng đặc quyền <strong>miễn 100% tiền đặt cọc</strong> (tiết kiệm {formatVND(depositAmount)}). Hệ thống sẽ <strong>bỏ qua bước thanh toán cọc 300.000 đ/khách</strong> và xác nhận giữ bàn ngay lập tức.
                  </p>
                </div>
              )}

              {/* FR-22: Rẽ nhánh nút hành động */}
              {isNamTram ? (
                <div className="flex flex-col items-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => void submitReservation()}
                    disabled={submitting}
                    className="h-14 min-w-80 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-10 text-base font-bold text-white shadow-xl shadow-amber-600/30 hover:from-amber-600 hover:to-amber-800"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Gem className="mr-2 h-5 w-5 text-amber-200" aria-hidden />
                    )}
                    Xác nhận Đặt bàn ngay · Miễn cọc VIP (0 đ)
                  </Button>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Rẽ nhánh đặc quyền Nam Trầm: Bỏ qua bước thanh toán cọc (FR-22)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => {
                      setPayPhase("method");
                      setPayOpen(true);
                    }}
                    disabled={submitting}
                    className="h-14 min-w-72 rounded-full bg-[#b45309] px-10 text-base text-[#fffbf2] shadow-lg shadow-[#b45309]/25 hover:bg-[#92400e]"
                  >
                    <ShieldCheck className="mr-2 h-5 w-5" aria-hidden />
                    Thanh toán đặt cọc · {formatVND(depositAmount)}
                  </Button>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Mail className="h-3 w-3" aria-hidden />
                    Xác nhận &amp; nhắc lịch sẽ được gửi qua email/Zalo
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentDialog
        open={payOpen}
        phase={payPhase}
        amount={depositAmount}
        onClose={() => setPayOpen(false)}
        onSelectMethod={() => handlePayMethod()}
        onDone={() => void submitReservation()}
      />

      {submitting && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Đang ghi nhận lượt đặt bàn...
        </p>
      )}
    </main>
  );
}
