"use client";

// FR-28 — Giá vốn nguyên liệu: tự tính giá vốn mỗi khách từ đơn giá nhập kho,
// giao diện bếp & đối chiếu trực tiếp với giá menu tasting (1.440.000 đ/khách, mục tiêu 34,7%).
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRightLeft,
  Banknote,
  Calculator,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Coins,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Users,
  UtensilsCrossed,
  Warehouse,
  Wine,
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
  DISH_RECIPES,
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  MAX_SCALE_GUESTS,
  formatQty,
  getDefaultOptionId,
  type IngredientGroup,
} from "@/lib/tram/recipes";
import {
  CEILING_FOOD_COST_PER_GUEST,
  IMPORT_UNIT_LABELS,
  MAX_IMPORT_PRICE,
  MIN_IMPORT_PRICE,
  TARGET_FOOD_COST_CEILING_PCT,
  calculateDishCost,
  calculateMenuFoodCost,
  formatBaseUnitCost,
  formatSignedVND,
  type WarehouseIngredientCostItem,
} from "@/lib/tram/food-cost";

const GROUP_STYLES: Record<IngredientGroup, { badge: string; dot: string; bar: string }> = {
  PROTEIN: { badge: "border-rose-200 bg-rose-50 text-rose-800", dot: "bg-rose-500", bar: "bg-rose-500" },
  STARCH: { badge: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500", bar: "bg-amber-500" },
  DAIRY_FAT: { badge: "border-yellow-200 bg-yellow-50 text-yellow-800", dot: "bg-yellow-500", bar: "bg-yellow-500" },
  PRODUCE: { badge: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  FRUIT_NUT: { badge: "border-orange-200 bg-orange-50 text-orange-800", dot: "bg-orange-500", bar: "bg-orange-500" },
  SEASONING: { badge: "border-stone-300 bg-stone-100 text-stone-700", dot: "bg-stone-500", bar: "bg-stone-500" },
  AROMATIC: { badge: "border-violet-200 bg-violet-50 text-violet-800", dot: "bg-violet-500", bar: "bg-violet-500" },
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

const QUICK_GUESTS = [1, 4, 10, 30];

type WarehouseScope = "ALL" | "STANDARD" | "CUSTOM";

/** Định dạng số nguyên kiểu Việt Nam (dấu chấm phân tách hàng nghìn, không kèm " đ") */
function formatDots(amount: number): string {
  return formatVND(Math.abs(Math.round(amount))).replace(" đ", "");
}

/** So sánh hai bảng giá ghi đè */
function areOverridesEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/** Tính toàn bộ phương án của một món để hiển thị trên bộ chọn phương án */
function buildDishVariants(
  dishIndex: number,
  selectedOptionId: string | undefined,
  guests: number,
  overrides: Record<string, number>,
) {
  const recipe = DISH_RECIPES.find((r) => r.dishIndex === dishIndex) ?? DISH_RECIPES[0];
  const menuItem = MENU_ITEMS.find((m) => m.index === recipe.dishIndex);
  const defaultOptionId = getDefaultOptionId(recipe.dishIndex);
  const activeDetail = calculateDishCost(
    recipe.dishIndex,
    selectedOptionId ?? defaultOptionId,
    guests,
    overrides,
  );
  const variants = recipe.variants.map((v) => {
    const opt = menuItem?.options?.find((o) => o.id === v.optionId);
    const d = calculateDishCost(recipe.dishIndex, v.optionId, 1, overrides);
    return {
      optionId: v.optionId,
      name: opt?.name ?? v.optionId,
      desc: opt?.desc,
      isDefault: v.optionId === defaultOptionId,
      costPerGuest: d.costPerGuest,
      deltaVsDefault: d.deltaVsDefaultPerGuest,
    };
  });
  return { recipe, menuItem, activeDetail, variants };
}

export function AdminFoodCost({
  onNavigateTab,
  hideTitleHeader = false,
}: {
  onNavigateTab?: (tab: string) => void;
  hideTitleHeader?: boolean;
} = {}) {
  const [guests, setGuests] = useState(1);
  const [guestsInput, setGuestsInput] = useState("1");
  const [selectedDish, setSelectedDish] = useState(5); // Mặc định mở món chính có tỷ trọng cao nhất hoặc món 1
  const [variantByDish, setVariantByDish] = useState<Record<number, string>>({});

  // Đơn giá nhập kho tùy chỉnh (đồng bộ từ server + chỉnh sửa trực tiếp)
  const [savedOverrides, setSavedOverrides] = useState<Record<string, number>>({});
  const [draftOverrides, setDraftOverrides] = useState<Record<string, number>>({});
  const [savingPrices, setSavingPrices] = useState(false);

  // Bộ lọc bảng kho nguyên liệu
  const [warehouseScope, setWarehouseScope] = useState<WarehouseScope>("ALL");
  const [warehouseGroup, setWarehouseGroup] = useState<IngredientGroup | "ALL">("ALL");
  const [warehouseSearch, setWarehouseSearch] = useState("");

  const scaled = guests > 1;
  const hasUnsavedChanges = useMemo(
    () => !areOverridesEqual(savedOverrides, draftOverrides),
    [savedOverrides, draftOverrides],
  );

  // Tải đơn giá tùy chỉnh đã lưu từ API khi mở màn
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/food-cost?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && data.overrides && typeof data.overrides === "object") {
          setSavedOverrides(data.overrides as Record<string, number>);
          setDraftOverrides(data.overrides as Record<string, number>);
        }
      })
      .catch(() => {
        // Giữ bảng giá chuẩn mặc định nếu offline
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyGuests(next: number) {
    const clamped = Math.min(MAX_SCALE_GUESTS, Math.max(1, Math.round(next)));
    setGuests(clamped);
    setGuestsInput(String(clamped));
  }

  function handleGuestsInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    setGuestsInput(digits);
    const parsed = Number(digits);
    if (digits !== "" && parsed >= 1 && parsed <= MAX_SCALE_GUESTS) {
      setGuests(parsed);
    }
  }

  // Cập nhật đơn giá nhập kho của 1 nguyên liệu trên giao diện (tự tính lại tức thời)
  const handlePriceChange = useCallback(
    (ingredientId: string, defaultImportPrice: number, nextPrice: number) => {
      const clamped = Math.min(MAX_IMPORT_PRICE, Math.max(MIN_IMPORT_PRICE, Math.round(nextPrice)));
      setDraftOverrides((prev) => {
        const copy = { ...prev };
        if (clamped === defaultImportPrice) {
          delete copy[ingredientId];
        } else {
          copy[ingredientId] = clamped;
        }
        return copy;
      });
    },
    [],
  );

  async function handleSavePrices() {
    setSavingPrices(true);
    try {
      const res = await fetch("/api/food-cost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: draftOverrides, guests }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Không lưu được đơn giá nhập kho.");
      const nextSaved = (body.overrides ?? {}) as Record<string, number>;
      setSavedOverrides(nextSaved);
      setDraftOverrides(nextSaved);
      toast.success("Đã lưu bảng đơn giá nhập kho.", {
        description: `Giá vốn suất chuẩn hiện tại: ${formatVND(body.costPerGuest)}/khách (${formatPercent(body.foodCostPct, 1)} giá menu).`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi lưu đơn giá nhập kho.");
    } finally {
      setSavingPrices(false);
    }
  }

  async function handleResetAllPrices() {
    setSavingPrices(true);
    try {
      const res = await fetch("/api/food-cost", { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Không khôi phục được đơn giá mặc định.");
      setSavedOverrides({});
      setDraftOverrides({});
      toast.success("Đã khôi phục toàn bộ đơn giá nhập kho chuẩn.", {
        description: `Giá vốn chuẩn: ${formatVND(body.costPerGuest)}/khách (${formatPercent(body.foodCostPct, 1)} giá menu).`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khôi phục đơn giá.");
    } finally {
      setSavingPrices(false);
    }
  }

  // ---------- Báo cáo giá vốn tự động tính toán ----------
  const report = useMemo(
    () => calculateMenuFoodCost(guests, draftOverrides),
    [guests, draftOverrides],
  );

  const pickedOptionId = variantByDish[selectedDish];
  const dishView = useMemo(
    () => buildDishVariants(selectedDish, pickedOptionId, guests, draftOverrides),
    [selectedDish, pickedOptionId, guests, draftOverrides],
  );

  // ---------- Lọc bảng đơn giá kho ----------
  const filteredWarehouse = useMemo(() => {
    const q = warehouseSearch.trim().toLowerCase();
    return report.warehouseItems.filter((item) => {
      if (warehouseScope === "STANDARD" && item.qtyPerGuestStandard === 0) return false;
      if (warehouseScope === "CUSTOM" && !item.isCustomPrice) return false;
      if (warehouseGroup !== "ALL" && item.group !== warehouseGroup) return false;
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchOrigin = item.origin?.toLowerCase().includes(q) ?? false;
        const matchSpec = item.spec?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchOrigin && !matchSpec) return false;
      }
      return true;
    });
  }, [report.warehouseItems, warehouseScope, warehouseGroup, warehouseSearch]);

  // Phân trang danh mục giá vốn (giới hạn 20 dòng / trang)
  const [costPage, setCostPage] = useState(1);
  const COST_PAGE_SIZE = 20;

  useEffect(() => {
    setCostPage(1);
  }, [warehouseScope, warehouseGroup, warehouseSearch]);

  const costTotalPages = Math.max(1, Math.ceil(filteredWarehouse.length / COST_PAGE_SIZE));
  const paginatedWarehouse = useMemo(() => {
    const start = (costPage - 1) * COST_PAGE_SIZE;
    return filteredWarehouse.slice(start, start + COST_PAGE_SIZE);
  }, [filteredWarehouse, costPage]);

  const warehouseByGroup = useMemo(
    () =>
      INGREDIENT_GROUP_ORDER.map((group) => ({
        group,
        items: paginatedWarehouse.filter((i) => i.group === group),
      })).filter((g) => g.items.length > 0),
    [paginatedWarehouse],
  );

  const filteredTotals = useMemo(() => {
    const perGuest = filteredWarehouse.reduce((s, i) => s + i.costPerGuestStandard, 0);
    return { perGuest, total: perGuest * guests };
  }, [filteredWarehouse, guests]);

  const standardIngredientCount = useMemo(
    () => report.warehouseItems.filter((i) => i.qtyPerGuestStandard > 0).length,
    [report.warehouseItems],
  );

  const warehouseColSpan = scaled ? 7 : 6;
  const barFillPct = Math.min(100, Math.max(0, report.foodCostPct));

  return (
    <div className="space-y-6 font-heading">
      {/* ==================== 1. TIÊU ĐỀ & QUY ĐỔI SỐ KHÁCH ==================== */}
      <div className={cn("flex flex-col gap-4 border-b border-border/80 pb-5 xl:flex-row xl:items-center xl:justify-between", hideTitleHeader && "border-b-0 pb-0")}>
        {!hideTitleHeader && (
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
              Bếp &amp; kho
            </span>
            <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
              Giá vốn nguyên liệu &amp; Đối chiếu giá menu
            </h2>
          </div>
        )}

        <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
            <Users className="h-3.5 w-3.5 text-[#b45309]" aria-hidden />
            Quy đổi theo số khách
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full border border-border bg-background p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => applyGuests(guests - 1)}
                disabled={guests <= 1}
                aria-label="Giảm số khách"
                className="h-8 w-8 rounded-full text-stone-700 hover:bg-[#fdf0d5] hover:text-[#92400e]"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                value={guestsInput}
                onChange={(e) => handleGuestsInput(e.target.value)}
                onBlur={() => applyGuests(Number(guestsInput) || 1)}
                inputMode="numeric"
                aria-label="Số khách quy đổi"
                className="h-8 w-14 border-0 bg-transparent px-1 text-center font-heading text-base font-bold tabular-nums text-[#92400e] shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => applyGuests(guests + 1)}
                disabled={guests >= MAX_SCALE_GUESTS}
                aria-label="Tăng số khách"
                className="h-8 w-8 rounded-full text-stone-700 hover:bg-[#fdf0d5] hover:text-[#92400e]"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex gap-1" role="group" aria-label="Chọn nhanh số khách">
              {QUICK_GUESTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => applyGuests(n)}
                  aria-pressed={guests === n}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-medium tabular-nums transition-colors",
                    guests === n
                      ? "border-[#b45309] bg-[#b45309] text-[#fffbf2]"
                      : "border-border bg-background text-stone-600 hover:border-[#b45309]/50 hover:text-[#92400e]",
                  )}
                >
                  {n === 30 ? "30 · đủ ca" : `${n} khách`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Thanh nhắc lưu khi có thay đổi đơn giá chưa lưu */}
      {hasUnsavedChanges && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-[#fdf0d5]/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-[#92400e]">
            <Sparkles className="h-4 w-4 shrink-0 text-[#b45309]" aria-hidden />
            <span>
              Bạn đã điều chỉnh đơn giá nhập kho trên màn hình — toàn bộ giá vốn đã tự động tính lại. Bấm{" "}
              <strong>Lưu đơn giá kho</strong> để giữ lại cho các phiên sau.
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingPrices}
              onClick={() => setDraftOverrides(savedOverrides)}
              className="h-8 rounded-full border-amber-300 bg-white text-xs text-stone-700 hover:bg-stone-50"
            >
              Hoàn tác
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingPrices}
              onClick={() => void handleSavePrices()}
              className="h-8 rounded-full bg-[#b45309] px-4 text-xs font-semibold text-[#fffbf2] hover:bg-[#92400e]"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {savingPrices ? "Đang lưu..." : "Lưu đơn giá kho"}
            </Button>
          </div>
        </div>
      )}

      {/* ==================== 2. KPI & ĐỐI CHIẾU GIÁ MENU ==================== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            id: "menu-price",
            label: scaled ? `Doanh thu menu (${guests} khách)` : "Giá bán menu / khách",
            value: formatVND(scaled ? report.menuRevenueTotal : report.menuPricePerGuest),
            sub: scaled
              ? `${formatVND(report.menuPricePerGuest)} / khách · 7 món tasting`
              : "Menu “Hành trình vị Việt” · 7 món",
            icon: UtensilsCrossed,
            tone: "default" as const,
          },
          {
            id: "food-cost",
            label: scaled ? `Giá vốn (${guests} khách)` : "Giá vốn / khách",
            value: formatVND(scaled ? report.costTotal : report.costPerGuest),
            sub: scaled
              ? `${formatVND(report.costPerGuest)} / khách · tự tính từ kho`
              : `${standardIngredientCount} nguyên liệu · phương án chuẩn`,
            icon: Coins,
            tone: "default" as const,
          },
          {
            id: "food-cost-pct",
            label: "Tỷ lệ Food Cost",
            value: formatPercent(report.foodCostPct, 1),
            sub: `Mục tiêu ≤ ${formatPercent(report.targetFoodCostPct, 1)} (${formatVND(report.targetFoodCostPerGuest)})`,
            icon: Calculator,
            tone: report.isWithinTarget ? ("good" as const) : ("warn" as const),
          },
          {
            id: "gross-profit",
            label: scaled ? `Lãi gộp (${guests} khách)` : "Lợi nhuận gộp / khách",
            value: formatVND(scaled ? report.grossProfitTotal : report.grossProfitPerGuest),
            sub: `Biên lợi nhuận gộp ${formatPercent(report.grossMarginPct, 1)}`,
            icon: Banknote,
            tone: "default" as const,
          },
        ].map((card) => (
          <Card key={card.id} className="min-w-0 gap-0 border-border/80 bg-card py-0 shadow-xs">
            <CardContent className="p-4">
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
                  "mt-2 font-heading text-2xl font-bold tabular-nums",
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

      {/* Thẻ đối chiếu trực quan Giá Menu vs Ngưỡng Food Cost 33,5% */}
      <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
        <CardHeader className="border-b border-border/60 px-4 py-3.5 sm:px-5 [.border-b]:pb-3.5">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#292524]">
            <Calculator className="h-4 w-4 text-[#b45309]" aria-hidden />
            Đối chiếu giá vốn nguyên liệu với giá bán Menu
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          {/* Thanh tỷ lệ giá vốn / giá bán menu */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#292524]">
              <div>
                Giá vốn nguyên liệu:{" "}
                <span className="tabular-nums text-[#92400e]">{formatVND(report.costPerGuest)}</span> (
                {formatPercent(report.foodCostPct, 1)} giá menu)
              </div>
              <div className="text-[11px] font-normal text-muted-foreground">
                Trần an toàn FR-33: ≤ 50% ({formatVND(CEILING_FOOD_COST_PER_GUEST)})
              </div>
            </div>

            <div className="relative pt-5 pb-1">
              {/* Nhãn mốc mục tiêu chuẩn 33,5% */}
              <div
                style={{ left: `${report.targetFoodCostPct}%` }}
                className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-emerald-800"
              >
                Mục tiêu {formatPercent(report.targetFoodCostPct, 1)} ({formatVND(report.targetFoodCostPerGuest)})
              </div>

              {/* Nhãn mốc trần 50% (FR-33) */}
              <div
                style={{ left: "50%" }}
                className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-rose-700"
              >
                Mục tiêu trần 50% ({formatVND(CEILING_FOOD_COST_PER_GUEST)})
              </div>

              <div className="relative h-4 w-full overflow-hidden rounded-full border border-border/80 bg-[#f5efe4]">
                <div
                  style={{ width: `${barFillPct}%` }}
                  className={cn(
                    "h-full rounded-l-full transition-all duration-300",
                    report.foodCostPct <= TARGET_FOOD_COST_CEILING_PCT ? "bg-[#b45309]" : "bg-rose-600",
                  )}
                />
              </div>

              {/* Vạch dọc mốc 33,5% */}
              <div
                style={{ left: `${report.targetFoodCostPct}%` }}
                aria-hidden
                className="pointer-events-none absolute top-4 h-6 w-0.5 -translate-x-1/2 bg-emerald-700"
              />

              {/* Vạch dọc mốc 50% */}
              <div
                style={{ left: "50%" }}
                aria-hidden
                className="pointer-events-none absolute top-4 h-6 w-0.5 -translate-x-1/2 bg-rose-700"
              />
            </div>
          </div>

          {/* Cảnh báo & 3 lựa chọn quản trị nếu Food Cost vượt 50% */}
          {report.foodCostPct > TARGET_FOOD_COST_CEILING_PCT && (
            <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Ý nghĩa quản trị (FR-33): Food Cost đang vượt trần 50% → 3 Lựa chọn:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-stone-700">
                <div className="rounded-lg bg-white p-2.5 border border-rose-200">
                  <p className="font-semibold text-rose-950">1. Tăng giá menu</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Điều chỉnh giá bán tasting {formatVND(report.menuPricePerGuest)} lên mức phù hợp để hạ tỷ lệ chi phí.
                  </p>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-rose-200">
                  <p className="font-semibold text-rose-950">2. Đàm phán lại đơn giá</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Đàm phán giảm giá nhập kho với các nhà cung cấp chủ lực cho các nguyên liệu chiếm tỷ trọng cao.
                  </p>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-rose-200">
                  <p className="font-semibold text-rose-950">3. Đổi nguyên liệu (BOM)</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Sử dụng các phương án nguyên liệu thay thế sẵn có trong BOM 7 món để tối ưu hóa giá vốn.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Đối chiếu với 3 gói thực đơn khách đặt (Không pairing · Tea Pairing · Wine Pairing) */}
          <div className="grid gap-3 border-t border-border/60 pt-4 md:grid-cols-3">
            {[
              {
                key: "none",
                title: "Menu Tasting tiêu chuẩn",
                badge: "7 món",
                price: report.pairingBenchmarks.none.pricePerGuest,
                pct: report.pairingBenchmarks.none.foodCostPct,
                margin: report.pairingBenchmarks.none.grossProfitPerGuest,
                highlight: true,
              },
              {
                key: "tea",
                title: "Menu + Tea Pairing",
                badge: "+350.000 đ trà",
                price: report.pairingBenchmarks.tea.pricePerGuest,
                pct: report.pairingBenchmarks.tea.foodCostPct,
                margin: report.pairingBenchmarks.tea.grossProfitPerGuest,
                highlight: false,
              },
              {
                key: "wine",
                title: "Menu + Wine Pairing",
                badge: "+650.000 đ vang",
                price: report.pairingBenchmarks.wine.pricePerGuest,
                pct: report.pairingBenchmarks.wine.foodCostPct,
                margin: report.pairingBenchmarks.wine.grossProfitPerGuest,
                highlight: false,
              },
            ].map((pkg) => (
              <div
                key={pkg.key}
                className={cn(
                  "rounded-xl border p-3.5 transition-colors",
                  pkg.highlight
                    ? "border-[#b45309]/40 bg-[#fdf0d5]/40"
                    : "border-border/70 bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#292524]">
                    {pkg.key !== "none" && <Wine className="h-3.5 w-3.5 text-[#b45309]" aria-hidden />}
                    {pkg.title}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-[#b45309]/30 bg-background px-2 py-0 text-[10px] font-medium text-[#92400e]"
                  >
                    {pkg.badge}
                  </Badge>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="font-heading text-lg font-bold tabular-nums text-[#292524]">
                    {formatVND(pkg.price)}
                    <span className="font-heading text-[11px] font-normal text-muted-foreground">/khách</span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-[#92400e]">
                    Giá vốn món: {formatPercent(pkg.pct, 1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ==================== 3. GIÁ VỐN THEO TỪNG MÓN (GIAO DIỆN BẾP) ==================== */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Cột trái: Bảng đối chiếu giá vốn 7 món */}
        <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-xs xl:sticky xl:top-20">
          <CardHeader className="border-b border-border/60 px-4 py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-[#292524]">
              <span className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-[#b45309]" aria-hidden />
                Giá vốn 7 món tasting
              </span>
              <span className="text-xs font-bold tabular-nums text-[#92400e]">
                {formatVND(report.costPerGuest)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <nav
              aria-label="Chọn món để xem chi tiết giá vốn"
              className="tram-scroll flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:gap-1 xl:overflow-visible xl:pb-0"
            >
              {report.dishes.map((d) => {
                const active = d.dishIndex === selectedDish;
                return (
                  <button
                    key={d.dishIndex}
                    type="button"
                    onClick={() => setSelectedDish(d.dishIndex)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-64 shrink-0 flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors xl:w-full",
                      active
                        ? "border-[#b45309]/60 bg-[#fdf0d5] shadow-xs"
                        : "border-transparent hover:border-border hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {d.image && (
                          <Image
                            src={d.image}
                            alt={d.name}
                            fill
                            sizes="44px"
                            loading="eager"
                            className="object-cover"
                          />
                        )}
                        <span className="absolute left-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#292524]/80 px-1 text-[9.5px] font-bold text-white">
                          {d.dishIndex}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider",
                              active ? "text-[#b45309]" : "text-muted-foreground",
                            )}
                          >
                            Món {d.dishIndex} · {d.region}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-[#92400e]">
                            {formatVND(d.costPerGuest)}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "line-clamp-1 text-[13px] font-medium leading-snug",
                            active ? "text-[#292524]" : "text-stone-700",
                          )}
                          title={d.name}
                        >
                          {d.name}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-[10.5px] text-muted-foreground">
                          <span>{formatPercent(d.pctOfMenuPrice, 1)} giá menu</span>
                          <span className="tabular-nums">
                            {formatPercent(d.shareOfFoodCostPct, 1)} giá vốn
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80">
                      <div
                        style={{ width: `${Math.min(100, d.shareOfFoodCostPct)}%` }}
                        className="h-full rounded-full bg-[#b45309]"
                      />
                    </div>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Cột phải: Chi tiết cấu thành giá vốn món đang chọn */}
        <AnimatePresence mode="wait">
          <motion.div
            key={dishView.activeDetail.dishIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
              {/* Đầu thẻ món */}
              <div className="flex flex-col gap-4 border-b border-border/60 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row">
                  <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24">
                    {dishView.activeDetail.image && (
                      <Image
                        src={dishView.activeDetail.image}
                        alt={dishView.activeDetail.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 96px"
                        loading="eager"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-xl font-bold leading-snug text-[#292524]">
                      {dishView.activeDetail.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Khẩu phần 1 khách: {dishView.activeDetail.portion}
                    </p>
                  </div>
                </div>

                {/* Hộp tổng giá vốn món */}
                <div className="shrink-0 rounded-xl border border-[#b45309]/30 bg-[#fdf0d5]/50 px-4 py-2.5 sm:text-right">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                    Giá vốn món / khách
                  </div>
                  <div className="mt-0.5 font-heading text-2xl font-bold tabular-nums text-[#92400e]">
                    {formatVND(dishView.activeDetail.costPerGuest)}
                  </div>
                  {scaled ? (
                    <div className="text-xs font-semibold tabular-nums text-stone-700">
                      Cho {guests} khách: {formatVND(dishView.activeDetail.costTotal)}
                    </div>
                  ) : (
                    !dishView.activeDetail.isDefault && (
                      <div
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          dishView.activeDetail.deltaVsDefaultPerGuest <= 0
                            ? "text-emerald-700"
                            : "text-amber-800",
                        )}
                      >
                        So với chuẩn: {formatSignedVND(dishView.activeDetail.deltaVsDefaultPerGuest)}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Bộ chọn phương án chế biến kèm chênh lệch giá vốn */}
              <div className="space-y-2.5 border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Phương án &amp; giá vốn
                  </span>
                  {dishView.variants.map((v) => {
                    const active = v.optionId === dishView.activeDetail.optionId;
                    return (
                      <button
                        key={v.optionId}
                        type="button"
                        onClick={() =>
                          setVariantByDish((prev) => ({
                            ...prev,
                            [dishView.recipe.dishIndex]: v.optionId,
                          }))
                        }
                        aria-pressed={active}
                        title={v.desc}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors",
                          active
                            ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-xs"
                            : "border-border bg-card text-stone-700 hover:border-[#b45309]/50 hover:text-[#92400e]",
                        )}
                      >
                        <span>{v.name}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                            active
                              ? "bg-white/20 text-white"
                              : v.isDefault
                                ? "bg-[#fdf0d5] text-[#92400e]"
                                : v.deltaVsDefault < 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : v.deltaVsDefault > 0
                                    ? "bg-amber-50 text-amber-800"
                                    : "bg-stone-100 text-stone-600",
                          )}
                        >
                          {v.isDefault
                            ? formatVND(v.costPerGuest)
                            : v.deltaVsDefault === 0
                              ? "Không đổi giá"
                              : formatSignedVND(v.deltaVsDefault)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!dishView.activeDetail.isDefault && dishView.activeDetail.variantNote && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900">
                    <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
                    <span>
                      {dishView.activeDetail.variantNote} — Giá vốn phương án này:{" "}
                      <strong className="tabular-nums">
                        {formatVND(dishView.activeDetail.costPerGuest)}/khách
                      </strong>{" "}
                      ({formatSignedVND(dishView.activeDetail.deltaVsDefaultPerGuest)} so với chuẩn{" "}
                      {formatVND(dishView.activeDetail.defaultCostPerGuest)}).
                    </span>
                  </div>
                )}
              </div>

              {/* Bảng cấu thành chi phí từng nguyên liệu của món */}
              <CardContent className="p-0">
                <Table className="min-w-[660px]">
                  <TableHeader>
                    <TableRow className="bg-[#fdf0d5]/40 hover:bg-[#fdf0d5]/40">
                      <TableHead className="w-11 pl-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pl-5">
                        STT
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                        Nguyên liệu
                      </TableHead>
                      <TableHead className="w-28 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                        Định lượng
                      </TableHead>
                      <TableHead className="w-40 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                        Đơn giá kho
                      </TableHead>
                      <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                        Tiền / khách
                      </TableHead>
                      {scaled && (
                        <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-[#92400e]">
                          Cho {guests} khách
                        </TableHead>
                      )}
                      <TableHead className="w-24 whitespace-nowrap pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pr-5">
                        Tỷ trọng
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dishView.activeDetail.lines.map((line, idx) => (
                      <TableRow key={line.ingredientId} className="hover:bg-[#fdf0d5]/25 transition-colors">
                        <TableCell className="pl-4 text-center text-xs tabular-nums text-muted-foreground sm:pl-5">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-[#292524]">{line.name}</span>
                            {line.isCustomPrice && (
                              <Badge
                                variant="outline"
                                className="border-amber-300 bg-amber-50 px-1.5 py-0 text-[9.5px] font-semibold text-amber-800"
                              >
                                Giá tùy chỉnh
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {line.origin ?? INGREDIENT_GROUP_LABELS[line.group]}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-stone-700">
                          {formatQty(line.qtyPerGuest, line.unit)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-stone-600">
                          <div>
                            {formatVND(line.importPrice)}/{IMPORT_UNIT_LABELS[line.importUnit]}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground">
                            ({formatBaseUnitCost(line.costPerBaseUnit, line.unit)})
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-[#292524]">
                          {formatVND(line.costPerGuest)}
                        </TableCell>
                        {scaled && (
                          <TableCell className="text-right font-semibold tabular-nums text-[#92400e]">
                            {formatVND(line.costTotal)}
                          </TableCell>
                        )}
                        <TableCell className="pr-4 text-right text-xs tabular-nums text-stone-600 sm:pr-5">
                          {formatPercent(line.shareOfDishPct, 1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-muted/60">
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="pl-4 text-xs font-semibold text-stone-700 sm:pl-5">
                        Cộng giá vốn món {dishView.activeDetail.dishIndex} ·{" "}
                        {dishView.activeDetail.lines.length} nguyên liệu
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold tabular-nums text-[#292524]">
                        {formatVND(dishView.activeDetail.costPerGuest)}
                      </TableCell>
                      {scaled && (
                        <TableCell className="text-right text-xs font-bold tabular-nums text-[#92400e]">
                          {formatVND(dishView.activeDetail.costTotal)}
                        </TableCell>
                      )}
                      <TableCell className="pr-4 text-right text-xs font-bold tabular-nums text-stone-700 sm:pr-5">
                        100,0%
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ==================== 4. BẢNG ĐƠN GIÁ NHẬP KHO & CHI PHÍ NGUYÊN LIỆU ==================== */}
      <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#292524]">
                <Warehouse className="h-4 w-4 text-[#b45309]" aria-hidden />
                Bảng đơn giá nhập kho &amp; Tự tính chi phí nguyên liệu
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(report.customizedCount > 0 || Object.keys(savedOverrides).length > 0) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={savingPrices}
                  onClick={() => void handleResetAllPrices()}
                  className="h-9 rounded-full border-border text-xs text-stone-700 hover:bg-muted"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-[#b45309]" aria-hidden />
                  Khôi phục giá chuẩn ({report.customizedCount})
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                disabled={savingPrices || !hasUnsavedChanges}
                onClick={() => void handleSavePrices()}
                className="h-9 rounded-full bg-[#b45309] px-4 text-xs font-semibold text-[#fffbf2] hover:bg-[#92400e] disabled:opacity-50"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {savingPrices ? "Đang lưu..." : "Lưu đơn giá kho"}
              </Button>
            </div>
          </div>

          {/* Thanh công cụ tìm kiếm & bộ lọc */}
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Phạm vi hiển thị kho">
              {(
                [
                  { key: "ALL", label: `Tất cả kho (${report.warehouseItems.length})` },
                  { key: "STANDARD", label: `Suất chuẩn (${standardIngredientCount})` },
                  ...(report.customizedCount > 0
                    ? [{ key: "CUSTOM" as const, label: `Đã chỉnh giá (${report.customizedCount})` }]
                    : []),
                ] as { key: WarehouseScope; label: string }[]
              ).map((tab) => {
                const active = warehouseScope === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setWarehouseScope(tab.key)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-stone-800 bg-stone-800 text-white"
                        : "border-border bg-background text-stone-600 hover:border-stone-400",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={warehouseSearch}
                onChange={(e) => setWarehouseSearch(e.target.value)}
                placeholder="Tìm nguyên liệu, xuất xứ..."
                aria-label="Tìm nguyên liệu trong kho"
                className="h-9 rounded-full pl-8 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc nhóm nguyên liệu">
            {(["ALL", ...INGREDIENT_GROUP_ORDER] as const).map((g) => {
              const active = warehouseGroup === g;
              const count =
                g === "ALL"
                  ? report.warehouseItems.length
                  : report.warehouseItems.filter((i) => i.group === g).length;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setWarehouseGroup(g)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border-[#b45309] bg-[#b45309] text-[#fffbf2]"
                      : "border-border bg-card text-stone-600 hover:border-[#b45309]/50 hover:text-[#92400e]",
                  )}
                >
                  {g !== "ALL" && (
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-white" : GROUP_STYLES[g].dot)} />
                  )}
                  {g === "ALL" ? "Tất cả nhóm" : INGREDIENT_GROUP_LABELS[g]}
                  <span className={cn("tabular-nums", active ? "text-amber-100" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredWarehouse.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Layers className="h-6 w-6 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">Không tìm thấy nguyên liệu phù hợp bộ lọc.</p>
            </div>
          ) : (
            <Table className="min-w-[780px]">
              <TableHeader>
                <TableRow className="bg-[#fdf0d5]/40 hover:bg-[#fdf0d5]/40">
                  <TableHead className="pl-4 text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pl-5">
                    Nguyên liệu &amp; xuất xứ
                  </TableHead>
                  <TableHead className="w-36 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Dùng ở món
                  </TableHead>
                  <TableHead className="w-28 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Suất chuẩn
                  </TableHead>
                  <TableHead className="w-52 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Đơn giá nhập kho (sửa được)
                  </TableHead>
                  <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Quy đổi
                  </TableHead>
                  <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Chi phí / khách
                  </TableHead>
                  {scaled && (
                    <TableHead className="w-32 whitespace-nowrap pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#92400e] sm:pr-5">
                      Cho {guests} khách
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseByGroup.map(({ group, items }) => (
                  <WarehouseGroupSection
                    key={group}
                    group={group}
                    items={items}
                    scaled={scaled}
                    colSpan={warehouseColSpan}
                    onPriceChange={handlePriceChange}
                    onPickDish={(idx) => {
                      setSelectedDish(idx);
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 320, behavior: "smooth" });
                      }
                    }}
                  />
                ))}
              </TableBody>
              <TableFooter className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="pl-4 text-xs font-semibold text-stone-700 sm:pl-5">
                    {warehouseScope !== "CUSTOM" && warehouseGroup === "ALL" && !warehouseSearch.trim()
                      ? `Tổng giá vốn nguyên liệu suất chuẩn · ${standardIngredientCount} nguyên liệu`
                      : `Tổng chi phí suất chuẩn theo bộ lọc · ${filteredWarehouse.length} dòng`}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold tabular-nums text-[#292524]">
                    {formatVND(filteredTotals.perGuest)}
                  </TableCell>
                  {scaled && (
                    <TableCell className="pr-4 text-right text-xs font-bold tabular-nums text-[#92400e] sm:pr-5">
                      {formatVND(filteredTotals.total)}
                    </TableCell>
                  )}
                </TableRow>
              </TableFooter>
            </Table>
          )}

          {/* Phân trang giới hạn 20 dòng / trang */}
          {filteredWarehouse.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/80 px-4 py-3 bg-muted/20 text-xs text-muted-foreground">
              <div>
                Hiển thị{" "}
                <strong className="text-stone-800">
                  {filteredWarehouse.length === 0 ? 0 : (costPage - 1) * COST_PAGE_SIZE + 1}
                </strong>{" "}
                –{" "}
                <strong className="text-stone-800">
                  {Math.min(costPage * COST_PAGE_SIZE, filteredWarehouse.length)}
                </strong>{" "}
                trong tổng số{" "}
                <strong className="text-stone-800">{filteredWarehouse.length}</strong> nguyên liệu (tối đa 20 dòng / trang)
              </div>

              {costTotalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={costPage <= 1}
                    onClick={() => setCostPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2.5 text-xs text-stone-700"
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Trước
                  </Button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: costTotalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCostPage(p)}
                        className={cn(
                          "h-7 w-7 rounded-md text-xs font-semibold transition-colors",
                          costPage === p
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
                    disabled={costPage >= costTotalPages}
                    onClick={() => setCostPage((p) => Math.min(costTotalPages, p + 1))}
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
    </div>
  );
}

// ---------- Nhóm dòng nguyên liệu & Ô nhập đơn giá kho ----------

function WarehouseGroupSection({
  group,
  items,
  scaled,
  colSpan,
  onPriceChange,
  onPickDish,
}: {
  group: IngredientGroup;
  items: WarehouseIngredientCostItem[];
  scaled: boolean;
  colSpan: number;
  onPriceChange: (id: string, defaultPrice: number, nextPrice: number) => void;
  onPickDish: (dishIndex: number) => void;
}) {
  const groupSubtotal = items.reduce((s, i) => s + i.costPerGuestStandard, 0);
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-[#fdf0d5]/25 transition-colors">
        <TableCell colSpan={colSpan} className="py-1.5 pl-4 sm:pl-5">
          <div className="flex items-center justify-between pr-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
              <span className={cn("h-2 w-2 rounded-full", GROUP_STYLES[group].dot)} />
              {INGREDIENT_GROUP_LABELS[group]}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">
                ({items.length})
              </span>
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-stone-600">
              Nhóm: {formatVND(groupSubtotal)}/khách
            </span>
          </div>
        </TableCell>
      </TableRow>
      {items.map((item) => (
        <WarehousePriceRow
          key={item.ingredientId}
          item={item}
          scaled={scaled}
          onPriceChange={onPriceChange}
          onPickDish={onPickDish}
        />
      ))}
    </>
  );
}

function WarehousePriceRow({
  item,
  scaled,
  onPriceChange,
  onPickDish,
}: {
  item: WarehouseIngredientCostItem;
  scaled: boolean;
  onPriceChange: (id: string, defaultPrice: number, nextPrice: number) => void;
  onPickDish: (dishIndex: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draftText, setDraftText] = useState("");

  const displayValue = focused ? draftText : formatDots(item.importPrice);

  function handleFocus() {
    setDraftText(String(item.importPrice));
    setFocused(true);
  }

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setDraftText(digits);
    const num = Number(digits);
    if (digits !== "" && num >= MIN_IMPORT_PRICE && num <= MAX_IMPORT_PRICE) {
      onPriceChange(item.ingredientId, item.defaultImportPrice, num);
    }
  }

  function handleBlur() {
    setFocused(false);
    const num = Number(draftText);
    if (!draftText || Number.isNaN(num)) {
      return;
    }
    onPriceChange(item.ingredientId, item.defaultImportPrice, num);
  }

  const isStdUsed = item.qtyPerGuestStandard > 0;

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="whitespace-normal pl-4 sm:pl-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-[#292524]">{item.name}</span>
          {item.isCustomPrice && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 px-1.5 py-0 text-[9.5px] font-semibold text-amber-800"
            >
              Chuẩn {formatVND(item.defaultImportPrice)}
            </Badge>
          )}
        </div>
        {(item.origin || item.spec) && (
          <div className="text-[11px] text-muted-foreground">
            {[item.origin, item.spec].filter(Boolean).join(" · ")}
          </div>
        )}
      </TableCell>

      <TableCell>
        <div className="flex flex-wrap gap-1">
          {item.standardDishIndexes.map((idx) => {
            const dishName = MENU_ITEMS.find((m) => m.index === idx)?.name ?? `Món ${idx}`;
            return (
              <button
                key={`std-${idx}`}
                type="button"
                onClick={() => onPickDish(idx)}
                title={`Món ${idx}: ${dishName}`}
                aria-label={`Xem giá vốn món ${idx}: ${dishName}`}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#b45309]/30 bg-[#fdf0d5]/70 text-[10.5px] font-bold tabular-nums text-[#92400e] transition-colors hover:bg-[#b45309] hover:text-[#fffbf2]"
              >
                {idx}
              </button>
            );
          })}
          {item.altDishIndexes.map((idx) => {
            const dishName = MENU_ITEMS.find((m) => m.index === idx)?.name ?? `Món ${idx}`;
            return (
              <button
                key={`alt-${idx}`}
                type="button"
                onClick={() => onPickDish(idx)}
                title={`Món ${idx} (phương án thay thế): ${dishName}`}
                aria-label={`Xem giá vốn phương án thay thế món ${idx}`}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-stone-400 bg-stone-50 text-[10.5px] font-semibold tabular-nums text-stone-600 transition-colors hover:border-[#b45309] hover:text-[#92400e]"
              >
                {idx}
              </button>
            );
          })}
        </div>
      </TableCell>

      <TableCell className="text-right tabular-nums">
        {isStdUsed ? (
          <span className="font-medium text-stone-700">
            {formatQty(item.qtyPerGuestStandard, item.unit)}
          </span>
        ) : (
          <span className="text-[11px] italic text-muted-foreground">Thay thế</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="inline-flex items-center justify-end gap-1">
          {item.isCustomPrice && (
            <button
              type="button"
              onClick={() =>
                onPriceChange(item.ingredientId, item.defaultImportPrice, item.defaultImportPrice)
              }
              title={`Khôi phục giá chuẩn (${formatVND(item.defaultImportPrice)}/${IMPORT_UNIT_LABELS[item.importUnit]})`}
              aria-label={`Khôi phục đơn giá chuẩn cho ${item.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-full text-amber-700 transition-colors hover:bg-amber-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <div
            className={cn(
              "inline-flex h-8 items-center rounded-lg border bg-background px-2 transition-colors focus-within:border-[#b45309] focus-within:ring-1 focus-within:ring-[#b45309]/30",
              item.isCustomPrice ? "border-amber-400 bg-amber-50/40" : "border-border",
            )}
          >
            <input
              type="text"
              inputMode="numeric"
              value={displayValue}
              onFocus={handleFocus}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              aria-label={`Đơn giá nhập kho ${item.name} (đ/${IMPORT_UNIT_LABELS[item.importUnit]})`}
              className="w-24 bg-transparent text-right text-xs font-semibold tabular-nums text-[#292524] focus:outline-none"
            />
            <span className="ml-1 select-none text-[11px] text-muted-foreground">
              đ/{IMPORT_UNIT_LABELS[item.importUnit]}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell className="text-right text-xs tabular-nums text-stone-600">
        {formatBaseUnitCost(item.costPerBaseUnit, item.unit)}
      </TableCell>

      <TableCell className="text-right font-semibold tabular-nums text-[#292524]">
        {isStdUsed ? (
          formatVND(item.costPerGuestStandard)
        ) : (
          <span className="font-normal text-muted-foreground/60">—</span>
        )}
      </TableCell>

      {scaled && (
        <TableCell className="pr-4 text-right font-semibold tabular-nums text-[#92400e] sm:pr-5">
          {isStdUsed ? (
            formatVND(item.costTotalStandard)
          ) : (
            <span className="font-normal text-muted-foreground/60">—</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}

