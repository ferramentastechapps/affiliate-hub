import { DailyDeals } from "@/components/DailyDeals";
import { Footer } from "@/components/Footer";
import { StoreFilter } from "@/components/StoreFilter";
import { HeroSection } from "@/components/HeroSection";
import { WeeklyHighlights } from "@/components/WeeklyHighlights";
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
  title: "Economiza ai | Melhores Ofertas e Cupons de Desconto",
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
  authors: [{ name: "Economiza ai" }],
  creator: "Economiza ai",
  publisher: "Economiza ai",  
  // Open Graph (Facebook, LinkedIn, WhatsApp)
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://economizai.usejotashop.com.br",
    siteName: "Economiza ai",
    title: "Economiza ai | Melhores Ofertas e Cupons de Desconto",
    description: "Encontre os melhores produtos com cupons de desconto exclusivos. Compare preços entre as principais lojas online.",
    images: [
      {
        url: "https://economizai.usejotashop.com.br/icons/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "Economiza ai - Melhores Ofertas",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Economiza ai | Melhores Ofertas e Cupons",
    description: "Encontre os melhores produtos com cupons de desconto exclusivos.",
    images: ["https://economizai.usejotashop.com.br/icons/og-image.png?v=2"],
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

export default async function Home() {
  return (
    <main id="inicio" className="flex min-h-screen flex-col items-center overflow-x-hidden pt-28 pb-8 relative">
      {/* Brilho decorativo de fundo */}
      <div className="ambient-glow" />

      {/* Hero Section */}
      <div className="w-full">
        <HeroSection />
      </div>

      {/* Filtro por Loja (Featured Stores) */}
      <div id="categorias" className="w-full">
        <StoreFilter />
      </div>

      {/* Destaques da Semana */}
      <div className="w-full">
        <WeeklyHighlights />
      </div>

      {/* Promocoes do Dia */}
      <div id="ofertas" className="w-full">
        <DailyDeals />
      </div>

      {/* Footer com Grupos e Rodapé */}
      <Footer />
    </main>
  );
}


