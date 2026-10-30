"use client";

// FR-19: Hạng và điểm trên hồ sơ khách hàng — TRẦM Reserve
// Quản lý hạng thân thiết (Member, Silver, Gold, Diamond), điểm tích lũy và đặc quyền hội viên.

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Crown,
  Gem,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  CreditCard,
  Search,
  LayoutGrid,
  List,
  Eye,
  History,
  Wallet,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Gift,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  AllergyBadge,
  ErrorBlock,
  LoadingBlock,
  StatusBadge,
  useJson,
} from "./admin-shared";
import { formatLongDate, formatVND } from "@/lib/tram/format";
import { SLOT_LABELS, PRICES } from "@/lib/tram/constants";
import { LOYALTY_TIERS, formatPoints, calculatePointsFromBill } from "@/lib/tram/loyalty";
import type { CustomerProfileDTO, LoyaltyTier } from "@/lib/tram/types";

interface CustomersResponse {
  customers: CustomerProfileDTO[];
}

// Icon tương ứng cho từng hạng
function TierIcon({
  tier,
  className = "h-4 w-4",
}: {
  tier: LoyaltyTier;
  className?: string;
}) {
  switch (tier) {
    case "DIAMOND":
      return <Gem className={className} />;
    case "GOLD":
      return <Crown className={className} />;
    case "SILVER":
      return <ShieldCheck className={className} />;
    default:
      return <Award className={className} />;
  }
}

