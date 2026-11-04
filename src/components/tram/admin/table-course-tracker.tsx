"use client";

// Component Đối soát & Xuất món Tasting theo bàn (Quy trình phục vụ & Bàn ăn)
// Ràng buộc nghiệp vụ:
// 1. Chưa check-in thì chưa được ra món
// 2. Khi chưa ra hết 7 món thì KHÔNG được check-out
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Lock,
  LogIn,
  LogOut,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MENU_ITEMS } from "@/lib/tram/constants";
import type { ReservationDTO } from "@/lib/tram/types";

export interface TableCourseTrackerProps {
  reservation: ReservationDTO;
  onUpdate: (updated: ReservationDTO) => void;
  acting: boolean;
  setActing: (val: boolean) => void;
  onCheckoutSuccess?: () => void;
  onCheckin?: () => void;
}

export function TableCourseTracker({
  reservation,
  onUpdate,
  acting,
  setActing,
  onCheckoutSuccess,
  onCheckin,
}: TableCourseTrackerProps) {
  let servedData: { served: number[]; servedAt: Record<string, string> } = { served: [], servedAt: {} };
  try {
    if (reservation.selectedDishes && reservation.selectedDishes.startsWith("{")) {
      servedData = JSON.parse(reservation.selectedDishes);
    }
  } catch {}
  const servedList = Array.isArray(servedData.served) ? servedData.served : [];
  const servedCount = servedList.length;
  const isAllServed = servedCount >= 7;
  const isSeated = reservation.status === "SEATED";

  // Xuất từng món
  const handleServeDish = async (dishIndex: number) => {
    if (!isSeated) {
      toast.warning("Khách chưa Check-in vào bàn. Vui lòng check-in trước khi xuất món!");
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "serve_dish", dishIndex }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Lỗi xuất món");
      toast.success(body.message);
      onUpdate(body.reservation);
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setActing(false);
    }
  };

  // Hoàn lại món
  const handleUnserveDish = async (dishIndex: number) => {
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unserve_dish", dishIndex }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Lỗi hoàn lại món");
      toast.success(body.message);
      onUpdate(body.reservation);
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setActing(false);
    }
  };

  // Xuất toàn bộ 7 món
  const handleServeAll = async () => {
    if (!isSeated) {
      toast.warning("Khách chưa Check-in vào bàn. Vui lòng check-in trước khi xuất món!");
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "serve_all_dishes" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Lỗi xuất toàn bộ món");
      toast.success(body.message);
      onUpdate(body.reservation);
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setActing(false);
    }
  };

  // Check-out trả bàn (Bắt buộc phải ra hết 7 món)
  const handleCheckout = async () => {
    if (!isAllServed) {
      toast.error(`Chưa thể Check-out: Bàn chưa ra hết 7 món Tasting (mới ra ${servedCount}/7 món). Cần ra đủ 7 món trước khi trả bàn!`);
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Lỗi check-out");
      toast.success(body.message);
      onUpdate(body.reservation);
      onCheckoutSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setActing(false);
    }
  };

  // TRƯỜNG HỢP 1: CHƯA CHECK-IN THÌ CHƯA ĐƯỢC RA MÓN
  if (!isSeated) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-center space-y-2.5 shadow-2xs">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-[#b45309]">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-stone-900">
            Khách chưa Check-in vào bàn
          </h4>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-0.5 leading-relaxed">
            Quy trình phục vụ: <strong>Chưa check-in thì chưa được ra món</strong>. Vui lòng bấm Check-in khi khách có mặt tại bàn để bắt đầu đối soát &amp; xuất món.
          </p>
        </div>
        {onCheckin && (
          <Button
            type="button"
            size="sm"
            disabled={acting}
            onClick={onCheckin}
            className="h-8 rounded-full bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-semibold px-4 shadow-xs mt-1"
          >
            <LogIn className="mr-1.5 h-3.5 w-3.5" />
            Khách đã đến &amp; Check-in
          </Button>
        )}
      </div>
    );
  }

  // TRƯỜNG HỢP 2: ĐÃ CHECK-IN (SEATED) — ĐỐI SOÁT XUẤT MÓN & CHECKOUT
  return (
    <div className="rounded-2xl border border-amber-900/15 bg-[#fffdfa] p-3.5 space-y-3 shadow-xs">
      {/* Header đối soát */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fdf0d5] text-[#b45309]">
            <UtensilsCrossed className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900">
              Đối soát xuất món Tasting ({reservation.partySize} khách)
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Mỗi món xuất ra tự động trừ kho nguyên liệu theo định lượng BOM
            </p>
          </div>
        </div>

        <Badge
          className={cn(
            "text-[10.5px] font-bold px-2 py-0.5",
            isAllServed
              ? "bg-emerald-600 text-white"
              : "bg-amber-100 text-[#92400e] border-amber-300"
          )}
        >
          {servedCount}/7 món đã ra
        </Badge>
      </div>

      {/* Thanh tiến độ ra món */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10.5px] font-semibold text-stone-600">
          <span>Tiến độ ra món Bàn {reservation.table.code}</span>
          <span className="text-[#b45309] font-bold">{Math.round((servedCount / 7) * 100)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-stone-200/80 overflow-hidden">
          <div
            style={{ width: `${(servedCount / 7) * 100}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-all duration-300"
          />
        </div>
      </div>

      {/* Danh sách 7 món Tasting */}
      <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1">
        {MENU_ITEMS.map((dish) => {
          const isServed = servedList.includes(dish.index);
          const servedTime = servedData.servedAt?.[String(dish.index)];

          return (
            <div
              key={dish.index}
              className={cn(
                "flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition-colors",
                isServed
                  ? "bg-emerald-50/80 border-emerald-300/80 text-emerald-950"
                  : "bg-white border-stone-200/80 hover:border-amber-400/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                    isServed ? "bg-emerald-700 text-white" : "bg-stone-200 text-stone-700"
                  )}
                >
                  0{dish.index}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-stone-900">{dish.name}</div>
                  <div className="text-[10px] text-muted-foreground">{dish.region} · {reservation.partySize} suất</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isServed ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Đã ra {servedTime ? `· ${servedTime}` : ""}
                    </span>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => handleUnserveDish(dish.index)}
                      title="Hoàn lại món nếu bấm nhầm"
                      className="text-[10px] text-muted-foreground hover:text-stone-900 hover:underline px-1 py-0.5"
                    >
                      Hoàn lại
                    </button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={acting}
                    onClick={() => handleServeDish(dish.index)}
                    className="h-7 px-2.5 text-[11px] font-semibold bg-[#b45309] hover:bg-[#92400e] text-white shadow-2xs"
                  >
                    <Flame className="mr-1 h-3 w-3" /> Xuất món ({reservation.partySize} suất)
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cụm thao tác xuất toàn bộ & Check-out */}
      <div className="pt-2 border-t border-stone-200/80 space-y-2">
        {!isAllServed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={acting}
            onClick={handleServeAll}
            className="w-full h-8 text-xs font-semibold border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-[#b45309]" /> Xuất toàn bộ 7 món ({reservation.partySize} khách)
          </Button>
        )}

        {/* RÀNG BUỘC NGHIỆP VỤ: KHI CHƯA RA HẾT MÓN THÌ KHÔNG ĐƯỢC CHECKOUT */}
        {!isAllServed ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/80 p-2.5 text-[11px] text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-semibold">Chưa thể Check-out:</span> Bàn chưa đối soát ra hết 7 món Tasting (mới ra <strong>{servedCount}/7 món</strong>, còn thiếu <strong>{7 - servedCount} món</strong>).
                <div className="text-[10px] text-amber-800 mt-0.5">
                  Quy định: Cần đối soát ra đủ 7/7 món trước khi thanh toán &amp; trả bàn.
                </div>
              </div>
            </div>

            <Button
              type="button"
              disabled={true}
              title={`Cần xuất đủ 7 món để Check-out (hiện mới ra ${servedCount}/7 món)`}
              className="w-full h-11 rounded-full bg-stone-200 text-stone-400 font-bold text-xs sm:text-sm cursor-not-allowed opacity-75 shadow-none"
            >
              <Lock className="mr-2 h-4 w-4" />
              Check-out (Khóa: Cần xuất đủ 7 món)
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 p-2 text-[11px] text-emerald-950 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Đã ra đủ 7/7 món Tasting! Bàn đã sẵn sàng để check-out hoàn tất bữa ăn.</span>
            </div>

            <Button
              type="button"
              disabled={acting}
              onClick={() => void handleCheckout()}
              className="w-full h-11 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-transform active:scale-[0.99]"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Check-out (Đã ra đủ 7 món · Trả bàn)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
