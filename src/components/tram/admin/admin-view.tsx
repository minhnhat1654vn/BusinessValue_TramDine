"use client";

// Màn Quản trị — đăng nhập bằng mã demo (sessionStorage) + các phân hệ quản lý
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Table2,
  Users,
  ClipboardList,
  SlidersHorizontal,
  Star,
  ShieldCheck,
  TrendingUp,
  Clock,
  ChefHat,
  ChevronDown,
  Calculator,
  Warehouse,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ADMIN_CODE, ADMIN_CODES } from "@/lib/tram/constants";
import { AdminDashboard } from "./dashboard";
import { AdminRevenueView } from "./revenue-view";
import { AdminGoldenHourView } from "./golden-hour-view";
import { AdminBookingUnifiedView } from "./booking-unified-view";
import { AdminTableMap } from "./table-map";
import { AdminReservationsList } from "./reservations-list";
import { AdminCustomers } from "./customers";
import { AdminWaitlist } from "./waitlist-manager";
import { AdminSurveys } from "./surveys-view";
import { AdminBookingSettingsView } from "./booking-settings-view";
import { AdminRecipes } from "./recipes-view";
import { AdminFoodCost } from "./food-cost-view";
import { AdminInventory } from "./inventory-view";
import { AdminWarehouseCost } from "./warehouse-cost-view";
import { LoadingBlock, useToday } from "./admin-shared";

const SESSION_KEY = "tram_admin_ok";

interface AdminNavSubItem {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

interface AdminNavItem {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children?: AdminNavSubItem[];
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Chỉ số & công suất",
    icon: LayoutDashboard,
  },
  {
    key: "revenue",
    label: "Doanh thu",
    description: "Báo cáo doanh thu",
    icon: TrendingUp,
  },
  {
    key: "golden-hour",
    label: "Khung Giờ Vàng",
    description: "Voucher Zalo OA T4-T6",
    icon: Zap,
  },
  {
    key: "booking",
    label: "Đặt bàn & Sơ đồ",
    description: "10 bàn & danh sách",
    icon: ClipboardList,
  },
  {
    key: "customers",
    label: "Khách hàng",
    description: "Hồ sơ & chi tiêu",
    icon: Users,
  },
  {
    key: "surveys",
    label: "Khảo sát",
    description: "Đánh giá thực khách",
    icon: Star,
  },
  {
    key: "waitlist",
    label: "Waitlist",
    description: "Danh sách chờ",
    icon: CalendarRange,
  },
  {
    key: "bom-suite",
    label: "Kho & Công thức (BOM)",
    description: "Nguyên liệu · Định lượng · Tồn kho",
    icon: Warehouse,
    children: [
      {
        key: "inventory",
        label: "Tồn kho nguyên vật liệu",
        description: "Nhập hàng · Kiểm kê · Dự báo thiếu hụt",
        icon: Warehouse,
      },
      {
        key: "recipes",
        label: "Concept & Công thức (BOM)",
        description: "Quản lý Concept · Thiết kế món · Định lượng",
        icon: ChefHat,
      },
      {
        key: "food-cost",
        label: "Phân tích Food Cost",
        description: "Mục tiêu 34,7% · Cơ cấu chi phí",
        icon: Calculator,
      },
    ],
  },
  {
    key: "settings",
    label: "Cài đặt chương trình",
    description: "Ngày mở / ngày nghỉ",
    icon: SlidersHorizontal,
  },
];

