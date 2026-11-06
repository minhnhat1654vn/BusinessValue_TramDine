"use client";

// Màn hình WAITLIST — đăng ký chờ khi khung giờ hết chỗ đủ lớn
import { useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCircle2, Clock, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatLongDate,
  formatVND,
  WEEKDAY_FULL_LABELS,
  weekdayOf,
} from "@/lib/tram/format";
import { PRICES, SLOT_LABELS } from "@/lib/tram/constants";
import type { Slot, WaitlistEntryDTO } from "@/lib/tram/types";

interface WaitlistPanelProps {
  date: string;
  slot: Slot;
  initialPartySize: number;
  onGoHome: () => void;
}

export function WaitlistPanel({
  date,
  slot,
  initialPartySize,
  onGoHome,
}: WaitlistPanelProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(
    Math.min(8, Math.max(2, initialPartySize)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WaitlistEntryDTO | null>(null);

  const slotTime = SLOT_LABELS[slot];
  const weekdayLabel = WEEKDAY_FULL_LABELS[weekdayOf(date)];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Vui lòng nhập họ tên Quý khách.");
      return;
    }
    const cleanPhone = phone.replace(/[\s.-]/g, "").trim();
    if (!/^0\d{9}$/.test(cleanPhone)) {
      toast.error("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: cleanPhone, partySize, date, slot }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không đăng ký được danh sách chờ.");
        return;
      }
      setResult(data.entry as WaitlistEntryDTO);
      toast.success("Đã đăng ký danh sách chờ thành công!");
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card className="border-[#b45309]/25 bg-card shadow-md">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="font-heading text-2xl text-[#292524]">
            Đã vào danh sách chờ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-[15px] leading-relaxed text-stone-600">
            Cảm ơn <span className="font-medium text-[#92400e]">{result.name}</span>.
            Bạn thứ{" "}
            <span className="font-heading text-2xl font-semibold text-[#b45309]">
              {result.position}
            </span>{" "}
            trong danh sách chờ khung{" "}
            <span className="font-medium">{slotTime}</span> {weekdayLabel.toLowerCase()}{" "}
            ngày {formatLongDate(date).split(", ")[1]}.
          </p>
          <p className="rounded-lg border border-dashed border-[#b45309]/35 bg-[#fdf0d5]/50 p-3 text-sm leading-relaxed text-stone-600">
            Nhà hàng sẽ gọi điện ngay khi có bàn trống ở khung này. Quý khách
            cũng có thể theo dõi hotline để biết tình trạng chỗ.
          </p>
          <Button
            onClick={onGoHome}
            className="h-12 min-w-44 rounded-full bg-[#b45309] px-8 text-[#fffbf2] hover:bg-[#92400e]"
          >
            Về trang chủ
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
            <BellRing className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="font-heading text-xl text-[#292524]">
              {partySize > 4
                ? "Đăng ký xếp bàn (Đoàn từ 5 khách)"
                : "Đăng ký danh sách chờ (Waitlist)"}
            </CardTitle>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {weekdayLabel}, {formatLongDate(date).split(", ")[1]} · {slotTime}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-6 rounded-lg border border-dashed border-[#b45309]/35 bg-[#fdf0d5]/50 p-3 text-sm leading-relaxed text-stone-600">
          {partySize > 4 ? (
            <>
              Bàn tiêu chuẩn trên sơ đồ tối đa 4 chỗ. Với đoàn{" "}
              <strong className="text-[#92400e]">{partySize} khách</strong> khung{" "}
              <span className="font-medium">{slotTime}</span>, nhà hàng sẽ chủ động sắp xếp
              bàn ghép và liên hệ xác nhận với Quý khách ngay khi hoàn tất.
            </>
          ) : (
            <>
              Rất tiếc, khung <span className="font-medium">{slotTime}</span> này
              không còn bàn trống đủ chỗ cho đoàn của Quý khách. Đăng ký danh sách
              chờ — nhà hàng sẽ liên hệ ngay khi có bàn nhả.
            </>
          )}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wl-name">Họ và tên</Label>
              <Input
                id="wl-name"
                placeholder="vd: Nguyễn Minh Anh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-phone">Số điện thoại</Label>
              <Input
                id="wl-phone"
                placeholder="09xxxxxxxx"
                inputMode="numeric"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))
                }
                className="h-11"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Số khách</Label>
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
              <span className="min-w-16 text-center font-heading text-xl font-semibold text-[#292524]">
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
              <span className="text-xs text-muted-foreground">
                (phí menu {formatVND(PRICES.menu)} / khách khi vào bàn)
              </span>
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full min-w-44 rounded-full bg-[#b45309] text-[15px] text-[#fffbf2] hover:bg-[#92400e]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Đang đăng ký...
              </>
            ) : (
              "Đăng ký danh sách chờ"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
