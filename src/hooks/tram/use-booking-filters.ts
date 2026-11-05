"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useJson } from "@/components/tram/admin/admin-shared";
import {
  checkDateBookingAllowed,
  type BookingProgramSettings,
} from "@/lib/tram/booking-settings";
import type { Slot } from "@/lib/tram/types";

/**
 * Xác định ca ưu tiên hiển thị theo thời gian thực:
 * - Trước 17:30 (1050 phút): ưu tiên hiển thị Ca 17:30 (SLOT_1730)
 * - Từ 17:30 trở đi: ưu tiên hiển thị Ca 19:45 (SLOT_1945)
 */
export function getRealtimePreferredSlot(now: Date = new Date()): Slot {
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoff1730 = 17 * 60 + 30; // 17:30
  return totalMinutes < cutoff1730 ? "SLOT_1730" : "SLOT_1945";
}

export function useBookingFilters(today: string, targetDate?: string) {
  const [date, setDate] = useState(targetDate || today);
  const [slotFilter, setSlotFilter] = useState<"ALL" | "SLOT_1730" | "SLOT_1945">("ALL");
  const [mapSlot, setMapSlotState] = useState<Slot>(() => getRealtimePreferredSlot());
  const [realtimeSlot, setRealtimeSlot] = useState<Slot>(() => getRealtimePreferredSlot());
  const userOverrodeMapSlotRef = useRef(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedTableCode, setHighlightedTableCode] = useState<string | null>(null);

  const setMapSlot = useCallback((nextSlot: Slot) => {
    userOverrodeMapSlotRef.current = true;
    setMapSlotState(nextSlot);
  }, []);

  // Tự động kiểm tra thời gian thực mỗi 30 giây: trước 17:30 -> SLOT_1730, sau 17:30 -> SLOT_1945
  useEffect(() => {
    const syncRealtimeSlot = () => {
      const preferred = getRealtimePreferredSlot();
      setRealtimeSlot(preferred);
      if (!userOverrodeMapSlotRef.current) {
        setMapSlotState(preferred);
      }
    };
    syncRealtimeSlot();
    const timer = window.setInterval(syncRealtimeSlot, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (targetDate) setDate(targetDate);
  }, [targetDate]);

  const { data: bookingSettings } = useJson<BookingProgramSettings>("/api/booking-settings");

  const selectedDateCheck = useMemo(() => {
    if (!bookingSettings) return { allowed: true };
    return checkDateBookingAllowed(date, bookingSettings, today);
  }, [date, bookingSettings, today]);

  const activeTableSlot: Slot = slotFilter === "ALL" ? mapSlot : slotFilter;

  return {
    date,
    setDate,
    slotFilter,
    setSlotFilter,
    mapSlot,
    setMapSlot,
    realtimeSlot,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    highlightedTableCode,
    setHighlightedTableCode,
    bookingSettings,
    selectedDateCheck,
    activeTableSlot,
  };
}
