"use client";

// Modal Phiếu Nhập Hàng Vào Kho (Goods Receipt / Stock Inward)
// Hỗ trợ chọn nguyên liệu, điền số lượng nhập, cập nhật đơn giá đợt này và cộng dồn tồn kho SQLite.
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Layers,
  Loader2,
  PackagePlus,
  Scale,
  Sparkles,
  Warehouse,
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
} from "@/components/ui/select";
import { formatVND } from "@/lib/tram/format";
import { formatQty } from "@/lib/tram/recipes";
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

export function StockInModal({
  open,
  onOpenChange,
  initialIngredientId,
  onSuccess,
}: StockInModalProps) {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  const [selectedId, setSelectedId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1000);
  const [pricePerUnit, setPricePerUnit] = useState<number>(100000);
  const [supplierNote, setSupplierNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Tab chuyển đổi: Lập phiếu nhập vs Xem lịch sử nhập
  const [viewTab, setViewTab] = useState<"form" | "history">("form");
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Tải danh mục nguyên liệu từ API
  useEffect(() => {
    if (!open) return;
    setLoadingIngredients(true);
    fetch("/api/recipes?guests=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.allIngredients)) {
          setIngredients(data.allIngredients);
          const targetId = initialIngredientId || data.allIngredients[0]?.id;
          if (targetId) {
            setSelectedId(targetId);
            const found = data.allIngredients.find((i: any) => i.id === targetId);
            if (found) {
              setPricePerUnit(found.defaultImportPrice || 100000);
            }
          }
        }
      })
      .catch((err) => console.error("Lỗi tải nguyên liệu:", err))
      .finally(() => setLoadingIngredients(false));
  }, [open, initialIngredientId]);

  // Cập nhật giá và reset số lượng khi đổi nguyên liệu
  const currentIng = useMemo(() => {
    return ingredients.find((i) => i.id === selectedId) || null;
  }, [ingredients, selectedId]);

  const handleSelectIngredient = (id: string) => {
    setSelectedId(id);
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      setPricePerUnit(ing.defaultImportPrice || 100000);
    }
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

  // Tính toán trước
  const unit = currentIng?.unit || "g";
  const currentStock = currentIng?.currentStock ?? 0;
  const minStock = currentIng?.minStock ?? 0;
  const newStock = currentStock + (quantity || 0);
  const totalAmount = Math.round(((quantity || 0) * (pricePerUnit || 0)) / 1000);

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

  // Gửi phiếu nhập kho
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      toast.error("Vui lòng chọn nguyên vật liệu cần nhập.");
      return;
    }
    if (quantity <= 0) {
      toast.error("Số lượng nhập phải lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: selectedId,
          quantity,
          pricePerUnit,
          supplierNote: supplierNote.trim(),
        }),
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
      <DialogContent className="sm:max-w-lg">
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
            Cộng dồn số lượng vào tồn kho thực tế và cập nhật đơn giá nhập trong CSDL SQLite.
          </DialogDescription>
        </DialogHeader>

        {viewTab === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            {/* 1. Chọn nguyên vật liệu */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-stone-700">
                  Nguyên vật liệu nhập *
                </Label>
                {currentIng && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Mã: {currentIng.id}
                  </span>
                )}
              </div>

              {loadingIngredients ? (
                <div className="flex h-9 items-center justify-center rounded-lg border text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-[#b45309]" /> Đang tải danh mục...
                </div>
              ) : (
                <Select value={selectedId} onValueChange={handleSelectIngredient}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Chọn nguyên vật liệu..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit}) · Tồn: {formatQty(ing.currentStock, ing.unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 2. Thẻ hiển thị trạng thái tồn trước và sau nhập */}
            {currentIng && (
              <div className="rounded-xl border border-border/80 bg-stone-50/70 p-3 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Tồn hiện tại</span>
                    <p className="mt-0.5 font-heading text-sm font-bold text-stone-700">
                      {formatQty(currentStock, unit as any)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Lượng nhập thêm</span>
                    <p className="mt-0.5 font-heading text-sm font-bold text-[#b45309]">
                      +{formatQty(quantity, unit as any)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Tồn sau nhập</span>
                    <p className={cn("mt-0.5 font-heading text-sm font-bold", newStock >= minStock ? "text-emerald-700" : "text-amber-700")}>
                      {formatQty(newStock, unit as any)}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <span>Mức cảnh báo tồn an toàn: <strong>{formatQty(minStock, unit as any)}</strong></span>
                  {newStock >= minStock ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Đạt ngưỡng an toàn
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700">
                      Vẫn dưới ngưỡng an toàn
                    </span>
                  )}
                </div>
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
                <span className="shrink-0 text-xs font-semibold text-stone-600 w-8">{unit}</span>
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
                    Xác nhận nhập {formatQty(quantity, unit as any)} vào kho
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
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900">{rec.ingredientName}</span>
                      <span className="font-heading font-bold text-[#b45309]">
                        +{formatQty(rec.quantity, rec.unit)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Đơn giá: {formatVND(rec.pricePerUnit)}/{rec.unit === "ml" ? "L" : "kg"}</span>
                      <span className="font-medium text-stone-800">Thành tiền: {formatVND(rec.totalAmount)}</span>
                    </div>

                    <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-1 text-[10px] text-muted-foreground">
                      <span className="truncate">{rec.supplierNote || "Nhập kho thường kỳ"}</span>
                      <span className="shrink-0">{new Date(rec.createdAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
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
