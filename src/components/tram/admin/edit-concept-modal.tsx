"use client";

// Modal Chỉnh sửa thông tin Concept Thực đơn
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Coins,
  Edit3,
  Layers,
  Loader2,
  Percent,
  Sparkles,
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
import { Textarea } from "@/components/ui/textarea";

export interface ConceptItemData {
  id: string;
  code?: string;
  name: string;
  description?: string;
  status?: string;
  weekLabel?: string;
  startDate?: string;
  endDate?: string;
  sellingPrice?: number;
  targetFoodCostPct?: number;
  dishes?: any[];
}

interface EditConceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concept: ConceptItemData | null;
  onSuccess: (updated: ConceptItemData) => void;
}

export function EditConceptModal({
  open,
  onOpenChange,
  concept,
  onSuccess,
}: EditConceptModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekLabel, setWeekLabel] = useState("");
  const [sellingPrice, setSellingPrice] = useState("1190000");
  const [targetFoodCostPct, setTargetFoodCostPct] = useState("33.5");
  const [submitting, setSubmitting] = useState(false);

  const toVnDate = (iso: string) => {
    if (!iso) return "";
    const p = iso.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };

  useEffect(() => {
    if (concept && open) {
      setName(concept.name || "");
      setDescription(concept.description || "");
      setStartDate(concept.startDate || "");
      setEndDate(concept.endDate || "");
      setWeekLabel(concept.weekLabel || "");
      setSellingPrice(String(concept.sellingPrice || 1190000));
      setTargetFoodCostPct(String(concept.targetFoodCostPct || 33.5));
    }
  }, [concept, open]);

  // Tự động cập nhật nhãn thời gian khi người dùng đổi ngày bắt đầu hoặc ngày kết thúc
  const handleDateChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    if (newStart && newEnd) {
      setWeekLabel(`${toVnDate(newStart)} - ${toVnDate(newEnd)}`);
    } else if (newStart) {
      setWeekLabel(`Áp dụng từ ${toVnDate(newStart)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept) return;
    if (!name.trim()) {
      toast.warning("Vui lòng nhập tên cho Concept thực đơn.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          conceptId: concept.id,
          name: name.trim(),
          description: description.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          weekLabel: weekLabel.trim(),
          sellingPrice: Number(sellingPrice) || 1190000,
          targetFoodCostPct: Number(targetFoodCostPct) || 33.5,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi cập nhật Concept.");

      toast.success(data.message || `Đã cập nhật "${name}" thành công!`);
      onOpenChange(false);
      onSuccess(data.concept);
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật Concept.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!concept) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-amber-900/20 bg-[#fffdf9] p-0 shadow-2xl font-heading">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="border-b border-amber-900/10 bg-gradient-to-r from-[#fdf0d5] to-[#faf3e0] p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b45309] text-white shadow-xs">
                <Edit3 className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="font-heading text-lg font-bold text-[#292524]">
                  Chỉnh sửa Concept: {concept.code || concept.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Cập nhật tên, thời gian áp dụng, giá bán và mục tiêu Food Cost của Concept này.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="space-y-4 p-5 text-xs">
            {/* Tên Concept */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Tên Concept thực đơn <span className="text-rose-600">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Concept 3: Đông Vị - Hương Sắc Đất Trầm"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Mô tả */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Mô tả chủ đề ẩm thực</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Giới thiệu tinh hoa nguyên liệu, câu chuyện ẩm thực..."
                className="text-xs min-h-[64px]"
              />
            </div>

            {/* Khung ngày áp dụng */}
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <CalendarDays className="h-4 w-4 text-[#b45309]" />
                Thời gian áp dụng Concept
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-stone-600 font-medium">Ngày bắt đầu</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateChange(e.target.value, endDate)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-stone-600 font-medium">Ngày kết thúc</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleDateChange(startDate, e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-stone-600 font-medium">Nhãn hiển thị tuần / kỳ thực đơn</Label>
                <Input
                  value={weekLabel}
                  onChange={(e) => setWeekLabel(e.target.value)}
                  placeholder="VD: 09/11/2026 - 15/11/2026"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            {/* Giá bán Tasting & Mục tiêu Food Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-[#b45309]" />
                  Giá bán Tasting (VND)
                </Label>
                <Input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="1190000"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5 text-[#b45309]" />
                  Mục tiêu Food Cost (%)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={targetFoodCostPct}
                  onChange={(e) => setTargetFoodCostPct(e.target.value)}
                  placeholder="33.5"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="border-t border-border/60 bg-muted/20 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs"
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="h-9 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold text-xs shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

