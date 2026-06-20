import { DailyDeals } from "@/components/DailyDeals";
import { Footer } from "@/components/Footer";
import { CouponsSection } from "@/components/CouponsSection";
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
  title: "Economizei | Melhores Ofertas e Cupons de Desconto",
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
  authors: [{ name: "Economizei" }],
  creator: "Economizei",
  publisher: "Economizei",  
  // Open Graph (Facebook, LinkedIn, WhatsApp)
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://economizei.ftech-apps.com.br",
    siteName: "Economizei",
    title: "Economizei | Melhores Ofertas e Cupons de Desconto",
    description: "Encontre os melhores produtos com cupons de desconto exclusivos. Compare preços entre as principais lojas online.",
    images: [
      {
        url: "https://economizei.ftech-apps.com.br/icons/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "Economizei - Melhores Ofertas",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Economizei | Melhores Ofertas e Cupons",
    description: "Encontre os melhores produtos com cupons de desconto exclusivos.",
    images: ["https://economizei.ftech-apps.com.br/icons/og-image.png?v=2"],
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
};

export default async function Home() {
  // Buscar a contagem de cupons ativos por plataforma
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    },
    select: { platform: true, code: true }
  });

  const byPlatform: Record<string, Set<string>> = {};
  for (const c of coupons) {
    let p = c.platform.toLowerCase().trim();
    if (p.includes('mercado') || p === 'meli') p = 'Mercado Livre';
    else if (p.includes('magalu') || p.includes('magazine')) p = 'Magalu';
    else if (p.includes('boticario')) p = 'O Boticário';
    else if (p.includes('shopee')) p = 'Shopee';
    else if (p.includes('amazon')) p = 'Amazon';
    else if (p.includes('aliexpress') || p === 'ali') p = 'AliExpress';
    else if (p.includes('tiktok')) p = 'TikTok Shop';
    else if (p.includes('kabum')) p = 'KaBuM!';
    else p = c.platform; // keep original case if not mapped

    if (!byPlatform[p]) byPlatform[p] = new Set();
    byPlatform[p].add(c.code.toUpperCase());
  }

  const couponsByPlatform = Object.entries(byPlatform).map(([platform, codesSet]) => ({
    platform,
    count: codesSet.size
  }));

  return (
    <main id="inicio" className="flex min-h-screen flex-col items-center overflow-x-hidden pt-16 md:pt-28 pb-28 md:pb-8 relative">
      {/* Fundo Premium 3D animado (agora no layout) */}

      {/* Seção de Cupons */}
      <div id="cupons" className="w-full">
        <CouponsSection couponsByPlatform={couponsByPlatform} />
      </div>

      {/* Promocoes do Dia com Filtros */}
      <div id="ofertas" className="w-full">
        <DailyDeals />
      </div>

      {/* Footer com Grupos e Rodapé */}
      <Footer />
    </main>
  );
}


