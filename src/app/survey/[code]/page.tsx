"use client";

// Trang Khảo sát năm sao sau bữa ăn — TRẦM Reserve (FR-23)
// URL: /survey/[code]
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  Gift,
  Loader2,
  ArrowLeft,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/tram/format";
import type { ReservationDTO, SurveyDTO } from "@/lib/tram/types";

interface PageProps {
  params: Promise<{ code: string }>;
}

const RATING_DESCRIPTIONS: Record<number, { title: string; color: string }> = {
  1: { title: "Chưa hài lòng", color: "text-rose-600" },
  2: { title: "Cần cải thiện", color: "text-orange-600" },
  3: { title: "Tương đối tốt", color: "text-amber-600" },
  4: { title: "Rất hài lòng", color: "text-emerald-700" },
  5: { title: "Tuyệt hảo · Xứng tầm Fine-Dining", color: "text-[#b45309]" },
};

export default function SurveyPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();

  const [reservation, setReservation] = useState<ReservationDTO | null>(null);
  const [existingSurvey, setExistingSurvey] = useState<SurveyDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [ambianceRating, setAmbianceRating] = useState(5);
  const [pairingRating, setPairingRating] = useState(5);
  const [comment, setComment] = useState("");
  const [recommend, setRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/surveys?code=${encodeURIComponent(code)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setErrorMsg(data.error ?? "Không tìm thấy lượt đặt bàn.");
          return;
        }
        setReservation(data.reservation);
        if (data.survey) {
          setExistingSurvey(data.survey);
          setRating(data.survey.rating);
          setFoodRating(data.survey.foodRating);
          setServiceRating(data.survey.serviceRating);
          setAmbianceRating(data.survey.ambianceRating);
          setPairingRating(data.survey.pairingRating);
          setComment(data.survey.comment || "");
          setRecommend(data.survey.recommend);
        }
      })
      .catch(() => setErrorMsg("Lỗi kết nối máy chủ."))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
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
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentDisplayRating = hoverRating ?? rating;

  return (
    <div className="min-h-screen bg-[#faf8f3] text-[#292524] py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Top Logo */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-stone-700 hover:text-stone-900 transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            <span className="font-heading text-lg font-bold tracking-widest text-[#292524]">
              TRẦM
            </span>
          </Link>

          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-full">
              <Home className="mr-1.5 h-4 w-4" />
              Về trang chủ
            </Button>
          </Link>
        </div>

        {loading ? (
          <Card className="border-border p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#b45309]" />
            <p className="mt-3 text-sm text-muted-foreground">
              Đang tải khảo sát cho mã {code}...
            </p>
          </Card>
        ) : errorMsg ? (
          <Card className="border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
            <h2 className="font-heading text-xl font-bold text-destructive">
              Không thể mở khảo sát
            </h2>
            <p className="text-sm text-stone-700">{errorMsg}</p>
            <Link href="/">
              <Button className="rounded-full bg-[#b45309] text-white">
                Về trang chủ
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="border-amber-900/20 bg-card shadow-xl overflow-hidden">
            {/* Banner Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#292524] via-[#3a3532] to-[#1c1917] p-6 sm:p-8 text-white">
              <div className="absolute right-0 top-0 -mr-8 -mt-8 h-40 w-40 rounded-full bg-amber-400/10 blur-2xl" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  Khảo sát sau bữa ăn
                </span>
                <h1 className="mt-3 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Cảm nhận Bữa tiệc tại TRẦM Reserve
                </h1>
                {reservation && (
                  <p className="mt-2 text-xs text-stone-300 leading-relaxed">
                    Kính gửi <strong>{reservation.customerName}</strong> ({reservation.phone}) · Bàn{" "}
                    <strong>{reservation.table.code}</strong> · Ngày {formatLongDate(reservation.date).split(", ")[1]}
                  </p>
                )}
              </div>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {submittedSuccess || existingSurvey ? (
                <div className="py-6 text-center space-y-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-md"
                  >
                    <CheckCircle2 className="h-10 w-10" />
                  </motion.div>

                  <div>
                    <h2 className="font-heading text-2xl font-bold text-stone-900">
                      Cảm ơn Quý khách đã gửi đánh giá!
                    </h2>
                    <p className="mt-2 text-sm text-stone-600">
                      Mọi chia sẻ của Quý khách sẽ được Ban Điều hành và Bếp trưởng TRẦM Reserve lắng nghe để tiếp tục nâng tầm trải nghiệm ẩm thực.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50 to-[#fffdf9] p-6 text-left space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Đánh giá năm sao
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
                      <div className="rounded-lg bg-white/80 p-3.5 text-xs italic text-stone-800 border border-amber-200/50">
                        &ldquo;{existingSurvey?.comment || comment}&rdquo;
                      </div>
                    )}

                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-950 font-medium">
                      <Gift className="h-4 w-4 text-amber-700 shrink-0" />
                      <span>
                        TRẦM trân trọng tặng <strong>+200 điểm thưởng tri ân</strong> vào hồ sơ hội viên của Quý khách!
                      </span>
                    </div>
                  </div>

                  <Link href="/">
                    <Button className="rounded-full bg-[#b45309] font-bold text-white px-8">
                      Trở về trang chủ
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Rating 5 sao */}
                  <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50/80 to-[#fffdf9] p-6 text-center shadow-xs">
                    <Label className="text-xs font-bold uppercase tracking-wider text-amber-900 block mb-2">
                      1. Mức độ hài lòng tổng quan về buổi tiệc
                    </Label>

                    <div className="my-3 flex items-center justify-center gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= currentDisplayRating;
                        return (
                          <motion.button
                            key={star}
                            type="button"
                            whileHover={{ scale: 1.25 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            className="p-1 focus:outline-hidden"
                            aria-label={`${star} sao`}
                          >
                            <Star
                              className={`h-10 w-10 sm:h-12 sm:w-12 transition-colors ${
                                active
                                  ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                  : "text-stone-300 hover:text-amber-200"
                              }`}
                            />
                          </motion.button>
                        );
                      })}
                    </div>

                    <p
                      className={`text-base font-bold tracking-tight transition-all ${RATING_DESCRIPTIONS[currentDisplayRating]?.color}`}
                    >
                      {RATING_DESCRIPTIONS[currentDisplayRating]?.title}
                    </p>
                  </div>

                  {/* 4 tiêu chí chi tiết */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                      2. Đánh giá chi tiết từng phương diện
                    </Label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-white p-3.5 shadow-xs">
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

                      <div className="rounded-xl border border-border bg-white p-3.5 shadow-xs">
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

                      <div className="rounded-xl border border-border bg-white p-3.5 shadow-xs">
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

                      <div className="rounded-xl border border-border bg-white p-3.5 shadow-xs">
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

                  {/* Nhận xét */}
                  <div className="space-y-2">
                    <Label htmlFor="comment" className="text-xs font-semibold text-stone-700">
                      3. Chia sẻ cảm nhận hoặc góp ý cho Bếp trưởng (tùy chọn)
                    </Label>
                    <Textarea
                      id="comment"
                      placeholder="Món ăn Quý khách tâm đắc nhất, điều Quý khách thấy hài lòng nhất..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-24 bg-white"
                    />
                  </div>

                  {/* Sẵn sàng giới thiệu */}
                  <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-stone-200 bg-white p-3.5 text-xs text-stone-800 shadow-xs">
                    <input
                      type="checkbox"
                      checked={recommend}
                      onChange={(e) => setRecommend(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="flex items-center gap-1.5 font-medium">
                      <ThumbsUp className="h-4 w-4 text-amber-700" />
                      Tôi sẵn sàng giới thiệu TRẦM Reserve đến bạn bè, người thân và đối tác.
                    </span>
                  </label>

                  {/* Quà tri ân */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-transparent p-3.5 text-xs text-amber-950">
                    <Gift className="h-5 w-5 text-amber-700 shrink-0" />
                    <span>
                      🎁 Quà tri ân: Nhận ngay <strong>+200 điểm thưởng hội viên</strong> sau khi hoàn tất khảo sát.
                    </span>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full h-13 rounded-full bg-[#b45309] font-bold text-base text-white shadow-lg shadow-[#b45309]/25 hover:bg-[#92400e]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang gửi đánh giá...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Gửi khảo sát 5 sao &amp; Nhận 200 điểm
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
