"use client";

import {
  Banknote,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorBlock, LoadingBlock, useJson } from "./admin-shared";
import { formatVND } from "@/lib/tram/format";
import { PRICES } from "@/lib/tram/constants";
import type { AdminStats } from "@/lib/tram/types";
import { FoodCostKpiWidget } from "./food-cost-kpi-widget";

interface RevenueViewProps {
  today: string;
  onNavigateTab?: (tab: string) => void;
}

export function AdminRevenueView({ today, onNavigateTab }: RevenueViewProps) {
  const { data, loading, error } = useJson<AdminStats>(
    `/api/admin/stats?today=${today}`,
  );

  if (loading && !data) return <LoadingBlock label="Đang tải dữ liệu dự báo doanh thu..." />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  const totalGuests = data.futureGuests || 0;
  const menuRevenue = data.expectedMenuRevenue || 0;
  const pairingRevenue = data.expectedPairingRevenue || 0;
  const totalRevenue = data.expectedRevenue || 0;
  const kpi = data.foodCostKpi;

  return (
    <div className="space-y-6">
      {/* ==================== 1. TIÊU ĐỀ PHÂN HỆ DOANH THU & DỰ BÁO ==================== */}
      <div className="flex flex-col gap-2 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
            Tài chính &amp; Dự báo
          </span>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Báo cáo Doanh thu &amp; Dự báo Chi phí (FR-33)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dữ liệu dự thu từ đặt bàn tương lai · Tách bạch doanh thu phần menu và đồ uống pairing
          </p>
        </div>
      </div>

      {/* ==================== 2. FR-33: WIDGET KPI FOOD COST TRÊN MÀN DỰ BÁO ==================== */}
      <FoodCostKpiWidget
        kpi={kpi}
        futureGuests={totalGuests}
        expectedPairingRevenue={pairingRevenue}
        onNavigateTab={onNavigateTab}
      />

      {/* ==================== 3. CƠ CẤU DOANH THU DỰ THU CHI TIẾT ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Doanh thu Tasting Menu */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <UtensilsCrossed className="h-4 w-4 text-[#b45309]" />
                Doanh thu Tasting Menu
              </CardTitle>
              <Badge className="border-amber-200 bg-[#fdf0d5] text-[#92400e] text-[10px]">
                {totalGuests} khách
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-heading text-2xl font-bold tabular-nums text-[#292524]">
              {formatVND(menuRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatVND(PRICES.menu)}/khách · 7 món "Hành trình vị Việt"
            </p>
            <div className="pt-2 text-[11px] text-stone-600 border-t border-border/50">
              Cơ sở tính toán cho chỉ số KPI Food Cost (FR-33)
            </div>
          </CardContent>
        </Card>

        {/* Doanh thu Đồ uống Pairing */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <Wine className="h-4 w-4 text-purple-700" />
                Doanh thu Pairing (Vang / Trà)
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                Phụ trợ
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-heading text-2xl font-bold tabular-nums text-purple-900">
              {formatVND(pairingRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              Wine (+650.000 đ) hoặc Tea (+350.000 đ)
            </p>
            <div className="pt-2 text-[11px] text-muted-foreground border-t border-border/50 italic">
              Không ăn vào định lượng BOM, loại trừ khỏi mẫu số food cost
            </div>
          </CardContent>
        </Card>

        {/* Tổng Doanh thu Dự thu */}
        <Card className="border-border/80 bg-gradient-to-br from-[#fdf0d5]/40 to-card shadow-xs border-amber-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-[#b45309]" />
                Tổng Doanh thu Dự thu
              </CardTitle>
              <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 text-[10px]">
                Tương lai
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-heading text-2xl font-bold tabular-nums text-[#92400e]">
              {formatVND(totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              Gồm phần menu tasting và toàn bộ gói pairing
            </p>
            <div className="pt-2 text-[11px] font-medium text-emerald-800 border-t border-amber-200/60">
              Lãi gộp ước tính:{" "}
              {kpi
                ? formatVND(
                    (totalGuests > 0 ? kpi.expectedGrossProfit : kpi.grossProfitPerGuest) +
                      pairingRevenue,
                  )
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

