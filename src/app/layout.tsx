import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { InstallBanner } from "@/components/InstallBanner";
import { Header } from "@/components/Header";

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

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "123 Testando | Melhores Cupons e Promoções",
  description: "Melhores cupons e promoções do Brasil. Economize nas suas compras com os melhores descontos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "123 Testando",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png",  sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png",  sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "123 Testando",
    title: "123 Testando | Melhores Cupons e Promoções",
    description: "Melhores cupons e promoções do Brasil. Economize nas suas compras com os melhores descontos.",
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "123 Testando" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "123 Testando | Melhores Cupons e Promoções",
    description: "Melhores cupons e promoções do Brasil.",
    images: ["/icons/og-image.png"],
  },
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
        <Header />
        <ToastProvider>
          {children}
        </ToastProvider>
        <MobileBottomNav />
        <InstallBanner />
      </body>
    </html>
  );
}
