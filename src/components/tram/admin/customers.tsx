"use client";

// FR-19, FR-20, FR-21: Hồ sơ khách hàng & Chương trình ba hạng thân thiết — TRẦM Reserve
// FR-21: 3 Hạng theo Đặc tả Bảng 8 nhóm 8:
// - Hạng HƯƠNG (0–2 lượt đến)
// - Hạng TRẦM (3–5 lượt đến)
// - Hạng NAM TRẦM (6+ lượt đến)

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Crown,
  Gem,
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
  TableProperties,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  LOYALTY_TIERS,
  BANG_8_TIER_COMPARISON,
  formatPoints,
  calculatePointsFromBill,
} from "@/lib/tram/loyalty";
import type { CustomerProfileDTO, LoyaltyTier } from "@/lib/tram/types";

interface CustomersResponse {
  customers: CustomerProfileDTO[];
}

// Icon tương ứng cho 3 hạng (FR-21)
function TierIcon({
  tier,
  className = "h-4 w-4",
}: {
  tier: LoyaltyTier;
  className?: string;
}) {
  switch (tier) {
    case "NAM_TRAM":
      return <Gem className={className} />;
    case "TRAM":
      return <Crown className={className} />;
    default:
      return <Award className={className} />;
  }
}

export function AdminCustomers() {
  const { data, loading, error, refresh } = useJson<CustomersResponse>(
    "/api/customers",
  );
  const [detail, setDetail] = useState<CustomerProfileDTO | null>(null);
  const [showBang8, setShowBang8] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState<LoyaltyTier | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  function pairingPriceOf(pairing: string): number {
    if (pairing === "WINE") return PRICES.winePairing;
    if (pairing === "TEA") return PRICES.teaPairing;
    return 0;
  }

  const customers = data?.customers ?? [];

  // Thống kê tổng quan 3 hạng (FR-21)
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalPoints = customers.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const namTramCount = customers.filter((c) => c.tier === "NAM_TRAM").length;
    const tramCount = customers.filter((c) => c.tier === "TRAM").length;
    const huongCount = customers.filter((c) => c.tier === "HUONG").length;
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
      vipCount: namTramCount + tramCount,
      namTramCount,
      tramCount,
      huongCount,
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
      {/* 1. Header Banner & Button xem Bảng 8 nhóm 8 */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-amber-900/15 bg-gradient-to-br from-[#fffdf9] via-[#fcf6eb] to-[#f9eed9] p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309] text-white shadow-sm">
                <Crown className="h-4 w-4" />
              </span>
              <h2 className="font-heading text-lg font-bold text-[#292524] md:text-xl">
                Chương Trình Ba Hạng Thân Thiết
              </h2>
              <Badge
                variant="outline"
                className="border-amber-600/40 bg-amber-100 font-semibold text-amber-900"
              >
                FR-21 · Đặc tả Bảng 8 (Must)
              </Badge>
            </div>
            <p className="text-xs text-stone-600 md:text-sm">
              Gồm 3 hạng: <strong className="text-stone-800">Hương</strong> (0–2 lượt),{" "}
              <strong className="text-[#b45309]">Trầm</strong> (3–5 lượt),{" "}
              <strong className="text-purple-900">Nam Trầm</strong> (6+ lượt) kèm quyền lợi riêng biệt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowBang8(true)}
              className="h-9.5 gap-1.5 rounded-full bg-[#b45309] text-xs font-semibold text-white shadow-xs hover:bg-[#92400e]"
            >
              <TableProperties className="h-4 w-4" />
              Xem Đặc Tả Bảng 8 Nhóm 8
            </Button>
          </div>
        </div>

        {/* 3 Hạng Stats Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-amber-900/10 pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-3 py-1 font-semibold text-purple-950">
            <Gem className="h-3.5 w-3.5 text-purple-700" />
            Hạng Nam Trầm (6+ lượt): {stats.namTramCount} khách
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-50 px-3 py-1 font-semibold text-amber-950">
            <Crown className="h-3.5 w-3.5 text-amber-700" />
            Hạng Trầm (3–5 lượt): {stats.tramCount} khách
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-3 py-1 font-semibold text-stone-800">
            <Award className="h-3.5 w-3.5 text-stone-600" />
            Hạng Hương (0–2 lượt): {stats.huongCount} khách
          </span>
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
          className="rounded-xl border border-stone-200/80 bg-card p-4 shadow-xs hover:shadow-md transition-shadow"
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
          className="rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50/60 to-amber-100/30 p-4 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-900">
              Khách Quen & Thượng Khách
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-950">
            {stats.vipCount}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Hạng Trầm (3-5) & Nam Trầm (6+)
          </p>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
          className="rounded-xl border border-stone-200/80 bg-card p-4 shadow-xs hover:shadow-md transition-shadow"
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
            1.000 đ = 1 pt (FR-20)
          </p>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
          className="rounded-xl border border-stone-200/80 bg-card p-4 shadow-xs hover:shadow-md transition-shadow"
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
            Khách đến từ 2 lần trở lên
          </p>
        </motion.div>
      </motion.div>

      {/* 2. Controls Bar: Search + Filter 3 Hạng + View Mode */}
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

        {/* 3 Hạng Filter Tabs */}
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
            onClick={() => setSelectedTier("NAM_TRAM")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedTier === "NAM_TRAM"
                ? "bg-purple-950 text-amber-300 shadow-xs ring-1 ring-amber-400"
                : "text-purple-900 hover:bg-purple-50"
            }`}
          >
            <Gem className="h-3.5 w-3.5 text-purple-600" />
            Nam Trầm · 6+ lượt ({stats.namTramCount})
          </button>
          <button
            onClick={() => setSelectedTier("TRAM")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedTier === "TRAM"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-amber-800 hover:bg-amber-50"
            }`}
          >
            <Crown className="h-3.5 w-3.5 text-amber-600" />
            Trầm · 3–5 lượt ({stats.tramCount})
          </button>
          <button
            onClick={() => setSelectedTier("HUONG")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedTier === "HUONG"
                ? "bg-stone-700 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Award className="h-3.5 w-3.5 text-stone-500" />
            Hương · 0–2 lượt ({stats.huongCount})
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
            Hãy thử tìm kiếm với từ khóa khác hoặc chọn hạng thành viên khác.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* CARDS VIEW: Thẻ hội viên VIP 3 hạng */
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
            const tierConfig = LOYALTY_TIERS[c.tier] ?? LOYALTY_TIERS.HUONG;
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
                      c.tier === "NAM_TRAM"
                        ? "bg-gradient-to-r from-amber-400 via-rose-500 to-purple-800 text-white"
                        : c.tier === "TRAM"
                          ? "bg-gradient-to-r from-amber-500 to-amber-700 text-white"
                          : "bg-gradient-to-r from-stone-500 to-stone-700 text-white"
                    }`}
                  >
                    {c.tier === "NAM_TRAM"
                      ? "6+ Lượt"
                      : c.tier === "TRAM"
                        ? "3–5 Lượt"
                        : "0–2 Lượt"}
                  </div>
                </div>

                {/* Card Top: Avatar & Name */}
                <div className="pr-14">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-heading text-lg font-bold shadow-xs ${
                        c.tier === "NAM_TRAM"
                          ? "bg-purple-950 text-amber-300 ring-2 ring-amber-400/60"
                          : c.tier === "TRAM"
                            ? "bg-amber-600 text-white ring-2 ring-amber-300"
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
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${tierConfig.badgeBg} ${tierConfig.badgeText} ${tierConfig.badgeBorder}`}
                    >
                      <TierIcon tier={c.tier} className="h-3 w-3" />
                      {tierConfig.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-amber-600/30 bg-amber-50/70 text-[11px] font-semibold text-[#92400e]"
                    >
                      {c.visits} lần đến
                    </Badge>
                  </div>
                </div>

                {/* Middle: Điểm tích lũy & Tiến độ theo lượt (FR-21) */}
                <div className="my-4 rounded-xl border border-stone-100 bg-[#fffdfa] p-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-stone-500">
                        Điểm tích lũy (1.000đ = 1 pt)
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="text-xl font-extrabold text-[#92400e]">
                          {formatPoints(c.points)}
                        </span>
                        <span className="text-xs font-medium text-amber-700/80">
                          pts
                        </span>
                        {tierConfig.bonusPercent > 0 && (
                          <span className="ml-1 rounded-md bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                            +{tierConfig.bonusPercent}%
                          </span>
                        )}
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
                        {c.tier === "NAM_TRAM"
                          ? "Hạng tối cao (6+ lượt)"
                          : `${c.tierProgress}%`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.tierProgress}%` }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                        className={`h-full rounded-full ${
                          c.tier === "NAM_TRAM"
                            ? "bg-gradient-to-r from-amber-400 via-rose-400 to-purple-600"
                            : c.tier === "TRAM"
                              ? "bg-gradient-to-r from-amber-400 to-amber-600"
                              : "bg-gradient-to-r from-stone-400 to-stone-600"
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-stone-500">
                      {c.tier === "NAM_TRAM" ? (
                        <span className="text-purple-900 font-semibold">
                          Thượng khách Kim Cương Độc Bản của TRẦM
                        </span>
                      ) : c.tier === "TRAM" ? (
                        <>
                          Cần thêm{" "}
                          <strong className="text-amber-800">
                            {Math.max(0, 6 - c.visits)} lượt đến
                          </strong>{" "}
                          để thăng hạng <span className="font-semibold">Nam Trầm</span>
                        </>
                      ) : (
                        <>
                          Cần thêm{" "}
                          <strong className="text-amber-800">
                            {Math.max(0, 3 - c.visits)} lượt đến
                          </strong>{" "}
                          để thăng hạng <span className="font-semibold">Hạng Trầm</span>
                        </>
                      )}
                    </p>
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
                    Xem Hồ Sơ & Quyền Lợi Bảng 8
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* TABLE VIEW */
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
                  Hạng Thân Thiết (FR-21)
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Số Lần Đến
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Điểm Tích Lũy
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
                const tierConfig = LOYALTY_TIERS[c.tier] ?? LOYALTY_TIERS.HUONG;
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
                            c.tier === "NAM_TRAM"
                              ? "bg-purple-950 text-amber-300"
                              : c.tier === "TRAM"
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
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${tierConfig.badgeBg} ${tierConfig.badgeText} ${tierConfig.badgeBorder}`}
                      >
                        <TierIcon tier={c.tier} className="h-3 w-3" />
                        {tierConfig.name}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-[#b45309]/40 bg-[#fdf0d5] font-bold text-[#92400e]"
                      >
                        {c.visits} lần đến
                      </Badge>
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

      {/* 4. MODAL ĐẶC TẢ BẢNG 8 NHÓM 8 (Chương trình ba hạng) */}
      <Dialog open={showBang8} onOpenChange={setShowBang8}>
        <DialogContent className="max-w-3xl border-amber-900/20 bg-[#faf8f3] p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309] text-white">
                <TableProperties className="h-4 w-4" />
              </span>
              <DialogTitle className="font-heading text-xl font-bold text-[#292524]">
                Đặc Tả Bảng 8 Nhóm 8: Chương Trình Ba Hạng Thân Thiết
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-stone-600">
              Chi tiết điều kiện phân hạng theo số lượt đến và chính sách quyền lợi từng hạng tại TRẦM Reserve.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 tram-scroll max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-white shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f5efe4] hover:bg-[#f5efe4]">
                  <TableHead className="w-[28%] font-bold text-stone-800 text-xs">
                    Tiêu chí quyền lợi
                  </TableHead>
                  <TableHead className="w-[24%] font-bold text-stone-700 text-xs">
                    <span className="inline-flex items-center gap-1 text-stone-700">
                      <Award className="h-3.5 w-3.5 text-stone-500" />
                      Hạng Hương
                    </span>
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      0 – 2 lượt đến
                    </span>
                  </TableHead>
                  <TableHead className="w-[24%] font-bold text-amber-900 text-xs bg-amber-50/50">
                    <span className="inline-flex items-center gap-1 text-amber-900">
                      <Crown className="h-3.5 w-3.5 text-amber-600" />
                      Hạng Trầm
                    </span>
                    <span className="block text-[11px] font-normal text-amber-800">
                      3 – 5 lượt đến
                    </span>
                  </TableHead>
                  <TableHead className="w-[24%] font-bold text-purple-950 text-xs bg-purple-50/50">
                    <span className="inline-flex items-center gap-1 text-purple-950">
                      <Gem className="h-3.5 w-3.5 text-purple-700" />
                      Hạng Nam Trầm
                    </span>
                    <span className="block text-[11px] font-normal text-purple-800">
                      Từ 6 lượt trở lên
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {BANG_8_TIER_COMPARISON.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className={`border-border/70 ${row.highlight ? "bg-amber-50/20" : ""}`}
                  >
                    <TableCell className="font-semibold text-xs text-stone-800">
                      {row.criterion}
                    </TableCell>
                    <TableCell className="text-xs text-stone-600">
                      {row.huong}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-amber-950 bg-amber-50/30">
                      {row.tram}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-purple-950 bg-purple-50/30">
                      {row.namTram}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => setShowBang8(false)}
              className="h-10 rounded-full bg-[#b45309] px-6 text-xs font-semibold text-white hover:bg-[#92400e]"
            >
              Đã hiểu & Đóng bảng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. DIALOG: Hồ sơ Hội viên VIP & Lịch sử Đặt bàn */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl border-border bg-[#faf8f3] p-0 overflow-hidden [&_[data-slot=dialog-close]]:text-stone-200 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:bg-black/30 [&_[data-slot=dialog-close]]:hover:bg-black/55 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:transition-all [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-white/15">
          {detail && (
            <div className="tram-scroll max-h-[85vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Hồ sơ khách hàng: {detail.name}</DialogTitle>
                <DialogDescription>
                  Thông tin hạng thân thiết {LOYALTY_TIERS[detail.tier]?.name ?? "Hạng Hương"}, điểm tích lũy và lịch sử đặt bàn.
                </DialogDescription>
              </DialogHeader>

              {/* Digital VIP Membership Card (Header) */}
              <div
                className={`relative overflow-hidden p-6 text-white ${
                  detail.tier === "NAM_TRAM"
                    ? "bg-gradient-to-br from-[#12081f] via-[#24133b] to-[#0c0514] border-b border-amber-500/50"
                    : detail.tier === "TRAM"
                      ? "bg-gradient-to-br from-[#78350f] via-[#92400e] to-[#451a03]"
                      : "bg-gradient-to-br from-[#292524] via-[#38332f] to-[#1c1917]"
                }`}
              >
                {/* Background decorative pattern */}
                <div className="absolute right-0 top-0 -mr-10 -mt-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute left-1/2 bottom-0 h-32 w-32 rounded-full bg-amber-500/10 blur-xl" />

                <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pr-12 sm:pr-14">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-widest text-amber-300 uppercase">
                        TRẦM Reserve · VIP Membership
                      </span>
                    </div>
                    <h3 className="font-heading text-2xl font-bold tracking-tight text-white">
                      {detail.name}
                    </h3>
                    <p className="text-xs text-stone-200/90">
                      SĐT: {detail.phone} · Đã ghé thăm {detail.visits} lần · Lần cuối:{" "}
                      {formatLongDate(detail.lastVisit).split(", ")[1]}
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider shadow-sm ${
                        detail.tier === "NAM_TRAM"
                          ? "bg-gradient-to-r from-amber-400 to-amber-300 text-stone-950 border border-amber-200 shadow-md"
                          : detail.tier === "TRAM"
                            ? "bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 border border-amber-300 shadow-md"
                            : "bg-amber-100 text-[#78350f] border border-amber-300/90 shadow-md"
                      }`}
                    >
                      <TierIcon tier={detail.tier} className="h-3.5 w-3.5" />
                      {LOYALTY_TIERS[detail.tier]?.name ?? "Hạng Hương"}
                    </span>
                    <span className="mt-1 text-[11px] font-medium text-amber-200/90 text-left sm:text-right">
                      {LOYALTY_TIERS[detail.tier]?.tagline}
                    </span>
                  </div>
                </div>

                {/* Card Chips & Points */}
                <div className="relative z-10 mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider opacity-70">
                      Điểm tích lũy hiện có (1.000 đ = 1 pt)
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
                {/* Hành trình thăng hạng theo lượt đến (FR-21) */}
                <div className="rounded-xl border border-stone-200/90 bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-stone-700">
                      <TrendingUp className="h-4 w-4 text-[#b45309]" />
                      Hành trình thăng hạng ({detail.visits} lượt đến)
                    </span>
                    <span className="font-bold text-[#b45309]">
                      {detail.tier === "NAM_TRAM"
                        ? "Đã đạt hạng Nam Trầm cao nhất"
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

                  <p className="mt-2 text-xs text-muted-foreground">
                    {detail.tier === "NAM_TRAM" ? (
                      <span className="text-purple-900 font-semibold">
                        Khách hàng đang sở hữu toàn bộ đặc quyền cao nhất của TRẦM Reserve.
                      </span>
                    ) : detail.tier === "TRAM" ? (
                      <>
                        Cần thêm{" "}
                        <strong className="text-stone-900">
                          {Math.max(0, 6 - detail.visits)} lượt đến nữa
                        </strong>{" "}
                        để đạt mốc 6 lượt và nâng hạng thành{" "}
                        <span className="font-bold text-purple-900">
                          Hạng Nam Trầm (Miễn 100% cọc)
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        Cần thêm{" "}
                        <strong className="text-stone-900">
                          {Math.max(0, 3 - detail.visits)} lượt đến nữa
                        </strong>{" "}
                        để đạt mốc 3 lượt và nâng hạng thành{" "}
                        <span className="font-bold text-[#b45309]">
                          Hạng Trầm (+5% điểm hóa đơn)
                        </span>
                        .
                      </>
                    )}
                  </p>
                </div>

                {/* Danh sách Đặc Quyền Hội Viên theo Bảng 8 */}
                <div className="space-y-2.5">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                    <Gift className="h-4 w-4 text-amber-600" />
                    Đặc Quyền Hội Viên Của {LOYALTY_TIERS[detail.tier]?.name ?? "Hạng Hương"} (Bảng 8)
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(LOYALTY_TIERS[detail.tier]?.benefits ?? LOYALTY_TIERS.HUONG.benefits).map((b, i) => (
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
                    Lịch Sử Dùng Bữa & Tích Điểm ({detail.reservations.length} lần)
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
