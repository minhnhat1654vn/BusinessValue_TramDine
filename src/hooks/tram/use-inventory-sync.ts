"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatPercent, formatVND } from "@/lib/tram/format";
import {
  getFoodCostKpiSummary,
  MAX_IMPORT_PRICE,
  MIN_IMPORT_PRICE,
} from "@/lib/tram/food-cost";
import {
  calculateInventoryReport,
  type ExtraInventoryIngredient,
} from "@/lib/tram/inventory";
import { emitTramEvent, useTramEventListener } from "@/lib/tram/events";

function areMapsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export function useInventoryOptimisticSync() {
  const [loaded, setLoaded] = useState(false);
  const [savedStock, setSavedStock] = useState<Record<string, number>>({});
  const [draftStock, setDraftStock] = useState<Record<string, number>>({});
  const [savedReorder, setSavedReorder] = useState<Record<string, number>>({});
  const [draftReorder, setDraftReorder] = useState<Record<string, number>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [extraIngredients, setExtraIngredients] = useState<ExtraInventoryIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
        if (Array.isArray(data.extraIngredients)) {
          setExtraIngredients(data.extraIngredients as ExtraInventoryIngredient[]);
        }
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

  useTramEventListener((ev) => {
    if (ev.type === "CONCEPT_ACTIVATED" || ev.type === "STOCK_UPDATED") {
      if (!pendingSyncRef.current) fetchSnapshot(false);
    }
  });

  // Tự động đồng bộ tồn kho & mức đặt lại lên server (debounce 380ms)
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
            emitTramEvent({ type: "STOCK_UPDATED" });
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

  const foodCostKpi = useMemo(
    () => getFoodCostKpiSummary(priceOverrides),
    [priceOverrides],
  );

  const handlePriceChange = useCallback(
    async (ingredientId: string, defaultPrice: number, nextPrice: number) => {
      const clamped = Math.min(MAX_IMPORT_PRICE, Math.max(MIN_IMPORT_PRICE, Math.round(nextPrice)));
      const nextOverrides = { ...priceOverrides };
      if (clamped === defaultPrice) {
        delete nextOverrides[ingredientId];
      } else {
        nextOverrides[ingredientId] = clamped;
      }
      setPriceOverrides(nextOverrides);

      try {
        const res = await fetch("/api/food-cost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prices: nextOverrides }),
        });
        if (res.ok) {
          const updatedKpi = getFoodCostKpiSummary(nextOverrides);
          emitTramEvent({ type: "PRICE_UPDATED", ingredientId, nextPrice: clamped });
          toast.success(`Đã cập nhật đơn giá ${formatVND(clamped)}.`, {
            description: `KPI Food Cost tự nhảy: ${formatPercent(updatedKpi.foodCostPct, 1)} (Giá vốn ${formatVND(updatedKpi.costPerGuest)}/khách).`,
          });
        }
      } catch {
        toast.error("Lỗi khi lưu đơn giá kho.");
      }
    },
    [priceOverrides],
  );

  const report = useMemo(
    () => calculateInventoryReport(draftStock, priceOverrides, draftReorder, extraIngredients),
    [draftStock, priceOverrides, draftReorder, extraIngredients],
  );

  return {
    loaded,
    savedStock,
    setSavedStock,
    draftStock,
    setDraftStock,
    savedReorder,
    setSavedReorder,
    draftReorder,
    setDraftReorder,
    priceOverrides,
    setPriceOverrides,
    extraIngredients,
    isSaving,
    setIsSaving,
    isPendingSync,
    fetchSnapshot,
    foodCostKpi,
    handlePriceChange,
    report,
  };
}
