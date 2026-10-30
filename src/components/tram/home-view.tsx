"use client";

// Trang chủ TRẦM — hero, câu chuyện, menu 7 món, pairing, đánh giá, thông tin
import {
  ArrowRight,
  Banknote,
  Beef,
  Clock,
  Coffee,
  Dessert,
  Flame,
  Fish,
  MapPin,
  Phone,
  Quote,
  Soup,
  Sprout,
  Star,
  Wheat,
  Wine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MENU_ITEMS, PRICES, RESTAURANT, REVIEWS } from "@/lib/tram/constants";
import { formatVND } from "@/lib/tram/format";

const DISH_ICONS = [Wheat, Fish, Sprout, Flame, Beef, Soup, Dessert];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.3em] text-[#b45309]">
      {children}
    </p>
  );
}

interface HomeViewProps {
  onBookNow: () => void;
}

export function HomeView({ onBookNow }: HomeViewProps) {
  return (
    <main>
      {/* ================= HERO ================= */}
      <section className="tram-texture relative overflow-hidden border-b border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.42em] text-[#92400e]/80 sm:text-xs">
            Fine dining Việt Nam · Quận 3 · TP. Hồ Chí Minh
          </p>
          <h1 className="font-heading text-6xl font-semibold tracking-[0.28em] text-[#292524] sm:text-7xl md:text-8xl">
            TRẦM
          </h1>
          <div className="mt-6 flex items-center gap-3" aria-hidden>
            <span className="h-px w-10 bg-[#b45309]/50 sm:w-16" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#b45309]" />
            <span className="h-px w-10 bg-[#b45309]/50 sm:w-16" />
          </div>
          <p className="mt-6 font-heading text-xl italic text-stone-600 sm:text-2xl">
            Hành trình vị Việt — bảy món, một câu chuyện
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Menu tasting bảy món đưa Quý khách đi qua những vùng vị Việt Nam:
            từ sông Cửu Long, cao nguyên Bảo Lạc đến nắng gió Quảng Nam — trong
            không gian trầm lặng giữa lòng thành phố.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Button
              size="lg"
              onClick={onBookNow}
              className="h-12 min-w-56 rounded-full bg-[#b45309] px-8 text-[15px] text-[#fffbf2] shadow-md shadow-[#b45309]/20 transition-all hover:bg-[#92400e] hover:shadow-lg"
            >
              Đặt bàn ngay
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
            <a
              href="#menu"
              className="inline-flex h-12 items-center rounded-full border border-[#b45309]/40 px-8 text-[15px] font-medium text-[#92400e] transition-colors hover:bg-[#fdf0d5]"
            >
              Xem menu
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-stone-600">
            <span className="inline-flex items-center gap-2">
              <span className="font-heading text-lg font-semibold text-[#b45309]">
                7
              </span>
              món tasting
            </span>
            <span className="h-1 w-1 rounded-full bg-[#c2a37a]" aria-hidden />
            <span className="inline-flex items-center gap-2">
              <span className="font-heading text-lg font-semibold text-[#b45309]">
                42
              </span>
              chỗ ngồi · 12 bàn
            </span>
            <span className="h-1 w-1 rounded-full bg-[#c2a37a]" aria-hidden />
            <span className="inline-flex items-center gap-2">
              <span className="font-heading text-lg font-semibold text-[#b45309]">
                2
              </span>
              khung mỗi tối
            </span>
          </div>
        </div>
      </section>

      {/* ================= CÂU CHUYỆN ================= */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionLabel>Câu chuyện</SectionLabel>
          <h2 className="tram-underline-center tram-underline font-heading mb-8 text-center text-3xl font-semibold text-[#292524] sm:text-4xl">
            Trầm lặng giữa lòng thành phố
          </h2>
          <div className="space-y-5 text-[15px] leading-[1.9] text-stone-600 sm:text-base">
            <p>
              TRẦM được gọi tên theo làn khói trầm hương — thứ hương đặc trưng
              của những ngôi nhà xưa, nơi mỗi bữa cơm là một nghi lễ sum vầy.
              Chúng tôi mong muốn lưu giữ tinh thần ấy trong một không gian
              fine dining đương đại, ngay giữa Quận 3, TP. Hồ Chí Minh.
            </p>
            <p>
              Mỗi tối, bếp TRẦM kể một câu chuyện bằng bảy món ăn: những nguyên
              liệu bé nhỏ được tuyển chọn từ từng vùng miền — cá bớp sông Cửu
              Long, đậu tương Bảo Lạc, bò Quảng Nam — được chắp lại thành hành
              trình vị giác trọn vẹn của Việt Nam.
            </p>
            <p>
              Với 42 chỗ ngồi và hai khung phục vụ mỗi tối, chúng tôi dành hết
              sự chú tâm cho từng khách mời — từ ly rượu đầu tiên đến giọt trà
              atiso cuối cùng của buổi tối.
            </p>
          </div>
        </div>
      </section>

      {/* ================= MENU 7 MÓN ================= */}
      <section id="menu" className="border-y border-border/70 bg-[#fffdf9]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionLabel>Menu tasting</SectionLabel>
          <h2 className="tram-underline-center tram-underline font-heading mb-3 text-center text-3xl font-semibold text-[#292524] sm:text-4xl">
            Hành trình vị Việt
          </h2>
          <div className="mb-10 flex justify-center">
            <Badge
              variant="outline"
              className="border-[#b45309]/40 bg-[#fdf0d5] px-4 py-1.5 text-sm font-medium text-[#92400e]"
            >
              {formatVND(PRICES.menu)} / khách · 7 món
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MENU_ITEMS.map((item, i) => {
              const Icon = DISH_ICONS[i] ?? Wheat;
              return (
                <Card
                  key={item.index}
                  className="group border-border/80 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5]/70 text-[#b45309]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-sm font-semibold text-[#c2a37a]">
                          {String(item.index).padStart(2, "0")}
                        </span>
                        <h3 className="font-heading text-[17px] font-semibold leading-snug text-[#292524]">
                          {item.name}
                        </h3>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#c2a37a]">
                        {item.region}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Thẻ pairing */}
            <Card className="border-dashed border-[#b45309]/35 bg-[#fdf0d5]/40 shadow-sm">
              <CardContent className="flex gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                  <Wine className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-[17px] font-semibold text-[#292524]">
                    Wine pairing
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Lựa chọn rượu vang Việt Nam đi kèm từng món,{" "}
                    <span className="font-medium text-[#92400e]">
                      +{formatVND(PRICES.winePairing)}
                    </span>{" "}
                    / khách.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================= PAIRING ================= */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionLabel>Đi kèm menu</SectionLabel>
          <h2 className="tram-underline-center tram-underline font-heading mb-10 text-center text-3xl font-semibold text-[#292524] sm:text-4xl">
            Hai lựa chọn pairing
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                  <Wine className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="font-heading text-xl font-semibold text-[#292524]">
                  Wine pairing
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Năm ly rượu vang Việt tuyển chọn, hòa theo nhịp của từng món
                  trong hành trình vị.
                </p>
                <p className="mt-4 font-heading text-2xl font-semibold text-[#b45309]">
                  +{formatVND(PRICES.winePairing)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / khách
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                  <Coffee className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="font-heading text-xl font-semibold text-[#292524]">
                  Tea pairing
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Bốn lớp trà Việt — trà atiso Đà Lạt, trà ô long cao nguyên —
                  thanh lọc vị giác qua từng món.
                </p>
                <p className="mt-4 font-heading text-2xl font-semibold text-[#b45309]">
                  +{formatVND(PRICES.teaPairing)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / khách
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================= ĐÁNH GIÁ ================= */}
      <section className="border-y border-border/70 bg-[#fffdf9]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionLabel>Khách nói về TRẦM</SectionLabel>
          <h2 className="tram-underline-center tram-underline font-heading mb-10 text-center text-3xl font-semibold text-[#292524] sm:text-4xl">
            Những buổi tối đáng nhớ
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {REVIEWS.map((review) => (
              <Card
                key={review.name}
                className="relative border-border/80 bg-card shadow-sm"
              >
                <CardContent className="p-6">
                  <Quote
                    className="absolute right-5 top-5 h-6 w-6 text-[#fdf0d5]"
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
            ))}
          </div>
        </div>
      </section>

      {/* ================= THÔNG TIN ================= */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionLabel>Thông tin</SectionLabel>
          <h2 className="tram-underline-center tram-underline font-heading mb-10 text-center text-3xl font-semibold text-[#292524] sm:text-4xl">
            Ghé TRẦM một tối
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                  <Clock className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-heading text-lg font-semibold text-[#292524]">
                  Giờ mở cửa
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
                  <li className="flex justify-between gap-2">
                    <span>Thứ Ba → Chủ Nhật</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Khung sớm</span>
                    <span className="font-medium text-[#92400e]">17:30</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Khung trễ</span>
                    <span className="font-medium text-[#92400e]">19:45</span>
                  </li>
                  <li className="pt-1 text-muted-foreground">
                    Nghỉ thứ Hai hàng tuần
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                  <MapPin className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-heading text-lg font-semibold text-[#292524]">
                  Địa chỉ
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  {RESTAURANT.address}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Giữ xe ô tô có sẵn · gần Notre-Dame Sài Gòn
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                  <Banknote className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-heading text-lg font-semibold text-[#292524]">
                  Đặt cọc
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  Đặt cọc{" "}
                  <span className="font-medium text-[#92400e]">
                    {formatVND(PRICES.deposit)}
                  </span>{" "}
                  / khách khi đặt bàn.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Hoàn cọc đầy đủ nếu Quý khách hủy trước 48 giờ so với giờ
                  đến.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#b45309]/25 bg-[#fdf0d5] text-[#b45309]">
                  <Phone className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-heading text-lg font-semibold text-[#292524]">
                  Liên hệ
                </h3>
                <p className="mt-3 text-sm text-stone-600">
                  Hotline:{" "}
                  <span className="font-medium text-[#92400e]">
                    {RESTAURANT.hotline}
                  </span>
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Email: {RESTAURANT.email}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Hoặc đặt bàn trực tuyến chỉ trong 2 phút.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 flex justify-center">
            <Button
              size="lg"
              onClick={onBookNow}
              className="h-12 min-w-56 rounded-full bg-[#b45309] px-10 text-[15px] text-[#fffbf2] shadow-md shadow-[#b45309]/20 transition-all hover:bg-[#92400e]"
            >
              Đặt bàn ngay
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
