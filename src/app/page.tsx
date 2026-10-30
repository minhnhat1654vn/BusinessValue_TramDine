"use client";

// TRẦM Reserve — ứng dụng một trang (3 view chuyển bằng state client-side)
// Trang chủ · Đặt bàn (wizard 5 bước) · Quản trị
import { useState } from "react";
import { SiteHeader, type MainView } from "@/components/tram/site-header";
import { SiteFooter } from "@/components/tram/site-footer";
import { HomeView } from "@/components/tram/home-view";
import { BookingWizard } from "@/components/tram/booking/booking-wizard";

function AdminViewLazy() {
  // Admin chứa tabs + recharts — tách import động để trang chủ nhẹ hơn
  const [AdminView, setAdminView] = useState<
    React.ComponentType | null
  >(null);
  import("@/components/tram/admin/admin-view").then((mod) => {
    setAdminView(() => mod.AdminView);
  });
  return null;
}

export default function Page() {
  const [view, setView] = useState<MainView>("home");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader view={view} onChangeView={setView} />

      {view === "home" && <HomeView onBookNow={() => setView("booking")} />}
      {view === "booking" && <BookingWizard onGoHome={() => setView("home")} />}
      {view === "admin" && <AdminViewSection />}

      <SiteFooter />
    </div>
  );
}

function AdminViewSection() {
  const [AdminView, setAdminView] = useState<React.ComponentType | null>(null);
  if (typeof window !== "undefined" && !AdminView) {
    import("@/components/tram/admin/admin-view").then((mod) => {
      setAdminView(() => mod.AdminView);
    });
  }
  if (!AdminView) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#fdf0d5] border-t-[#b45309]" />
        <p className="text-sm">Đang mở màn quản trị...</p>
      </div>
    );
  }
  return <AdminView />;
}

// Ghi chú: AdminViewLazy không dùng nữa — giữ component AdminViewSection trực tiếp.
export { AdminViewLazy as _unused };
