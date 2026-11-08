"use client";

// Trang chủ TRẦM — thiết kế FULL-PAGE: mỗi section = đúng 1 màn hình (100% viewport bên dưới header)
// Cuộn chuột / phím mũi tên / vuốt để chuyển section:
//   Mở đầu → Câu chuyện → 7 món (trượt ngang sang phải) → Pairing → Đánh giá → Thông tin
// Tích hợp Framer Motion (page transitions, reveal theo section đang hiển thị, parallax ảnh món)
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Banknote,
  Beef,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Dessert,
  Flame,
  Fish,
  Info,
  MapPin,
  Phone,
  Quote,
  Soup,
  Sparkles,
  Sprout,
  Star,
  Utensils,
  Wheat,
  Wine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MENU_ITEMS, MenuItem, PRICES, RESTAURANT, REVIEWS } from "@/lib/tram/constants";
import { formatVND } from "@/lib/tram/format";
import { cn } from "@/lib/utils";

const DISH_ICONS = [Wheat, Fish, Sprout, Flame, Beef, Soup, Dessert];

/* ------------------------------------------------------------------ */
/* Cấu hình full-page                                                  */
/* ------------------------------------------------------------------ */
// Hàng dọc: 0 Mở đầu · 1 Câu chuyện · 2 Menu (7 slide ngang) · 3 Pairing · 4 Đánh giá · 5 Thông tin
const ROW_COUNT = 6;
const MENU_ROW = 2;
const DISH_COUNT = MENU_ITEMS.length;
const TOTAL_STEPS = MENU_ROW + DISH_COUNT + (ROW_COUNT - MENU_ROW - 1);

const STEP_LABELS = [
  "Mở đầu",
  "Câu chuyện",
  ...MENU_ITEMS.map((m) => `Món 0${m.index}`),
  "Pairing",
  "Đánh giá",
  "Thông tin",
];

const PAGE_EASE = [0.76, 0, 0.24, 1] as const;
const PAGE_DURATION = 0.9;
const LOCK_MS = 950; // khóa cuộn trong lúc chuyển section
const GESTURE_GAP_MS = 220; // khoảng lặng để coi là một cử chỉ cuộn mới (chống quán tính trackpad)

/** Quy đổi bước (0..TOTAL_STEPS-1) sang vị trí hàng dọc + slide món ngang */
function stepToPosition(step: number) {
  const dish = Math.min(Math.max(step - MENU_ROW, 0), DISH_COUNT - 1);
  let row: number;
  if (step < MENU_ROW) row = step;
  else if (step < MENU_ROW + DISH_COUNT) row = MENU_ROW;
  else row = MENU_ROW + 1 + (step - MENU_ROW - DISH_COUNT);
  return { row, dish };
}

/** Kiểm tra phần tử còn cuộn được theo hướng dir hay không */
function canScroll(el: HTMLElement, dir: 1 | -1) {
  if (dir > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 2;
  return el.scrollTop > 2;
}

/* ------------------------------------------------------------------ */
/* Animation variants                                                  */
/* ------------------------------------------------------------------ */
const revealContainer: Variants = {
  hidden: { opacity: 0, transition: { duration: 0.25 } },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.35 },
  },
};

const revealUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

// Nội dung món trượt vào từ bên phải — nhấn mạnh hướng chuyển ngang
const revealRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

/* ------------------------------------------------------------------ */
/* Thành phần dùng chung                                               */
/* ------------------------------------------------------------------ */
function SectionLabel({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "left";
}) {
  return (
    <p
      className={cn(
        "mb-3 text-xs font-medium uppercase tracking-[0.3em] text-[#b45309]",
        align === "center" ? "text-center" : "text-left",
      )}
    >
      {children}
    </p>
  );
}

/** Một màn hình: chiếm trọn khung nhìn; nếu màn hình quá thấp thì cho cuộn nội bộ */
function Screen({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      data-fp-scroll
      className={cn(
        "tram-scroll relative h-full w-full overflow-x-hidden overflow-y-auto",
        className,
      )}
    >
      {children}
    </section>
  );
}

interface HomeViewProps {
  onBookNow: () => void;
}

