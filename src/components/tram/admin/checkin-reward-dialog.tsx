"use client";

// FR-20: Hộp thoại chúc mừng tích điểm theo hóa đơn khi Check-in — TRẦM Reserve
// 1.000 đ = 1 điểm; thưởng 5–8% giá trị hóa đơn theo hạng thành viên

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Crown,
  Gem,
  Award,
  ShieldCheck,
  Star,
  CheckCircle2,
  TrendingUp,
  Receipt,
  ArrowRight,
  Send,
  ExternalLink,
  Copy,
  Check,
  MessageSquareHeart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/tram/format";
import { formatPoints, LOYALTY_TIERS } from "@/lib/tram/loyalty";
import type { LoyaltyTier } from "@/lib/tram/types";

export interface CheckinLoyaltyReward {
  reservationCode?: string;
  customerName: string;
  phone: string;
  billTotal: number;
  basePoints: number;
  bonusPercent: number;
  bonusPoints: number;
  totalEarnedPoints: number;
  currentTier: LoyaltyTier;
  currentTierName: string;
  newTier: LoyaltyTier;
  newTierName: string;
  isUpgraded: boolean;
  newTotalPoints: number;
}

interface CheckinRewardDialogProps {
  reward: CheckinLoyaltyReward | null;
  open: boolean;
  onClose: () => void;
}

export function CheckinRewardDialog({
  reward,
  open,
  onClose,
}: CheckinRewardDialogProps) {
  const [surveySent, setSurveySent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!reward) return null;

  const tierConfig = LOYALTY_TIERS[reward.newTier] ?? LOYALTY_TIERS.HUONG;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border-amber-900/20 bg-[#faf8f3] p-0 overflow-hidden shadow-2xl [&_[data-slot=dialog-close]]:text-stone-200 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:bg-black/30 [&_[data-slot=dialog-close]]:hover:bg-black/55 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:transition-all [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-white/15">
        <DialogHeader className="sr-only">
          <DialogTitle>Tích điểm thành công cho {reward.customerName}</DialogTitle>
          <DialogDescription>
            Cộng điểm theo hóa đơn theo quy tắc FR-20 (1.000 đ = 1 điểm, thưởng theo hạng).
          </DialogDescription>
        </DialogHeader>

        {/* Animated Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#854d0e] via-[#b45309] to-[#78350f] p-6 text-center text-white">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/20 blur-xl" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />

          {/* Glowing Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-stone-900 shadow-lg"
          >
            {reward.isUpgraded ? (
              <Crown className="h-7 w-7 text-amber-900" />
            ) : (
              <Star className="h-7 w-7 fill-amber-900 text-amber-900" />
            )}
          </motion.div>

          {reward.isUpgraded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-stone-900 shadow-md"
            >
              <Sparkles className="h-3.5 w-3.5" />
              CHÚC MỪNG THĂNG HẠNG!
            </motion.div>
          )}

          <h3 className="font-heading text-xl font-bold tracking-tight">
            Check-in & Tích Điểm Thành Công!
          </h3>
          <p className="mt-1 text-xs text-amber-100/90">
            Khách hàng <span className="font-semibold text-white">{reward.customerName}</span> · {reward.phone}
          </p>
        </div>

        {/* Points Breakdown Body */}
        <div className="space-y-4 p-5">
          {/* Total Earned Highlight Box */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-amber-300/80 bg-gradient-to-b from-amber-50 to-[#fffdf9] p-4 text-center shadow-xs"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
              Điểm thưởng tích lũy đợt này (FR-20)
            </span>
            <div className="mt-1 flex items-center justify-center gap-2">
              <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
              <span className="font-heading text-3xl font-extrabold tracking-tight text-[#92400e]">
                +{formatPoints(reward.totalEarnedPoints)}
              </span>
              <span className="text-sm font-bold text-amber-800">pts</span>
            </div>

            {/* Formula Breakdown */}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-amber-200/60 pt-3 text-xs">
              <div className="rounded-lg bg-white/70 p-2 text-stone-700">
                <span className="text-[10px] text-muted-foreground block">
                  Điểm cơ bản (1.000 đ = 1 pt)
                </span>
                <strong className="text-stone-900">
                  +{formatPoints(reward.basePoints)} pts
                </strong>
              </div>
              <div className="rounded-lg bg-white/70 p-2 text-stone-700">
                <span className="text-[10px] text-muted-foreground block">
                  Thưởng hạng ({reward.bonusPercent}%)
                </span>
                <strong className="text-amber-800">
                  +{formatPoints(reward.bonusPoints)} pts
                </strong>
              </div>
            </div>
          </motion.div>

          {/* Details Row */}
          <div className="space-y-2 rounded-xl border border-stone-200/90 bg-card p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" />
                Hóa đơn bữa ăn
              </span>
              <span className="font-bold text-[#292524]">
                {formatVND(reward.billTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Hạng thành viên
              </span>
              <div className="flex items-center gap-1 font-semibold text-stone-800">
                {reward.isUpgraded ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    {reward.currentTierName} <ArrowRight className="h-3 w-3" /> {reward.newTierName}
                  </span>
                ) : (
                  <span>{reward.newTierName}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-2">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-[#b45309]" />
                Tổng điểm mới tích lũy
              </span>
              <span className="font-extrabold text-[#92400e]">
                {formatPoints(reward.newTotalPoints)} pts
              </span>
            </div>
          </div>

          {/* FR-23: Khảo sát sau bữa ăn — Gửi link thăm dò 5 sao */}
          <div className="rounded-xl border border-amber-300/80 bg-gradient-to-b from-amber-50/70 to-[#fffdf9] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-950 uppercase tracking-wider">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                Khảo sát sau bữa ăn
              </span>
              <span className="text-[10px] rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 font-bold text-amber-900">
                Tặng +200 pts
              </span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Gửi lời mời thăm dò 5 sao đến thực khách <strong>{reward.customerName}</strong> để lắng nghe cảm nhận và tặng thêm +200 điểm thưởng.
            </p>

            {reward.reservationCode && (
              <div className="space-y-2 pt-1">
                {surveySent ? (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 space-y-1.5">
                    <p className="flex items-center gap-1.5 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Đã gửi lời mời Zalo/SMS tới {reward.phone}!
                    </p>
                    <p className="text-[11px] text-emerald-700 font-mono break-all">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/survey/${reward.reservationCode}`
                        : `/survey/${reward.reservationCode}`}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={surveySent ? "outline" : "default"}
                    onClick={() => {
                      setSurveySent(true);
                      toast.success(`Đã gửi link khảo sát 5 sao đến SĐT ${reward.phone}!`);
                    }}
                    className={
                      surveySent
                        ? "h-9 rounded-full text-xs"
                        : "h-9 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    }
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {surveySent ? "Gửi lại lời mời Zalo" : "Gửi link khảo sát 5 sao"}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = `${window.location.origin}/survey/${reward.reservationCode}`;
                      navigator.clipboard.writeText(url);
                      setCopied(true);
                      toast.success("Đã sao chép link khảo sát!");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="h-9 rounded-full text-xs border-stone-300"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                        Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Sao chép link
                      </>
                    )}
                  </Button>

                  <a
                    href={`/survey/${reward.reservationCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-amber-800 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Mở khảo sát
                  </a>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={onClose}
            className="w-full h-11 rounded-full bg-[#b45309] font-semibold text-white shadow-md hover:bg-[#92400e]"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Đã hoàn tất
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
