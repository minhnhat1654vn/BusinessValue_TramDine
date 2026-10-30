"use client";

// Bước 5 — màn hoàn tất: mã đặt bàn, tóm tắt, dòng thời gian nhắc lịch
// và xem trước nội dung email / tin nhắn Zalo nhắc lịch
import { useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Home,
  Mail,
  MessageCircle,
  Phone,
  ReceiptText,
  Table2,
  Users,
  Gem,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRICES, RESTAURANT, SLOT_LABELS } from "@/lib/tram/constants";
import { addDays, formatLongDate, formatVND, WEEKDAY_FULL_LABELS, weekdayOf } from "@/lib/tram/format";
import type { ReservationDTO } from "@/lib/tram/types";

function pairingPriceOf(pairing: string): number {
  if (pairing === "WINE") return PRICES.winePairing;
  if (pairing === "TEA") return PRICES.teaPairing;
  return 0;
}

interface CompletionViewProps {
  reservation: ReservationDTO;
  onGoHome: () => void;
}

export function CompletionView({ reservation, onGoHome }: CompletionViewProps) {
  const [preview, setPreview] = useState<"email" | "zalo">("email");

  const r = reservation;
  const isDepositExempt = r.depositAmount === 0;
  const slotTime = SLOT_LABELS[r.slot] ?? r.slot;
  const weekday = WEEKDAY_FULL_LABELS[weekdayOf(r.date)];
  const dateLabel = formatLongDate(r.date);
  const dayBefore48 = addDays(r.date, -2);
  const dayBefore24 = addDays(r.date, -1);
  const pairingPrice = pairingPriceOf(r.pairing);
  const total = r.partySize * (PRICES.menu + pairingPrice);

  // Nội dung email nhắc lịch (mô phỏng)
  const emailBody = `Kính gửi ${r.customerName},

TRẦM Reserve xin xác nhận lượt đặt bàn của Quý khách:

• Mã đặt bàn: ${r.code}
• Thời gian: ${weekday}, ${dateLabel.split(", ")[1]} — khung ${slotTime}
• Bàn: ${r.table.code} (${r.table.seats} chỗ) · ${r.table.zone}
• Số khách: ${r.partySize} khách
• Pairing: ${r.pairing === "NONE" ? "Không pairing" : r.pairing === "WINE" ? "Wine pairing" : "Tea pairing"}
• Đặt cọc đã nhận: ${isDepositExempt ? "0 đ (Đặc quyền Miễn cọc Thượng khách Nam Trầm — FR-22)" : formatVND(r.depositAmount)}
• Tổng dự kiến: ${formatVND(total)}${r.allergy ? `\n• Lưu ý dị ứng: ${r.allergy} — bếp đã ghi nhận và sẽ điều chỉnh món` : ""}

${isDepositExempt ? "Đặc quyền VIP: Quý khách được miễn 100% tiền cọc khi đặt bàn trực tuyến." : "Chính sách: hoàn cọc nếu Quý khách hủy trước 48 giờ so với giờ đến."}
Quý khách vui lòng đến trước khung giờ 10 phút để được hướng dẫn chỗ ngồi.

Trân trọng,
TRẦM — Hành trình vị Việt
${RESTAURANT.address} · Hotline ${RESTAURANT.hotline}`;

  // Nội dung tin nhắn Zalo nhắc lịch (mô phỏng)
  const zaloBody = `TRẦM Reserve nhắc lịch đặt bàn

Chào ${r.customerName}, TRẦM hẹn gặp Quý khách:

▪ ${weekday} · ${dateLabel.split(", ")[1]}
▪ Khung ${slotTime} · Bàn ${r.table.code}
▪ ${r.partySize} khách · Mã ${r.code}
▪ Cọc: ${isDepositExempt ? "0 đ (Miễn cọc VIP Nam Trầm)" : formatVND(r.depositAmount)}

${isDepositExempt ? "Quý khách được áp dụng đặc quyền Miễn cọc VIP Nam Trầm." : "Quý khách vui lòng đến trước 10 phút. Hủy/đổi lịch trước 48 giờ để được hoàn cọc."} Hotline ${RESTAURANT.hotline}.`;

  return (
    <div className="space-y-6">
      {/* Đầu: trạng thái + mã */}
      <Card className="border-[#b45309]/30 bg-card shadow-md">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
            {isDepositExempt ? (
              <Gem className="h-9 w-9 text-[#b45309]" aria-hidden />
            ) : (
              <CheckCircle2 className="h-9 w-9" aria-hidden />
            )}
          </div>
          <CardTitle className="font-heading text-2xl text-[#292524] sm:text-3xl">
            Đặt bàn thành công!
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDepositExempt
              ? "Nhà hàng TRẦM đã ghi nhận lượt đặt. Quý khách được áp dụng đặc quyền Miễn cọc Hạng Nam Trầm (FR-22)."
              : "Nhà hàng TRẦM đã ghi nhận lượt đặt và nhận cọc của Quý khách."}
          </p>
          {isDepositExempt && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-purple-500/15 px-3.5 py-1 text-xs font-extrabold text-amber-950">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Đặc quyền Thượng khách Nam Trầm: Miễn 100% Cọc (FR-22)
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-[#b45309]/35 bg-[#fdf0d5] px-6 py-2.5">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#92400e]">
              Mã đặt bàn
            </span>
            <span className="font-heading text-2xl font-semibold tracking-[0.14em] text-[#b45309]">
              {r.code}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2.5 rounded-xl border border-border bg-[#fffdf9] p-4 text-sm">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5" aria-hidden />
                Chi tiết lượt đặt
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Ngày</span>
                <span className="font-medium text-[#292524]">{dateLabel}</span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Khung giờ</span>
                <span className="font-medium text-[#292524]">{slotTime}</span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Bàn</span>
                <span className="font-medium text-[#292524]">
                  {r.table.code} · {r.table.seats} chỗ · {r.table.zone}
                </span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Số khách</span>
                <span className="inline-flex items-center gap-1 font-medium text-[#292524]">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {r.partySize}
                </span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Pairing</span>
                <span className="font-medium text-[#292524]">
                  {r.pairing === "NONE"
                    ? "Không"
                    : r.pairing === "WINE"
                      ? "Wine pairing"
                      : "Tea pairing"}
                </span>
              </p>
              {r.notes && (
                <p className="flex justify-between gap-2">
                  <span className="shrink-0 text-muted-foreground">Ghi chú</span>
                  <span className="max-w-[60%] text-right text-[#292524]">
                    {r.notes}
                  </span>
                </p>
              )}
              {r.allergy && (
                <Badge className="w-fit border-[#b3261e]/40 bg-[#b3261e]/10 text-[#b3261e] hover:bg-[#b3261e]/10">
                  Dị ứng: {r.allergy}
                </Badge>
              )}
            </div>

            <div className="space-y-2.5 rounded-xl border border-border bg-[#fffdf9] p-4 text-sm">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Table2 className="h-3.5 w-3.5" aria-hidden />
                Thanh toán
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  Menu 7 món × {r.partySize}
                </span>
                <span className="font-medium text-[#292524]">
                  {formatVND(PRICES.menu * r.partySize)}
                </span>
              </p>
              {pairingPrice > 0 && (
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    Pairing × {r.partySize}
                  </span>
                  <span className="font-medium text-[#292524]">
                    {formatVND(pairingPrice * r.partySize)}
                  </span>
                </p>
              )}
              <Separator className="bg-border" />
              <p className="flex justify-between gap-2 text-base">
                <span className="font-medium text-stone-700">Tổng dự kiến</span>
                <span className="font-heading font-semibold text-[#292524]">
                  {formatVND(total)}
                </span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Đặt cọc đã nhận</span>
                <span className="font-medium text-[#b45309]">
                  {isDepositExempt ? (
                    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      0 đ (Miễn cọc VIP Nam Trầm)
                    </span>
                  ) : (
                    formatVND(r.depositAmount)
                  )}
                </span>
              </p>
              <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                {isDepositExempt
                  ? "Áp dụng đặc quyền Hạng Nam Trầm (FR-22): Miễn 100% tiền cọc khi đặt bàn trực tuyến. Toàn bộ thanh toán sẽ thực hiện tại nhà hàng khi kết thúc bữa tiệc."
                  : "Cổng thanh toán mô phỏng — không có giao dịch thật. Phần còn lại thanh toán tại nhà hàng."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dòng thời gian nhắc lịch */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl text-[#292524]">
            <BellRing className="h-5 w-5 text-[#b45309]" aria-hidden />
            Lịch nhắc tự động
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-6 border-l-2 border-[#fdf0d5] pl-6">
            <li className="relative">
              <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#b45309] bg-[#fffdf9]">
                <CheckCircle2 className="h-3 w-3 text-[#b45309]" aria-hidden />
              </span>
              <p className="text-sm font-medium text-[#292524]">
                Xác nhận — đã gửi ngay bây giờ
              </p>
              <p className="text-xs text-muted-foreground">
                Email xác nhận kèm mã {r.code}
                {r.email ? ` tới ${r.email}` : ""}
              </p>
            </li>
            <li className="relative">
              <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#c2a37a] bg-[#fffdf9]">
                <BellRing className="h-3 w-3 text-[#b45309]" aria-hidden />
              </span>
              <p className="text-sm font-medium text-[#292524]">
                Nhắc lịch 1 — trước 48 giờ
              </p>
              <p className="text-xs text-muted-foreground">
                {formatLongDate(dayBefore48)} ({WEEKDAY_FULL_LABELS[weekdayOf(dayBefore48)]})
              </p>
            </li>
            <li className="relative">
              <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#c2a37a] bg-[#fffdf9]">
                <BellRing className="h-3 w-3 text-[#b45309]" aria-hidden />
              </span>
              <p className="text-sm font-medium text-[#292524]">
                Nhắc lịch 2 — trước 24 giờ
              </p>
              <p className="text-xs text-muted-foreground">
                {formatLongDate(dayBefore24)} ({WEEKDAY_FULL_LABELS[weekdayOf(dayBefore24)]})
              </p>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Xem trước nội dung nhắc lịch */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-[#292524]">
            Xem trước tin nhắn nhắc lịch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={preview} onValueChange={(v) => setPreview(v as "email" | "zalo")}>
            <TabsList className="mb-4 h-11 w-full justify-start rounded-full bg-muted p-1">
              <TabsTrigger
                value="email"
                className="h-9 flex-1 rounded-full px-4 data-[state=active]:bg-[#b45309] data-[state=active]:text-[#fffbf2] sm:flex-none"
              >
                <Mail className="mr-1.5 h-4 w-4" aria-hidden />
                Email
              </TabsTrigger>
              <TabsTrigger
                value="zalo"
                className="h-9 flex-1 rounded-full px-4 data-[state=active]:bg-[#b45309] data-[state=active]:text-[#fffbf2] sm:flex-none"
              >
                <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden />
                Zalo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center gap-2 border-b border-border bg-[#f5efe4] px-4 py-2.5 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  <span className="truncate">
                    Từ: TRẦM Reserve &lt;{RESTAURANT.email}&gt; · Tới:{" "}
                    {r.email ?? "khách@vitri.vn"}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="mb-2 text-sm font-semibold text-[#292524]">
                    TRẦM Reserve — Xác nhận đặt bàn {r.code}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-stone-600">
                    {emailBody}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="zalo">
              <div className="rounded-xl border border-border bg-[#f5efe4] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  TRẦM Reserve · Zalo OA
                </div>
                <div className="max-w-md rounded-2xl rounded-tl-sm border border-border bg-[#fffdf9] p-4 shadow-sm">
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-stone-600">
                    {zaloBody}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Nội dung nhắc lịch mô phỏng — hiển thị đúng dạng khách nhận được qua
            kênh Email / Zalo.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3 pb-4">
        <Button
          size="lg"
          onClick={onGoHome}
          className="h-12 min-w-56 rounded-full bg-[#b45309] px-10 text-[15px] text-[#fffbf2] shadow-md shadow-[#b45309]/20 hover:bg-[#92400e]"
        >
          <Home className="mr-1.5 h-4 w-4" aria-hidden />
          Về trang chủ
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" aria-hidden />
          Cần hỗ trợ? Hotline {RESTAURANT.hotline}
        </p>
      </div>
    </div>
  );
}
