"use client";

// FR-27 — Quản trị Định lượng công thức (BOM) & Kho nguyên liệu kết nối CSDL SQLite
// Tính năng: Quản lý 7 món Tasting, Quản lý kho nguyên liệu, Preview & Import/Export Excel, CRUD định lượng.
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChefHat,
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
import { formatVND } from "@/lib/tram/format";
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

type ViewMode = "recipes" | "ingredients";

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

  // Kho nguyên liệu: tìm kiếm & lọc
  const [ingSearch, setIngSearch] = useState("");
  const [ingGroupFilter, setIngGroupFilter] = useState<IngredientGroup | "ALL">("ALL");
  const [ingStockFilter, setIngStockFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");

  // Dữ liệu từ API
  const [bomData, setBomData] = useState<BomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Tải dữ liệu từ API
  const loadBom = useCallback(async (g: number = guests, silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      const res = await fetch(`/api/recipes?guests=${g}`);
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
  }, [guests]);

  useEffect(() => {
    loadBom(guests);
  }, [guests, loadBom]);

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
  const activeDish = useMemo(() => {
    if (!bomData) return null;
    return bomData.dishes.find((d) => d.index === selectedDish) ?? bomData.dishes[0];
  }, [bomData, selectedDish]);

  // Biến thể đang chọn của món
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

  // Lưu dòng định lượng
  async function handleSaveLine(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLine) return;
    try {
      setSubmittingLine(true);
      const res = await fetch("/api/recipes/lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLine),
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
      const res = await fetch(`/api/recipes/lines?id=${lineId}`, { method: "DELETE" });
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
              Bếp &amp; kho · CSDL SQLite
            </span>
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
            Quản trị 7 món Concept 2 · Nhập/xuất Excel có bảng xem trước · Đồng bộ CSDL trực tiếp
          </p>
        </div>

        {/* NÚT CHUYỂN CHẾ ĐỘ XEM + TÁC VỤ EXCEL */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode switcher */}
          <div className="flex rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("recipes")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "recipes"
                  ? "bg-background text-[#b45309] shadow-xs font-bold"
                  : "text-muted-foreground hover:text-stone-900",
              )}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Công thức 7 món
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ingredients")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "ingredients"
                  ? "bg-background text-[#b45309] shadow-xs font-bold"
                  : "text-muted-foreground hover:text-stone-900",
              )}
            >
              <Warehouse className="h-3.5 w-3.5" />
              Kho nguyên liệu ({bomData?.allIngredients.length ?? 0})
            </button>
          </div>

          {/* Tải mẫu Excel */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 border-[#b45309]/30 bg-background text-[#92400e] hover:bg-[#fdf0d5] hover:text-[#78350f]"
          >
            <a href="/api/recipes/export?template=1" download="Mau_Nhap_Cong_Thuc_BOM_TRAM.xlsx">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Tải mẫu Excel
            </a>
          </Button>

          {/* Xuất file Excel đầy đủ */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 border-stone-300 bg-background text-stone-700 hover:bg-stone-100"
          >
            <a href="/api/recipes/export">
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Xuất Excel CSDL
            </a>
          </Button>

          {/* Nhập Excel (Mở dialog Preview) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedFile(null);
              setPreviewRows([]);
              setImportModalOpen(true);
            }}
            className="h-9 border-emerald-600/30 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Nhập từ Excel
          </Button>

          {/* Thêm nguyên liệu mới */}
          <Button
            type="button"
            variant="outline"
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
            className="h-9 border-amber-600/30 bg-amber-50 text-amber-900 hover:bg-amber-100"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Thêm nguyên liệu
          </Button>

          {/* Khôi phục gốc Concept 2 */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetConcept2}
            disabled={resetting}
            title="Khôi phục lại toàn bộ công thức 7 món về bộ chuẩn Concept 2"
            className="h-9 text-xs text-muted-foreground hover:bg-stone-200/60 hover:text-stone-900"
          >
            {resetting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Khôi phục chuẩn
          </Button>

          {/* Quy đổi số khách */}
          {viewMode === "recipes" && (
            <div className="flex items-center rounded-2xl border border-border/80 bg-card p-1.5 shadow-xs">
              <div className="flex items-center rounded-full border border-border bg-background p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => applyGuests(guests - 1)}
                  disabled={guests <= 1}
                  aria-label="Giảm số khách"
                  className="h-7 w-7 rounded-full text-stone-700 hover:bg-[#fdf0d5] hover:text-[#92400e]"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  value={guestsInput}
                  onChange={(e) => handleGuestsInput(e.target.value)}
                  onBlur={() => applyGuests(Number(guestsInput) || 1)}
                  inputMode="numeric"
                  aria-label="Số khách quy đổi"
                  className="h-7 w-12 border-0 bg-transparent px-1 text-center font-heading text-sm font-bold tabular-nums text-[#92400e] shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => applyGuests(guests + 1)}
                  disabled={guests >= MAX_SCALE_GUESTS}
                  aria-label="Tăng số khách"
                  className="h-7 w-7 rounded-full text-stone-700 hover:bg-[#fdf0d5] hover:text-[#92400e]"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="ml-1 flex gap-1" role="group">
                {QUICK_GUESTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => applyGuests(n)}
                    aria-pressed={guests === n}
                    className={cn(
                      "h-7 rounded-full border px-2.5 text-[11px] font-medium tabular-nums transition-colors",
                      guests === n
                        ? "border-[#b45309] bg-[#b45309] text-[#fffbf2]"
                        : "border-border bg-background text-stone-600 hover:border-[#b45309]/50 hover:text-[#92400e]",
                    )}
                  >
                    {n === 42 ? "42 · đủ ca" : `${n}k`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-[#b45309]" />
          <p className="text-sm text-muted-foreground font-heading">Đang tải công thức định lượng từ CSDL...</p>
        </div>
      ) : viewMode === "recipes" ? (
        /* ==================== VIEW 1: CÔNG THỨC 7 MÓN ==================== */
        <>
          {/* 4 CHỈ SỐ TỔNG QUAN */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                id: "dishes",
                label: "Món trong menu",
                value: String(bomData?.dishes.length ?? 7),
                sub: "Tasting Concept 2",
                icon: UtensilsCrossed,
              },
              {
                id: "ingredients",
                label: "Nguyên liệu / suất",
                value: String(menuSummary.length),
                sub: "Loại nguyên liệu, phương án chuẩn",
                icon: Layers,
              },
              {
                id: "weight",
                label: scaled ? `Tổng cho ${guests} khách` : "Định lượng / khách",
                value: formatTotals(
                  scaled ? bomData?.summary.totalsForGuests : bomData?.summary.totalsPerGuest,
                ),
                sub: scaled ? `Gồm chất rắn (g) + lỏng (ml)` : "Một suất hoàn chỉnh",
                icon: Scale,
              },
              {
                id: "variants",
                label: "Tổng nguyên liệu kho",
                value: String(bomData?.allIngredients.length ?? 0),
                sub: "Đang lưu trong bảng Ingredient",
                icon: ArrowRightLeft,
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
                Chọn món để xem &amp; chỉnh sửa công thức
              </span>
              <span className="text-[11px] text-muted-foreground">
                Hiển thị {activeDish?.variants.length ?? 0} phương án chế biến
              </span>
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
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                      {defaultVar?.lines.length ?? 0} nguyên liệu
                    </span>
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
                      <TableHead>Quy cách / Sơ chế</TableHead>
                      <TableHead className="text-right">Định lượng / khách</TableHead>
                      {scaled && (
                        <TableHead className="text-right text-[#b45309]">
                          Tổng {guests} khách
                        </TableHead>
                      )}
                      <TableHead className="text-right">Đơn giá ước tính</TableHead>
                      <TableHead className="w-20 text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeVariant.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={scaled ? 8 : 7} className="py-8 text-center text-sm text-muted-foreground">
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
                          <TableCell className="text-xs text-muted-foreground">{line.prepNote || line.spec || "—"}</TableCell>
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
                      <TableCell colSpan={4} className="font-semibold text-[#92400e]">
                        Tổng định lượng một suất ({activeVariant.optionName}):
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#92400e]">
                        {formatTotals(activeVariant.totalsPerGuest)}
                      </TableCell>
                      {scaled && (
                        <TableCell className="text-right font-bold text-[#92400e]">
                          {formatTotals(activeVariant.totalsForGuests)}
                        </TableCell>
                      )}
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* BẢNG TỔNG HỢP NGUYÊN LIỆU TOÀN MENU */}
          <Card className="border-border/80 bg-card shadow-xs">
            <CardHeader className="border-b border-border/80 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="font-heading text-lg font-bold text-[#292524]">
                    Tổng hợp nguyên liệu toàn Menu ({menuSummary.length} loại)
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tính theo phương án chuẩn của 7 món · Dùng cho kế hoạch chuẩn bị ca và nhập kho
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Tìm nguyên liệu..."
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <Select
                    value={summaryGroup}
                    onValueChange={(val) => setSummaryGroup(val as any)}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
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
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/80 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Tên nguyên liệu</TableHead>
                    <TableHead>Nhóm</TableHead>
                    <TableHead>Các món sử dụng</TableHead>
                    <TableHead className="text-right">Định lượng / khách</TableHead>
                    {scaled && (
                      <TableHead className="text-right text-[#b45309]">
                        Tổng cho {guests} khách
                      </TableHead>
                    )}
                    <TableHead className="text-right">Đơn giá tham chiếu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={scaled ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">
                        Không tìm thấy nguyên liệu phù hợp với bộ lọc.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSummary.map((item, idx) => (
                      <TableRow key={item.id} className="hover:bg-[#fffdf9]">
                        <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-[#292524]">
                          <span>{item.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{item.spec || item.id}</span>
                        </TableCell>
                        <TableCell>
                          <GroupBadge group={item.group} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.dishes.map((d) => (
                              <Badge
                                key={d.dishIndex}
                                variant="secondary"
                                className="text-[10px] font-normal"
                              >
                                Món {d.dishIndex}: {formatQty(d.qty, item.unit)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-heading font-semibold text-[#292524]">
                          {formatQty(item.qtyPerGuest, item.unit)}
                        </TableCell>
                        {scaled && (
                          <TableCell className="text-right font-heading font-bold text-[#b45309]">
                            {formatQty(item.qtyTotal, item.unit)}
                          </TableCell>
                        )}
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {item.defaultImportPrice > 0
                            ? `${formatVND(item.defaultImportPrice)} / ${item.unit === "ml" ? "L" : "kg"}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter className="bg-[#fdf0d5]/40 font-heading">
                  <TableRow>
                    <TableCell colSpan={4} className="font-semibold text-[#92400e]">
                      Tổng cộng {filteredSummary.length} nguyên liệu lọc được:
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#92400e]">
                      {formatTotals(bomData?.summary.totalsPerGuest)}
                    </TableCell>
                    {scaled && (
                      <TableCell className="text-right font-bold text-[#92400e]">
                        {formatTotals(bomData?.summary.totalsForGuests)}
                      </TableCell>
                    )}
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </>
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
                  <TableHead>Quy cách sơ chế</TableHead>
                  <TableHead className="text-right">Tồn kho / Ngưỡng</TableHead>
                  <TableHead className="text-right">Đơn giá nhập (VND)</TableHead>
                  <TableHead className="w-24 text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllIngredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Không tìm thấy nguyên liệu nào trong kho.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAllIngredients.map((ing, idx) => {
                    const isLow = ing.currentStock <= ing.minStock && ing.currentStock > 0;
                    const isOut = ing.currentStock <= 0;
                    return (
                      <TableRow key={ing.id} className="hover:bg-[#fffdf9]">
                        <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-[#292524]">
                          <div>
                            <span className="font-semibold">{ing.name}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono">{ing.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <GroupBadge group={ing.group as IngredientGroup} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ing.spec || "—"}</TableCell>
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
        </Card>
      )}

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

              {/* Ghi chú sơ chế */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Quy cách sơ chế / Kỹ thuật chế biến</Label>
                <Input
                  placeholder="Vd: Phi lê bỏ da, nướng than 5 phút..."
                  value={editingLine.prepNote}
                  onChange={(e) =>
                    setEditingLine((prev) => (prev ? { ...prev, prepNote: e.target.value } : null))
                  }
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {COMMON_PREP_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() =>
                        setEditingLine((prev) => (prev ? { ...prev, prepNote: sug } : null))
                      }
                      className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-[#fdf0d5] hover:text-[#92400e]"
                    >
                      + {sug}
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
              <Label className="text-xs font-semibold">Quy cách / Đóng gói / Trạng thái</Label>
              <Input
                placeholder="Vd: Sấy khô thượng hạng, ướp lạnh 2-4°C..."
                value={editingIng.spec}
                onChange={(e) => setEditingIng((prev) => ({ ...prev, spec: e.target.value }))}
                className="text-xs"
              />
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
                          <TableHead>Sơ chế / Ghi chú</TableHead>
                          <TableHead className="w-24 text-center">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isParsingExcel ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                              <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#b45309]" />
                              Đang phân tích file Excel...
                            </TableCell>
                          </TableRow>
                        ) : previewRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
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
                              <TableCell className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                                {r.prepNote || "—"}
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
    </div>
  );
}