export function AdminCustomers() {
  const { data, loading, error, refresh } = useJson<CustomersResponse>(
    "/api/customers",
  );
  const [detail, setDetail] = useState<CustomerProfileDTO | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState<LoyaltyTier | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  function pairingPriceOf(pairing: string): number {
    if (pairing === "WINE") return PRICES.winePairing;
    if (pairing === "TEA") return PRICES.teaPairing;
    return 0;
  }

  const customers = data?.customers ?? [];

  // Thống kê tổng quan hạng khách
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalPoints = customers.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const diamondCount = customers.filter((c) => c.tier === "DIAMOND").length;
    const goldCount = customers.filter((c) => c.tier === "GOLD").length;
    const silverCount = customers.filter((c) => c.tier === "SILVER").length;
    const memberCount = customers.filter((c) => c.tier === "MEMBER").length;
    const repeatCustomers = customers.filter((c) => c.visits >= 2).length;
    const repeatRate =
      totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
    const avgSpend =
      totalCustomers > 0
        ? Math.round(
            customers.reduce((sum, c) => sum + c.totalSpend, 0) / totalCustomers,
          )
        : 0;

    return {
      totalCustomers,
      totalPoints,
      vipCount: diamondCount + goldCount,
      diamondCount,
      goldCount,
      silverCount,
      memberCount,
      repeatRate,
      avgSpend,
    };
  }, [customers]);

  // Bộ lọc khách hàng
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchTier = selectedTier === "ALL" || c.tier === selectedTier;
      return matchSearch && matchTier;
    });
  }, [customers, search, selectedTier]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & KPI Stats Cards with Animation */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-amber-900/15 bg-gradient-to-br from-[#fffdf9] via-[#fcf6eb] to-[#f9eed9] p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309] text-white shadow-sm">
                <Crown className="h-4 w-4" />
              </span>
              <h2 className="font-heading text-lg font-bold text-[#292524] md:text-xl">
                Hồ Sơ Khách Hàng & Hạng Thân Thiết
              </h2>
              <Badge
                variant="outline"
                className="border-amber-600/30 bg-amber-100/70 font-semibold text-amber-800"
              >
                FR-19 · Sprint 2
              </Badge>
            </div>
            <p className="text-xs text-stone-600 md:text-sm">
              Hệ thống quản lý điểm tích lũy (1.000 đ = 1 điểm, thưởng 5–8% theo hạng) và 4 hạng thành viên cao cấp TRẦM Reserve.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-2.5 py-1 font-medium text-purple-900">
              <Gem className="h-3 w-3 text-purple-600" />
              Kim Cương: {stats.diamondCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-medium text-amber-900">
              <Crown className="h-3 w-3 text-amber-600" />
              Vàng: {stats.goldCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 font-medium text-slate-800">
              <ShieldCheck className="h-3 w-3 text-slate-600" />
              Bạc: {stats.silverCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-2.5 py-1 font-medium text-stone-700">
              <Award className="h-3 w-3 text-stone-600" />
              Khởi Sắc: {stats.memberCount}
            </span>
          </div>
        </div>
      </motion.div>

      {/* KPI 4 Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
          },
        }}
        className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
          className="rounded-xl border border-stone-200/80 bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tổng Khách Hàng
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-[#b45309]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#292524]">
            {stats.totalCustomers}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Khách đã dùng bữa (SEATED)
          </p>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
          className="rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50/60 to-amber-100/30 p-4 shadow-xs transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-900">
              Thượng Khách VIP
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-950">
            {stats.vipCount}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Hạng Kim Cương & Hoàng Kim
          </p>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
          className="rounded-xl border border-stone-200/80 bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tổng Điểm Lưu Hành
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-[#b45309]">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#292524]">
            {formatPoints(stats.totalPoints)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Điểm tích lũy toàn hệ thống
          </p>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
          className="rounded-xl border border-stone-200/80 bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tỷ Lệ Khách Quay Lại
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#292524]">
            {stats.repeatRate}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Đã đến từ 2 lần trở lên
          </p>
        </motion.div>
      </motion.div>

      {/* 2. Controls Bar: Search + Filter Tabs + View Mode */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên khách hàng hoặc số điện thoại..."
            className="pl-9 h-9.5 text-sm bg-white"
          />
        </div>

        {/* Tier filter tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setSelectedTier("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedTier === "ALL"
                ? "bg-[#b45309] text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Tất cả ({customers.length})
          </button>
          <button
            onClick={() => setSelectedTier("DIAMOND")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedTier === "DIAMOND"
                ? "bg-purple-900 text-purple-100 shadow-xs"
                : "text-purple-800 hover:bg-purple-50"
            }`}
          >
            <Gem className="h-3 w-3" />
            Kim Cương ({stats.diamondCount})
          </button>
          <button
            onClick={() => setSelectedTier("GOLD")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedTier === "GOLD"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-amber-800 hover:bg-amber-50"
            }`}
          >
            <Crown className="h-3 w-3" />
            Vàng ({stats.goldCount})
          </button>
          <button
            onClick={() => setSelectedTier("SILVER")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedTier === "SILVER"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            Bạc ({stats.silverCount})
          </button>
          <button
            onClick={() => setSelectedTier("MEMBER")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedTier === "MEMBER"
                ? "bg-stone-700 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Award className="h-3 w-3" />
            Khởi Sắc ({stats.memberCount})
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border-l border-border pl-2">
          <button
            onClick={() => setViewMode("cards")}
            title="Xem dạng thẻ thành viên"
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "cards"
                ? "bg-[#b45309] text-white"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            title="Xem dạng bảng"
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "table"
                ? "bg-[#b45309] text-white"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3. Main Content: Cards View OR Table View */}
      {loading && !data ? (
        <LoadingBlock label="Đang tải dữ liệu hồ sơ và hạng thân thiết..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-card p-12 text-center">
          <Filter className="mx-auto h-8 w-8 text-stone-400" />
          <h3 className="mt-2 text-base font-semibold text-stone-700">
            Không tìm thấy khách hàng nào
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Hãy thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc hạng thân thiết.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* CARDS VIEW: Thẻ hội viên VIP sang trọng */
        <motion.div
          key="cards-view"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredCustomers.map((c) => {
            const tierConfig = LOYALTY_TIERS[c.tier];
            return (
              <motion.div
                key={`${c.name}-${c.phone}`}
                variants={{
                  hidden: { opacity: 0, scale: 0.96, y: 15 },
                  visible: { opacity: 1, scale: 1, y: 0 },
                }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-card p-4.5 shadow-xs transition-all hover:border-amber-500/50 hover:shadow-lg"
              >
                {/* Decorative Tier Ribbon Top-Right */}
                <div className="absolute -right-12 top-6 rotate-45">
                  <div
                    className={`w-40 py-1 text-center text-[10px] font-bold uppercase tracking-widest shadow-xs ${
                      c.tier === "DIAMOND"
                        ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white"
                        : c.tier === "GOLD"
                          ? "bg-gradient-to-r from-amber-500 to-amber-700 text-white"
                          : c.tier === "SILVER"
                            ? "bg-gradient-to-r from-slate-400 to-slate-600 text-white"
                            : "bg-gradient-to-r from-stone-400 to-stone-600 text-white"
                    }`}
                  >
                    {tierConfig.tagline}
                  </div>
                </div>

                {/* Card Top: Avatar & Name */}
                <div className="pr-14">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-heading text-lg font-bold shadow-xs ${
                        c.tier === "DIAMOND"
                          ? "bg-purple-950 text-amber-300 ring-2 ring-amber-400/50"
                          : c.tier === "GOLD"
                            ? "bg-amber-600 text-white ring-2 ring-amber-300"
                            : c.tier === "SILVER"
                              ? "bg-slate-700 text-white"
                              : "bg-stone-600 text-white"
                      }`}
                    >
                      {c.name.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="font-heading text-base font-bold text-[#292524] transition-colors group-hover:text-[#b45309]">
                        {c.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                  </div>

                  {/* Tier Badge Pill */}
                  <div className="mt-3 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${tierConfig.badgeBg} ${tierConfig.badgeText} ${tierConfig.badgeBorder}`}
                    >
                      <TierIcon tier={c.tier} className="h-3 w-3" />
                      {tierConfig.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-stone-200 bg-stone-50 text-[11px] font-normal text-stone-600"
                    >
                      {c.visits} lần đến
                    </Badge>
                  </div>
                </div>

                {/* Middle: Điểm tích lũy & Tiến độ lên hạng */}
                <div className="my-4 rounded-xl border border-stone-100 bg-[#fffdfa] p-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-stone-500">
                        Điểm tích lũy
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="text-xl font-extrabold text-[#92400e]">
                          {formatPoints(c.points)}
                        </span>
                        <span className="text-xs font-medium text-amber-700/80">
                          pts
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-medium text-stone-500">
                        Tổng chi tiêu
                      </span>
                      <p className="text-xs font-bold text-stone-800">
                        {formatVND(c.totalSpend)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar to next tier */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[10px] text-stone-500">
                      <span>Tiến độ thăng hạng</span>
                      <span className="font-semibold text-stone-700">
                        {c.tier === "DIAMOND"
                          ? "Hạng tối đa"
                          : `${c.tierProgress}%`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.tierProgress}%` }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                        className={`h-full rounded-full ${
                          c.tier === "DIAMOND"
                            ? "bg-gradient-to-r from-amber-400 via-rose-400 to-purple-500"
                            : c.tier === "GOLD"
                              ? "bg-gradient-to-r from-amber-400 to-amber-600"
                              : "bg-gradient-to-r from-slate-400 to-slate-600"
                        }`}
                      />
                    </div>
                    {c.tier !== "DIAMOND" && (
                      <p className="text-[10px] text-stone-500">
                        Cần thêm{" "}
                        <strong className="text-amber-800">
                          {formatPoints(c.nextTierPoints - c.points)} pts
                        </strong>{" "}
                        để lên {c.nextTierName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom: Notes/Allergy + Action Button */}
                <div className="space-y-3">
                  {c.notes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.notes.slice(0, 2).map((n) => (
                        <span
                          key={n}
                          className="max-w-[200px] truncate rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setDetail(c)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/70 py-2 text-xs font-semibold text-stone-700 transition-all hover:border-[#b45309] hover:bg-[#b45309] hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Xem Hồ Sơ & Đặc Quyền
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* TABLE VIEW: Bảng danh sách chi tiết có cột Hạng & Điểm */
        <motion.div
          key="table-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="tram-scroll overflow-x-auto rounded-xl border border-border bg-card shadow-xs"
        >
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow className="bg-[#f5efe4] hover:bg-[#f5efe4]">
                <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Khách hàng
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Hạng Thân Thiết
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Điểm Tích Lũy
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Lần Đến
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Tổng Chi Tiêu
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Lần Cuối
                </TableHead>
                <TableHead className="pr-4 text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Thao Tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => {
                const tierConfig = LOYALTY_TIERS[c.tier];
                return (
                  <TableRow
                    key={`${c.name}-${c.phone}`}
                    className="cursor-pointer border-border/70 hover:bg-[#fdf0d5]/40 transition-colors"
                    onClick={() => setDetail(c)}
                  >
                    <TableCell className="pl-4 font-medium text-[#292524]">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                            c.tier === "DIAMOND"
                              ? "bg-purple-950 text-amber-300"
                              : c.tier === "GOLD"
                                ? "bg-amber-600 text-white"
                                : "bg-stone-200 text-stone-800"
                          }`}
                        >
                          {c.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${tierConfig.badgeBg} ${tierConfig.badgeText} ${tierConfig.badgeBorder}`}
                      >
                        <TierIcon tier={c.tier} className="h-3 w-3" />
                        {tierConfig.name}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 font-bold text-[#92400e]">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        <span>{formatPoints(c.points)} pts</span>
                      </div>
                      <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${c.tierProgress}%` }}
                        />
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-[#b45309]/40 bg-[#fdf0d5] font-medium text-[#92400e]"
                      >
                        {c.visits} lần
                      </Badge>
                    </TableCell>

                    <TableCell className="font-semibold text-[#292524]">
                      {formatVND(c.totalSpend)}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs">
                      {formatLongDate(c.lastVisit).split(", ")[1]}
                    </TableCell>

                    <TableCell className="pr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetail(c);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-amber-600 hover:text-amber-800"
                      >
                        <Eye className="h-3 w-3" />
                        Chi tiết
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* 4. DIALOG: Hồ sơ Hội viên VIP & Lịch sử Đặt bàn */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl border-border bg-[#faf8f3] p-0 overflow-hidden">
          {detail && (
            <div className="tram-scroll max-h-[85vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Hồ sơ khách hàng VIP: {detail.name}</DialogTitle>
                <DialogDescription>
                  Thông tin hạng thân thiết {LOYALTY_TIERS[detail.tier].name}, điểm tích lũy và lịch sử đặt bàn.
                </DialogDescription>
              </DialogHeader>

              {/* Digital VIP Membership Card (Header) */}
              <div
                className={`relative overflow-hidden p-6 ${LOYALTY_TIERS[detail.tier].cardGradient}`}
              >
                {/* Background decorative pattern */}
                <div className="absolute right-0 top-0 -mr-10 -mt-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute left-1/2 bottom-0 h-32 w-32 rounded-full bg-amber-500/10 blur-xl" />

                <div className="relative z-10 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-widest text-amber-300 uppercase">
                        TRẦM Reserve · VIP Loyalty
                      </span>
                    </div>
                    <h3 className="font-heading text-2xl font-bold tracking-tight">
                      {detail.name}
                    </h3>
                    <p className="text-xs opacity-80">
                      SĐT: {detail.phone} · Ghé thăm lần cuối:{" "}
                      {formatLongDate(detail.lastVisit).split(", ")[1]}
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${
                        detail.tier === "DIAMOND"
                          ? "bg-amber-400 text-stone-900 shadow-md"
                          : "bg-white/15 text-white"
                      }`}
                    >
                      <TierIcon tier={detail.tier} className="h-3.5 w-3.5" />
                      {LOYALTY_TIERS[detail.tier].name}
                    </span>
                    <span className="mt-1 text-[11px] opacity-75">
                      {LOYALTY_TIERS[detail.tier].tagline}
                    </span>
                  </div>
                </div>

                {/* Card Chips & Points */}
                <div className="relative z-10 mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider opacity-70">
                      Điểm tích lũy hiện có
                    </span>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      <span className="text-3xl font-extrabold text-amber-300">
                        {formatPoints(detail.points)}
                      </span>
                      <span className="text-xs font-semibold opacity-80">
                        pts
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider opacity-70">
                      Tổng chi tiêu tích lũy
                    </span>
                    <p className="text-lg font-bold">
                      {formatVND(detail.totalSpend)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dialog Body */}
              <div className="space-y-6 p-6">
                {/* Hành trình thăng hạng */}
                <div className="rounded-xl border border-stone-200/90 bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-stone-700">
                      <TrendingUp className="h-4 w-4 text-[#b45309]" />
                      Hành trình thăng hạng
                    </span>
                    <span className="font-bold text-[#b45309]">
                      {detail.tier === "DIAMOND"
                        ? "Đã đạt hạng cao nhất"
                        : `${detail.tierProgress}% tiến độ`}
                    </span>
                  </div>

                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${detail.tierProgress}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-700"
                    />
                  </div>

                  {detail.tier !== "DIAMOND" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Cần tích lũy thêm{" "}
                      <strong className="text-stone-800">
                        {formatPoints(detail.nextTierPoints - detail.points)} điểm
                      </strong>{" "}
                      nữa để nâng hạng thành{" "}
                      <span className="font-semibold text-amber-800">
                        {detail.nextTierName}
                      </span>
                      .
                    </p>
                  )}
                </div>

                {/* Danh sách Đặc Quyền Hội Viên */}
                <div className="space-y-2.5">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                    <Gift className="h-4 w-4 text-amber-600" />
                    Đặc Quyền Của Hạng {LOYALTY_TIERS[detail.tier].name}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {LOYALTY_TIERS[detail.tier].benefits.map((b, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-amber-900/10 bg-[#fffdf9] p-2.5 text-xs text-stone-700"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lịch sử đặt bàn & Tích điểm từng bữa ăn */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                    <History className="h-4 w-4 text-[#b45309]" />
                    Lịch Sử Đặt Bàn & Điểm Thưởng ({detail.reservations.length} lần)
                  </h4>
                  <ul className="space-y-2.5">
                    {detail.reservations.map((r) => {
                      const total =
                        r.partySize * (PRICES.menu + pairingPriceOf(r.pairing));
                      const reward = calculatePointsFromBill(total, detail.tier);
                      return (
                        <li
                          key={r.id}
                          className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm font-semibold text-[#292524]">
                                {formatLongDate(r.date)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                                +{formatPoints(reward.totalEarnedPoints)} pts
                              </span>
                              <StatusBadge status={r.status} />
                            </div>
                          </div>

                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Khung {SLOT_LABELS[r.slot]} · Bàn {r.table.code} ·{" "}
                            {r.partySize} khách ·{" "}
                            {r.pairing === "NONE"
                              ? "Không pairing"
                              : r.pairing === "WINE"
                                ? "Wine pairing (+650k)"
                                : "Tea pairing (+350k)"}
                          </p>

                          <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                            <span className="text-muted-foreground">
                              Hóa đơn bữa ăn:
                            </span>
                            <span className="font-bold text-[#92400e]">
                              {formatVND(total)}
                            </span>
                          </div>

                          {r.allergy && (
                            <div className="mt-2">
                              <AllergyBadge allergy={r.allergy} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
