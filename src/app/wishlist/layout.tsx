import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meus Favoritos e Lista de Desejos | Economizei',
  description: 'Acompanhe seus produtos e ofertas favoritadas para monitorar preços e descontos.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
