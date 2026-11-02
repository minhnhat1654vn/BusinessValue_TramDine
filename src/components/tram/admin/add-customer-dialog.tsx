"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  UserPlus,
  Gem,
  Crown,
  Award,
  Phone,
  User,
  HeartHandshake,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import type { LoyaltyTier } from "@/lib/tram/types";
import { formatVND } from "@/lib/tram/format";

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const QUICK_RELATION_NOTES = [
  "👑 Người thân chủ quán",
  "🤝 Bạn thân thiết của chủ quán",
  "💎 Đối tác chiến lược VIP",
  "⭐ Khách quen đặc biệt",
  "🍷 Thích rượu vang đỏ",
  "🌿 Dị ứng hải sản",
  "🥗 Ăn chay món khai vị",
];

const DEFAULT_METRICS_BY_TIER: Record<
  LoyaltyTier,
  { visits: number; spend: number }
> = {
  NAM_TRAM: { visits: 6, spend: 36230000 },
  TRAM: { visits: 3, spend: 12440000 },
  HUONG: { visits: 1, spend: 3500000 },
};

export function AddCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddCustomerDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<LoyaltyTier>("NAM_TRAM");
  const [notes, setNotes] = useState("");
  const [selectedQuickNotes, setSelectedQuickNotes] = useState<string[]>([
    "👑 Người thân chủ quán",
  ]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customVisits, setCustomVisits] = useState<number>(6);
  const [customSpend, setCustomSpend] = useState<number>(36230000);
  const [loading, setLoading] = useState(false);

  // Khi đổi hạng, cập nhật lại gợi ý số lượt đến và chi tiêu
  function handleSelectTier(t: LoyaltyTier) {
    setTier(t);
    const defaults = DEFAULT_METRICS_BY_TIER[t];
    setCustomVisits(defaults.visits);
    setCustomSpend(defaults.spend);
  }

  function toggleQuickNote(note: string) {
    if (selectedQuickNotes.includes(note)) {
      setSelectedQuickNotes(selectedQuickNotes.filter((n) => n !== note));
    } else {
      setSelectedQuickNotes([...selectedQuickNotes, note]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên khách hàng.");
      return;
    }
    const cleanPhone = phone.trim().replace(/[\s.-]/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ (tối thiểu 9-10 chữ số).");
      return;
    }

    setLoading(true);
    try {
      const allNotes = Array.from(
        new Set([
          ...selectedQuickNotes,
          ...(notes.trim() ? [notes.trim()] : []),
        ]),
      );

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          tier,
          notes: allNotes,
          visits: Number(customVisits) || DEFAULT_METRICS_BY_TIER[tier].visits,
          totalSpend: Number(customSpend) || DEFAULT_METRICS_BY_TIER[tier].spend,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể thêm khách hàng.");
        return;
      }

      toast.success(data.message ?? "Thêm khách hàng thành công!");
      // Reset form
      setName("");
      setPhone("");
      setNotes("");
      setSelectedQuickNotes(["👑 Người thân chủ quán"]);
      handleSelectTier("NAM_TRAM");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Lỗi kết nối khi thêm khách hàng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-amber-900/20 bg-gradient-to-b from-[#fffefc] to-[#fbf8f3] p-0 shadow-2xl">
        {/* Header Dialog */}
        <div className="border-b border-amber-900/10 bg-gradient-to-r from-[#fbf5ea] via-[#f7eee0] to-[#fbf5ea] px-6 py-5">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b45309] text-white shadow-xs">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="font-heading text-lg font-bold text-[#292524]">
                  Thêm Khách Hàng Thân Thiết (VIP)
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-600 mt-0.5">
                  Dành riêng cho Quản trị viên thêm người thân, bạn bè hoặc đối tác đặc quyền.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Thông tin cơ bản: Tên & SĐT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#b45309]" />
                Họ và Tên khách <span className="text-rose-600">*</span>
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Hoàng Nam"
                className="h-10 text-sm bg-white border-stone-300 focus-visible:ring-[#b45309]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#b45309]" />
                Số điện thoại <span className="text-rose-600">*</span>
              </label>
              <Input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="h-10 text-sm bg-white border-stone-300 font-mono focus-visible:ring-[#b45309]"
              />
              <p className="text-[10px] text-stone-500">
                SĐT dùng để tự nhận diện hạng khi khách đặt bàn trực tuyến.
              </p>
            </div>
          </div>

          {/* Chọn Hạng Hội Viên */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-[#b45309]" />
              Chọn Hạng Hội Viên &amp; Đặc Quyền
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Thẻ Hạng Nam Trầm */}
              <div
                onClick={() => handleSelectTier("NAM_TRAM")}
                className={`relative cursor-pointer rounded-2xl p-3.5 border transition-all ${
                  tier === "NAM_TRAM"
                    ? "border-purple-600 bg-gradient-to-br from-purple-950/10 via-amber-500/10 to-purple-900/5 ring-2 ring-purple-500 shadow-sm"
                    : "border-stone-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-950">
                    <Gem className="h-3.5 w-3.5 text-purple-700" />
                    Nam Trầm
                  </span>
                  {tier === "NAM_TRAM" && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-700 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-purple-900">
                  Thượng khách VIP cao nhất
                </p>
                <div className="mt-2 text-[10px] space-y-1 text-stone-600">
                  <p className="font-bold text-emerald-700">✓ Miễn 100% tiền cọc</p>
                  <p>✓ Thưởng +8% điểm bill</p>
                  <p>✓ Ưu tiên bàn VIP riêng tư</p>
                </div>
              </div>

              {/* Thẻ Hạng Trầm */}
              <div
                onClick={() => handleSelectTier("TRAM")}
                className={`relative cursor-pointer rounded-2xl p-3.5 border transition-all ${
                  tier === "TRAM"
                    ? "border-amber-600 bg-amber-50/80 ring-2 ring-amber-500 shadow-sm"
                    : "border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-950">
                    <Crown className="h-3.5 w-3.5 text-amber-700" />
                    Hạng Trầm
                  </span>
                  {tier === "TRAM" && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-700 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-amber-900">
                  Tri kỷ phong vị
                </p>
                <div className="mt-2 text-[10px] space-y-1 text-stone-600">
                  <p>✓ Thưởng +5% điểm bill</p>
                  <p>✓ Miễn phí khui 1 chai vang</p>
                  <p>✓ Tặng trà chào mừng riêng</p>
                </div>
              </div>

              {/* Thẻ Hạng Hương */}
              <div
                onClick={() => handleSelectTier("HUONG")}
                className={`relative cursor-pointer rounded-2xl p-3.5 border transition-all ${
                  tier === "HUONG"
                    ? "border-stone-600 bg-stone-100 ring-2 ring-stone-400 shadow-sm"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-800">
                    <Award className="h-3.5 w-3.5 text-stone-600" />
                    Hạng Hương
                  </span>
                  {tier === "HUONG" && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-700 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-stone-700">
                  Khởi sắc phong vị
                </p>
                <div className="mt-2 text-[10px] space-y-1 text-stone-600">
                  <p>✓ 1.000 đ = 1 điểm</p>
                  <p>✓ Thiệp mừng sinh nhật</p>
                  <p>✓ Nhận trước menu mùa</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ghi chú quan hệ / đặc điểm */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <HeartHandshake className="h-3.5 w-3.5 text-[#b45309]" />
              Ghi chú mối quan hệ &amp; Sở thích ẩm thực
            </label>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_RELATION_NOTES.map((qn) => {
                const active = selectedQuickNotes.includes(qn);
                return (
                  <button
                    key={qn}
                    type="button"
                    onClick={() => toggleQuickNote(qn)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      active
                        ? "border border-amber-400 bg-amber-100/90 text-amber-950 font-semibold shadow-2xs"
                        : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span>{qn}</span>
                    {active && <Check className="h-3 w-3 text-amber-800" />}
                  </button>
                );
              })}
            </div>

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm về sở thích vị giác, bàn ngồi yêu thích hoặc mối liên hệ..."
              rows={2}
              className="text-xs bg-white border-stone-300 focus-visible:ring-[#b45309]"
            />
          </div>

          {/* Tùy chỉnh thông số nâng cao (Toggle) */}
          <div className="rounded-xl border border-stone-200 bg-white p-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-xs font-semibold text-stone-700 hover:text-stone-900"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Thông số lượt đến &amp; Chi tiêu mặc định
              </span>
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                {customVisits} lượt • {formatVND(customSpend)}
                {showAdvanced ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-stone-600">
                    Số lượt đến ban đầu
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={customVisits}
                    onChange={(e) => setCustomVisits(Number(e.target.value))}
                    className="h-8.5 text-xs bg-white"
                  />
                  <p className="text-[10px] text-stone-400">
                    Hạng Nam Trầm yêu cầu từ 6 lượt trở lên.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-stone-600">
                    Tổng chi tiêu ban đầu (VND)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={100000}
                    value={customSpend}
                    onChange={(e) => setCustomSpend(Number(e.target.value))}
                    className="h-8.5 text-xs bg-white font-mono"
                  />
                  <p className="text-[10px] text-stone-400">
                    Tương đương ~{Math.floor(customSpend / 1000).toLocaleString("vi-VN")} điểm tích lũy.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notice ban */}
          <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 flex items-start gap-2 text-xs text-amber-950">
            <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Khách hàng sau khi thêm sẽ xuất hiện ngay trong bảng danh sách khách hàng và được hệ thống lưu vĩnh viễn. Khi người thân đặt bàn trực tuyến qua số điện thoại này, hệ thống sẽ tự động cấp quyền VIP tương ứng.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200/70">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-full px-5 text-xs font-semibold border-stone-300"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 rounded-full px-6 text-xs font-bold bg-[#b45309] hover:bg-[#92400e] text-white shadow-xs gap-1.5"
            >
              {loading ? (
                <>Đang lưu hồ sơ...</>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Lưu &amp; Thêm Khách Hàng
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
