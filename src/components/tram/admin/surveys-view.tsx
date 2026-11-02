"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Star,
  Sparkles,
  UtensilsCrossed,
  HeartHandshake,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Award,
  MapPin,
  Send,
  Gift,
  CheckCircle2,
  Smartphone,
  Tag,
  Trophy,
  Filter,
  Search,
  CornerDownRight,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Check,
  Clock,
  Music,
  Wine,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import type {
  SurveyStatsDTO,
  ReservationDTO,
  GoogleMapsReviewDTO,
  GoogleMapsSyncStats,
} from "@/lib/tram/types";
import { SurveyDialog } from "../survey/survey-dialog";

export function AdminSurveys() {
  const [activeTab, setActiveTab] = useState<"google" | "internal">("google");

  // State cho FR-24: Google Maps
  const [gStats, setGStats] = useState<GoogleMapsSyncStats | null>(null);
  const [gReviews, setGReviews] = useState<GoogleMapsReviewDTO[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [searchG, setSearchG] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [starFilter, setStarFilter] = useState<number | 0>(0);

  // State cho Modal Trả lời review Google Maps
  const [replyingReview, setReplyingReview] = useState<GoogleMapsReviewDTO | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // State cho FR-23: Modal mời đánh giá qua SMS / Zalo
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteChannel, setInviteChannel] = useState<"SMS" | "ZALO">("ZALO");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccessData, setInviteSuccessData] = useState<{
    phone: string;
    channel: string;
    messageContent: string;
  } | null>(null);

  // State khảo sát nội bộ (FR-24)
  const [stats, setStats] = useState<SurveyStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatedReservations, setSeatedReservations] = useState<ReservationDTO[]>([]);
  const [selectedRes, setSelectedRes] = useState<ReservationDTO | null>(null);
  const [searchInternal, setSearchInternal] = useState("");
  const [internalStarFilter, setInternalStarFilter] = useState<number | 0>(0);
  const [internalRecommendFilter, setInternalRecommendFilter] = useState<"all" | "yes" | "no">("all");

  // Tải dữ liệu Google Maps & Khảo sát nội bộ
  const loadData = useCallback(async (isManualSync = false) => {
    if (isManualSync) setSyncing(true);
    else setLoading(true);

    try {
      // 1. Tải dữ liệu Places API (FR-24)
      const resG = await fetch(`/api/surveys/google-maps${isManualSync ? "?sync=true" : ""}`);
      if (resG.ok) {
        const dataG = await resG.json();
        setGStats(dataG.stats);
        setGReviews(dataG.reviews);
        if (isManualSync) {
          toast.success("Đã đồng bộ 128 đánh giá mới nhất từ Google Places API!", {
            description: "Điểm trung bình: 4.9 · Vượt trội +0.6 so với khu vực.",
          });
        }
      }

      // 2. Tải thống kê surveys nội bộ
      const resStats = await fetch("/api/surveys");
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }

      // 3. Tải danh sách khách đã dùng bữa (SEATED) để phục vụ mời đánh giá & test
      const resCust = await fetch("/api/customers");
      if (resCust.ok) {
        const dataCust = await resCust.json();
        const seated: ReservationDTO[] = [];
        dataCust.customers?.forEach((c: { reservations: ReservationDTO[] }) => {
          c.reservations?.forEach((r) => {
            if (r.status === "SEATED") seated.push(r);
          });
        });
        setSeatedReservations(seated.slice(0, 10));
      }
    } catch {
      toast.error("Không tải được dữ liệu đánh giá.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Bộ lọc review Google Maps
  const filteredGReviews = useMemo(() => {
    return gReviews.filter((r) => {
      if (searchG.trim()) {
        const q = searchG.toLowerCase();
        const matchName = r.authorName.toLowerCase().includes(q);
        const matchContent = r.content.toLowerCase().includes(q);
        const matchPhone = r.depositPhone?.includes(q);
        const matchCust = r.customerName?.toLowerCase().includes(q);
        if (!matchName && !matchContent && !matchPhone && !matchCust) return false;
      }
      if (selectedTag && !r.tags.includes(selectedTag)) return false;
      if (starFilter > 0 && r.rating !== starFilter) return false;
      return true;
    });
  }, [gReviews, searchG, selectedTag, starFilter]);

  // Phân bố sao khảo sát nội bộ (FR-24)
  const internalStarDistribution = useMemo(() => {
    if (stats?.starDistribution && stats.starDistribution.length > 0) {
      return stats.starDistribution;
    }
    const surveys = stats?.recentSurveys ?? [];
    const total = surveys.length;
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const s of surveys) {
      const r = Math.min(5, Math.max(1, Math.round(s.rating || 5)));
      counts[r] = (counts[r] || 0) + 1;
    }
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star] || 0,
      percent: total > 0 ? Number(((counts[star] / total) * 100).toFixed(1)) : 0,
    }));
  }, [stats]);

  // Bộ lọc nhận xét khảo sát nội bộ theo mã, tên, SĐT, số sao và giới thiệu (FR-24)
  const filteredInternalSurveys = useMemo(() => {
    if (!stats?.recentSurveys) return [];
    return stats.recentSurveys.filter((s) => {
      if (searchInternal.trim()) {
        const q = searchInternal.toLowerCase().trim();
        const matchCode = s.reservationCode?.toLowerCase().includes(q);
        const matchName = s.customerName?.toLowerCase().includes(q);
        const matchPhone = s.phone?.includes(q);
        const matchComment = s.comment?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchPhone && !matchComment) return false;
      }
      if (internalStarFilter > 0 && s.rating !== internalStarFilter) return false;
      if (internalRecommendFilter === "yes" && !s.recommend) return false;
      if (internalRecommendFilter === "no" && s.recommend) return false;
      return true;
    });
  }, [stats?.recentSurveys, searchInternal, internalStarFilter, internalRecommendFilter]);

  // Xử lý gửi trả lời review Google Maps (FR-24)
  async function handleSendReply() {
    if (!replyingReview || !replyText.trim()) {
      toast.error("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    setSubmittingReply(true);
    try {
      const res = await fetch("/api/surveys/google-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          reviewId: replyingReview.id,
          replyContent: replyText.trim(),
          repliedBy: "Quản lý nhà hàng TRẦM Reserve",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Cập nhật state local
      setGReviews((prev) =>
        prev.map((r) => (r.id === replyingReview.id ? data.review : r)),
      );
      toast.success("Đã đăng phản hồi công khai lên Google Maps!", {
        description: `Phản hồi cho thực khách ${replyingReview.authorName} đã xuất hiện trực tuyến.`,
      });
      setReplyingReview(null);
      setReplyText("");
    } catch (err: any) {
      toast.error(err.message || "Lỗi đăng phản hồi.");
    } finally {
      setSubmittingReply(false);
    }
  }

  // Xử lý tặng 200 điểm tri ân cho khách đánh giá Google Maps (FR-24 & FR-20)
  async function handleAwardPoints(review: GoogleMapsReviewDTO) {
    try {
      const res = await fetch("/api/surveys/google-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reward",
          reviewId: review.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGReviews((prev) =>
        prev.map((r) => (r.id === review.id ? data.review : r)),
      );
      toast.success("Tặng +200 điểm tri ân thành công!", {
        description: `Đã cộng 200 điểm thành viên cho khách hàng qua SĐT đặt cọc ${review.depositPhone}.`,
      });
    } catch (err: any) {
      toast.error(err.message || "Lỗi tặng điểm tri ân.");
    }
  }

  // Xử lý gửi lời mời đánh giá Google Maps qua SMS/Zalo (FR-23)
  async function handleSendInvite() {
    if (!invitePhone.trim()) {
      toast.error("Vui lòng nhập số điện thoại đặt cọc của khách hàng.");
      return;
    }
    setInviteSending(true);
    try {
      const res = await fetch("/api/surveys/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: invitePhone.trim(),
          customerName: inviteName.trim() || undefined,
          channel: inviteChannel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInviteSuccessData(data.data);
      toast.success(data.message, {
        description: "Khách hàng nhận được liên kết Google Maps và ưu đãi +200 điểm tích lũy.",
      });
    } catch (err: any) {
      toast.error(err.message || "Lỗi gửi lời mời.");
    } finally {
      setInviteSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Tabs Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Đánh Giá &amp; Khảo Sát Thực Khách
          </h2>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData(true)}
            disabled={syncing}
            className="h-9 rounded-full border-stone-300 text-xs shadow-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin text-[#b45309]" : ""}`} />
            {syncing ? "Đang đồng bộ..." : "Đồng bộ"}
          </Button>

          {/* Nút mở modal mời đánh giá SMS/Zalo (FR-23) */}
          <Button
            size="sm"
            onClick={() => {
              setInviteSuccessData(null);
              setShowInviteModal(true);
            }}
            className="h-9 rounded-full bg-[#b45309] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#92400e]"
          >
            <Smartphone className="mr-1.5 h-3.5 w-3.5" />
            Mời đánh giá SMS/Zalo
          </Button>
        </div>
      </div>

      {/* Tabs Chuyển đổi: Google Maps (FR-24 & FR-23) vs Khảo sát nội bộ */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "google" | "internal")}
        className="w-full"
      >
        <TabsList className="bg-stone-200/70 p-1">
          <TabsTrigger
            value="google"
            className="flex items-center gap-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#b45309] data-[state=active]:shadow-xs"
          >
            <MapPin className="h-3.5 w-3.5 text-red-500" />
            Đánh giá Google Maps (Places API)
            <Badge className="ml-1 bg-amber-500/20 text-[#92400e] text-[10px] font-bold border-0 px-1.5 py-0">
              4.9
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="internal"
            className="flex items-center gap-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-xs"
          >
            <HeartHandshake className="h-3.5 w-3.5 text-stone-600" />
            Khảo sát 5 sao nội bộ ({stats?.totalSurveys ?? 0})
          </TabsTrigger>
        </TabsList>


        <TabsContent value="google" className="space-y-6 mt-4">

          <div className="grid gap-4 md:grid-cols-3">
            {/* Widget 1: Điểm TB so với khu vực (FR-24) */}
            <Card className="border-border/80 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Điểm TB so với khu vực
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-amber-950 font-bold">
                    <Trophy className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-heading text-4xl font-extrabold text-[#92400e]">
                    {gStats?.overallRating ?? "4.9"}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">/ 5.0 </span>
                </div>

                { }
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                    <TrendingUp className="h-3 w-3" />
                    +{gStats?.ratingDifference ?? "0.6"}★
                  </span>
                  <span className="text-stone-600 font-medium">
                    so với TB khu vực Q1 ({gStats?.regionalAvgRating ?? "4.3"}★)
                  </span>
                </div>

                <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed border-t border-amber-900/10 pt-2">
                  Dựa trên <strong>{gStats?.totalReviews ?? 128}</strong> đánh giá xác thực trên Google Maps. Thuộc Top 1% ẩm thực cao cấp tại TP.HCM.
                </p>
              </CardContent>
            </Card>

            {/* Widget 2: Phân bố sao Google Maps (FR-24) */}
            <Card className="border-border/80 bg-card shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Phân bố sao đánh giá
                  </span>
                  <span className="text-xs text-muted-foreground">
                    128 lượt đánh giá
                  </span>
                </div>

                <div className="space-y-1.5 mt-2">
                  {(gStats?.starDistribution ?? []).map((item) => (
                    <div
                      key={item.star}
                      onClick={() => setStarFilter(starFilter === item.star ? 0 : item.star)}
                      className={`flex items-center gap-2 text-xs cursor-pointer rounded px-1.5 py-0.5 transition-colors ${starFilter === item.star ? "bg-amber-100/70 font-semibold" : "hover:bg-stone-50"
                        }`}
                      title={`Bấm để lọc đánh giá ${item.star} sao`}
                    >
                      <span className="w-8 shrink-0 flex items-center gap-0.5 text-stone-700">
                        {item.star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${item.star === 5
                              ? "bg-amber-500"
                              : item.star === 4
                                ? "bg-amber-400"
                                : item.star === 3
                                  ? "bg-amber-300"
                                  : "bg-stone-300"
                            }`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-[11px] text-stone-500 font-mono">
                        {item.count} ({item.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Widget 3: Tag nổi bật / Place Topics (FR-24) */}
            <Card className="border-border/80 bg-card shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Tag nổi bật (Places Topics)
                  </span>
                  <Tag className="h-4 w-4 text-[#b45309]" />
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Từ khóa khách hàng nhắc đến nhiều nhất trong các đánh giá:
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {(gStats?.highlightTags ?? []).map((t) => {
                    const isSelected = selectedTag === t.tag;
                    return (
                      <button
                        key={t.tag}
                        onClick={() => setSelectedTag(isSelected ? null : t.tag)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${isSelected
                            ? "bg-[#b45309] text-white shadow-xs"
                            : "bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100"
                          }`}
                      >
                        <span>{t.tag}</span>
                        <span className={`text-[10px] font-bold ${isSelected ? "text-amber-200" : "text-amber-700"}`}>
                          ({t.count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FR-24 Row 2: Bộ lọc & Tìm kiếm Review Google Maps */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchG}
                onChange={(e) => setSearchG(e.target.value)}
                placeholder="Tìm theo tên reviewer, SĐT đặt cọc hoặc nội dung..."
                className="pl-9 h-9 text-xs bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Star Filter Quick Buttons */}
              <div className="flex items-center gap-1 border-r border-border pr-2">
                <button
                  onClick={() => setStarFilter(0)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${starFilter === 0 ? "bg-[#b45309] text-white" : "text-stone-600 hover:bg-stone-100"
                    }`}
                >
                  Tất cả sao
                </button>
                <button
                  onClick={() => setStarFilter(5)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${starFilter === 5 ? "bg-amber-600 text-white" : "text-amber-800 hover:bg-amber-50"
                    }`}
                >
                  5 <Star className="h-3 w-3 fill-amber-400" />
                </button>
                <button
                  onClick={() => setStarFilter(4)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${starFilter === 4 ? "bg-amber-600 text-white" : "text-stone-600 hover:bg-stone-100"
                    }`}
                >
                  4 <Star className="h-3 w-3 fill-stone-400" />
                </button>
              </div>

              {selectedTag && (
                <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 font-medium">
                  <span>Tag: {selectedTag}</span>
                  <button onClick={() => setSelectedTag(null)} className="hover:text-amber-950 font-bold ml-1">
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FR-24 Row 3: Danh sách Review Google Maps */}
          <div className="space-y-4">
            {filteredGReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-card p-12 text-center">
                <Filter className="mx-auto h-8 w-8 text-stone-400" />
                <h3 className="mt-2 text-base font-semibold text-stone-700">
                  Không tìm thấy đánh giá Google Maps nào
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hãy thử xóa bộ lọc tìm kiếm hoặc tag để xem toàn bộ danh sách.
                </p>
              </div>
            ) : (
              filteredGReviews.map((rev) => (
                <Card
                  key={rev.id}
                  className="border-border/80 bg-card shadow-xs hover:border-amber-400/60 transition-all"
                >
                  <CardContent className="p-5">
                    {/* Header: Reviewer Info & Rating */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-[#b45309] border border-amber-300">
                          {rev.authorName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-[#292524]">{rev.authorName}</h4>
                            {rev.isLocalGuide && (
                              <Badge className="bg-orange-100 text-orange-900 text-[10px] font-semibold border-orange-200">
                                Local Guide · Cấp {rev.localGuideLevel}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <div className="flex items-center text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${i < rev.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "fill-stone-200 text-stone-200"
                                    }`}
                                />
                              ))}
                            </div>
                            <span>·</span>
                            <span>{rev.relativeTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Nhận diện theo SĐT đặt cọc (FR-23 & FR-24) */}
                      {rev.depositPhone && (
                        <div className="flex flex-wrap items-center gap-1.5 self-start">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf0d5] border border-amber-300/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#92400e]">
                            <UserCheck className="h-3 w-3" />
                            SĐT đặt cọc: {rev.depositPhone}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Review text */}
                    <p className="mt-3 text-sm text-stone-800 leading-relaxed font-sans">
                      &ldquo;{rev.content}&rdquo;
                    </p>

                    {/* Highlighted Tags in Review */}
                    {rev.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {rev.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700 border border-stone-200"
                          >
                            <Tag className="h-2.5 w-2.5 text-[#b45309]" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Management Reply Section (FR-24: Trả lời review) */}
                    {rev.reply ? (
                      <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-amber-950 flex items-center gap-1">
                            <CornerDownRight className="h-3.5 w-3.5 text-[#b45309]" />
                            Phản hồi từ {rev.reply.repliedBy}:
                          </span>
                          <span className="text-[11px] text-muted-foreground">{rev.reply.repliedAt}</span>
                        </div>
                        <p className="text-xs text-stone-700 leading-relaxed pl-4">
                          {rev.reply.content}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-stone-400 italic">
                        Chưa có phản hồi từ nhà hàng.
                      </div>
                    )}

                    {/* Action Footer: Trả lời review & Tặng điểm tri ân (FR-24) */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-3">
                      <div className="flex items-center gap-2">
                        {/* Nút trả lời review */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyingReview(rev);
                            setReplyText(
                              rev.reply
                                ? rev.reply.content
                                : `TRẦM Reserve xin chân thành cảm ơn quý khách ${rev.authorName} đã dành thời gian chia sẻ cảm nhận tuyệt vời. Đội ngũ chúng tôi luôn trân trọng từng khoảnh khắc đón tiếp quý khách!`,
                            );
                          }}
                          className="h-8 rounded-lg border-stone-300 text-xs text-stone-700 hover:border-amber-600 hover:text-amber-800"
                        >
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                          {rev.reply ? "Sửa phản hồi" : "Trả lời review"}
                        </Button>
                      </div>

                      {/* Nút tặng 200 điểm tri ân (FR-24 & FR-20) */}
                      <div>
                        {rev.pointsAwarded ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
                            <Check className="h-3.5 w-3.5" />
                            Đã tặng 200 điểm tri ân
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => void handleAwardPoints(rev)}
                            className="h-8 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 px-3.5 text-xs font-semibold text-white shadow-xs hover:from-amber-700 hover:to-amber-800"
                          >
                            <Gift className="mr-1.5 h-3.5 w-3.5" />
                            Tặng 200 điểm tri ân
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>


        <TabsContent value="internal" className="space-y-6 mt-4">
          {/* 1. Header KPI: Điểm tổng quan, Tỷ lệ giới thiệu (NPS) & Điểm tri ân */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/80 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    Điểm trung bình tổng quan
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-amber-950 font-bold">
                    <Star className="h-4 w-4 fill-amber-950" />
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-[#92400e]">
                    {stats?.averageRating ?? "5.0"}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">/ 5.0 ⭐</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Dựa trên {stats?.totalSurveys ?? 0} lượt khảo sát nội bộ
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    Tỷ lệ giới thiệu (NPS)
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    <Sparkles className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-emerald-700">
                    {stats?.recommendPercent ?? 100}%
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">khách hàng</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Sẵn sàng giới thiệu bạn bè &amp; đối tác
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    Điểm tri ân sau khảo sát
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                    <Gift className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-[#b45309]">
                    +200
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">điểm / lượt</span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Tặng ngay vào tài khoản theo SĐT đặt cọc (FR-23)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2. Thống kê bốn tiêu chí chi tiết (FR-24) & Phân bố sao (FR-24) */}
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Cột trái (7 cols): Thống kê trung bình bốn tiêu chí */}
            <Card className="border-border/80 bg-card shadow-xs lg:col-span-7">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-[#292524] flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#b45309]" />
                    Trung bình bốn tiêu chí trải nghiệm (FR-24)
                  </CardTitle>
                  <span className="text-[11px] font-medium text-stone-500">Thang điểm 5.0 </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tiêu chí 1: Ẩm thực & Hương vị */}
                  <div className="rounded-xl border border-stone-200/80 bg-[#faf8f3] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <UtensilsCrossed className="h-4 w-4 text-orange-600" />
                        Ẩm thực &amp; Món ăn
                      </span>
                      <span className="font-mono text-sm font-bold text-orange-700">
                        {stats?.avgFood ?? "5.0"} ⭐
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-600 transition-all"
                        style={{ width: `${Math.min(100, ((stats?.avgFood ?? 5.0) / 5) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-stone-500">Menu tasting 7 món, gia vị &amp; nguyên liệu</p>
                  </div>

                  {/* Tiêu chí 2: Dịch vụ & Phục vụ */}
                  <div className="rounded-xl border border-stone-200/80 bg-[#faf8f3] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <HeartHandshake className="h-4 w-4 text-blue-600" />
                        Dịch vụ &amp; Phục vụ
                      </span>
                      <span className="font-mono text-sm font-bold text-blue-700">
                        {stats?.avgService ?? "5.0"}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                        style={{ width: `${Math.min(100, ((stats?.avgService ?? 5.0) / 5) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-stone-500">Chu đáo, thái độ nhân viên &amp; tốc độ lên món</p>
                  </div>

                  {/* Tiêu chí 3: Không gian & Âm nhạc */}
                  <div className="rounded-xl border border-stone-200/80 bg-[#faf8f3] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <Music className="h-4 w-4 text-purple-600" />
                        Không gian &amp; Âm nhạc
                      </span>
                      <span className="font-mono text-sm font-bold text-purple-700">
                        {stats?.avgAmbiance ?? "5.0"}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all"
                        style={{ width: `${Math.min(100, ((stats?.avgAmbiance ?? 5.0) / 5) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-stone-500">Ánh sáng ấm, riêng tư &amp; mùi trầm thư thái</p>
                  </div>

                  {/* Tiêu chí 4: Pairing Trà & Rượu */}
                  <div className="rounded-xl border border-stone-200/80 bg-[#faf8f3] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <Wine className="h-4 w-4 text-emerald-600" />
                        Pairing Trà &amp; Rượu
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-700">
                        {stats?.avgPairing ?? "5.0"}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                        style={{ width: `${Math.min(100, ((stats?.avgPairing ?? 5.0) / 5) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-stone-500">Trà Shan Tuyết độc bản &amp; vang nhập khẩu</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cột phải (5 cols): Phân bố sao khảo sát nội bộ (FR-24) */}
            <Card className="border-border/80 bg-card shadow-xs lg:col-span-5">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-[#292524] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    Phân bố sao khảo sát nội bộ (FR-24)
                  </CardTitle>
                  {internalStarFilter > 0 && (
                    <button
                      onClick={() => setInternalStarFilter(0)}
                      className="text-[11px] font-semibold text-amber-700 hover:underline"
                    >
                      Bỏ lọc sao
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {internalStarDistribution.map((item) => {
                  const isSelected = internalStarFilter === item.star;
                  return (
                    <button
                      key={item.star}
                      type="button"
                      onClick={() => setInternalStarFilter(isSelected ? 0 : item.star)}
                      className={`w-full text-left rounded-lg p-1.5 transition-colors flex items-center gap-2.5 text-xs hover:bg-amber-500/10 ${isSelected ? "bg-amber-500/15 ring-1 ring-amber-500" : ""
                        }`}
                    >
                      <span className="w-10 font-mono font-semibold text-stone-700 flex items-center gap-0.5 shrink-0">
                        {item.star} <Star className="h-3 w-3 fill-amber-400 text-amber-400 inline" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] font-semibold text-stone-800 shrink-0">
                        {item.count}
                      </span>
                      <span className="w-11 text-right text-[10px] text-muted-foreground shrink-0">
                        {item.percent}%
                      </span>
                    </button>
                  );
                })}
                <p className="text-[11px] text-stone-500 text-center pt-2">
                  Nhấp vào mức sao để lọc danh sách nhận xét bên dưới
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Thanh Demo gửi khảo sát nhanh */}
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
            <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Khảo sát thử nghiệm nhanh theo bàn đã phục vụ (SEATED):
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {seatedReservations.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRes(r)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-800 shadow-xs hover:border-amber-500 hover:text-amber-900 transition-colors"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <strong>{r.code}</strong> · {r.customerName} ({r.table.code})
                </button>
              ))}
            </div>
          </div>

          {/* Bảng danh sách Khảo sát mới nhất kèm Bộ lọc theo mã, tên, SĐT (FR-24) */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-[#292524] flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#b45309]" />
                    Ý kiến &amp; Đánh giá từ Thực khách (FR-24)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Thống kê khảo sát nội bộ: lọc nhận xét theo mã đặt bàn, tên khách hàng và SĐT
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {filteredInternalSurveys.length} / {stats?.recentSurveys?.length ?? 0} nhận xét
                  </Badge>
                  {(searchInternal || internalStarFilter > 0 || internalRecommendFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchInternal("");
                        setInternalStarFilter(0);
                        setInternalRecommendFilter("all");
                      }}
                      className="h-7 text-xs text-stone-600 hover:text-stone-900"
                    >
                      Đặt lại lọc
                    </Button>
                  )}
                </div>
              </div>

              {/* Thanh lọc nhận xét theo mã, tên, SĐT & số sao (FR-24) */}
              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    placeholder="Lọc nhận xét theo mã đặt bàn (TRM-...), tên khách hoặc số điện thoại..."
                    value={searchInternal}
                    onChange={(e) => setSearchInternal(e.target.value)}
                    className="h-9 pl-9 text-xs bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-stone-600 mr-1 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Lọc sao:
                  </span>
                  {[0, 5, 4, 3, 2, 1].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInternalStarFilter(s)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${internalStarFilter === s
                          ? "bg-[#b45309] text-white shadow-xs"
                          : "bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                        }`}
                    >
                      {s === 0 ? "Tất cả" : `${s}★`}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="tram-scroll overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="w-24">Mã đặt bàn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Ngày bữa tiệc</TableHead>
                      <TableHead className="text-center">Đánh giá 5 sao</TableHead>
                      <TableHead className="min-w-64">Cảm nhận &amp; Bốn tiêu chí</TableHead>
                      <TableHead className="text-center">Giới thiệu</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInternalSurveys.length > 0 ? (
                      filteredInternalSurveys.map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono font-bold text-amber-900 text-xs">
                            {s.reservationCode}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-stone-900 block text-xs">
                              {s.customerName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {s.phone}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-stone-700">
                            {s.date}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {s.rating}/5
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-stone-700 leading-relaxed">
                            {s.comment ? (
                              <span className="italic text-stone-800 block mb-1">
                                &ldquo;{s.comment}&rdquo;
                              </span>
                            ) : (
                              <span className="text-stone-400 block mb-1">Không để lại lời nhắn</span>
                            )}
                            <div className="flex flex-wrap gap-2 text-[10px] text-stone-600 font-medium">
                              <span className="bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">Món: {s.foodRating}</span>
                              <span className="bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">Dịch vụ: {s.serviceRating}</span>
                              <span className="bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">Không gian: {s.ambianceRating}</span>
                              <span className="bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">Pairing: {s.pairingRating}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {s.recommend ? (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
                                Có giới thiệu
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-stone-500">
                                Không
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <a
                              href={`/survey/${s.reservationCode}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:text-amber-800 hover:border-amber-400 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Xem trang
                            </a>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                          {searchInternal || internalStarFilter > 0
                            ? "Không tìm thấy nhận xét nào khớp với từ khóa tìm kiếm hoặc mức sao đã chọn."
                            : "Chưa có đánh giá khảo sát nào. Bấm vào một lượt đặt đã phục vụ ở trên để gửi khảo sát đầu tiên!"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      <Dialog
        open={replyingReview !== null}
        onOpenChange={(v) => !v && setReplyingReview(null)}
      >
        <DialogContent className="max-w-xl border-amber-900/20 bg-[#faf8f3] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#292524]">
              <MessageSquare className="h-5 w-5 text-[#b45309]" />
              Trả lời đánh giá Google Maps
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-600">
              Phản hồi công khai từ Quản lý nhà hàng TRẦM Reserve đến tài khoản Google Maps của thực khách.
            </DialogDescription>
          </DialogHeader>

          {replyingReview && (
            <div className="space-y-4 mt-2">
              {/* Review tóm tắt */}
              <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                  <span>{replyingReview.authorName}</span>
                  <span className="flex items-center text-amber-500 font-bold">
                    {replyingReview.rating}★
                  </span>
                </div>
                <p className="text-xs text-stone-700 italic">
                  &ldquo;{replyingReview.content}&rdquo;
                </p>
              </div>

              {/* Mẫu câu trả lời gợi ý chuẩn Fine-Dining */}
              <div>
                <p className="text-xs font-semibold text-stone-700 mb-1.5">
                  Mẫu phản hồi gợi ý nhanh (Bấm để điền):
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setReplyText(
                        `TRẦM Reserve trân trọng cảm ơn ${replyingReview.authorName} đã dành lời khen ngợi cho set menu và món bò Wagyu A5. Rất vinh hạnh được phục vụ quý khách trong bữa tiệc tinh tế này!`,
                      )
                    }
                    className="rounded-lg border border-stone-200 bg-white p-2 text-left text-[11px] text-stone-700 hover:border-amber-500 hover:bg-amber-50/50 transition-colors"
                  >
                    <strong>Mẫu 1:</strong> Lời khen về ẩm thực &amp; Wagyu
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyText(
                        `Kính gửi quý khách ${replyingReview.authorName}, sự hài lòng của quý khách với set trà pairing độc bản và phong cách phục vụ chu đáo là động lực lớn cho đội ngũ TRẦM Reserve. Hẹn sớm gặp lại quý khách!`,
                      )
                    }
                    className="rounded-lg border border-stone-200 bg-white p-2 text-left text-[11px] text-stone-700 hover:border-amber-500 hover:bg-amber-50/50 transition-colors"
                  >
                    <strong>Mẫu 2:</strong> Lời khen về Trà pairing &amp; Dịch vụ
                  </button>
                </div>
              </div>

              {/* Textarea soạn phản hồi */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">
                  Nội dung phản hồi từ TRẦM Reserve:
                </label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Nhập nội dung phản hồi công khai..."
                  className="text-xs bg-white resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReplyingReview(null)}
                  className="rounded-full text-xs"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleSendReply()}
                  disabled={submittingReply}
                  className="rounded-full bg-[#b45309] text-xs font-semibold text-white hover:bg-[#92400e]"
                >
                  {submittingReply ? "Đang gửi..." : "Đăng phản hồi Google Maps"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-2xl border-amber-900/20 bg-[#faf8f3] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#292524]">
              <Smartphone className="h-5 w-5 text-[#b45309]" />
              Mời khách đánh giá Google Maps qua SMS / Zalo
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-600">
              Gửi tin nhắn tự động nhận diện theo SĐT đặt cọc sau bữa ăn, kèm ưu đãi +200 điểm tri ân khi khách hoàn tất đánh giá.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 grid gap-6 md:grid-cols-2">
            {/* Cột trái: Form nhập thông tin & Chọn khách */}
            <div className="space-y-3.5">
              {/* Chọn nhanh từ danh sách khách đã dùng bữa (SEATED) */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Chọn khách hàng đã dùng bữa (SEATED):
                </label>
                <select
                  onChange={(e) => {
                    const found = seatedReservations.find((r) => r.phone === e.target.value);
                    if (found) {
                      setInvitePhone(found.phone);
                      setInviteName(found.customerName);
                    }
                  }}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-800 shadow-xs focus:border-amber-600 focus:outline-hidden"
                >
                  <option value="">-- Chọn khách từ danh sách check-in --</option>
                  {seatedReservations.map((r) => (
                    <option key={r.id} value={r.phone}>
                      {r.customerName} · {r.phone} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* SĐT đặt cọc */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  Số điện thoại đặt cọc (Bắt buộc):
                </label>
                <Input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="Ví dụ: 0903123456"
                  className="h-9 text-xs bg-white"
                />
              </div>

              {/* Tên khách hàng */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  Tên thực khách:
                </label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ví dụ: Anh Tuấn / Chị Lan"
                  className="h-9 text-xs bg-white"
                />
              </div>

              {/* Kênh gửi: SMS Brandname vs Zalo ZNS */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">
                  Kênh gửi tin nhắn (Mô phỏng):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteChannel("ZALO")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${inviteChannel === "ZALO"
                        ? "border-blue-600 bg-blue-50 text-blue-800 shadow-xs ring-1 ring-blue-500"
                        : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      }`}
                  >
                    <span className="font-bold text-blue-600">Zalo</span>
                    <span>ZNS Official</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteChannel("SMS")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${inviteChannel === "SMS"
                        ? "border-[#b45309] bg-[#fdf0d5] text-[#92400e] shadow-xs ring-1 ring-amber-500"
                        : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      }`}
                  >
                    <span>SMS</span>
                    <span>Brandname</span>
                  </button>
                </div>
              </div>

              {/* Nút gửi */}
              <Button
                onClick={() => void handleSendInvite()}
                disabled={inviteSending}
                className="w-full h-10 rounded-full bg-[#b45309] text-xs font-semibold text-white shadow-xs hover:bg-[#92400e]"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {inviteSending ? "Đang gửi tin nhắn..." : "Gửi lời mời mô phỏng ngay"}
              </Button>
            </div>

            {/* Cột phải: Khung mô phỏng điện thoại người nhận (Smartphone Mockup) */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-[270px] rounded-3xl border-4 border-stone-800 bg-stone-900 p-2.5 shadow-xl">
                {/* Loa thoại & notch */}
                <div className="mx-auto mb-2 h-3 w-16 rounded-full bg-stone-700" />

                {/* Màn hình điện thoại */}
                <div className="min-h-[290px] rounded-2xl bg-white p-3 flex flex-col justify-between text-[11px]">
                  {/* Header tin nhắn */}
                  <div className="border-b border-stone-200 pb-2 text-center">
                    <p className="font-bold text-stone-900">
                      {inviteChannel === "ZALO" ? "TRẦM Reserve Official" : "TRAM_RESERVE"}
                    </p>
                    <p className="text-[9px] text-stone-400">
                      {inviteChannel === "ZALO" ? "Tài khoản Zalo doanh nghiệp xác thực" : "Tin nhắn SMS Brandname"}
                    </p>
                  </div>

                  {/* Bong bóng tin nhắn */}
                  <div className="my-2 space-y-2">
                    <div
                      className={`rounded-2xl p-2.5 leading-relaxed shadow-xs ${inviteChannel === "ZALO"
                          ? "bg-blue-50/90 text-blue-950 border border-blue-200/60"
                          : "bg-amber-50 text-stone-900 border border-amber-200/80"
                        }`}
                    >
                      <p className="font-semibold text-[10px] text-[#b45309] mb-1">
                        TRẦM Reserve xin cảm ơn Quý khách!
                      </p>
                      <p className="text-[10px] text-stone-700">
                        Kính gửi {inviteName || "Quý khách"}, chúng tôi trân trọng kính mời Quý khách gửi đánh giá trải nghiệm tại:
                      </p>
                      <div className="mt-1.5 rounded-lg bg-white p-1.5 border border-amber-300 text-center">
                        <span className="font-bold text-[#b45309] text-[10px] flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3 text-red-500" />
                          maps.app.goo.gl/tram-reserve
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[9px] text-emerald-800 font-bold border-t border-dashed border-stone-300 pt-1">
                        <span> Quà tặng tri ân:</span>
                        <span>+200 điểm tích lũy</span>
                      </div>
                    </div>
                  </div>

                  {/* Trạng thái gửi */}
                  <div className="text-center text-[10px] text-stone-400">
                    {inviteSuccessData ? (
                      <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Đã gửi đến {invitePhone}
                      </span>
                    ) : (
                      "Sẵn sàng gửi lời mời"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Survey Dialog mở khi bấm thử nội bộ */}
      <SurveyDialog
        reservation={selectedRes}
        open={selectedRes !== null}
        onClose={() => setSelectedRes(null)}
        onSubmitted={() => {
          setSelectedRes(null);
          void loadData();
        }}
      />
    </div>
  );
}
