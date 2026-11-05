"use client";

// Dedicated page for Concept Management & Dish Recipe Builder
// Quản lý Concept thực đơn (Thêm, Sửa, Xóa) & Trực tiếp thiết kế món ăn từ nguyên liệu kho
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  DollarSign,
  Edit3,
  Layers,
  Loader2,
  Minus,
  Percent,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Trash2,
  UtensilsCrossed,
  Warehouse,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercent, formatVND } from "@/lib/tram/format";
import {
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  INGREDIENTS,
  formatNumberVi,
  formatQty,
  type IngredientGroup,
  type IngredientUnit,
} from "@/lib/tram/recipes";
import { getEffectiveImportPrice } from "@/lib/tram/food-cost";
import { cn } from "@/lib/utils";
import { CreateConceptModal } from "./create-concept-modal";
import { EditConceptModal, type ConceptItemData } from "./edit-concept-modal";

function safeGetPrice(ingredientId: string, defaultPrice: number = 100000) {
  try {
    return getEffectiveImportPrice(ingredientId);
  } catch {
    return {
      importPrice: defaultPrice,
      importUnit: "kg" as const,
      origin: "Việt Nam",
    };
  }
}

interface ConceptsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export function AdminConceptsView({ onNavigateTab }: ConceptsViewProps) {
  const [concepts, setConcepts] = useState<ConceptItemData[]>([]);
  const [activeConceptId, setActiveConceptId] = useState<string>("concept-2");
  const [selectedConceptId, setSelectedConceptId] = useState<string>("concept-2");
  const [loading, setLoading] = useState(true);

  // Modals for Concept CRUD
  const [createConceptOpen, setCreateConceptOpen] = useState(false);
  const [editConceptOpen, setEditConceptOpen] = useState(false);
  const [conceptToEdit, setConceptToEdit] = useState<ConceptItemData | null>(null);
  const [deleteConceptTarget, setDeleteConceptTarget] = useState<ConceptItemData | null>(null);
  const [deletingConcept, setDeletingConcept] = useState(false);
  const [activatingConcept, setActivatingConcept] = useState(false);

  // Modals for Dish CRUD in Concept
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [dishModalMode, setDishModalMode] = useState<"create" | "edit">("create");
  const [editingDish, setEditingDish] = useState<any | null>(null);
  const [deleteDishTarget, setDeleteDishTarget] = useState<any | null>(null);

  // Dish form state
  const [dishName, setDishName] = useState("");
  const [dishRegion, setDishRegion] = useState("");
  const [dishPortion, setDishPortion] = useState("1 khách");
  const [dishMethod, setDishMethod] = useState("");
  const [dishNote, setDishNote] = useState("");
  const [submittingDish, setSubmittingDish] = useState(false);

  // Modal for Ingredient Line CRUD
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [targetDishForLine, setTargetDishForLine] = useState<any | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [lineQty, setLineQty] = useState("");
  const [lineUnit, setLineUnit] = useState<IngredientUnit>("g");
  const [linePrepNote, setLinePrepNote] = useState("");
  const [submittingLine, setSubmittingLine] = useState(false);

  // Danh mục nguyên liệu đã có sẵn trong kho (tự động đồng bộ với kho và CSDL)
  const [warehouseIngredients, setWarehouseIngredients] = useState<any[]>(() => {
    return INGREDIENTS.map((ing) => {
      const priceInfo = safeGetPrice(ing.id, 100000);
      return {
        id: ing.id,
        name: ing.name,
        group: ing.group,
        groupLabel: INGREDIENT_GROUP_LABELS[ing.group],
        unit: ing.unit,
        spec: ing.spec,
        importPrice: priceInfo.importPrice,
        importUnit: priceInfo.importUnit,
        origin: priceInfo.origin,
      };
    }).sort((a, b) => {
      const gA = INGREDIENT_GROUP_ORDER.indexOf(a.group);
      const gB = INGREDIENT_GROUP_ORDER.indexOf(b.group);
      return gA - gB || a.name.localeCompare(b.name, "vi");
    });
  });

