"use client";

// Modal Tạo Concept Thực đơn mới cho tuần tiếp theo
import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Copy,
  Layers,
  Loader2,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CreateConceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingConcepts: { id: string; name: string }[];
  currentActiveId: string;
  onSuccess: (newConceptId: string) => void;
}

export function CreateConceptModal({
  open,
  onOpenChange,
  existingConcepts,
  currentActiveId,
  onSuccess,
}: CreateConceptModalProps) {
  const defaultNextMonday = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7));
    return d.toISOString().slice(0, 10);
  };

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(defaultNextMonday);
  const [weekLabel, setWeekLabel] = useState("Tuần tiếp theo (Dự kiến)");
  const [cloneFromId, setCloneFromId] = useState("blank");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Vui lòng nhập tên cho Concept thực đơn mới.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/recipes/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          startDate: startDate || undefined,
          weekLabel: weekLabel.trim(),
          cloneFromId: cloneFromId === "blank" ? undefined : cloneFromId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi tạo Concept mới.");

      toast.success(data.message || "Đã tạo Concept tuần mới thành công!");
      onOpenChange(false);
      setName("");
      onSuccess(data.concept.id);
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo Concept.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf0d5] text-[#b45309]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-heading text-lg font-bold text-[#292524]">
                Tạo Concept Thực đơn Tuần mới
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Chuẩn bị kế hoạch thực đơn, định lượng BOM và tính toán Food Cost trước cho tuần tiếp theo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Tên Concept */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-stone-700">Tên Concept mới *</Label>
            <Input
              placeholder="Vd: Concept 3: Đông Vị - Tuần 45"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
              required
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Concept 3: Đông Vị - Hương Sắc Đất Trầm",
                "Concept 4: Thực đơn Giáng Sinh & Năm Mới",
                "Concept Mùa Mới: Hải Vị Miền Trung",
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setName(sug)}
                  className="rounded border border-border/70 bg-muted/40 px-2 py-0.5 text-[10.5px] text-muted-foreground hover:bg-[#fdf0d5] hover:text-[#92400e]"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Ngày bắt đầu áp dụng & Tuần/Mùa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-[#b45309]" />
                Ngày bắt đầu áp dụng *
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  if (val) {
                    const parts = val.split("-");
                    if (parts.length === 3) {
                      setWeekLabel(`Áp dụng từ ${parts[2]}/${parts[1]}/${parts[0]}`);
                    }
                  }
                }}
                className="text-xs font-heading font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Ghi chú tuần / Mùa</Label>
              <Input
                placeholder="Vd: Tuần 46 · Mùa Đông"
                value={weekLabel}
                onChange={(e) => setWeekLabel(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Phương thức khởi tạo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-stone-700">Nguồn thực đơn khởi tạo</Label>
            <Select value={cloneFromId} onValueChange={setCloneFromId}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Bắt đầu thực đơn trống (Để trống, không sao chép món cũ)</SelectItem>
                {existingConcepts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    Nhân bản từ: {c.name} {c.id === currentActiveId ? "(Sao chép món tuần này)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {cloneFromId !== "blank"
                ? "Sao chép danh sách món và bảng định lượng BOM từ concept được chọn."
                : "Tạo concept mới để trống hoàn toàn: không hiển thị món hay định lượng của concept cũ để bạn tự lên menu mới."}
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting || !name.trim()}
              className="bg-[#b45309] text-xs font-semibold text-white hover:bg-[#92400e]"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang tạo...
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Tạo Concept tuần mới
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

