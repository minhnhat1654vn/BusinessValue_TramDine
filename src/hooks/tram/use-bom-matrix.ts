"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  MAX_SCALE_GUESTS,
  type IngredientGroup,
} from "@/lib/tram/recipes";
import type { BomResponse } from "@/lib/tram/recipes-server";
import { useTramEventListener } from "@/lib/tram/events";

export const MENU_SELLING_PRICE = 1190000;
export const TARGET_FOOD_COST_PCT = 33.5;
export const TARGET_FOOD_COST_VND = 398650;
const ING_PAGE_SIZE = 20;

export function useBomMatrixAndFoodCost(selectedConceptId: string) {
  // Quy đổi số khách
  const [guests, setGuests] = useState(1);
  const [guestsInput, setGuestsInput] = useState("1");
  const [selectedDish, setSelectedDish] = useState(1);
  const [variantByDish, setVariantByDish] = useState<Record<number, string>>({});
  const [summarySearch, setSummarySearch] = useState("");
  const [summaryGroup, setSummaryGroup] = useState<IngredientGroup | "ALL">("ALL");

  // Kho nguyên liệu: tìm kiếm, lọc & phân trang (tối đa 20 dòng / trang)
  const [ingSearch, setIngSearch] = useState("");
  const [ingGroupFilter, setIngGroupFilter] = useState<IngredientGroup | "ALL">("ALL");
  const [ingStockFilter, setIngStockFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [ingPage, setIngPage] = useState(1);

  useEffect(() => {
    setIngPage(1);
  }, [ingSearch, ingGroupFilter, ingStockFilter]);

  // Dữ liệu từ API
  const [bomData, setBomData] = useState<BomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const scaled = guests > 1;

  // Tải dữ liệu từ API theo Concept được chọn
  const loadBom = useCallback(
    async (g: number = guests, silent: boolean = false, cid?: string) => {
      try {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        const targetCid = cid ?? selectedConceptId;
        const res = await fetch(`/api/recipes?guests=${g}&conceptId=${targetCid}`);
        if (!res.ok) throw new Error("Không thể tải bảng định lượng.");
        const json: BomResponse = await res.json();
        setBomData(json);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Lỗi tải dữ liệu định lượng.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [guests, selectedConceptId],
  );

  useEffect(() => {
    void loadBom(guests, false, selectedConceptId);
  }, [guests, selectedConceptId, loadBom]);

  // Lắng nghe sự kiện từ trang Tồn kho để tự động đồng bộ số lượng tồn & giá nhập trên BOM
  useTramEventListener(
    useCallback(
      (event) => {
        if (event.type === "STOCK_UPDATED" || event.type === "PRICE_UPDATED") {
          void loadBom(guests, true, selectedConceptId);
        }
      },
      [loadBom, guests, selectedConceptId],
    ),
  );

  const applyGuests = useCallback((next: number) => {
    const clamped = Math.min(MAX_SCALE_GUESTS, Math.max(1, Math.round(next)));
    setGuests(clamped);
    setGuestsInput(String(clamped));
  }, []);

  const handleGuestsInput = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    setGuestsInput(digits);
    const parsed = Number(digits);
    if (digits !== "" && parsed >= 1 && parsed <= MAX_SCALE_GUESTS) setGuests(parsed);
  }, []);

  // 1. Giá vốn từng món theo định lượng BOM
  const dishCostMap = useMemo(() => {
    if (!bomData) return new Map<number, number>();
    const map = new Map<number, number>();
    for (const d of bomData.dishes) {
      const defVar = d.variants.find((v) => v.isDefault) ?? d.variants[0];
      if (!defVar) {
        map.set(d.index, 0);
        continue;
      }
      const cost = defVar.lines.reduce((sum, l) => {
        const linePrice = l.defaultImportPrice || 0;
        return sum + Math.round((l.qtyPerGuest * linePrice) / 1000);
      }, 0);
      map.set(d.index, cost);
    }
    return map;
  }, [bomData]);

  // 2. Tổng Food Cost thực đơn (1 suất)
  const totalFoodCost = useMemo(() => {
    let total = 0;
    dishCostMap.forEach((cost) => {
      total += cost;
    });
    return total;
  }, [dishCostMap]);

  // 3. Tỷ lệ Food Cost % trên giá bán menu 1.190.000 đ
  const actualFoodCostPct = useMemo(() => {
    if (MENU_SELLING_PRICE <= 0) return 0;
    return Math.round((totalFoodCost / MENU_SELLING_PRICE) * 1000) / 10;
  }, [totalFoodCost]);

  // 4. Lãi gộp lý thuyết / 1 suất
  const grossProfit = Math.max(0, MENU_SELLING_PRICE - totalFoodCost);
  const grossProfitPct = Math.round((grossProfit / MENU_SELLING_PRICE) * 1000) / 10;

  // 5. Chi phí ca 42 khách
  const shift42Cost = totalFoodCost * 42;
  const shift42Revenue = MENU_SELLING_PRICE * 42;

  // 6. Món có chi phí cao nhất
  const highestDish = useMemo(() => {
    if (!bomData || bomData.dishes.length === 0) return null;
    let maxDish = bomData.dishes[0];
    let maxCost = dishCostMap.get(maxDish.index) || 0;
    for (const d of bomData.dishes) {
      const cost = dishCostMap.get(d.index) || 0;
      if (cost > maxCost) {
        maxCost = cost;
        maxDish = d;
      }
    }
    return { dish: maxDish, cost: maxCost };
  }, [bomData, dishCostMap]);

  // 7. Phân bổ chi phí theo 7 nhóm nguyên liệu
  const groupCostSummary = useMemo(() => {
    if (!bomData) return [];
    const costByGroup: Record<IngredientGroup, number> = {
      PROTEIN: 0,
      STARCH: 0,
      DAIRY_FAT: 0,
      PRODUCE: 0,
      FRUIT_NUT: 0,
      SEASONING: 0,
      AROMATIC: 0,
    };
    for (const d of bomData.dishes) {
      const defVar = d.variants.find((v) => v.isDefault) ?? d.variants[0];
      if (!defVar) continue;
      for (const l of defVar.lines) {
        const grp = (l.group || "SEASONING") as IngredientGroup;
        const lineCost = Math.round((l.qtyPerGuest * (l.defaultImportPrice || 0)) / 1000);
        if (costByGroup[grp] !== undefined) {
          costByGroup[grp] += lineCost;
        }
      }
    }
    return INGREDIENT_GROUP_ORDER.map((grp) => {
      const cost = costByGroup[grp] || 0;
      const share = totalFoodCost > 0 ? Math.round((cost / totalFoodCost) * 1000) / 10 : 0;
      return {
        group: grp,
        label: INGREDIENT_GROUP_LABELS[grp],
        cost,
        share,
      };
    });
  }, [bomData, totalFoodCost]);

  const activeDish = useMemo(() => {
    if (!bomData) return null;
    return bomData.dishes.find((d) => d.index === selectedDish) ?? bomData.dishes[0];
  }, [bomData, selectedDish]);

  const activeDishCost = useMemo(() => {
    if (!activeDish) return 0;
    const defVar = activeDish.variants.find((v) => v.isDefault) ?? activeDish.variants[0];
    if (!defVar) return 0;
    return defVar.lines.reduce((sum, l) => {
      return sum + Math.round((l.qtyPerGuest * (l.defaultImportPrice || 0)) / 1000);
    }, 0);
  }, [activeDish]);

  const activeVariant = useMemo(() => {
    if (!activeDish) return null;
    const pickedOptionId = variantByDish[selectedDish];
    if (pickedOptionId) {
      const found = activeDish.variants.find((v) => v.optionId === pickedOptionId);
      if (found) return found;
    }
    return activeDish.variants.find((v) => v.isDefault) ?? activeDish.variants[0];
  }, [activeDish, variantByDish, selectedDish]);

  const menuSummary = useMemo(() => bomData?.summary.ingredients ?? [], [bomData]);

  const filteredSummary = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return menuSummary.filter((a) => {
      if (summaryGroup !== "ALL" && a.group !== summaryGroup) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuSummary, summarySearch, summaryGroup]);

  const filteredAllIngredients = useMemo(() => {
    if (!bomData) return [];
    const q = ingSearch.trim().toLowerCase();
    return bomData.allIngredients.filter((i) => {
      if (ingGroupFilter !== "ALL" && i.group !== ingGroupFilter) return false;
      if (ingStockFilter === "LOW_STOCK" && (i.currentStock > i.minStock || i.currentStock <= 0))
        return false;
      if (ingStockFilter === "OUT_OF_STOCK" && i.currentStock > 0) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bomData, ingSearch, ingGroupFilter, ingStockFilter]);

  const ingTotalPages = Math.max(1, Math.ceil(filteredAllIngredients.length / ING_PAGE_SIZE));
  const paginatedIngredients = useMemo(() => {
    const start = (ingPage - 1) * ING_PAGE_SIZE;
    return filteredAllIngredients.slice(start, start + ING_PAGE_SIZE);
  }, [filteredAllIngredients, ingPage]);

  return {
    guests,
    setGuests,
    guestsInput,
    setGuestsInput,
    scaled,
    applyGuests,
    handleGuestsInput,
    selectedDish,
    setSelectedDish,
    variantByDish,
    setVariantByDish,
    summarySearch,
    setSummarySearch,
    summaryGroup,
    setSummaryGroup,
    ingSearch,
    setIngSearch,
    ingGroupFilter,
    setIngGroupFilter,
    ingStockFilter,
    setIngStockFilter,
    ingPage,
    setIngPage,
    ingTotalPages,
    paginatedIngredients,
    filteredAllIngredients,
    filteredSummary,
    bomData,
    setBomData,
    loading,
    isRefreshing,
    loadBom,
    dishCostMap,
    totalFoodCost,
    actualFoodCostPct,
    grossProfit,
    grossProfitPct,
    shift42Cost,
    shift42Revenue,
    highestDish,
    groupCostSummary,
    activeDish,
    activeDishCost,
    activeVariant,
  };
}
