"use client";

// Modal Phiếu Nhập Hàng Vào Kho (Goods Receipt / Stock Inward)
// Hỗ trợ:
// 1. Input kèm Dropdown để chọn nguyên liệu có sẵn trong kho ("hàng cũ")
// 2. Gõ trực tiếp tên mặt hàng mới chưa có trong kho ("hàng mới"), chọn Nhóm & Đơn vị tính để thêm mới vào kho
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownToLine,
  Info,
  Check,
  CheckCircle2,
  ChevronDown,
  History,
  Loader2,
  PackagePlus,
  PlusCircle,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/searchable-select";
import { formatVND } from "@/lib/tram/format";
import {
  formatQty,
  INGREDIENT_GROUP_LABELS,
  INGREDIENT_GROUP_ORDER,
  type IngredientGroup,
  type IngredientUnit,
} from "@/lib/tram/recipes";
import { cn } from "@/lib/utils";

export interface StockInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIngredientId?: string;
  onSuccess?: () => void;
}

interface QuickOption {
  label: string;
  amount: number;
}

function normalizeVi(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function StockInModal({
  open,
  onOpenChange,
  initialIngredientId,
  onSuccess,
}: StockInModalProps) {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Input kèm Dropdown cho nguyên vật liệu (hỗ trợ cả hàng cũ lẫn hàng mới)
  const [selectedId, setSelectedId] = useState<string>("");
  const [ingredientInput, setIngredientInput] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [forceNewMode, setForceNewMode] = useState<boolean>(false);

  // Cấu hình khi nhập mặt hàng mới chưa có trong kho
  const [newGroup, setNewGroup] = useState<IngredientGroup>("PRODUCE");
  const [newUnit, setNewUnit] = useState<IngredientUnit>("g");

  const [quantity, setQuantity] = useState<number>(1000);
  const [pricePerUnit, setPricePerUnit] = useState<number>(100000);
  const [supplierNote, setSupplierNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const comboRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Tab chuyển đổi: Lập phiếu nhập vs Xem lịch sử nhập
  const [viewTab, setViewTab] = useState<"form" | "history">("form");
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Tải danh mục nguyên liệu từ API (kết hợp cả bảng tồn kho và CSDL nguyên liệu)
  useEffect(() => {
    if (!open) return;
    setLoadingIngredients(true);
    setDropdownOpen(false);
    setForceNewMode(false);
    Promise.all([
      fetch("/api/recipes?guests=1").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/inventory").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([data, inv]) => {
        const byId = new Map<string, any>();

        for (const i of data?.allIngredients ?? []) {
          byId.set(i.id, {
            id: i.id,
            name: i.name,
            unit: i.unit || "g",
            group: i.group || "SEASONING",
            currentStock: i.currentStock ?? 0,
            minStock: i.minStock ?? 200,
            defaultImportPrice: i.defaultImportPrice ?? 100000,
          });
        }

        for (const it of inv?.items ?? []) {
          const existing = byId.get(it.ingredientId);
          byId.set(it.ingredientId, {
            id: it.ingredientId,
            name: it.name || existing?.name || it.ingredientId,
            unit: it.unit || existing?.unit || "g",
            group: it.group || existing?.group || "SEASONING",
            currentStock: it.stockQty ?? existing?.currentStock ?? 0,
            minStock: it.reorderPoint ?? existing?.minStock ?? 200,
            defaultStockQty: it.defaultStockQty ?? (it.unit === "ml" ? 2000 : 2000),
            defaultImportPrice: it.importPrice ?? existing?.defaultImportPrice ?? 100000,
            qtyPerGuestStandard: it.qtyPerGuestStandard ?? 0,
            standardDishIndexes: it.standardDishIndexes ?? [],
            isStandardIngredient: Boolean(it.isStandardIngredient || (it.standardDishIndexes && it.standardDishIndexes.length > 0)),
          });
        }

        const merged = Array.from(byId.values()).sort((a, b) =>
          a.name.localeCompare(b.name, "vi"),
        );
        setIngredients(merged);

        const targetId = initialIngredientId || merged[0]?.id || "";
        const found = merged.find((i: any) => i.id === targetId);
        if (found) {
          setSelectedId(found.id);
          setIngredientInput(found.name);
          setPricePerUnit(found.defaultImportPrice || 100000);
        } else {
          setSelectedId("");
          setIngredientInput("");
        }
      })
      .catch((err) => console.error("Lỗi tải nguyên liệu:", err))
      .finally(() => setLoadingIngredients(false));
  }, [open, initialIngredientId]);

  // Kiểm tra xem người dùng đang chọn nguyên liệu có sẵn hay đang nhập tên mặt hàng mới
  const currentIng = useMemo(() => {
    if (forceNewMode) return null;
    if (selectedId) {
      const byId = ingredients.find((i) => i.id === selectedId);
      if (byId && normalizeVi(byId.name) === normalizeVi(ingredientInput)) {
        return byId;
      }
    }
    const q = normalizeVi(ingredientInput);
    if (!q) return null;
    return ingredients.find((i) => normalizeVi(i.name) === q) || null;
  }, [ingredients, selectedId, ingredientInput, forceNewMode]);

  const isNewIngredient = useMemo(() => {
    if (forceNewMode) return true;
    const trimmed = ingredientInput.trim();
    return trimmed.length > 0 && !currentIng;
  }, [forceNewMode, ingredientInput, currentIng]);

  // Lọc danh sách nguyên liệu trong dropdown theo từ khóa đang gõ
  const filteredIngredients = useMemo(() => {
    const q = normalizeVi(ingredientInput);
    // Nếu đang hiển thị đúng tên nguyên liệu đã chọn và chưa gõ khác đi, hiển thị toàn bộ kèm nguyên liệu đang chọn lên đầu
    if (!q || (currentIng && normalizeVi(currentIng.name) === q)) {
      return ingredients;
    }
    return ingredients.filter((i) =>
      normalizeVi(`${i.name} ${i.id}`).includes(q),
    );
  }, [ingredients, ingredientInput, currentIng]);

  const handleSelectExisting = (ing: any) => {
    setForceNewMode(false);
    setSelectedId(ing.id);
    setIngredientInput(ing.name);
    setPricePerUnit(ing.defaultImportPrice || 100000);
    setDropdownOpen(false);
  };

  const handleSwitchToNewItem = (prefillName?: string) => {
    setForceNewMode(true);
    setSelectedId("");
    const nextName =
      prefillName !== undefined
        ? prefillName
        : currentIng
          ? ""
          : ingredientInput;
    setIngredientInput(nextName);
    setDropdownOpen(false);
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  // Tải lịch sử nhập kho khi mở tab history
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/inventory/stock-in?limit=15");
      const data = await res.json();
      if (data && Array.isArray(data.receipts)) {
        setRecentReceipts(data.receipts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (open && viewTab === "history") {
      loadHistory();
    }
  }, [open, viewTab]);

  // Tính toán trước & Kiểm tra dư thừa so với định mức Concept
  const unit: IngredientUnit = currentIng ? currentIng.unit : newUnit;
  const currentStock = currentIng ? (currentIng.currentStock ?? 0) : 0;
  const minStock = currentIng ? (currentIng.minStock ?? 200) : 200;
  const defaultStock = currentIng?.defaultStockQty ?? (unit === "ml" ? 2000 : 2000);
  const isConceptIngredient = Boolean(
    currentIng?.isStandardIngredient ||
    (currentIng?.standardDishIndexes && currentIng.standardDishIndexes.length > 0)
  );
  const qtyPerGuest = currentIng?.qtyPerGuestStandard ?? 0;
  const newStock = currentStock + (quantity || 0);
  const totalAmount = Math.round(((quantity || 0) * (pricePerUnit || 0)) / 1000);

  // Ngưỡng cảnh báo dư thừa:
  // Vượt quá 135% định mức chuẩn của kho cho Concept
  const maxSafeStock = Math.round(defaultStock * 1.35);
  const isSurplus = Boolean(currentIng && newStock > maxSafeStock);
  const surplusQty = Math.max(0, newStock - defaultStock);
  const surplusPct = defaultStock > 0 ? Math.round(((newStock - defaultStock) / defaultStock) * 100) : 0;
  const surplusCost = Math.round((surplusQty * (pricePerUnit || 0)) / 1000);
  const estimatedServings = qtyPerGuest > 0 ? Math.round(newStock / qtyPerGuest) : null;
  const recommendedOptimalQty = Math.max(0, defaultStock - currentStock);

  // Các nút số lượng nhanh
  const quickPills: QuickOption[] = useMemo(() => {
    if (unit === "ml") {
      return [
        { label: "+200 ml", amount: 200 },
        { label: "+500 ml", amount: 500 },
        { label: "+1.000 ml", amount: 1000 },
        { label: "+2.000 ml", amount: 2000 },
        { label: "+5.000 ml", amount: 5000 },
      ];
    }
    return [
      { label: "+200 g", amount: 200 },
      { label: "+500 g", amount: 500 },
      { label: "+1.000 g", amount: 1000 },
      { label: "+2.000 g", amount: 2000 },
      { label: "+5.000 g", amount: 5000 },
    ];
  }, [unit]);

  // Gửi phiếu nhập kho (hỗ trợ cả mặt hàng có sẵn và mặt hàng mới)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = ingredientInput.trim();

    if (!currentIng && !trimmedName) {
      toast.error("Vui lòng chọn hoặc nhập tên nguyên vật liệu cần nhập kho.");
      inputRef.current?.focus();
      return;
    }
    if (quantity <= 0) {
      toast.error("Số lượng nhập phải lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = currentIng
        ? {
            ingredientId: currentIng.id,
            quantity,
            pricePerUnit,
            supplierNote: supplierNote.trim(),
          }
        : {
            newIngredientName: trimmedName,
            newIngredientGroup: newGroup,
            newIngredientUnit: newUnit,
            quantity,
            pricePerUnit,
            supplierNote: supplierNote.trim(),
          };

      const res = await fetch("/api/inventory/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi nhập hàng vào kho.");

      toast.success(data.message || "Nhập hàng vào kho thành công!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Không thể hoàn thành phiếu nhập kho.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg font-heading">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fdf0d5] text-[#b45309]">
                <PackagePlus className="h-4 w-4" />
              </span>
              <DialogTitle className="font-heading text-lg font-bold text-[#292524]">
                Phiếu nhập hàng vào kho
              </DialogTitle>
            </div>

            {/* Chuyển tab Lập phiếu / Lịch sử */}
            <div className="flex rounded-lg border border-border bg-stone-100/80 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewTab("form")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-all",
                  viewTab === "form"
                    ? "bg-white text-[#92400e] shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                Nhập kho
              </button>
              <button
                type="button"
                onClick={() => setViewTab("history")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all",
                  viewTab === "history"
                    ? "bg-white text-[#92400e] shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                <History className="h-3 w-3" /> Lịch sử
              </button>
            </div>
          </div>
          <DialogDescription className="text-xs">
            Chọn nguyên liệu có sẵn hoặc gõ tên mặt hàng mới để nhập thẳng vào kho.
          </DialogDescription>
        </DialogHeader>

        {viewTab === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
            {/* 1. Input kèm Dropdown: Chọn hàng có sẵn hoặc gõ tên hàng mới */}
            <div className="space-y-1.5" ref={comboRef}>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-stone-700">
                  Nguyên vật liệu nhập *
                </Label>
                <div className="flex items-center gap-2">
                  {isNewIngredient ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-[#92400e]">
                      <Sparkles className="h-2.5 w-2.5" /> Mặt hàng mới — thêm vào kho
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchToNewItem("")}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b45309] hover:text-[#92400e] hover:underline"
                    >
                      <PlusCircle className="h-3 w-3" /> Nhập mặt hàng mới
                    </button>
                  )}
                </div>
              </div>

              {loadingIngredients ? (
                <div className="flex h-9 items-center justify-center rounded-lg border text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-[#b45309]" /> Đang tải danh mục...
                </div>
              ) : (
                <div className="relative">
                  <div
                    className={cn(
                      "flex h-9 w-full items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                      isNewIngredient && "border-amber-500/70 bg-amber-50/20",
                    )}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={ingredientInput}
                      placeholder="Gõ tên mặt hàng mới hoặc tìm nguyên liệu trong kho..."
                      onFocus={() => setDropdownOpen(true)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIngredientInput(val);
                        setDropdownOpen(true);
                        const exact = ingredients.find(
                          (i) => normalizeVi(i.name) === normalizeVi(val),
                        );
                        if (exact) {
                          setForceNewMode(false);
                          setSelectedId(exact.id);
                          setPricePerUnit(exact.defaultImportPrice || 100000);
                        } else {
                          setSelectedId("");
                        }
                      }}
                      className="h-full w-full flex-1 bg-transparent text-xs font-medium text-stone-900 outline-none placeholder:font-normal placeholder:text-muted-foreground"
                    />
                    {ingredientInput && (
                      <button
                        type="button"
                        title="Xóa để gõ tên mặt hàng khác"
                        onClick={() => {
                          setIngredientInput("");
                          setSelectedId("");
                          setDropdownOpen(true);
                          inputRef.current?.focus();
                        }}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Mở danh sách nguyên liệu trong kho"
                      onClick={() => {
                        setDropdownOpen((prev) => !prev);
                        inputRef.current?.focus();
                      }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          dropdownOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </div>

                  {/* Danh sách dropdown xổ xuống */}
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                      {/* Nút thêm nhanh mặt hàng mới nếu từ khóa gõ chưa trùng khớp hoàn toàn */}
                      {ingredientInput.trim() && !currentIng && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSwitchToNewItem(ingredientInput.trim());
                          }}
                          className="mb-1 flex w-full items-center justify-between gap-2 rounded-md border border-amber-300/80 bg-amber-50/90 px-2.5 py-2 text-left text-xs font-semibold text-[#92400e] hover:bg-amber-100/80"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <PlusCircle className="h-3.5 w-3.5 shrink-0 text-[#b45309]" />
                            Thêm mặt hàng mới: &ldquo;{ingredientInput.trim()}&rdquo;
                          </span>
                          <span className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-[#b45309]">
                            Hàng mới
                          </span>
                        </button>
                      )}

                      {filteredIngredients.length === 0 ? (
                        <div className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                          Chưa có trong kho — nhấn Enter hoặc chọn{" "}
                          <strong className="text-[#92400e]">Thêm mặt hàng mới</strong> ở trên để nhập vào kho.
                        </div>
                      ) : (
                        filteredIngredients.map((ing) => {
                          const isSelected = currentIng?.id === ing.id;
                          return (
                            <button
                              key={ing.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectExisting(ing);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-stone-100",
                                isSelected && "bg-[#fdf0d5]/70 font-semibold text-[#92400e]",
                              )}
                            >
                              <span className="truncate">
                                {ing.name} <span className="text-muted-foreground">({ing.unit})</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-stone-500">
                                <span>Tồn: {formatQty(ing.currentStock, ing.unit)}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-[#b45309]" />}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Nếu là mặt hàng mới: cho chọn Nhóm nguyên liệu & Đơn vị tính */}
              {isNewIngredient && (
                <div className="mt-2 grid grid-cols-2 gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50/40 p-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-stone-700">
                      Nhóm nguyên liệu *
                    </Label>
                    <Select
                      value={newGroup}
                      onValueChange={(v) => setNewGroup(v as IngredientGroup)}
                    >
                      <SelectTrigger className="h-8 w-full bg-white text-xs">
                        <SelectValue placeholder="Chọn nhóm..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INGREDIENT_GROUP_ORDER.map((grp) => (
                          <SelectItem key={grp} value={grp}>
                            {INGREDIENT_GROUP_LABELS[grp]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-stone-700">
                      Đơn vị tính *
                    </Label>
                    <Select
                      value={newUnit}
                      onValueChange={(v) => setNewUnit(v as IngredientUnit)}
                    >
                      <SelectTrigger className="h-8 w-full bg-white text-xs">
                        <SelectValue placeholder="Chọn đơn vị..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">Gram (g) — Giá theo kg</SelectItem>
                        <SelectItem value="ml">Mililit (ml) — Giá theo Lít</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Thẻ hiển thị trạng thái tồn trước và sau nhập & CẢNH BÁO DƯ THỪA */}
            {(currentIng || isNewIngredient) && (
              <div className="rounded-xl border border-border/80 bg-stone-50/70 p-3 text-xs space-y-2.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      Tồn hiện tại
                    </span>
                    <p className="mt-0.5 font-heading text-sm font-bold text-stone-700">
                      {formatQty(currentStock, unit as any)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      Lượng nhập thêm
                    </span>
                    <p className="mt-0.5 font-heading text-sm font-bold text-[#b45309]">
                      +{formatQty(quantity, unit as any)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      Tồn sau nhập
                    </span>
                    <p
                      className={cn(
                        "mt-0.5 font-heading text-sm font-bold",
                        isSurplus
                          ? "text-amber-800"
                          : newStock >= minStock
                          ? "text-emerald-700"
                          : "text-amber-700",
                      )}
                    >
                      {formatQty(newStock, unit as any)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <span>
                    Định mức Concept: <strong>{formatQty(defaultStock, unit as any)}</strong> (An toàn: {formatQty(minStock, unit as any)})
                  </span>
                  {isSurplus ? (
                    <span className="flex items-center gap-1 font-semibold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded text-[10.5px]">
                      <AlertTriangle className="h-3 w-3 text-amber-700" /> Vượt định mức (+{surplusPct}%)
                    </span>
                  ) : newStock >= minStock ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Đạt ngưỡng an toàn
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700">
                      Vẫn dưới ngưỡng an toàn
                    </span>
                  )}
                </div>

                {/* Hộp CẢNH BÁO DƯ THỪA TỒN KHO NẾU VƯỢT QUÁ ĐỊNH MỨC CONCEPT */}
                {isSurplus && (
                  <div className="rounded-lg border border-amber-400/90 bg-amber-50/95 p-2.5 text-[11px] text-amber-950 space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        Cảnh báo tồn kho dư thừa Concept
                      </span>
                      <span className="rounded bg-amber-200/80 px-1.5 py-0.2 text-[10px] text-amber-900 font-semibold">
                        Thừa {formatQty(surplusQty, unit as any)}
                      </span>
                    </div>
                    <p className="text-stone-700 leading-relaxed text-[10.5px]">
                      Lượng tồn sau nhập ({formatQty(newStock, unit as any)}) vượt quá định mức dự trữ tối ưu ({formatQty(defaultStock, unit as any)}).
                      {estimatedServings ? ` Lượng này đủ phục vụ tới ${estimatedServings} suất ăn tasting (${(estimatedServings / 30).toFixed(1)} ca tối).` : ""}
                      {" "}Giá trị hàng dư thừa ước tính <strong>{formatVND(surplusCost)}</strong>, có nguy cơ tồn đọng vốn và giảm độ tươi mới của nguyên liệu.
                    </p>
                    {recommendedOptimalQty > 0 && recommendedOptimalQty < quantity && (
                      <button
                        type="button"
                        onClick={() => setQuantity(recommendedOptimalQty)}
                        className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#92400e] underline hover:text-amber-950 cursor-pointer"
                      >
                        👉 Điều chỉnh về định mức chuẩn vừa đủ (+{formatQty(recommendedOptimalQty, unit as any)})
                      </button>
                    )}
                  </div>
                )}

                {/* Cảnh báo nếu nguyên liệu không nằm trong Concept đang chạy */}
                {currentIng && !isConceptIngredient && (
                  <div className="rounded-lg border border-stone-200 bg-stone-100/70 p-2 text-[10.5px] text-stone-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Info className="h-3 w-3 text-stone-500 shrink-0" />
                      Nguyên liệu này hiện không có trong thực đơn Concept đang chạy.
                    </span>
                    {quantity >= 2000 && (
                      <span className="font-semibold text-amber-700">Cân nhắc giảm lượng nhập</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Ô nhập số lượng & các nút số lượng nhanh */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-stone-700">
                  Số lượng nhập ({unit}) *
                </Label>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>Chọn nhanh:</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity || ""}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  className="h-9 font-heading text-sm font-bold tabular-nums"
                  required
                />
                <span className="w-8 shrink-0 text-xs font-semibold text-stone-600">
                  {unit}
                </span>
              </div>

              {/* Pills số lượng nhanh */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickPills.map((pill) => (
                  <button
                    key={pill.amount}
                    type="button"
                    onClick={() => setQuantity(pill.amount)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      quantity === pill.amount
                        ? "border-[#b45309] bg-[#fdf0d5] text-[#92400e] font-semibold"
                        : "border-border bg-background text-stone-600 hover:bg-stone-100",
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Đơn giá nhập của đợt này & Tổng tiền */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Đơn giá nhập đợt này (VND / {unit === "ml" ? "L" : "kg"})
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={pricePerUnit || ""}
                  onChange={(e) => setPricePerUnit(Number(e.target.value) || 0)}
                  className="h-9 text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Tổng chi phí đợt nhập
                </Label>
                <div className="flex h-9 items-center rounded-lg border border-border/80 bg-stone-50 px-3 font-heading text-sm font-bold tabular-nums text-[#92400e]">
                  {formatVND(totalAmount)}
                </div>
              </div>
            </div>

            {/* 5. Ghi chú nhà cung cấp / đợt nhập */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Nhà cung cấp / Ghi chú đợt nhập
              </Label>
              <Input
                placeholder="Ví dụ: Nông trại Đà Lạt ca sáng 05/11, hàng tươi mới..."
                value={supplierNote}
                onChange={(e) => setSupplierNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || quantity <= 0}
                className="bg-[#b45309] text-xs font-semibold text-white hover:bg-[#92400e]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang nhập kho...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                    {isNewIngredient
                      ? `Thêm mới & nhập ${formatQty(quantity, unit as any)} vào kho`
                      : `Xác nhận nhập ${formatQty(quantity, unit as any)} vào kho`}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* ==================== TAB XEM LỊCH SỬ NHẬP KHO GẦN ĐÂY ==================== */
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Các phiếu nhập hàng gần nhất</span>
              <button
                type="button"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="text-[#b45309] hover:underline"
              >
                Làm mới
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#b45309]" /> Đang tải lịch sử...
              </div>
            ) : recentReceipts.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
                Chưa có phiếu nhập hàng nào được ghi nhận.
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {recentReceipts.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-border/80 bg-stone-50/60 p-2.5 text-xs transition-colors hover:bg-stone-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-semibold text-stone-900">
                        {rec.ingredientName}
                        {rec.isNewIngredient && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#92400e]">
                            Mặt hàng mới
                          </span>
                        )}
                      </span>
                      <span className="font-heading font-bold text-[#b45309]">
                        +{formatQty(rec.quantity, rec.unit)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        Đơn giá: {formatVND(rec.pricePerUnit)}/
                        {rec.unit === "ml" ? "L" : "kg"}
                      </span>
                      <span className="font-medium text-stone-800">
                        Thành tiền: {formatVND(rec.totalAmount)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-1 text-[10px] text-muted-foreground">
                      <span className="truncate">
                        {rec.supplierNote || "Nhập kho thường kỳ"}
                      </span>
                      <span className="shrink-0">
                        {new Date(rec.createdAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewTab("form")}
                className="text-xs"
              >
                Quay lại lập phiếu nhập
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
