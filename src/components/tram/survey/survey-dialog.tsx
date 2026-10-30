"use client";

// FR-23: Khảo sát sau bữa ăn — Thăm dò năm sao gắn với lượt đã phục vụ (SEATED)
// Gửi sau khi check-in hoàn tất bữa ăn tại TRẦM Reserve
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Star,
  CheckCircle2,
  Sparkles,
  UtensilsCrossed,
  HeartHandshake,
  Music,
  Wine,
  Send,
  ThumbsUp,
  Receipt,
  Gift,
  Loader2,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatLongDate } from "@/lib/tram/format";
import type { ReservationDTO, SurveyDTO } from "@/lib/tram/types";

interface SurveyDialogProps {
  reservation: ReservationDTO | null;
  open: boolean;
  onClose: () => void;
  onSubmitted?: (survey: SurveyDTO) => void;
}

const RATING_DESCRIPTIONS: Record<number, { title: string; color: string }> = {
  1: { title: "Chưa hài lòng", color: "text-rose-600" },
  2: { title: "Cần cải thiện", color: "text-orange-600" },
  3: { title: "Tương đối tốt", color: "text-amber-600" },
  4: { title: "Rất hài lòng", color: "text-emerald-700" },
  5: { title: "Tuyệt hảo · Xứng tầm Fine-Dining", color: "text-[#b45309]" },
};

