"use client";

// Footer sticky — luôn dính đáy màn hình khi nội dung ngắn,
// tự nhiên bị đẩy xuống khi nội dung dài
import { MapPin, Phone } from "lucide-react";
import { RESTAURANT } from "@/lib/tram/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/80 bg-[#f5efe4]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center sm:px-6">
        <p className="font-heading text-lg font-semibold tracking-[0.22em] text-[#292524]">
          TRẦM
        </p>
        <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {RESTAURANT.address}
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" aria-hidden />
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Hotline {RESTAURANT.hotline}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/80">
          Sản phẩm demo phục vụ đồ án Business Value — thanh toán mô phỏng
        </p>
      </div>
    </footer>
  );
}
