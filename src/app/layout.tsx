import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { InstallBanner } from "@/components/InstallBanner";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/AuthProvider";
import { CategoriesModal } from "@/components/CategoriesModal";
import Script from "next/script";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://economizai.usejotashop.com.br'),
  title: "Economiza ai | Melhores Cupons e Promoções",
  description: "Melhores cupons e promoções do Brasil. Economize nas suas compras com os melhores descontos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Economiza ai",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "32x32" },
      { url: "/icons/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png?v=2",  sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png?v=2",  sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Economiza ai",
    title: "Economiza ai | Melhores Cupons e Promoções",
    description: "Melhores cupons e promoções do Brasil. Economize nas suas compras com os melhores descontos.",
    images: [{ url: "/icons/og-image.png?v=2", width: 1200, height: 630, alt: "Economiza ai" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Economiza ai | Melhores Cupons e Promoções",
    description: "Melhores cupons e promoções do Brasil.",
    images: ["/icons/og-image.png?v=2"],
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
      <head>
        <meta name="lomadee" content="2324685" />
      </head>
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground font-sans relative">
        <div className="premium-bg fixed top-0 left-0 w-full h-full -z-10" />
        <AuthProvider>
          <Header />
          <ToastProvider>
            {children}
          </ToastProvider>
          <CategoriesModal />
          <MobileBottomNav />
          <InstallBanner />
        </AuthProvider>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