export function HomeView({ onBookNow }: HomeViewProps) {
  const [step, setStep] = useState(0);
  const [detailDish, setDetailDish] = useState<MenuItem | null>(null);

  const containerRef = useRef<HTMLElement>(null);
  const stepRef = useRef(0);
  const lockUntilRef = useRef(0);
  const lastWheelRef = useRef(0);
  const gestureConsumedRef = useRef(false);
  const dialogOpenRef = useRef(false);

  const { row, dish } = stepToPosition(step);
  const onDark = row === MENU_ROW; // 7 slide món dùng nền đen

  useEffect(() => {
    dialogOpenRef.current = !!detailDish;
  }, [detailDish]);

  const goTo = useCallback((target: number) => {
    const next = Math.min(Math.max(target, 0), TOTAL_STEPS - 1);
    if (next === stepRef.current) return;
    stepRef.current = next;
    lockUntilRef.current = performance.now() + LOCK_MS;
    setStep(next);
  }, []);

  const go = useCallback((dir: 1 | -1) => goTo(stepRef.current + dir), [goTo]);

  /* ---------------- Cuộn chuột / trackpad ---------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (dialogOpenRef.current) return;

      const inMenu = stepToPosition(stepRef.current).row === MENU_ROW;
      const useX = inMenu && Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = useX ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      const dir: 1 | -1 = delta > 0 ? 1 : -1;

      const now = performance.now();
      const gap = now - lastWheelRef.current;
      lastWheelRef.current = now;
      if (gap > GESTURE_GAP_MS) gestureConsumedRef.current = false;

      // Section dài hơn màn hình (máy thấp) → ưu tiên cuộn nội bộ trước
      const scroller = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-fp-scroll]",
      );
      if (!useX && scroller && canScroll(scroller, dir)) {
        gestureConsumedRef.current = true;
        return;
      }

      e.preventDefault();
      if (Math.abs(delta) < 8) return;
      if (now < lockUntilRef.current) return;
      if (gestureConsumedRef.current) return;

      gestureConsumedRef.current = true;
      go(dir);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [go]);

  /* ---------------- Vuốt trên thiết bị cảm ứng ---------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let start: { x: number; y: number; canUp: boolean; canDown: boolean } | null =
      null;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const scroller = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-fp-scroll]",
      );
      start = {
        x: t.clientX,
        y: t.clientY,
        canUp: scroller ? canScroll(scroller, -1) : false,
        canDown: scroller ? canScroll(scroller, 1) : false,
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!start || dialogOpenRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const s = start;
      start = null;

      const inMenu = stepToPosition(stepRef.current).row === MENU_ROW;
      if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 50) {
        if (inMenu) go(dx < 0 ? 1 : -1);
        return;
      }
      if (Math.abs(dy) > 60) {
        const dir: 1 | -1 = dy < 0 ? 1 : -1;
        if ((dir > 0 && s.canDown) || (dir < 0 && s.canUp)) return;
        go(dir);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [go]);

  /* ---------------- Bàn phím ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpenRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      const inMenu = stepToPosition(stepRef.current).row === MENU_ROW;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          go(1);
          break;
        case " ":
          if (target?.closest("button, a")) return;
          e.preventDefault();
          go(e.shiftKey ? -1 : 1);
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          go(-1);
          break;
        case "ArrowRight":
          if (inMenu) {
            e.preventDefault();
            go(1);
          }
          break;
        case "ArrowLeft":
          if (inMenu) {
            e.preventDefault();
            go(-1);
          }
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(TOTAL_STEPS - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, goTo]);

  const isRowActive = (r: number) => row === r;

  return (
    <main
      ref={containerRef}
      className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background"
    >
      {/* ================= TRACK DỌC (6 hàng) ================= */}
      <motion.div
        className="w-full will-change-transform"
        style={{ height: `${ROW_COUNT * 100}%` }}
        initial={false}
        animate={{ y: `${(-row * 100) / ROW_COUNT}%` }}
        transition={{ duration: PAGE_DURATION, ease: PAGE_EASE }}
      >
        {/* ---------- SECTION 1 · MỞ ĐẦU ---------- */}
        <div className="relative w-full" style={{ height: `${100 / ROW_COUNT}%` }}>
          <HeroScreen
            active={isRowActive(0)}
            onBookNow={onBookNow}
            onExploreMenu={() => goTo(MENU_ROW)}
            onNext={() => go(1)}
          />
        </div>

        {/* ---------- SECTION 2 · CÂU CHUYỆN ---------- */}
        <div className="relative w-full" style={{ height: `${100 / ROW_COUNT}%` }}>
          <StoryScreen active={isRowActive(1)} />
        </div>

        {/* ---------- SECTION 3 → 9 · 7 MÓN (TRƯỢT NGANG) ---------- */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: `${100 / ROW_COUNT}%` }}
        >
          <motion.div
            className="flex h-full will-change-transform"
            style={{ width: `${DISH_COUNT * 100}%` }}
            initial={false}
            animate={{ x: `${(-dish * 100) / DISH_COUNT}%` }}
            transition={{ duration: 0.85, ease: PAGE_EASE }}
          >
            {MENU_ITEMS.map((item, i) => (
              <div
                key={item.index}
                className="h-full"
                style={{ width: `${100 / DISH_COUNT}%` }}
              >
                <DishScreen
                  item={item}
                  idx={i}
                  active={step === MENU_ROW + i}
                  onBookNow={onBookNow}
                  onDetail={() => setDetailDish(item)}
                />
              </div>
            ))}
          </motion.div>

          {/* Thanh điều hướng 7 món (cố định, không trượt theo slide) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center lg:left-1/2">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#d97706]/30 bg-[#1c1917]/85 p-1.5 shadow-lg shadow-black/40 backdrop-blur">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Món trước"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#f5d9a8] transition-colors hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {MENU_ITEMS.map((m, i) => {
                const selected = row === MENU_ROW && dish === i;
                return (
                  <button
                    key={m.index}
                    type="button"
                    onClick={() => goTo(MENU_ROW + i)}
                    aria-label={`Món 0${m.index}: ${m.name}`}
                    aria-current={selected ? "step" : undefined}
                    className={cn(
                      "relative flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-xs font-semibold transition-colors",
                      selected ? "text-[#fffbf2]" : "text-stone-400 hover:text-[#f5c77e]",
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="dish-nav-pill"
                        className="absolute inset-0 rounded-full bg-[#b45309]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative">0{m.index}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Món tiếp theo"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#f5d9a8] transition-colors hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ---------- SECTION · PAIRING ---------- */}
        <div className="relative w-full" style={{ height: `${100 / ROW_COUNT}%` }}>
          <PairingScreen active={isRowActive(3)} onBookNow={onBookNow} />
        </div>

        {/* ---------- SECTION · ĐÁNH GIÁ ---------- */}
        <div className="relative w-full" style={{ height: `${100 / ROW_COUNT}%` }}>
          <ReviewsScreen active={isRowActive(4)} />
        </div>

        {/* ---------- SECTION · THÔNG TIN ---------- */}
        <div className="relative w-full" style={{ height: `${100 / ROW_COUNT}%` }}>
          <InfoScreen active={isRowActive(5)} onBookNow={onBookNow} />
        </div>
      </motion.div>

      {/* ================= CHẤM ĐIỀU HƯỚNG BÊN PHẢI ================= */}
      <nav
        aria-label="Điều hướng các màn hình"
        className="absolute right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-2 md:flex"
      >
        {STEP_LABELS.map((label, i) => {
          const isActive = i === step;
          const isDish = i >= MENU_ROW && i < MENU_ROW + DISH_COUNT;
          return (
            <button
              key={label}
              type="button"
              onClick={() => goTo(i)}
              aria-label={label}
              aria-current={isActive ? "step" : undefined}
              className="group flex h-4 items-center gap-2"
            >
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] shadow-sm transition-opacity",
                  onDark
                    ? "bg-[#1c1917]/85 text-[#f5d9a8]"
                    : "bg-[#fffdf9]/85 text-[#92400e]",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-90",
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  "block rounded-full transition-all duration-300",
                  isActive
                    ? cn("h-4 w-1.5", onDark ? "bg-[#d97706]" : "bg-[#b45309]")
                    : cn(
                        isDish ? "h-1.5 w-1.5" : "h-2 w-2",
                        onDark
                          ? "bg-[#f5d9a8]/35 group-hover:bg-[#f5d9a8]/75"
                          : "bg-[#b45309]/35 group-hover:bg-[#b45309]/70",
                      ),
                )}
              />
            </button>
          );
        })}
      </nav>

      {/* Bộ đếm màn hình (ẩn ở các section món 03 - 07 để giao diện thông thoáng) */}
      {!onDark && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-30 hidden font-heading text-sm tracking-widest text-[#92400e]/70 md:block">
          <span className="text-lg font-semibold text-[#b45309]">
            {String(step + 1).padStart(2, "0")}
          </span>
          {" / "}
          {String(TOTAL_STEPS).padStart(2, "0")}
        </div>
      )}

      {/* DIALOG CHI TIẾT MÓN ĂN */}
      <Dialog open={!!detailDish} onOpenChange={(open) => !open && setDetailDish(null)}>
        <DialogContent className="max-w-xl overflow-hidden border-border bg-card p-0">
          {detailDish && (
            <div>
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                <img
                  src={detailDish.image}
                  alt={detailDish.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <span className="inline-block rounded-full bg-[#b45309] px-3 py-1 text-xs font-semibold text-[#fffbf2]">
                    Món 0{detailDish.index} · {detailDish.region}
                  </span>
                  <DialogTitle className="mt-1 font-heading text-xl text-white sm:text-2xl">
                    {detailDish.name}
                  </DialogTitle>
                </div>
              </div>

              <div className="space-y-4 p-5 text-sm sm:p-6">
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Miêu tả hương vị
                  </h4>
                  <p className="leading-relaxed text-stone-700">{detailDish.description}</p>
                </div>

                {detailDish.story && (
                  <div className="rounded-xl border border-[#b45309]/20 bg-[#fdf0d5]/40 p-4">
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#92400e]">
                      Cảm hứng ẩm thực
                    </h4>
                    <p className="text-xs italic leading-relaxed text-stone-600 sm:text-sm">
                      “{detailDish.story}”
                    </p>
                  </div>
                )}

                {detailDish.ingredients && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nguyên liệu tuyển chọn
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {detailDish.ingredients.map((ing) => (
                        <span
                          key={ing}
                          className="inline-flex items-center gap-1 rounded-md border border-[#b45309]/30 bg-[#fffdf9] px-2.5 py-1 text-xs text-stone-700"
                        >
                          <CheckCircle2 className="h-3 w-3 text-[#b45309]" />
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {detailDish.pairingNote && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#b45309]/25 bg-[#fdf0d5]/60 p-3 text-xs text-stone-700">
                    <Wine className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" />
                    <div>
                      <span className="font-semibold text-[#92400e]">
                        Gợi ý đồ uống đi kèm:
                      </span>{" "}
                      {detailDish.pairingNote}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDetailDish(null)}
                    className="rounded-full"
                  >
                    Đóng
                  </Button>
                  <Button
                    onClick={() => {
                      setDetailDish(null);
                      onBookNow();
                    }}
                    className="rounded-full bg-[#b45309] text-[#fffbf2] hover:bg-[#92400e]"
                  >
                    Đặt bàn thưởng thức
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

/* ================================================================== */
/* SECTION 1 · MỞ ĐẦU                                                  */
/* ================================================================== */
function HeroScreen({
  active,
  onBookNow,
  onExploreMenu,
  onNext,
}: {
  active: boolean;
  onBookNow: () => void;
  onExploreMenu: () => void;
  onNext: () => void;
}) {
  return (
    <Screen label="Mở đầu" className="tram-texture">
      {/* Khối cầu ánh sáng lơ lửng tạo chiều sâu không gian */}
      <motion.div
        animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#b45309]/10 blur-3xl"
        aria-hidden="true"
      />
      <motion.div
        animate={{ y: [0, 18, 0], x: [0, -12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-[#d97706]/12 blur-3xl"
        aria-hidden="true"
      />

      <motion.div
        variants={revealContainer}
        initial="hidden"
        animate={active ? "visible" : "hidden"}
        className="relative mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6"
      >
        <motion.p
          variants={revealUp}
          className="mb-5 text-[11px] font-medium uppercase tracking-[0.42em] text-[#92400e]/80 sm:text-xs"
        >
          NHÀ HÀNG FINE DINING TOP 2 TP. HỒ CHÍ MINH
        </motion.p>

        <motion.h1
          variants={revealUp}
          className="font-heading text-6xl font-semibold tracking-[0.28em] text-[#292524] sm:text-7xl md:text-8xl"
        >
          TRẦM
        </motion.h1>

        <motion.div variants={revealUp} className="mt-6 flex items-center gap-3" aria-hidden>
          <span className="h-px w-10 bg-[#b45309]/50 sm:w-16" />
          <motion.span
            animate={{ rotate: [45, 225, 45] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="h-2 w-2 bg-[#b45309]"
          />
          <span className="h-px w-10 bg-[#b45309]/50 sm:w-16" />
        </motion.div>

        <motion.p
          variants={revealUp}
          className="mt-6 font-heading text-xl italic text-stone-600 sm:text-2xl"
        >
          Hành trình vị Việt — bảy món, một câu chuyện
        </motion.p>

        <motion.p
          variants={revealUp}
          className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Thực đơn tasting bảy món tôn vinh những sản vật quý của Việt Nam: từ trứng
          cá tầm cao nguyên Lâm Đồng, sá sùng Vân Đồn, bào ngư Nha Trang đến yến sào
          Khánh Hòa, gà Đông Tảo Hưng Yên và trà sen Hồ Tây — một hành trình kết nối
          tinh hoa nguyên liệu Việt trong không gian ẩm thực đương đại.
        </motion.p>

        <motion.div
          variants={revealUp}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              onClick={onBookNow}
              className="animate-tram-glow h-12 min-w-56 rounded-full bg-[#b45309] px-8 text-[15px] text-[#fffbf2] shadow-md shadow-[#b45309]/25 transition-all hover:bg-[#92400e] hover:shadow-lg"
            >
              Đặt bàn ngay
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </motion.div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExploreMenu}
            className="inline-flex h-12 items-center rounded-full border border-[#b45309]/40 bg-[#fffdf9]/80 px-8 text-[15px] font-medium text-[#92400e] transition-colors hover:bg-[#fdf0d5]"
          >
            Khám phá thực đơn
          </motion.button>
        </motion.div>

        <motion.div
          variants={revealUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-stone-600"
        >
          <span className="inline-flex items-center gap-2">
            <span className="font-heading text-lg font-semibold text-[#b45309]">7</span>
            món tasting
          </span>
          <span className="h-1 w-1 rounded-full bg-[#c2a37a]" aria-hidden />
          <span className="inline-flex items-center gap-2">
            <span className="font-heading text-lg font-semibold text-[#b45309]">30</span>
            chỗ ngồi · 10 bàn
          </span>
          <span className="h-1 w-1 rounded-full bg-[#c2a37a]" aria-hidden />
          <span className="inline-flex items-center gap-2">
            <span className="font-heading text-lg font-semibold text-[#b45309]">2</span>
            khung mỗi tối
          </span>
        </motion.div>
      </motion.div>

      {/* Gợi ý cuộn */}
      <button
        type="button"
        onClick={onNext}
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-[#92400e]/70 transition-colors hover:text-[#b45309]"
      >
        Cuộn để khám phá
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-5 w-5" aria-hidden />
        </motion.span>
      </button>
    </Screen>
  );
}

/* ================================================================== */
/* SECTION 2 · CÂU CHUYỆN                                              */
/* ================================================================== */
function StoryScreen({ active }: { active: boolean }) {
  const first = MENU_ITEMS[0];
  const last = MENU_ITEMS[MENU_ITEMS.length - 1];
  return (
    <Screen label="Câu chuyện" className="bg-background">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        animate={active ? "visible" : "hidden"}
        className="mx-auto grid min-h-full max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:px-10"
      >
        <div>
          <motion.div variants={revealUp}>
            <SectionLabel align="left">Câu chuyện</SectionLabel>
          </motion.div>
          <motion.h2
            variants={revealUp}
            className="tram-underline font-heading mb-8 text-3xl font-semibold text-[#292524] sm:text-4xl lg:text-5xl"
          >
            Trầm lặng giữa lòng thành phố
          </motion.h2>
          <div className="space-y-4 text-[15px] leading-[1.85] text-stone-600">
            <motion.p variants={revealUp}>
              TRẦM được gọi tên theo làn khói trầm hương — thứ hương đặc trưng của
              những ngôi nhà xưa, nơi mỗi bữa cơm là một nghi lễ sum vầy. Chúng tôi
              mong muốn lưu giữ tinh thần ấy trong một không gian fine dining đương
              đại, ngay giữa Quận 3, TP. Hồ Chí Minh.
            </motion.p>
            <motion.p variants={revealUp}>
              Mỗi tối, bếp TRẦM kể một câu chuyện bằng bảy món ăn: những nguyên liệu
              bé nhỏ được tuyển chọn từ từng vùng miền — cá bớp sông Cửu Long, đậu
              tương Bảo Lạc, bò Quảng Nam — được chắp lại thành hành trình vị giác
              trọn vẹn của Việt Nam.
            </motion.p>
            <motion.p variants={revealUp}>
              Với 40 chỗ ngồi và hai khung phục vụ mỗi tối (15 bàn), chúng tôi dành hết sự chú
              tâm cho từng khách mời — từ tách trà Shan tuyết đầu tiên đến ngụm trà ấm cuối
              cùng của buổi tối.
            </motion.p>
          </div>
        </div>

        {/* Collage ảnh */}
        <motion.div
          variants={revealUp}
          className="relative mx-auto h-72 w-full max-w-md sm:h-96 lg:h-[min(30rem,62vh)] lg:max-w-none"
        >
          <motion.div
            animate={{ scale: active ? 1 : 1.06 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute left-0 top-0 h-[78%] w-[72%] overflow-hidden rounded-3xl border border-[#b45309]/20 shadow-xl"
          >
            <img src={first.image} alt={first.name} className="h-full w-full object-cover" />
          </motion.div>
          <motion.div
            animate={{ y: active ? 0 : 40 }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
            className="absolute bottom-0 right-0 h-[52%] w-[50%] overflow-hidden rounded-3xl border-4 border-background shadow-2xl"
          >
            <img src={last.image} alt={last.name} className="h-full w-full object-cover" />
          </motion.div>
          <div className="absolute bottom-6 left-4 rounded-2xl border border-[#b45309]/25 bg-[#fffdf9]/95 px-4 py-3 shadow-lg backdrop-blur">
            <p className="font-heading text-2xl font-semibold text-[#b45309]">7 chương</p>
            <p className="text-xs text-muted-foreground">một hành trình vị Việt</p>
          </div>
        </motion.div>
      </motion.div>
    </Screen>
  );
}

/* ================================================================== */
/* SECTION 3 → 9 · TỪNG MÓN                                            */
/* ================================================================== */
function DishScreen({
  item,
  idx,
  active,
  onBookNow,
  onDetail,
}: {
  item: MenuItem;
  idx: number;
  active: boolean;
  onBookNow: () => void;
  onDetail: () => void;
}) {
  const Icon = DISH_ICONS[idx] ?? Utensils;
  return (
    <Screen label={`Món 0${item.index}: ${item.name}`} className="bg-[#0c0a09] text-stone-200">
      <div className="grid min-h-full lg:h-full lg:grid-cols-2">
        {/* Ảnh món toàn chiều cao */}
        <div className="relative h-[42vh] overflow-hidden bg-stone-900 lg:h-full">
          <motion.img
            src={item.image}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover"
            initial={false}
            animate={{ scale: active ? 1 : 1.15 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-black/10 to-black/20 lg:from-black/70" />
          {/* Hòa ảnh vào nền đen ở mép phải (desktop) */}
          <div className={cn(
            "pointer-events-none absolute inset-y-0 right-0 hidden bg-gradient-to-r from-transparent to-[#0c0a09] lg:block",
            item.index === 7 ? "w-20" : "w-1/3"
          )} />

          <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold tracking-wider text-[#fdf0d5] backdrop-blur-md">
            <Icon className="h-3.5 w-3.5 text-[#d97706]" />
            {item.region}
          </span>

          <motion.span
            aria-hidden
            initial={false}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 40 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: active ? 0.45 : 0 }}
            className="absolute bottom-3 left-5 font-heading text-[6rem] font-semibold leading-none text-[#fffbf2]/90 lg:bottom-6 lg:left-8 lg:text-[10rem]"
          >
            0{item.index}
          </motion.span>
        </div>

        {/* Thông tin món */}
        <motion.div
          variants={revealContainer}
          initial="hidden"
          animate={active ? "visible" : "hidden"}
          className="flex flex-col justify-center gap-4 px-6 pb-24 pt-8 sm:px-10 lg:px-14 lg:pt-10 xl:px-20"
        >
          {/* Tag & Tiêu đề chương font chữ cổ điển */}
          <motion.div variants={revealRight} className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-[#d97706]/40 bg-[#d97706]/10 px-3 py-1 font-heading text-xs tracking-wider text-[#f5d9a8]"
            >
              Hành trình vị Việt · {formatVND(PRICES.menu)} / khách
            </Badge>
            <span className="font-heading text-sm font-semibold tracking-widest text-[#d97706]">
              Chương {item.index} / {DISH_COUNT}
            </span>
          </motion.div>

          <motion.h2
            variants={revealRight}
            className="font-heading text-3xl font-normal italic tracking-wide text-[#fdf6e9] lg:text-4xl xl:text-5xl"
          >
            {item.name}
          </motion.h2>

          <motion.p
            variants={revealRight}
            className="font-heading text-base font-normal leading-relaxed text-stone-200 sm:text-lg"
          >
            {item.description}
          </motion.p>

          {item.story && (
            <motion.p
              variants={revealRight}
              className="font-heading rounded-xl border border-[#d97706]/25 bg-white/5 p-3.5 text-sm italic leading-relaxed text-[#e0d6c6] sm:text-base lg:[@media(max-height:720px)]:hidden"
            >
              “{item.story}”
            </motion.p>
          )}

          {item.pairingNote && (
            <motion.div
              variants={revealRight}
              className="flex items-start gap-2.5 rounded-xl border border-[#d97706]/30 bg-[#d97706]/10 p-3 text-xs text-stone-300"
            >
              <Wine className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />
              <div className="font-heading text-sm">
                <span className="font-semibold text-[#f5c77e]">Gợi ý Pairing:</span>{" "}
                {item.pairingNote}
              </div>
            </motion.div>
          )}

          <motion.div variants={revealRight} className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={onBookNow}
              className="font-heading h-11 rounded-full bg-[#b45309] px-6 text-sm tracking-wider text-[#fffbf2] shadow-md shadow-[#b45309]/30 hover:bg-[#d97706]"
            >
              Đặt bàn thưởng thức
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={onDetail}
              className="font-heading h-11 rounded-full border-[#d97706]/50 bg-transparent px-5 text-sm tracking-wider text-[#f5d9a8] hover:bg-white/10 hover:text-[#fdf6e9]"
            >
              <Info className="mr-1.5 h-4 w-4" />
              Chi tiết món ăn
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </Screen>
  );
}

/* ================================================================== */
/* SECTION · PAIRING                                                   */
/* ================================================================== */
function PairingScreen({ active, onBookNow }: { active: boolean; onBookNow: () => void }) {
  const option = {
    key: "tea",
    icon: Coffee,
    title: "Tea pairing độc bản",
    desc: "Bốn lớp trà Việt thượng hạng — trà Shan Tuyết cổ thụ 300 năm Hà Giang, trà sen Tây Hồ và ô long mộc bản — thanh lọc vị giác và nâng đỡ trọn vẹn từng món tasting.",
    price: PRICES.teaPairing,
  };

  return (
    <Screen label="Pairing" className="tram-texture">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        animate={active ? "visible" : "hidden"}
        className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-12"
      >
        <motion.div variants={revealUp}>
          <SectionLabel>Đi kèm menu</SectionLabel>
          <h2 className="tram-underline-center tram-underline font-heading mb-4 text-center text-3xl font-semibold text-[#292524] sm:text-4xl lg:text-5xl">
            Tea pairing tuyển chọn
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
            Hương vị trà Việt tinh tế đồng điệu cùng bảy món báu vật — lựa chọn tùy ý khi đặt bàn (mục tiêu 50% thực khách chọn).
          </p>
        </motion.div>

        <div className="mx-auto max-w-xl w-full">
          <motion.div variants={revealUp} whileHover={{ y: -6 }}>
            <Card className="border-[#b45309]/30 bg-[#fffdf9]/95 shadow-lg backdrop-blur transition-shadow hover:shadow-2xl">
              <CardContent className="p-8 text-center sm:p-10">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                  <Coffee className="h-8 w-8" aria-hidden />
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[#292524]">
                  {option.title}
                </h3>
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
                  {option.desc}
                </p>
                <div className="mt-6 flex items-baseline justify-center gap-2">
                  <span className="font-heading text-3xl sm:text-4xl font-semibold text-[#b45309]">
                    +{formatVND(option.price)}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">/ khách</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={revealUp} className="mt-10 flex justify-center">
          <Button
            onClick={onBookNow}
            variant="outline"
            className="h-11 rounded-full border-[#b45309] px-8 text-[#92400e] hover:bg-[#b45309] hover:text-[#fffbf2]"
          >
            Đặt bàn kèm Tea pairing
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </Screen>
  );
}

/* ================================================================== */
/* SECTION · ĐÁNH GIÁ                                                  */
/* ================================================================== */
function ReviewsScreen({ active }: { active: boolean }) {
  return (
    <Screen label="Đánh giá" className="bg-[#fffdf9]">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        animate={active ? "visible" : "hidden"}
        className="mx-auto flex min-h-full max-w-6xl flex-col justify-center px-6 py-12"
      >
        <motion.div variants={revealUp}>
          <SectionLabel>Khách nói về TRẦM</SectionLabel>
          <h2 className="tram-underline-center tram-underline font-heading mb-12 text-center text-3xl font-semibold text-[#292524] sm:text-4xl lg:text-5xl">
            Những buổi tối đáng nhớ
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <motion.div key={review.name} variants={revealUp} whileHover={{ y: -6 }}>
              <Card className="relative h-full border-border/80 bg-card shadow-sm transition-shadow hover:shadow-lg">
                <CardContent className="p-7">
                  <Quote
                    className="absolute right-5 top-5 h-8 w-8 text-[#fdf0d5]"
                    aria-hidden
                  />
                  <div
                    className="flex gap-0.5 text-[#d97706]"
                    aria-label={`${review.stars} trên 5 sao`}
                  >
                    {Array.from({ length: review.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-stone-600">
                    “{review.content}”
                  </p>
                  <Separator className="my-4 bg-border/70" />
                  <p className="font-heading text-[15px] font-semibold text-[#292524]">
                    {review.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{review.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Screen>
  );
}

/* ================================================================== */
/* SECTION · THÔNG TIN                                                 */
/* ================================================================== */
function InfoScreen({ active, onBookNow }: { active: boolean; onBookNow: () => void }) {
  return (
    <Screen label="Thông tin" className="bg-background">
      <div className="flex min-h-full flex-col">
        <motion.div
          variants={revealContainer}
          initial="hidden"
          animate={active ? "visible" : "hidden"}
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-10"
        >
          <motion.div variants={revealUp}>
            <SectionLabel>Thông tin</SectionLabel>
            <h2 className="tram-underline-center tram-underline font-heading mb-10 text-center text-3xl font-semibold text-[#292524] sm:text-4xl lg:text-5xl">
              Ghé TRẦM một tối
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={revealUp} whileHover={{ y: -4 }}>
              <Card className="h-full border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                    <Clock className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#292524]">
                    Giờ mở cửa
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
                    <li className="flex justify-between gap-2">
                      <span>Thứ Tư → Chủ Nhật</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span>Khung sớm</span>
                      <span className="font-medium text-[#92400e]">17:30</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span>Khung trễ</span>
                      <span className="font-medium text-[#92400e]">19:45</span>
                    </li>
                    <li className="pt-1 text-muted-foreground">Nghỉ thứ Hai và thứ Ba hàng tuần</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={revealUp} whileHover={{ y: -4 }}>
              <Card className="h-full border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#292524]">Địa chỉ</h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    {RESTAURANT.address}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Giữ xe ô tô có sẵn · gần Notre-Dame Sài Gòn
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={revealUp} whileHover={{ y: -4 }}>
              <Card className="h-full border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                    <Banknote className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#292524]">Đặt cọc</h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    Đặt cọc{" "}
                    <span className="font-medium text-[#92400e]">
                      {formatVND(PRICES.deposit)}
                    </span>{" "}
                    / khách khi đặt bàn.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Hoàn cọc đầy đủ nếu Quý khách hủy trước 48 giờ so với giờ đến.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={revealUp} whileHover={{ y: -4 }}>
              <Card className="h-full border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                    <Phone className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#292524]">Liên hệ</h3>
                  <p className="mt-3 text-sm text-stone-600">
                    Hotline:{" "}
                    <span className="font-medium text-[#92400e]">{RESTAURANT.hotline}</span>
                  </p>
                  <p className="mt-2 text-sm text-stone-600">Email: {RESTAURANT.email}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Hoặc đặt bàn trực tuyến chỉ trong 2 phút.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={revealUp} className="mt-10 flex justify-center">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                onClick={onBookNow}
                className="animate-tram-glow h-12 min-w-56 rounded-full bg-[#b45309] px-10 text-[15px] text-[#fffbf2] shadow-md shadow-[#b45309]/20 transition-all hover:bg-[#92400e]"
              >
                Đặt bàn ngay
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Footer thu gọn (trang chủ full-page không dùng SiteFooter chung) */}
        <footer className="border-t border-border/80 bg-[#f5efe4]">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-3 text-center text-xs text-muted-foreground">
            <span className="font-heading text-sm font-semibold tracking-[0.22em] text-[#292524]">
              TRẦM
            </span>
          </div>
        </footer>
      </div>
    </Screen>
  );
}
