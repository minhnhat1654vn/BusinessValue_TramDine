"use client";

// Giao diện Đặt bàn hợp nhất — Sơ đồ bàn ở trên, Danh sách khách đặt bàn ở dưới
// Kèm bộ lọc toàn giao diện đồng bộ & nút chuyển nhanh đến Cài đặt đặt bàn
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Calendar,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  Clock,
  DoorOpen,
  Eye,
  Filter,
  LogIn,
  Pencil,
  Plus,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Table2,
  Trash2,
  UserX,
  Users,
  UtensilsCrossed,
  Flame,
  LogOut,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  AllergyBadge,
  DayStrip,
  ErrorBlock,
  LoadingBlock,
  SlotToggle,
  StatusBadge,
  useJson,
} from "./admin-shared";
import {
  formatCheckinTime,
  formatLongDate,
  formatShortDate,
  formatVND,
  relativeDayLabel,
  weekdayOf,
} from "@/lib/tram/format";
import { parseReservationDishes } from "@/lib/tram/dishes";
import {
  PAIRING_LABELS,
  SLOT_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  MENU_ITEMS,
} from "@/lib/tram/constants";
import type {
  AvailabilityResponse,
  Pairing,
  ReservationDTO,
  ReservationStatus,
  Slot,
  TableAvailability,
} from "@/lib/tram/types";
import {
  checkDateBookingAllowed,
  type BookingProgramSettings,
} from "@/lib/tram/booking-settings";
import {
  CheckinRewardDialog,
  type CheckinLoyaltyReward,
} from "./checkin-reward-dialog";
import { SurveyDialog } from "../survey/survey-dialog";
import { TableCourseTracker } from "./table-course-tracker";

type AvailResp = AvailabilityResponse & { closed: boolean };

interface ListResponse {
  date: string;
  reservations: ReservationDTO[];
}

const STATUS_OPTIONS = [
  "ALL",
  "CONFIRMED",
  "PENDING",
  "SEATED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
] as const;

const ZONES = [
  { name: "Khu cửa sổ", hint: "A01 - A05" },
  { name: "Khu trung tâm", hint: "B01 - B10" },
];

// Kích thước và tọa độ chính xác của các bàn trên bản vẽ thiết kế mặt bằng (15 bàn: A01-A05 2 chỗ, B01-B10 3 chỗ)
const FLOORPLAN_COORDINATES: Record<
  string,
  { x: number; y: number; w: number; h: number; shape: "square" | "circle" }
> = {
  // KHU A - CỬA SỔ - SÁT VIEW SÔNG (5 bàn vuông 2 chỗ: A01 - A05)
  A01: { x: 16.5, y: 19.8, w: 7.2, h: 7.2, shape: "square" },
  A02: { x: 34.8, y: 19.8, w: 7.2, h: 7.2, shape: "square" },
  A03: { x: 53.1, y: 19.8, w: 7.2, h: 7.2, shape: "square" },
  A04: { x: 71.4, y: 19.8, w: 7.2, h: 7.2, shape: "square" },
  A05: { x: 89.6, y: 19.8, w: 7.2, h: 7.2, shape: "square" },

  // KHU B - TRUNG TÂM (10 bàn 3 chỗ bố trí quanh Bếp Mở: B01 - B10)
  B01: { x: 22.0, y: 39.0, w: 7.2, h: 7.2, shape: "circle" },
  B02: { x: 33.0, y: 39.0, w: 7.2, h: 7.2, shape: "circle" },
  B03: { x: 22.0, y: 56.5, w: 7.2, h: 7.2, shape: "circle" },
  B04: { x: 33.0, y: 56.5, w: 7.2, h: 7.2, shape: "circle" },
  B05: { x: 27.5, y: 72.0, w: 7.2, h: 7.2, shape: "circle" },
  B06: { x: 74.0, y: 39.0, w: 7.2, h: 7.2, shape: "circle" },
  B07: { x: 85.0, y: 39.0, w: 7.2, h: 7.2, shape: "circle" },
  B08: { x: 74.0, y: 56.5, w: 7.2, h: 7.2, shape: "circle" },
  B09: { x: 85.0, y: 56.5, w: 7.2, h: 7.2, shape: "circle" },
  B10: { x: 54.5, y: 66.0, w: 7.2, h: 7.2, shape: "circle" },
};

function tableState(t: TableAvailability): "EMPTY" | "BOOKED" | "SEATED" | "COMPLETED" | "NO_SHOW" {
  if (!t.reservation) return "EMPTY";
  const s = t.reservation.status;
  if (s === "SEATED") return "SEATED";
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "NO_SHOW") return "NO_SHOW";
  return "BOOKED"; // PENDING / CONFIRMED
}

const STATE_STYLES: Record<string, { box: string; label: string; badge: string }> = {
  EMPTY: {
    box: "border-dashed border-stone-300 bg-[#fffdf9] text-stone-500 hover:border-[#b45309]/60",
    label: "Trống",
    badge: "border-stone-300 bg-stone-100 text-stone-600",
  },
  BOOKED: {
    box: "border-[#b45309] bg-[#fdf0d5] text-[#92400e] hover:brightness-[0.98]",
    label: "Đã đặt",
    badge: "border-[#b45309]/40 bg-[#fdf0d5] text-[#92400e]",
  },
  SEATED: {
    box: "border-emerald-600 bg-emerald-100 text-emerald-800 hover:brightness-[0.98]",
    label: "Đang phục vụ",
    badge: "border-emerald-600/40 bg-emerald-100 text-emerald-800",
  },
  COMPLETED: {
    box: "border-sky-500 bg-sky-100 text-sky-800 hover:brightness-[0.98]",
    label: "Đã hoàn tất",
    badge: "border-sky-500/40 bg-sky-100 text-sky-800",
  },
  NO_SHOW: {
    box: "border-rose-500 bg-rose-100 text-rose-700 hover:brightness-[0.98]",
    label: "Không đến",
    badge: "border-rose-500/40 bg-rose-100 text-rose-700",
  },
};

function formatTimeOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "";
  }
}

interface BookingUnifiedViewProps {
  today: string;
  onNavigateToSettings?: () => void;
  targetDate?: string;
}

