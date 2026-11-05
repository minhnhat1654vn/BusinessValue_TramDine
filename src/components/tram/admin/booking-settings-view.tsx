"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { formatLongDate, formatShortDate, todayLocalISO, weekdayOf, addDays } from "@/lib/tram/format";
import type { BookingProgramSettings } from "@/lib/tram/booking-settings";

export function AdminBookingSettingsView({
  onBackToBooking,
}: {
  onBackToBooking?: () => void;
} = {}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BookingProgramSettings | null>(null);
  const [newClosedDate, setNewClosedDate] = useState("");
  const today = todayLocalISO();

  // Tải cấu hình từ API
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data: BookingProgramSettings) => {
        setSettings(data);
      })
      .catch((err) => {
        console.error("Lỗi khi tải cài đặt:", err);
        toast.error("Không tải được cài đặt đặt bàn.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Lưu cấu hình xuống server
  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Lỗi khi lưu cài đặt.");
        return;
      }
      setSettings(data.settings);
      toast.success("Đã cập nhật cài đặt chương trình & lịch hoạt động thành công!");
    } catch {
      toast.error("Lỗi kết nối khi lưu cài đặt.");
    } finally {
      setSaving(false);
    }
  }

  // Thêm một ngày nghỉ đặc biệt
  function handleAddClosedDate() {
    if (!newClosedDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newClosedDate)) {
      toast.error("Định dạng ngày không hợp lệ.");
      return;
    }
    if (settings?.closedDates.includes(newClosedDate)) {
      toast.warning("Ngày này đã có trong danh sách ngày nghỉ.");
      return;
    }
    setSettings((prev) => {
      if (!prev) return prev;
      const updated = [...prev.closedDates, newClosedDate].sort();
      return { ...prev, closedDates: updated };
    });
    toast.success(`Đã thêm ${formatShortDate(newClosedDate)} vào danh sách ngày nghỉ.`);
    setNewClosedDate("");
  }

  // Xóa một ngày nghỉ
  function handleRemoveClosedDate(dateStr: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        closedDates: prev.closedDates.filter((d) => d !== dateStr),
      };
    });
    toast.info(`Đã mở lại phục vụ ngày ${formatShortDate(dateStr)}.`);
  }

  // Bật/tắt ngày chạy chương trình (chế độ specific)
  function handleToggleSpecificDate(dateStr: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      const exists = prev.programDays.includes(dateStr);
      const programDays = exists
        ? prev.programDays.filter((d) => d !== dateStr)
        : [...prev.programDays, dateStr].sort();
      return { ...prev, programDays };
    });
  }

  // Khôi phục mặc định 4 tuần
  function handleResetDefaults() {
    if (!confirm("Bạn có chắc muốn khôi phục về cài đặt mặc định (4 tuần mở chương trình)?")) return;
    setSettings({
      programEnabled: true,
      programName: "Hành trình vị Việt - Tasting Menu 7 món",
      programMode: "range",
      programStartDate: addDays(today, -14),
      programEndDate: addDays(today, 28),
      programDays: [],
      closedDates: [],
      allowMonday: false,
      notes: "Chương trình thực đơn mùa đặc sắc của TRẦM",
      updatedAt: new Date().toISOString(),
    });
    toast.info("Đã đặt lại thông số mặc định (Nhớ bấm 'Lưu thay đổi' để áp dụng).");
  }

  if (loading || !settings) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#b45309]" />
        <p className="text-sm text-muted-foreground">Đang tải cấu hình đặt bàn...</p>
      </div>
    );
  }

  // Mảng 28 ngày để xem trước trực quan
  const previewDays = Array.from({ length: 28 }, (_, i) => addDays(today, i));
  const openDaysCount = previewDays.filter((iso) => {
    const isMon = weekdayOf(iso) === 1;
    const isClosed = settings.closedDates.includes(iso) || (!settings.allowMonday && isMon);
    let inProgram = false;
    if (settings.programEnabled) {
      if (settings.programMode === "range") {
        inProgram = iso >= settings.programStartDate && iso <= settings.programEndDate;
      } else {
        inProgram = settings.programDays.includes(iso);
      }
    }
    return settings.programEnabled && inProgram && !isClosed;
  }).length;

  return (
    <div className="space-y-6 font-heading">
      {/* ==================== 1. TIÊU ĐỀ (ĐỒNG BỘ MẪU TỒN KHO) ==================== */}
      <div className="flex flex-col gap-2 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
              Cấu hình &amp; lịch hoạt động
            </span>
          </div>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Cài đặt chương trình &amp; Lịch đặt bàn
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Quản lý ngày áp dụng chương trình ẩm thực, ngày nghỉ nhà hàng và kiểm soát quyền đặt bàn của khách.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onBackToBooking && (
            <button
              type="button"
              onClick={onBackToBooking}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-background px-3 py-1 text-xs font-semibold text-stone-700 transition-colors hover:bg-[#fdf0d5] hover:text-[#92400e] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#b45309]" aria-hidden />
              Quay lại Đặt bàn
            </button>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-background px-3 py-1 text-xs font-semibold text-[#92400e] transition-colors hover:bg-[#fdf0d5] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#b45309]" aria-hidden />
            Khôi phục mặc định
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#b45309] bg-[#b45309] px-4 py-1 text-xs font-semibold text-[#fffbf2] shadow-xs transition-colors hover:bg-[#92400e] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden />
            )}
            Lưu thay đổi
          </button>
        </div>
      </div>

      {/* ==================== 2. 4 THẺ CHỈ SỐ TỔNG QUAN CÀI ĐẶT ==================== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="min-w-0 gap-0 border-border/80 bg-card py-0 shadow-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10.5px] font-semibold uppercase leading-tight tracking-wider text-stone-600 sm:text-[11px]">
                Trạng thái đặt bàn
              </span>
              <span
                className={
                  settings.programEnabled
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                    : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700"
                }
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            <div
              className={`mt-2 whitespace-nowrap font-heading text-lg font-bold tabular-nums sm:text-xl 2xl:text-2xl ${
                settings.programEnabled ? "text-emerald-800" : "text-rose-700"
              }`}
            >
              {settings.programEnabled ? "Đang mở nhận khách" : "Đang tạm dừng"}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={settings.programName}>
              {settings.programName}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-0 border-border/80 bg-card py-0 shadow-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10.5px] font-semibold uppercase leading-tight tracking-wider text-stone-600 sm:text-[11px]">
                Khung thời gian áp dụng
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            <div className="mt-2 whitespace-nowrap font-heading text-lg font-bold tabular-nums text-[#92400e] sm:text-xl 2xl:text-2xl">
              {settings.programMode === "range" ? "Khoảng ngày liên tục" : `${settings.programDays.length} ngày lẻ`}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {settings.programMode === "range"
                ? `${settings.programStartDate.split("-").reverse().join("/")} – ${settings.programEndDate.split("-").reverse().join("/")}`
                : "Chọn từng ngày phục vụ cụ thể"}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-0 border-border/80 bg-card py-0 shadow-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10.5px] font-semibold uppercase leading-tight tracking-wider text-stone-600 sm:text-[11px]">
                Ngày mở (4 tuần tới)
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
                <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            <div className="mt-2 whitespace-nowrap font-heading text-lg font-bold tabular-nums text-[#292524] sm:text-xl 2xl:text-2xl">
              {openDaysCount} / 28 ngày
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {settings.allowMonday ? "Mở cả Thứ Hai hàng tuần" : "Nghỉ định kỳ Thứ Hai"}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-0 border-border/80 bg-card py-0 shadow-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10.5px] font-semibold uppercase leading-tight tracking-wider text-stone-600 sm:text-[11px]">
                Ngày nghỉ đột xuất
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <CalendarOff className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            <div className="mt-2 whitespace-nowrap font-heading text-lg font-bold tabular-nums text-rose-700 sm:text-xl 2xl:text-2xl">
              {settings.closedDates.length} ngày
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {settings.closedDates.length > 0 ? "Đã khóa nhận khách các ngày này" : "Không có ngày đóng cửa bảo trì"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Thông báo nếu toàn bộ chương trình đang bị tắt */}
      {!settings.programEnabled && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50/90 p-4 text-red-900 shadow-sm dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <span className="font-semibold">Chương trình đặt bàn hiện đang TẮT:</span> Người dùng bên ngoài sẽ không thể đặt bàn cho bất kỳ ngày nào cho đến khi bạn bật lại công tắc này.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CARD 1: TRỰC QUAN HÓA 4 TUẦN LỊCH HOẠT ĐỘNG (ĐẨY LÊN ĐẦU) */}
        <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm lg:col-span-2">
          <CardHeader className="gap-2 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-[#292524]">
                  <CalendarDays className="h-4 w-4 text-[#7c2d12]" aria-hidden />
                  1. Trực quan hóa lịch hoạt động 4 tuần tới (Góc nhìn người dùng)
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Xem trước khách hàng sẽ nhìn thấy các ngày mở cửa hay bị khóa như thế nào theo cài đặt thời gian thực bên dưới.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#b45309]" />
                  <span className="font-medium text-stone-700">Mở chương trình (Được đặt)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-600" />
                  <span className="font-medium text-stone-700">Ngày nghỉ (Khóa)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-stone-300" />
                  <span className="font-medium text-stone-500">Chưa mở chương trình (Khóa)</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {previewDays.map((iso) => {
                const isMon = weekdayOf(iso) === 1;
                const isClosed = settings.closedDates.includes(iso) || (!settings.allowMonday && isMon);
                let inProgram = false;
                if (settings.programEnabled) {
                  if (settings.programMode === "range") {
                    inProgram = iso >= settings.programStartDate && iso <= settings.programEndDate;
                  } else {
                    inProgram = settings.programDays.includes(iso);
                  }
                }
                const canBook = settings.programEnabled && inProgram && !isClosed;

                return (
                  <div
                    key={iso}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                      canBook
                        ? "border-[#b45309]/50 bg-[#fffdf9] text-stone-800 shadow-xs"
                        : isClosed
                          ? "border-red-200 bg-red-50/70 text-red-800"
                          : "border-stone-200 bg-stone-100/70 text-stone-400"
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {formatShortDate(iso).split(" ")[0]}
                    </span>
                    <span className="font-heading text-lg font-bold">
                      {iso.slice(8, 10)}/{iso.slice(5, 7)}
                    </span>
                    <span
                      className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        canBook
                          ? "bg-[#fdf0d5] text-[#92400e]"
                          : isClosed
                            ? (isMon ? "bg-amber-100 text-amber-900 border border-amber-200" : "bg-red-200/80 text-red-900")
                            : "bg-stone-200 text-stone-500"
                      }`}
                    >
                      {canBook ? "Mở đặt bàn" : isClosed ? (isMon ? "Nghỉ Thứ 2" : "Nghỉ lễ") : "Không có CT"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: THÔNG TIN & TRẠNG THÁI CHƯƠNG TRÌNH */}
        <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
          <CardHeader className="gap-2 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-[#292524]">
              <SlidersHorizontal className="h-4 w-4 text-[#7c2d12]" aria-hidden />
              2. Trạng thái &amp; Tên chương trình
            </CardTitle>
            <CardDescription className="text-xs">
              Thiết lập chính sách hoạt động của luồng đặt bàn trực tuyến.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-4 sm:p-5">
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-[#fffdf9] p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-[#292524]">
                  Kích hoạt nhận đặt bàn trực tuyến
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cho phép người dùng vào luồng đặt bàn trên website.
                </p>
              </div>
              <Switch
                checked={settings.programEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => (prev ? { ...prev, programEnabled: checked } : prev))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-name" className="text-sm font-medium">
                Tên chương trình ẩm thực
              </Label>
              <Input
                id="program-name"
                value={settings.programName}
                onChange={(e) =>
                  setSettings((prev) => (prev ? { ...prev, programName: e.target.value } : prev))
                }
                placeholder="VD: Hành trình vị Việt - Tasting Menu 7 món"
                className="h-10"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-[#fffdf9] p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-[#292524]">
                  Mở phục vụ vào Thứ Hai
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mặc định TRẦM nghỉ Thứ Hai. Bật tùy chọn này nếu muốn mở thêm ca vào Thứ Hai.
                </p>
              </div>
              <Switch
                checked={settings.allowMonday}
                onCheckedChange={(checked) =>
                  setSettings((prev) => (prev ? { ...prev, allowMonday: checked } : prev))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-notes" className="text-sm font-medium">
                Ghi chú nội bộ cho ban quản lý
              </Label>
              <Input
                id="program-notes"
                value={settings.notes ?? ""}
                onChange={(e) =>
                  setSettings((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                }
                placeholder="Ghi chú về đợt phục vụ này..."
                className="h-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: CÀI ĐẶT NGÀY CHẠY CHƯƠNG TRÌNH */}
        <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm">
          <CardHeader className="gap-2 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-[#292524]">
              <CalendarCheck className="h-4 w-4 text-[#7c2d12]" aria-hidden />
              3. Ngày chạy chương trình
            </CardTitle>
            <CardDescription className="text-xs">
              Nếu ngày nào không thuộc danh sách này, người dùng sẽ không thể đặt bàn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-4 sm:p-5">
            <RadioGroup
              value={settings.programMode}
              onValueChange={(val: "range" | "specific") =>
                setSettings((prev) => (prev ? { ...prev, programMode: val } : prev))
              }
              className="grid grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2 rounded-xl border border-border/80 bg-[#fffdf9] p-3">
                <RadioGroupItem value="range" id="mode-range" />
                <Label htmlFor="mode-range" className="cursor-pointer text-xs font-medium">
                  Khoảng ngày liên tục
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-xl border border-border/80 bg-[#fffdf9] p-3">
                <RadioGroupItem value="specific" id="mode-specific" />
                <Label htmlFor="mode-specific" className="cursor-pointer text-xs font-medium">
                  Chọn từng ngày lẻ
                </Label>
              </div>
            </RadioGroup>

            {/* Chế độ 1: Khoảng ngày */}
            {settings.programMode === "range" && (
              <div className="space-y-3 rounded-xl border border-border/70 bg-[#fffdf9] p-4">
                <p className="text-xs text-muted-foreground">
                  Chương trình áp dụng từ ngày bắt đầu đến ngày kết thúc:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start-date" className="text-xs font-medium text-stone-600">
                      Từ ngày (Bắt đầu)
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={settings.programStartDate}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev ? { ...prev, programStartDate: e.target.value } : prev
                        )
                      }
                      className="h-10 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end-date" className="text-xs font-medium text-stone-600">
                      Đến ngày (Kết thúc)
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={settings.programEndDate}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev ? { ...prev, programEndDate: e.target.value } : prev
                        )
                      }
                      className="h-10 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Chế độ 2: Chọn từng ngày */}
            {settings.programMode === "specific" && (
              <div className="space-y-3 rounded-xl border border-border/70 bg-[#fffdf9] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Click vào ngày để Bật / Tắt chạy chương trình:
                  </p>
                  <span className="text-[11px] font-semibold text-[#b45309]">
                    Đã chọn {settings.programDays.length} ngày
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1 border rounded-lg">
                  {previewDays.map((iso) => {
                    const active = settings.programDays.includes(iso);
                    const isMon = weekdayOf(iso) === 1;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => handleToggleSpecificDate(iso)}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[11px] transition-all ${
                          active
                            ? "bg-[#b45309] text-white border-[#b45309] shadow-xs"
                            : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                        } ${isMon ? "opacity-60" : ""}`}
                        title={formatLongDate(iso)}
                      >
                        <span className="text-[9px] uppercase font-bold">{formatShortDate(iso).slice(0, 2)}</span>
                        <span className="font-semibold">{iso.slice(8, 10)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
              <p>
                <strong>Nguyên tắc nghiệp vụ:</strong> Người dùng chỉ có thể chọn ngày nào có chương trình đang chạy. Các ngày ngoài phạm vi sẽ bị xám mờ và hiển thị thông báo &quot;Không có CT&quot;.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: CÀI ĐẶT NGÀY NGHỈ ĐỘT XUẤT CỦA NHÀ HÀNG */}
        <Card className="min-w-0 gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-sm lg:col-span-2">
          <CardHeader className="gap-2 border-b border-border/60 px-4 py-4 sm:px-5 [.border-b]:pb-4">
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-[#292524]">
              <CalendarOff className="h-4 w-4 text-rose-700" aria-hidden />
              4. Ngày nghỉ của nhà hàng (Ngày đóng cửa bảo trì / Lễ tết)
            </CardTitle>
            <CardDescription className="text-xs">
              Các ngày nghỉ ở đây sẽ được ưu tiên khóa hoàn toàn, không nhận bất kỳ lượt đặt bàn nào.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/80 bg-[#fffdf9] p-4">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label htmlFor="add-closed-date" className="text-xs font-semibold text-[#292524]">
                  Chọn ngày muốn đóng cửa nghỉ phục vụ
                </Label>
                <Input
                  id="add-closed-date"
                  type="date"
                  min={today}
                  value={newClosedDate}
                  onChange={(e) => setNewClosedDate(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddClosedDate}
                disabled={!newClosedDate}
                className="h-10 rounded-full bg-red-700 px-5 text-white hover:bg-red-800"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm vào danh sách ngày nghỉ
              </Button>
            </div>

            {/* Danh sách các ngày nghỉ đã thêm */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Danh sách ngày nghỉ đã lên lịch ({settings.closedDates.length} ngày)
              </p>
              {settings.closedDates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-muted-foreground">
                  Chưa có ngày nghỉ đột xuất nào được thêm. Nhà hàng hoạt động bình thường các ngày trong tuần (nghỉ Thứ Hai định kỳ).
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {settings.closedDates.map((d) => (
                    <div
                      key={d}
                      className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-medium text-red-900 shadow-xs"
                    >
                      <CalendarOff className="h-3.5 w-3.5 text-red-600" />
                      <span>{formatLongDate(d)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveClosedDate(d)}
                        aria-label={`Xóa ngày nghỉ ${d}`}
                        className="rounded-full p-0.5 text-red-600 hover:bg-red-200/80 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

