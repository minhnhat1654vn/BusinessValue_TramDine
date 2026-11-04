"use client";

// Phân hệ hợp nhất: Kho & Giá vốn nguyên liệu (FR-28 & FR-29)
// Tích hợp:
// 1. Đối chiếu Food Cost 7 món Concept 2 (mục tiêu 33,5% trên menu 1.190.000 đ).
// 2. Quản lý tồn kho thực tế, cảnh báo chạm ngưỡng an toàn và trừ kho theo ca 42 khách.
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Warehouse, Sparkles, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminFoodCost } from "./food-cost-view";
import { AdminInventory } from "./inventory-view";

export type WarehouseCostSubTab = "cost" | "inventory";

interface AdminWarehouseCostProps {
  initialSubTab?: WarehouseCostSubTab;
  onNavigateTab?: (tab: string) => void;
}

export function AdminWarehouseCost({
  initialSubTab = "cost",
  onNavigateTab,
}: AdminWarehouseCostProps) {
  const [activeSubTab, setActiveSubTab] = useState<WarehouseCostSubTab>(initialSubTab);

  return (
    <div className="space-y-6">
      {/* ==================== 1. THANH HEADER HỢP NHẤT & CHUYỂN TAB CON ==================== */}
      <div className="rounded-2xl border border-[#b45309]/30 bg-gradient-to-r from-[#fffcf7] via-[#fdf8f0] to-[#fffbf2] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf0d5] text-[#b45309] shadow-2xs border border-[#b45309]/20">
              {activeSubTab === "cost" ? (
                <Calculator className="h-5 w-5" aria-hidden />
              ) : (
                <Warehouse className="h-5 w-5" aria-hidden />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
                  Bếp & Kho TRẦM Reserve
                </span>
                <span className="rounded-full bg-[#fdf0d5] px-2 py-0.2 text-[9.5px] font-bold text-[#92400e] border border-[#b45309]/30">
                  Concept 2
                </span>
              </div>
              <h1 className="mt-0.5 font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#292524]">
                Kho & Giá vốn nguyên liệu
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Quản lý đơn giá nhập, phân tích Food Cost (mục tiêu 33,5%) và theo dõi biến động tồn kho thực tế cho ca 42 khách.
              </p>
            </div>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex items-center rounded-xl border border-border/80 bg-background/90 p-1 shadow-2xs self-start lg:self-center">
            <button
              type="button"
              onClick={() => setActiveSubTab("cost")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all select-none",
                activeSubTab === "cost"
                  ? "bg-[#b45309] text-white shadow-xs"
                  : "text-stone-700 hover:bg-[#fdf0d5]/70 hover:text-[#92400e]"
              )}
            >
              <Calculator className={cn("h-4 w-4", activeSubTab === "cost" ? "text-white" : "text-[#b45309]")} />
              <span>Giá vốn & Food Cost</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                  activeSubTab === "cost"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-800"
                )}
              >
                33,5%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("inventory")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all select-none",
                activeSubTab === "inventory"
                  ? "bg-[#b45309] text-white shadow-xs"
                  : "text-stone-700 hover:bg-[#fdf0d5]/70 hover:text-[#92400e]"
              )}
            >
              <Warehouse className={cn("h-4 w-4", activeSubTab === "inventory" ? "text-white" : "text-[#b45309]")} />
              <span>Quản lý tồn kho</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 2. NỘI DUNG CHI TIẾT TỪNG PHÂN HỆ ==================== */}
      <AnimatePresence mode="wait">
        {activeSubTab === "cost" ? (
          <motion.div
            key="cost-subview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <AdminFoodCost onNavigateTab={onNavigateTab} hideTitleHeader />
          </motion.div>
        ) : (
          <motion.div
            key="inventory-subview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <AdminInventory onNavigateTab={onNavigateTab} hideTitleHeader />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
