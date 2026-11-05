"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useJson } from "@/components/tram/admin/admin-shared";
import { useTramEventListener } from "@/lib/tram/events";
import type {
  AvailabilityResponse,
  ReservationDTO,
  Slot,
  TableAvailability,
} from "@/lib/tram/types";

type AvailResp = AvailabilityResponse & { closed: boolean };

interface ListResponse {
  date: string;
  reservations: ReservationDTO[];
}

export function tableState(
  t: TableAvailability,
): "EMPTY" | "BOOKED" | "SEATED" | "COMPLETED" | "NO_SHOW" {
  if (!t.reservation) return "EMPTY";
  const s = t.reservation.status;
  if (s === "SEATED") return "SEATED";
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "NO_SHOW") return "NO_SHOW";
  return "BOOKED";
}

export function useFloorplanData({
  date,
  activeTableSlot,
  slotFilter,
  statusFilter,
  searchQuery,
  highlightedTableCode,
}: {
  date: string;
  activeTableSlot: Slot;
  slotFilter: "ALL" | "SLOT_1730" | "SLOT_1945";
  statusFilter: string;
  searchQuery: string;
  highlightedTableCode?: string | null;
}) {
  const {
    data: tableData,
    loading: loadingTables,
    refresh: refreshTables,
  } = useJson<AvailResp>(
    `/api/availability?date=${date}&slot=${activeTableSlot}&partySize=2&admin=1`,
  );

  const {
    data: listData,
    loading: loadingList,
    error: listError,
    refresh: refreshList,
  } = useJson<ListResponse>(`/api/reservations?date=${date}`);

  const handleRefreshAll = useCallback(() => {
    refreshTables();
    refreshList();
    toast.success("Đã làm mới dữ liệu đặt bàn.");
  }, [refreshTables, refreshList]);

  useTramEventListener((ev) => {
    if (ev.type === "RESERVATION_CHANGED") {
      refreshTables();
      refreshList();
    }
  });

  const allReservations = useMemo(() => listData?.reservations ?? [], [listData]);

  const DEFAULT_TABLE_DEFS = useMemo(
    () => [
      { id: "tbl_A01", code: "A01", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_A02", code: "A02", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_A03", code: "A03", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_A04", code: "A04", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_A05", code: "A05", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_B01", code: "B01", seats: 4, zone: "Khu trung tâm" },
      { id: "tbl_B02", code: "B02", seats: 4, zone: "Khu trung tâm" },
      { id: "tbl_B03", code: "B03", seats: 4, zone: "Khu trung tâm" },
      { id: "tbl_B04", code: "B04", seats: 4, zone: "Khu trung tâm" },
      { id: "tbl_B05", code: "B05", seats: 4, zone: "Khu trung tâm" },
    ],
    [],
  );

  const tables: TableAvailability[] = useMemo(() => {
    let sourceTables: TableAvailability[] = [];

    if (tableData?.tables && tableData.tables.length > 0) {
      sourceTables = tableData.tables.map((t) => {
        if (!t.reservation) {
          const matched = allReservations.find(
            (r) =>
              (r.table.id === t.table.id || r.table.code === t.table.code) &&
              r.slot === activeTableSlot &&
              r.status !== "CANCELLED",
          );
          if (matched) {
            return {
              ...t,
              available: false,
              reason: "BOOKED" as const,
              reservation: matched,
            };
          }
        }
        return t;
      });
    } else {
      sourceTables = DEFAULT_TABLE_DEFS.map((tbl) => {
        const matched = allReservations.find(
          (r) =>
            r.table.code === tbl.code &&
            r.slot === activeTableSlot &&
            r.status !== "CANCELLED",
        );
        return {
          table: tbl,
          available: !matched,
          reason: matched ? ("BOOKED" as const) : null,
          reservation: matched ?? null,
        };
      });
    }

    return sourceTables.filter(
      (t) => t.table.code !== "B11" && t.table.code !== "B12",
    );
  }, [tableData, allReservations, activeTableSlot, DEFAULT_TABLE_DEFS]);

  const filteredReservations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allReservations.filter((r) => {
      if (slotFilter !== "ALL" && r.slot !== slotFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (highlightedTableCode && r.table.code !== highlightedTableCode) return false;
      if (q) {
        const matchName = r.customerName.toLowerCase().includes(q);
        const matchPhone = r.phone.includes(q);
        const matchCode = r.code.toLowerCase().includes(q);
        const matchTable = r.table.code.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode && !matchTable) return false;
      }
      return true;
    });
  }, [allReservations, slotFilter, statusFilter, searchQuery, highlightedTableCode]);

  const stats = useMemo(() => {
    const valid = allReservations.filter((r) => r.status !== "CANCELLED");
    const seatedCount = valid.filter((r) => r.status === "SEATED").length;
    const totalSeats = valid.reduce((sum, r) => sum + r.partySize, 0);
    const totalDeposit = valid.reduce((sum, r) => sum + r.depositAmount, 0);
    return {
      totalCount: allReservations.length,
      validCount: valid.length,
      seatedCount,
      totalSeats,
      totalDeposit,
    };
  }, [allReservations]);

  const tableCounts = useMemo(() => {
    let empty = 0;
    let booked = 0;
    let seated = 0;
    let noShow = 0;
    for (const t of tables) {
      const state = tableState(t);
      if (state === "EMPTY") empty++;
      else if (state === "BOOKED") booked++;
      else if (state === "SEATED") seated++;
      else if (state === "NO_SHOW") noShow++;
    }
    return { empty, booked, seated, noShow, total: tables.length };
  }, [tables]);

  return {
    tableData,
    loadingTables,
    refreshTables,
    listData,
    loadingList,
    listError,
    refreshList,
    handleRefreshAll,
    allReservations,
    DEFAULT_TABLE_DEFS,
    tables,
    filteredReservations,
    stats,
    tableCounts,
  };
}
