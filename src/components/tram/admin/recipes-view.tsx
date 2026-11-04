"use client";

// FR-27 — Quản trị Định lượng công thức (BOM) & Kho nguyên liệu kết nối CSDL SQLite
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
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { StockInModal } from "./stock-in-modal";
import { CreateConceptModal } from "./create-concept-modal";
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
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string) => void;
} = {}) {
  // Chế độ xem: "recipes" (Công thức 7 món) hoặc "ingredients" (Kho nguyên liệu)
  const [viewMode, setViewMode] = useState<ViewMode>("recipes");

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
  const [createConceptOpen, setCreateConceptOpen] = useState(false);
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
        if (!res.ok) throw new Error("Không thể tải bảng định lượng từ CSDL.");
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
  const MENU_SELLING_PRICE = 1190000;
  const TARGET_FOOD_COST_PCT = 33.5;
  const TARGET_FOOD_COST_VND = 398650;

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
    if (!confirm(`Xác nhận xóa nguyên liệu "${name}" (${id}) khỏi CSDL kho?`)) return;
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
        toast.success(`Đã nhập thành công ${data.insertedLines} dòng định lượng vào CSDL SQLite!`);
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
    <div className="space-y-6">
      {/* ==================== 1. TIÊU ĐỀ & THANH CÔNG CỤ ==================== */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
              Bếp &amp; kho · CSDL SQLite
            </span>
            {selectedConceptId === activeConceptId ? (
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                Thực đơn tuần này đang phục vụ
              </Badge>
            ) : (
              <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0">
                Kế hoạch tuần tiếp theo (Bản nháp)
              </Badge>
            )}
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin text-[#b45309]" /> Đang đồng bộ...
              </span>
            )}
          </div>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Định lượng công thức (BOM) &amp; Kho nguyên liệu
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {concepts.find((c) => c.id === selectedConceptId)?.name || "Concept 2"} · Nhập/xuất Excel · Đồng bộ CSDL trực tiếp
          </p>
        </div>

        {/* THANH ĐIỀU HƯỚNG TỐI GIẢN & TÁC VỤ */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bộ chọn Concept Thực đơn đa tuần */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-xl border border-stone-200 bg-stone-100/90 px-2 py-0.5 shadow-xs">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-[#b45309]" />
              <Select
                value={selectedConceptId}
                onValueChange={(val) => {
                  setSelectedConceptId(val);
                  loadBom(guests, false, val);
                }}
              >
                <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-semibold shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {concepts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.id === activeConceptId ? "⭐ (Tuần này)" : `· ${c.startDate ? `Từ ${c.startDate.split("-").reverse().join("/")}` : c.weekLabel || "Tuần sau"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCreateConceptOpen(true)}
              className="h-8 border-[#b45309]/30 bg-[#fdf0d5]/40 text-xs font-semibold text-[#92400e] hover:bg-[#b45309] hover:text-white"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Tạo Concept mới
            </Button>
          </div>
          {/* View mode switcher */}
          <div className="flex rounded-xl border border-stone-200 bg-stone-100/80 p-1">
            <button
              type="button"
              onClick={() => setViewMode("recipes")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all select-none",
                viewMode === "recipes"
                  ? "bg-white text-[#92400e] shadow-xs"
                  : "text-stone-600 hover:text-stone-900",
              )}
            >
              <UtensilsCrossed className="h-3.5 w-3.5 text-[#b45309]" />
              7 Món &amp; Giá vốn BOM
            </button>
            <button
              type="button"
              onClick={() => setViewMode("food-cost")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all select-none",
                viewMode === "food-cost"
                  ? "bg-white text-[#92400e] shadow-xs"
                  : "text-stone-600 hover:text-stone-900",
              )}
            >
              <Calculator className="h-3.5 w-3.5 text-[#b45309]" />
              Phân tích Food Cost ({actualFoodCostPct}%)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ingredients")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all select-none",
                viewMode === "ingredients"
                  ? "bg-white text-[#92400e] shadow-xs"
                  : "text-stone-600 hover:text-stone-900",
              )}
            >
              <Warehouse className="h-3.5 w-3.5 text-[#b45309]" />
              Kho ({bomData?.allIngredients.length ?? 0})
            </button>
          </div>

          {/* Cụm nút Excel tinh gọn */}
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
              className="h-8 border-stone-200 bg-white text-xs text-stone-700 hover:bg-stone-50"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5 text-stone-500" />
              Nhập Excel
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 border-stone-200 bg-white text-xs text-stone-700 hover:bg-stone-50"
            >
              <a href="/api/recipes/export">
                <Download className="mr-1.5 h-3.5 w-3.5 text-stone-500" />
                Xuất Excel
              </a>
            </Button>

            {viewMode === "ingredients" && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStockInTargetId(undefined);
                    setStockInOpen(true);
                  }}
                  className="h-8 border-[#b45309]/30 bg-[#fdf0d5]/40 text-xs font-semibold text-[#92400e] hover:bg-[#b45309] hover:text-white"
                >
                  <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                  Nhập kho
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
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
                  className="h-8 bg-[#b45309] text-xs font-medium text-white hover:bg-[#92400e]"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Thêm nguyên liệu
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetConcept2}
              disabled={resetting}
              title="Khôi phục chuẩn Concept 2"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-stone-900"
            >
              {resetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Quy đổi số khách (chỉ hiện khi xem công thức) */}
          {viewMode === "recipes" && (
            <div className="flex items-center rounded-xl border border-stone-200 bg-white p-1 shadow-2xs">
              <div className="flex items-center rounded-full border border-border bg-stone-50 p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => applyGuests(guests - 1)}
                  disabled={guests <= 1}
                  className="h-6 w-6 rounded-full text-stone-600 hover:bg-[#fdf0d5]"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-10 text-center font-heading text-xs font-bold tabular-nums text-[#92400e]">
                  {guests}k
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => applyGuests(guests + 1)}
                  disabled={guests >= MAX_SCALE_GUESTS}
                  className="h-6 w-6 rounded-full text-stone-600 hover:bg-[#fdf0d5]"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="ml-1 flex gap-0.5" role="group">
                {[1, 4, 10, 42].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => applyGuests(n)}
                    className={cn(
                      "h-6 rounded px-2 text-[10.5px] font-medium tabular-nums transition-colors",
                      guests === n
                        ? "bg-[#b45309] text-white font-bold"
                        : "text-stone-600 hover:bg-stone-100",
                    )}
                  >
                    {n === 42 ? "42 ca" : `${n}k`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Banner thông báo khi đang tinh chỉnh thực đơn tuần tiếp theo */}
      {selectedConceptId !== activeConceptId && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-bold">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-amber-950">
                Đang xem &amp; tinh chỉnh kế hoạch:{" "}
                <strong>
                  {concepts.find((c) => c.id === selectedConceptId)?.name || "Concept mới"}
                </strong>{" "}
                ({concepts.find((c) => c.id === selectedConceptId)?.startDate ? `Áp dụng từ ${concepts.find((c) => c.id === selectedConceptId)?.startDate?.split("-").reverse().join("/")}` : concepts.find((c) => c.id === selectedConceptId)?.weekLabel || "Tuần tiếp theo"})
              </p>
              <p className="text-[11px] text-amber-800">
                Bạn có thể tự do thêm món, định lượng BOM và tính toán chi phí trước mà chưa ảnh hưởng tới thực đơn đang phục vụ khách hôm nay.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={activatingConcept}
            onClick={() => handleSetActiveConcept(selectedConceptId)}
            className="h-8 shrink-0 bg-[#b45309] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#92400e]"
          >
            {activatingConcept ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang áp dụng...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Áp dụng thực đơn này (Set Active)
              </>
            )}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-[#b45309]" />
          <p className="text-sm text-muted-foreground font-heading">Đang tải công thức định lượng từ CSDL...</p>
        </div>
      ) : viewMode === "recipes" ? (
        /* ==================== VIEW 1: CÔNG THỨC 7 MÓN ==================== */
        <>
          {/* 4 CHỈ SỐ TỔNG QUAN FOOD COST & BOM */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                id: "food-cost",
                label: scaled ? `Food Cost (${guests} khách)` : "Food Cost / 1 suất",
                value: formatVND(scaled ? totalFoodCost * guests : totalFoodCost),
                sub: `${actualFoodCostPct}% giá menu 1.190.000 đ · Mục tiêu 33,5%`,
                tone: actualFoodCostPct <= 34 ? "good" : "warn",
                icon: Calculator,
              },
              {
                id: "gross-profit",
                label: scaled ? `Lãi gộp (${guests} khách)` : "Lãi gộp lý thuyết",
                value: formatVND(scaled ? grossProfit * guests : grossProfit),
                sub: `${grossProfitPct}% biên lợi nhuận gộp`,
                tone: "default",
                icon: Coins,
              },
              {
                id: "shift-capacity",
                label: "Chi phí ca 42 khách",
                value: formatVND(shift42Cost),
                sub: `Doanh thu ca: ${formatVND(shift42Revenue)}`,
                tone: "default",
                icon: Users,
              },
              {
                id: "highest-dish",
                label: "Món chi phí cao nhất",
                value: highestDish ? `Món 0${highestDish.dish.index}` : "—",
                sub: highestDish
                  ? `${highestDish.dish.name} (${formatVND(highestDish.cost)} · ${totalFoodCost > 0 ? Math.round((highestDish.cost / totalFoodCost) * 1000) / 10 : 0}%)`
                  : "—",
                tone: "default",
                icon: UtensilsCrossed,
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.id} className="border-border/80 bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-1 font-heading text-xl font-bold tabular-nums text-[#292524] sm:text-2xl">
                        {stat.value}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.sub}</p>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fdf0d5] text-[#b45309]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* CHỌN MÓN (7 THẺ TAB) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Chọn món để xem &amp; gán định lượng BOM ({bomData?.dishes.length ?? 7} món)
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCreateDishOpen(true)}
                className="h-7 text-xs border-[#b45309]/30 text-[#92400e] hover:bg-[#fdf0d5]"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Tạo món ăn mới
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {bomData?.dishes.map((dish) => {
                const menuItem = MENU_ITEMS.find((m) => m.index === dish.index);
                const isSelected = dish.index === selectedDish;
                const defaultVar = dish.variants.find((v) => v.isDefault) ?? dish.variants[0];
                return (
                  <button
                    key={dish.index}
                    type="button"
                    onClick={() => setSelectedDish(dish.index)}
                    aria-selected={isSelected}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border p-2.5 text-left transition-all",
                      isSelected
                        ? "border-[#b45309] bg-[#fffdf9] shadow-md ring-2 ring-[#b45309]/20"
                        : "border-border/80 bg-card hover:border-[#b45309]/40 hover:bg-[#fffdf9]/60",
                    )}
                  >
                    <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-900/10">
                      {menuItem?.image ? (
                        <Image
                          src={menuItem.image}
                          alt={dish.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          Món {dish.index}
                        </div>
                      )}
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold text-[#fdf0d5] backdrop-blur-xs">
                        0{dish.index}
                      </span>
                    </div>
                    <span className="line-clamp-1 font-heading text-xs font-semibold text-[#292524] group-hover:text-[#b45309]">
                      {dish.name}
                    </span>
                    <div className="mt-1 flex items-center justify-between text-[10.5px]">
                      <span className="font-heading font-bold text-[#b45309]">
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

          {/* CHI TIẾT CÔNG THỨC MÓN ĐANG CHỌN */}
          {activeDish && activeVariant && (
            <Card className="border-border/80 bg-card shadow-xs">
              <CardHeader className="border-b border-border/80 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#b45309] px-2.5 py-0.5 text-[11px] font-bold text-[#fffbf2]">
                        Món 0{activeDish.index}
                      </span>
                      {activeDish.region && (
                        <span className="text-xs font-medium text-[#b45309]">{activeDish.region}</span>
                      )}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{activeDish.portion}</span>
                      <Badge className="bg-[#b45309]/15 text-[#92400e] border border-[#b45309]/30 font-heading font-semibold text-xs px-2 py-0.5 ml-1">
                        Giá vốn món: {formatVND(activeDishCost)} / suất ({totalFoodCost > 0 ? Math.round((activeDishCost / totalFoodCost) * 1000) / 10 : 0}% Menu)
                      </Badge>
                    </div>
                    <CardTitle className="font-heading text-xl font-bold text-[#292524] sm:text-2xl">
                      {activeDish.name}
                    </CardTitle>
                    {activeDish.method && (
                      <p className="flex items-center gap-1.5 text-xs text-stone-600">
                        <CookingPot className="h-3.5 w-3.5 text-[#b45309]" />
                        <span>Kỹ thuật: {activeDish.method}</span>
                      </p>
                    )}
                  </div>

                  {/* NÚT THÊM NGUYÊN LIỆU VÀO MÓN NÀY */}
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
                      className="bg-[#b45309] text-white hover:bg-[#92400e]"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Thêm định lượng vào món
                    </Button>

                    {activeDish.index > 7 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDish(activeDish.id, activeDish.name)}
                        className="h-9 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                        title="Xóa món này khỏi thực đơn"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa món
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tùy chọn biến thể (Variant tabs) */}
                {activeDish.variants.length > 1 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-2">
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
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            isVarSelected
                              ? "border-[#b45309] bg-[#fdf0d5] text-[#92400e]"
                              : "border-border bg-background text-stone-600 hover:border-border/80",
                          )}
                        >
                          {v.optionName} {v.isDefault && "(Mặc định)"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/80 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Nguyên liệu</TableHead>
                      <TableHead>Nhóm</TableHead>
                      <TableHead className="text-right">Định lượng / khách</TableHead>
                      {scaled && (
                        <TableHead className="text-right text-[#b45309]">
                          Tổng {guests} khách
                        </TableHead>
                      )}
                      <TableHead className="text-right">Đơn giá nhập</TableHead>
                      <TableHead className="text-right text-[#b45309] font-bold">Thành tiền / suất</TableHead>
                      {scaled && (
                        <TableHead className="text-right text-[#92400e] font-bold">
                          Tổng tiền ({guests}k)
                        </TableHead>
                      )}
                      <TableHead className="w-20 text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeVariant.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={scaled ? 9 : 7} className="py-8 text-center text-sm text-muted-foreground">
                          Chưa có nguyên liệu nào trong công thức này. Hãy bấm &quot;Thêm định lượng vào món&quot;.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeVariant.lines.map((line, idx) => (
                        <TableRow key={line.id} className="hover:bg-[#fffdf9]">
                          <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-[#292524]">
                            <div>
                              <span>{line.ingredientName}</span>
                              <span className="block text-[10px] text-muted-foreground">{line.ingredientId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <GroupBadge group={line.group} />
                          </TableCell>
                          <TableCell className="text-right font-heading font-semibold text-[#292524]">
                            {formatQty(line.qtyPerGuest, line.unit)}
                          </TableCell>
                          {scaled && (
                            <TableCell className="text-right font-heading font-bold text-[#b45309]">
                              {formatQty(line.qtyTotal, line.unit)}
                            </TableCell>
                          )}
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {line.defaultImportPrice > 0 ? `${formatVND(line.defaultImportPrice)} / ${line.unit === "ml" ? "L" : "kg"}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-heading font-bold text-[#b45309] tabular-nums">
                            {formatVND(Math.round((line.qtyPerGuest * (line.defaultImportPrice || 0)) / 1000))}
                          </TableCell>
                          {scaled && (
                            <TableCell className="text-right font-heading font-bold text-[#92400e] tabular-nums">
                              {formatVND(Math.round((line.qtyTotal * (line.defaultImportPrice || 0)) / 1000))}
                            </TableCell>
                          )}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
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
                                className="h-7 w-7 text-stone-600 hover:text-[#b45309]"
                                title="Chỉnh sửa định lượng"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteLine(line.id, line.ingredientName)}
                                className="h-7 w-7 text-stone-400 hover:text-rose-600"
                                title="Xóa khỏi công thức"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  <TableFooter className="bg-[#fdf0d5]/40 font-heading">
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold text-[#92400e]">
                        Tổng cộng một suất ({activeVariant.optionName}):
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#92400e]">
                        {formatTotals(activeVariant.totalsPerGuest)}
                      </TableCell>
                      {scaled && (
                        <TableCell className="text-right font-bold text-[#92400e]">
                          {formatTotals(activeVariant.totalsForGuests)}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-xs font-sans text-muted-foreground">
                        Giá vốn món:
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#b45309] tabular-nums">
                        {formatVND(activeDishCost)}
                      </TableCell>
                      {scaled && (
                        <TableCell className="text-right font-bold text-[#92400e] tabular-nums">
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
      ) : viewMode === "food-cost" ? (
        /* ==================== VIEW: PHÂN TÍCH FOOD COST 33,5% ==================== */
        <div className="space-y-4">
          {/* Card so sánh đối chiếu mục tiêu 33,5% */}
          <Card className="border-border/80 bg-card shadow-xs">
            <CardHeader className="border-b border-border/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="font-heading text-lg font-bold text-[#292524] flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-[#b45309]" />
                    Đối chiếu Food Cost thực tế vs Mục tiêu 33,5%
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Giá bán menu Tasting: {formatVND(MENU_SELLING_PRICE)} · Trần chi phí chuẩn: {formatVND(TARGET_FOOD_COST_VND)} / khách
                  </p>
                </div>
                <Badge
                  className={cn(
                    "text-xs px-2.5 py-1 font-heading font-semibold self-start sm:self-auto",
                    actualFoodCostPct <= 33.5
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 text-white"
                  )}
                >
                  {actualFoodCostPct <= 33.5
                    ? `Đạt chuẩn tối ưu (${actualFoodCostPct}% ≤ 33,5%)`
                    : `Vượt ngưỡng mục tiêu (+${(actualFoodCostPct - 33.5).toFixed(1)}%)`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Thanh tiến trình đo Food Cost */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5 text-stone-700">
                  <span>Tỷ lệ giá vốn thực tế: <strong className="text-[#b45309]">{actualFoodCostPct}%</strong></span>
                  <span>Mục tiêu chuẩn: <strong className="text-emerald-700">33,5%</strong></span>
                </div>
                <div className="h-3 w-full rounded-full bg-stone-100 overflow-hidden relative border border-border">
                  <div
                    style={{ width: `${Math.min(100, (actualFoodCostPct / 50) * 100)}%` }}
                    className={cn(
                      "h-full transition-all duration-500",
                      actualFoodCostPct <= 33.5 ? "bg-emerald-600" : "bg-amber-500"
                    )}
                  />
                  <div
                    style={{ left: `${(33.5 / 50) * 100}%` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-600 z-10"
                    title="Ngưỡng mục tiêu 33,5%"
                  />
                </div>
              </div>

              {/* Bảng phân bổ cơ cấu 7 nhóm nguyên liệu */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                  Cơ cấu giá vốn theo 7 nhóm nguyên liệu
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {groupCostSummary.map((g) => (
                    <div key={g.group} className="rounded-xl border border-border/70 bg-stone-50/50 p-2.5">
                      <div className="text-[10.5px] font-medium text-stone-600 truncate">{g.label}</div>
                      <div className="mt-1 font-heading text-sm font-bold text-[#92400e]">{formatVND(g.cost)}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{g.share}% tổng vốn</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bảng xếp hạng giá vốn 7 món Tasting từ cao đến thấp */}
          <Card className="border-border/80 bg-card shadow-xs">
            <CardHeader className="border-b border-border/80 pb-3">
              <CardTitle className="font-heading text-base font-bold text-[#292524] flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-[#b45309]" />
                Bảng xếp hạng Giá vốn 7 món Tasting
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/80 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    <TableHead className="w-16 text-center">STT</TableHead>
                    <TableHead>Tên món ăn</TableHead>
                    <TableHead className="text-right">Giá vốn / suất</TableHead>
                    <TableHead className="text-right">Tỷ trọng Food Cost</TableHead>
                    <TableHead className="text-right">Doanh thu / Ca 42k</TableHead>
                    <TableHead className="text-center w-28">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomData?.dishes.map((dish) => {
                    const cost = dishCostMap.get(dish.index) || 0;
                    const share = totalFoodCost > 0 ? Math.round((cost / totalFoodCost) * 1000) / 10 : 0;
                    return (
                      <TableRow key={dish.index} className="hover:bg-[#fffdf9]">
                        <TableCell className="text-center font-bold text-[#b45309]">Món 0{dish.index}</TableCell>
                        <TableCell className="font-medium text-[#292524]">
                          <div>
                            <span className="font-bold">{dish.name}</span>
                            <span className="block text-[10.5px] text-muted-foreground">{dish.region}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-heading font-bold text-[#b45309]">
                          {formatVND(cost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-stone-700">
                          {share}%
                        </TableCell>
                        <TableCell className="text-right font-heading text-xs tabular-nums text-stone-600">
                          {formatVND(cost * 42)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDish(dish.index);
                              setViewMode("recipes");
                            }}
                            className="h-7 text-xs border-[#b45309]/30 text-[#92400e] hover:bg-[#fdf0d5]"
                          >
                            Xem BOM
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter className="bg-[#fdf0d5]/40 font-heading">
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold text-[#92400e]">
                      Tổng giá vốn 7 món Tasting hoàn chỉnh:
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#b45309]">
                      {formatVND(totalFoodCost)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#92400e]">
                      {actualFoodCostPct}% menu
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#92400e]">
                      {formatVND(shift42Cost)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ==================== VIEW 2: KHO NGUYÊN LIỆU ==================== */
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-heading text-lg font-bold text-[#292524]">
                  Danh mục Nguyên liệu Kho CSDL ({bomData?.allIngredients.length ?? 0} loại)
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Quản lý tồn kho thực tế, ngưỡng an toàn và đơn giá nhập tham chiếu
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Tìm tên hoặc mã nguyên liệu..."
                    value={ingSearch}
                    onChange={(e) => setIngSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Select
                  value={ingGroupFilter}
                  onValueChange={(val) => setIngGroupFilter(val as any)}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Tất cả nhóm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả nhóm</SelectItem>
                    {INGREDIENT_GROUP_ORDER.map((g) => (
                      <SelectItem key={g} value={g}>
                        {INGREDIENT_GROUP_LABELS[g]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={ingStockFilter}
                  onValueChange={(val) => setIngStockFilter(val as any)}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Tất cả tồn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả tồn kho</SelectItem>
                    <SelectItem value="LOW_STOCK">Sắp hết (Dưới ngưỡng)</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Hết hàng (Tồn = 0)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStockInTargetId(undefined);
                    setStockInOpen(true);
                  }}
                  className="h-8 border-[#b45309]/30 bg-[#fdf0d5]/40 text-xs font-semibold text-[#92400e] hover:bg-[#b45309] hover:text-white"
                >
                  <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                  Nhập kho
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
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
                  className="h-8 bg-[#b45309] text-white hover:bg-[#92400e]"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Thêm mới
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/80 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Tên nguyên liệu / Mã</TableHead>
                  <TableHead>Nhóm</TableHead>
                  <TableHead className="text-right">Tồn kho / Ngưỡng</TableHead>
                  <TableHead className="text-right">Đơn giá nhập (VND)</TableHead>
                  <TableHead className="w-24 text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllIngredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Không tìm thấy nguyên liệu nào trong kho.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedIngredients.map((ing, idx) => {
                    const isLow = ing.currentStock <= ing.minStock && ing.currentStock > 0;
                    const isOut = ing.currentStock <= 0;
                    const itemIndex = (ingPage - 1) * ING_PAGE_SIZE + idx + 1;
                    return (
                      <TableRow key={ing.id} className="hover:bg-[#fffdf9]">
                        <TableCell className="text-center text-xs text-muted-foreground">{itemIndex}</TableCell>
                        <TableCell className="font-medium text-[#292524]">
                          <div>
                            <span className="font-semibold">{ing.name}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono">{ing.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <GroupBadge group={ing.group as IngredientGroup} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-heading font-semibold text-xs text-[#292524]">
                            {formatQty(ing.currentStock, ing.unit as any)}
                          </div>
                          <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                            <span>Ngưỡng: {formatQty(ing.minStock, ing.unit as any)}</span>
                            {isOut ? (
                              <Badge variant="destructive" className="px-1.5 py-0 text-[9px]">Hết</Badge>
                            ) : isLow ? (
                              <Badge className="bg-amber-500 text-white px-1.5 py-0 text-[9px]">Sắp hết</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-heading text-xs tabular-nums text-[#292524]">
                          {ing.defaultImportPrice > 0
                            ? `${formatVND(ing.defaultImportPrice)} / ${ing.unit === "ml" ? "L" : "kg"}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setStockInTargetId(ing.id);
                                setStockInOpen(true);
                              }}
                              className="h-7 w-7 text-[#b45309] hover:bg-[#fdf0d5] hover:text-[#92400e]"
                              title={`Nhập hàng vào kho cho ${ing.name}`}
                            >
                              <ArrowDownToLine className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingIng({
                                  id: ing.id,
                                  name: ing.name,
                                  unit: ing.unit,
                                  group: ing.group,
                                  spec: ing.spec || "",
                                  defaultImportPrice: ing.defaultImportPrice,
                                  currentStock: ing.currentStock,
                                  minStock: ing.minStock,
                                });
                                setIngModalOpen(true);
                              }}
                              className="h-7 w-7 text-stone-600 hover:text-[#b45309]"
                              title="Sửa thông tin nguyên liệu"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                              className="h-7 w-7 text-stone-400 hover:text-rose-600"
                              title="Xóa nguyên liệu khỏi CSDL"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Phân trang giới hạn 20 dòng / trang */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/80 px-4 py-3 bg-muted/20 text-xs text-muted-foreground">
            <div>
              Hiển thị{" "}
              <strong className="text-stone-800">
                {filteredAllIngredients.length === 0 ? 0 : (ingPage - 1) * ING_PAGE_SIZE + 1}
              </strong>{" "}
              –{" "}
              <strong className="text-stone-800">
                {Math.min(ingPage * ING_PAGE_SIZE, filteredAllIngredients.length)}
              </strong>{" "}
              trong tổng số{" "}
              <strong className="text-stone-800">{filteredAllIngredients.length}</strong> nguyên liệu (giới hạn 20 dòng / trang)
            </div>

            {ingTotalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ingPage <= 1}
                  onClick={() => setIngPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2.5 text-xs text-stone-700"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Trước
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: ingTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setIngPage(p)}
                      className={cn(
                        "h-7 w-7 rounded-md text-xs font-semibold transition-colors",
                        ingPage === p
                          ? "bg-[#b45309] text-white"
                          : "text-stone-600 hover:bg-muted"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ingPage >= ingTotalPages}
                  onClick={() => setIngPage((p) => Math.min(ingTotalPages, p + 1))}
                  className="h-7 px-2.5 text-xs text-stone-700"
                >
                  Sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ==================== DIALOG TẠO MÓN ĂN MỚI ==================== */}
      <Dialog open={createDishOpen} onOpenChange={setCreateDishOpen}>
        <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-lg">
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
                  Lưu vào CSDL
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 2: THÊM / SỬA NGUYÊN LIỆU KHO ==================== */}
      <Dialog open={ingModalOpen} onOpenChange={setIngModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-[#292524]">
              {editingIng.id ? "Chỉnh sửa nguyên liệu kho" : "Thêm nguyên liệu mới vào kho"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Nguyên liệu được lưu vào bảng `Ingredient` và dùng chung cho toàn bộ 7 món tasting.
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
                Lưu vào CSDL
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 3: PREVIEW & NHẬP EXCEL ==================== */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
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
                              <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
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
                                <span className="text-[10px] font-mono text-muted-foreground">{r.group}</span>
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
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang lưu vào CSDL...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Xác nhận lưu {previewStats.valid} dòng vào CSDL
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PHIẾU NHẬP HÀNG VÀO KHO */}
      <StockInModal
        open={stockInOpen}
        onOpenChange={setStockInOpen}
        initialIngredientId={stockInTargetId}
        onSuccess={() => loadBom(guests, true, selectedConceptId)}
      />

      {/* MODAL TẠO CONCEPT THỰC ĐƠN TUẦN MỚI */}
      <CreateConceptModal
        open={createConceptOpen}
        onOpenChange={setCreateConceptOpen}
        existingConcepts={concepts}
        currentActiveId={activeConceptId}
        onSuccess={async (newId) => {
          setSelectedConceptId(newId);
          await loadConcepts();
          await loadBom(guests, true, newId);
        }}
      />
    </div>
  );
}
