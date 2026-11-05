"use client";

import { useCallback, useReducer } from "react";
import type {
  Pairing,
  ReservationDTO,
  ReservationStatus,
  Slot,
} from "@/lib/tram/types";

export interface ReservationModalsState {
  isCreateOpen: boolean;
  createTableCode: string;
  createDate: string;
  createSlot: Slot;
  createPartySize: number;
  createCustomerName: string;
  createPhone: string;
  createEmail: string;
  createSource: "PHONE" | "ZALO" | "WEB";
  createPairing: Pairing;
  createAllergy: string;
  createNotes: string;
  creating: boolean;

  editReservation: ReservationDTO | null;
  editTableCode: string;
  editSlot: Slot;
  editPartySize: number;
  editCustomerName: string;
  editPhone: string;
  editEmail: string;
  editPairing: Pairing;
  editStatus: ReservationStatus;
  editAllergy: string;
  editNotes: string;
  savingEdit: boolean;
}

type ModalAction =
  | { type: "PATCH"; payload: Partial<ReservationModalsState> }
  | {
      type: "OPEN_CREATE";
      payload: { date: string; slot: Slot; tableCode: string };
    }
  | { type: "OPEN_EDIT"; payload: ReservationDTO };

function createInitialModalState(today: string): ReservationModalsState {
  return {
    isCreateOpen: false,
    createTableCode: "A01",
    createDate: today,
    createSlot: "SLOT_1730",
    createPartySize: 2,
    createCustomerName: "",
    createPhone: "",
    createEmail: "",
    createSource: "PHONE",
    createPairing: "NONE",
    createAllergy: "",
    createNotes: "",
    creating: false,

    editReservation: null,
    editTableCode: "",
    editSlot: "SLOT_1730",
    editPartySize: 2,
    editCustomerName: "",
    editPhone: "",
    editEmail: "",
    editPairing: "NONE",
    editStatus: "CONFIRMED",
    editAllergy: "",
    editNotes: "",
    savingEdit: false,
  };
}

function modalReducer(
  state: ReservationModalsState,
  action: ModalAction,
): ReservationModalsState {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.payload };
    case "OPEN_CREATE":
      return {
        ...state,
        isCreateOpen: true,
        createDate: action.payload.date,
        createSlot: action.payload.slot,
        createTableCode: action.payload.tableCode,
        createPartySize: 2,
        createCustomerName: "",
        createPhone: "",
        createEmail: "",
        createSource: "PHONE",
        createPairing: "NONE",
        createAllergy: "",
        createNotes: "",
      };
    case "OPEN_EDIT": {
      const res = action.payload;
      return {
        ...state,
        editReservation: res,
        editTableCode: res.table.code,
        editSlot: res.slot,
        editPartySize: res.partySize,
        editCustomerName: res.customerName,
        editPhone: res.phone,
        editEmail: res.email || "",
        editPairing: res.pairing,
        editStatus: res.status,
        editAllergy: res.allergy || "",
        editNotes: res.notes || "",
      };
    }
    default:
      return state;
  }
}

/**
 * Custom Hook sử dụng useReducer gom toàn bộ 24 state rời của Create/Edit Modal
 * thành 1 state machine gọn nhẹ, vẫn giữ nguyên setter tương thích ngược 100%.
 */
export function useReservationFormModal(today: string) {
  const [state, dispatch] = useReducer(modalReducer, today, createInitialModalState);

  const patch = useCallback((payload: Partial<ReservationModalsState>) => {
    dispatch({ type: "PATCH", payload });
  }, []);

  const openCreate = useCallback(
    (date: string, slot: Slot, tableCode: string) => {
      dispatch({ type: "OPEN_CREATE", payload: { date, slot, tableCode } });
    },
    [],
  );

  const openEdit = useCallback((res: ReservationDTO) => {
    dispatch({ type: "OPEN_EDIT", payload: res });
  }, []);

  return {
    ...state,
    openCreate,
    openEdit,
    setIsCreateOpen: (v: boolean) => patch({ isCreateOpen: v }),
    setCreateTableCode: (v: string) => patch({ createTableCode: v }),
    setCreateDate: (v: string) => patch({ createDate: v }),
    setCreateSlot: (v: Slot) => patch({ createSlot: v }),
    setCreatePartySize: (v: number) => patch({ createPartySize: v }),
    setCreateCustomerName: (v: string) => patch({ createCustomerName: v }),
    setCreatePhone: (v: string) => patch({ createPhone: v }),
    setCreateEmail: (v: string) => patch({ createEmail: v }),
    setCreateSource: (v: "PHONE" | "ZALO" | "WEB") => patch({ createSource: v }),
    setCreatePairing: (v: Pairing) => patch({ createPairing: v }),
    setCreateAllergy: (v: string) => patch({ createAllergy: v }),
    setCreateNotes: (v: string) => patch({ createNotes: v }),
    setCreating: (v: boolean) => patch({ creating: v }),

    setEditReservation: (v: ReservationDTO | null) => patch({ editReservation: v }),
    setEditTableCode: (v: string) => patch({ editTableCode: v }),
    setEditSlot: (v: Slot) => patch({ editSlot: v }),
    setEditPartySize: (v: number) => patch({ editPartySize: v }),
    setEditCustomerName: (v: string) => patch({ editCustomerName: v }),
    setEditPhone: (v: string) => patch({ editPhone: v }),
    setEditEmail: (v: string) => patch({ editEmail: v }),
    setEditPairing: (v: Pairing) => patch({ editPairing: v }),
    setEditStatus: (v: ReservationStatus) => patch({ editStatus: v }),
    setEditAllergy: (v: string) => patch({ editAllergy: v }),
    setEditNotes: (v: string) => patch({ editNotes: v }),
    setSavingEdit: (v: boolean) => patch({ savingEdit: v }),
  };
}

