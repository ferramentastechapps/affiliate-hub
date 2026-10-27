import { DailyDeals } from "@/components/DailyDeals";
import { TrendingProducts } from "@/components/TrendingProducts";
import { TaxonomyLinks } from "@/components/TaxonomyLinks";
import { Footer } from "@/components/Footer";
import { Metadata } from "next";
import { getHomeInitialProducts, getHomeTrendingProducts } from "@/lib/home-products";

// Renderiza dinamicamente no servidor com banco em tempo real (zero skeletons)
export const dynamic = 'force-dynamic';

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
    {
      "@type": "FAQPage",
      "@id": "https://economizei.ftech-apps.com.br/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Como funcionam os cupons de desconto no Economizei?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Nossa plataforma rastreia e valida cupons de desconto continuamente em lojas parceiras como Amazon, Mercado Livre, Shopee e AliExpress. Você copia o código do cupom diretamente ou clica no link promocional para aplicar o benefício na finalização da compra."
          }
        },
        {
          "@type": "Question",
          "name": "Os preços e promoções são verificados?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. Monitoramos o histórico de preços para garantir que o desconto exibido seja real e atrativo, alertando quando um item atinge o menor preço histórico recente."
          }
        },
        {
          "@type": "Question",
          "name": "O Economizei cobra alguma taxa do comprador?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Não. O uso do Economizei é 100% gratuito para o usuário final. Recebemos uma pequena comissão de afiliados das lojas conveniadas sem nenhum custo adicional no preço que você paga."
          }
        }
      ]
    }
  ],
};

export default async function Home() {
  const [initialDeals, initialTrending] = await Promise.all([
    getHomeInitialProducts(36),
    getHomeTrendingProducts(10),
  ]);

  const productItemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Principais Ofertas e Produtos em Destaque",
    "itemListElement": initialDeals.slice(0, 15).map((p: any, idx: number) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "Product",
        "name": p.name,
        "url": `https://economizei.ftech-apps.com.br/produto/${p.shortId || p.id}`,
        "image": p.enhancedImageUrl || p.imageUrl,
        "offers": {
          "@type": "Offer",
          "price": p.price ? p.price.toFixed(2) : undefined,
          "priceCurrency": "BRL",
          "availability": "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productItemListJsonLd) }}
      />
      <main id="inicio" className="flex min-h-screen flex-col items-center overflow-x-hidden pt-14 md:pt-16 pb-28 md:pb-8 relative">
        {/* Banner semântico H1 para autoridade topical SEO & AEO */}
        <div className="w-full max-w-[1400px] mx-auto px-4 pt-4 pb-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Melhores Ofertas e Cupons de Desconto
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Ao Vivo
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-2xl">
                Compare preços em tempo real nas maiores lojas: Amazon, Mercado Livre, Shopee e AliExpress. Descontos validados.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span rel="author" className="author font-medium text-zinc-300">
                Curadoria Economizei
              </span>
              <span>•</span>
              <time dateTime="2026-10-27" className="text-zinc-500">
                Atualizado em tempo real
              </time>
            </div>
          </div>
        </div>

        {/* Ranking de Produtos em Alta */}
        <TrendingProducts initialTrending={initialTrending} />

        {/* Promocoes do Dia com Filtros */}
        <div id="ofertas" className="w-full">
          <DailyDeals initialProducts={initialDeals} />
        </div>

        {/* Links de navegação para SEO */}
        <TaxonomyLinks />

        {/* Seção Educacional e FAQ para Autoridade Topical e SEO On-Page */}
        <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-12 border-t border-white/5 font-sans">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Como economizar com segurança no Economizei?
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                O <strong>Economizei</strong> monitora os principais marketplaces do Brasil — incluindo <em>Amazon Brasil, Mercado Livre, Shopee, AliExpress, Magalu e KaBuM!</em>. Nosso algoritmo verifica a variação de preços em tempo real, eliminando falsas promoções e destacando apenas ofertas com desconto efetivo.
              </p>

              <h3 className="text-base font-bold text-white pt-2">
                Passo a passo para economizar:
              </h3>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-400 leading-relaxed">
                <li>
                  <strong className="text-zinc-200">Escolha a oferta validada:</strong> Navegue pelo feed atualizado de produtos com o selo de Menor Preço comprovado.
                </li>
                <li>
                  <strong className="text-zinc-200">Copie o código promocional:</strong> Clique no botão do cupom ou no link direto para aplicar a promoção automaticamente.
                </li>
                <li>
                  <strong className="text-zinc-200">Finalize na loja oficial:</strong> Conclua a compra com segurança dentro do ambiente verificado do marketplace parceiro.
                </li>
              </ol>

              <div className="pt-2">
                <cite className="text-xs text-zinc-500 block">
                  Fonte: Dados agregados via APIs de afiliados e histórico de preços dos principais marketplaces brasileiros.
                </cite>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Perguntas Frequentes sobre Cupons e Ofertas
              </h2>
              <div className="space-y-3">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-1">
                    Como aplicar os cupons de desconto?
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Basta clicar sobre o código do cupom para copiá-lo para a área de transferência. Ao ser redirecionado para a loja parceira, insira o código no campo de cupom ou vale-presente na etapa final do carrinho de compras.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-1">
                    Como saber se o desconto é o menor preço histórico?
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Identificamos produtos com o selo especial &quot;Menor Preço&quot; quando o valor atual está igual ou abaixo da mínima registrada nos últimos 30 e 60 dias de rastreamento contínuo.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-1">
                    O Economizei é seguro e gratuito?
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Sim! O Economizei é 100% gratuito. Não solicitamos dados de pagamento ou cartão de crédito. Todas as compras são finalizadas com total segurança nos ambientes oficiais dos próprios marketplaces.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela Comparativa de Lojas Parceiras para Alta Citabilidade GEO & IAs */}
          <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">
                Comparativo de Lojas e Vantagens Parceiras
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Principais condições de frete, garantias e programas de fidelidade nas redes parceiras do Economizei.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-300 bg-white/[0.03]">
                    <th className="py-2.5 px-3 font-semibold">Marketplace</th>
                    <th className="py-2.5 px-3 font-semibold">Destaque Principal</th>
                    <th className="py-2.5 px-3 font-semibold">Frete Grátis</th>
                    <th className="py-2.5 px-3 font-semibold">Proteção ao Consumidor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-400">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-white">Amazon Brasil</td>
                    <td className="py-2.5 px-3">Entrega expressa Prime e cupons diários</td>
                    <td className="py-2.5 px-3">Membros Prime</td>
                    <td className="py-2.5 px-3">Garantia de A a Z</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-white">Mercado Livre</td>
                    <td className="py-2.5 px-3">Envio Mercado Envios Full e programa Meli+</td>
                    <td className="py-2.5 px-3">Acima de R$ 79</td>
                    <td className="py-2.5 px-3">Compra Garantida</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-white">Shopee Brasil</td>
                    <td className="py-2.5 px-3">Cupons mensais de frete e Moedas Shopee</td>
                    <td className="py-2.5 px-3">Via cupons no app</td>
                    <td className="py-2.5 px-3">Garantia Shopee</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-white">AliExpress</td>
                    <td className="py-2.5 px-3">Preços diretos de fábrica e programa Choice</td>
                    <td className="py-2.5 px-3">Itens Choice selecionados</td>
                    <td className="py-2.5 px-3">Remessa Conforme e Reembolso Fácil</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Footer com Grupos e Rodapé */}
        <Footer />
      </main>
    </>
  );
}