  const loadWarehouseIngredients = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const inv = await res.json();
        if (inv?.items && Array.isArray(inv.items)) {
          const list = inv.items.map((i: any) => ({
            id: i.ingredientId,
            name: i.name,
            group: i.group,
            groupLabel: INGREDIENT_GROUP_LABELS[i.group as IngredientGroup] || i.group,
            unit: i.unit,
            spec: i.spec,
            importPrice: i.importPrice,
            importUnit: i.importUnit,
            origin: i.origin,
            currentStock: i.stockQty,
          })).sort((a: any, b: any) => {
            const gA = INGREDIENT_GROUP_ORDER.indexOf(a.group);
            const gB = INGREDIENT_GROUP_ORDER.indexOf(b.group);
            return gA - gB || a.name.localeCompare(b.name, "vi");
          });
          setWarehouseIngredients(list);
        }
      }
    } catch (e) {
      console.warn("Could not load warehouse ingredients:", e);
    }
  }, []);

  // Load all concepts from server
  const loadConcepts = useCallback(async () => {
    try {
      setLoading(true);
      const [res] = await Promise.all([
        fetch("/api/recipes/concepts"),
        loadWarehouseIngredients(),
      ]);
      if (res.ok) {
        const data = await res.json();
        setConcepts(data.concepts || []);
        setActiveConceptId(data.activeId || "concept-2");
      }
    } catch (e) {
      toast.error("Không thể tải danh sách Concept.");
    } finally {
      setLoading(false);
    }
  }, [loadWarehouseIngredients]);

  useEffect(() => {
    void loadConcepts();
  }, [loadConcepts]);

  // Concept currently selected
  const selectedConcept = useMemo(
    () => concepts.find((c) => c.id === selectedConceptId) || concepts[0] || null,
    [concepts, selectedConceptId],
  );

  // Tính toán Food Cost cho concept đang chọn
  const conceptCostStats = useMemo(() => {
    if (!selectedConcept || !selectedConcept.dishes || selectedConcept.dishes.length === 0) {
      return {
        totalCost: 0,
        sellingPrice: selectedConcept?.sellingPrice || 1190000,
        actualCostPct: 0,
        targetCostPct: selectedConcept?.targetFoodCostPct || 33.5,
        dishCosts: {} as Record<number, number>,
      };
    }

    const dishCosts: Record<number, number> = {};
    let totalCost = 0;

    for (const d of selectedConcept.dishes) {
      let dCost = 0;
      const defVariant = d.variants?.find((v: any) => v.isDefault) || d.variants?.[0];
      if (defVariant && Array.isArray(defVariant.lines)) {
        for (const l of defVariant.lines) {
          const priceInfo = safeGetPrice(l.ingredientId, l.defaultImportPrice || 100000);
          const factor = priceInfo.importUnit === "kg" || priceInfo.importUnit === "l" ? 1000 : 1;
          const cost = Math.round((l.qtyPerGuest * priceInfo.importPrice) / factor);
          dCost += cost;
        }
      }
      dishCosts[d.index] = dCost;
      totalCost += dCost;
    }

    const sellingPrice = selectedConcept.sellingPrice || 1190000;
    const actualCostPct = sellingPrice > 0 ? Number(((totalCost / sellingPrice) * 100).toFixed(1)) : 0;

    return {
      totalCost,
      sellingPrice,
      actualCostPct,
      targetCostPct: selectedConcept.targetFoodCostPct || 33.5,
      dishCosts,
    };
  }, [selectedConcept]);

  // Set active concept
  const handleSetActiveConcept = async (cId: string) => {
    try {
      setActivatingConcept(true);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-active", conceptId: cId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi kích hoạt concept.");

      toast.success(data.message || "Đã kích hoạt concept làm thực đơn chính thức!");
      await loadConcepts();
      setActiveConceptId(cId);
    } catch (err: any) {
      toast.error(err.message || "Không thể kích hoạt Concept.");
    } finally {
      setActivatingConcept(false);
    }
  };

  // Delete concept
  const handleConfirmDeleteConcept = async () => {
    if (!deleteConceptTarget) return;
    try {
      setDeletingConcept(true);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", conceptId: deleteConceptTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xóa concept.");

      toast.success(data.message || `Đã xóa "${deleteConceptTarget.name}" thành công!`);
      setDeleteConceptTarget(null);
      setSelectedConceptId(activeConceptId);
      await loadConcepts();
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa Concept.");
    } finally {
      setDeletingConcept(false);
    }
  };

  // Save dish (Create or Update)
  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConcept) return;
    if (!dishName.trim()) {
      toast.warning("Vui lòng nhập tên món ăn.");
      return;
    }

    try {
      setSubmittingDish(true);
      const isEdit = dishModalMode === "edit" && editingDish;
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dish-or-line",
          conceptId: selectedConcept.id,
          subAction: isEdit ? "update-dish" : "create-dish",
          payload: {
            index: isEdit ? editingDish.index : undefined,
            name: dishName.trim(),
            region: dishRegion.trim(),
            portion: dishPortion.trim(),
            method: dishMethod.trim(),
            note: dishNote.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi lưu món ăn.");

      toast.success(isEdit ? `Đã cập nhật món "${dishName}"!` : `Đã thêm món "${dishName}" vào Concept!`);
      setDishModalOpen(false);
      await loadConcepts();
    } catch (err: any) {
      toast.error(err.message || "Không thể lưu món ăn.");
    } finally {
      setSubmittingDish(false);
    }
  };

  // Delete dish
  const handleConfirmDeleteDish = async () => {
    if (!selectedConcept || !deleteDishTarget) return;
    try {
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dish-or-line",
          conceptId: selectedConcept.id,
          subAction: "delete-dish",
          payload: { index: deleteDishTarget.index },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xóa món ăn.");

      toast.success(`Đã xóa món "${deleteDishTarget.name}" khỏi Concept!`);
      setDeleteDishTarget(null);
      await loadConcepts();
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa món ăn.");
    }
  };

  // Save ingredient line into dish
  const handleSaveLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConcept || !targetDishForLine) return;
    if (!selectedIngredientId) {
      toast.warning("Vui lòng chọn một nguyên liệu từ kho.");
      return;
    }
    const numQty = Number(lineQty);
    if (!numQty || numQty <= 0) {
      toast.warning("Vui lòng nhập định lượng hợp lệ (> 0).");
      return;
    }

    try {
      setSubmittingLine(true);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dish-or-line",
          conceptId: selectedConcept.id,
          subAction: "save-line",
          payload: {
            dishIndex: targetDishForLine.index,
            ingredientId: selectedIngredientId,
            qtyPerGuest: numQty,
            unit: lineUnit,
            prepNote: linePrepNote.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi gán nguyên liệu.");

      const ingObj = warehouseIngredients.find((i) => i.id === selectedIngredientId);
      toast.success(`Đã gán định lượng "${ingObj?.name || selectedIngredientId}" vào món!`);
      setLineModalOpen(false);
      setSelectedIngredientId("");
      setLineQty("");
      setLinePrepNote("");
      await loadConcepts();
    } catch (err: any) {
      toast.error(err.message || "Không thể gán nguyên liệu.");
    } finally {
      setSubmittingLine(false);
    }
  };

  // Delete ingredient line
  const handleDeleteLine = async (dishIndex: number, lineId: string) => {
    if (!selectedConcept) return;
    try {
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dish-or-line",
          conceptId: selectedConcept.id,
          subAction: "delete-line",
          payload: { dishIndex, lineId },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xóa dòng định lượng.");

      toast.success("Đã gỡ nguyên liệu khỏi món ăn.");
      await loadConcepts();
    } catch (err: any) {
      toast.error(err.message || "Không thể gỡ nguyên liệu.");
    }
  };

  // Format date period
  const formatPeriod = (c: ConceptItemData) => {
    if (c.startDate && c.endDate) {
      const s = c.startDate.split("-").reverse().join("/");
      const e = c.endDate.split("-").reverse().join("/");
      return `${s} - ${e}`;
    }
    if (c.startDate) return `Từ ${c.startDate.split("-").reverse().join("/")}`;
    return c.weekLabel || "Kế hoạch tuần";
  };

  return (
    <div className="space-y-6 pb-12 font-heading">
      {/* ==================== 1. HEADER TRANG CONCEPT THỰC ĐƠN ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
              Bếp &amp; kho
            </span>
          </div>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Concept Thực đơn &amp; Thiết kế món ăn
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tạo mới, chỉnh sửa, xóa Concept và xây dựng công thức món ăn từ {warehouseIngredients.length || "các"} nguyên liệu trong kho.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <Button
            type="button"
            size="sm"
            onClick={() => setCreateConceptOpen(true)}
            className="h-9 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold text-xs shadow-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Tạo Concept mới
          </Button>
        </div>
      </div>

      {/* ==================== 2. DANH SÁCH THẺ CONCEPT (TỔNG QUAN & LỰA CHỌN) ==================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-bold text-stone-800 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#b45309]" />
            Danh sách Concept ({concepts.length})
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Bấm vào Concept để xem và tinh chỉnh món ăn bên dưới
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {concepts.map((c) => {
            const isActive = c.id === activeConceptId;
            const isSelected = c.id === selectedConceptId;
            const dishCount = c.dishes?.length || 0;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedConceptId(c.id)}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 transition-all relative flex flex-col justify-between space-y-3 shadow-xs",
                  isSelected
                    ? "border-[#b45309] bg-gradient-to-b from-[#fffbf2] to-white ring-2 ring-[#b45309]/30"
                    : "border-border/80 bg-card hover:border-[#b45309]/50 hover:bg-[#fdf0d5]/20",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-heading text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {c.code || "Concept"}
                    </span>
                    {isActive ? (
                      <Badge className="bg-emerald-700 text-white text-[10px] px-2 py-0.5 font-bold shadow-xs">
                        ⭐ Đang phục vụ
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 text-[10px] px-2 py-0.5 font-semibold">
                        Kế hoạch tuần
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-heading text-base font-bold text-[#292524] leading-snug">
                    {c.name}
                  </h4>

                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-[#b45309]" />
                      <span>{formatPeriod(c)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11.5px]">
                      <span>Số món: <strong className="text-stone-800">{dishCount > 0 ? `${dishCount} món` : "Để trống"}</strong></span>
                      <span>Giá: <strong className="text-stone-800">{formatVND(c.sellingPrice || 1190000)}</strong></span>
                    </div>
                  </div>

                  {c.description && (
                    <p className="mt-2 text-[11px] text-stone-600 line-clamp-2 italic">
                      &quot;{c.description}&quot;
                    </p>
                  )}
                </div>

                {/* Thao tác trên Concept */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setConceptToEdit(c);
                        setEditConceptOpen(true);
                      }}
                      className="h-7 px-2 text-xs text-stone-700 hover:text-[#92400e] hover:bg-amber-100/50"
                      title="Sửa thông tin Concept"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Sửa
                    </Button>

                    {!isActive && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConceptTarget(c)}
                        className="h-7 px-2 text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-50"
                        title="Xóa Concept này"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa
                      </Button>
                    )}
                  </div>

                  {!isActive && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={activatingConcept}
                      onClick={() => handleSetActiveConcept(c.id)}
                      className="h-7 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] shadow-xs"
                    >
                      Áp dụng
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== 3. KHU VỰC THIẾT KẾ MÓN ĂN CHO CONCEPT ĐANG CHỌN ==================== */}
      {selectedConcept && (
        <Card className="min-w-0 overflow-hidden border-border/80 bg-card shadow-sm">
          {/* Concept Header Banner */}
          <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-r from-[#fdf0d5]/60 via-[#faf3e0]/40 to-white px-4 py-4 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-lg font-bold text-[#292524]">
                    {selectedConcept.name}
                  </span>
                  {selectedConcept.id === activeConceptId ? (
                    <Badge className="bg-emerald-700 text-white text-[10.5px] px-2 py-0.5 font-bold">
                      ⭐ Đang phục vụ khách
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-[10.5px] px-2 py-0.5 font-semibold">
                      Bản thảo kế hoạch
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
                  <span>Thời gian: <strong>{formatPeriod(selectedConcept)}</strong></span>
                  <span>·</span>
                  <span>Giá bán Tasting: <strong>{formatVND(conceptCostStats.sellingPrice)}</strong></span>
                  <span>·</span>
                  <span>Mục tiêu Food Cost: <strong>{conceptCostStats.targetCostPct}%</strong></span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setDishModalMode("create");
                    setEditingDish(null);
                    setDishName("");
                    setDishRegion("TRẦM");
                    setDishPortion("1 khách");
                    setDishMethod("Chế biến thủ công");
                    setDishNote("");
                    setDishModalOpen(true);
                  }}
                  className="h-8 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold text-xs shadow-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Thêm món ăn vào Concept
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConceptToEdit(selectedConcept);
                    setEditConceptOpen(true);
                  }}
                  className="h-8 border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-50"
                >
                  <Edit3 className="mr-1 h-3 w-3" /> Sửa Concept
                </Button>

                {selectedConcept.id !== activeConceptId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConceptTarget(selectedConcept)}
                    className="h-8 border-rose-300 bg-white text-xs font-semibold text-rose-800 hover:bg-rose-50"
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Xóa
                  </Button>
                )}
              </div>
            </div>

            {/* 4 Chỉ số KPI chi phí món của Concept */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-2">
              <div className="rounded-xl border border-border/80 bg-white p-2.5">
                <span className="text-[11px] font-medium text-stone-500">Số món trong thực đơn</span>
                <div className="mt-0.5 text-base font-bold tabular-nums text-stone-900">
                  {selectedConcept.dishes?.length || 0} <span className="text-xs font-normal text-muted-foreground">món</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-white p-2.5">
                <span className="text-[11px] font-medium text-stone-500">Tổng giá vốn nguyên liệu / suất</span>
                <div className="mt-0.5 text-base font-bold tabular-nums text-[#92400e]">
                  {formatVND(conceptCostStats.totalCost)}
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-white p-2.5">
                <span className="text-[11px] font-medium text-stone-500">Tỷ lệ Food Cost thực tế</span>
                <div className="mt-0.5 text-base font-bold tabular-nums text-stone-900">
                  {conceptCostStats.actualCostPct}%
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-white p-2.5">
                <span className="text-[11px] font-medium text-stone-500">Đánh giá mục tiêu (33,5%)</span>
                <div className="mt-0.5 text-xs font-bold">
                  {conceptCostStats.totalCost === 0 ? (
                    <span className="text-stone-500">Chưa có món</span>
                  ) : conceptCostStats.actualCostPct <= conceptCostStats.targetCostPct ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Đạt chuẩn mục tiêu
                    </span>
                  ) : (
                    <span className="text-rose-700 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Vượt mục tiêu {Number((conceptCostStats.actualCostPct - conceptCostStats.targetCostPct).toFixed(1))}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          {/* ==================== DANH SÁCH MÓN ĂN TRONG CONCEPT ==================== */}
          <CardContent className="p-4 sm:p-6 space-y-5">
            {!selectedConcept.dishes || selectedConcept.dishes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-muted/10 space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <ChefHat className="h-6 w-6" />
                </div>
                <h4 className="font-heading text-base font-bold text-[#292524]">
                  Concept này đang để trống thực đơn (0 món)
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Bạn có thể bắt đầu thiết kế thực đơn mới bằng cách bấm nút &quot;Thêm món ăn vào Concept&quot; bên dưới, sau đó gán các nguyên liệu có sẵn trong kho.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setDishModalMode("create");
                    setEditingDish(null);
                    setDishName("");
                    setDishRegion("TRẦM");
                    setDishPortion("1 khách");
                    setDishMethod("Chế biến thủ công");
                    setDishNote("");
                    setDishModalOpen(true);
                  }}
                  className="h-9 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold text-xs shadow-xs"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Thêm món ăn đầu tiên
                </Button>
              </div>
            ) : (
              selectedConcept.dishes.map((dish: any) => {
                const dishCost = conceptCostStats.dishCosts[dish.index] || 0;
                const defVariant = dish.variants?.find((v: any) => v.isDefault) || dish.variants?.[0];
                const lines: any[] = defVariant?.lines || [];

                return (
                  <div
                    key={dish.id || `dish-${dish.index}`}
                    className="rounded-2xl border border-border/80 bg-white overflow-hidden shadow-2xs transition-all hover:border-[#b45309]/40"
                  >
                    {/* Header món */}
                    <div className="border-b border-border/60 bg-muted/20 p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#b45309] text-white font-heading text-xs font-bold">
                          {dish.index < 10 ? `0${dish.index}` : dish.index}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading text-sm font-bold text-[#292524]">
                              {dish.name}
                            </h4>
                            {dish.region && (
                              <Badge variant="outline" className="border-stone-300 text-[10px] px-1.5 py-0 text-stone-600">
                                {dish.region}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Quy cách: {dish.portion || "1 khách"} · Phương pháp: {dish.method || "Chế biến"}
                          </p>
                        </div>
                      </div>

                      {/* Giá vốn món & Thao tác */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Giá vốn món</span>
                          <span className="font-heading text-sm font-bold text-[#92400e] tabular-nums">
                            {formatVND(dishCost)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 pl-2 border-l border-border/60">
                          {/* Nút Thêm nguyên liệu từ kho */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setTargetDishForLine(dish);
                              setSelectedIngredientId("");
                              setLineQty("");
                              setLinePrepNote("");
                              setLineModalOpen(true);
                            }}
                            className="h-7 bg-[#fdf0d5] hover:bg-[#b45309] text-[#92400e] hover:text-white border border-[#b45309]/30 font-semibold text-xs transition-colors"
                          >
                            <Plus className="mr-1 h-3 w-3" /> Thêm nguyên liệu kho
                          </Button>

                          {/* Sửa món */}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDishModalMode("edit");
                              setEditingDish(dish);
                              setDishName(dish.name);
                              setDishRegion(dish.region || "");
                              setDishPortion(dish.portion || "1 khách");
                              setDishMethod(dish.method || "");
                              setDishNote(dish.note || "");
                              setDishModalOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-stone-600 hover:text-stone-900"
                            title="Sửa thông tin món"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>

                          {/* Xóa món */}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteDishTarget(dish)}
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                            title="Xóa món này khỏi Concept"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Bảng nguyên liệu cấu thành món ăn */}
                    <div className="p-0 overflow-x-auto">
                      {lines.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground italic">
                          Chưa có nguyên liệu nào. Bấm &quot;Thêm nguyên liệu kho&quot; để gán định lượng.
                        </div>
                      ) : (
                        <Table className="min-w-[700px]">
                          <TableHeader>
                            <TableRow className="bg-stone-50/70 hover:bg-stone-50/70">
                              <TableHead className="pl-4 text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                                Nguyên liệu từ kho
                              </TableHead>
                              <TableHead className="w-36 text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                                Nhóm nguyên liệu
                              </TableHead>
                              <TableHead className="w-32 text-right text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                                Định lượng / suất
                              </TableHead>
                              <TableHead className="w-44 text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                                Quy cách sơ chế
                              </TableHead>
                              <TableHead className="w-32 text-right text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                                Đơn giá kho
                              </TableHead>
                              <TableHead className="w-32 text-right text-[10.5px] font-semibold uppercase tracking-wider text-stone-600">
                                Thành tiền
                              </TableHead>
                              <TableHead className="w-16 text-center text-[10.5px] font-semibold uppercase tracking-wider text-stone-600 pr-4">
                                Xóa
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((l: any) => {
                              const priceInfo = safeGetPrice(l.ingredientId, l.defaultImportPrice || 100000);
                              const factor = priceInfo.importUnit === "kg" || priceInfo.importUnit === "l" ? 1000 : 1;
                              const lineCost = Math.round((l.qtyPerGuest * priceInfo.importPrice) / factor);

                              return (
                                <TableRow key={l.id || l.ingredientId} className="hover:bg-amber-50/30">
                                  <TableCell className="pl-4 font-semibold text-[#292524] text-xs">
                                    {l.ingredientName || l.ingredientId}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                                      {l.groupLabel || "Nguyên liệu"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-bold tabular-nums text-stone-800">
                                    {formatQty(l.qtyPerGuest, l.unit)}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {l.prepNote || "—"}
                                  </TableCell>
                                  <TableCell className="text-right text-xs text-stone-600 tabular-nums">
                                    {formatVND(priceInfo.importPrice)}/{priceInfo.importUnit}
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-bold tabular-nums text-[#92400e]">
                                    {formatVND(lineCost)}
                                  </TableCell>
                                  <TableCell className="text-center pr-4">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLine(dish.index, l.id)}
                                      className="h-6 w-6 rounded-md hover:bg-rose-100 text-stone-400 hover:text-rose-700 inline-flex items-center justify-center transition-colors cursor-pointer"
                                      title="Gỡ nguyên liệu"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================== 4. MODALS & DIALOGS ==================== */}

      {/* Modal Tạo Concept */}
      <CreateConceptModal
        open={createConceptOpen}
        onOpenChange={setCreateConceptOpen}
        existingConcepts={concepts}
        currentActiveId={activeConceptId}
        onSuccess={async (newId) => {
          await loadConcepts();
          setSelectedConceptId(newId);
        }}
      />

      {/* Modal Sửa Concept */}
      <EditConceptModal
        open={editConceptOpen}
        onOpenChange={setEditConceptOpen}
        concept={conceptToEdit}
        onSuccess={async () => {
          await loadConcepts();
        }}
      />

      {/* Alert Dialog Xác nhận Xóa Concept */}
      <AlertDialog
        open={deleteConceptTarget !== null}
        onOpenChange={(open) => !open && setDeleteConceptTarget(null)}
      >
        <AlertDialogContent className="max-w-md border-rose-200 bg-[#fffdf9] font-heading">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <Trash2 className="h-5 w-5 text-rose-600" />
              <AlertDialogTitle>Xác nhận xóa Concept thực đơn?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-stone-600 leading-relaxed pt-2">
              Bạn có chắc chắn muốn xóa{" "}
              <strong className="text-stone-900">{deleteConceptTarget?.name}</strong>?
              <br />
              Toàn bộ danh sách món ăn và định lượng của Concept này sẽ bị gỡ bỏ vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={deletingConcept} className="text-xs h-9">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteConcept();
              }}
              disabled={deletingConcept}
              className="bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs h-9"
            >
              {deletingConcept ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang xóa...
                </>
              ) : (
                "Xác nhận xóa Concept"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Thêm / Sửa Món ăn */}
      <Dialog open={dishModalOpen} onOpenChange={setDishModalOpen}>
        <DialogContent className="max-w-md border-amber-900/20 bg-[#fffdf9] p-0 shadow-2xl font-heading">
          <form onSubmit={handleSaveDish}>
            <div className="border-b border-amber-900/10 bg-gradient-to-r from-[#fdf0d5] to-[#faf3e0] p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b45309] text-white shadow-xs">
                  <ChefHat className="h-4 w-4" />
                </span>
                <div>
                  <DialogTitle className="font-heading text-lg font-bold text-[#292524]">
                    {dishModalMode === "edit" ? "Chỉnh sửa món ăn" : "Thêm món mới vào Concept"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {selectedConcept?.name}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 p-5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Tên món ăn <span className="text-rose-600">*</span></Label>
                <Input
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="VD: Tuyết Cá Tầm, Bào Ngư Om Rượu Nếp..."
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-stone-700">Vùng miền / Xuất xứ</Label>
                  <Input
                    value={dishRegion}
                    onChange={(e) => setDishRegion(e.target.value)}
                    placeholder="VD: Lâm Đồng, Nha Trang..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-stone-700">Quy cách suất</Label>
                  <Input
                    value={dishPortion}
                    onChange={(e) => setDishPortion(e.target.value)}
                    placeholder="1 khách"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Phương pháp / Kỹ thuật chế biến</Label>
                <Input
                  value={dishMethod}
                  onChange={(e) => setDishMethod(e.target.value)}
                  placeholder="VD: Ướp lạnh & Mở hộp tại bàn, Áp chảo gang..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700">Ghi chú câu chuyện món</Label>
                <Textarea
                  value={dishNote}
                  onChange={(e) => setDishNote(e.target.value)}
                  placeholder="Hương vị, phong vị kết hợp..."
                  className="text-xs min-h-[56px]"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 bg-muted/20 px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setDishModalOpen(false)} className="h-9 text-xs">
                Hủy
              </Button>
              <Button type="submit" size="sm" disabled={submittingDish} className="h-9 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold text-xs shadow-xs">
                {submittingDish ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                {dishModalMode === "edit" ? "Cập nhật món" : "Thêm vào thực đơn"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Xác nhận Xóa Món ăn */}
      <AlertDialog open={deleteDishTarget !== null} onOpenChange={(open) => !open && setDeleteDishTarget(null)}>
        <AlertDialogContent className="max-w-md border-rose-200 bg-[#fffdf9] font-heading">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <Trash2 className="h-5 w-5 text-rose-600" />
              <AlertDialogTitle>Xóa món ăn khỏi Concept?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-stone-600 leading-relaxed pt-2">
              Bạn có chắc chắn muốn xóa món <strong className="text-stone-900">{deleteDishTarget?.name}</strong> khỏi {selectedConcept?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="text-xs h-9">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteDish();
              }}
              className="bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs h-9"
            >
              Xác nhận xóa món
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Gán Nguyên liệu từ Kho vào Món ăn */}
      <Dialog open={lineModalOpen} onOpenChange={setLineModalOpen}>
        <DialogContent className="max-w-lg border-amber-900/20 bg-[#fffdf9] p-0 shadow-2xl font-heading">
          <form onSubmit={handleSaveLine}>
            <div className="border-b border-amber-900/10 bg-gradient-to-r from-[#fdf0d5] to-[#faf3e0] p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b45309] text-white shadow-xs">
                  <Warehouse className="h-4 w-4" />
                </span>
                <div>
                  <DialogTitle className="font-heading text-lg font-bold text-[#292524]">
                    Thêm nguyên liệu kho vào món: {targetDishForLine?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Chọn nguyên liệu có sẵn trong kho và nhập định lượng cho 1 suất.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 text-xs">
              {/* Chọn nguyên liệu */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Chọn nguyên liệu từ kho <span className="text-rose-600">*</span>
                </Label>
                <Select
                  value={selectedIngredientId}
                  onValueChange={(val) => {
                    setSelectedIngredientId(val);
                    const found = warehouseIngredients.find((i) => i.id === val);
                    if (found) {
                      setLineUnit(found.unit);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="-- Bấm để chọn nguyên liệu từ kho --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {INGREDIENT_GROUP_ORDER.map((group) => {
                      const groupItems = warehouseIngredients.filter((i) => i.group === group);
                      if (groupItems.length === 0) return null;
                      return (
                        <SelectGroup key={group}>
                          <SelectLabel className="font-heading font-bold text-amber-900 text-[11px] bg-amber-50/70">
                            {INGREDIENT_GROUP_LABELS[group]} ({groupItems.length})
                          </SelectLabel>
                          {groupItems.map((i) => (
                            <SelectItem key={i.id} value={i.id} className="text-xs">
                              {i.name} — ({formatVND(i.importPrice)}/{i.importUnit})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Thông tin nguyên liệu được chọn & Tình trạng tồn kho */}
              {selectedIngredientId && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2 text-[11.5px]">
                  {(() => {
                    const ing = warehouseIngredients.find((i) => i.id === selectedIngredientId);
                    if (!ing) return null;
                    const cStock = ing.currentStock ?? 0;
                    const isSurplusStock = cStock >= 4500;
                    const isLowStock = cStock > 0 && cStock < 500;

                    return (
                      <>
                        <div className="flex items-center justify-between font-semibold text-[#292524]">
                          <span>{ing.name} ({ing.groupLabel})</span>
                          <span className="text-[#92400e] font-bold">
                            {formatVND(ing.importPrice)} / {ing.importUnit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground text-[10.5px]">
                          <span>Đơn vị: <strong>{ing.unit}</strong> · Xuất xứ: {ing.origin || "Việt Nam"}</span>
                          {cStock > 0 && (
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 font-medium text-[10px]",
                                isSurplusStock
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : isLowStock
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-emerald-100 text-emerald-800",
                              )}
                            >
                              {isSurplusStock
                                ? `Kho đang dư thừa: ${formatQty(cStock, ing.unit)}`
                                : isLowStock
                                ? `Kho sắp hết: ${formatQty(cStock, ing.unit)}`
                                : `Tồn kho: ${formatQty(cStock, ing.unit)}`}
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* CẢNH BÁO NGUYÊN LIỆU TRÙNG LẶP / DƯ THỪA TRONG MÓN */}
              {(() => {
                const existing = targetDishForLine?.variants?.[0]?.lines?.find(
                  (l: any) => l.ingredientId === selectedIngredientId,
                );
                if (!existing) return null;
                return (
                  <div className="rounded-xl border border-amber-400 bg-amber-50 p-2.5 text-xs text-amber-950 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900">Cảnh báo dư thừa / Trùng lặp:</span>
                      <p className="mt-0.5 text-stone-700 leading-relaxed text-[11px]">
                        Món <strong>&quot;{targetDishForLine?.name}&quot;</strong> đã có nguyên liệu này trong công thức (hiện tại: <strong>{formatQty(existing.qtyPerGuest, existing.unit)}/suất</strong>). Việc thêm mới có thể gây dư thừa hoặc cộng trùng lặp định lượng.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Định lượng / suất */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-stone-700">
                    Định lượng cho 1 khách <span className="text-rose-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={lineQty}
                    onChange={(e) => setLineQty(e.target.value)}
                    placeholder="VD: 50"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-stone-700">Đơn vị</Label>
                  <Select value={lineUnit} onValueChange={(val: any) => setLineUnit(val)}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">gram (g)</SelectItem>
                      <SelectItem value="ml">mililit (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quy cách sơ chế */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Quy cách sơ chế &amp; hướng dẫn chế biến</Label>
                <Input
                  value={linePrepNote}
                  onChange={(e) => setLinePrepNote(e.target.value)}
                  placeholder="VD: Phi lê cắt lát mỏng 2mm, ướp tiêu Phú Quốc..."
                  className="h-9 text-xs"
                />
              </div>

              {/* Tính toán thành tiền xem trước & CẢNH BÁO ĐỊNH LƯỢNG / CHI PHÍ DƯ THỪA */}
              {selectedIngredientId && lineQty && Number(lineQty) > 0 && (() => {
                const ing = warehouseIngredients.find((i) => i.id === selectedIngredientId);
                if (!ing) return null;
                const factor = ing.importUnit === "kg" || ing.importUnit === "l" ? 1000 : 1;
                const cost = Math.round((Number(lineQty) * ing.importPrice) / factor);
                const isExcessiveQty = lineUnit === "g" ? Number(lineQty) > 180 : Number(lineQty) > 120;
                const isExcessiveCost = cost > 160000;

                return (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-xs flex items-center justify-between">
                      <span className="text-emerald-950 font-medium">Chi phí nguyên liệu này / 1 suất:</span>
                      <span className="font-heading text-sm font-bold text-emerald-900 tabular-nums">
                        {formatVND(cost)}
                      </span>
                    </div>

                    {(isExcessiveQty || isExcessiveCost) && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-950 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900">Cảnh báo dư thừa định lượng &amp; chi phí:</span>
                          <p className="mt-0.5 text-stone-700 leading-relaxed text-[11px]">
                            {isExcessiveCost
                              ? `Chi phí ${formatVND(cost)}/suất chiếm tới ${Math.round((cost / 398000) * 100)}% ngân sách Food Cost trần (398.000 đ), có nguy cơ đẩy tổng Food Cost của Concept vượt chỉ tiêu 33,5%.`
                              : `Định lượng ${lineQty} ${lineUnit}/khách là khá lớn cho một món trong thực đơn tasting 7 món (chuẩn 30g–90g/món). Vui lòng kiểm tra lại.`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="border-t border-border/60 bg-muted/20 px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setLineModalOpen(false)} className="h-9 text-xs">
                Hủy
              </Button>
              <Button type="submit" size="sm" disabled={submittingLine} className="h-9 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold text-xs shadow-xs">
                {submittingLine ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Lưu định lượng vào món
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
