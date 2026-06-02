import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import ThemeScript from "./components/ThemeScript";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Verification Card",
  description:
    "Công cụ hỗ trợ sinh viên đánh giá độ tin cậy của văn bản do AI tạo ra thông qua 5 bước đối chiếu thực tiễn nghiêm ngặt.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-background text-foreground">
          <Providers>{children}</Providers>
        </body>
    </html>
  );
}
