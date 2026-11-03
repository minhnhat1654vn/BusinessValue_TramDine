"use client";

// FR-29 — Quản lý tồn kho: theo dõi lượng tồn theo từng nguyên liệu,
// tổng giá trị kho cập nhật liên tục theo thời gian thực.
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
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
  type IngredientGroup,
} from "@/lib/tram/recipes";
import { formatSignedVND } from "@/lib/tram/food-cost";
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
}: {
  onNavigateTab?: (tab: string) => void;
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
  const [selectedDishIndex, setSelectedDishIndex] = useState(5);
  const [dishPortions, setDishPortions] = useState(2);
  const [isDispatching, setIsDispatching] = useState(false);

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
  useEffect(() => {
    let cancelled = false;

    function fetchSnapshot(isInitial: boolean) {
      fetch(`/api/inventory?_t=${Date.now()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
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
          if (!cancelled) setLoaded(true);
        });
    }

    fetchSnapshot(true);

    const onWindowFocus = () => {
      if (!pendingSyncRef.current) fetchSnapshot(false);
    };
    window.addEventListener("focus", onWindowFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);

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

  // Bếp xuất món ăn chế biến cho khách: nguyên liệu tự động trừ theo thời gian thực theo định lượng BOM
  async function handleDispatchDish(dishIdx: number, portions: number) {
    setIsDispatching(true);
    const movement = applyDishMovement(draftStock, dishIdx, portions);
    setDraftStock(movement.nextOverrides);

    const dishItem = MENU_ITEMS.find((m) => m.index === dishIdx);
    const dishTitle = dishItem?.name ?? `Món ${dishIdx}`;

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deduct_dish",
          dishIndex: dishIdx,
          portions,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Lỗi xuất kho món.");
      if (body.stockOverrides) {
        setSavedStock(body.stockOverrides as Record<string, number>);
        setDraftStock(body.stockOverrides as Record<string, number>);
      }
      toast.success(
        `Đã xuất ${portions} suất ${dishTitle} — Tự động trừ kho theo định lượng chế biến BOM.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi xuất món bếp.");
    } finally {
      setIsDispatching(false);
    }
  }

  // Xuất bếp / Nhập bổ sung trọn bộ menu tasting (7 món)
  async function handleServingsMovement(guests: number, direction: "OUT" | "IN") {
    setIsDispatching(true);
    const next = applyStandardServingsMovement(draftStock, guests, direction);
    setDraftStock(next);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: direction === "OUT" ? "deduct_guests" : "restock_guests",
          guests,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Lỗi cập nhật kho.");
      if (body.stockOverrides) {
        setSavedStock(body.stockOverrides as Record<string, number>);
        setDraftStock(body.stockOverrides as Record<string, number>);
      }
      toast.success(
        direction === "OUT"
          ? `Đã xuất kho cho ${guests} suất tasting — Tự động trừ cả 7 món.`
          : `Đã nhập bổ sung ${guests} suất tasting chuẩn.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi cập nhật kho.");
    } finally {
      setIsDispatching(false);
    }
  }

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
      setLastDispatchInfo(null);
      if (body.priceOverrides && typeof body.priceOverrides === "object") {
        setPriceOverrides(body.priceOverrides as Record<string, number>);
      }
      if (scope === "CUSTOM" || scope === "OUT" || scope === "NEEDS_REORDER") setScope("ALL");
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

  const itemsByGroup = useMemo(
    () =>
      INGREDIENT_GROUP_ORDER.map((group) => ({
        group,
        items: filteredItems.filter((i) => i.group === group),
      })).filter((g) => g.items.length > 0),
    [filteredItems],
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
    <div className="space-y-6">
      {/* ==================== 1. TIÊU ĐỀ ==================== */}
      <div className="flex flex-col gap-2 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
              Bếp &amp; kho
            </span>
          </div>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Quản lý tồn kho
          </h2>
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
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#292524]">
                      <span
                        className={cn("h-2 w-2 shrink-0 rounded-full", GROUP_STYLES[g.group].dot)}
                      />
                      <span className="truncate">{SHORT_GROUP_LABELS[g.group]}</span>
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {formatPercent(g.shareOfValuePct, 1)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs font-bold tabular-nums text-[#92400e]">
                    {formatVND(g.totalValue)}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ==================== 4. BẾP XUẤT MÓN RA CHO KHÁCH (DẠNG CARD) ==================== */}
      <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
        <CardHeader className="border-b border-border/60 px-4 py-3 sm:px-5 [.border-b]:pb-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#292524]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span>Bếp xuất món ra cho khách</span>
            </CardTitle>

            {/* Điều khiển số suất & nút Xuất món */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-stone-500">Số suất:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 4, 6].map((p) => (
                  <button
                    key={`p-${p}`}
                    type="button"
                    onClick={() => setDishPortions(p)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-colors",
                      dishPortions === p
                        ? "border-stone-800 bg-stone-800 text-white"
                        : "border-border bg-background text-stone-600 hover:border-stone-400",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={isDispatching}
                onClick={() => void handleDispatchDish(selectedDishIndex, dishPortions)}
                className="inline-flex h-7 items-center gap-1.5 rounded-xl bg-[#b45309] px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#92400e] disabled:opacity-50"
              >
                <Flame className="h-3.5 w-3.5" aria-hidden />
                Xuất {dishPortions} suất
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5 p-4 sm:p-5">
          {/* Grid 7 Dish Cards (dạng card rộng rãi chuẩn layout, không bị dồn hàng ngang) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {MENU_ITEMS.map((dish) => {
              const active = selectedDishIndex === dish.index;
              const status = dishStatusMap[dish.index];
              const hasWarn = status?.hasWarning ?? false;

              return (
                <button
                  key={`dish-card-${dish.index}`}
                  type="button"
                  onClick={() => setSelectedDishIndex(dish.index)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                    active
                      ? "border-[#b45309] bg-[#fdf0d5] ring-2 ring-[#b45309]/30 shadow-xs"
                      : "border-border/80 bg-background hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/30",
                  )}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {dish.image && (
                      <Image
                        src={dish.image}
                        alt={dish.name}
                        fill
                        sizes="56px"
                        loading="eager"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute left-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-md bg-[#292524]/85 px-1 text-[9.5px] font-bold text-white shadow-xs">
                      {dish.index}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          "truncate text-[10.5px] font-semibold uppercase tracking-wider",
                          active ? "text-[#b45309]" : "text-muted-foreground",
                        )}
                      >
                        MÓN {dish.index} · {dish.region}
                      </span>
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          hasWarn ? "bg-rose-500 animate-pulse" : "bg-emerald-500",
                        )}
                        title={
                          hasWarn
                            ? `Cảnh báo: Có nguyên liệu < 32% (${status?.warningIngredients.join(", ")})`
                            : "Đủ nguyên liệu (≥ 32%)"
                        }
                      />
                    </div>

                    <div
                      className={cn(
                        "mt-0.5 line-clamp-2 text-xs sm:text-[13px] font-bold leading-snug",
                        active ? "text-[#292524]" : "text-stone-800",
                      )}
                      title={dish.name}
                    >
                      {dish.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dòng xuất nhanh tasting trọn bộ hoặc nhập thêm */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-stone-600">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <Package className="h-3.5 w-3.5 text-[#b45309]" aria-hidden />
              Xuất nhanh trọn bộ menu tasting (7 món):
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[1, 4, 10, 42].map((n) => (
                <button
                  key={`std-out-${n}`}
                  type="button"
                  disabled={isDispatching}
                  onClick={() => void handleServingsMovement(n, "OUT")}
                  className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium tabular-nums text-stone-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
                >
                  <ArrowDownRight className="h-3 w-3 text-rose-600" aria-hidden />
                  {n === 4 ? "Bàn 4 khách" : n === 42 ? "Toàn ca 42 khách" : `${n} suất`}
                </button>
              ))}
              <button
                type="button"
                disabled={isDispatching}
                onClick={() => void handleServingsMovement(10, "IN")}
                className="inline-flex h-6 items-center gap-1 rounded-full border border-[#b45309]/30 bg-[#fdf0d5]/60 px-2.5 text-[11px] font-semibold tabular-nums text-[#92400e] transition-colors hover:bg-[#b45309] hover:text-white"
              >
                <ArrowUpRight className="h-3 w-3" aria-hidden />
                Nhập 10 suất
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== 5. BẢNG TỒN KHO THEO TỪNG NGUYÊN LIỆU ==================== */}
      <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#292524]">
              <Warehouse className="h-4 w-4 text-[#b45309]" aria-hidden />
              Tồn kho từng nguyên liệu
            </CardTitle>

            <div className="relative w-full md:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nguyên liệu..."
                aria-label="Tìm nguyên liệu trong kho"
                className="h-9 rounded-full pl-8 text-sm"
              />
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
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      active
                        ? tab.tone === "safe"
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                          : tab.tone === "warn" || tab.tone === "out"
                            ? "border-rose-600 bg-rose-600 text-white shadow-xs"
                            : "border-stone-800 bg-stone-800 text-white shadow-xs"
                        : tab.tone === "safe"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-100"
                          : tab.tone === "warn" || tab.tone === "out"
                            ? "border-rose-300 bg-rose-50 text-rose-800 hover:border-rose-500 hover:bg-rose-100"
                            : "border-border bg-background text-stone-600 hover:border-stone-400",
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
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      active
                        ? "border-[#b45309] bg-[#b45309] text-[#fffbf2]"
                        : "border-border bg-card text-stone-600 hover:border-[#b45309]/50 hover:text-[#92400e]",
                    )}
                  >
                    {g !== "ALL" && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          active ? "bg-white" : GROUP_STYLES[g].dot,
                        )}
                      />
                    )}
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
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow className="bg-[#fdf0d5]/40 hover:bg-[#fdf0d5]/40">
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
                  <TableHead className="w-36 whitespace-nowrap pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pr-5">
                    Giá trị tồn
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
                  <TableCell className="pr-4 text-right text-sm font-bold tabular-nums text-[#92400e] sm:pr-5">
                    {formatVND(filteredValueTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Nhóm dòng nguyên liệu & Dòng hiển thị tồn kho tự động ----------

function InventoryGroupSection({
  group,
  items,
  totalWarehouseValue,
}: {
  group: IngredientGroup;
  items: InventoryItem[];
  totalWarehouseValue: number;
}) {
  const groupSubtotal = items.reduce((sum, i) => sum + i.stockValue, 0);
  const groupPct =
    totalWarehouseValue > 0 ? Math.round((groupSubtotal / totalWarehouseValue) * 1000) / 10 : 0;

  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={7} className="py-1.5 pl-4 sm:pl-5">
          <div className="flex items-center justify-between pr-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
              <span className={cn("h-2 w-2 rounded-full", GROUP_STYLES[group].dot)} />
              {INGREDIENT_GROUP_LABELS[group]}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">
                ({items.length})
              </span>
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-stone-600">
              {formatVND(groupSubtotal)} ({formatPercent(groupPct, 1)})
            </span>
          </div>
        </TableCell>
      </TableRow>
      {items.map((item) => (
        <InventoryStockRow key={item.ingredientId} item={item} />
      ))}
    </>
  );
}

function InventoryStockRow({ item }: { item: InventoryItem }) {
  const isOut = item.stockQty === 0;
  const isWarning = item.isWarning; // stockPercent < 32% or isOut
  const isSafe = item.isSafe; // stockPercent >= 32%

  return (
    <TableRow
      className={cn(
        "transition-colors",
        isOut
          ? "bg-rose-100/70 border-l-4 border-l-rose-700 hover:bg-rose-200/60"
          : isWarning
            ? "bg-rose-50/80 border-l-4 border-l-rose-500 hover:bg-rose-100/60"
            : "bg-emerald-50/25 border-l-4 border-l-emerald-500 hover:bg-emerald-50/45",
      )}
    >
      {/* 1. Nguyên liệu & Nhãn cảnh báo */}
      <TableCell className="whitespace-normal pl-4 sm:pl-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-[#292524]">{item.name}</span>
          {isOut ? (
            <Badge className="border-0 bg-rose-700 px-1.5 py-0 text-[10px] font-bold text-white shadow-xs">
              Hết tồn (0%)
            </Badge>
          ) : isWarning ? (
            <Badge className="border-0 bg-rose-600 px-1.5 py-0 text-[10px] font-bold text-white shadow-xs">
              Cảnh báo &lt; 32%
            </Badge>
          ) : (
            <Badge className="border border-emerald-300 bg-emerald-100/80 px-1.5 py-0 text-[10px] font-semibold text-emerald-800">
              Còn hàng ({item.stockPercent}%)
            </Badge>
          )}
          {item.isCustomPrice && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 px-1.5 py-0 text-[9.5px] font-medium text-amber-800"
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
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#b45309]/30 bg-[#fdf0d5]/70 text-[10.5px] font-bold tabular-nums text-[#92400e]"
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
                className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-stone-400 bg-stone-50 text-[10.5px] font-semibold tabular-nums text-stone-600"
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
              isWarning ? "text-rose-700" : "text-emerald-800",
            )}
          >
            {formatNumberVi(item.stockInImportUnit)} {item.importUnitLabel}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums border",
              isWarning
                ? "border-rose-300 bg-rose-100 text-rose-800"
                : "border-emerald-300 bg-emerald-100 text-emerald-800",
            )}
            title={`Tỷ lệ tồn: ${item.stockPercent}% so với định mức`}
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
                isWarning ? "text-rose-700" : "text-emerald-800",
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
      <TableCell className="pr-4 text-right sm:pr-5">
        <div
          className={cn(
            "font-semibold tabular-nums",
            isWarning ? "text-rose-700" : "text-emerald-900",
          )}
        >
          {formatVND(item.stockValue)}
        </div>
        <div className="text-[10.5px] tabular-nums text-muted-foreground">
          {formatPercent(item.shareOfValuePct, 1)}
        </div>
      </TableCell>
    </TableRow>
  );
}
