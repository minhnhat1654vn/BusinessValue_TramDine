import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "TRẦM — Hành trình vị Việt | Đặt bàn fine dining Quận 3",
  description:
    "TRẦM Reserve — nhà hàng fine dining Việt Nam tại Quận 3, TP. Hồ Chí Minh. Menu tasting 7 món 'Hành trình vị Việt', đặt bàn online với đặt cọc và nhắc lịch tự động.",
  keywords: [
    "TRẦM",
    "fine dining",
    "đặt bàn",
    "hành trình vị Việt",
    "Quận 3",
    "TP. Hồ Chí Minh",
  ],
  authors: [{ name: "TRẦM Reserve" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
