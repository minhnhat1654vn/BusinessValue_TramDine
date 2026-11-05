"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getImportUnitFactor } from "@/lib/tram/food-cost";
import { roundQty } from "@/lib/tram/recipes";
import type { InventoryItem } from "@/lib/tram/inventory";
import { useTramEventListener } from "@/lib/tram/events";

export interface DailyDemandSummary {
  date: string;
  dayIndex: number;
  dayLabel: string;
  tableCount: number;
  guestCount: number;
}

export interface ForecastItemAnalysis {
  item: InventoryItem;
  stdQtyPerGuest: number;
  totalRequiredQty: number;
  requiredInImportUnit: number;
  stockInImportUnit: number;
  shortageQty: number;
  shortageInImportUnit: number;
  isShortage: boolean;
  procurementCost: number;
  surplusInImportUnit: number;
  guestsCovered: number;
  daysCoveredText: string;
}

export function useDemandForecastEngine(items: InventoryItem[]) {
  const [dailyForecasts, setDailyForecasts] = useState<DailyDemandSummary[]>([]);
  const [forecastConcept, setForecastConcept] = useState<{
    name: string;
    startDate: string | null;
    endDate: string | null;
  } | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number>(1);
  const [autoSelectedInfo, setAutoSelectedInfo] = useState<string>("");

  const fetchForecast = useCallback(() => {
    fetch("/api/inventory/demand-forecast")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.days)) return;
        setDailyForecasts(data.days);
        setForecastConcept(data.concept ?? null);
        setLoadingForecast(false);
      })
      .catch((err) => {
        console.error("Failed to fetch demand forecast:", err);
        setLoadingForecast(false);
      });
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  useTramEventListener((ev) => {
    if (ev.type === "RESERVATION_CHANGED" || ev.type === "CONCEPT_ACTIVATED") {
      fetchForecast();
    }
  });

  const PRESET_DAYS = useMemo(() => {
    const maxDays = dailyForecasts.length;
    if (maxDays === 0) return [1, 2, 3, 4];
    const base = [1, 2, 3, 4, 5, 7, 14].filter((d) => d <= maxDays);
    return base.includes(maxDays) ? base : [...base, maxDays];
  }, [dailyForecasts.length]);

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
          else if (dailyForecasts.length > 0 && daysCountCovered >= dailyForecasts.length)
            daysCoveredText = `Đủ hết Concept (${dailyForecasts.length} ngày)`;
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
    setSelectedDays(Math.min(3, dailyForecasts.length));
    setAutoSelectedInfo("Kho hiện tại đáp ứng tốt lịch đặt bàn trong các ngày tới.");
  }, [dailyForecasts, PRESET_DAYS, computeShortagesForDays]);

  const presetShortageCounts = useMemo(() => {
    const map: Record<number, number> = {};
    for (const d of PRESET_DAYS) {
      const analyses = computeShortagesForDays(d);
      map[d] = analyses.filter((a) => a.isShortage).length;
    }
    return map;
  }, [PRESET_DAYS, computeShortagesForDays]);

  const currentAnalyses = useMemo(
    () => computeShortagesForDays(selectedDays),
    [computeShortagesForDays, selectedDays],
  );

  return {
    dailyForecasts,
    forecastConcept,
    loadingForecast,
    selectedDays,
    setSelectedDays,
    autoSelectedInfo,
    PRESET_DAYS,
    presetShortageCounts,
    currentAnalyses,
    refreshForecast: fetchForecast,
  };
}

