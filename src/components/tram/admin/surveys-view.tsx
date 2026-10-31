"use client";

// FR-24: Thống kê khảo sát — Điểm trung bình, phân bố sao, nhận xét theo mã đặt bàn
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Star,
  Sparkles,
  UtensilsCrossed,
  HeartHandshake,
  Music,
  Wine,
  ThumbsUp,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
  BarChart3,
  X,
  MessageSquareQuote,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SurveyStatsDTO, ReservationDTO } from "@/lib/tram/types";
import { SurveyDialog } from "../survey/survey-dialog";

export function AdminSurveys() {
  const [stats, setStats] = useState<SurveyStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatedReservations, setSeatedReservations] = useState<ReservationDTO[]>([]);
  const [selectedRes, setSelectedRes] = useState<ReservationDTO | null>(null);

  // FR-24: Bộ lọc & Tìm kiếm theo mã đặt bàn / mức sao / nhận xét
  const [searchTerm, setSearchTerm] = useState("");
  const [starFilter, setStarFilter] = useState<number | "ALL">("ALL");
  const [onlyWithComment, setOnlyWithComment] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tải thống kê surveys kèm phân bố sao
      const resStats = await fetch("/api/surveys");
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }

      // 2. Tải danh sách khách để lấy các lượt SEATED phục vụ test khảo sát
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
      toast.error("Không tải được dữ liệu khảo sát.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Lọc nhận xét theo mã đặt bàn, tên khách, SĐT và mức sao
  const filteredSurveys = useMemo(() => {
    if (!stats?.recentSurveys) return [];
    return stats.recentSurveys.filter((s) => {
      // 1. Lọc theo mức sao
      if (starFilter !== "ALL" && Math.round(s.rating) !== starFilter) {
        return false;
      }
      // 2. Lọc chỉ có nhận xét
      if (onlyWithComment && (!s.comment || s.comment.trim() === "")) {
        return false;
      }
      // 3. Tìm kiếm theo mã đặt bàn, tên khách hoặc SĐT
      if (searchTerm.trim() !== "") {
        const q = searchTerm.trim().toLowerCase();
        const matchCode = s.reservationCode.toLowerCase().includes(q);
        const matchName = s.customerName.toLowerCase().includes(q);
        const matchPhone = s.phone.toLowerCase().includes(q);
        const matchComment = s.comment?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchPhone && !matchComment) {
          return false;
        }
      }
      return true;
    });
  }, [stats?.recentSurveys, starFilter, onlyWithComment, searchTerm]);

  const hasActiveFilters = searchTerm !== "" || starFilter !== "ALL" || onlyWithComment;

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút tải lại */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309] text-white">
              <BarChart3 className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold tracking-widest text-[#b45309] uppercase">
              Thống kê &amp; Báo cáo chất lượng
            </span>
          </div>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Thống kê khảo sát sau bữa ăn
          </h2>
          <p className="text-xs text-muted-foreground">
            Phân tích điểm trung bình, phân bố sao và nhận xét chi tiết gắn liền với từng mã đặt bàn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="h-9 rounded-full border-stone-300 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KHỐI 1: TỔNG QUAN ĐIỂM TRUNG BÌNH & PHÂN BỐ SAO (FR-24) */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Cột trái: Điểm trung bình tổng quan & 4 tiêu chí cốt lõi (5 cols) */}
        <Card className="lg:col-span-5 border-border/80 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-stone-700 uppercase tracking-wider flex items-center justify-between">
              <span>Điểm trung bình thực khách</span>
              <span className="text-xs text-muted-foreground lowercase">
                {stats?.totalSurveys ?? 0} lượt đánh giá
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Big Score Hero */}
            <div className="flex items-center gap-4 border-b border-amber-200/50 pb-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md">
                <Star className="h-8 w-8 fill-white" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-4xl font-extrabold tracking-tight text-[#92400e]">
                    {stats?.averageRating ?? "5.0"}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">/ 5.0 ⭐</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= Math.round(stats?.averageRating ?? 5)
                          ? "fill-amber-400 text-amber-400"
                          : "text-stone-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xs font-semibold text-emerald-700">
                    {stats?.recommendPercent ?? 100}% hài lòng &amp; giới thiệu
                  </span>
                </div>
              </div>
            </div>

            {/* 4 tiêu chí chi tiết */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border/80 bg-white/80 p-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-amber-700" />
                    Ẩm thực
                  </span>
                  <strong className="font-heading text-sm text-[#92400e]">
                    {stats?.avgFood ?? "5.0"} ★
                  </strong>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${((stats?.avgFood ?? 5) / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-white/80 p-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <HeartHandshake className="h-3.5 w-3.5 text-blue-700" />
                    Phục vụ
                  </span>
                  <strong className="font-heading text-sm text-[#92400e]">
                    {stats?.avgService ?? "5.0"} ★
                  </strong>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${((stats?.avgService ?? 5) / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-white/80 p-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <Music className="h-3.5 w-3.5 text-purple-700" />
                    Không gian
                  </span>
                  <strong className="font-heading text-sm text-[#92400e]">
                    {stats?.avgAmbiance ?? "5.0"} ★
                  </strong>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${((stats?.avgAmbiance ?? 5) / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-white/80 p-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <Wine className="h-3.5 w-3.5 text-rose-700" />
                    Pairing
                  </span>
                  <strong className="font-heading text-sm text-[#92400e]">
                    {stats?.avgPairing ?? "5.0"} ★
                  </strong>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{ width: `${((stats?.avgPairing ?? 5) / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cột phải: Phân bố sao đánh giá 5★ -> 1★ (FR-24) (7 cols) */}
        <Card className="lg:col-span-7 border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-[#292524] flex items-center gap-2">
                  <span>Phân bố sao đánh giá</span>
                  {starFilter !== "ALL" && (
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-900 bg-amber-50">
                      Đang lọc: {starFilter}★
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bấm vào từng dòng sao để lọc nhanh danh sách nhận xét tương ứng bên dưới.
                </p>
              </div>

              {starFilter !== "ALL" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStarFilter("ALL")}
                  className="h-7 rounded-full text-xs text-amber-800 hover:text-amber-900"
                >
                  <X className="mr-1 h-3 w-3" />
                  Bỏ lọc sao
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-2.5 pt-1">
            {stats?.starDistribution && stats.starDistribution.length > 0 ? (
              stats.starDistribution.map((item) => {
                const isSelected = starFilter === item.star;
                return (
                  <button
                    key={item.star}
                    type="button"
                    onClick={() => setStarFilter(isSelected ? "ALL" : item.star)}
                    className={`group w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition-all ${
                      isSelected
                        ? "bg-amber-100/70 border border-amber-300 ring-1 ring-amber-400"
                        : "hover:bg-muted/60 border border-transparent"
                    }`}
                  >
                    {/* Star Label */}
                    <div className="flex items-center gap-1 w-16 shrink-0 text-xs font-bold text-stone-800">
                      <span>{item.star}</span>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-full transition-colors ${
                          item.star === 5
                            ? "bg-amber-500"
                            : item.star === 4
                            ? "bg-emerald-500"
                            : item.star === 3
                            ? "bg-yellow-500"
                            : item.star === 2
                            ? "bg-orange-500"
                            : "bg-rose-500"
                        }`}
                      />
                    </div>

                    {/* Votes & Percentage */}
                    <div className="w-24 shrink-0 text-right text-xs">
                      <strong className="text-stone-900">{item.count}</strong>
                      <span className="text-muted-foreground ml-1">({item.percent}%)</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Chưa có dữ liệu phân bố sao.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KHỐI 2: BẢNG NHẬN XÉT THEO MÃ ĐẶT BÀN (FR-24) */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-[#292524] flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-[#b45309]" />
                Nhận xét &amp; Đánh giá theo Mã đặt bàn
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hiển thị {filteredSurveys.length} / {stats?.recentSurveys?.length ?? 0} lượt phản hồi từ thực khách.
              </p>
            </div>

            {/* Thanh tìm kiếm theo mã đặt bàn, khách hàng */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm mã TRM-XXXX, tên, SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 text-xs bg-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Nút lọc sao nhanh */}
              <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-muted/40 p-1">
                {(["ALL", 5, 4, 3, 2, 1] as const).map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarFilter(star)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      starFilter === star
                        ? "bg-[#b45309] text-white shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {star === "ALL" ? "Tất cả" : `${star}★`}
                  </button>
                ))}
              </div>

              {/* Lọc chỉ có nhận xét */}
              <label className="flex items-center gap-1.5 cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-2xs hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={onlyWithComment}
                  onChange={(e) => setOnlyWithComment(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-sm border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium text-[11px]">Chỉ có lời nhắn</span>
              </label>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStarFilter("ALL");
                    setOnlyWithComment(false);
                  }}
                  className="h-8 rounded-full text-xs text-amber-800"
                >
                  <X className="mr-1 h-3 w-3" />
                  Xóa lọc
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="tram-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/30">
                  <TableHead className="w-28 pl-4">Mã đặt bàn</TableHead>
                  <TableHead className="min-w-44">Thực khách</TableHead>
                  <TableHead className="w-28">Ngày tiệc</TableHead>
                  <TableHead className="w-28 text-center">Đánh giá 5★</TableHead>
                  <TableHead className="min-w-72">Nhận xét &amp; Tiêu chí chi tiết</TableHead>
                  <TableHead className="w-28 text-center">Giới thiệu (NPS)</TableHead>
                  <TableHead className="w-28 text-right pr-4">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSurveys.length > 0 ? (
                  filteredSurveys.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                      {/* Mã đặt bàn */}
                      <TableCell className="pl-4">
                        <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
                          {s.reservationCode}
                        </span>
                      </TableCell>

                      {/* Thông tin khách hàng */}
                      <TableCell>
                        <span className="font-semibold text-stone-900 block text-xs">
                          {s.customerName}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {s.phone}
                        </span>
                      </TableCell>

                      {/* Ngày dùng tiệc */}
                      <TableCell className="text-xs text-stone-700 whitespace-nowrap">
                        {s.date}
                      </TableCell>

                      {/* Số sao tổng quan */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-2xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {s.rating}/5
                        </div>
                      </TableCell>

                      {/* Nhận xét & 4 tiêu chí */}
                      <TableCell className="text-xs text-stone-700 leading-relaxed py-3">
                        {s.comment ? (
                          <div className="relative rounded-lg bg-amber-500/5 border border-amber-300/40 p-2.5 text-stone-800 text-xs italic mb-2">
                            &ldquo;{s.comment}&rdquo;
                          </div>
                        ) : (
                          <p className="text-[11px] text-stone-400 italic mb-2">
                            Khách không để lại nhận xét văn bản.
                          </p>
                        )}

                        {/* Điểm từng tiêu chí chi tiết */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-stone-700">
                            🍲 Món ăn: <strong>{s.foodRating}★</strong>
                          </span>
                          <span className="rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-stone-700">
                            🤵 Phục vụ: <strong>{s.serviceRating}★</strong>
                          </span>
                          <span className="rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-stone-700">
                            🕯️ Không gian: <strong>{s.ambianceRating}★</strong>
                          </span>
                          <span className="rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-stone-700">
                            🍷 Pairing: <strong>{s.pairingRating}★</strong>
                          </span>
                        </div>
                      </TableCell>

                      {/* NPS Giới thiệu */}
                      <TableCell className="text-center">
                        {s.recommend ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-semibold gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Giới thiệu
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-stone-400">
                            Không
                          </Badge>
                        )}
                      </TableCell>

                      {/* Hành động: Mở trang khảo sát */}
                      <TableCell className="text-right pr-4">
                        <a
                          href={`/survey/${s.reservationCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:text-amber-800 hover:border-amber-400 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Xem trang
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      Không tìm thấy nhận xét nào khớp với bộ lọc &amp; từ khóa &ldquo;{searchTerm}&rdquo;.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* KHỐI 3: THANH THỬ NGHIỆM ĐÁNH GIÁ NHANH */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Khảo sát nhanh cho bàn đã phục vụ:
            </p>
            <p className="text-[11px] text-stone-600">
              Chọn lượt đặt bàn bên dưới để gửi hoặc ghi nhận đánh giá trải nghiệm thực khách:
            </p>
          </div>
        </div>

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

      {/* Survey Dialog mở khi bấm thử nghiệm */}
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
