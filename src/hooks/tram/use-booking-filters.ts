"use client";

import { useEffect, useMemo, useState } from "react";
import { useJson } from "@/components/tram/admin/admin-shared";
import {
  checkDateBookingAllowed,
  type BookingProgramSettings,
} from "@/lib/tram/booking-settings";
import type { Slot } from "@/lib/tram/types";

export function useBookingFilters(today: string, targetDate?: string) {
  const [date, setDate] = useState(targetDate || today);
  const [slotFilter, setSlotFilter] = useState<"ALL" | "SLOT_1730" | "SLOT_1945">("ALL");
  const [mapSlot, setMapSlot] = useState<Slot>("SLOT_1945");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedTableCode, setHighlightedTableCode] = useState<string | null>(null);

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