export function SurveyDialog({
  reservation,
  open,
  onClose,
  onSubmitted,
}: SurveyDialogProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [ambianceRating, setAmbianceRating] = useState(5);
  const [pairingRating, setPairingRating] = useState(5);

  const [comment, setComment] = useState("");
  const [recommend, setRecommend] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [existingSurvey, setExistingSurvey] = useState<SurveyDTO | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing survey if available
  useEffect(() => {
    if (!reservation?.code || !open) return;
    setSubmittedSuccess(false);

    if (reservation.survey) {
      setExistingSurvey(reservation.survey);
      setRating(reservation.survey.rating);
      setFoodRating(reservation.survey.foodRating);
      setServiceRating(reservation.survey.serviceRating);
      setAmbianceRating(reservation.survey.ambianceRating);
      setPairingRating(reservation.survey.pairingRating);
      setComment(reservation.survey.comment || "");
      setRecommend(reservation.survey.recommend);
      return;
    }

    setLoading(true);
    fetch(`/api/surveys?code=${encodeURIComponent(reservation.code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.survey) {
          setExistingSurvey(data.survey);
          setRating(data.survey.rating);
          setFoodRating(data.survey.foodRating);
          setServiceRating(data.survey.serviceRating);
          setAmbianceRating(data.survey.ambianceRating);
          setPairingRating(data.survey.pairingRating);
          setComment(data.survey.comment || "");
          setRecommend(data.survey.recommend);
        } else {
          setExistingSurvey(null);
          setRating(5);
          setFoodRating(5);
          setServiceRating(5);
          setAmbianceRating(5);
          setPairingRating(5);
          setComment("");
          setRecommend(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reservation, open]);

  async function handleSubmit() {
    if (!reservation) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: reservation.code,
          rating,
          foodRating,
          serviceRating,
          ambianceRating,
          pairingRating,
          comment,
          recommend,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không gửi được đánh giá.");
        return;
      }

      setSubmittedSuccess(true);
      setExistingSurvey(data.survey);
      toast.success("Cảm ơn Quý khách! Đã ghi nhận đánh giá và cộng +200 điểm thưởng.");
      if (onSubmitted) onSubmitted(data.survey);
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!reservation) return null;

  const currentDisplayRating = hoverRating ?? rating;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl border-amber-900/20 bg-[#faf8f3] p-0 overflow-hidden shadow-2xl [&_[data-slot=dialog-close]]:text-stone-200 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:bg-black/35 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:z-20">
        <DialogHeader className="sr-only">
          <DialogTitle>Khảo sát sau bữa ăn — TRẦM Reserve</DialogTitle>
          <DialogDescription>
            Đánh giá năm sao gắn với lượt đã phục vụ cho mã {reservation.code}
          </DialogDescription>
        </DialogHeader>

        {/* Header sang trọng */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#292524] via-[#44403c] to-[#1c1917] p-6 text-white">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-amber-400/10 blur-xl" />
          <div className="absolute left-1/3 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-lg" />

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold tracking-widest text-amber-300 uppercase">
                Khảo sát sau bữa ăn
              </span>
            </div>

            <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight text-white">
              Cảm nhận Bữa tiệc tại TRẦM
            </h3>
            <p className="mt-1 text-xs text-stone-300 leading-relaxed">
              Mã đặt bàn: <strong className="text-amber-300">{reservation.code}</strong> · Khách:{" "}
              <strong>{reservation.customerName}</strong> ({reservation.phone}) · Bàn {reservation.table.code}
            </p>
          </div>
        </div>

        {/* Nội dung Khảo sát */}
        <div className="tram-scroll max-h-[75vh] overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
              <p className="text-sm">Đang tải thông tin khảo sát...</p>
            </div>
          ) : submittedSuccess || existingSurvey ? (
            /* Trạng thái đã hoàn tất khảo sát */
            <div className="space-y-5 text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-md"
              >
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>

              <div>
                <h4 className="font-heading text-xl font-bold text-stone-900">
                  Cảm ơn Quý khách đã đánh giá!
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ý kiến của Quý khách là nguồn động lực quý báu để TRẦM Reserve hoàn thiện phong vị fine-dining.
                </p>
              </div>

              {/* Tóm tắt điểm đã đánh giá */}
              <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50 to-[#fffdf9] p-5 shadow-xs text-left space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Đánh giá tổng quan
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-5 w-5 ${
                          s <= (existingSurvey?.rating ?? rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-stone-300"
                        }`}
                      />
                    ))}
                    <span className="ml-1.5 font-bold text-amber-900 text-sm">
                      {existingSurvey?.rating ?? rating}/5
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-stone-700 pt-1">
                  <p className="flex justify-between">
                    <span>🍲 Ẩm thực:</span>
                    <strong>{existingSurvey?.foodRating ?? foodRating}/5 ⭐</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>🤵 Phục vụ:</span>
                    <strong>{existingSurvey?.serviceRating ?? serviceRating}/5 ⭐</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>🕯️ Không gian:</span>
                    <strong>{existingSurvey?.ambianceRating ?? ambianceRating}/5 ⭐</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>🍷 Thức uống:</span>
                    <strong>{existingSurvey?.pairingRating ?? pairingRating}/5 ⭐</strong>
                  </p>
                </div>

                {(existingSurvey?.comment || comment) && (
                  <div className="rounded-lg bg-white/80 p-3 text-xs italic text-stone-800 border border-amber-200/50">
                    &ldquo;{existingSurvey?.comment || comment}&rdquo;
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-950 font-medium">
                  <Gift className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>
                    Đã cộng <strong>+200 điểm thưởng tri ân</strong> vào hồ sơ hội viên của Quý khách!
                  </span>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="min-w-44 h-11 rounded-full bg-[#b45309] font-semibold text-white shadow-md hover:bg-[#92400e]"
              >
                Đóng hộp thoại
              </Button>
            </div>
          ) : (
            /* Form nhập khảo sát */
            <>
              {/* Điểm tổng quan 5 sao */}
              <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50/70 to-card p-5 text-center shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-amber-900 block mb-2">
                  1. Mức độ hài lòng tổng quan của Quý khách
                </Label>

                {/* Star rating component */}
                <div className="my-3 flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= currentDisplayRating;
                    return (
                      <motion.button
                        key={star}
                        type="button"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 focus:outline-hidden"
                        aria-label={`${star} sao`}
                      >
                        <Star
                          className={`h-9 w-9 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                              : "text-stone-300 hover:text-amber-200"
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                <p className={`text-sm font-bold tracking-tight transition-all ${RATING_DESCRIPTIONS[currentDisplayRating]?.color}`}>
                  {RATING_DESCRIPTIONS[currentDisplayRating]?.title}
                </p>
              </div>

              {/* 4 tiêu chí cụ thể */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  2. Đánh giá chi tiết các tiêu chí trải nghiệm
                </Label>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {/* Tiêu chí 1: Ẩm thực */}
                  <div className="rounded-xl border border-border bg-white p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <UtensilsCrossed className="h-3.5 w-3.5 text-[#b45309]" />
                        Món ăn &amp; Hương vị
                      </span>
                      <span className="text-xs font-bold text-amber-800">{foodRating} ⭐</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFoodRating(s)}
                          className="focus:outline-hidden"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              s <= foodRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-stone-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tiêu chí 2: Phục vụ */}
                  <div className="rounded-xl border border-border bg-white p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <HeartHandshake className="h-3.5 w-3.5 text-[#b45309]" />
                        Dịch vụ &amp; Chu đáo
                      </span>
                      <span className="text-xs font-bold text-amber-800">{serviceRating} ⭐</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setServiceRating(s)}
                          className="focus:outline-hidden"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              s <= serviceRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-stone-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tiêu chí 3: Không gian */}
                  <div className="rounded-xl border border-border bg-white p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <Music className="h-3.5 w-3.5 text-[#b45309]" />
                        Không gian &amp; Âm nhạc
                      </span>
                      <span className="text-xs font-bold text-amber-800">{ambianceRating} ⭐</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAmbianceRating(s)}
                          className="focus:outline-hidden"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              s <= ambianceRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-stone-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tiêu chí 4: Pairing */}
                  <div className="rounded-xl border border-border bg-white p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <Wine className="h-3.5 w-3.5 text-[#b45309]" />
                        Pairing &amp; Thức uống
                      </span>
                      <span className="text-xs font-bold text-amber-800">{pairingRating} ⭐</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPairingRating(s)}
                          className="focus:outline-hidden"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              s <= pairingRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-stone-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nhận xét & Đề xuất */}
              <div className="space-y-2">
                <Label htmlFor="survey-comment" className="text-xs font-semibold text-stone-700">
                  3. Góp ý hoặc chia sẻ món ăn Quý khách tâm đắc nhất (tùy chọn)
                </Label>
                <Textarea
                  id="survey-comment"
                  placeholder="vd: Món bắp bò sốt tiêu rừng rất thơm ngon, không gian ấm cúng..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-20 bg-white"
                />
              </div>

              {/* Giới thiệu bạn bè (NPS) */}
              <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 shadow-xs">
                <input
                  type="checkbox"
                  checked={recommend}
                  onChange={(e) => setRecommend(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="flex items-center gap-1.5 font-medium">
                  <ThumbsUp className="h-3.5 w-3.5 text-amber-700" />
                  Quý khách sẵn sàng giới thiệu TRẦM Reserve đến người thân và bạn bè.
                </span>
              </label>

              {/* Phần thưởng tri ân */}
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-transparent p-3 text-xs text-amber-950">
                <Gift className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  🎁 Tri ân ý kiến đóng góp: Nhận ngay <strong>+200 điểm thưởng</strong> tích lũy vào tài khoản hội viên sau khi hoàn tất.
                </span>
              </div>

              {/* Nút gửi */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={onClose} disabled={submitting}>
                  Để sau
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="h-11 min-w-44 rounded-full bg-[#b45309] font-bold text-white shadow-md shadow-[#b45309]/20 hover:bg-[#92400e]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Gửi đánh giá 5 sao
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
