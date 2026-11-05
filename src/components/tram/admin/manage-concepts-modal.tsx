"use client";

// Modal Quản lý danh sách Concepts thực đơn (Xem, Thêm, Sửa, Xóa, Kích hoạt)
import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/tram/format";
import { cn } from "@/lib/utils";
import type { ConceptItemData } from "./edit-concept-modal";

interface ManageConceptsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concepts: ConceptItemData[];
  activeConceptId: string;
  onSelectConcept: (conceptId: string) => void;
  onCreateNew: () => void;
  onEditConcept: (concept: ConceptItemData) => void;
  onRefresh: () => Promise<void>;
}

export function ManageConceptsModal({
  open,
  onOpenChange,
  concepts,
  activeConceptId,
  onSelectConcept,
  onCreateNew,
  onEditConcept,
  onRefresh,
}: ManageConceptsModalProps) {
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConceptItemData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatPeriod = (c: ConceptItemData) => {
    if (c.startDate && c.endDate) {
      const s = c.startDate.split("-").reverse().join("/");
      const e = c.endDate.split("-").reverse().join("/");
      return `${s} - ${e}`;
    }
    if (c.startDate) return `Từ ${c.startDate.split("-").reverse().join("/")}`;
    return c.weekLabel || "Kế hoạch";
  };

  const handleSetActive = async (c: ConceptItemData) => {
    try {
      setActivatingId(c.id);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-active", conceptId: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi kích hoạt concept.");

      toast.success(data.message || `Đã kích hoạt "${c.name}" thành công!`);
      await onRefresh();
      onSelectConcept(c.id);
    } catch (err: any) {
      toast.error(err.message || "Không thể kích hoạt Concept.");
    } finally {
      setActivatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", conceptId: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xóa concept.");

      toast.success(data.message || `Đã xóa "${deleteTarget.name}" thành công!`);
      setDeleteTarget(null);
      await onRefresh();
      onSelectConcept(activeConceptId);
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa Concept.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl border-amber-900/20 bg-[#fffdf9] p-0 shadow-2xl">
          {/* Header */}
          <div className="border-b border-amber-900/10 bg-gradient-to-r from-[#fdf0d5] to-[#faf3e0] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b45309] text-white shadow-xs">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <DialogTitle className="font-heading text-lg font-bold text-[#292524]">
                    Quản lý Concept thực đơn ({concepts.length})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Thêm mới, chỉnh sửa thông tin, xóa hoặc chuyển đổi thực đơn chính thức.
                  </DialogDescription>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onCreateNew();
                }}
                className="h-8 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold text-xs shadow-xs"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Thêm Concept mới
              </Button>
            </div>
          </div>

          {/* Body: Danh sách Concept */}
          <div className="max-h-[60vh] overflow-y-auto p-5 space-y-3">
            {concepts.map((c) => {
              const isActive = c.id === activeConceptId;
              const dishCount = c.dishes?.length || 0;

              return (
                <div
                  key={c.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-4 transition-all",
                    isActive
                      ? "border-amber-400 bg-amber-50/80 shadow-xs ring-1 ring-amber-300"
                      : "border-border/80 bg-white hover:border-[#b45309]/40 hover:bg-[#fdf0d5]/20",
                  )}
                >
                  {/* Cột thông tin */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-sm font-bold text-[#292524]">
                        {c.name}
                      </span>
                      {isActive ? (
                        <Badge className="bg-emerald-700 text-white text-[10px] px-2 py-0.5 font-bold shadow-xs">
                          ⭐ Đang phục vụ
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 bg-amber-100/70 text-amber-900 text-[10px] px-2 py-0.5 font-semibold">
                          Kế hoạch tuần
                        </Badge>
                      )}
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {dishCount > 0 ? `${dishCount} món Tasting` : "Chưa có món (Đang để trống)"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-[#b45309]" />
                        {formatPeriod(c)}
                      </span>
                      {c.sellingPrice && (
                        <span>
                          Giá bán: <strong className="text-stone-800">{formatVND(c.sellingPrice)}</strong>
                        </span>
                      )}
                      {c.targetFoodCostPct && (
                        <span>
                          Mục tiêu cost: <strong className="text-stone-800">{c.targetFoodCostPct}%</strong>
                        </span>
                      )}
                    </div>

                    {c.description && (
                      <p className="text-[11px] text-stone-600 line-clamp-1 italic">
                        &quot;{c.description}&quot;
                      </p>
                    )}
                  </div>

                  {/* Cột thao tác */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {!isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={activatingId === c.id}
                        onClick={() => handleSetActive(c)}
                        className="h-8 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs"
                      >
                        {activatingId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="mr-1 h-3.5 w-3.5" /> Áp dụng
                          </>
                        )}
                      </Button>
                    ) : null}

                    {/* Nút Xem BOM */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectConcept(c.id);
                        onOpenChange(false);
                      }}
                      className="h-8 border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      <UtensilsCrossed className="mr-1 h-3.5 w-3.5 text-stone-500" /> Xem BOM
                    </Button>

                    {/* Nút Sửa */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onEditConcept(c);
                      }}
                      className="h-8 border-amber-300 bg-amber-50/70 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      title="Sửa thông tin Concept"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>

                    {/* Nút Xóa (không cho phép xóa Active) */}
                    {!isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(c)}
                        className="h-8 border-rose-300 bg-rose-50/70 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                        title="Xóa Concept này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG XÁC NHẬN XÓA CONCEPT */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md border-rose-200 bg-[#fffdf9]">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <Trash2 className="h-5 w-5 text-rose-600" />
              <AlertDialogTitle>Xác nhận xóa Concept thực đơn?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-stone-600 leading-relaxed pt-2">
              Bạn có chắc chắn muốn xóa{" "}
              <strong className="text-stone-900">{deleteTarget?.name}</strong>?
              <br />
              Toàn bộ danh sách món ăn, định lượng BOM và thông số phân tích nháp của Concept này sẽ bị gỡ bỏ vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={deleting} className="text-xs h-9">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs h-9"
            >
              {deleting ? (
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
    </>
  );
}

