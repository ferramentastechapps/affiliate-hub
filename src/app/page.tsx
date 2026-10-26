import { DailyDeals } from "@/components/DailyDeals";
import { TrendingProducts } from "@/components/TrendingProducts";
import { TaxonomyLinks } from "@/components/TaxonomyLinks";
import { Footer } from "@/components/Footer";
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
  alternates: {
    canonical: "https://economizei.ftech-apps.com.br",
  },
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

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://economizei.ftech-apps.com.br/#website",
      "url": "https://economizei.ftech-apps.com.br",
      "name": "Economizei",
      "description": "Melhores ofertas e cupons de desconto do Brasil",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://economizei.ftech-apps.com.br/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://economizei.ftech-apps.com.br/#organization",
      "name": "Economizei",
      "url": "https://economizei.ftech-apps.com.br",
      "logo": "https://economizei.ftech-apps.com.br/icons/icon-512x512.png",
      "sameAs": [
        "https://www.instagram.com/economizeicomjota",
        "https://t.me/+OFDVybtJcc40YmZh",
        "https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_t",
      ],
    },
  ],
};

export default async function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <main id="inicio" className="flex min-h-screen flex-col items-center overflow-x-hidden pt-14 md:pt-16 pb-28 md:pb-8 relative">
        {/* Banner semântico H1 para autoridade topical SEO & AEO */}
        <div className="w-full max-w-[1400px] mx-auto px-4 pt-4 pb-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Melhores Ofertas e Cupons de Desconto</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Ao Vivo
                </span>
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-2xl">
                Compare preços em tempo real nas maiores lojas: Amazon, Mercado Livre, Shopee e AliExpress. Descontos validados.
              </p>
            </div>
          </div>
        </div>

        {/* Ranking de Produtos em Alta */}
        <TrendingProducts />

        {/* Promocoes do Dia com Filtros */}
        <div id="ofertas" className="w-full">
          <DailyDeals />
        </div>

        {/* Links de navegação para SEO */}
        <TaxonomyLinks />

        {/* Footer com Grupos e Rodapé */}
        <Footer />
      </main>
    </>
  );
}


