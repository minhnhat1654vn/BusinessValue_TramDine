"use client";

// FR-27 — Quản trị Định lượng công thức (BOM) & Kho nguyên liệu kết nối dữ liệu
// Tính năng: Quản lý 7 món Tasting, Quản lý kho nguyên liệu, Preview & Import/Export Excel, CRUD định lượng.
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  TrendingUp,
  Coins,
  Calculator,
  Banknote,
  CalendarDays,
  ArrowDownToLine,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CookingPot,
  Download,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  UtensilsCrossed,
  Warehouse,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { StockInModal } from "./stock-in-modal";
import { CreateConceptModal } from "./create-concept-modal";
import { EditConceptModal } from "./edit-concept-modal";
import { ManageConceptsModal } from "./manage-concepts-modal";
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
import { MENU_ITEMS } from "@/lib/tram/constants";
import {
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  MAX_SCALE_GUESTS,
  formatQty,
  type IngredientGroup,
  type IngredientUnit,
} from "@/lib/tram/recipes";
import type { BomResponse } from "@/lib/tram/recipes-server";
import { toast } from "sonner";
import { formatPercent, formatVND } from "@/lib/tram/format";
import * as XLSX from "xlsx";

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
const COMMON_QTY_PILLS = [5, 10, 15, 20, 30, 40, 50, 60, 80, 120];
const COMMON_PREP_SUGGESTIONS = [
  "Lọ ướp lạnh, mở tại bàn",
  "Nướng giòn muối tiêu",
  "Khía vảy rồng, om chậm",
  "Hấp chín tới thanh nhã",
  "Áp chảo da giòn thịt mọng",
  "Ướp mắc khén, quay giòn",
  "Tách hạt, lồng hạt sen",
  "Rót nóng tại bàn",
];

type ViewMode = "recipes" | "food-cost" | "ingredients";

interface ExcelPreviewRow {
  rowNum: number;
  dishIndex: number;
  dishName: string;
  optionId: string;
  optionName: string;
  isDefault: boolean;
  ingredientId: string;
  ingredientName: string;
  group: string;
  unit: string;
  qtyPerGuest: number;
  prepNote: string;
  price: number;
  status: "VALID" | "ERROR";
  statusMessage: string;
  isNewIngredient: boolean;
}

/** Hiển thị tổng g và ml, bỏ đơn vị bằng 0 */
function formatTotals(totals: Record<IngredientUnit, number> | undefined): string {
  if (!totals) return "—";
  const parts: string[] = [];
  if (totals.g > 0) parts.push(formatQty(totals.g, "g"));
  if (totals.ml > 0) parts.push(formatQty(totals.ml, "ml"));
  return parts.length > 0 ? parts.join(" + ") : "—";
}

function GroupBadge({ group }: { group: IngredientGroup }) {
  const style = GROUP_STYLES[group] ?? {
    badge: "border-stone-200 bg-stone-50 text-stone-700",
    dot: "bg-stone-400",
  };
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap px-2 py-0.5 text-[10.5px] font-medium", style.badge)}
    >
      {INGREDIENT_GROUP_LABELS[group] ?? group}
    </Badge>
  );
}

