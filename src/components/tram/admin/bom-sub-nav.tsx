"use client";

// Thanh điều hướng dùng chung cho hệ thống Công thức (BOM), Giá vốn & Quản lý tồn kho
// Đảm bảo 3 phân hệ luôn đồng bộ và liên kết matching 100% thời gian thực.
import { ChefHat, Calculator, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

export type BomTabKey = "recipes" | "warehouse-cost" | "food-cost" | "inventory";

interface BomSubNavProps {
  activeTab: BomTabKey;
  onNavigateTab?: (tab: string) => void;
  title?: string;
}

export function AdminBomSubNav({
  activeTab,
  onNavigateTab,
  title = "Hệ sinh thái Công thức (BOM) & Bếp nhà hàng",
}: BomSubNavProps) {
  const tabs = [
    {
      key: "recipes" as const,
      label: "Công thức (BOM)",
      desc: "Định lượng 7 món / khách",
      icon: ChefHat,
    },
    {
      key: "warehouse-cost" as const,
      label: "Kho & Giá vốn nguyên liệu",
      desc: "Food Cost (33,5%) & Tồn kho thực tế",
      icon: Warehouse,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#b45309]/30 bg-gradient-to-r from-[#fffcf7] via-[#fdf8f0] to-[#fffbf2] p-3 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#fdf0d5] text-[#b45309] shadow-2xs">
            <ChefHat className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <span className="text-xs sm:text-sm font-bold text-[#292524]">{title}</span>
          </div>
        </div>

        {/* 3 Nút chuyển tab matching nhanh */}
        {onNavigateTab && (
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-background/90 p-1 shadow-2xs">
            {tabs.map((tab) => {
              const active = tab.key === "recipes" ? activeTab === "recipes" : (activeTab === "warehouse-cost" || activeTab === "food-cost" || activeTab === "inventory");
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onNavigateTab(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    active
                      ? "bg-[#b45309] text-white shadow-xs"
                      : "text-stone-700 hover:bg-[#fdf0d5]/70 hover:text-[#92400e]",
                  )}
                >
                  <Icon
                    className={cn("h-3.5 w-3.5", active ? "text-white" : "text-[#b45309]")}
                    aria-hidden
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

