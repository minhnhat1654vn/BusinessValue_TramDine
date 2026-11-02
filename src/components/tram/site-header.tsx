"use client";

// Thanh điều hướng chính — 3 view chuyển bằng state client-side + Framer Motion pill indicator
import { motion } from "framer-motion";
import Image from "next/image";
import { CalendarDays, Home, LayoutDashboard, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

export type MainView = "home" | "booking" | "admin";

const NAV_ITEMS: {
  key: MainView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
    { key: "home", label: "Trang chủ", icon: Home },
    { key: "booking", label: "Đặt bàn", icon: CalendarDays },
    { key: "admin", label: "Quản trị", icon: LayoutDashboard },
  ];

interface SiteHeaderProps {
  view: MainView;
  onChangeView: (view: MainView) => void;
}

export function SiteHeader({ view, onChangeView }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-[#faf8f3]/90 backdrop-blur supports-[backdrop-filter]:bg-[#faf8f3]/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChangeView("home")}
          className="flex min-h-11 items-center gap-2.5 rounded-md px-1 py-1 text-left transition-opacity hover:opacity-90"
          aria-label="TRẦM — về trang chủ"
        >
          <span className="animate-tram-glow flex h-9 w-9 items-center justify-center rounded-full border border-[#b45309]/30 bg-[#fdf0d5] text-[#b45309]">
            <UtensilsCrossed className="h-4 w-4" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="font-heading block text-xl font-semibold tracking-[0.22em] text-[#292524]">
              TRẦM
            </span>
            <span className="hidden text-[11px] tracking-wide text-muted-foreground sm:block">
              Hành trình vị Việt
            </span>
          </span>
        </motion.button>

        {/* Điều hướng với Sliding Pill Animation */}
        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-1 rounded-full border border-border/70 bg-[#f5efe4]/70 p-1"
        >
          {NAV_ITEMS.map((item) => {
            const active = view === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                data-nav={item.key}
                onClick={() => onChangeView(item.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 min-w-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors sm:px-4",
                  active
                    ? "text-[#fffbf2]"
                    : "text-stone-600 hover:text-[#b45309]",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="active-main-nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-[#b45309] shadow-sm"
                    aria-hidden="true"
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" aria-hidden />
                <span className="relative z-10 hidden sm:inline">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
