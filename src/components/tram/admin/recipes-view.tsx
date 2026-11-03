"use client";

// FR-27 — Định lượng công thức (BOM): bảng công thức theo món cho 7 món tasting,
// định lượng nguyên liệu cho mỗi khách, kèm phương án thay thế và tổng hợp một suất.
import { useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft,
  ChefHat,
  ClipboardList,
  CookingPot,
  Layers,
  Minus,
  Plus,
  Scale,
  Search,
  Users,
  UtensilsCrossed,
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
import {
  DISH_RECIPES,
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  MAX_SCALE_GUESTS,
  aggregateMenu,
  formatQty,
  getDefaultOptionId,
  getRecipeVariant,
  resolveLines,
  sumByUnit,
  type IngredientGroup,
  type IngredientUnit,
} from "@/lib/tram/recipes";

// Màu nhận diện từng nhóm nguyên liệu
const GROUP_STYLES: Record<IngredientGroup, { badge: string; dot: string }> = {
  PROTEIN: { badge: "border-rose-200 bg-rose-50 text-rose-800", dot: "bg-rose-500" },
  STARCH: { badge: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  DAIRY_FAT: { badge: "border-yellow-200 bg-yellow-50 text-yellow-800", dot: "bg-yellow-500" },
  PRODUCE: { badge: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  FRUIT_NUT: { badge: "border-orange-200 bg-orange-50 text-orange-800", dot: "bg-orange-500" },
  SEASONING: { badge: "border-stone-300 bg-stone-100 text-stone-700", dot: "bg-stone-500" },
  AROMATIC: { badge: "border-violet-200 bg-violet-50 text-violet-800", dot: "bg-violet-500" },
};

const QUICK_GUESTS = [1, 4, 10, 42];

/** Hiển thị tổng g và ml, bỏ đơn vị bằng 0 */
function formatTotals(totals: Record<IngredientUnit, number>): string {
  const parts: string[] = [];
  if (totals.g > 0) parts.push(formatQty(totals.g, "g"));
  if (totals.ml > 0) parts.push(formatQty(totals.ml, "ml"));
  return parts.length > 0 ? parts.join(" + ") : "—";
}

function GroupBadge({ group }: { group: IngredientGroup }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap px-2 py-0.5 text-[10.5px] font-medium", GROUP_STYLES[group].badge)}
    >
      {INGREDIENT_GROUP_LABELS[group]}
    </Badge>
  );
}

/** Dựng dữ liệu công thức của một món: phương án đang chọn, so sánh với chuẩn, tổng định lượng */
function buildDishDetail(dishIndex: number, optionId: string | undefined, guests: number) {
  const recipe = DISH_RECIPES.find((r) => r.dishIndex === dishIndex) ?? DISH_RECIPES[0];
  const menuItem = MENU_ITEMS.find((m) => m.index === recipe.dishIndex);
  const defaultOptionId = getDefaultOptionId(recipe.dishIndex);
  const activeVariant =
    getRecipeVariant(recipe.dishIndex, optionId ?? defaultOptionId) ?? recipe.variants[0];
  const isDefaultVariant = activeVariant.optionId === defaultOptionId;

  const lines = resolveLines(activeVariant.lines, guests);
  const stdVariant = getRecipeVariant(recipe.dishIndex, defaultOptionId);
  const stdQty = new Map((stdVariant?.lines ?? []).map((l) => [l.ingredientId, l.qty]));
  const activeIds = new Set(activeVariant.lines.map((l) => l.ingredientId));
  const removed = isDefaultVariant
    ? []
    : resolveLines((stdVariant?.lines ?? []).filter((l) => !activeIds.has(l.ingredientId)));

  const detail = {
    lines: lines.map((l) => {
      const std = stdQty.get(l.ingredientId);
      let diff: "new" | "changed" | null = null;
      if (!isDefaultVariant) {
        if (std === undefined) diff = "new";
        else if (std !== l.qtyPerGuest) diff = "changed";
      }
      return { ...l, diff, stdQty: std };
    }),
    removed,
    perGuest: sumByUnit(lines.map((l) => ({ unit: l.unit, qty: l.qtyPerGuest }))),
    total: sumByUnit(lines.map((l) => ({ unit: l.unit, qty: l.qtyTotal }))),
  };

  return { recipe, menuItem, defaultOptionId, activeVariant, isDefaultVariant, detail };
}

export function AdminRecipes() {
  const [guests, setGuests] = useState(1);
  const [guestsInput, setGuestsInput] = useState("1");
  const [selectedDish, setSelectedDish] = useState(1);
  const [variantByDish, setVariantByDish] = useState<Record<number, string>>({});
  const [summarySearch, setSummarySearch] = useState("");
  const [summaryGroup, setSummaryGroup] = useState<IngredientGroup | "ALL">("ALL");

  const scaled = guests > 1;

  function applyGuests(next: number) {
    const clamped = Math.min(MAX_SCALE_GUESTS, Math.max(1, Math.round(next)));
    setGuests(clamped);
    setGuestsInput(String(clamped));
  }

  function handleGuestsInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    setGuestsInput(digits);
    const parsed = Number(digits);
    if (digits !== "" && parsed >= 1 && parsed <= MAX_SCALE_GUESTS) setGuests(parsed);
  }

  // ---------- Dữ liệu tổng quan 7 món ----------
  const dishCards = useMemo(
    () =>
      DISH_RECIPES.map((recipe) => {
        const item = MENU_ITEMS.find((m) => m.index === recipe.dishIndex);
        const std = getRecipeVariant(recipe.dishIndex);
        return {
          index: recipe.dishIndex,
          name: item?.name ?? `Món ${recipe.dishIndex}`,
          region: item?.region ?? "",
          image: item?.image ?? "",
          ingredientCount: std?.lines.length ?? 0,
          variantCount: recipe.variants.length,
        };
      }),
    [],
  );

  const menuSummary = useMemo(() => aggregateMenu(guests), [guests]);

  const stats = useMemo(() => {
    const perGuest = sumByUnit(menuSummary.map((a) => ({ unit: a.unit, qty: a.qtyPerGuest })));
    const total = sumByUnit(menuSummary.map((a) => ({ unit: a.unit, qty: a.qtyTotal })));
    const altCount = DISH_RECIPES.reduce((acc, r) => acc + r.variants.length - 1, 0);
    return { perGuest, total, altCount };
  }, [menuSummary]);

  // ---------- Món đang xem ----------
  const pickedOptionId = variantByDish[selectedDish];
  const { recipe, menuItem, defaultOptionId, activeVariant, isDefaultVariant, detail } = useMemo(
    () => buildDishDetail(selectedDish, pickedOptionId, guests),
    [selectedDish, pickedOptionId, guests],
  );

  // ---------- Bảng tổng hợp có lọc ----------
  const filteredSummary = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return menuSummary.filter((a) => {
      if (summaryGroup !== "ALL" && a.group !== summaryGroup) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuSummary, summarySearch, summaryGroup]);

  const summaryByGroup = useMemo(
    () =>
      INGREDIENT_GROUP_ORDER.map((group) => ({
        group,
        items: filteredSummary.filter((a) => a.group === group),
      })).filter((g) => g.items.length > 0),
    [filteredSummary],
  );

  const filteredTotals = useMemo(
    () => ({
      perGuest: sumByUnit(filteredSummary.map((a) => ({ unit: a.unit, qty: a.qtyPerGuest }))),
      total: sumByUnit(filteredSummary.map((a) => ({ unit: a.unit, qty: a.qtyTotal }))),
    }),
    [filteredSummary],
  );

  const summaryColSpan = scaled ? 4 : 3;

  return (
    <div className="space-y-6">
      {/* ==================== 1. TIÊU ĐỀ & QUY ĐỔI SỐ KHÁCH ==================== */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
            Bếp &amp; kho
          </span>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Định lượng công thức
          </h2>
        </div>

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
                  {n === 42 ? "42 · đủ ca" : `${n} khách`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 2. CHỈ SỐ TỔNG QUAN ==================== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            id: "dishes",
            label: "Món trong menu",
            value: String(DISH_RECIPES.length),
            sub: "Tasting “Hành trình vị Việt”",
            icon: UtensilsCrossed,
          },
          {
            id: "ingredients",
            label: "Nguyên liệu / suất",
            value: String(menuSummary.length),
            sub: "Loại nguyên liệu, phương án chuẩn",
            icon: Layers,
          },
          {
            id: "weight",
            label: scaled ? `Tổng cho ${guests} khách` : "Định lượng / khách",
            value: formatQty(scaled ? stats.total.g : stats.perGuest.g, "g"),
            sub: scaled
              ? `+ ${formatQty(stats.total.ml, "ml")} (${formatQty(stats.perGuest.g, "g")}/khách)`
              : `và ${formatQty(stats.perGuest.ml, "ml")} chất lỏng`,
            icon: Scale,
          },
          {
            id: "variants",
            label: "Phương án thay thế",
            value: String(stats.altCount),
            sub: "Chay, không gluten, đổi cách chế biến",
            icon: ArrowRightLeft,
          },
        ].map((s) => (
          <Card key={s.id} className="min-w-0 gap-0 border-border/80 bg-card py-0 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase leading-tight tracking-wider text-stone-600 sm:text-[11px]">
                  {s.label}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                  <s.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <div className="mt-2 font-heading text-2xl font-bold tabular-nums text-[#92400e]">{s.value}</div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={s.sub}>
                {s.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ==================== 3. BẢNG CÔNG THỨC THEO MÓN ==================== */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[296px_minmax(0,1fr)]">
        {/* Danh sách 7 món */}
        <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-xs xl:sticky xl:top-20">
          <CardHeader className="border-b border-border/60 px-4 py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#292524]">
              <ChefHat className="h-4 w-4 text-[#b45309]" aria-hidden />
              Bảy món tasting
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <nav
              aria-label="Chọn món để xem công thức"
              className="tram-scroll flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:gap-1 xl:overflow-visible xl:pb-0"
            >
              {dishCards.map((d) => {
                const active = d.index === selectedDish;
                return (
                  <button
                    key={d.index}
                    type="button"
                    onClick={() => setSelectedDish(d.index)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-60 shrink-0 items-center gap-3 rounded-xl border p-2 text-left transition-colors xl:w-full",
                      active
                        ? "border-[#b45309]/60 bg-[#fdf0d5] shadow-xs"
                        : "border-transparent hover:border-border hover:bg-muted/60",
                    )}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {d.image && (
                        <Image
                          src={d.image}
                          alt={d.name}
                          fill
                          sizes="48px"
                          loading="eager"
                          className="object-cover"
                        />
                      )}
                      <span className="absolute left-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#292524]/80 px-1 text-[9.5px] font-bold text-white">
                        {d.index}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider",
                          active ? "text-[#b45309]" : "text-muted-foreground",
                        )}
                      >
                        Món {d.index} · {d.region}
                      </div>
                      <div
                        className={cn(
                          "line-clamp-2 text-[13px] font-medium leading-snug",
                          active ? "text-[#292524]" : "text-stone-700",
                        )}
                      >
                        {d.name}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                        {d.ingredientCount} nguyên liệu · {d.variantCount} phương án
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Chi tiết công thức món đang chọn */}
        <AnimatePresence mode="wait">
          <motion.div
            key={recipe.dishIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            <Card className="gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
              {/* Đầu thẻ món */}
              <div className="flex flex-col gap-4 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24">
                  {menuItem?.image && (
                    <Image
                      src={menuItem.image}
                      alt={menuItem.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 96px"
                      loading="eager"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-0 bg-[#b45309] px-2 py-0.5 text-[10.5px] font-semibold text-[#fffbf2] hover:bg-[#b45309]">
                      Món {recipe.dishIndex} / {DISH_RECIPES.length}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-[#b45309]/30 bg-[#fdf0d5]/60 px-2 py-0.5 text-[10.5px] font-medium text-[#92400e]"
                    >
                      {menuItem?.region}
                    </Badge>
                  </div>
                  <h3 className="mt-1.5 font-heading text-xl font-bold leading-snug text-[#292524]">
                    {menuItem?.name}
                  </h3>
                  <div className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs text-stone-700">
                    <CookingPot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b45309]" aria-hidden />
                    <span>
                      <span className="font-semibold">Khẩu phần 1 khách:</span> {recipe.portion}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chọn phương án */}
              <div className="space-y-3 border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Phương án
                  </span>
                  {recipe.variants.map((v) => {
                    const option = menuItem?.options?.find((o) => o.id === v.optionId);
                    const active = v.optionId === activeVariant.optionId;
                    const isDefault = v.optionId === defaultOptionId;
                    return (
                      <button
                        key={v.optionId}
                        type="button"
                        onClick={() =>
                          setVariantByDish((prev) => ({ ...prev, [recipe.dishIndex]: v.optionId }))
                        }
                        aria-pressed={active}
                        title={option?.desc}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors",
                          active
                            ? "border-[#b45309] bg-[#b45309] text-[#fffbf2] shadow-xs"
                            : "border-border bg-card text-stone-700 hover:border-[#b45309]/50 hover:text-[#92400e]",
                        )}
                      >
                        {option?.name ?? v.optionId}
                        {isDefault && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide",
                              active ? "bg-white/20 text-white" : "bg-[#fdf0d5] text-[#92400e]",
                            )}
                          >
                            Chuẩn
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {!isDefaultVariant && activeVariant.note && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900">
                    <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
                    <span>{activeVariant.note}</span>
                  </div>
                )}
              </div>

              {/* Bảng định lượng */}
              <CardContent className="p-0">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow className="bg-[#fdf0d5]/40 hover:bg-[#fdf0d5]/40">
                      <TableHead className="w-11 pl-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pl-5">
                        STT
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                        Nguyên liệu
                      </TableHead>
                      <TableHead className="w-40 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                        Nhóm
                      </TableHead>
                      <TableHead className="w-36 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                        Định lượng / khách
                      </TableHead>
                      {scaled && (
                        <TableHead className="w-32 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-[#92400e]">
                          Cho {guests} khách
                        </TableHead>
                      )}
                      <TableHead className="min-w-44 pr-4 text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pr-5">
                        Ghi chú sơ chế
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.lines.map((line, i) => (
                      <TableRow key={line.ingredientId} className="hover:bg-muted/40">
                        <TableCell className="pl-4 text-center text-xs tabular-nums text-muted-foreground sm:pl-5">
                          {i + 1}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-[#292524]">{line.name}</span>
                            {line.diff === "new" && (
                              <Badge className="border-0 bg-emerald-600 px-1.5 py-0 text-[9.5px] font-semibold text-white hover:bg-emerald-600">
                                Thay thế
                              </Badge>
                            )}
                            {line.diff === "changed" && line.stdQty !== undefined && (
                              <Badge
                                variant="outline"
                                className="border-amber-300 bg-amber-50 px-1.5 py-0 text-[9.5px] font-semibold text-amber-800"
                              >
                                Chuẩn {formatQty(line.stdQty, line.unit)}
                              </Badge>
                            )}
                          </div>
                          {line.spec && <div className="text-[11px] text-muted-foreground">{line.spec}</div>}
                        </TableCell>
                        <TableCell>
                          <GroupBadge group={line.group} />
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-[#292524]">
                          {formatQty(line.qtyPerGuest, line.unit)}
                        </TableCell>
                        {scaled && (
                          <TableCell className="text-right font-semibold tabular-nums text-[#92400e]">
                            {formatQty(line.qtyTotal, line.unit)}
                          </TableCell>
                        )}
                        <TableCell className="whitespace-normal pr-4 text-xs text-stone-600 sm:pr-5">
                          {line.note ?? <span className="text-muted-foreground/60">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-muted/60">
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="pl-4 text-xs font-semibold text-stone-700 sm:pl-5">
                        Tổng định lượng · {detail.lines.length} nguyên liệu
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold tabular-nums text-[#292524]">
                        {formatTotals(detail.perGuest)}
                      </TableCell>
                      {scaled && (
                        <TableCell className="text-right text-xs font-bold tabular-nums text-[#92400e]">
                          {formatTotals(detail.total)}
                        </TableCell>
                      )}
                      <TableCell className="pr-4 sm:pr-5" />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>

              {/* Nguyên liệu bị bỏ & cách chế biến */}
              <div className="space-y-3 border-t border-border/60 px-4 py-4 sm:px-5">
                {detail.removed.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-stone-700">Không dùng so với phương án chuẩn:</span>
                    {detail.removed.map((r) => (
                      <Badge
                        key={r.ingredientId}
                        variant="outline"
                        className="border-stone-300 bg-stone-50 px-2 py-0.5 text-[10.5px] font-medium text-stone-500 line-through decoration-stone-400"
                      >
                        {r.name} · {formatQty(r.qtyPerGuest, r.unit)}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-[#fffbf2] px-3 py-2.5 text-xs leading-relaxed text-stone-700">
                  <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b45309]" aria-hidden />
                  <span>
                    <span className="font-semibold text-[#292524]">Cách chế biến: </span>
                    {recipe.method}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ==================== 4. TỔNG HỢP MỘT SUẤT 7 MÓN ==================== */}
      <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#292524]">
                <Layers className="h-4 w-4 text-[#b45309]" aria-hidden />
                Tổng hợp nguyên liệu cho một suất tasting 7 món
              </CardTitle>
            </div>
            <div className="relative w-full md:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                placeholder="Tìm nguyên liệu..."
                aria-label="Tìm nguyên liệu"
                className="h-9 rounded-full pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo nhóm nguyên liệu">
            {(["ALL", ...INGREDIENT_GROUP_ORDER] as const).map((g) => {
              const active = summaryGroup === g;
              const count = g === "ALL" ? menuSummary.length : menuSummary.filter((a) => a.group === g).length;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSummaryGroup(g)}
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
                  {g === "ALL" ? "Tất cả" : INGREDIENT_GROUP_LABELS[g]}
                  <span className={cn("tabular-nums", active ? "text-amber-100" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Search className="h-6 w-6 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">Không có nguyên liệu phù hợp bộ lọc.</p>
            </div>
          ) : (
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow className="bg-[#fdf0d5]/40 hover:bg-[#fdf0d5]/40">
                  <TableHead className="pl-4 text-[11px] font-semibold uppercase tracking-wider text-stone-600 sm:pl-5">
                    Nguyên liệu
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Dùng ở món
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    Định lượng / khách
                  </TableHead>
                  {scaled && (
                    <TableHead className="pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#92400e] sm:pr-5">
                      Cho {guests} khách
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryByGroup.map(({ group, items }) => (
                  <GroupRows
                    key={group}
                    group={group}
                    items={items}
                    scaled={scaled}
                    colSpan={summaryColSpan}
                    onPickDish={(idx) => {
                      setSelectedDish(idx);
                      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                ))}
              </TableBody>
              <TableFooter className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="pl-4 text-xs font-semibold text-stone-700 sm:pl-5">
                    {summaryGroup === "ALL" && !summarySearch.trim()
                      ? `Tổng một suất · ${filteredSummary.length} nguyên liệu`
                      : `Tổng theo bộ lọc · ${filteredSummary.length} nguyên liệu`}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold tabular-nums text-[#292524]">
                    {formatTotals(filteredTotals.perGuest)}
                  </TableCell>
                  {scaled && (
                    <TableCell className="pr-4 text-right text-xs font-bold tabular-nums text-[#92400e] sm:pr-5">
                      {formatTotals(filteredTotals.total)}
                    </TableCell>
                  )}
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Nhóm dòng theo nhóm nguyên liệu trong bảng tổng hợp
function GroupRows({
  group,
  items,
  scaled,
  colSpan,
  onPickDish,
}: {
  group: IngredientGroup;
  items: ReturnType<typeof aggregateMenu>;
  scaled: boolean;
  colSpan: number;
  onPickDish: (dishIndex: number) => void;
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={colSpan} className="py-1.5 pl-4 sm:pl-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
            <span className={cn("h-2 w-2 rounded-full", GROUP_STYLES[group].dot)} />
            {INGREDIENT_GROUP_LABELS[group]}
            <span className="font-normal normal-case tracking-normal text-muted-foreground">
              ({items.length})
            </span>
          </span>
        </TableCell>
      </TableRow>
      {items.map((a) => (
        <TableRow key={a.ingredientId} className="hover:bg-muted/30">
          <TableCell className="whitespace-normal pl-4 sm:pl-5">
            <div className="font-medium text-[#292524]">{a.name}</div>
            {a.spec && <div className="text-[11px] text-muted-foreground">{a.spec}</div>}
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {a.dishIndexes.map((idx) => {
                const dishName = MENU_ITEMS.find((m) => m.index === idx)?.name ?? `Món ${idx}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onPickDish(idx)}
                    title={`Món ${idx}: ${dishName}`}
                    aria-label={`Xem công thức món ${idx}: ${dishName}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-[#b45309]/30 bg-[#fdf0d5]/70 text-[10.5px] font-bold tabular-nums text-[#92400e] transition-colors hover:bg-[#b45309] hover:text-[#fffbf2]"
                  >
                    {idx}
                  </button>
                );
              })}
            </div>
          </TableCell>
          <TableCell className="text-right font-semibold tabular-nums text-[#292524]">
            {formatQty(a.qtyPerGuest, a.unit)}
          </TableCell>
          {scaled && (
            <TableCell className="pr-4 text-right font-semibold tabular-nums text-[#92400e] sm:pr-5">
              {formatQty(a.qtyTotal, a.unit)}
            </TableCell>
          )}
        </TableRow>
      ))}
    </>
  );
}