function LoginGate({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (ADMIN_CODES.includes(clean) || clean === ADMIN_CODE || code.trim() === "123456") {
      sessionStorage.setItem(SESSION_KEY, "1");
      toast.success("Đăng nhập quản trị thành công.");
      onOk();
    } else {
      toast.error("Mã truy cập không đúng.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <Card className="w-full border-border/80 bg-card shadow-md">
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
              <KeyRound className="h-6 w-6" aria-hidden />
            </div>
            <CardTitle className="font-heading text-2xl text-[#292524]">
              Quản trị TRẦM
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Nhập mã truy cập dành cho quản lý nhà hàng
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-code">Mã truy cập</Label>
                <Input
                  id="admin-code"
                  type="password"
                  inputMode="text"
                  autoComplete="off"
                  placeholder="••••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-11 text-center font-mono tracking-[0.3em]"
                />
              </div>
              <Button
                type="submit"
                disabled={checking || code.length === 0}
                className="h-12 w-full rounded-full bg-[#b45309] text-[15px] text-[#fffbf2] hover:bg-[#92400e]"
              >
                Vào màn quản trị
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}

export function AdminView() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [bookingTargetDate, setBookingTargetDate] = useState<string | undefined>(undefined);

  const handleNavigateTab = (tab: string, date?: string) => {
    if (date) setBookingTargetDate(date);
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  // Khi chuyển tab quản trị (qua sidebar hoặc điều hướng), luôn hiển thị ở đỉnh đầu trang
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activeTab]);
  const today = useToday();

  const isBomActive =
    activeTab === "inventory" ||
    activeTab === "concepts" ||
    activeTab === "recipes" ||
    activeTab === "food-cost";
  const [bomDropdownOpen, setBomDropdownOpen] = useState(true);

  // Tự động mở dropdown BOM khi tab tích cực là 1 trong 3 tab con
  useEffect(() => {
    if (isBomActive) {
      setBomDropdownOpen(true);
    }
  }, [isBomActive]);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  if (authed === null) {
    return (
      <main className="mx-auto w-full max-w-7xl 2xl:max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
        <LoadingBlock label="Đang kiểm tra phiên quản trị..." />
      </main>
    );
  }

  if (!authed) {
    return <LoginGate onOk={() => setAuthed(true)} />;
  }

  return (
    <main className="mx-auto w-full max-w-[1520px] px-3 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
        {/* ==================== SIDEBAR ĐIỀU HƯỚNG BÊN TRÁI ==================== */}
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-20 z-20">
          <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-sm flex flex-col lg:max-h-[calc(100vh-6rem)]">
            {/* Header thông tin nhà hàng & Quản trị */}
            <div className="px-1.5 pt-1 pb-3 border-b border-border/60 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
                  Khu vực nội bộ
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <h1 className="mt-1 font-heading text-lg font-bold text-[#292524] sm:text-xl">
                Quản trị TRẦM
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Fine Dining · Q.3, TP.HCM
              </p>
            </div>

            {/* Menu tab danh mục: Cuộn ngang trên mobile, xếp dọc cuộn êm có scroll bar trên desktop */}
            <nav
              aria-label="Menu quản trị"
              className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto overscroll-contain tram-scroll py-2 flex-1 min-h-0 pr-1 lg:pr-1.5"
            >
              {ADMIN_NAV_ITEMS.map((item) => {
                if (item.children) {
                  const hasActiveChild = item.children.some((c) => c.key === activeTab);
                  return (
                    <div key={item.key} className="shrink-0 lg:w-full space-y-1">
                      {/* Nút cha Dropdown Công thức (BOM) */}
                      <motion.button
                        data-tab={item.key}
                        type="button"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (!hasActiveChild) {
                            setActiveTab("inventory");
                            setBomDropdownOpen(true);
                          } else {
                            setBomDropdownOpen((prev) => !prev);
                          }
                        }}
                        className={cn(
                          "relative flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors w-full select-none",
                          hasActiveChild
                            ? "border border-[#b45309]/40 bg-[#fdf0d5] font-semibold text-[#92400e] shadow-2xs"
                            : "text-stone-700 hover:bg-[#fdf0d5]/70 hover:text-[#b45309]",
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              hasActiveChild ? "text-[#b45309]" : "text-[#b45309]",
                            )}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="leading-snug truncate font-semibold">
                              {item.label}
                            </div>
                            <div
                              className={cn(
                                "text-[10.5px] font-normal leading-tight hidden lg:block transition-colors",
                                hasActiveChild ? "text-[#92400e]/80" : "text-muted-foreground",
                              )}
                            >
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.2 text-[9.5px] font-bold tabular-nums",
                              hasActiveChild
                                ? "bg-[#b45309] text-white"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {item.children.length}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-[#b45309] transition-transform duration-200 hidden lg:block",
                              bomDropdownOpen ? "rotate-180" : "",
                            )}
                            aria-hidden
                          />
                        </div>
                      </motion.button>

                      {/* Dropdown 3 sub-items: Công thức (BOM), Giá vốn nguyên liệu, Quản lý tồn kho */}
                      <AnimatePresence initial={false}>
                        {bomDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="hidden lg:block ml-3 pl-2.5 border-l-2 border-[#b45309]/35 space-y-1 py-1"
                          >
                            {item.children.map((sub) => {
                              const isSubActive = activeTab === sub.key;
                              const SubIcon = sub.icon;
                              return (
                                <button
                                  key={sub.key}
                                  data-tab={sub.key}
                                  type="button"
                                  onClick={() => {
                                    setActiveTab(sub.key);
                                    if (typeof window !== "undefined")
                                      window.scrollTo({ top: 0, behavior: "instant" });
                                  }}
                                  className={cn(
                                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors w-full select-none",
                                    isSubActive
                                      ? "bg-[#b45309] text-white font-semibold shadow-xs"
                                      : "text-stone-700 hover:bg-[#fdf0d5] hover:text-[#92400e]",
                                  )}
                                >
                                  <SubIcon
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0",
                                      isSubActive ? "text-white" : "text-[#b45309]",
                                    )}
                                    aria-hidden
                                  />
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">{sub.label}</div>
                                    <div
                                      className={cn(
                                        "text-[9.5px] truncate leading-tight",
                                        isSubActive ? "text-amber-100" : "text-muted-foreground",
                                      )}
                                    >
                                      {sub.description}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                const active = activeTab === item.key;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.key}
                    data-tab={item.key}
                    type="button"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveTab(item.key);
                      if (typeof window !== "undefined")
                        window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors shrink-0 lg:w-full select-none",
                      active
                        ? "text-[#fffbf2] shadow-sm font-semibold"
                        : "text-stone-700 hover:bg-[#fdf0d5]/70 hover:text-[#b45309]",
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="admin-active-tab-indicator"
                        className="absolute inset-0 rounded-xl bg-[#b45309] ring-1 ring-[#b45309]/50 z-0"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors relative z-10",
                        active ? "text-[#fffbf2]" : "text-[#b45309]",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 relative z-10">
                      <div className="leading-snug truncate">{item.label}</div>
                      <div
                        className={cn(
                          "text-[10.5px] font-normal leading-tight hidden lg:block transition-colors",
                          active ? "text-amber-100" : "text-muted-foreground",
                        )}
                      >
                        {item.description}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </nav>

            {/* Chân Sidebar: Thông tin phiên & Nút Đăng xuất */}
            <div className="pt-2 border-t border-border/60 shrink-0 mt-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem(SESSION_KEY);
                  setAuthed(false);
                  toast.success("Đã đăng xuất màn quản trị.");
                }}
                className="w-full justify-start rounded-xl text-stone-600 hover:bg-destructive/10 hover:text-destructive text-xs h-9 px-3 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden />
                Đăng xuất
              </Button>
            </div>
          </div>
        </aside>

        {/* ==================== KHU VỰC NỘI DUNG CHÍNH (BÊN PHẢI) ==================== */}
        <section className="flex-1 min-w-0 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6 focus-visible:outline-none"
            >
              {activeTab === "dashboard" && (
                today ? <AdminDashboard today={today} onNavigateTab={handleNavigateTab} /> : <LoadingBlock />
              )}

              {activeTab === "revenue" && (
                today ? (
                  <AdminRevenueView today={today} onNavigateTab={handleNavigateTab} />
                ) : (
                  <LoadingBlock />
                )
              )}

              {activeTab === "golden-hour" && (
                today ? (
                  <AdminGoldenHourView today={today} onNavigateTab={handleNavigateTab} />
                ) : (
                  <LoadingBlock />
                )
              )}

              {(activeTab === "booking" || activeTab === "map" || activeTab === "list") && (
                today ? (
                  <AdminBookingUnifiedView
                    today={today}
                    targetDate={bookingTargetDate}
                    onNavigateToSettings={() => setActiveTab("settings")}
                  />
                ) : (
                  <LoadingBlock />
                )
              )}

              {activeTab === "customers" && <AdminCustomers />}

              {activeTab === "surveys" && <AdminSurveys />}

              {activeTab === "waitlist" && (
                <AdminWaitlist onNavigateToBooking={() => handleNavigateTab("booking")} />
              )}

              {(activeTab === "recipes" || activeTab === "concepts" || activeTab === "food-cost") && (
                <AdminRecipes
                  initialViewMode={activeTab === "food-cost" ? "food-cost" : "recipes"}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {(activeTab === "inventory" || activeTab === "warehouse-cost") && (
                <AdminInventory onNavigateTab={handleNavigateTab} today={today} />
              )}

              {activeTab === "settings" && (
                <AdminBookingSettingsView onBackToBooking={() => setActiveTab("booking")} />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}
