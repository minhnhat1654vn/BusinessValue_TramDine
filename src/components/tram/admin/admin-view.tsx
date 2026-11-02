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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ADMIN_CODE } from "@/lib/tram/constants";
import { AdminDashboard } from "./dashboard";
import { AdminBookingUnifiedView } from "./booking-unified-view";
import { AdminTableMap } from "./table-map";
import { AdminReservationsList } from "./reservations-list";
import { AdminCustomers } from "./customers";
import { AdminWaitlist } from "./waitlist-manager";
import { AdminSurveys } from "./surveys-view";
import { AdminBookingSettingsView } from "./booking-settings-view";
import { LoadingBlock, useToday } from "./admin-shared";

const SESSION_KEY = "tram_admin_ok";

const ADMIN_NAV_ITEMS = [
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
    key: "settings",
    label: "Cài đặt chương trình",
    description: "Ngày mở / ngày nghỉ",
    icon: SlidersHorizontal,
  },
] as const;

function LoginGate({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() === ADMIN_CODE) {
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
              <p className="text-center text-[11px] text-muted-foreground">
                Mã demo: <span className="font-mono font-medium">TRAM2025</span> ·
                đăng nhập demo, không phải bảo mật thật
              </p>
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
          <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-sm space-y-4">
            {/* Header thông tin nhà hàng & Quản trị */}
            <div className="px-1.5 pt-1 pb-3 border-b border-border/60">
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

            {/* Menu tab danh mục: Cuộn ngang trên mobile, xếp dọc dạng Sidebar trên desktop */}
            <nav
              aria-label="Menu quản trị"
              className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible tram-scroll pb-1.5 lg:pb-0"
            >
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = activeTab === item.key;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.key}
                    type="button"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveTab(item.key);
                      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors shrink-0 lg:w-full select-none",
                      active
                        ? "text-[#fffbf2] shadow-sm font-semibold"
                        : "text-stone-700 hover:bg-[#fdf0d5]/70 hover:text-[#b45309]"
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
                        active ? "text-[#fffbf2]" : "text-[#b45309]"
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 relative z-10">
                      <div className="leading-snug truncate">{item.label}</div>
                      <div
                        className={cn(
                          "text-[10.5px] font-normal leading-tight hidden lg:block transition-colors",
                          active ? "text-amber-100" : "text-muted-foreground"
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
            <div className="pt-2 border-t border-border/60">
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
                <Card className="border-border/80 bg-card p-12 text-center shadow-xs">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-bold text-stone-900">
                    Phân hệ Quản lý &amp; Báo cáo Doanh thu
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
                    Khu vực đang được chuẩn bị để tích hợp dữ liệu báo cáo tài chính chi tiết (Menu tasting 7 món, đồ uống pairing, tiền cọc và thanh toán tại quầy).
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-1.5 text-xs font-medium text-amber-900">
                    <Clock className="h-3.5 w-3.5" />
                    Dự kiến hoàn thiện vào Thứ Ba (T3) tới
                  </div>
                </Card>
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
