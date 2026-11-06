"use client";

// Phân hệ hợp nhất: Kho & Giá vốn nguyên liệu (FR-28 & FR-29)
// Tích hợp:
// 1. Đối chiếu Food Cost 7 món Concept 2 (mục tiêu 34,7% trên menu 1.440.000 đ).
// 2. Quản lý tồn kho thực tế, cảnh báo chạm ngưỡng an toàn và trừ kho theo ca 40 khách.
// 3. Phân trang giới hạn 20 dòng / trang.
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Warehouse } from "lucide-react";
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
      {/* ==================== 1. THANH HEADER HỢP NHẤT TỐI GIẢN ==================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
            Bếp &amp; Kho · Concept 2
          </span>
          <h1 className="mt-0.5 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Kho &amp; Giá vốn nguyên liệu
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Đối chiếu Food Cost 7 món (mục tiêu 34,7%) &amp; Quản lý tồn kho thực tế ca 40 khách (giới hạn 20 dòng / trang)
          </p>
        </div>

        {/* Bộ chuyển tab con tối giản */}
        <div className="flex items-center rounded-xl border border-stone-200 bg-stone-100/80 p-1 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveSubTab("cost")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all select-none",
              activeSubTab === "cost"
                ? "bg-white text-[#92400e] shadow-xs"
                : "text-stone-600 hover:text-stone-900",
            )}
          >
            <Calculator className="h-3.5 w-3.5 text-[#b45309]" />
            <span>Giá vốn &amp; Food Cost</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("inventory")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all select-none",
              activeSubTab === "inventory"
                ? "bg-white text-[#92400e] shadow-xs"
                : "text-stone-600 hover:text-stone-900",
            )}
          >
            <Warehouse className="h-3.5 w-3.5 text-[#b45309]" />
            <span>Quản lý tồn kho</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. NỘI DUNG TỪNG PHÂN HỆ ==================== */}
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