export function AdminBookingUnifiedView({
  today,
  onNavigateToSettings,
  targetDate,
}: BookingUnifiedViewProps) {
  // 1. Trạng thái bộ lọc toàn giao diện (Global Filter State)
  const [date, setDate] = useState(targetDate || today);

  useEffect(() => {
    if (targetDate) setDate(targetDate);
  }, [targetDate]);
  const [slotFilter, setSlotFilter] = useState<"ALL" | "SLOT_1730" | "SLOT_1945">("ALL");
  const [mapSlot, setMapSlot] = useState<Slot>("SLOT_1730");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Nạp cấu hình chương trình để hiển thị trạng thái ngày giống trải nghiệm khách hàng
  const { data: bookingSettings } = useJson<BookingProgramSettings>("/api/booking-settings");

  const selectedDateCheck = useMemo(() => {
    if (!bookingSettings) return { allowed: true };
    return checkDateBookingAllowed(date, bookingSettings, today);
  }, [date, bookingSettings, today]);

  // Đồng bộ slot sơ đồ bàn khi người dùng chọn khung giờ cụ thể
  const activeTableSlot: Slot = slotFilter === "ALL" ? mapSlot : slotFilter;

  // 2. Fetch dữ liệu Sơ đồ bàn (theo ngày & activeTableSlot)
  const {
    data: tableData,
    loading: loadingTables,
    refresh: refreshTables,
  } = useJson<AvailResp>(
    `/api/availability?date=${date}&slot=${activeTableSlot}&partySize=2&admin=1`,
  );

  // 3. Fetch dữ liệu Danh sách đặt bàn (theo ngày)
  const {
    data: listData,
    loading: loadingList,
    error: listError,
    refresh: refreshList,
  } = useJson<ListResponse>(`/api/reservations?date=${date}`);

  // Hàm refresh đồng bộ cả sơ đồ bàn và danh sách
  const handleRefreshAll = useCallback(() => {
    refreshTables();
    refreshList();
    toast.success("Đã làm mới dữ liệu đặt bàn.");
  }, [refreshTables, refreshList]);

  // Các dialog và tác vụ thao tác
  const [selectedTable, setSelectedTable] = useState<TableAvailability | null>(null);
  const [detailReservation, setDetailReservation] = useState<ReservationDTO | null>(null);
  const [confirmNoShow, setConfirmNoShow] = useState(false);
  const [acting, setActing] = useState(false);
  const [rewardData, setRewardData] = useState<CheckinLoyaltyReward | null>(null);
  const [surveyTarget, setSurveyTarget] = useState<ReservationDTO | null>(null);

  // Quản lý Modal Đặt bàn mới (Admin Create)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTableCode, setCreateTableCode] = useState<string>("A01");
  const [createDate, setCreateDate] = useState(today);
  const [createSlot, setCreateSlot] = useState<Slot>("SLOT_1730");
  const [createPartySize, setCreatePartySize] = useState<number>(2);
  const [createCustomerName, setCreateCustomerName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createSource, setCreateSource] = useState<"PHONE" | "ZALO" | "WEB">("PHONE");
  const [createPairing, setCreatePairing] = useState<Pairing>("NONE");
  const [createAllergy, setCreateAllergy] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Quản lý Modal Sửa đặt bàn (Admin Edit)
  const [editReservation, setEditReservation] = useState<ReservationDTO | null>(null);
  const [editTableCode, setEditTableCode] = useState("");
  const [editSlot, setEditSlot] = useState<Slot>("SLOT_1730");
  const [editPartySize, setEditPartySize] = useState<number>(2);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPairing, setEditPairing] = useState<Pairing>("NONE");
  const [editStatus, setEditStatus] = useState<ReservationStatus>("CONFIRMED");
  const [editAllergy, setEditAllergy] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Quản lý Xóa mềm (Soft Delete)
  const [softDeleteTarget, setSoftDeleteTarget] = useState<ReservationDTO | null>(null);

  const allReservations = useMemo(() => listData?.reservations ?? [], [listData]);

  // Danh sách 15 bàn của TRẦM (A01–A05 & B01–B10)
  const DEFAULT_TABLE_DEFS = useMemo(
    () => [
      { id: "tbl_A01", code: "A01", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_A02", code: "A02", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_A03", code: "A03", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_A04", code: "A04", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_A05", code: "A05", seats: 2, zone: "Khu cửa sổ" },
      { id: "tbl_B01", code: "B01", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B02", code: "B02", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B03", code: "B03", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B04", code: "B04", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B05", code: "B05", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B06", code: "B06", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B07", code: "B07", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B08", code: "B08", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B09", code: "B09", seats: 3, zone: "Khu trung tâm" },
      { id: "tbl_B10", code: "B10", seats: 3, zone: "Khu trung tâm" },
    ],
    []
  );

  // Ghép nối thông tin bàn với các đặt bàn của ca hiện tại (lọc bỏ B11 và B12)
  const tables: TableAvailability[] = useMemo(() => {
    let sourceTables: TableAvailability[] = [];

    if (tableData?.tables && tableData.tables.length > 0) {
      sourceTables = tableData.tables.map((t) => {
        // Luôn đồng bộ reservation mới nhất từ allReservations nếu có
        const matched = allReservations.find(
          (r) =>
            (r.table.id === t.table.id || r.table.code === t.table.code) &&
            r.slot === activeTableSlot &&
            r.status !== "CANCELLED"
        );
        if (matched) {
          return {
            ...t,
            available: false,
            reason: "BOOKED" as const,
            reservation: matched,
          };
        }
        return t;
      });
    } else {
      // Fallback tức thì nếu tableData chưa tải xong
      sourceTables = DEFAULT_TABLE_DEFS.map((tbl) => {
        const matched = allReservations.find(
          (r) =>
            r.table.code === tbl.code &&
            r.slot === activeTableSlot &&
            r.status !== "CANCELLED"
        );
        return {
          table: tbl,
          available: !matched,
          reason: matched ? ("BOOKED" as const) : null,
          reservation: matched ?? null,
        };
      });
    }

    // Lọc bỏ bàn B11 và B12
    return sourceTables.filter(
      (t) => t.table.code !== "B11" && t.table.code !== "B12"
    );
  }, [tableData, allReservations, activeTableSlot, DEFAULT_TABLE_DEFS]);

  // Lọc danh sách đặt bàn theo bộ lọc toàn giao diện
  const filteredReservations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allReservations.filter((r) => {
      // Lọc khung giờ
      if (slotFilter !== "ALL" && r.slot !== slotFilter) return false;
      // Lọc trạng thái
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      // Lọc tìm kiếm
      if (q) {
        const matchName = r.customerName.toLowerCase().includes(q);
        const matchPhone = r.phone.includes(q);
        const matchCode = r.code.toLowerCase().includes(q);
        const matchTable = r.table.code.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode && !matchTable) return false;
      }
      return true;
    });
  }, [allReservations, slotFilter, statusFilter, searchQuery]);

  // Thống kê nhanh
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

  // Thống kê 4 trạng thái bàn trên sơ đồ (Trống, Đã đặt, Đã đến, Không đến)
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

  // Thống kê 4 trạng thái thẻ bộ lọc (tương ứng với khung giờ đang chọn)
  const summaryCounts = useMemo(() => {
    const valid = allReservations.filter((r) => r.status !== "CANCELLED");
    const scopeReservations =
      slotFilter === "ALL"
        ? valid
        : valid.filter((r) => r.slot === slotFilter);

    const seated = scopeReservations.filter((r) => r.status === "SEATED").length;
    const booked = scopeReservations.filter(
      (r) => r.status === "CONFIRMED" || r.status === "PENDING"
    ).length;
    const noShow = scopeReservations.filter((r) => r.status === "NO_SHOW").length;
    const totalCapacity = slotFilter === "ALL" ? 30 : 15;
    const empty = Math.max(0, totalCapacity - (seated + booked + noShow));

    return {
      empty,
      booked,
      seated,
      noShow,
      totalCapacity,
      unitLabel: slotFilter === "ALL" ? "lượt bàn" : "bàn",
    };
  }, [allReservations, slotFilter]);

  // Thao tác Check-in
  async function handleCheckin(id: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không thể check-in.");
        return;
      }
      toast.success(body.message ?? "Check-in thành công!");
      if (body.loyalty) {
        setRewardData(body.loyalty);
      }
      if (detailReservation?.id === id) {
        setDetailReservation(body.reservation);
      }
      setSelectedTable(null);
      refreshTables();
      refreshList();
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setActing(false);
    }
  }

  // Mở form sửa đặt bàn và điền sẵn dữ liệu
  const openEditModal = useCallback((res: ReservationDTO) => {
    setEditReservation(res);
    setEditTableCode(res.table.code);
    setEditSlot(res.slot);
    setEditPartySize(res.partySize);
    setEditCustomerName(res.customerName);
    setEditPhone(res.phone);
    setEditEmail(res.email || "");
    setEditPairing(res.pairing);
    setEditStatus(res.status);
    setEditAllergy(res.allergy || "");
    setEditNotes(res.notes || "");
  }, []);

  // Mở form tạo đặt bàn mới
  const openCreateModal = useCallback((tableCode?: string) => {
    setCreateDate(date);
    setCreateSlot(activeTableSlot);
    setCreateTableCode(tableCode || (tables.find(t => tableState(t) === "EMPTY")?.table.code ?? "A01"));
    setCreatePartySize(2);
    setCreateCustomerName("");
    setCreatePhone("");
    setCreateEmail("");
    setCreateSource("PHONE");
    setCreatePairing("NONE");
    setCreateAllergy("");
    setCreateNotes("");
    setIsCreateOpen(true);
  }, [date, activeTableSlot, tables]);

  // Thao tác Tạo đặt bàn mới
  async function handleCreateReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!createCustomerName.trim() || createCustomerName.trim().length < 2) {
      toast.error("Vui lòng nhập họ tên khách hàng (tối thiểu 2 ký tự).");
      return;
    }
    if (!createPhone.trim() || !/^0\d{9}$/.test(createPhone.trim())) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ (10 chữ số, vd: 0912345678).");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/reservations?admin=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: createDate,
          slot: createSlot,
          tableId: createTableCode,
          partySize: createPartySize,
          customerName: createCustomerName.trim(),
          phone: createPhone.trim(),
          email: createEmail.trim() || undefined,
          source: createSource,
          pairing: createPairing,
          allergy: createAllergy.trim() || undefined,
          notes: createNotes.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không tạo được đặt bàn.");
        return;
      }
      toast.success(`Đặt bàn thành công cho khách ${createCustomerName}! Mã: ${body.reservation.code}`);
      setIsCreateOpen(false);
      refreshTables();
      refreshList();
    } catch {
      toast.error("Lỗi kết nối khi tạo đặt bàn.");
    } finally {
      setCreating(false);
    }
  }

  // Thao tác Lưu sửa đặt bàn
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editReservation) return;
    if (!editCustomerName.trim() || editCustomerName.trim().length < 2) {
      toast.error("Họ tên khách hàng không được để trống.");
      return;
    }
    if (!editPhone.trim() || !/^0\d{9}$/.test(editPhone.trim())) {
      toast.error("Số điện thoại không hợp lệ (10 chữ số).");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/reservations/${editReservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          customerName: editCustomerName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          partySize: editPartySize,
          tableId: editTableCode,
          slot: editSlot,
          pairing: editPairing,
          status: editStatus,
          allergy: editAllergy.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không thể lưu thay đổi.");
        return;
      }
      toast.success(body.message ?? `Đã cập nhật đặt bàn ${editReservation.code}!`);
      setEditReservation(null);
      if (detailReservation?.id === editReservation.id) {
        setDetailReservation(body.reservation);
      }
      if (selectedTable?.reservation?.id === editReservation.id) {
        setSelectedTable(null);
      }
      refreshTables();
      refreshList();
    } catch {
      toast.error("Lỗi kết nối khi cập nhật đặt bàn.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Thao tác Xóa mềm (Soft Delete)
  async function handleConfirmSoftDelete() {
    if (!softDeleteTarget) return;
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${softDeleteTarget.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không thể xóa đặt bàn.");
        return;
      }
      toast.success(body.message ?? `Đã xóa mềm đặt bàn ${softDeleteTarget.code}! Bàn đã được giải phóng.`);
      setSoftDeleteTarget(null);
      if (selectedTable?.reservation?.id === softDeleteTarget.id) {
        setSelectedTable(null);
      }
      if (detailReservation?.id === softDeleteTarget.id) {
        setDetailReservation(body.reservation);
      }
      refreshTables();
      refreshList();
    } catch {
      toast.error("Lỗi kết nối khi xóa đặt bàn.");
    } finally {
      setActing(false);
    }
  }

  // Thao tác Khôi phục đặt bàn đã xóa mềm
  async function handleRestore(id: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không thể khôi phục đặt bàn.");
        return;
      }
      toast.success(body.message ?? "Khôi phục đặt bàn thành công!");
      refreshTables();
      refreshList();
    } catch {
      toast.error("Lỗi kết nối khi khôi phục.");
    } finally {
      setActing(false);
    }
  }

  // Thao tác Đánh dấu không đến (No-show)
  async function handleNoShow(id: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "noshow" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không cập nhật được trạng thái.");
        return;
      }
      toast.success(body.message ?? "Đã đánh dấu khách không đến.");
      setConfirmNoShow(false);
      setSelectedTable(null);
      if (detailReservation?.id === id) {
        setDetailReservation(body.reservation);
      }
      refreshTables();
      refreshList();
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setActing(false);
    }
  }

  // Bàn được chọn trong dialog sơ đồ
  const selectedReservation = selectedTable?.reservation ?? null;

  return (
    <div className="space-y-6">
      {/* ==================== THANH CÔNG CỤ & TIÊU ĐỀ ==================== */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="p-4 sm:p-5">
          {/* Header: Tiêu đề + Nút Chuyển Settings & Refresh */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fdf0d5] text-[#b45309]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-[#292524] sm:text-xl">
                  Quản lý Đặt bàn &amp; Sơ đồ bàn
                </h2>
                <p className="text-xs text-muted-foreground">
                  Điều phối vận hành tập trung: Sơ đồ bàn trực quan &amp; Danh sách khách hàng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToSettings}
                  className="h-9 rounded-full border-[#b45309]/40 bg-[#fdf0d5]/40 text-[#92400e] hover:bg-[#fdf0d5] hover:text-[#78350f] text-xs font-medium shadow-xs"
                >
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-[#b45309]" />
                  Cài đặt đặt bàn
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                disabled={loadingTables || loadingList}
                className="h-9 rounded-full border-border text-stone-600 hover:bg-muted text-xs"
                title="Làm mới dữ liệu cả sơ đồ và danh sách"
              >
                <RefreshCw
                  className={cn(
                    "mr-1.5 h-3.5 w-3.5",
                    (loadingTables || loadingList) && "animate-spin"
                  )}
                />
                Làm mới
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== PHẦN 1: SƠ ĐỒ BÀN (NẰM Ở TRÊN) ==================== */}
      <Card className="border-border/80 bg-card shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-[#fffdf9]/70 py-4 px-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-[#292524] sm:text-lg">
                <Table2 className="h-5 w-5 text-[#b45309]" />
                Sơ đồ bàn theo ca
                <Badge variant="outline" className="ml-1 text-xs border-[#b45309]/50 bg-[#fdf0d5] text-[#92400e]">
                  {activeTableSlot === "SLOT_1730" ? "Ca 17:30" : "Ca 19:45"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                15 bàn (A01–A05 &amp; B01–B10). Bấm vào bàn để xem chi tiết, Check-in hoặc đổi trạng thái.
              </CardDescription>
            </div>

            {/* Nếu bộ lọc khung giờ là ALL -> Cho phép chuyển ca xem sơ đồ bàn */}
            {slotFilter === "ALL" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Xem sơ đồ ca:</span>
                <div className="inline-flex rounded-full border border-border bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => setMapSlot("SLOT_1730")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      mapSlot === "SLOT_1730"
                        ? "bg-[#b45309] text-white shadow-xs"
                        : "text-muted-foreground hover:text-stone-800"
                    )}
                  >
                    17:30
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapSlot("SLOT_1945")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      mapSlot === "SLOT_1945"
                        ? "bg-[#b45309] text-white shadow-xs"
                        : "text-muted-foreground hover:text-stone-800"
                    )}
                  >
                    19:45
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DẢI HIỂN THỊ SỐ LƯỢNG: BÀN TRỐNG, ĐÃ ĐẶT, ĐÃ ĐẾN, KHÔNG ĐẾN */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
            {/* 1. Bàn trống */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs shadow-2xs transition-all",
                statusFilter === "ALL" || statusFilter === "CANCELLED"
                  ? "border-stone-300 bg-white text-stone-700 font-medium"
                  : "border-stone-200 bg-stone-50/60 text-stone-400 opacity-60"
              )}
              title="Số bàn còn trống (chưa có khách đặt)"
            >
              <span className="h-2.5 w-2.5 rounded border border-dashed border-stone-400 bg-stone-100" />
              <span>Bàn trống:</span>
              <span className="font-heading font-bold text-stone-900">{tableCounts.empty}</span>
            </div>

            {/* 2. Đã đặt */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs shadow-2xs transition-all",
                statusFilter === "ALL" || statusFilter === "CONFIRMED" || statusFilter === "PENDING"
                  ? "border-[#b45309]/40 bg-[#fdf0d5] text-[#92400e] font-medium"
                  : "border-stone-200 bg-stone-50/60 text-stone-400 opacity-60"
              )}
              title="Số bàn đã xác nhận hoặc chờ cọc"
            >
              <span className="h-2.5 w-2.5 rounded bg-[#b45309]" />
              <span>Đã đặt:</span>
              <span className="font-heading font-bold text-[#b45309]">{tableCounts.booked}</span>
            </div>

            {/* 3. Đã đến */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs shadow-2xs transition-all",
                statusFilter === "ALL" || statusFilter === "SEATED"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium"
                  : "border-stone-200 bg-stone-50/60 text-stone-400 opacity-60"
              )}
              title="Số bàn khách đã đến nhận bàn (SEATED)"
            >
              <span className="h-2.5 w-2.5 rounded bg-emerald-600" />
              <span>Đã đến:</span>
              <span className="font-heading font-bold text-emerald-900">{tableCounts.seated}</span>
            </div>

            {/* 4. Không đến */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs shadow-2xs transition-all",
                statusFilter === "ALL" || statusFilter === "NO_SHOW"
                  ? "border-rose-300 bg-rose-50 text-rose-800 font-medium"
                  : "border-stone-200 bg-stone-50/60 text-stone-400 opacity-60"
              )}
              title="Số bàn khách không đến (NO_SHOW)"
            >
              <span className="h-2.5 w-2.5 rounded bg-rose-600" />
              <span>Không đến:</span>
              <span className="font-heading font-bold text-rose-900">{tableCounts.noShow}</span>
            </div>

            <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">
              Tổng cộng: <strong className="text-stone-700">{tables.length}</strong> bàn
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {/* SƠ ĐỒ MẶT BẰNG KIẾN TRÚC FINE DINING (ĐỒNG BỘ 100% VỚI NGƯỜI DÙNG) */}
          <div className="space-y-4">
            <div className="relative mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-3xl border border-[#c5a059]/40 bg-[#f7f2ea] p-2 shadow-xl shadow-stone-900/10">
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-stone-300/60 bg-[#fffdfa]">
                <img
                  src="/floorplan.jpg"
                  alt="Sơ đồ mặt bằng nhà hàng TRẦM"
                  className="pointer-events-none h-full w-full select-none object-cover filter contrast-[1.03] brightness-[1.01]"
                />

                {loadingTables && !tables ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-xs">
                    <LoadingBlock label="Đang tải sơ đồ bàn..." />
                  </div>
                ) : tables ? (
                  tables
                    .filter((t) => FLOORPLAN_COORDINATES[t.table.code])
                    .map((t) => {
                      const coord = FLOORPLAN_COORDINATES[t.table.code];
                      const state = tableState(t);
                      const res = t.reservation;
                      const isSelected = selectedTable?.table.id === t.table.id;

                      // Lọc trạng thái & tìm kiếm
                      let isDimmed = false;
                      let isSearchMatch = false;

                      if (statusFilter !== "ALL") {
                        if (!res || res.status !== statusFilter) {
                          isDimmed = true;
                        }
                      }

                      if (searchQuery.trim()) {
                        const q = searchQuery.trim().toLowerCase();
                        if (res) {
                          const match =
                            res.customerName.toLowerCase().includes(q) ||
                            res.phone.includes(q) ||
                            res.code.toLowerCase().includes(q) ||
                            t.table.code.toLowerCase().includes(q);
                          if (match) isSearchMatch = true;
                          else isDimmed = true;
                        } else {
                          isDimmed = true;
                        }
                      }

                      // Phong cách hiển thị màu theo trạng thái quản trị
                      let stateStyle = "";
                      let textStyle = "text-[#6b2b06]";

                      if (state === "EMPTY") {
                        stateStyle =
                          "bg-white/95 text-stone-900 border-2 border-dashed border-stone-500 hover:border-[#b45309] hover:bg-[#fdf0d5] shadow-xs";
                        textStyle = "text-stone-900 font-bold";
                      } else if (state === "BOOKED") {
                        stateStyle =
                          "bg-[#b45309] text-white border-2 border-amber-300 shadow-md shadow-[#b45309]/50 hover:brightness-105";
                        textStyle = "text-white font-bold";
                      } else if (state === "SEATED") {
                        stateStyle =
                          "bg-emerald-700 text-white border-2 border-emerald-300 shadow-md shadow-emerald-950/30 hover:brightness-105";
                        textStyle = "text-white font-bold";
                      } else if (state === "NO_SHOW") {
                        stateStyle =
                          "bg-rose-700 text-white border-2 border-rose-300 shadow-md shadow-rose-950/30 hover:brightness-105";
                        textStyle = "text-white font-bold";
                      }

                      return (
                        <button
                          key={t.table.id}
                          type="button"
                          onClick={() => setSelectedTable(t)}
                          style={{
                            left: `${coord.x}%`,
                            top: `${coord.y}%`,
                            width: `${coord.w}%`,
                            height: `${coord.h}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                          title={`Bàn ${t.table.code} — ${STATE_STYLES[state].label}${res ? ` · ${res.customerName}` : ""}`}
                          aria-label={`Bàn ${t.table.code}, ${STATE_STYLES[state].label}`}
                          className={cn(
                            "group absolute flex flex-col items-center justify-center font-heading transition-all overflow-hidden cursor-pointer",
                            coord.shape === "circle" ? "rounded-full" : "rounded-md",
                            stateStyle,
                            isSelected && "ring-4 ring-[#f59e0b] shadow-2xl scale-110 z-30 animate-pulse",
                            isDimmed && "opacity-25 grayscale hover:opacity-100 hover:grayscale-0",
                            isSearchMatch && "ring-4 ring-amber-400 shadow-xl scale-110 z-30 animate-bounce"
                          )}
                        >
                          <span className={cn("text-xs sm:text-sm md:text-base font-extrabold leading-none tracking-tight select-none", textStyle)}>
                            {t.table.code}
                          </span>
                          {res && (
                            <span className="max-w-[85%] truncate text-[8px] sm:text-[9px] font-semibold leading-none opacity-95 mt-0.5">
                              {res.customerName.split(" ").slice(-1)[0]}
                            </span>
                          )}
                          {state === "SEATED" && (
                            <span className="mt-0.5 rounded bg-emerald-950/80 px-1 py-0.2 text-[8px] font-bold text-emerald-200 leading-none">
                              {(() => {
                                try {
                                  if (res?.selectedDishes?.startsWith("{")) {
                                    const parsed = JSON.parse(res.selectedDishes);
                                    return `${parsed.served?.length || 0}/7 món`;
                                  }
                                } catch {}
                                return "0/7 món";
                              })()}
                            </span>
                          )}
                          {state === "COMPLETED" && (
                            <span className="mt-0.5 rounded bg-sky-900/80 px-1 py-0.2 text-[8px] font-bold text-sky-200 leading-none">
                              Hoàn tất
                            </span>
                          )}
                        </button>
                      );
                    })
                ) : null}
              </div>
            </div>

            {/* Chú giải trạng thái chuẩn nhà hàng cao cấp */}
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-y-2 rounded-2xl border border-border/80 bg-[#fffdf9]/90 px-4 py-3 text-xs shadow-xs">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                  <span className="h-3 w-3 rounded border border-dashed border-stone-400 bg-white" />
                  Trống (Walk-in/Waitlist)
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[#92400e]">
                  <span className="h-3 w-3 rounded border border-amber-300 bg-[#b45309]" />
                  Đã đặt
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                  <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-700" />
                  Đã đến (Check-in)
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-800">
                  <span className="h-3 w-3 rounded border border-rose-300 bg-rose-700" />
                  Không đến (No-show)
                </span>
              </div>
              {searchQuery && (
                <span className="text-[11px] text-[#b45309] font-medium">
                  ✦ Bàn viền nổi bật: Khớp từ khóa tìm kiếm
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== PHẦN 2: LỌC CHỌN NGÀY PHỤC VỤ (NẰM DƯỚI BẢN ĐỒ) ==================== */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-700">Chọn ngày phục vụ:</span>
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1 shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-[#b45309]" />
                <Input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (v < today) {
                      toast.error("Không thể chọn ngày trong quá khứ (chương trình đã chạy).");
                      return;
                    }
                    setDate(v);
                  }}
                  className="h-6 w-34 border-0 p-0 text-xs font-mono font-medium focus-visible:ring-0"
                  title="Chọn ngày phục vụ (từ hôm nay trở đi)"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDate(today)}
                className="h-6 px-2 text-[11px] font-semibold text-[#b45309] hover:bg-amber-100"
              >
                Hôm nay
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-[#92400e]">
                <CalendarCheck className="mr-1 inline h-4 w-4" aria-hidden />
                {formatLongDate(date)}
              </p>
              {selectedDateCheck.allowed ? (
                <Badge className="bg-emerald-600/90 text-white hover:bg-emerald-600 text-[11px] font-normal">
                  ✓ Đang mở chương trình
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[11px] font-normal">
                  ✕ {selectedDateCheck.message || "Ngày không nhận khách"}
                </Badge>
              )}
            </div>
          </div>
          <DayStrip today={today} selected={date} onSelect={setDate} settings={bookingSettings} numWeeks={5} />
        </CardContent>
      </Card>

      {/* 4 THẺ BỘ LỌC TRẠNG THÁI BÀN: BÀN TRỐNG, ĐÃ ĐẶT, ĐÃ ĐẾN, KHÔNG ĐẾN (NẰM DƯỚI SƠ ĐỒ) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* 1. Bàn trống */}
        <div
          onClick={() => setStatusFilter("ALL")}
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all cursor-pointer",
            statusFilter === "ALL" || statusFilter === "CANCELLED"
              ? "border-stone-300 bg-white hover:border-[#b45309]/50 shadow-sm"
              : "border-stone-200 bg-stone-50/60 opacity-60"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">Bàn trống</span>
            <span className="h-3 w-3 rounded-full border border-dashed border-stone-500 bg-stone-100" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-heading text-3xl font-bold text-stone-900">{summaryCounts.empty}</span>
            <span className="text-xs text-muted-foreground">/ {summaryCounts.totalCapacity} {summaryCounts.unitLabel}</span>
          </div>
          <span className="mt-1 text-[11px] text-muted-foreground">
            {slotFilter === "ALL" ? "Khả dụng cả ngày (2 ca)" : `Khả dụng (${slotFilter === "SLOT_1730" ? "17:30" : "19:45"})`}
          </span>
        </div>

        {/* 2. Đã đặt */}
        <div
          onClick={() => setStatusFilter("CONFIRMED")}
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all cursor-pointer",
            statusFilter === "ALL" || statusFilter === "CONFIRMED" || statusFilter === "PENDING"
              ? "border-[#b45309]/40 bg-[#fdf0d5]/60 hover:border-[#b45309] shadow-sm"
              : "border-stone-200 bg-stone-50/60 opacity-60"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#92400e]">Đã đặt</span>
            <span className="h-3 w-3 rounded-full bg-[#b45309]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-heading text-3xl font-bold text-[#b45309]">{summaryCounts.booked}</span>
            <span className="text-xs text-[#92400e]/70">/ {summaryCounts.totalCapacity} {summaryCounts.unitLabel}</span>
          </div>
          <span className="mt-1 text-[11px] text-[#92400e]/80">Đã cọc &amp; giữ chỗ</span>
        </div>

        {/* 3. Đã đến */}
        <div
          onClick={() => setStatusFilter("SEATED")}
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all cursor-pointer",
            statusFilter === "ALL" || statusFilter === "SEATED"
              ? "border-emerald-300 bg-emerald-50/70 hover:border-emerald-500 shadow-sm"
              : "border-stone-200 bg-stone-50/60 opacity-60"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Đã đến (Check-in)</span>
            <span className="h-3 w-3 rounded-full bg-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-heading text-3xl font-bold text-emerald-900">{summaryCounts.seated}</span>
            <span className="text-xs text-emerald-700/70">/ {summaryCounts.totalCapacity} {summaryCounts.unitLabel}</span>
          </div>
          <span className="mt-1 text-[11px] text-emerald-700/80">Đang phục vụ tại bàn</span>
        </div>

        {/* 4. Không đến */}
        <div
          onClick={() => setStatusFilter("NO_SHOW")}
          className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all cursor-pointer",
            statusFilter === "ALL" || statusFilter === "NO_SHOW"
              ? "border-rose-300 bg-rose-50/70 hover:border-rose-500 shadow-sm"
              : "border-stone-200 bg-stone-50/60 opacity-60"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Không đến (No-show)</span>
            <span className="h-3 w-3 rounded-full bg-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-heading text-3xl font-bold text-rose-900">{summaryCounts.noShow}</span>
            <span className="text-xs text-rose-700/70">/ {summaryCounts.totalCapacity} {summaryCounts.unitLabel}</span>
          </div>
          <span className="mt-1 text-[11px] text-rose-700/80">Khách vắng mặt</span>
        </div>
      </div>

      {/* ==================== PHẦN 2: DANH SÁCH ĐẶT BÀN (NẰM Ở DƯỚI) ==================== */}
      <Card className="border-border/80 bg-card shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-[#fffdf9]/70 py-4 px-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-[#292524] sm:text-lg">
                <ClipboardList className="h-5 w-5 text-[#b45309]" />
                Danh sách khách hàng đặt bàn
              </CardTitle>
              <CardDescription className="text-xs">
                Hiển thị theo ngày {formatLongDate(date)} và bộ lọc hiện tại.
              </CardDescription>
            </div>

            {/* Khung chọn ngày trực tiếp ở danh sách đặt bàn & Nút Đặt bàn mới */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-amber-300/80 bg-amber-50/80 px-3 py-1.5 shadow-2xs">
                <Calendar className="h-4 w-4 text-[#b45309]" />
                <label htmlFor="list-date-input" className="text-xs font-semibold text-stone-800 whitespace-nowrap">
                  Khung ngày:
                </label>
                <Input
                  id="list-date-input"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (v < today) {
                      toast.error("Không thể chọn ngày trong quá khứ (chương trình đã chạy).");
                      return;
                    }
                    setDate(v);
                  }}
                  className="h-7 w-34 rounded-md border-border/80 bg-white px-2 text-xs font-mono font-medium shadow-2xs"
                  title="Chọn ngày lọc danh sách (từ hôm nay trở đi)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDate(today)}
                  className="h-7 px-2 text-[11px] font-semibold text-[#b45309] hover:bg-amber-100"
                >
                  Hôm nay
                </Button>
              </div>

              <Button
                type="button"
                onClick={() => openCreateModal()}
                className="h-8.5 gap-1.5 rounded-xl bg-[#b45309] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#92400e]"
              >
                <PlusCircle className="h-4 w-4" />
                Đặt bàn mới
              </Button>
            </div>

            {/* Thống kê nhanh */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="border-border bg-white px-2.5 py-1">
                Tổng: <span className="ml-1 font-bold text-stone-800">{stats.totalCount}</span> lượt
              </Badge>
              <Badge variant="outline" className="border-border bg-white px-2.5 py-1">
                Công suất: <span className="ml-1 font-bold text-[#b45309]">{stats.totalSeats}</span> / 84 chỗ
              </Badge>
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 px-2.5 py-1">
                Đã đến: <span className="ml-1 font-bold">{stats.seatedCount}</span>
              </Badge>
              <Badge variant="outline" className="border-border bg-white px-2.5 py-1">
                Khớp lọc: <span className="ml-1 font-bold text-stone-800">{filteredReservations.length}</span>
              </Badge>
            </div>
          </div>

          <Separator className="bg-border/60" />

          {/* Hàng bộ lọc: Khung giờ, Trạng thái, Tìm kiếm (ĐẶT NGAY TRÊN DANH SÁCH BÀN) */}
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 md:grid-cols-12">
            {/* Lọc Khung giờ */}
            <div className="md:col-span-4">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Khung giờ phục vụ
              </label>
              <div className="inline-flex h-10 w-full rounded-xl border border-border bg-muted/60 p-1">
                <button
                  type="button"
                  onClick={() => setSlotFilter("ALL")}
                  className={cn(
                    "flex-1 rounded-lg text-xs font-medium transition-all",
                    slotFilter === "ALL"
                      ? "bg-[#b45309] text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-[#92400e]"
                  )}
                >
                  Cả hai khung
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSlotFilter("SLOT_1730");
                    setMapSlot("SLOT_1730");
                  }}
                  className={cn(
                    "flex-1 rounded-lg text-xs font-medium transition-all",
                    slotFilter === "SLOT_1730"
                      ? "bg-[#b45309] text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-[#92400e]"
                  )}
                >
                  17:30 (Ca 1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSlotFilter("SLOT_1945");
                    setMapSlot("SLOT_1945");
                  }}
                  className={cn(
                    "flex-1 rounded-lg text-xs font-medium transition-all",
                    slotFilter === "SLOT_1945"
                      ? "bg-[#b45309] text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-[#92400e]"
                  )}
                >
                  19:45 (Ca 2)
                </button>
              </div>
            </div>

            {/* Lọc Trạng thái */}
            <div className="md:col-span-4">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Trạng thái đơn
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-xl bg-card text-xs">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Tất cả trạng thái
                  </SelectItem>
                  {STATUS_OPTIONS.slice(1).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tìm kiếm */}
            <div className="md:col-span-4">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tìm kiếm đặt bàn
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tên khách, SĐT, mã TRM-..."
                  className="h-10 pl-8 pr-8 text-xs rounded-xl"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-stone-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingList && !listData ? (
            <div className="p-8">
              <LoadingBlock label="Đang tải danh sách đặt bàn..." />
            </div>
          ) : listError ? (
            <div className="p-8">
              <ErrorBlock message={listError} onRetry={refreshList} />
            </div>
          ) : (
            <div className="tram-scroll overflow-x-auto">
              <Table className="min-w-[1050px]">
                <TableHeader>
                  <TableRow className="bg-[#f5efe4] hover:bg-[#f5efe4]">
                    <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Mã
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Ngày &amp; Giờ đặt
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Khung
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Khách hàng
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      SĐT
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Khách
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Bàn
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Pairing
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      Nguồn
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600 whitespace-nowrap min-w-[120px]">
                      Trạng thái
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600 min-w-[200px] max-w-[280px]">
                      Ghi chú
                    </TableHead>
                    <TableHead className="pr-4 text-xs font-semibold uppercase tracking-wider text-stone-600 text-right whitespace-nowrap min-w-[180px]">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-12 text-center text-sm text-muted-foreground">
                        Không có đơn đặt bàn nào khớp với bộ lọc đã chọn.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReservations.map((r) => (
                      <TableRow
                        key={r.id}
                        onClick={() => setDetailReservation(r)}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="pl-4 font-mono text-xs font-semibold text-[#b45309]">
                          {r.code}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-stone-700 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-stone-900">{formatShortDate(r.date)}</span>
                              <span className="rounded bg-amber-100/90 px-1.5 py-0.5 text-[11px] font-bold text-[#b45309]">
                                {r.slot === "SLOT_1730" ? "17:30" : "19:45"}
                              </span>
                            </div>
                            {r.createdAt && (
                              <span className="text-[10px] text-muted-foreground">
                                Đặt lúc: {formatTimeOnly(r.createdAt)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {SLOT_LABELS[r.slot]}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-[#292524]">
                          {r.customerName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.phone}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.partySize} khách
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-stone-800">
                          {r.table.code}
                        </TableCell>
                        <TableCell className="text-xs">
                          {PAIRING_LABELS[r.pairing]}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {SOURCE_LABELS[r.source]}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={r.status} className="min-w-[96px] justify-center text-center" />
                            {r.survey && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                {r.survey.rating}/5 ⭐
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5 min-w-[180px] max-w-[280px]">
                            {r.allergy && <AllergyBadge allergy={r.allergy} />}
                            {r.notes ? (
                              <span className="truncate text-xs text-muted-foreground" title={r.notes}>
                                {r.notes}
                              </span>
                            ) : (
                              !r.allergy && <span className="text-stone-300 text-xs">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pr-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(r.status === "CONFIRMED" || r.status === "PENDING") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 rounded-full border-emerald-600/40 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleCheckin(r.id);
                                }}
                                disabled={acting}
                                title="Check-in khách đến"
                              >
                                <LogIn className="h-3 w-3" />
                                Check-in
                              </Button>
                            )}

                            {/* Nút Sửa đặt bàn */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-amber-700 hover:bg-amber-100/70"
                              aria-label={`Sửa đặt bàn ${r.code}`}
                              title="Sửa thông tin đặt bàn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(r);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            {/* Nút Xóa mềm / Khôi phục */}
                            {r.status === "CANCELLED" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-emerald-700 hover:bg-emerald-100/70"
                                aria-label={`Khôi phục đặt bàn ${r.code}`}
                                title="Khôi phục đặt bàn đã hủy"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleRestore(r.id);
                                }}
                                disabled={acting}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-100/70 hover:text-rose-700"
                                aria-label={`Xóa mềm đặt bàn ${r.code}`}
                                title="Xóa mềm đặt bàn (Hủy bàn)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSoftDeleteTarget(r);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {/* Nút Chi tiết */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-[#b45309] hover:bg-[#fdf0d5]"
                              aria-label={`Xem chi tiết đặt bàn ${r.code}`}
                              title="Xem chi tiết"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailReservation(r);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== DIALOG CHI TIẾT BÀN TRÊN SƠ ĐỒ ==================== */}
      <Dialog
        open={selectedTable !== null}
        onOpenChange={(v) => !v && setSelectedTable(null)}
      >
        <DialogContent className="max-w-md border-border bg-card">
          {selectedTable && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 font-heading text-xl text-[#292524]">
                  Bàn {selectedTable.table.code}
                  <span className="text-sm font-normal text-muted-foreground">
                    {selectedTable.table.zone}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {formatLongDate(date)} · {activeTableSlot === "SLOT_1730" ? "17:30" : "19:45"}
                </DialogDescription>
              </DialogHeader>

              {selectedReservation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-[#292524]">
                        {selectedReservation.customerName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedReservation.phone} · {selectedReservation.partySize} khách
                      </p>
                    </div>
                    <StatusBadge status={selectedReservation.status} />
                  </div>
                  <Separator className="bg-border" />
                  <div className="space-y-1.5 text-sm">
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Mã đặt bàn</span>
                      <span className="font-medium text-[#292524]">
                        {selectedReservation.code}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Pairing</span>
                      <span className="text-[#292524]">
                        {PAIRING_LABELS[selectedReservation.pairing]}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Đặt cọc</span>
                      <span className="text-[#292524] font-medium">
                        {selectedReservation.depositAmount === 0 ? (
                          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            0 đ (Miễn cọc Nam Trầm)
                          </span>
                        ) : (
                          formatVND(selectedReservation.depositAmount)
                        )}
                      </span>
                    </p>
                    {selectedReservation.notes && (
                      <p className="flex justify-between gap-2">
                        <span className="shrink-0 text-muted-foreground">Ghi chú</span>
                        <span className="max-w-[60%] text-right text-[#292524]">
                          {selectedReservation.notes}
                        </span>
                      </p>
                    )}
                    {selectedReservation.allergy && (
                      <p className="rounded-md border border-[#b3261e]/40 bg-[#b3261e]/10 px-2 py-1 text-xs font-medium text-[#b3261e]">
                        Dị ứng: {selectedReservation.allergy}
                      </p>
                    )}
                    {/* Ngày giờ check-in nếu đã đến */}
                    {selectedReservation.status === "SEATED" && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-xs text-emerald-900 font-medium">
                        <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Đã Check-in vào bàn lúc: <strong>{formatCheckinTime(selectedReservation)}</strong></span>
                      </div>
                    )}

                    {/* Thực đơn 7 món Tasting Menu */}
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-2.5 text-xs space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#92400e] flex items-center gap-1.5 uppercase text-[10px] tracking-wide">
                          <UtensilsCrossed className="h-3.5 w-3.5 text-[#b45309]" />
                          Thực đơn Tasting Menu (7 món)
                        </span>
                        <Badge variant="outline" className="text-[10px] border-amber-300 bg-white text-amber-900">
                          {PAIRING_LABELS[selectedReservation.pairing]}
                        </Badge>
                      </div>
                      <div className="grid gap-1">
                        {parseReservationDishes(selectedReservation.selectedDishes).map((dish) => (
                          <div key={dish.index} className="flex items-center justify-between gap-1.5 rounded-md bg-white/90 px-2 py-1 border border-stone-200/60">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#b45309] text-[9px] font-bold text-white">
                                {dish.index}
                              </span>
                              <span className="font-medium text-stone-900 text-[11px] truncate">
                                {dish.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-500 shrink-0 italic">
                              {dish.optionName || dish.region}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {(selectedReservation.status === "CONFIRMED" ||
                    selectedReservation.status === "PENDING") && (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          onClick={() => void handleCheckin(selectedReservation.id)}
                          disabled={acting}
                          className="h-11 flex-1 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 font-bold"
                        >
                          <LogIn className="mr-1.5 h-4 w-4" aria-hidden />
                          Khách đã đến &amp; Check-in
                        </Button>
                        <Button
                          onClick={() => setConfirmNoShow(true)}
                          disabled={acting}
                          variant="outline"
                          className="h-11 flex-1 rounded-full border-[#b3261e]/50 text-[#b3261e] hover:bg-[#b3261e]/10 hover:text-[#b3261e]"
                        >
                          <UserX className="mr-1.5 h-4 w-4" aria-hidden />
                          Đánh dấu không đến
                        </Button>
                      </div>

                      <TableCourseTracker
                        reservation={selectedReservation}
                        acting={acting}
                        setActing={setActing}
                        onUpdate={(updated) => {
                          setSelectedTable((prev) => prev ? { ...prev, reservation: updated } : null);
                          refreshTables();
                          refreshList();
                        }}
                        onCheckin={() => void handleCheckin(selectedReservation.id)}
                      />
                    </div>
                  )}

                  {selectedReservation.status === "SEATED" && (
                    <div className="pt-2">
                      <TableCourseTracker
                        reservation={selectedReservation}
                        acting={acting}
                        setActing={setActing}
                        onUpdate={(updated) => {
                          setSelectedTable((prev) => prev ? { ...prev, reservation: updated } : null);
                          refreshTables();
                          refreshList();
                        }}
                        onCheckoutSuccess={() => {
                          setSelectedTable(null);
                        }}
                      />
                    </div>
                  )}

                  {selectedReservation.status === "COMPLETED" && (
                    <div className="rounded-2xl border border-sky-300 bg-sky-50/80 p-3.5 space-y-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sky-900 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4 text-sky-600" />
                        Bàn đã Check-out &amp; Hoàn tất bữa ăn
                      </div>
                      <p className="text-[11px] text-sky-800">
                        Đã đối soát trọn bộ 7 món tasting. Bàn sẵn sàng đón lượt khách tiếp theo!
                      </p>
                      <Button
                        onClick={() => {
                          const res = selectedReservation;
                          setSelectedTable(null);
                          setSurveyTarget(res);
                        }}
                        className="w-full h-10 rounded-full border border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:from-amber-600 hover:to-amber-700 shadow-xs text-xs"
                      >
                        <Star className="mr-1.5 h-3.5 w-3.5 fill-white text-white" />
                        {selectedReservation.survey
                          ? `Đã đánh giá: ${selectedReservation.survey.rating}/5 ⭐`
                          : "Khảo sát trải nghiệm sau bữa ăn"}
                      </Button>
                    </div>
                  )}

                  {/* Nút Sửa & Xóa mềm cho đặt bàn trên sơ đồ */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const res = selectedReservation;
                        setSelectedTable(null);
                        openEditModal(res);
                      }}
                      className="flex-1 h-9 gap-1.5 rounded-xl border-amber-300 bg-amber-50/70 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa đặt bàn
                    </Button>
                    {selectedReservation.status === "CANCELLED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const id = selectedReservation.id;
                          setSelectedTable(null);
                          void handleRestore(id);
                        }}
                        disabled={acting}
                        className="flex-1 h-9 gap-1.5 rounded-xl border-emerald-300 bg-emerald-50/70 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Khôi phục
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const res = selectedReservation;
                          setSelectedTable(null);
                          setSoftDeleteTarget(res);
                        }}
                        className="flex-1 h-9 gap-1.5 rounded-xl border-rose-300 bg-rose-50/70 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa mềm (Hủy)
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-3 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h4 className="font-heading text-base font-bold text-stone-800">
                      Bàn {selectedTable.table.code} đang trống
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Khung giờ {activeTableSlot === "SLOT_1730" ? "17:30" : "19:45"} · {selectedTable.table.zone}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const code = selectedTable.table.code;
                      setSelectedTable(null);
                      openCreateModal(code);
                    }}
                    className="w-full h-10 rounded-full bg-[#b45309] text-white hover:bg-[#92400e] font-semibold gap-2 shadow-xs"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Đặt bàn {selectedTable.table.code} ngay
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG XEM CHI TIẾT ĐẶT BÀN ==================== */}
      <Dialog
        open={detailReservation !== null}
        onOpenChange={(v) => !v && setDetailReservation(null)}
      >
        <DialogContent className="max-w-md border-border bg-card">
          {detailReservation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading text-xl text-[#292524]">
                  Đặt bàn {detailReservation.code}
                </DialogTitle>
                <DialogDescription>
                  {formatLongDate(detailReservation.date)} · khung{" "}
                  {SLOT_LABELS[detailReservation.slot]} · bàn {detailReservation.table.code}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 text-sm">
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Khách hàng</span>
                  <span className="font-medium text-[#292524]">
                    {detailReservation.customerName}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Liên hệ</span>
                  <span className="text-[#292524]">
                    {detailReservation.phone}
                    {detailReservation.email ? ` · ${detailReservation.email}` : ""}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Số khách</span>
                  <span className="text-[#292524]">{detailReservation.partySize} khách</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Bàn</span>
                  <span className="text-[#292524]">
                    {detailReservation.table.code} · {detailReservation.table.seats} chỗ ·{" "}
                    {detailReservation.table.zone}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Pairing</span>
                  <span className="text-[#292524]">
                    {PAIRING_LABELS[detailReservation.pairing]}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Nguồn</span>
                  <span className="text-[#292524]">
                    {SOURCE_LABELS[detailReservation.source]}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Đặt cọc</span>
                  <span className="text-[#292524] font-medium">
                    {detailReservation.depositAmount === 0 ? (
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        0 đ (Miễn cọc Nam Trầm)
                      </span>
                    ) : (
                      formatVND(detailReservation.depositAmount)
                    )}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <StatusBadge status={detailReservation.status} />
                </p>

                {/* Ngày giờ check-in nếu đã đến */}
                {detailReservation.status === "SEATED" && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-xs text-emerald-900 font-medium">
                    <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Đã Check-in vào bàn lúc: <strong>{formatCheckinTime(detailReservation)}</strong></span>
                  </div>
                )}

                <Separator className="my-2 bg-border" />
                {detailReservation.allergy && (
                  <p className="pb-1">
                    <AllergyBadge allergy={detailReservation.allergy} />
                  </p>
                )}
                {detailReservation.notes && (
                  <p className="whitespace-pre-wrap rounded-md bg-muted/60 p-2.5 text-xs leading-relaxed text-stone-600">
                    {detailReservation.notes}
                  </p>
                )}

                {/* Thực đơn 7 món Tasting Menu */}
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-2.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#92400e] flex items-center gap-1.5 uppercase text-[10px] tracking-wide">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-[#b45309]" />
                      Thực đơn bữa tiệc (7 món Tasting Menu)
                    </span>
                    <Badge variant="outline" className="text-[10px] border-amber-300 bg-white text-amber-900">
                      {PAIRING_LABELS[detailReservation.pairing]}
                    </Badge>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {parseReservationDishes(detailReservation.selectedDishes).map((dish) => (
                      <div key={dish.index} className="flex items-center justify-between gap-1.5 rounded-md bg-white/90 px-2 py-1 border border-stone-200/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#b45309] text-[9px] font-bold text-white">
                            {dish.index}
                          </span>
                          <span className="font-medium text-stone-900 text-[11px] truncate">
                            {dish.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 shrink-0 italic">
                          {dish.optionName || dish.region}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="pt-1 text-[11px] text-muted-foreground">
                  Tạo lúc {new Date(detailReservation.createdAt).toLocaleString("vi-VN")} ·{" "}
                  Ngày đến: {relativeDayLabel(detailReservation.date, today)}
                </p>

                {(detailReservation.status === "CONFIRMED" ||
                  detailReservation.status === "PENDING") && (
                  <div className="space-y-3 mt-3">
                    <Button
                      onClick={() => void handleCheckin(detailReservation.id)}
                      disabled={acting}
                      className="w-full h-11 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 font-semibold shadow-xs"
                    >
                      <LogIn className="mr-1.5 h-4 w-4" />
                      Khách đã đến &amp; Check-in
                    </Button>

                    <TableCourseTracker
                      reservation={detailReservation}
                      acting={acting}
                      setActing={setActing}
                      onUpdate={(updated) => {
                        setDetailReservation(updated);
                        refreshTables();
                        refreshList();
                      }}
                      onCheckin={() => void handleCheckin(detailReservation.id)}
                    />
                  </div>
                )}

                {detailReservation.status === "SEATED" && (
                  <div className="pt-2">
                    <TableCourseTracker
                      reservation={detailReservation}
                      acting={acting}
                      setActing={setActing}
                      onUpdate={(updated) => {
                        setDetailReservation(updated);
                        refreshTables();
                        refreshList();
                      }}
                      onCheckoutSuccess={() => {
                        setDetailReservation(null);
                      }}
                    />
                  </div>
                )}

                {detailReservation.status === "COMPLETED" && (
                  <div className="rounded-2xl border border-sky-300 bg-sky-50/80 p-3.5 space-y-2.5 text-center mt-3">
                    <div className="flex items-center justify-center gap-1.5 text-sky-900 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-sky-600" />
                      Bàn đã Check-out &amp; Hoàn tất bữa ăn
                    </div>
                    <p className="text-[11px] text-sky-800">
                      Đã đối soát trọn bộ 7 món tasting. Bàn sẵn sàng đón lượt khách tiếp theo!
                    </p>
                    <Button
                      onClick={() => {
                        const res = detailReservation;
                        setDetailReservation(null);
                        setSurveyTarget(res);
                      }}
                      className="w-full h-10 rounded-full border border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:from-amber-600 hover:to-amber-700 shadow-xs text-xs"
                    >
                      <Star className="mr-1.5 h-3.5 w-3.5 fill-white text-white" />
                      {detailReservation.survey
                        ? `Đã đánh giá: ${detailReservation.survey.rating}/5 ⭐`
                        : "Khảo sát trải nghiệm sau bữa ăn"}
                    </Button>
                  </div>
                )}

                {/* Nút Sửa & Xóa mềm trong dialog chi tiết */}
                <div className="flex items-center gap-2 pt-3 border-t border-border mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const res = detailReservation;
                      setDetailReservation(null);
                      openEditModal(res);
                    }}
                    className="flex-1 h-9 gap-1.5 rounded-xl border-amber-300 bg-amber-50/70 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Sửa đặt bàn
                  </Button>
                  {detailReservation.status === "CANCELLED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const id = detailReservation.id;
                        setDetailReservation(null);
                        void handleRestore(id);
                      }}
                      disabled={acting}
                      className="flex-1 h-9 gap-1.5 rounded-xl border-emerald-300 bg-emerald-50/70 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Khôi phục
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const res = detailReservation;
                        setDetailReservation(null);
                        setSoftDeleteTarget(res);
                      }}
                      className="flex-1 h-9 gap-1.5 rounded-xl border-rose-300 bg-rose-50/70 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa mềm (Hủy)
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG TẠO ĐẶT BÀN MỚI (ADMIN CREATE) ==================== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-xl text-[#292524]">
              <PlusCircle className="h-5 w-5 text-[#b45309]" />
              Đặt bàn mới (Quản trị viên)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tạo đơn đặt bàn trực tiếp cho khách qua điện thoại, Zalo hoặc khách vãng lai.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReservation} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Ngày phục vụ</label>
                <Input
                  type="date"
                  min={today}
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Khung giờ</label>
                <Select value={createSlot} onValueChange={(v) => setCreateSlot(v as Slot)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SLOT_1730">17:30 (Ca 1)</SelectItem>
                    <SelectItem value="SLOT_1945">19:45 (Ca 2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Chọn bàn ăn</label>
                <Select value={createTableCode} onValueChange={setCreateTableCode}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue placeholder="Chọn bàn..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_TABLE_DEFS.map((tbl) => (
                      <SelectItem key={tbl.code} value={tbl.code}>
                        Bàn {tbl.code} ({tbl.seats} chỗ · {tbl.zone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Số lượng khách</label>
                <Select value={String(createPartySize)} onValueChange={(v) => setCreatePartySize(Number(v))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} khách
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Họ tên khách hàng *</label>
                <Input
                  placeholder="vd: Nguyễn Văn A"
                  value={createCustomerName}
                  onChange={(e) => setCreateCustomerName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Số điện thoại *</label>
                <Input
                  placeholder="0912345678"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Nguồn đặt bàn</label>
                <Select value={createSource} onValueChange={(v) => setCreateSource(v as "PHONE" | "ZALO" | "WEB")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE">Điện thoại (Hotline)</SelectItem>
                    <SelectItem value="ZALO">Zalo OA</SelectItem>
                    <SelectItem value="WEB">Khách trực tiếp / Web</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Pairing thức uống</label>
                <Select value={createPairing} onValueChange={(v) => setCreatePairing(v as Pairing)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Không chọn (+0 đ)</SelectItem>
                    <SelectItem value="WINE">Wine Pairing (+650.000 đ)</SelectItem>
                    <SelectItem value="TEA">Tea Pairing (+350.000 đ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Dị ứng thực phẩm (nếu có)</label>
              <Input
                placeholder="vd: Không ăn được tôm cua, dị ứng đậu phộng..."
                value={createAllergy}
                onChange={(e) => setCreateAllergy(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Ghi chú phục vụ</label>
              <Textarea
                placeholder="vd: Kỷ niệm ngày cưới, cần chuẩn bị nến và hoa..."
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
                className="h-9 text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="h-9 gap-1.5 bg-[#b45309] text-xs font-semibold text-white hover:bg-[#92400e]"
              >
                {creating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                Xác nhận đặt bàn
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG SỬA ĐẶT BÀN (ADMIN EDIT) ==================== */}
      <Dialog open={editReservation !== null} onOpenChange={(v) => !v && setEditReservation(null)}>
        <DialogContent className="max-w-lg border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-xl text-[#292524]">
              <Pencil className="h-5 w-5 text-amber-600" />
              Sửa đặt bàn: {editReservation?.code}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thay đổi bàn ăn, khung giờ, thông tin khách hàng hoặc trạng thái đơn đặt.
            </DialogDescription>
          </DialogHeader>

          {editReservation && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Đổi bàn ăn</label>
                  <Select value={editTableCode} onValueChange={setEditTableCode}>
                    <SelectTrigger className="h-9 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_TABLE_DEFS.map((tbl) => (
                        <SelectItem key={tbl.code} value={tbl.code}>
                          Bàn {tbl.code} ({tbl.seats} chỗ · {tbl.zone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Khung giờ</label>
                  <Select value={editSlot} onValueChange={(v) => setEditSlot(v as Slot)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SLOT_1730">17:30 (Ca 1)</SelectItem>
                      <SelectItem value="SLOT_1945">19:45 (Ca 2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Họ tên khách</label>
                  <Input
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Số điện thoại</label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Số khách</label>
                  <Select value={String(editPartySize)} onValueChange={(v) => setEditPartySize(Number(v))}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} khách
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Trạng thái</label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ReservationStatus)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                      <SelectItem value="PENDING">Chờ cọc</SelectItem>
                      <SelectItem value="SEATED">Đã đến (Check-in)</SelectItem>
                      <SelectItem value="NO_SHOW">Không đến</SelectItem>
                      <SelectItem value="CANCELLED">Đã hủy (Xóa mềm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Pairing</label>
                  <Select value={editPairing} onValueChange={(v) => setEditPairing(v as Pairing)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Không chọn (+0 đ)</SelectItem>
                      <SelectItem value="WINE">Wine Pairing (+650.000 đ)</SelectItem>
                      <SelectItem value="TEA">Tea Pairing (+350.000 đ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Dị ứng</label>
                  <Input
                    value={editAllergy}
                    onChange={(e) => setEditAllergy(e.target.value)}
                    placeholder="Không có"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Ghi chú</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditReservation(null)}
                  disabled={savingEdit}
                  className="h-9 text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="h-9 gap-1.5 bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  {savingEdit ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== ALERT DIALOG XÓA MỀM (SOFT-DELETE) ==================== */}
      <AlertDialog
        open={softDeleteTarget !== null}
        onOpenChange={(v) => !v && setSoftDeleteTarget(null)}
      >
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-700 font-heading">
              <Trash2 className="h-5 w-5" />
              Xác nhận xóa mềm đặt bàn?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600 text-xs leading-relaxed">
              Bạn có chắc chắn muốn xóa (xóa mềm) lượt đặt bàn{" "}
              <strong className="text-stone-900 font-mono">{softDeleteTarget?.code}</strong> của khách hàng{" "}
              <strong className="text-stone-900">{softDeleteTarget?.customerName}</strong> tại bàn{" "}
              <strong className="text-stone-900">{softDeleteTarget?.table.code}</strong>?
              <br /><br />
              <span className="text-emerald-700 font-medium">
                ✦ Bàn {softDeleteTarget?.table.code} sẽ được giải phóng ngay lập tức để nhận khách khác.
              </span>
              <br />
              ✦ Trạng thái đơn được chuyển sang <strong>ĐÃ HỦY (CANCELLED)</strong> để bảo toàn số liệu lịch sử &amp; báo cáo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting} className="text-xs">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmSoftDelete()}
              disabled={acting}
              className="bg-rose-700 text-white hover:bg-rose-800 text-xs"
            >
              {acting ? "Đang xử lý..." : "Xác nhận xóa mềm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== XÁC NHẬN NO-SHOW ==================== */}
      <AlertDialog open={confirmNoShow} onOpenChange={setConfirmNoShow}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg text-[#292524]">
              Đánh dấu khách không đến?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              Đặt bàn {selectedReservation?.code} của {selectedReservation?.customerName} sẽ chuyển
              sang trạng thái “Không đến”.{" "}
              <span className="font-medium text-[#b3261e]">
                Cọc sẽ không hoàn lại theo chính sách.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={() => {
                if (selectedReservation) void handleNoShow(selectedReservation.id);
              }}
              className="bg-[#b3261e] text-white hover:bg-[#8f1d18]"
            >
              Xác nhận không đến
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== POPUP THƯỞNG CHECK-IN & KHẢO SÁT ==================== */}
      <CheckinRewardDialog
        reward={rewardData}
        open={rewardData !== null}
        onClose={() => setRewardData(null)}
      />

      <SurveyDialog
        reservation={surveyTarget}
        open={surveyTarget !== null}
        onClose={() => setSurveyTarget(null)}
        onSubmitted={() => {
          setSurveyTarget(null);
          refreshTables();
          refreshList();
        }}
      />
    </div>
  );
}


