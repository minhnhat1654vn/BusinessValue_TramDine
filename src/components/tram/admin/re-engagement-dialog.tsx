"use client";

// FR-25: Chiến dịch mời lại — Gợi ý khách ≥ 21 ngày chưa quay lại kèm xem trước Email/Zalo
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Mail,
  Send,
  Copy,
  Check,
  Sparkles,
  Clock,
  Calendar,
  Gem,
  Crown,
  Award,
  Wine,
  Gift,
  Phone,
  MessageCircle,
  ExternalLink,
  UtensilsCrossed,
  CheckCircle2,
  Share2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLongDate, formatVND } from "@/lib/tram/format";
import { formatPoints, LOYALTY_TIERS } from "@/lib/tram/loyalty";
import type { CustomerProfileDTO, LoyaltyTier } from "@/lib/tram/types";

interface ReEngagementDialogProps {
  customer: CustomerProfileDTO | null;
  daysLapsed: number;
  open: boolean;
  onClose: () => void;
  onSent?: (customerPhone: string) => void;
}

export function ReEngagementDialog({
  customer,
  daysLapsed,
  open,
  onClose,
  onSent,
}: ReEngagementDialogProps) {
  const [activeTab, setActiveTab] = useState<"zalo" | "email">("zalo");
  const [copied, setCopied] = useState(false);
  const [sentZalo, setSentZalo] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);

  if (!customer) return null;

  const tierConfig = LOYALTY_TIERS[customer.tier] ?? LOYALTY_TIERS.HUONG;

  // Quyền lợi kích thích quay lại tùy chỉnh theo 3 hạng
  const tierGift =
    customer.tier === "NAM_TRAM"
      ? "Đặc quyền bàn quen phòng VIP & 1 chai vang Grand Cru khai tiệc (Miễn cọc 100%)"
      : customer.tier === "TRAM"
      ? "Tặng 1 ly vang khai vị hảo hạng từ Sommelier & nhân đôi điểm thưởng tích lũy"
      : "Tặng món tráng miệng Trầm Hương Signature & tích lũy thăng hạng Trầm";

  // Nội dung tin nhắn Zalo ZNS
  const zaloMessage = `[TRẦM RESERVE] Kính gửi Thượng khách ${customer.name},

Đã ${daysLapsed} ngày kể từ bữa tiệc gần nhất của Quý khách tại TRẦM Reserve. 

Bếp trưởng và Đội ngũ phục vụ trân trọng kính mời Quý khách trở lại thưởng thức Bộ Thực đơn Tasting Mùa Thu mới vừa ra mắt.

Đặc quyền tri ân dành riêng cho Quý khách:
${tierGift}

Điểm thưởng hiện có: ${formatPoints(customer.points)} pts
Hotline VIP: 0909 888 777
Đặt bàn trực tuyến: https://tramreserve.vn

Hân hạnh được đón tiếp Quý khách!`;

  // Xử lý sao chép
  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã sao chép nội dung lời mời vào clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  // Xử lý gửi Zalo
  function handleSendZalo() {
    setSentZalo(true);
    toast.success(`Đã gửi lời mời Zalo ZNS đến số điện thoại ${customer?.phone}!`);
    if (onSent && customer) onSent(customer.phone);
  }

  // Xử lý gửi Email
  function handleSendEmail() {
    setSentEmail(true);
    toast.success(`Đã gửi Email Marketing tri ân đến khách hàng ${customer?.name}!`);
    if (onSent && customer) onSent(customer.phone);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl border-amber-900/20 bg-[#faf8f3] p-0 overflow-hidden shadow-2xl [&_[data-slot=dialog-close]]:text-stone-200 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:bg-black/40 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:z-20">
        <DialogHeader className="sr-only">
          <DialogTitle>Chiến dịch mời lại thực khách — TRẦM Reserve</DialogTitle>
          <DialogDescription>
            Xem trước Email &amp; Zalo gửi lời mời khách ≥ 21 ngày chưa quay lại
          </DialogDescription>
        </DialogHeader>

        {/* Header sang trọng */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#292524] via-[#3d3835] to-[#1c1917] p-6 text-white">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-36 w-36 rounded-full bg-amber-400/10 blur-xl" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                Chiến dịch mời lại thực khách
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-200 border border-amber-400/30">
                <Clock className="h-3.5 w-3.5 text-amber-300" />
                Đã {daysLapsed} ngày chưa quay lại
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="font-heading text-2xl font-bold tracking-tight text-white">
                  Soạn lời mời gửi {customer.name}
                </h3>
                <p className="mt-1 text-xs text-stone-300">
                  SĐT: <strong className="text-white">{customer.phone}</strong> · Lần đến gần nhất:{" "}
                  <strong>{formatLongDate(customer.lastVisit)}</strong> · Đã dùng {customer.visits} bữa
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
                {customer.tier === "NAM_TRAM" ? (
                  <Gem className="h-3.5 w-3.5 text-purple-300" />
                ) : customer.tier === "TRAM" ? (
                  <Crown className="h-3.5 w-3.5 text-amber-300" />
                ) : (
                  <Award className="h-3.5 w-3.5 text-stone-300" />
                )}
                <span>Hạng {tierConfig.name}</span>
                <span className="text-amber-300 ml-1">({formatPoints(customer.points)} pts)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nội dung Tabs xem trước */}
        <div className="p-5 sm:p-6 space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <TabsList className="h-10 rounded-full bg-stone-200/70 p-1">
                <TabsTrigger
                  value="zalo"
                  className="rounded-full px-4 text-xs font-semibold data-[state=active]:bg-[#0068ff] data-[state=active]:text-white"
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Tin nhắn Zalo ZNS
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="rounded-full px-4 text-xs font-semibold data-[state=active]:bg-[#b45309] data-[state=active]:text-white"
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Email Marketing VIP
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(zaloMessage)}
                className="h-8 rounded-full border-stone-300 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                    Đã sao chép
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Sao chép nội dung
                  </>
                )}
              </Button>
            </div>

            {/* TAB 1: XEM TRƯỚC TIN NHẮN ZALO ZNS */}
            <TabsContent value="zalo" className="space-y-4 m-0">
              <div className="mx-auto max-w-lg rounded-2xl border border-stone-300/80 bg-stone-100 p-4 shadow-inner">
                {/* Simulated Phone Notification Header */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5 mb-3 text-[11px] text-stone-500">
                  <span className="flex items-center gap-1.5 font-semibold text-stone-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0068ff] text-white text-[10px] font-bold">
                      Z
                    </span>
                    Zalo Official Account · TRẦM Reserve
                  </span>
                  <span>Vừa xong</span>
                </div>

                {/* Zalo Chat Bubble */}
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-200 space-y-3">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                      <UtensilsCrossed className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        TRẦM Reserve — Thư Mời Mùa Mới
                      </h4>
                      <p className="text-[10px] text-muted-foreground">Xác thực doanh nghiệp ✔</p>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-stone-800">
                    Kính gửi Thượng khách <strong>{customer.name}</strong>,
                  </p>
                  <p className="text-xs leading-relaxed text-stone-700">
                    Đã <strong className="text-amber-800">{daysLapsed} ngày</strong> kể từ bữa tiệc gần nhất của Quý khách tại TRẦM. Bếp trưởng và đội ngũ phục vụ rất mong sớm được tái ngộ Quý khách!
                  </p>

                  {/* Special Offer Card inside Zalo */}
                  <div className="rounded-xl border border-amber-300/70 bg-gradient-to-b from-amber-50 to-[#fffdf9] p-3 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                      <Gift className="h-3 w-3 text-amber-700" />
                      Đặc quyền mời lại dành riêng cho Quý khách:
                    </span>
                    <p className="font-semibold text-stone-900 text-xs">
                      {tierGift}
                    </p>
                    <p className="text-[10px] text-stone-500 pt-0.5">
                      Điểm tích lũy hiện có: <strong>{formatPoints(customer.points)} pts</strong>
                    </p>
                  </div>

                  {/* Buttons inside Zalo */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full text-center py-2 rounded-xl bg-[#0068ff] text-white font-bold text-xs shadow-xs cursor-pointer hover:bg-blue-600 transition-colors">
                      Đặt bàn lại ngay
                    </div>
                    <div className="w-full text-center py-1.5 rounded-xl border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 transition-colors">
                      Xem Menu Tasting Mùa Thu
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-stone-500" />
                  Gửi tự động đến Zalo số: <strong className="text-stone-800">{customer.phone}</strong>
                </span>

                <Button
                  onClick={handleSendZalo}
                  className="h-10 rounded-full bg-[#0068ff] text-white hover:bg-blue-600 font-bold text-xs px-6 shadow-md"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {sentZalo ? "Gửi lại lời mời Zalo" : "Gửi tin nhắn Zalo ZNS"}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: XEM TRƯỚC EMAIL MARKETING VIP */}
            <TabsContent value="email" className="space-y-4 m-0">
              <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-stone-300 shadow-md bg-white">
                {/* Email Subject Header */}
                <div className="bg-stone-100 border-b border-stone-200 p-3 text-xs space-y-1">
                  <p>
                    <span className="text-muted-foreground">Người gửi:</span>{" "}
                    <strong>TRẦM Reserve &lt;reservation@tramreserve.vn&gt;</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Tiêu đề:</span>{" "}
                    <strong className="text-stone-900">
                      [TRẦM Reserve] Kính mời Thượng khách {customer.name} trở lại thưởng thức Phong vị Mùa mới
                    </strong>
                  </p>
                </div>

                {/* Email Body */}
                <div className="p-6 space-y-4 text-stone-800 bg-[#faf8f3]">
                  {/* Fine dining top header */}
                  <div className="text-center border-b border-amber-900/10 pb-4">
                    <span className="font-heading text-xl font-bold tracking-widest text-[#292524]">
                      TRẦM RESERVE
                    </span>
                    <p className="text-[10px] uppercase tracking-widest text-[#b45309] mt-0.5">
                      Haute Cuisine &amp; Fine Dining
                    </p>
                  </div>

                  <div>
                    <h4 className="font-heading text-base font-bold text-stone-900">
                      Kính gửi Quý khách {customer.name},
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-stone-600">
                      Đã <strong className="text-amber-800 font-bold">{daysLapsed} ngày</strong> kể từ lần gần nhất TRẦM Reserve có vinh hạnh được đón tiếp Quý khách ({formatLongDate(customer.lastVisit)}).
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-stone-600">
                      Mùa thu này, Bếp trưởng TRẦM vừa ra mắt Bộ Thực đơn 7 món Tasting Cổ điển mới với nguyên liệu nấm rừng và bò Wagyu ủ tuyết. Chúng tôi đặc biệt dành riêng một bàn tiệc ấm cúng để chào đón Quý khách trở lại.
                    </p>
                  </div>

                  {/* Tier Perk Box */}
                  <div className="rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50 to-[#fffdf9] p-4 text-xs space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                      Đặc quyền Thượng khách Hạng {tierConfig.name}:
                    </span>
                    <p className="font-bold text-stone-900">{tierGift}</p>
                    <p className="text-[11px] text-stone-500">
                      Điểm thưởng tích lũy hiện có: <strong className="text-amber-900">{formatPoints(customer.points)} pts</strong>
                    </p>
                  </div>

                  {/* CTA Button */}
                  <div className="text-center pt-2">
                    <div className="inline-block rounded-full bg-[#b45309] px-6 py-2.5 font-bold text-xs text-white shadow-md hover:bg-[#92400e] cursor-pointer transition-colors">
                      Kính Đặt Trước Bàn Quen
                    </div>
                    <p className="mt-2 text-[10px] text-stone-400">
                      Địa chỉ: 12 Trầm Hương, Quận 1, TP. Hồ Chí Minh · Hotline: 0909 888 777
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-stone-500" />
                  Mẫu email HTML tự động đồng bộ hồ sơ khách hàng
                </span>

                <Button
                  onClick={handleSendEmail}
                  className="h-10 rounded-full bg-[#b45309] text-white hover:bg-[#92400e] font-bold text-xs px-6 shadow-md"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {sentEmail ? "Gửi lại Email" : "Gửi Email Mời Lại"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Nút đóng */}
          <div className="flex items-center justify-end border-t border-stone-200 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-full text-xs"
            >
              Đóng hộp thoại
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
