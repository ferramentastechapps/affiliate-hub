import { DailyDeals } from "@/components/DailyDeals";
import { ProductGrid } from "@/components/ProductGrid";
import { CouponsSection } from "@/components/CouponsSection";
import { HeroSection } from "@/components/HeroSection";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 REVALIDAÇÃO (ISR - Incremental Static Regeneration)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Revalida a página a cada 60 segundos
// Isso significa que novos produtos/cupons aparecerão automaticamente
export const revalidate = 60;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 METADATA PARA SEO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const metadata: Metadata = {
  title: "Affiliate Hub | Melhores Ofertas e Cupons de Desconto",
  description: "Encontre os melhores produtos com cupons de desconto exclusivos. Compare preços entre Amazon, Mercado Livre, Shopee, AliExpress e TikTok Shop. Economize agora!",
  keywords: [
    "cupons de desconto",
    "ofertas",
    "promoções",
    "amazon",
    "mercado livre",
    "shopee",
    "aliexpress",
    "tiktok shop",
    "links de afiliados",
    "melhores preços",
    "gaming",
    "setup",
    "home office",
    "streaming"
  ],
  authors: [{ name: "Affiliate Hub" }],
  creator: "Affiliate Hub",
  publisher: "Affiliate Hub",
  
  // Open Graph (Facebook, LinkedIn, WhatsApp)
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://seu-dominio.com",
    siteName: "Affiliate Hub",
    title: "Affiliate Hub | Melhores Ofertas e Cupons de Desconto",
    description: "Encontre os melhores produtos com cupons de desconto exclusivos. Compare preços entre as principais lojas online.",
    images: [
      {
        url: "https://seu-dominio.com/og-image.jpg", // Crie esta imagem 1200x630px
        width: 1200,
        height: 630,
        alt: "Affiliate Hub - Melhores Ofertas",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Affiliate Hub | Melhores Ofertas e Cupons",
    description: "Encontre os melhores produtos com cupons de desconto exclusivos.",
    images: ["https://seu-dominio.com/og-image.jpg"],
    creator: "@seu_twitter",
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Verificação
  verification: {
    google: "seu-codigo-de-verificacao-google",
    // yandex: "seu-codigo-yandex",
    // bing: "seu-codigo-bing",
  },
};

async function getCouponsByPlatform() {
  const coupons = await prisma.coupon.findMany({
    where: { 
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    },
    select: { platform: true },
  });

  const platformCounts = coupons.reduce((acc, coupon) => {
    const platform = coupon.platform.toLowerCase();
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Garante que as lojas principais sempre apareçam, mesmo com 0 cupons
  const basePlatforms = ["amazon", "shopee", "mercadolivre", "aliexpress"];
  basePlatforms.forEach(bp => {
    if (typeof platformCounts[bp] === "undefined") {
      platformCounts[bp] = 0;
    }
  });

  return Object.entries(platformCounts).map(([platform, count]) => ({
    platform,
    count,
  }));
}

export default async function Home() {
  const couponsByPlatform = await getCouponsByPlatform();

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-hidden pt-20">
      {/* Hero Section */}
      <HeroSection />

      {/* Cupons Section */}
      <CouponsSection couponsByPlatform={couponsByPlatform} />

      {/* Promocoes do Dia */}
      <DailyDeals />


    </main>
  );
}
