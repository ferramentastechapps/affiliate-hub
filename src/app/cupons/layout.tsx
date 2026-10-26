import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

export const metadata: Metadata = {
  title: 'Cupons de Desconto e Códigos Promocionais Atualizados | Economizei',
  description: 'Lista completa de cupons de desconto válidos e testados para Amazon, Shopee, Mercado Livre, AliExpress e mais. Economize em suas compras online hoje.',
  alternates: {
    canonical: `${siteUrl}/cupons`,
  },
  openGraph: {
    title: 'Cupons de Desconto e Códigos Promocionais Atualizados | Economizei',
    description: 'Encontre cupons válidos e promoções para as maiores lojas virtuais.',
    url: `${siteUrl}/cupons`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cupons de Desconto Atualizados | Economizei',
    description: 'Encontre cupons válidos e promoções para as maiores lojas virtuais.',
  },
};

export default function CuponsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
