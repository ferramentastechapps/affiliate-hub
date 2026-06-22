import type { Metadata, Viewport } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { InstallBanner } from "@/components/InstallBanner";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/AuthProvider";
import { CategoriesModal } from "@/components/CategoriesModal";
import { CouponsModal } from "@/components/CouponsModal";
import { SplashScreen } from "@/components/SplashScreen";
import Script from "next/script";

const montserrat = Montserrat({
  variable: "--font-montserrat",
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br'),
  title: "Economizei | Melhores Cupons e Promoções",
  description: "Melhores cupons e promoções do Brasil. Economize nas suas compras com os melhores descontos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Economizei",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=4", sizes: "32x32" },
      { url: "/icons/favicon-16x16.png?v=4", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png?v=4", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png?v=4",  sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png?v=4",  sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Economizei",
    title: "Economizei | Melhores Cupons e Promoções",
    description: "Encontre os melhores descontos, cupons e ofertas da internet em um só lugar.",
    images: [{ url: "/icons/og-image.png?v=2", width: 1200, height: 630, alt: "Economizei" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Economizei | Melhores Cupons e Promoções",
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
      className={`${montserrat.variable} ${geistMono.variable} dark antialiased`}
    >
      <head>
        <meta name="lomadee" content="2324685" />
      </head>
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground font-sans relative">
        <SplashScreen />
        <div className="premium-bg fixed top-0 left-0 w-full h-full -z-10" />
        <AuthProvider>
          <Header />
          <ToastProvider>
            {children}
          </ToastProvider>
          <CategoriesModal />
          <CouponsModal />
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

