import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Affiliate Hub | Top Deals",
  description: "Discover the best products and deals. Choose your preferred platform to buy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground font-sans">
        <ToastProvider>
          {children}
        </ToastProvider>
        <MobileBottomNav />
      </body>
    </html>
  );
}