export function AdminRecipes({
  initialViewMode = "recipes",
  initialOpenConceptModal = false,
  onNavigateTab,
}: {
  initialViewMode?: ViewMode;
  initialOpenConceptModal?: boolean;
  onNavigateTab?: (tab: string) => void;
} = {}) {
  // Chế độ xem: "recipes" (Công thức món), "food-cost" (Phân tích Food Cost), "ingredients" (Kho)
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

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
  const ING_PAGE_SIZE = 20;

  useEffect(() => {
    setIngPage(1);
  }, [ingSearch, ingGroupFilter, ingStockFilter]);

  // Dữ liệu từ API
  const [bomData, setBomData] = useState<BomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal Tạo món ăn mới
  const [createDishOpen, setCreateDishOpen] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [newDishMethod, setNewDishMethod] = useState("");
  const [newDishNote, setNewDishNote] = useState("");
  const [submittingDish, setSubmittingDish] = useState(false);

  // Modal Thêm / Sửa Dòng định lượng
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<{
    id?: string;
    variantId: string;
    ingredientId: string;
    qtyPerGuest: number;
    unit: string;
    prepNote: string;
  } | null>(null);
  const [submittingLine, setSubmittingLine] = useState(false);

  // Modal Nhập hàng vào kho (Goods Receipt)
  // Quản lý Concept Thực đơn đa tuần / đa mùa (Multi-Concept)
  const [concepts, setConcepts] = useState<any[]>([]);
  const [activeConceptId, setActiveConceptId] = useState<string>("concept-2");
  const [selectedConceptId, setSelectedConceptId] = useState<string>("concept-2");
  const [createConceptOpen, setCreateConceptOpen] = useState(initialOpenConceptModal);
  const [editConceptOpen, setEditConceptOpen] = useState(false);
  const [conceptToEdit, setConceptToEdit] = useState<any | null>(null);
  const [manageConceptsOpen, setManageConceptsOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<any | null>(null);
  const [deletingConcept, setDeletingConcept] = useState(false);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  useEffect(() => {
    if (initialOpenConceptModal) {
      setCreateConceptOpen(true);
    }
  }, [initialOpenConceptModal]);
  const [activatingConcept, setActivatingConcept] = useState(false);

  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockInTargetId, setStockInTargetId] = useState<string | undefined>(undefined);

  // Modal Thêm / Sửa Nguyên liệu
  const [ingModalOpen, setIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<{
    id?: string;
    name: string;
    unit: string;
    group: string;
    spec: string;
    defaultImportPrice: number;
    currentStock: number;
    minStock: number;
  }>({
    name: "",
    unit: "g",
    group: "PROTEIN",
    spec: "",
    defaultImportPrice: 100000,
    currentStock: 1000,
    minStock: 200,
  });
  const [submittingIng, setSubmittingIng] = useState(false);

  // Modal Import Excel & Bảng Preview
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ExcelPreviewRow[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const scaled = guests > 1;

  const formatConceptPeriod = (c: any) => {
    if (!c) return "";
    if (c.startDate && c.endDate) {
      const s = c.startDate.split("-").reverse().join("/");
      const e = c.endDate.split("-").reverse().join("/");
      return `${s} - ${e}`;
    }
    if (c.startDate) return `Áp dụng từ ${c.startDate.split("-").reverse().join("/")}`;
    if (c.weekLabel && !c.weekLabel.toLowerCase().includes("tuần tiếp theo")) return c.weekLabel;
    return "Kế hoạch mới";
  };

  // Tải danh sách các Concept thực đơn
  const loadConcepts = useCallback(async () => {
    try {
      const res = await fetch("/api/recipes/concepts");
      if (res.ok) {
        const data = await res.json();
        setConcepts(data.concepts || []);
        if (data.activeId) setActiveConceptId(data.activeId);
      }
    } catch (err) {
      console.error("Error loading concepts:", err);
    }
  }, []);

  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);

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
    loadBom(guests, false, selectedConceptId);
  }, [guests, selectedConceptId, loadBom]);

  const handleConfirmDeleteConcept = async () => {
    if (!conceptToDelete) return;
    try {
      setDeletingConcept(true);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", conceptId: conceptToDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xóa Concept.");

      toast.success(data.message || `Đã xóa "${conceptToDelete.name}" thành công!`);
      setDeleteAlertOpen(false);
      setConceptToDelete(null);

      const nextId = activeConceptId;
      setSelectedConceptId(nextId);
      await loadConcepts();
      await loadBom(guests, true, nextId);
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa Concept.");
    } finally {
      setDeletingConcept(false);
    }
  };

  const handleSetActiveConcept = async (conceptId: string) => {
    try {
      setActivatingConcept(true);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-active", conceptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi kích hoạt concept.");
      toast.success(data.message || "Đã kích hoạt Concept làm thực đơn chính thức!");
      setActiveConceptId(conceptId);
      await loadConcepts();
      await loadBom(guests, true, conceptId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActivatingConcept(false);
    }
  };

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

  // Món đang chọn
  // ---------- TÍNH TOÁN FOOD COST & GIÁ VỐN TRỰC TIẾP TRÊN BOM ----------
  const selectedConcept = useMemo(
    () => concepts.find((c) => c.id === selectedConceptId),
    [concepts, selectedConceptId]
  );
  const MENU_SELLING_PRICE = selectedConcept?.sellingPrice || 1190000;
  const TARGET_FOOD_COST_PCT = selectedConcept?.targetFoodCostPct || 28.0;
  const TARGET_FOOD_COST_VND = Math.round((MENU_SELLING_PRICE * TARGET_FOOD_COST_PCT) / 100);

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

  // Biến thể đang chọn của món
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

  // Danh mục nguyên liệu tổng hợp
  const menuSummary = useMemo(() => bomData?.summary.ingredients ?? [], [bomData]);

  // Bộ lọc bảng tổng hợp
  const filteredSummary = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return menuSummary.filter((a) => {
      if (summaryGroup !== "ALL" && a.group !== summaryGroup) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuSummary, summarySearch, summaryGroup]);

  // Bộ lọc danh mục nguyên liệu kho
  const filteredAllIngredients = useMemo(() => {
    if (!bomData) return [];
    const q = ingSearch.trim().toLowerCase();
    return bomData.allIngredients.filter((i) => {
      if (ingGroupFilter !== "ALL" && i.group !== ingGroupFilter) return false;
      if (ingStockFilter === "LOW_STOCK" && (i.currentStock > i.minStock || i.currentStock <= 0)) return false;
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

  // Thống kê preview Excel
  const previewStats = useMemo(() => {
    const total = previewRows.length;
    const valid = previewRows.filter((r) => r.status === "VALID").length;
    const errors = total - valid;
    const newIngredients = previewRows.filter((r) => r.status === "VALID" && r.isNewIngredient).length;
    return { total, valid, errors, newIngredients };
  }, [previewRows]);

  // Parse Excel client-side khi người dùng chọn file
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsParsingExcel(true);
    setPreviewRows([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = wb.SheetNames.includes("CongThuc_BOM") ? "CongThuc_BOM" : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      if (!ws) {
        toast.error("File Excel không có sheet dữ liệu hợp lệ.");
        setIsParsingExcel(false);
        return;
      }

      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (!Array.isArray(rows) || rows.length === 0) {
        toast.warning("File Excel không có dòng dữ liệu nào.");
        setIsParsingExcel(false);
        return;
      }

      const existingIngIds = new Set(bomData?.allIngredients.map((i) => i.id) ?? []);
      const parsed: ExcelPreviewRow[] = [];

      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const dishIndex = Number(row["STT Món"] || row["Món"] || row["dishIndex"] || 0);
        const dishName = String(row["Tên Món"] || row["dishName"] || `Món ${dishIndex}`).trim();
        const optionId = String(row["Mã Biến Thể"] || row["optionId"] || "std").trim();
        const optionName = String(row["Tên Biến Thể"] || row["optionName"] || "Chuẩn vị").trim();
        const isDefault = Number(row["Mặc Định (1=Có, 0=Không)"] ?? 1) === 1;

        const rawIngId = String(row["Mã Nguyên Liệu"] || row["ingredientId"] || "").trim();
        const ingName = String(row["Tên Nguyên Liệu"] || row["ingredientName"] || "").trim();
        const group = String(row["Nhóm"] || row["group"] || "SEASONING").trim().toUpperCase();
        const unit = String(row["Đơn Vị"] || row["unit"] || "g").trim().toLowerCase();
        const qtyPerGuest = Number(row["Định Lượng / 1 Khách"] || row["qtyPerGuest"] || 0);
        const prepNote = String(row["Quy Cách / Sơ Chế"] || row["prepNote"] || "").trim();
        const price = Number(row["Đơn Giá Nhập (VND/đơn vị)"] || row["defaultImportPrice"] || 0);

        let status: "VALID" | "ERROR" = "VALID";
        let statusMessage = "Hợp lệ";

        if (!dishIndex || dishIndex < 1 || dishIndex > 7) {
          status = "ERROR";
          statusMessage = "Mã món phải từ 1 đến 7";
        } else if (!ingName) {
          status = "ERROR";
          statusMessage = "Thiếu tên nguyên liệu";
        } else if (qtyPerGuest <= 0) {
          status = "ERROR";
          statusMessage = "Định lượng phải > 0";
        } else if (unit !== "g" && unit !== "ml") {
          status = "ERROR";
          statusMessage = `Đơn vị '${unit}' không hợp lệ (chỉ nhận g/ml)`;
        }

        const resolvedId =
          rawIngId ||
          ingName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[đĐ]/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        const isNewIngredient = !existingIngIds.has(resolvedId);

        parsed.push({
          rowNum,
          dishIndex,
          dishName,
          optionId,
          optionName,
          isDefault,
          ingredientId: resolvedId,
          ingredientName: ingName,
          group,
          unit,
          qtyPerGuest,
          prepNote,
          price,
          status,
          statusMessage,
          isNewIngredient,
        });
      });

      setPreviewRows(parsed);
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể đọc file Excel. Vui lòng kiểm tra định dạng .xlsx");
    } finally {
      setIsParsingExcel(false);
    }
  }, [bomData]);

  // ---------- Thao tác CRUD ----------

  // Submit Tạo món ăn mới
  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      toast.error("Vui lòng nhập tên món ăn.");
      return;
    }
    setSubmittingDish(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-dish",
          dishName: newDishName.trim(),
          method: newDishMethod.trim(),
          note: newDishNote.trim(),
          conceptId: selectedConceptId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi tạo món ăn.");

      toast.success(data.message || "Đã tạo món ăn mới!");
      setCreateDishOpen(false);
      setNewDishName("");
      setNewDishMethod("");
      setNewDishNote("");
      if (data.dish) {
        setSelectedDish(data.dish.dishIndex);
      }
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo món ăn.");
    } finally {
      setSubmittingDish(false);
    }
  };

  // Submit Xóa món ăn
  const handleDeleteDish = async (dishId: string, dishName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa món "${dishName}" khỏi thực đơn?`)) return;
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-dish",
          dishId,
          conceptId: selectedConceptId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xóa món ăn.");

      toast.success(data.message || "Đã xóa món ăn.");
      setSelectedDish(1);
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa món ăn.");
    }
  };

  // Lưu dòng định lượng
  async function handleSaveLine(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLine) return;
    try {
      setSubmittingLine(true);
      const res = await fetch("/api/recipes/lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingLine, conceptId: selectedConceptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu dòng định lượng.");
      toast.success("Đã cập nhật định lượng thành công!");
      setLineModalOpen(false);
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingLine(false);
    }
  }

  // Xóa dòng định lượng
  async function handleDeleteLine(lineId: string, ingName: string) {
    if (!confirm(`Xác nhận xóa nguyên liệu "${ingName}" khỏi công thức món này?`)) return;
    try {
      const res = await fetch(`/api/recipes/lines?id=${lineId}&conceptId=${selectedConceptId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa dòng định lượng.");
      toast.success("Đã xóa dòng định lượng.");
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Lưu nguyên liệu mới / cập nhật
  async function handleSaveIngredient(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmittingIng(true);
      const res = await fetch("/api/recipes/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingIng),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu nguyên liệu.");
      toast.success(editingIng.id ? "Đã cập nhật nguyên liệu!" : "Đã thêm nguyên liệu mới vào kho!");
      setIngModalOpen(false);
      setEditingIng({
        name: "",
        unit: "g",
        group: "PROTEIN",
        spec: "",
        defaultImportPrice: 100000,
        currentStock: 1000,
        minStock: 200,
      });
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingIng(false);
    }
  }

  // Xóa nguyên liệu khỏi CSDL
  async function handleDeleteIngredient(id: string, name: string) {
    if (!confirm(`Xác nhận xóa nguyên liệu "${name}" khỏi kho?`)) return;
    try {
      const res = await fetch(`/api/recipes/ingredients?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa nguyên liệu.");
      toast.success("Đã xóa nguyên liệu thành công.");
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Khôi phục mặc định Concept 2
  async function handleResetConcept2() {
    if (!confirm("Khôi phục toàn bộ công thức định lượng 7 món về bộ chuẩn Concept 2 ban đầu của TRẦM Reserve?")) return;
    try {
      setResetting(true);
      const res = await fetch("/api/recipes?action=reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khôi phục dữ liệu.");
      toast.success(data.message || "Đã khôi phục Concept 2 thành công!");
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  }

  // Xác nhận nhập file Excel vào CSDL
  async function handleConfirmImportExcel() {
    if (!selectedFile) return;
    if (previewStats.valid === 0) {
      toast.error("Không có dòng dữ liệu hợp lệ nào để nhập.");
      return;
    }
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xử lý file Excel.");

      if (data.errors && data.errors.length > 0) {
        toast.warning(`Đã nhập ${data.insertedLines} dòng, nhưng có ${data.errors.length} dòng lỗi.`);
      } else {
        toast.success(`Đã nhập thành công ${data.insertedLines} dòng định lượng vào hệ thống!`);
      }
      setImportModalOpen(false);
      setSelectedFile(null);
      setPreviewRows([]);
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  }

  // Đơn giá tham chiếu của nguyên liệu đang chỉnh sửa trong modal
  const selectedLineIng = useMemo(() => {
    if (!editingLine || !bomData) return null;
    return bomData.allIngredients.find((i) => i.id === editingLine.ingredientId);
  }, [editingLine, bomData]);

  // Chi phí ước tính cho 1 khách
  const estimatedLineCost = useMemo(() => {
    if (!editingLine || !selectedLineIng) return 0;
    const pricePerBase = selectedLineIng.defaultImportPrice || 0;
    // Đơn giá là theo 1000g hoặc 1000ml
    return Math.round((editingLine.qtyPerGuest * pricePerBase) / 1000);
  }, [editingLine, selectedLineIng]);

  return (
    <div className="space-y-6 font-heading">
      {/* ==================== 1. TIÊU ĐỀ & THANH CÔNG CỤ ==================== */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
              Bếp &amp; kho
            </span>
            {selectedConceptId === activeConceptId ? (
              <span className="rounded-sm border border-emerald-700/30 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                Đang phục vụ
              </span>
            ) : (
              <span className="rounded-sm border border-amber-700/30 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-[#92400e]">
                Bản thảo kế hoạch
              </span>
            )}
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin text-[#7c2d12]" /> Đang đồng bộ...
              </span>
            )}
          </div>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            {viewMode === "food-cost"
              ? "Phân tích Food Cost & Giá vốn thực đơn"
              : "Concept Thực đơn & Công thức định lượng (BOM)"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {viewMode === "food-cost"
              ? `Định mức chi phí thực phẩm mục tiêu ${TARGET_FOOD_COST_PCT}% · Đối soát giá bán ${formatVND(MENU_SELLING_PRICE)}/khách`
              : `Quản lý Concept thực đơn theo mùa · Thiết kế món ăn & định lượng nguyên liệu (${bomData?.dishes?.length ?? 0} món)`}
          </p>
        </div>

        {/* Cụm công cụ trên 1 dòng */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === "food-cost" && (
            <div className="flex items-center rounded-sm border border-stone-300 bg-[#fffdf8] px-2.5 py-1">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-[#7c2d12]" />
              <span className="mr-1.5 text-xs font-medium text-stone-600">Concept:</span>
              <Select
                value={selectedConceptId}
                onValueChange={(val) => {
                  setSelectedConceptId(val);
                  setSelectedDish(1);
                  loadBom(guests, false, val);
                }}
              >
                <SelectTrigger className="h-6 gap-1 border-0 bg-transparent p-0 pr-1 text-xs font-semibold shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {concepts.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} {c.id === activeConceptId ? "(Đang phục vụ)" : `· ${formatConceptPeriod(c)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {viewMode === "recipes" && (
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateConceptOpen(true)}
              className="h-8 gap-1.5 rounded-sm bg-[#7c2d12] px-3.5 font-heading text-xs font-semibold text-[#fdf0d5] shadow-none hover:bg-[#5f200c] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo Concept mới
            </Button>
          )}

          {/* Nhập / Xuất Excel */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setPreviewRows([]);
                setImportModalOpen(true);
              }}
              className="h-8 rounded-sm border-stone-300 bg-[#fffdf8] text-xs font-semibold text-stone-700 hover:border-[#7c2d12] hover:text-[#7c2d12] cursor-pointer"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5 text-[#7c2d12]" />
              Nhập Excel
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-sm border-stone-300 bg-[#fffdf8] text-xs font-semibold text-stone-700 hover:border-[#7c2d12] hover:text-[#7c2d12]"
            >
              <a href="/api/recipes/export">
                <Download className="mr-1.5 h-3.5 w-3.5 text-[#7c2d12]" />
                Xuất Excel
              </a>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-stone-300 bg-[#fffdf8]">
          <Loader2 className="h-7 w-7 animate-spin text-[#7c2d12]" />
          <p className="font-heading text-sm text-muted-foreground">Đang tải dữ liệu Concept &amp; định lượng...</p>
        </div>
      ) : viewMode === "recipes" ? (
        /* ==================== VIEW HỢP NHẤT: CONCEPT THỰC ĐƠN & CÔNG THỨC BOM ==================== */
        <>
          {/* ==================== 2. DANH SÁCH THẺ CONCEPT THEO MÙA ==================== */}
          <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
            <CardHeader className="gap-2 border-b border-border/60 bg-[#f6efe0]/60 px-4 py-3 sm:px-5 [.border-b]:pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 font-heading text-base font-bold tracking-wide text-[#292524]">
                  <Layers className="h-4 w-4 text-[#7c2d12]" aria-hidden />
                  Danh sách Concept thực đơn ({concepts.length})
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  Chọn Concept để thiết kế món ăn và chỉnh sửa bảng định lượng bên dưới
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {concepts.map((c) => {
                  const isActive = c.id === activeConceptId;
                  const isSelected = c.id === selectedConceptId;
                  const dishCount = isSelected && bomData?.dishes ? bomData.dishes.length : (c.dishes?.length || 0);

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (selectedConceptId !== c.id) {
                          setSelectedConceptId(c.id);
                          setSelectedDish(1);
                          loadBom(guests, false, c.id);
                        }
                      }}
                      className={cn(
                        "relative flex cursor-pointer flex-col justify-between space-y-3 rounded-sm border p-3.5 transition-colors",
                        isSelected
                          ? "border-[#7c2d12] bg-[#fffdf8] ring-1 ring-[#7c2d12]"
                          : "border-stone-200/90 bg-[#fffdf8]/60 hover:border-[#7c2d12]/50 hover:bg-[#fdf0d5]/20",
                      )}
                    >
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            {c.code || "Thực đơn mùa"}
                          </span>
                          {isActive ? (
                            <span className="rounded-sm border border-emerald-700/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Đang phục vụ
                            </span>
                          ) : (
                            <span className="rounded-sm border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                              Bản thảo kế hoạch
                            </span>
                          )}
                        </div>

                        <h4 className="font-heading text-base font-bold leading-snug text-[#292524]">
                          {c.name}
                        </h4>

                        <div className="mt-2 space-y-1 text-xs text-stone-600">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-[#7c2d12]" />
                            <span>{formatConceptPeriod(c)}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 text-[11.5px]">
                            <span>
                              Thực đơn:{" "}
                              <strong className="text-[#292524]">
                                {dishCount > 0 ? `${dishCount} món` : "Đang trống"}
                              </strong>
                            </span>
                            <span>
                              Giá bán:{" "}
                              <strong className="text-[#92400e]">
                                {formatVND(c.sellingPrice || MENU_SELLING_PRICE)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {c.description && (
                          <p className="mt-2 line-clamp-1 text-[11px] italic text-muted-foreground">
                            &ldquo;{c.description}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Thao tác Sửa / Xóa / Áp dụng */}
                      <div
                        className="flex items-center justify-between gap-1.5 border-t border-stone-200/80 pt-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setConceptToEdit(c);
                              setEditConceptOpen(true);
                            }}
                            className="inline-flex h-6 items-center gap-1 rounded-sm border border-stone-300 bg-transparent px-2 text-[11px] font-semibold text-stone-700 transition-colors hover:border-[#7c2d12] hover:text-[#7c2d12] cursor-pointer"
                            title="Sửa thông tin Concept"
                          >
                            <Pencil className="h-3 w-3" /> Sửa
                          </button>

                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setConceptToDelete(c);
                                setDeleteAlertOpen(true);
                              }}
                              className="inline-flex h-6 items-center gap-1 rounded-sm border border-stone-300 bg-transparent px-2 text-[11px] font-semibold text-rose-800 transition-colors hover:border-rose-700 hover:bg-rose-50 cursor-pointer"
                              title="Xóa Concept này"
                            >
                              <Trash2 className="h-3 w-3" /> Xóa
                            </button>
                          )}
                        </div>

                        {!isActive ? (
                          <button
                            type="button"
                            disabled={activatingConcept}
                            onClick={() => handleSetActiveConcept(c.id)}
                            className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#7c2d12] px-2.5 text-[11px] font-semibold text-[#fdf0d5] transition-colors hover:bg-[#5f200c] cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Áp dụng
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold italic text-emerald-800">
                            Thực đơn chính thức
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ==================== 3. 4 CHỈ SỐ TỔNG QUAN FOOD COST & BOM CỦA CONCEPT ĐANG CHỌN ==================== */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                id: "food-cost",
                label: scaled ? `Giá vốn (${guests} khách)` : "Giá vốn / 1 suất",
                value: formatVND(scaled ? totalFoodCost * guests : totalFoodCost),
                sub: `${actualFoodCostPct}% giá bán ${formatVND(MENU_SELLING_PRICE)} · Mục tiêu ${TARGET_FOOD_COST_PCT}%`,
                tone: actualFoodCostPct <= 35 ? "good" : "warn",
                icon: Calculator,
              },
              {
                id: "gross-profit",
                label: scaled ? `Lãi gộp (${guests} khách)` : "Lãi gộp / 1 suất",
                value: formatVND(scaled ? grossProfit * guests : grossProfit),
                sub: `${grossProfitPct}% biên lợi nhuận gộp`,
                tone: "default",
                icon: Coins,
              },
              {
                id: "shift-capacity",
                label: "Giá vốn ca 42 khách",
                value: formatVND(shift42Cost),
                sub: `Doanh thu ca 42 khách: ${formatVND(shift42Revenue)}`,
                tone: "default",
                icon: Users,
              },
              {
                id: "highest-dish",
                label: "Món giá vốn cao nhất",
                value: highestDish ? `Món ${String(highestDish.dish.index).padStart(2, "0")}` : "—",
                sub: highestDish
                  ? `${highestDish.dish.name} (${formatVND(highestDish.cost)} · ${totalFoodCost > 0 ? Math.round((highestDish.cost / totalFoodCost) * 1000) / 10 : 0}%)`
                  : "—",
                tone: "default",
                icon: UtensilsCrossed,
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.id} className="min-w-0 gap-0 border-border/80 bg-[#fffdf8] py-0 shadow-xs">
                  <CardContent className="p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-600 sm:text-[11px]">
                        {stat.label}
                      </span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-stone-200 bg-[#f6efe0] text-[#7c2d12]">
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>
                    <div
                      className={cn(
                        "mt-2 font-heading text-lg font-bold tabular-nums sm:text-xl",
                        stat.tone === "warn" ? "text-rose-800" : "text-[#292524]",
                      )}
                    >
                      {stat.value}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={stat.sub}>
                      {stat.sub}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ==================== 4. DANH SÁCH MÓN ĂN TRONG CONCEPT & BẢNG ĐỊNH LƯỢNG BOM ==================== */}
          {!bomData?.dishes || bomData.dishes.length === 0 ? (
            <Card className="border-2 border-dashed border-stone-300 bg-[#fffdf8] p-10 text-center shadow-xs sm:p-14">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-sm border border-stone-300 bg-[#f6efe0] text-[#7c2d12]">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#292524]">
                Concept này chưa có món ăn (Đang để trống)
              </h3>
              <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
                Hãy tạo món ăn mới hoặc nhập công thức từ file Excel để bắt đầu xây dựng định lượng nguyên liệu cho Concept này.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <Button
                  type="button"
                  onClick={() => setCreateDishOpen(true)}
                  className="h-8 rounded-sm bg-[#7c2d12] px-3.5 text-xs font-semibold text-[#fdf0d5] hover:bg-[#5f200c] cursor-pointer"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Tạo món ăn mới cho Concept này
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewRows([]);
                    setImportModalOpen(true);
                  }}
                  className="h-8 rounded-sm border-stone-300 bg-transparent text-xs font-semibold text-stone-700 hover:border-[#7c2d12] cursor-pointer"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Nhập công thức từ Excel
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Lưới thẻ chọn món */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                    Thực đơn của Concept ({bomData.dishes.length} món) — Bấm chọn món để chỉnh định lượng
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreateDishOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#7c2d12] px-3 font-heading text-xs font-semibold text-[#fdf0d5] transition-colors hover:bg-[#5f200c] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm món ăn mới
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
                  {bomData.dishes.map((dish) => {
                    const menuItem = MENU_ITEMS.find((m) => m.index === dish.index);
                    const isSelected = dish.index === selectedDish;
                    return (
                      <button
                        key={dish.index}
                        type="button"
                        onClick={() => setSelectedDish(dish.index)}
                        aria-selected={isSelected}
                        className={cn(
                          "group relative flex cursor-pointer flex-col overflow-hidden rounded-sm border p-2 text-left transition-colors",
                          isSelected
                            ? "border-[#7c2d12] bg-[#fffdf8] ring-1 ring-[#7c2d12]"
                            : "border-stone-200/90 bg-[#fffdf8]/70 hover:border-[#7c2d12]/50 hover:bg-[#fdf0d5]/20",
                        )}
                      >
                        <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-sm bg-stone-900/10">
                          {menuItem?.image ? (
                            <Image
                              src={menuItem.image}
                              alt={dish.name}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-heading text-xs text-muted-foreground">
                              Món {dish.index}
                            </div>
                          )}
                          <span className="absolute left-1.5 top-1.5 rounded-sm bg-[#292524]/85 px-1.5 py-0.5 font-heading text-[10px] font-bold text-[#fdf0d5]">
                            0{dish.index}
                          </span>
                        </div>
                        <span className="line-clamp-1 font-heading text-xs font-bold text-[#292524] group-hover:text-[#7c2d12]">
                          {dish.name}
                        </span>
                        <div className="mt-1 flex items-center justify-between text-[10.5px]">
                          <span className="font-heading font-bold text-[#92400e]">
                            {formatVND(dishCostMap.get(dish.index) || 0)}
                          </span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {totalFoodCost > 0
                              ? `${Math.round(((dishCostMap.get(dish.index) || 0) / totalFoodCost) * 1000) / 10}%`
                              : "0%"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bảng sổ định lượng chi tiết món đang chọn */}
              {activeDish && activeVariant && (
                <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
                  <CardHeader className="gap-3 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-sm bg-[#7c2d12] px-2 py-0.5 font-heading text-[11px] font-bold text-[#fdf0d5]">
                            Món 0{activeDish.index}
                          </span>
                          <CardTitle className="font-heading text-lg font-bold tracking-wide text-[#292524] sm:text-xl">
                            {activeDish.name}
                          </CardTitle>
                          {activeDish.region && (
                            <span className="text-xs font-semibold italic text-[#7c2d12]">
                              — {activeDish.region}
                            </span>
                          )}
                          <span className="rounded-sm border border-stone-300 bg-[#f6efe0] px-2 py-0.5 font-heading text-xs font-semibold text-[#92400e]">
                            Giá vốn: {formatVND(activeDishCost)} / suất (
                            {totalFoodCost > 0
                              ? Math.round((activeDishCost / totalFoodCost) * 1000) / 10
                              : 0}
                            % Menu)
                          </span>
                        </div>
                        {activeDish.method && (
                          <p className="flex items-center gap-1.5 text-xs text-stone-600">
                            <CookingPot className="h-3.5 w-3.5 text-[#7c2d12]" />
                            <span>Kỹ thuật chế biến: {activeDish.method}</span>
                          </p>
                        )}
                      </div>

                      {/* Cụm nút Thêm định lượng / Xóa món */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const defaultIng = bomData?.allIngredients[0];
                            setEditingLine({
                              variantId: activeVariant.id,
                              ingredientId: defaultIng?.id ?? "",
                              qtyPerGuest: 10,
                              unit: defaultIng?.unit || "g",
                              prepNote: "",
                            });
                            setLineModalOpen(true);
                          }}
                          className="h-8 gap-1.5 rounded-sm bg-[#7c2d12] px-3 font-heading text-xs font-semibold text-[#fdf0d5] shadow-none hover:bg-[#5f200c] cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Thêm nguyên liệu vào món
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDish(activeDish.id, activeDish.name)}
                          className="h-8 rounded-sm border-stone-300 bg-transparent px-2.5 text-xs font-semibold text-rose-800 hover:border-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="Xóa món này khỏi thực đơn"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa món
                        </Button>
                      </div>
                    </div>

                    {/* Thanh chọn Biến thể món & Bộ nhân quy mô khách */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
                          Phiên bản món:
                        </span>
                        {activeDish.variants.map((v) => {
                          const isVarSelected = v.optionId === activeVariant.optionId;
                          return (
                            <button
                              key={v.optionId}
                              type="button"
                              onClick={() =>
                                setVariantByDish((prev) => ({
                                  ...prev,
                                  [activeDish.index]: v.optionId,
                                }))
                              }
                              className={cn(
                                "rounded-sm border px-2.5 py-1 font-heading text-xs font-semibold transition-colors cursor-pointer",
                                isVarSelected
                                  ? "border-[#7c2d12] bg-[#7c2d12] text-[#fdf0d5]"
                                  : "border-stone-300 bg-transparent text-stone-600 hover:border-[#7c2d12]",
                              )}
                            >
                              {v.optionName} {v.isDefault && "(Chuẩn)"}
                            </button>
                          );
                        })}
                      </div>

                      {/* Bộ nhân quy mô số khách */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                          Quy đổi số khách:
                        </span>
                        {QUICK_GUESTS.map((n) => (
                          <button
                            key={`scale-${n}`}
                            type="button"
                            onClick={() => applyGuests(n)}
                            className={cn(
                              "rounded-sm border px-2.5 py-1 font-heading text-xs font-semibold tabular-nums transition-colors cursor-pointer",
                              guests === n
                                ? "border-[#7c2d12] bg-[#7c2d12] text-[#fdf0d5]"
                                : "border-stone-300 bg-transparent text-stone-700 hover:border-[#7c2d12]",
                            )}
                          >
                            {n === 1 ? "1 suất" : n === 42 ? "42 (Đầy ca)" : `${n} khách`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <Table className="min-w-[860px] font-heading">
                      <TableHeader>
                        <TableRow className="border-b-2 border-[#7c2d12]/50 bg-[#f6efe0] hover:bg-[#f6efe0]">
                          <TableHead className="w-12 pl-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                            #
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                            Nguyên liệu &amp; Sơ chế
                          </TableHead>
                          <TableHead className="w-40 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                            Nhóm
                          </TableHead>
                          <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                            Định lượng / suất
                          </TableHead>
                          {scaled && (
                            <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-[#7c2d12]">
                              Tổng ({guests} khách)
                            </TableHead>
                          )}
                          <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                            Đơn giá kho
                          </TableHead>
                          <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                            Giá vốn / suất
                          </TableHead>
                          {scaled && (
                            <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-[#7c2d12]">
                              Tổng vốn ({guests}k)
                            </TableHead>
                          )}
                          <TableHead className="w-24 pr-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                            Thao tác
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {activeVariant.lines.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={scaled ? 9 : 7}
                              className="py-10 text-center text-sm text-muted-foreground"
                            >
                              Chưa có nguyên liệu nào trong công thức món này. Bấm &ldquo;Thêm nguyên liệu vào món&rdquo; để bắt đầu.
                            </TableCell>
                          </TableRow>
                        ) : (
                          activeVariant.lines.map((line, idx) => (
                            <TableRow
                              key={line.id}
                              className="border-b border-stone-200/80 bg-[#fffdf8] transition-colors hover:bg-[#fdf0d5]/30"
                            >
                              <TableCell className="pl-4 text-center text-xs tabular-nums text-stone-500">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-heading font-semibold text-[#292524]">
                                <div>
                                  <span>{line.ingredientName}</span>
                                  {line.prepNote && (
                                    <span className="block text-[10.5px] font-normal italic text-muted-foreground">
                                      {line.prepNote}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-stone-600">
                                {INGREDIENT_GROUP_LABELS[line.group] ?? line.group}
                              </TableCell>
                              <TableCell className="text-right font-heading text-sm font-bold tabular-nums text-[#292524]">
                                {formatQty(line.qtyPerGuest, line.unit)}
                              </TableCell>
                              {scaled && (
                                <TableCell className="text-right font-heading text-sm font-bold tabular-nums text-[#7c2d12]">
                                  {formatQty(line.qtyTotal, line.unit)}
                                </TableCell>
                              )}
                              <TableCell className="text-right text-xs tabular-nums text-stone-600">
                                {line.defaultImportPrice > 0
                                  ? `${formatVND(line.defaultImportPrice)}/${line.unit === "ml" ? "L" : "kg"}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right font-heading font-semibold tabular-nums text-[#92400e]">
                                {formatVND(Math.round((line.qtyPerGuest * (line.defaultImportPrice || 0)) / 1000))}
                              </TableCell>
                              {scaled && (
                                <TableCell className="text-right font-heading font-bold tabular-nums text-[#7c2d12]">
                                  {formatVND(Math.round((line.qtyTotal * (line.defaultImportPrice || 0)) / 1000))}
                                </TableCell>
                              )}
                              <TableCell className="pr-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLine({
                                        id: line.id,
                                        variantId: activeVariant.id,
                                        ingredientId: line.ingredientId,
                                        qtyPerGuest: line.qtyPerGuest,
                                        unit: line.unit,
                                        prepNote: line.prepNote || "",
                                      });
                                      setLineModalOpen(true);
                                    }}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-stone-300 text-stone-600 transition-colors hover:border-[#7c2d12] hover:text-[#7c2d12] cursor-pointer"
                                    title="Chỉnh sửa định lượng"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLine(line.id, line.ingredientName)}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-stone-300 text-stone-500 transition-colors hover:border-rose-700 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                    title="Xóa khỏi công thức"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>

                      <TableFooter className="border-t-2 border-[#7c2d12]/30 bg-[#f6efe0] font-heading">
                        <TableRow>
                          <TableCell colSpan={3} className="pl-4 font-bold text-[#292524]">
                            Tổng cộng định lượng món ({activeVariant.optionName}):
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums text-[#292524]">
                            {formatTotals(activeVariant.totalsPerGuest)}
                          </TableCell>
                          {scaled && (
                            <TableCell className="text-right font-bold tabular-nums text-[#7c2d12]">
                              {formatTotals(activeVariant.totalsForGuests)}
                            </TableCell>
                          )}
                          <TableCell className="text-right text-xs text-stone-600">
                            Tổng giá vốn:
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums text-[#92400e]">
                            {formatVND(activeDishCost)}
                          </TableCell>
                          {scaled && (
                            <TableCell className="text-right font-bold tabular-nums text-[#7c2d12]">
                              {formatVND(activeDishCost * guests)}
                            </TableCell>
                          )}
                          <TableCell />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      ) : viewMode === "food-cost" ? (
        /* ==================== VIEW: PHÂN TÍCH FOOD COST 33,5% ==================== */
        <div className="space-y-5">
          {/* Card so sánh đối chiếu mục tiêu 33,5% */}
          <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
            <CardHeader className="gap-2 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-[#292524]">
                    <Calculator className="h-4 w-4 text-[#7c2d12]" />
                    Đối chiếu Food Cost thực tế &amp; Mục tiêu {TARGET_FOOD_COST_PCT}%
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Giá bán menu Tasting: {formatVND(MENU_SELLING_PRICE)} · Trần chi phí chuẩn ({TARGET_FOOD_COST_PCT}%):{" "}
                    {formatVND(TARGET_FOOD_COST_VND)} / khách
                  </p>
                </div>
                <span
                  className={cn(
                    "self-start rounded-sm border px-2.5 py-1 font-heading text-xs font-semibold sm:self-auto",
                    actualFoodCostPct <= TARGET_FOOD_COST_PCT
                      ? "border-emerald-700/30 bg-emerald-50 text-emerald-800"
                      : actualFoodCostPct <= 35.0
                        ? "border-amber-700/30 bg-amber-50 text-amber-800"
                        : "border-rose-700/30 bg-rose-50 text-rose-800",
                  )}
                >
                  {actualFoodCostPct <= TARGET_FOOD_COST_PCT
                    ? `Đạt chuẩn tối ưu (${actualFoodCostPct}% ≤ ${TARGET_FOOD_COST_PCT}%)`
                    : actualFoodCostPct <= 35.0
                      ? `Trong khung duyệt P&L 28%–35% (${actualFoodCostPct}%)`
                      : `Vượt ngưỡng mục tiêu (+${(actualFoodCostPct - TARGET_FOOD_COST_PCT).toFixed(1)}%)`}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4 sm:p-5">
              {/* Thanh tiến trình đo Food Cost */}
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-semibold text-stone-700">
                  <span>
                    Tỷ lệ giá vốn thực tế: <strong className="text-[#92400e]">{actualFoodCostPct}%</strong>
                  </span>
                  <span>
                    Mục tiêu chuẩn: <strong className="text-emerald-800">{TARGET_FOOD_COST_PCT}%</strong> (khung duyệt P&L 28%–35%)
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-sm border border-stone-300 bg-[#f6efe0]">
                  <div
                    style={{ width: `${Math.min(100, (actualFoodCostPct / 50) * 100)}%` }}
                    className={cn(
                      "h-full transition-all duration-500",
                      actualFoodCostPct <= TARGET_FOOD_COST_PCT
                        ? "bg-emerald-700"
                        : actualFoodCostPct <= 35.0
                          ? "bg-amber-600"
                          : "bg-[#7c2d12]",
                    )}
                  />
                  <div
                    style={{ left: `${(TARGET_FOOD_COST_PCT / 50) * 100}%` }}
                    className="absolute bottom-0 top-0 z-10 w-0.5 bg-emerald-700"
                    title={`Ngưỡng mục tiêu ${TARGET_FOOD_COST_PCT}%`}
                  />
                  <div
                    style={{ left: `${(35 / 50) * 100}%` }}
                    className="absolute bottom-0 top-0 z-10 w-0.5 bg-rose-700"
                    title="Trần duyệt P&L 35%"
                  />
                </div>
              </div>

              {/* Bảng phân bổ cơ cấu 7 nhóm nguyên liệu */}
              <div className="pt-1">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Cơ cấu giá vốn theo 7 nhóm nguyên liệu
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {groupCostSummary.map((g) => (
                    <div key={g.group} className="rounded-sm border border-stone-200/90 bg-[#fffdf8] p-2.5">
                      <div className="truncate text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                        {g.label}
                      </div>
                      <div className="mt-1 font-heading text-sm font-bold tabular-nums text-[#92400e]">
                        {formatVND(g.cost)}
                      </div>
                      <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {g.share}% tổng vốn
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bảng xếp hạng giá vốn các món Tasting */}
          <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
            <CardHeader className="border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
              <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-[#292524]">
                <UtensilsCrossed className="h-4 w-4 text-[#7c2d12]" />
                Sổ phân tích Giá vốn theo món ({bomData?.dishes?.length ?? 0} món)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="min-w-[760px] font-heading">
                <TableHeader>
                  <TableRow className="border-b-2 border-[#7c2d12]/50 bg-[#f6efe0] hover:bg-[#f6efe0]">
                    <TableHead className="w-20 pl-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                      Thứ tự
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                      Tên món ăn
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                      Giá vốn / suất
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                      Tỷ trọng Food Cost
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                      Giá vốn ca 42 khách
                    </TableHead>
                    <TableHead className="w-28 pr-4 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!bomData?.dishes || bomData.dishes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                        Concept này đang để trống thực đơn, chưa có món ăn nào để phân tích Food Cost.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bomData.dishes.map((dish) => {
                      const cost = dishCostMap.get(dish.index) || 0;
                      const share = totalFoodCost > 0 ? Math.round((cost / totalFoodCost) * 1000) / 10 : 0;
                      return (
                        <TableRow
                          key={dish.index}
                          className="border-b border-stone-200/80 bg-[#fffdf8] transition-colors hover:bg-[#fdf0d5]/30"
                        >
                          <TableCell className="pl-4 text-center font-heading text-xs font-bold text-[#7c2d12]">
                            Món 0{dish.index}
                          </TableCell>
                          <TableCell className="font-heading font-semibold text-[#292524]">
                            <div>
                              <span>{dish.name}</span>
                              {dish.region && (
                                <span className="ml-1.5 text-[11px] font-normal italic text-muted-foreground">
                                  — {dish.region}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-heading text-sm font-bold tabular-nums text-[#92400e]">
                            {formatVND(cost)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold tabular-nums text-stone-700">
                            {share}%
                          </TableCell>
                          <TableCell className="text-right font-heading text-xs tabular-nums text-stone-600">
                            {formatVND(cost * 42)}
                          </TableCell>
                          <TableCell className="pr-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDish(dish.index);
                                setViewMode("recipes");
                                if (onNavigateTab) onNavigateTab("recipes");
                              }}
                              className="inline-flex h-6 items-center rounded-sm border border-stone-400 bg-transparent px-2 text-[10.5px] font-semibold text-stone-700 transition-colors hover:border-[#7c2d12] hover:bg-[#7c2d12] hover:text-[#fdf0d5] cursor-pointer"
                            >
                              Xem định lượng
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                <TableFooter className="border-t-2 border-[#7c2d12]/30 bg-[#f6efe0] font-heading">
                  <TableRow>
                    <TableCell colSpan={2} className="pl-4 font-bold text-[#292524]">
                      Tổng giá vốn thực đơn ({bomData?.dishes?.length ?? 0} món):
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-[#92400e]">
                      {formatVND(totalFoodCost)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-[#7c2d12]">
                      {actualFoodCostPct}% menu
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-[#7c2d12]">
                      {formatVND(shift42Cost)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ==================== DIALOG TẠO MÓN ĂN MỚI ==================== */}
      <Dialog open={createDishOpen} onOpenChange={setCreateDishOpen}>
        <DialogContent className="sm:max-w-md font-heading">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-[#292524]">
              Tạo món ăn mới vào thực đơn
            </DialogTitle>
            <DialogDescription className="text-xs">
              Món mới sẽ được cấp số thứ tự tiếp theo. Sau khi tạo, bạn có thể bốc nguyên liệu từ kho vào và gán định lượng BOM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDish} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Tên món ăn *</Label>
              <Input
                placeholder="Ví dụ: Gà Đông Tảo Hầm Trầm Hương..."
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Kỹ thuật chế biến chính</Label>
              <Input
                placeholder="Ví dụ: Nấu chậm sous-vide 62°C, áp chảo da giòn..."
                value={newDishMethod}
                onChange={(e) => setNewDishMethod(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Ghi chú ẩm thực / Triết lý món</Label>
              <Input
                placeholder="Ví dụ: Nước dùng hầm xương gà gia truyền, vị thanh ngọt..."
                value={newDishNote}
                onChange={(e) => setNewDishNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDishOpen(false)}
                disabled={submittingDish}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingDish}
                className="bg-[#b45309] text-xs font-semibold text-white hover:bg-[#92400e]"
              >
                {submittingDish ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang tạo món...
                  </>
                ) : (
                  "Tạo món & Chuyển sang định lượng"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 1: THÊM / SỬA DÒNG ĐỊNH LƯỢNG NÂNG CAO ==================== */}
      <Dialog open={lineModalOpen} onOpenChange={setLineModalOpen}>
        <DialogContent className="sm:max-w-lg font-heading">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-[#292524]">
              {editingLine?.id ? "Chỉnh sửa dòng định lượng" : "Thêm định lượng vào món"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Món 0{activeDish?.index}: {activeDish?.name} · Biến thể: {activeVariant?.optionName}
            </DialogDescription>
          </DialogHeader>

          {editingLine && (
            <form onSubmit={handleSaveLine} className="space-y-4 py-2">
              {/* Chọn nguyên liệu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-stone-700">Nguyên liệu tuyển chọn *</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setLineModalOpen(false);
                      setEditingIng({
                        name: "",
                        unit: "g",
                        group: "PROTEIN",
                        spec: "",
                        defaultImportPrice: 100000,
                        currentStock: 1000,
                        minStock: 200,
                      });
                      setIngModalOpen(true);
                    }}
                    className="text-[11px] font-medium text-[#b45309] hover:underline"
                  >
                    + Tạo nguyên liệu mới vào kho
                  </button>
                </div>
                <Select
                  value={editingLine.ingredientId}
                  onValueChange={(val) => {
                    const found = bomData?.allIngredients.find((i) => i.id === val);
                    setEditingLine((prev) =>
                      prev
                        ? {
                            ...prev,
                            ingredientId: val,
                            unit: found?.unit || prev.unit,
                            prepNote: prev.prepNote || found?.spec || "",
                          }
                        : null,
                    );
                  }}
                >
                  <SelectTrigger className="text-xs font-medium">
                    <SelectValue placeholder="Chọn nguyên liệu..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {bomData?.allIngredients.map((i) => (
                      <SelectItem key={i.id} value={i.id} className="text-xs">
                        <span className="font-medium">{i.name}</span>{" "}
                        <span className="text-muted-foreground">({i.unit})</span> ·{" "}
                        <span className="text-[10px] text-[#b45309]">{i.groupLabel}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Thông tin đơn vị & Định lượng */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-stone-700">Định lượng cho 1 khách *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={editingLine.qtyPerGuest || ""}
                    onChange={(e) =>
                      setEditingLine((prev) =>
                        prev ? { ...prev, qtyPerGuest: Number(e.target.value) } : null,
                      )
                    }
                    className="text-sm font-heading font-bold text-[#b45309]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-stone-700">Đơn vị đo</Label>
                  <Select
                    value={editingLine.unit}
                    onValueChange={(val) =>
                      setEditingLine((prev) => (prev ? { ...prev, unit: val } : null))
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">Gram (g) — Chất rắn</SelectItem>
                      <SelectItem value="ml">Mililit (ml) — Nước dùng / lỏng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick pills định lượng nhanh */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Chọn nhanh định lượng:</p>
                <div className="flex flex-wrap gap-1">
                  {COMMON_QTY_PILLS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() =>
                        setEditingLine((prev) => (prev ? { ...prev, qtyPerGuest: q } : null))
                      }
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                        editingLine.qtyPerGuest === q
                          ? "border-[#b45309] bg-[#b45309] text-white"
                          : "border-border bg-background text-stone-600 hover:border-[#b45309]/50",
                      )}
                    >
                      {q} {editingLine.unit}
                    </button>
                  ))}
                </div>
              </div>
              {/* Thẻ tính toán tự động: chi phí & quy đổi 42 khách */}
              <div className="rounded-xl border border-[#b45309]/20 bg-[#fdf0d5]/40 p-3 text-xs space-y-1">
                <div className="flex justify-between font-medium text-[#78350f]">
                  <span>Chi phí nguyên liệu ước tính / 1 suất:</span>
                  <span className="font-bold font-heading">{formatVND(estimatedLineCost)}</span>
                </div>
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>Tổng định lượng cho 42 khách (đủ ca):</span>
                  <span className="font-semibold">
                    {formatQty(Number((editingLine.qtyPerGuest * 42).toFixed(1)), editingLine.unit as any)}
                  </span>
                </div>
              </div>

              {/* CẢNH BÁO ĐỊNH LƯỢNG / CHI PHÍ DƯ THỪA */}
              {(editingLine.qtyPerGuest > 180 || estimatedLineCost > 160000) && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900">Cảnh báo dư thừa định lượng &amp; chi phí:</span>
                    <p className="mt-0.5 text-stone-700 leading-relaxed text-[11px]">
                      {estimatedLineCost > 160000
                        ? `Chi phí ${formatVND(estimatedLineCost)}/suất chiếm tỷ trọng cao trong ngân sách món ăn, có thể đẩy thực đơn vượt trần Food Cost mục tiêu.`
                        : `Định lượng ${editingLine.qtyPerGuest} ${editingLine.unit}/khách là khá lớn cho một món trong thực đơn tasting 7 món. Vui lòng kiểm tra lại để tránh dư thừa lãng phí.`}
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLineModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingLine}
                  className="bg-[#b45309] text-white hover:bg-[#92400e]"
                >
                  {submittingLine ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Lưu định lượng
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 2: THÊM / SỬA NGUYÊN LIỆU KHO ==================== */}
      <Dialog open={ingModalOpen} onOpenChange={setIngModalOpen}>
        <DialogContent className="sm:max-w-md font-heading">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-[#292524]">
              {editingIng.id ? "Chỉnh sửa nguyên liệu kho" : "Thêm nguyên liệu mới vào kho"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Nguyên liệu được lưu vào kho và dùng chung cho các thực đơn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveIngredient} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tên nguyên liệu *</Label>
              <Input
                placeholder="Vd: Sá sùng đảo Vân Đồn..."
                required
                value={editingIng.name}
                onChange={(e) => setEditingIng((prev) => ({ ...prev, name: e.target.value }))}
                className="text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nhóm nguyên liệu *</Label>
                <Select
                  value={editingIng.group}
                  onValueChange={(val) => setEditingIng((prev) => ({ ...prev, group: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INGREDIENT_GROUP_ORDER.map((g) => (
                      <SelectItem key={g} value={g} className="text-xs">
                        {INGREDIENT_GROUP_LABELS[g]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Đơn vị đo *</Label>
                <Select
                  value={editingIng.unit}
                  onValueChange={(val) => setEditingIng((prev) => ({ ...prev, unit: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gram (g) — Chất rắn</SelectItem>
                    <SelectItem value="ml">Mililit (ml) — Chất lỏng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>



            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Đơn giá nhập ước tính (VND / kg hoặc Lít)</Label>
              <Input
                type="number"
                step="1000"
                min="0"
                value={editingIng.defaultImportPrice || ""}
                onChange={(e) =>
                  setEditingIng((prev) => ({ ...prev, defaultImportPrice: Number(e.target.value) }))
                }
                className="text-xs tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tồn kho ban đầu ({editingIng.unit})</Label>
                <Input
                  type="number"
                  step="10"
                  min="0"
                  value={editingIng.currentStock || ""}
                  onChange={(e) =>
                    setEditingIng((prev) => ({ ...prev, currentStock: Number(e.target.value) }))
                  }
                  className="text-xs tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ngưỡng cảnh báo tối thiểu</Label>
                <Input
                  type="number"
                  step="10"
                  min="0"
                  value={editingIng.minStock || ""}
                  onChange={(e) =>
                    setEditingIng((prev) => ({ ...prev, minStock: Number(e.target.value) }))
                  }
                  className="text-xs tabular-nums"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIngModalOpen(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingIng}
                className="bg-[#b45309] text-white hover:bg-[#92400e]"
              >
                {submittingIng ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Lưu nguyên liệu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 3: PREVIEW & NHẬP EXCEL ==================== */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col font-heading">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-[#292524] flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Xem trước &amp; Nhập công thức BOM từ Excel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hệ thống sẽ đọc file Excel, phân tích từng dòng định lượng và hiển thị bảng kiểm tra trước khi lưu.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Vùng chọn file kéo thả */}
            {!selectedFile ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-emerald-600" />
                <p className="mt-2 text-sm font-semibold text-[#292524]">
                  Kéo thả hoặc bấm để chọn file Excel (.xlsx)
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Hỗ trợ định dạng 12 cột chuẩn tương thích file mẫu TRẦM Reserve
                </p>

                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-background px-4 py-2 text-xs font-semibold text-[#b45309] border border-[#b45309]/40 shadow-xs hover:bg-[#fdf0d5]">
                  <span>Chọn file Excel từ máy</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                </label>
              </div>
            ) : (
              <>
                {/* Thông tin file & thẻ tóm tắt kiểm tra */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/30 border border-border p-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#292524]">{selectedFile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Đã phân tích {previewStats.total} dòng
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-muted">
                    <span>Đổi file khác</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                      }}
                    />
                  </label>
                </div>

                {/* 4 Thẻ trạng thái dữ liệu */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tổng số dòng</p>
                    <p className="text-lg font-heading font-bold text-[#292524]">{previewStats.total}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                    <p className="text-[10px] text-emerald-800 uppercase font-semibold">Hợp lệ</p>
                    <p className="text-lg font-heading font-bold text-emerald-700">{previewStats.valid}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5">
                    <p className="text-[10px] text-rose-800 uppercase font-semibold">Dòng lỗi</p>
                    <p className="text-lg font-heading font-bold text-rose-700">{previewStats.errors}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5">
                    <p className="text-[10px] text-amber-800 uppercase font-semibold">Nguyên liệu mới</p>
                    <p className="text-lg font-heading font-bold text-amber-700">{previewStats.newIngredients}</p>
                  </div>
                </div>

                {/* BẢNG PREVIEW CHI TIẾT */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10 text-[10px] uppercase font-semibold">
                        <TableRow>
                          <TableHead className="w-10 text-center">Dòng</TableHead>
                          <TableHead>Món</TableHead>
                          <TableHead>Nguyên liệu</TableHead>
                          <TableHead>Nhóm</TableHead>
                          <TableHead className="text-right">Định lượng</TableHead>
                          <TableHead className="w-24 text-center">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isParsingExcel ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                              <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#b45309]" />
                              Đang phân tích file Excel...
                            </TableCell>
                          </TableRow>
                        ) : previewRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                              Không có dữ liệu trong file.
                            </TableCell>
                          </TableRow>
                        ) : (
                          previewRows.map((r) => (
                            <TableRow
                              key={r.rowNum}
                              className={cn(
                                "text-xs",
                                r.status === "ERROR" ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-[#fffdf9]",
                              )}
                            >
                              <TableCell className="text-center font-heading text-[11px] text-muted-foreground">
                                {r.rowNum}
                              </TableCell>
                              <TableCell className="font-medium">
                                <span className="inline-block rounded bg-stone-100 px-1 py-0.5 text-[10px] font-bold">
                                  0{r.dishIndex}
                                </span>{" "}
                                {r.dishName}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-semibold text-[#292524]">{r.ingredientName}</span>
                                  {r.isNewIngredient && (
                                    <Badge className="ml-1.5 bg-amber-500 text-white text-[9px] px-1 py-0">Mới</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-[10px] font-heading text-muted-foreground">{r.group}</span>
                              </TableCell>
                              <TableCell className="text-right font-heading font-semibold">
                                {r.qtyPerGuest} {r.unit}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.status === "VALID" ? (
                                  <Badge className="bg-emerald-600 text-white text-[10px]">Hợp lệ</Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px]" title={r.statusMessage}>
                                    {r.statusMessage}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setImportModalOpen(false);
                setSelectedFile(null);
                setPreviewRows([]);
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={importing || !selectedFile || previewStats.valid === 0}
              onClick={handleConfirmImportExcel}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Xác nhận lưu {previewStats.valid} dòng
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
