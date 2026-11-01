"use client";

// TRẦM Reserve — ứng dụng một trang (3 view chuyển bằng state client-side + Framer Motion page transitions)
// Trang chủ · Đặt bàn (wizard) · Quản trị
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SiteHeader, type MainView } from "@/components/tram/site-header";
import { SiteFooter } from "@/components/tram/site-footer";
import { HomeView } from "@/components/tram/home-view";
import { BookingWizard } from "@/components/tram/booking/booking-wizard";
import { AdminView } from "@/components/tram/admin/admin-view";

export default function Page() {
  const [view, setView] = useState<MainView>("home");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader view={view} onChangeView={setView} />

      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div
            key="home-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1"
          >
            <HomeView onBookNow={() => setView("booking")} />
          </motion.div>
        )}

        {view === "booking" && (
          <motion.div
            key="booking-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1"
          >
            <BookingWizard onGoHome={() => setView("home")} />
          </motion.div>
        )}

        {view === "admin" && (
          <motion.div
            key="admin-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1"
          >
            <AdminView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chỉ hiển thị footer thông thường ở các trang Đặt bàn / Quản trị, trang chủ đã có footer tự nhiên ở cuối */}
      {view !== "home" && <SiteFooter />}
    </div>
  );
}
