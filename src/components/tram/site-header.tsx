"use client";

// Thanh điều hướng chính — 3 view chuyển bằng state client-side
import { CalendarDays, Home, LayoutDashboard, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
        <button
          type="button"
          onClick={() => onChangeView("home")}
          className="flex min-h-11 items-center gap-2.5 rounded-md px-1 py-1 text-left transition-opacity hover:opacity-80"
          aria-label="TRẦM — về trang chủ"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#b45309]/30 bg-[#fdf0d5] text-[#b45309]">
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
        </button>

        {/* Điều hướng */}
        <nav aria-label="Điều hướng chính" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = view === item.key;
            const Icon = item.icon;
            return (
              <Button
                key={item.key}
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => onChangeView(item.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-11 min-w-11 gap-1.5 rounded-full px-3 text-sm sm:px-4",
                  active
                    ? "bg-[#b45309] text-[#fffbf2] shadow-sm"
                    : "text-stone-600 hover:bg-[#f5efe4] hover:text-[#b45309]",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
