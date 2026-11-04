"use client";

// FR-27 — Định lượng công thức (BOM) động kết nối SQLite CSDL
// Hỗ trợ quy đổi số khách, CRUD nguyên liệu & dòng định lượng, Import/Export Excel.
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft,
  ChefHat,
  ClipboardList,
  CookingPot,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Trash2,
  Upload,
  Users,
  UtensilsCrossed,
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
import type { BomResponse, ResolvedDishRecipe, ResolvedRecipeLine } from "@/lib/tram/recipes-server";
import { toast } from "sonner";
import { formatVND } from "@/lib/tram/format";

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
  const [guests, setGuests] = useState(1);
  const [guestsInput, setGuestsInput] = useState("1");
  const [selectedDish, setSelectedDish] = useState(1);
  const [variantByDish, setVariantByDish] = useState<Record<number, string>>({});
  const [summarySearch, setSummarySearch] = useState("");
  const [summaryGroup, setSummaryGroup] = useState<IngredientGroup | "ALL">("ALL");

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
  }>({
    name: "",
    unit: "g",
    group: "PROTEIN",
    spec: "",
    defaultImportPrice: 100000,
  });
  const [submittingIng, setSubmittingIng] = useState(false);

  // Modal Import Excel
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const summaryByGroup = useMemo(
    () =>
      INGREDIENT_GROUP_ORDER.map((group) => ({
        group,
        items: filteredSummary.filter((a) => a.group === group),
      })).filter((g) => g.items.length > 0),
    [filteredSummary],
  );

  const filteredTotals = useMemo(
    () => ({
      perGuest: {
        g: Number(filteredSummary.filter((a) => a.unit === "g").reduce((s, a) => s + a.qtyPerGuest, 0).toFixed(2)),
        ml: Number(filteredSummary.filter((a) => a.unit === "ml").reduce((s, a) => s + a.qtyPerGuest, 0).toFixed(2)),
      },
      total: {
        g: Number(filteredSummary.filter((a) => a.unit === "g").reduce((s, a) => s + a.qtyTotal, 0).toFixed(2)),
        ml: Number(filteredSummary.filter((a) => a.unit === "ml").reduce((s, a) => s + a.qtyTotal, 0).toFixed(2)),
      },
    }),
    [filteredSummary],
  );

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

  // Lưu nguyên liệu mới
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
      toast.success("Đã thêm/sửa nguyên liệu thành công!");
      setIngModalOpen(false);
      setEditingIng({
        name: "",
        unit: "g",
        group: "PROTEIN",
        spec: "",
        defaultImportPrice: 100000,
      });
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingIng(false);
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

  // Nhập dữ liệu từ Excel
  async function handleImportExcel(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Vui lòng chọn file Excel .xlsx");
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
        toast.warning(`Đã nhập ${data.insertedLines} dòng, nhưng có ${data.errors.length} dòng cảnh báo.`);
      } else {
        toast.success(`Nhập thành công ${data.insertedLines} dòng định lượng vào CSDL!`);
      }
      setImportModalOpen(false);
      setSelectedFile(null);
      await loadBom(guests, true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  }

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
            Định lượng công thức (BOM)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Quản trị công thức 7 món Concept 2 · Nhập/xuất Excel · Đồng bộ CSDL trực tiếp
          </p>
        </div>

        {/* CÁC NÚT TÁC VỤ EXCEL & CSDL */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tải mẫu Excel */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 border-[#b45309]/30 bg-background text-[#92400e] hover:bg-[#fdf0d5] hover:text-[#78350f]"
          >
            <a href="/api/recipes/export?template=1" download="Mau_Nhap_Cong_Thuc_BOM_TRAM.xlsx">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Tải file mẫu Excel
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

          {/* Nhập Excel */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
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
            onClick={() => setIngModalOpen(true)}
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
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-[#b45309]" />
          <p className="text-sm text-muted-foreground font-heading">Đang tải công thức định lượng từ CSDL...</p>
        </div>
      ) : (
        <>
          {/* ==================== 2. CHỈ SỐ TỔNG QUAN ==================== */}
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

          {/* ==================== 3. CHỌN MÓN (7 THẺ TAB) ==================== */}
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

          {/* ==================== 4. CHI TIẾT CÔNG THỨC MÓN ĐANG CHỌN ==================== */}
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
                        setEditingLine({
                          variantId: activeVariant.id,
                          ingredientId: bomData?.allIngredients[0]?.id ?? "",
                          qtyPerGuest: 10,
                          unit: "g",
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

          {/* ==================== 5. BẢNG TỔNG HỢP NGUYÊN LIỆU TOÀN MENU ==================== */}
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
                      {formatTotals(filteredTotals.perGuest)}
                    </TableCell>
                    {scaled && (
                      <TableCell className="text-right font-bold text-[#92400e]">
                        {formatTotals(filteredTotals.total)}
                      </TableCell>
                    )}
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ==================== DIALOG 1: THÊM / SỬA DÒNG ĐỊNH LƯỢNG ==================== */}
      <Dialog open={lineModalOpen} onOpenChange={setLineModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {editingLine?.id ? "Chỉnh sửa dòng định lượng" : "Thêm định lượng vào món"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Món: {activeDish?.name} · Biến thể: {activeVariant?.optionName}
            </DialogDescription>
          </DialogHeader>

          {editingLine && (
            <form onSubmit={handleSaveLine} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nguyên liệu</Label>
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
                          }
                        : null,
                    );
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Chọn nguyên liệu..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {bomData?.allIngredients.map((i) => (
                      <SelectItem key={i.id} value={i.id} className="text-xs">
                        {i.name} ({i.unit}) · {i.groupLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Định lượng / 1 khách</Label>
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
                    className="text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Đơn vị</Label>
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
                      <SelectItem value="g">Gram (g)</SelectItem>
                      <SelectItem value="ml">Mililit (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ghi chú sơ chế / cân đo (tùy chọn)</Label>
                <Input
                  placeholder="Vd: Phi lê bỏ da, nướng than 5 phút..."
                  value={editingLine.prepNote}
                  onChange={(e) =>
                    setEditingLine((prev) => (prev ? { ...prev, prepNote: e.target.value } : null))
                  }
                  className="text-xs"
                />
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
                  Lưu định lượng
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 2: THÊM NGUYÊN LIỆU VÀO KHO ==================== */}
      <Dialog open={ingModalOpen} onOpenChange={setIngModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Thêm nguyên liệu mới vào kho</DialogTitle>
            <DialogDescription className="text-xs">
              Nguyên liệu mới sẽ được lưu vào CSDL SQLite và có thể dùng cho bất kỳ công thức món nào.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveIngredient} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tên nguyên liệu *</Label>
              <Input
                placeholder="Vd: Nấm Matsutake tươi..."
                required
                value={editingIng.name}
                onChange={(e) => setEditingIng((prev) => ({ ...prev, name: e.target.value }))}
                className="text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nhóm nguyên liệu *</Label>
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
                <Label className="text-xs">Đơn vị đo *</Label>
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
              <Label className="text-xs">Quy cách / Đóng gói / Trạng thái</Label>
              <Input
                placeholder="Vd: Sơ chế sạch, đóng hộp 500g..."
                value={editingIng.spec}
                onChange={(e) => setEditingIng((prev) => ({ ...prev, spec: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Đơn giá nhập ước tính (VND / kg hoặc Lít)</Label>
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

      {/* ==================== DIALOG 3: NHẬP EXCEL ==================== */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Nhập công thức BOM từ Excel</DialogTitle>
            <DialogDescription className="text-xs">
              Tải lên file Excel (.xlsx) để cập nhật hoặc thêm mới toàn bộ định lượng 7 món vào CSDL SQLite.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleImportExcel} className="space-y-4 py-2">
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-2 text-xs font-semibold text-[#292524]">
                {selectedFile ? selectedFile.name : "Kéo thả hoặc chọn file .xlsx từ máy tính"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Định dạng chuẩn 12 cột tương thích file mẫu của hệ thống
              </p>

              <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-background px-4 py-2 text-xs font-semibold text-[#b45309] border border-[#b45309]/40 shadow-xs hover:bg-[#fdf0d5]">
                <span>{selectedFile ? "Đổi file khác" : "Chọn file Excel"}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                />
              </label>
            </div>

            <div className="rounded-xl bg-[#fdf0d5]/40 border border-[#b45309]/20 p-3 text-[11px] text-[#78350f]">
              <p className="font-semibold">Mẹo trước khi nhập:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-stone-600">
                <li>Nếu chưa có file, hãy tải trước file mẫu qua nút &quot;Tải file mẫu Excel&quot;.</li>
                <li>Hệ thống sẽ tự động cập nhật nguyên liệu cũ và tạo mới nếu chưa có.</li>
                <li>Các dòng định lượng trùng món &amp; nguyên liệu sẽ được ghi đè định lượng mới.</li>
              </ul>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportModalOpen(false);
                  setSelectedFile(null);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={importing || !selectedFile}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {importing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                Xác nhận nhập vào CSDL
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
