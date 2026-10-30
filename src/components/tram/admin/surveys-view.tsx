"use client";

// FR-23: Quản trị Khảo sát sau bữa ăn — Thăm dò 5 sao gắn với lượt đã phục vụ
import { useEffect, useState, useCallback } from "react";
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
  PlusCircle,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLongDate } from "@/lib/tram/format";
import type { SurveyStatsDTO, ReservationDTO } from "@/lib/tram/types";
import { SurveyDialog } from "../survey/survey-dialog";

export function AdminSurveys() {
  const [stats, setStats] = useState<SurveyStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatedReservations, setSeatedReservations] = useState<ReservationDTO[]>([]);
  const [selectedRes, setSelectedRes] = useState<ReservationDTO | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tải thống kê surveys
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

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút tải lại */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309] text-white">
              <Star className="h-4 w-4 fill-white text-white" />
            </span>
            <span className="text-xs font-bold tracking-widest text-[#b45309] uppercase">
              Đánh giá chất lượng phục vụ
            </span>
          </div>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Khảo sát 5 sao sau bữa ăn
          </h2>
          <p className="text-xs text-muted-foreground">
            Thăm dò mức độ hài lòng của thực khách gắn với từng lượt đặt bàn đã check-in hoàn tất bữa ăn.
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

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Điểm trung bình */}
        <Card className="border-border/80 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Điểm trung bình
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
              Dựa trên {stats?.totalSurveys ?? 0} lượt khảo sát đã gửi
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Ẩm thực & Hương vị */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Ẩm thực &amp; Hương vị
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-800">
                <UtensilsCrossed className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-extrabold text-[#292524]">
                {stats?.avgFood ?? "5.0"}
              </span>
              <span className="text-xs font-bold text-muted-foreground">/ 5.0 ⭐</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-700 font-medium">
              Chất lượng menu 7 món tasting
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Dịch vụ & Chu đáo */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Dịch vụ &amp; Phục vụ
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-800">
                <HeartHandshake className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-extrabold text-[#292524]">
                {stats?.avgService ?? "5.0"}
              </span>
              <span className="text-xs font-bold text-muted-foreground">/ 5.0 ⭐</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              Không gian: {stats?.avgAmbiance ?? "5.0"} · Pairing: {stats?.avgPairing ?? "5.0"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Sẵn sàng giới thiệu */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                Tỷ lệ giới thiệu (NPS)
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <ThumbsUp className="h-4 w-4" />
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
      </div>

      {/* Thanh Demo gửi khảo sát nhanh */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Thử nghiệm nhanh tính năng khảo sát (Chọn bàn đã Check-in để đánh giá thử):
            </p>
            <p className="text-[11px] text-stone-600">
              Bấm vào bất kỳ lượt đặt đã phục vụ nào dưới đây để mở form khảo sát 5 sao:
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

      {/* Bảng danh sách Khảo sát mới nhất */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#292524]">
              Ý kiến &amp; Đánh giá gần đây từ Thực khách
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Tổng cộng {stats?.recentSurveys?.length ?? 0} phản hồi
            </span>
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
                  <TableHead className="min-w-64">Cảm nhận &amp; Nhận xét</TableHead>
                  <TableHead className="text-center">Giới thiệu</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentSurveys && stats.recentSurveys.length > 0 ? (
                  stats.recentSurveys.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono font-bold text-amber-900 text-xs">
                        {s.reservationCode}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-stone-900 block text-xs">
                          {s.customerName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
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
                          <span className="italic text-stone-800">
                            &ldquo;{s.comment}&rdquo;
                          </span>
                        ) : (
                          <span className="text-stone-400">Không để lại lời nhắn</span>
                        )}
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-stone-500">
                          <span>Món ăn: {s.foodRating}⭐</span>
                          <span>Phục vụ: {s.serviceRating}⭐</span>
                          <span>Không gian: {s.ambianceRating}⭐</span>
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
                      Chưa có đánh giá khảo sát nào. Bấm vào một lượt đặt đã phục vụ ở trên để gửi khảo sát đầu tiên!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Survey Dialog mở khi bấm thử */}
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
