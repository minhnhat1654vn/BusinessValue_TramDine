"use client";

// FR-29 — Quản lý tồn kho: theo dõi lượng tồn theo từng nguyên liệu,
// tổng giá trị kho cập nhật liên tục theo thời gian thực.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StockInModal } from "./stock-in-modal";
import Image from "next/image";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Flame,
  Layers,
  Package,
  RotateCcw,
  Search,
  Users,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { MENU_ITEMS } from "@/lib/tram/constants";
import { formatPercent, formatVND } from "@/lib/tram/format";
import {
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  formatNumberVi,
  formatQty,
  roundQty,
  type IngredientGroup,
} from "@/lib/tram/recipes";
import { formatSignedVND, getImportUnitFactor } from "@/lib/tram/food-cost";
import {
  applyDishMovement,
  applyStandardServingsMovement,
  calculateInventoryReport,
  type InventoryItem,
} from "@/lib/tram/inventory";

const GROUP_STYLES: Record<
  IngredientGroup,
  { badge: string; dot: string; bar: string; activeTile: string }
> = {
  PROTEIN: {
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    activeTile: "border-rose-400 bg-rose-50/70",
  },
  STARCH: {
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    activeTile: "border-amber-400 bg-amber-50/70",
  },
  DAIRY_FAT: {
    badge: "border-yellow-200 bg-yellow-50 text-yellow-800",
    dot: "bg-yellow-500",
    bar: "bg-yellow-500",
    activeTile: "border-yellow-400 bg-yellow-50/70",
  },
  PRODUCE: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    activeTile: "border-emerald-400 bg-emerald-50/70",
  },
  FRUIT_NUT: {
    badge: "border-orange-200 bg-orange-50 text-orange-800",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    activeTile: "border-orange-400 bg-orange-50/70",
  },
  SEASONING: {
    badge: "border-stone-300 bg-stone-100 text-stone-700",
    dot: "bg-stone-500",
    bar: "bg-stone-500",
    activeTile: "border-stone-400 bg-stone-100/80",
  },
  AROMATIC: {
    badge: "border-violet-200 bg-violet-50 text-violet-800",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    activeTile: "border-violet-400 bg-violet-50/70",
  },
};

const SHORT_GROUP_LABELS: Record<IngredientGroup, string> = {
  PROTEIN: "Đạm",
  STARCH: "Tinh bột",
  DAIRY_FAT: "Sữa & béo",
  PRODUCE: "Rau & nấm",
  FRUIT_NUT: "Trái cây & hạt",
  SEASONING: "Gia vị",
  AROMATIC: "Hương liệu",
};

const GROUP_SECTION_STYLES: Record<
  IngredientGroup,
  {
    rowBg: string;
    border: string;
    pillBg: string;
    pillBorder: string;
    textColor: string;
    dotColor: string;
    countBadge: string;
    valueBadge: string;
  }
> = {
  PROTEIN: {
    rowBg: "bg-rose-50/80 hover:bg-rose-50",
    border: "border-rose-200",
    pillBg: "bg-rose-100",
    pillBorder: "border-rose-400",
    textColor: "text-rose-900",
    dotColor: "bg-rose-600",
    countBadge: "bg-rose-200 text-rose-950",
    valueBadge: "text-rose-900",
  },
  STARCH: {
    rowBg: "bg-amber-50/80 hover:bg-amber-50",
    border: "border-amber-200",
    pillBg: "bg-amber-100",
    pillBorder: "border-amber-400",
    textColor: "text-amber-900",
    dotColor: "bg-amber-600",
    countBadge: "bg-amber-200 text-amber-950",
    valueBadge: "text-amber-900",
  },
  DAIRY_FAT: {
    rowBg: "bg-yellow-50/80 hover:bg-yellow-50",
    border: "border-yellow-200",
    pillBg: "bg-yellow-100",
    pillBorder: "border-yellow-400",
    textColor: "text-yellow-950",
    dotColor: "bg-yellow-600",
    countBadge: "bg-yellow-200 text-yellow-950",
    valueBadge: "text-yellow-900",
  },
  PRODUCE: {
    rowBg: "bg-emerald-50/80 hover:bg-emerald-50",
    border: "border-emerald-200",
    pillBg: "bg-emerald-100",
    pillBorder: "border-emerald-400",
    textColor: "text-emerald-950",
    dotColor: "bg-emerald-600",
    countBadge: "bg-emerald-200 text-emerald-950",
    valueBadge: "text-emerald-900",
  },
  FRUIT_NUT: {
    rowBg: "bg-orange-50/80 hover:bg-orange-50",
    border: "border-orange-200",
    pillBg: "bg-orange-100",
    pillBorder: "border-orange-400",
    textColor: "text-orange-950",
    dotColor: "bg-orange-600",
    countBadge: "bg-orange-200 text-orange-950",
    valueBadge: "text-orange-900",
  },
  SEASONING: {
    rowBg: "bg-stone-100/90 hover:bg-stone-100",
    border: "border-stone-300",
    pillBg: "bg-stone-200/90",
    pillBorder: "border-stone-400",
    textColor: "text-stone-900",
    dotColor: "bg-stone-600",
    countBadge: "bg-stone-300 text-stone-950",
    valueBadge: "text-stone-900",
  },
  AROMATIC: {
    rowBg: "bg-violet-50/80 hover:bg-violet-50",
    border: "border-violet-200",
    pillBg: "bg-violet-100",
    pillBorder: "border-violet-400",
    textColor: "text-violet-950",
    dotColor: "bg-violet-600",
    countBadge: "bg-violet-200 text-violet-950",
    valueBadge: "text-violet-900",
  },
};

type StockScope = "ALL" | "SAFE" | "NEEDS_REORDER" | "OUT" | "STANDARD";

function areMapsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export function AdminInventory({
  onNavigateTab,
  hideTitleHeader = false,
}: {
  onNavigateTab?: (tab: string) => void;
  hideTitleHeader?: boolean;
} = {}) {
  const [loaded, setLoaded] = useState(false);
  const [savedStock, setSavedStock] = useState<Record<string, number>>({});
  const [draftStock, setDraftStock] = useState<Record<string, number>>({});
  const [savedReorder, setSavedReorder] = useState<Record<string, number>>({});
  const [draftReorder, setDraftReorder] = useState<Record<string, number>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [scope, setScope] = useState<StockScope>("ALL");
  const [selectedGroup, setSelectedGroup] = useState<IngredientGroup | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockInTargetId, setStockInTargetId] = useState<string | undefined>(undefined);

  const pendingSyncRef = useRef(false);
  const isPendingSync = useMemo(
    () =>
      loaded &&
      (!areMapsEqual(draftStock, savedStock) ||
        !areMapsEqual(draftReorder, savedReorder)),
    [loaded, draftStock, savedStock, draftReorder, savedReorder],
  );

  useEffect(() => {
    pendingSyncRef.current = isPendingSync || isSaving;
  }, [isPendingSync, isSaving]);

  // Tải trạng thái tồn kho & đơn giá nhập kho hiệu lực từ server
  const fetchSnapshot = useCallback((isInitial: boolean) => {
    fetch(`/api/inventory?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (!isInitial && pendingSyncRef.current) return;
        const nextStock =
          data.stockOverrides && typeof data.stockOverrides === "object"
            ? (data.stockOverrides as Record<string, number>)
            : {};
        const nextPrices =
          data.priceOverrides && typeof data.priceOverrides === "object"
            ? (data.priceOverrides as Record<string, number>)
            : {};
        const nextReorder =
          data.reorderOverrides && typeof data.reorderOverrides === "object"
            ? (data.reorderOverrides as Record<string, number>)
            : {};
        setSavedStock(nextStock);
        setDraftStock(nextStock);
        setSavedReorder(nextReorder);
        setDraftReorder(nextReorder);
        setPriceOverrides(nextPrices);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    fetchSnapshot(true);

    const onWindowFocus = () => {
      if (!pendingSyncRef.current) fetchSnapshot(false);
    };
    window.addEventListener("focus", onWindowFocus);

    return () => {
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [fetchSnapshot]);

  const handleStockInSuccess = useCallback(() => {
    fetchSnapshot(true);
    toast.success("Đã ghi nhận phiếu nhập kho và cập nhật số lượng tồn");
  }, [fetchSnapshot]);

  // Tự động đồng bộ tồn kho & mức đặt lại lên server mỗi khi chỉnh sửa (liên tục, debounce 380ms)
  useEffect(() => {
    if (
      !loaded ||
      (areMapsEqual(draftStock, savedStock) && areMapsEqual(draftReorder, savedReorder))
    )
      return;

    let cancelled = false;
    const stockSnapshot = draftStock;
    const reorderSnapshot = draftReorder;
    const timer = window.setTimeout(() => {
      setIsSaving(true);
      fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: stockSnapshot,
          reorderPoints: reorderSnapshot,
          fullReplace: true,
        }),
      })
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Không lưu được tồn kho.");
          if (!cancelled) {
            const persisted = (body.stockOverrides ?? {}) as Record<string, number>;
            const persistedReorder = (body.reorderOverrides ?? {}) as Record<string, number>;
            const latestPrices = (body.priceOverrides ?? {}) as Record<string, number>;
            setSavedStock(persisted);
            setSavedReorder(persistedReorder);
            setPriceOverrides(latestPrices);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            toast.error(err instanceof Error ? err.message : "Lỗi đồng bộ tồn kho.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsSaving(false);
        });
    }, 380);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loaded, draftStock, savedStock, draftReorder, savedReorder]);



  async function handleResetAllStock() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/inventory", { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Không khôi phục được kho chuẩn.");
      setSavedStock({});
      setDraftStock({});
      setSavedReorder({});
      setDraftReorder({});
      if (body.priceOverrides && typeof body.priceOverrides === "object") {
        setPriceOverrides(body.priceOverrides as Record<string, number>);
      }
      if (scope === "OUT" || scope === "NEEDS_REORDER") setScope("ALL");
      toast.success("Đã khôi phục định mức tồn kho & ngưỡng đặt lại chuẩn.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khôi phục tồn kho.");
    } finally {
      setIsSaving(false);
    }
  }

  // ---------- Báo cáo tồn kho & tổng giá trị kho tự tính tức thời ----------
  const report = useMemo(
    () => calculateInventoryReport(draftStock, priceOverrides, draftReorder),
    [draftStock, priceOverrides, draftReorder],
  );

  const topGroup = useMemo(() => {
    return report.groupSummary.reduce(
      (best, cur) => (cur.totalValue > best.totalValue ? cur : best),
      report.groupSummary[0],
    );
  }, [report.groupSummary]);

  const standardCount = useMemo(
    () => report.items.filter((i) => i.isStandardIngredient).length,
    [report.items],
  );

  // Tình trạng nguyên liệu của từng món 1..7 (cảnh báo nếu có nguyên liệu < 32%)
  const dishStatusMap = useMemo(() => {
    const map: Record<number, { hasWarning: boolean; warningIngredients: string[] }> = {};
    for (const dish of MENU_ITEMS) {
      const dishItems = report.items.filter((i) =>
        i.standardDishIndexes.includes(dish.index),
      );
      const warnings = dishItems.filter((i) => i.isWarning).map((i) => i.name);
      map[dish.index] = {
        hasWarning: warnings.length > 0,
        warningIngredients: warnings,
      };
    }
    return map;
  }, [report.items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return report.items.filter((item) => {
      if (scope === "SAFE" && !item.isSafe) return false;
      if (scope === "NEEDS_REORDER" && !item.isWarning) return false;
      if (scope === "OUT" && item.stockQty > 0) return false;
      if (scope === "STANDARD" && !item.isStandardIngredient) return false;
      if (selectedGroup !== "ALL" && item.group !== selectedGroup) return false;
      if (q) {
        const hitName = item.name.toLowerCase().includes(q);
        const hitOrigin = item.origin?.toLowerCase().includes(q) ?? false;
        const hitZone = item.storageZone.toLowerCase().includes(q);
        const hitSpec = item.spec?.toLowerCase().includes(q) ?? false;
        if (!hitName && !hitOrigin && !hitZone && !hitSpec) return false;
      }
      return true;
    });
  }, [report.items, scope, selectedGroup, search]);

  // Phân trang danh mục tồn kho (giới hạn 20 dòng / trang)
  const [invPage, setInvPage] = useState(1);
  const INV_PAGE_SIZE = 20;

  useEffect(() => {
    setInvPage(1);
  }, [scope, selectedGroup, search]);

  const invTotalPages = Math.max(1, Math.ceil(filteredItems.length / INV_PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (invPage - 1) * INV_PAGE_SIZE;
    return filteredItems.slice(start, start + INV_PAGE_SIZE);
  }, [filteredItems, invPage]);

  const itemsByGroup = useMemo(
    () =>
      INGREDIENT_GROUP_ORDER.map((group) => ({
        group,
        items: paginatedItems.filter((i) => i.group === group),
      })).filter((g) => g.items.length > 0),
    [paginatedItems],
  );

  const filteredValueTotal = useMemo(
    () => filteredItems.reduce((sum, i) => sum + i.stockValue, 0),
    [filteredItems],
  );

  const filteredSharePct =
    report.totalValue > 0
      ? Math.round((filteredValueTotal / report.totalValue) * 1000) / 10
      : 0;

  return (
    <div className="space-y-6 font-heading">
      {/* ==================== 1. TIÊU ĐỀ ==================== */}
      {!hideTitleHeader ? (
        <div className="flex flex-col gap-2 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
                Bếp &amp; kho
              </span>
            </div>
            <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
              Quản lý tồn kho nguyên vật liệu
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kiểm kê định mức tồn, dự báo hạn sử dụng và tổng giá trị kho vật liệu theo thời gian thực.
            </p>
          </div>

          {(report.customizedStockCount > 0 ||
            report.customizedReorderCount > 0 ||
            Object.keys(savedStock).length > 0 ||
            Object.keys(savedReorder).length > 0) && (
            <button
              type="button"
              disabled={isSaving || isDispatching}
              onClick={() => void handleResetAllStock()}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-background px-3 py-1 text-xs font-semibold text-[#92400e] transition-colors hover:bg-[#fdf0d5]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Khôi phục kho chuẩn
            </button>
          )}
        </div>
      ) : (
        (report.customizedStockCount > 0 ||
          report.customizedReorderCount > 0 ||
          Object.keys(savedStock).length > 0 ||
          Object.keys(savedReorder).length > 0) ? (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isSaving || isDispatching}
              onClick={() => void handleResetAllStock()}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-background px-3 py-1 text-xs font-semibold text-[#92400e] transition-colors hover:bg-[#fdf0d5]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Khôi phục kho chuẩn
            </button>
          </div>
        ) : null
      )}

      {/* ==================== 2. CHỈ SỐ TỒN KHO TRỰC TIẾP ==================== */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            id: "total-value",
            label: "Tổng giá trị kho",
            value: formatVND(report.totalValue),
            sub:
              report.deltaVsDefaultValue === 0
                ? `${report.inStockCount}/${report.totalIngredients} nguyên liệu có tồn`
                : `${formatSignedVND(report.deltaVsDefaultValue)} so với kho chuẩn`,
            icon: Warehouse,
            tone: "default" as const,
          },
          {
            id: "servings-capacity",
            label: "Đủ phục vụ chuẩn",
            value: `${report.maxStandardGuests} khách`,
            sub:
              report.needsReorderCount > 0
                ? `${report.needsReorderCount} nguyên liệu cảnh báo < 32%`
                : report.bottleneckIngredient
                  ? `Giới hạn: ${report.bottleneckIngredient.name}`
                  : "Toàn bộ nguyên liệu ≥ 32%",
            icon: Users,
            tone:
              report.maxStandardGuests === 0 || report.needsReorderCount > 0
                ? ("warn" as const)
                : report.maxStandardGuests >= 42
                  ? ("good" as const)
                  : ("default" as const),
          },
          {
            id: "total-volume",
            label: "Khối lượng & thể tích",
            value: formatQty(report.totalSolidG, "g"),
            sub: `và ${formatQty(report.totalLiquidMl, "ml")} chất lỏng`,
            icon: Package,
            tone: "default" as const,
          },
          {
            id: "top-group",
            label: "Nhóm giá trị cao nhất",
            value: formatVND(topGroup.totalValue),
            sub: `${SHORT_GROUP_LABELS[topGroup.group]} · ${formatPercent(topGroup.shareOfValuePct, 1)} tổng kho`,
            icon: Coins,
            tone: "default" as const,
          },
        ].map((card) => (
          <Card key={card.id} className="min-w-0 gap-0 border-border/80 bg-card py-0 shadow-xs">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase leading-tight tracking-wider text-stone-600 sm:text-[11px]">
                  {card.label}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    card.tone === "good"
                      ? "bg-emerald-100 text-emerald-700"
                      : card.tone === "warn"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-[#fdf0d5] text-[#b45309]",
                  )}
                >
                  <card.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <div
                className={cn(
                  "mt-2 whitespace-nowrap font-heading text-lg font-bold tabular-nums sm:text-xl 2xl:text-2xl",
                  card.tone === "good"
                    ? "text-emerald-800"
                    : card.tone === "warn"
                      ? "text-rose-700"
                      : "text-[#92400e]",
                )}
              >
                {card.value}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={card.sub}>
                {card.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ==================== 3. CƠ CẤU GIÁ TRỊ KHO THEO NHÓM ==================== */}
      <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
        <CardHeader className="border-b border-border/60 px-4 py-3.5 sm:px-5 [.border-b]:pb-3.5">
          <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold text-[#292524]">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#b45309]" aria-hidden />
              Giá trị tồn kho theo nhóm nguyên liệu
            </span>
            <span className="font-heading text-base font-bold tabular-nums text-[#92400e]">
              {formatVND(report.totalValue)}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          {/* Thanh phân bổ giá trị tồn theo 7 nhóm */}
          <div className="flex h-3.5 w-full overflow-hidden rounded-full border border-border/70 bg-[#f5efe4]">
            {report.groupSummary.map((g) => {
              const widthPct =
                report.totalValue > 0 ? (g.totalValue / report.totalValue) * 100 : 0;
              if (widthPct <= 0) return null;
              return (
                <div
                  key={g.group}
                  style={{ width: `${widthPct}%` }}
                  title={`${g.label}: ${formatVND(g.totalValue)} (${formatPercent(g.shareOfValuePct, 1)})`}
                  className={cn(
                    "h-full transition-all duration-300",
                    GROUP_STYLES[g.group].bar,
                    selectedGroup !== "ALL" && selectedGroup !== g.group && "opacity-30",
                  )}
                />
              );
            })}
          </div>

          {/* 7 ô nhóm tương tác (bấm để lọc nhanh bảng bên dưới) */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {report.groupSummary.map((g) => {
              const active = selectedGroup === g.group;
              return (
                <button
                  key={g.group}
                  type="button"
                  onClick={() =>
                    setSelectedGroup((prev) => (prev === g.group ? "ALL" : g.group))
                  }
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col rounded-xl border p-2.5 text-left transition-colors",
                    active
                      ? GROUP_STYLES[g.group].activeTile
                      : "border-border/70 bg-muted/15 hover:border-[#b45309]/40 hover:bg-[#fdf0d5]/30",
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", GROUP_STYLES[g.group].dot)}
                    />
                    <span className={cn("text-xs font-black uppercase tracking-wide", GROUP_SECTION_STYLES[g.group].textColor)}>
                      {SHORT_GROUP_LABELS[g.group]}
                    </span>
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                      ({formatPercent(g.shareOfValuePct, 1)})
                    </span>
                  </div>
                  <div className="mt-1 text-center text-xs font-black tabular-nums text-[#92400e]">
                    {formatVND(g.totalValue)}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ==================== 3B. DỰ BÁO NHU CẦU & KHO THIẾU HỤT THEO LỊCH ĐẶT BÀN ==================== */}
      <InventoryDemandForecastSection
        items={report.items}
        totalWarehouseValue={report.totalValue}
        onStockIn={(id) => {
          setStockInTargetId(id);
          setStockInOpen(true);
        }}
      />

      {/* ==================== 4. BẢNG TỒN KHO THEO TỪNG NGUYÊN LIỆU ==================== */}
      <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-[#292524]">
              <Warehouse className="h-4 w-4 text-[#7c2d12]" aria-hidden />
              Sổ tồn kho nguyên liệu
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setStockInTargetId(undefined);
                  setStockInOpen(true);
                }}
                className="h-9 gap-1.5 rounded-sm bg-[#7c2d12] px-3.5 font-heading text-xs font-semibold text-[#fdf0d5] shadow-none hover:bg-[#5f200c]"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
                Nhập hàng vào kho
              </Button>

              <div className="relative w-full sm:w-60">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm nguyên liệu..."
                  aria-label="Tìm nguyên liệu trong kho"
                  className="h-9 rounded-sm pl-8 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Lọc phạm vi */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Phạm vi tồn kho">
              {(
                [
                  { key: "ALL" as const, label: `Tất cả (${report.totalIngredients})`, tone: "neutral" as const },
                  { key: "SAFE" as const, label: `Còn hàng (${report.safeCount})`, tone: "safe" as const },
                  ...(report.needsReorderCount > 0
                    ? [
                        {
                          key: "NEEDS_REORDER" as const,
                          label: `Cảnh báo < 32% (${report.needsReorderCount})`,
                          tone: "warn" as const,
                        },
                      ]
                    : []),
                  ...(report.outOfStockCount > 0
                    ? [{ key: "OUT" as const, label: `Hết tồn (${report.outOfStockCount})`, tone: "out" as const }]
                    : []),
                  { key: "STANDARD" as const, label: `Suất chuẩn (${standardCount})`, tone: "neutral" as const },
                ]
              ).map((tab) => {
                const active = scope === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setScope(tab.key)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-sm border px-3 py-1 font-heading text-xs font-semibold transition-colors",
                      active
                        ? "border-[#7c2d12] bg-[#7c2d12] text-[#fdf0d5]"
                        : tab.tone === "warn" || tab.tone === "out"
                          ? "border-stone-300 bg-transparent text-rose-800 hover:border-[#7c2d12]"
                          : "border-stone-300 bg-transparent text-stone-700 hover:border-[#7c2d12]",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Lọc nhóm */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc nhóm nguyên liệu">
              {(["ALL", ...INGREDIENT_GROUP_ORDER] as const).map((g) => {
                const active = selectedGroup === g;
                const count =
                  g === "ALL"
                    ? report.totalIngredients
                    : report.items.filter((i) => i.group === g).length;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGroup(g)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-heading text-[11px] font-medium transition-colors",
                      active
                        ? "border-[#7c2d12] bg-[#7c2d12] text-[#fdf0d5]"
                        : "border-stone-300 bg-transparent text-stone-600 hover:border-[#7c2d12] hover:text-[#7c2d12]",
                    )}
                  >
                    {g === "ALL" ? "Tất cả nhóm" : SHORT_GROUP_LABELS[g]}
                    <span
                      className={cn(
                        "tabular-nums",
                        active ? "text-amber-100" : "text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Search className="h-6 w-6 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Không có nguyên liệu phù hợp bộ lọc.
              </p>
            </div>
          ) : (
            <Table className="min-w-[960px] font-heading">
              <TableHeader>
                <TableRow className="border-b-2 border-[#7c2d12]/50 bg-[#f6efe0] hover:bg-[#f6efe0]">
                  <TableHead className="pl-4 text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pl-5">
                    Nguyên liệu
                  </TableHead>
                  <TableHead className="w-24 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Món dùng
                  </TableHead>
                  <TableHead className="w-36 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Số lượng tồn
                  </TableHead>
                  <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Mức đặt lại
                  </TableHead>
                  <TableHead className="w-24 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Đủ phục vụ
                  </TableHead>
                  <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Đơn giá kho
                  </TableHead>
                  <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Giá trị tồn
                  </TableHead>
                  <TableHead className="w-24 whitespace-nowrap pr-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pr-5">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {itemsByGroup.map(({ group, items }) => (
                  <InventoryGroupSection
                    key={group}
                    group={group}
                    items={items}
                    totalWarehouseValue={report.totalValue}
                    onStockIn={(id) => {
                      setStockInTargetId(id);
                      setStockInOpen(true);
                    }}
                  />
                ))}
              </TableBody>

              <TableFooter className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="pl-4 text-xs font-semibold text-stone-700 sm:pl-5"
                  >
                    {scope === "ALL" && selectedGroup === "ALL" && !search.trim()
                      ? `Tổng giá trị kho · ${report.totalIngredients} nguyên liệu`
                      : `Tổng theo bộ lọc · ${filteredItems.length} nguyên liệu (${formatPercent(filteredSharePct, 1)} kho)`}
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold tabular-nums text-[#92400e]">
                    {formatVND(filteredValueTotal)}
                  </TableCell>
                  <TableCell className="pr-4 sm:pr-5" />
                </TableRow>
              </TableFooter>
            </Table>
          )}

          {/* Phân trang giới hạn 20 dòng / trang */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/80 px-4 py-3 bg-muted/20 text-xs text-muted-foreground">
              <div>
                Hiển thị{" "}
                <strong className="text-stone-800">
                  {filteredItems.length === 0 ? 0 : (invPage - 1) * INV_PAGE_SIZE + 1}
                </strong>{" "}
                –{" "}
                <strong className="text-stone-800">
                  {Math.min(invPage * INV_PAGE_SIZE, filteredItems.length)}
                </strong>{" "}
                trong tổng số{" "}
                <strong className="text-stone-800">{filteredItems.length}</strong> nguyên liệu (tối đa 20 dòng / trang)
              </div>

              {invTotalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={invPage <= 1}
                    onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2.5 text-xs text-stone-700"
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Trước
                  </Button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: invTotalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setInvPage(p)}
                        className={cn(
                          "h-7 w-7 rounded-md text-xs font-semibold transition-colors",
                          invPage === p
                            ? "bg-[#b45309] text-white"
                            : "text-stone-600 hover:bg-muted"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={invPage >= invTotalPages}
                    onClick={() => setInvPage((p) => Math.min(invTotalPages, p + 1))}
                    className="h-7 px-2.5 text-xs text-stone-700"
                  >
                    Sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL PHIẾU NHẬP HÀNG VÀO KHO */}
      <StockInModal
        open={stockInOpen}
        onOpenChange={setStockInOpen}
        initialIngredientId={stockInTargetId}
        onSuccess={handleStockInSuccess}
      />
    </div>
  );
}

// ---------- Nhóm dòng nguyên liệu & Dòng hiển thị tồn kho tự động ----------

function InventoryGroupSection({
  group,
  items,
  totalWarehouseValue,
  onStockIn,
}: {
  group: IngredientGroup;
  items: InventoryItem[];
  totalWarehouseValue: number;
  onStockIn: (id: string) => void;
}) {
  const groupSubtotal = items.reduce((sum, i) => sum + i.stockValue, 0);
  const groupPct =
    totalWarehouseValue > 0 ? Math.round((groupSubtotal / totalWarehouseValue) * 1000) / 10 : 0;

  return (
    <>
      <TableRow className="border-y border-stone-300 bg-[#f6efe0] hover:bg-[#f6efe0]">
        <TableCell colSpan={8} className="px-4 py-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span className="h-px w-8 bg-[#92400e]/40" aria-hidden />
            <span className="font-heading text-[13px] font-bold uppercase tracking-[0.18em] text-[#7c2d12]">
              {INGREDIENT_GROUP_LABELS[group]}
            </span>
            <span className="text-[11px] italic text-stone-600">
              {items.length} mặt hàng
            </span>
            <span className="h-px w-8 bg-[#92400e]/40" aria-hidden />
            <span className="text-[11.5px] tabular-nums text-stone-700">
              Giá trị tồn nhóm: <strong className="font-heading font-bold text-stone-900">{formatVND(groupSubtotal)}</strong>
              <span className="ml-1 text-stone-500">({formatPercent(groupPct, 1)} kho)</span>
            </span>
          </div>
        </TableCell>
      </TableRow>
      {items.map((item) => (
        <InventoryStockRow key={item.ingredientId} item={item} onStockIn={onStockIn} />
      ))}
    </>
  );
}

function InventoryStockRow({
  item,
  onStockIn,
}: {
  item: InventoryItem;
  onStockIn: (id: string) => void;
}) {
  const isOut = item.stockQty === 0;
  const isWarning = item.isWarning; // stockPercent < 32% or isOut
  const isSafe = item.isSafe; // stockPercent >= 32%

  return (
    <TableRow
      className={cn(
        "transition-colors",
        "border-b border-stone-200/80 bg-[#fffdf8] hover:bg-[#fdf0d5]/30",
        isOut && "bg-rose-50/40",
      )}
    >
      {/* 1. Nguyên liệu & Nhãn cảnh báo */}
      <TableCell className="whitespace-normal pl-4 sm:pl-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-heading font-semibold text-[#292524]">{item.name}</span>
          {isOut ? (
            <span className="text-[11px] font-semibold italic text-rose-800">— hết tồn</span>
          ) : isWarning ? (
            <span className="text-[11px] font-semibold italic text-rose-700">— cần đặt thêm</span>
          ) : null}
          {item.isCustomPrice && (
            <Badge
              variant="outline"
              className="rounded-sm border-stone-300 bg-transparent px-1.5 py-0 text-[9.5px] font-medium italic text-stone-600"
            >
              Giá mới
            </Badge>
          )}
        </div>
      </TableCell>

      {/* 2. Món dùng */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {item.standardDishIndexes.map((idx) => {
            const dishName = MENU_ITEMS.find((m) => m.index === idx)?.name ?? `Món ${idx}`;
            return (
              <span
                key={`std-${idx}`}
                title={`Món ${idx}: ${dishName}`}
                className="flex h-6 w-6 items-center justify-center rounded-sm border border-stone-400 bg-transparent font-heading text-[11px] font-bold tabular-nums text-stone-800"
              >
                {idx}
              </span>
            );
          })}
          {item.altDishIndexes.map((idx) => {
            const dishName = MENU_ITEMS.find((m) => m.index === idx)?.name ?? `Món ${idx}`;
            return (
              <span
                key={`alt-${idx}`}
                title={`Món ${idx} (phương án thay thế): ${dishName}`}
                className="flex h-6 w-6 items-center justify-center rounded-sm border border-dashed border-stone-400 bg-transparent font-heading text-[11px] font-semibold tabular-nums text-stone-500"
              >
                {idx}
              </span>
            );
          })}
        </div>
      </TableCell>

      {/* 3. Số lượng tồn kho (tự động tính theo thời gian thực) */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <span
            className={cn(
              "font-heading text-sm font-bold tabular-nums",
              isWarning ? "text-rose-800" : "text-stone-900",
            )}
          >
            {formatNumberVi(item.stockInImportUnit)} {item.importUnitLabel}
          </span>
          <span
            className={cn(
              "text-[10.5px] tabular-nums",
              isWarning ? "font-semibold text-rose-700" : "text-stone-500",
            )}
            title={`Tỷ lệ tồn: ${item.stockPercent}% so với định mức`}
          >
            ({item.stockPercent}%)
          </span>
        </div>
        {item.stockQty > 0 && item.stockQty < 1000 && item.importUnit !== "ml" && (
          <div className="text-[10px] tabular-nums text-muted-foreground">
            ({formatQty(item.stockQty, item.unit)})
          </div>
        )}
      </TableCell>

      {/* 4. Mức đặt lại (ngưỡng cảnh báo 32%) */}
      <TableCell className="text-right">
        <div
          className={cn(
            "text-xs font-semibold tabular-nums",
            isWarning ? "font-bold text-rose-900" : "text-stone-700",
          )}
        >
          {formatNumberVi(item.reorderPointInImportUnit)} {item.importUnitLabel}
        </div>
        <div
          className={cn(
            "text-[10px] font-medium",
            isWarning ? "text-rose-700 font-semibold" : "text-stone-500",
          )}
        >
          Ngưỡng 32%
        </div>
      </TableCell>

      {/* 5. Đủ phục vụ */}
      <TableCell className="text-right tabular-nums">
        {item.estimatedGuests === null ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          <div>
            <span
              className={cn(
                "text-xs font-semibold",
                isWarning ? "text-rose-700" : "text-stone-800",
              )}
            >
              {item.estimatedGuests} suất
            </span>
            {!item.isStandardIngredient && (
              <div className="text-[10px] text-muted-foreground">thay thế</div>
            )}
          </div>
        )}
      </TableCell>

      {/* 6. Đơn giá kho */}
      <TableCell className="text-right text-xs tabular-nums text-stone-600">
        {formatVND(item.importPrice)}/{item.importUnitLabel}
      </TableCell>

      {/* 7. Giá trị tồn */}
      <TableCell className="text-right">
        <div
          className={cn(
            "font-heading font-semibold tabular-nums",
            isWarning ? "text-rose-800" : "text-stone-900",
          )}
        >
          {formatVND(item.stockValue)}
        </div>
        <div className="text-[10.5px] tabular-nums text-muted-foreground">
          {formatPercent(item.shareOfValuePct, 1)}
        </div>
      </TableCell>

      {/* 8. Thao tác nhập hàng nhanh */}
      <TableCell className="pr-4 text-center sm:pr-5">
        <button
          type="button"
          onClick={() => onStockIn(item.ingredientId)}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-sm px-2 text-[10.5px] font-semibold transition-colors",
            isWarning ? "border border-rose-700 bg-rose-700 text-white hover:bg-rose-800" : "border border-stone-400 bg-transparent text-stone-700 hover:border-[#92400e] hover:bg-[#92400e] hover:text-white",
          )}
          title={`Nhập hàng thêm cho ${item.name}`}
        >
          <ArrowDownToLine className="h-3 w-3" />
          Nhập
        </button>
      </TableCell>
    </TableRow>
  );
}


// ==================== COMPONENT BẢNG HẠN DÙNG NGUYÊN LIỆU THEO NGÀY ====================

interface DailyDemandSummary {
  date: string;
  dayIndex: number;
  dayLabel: string;
  tableCount: number;
  guestCount: number;
}

interface ForecastItemAnalysis {
  item: InventoryItem;
  stdQtyPerGuest: number;
  totalRequiredQty: number; // in base unit (g/ml)
  requiredInImportUnit: number;
  stockInImportUnit: number;
  shortageQty: number; // in base unit
  shortageInImportUnit: number;
  isShortage: boolean;
  procurementCost: number; // VND
  surplusInImportUnit: number;
  guestsCovered: number;
  daysCoveredText: string;
}

function InventoryDemandForecastSection({
  items,
  totalWarehouseValue,
  onStockIn,
}: {
  items: InventoryItem[];
  totalWarehouseValue: number;
  onStockIn: (id: string) => void;
}) {
  const [dailyForecasts, setDailyForecasts] = useState<DailyDemandSummary[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number>(1);
  const [autoSelectedInfo, setAutoSelectedInfo] = useState<string>("");
  const [forecastSearch, setForecastSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<"SHORTAGE_ONLY" | "ALL">("SHORTAGE_ONLY");
  const [forecastPage, setForecastPage] = useState(1);
  const PAGE_SIZE = 15;

  // Lấy dữ liệu đặt bàn các ngày tới từ API
  useEffect(() => {
    let mounted = true;
    fetch("/api/inventory/demand-forecast")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data || !Array.isArray(data.days)) return;
        setDailyForecasts(data.days);
        setLoadingForecast(false);
      })
      .catch((err) => {
        console.error("Failed to fetch demand forecast:", err);
        if (mounted) setLoadingForecast(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const PRESET_DAYS = [1, 2, 3, 4, 5, 7, 14];

  // Helper tính nhu cầu và thiếu hụt cho 1 mốc số ngày
  const computeShortagesForDays = useCallback(
    (daysCount: number) => {
      if (dailyForecasts.length === 0) return [];
      const activeDays = dailyForecasts.slice(0, daysCount);
      const totalGuests = activeDays.reduce((sum, d) => sum + d.guestCount, 0);

      const list: ForecastItemAnalysis[] = items
        .filter((i) => i.qtyPerGuestStandard > 0)
        .map((item) => {
          const stdQty = item.qtyPerGuestStandard;
          const factor = getImportUnitFactor(item.importUnit) || 1000;
          const reqQty = stdQty * totalGuests;
          const shortage = Math.max(0, reqQty - item.stockQty);
          const isShort = shortage > 0;
          const shortageImportUnit = roundQty(shortage / factor);
          const reqImportUnit = roundQty(reqQty / factor);
          const stockImportUnit = roundQty(item.stockQty / factor);
          const surplusImportUnit = roundQty(Math.max(0, item.stockQty - reqQty) / factor);
          const cost = Math.round(shortageImportUnit * item.importPrice);
          const guestsCovered = Math.floor(item.stockQty / stdQty);

          // Tính số ngày tồn kho đáp ứng được
          let daysCountCovered = 0;
          let remaining = item.stockQty;
          for (const d of dailyForecasts) {
            const dayDemand = stdQty * d.guestCount;
            if (dayDemand <= 0) {
              daysCountCovered += 1;
              continue;
            }
            if (remaining >= dayDemand) {
              daysCountCovered += 1;
              remaining -= dayDemand;
            } else {
              daysCountCovered += Math.round((remaining / dayDemand) * 10) / 10;
              break;
            }
          }

          let daysCoveredText = `Đủ ${daysCountCovered.toFixed(1)} ngày`;
          if (item.stockQty === 0) daysCoveredText = "Hết hàng (0 ngày)";
          else if (daysCountCovered >= 14) daysCoveredText = "> 14 ngày (an toàn)";

          return {
            item,
            stdQtyPerGuest: stdQty,
            totalRequiredQty: reqQty,
            requiredInImportUnit: reqImportUnit,
            stockInImportUnit: stockImportUnit,
            shortageQty: shortage,
            shortageInImportUnit: shortageImportUnit,
            isShortage: isShort,
            procurementCost: cost,
            surplusInImportUnit: surplusImportUnit,
            guestsCovered,
            daysCoveredText,
          };
        });

      return list;
    },
    [dailyForecasts, items],
  );

  // Logic tự động chọn ngày theo yêu cầu nghiệp vụ:
  // "khi click vô page đó thì hiển số nguyên liệu còn dùng dc trong 1 ngày nếu 1 ngày k có thì 2 ngày,..."
  useEffect(() => {
    if (dailyForecasts.length === 0) return;

    for (const d of PRESET_DAYS) {
      const analyses = computeShortagesForDays(d);
      const shortageCount = analyses.filter((a) => a.isShortage).length;
      if (shortageCount > 0) {
        setSelectedDays(d);
        if (d === 1) {
          setAutoSelectedInfo(`Đã tự động chọn mốc 1 ngày: Phát hiện ${shortageCount} nguyên liệu thiếu ngay hôm nay!`);
        } else {
          setAutoSelectedInfo(`Đã tự động chuyển sang mốc ${d} ngày (vì mốc trước đó đã đủ hàng, mốc ${d} ngày bắt đầu có ${shortageCount} mặt hàng thiếu hụt).`);
        }
        return;
      }
    }
    // Nếu tất cả các mốc đều đủ
    setSelectedDays(3);
    setAutoSelectedInfo("Kho hiện tại đáp ứng tốt lịch đặt bàn trong 3 ngày tới.");
  }, [dailyForecasts, computeShortagesForDays]);

  // Số lượng mặt hàng thiếu theo từng nút preset ngày để hiển thị nhãn
  const presetShortageCounts = useMemo(() => {
    const map: Record<number, number> = {};
    for (const d of PRESET_DAYS) {
      const analyses = computeShortagesForDays(d);
      map[d] = analyses.filter((a) => a.isShortage).length;
    }
    return map;
  }, [PRESET_DAYS, computeShortagesForDays]);

  // Phân tích dữ liệu theo mốc ngày đang chọn
  const currentAnalyses = useMemo(() => {
    return computeShortagesForDays(selectedDays);
  }, [computeShortagesForDays, selectedDays]);

  // Thống kê tổng hợp cho mốc đang chọn
  const activeDays = useMemo(() => dailyForecasts.slice(0, selectedDays), [dailyForecasts, selectedDays]);
  const totalBookedTables = useMemo(() => activeDays.reduce((sum, d) => sum + d.tableCount, 0), [activeDays]);
  const totalBookedGuests = useMemo(() => activeDays.reduce((sum, d) => sum + d.guestCount, 0), [activeDays]);

  const shortageItems = useMemo(() => currentAnalyses.filter((a) => a.isShortage), [currentAnalyses]);
  const totalProcurementCost = useMemo(() => shortageItems.reduce((sum, a) => sum + a.procurementCost, 0), [shortageItems]);
  const zeroStockItems = useMemo(() => currentAnalyses.filter((a) => a.item.stockQty === 0), [currentAnalyses]);

  // Lọc theo chế độ xem (Chỉ thiếu / Tất cả) & từ khóa tìm kiếm
  const displayedItems = useMemo(() => {
    let list = viewFilter === "SHORTAGE_ONLY" ? shortageItems : currentAnalyses;

    if (forecastSearch.trim()) {
      const q = forecastSearch.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.item.name.toLowerCase().includes(q) ||
          INGREDIENT_GROUP_LABELS[a.item.group].toLowerCase().includes(q) ||
          a.item.storageZone.toLowerCase().includes(q),
      );
    }

    // Sắp xếp: Ưu tiên hết hàng (0%) lên đầu, tiếp theo là số tiền cần nhập giảm dần
    return list.sort((a, b) => {
      if (a.item.stockQty === 0 && b.item.stockQty > 0) return -1;
      if (b.item.stockQty === 0 && a.item.stockQty > 0) return 1;
      return b.procurementCost - a.procurementCost;
    });
  }, [viewFilter, shortageItems, currentAnalyses, forecastSearch]);

  const totalPages = Math.max(1, Math.ceil(displayedItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (forecastPage - 1) * PAGE_SIZE;
    return displayedItems.slice(start, start + PAGE_SIZE);
  }, [displayedItems, forecastPage]);

  // Reset trang khi đổi mốc ngày hoặc tìm kiếm
  useEffect(() => {
    setForecastPage(1);
  }, [selectedDays, viewFilter, forecastSearch]);

  return (
    <Card className="min-w-0 gap-0 overflow-hidden border-[#b45309]/30 bg-card py-0 shadow-sm ring-1 ring-[#b45309]/10">
      <CardHeader className="gap-3 border-b border-border/70 bg-gradient-to-r from-[#fdf0d5]/60 via-amber-50/40 to-white px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309] text-white shadow-xs">
                <CalendarDays className="h-4 w-4" />
              </span>
              <h3 className="font-heading text-base font-bold text-stone-900 sm:text-lg">
                Dự báo nhu cầu & Cảnh báo thiếu hụt theo lịch đặt bàn
              </h3>
              <Badge variant="outline" className="border-amber-400 bg-amber-100/90 text-[11px] font-bold text-amber-900">
                Tính theo định lượng BOM
              </Badge>
            </div>
            <p className="mt-1 text-xs text-stone-600 sm:text-[13px]">
              Dựa vào số bàn & số khách đã đặt trong các ngày tới, hệ thống tính toán tồn kho còn đủ dùng cho bao nhiêu ngày và số lượng còn thiếu cần nhập về để phục vụ đủ cho khách.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/80 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewFilter("SHORTAGE_ONLY")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer",
                  viewFilter === "SHORTAGE_ONLY"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                Chỉ hàng thiếu ({shortageItems.length})
              </button>
              <button
                type="button"
                onClick={() => setViewFilter("ALL")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer",
                  viewFilter === "ALL"
                    ? "bg-[#b45309] text-white shadow-2xs"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                Tất cả ({currentAnalyses.length})
              </button>
            </div>

            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={forecastSearch}
                onChange={(e) => setForecastSearch(e.target.value)}
                placeholder="Tìm nguyên liệu..."
                className="h-8 pl-8 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* Bộ lọc số ngày */}
        <div className="mt-1 flex flex-col gap-2 pt-2 border-t border-amber-200/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-stone-700 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#b45309]" />
              Khung thời gian đặt bàn:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_DAYS.map((days) => {
                const isSelected = selectedDays === days;
                const shortageCount = presetShortageCounts[days] ?? 0;
                let dayLabel = `${days} ngày`;
                if (days === 1) dayLabel = "1 ngày (Hôm nay)";
                else if (days === 7) dayLabel = "7 ngày (1 tuần)";
                else if (days === 14) dayLabel = "14 ngày (2 tuần)";

                return (
                  <button
                    key={`demand-days-${days}`}
                    type="button"
                    onClick={() => setSelectedDays(days)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all shadow-2xs cursor-pointer",
                      isSelected
                        ? "border-[#b45309] bg-[#b45309] text-white ring-2 ring-[#b45309]/30"
                        : "border-border/80 bg-white text-stone-700 hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/40",
                    )}
                  >
                    <span>{dayLabel}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold tabular-nums",
                        isSelected
                          ? "bg-white/20 text-white"
                          : shortageCount > 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {shortageCount > 0 ? `${shortageCount} thiếu` : "Đủ"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {autoSelectedInfo && (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-100/70 border border-amber-300/80 rounded-lg px-3 py-1.5">
              <span className="text-sm">⚡</span>
              <span>{autoSelectedInfo}</span>
            </div>
          )}
        </div>

        {/* 4 Thẻ chỉ số tổng quan cho mốc ngày đang chọn */}
        <div className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-4">
          <div className="rounded-xl border border-border/80 bg-white/90 p-3 text-left shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Lịch đặt ({selectedDays} ngày tới)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-heading text-lg font-black text-stone-900">
                {totalBookedTables} bàn
              </span>
              <span className="text-xs font-bold text-stone-600">
                · {totalBookedGuests} khách
              </span>
            </div>
            <div className="mt-0.5 text-[10.5px] text-muted-foreground">
              {totalBookedGuests} suất Tasting 7 món BOM
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-left shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
              Mặt hàng thiếu hụt
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={cn(
                "font-heading text-lg font-black",
                shortageItems.length > 0 ? "text-rose-700" : "text-emerald-700",
              )}>
                {shortageItems.length} nguyên liệu
              </span>
            </div>
            <div className="mt-0.5 text-[10.5px] font-medium text-rose-700">
              {zeroStockItems.length > 0
                ? `${zeroStockItems.length} mặt hàng hết sạch (0%)`
                : "Không có mặt hàng cạn đáy 0%"}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-left shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-900">
              Dự toán tiền nhập hàng
            </span>
            <div className="mt-1 font-heading text-lg font-black text-[#92400e]">
              {formatVND(totalProcurementCost)}
            </div>
            <div className="mt-0.5 text-[10.5px] text-stone-600">
              Chi phí nhập đủ số lượng thiếu
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-white/90 p-3 text-left shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Mức độ ưu tiên
            </span>
            <div className="mt-1 text-xs font-black">
              {shortageItems.some((a) => a.item.stockQty === 0) ? (
                <span className="text-rose-700 flex items-center gap-1 font-extrabold">
                  <AlertTriangle className="h-3.5 w-3.5" /> Khẩn cấp: Nhập hàng ngay!
                </span>
              ) : shortageItems.length > 0 ? (
                <span className="text-amber-800 flex items-center gap-1 font-extrabold">
                  <Clock className="h-3.5 w-3.5" /> Cần đặt hàng NCC trong 24h
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> An toàn: Đủ phục vụ
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[10.5px] text-muted-foreground">
              {shortageItems.length > 0 ? "Theo tiến độ phục vụ khách" : "Kho đáp ứng 100% lịch đặt"}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden />
            <p className="text-sm font-bold text-stone-800">
              {viewFilter === "SHORTAGE_ONLY"
                ? `Tuyệt vời! Không có nguyên liệu nào bị thiếu hụt cho ${totalBookedTables} bàn (${totalBookedGuests} khách) trong ${selectedDays} ngày tới.`
                : "Không tìm thấy nguyên liệu phù hợp."}
            </p>
            {viewFilter === "SHORTAGE_ONLY" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewFilter("ALL")}
                className="mt-1 text-xs font-semibold"
              >
                Xem toàn bộ bảng định mức ({currentAnalyses.length} nguyên liệu)
              </Button>
            )}
          </div>
        ) : (
          <Table className="min-w-[1000px] font-heading">
            <TableHeader>
              <TableRow className="bg-[#fdf0d5]/40 hover:bg-[#fdf0d5]/40">
                <TableHead className="pl-4 text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pl-5">
                  Nguyên liệu
                </TableHead>
                <TableHead className="w-24 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Món dùng
                </TableHead>
                <TableHead className="w-36 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Tồn hiện tại
                </TableHead>
                <TableHead className="w-36 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Nhu cầu ({totalBookedGuests} khách)
                </TableHead>
                <TableHead className="w-36 whitespace-nowrap text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Khả năng đáp ứng
                </TableHead>
                <TableHead className="w-40 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Thiếu hụt cần nhập
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Đơn giá kho
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  Dự toán tiền nhập
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap pr-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pr-5">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pagedItems.map((analysis) => (
                <DemandForecastRow
                  key={`forecast-${analysis.item.ingredientId}`}
                  analysis={analysis}
                  totalGuests={totalBookedGuests}
                  onStockIn={onStockIn}
                />
              ))}
            </TableBody>
          </Table>
        )}

        {/* Phân trang */}
        {displayedItems.length > PAGE_SIZE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/80 px-4 py-3 bg-muted/20 text-xs text-muted-foreground">
            <div>
              Hiển thị{" "}
              <strong className="text-stone-800">
                {(forecastPage - 1) * PAGE_SIZE + 1}
              </strong>{" "}
              –{" "}
              <strong className="text-stone-800">
                {Math.min(forecastPage * PAGE_SIZE, displayedItems.length)}
              </strong>{" "}
              trong tổng số{" "}
              <strong className="text-stone-800">{displayedItems.length}</strong> nguyên liệu (tối đa 15 dòng / trang)
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={forecastPage <= 1}
                onClick={() => setForecastPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2.5 text-xs text-stone-700 cursor-pointer"
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Trước
              </Button>
              <span className="px-2 text-xs font-medium">
                {forecastPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={forecastPage >= totalPages}
                onClick={() => setForecastPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2.5 text-xs text-stone-700 cursor-pointer"
              >
                Sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DemandForecastRow({
  analysis,
  totalGuests,
  onStockIn,
}: {
  analysis: ForecastItemAnalysis;
  totalGuests: number;
  onStockIn: (id: string) => void;
}) {
  const { item, isShortage, shortageInImportUnit, procurementCost, surplusInImportUnit, guestsCovered, daysCoveredText } = analysis;
  const isOut = item.stockQty === 0;

  return (
    <TableRow
      className={cn(
        "transition-colors",
        isOut
          ? "bg-rose-100/70 border-l-4 border-l-rose-700 hover:bg-rose-200/60"
          : isShortage
            ? "bg-rose-50/70 border-l-4 border-l-rose-500 hover:bg-rose-100/60"
            : "border-l-4 border-l-emerald-500 hover:bg-muted/40",
      )}
    >
      {/* 1. Nguyên liệu */}
      <TableCell className="whitespace-normal pl-4 sm:pl-5">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-[#292524]">{item.name}</span>
            {isOut ? (
              <Badge className="border-0 bg-rose-700 px-1.5 py-0 text-[10px] font-bold text-white shadow-xs">
                Hết tồn (0%)
              </Badge>
            ) : isShortage ? (
              <Badge className="border-0 bg-rose-600 px-1.5 py-0 text-[10px] font-bold text-white shadow-xs">
                Thiếu {Math.round((analysis.shortageQty / analysis.totalRequiredQty) * 100)}%
              </Badge>
            ) : (
              <Badge className="border border-emerald-300 bg-emerald-100 px-1.5 py-0 text-[10px] font-semibold text-emerald-800">
                Đủ phục vụ
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
            <span>Nhóm: <strong className="text-stone-700">{SHORT_GROUP_LABELS[item.group]}</strong></span>
            <span>·</span>
            <span>Khu vực: {item.storageZone}</span>
          </div>
        </div>
      </TableCell>

      {/* 2. Món dùng */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {item.standardDishIndexes.map((idx) => {
            const dishName = MENU_ITEMS.find((m) => m.index === idx)?.name ?? `Món ${idx}`;
            return (
              <span
                key={`forecast-std-${idx}`}
                title={`Món ${idx}: ${dishName}`}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#b45309]/30 bg-[#fdf0d5]/70 text-[10.5px] font-bold tabular-nums text-[#92400e]"
              >
                {idx}
              </span>
            );
          })}
        </div>
      </TableCell>

      {/* 3. Tồn hiện tại */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <span
            className={cn(
              "font-heading text-sm font-bold tabular-nums",
              isShortage ? "text-rose-700" : "text-emerald-800",
            )}
          >
            {formatNumberVi(item.stockInImportUnit)} {item.importUnitLabel}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums border",
              isShortage
                ? "border-rose-300 bg-rose-100 text-rose-800"
                : "border-emerald-300 bg-emerald-100 text-emerald-800",
            )}
          >
            {item.stockPercent}%
          </span>
        </div>
        {item.stockQty > 0 && item.stockQty < 1000 && item.importUnit !== "ml" && (
          <div className="text-[10px] tabular-nums text-muted-foreground">
            ({formatQty(item.stockQty, item.unit)})
          </div>
        )}
      </TableCell>

      {/* 4. Nhu cầu đặt bàn */}
      <TableCell className="text-right">
        <div className="font-heading text-sm font-bold tabular-nums text-stone-900">
          {formatNumberVi(analysis.requiredInImportUnit)} {item.importUnitLabel}
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          ({formatQty(analysis.stdQtyPerGuest, item.unit)}/suất × {totalGuests} khách)
        </div>
      </TableCell>

      {/* 5. Khả năng đáp ứng */}
      <TableCell className="text-center">
        <div className="inline-flex flex-col items-center">
          <span
            className={cn(
              "rounded-lg px-2.5 py-1 font-heading text-xs font-bold tabular-nums border shadow-xs",
              isOut
                ? "bg-rose-600 text-white border-rose-700"
                : isShortage
                  ? "bg-amber-100 text-amber-950 border-amber-300"
                  : "bg-emerald-600 text-white border-emerald-700",
            )}
          >
            {guestsCovered} suất
          </span>
          <span className="text-[10px] font-medium text-stone-600 mt-0.5">
            {daysCoveredText}
          </span>
        </div>
      </TableCell>

      {/* 6. Thiếu hụt cần nhập */}
      <TableCell className="text-right">
        {isShortage ? (
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-xs">
              Thiếu {formatNumberVi(shortageInImportUnit)} {item.importUnitLabel}
            </span>
            <div className="mt-0.5 text-[10px] font-semibold text-rose-700">
              Cần nhập trước giờ phục vụ
            </div>
          </div>
        ) : (
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Đủ dùng (+{formatNumberVi(surplusInImportUnit)} {item.importUnitLabel})
            </span>
            <div className="mt-0.5 text-[10px] text-emerald-700">
              Kho đáp ứng đủ 100%
            </div>
          </div>
        )}
      </TableCell>

      {/* 7. Đơn giá kho */}
      <TableCell className="text-right text-xs tabular-nums text-stone-600">
        {formatVND(item.importPrice)}/{item.importUnitLabel}
      </TableCell>

      {/* 8. Dự toán tiền nhập */}
      <TableCell className="text-right">
        {isShortage ? (
          <div>
            <div className="font-heading text-sm font-extrabold tabular-nums text-rose-700">
              {formatVND(procurementCost)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {formatNumberVi(shortageInImportUnit)} {item.importUnitLabel} × {formatVND(item.importPrice)}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60">—</span>
        )}
      </TableCell>

      {/* 9. Thao tác nhập hàng nhanh */}
      <TableCell className="pr-4 text-center sm:pr-5">
        <button
          type="button"
          onClick={() => onStockIn(item.ingredientId)}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-sm px-2.5 text-xs font-bold transition-colors cursor-pointer",
            isShortage
              ? "border border-rose-700 bg-rose-700 text-white hover:bg-rose-800"
              : "border border-stone-400 bg-transparent text-stone-700 hover:border-[#92400e] hover:bg-[#92400e] hover:text-white",
          )}
          title={`Nhập hàng thêm cho ${item.name}`}
        >
          <ArrowDownToLine className="h-3 w-3" />
          Nhập
        </button>
      </TableCell>
    </TableRow>
  );
}
