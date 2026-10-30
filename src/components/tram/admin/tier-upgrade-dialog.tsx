"use client";

// FR-26: Chúc mừng lên hạng — Thư chúc mừng khi lượt gần nhất vượt mốc 3 hoặc 6 lượt
// Kích hoạt cùng cập nhật hạng (Check-in & Hồ sơ khách hàng)

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Crown,
  Gem,
  Award,
  Sparkles,
  Mail,
  Send,
  Copy,
  Check,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Star,
  PartyPopper,
  Wine,
  Gift,
  ArrowRight,
  MessageCircle,
  Clock,
  Calendar,
  ExternalLink,
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
import { LOYALTY_TIERS, formatPoints } from "@/lib/tram/loyalty";
import type { LoyaltyTier } from "@/lib/tram/types";

export interface TierUpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  phone: string;
  currentTier?: LoyaltyTier;
  newTier: LoyaltyTier; // "TRAM" | "NAM_TRAM"
  milestone?: 3 | 6; // 3 lượt hoặc 6 lượt
  visitsCount?: number;
  points?: number;
  onSent?: (channel: "EMAIL" | "ZALO") => void;
}

export function TierUpgradeDialog({
  open,
  onClose,
  customerName,
  phone,
  currentTier,
  newTier,
  milestone = newTier === "NAM_TRAM" ? 6 : 3,
  visitsCount,
  points = 0,
  onSent,
}: TierUpgradeDialogProps) {
  const [activeTab, setActiveTab] = useState<"email" | "zalo">("email");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingZalo, setIsSendingZalo] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [zaloSent, setZaloSent] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);

  const prevTierKey = currentTier ?? (newTier === "NAM_TRAM" ? "TRAM" : "HUONG");
  const oldTierConfig = LOYALTY_TIERS[prevTierKey] ?? LOYALTY_TIERS.HUONG;
  const newTierConfig = LOYALTY_TIERS[newTier] ?? LOYALTY_TIERS.TRAM;
  const isNamTram = newTier === "NAM_TRAM";

  const emailSubject = `[TRẦM Reserve] Thư Vinh Danh & Chúc Mừng Thăng Hạng ${newTierConfig.name} — Kính gửi Thượng khách ${customerName}`;

  const emailTextContent = `TRẦM RESERVE — HAUTE CUISINE & TEA ATELIER
--------------------------------------------------
THƯ VINH DANH & CHÚC MỪNG THĂNG HẠNG THÀNH VIÊN VIP

Kính gửi Quý Thượng khách ${customerName},
Số điện thoại: ${phone}

Ban Quản trị cùng toàn thể Đội ngũ Ẩm thực & Bếp trưởng TRẦM Reserve xin gửi lời chào trân trọng và lời chúc an khang tới Quý khách!

Chúng tôi vô cùng vinh hạnh và tự hào được đồng hành cùng Quý khách qua cột mốc ${milestone} lượt dùng bữa tại TRẦM. Sự hiện diện và gu thưởng thức tinh tế của Quý khách chính là niềm vinh dự to lớn, thúc đẩy chúng tôi không ngừng hoàn thiện phong vị ẩm thực Việt đương đại.

Hôm nay, TRẦM Reserve xin trân trọng vinh danh và thông báo Quý khách chính thức được nâng hạng lên:
★ ${newTierConfig.name.toUpperCase()} ★
${newTierConfig.tagline}

CÁC ĐẶC QUYỀN MỚI CHÍNH THỨC ĐƯỢC KÍCH HOẠT (THEO ĐẶC TẢ BẢNG 8):
${newTierConfig.benefits.map((b, i) => `${i + 1}. ${b}`).join("\n")}

${
  isNamTram
    ? "⭐ ĐẶC BIỆT: Kể từ hôm nay, Quý khách được MIỄN 100% TIỀN ĐẶT CỌC khi đặt bàn trực tuyến tại tramreserve.vn."
    : "⭐ ĐẶC BIỆT: Thưởng thêm +5% điểm tích lũy hóa đơn và miễn phí phục vụ mở 01 chai vang quý tại bàn."
}

Điểm tích lũy hiện tại: ${formatPoints(points)} pts

Một lần nữa, xin chân thành tri ân Quý khách vì đã chọn TRẦM Reserve là nơi lưu giữ những khoảnh khắc ẩm thực thi vị.

Trân trọng,
Ban Quản Trị & Bếp Trưởng Điều Hành TRẦM Reserve
Địa chỉ: 195 Nam Kỳ Khởi Nghĩa, Quận 3, TP. Hồ Chí Minh
Hotline Thượng khách: 0903 123 456
`;

  const zaloTextContent = `[TRẦM RESERVE - THÔNG BÁO VINH DANH THĂNG HẠNG]
Kính gửi Thượng khách ${customerName},
TRẦM Reserve trân trọng chúc mừng Quý khách đã chính thức vượt mốc ${milestone} lượt ghé thăm và được nâng hạng lên ${newTierConfig.name.toUpperCase()} (${newTierConfig.tagline})!

Đặc quyền mới kích hoạt:
${isNamTram ? "• Miễn 100% tiền đặt cọc trực tuyến\n• Món Tasting độc bản Bếp Trưởng\n• Ưu tiên xếp Bàn VIP\n• Thưởng tối đa +8% điểm" : "• Thưởng thêm +5% điểm hóa đơn\n• Trà chào mừng thượng hạng theo mùa\n• Miễn phí khui 01 chai vang\n• Ưu tiên chọn giữ bàn đẹp"}
• Điểm tích lũy hiện có: ${formatPoints(points)} pts

Hotline hỗ trợ riêng: 0903 123 456.
Kính chúc Quý khách luôn có những bữa tiệc trọn vẹn thi vị!`;

  function handleSendEmail() {
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSent(true);
      toast.success(
        `Đã gửi Thư chúc mừng thăng hạng ${newTierConfig.name} tới email của khách hàng ${customerName}!`,
      );
      if (onSent) onSent("EMAIL");
    }, 700);
  }

  function handleSendZalo() {
    setIsSendingZalo(true);
    setTimeout(() => {
      setIsSendingZalo(false);
      setZaloSent(true);
      toast.success(
        `Đã gửi tin nhắn Zalo ZNS vinh danh thăng hạng tới số điện thoại ${phone}!`,
      );
      if (onSent) onSent("ZALO");
    }, 600);
  }

  function handleCopyEmail() {
    navigator.clipboard.writeText(emailTextContent);
    setCopiedEmail(true);
    toast.success("Đã sao chép nội dung thư chúc mừng!");
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  function handleCopyZalo() {
    navigator.clipboard.writeText(zaloTextContent);
    setCopiedZalo(true);
    toast.success("Đã sao chép tin nhắn Zalo ZNS!");
    setTimeout(() => setCopiedZalo(false), 2000);
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Trình duyệt chặn mở cửa sổ mới để in.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${emailSubject}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; color: #1c1917; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 20px; margin-bottom: 30px; }
            .gold-badge { display: inline-block; background: #fef3c7; border: 1px solid #d97706; padding: 8px 20px; font-weight: bold; border-radius: 9999px; margin: 15px 0; color: #78350f; font-size: 16px; }
            .perks { background: #fafaf9; border-left: 4px solid #b45309; padding: 15px 20px; margin: 20px 0; }
            .footer { margin-top: 40px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="letter-spacing: 3px; margin: 0; color: #78350f;">TRẦM RESERVE</h1>
            <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #78716c; margin-top: 5px;">Haute Cuisine & Tea Atelier · Fine Dining</p>
          </div>
          <h2>THƯ VINH DANH & CHÚC MỪNG THĂNG HẠNG</h2>
          <p><strong>Kính gửi Thượng khách:</strong> ${customerName} (SĐT: ${phone})</p>
          <p>Ban Quản trị cùng toàn thể Đội ngũ Ẩm thực TRẦM Reserve xin gửi lời chào trân trọng và lời chúc an khang nhất tới Quý khách.</p>
          <p>Chúng tôi vô cùng vinh hạnh được đồng hành cùng Quý khách qua cột mốc <strong>${milestone} lượt dùng bữa</strong> tại TRẦM Reserve. Hôm nay, chúng tôi xin trân trọng vinh danh và nâng hạng tài khoản của Quý khách:</p>
          <div style="text-align: center;">
            <div class="gold-badge">★ ${newTierConfig.name.toUpperCase()} ★ (${newTierConfig.tagline})</div>
          </div>
          <div class="perks">
            <h3>ĐẶC QUYỀN MỚI CHÍNH THỨC KÍCH HOẠT:</h3>
            <ul>
              ${newTierConfig.benefits.map((b: string) => `<li>${b}</li>`).join("")}
            </ul>
          </div>
          <p>Điểm tích lũy hiện tại: <strong>${formatPoints(points)} pts</strong></p>
          <div class="footer">
            <p><em>Trân trọng,</em></p>
            <p><strong>Ban Quản Trị & Bếp Trưởng Điều Hành TRẦM Reserve</strong></p>
            <p style="font-size: 12px; color: #78716c;">195 Nam Kỳ Khởi Nghĩa, Q.3, TP. Hồ Chí Minh</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl border-amber-900/20 bg-[#faf8f3] p-0 overflow-hidden shadow-2xl [&_[data-slot=dialog-close]]:text-stone-200 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:bg-black/30 [&_[data-slot=dialog-close]]:hover:bg-black/55 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:transition-all [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-white/15">
        <DialogHeader className="sr-only">
          <DialogTitle>
            Thư chúc mừng thăng hạng: {newTierConfig.name} - {customerName}
          </DialogTitle>
          <DialogDescription>
            FR-26: Thư chúc mừng khi lượt gần nhất vượt mốc 3 hoặc 6 lượt, kích hoạt cùng cập nhật hạng.
          </DialogDescription>
        </DialogHeader>

        {/* Celebratory Luxury Header */}
        <div
          className={`relative overflow-hidden p-6 text-white ${
            isNamTram
              ? "bg-gradient-to-br from-[#12081f] via-[#24133b] to-[#0c0514] border-b border-amber-500/40"
              : "bg-gradient-to-br from-[#78350f] via-[#92400e] to-[#451a03] border-b border-amber-400/30"
          }`}
        >
          {/* Animated Background Glow */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-rose-500/15 blur-xl" />

          <div className="relative z-10 flex flex-col items-center text-center pr-8 pl-8 sm:pr-0 sm:pl-0">
            {/* Crown / Gem Animated Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl ${
                isNamTram
                  ? "bg-gradient-to-tr from-amber-400 via-rose-300 to-purple-200 text-stone-950 ring-4 ring-amber-400/40"
                  : "bg-gradient-to-tr from-amber-400 to-amber-200 text-stone-950 ring-4 ring-amber-300/40"
              }`}
            >
              {isNamTram ? (
                <Gem className="h-7 w-7 text-stone-950" />
              ) : (
                <Crown className="h-7 w-7 text-amber-950" />
              )}
            </motion.div>

            {/* Sub-badge: FR-26 Milestone */}
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-stone-950 shadow-md">
              <Sparkles className="h-3.5 w-3.5 text-stone-950" />
              <span>VINH DANH VƯỢT MỐC {milestone} LƯỢT</span>
              <span className="text-[10px] opacity-80">· FR-26</span>
            </div>

            <h3 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Thư Chúc Mừng Thăng Hạng {newTierConfig.name}
            </h3>

            {/* Old tier -> New tier progression pill */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="rounded-full bg-black/30 px-3 py-1 font-medium text-stone-300 border border-white/10">
                {oldTierConfig.name} ({oldTierConfig.minVisits}–{oldTierConfig.maxVisits === Infinity ? "6+" : oldTierConfig.maxVisits} lượt)
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
              <span
                className={`rounded-full px-3.5 py-1 font-extrabold shadow-sm ${
                  isNamTram
                    ? "bg-gradient-to-r from-amber-400 to-amber-300 text-stone-950 border border-amber-200"
                    : "bg-amber-400 text-stone-950 border border-amber-300"
                }`}
              >
                {newTierConfig.name} ({milestone}+ lượt)
              </span>
            </div>

            <p className="mt-2 text-xs text-amber-100/90">
              Kính gửi Thượng khách <strong className="text-white font-bold">{customerName}</strong> · SĐT: {phone}
              {visitsCount ? ` · Đã ghé thăm ${visitsCount} lần` : ""}
            </p>
          </div>
        </div>

        {/* Modal Body: Tabs */}
        <div className="p-5">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full"
          >
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
              <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-xl bg-stone-200/60 p-1">
                <TabsTrigger
                  value="email"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-amber-950 data-[state=active]:shadow-xs"
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Thư Email Thượng Lưu
                </TabsTrigger>
                <TabsTrigger
                  value="zalo"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-amber-950 data-[state=active]:shadow-xs"
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                  Tin Zalo ZNS Thăng Hạng
                </TabsTrigger>
              </TabsList>

              <div className="hidden sm:flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="h-8.5 rounded-lg border-stone-300 text-xs text-stone-700 hover:border-amber-600 hover:text-amber-900"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  In / Xuất thư
                </Button>
              </div>
            </div>

            {/* TAB 1: EMAIL PREVIEW */}
            <TabsContent value="email" className="mt-4 space-y-4">
              {/* Email Subject Line Bar */}
              <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Tiêu đề thư gửi tới thực khách:
                  </span>
                  <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-900 font-mono">
                    HTML Haute Cuisine
                  </Badge>
                </div>
                <p className="font-medium text-stone-900">{emailSubject}</p>
              </div>

              {/* Haute Cuisine Fine-dining Letter Preview Box */}
              <div className="tram-scroll max-h-[360px] overflow-y-auto rounded-2xl border-2 border-[#b45309]/30 bg-gradient-to-b from-[#181411] via-[#211a14] to-[#14100d] p-6 text-stone-200 shadow-inner">
                {/* Letter Header */}
                <div className="border-b border-amber-500/20 pb-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
                    TRẦM RESERVE · HAUTE CUISINE &amp; TEA ATELIER
                  </span>
                  <h4 className="mt-1 font-heading text-lg font-bold text-amber-100 tracking-wider">
                    THƯ VINH DANH &amp; CHÚC MỪNG THĂNG HẠNG
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Cột mốc vinh danh: Vượt mốc {milestone} lượt trải nghiệm ẩm thực
                  </p>
                </div>

                {/* Letter Salutation */}
                <div className="mt-4 space-y-3 text-xs leading-relaxed text-stone-300">
                  <p>
                    Kính gửi Thượng khách <strong className="text-white font-semibold">{customerName}</strong>,
                  </p>
                  <p>
                    Ban Quản trị cùng toàn thể Đội ngũ Ẩm thực &amp; Bếp trưởng TRẦM Reserve xin gửi lời chào trân trọng và lời chúc an khang nhất tới Quý khách!
                  </p>
                  <p>
                    Chúng tôi vô cùng vinh hạnh và tự hào được đồng hành cùng Quý khách qua <strong>cột mốc {milestone} lượt dùng bữa</strong> tại TRẦM. Sự tin yêu và gu thưởng thức tinh tế của Quý khách chính là nguồn cảm hứng lớn lao để chúng tôi không ngừng sáng tạo nên những tuyệt tác ẩm thực Việt đương đại.
                  </p>
                  <p>
                    Hôm nay, TRẦM Reserve xin trân trọng vinh danh và thông báo Quý khách chính thức được nâng hạng lên:
                  </p>
                </div>

                {/* Tier Ribbon Showcase */}
                <div className="my-5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-950/60 via-stone-900/80 to-amber-950/60 p-4 text-center shadow-lg">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-stone-950 shadow-md">
                    {isNamTram ? <Gem className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
                  </div>
                  <h5 className="font-heading text-xl font-extrabold uppercase tracking-widest text-amber-300">
                    {newTierConfig.name}
                  </h5>
                  <p className="text-xs text-amber-200/90 font-medium">
                    {newTierConfig.tagline}
                  </p>
                </div>

                {/* Benefits Showcase (Bảng 8) */}
                <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      Đặc quyền mới kích hoạt ngay hôm nay (Bảng 8)
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Điểm tích lũy: <strong className="text-amber-400">{formatPoints(points)} pts</strong>
                    </span>
                  </div>

                  <ul className="space-y-2 text-xs text-stone-300">
                    {newTierConfig.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {isNamTram && (
                    <div className="mt-3 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 p-2.5 text-xs text-amber-200 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>
                        <strong>Đặc quyền cao nhất:</strong> Miễn 100% tiền đặt cọc khi đặt bàn trực tuyến và ưu tiên bàn VIP riêng tư tuyệt đối (FR-22).
                      </span>
                    </div>
                  )}
                </div>

                {/* Letter Closing & Chef Signatures */}
                <div className="mt-5 border-t border-amber-500/20 pt-4 text-xs text-stone-400 space-y-2">
                  <p>
                    Một lần nữa, xin chân thành cảm ơn Quý khách vì đã chọn TRẦM Reserve là nơi lưu giữ những khoảnh khắc ẩm thực đáng nhớ bên người thân và đối tác.
                  </p>
                  <p>
                    Chúng tôi rất mong được sớm tiếp đón Quý khách tại bàn quen trong bữa tiệc thăng hoa sắp tới.
                  </p>
                  <div className="mt-4 flex items-end justify-between pt-2">
                    <div className="text-[11px] text-stone-500">
                      <p>Hotline Thượng khách: 0903 123 456</p>
                      <p>195 Nam Kỳ Khởi Nghĩa, Q.3, TP.HCM</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif italic text-amber-200 text-sm">Vũ Trí Tuệ</p>
                      <p className="text-[11px] font-semibold text-stone-300">Executive Chef &amp; Ban Quản Lý</p>
                      <p className="text-[10px] text-stone-500">TRẦM Reserve</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Email */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="rounded-xl border-stone-300 text-xs font-semibold text-stone-700 hover:border-amber-600 hover:text-amber-900"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Đã chép nội dung
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Sao chép thư
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className={`rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                    emailSent
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-[#b45309] hover:bg-[#92400e]"
                  }`}
                >
                  {isSendingEmail ? (
                    <>
                      <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang gửi email...
                    </>
                  ) : emailSent ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Đã gửi thư chúc mừng
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Gửi Email Chúc Mừng Lên Hạng
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: ZALO ZNS PREVIEW */}
            <TabsContent value="zalo" className="mt-4 space-y-4">
              {/* Smartphone Chat Bubble Mockup */}
              <div className="mx-auto max-w-md rounded-2xl border-2 border-stone-200 bg-[#f4f5f7] p-4 shadow-sm">
                {/* Zalo Header */}
                <div className="flex items-center gap-2.5 border-b border-stone-200/80 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0068ff] font-bold text-white shadow-xs">
                    TR
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-heading text-xs font-bold text-stone-900">
                        TRẦM Reserve - Fine Dining
                      </span>
                      <CheckCircle2 className="h-3.5 w-3.5 fill-[#0068ff] text-white" />
                    </div>
                    <p className="text-[10px] text-stone-500 font-medium">
                      Official Account · Tin nhắn ZNS tự động
                    </p>
                  </div>
                </div>

                {/* Zalo ZNS Card Bubble */}
                <div className="mt-3 rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs space-y-3">
                  {/* Top Tag */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                      <Sparkles className="h-3 w-3 text-amber-600" />
                      THÔNG BÁO VINH DANH THĂNG HẠNG
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">ZNS</span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-heading text-sm font-bold text-stone-900">
                      Chúc Mừng Quý Khách Đã Lên {newTierConfig.name}!
                    </h5>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Kính gửi Thượng khách <strong>{customerName}</strong>, TRẦM Reserve trân trọng chúc mừng Quý khách đã chính thức vượt mốc <strong>{milestone} lượt đến</strong> và được nâng hạng lên <strong>{newTierConfig.name}</strong>.
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="rounded-lg bg-stone-50 p-2.5 text-xs space-y-1.5 border border-stone-100">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thành viên:</span>
                      <span className="font-semibold text-stone-900">{customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số điện thoại:</span>
                      <span className="font-mono text-stone-800">{phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hạng mới:</span>
                      <span className="font-bold text-amber-800">{newTierConfig.name} ({newTierConfig.tagline})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cột mốc vinh danh:</span>
                      <span className="font-bold text-stone-900">{milestone} lượt đến</span>
                    </div>
                    <div className="flex justify-between border-t border-stone-200 pt-1">
                      <span className="text-muted-foreground">Điểm tích lũy:</span>
                      <span className="font-extrabold text-[#92400e]">{formatPoints(points)} pts</span>
                    </div>
                  </div>

                  {/* Highlight Perk */}
                  <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs text-amber-900 space-y-1">
                    <p className="font-bold flex items-center gap-1 text-[11px]">
                      <Gift className="h-3.5 w-3.5 text-amber-700" />
                      Đặc quyền nổi bật đã kích hoạt:
                    </p>
                    <p className="text-[11px] text-stone-700 leading-snug">
                      {isNamTram
                        ? "• Miễn 100% tiền đặt cọc khi đặt bàn trực tuyến\n• Món tasting bếp trưởng độc bản mỗi mùa\n• Ưu tiên xếp Bàn VIP"
                        : "• Thưởng thêm +5% điểm hóa đơn\n• Trà chào mừng thượng hạng chế tác riêng\n• Miễn phí mở 01 chai vang quý"}
                    </p>
                  </div>

                  {/* Mock CTA Buttons inside Zalo */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex h-9 items-center justify-center rounded-lg bg-[#0068ff] text-xs font-bold text-white shadow-2xs">
                      Xem Chi Tiết Đặc Quyền &amp; Thẻ VIP
                    </div>
                    <div className="flex h-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700">
                      Đặt Trước Bàn Quen Trực Tuyến
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Zalo */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyZalo}
                  className="rounded-xl border-stone-300 text-xs font-semibold text-stone-700 hover:border-blue-600 hover:text-blue-800"
                >
                  {copiedZalo ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Đã chép tin Zalo
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Sao chép tin Zalo
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  onClick={handleSendZalo}
                  disabled={isSendingZalo}
                  className={`rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                    zaloSent
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-[#0068ff] hover:bg-[#0055d4]"
                  }`}
                >
                  {isSendingZalo ? (
                    <>
                      <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang gửi tin Zalo...
                    </>
                  ) : zaloSent ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Đã gửi Zalo ZNS
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Gửi Tin Zalo ZNS Chúc Mừng
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer Close */}
          <div className="mt-5 border-t border-stone-200 pt-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full h-10 rounded-full border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Đóng hộp thoại
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
