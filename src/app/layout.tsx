import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { RESTAURANT, PRICES } from "@/lib/tram/constants";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#b45309",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "TRẦM Reserve — Hành trình vị Việt | Đặt bàn Fine Dining Quận 3",
    template: "%s | TRẦM Reserve",
  },
  description:
    "TRẦM Reserve — Hệ thống đặt bàn trực tuyến & quản trị vận hành nhà hàng Fine Dining Việt Nam tại Quận 3, TP. Hồ Chí Minh. Menu tasting 7 món 'Hành trình vị Việt' (1.190.000 đ/khách), đặt cọc và nhắc lịch tự động.",
  keywords: [
    "TRẦM",
    "TRẦM Reserve",
    "fine dining Việt Nam",
    "đặt bàn trực tuyến",
    "quản lý nhà hàng",
    "dashboard vận hành nhà hàng",
    "hành trình vị Việt",
    "Quận 3",
    "TP. Hồ Chí Minh",
  ],
  authors: [{ name: "TRẦM Reserve — Business Value Project" }],
  creator: "TRẦM Reserve",
  publisher: "TRẦM Reserve",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "http://localhost:3000",
    siteName: "TRẦM Reserve",
    title: "TRẦM Reserve — Hành trình vị Việt | Fine Dining Quận 3",
    description:
      "Trải nghiệm ẩm thực 7 món 'Hành trình vị Việt' cùng hệ thống đặt bàn trực tuyến, chọn bàn theo sơ đồ 12 bàn và Dashboard quản trị vận hành thời gian thực.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRẦM Reserve — Hành trình vị Việt | Fine Dining Quận 3",
    description:
      "Menu tasting 7 món 1.190.000 đ/khách · Đặt bàn trực tuyến & Quản trị công suất nhà hàng.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
};

const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "FineDining",
  name: RESTAURANT.name,
  description: RESTAURANT.tagline,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Số 12 Nguyễn Đình Chiểu, Quận 3",
    addressLocality: "TP. Hồ Chí Minh",
    addressCountry: "VN",
  },
  telephone: RESTAURANT.hotline,
  email: RESTAURANT.email,
  servesCuisine: "Vietnamese Contemporary Fine Dining",
  priceRange: "₫₫₫₫",
  acceptsReservations: "True",
  maximumAttendeeCapacity: RESTAURANT.totalSeats,
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "17:30",
      closes: "22:00",
    },
  ],
  hasMenu: {
    "@type": "Menu",
    name: "Menu Tasting 7 Món — Hành trình vị Việt",
    offers: {
      "@type": "Offer",
      price: PRICES.menu,
      priceCurrency: "VND",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={playfair.variable}>
      <body className="antialiased bg-background text-foreground font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
        />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
