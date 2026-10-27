import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog Economizei | Comparativos, Guias de Compras e Dicas de Economia',
  description: 'Análises detalhadas, comparativos de produtos, notícias de tecnologia e guias para economizar nas melhores lojas do Brasil.',
  alternates: {
    canonical: 'https://economizei.ftech-apps.com.br/blog',
  },
  openGraph: {
    title: 'Blog Economizei | Comparativos e Guias de Compras',
    description: 'Descubra os melhores produtos e ofertas com nossos comparativos e guias práticos atualizados diariamente.',
    url: 'https://economizei.ftech-apps.com.br/blog',
    type: 'website',
  },
};

export default async function BlogIndexPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

  const posts = await prisma.blogPost.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 24,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      category: true,
      readTimeMinutes: true,
      publishedAt: true,
      author: true,
    },
  });

  const featuredPost = posts[0] || null;
  const regularPosts = posts.slice(1);

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog Economizei',
    url: `${siteUrl}/blog`,
    description: 'Guias de compra, análises e comparativos de produtos para economizar no Brasil.',
    publisher: {
      '@type': 'Organization',
      name: 'Economizei',
      url: siteUrl,
      logo: `${siteUrl}/logo%20economizei.webp?v=2`,
    },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: `${siteUrl}/blog/${post.slug}`,
      datePublished: post.publishedAt.toISOString(),
      author: {
        '@type': 'Person',
        name: post.author,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <main className="min-h-screen bg-[#080910] text-white pt-20 md:pt-24 pb-20">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">

          {/* ── HEADER DA PÁGINA ── */}
          <div className="py-8 md:py-12 border-b border-white/[0.06]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff334b]/10 border border-[#ff334b]/20 text-[#ff334b] text-xs font-bold uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-[#ff334b] animate-pulse" />
              Conteúdo Especializado & IA
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl">
              Blog de Ofertas, Guias de Compra e Comparativos
            </h1>
            <p className="text-zinc-400 text-base md:text-lg mt-3 max-w-2xl">
              Análises transparentes, listas de prós e contras e respostas diretas para você comprar com segurança e economia real.
            </p>
          </div>

          {/* ── POST EM DESTAQUE ── */}
          {featuredPost && (
            <div className="my-10">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">
                Destaque do Dia
              </div>
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group block relative rounded-3xl overflow-hidden bg-[#13151f] border border-white/[0.08] hover:border-[#ff334b]/40 transition-all duration-300 shadow-2xl"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-4">
                        <span className="px-3 py-1 rounded-lg bg-white/[0.06] text-white font-semibold">
                          {featuredPost.category}
                        </span>
                        <span>•</span>
                        <span>{new Date(featuredPost.publishedAt).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span>{featuredPost.readTimeMinutes} min de leitura</span>
                      </div>
                      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight group-hover:text-[#ff334b] transition-colors leading-snug">
                        {featuredPost.title}
                      </h2>
                      <p className="text-zinc-400 text-sm md:text-base mt-4 line-clamp-3 leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[#ff334b]">
                      Ler artigo completo
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="lg:col-span-5 h-[260px] lg:h-auto relative overflow-hidden bg-[#0c0d14]">
                    {featuredPost.coverImage && (
                      <img
                        src={featuredPost.coverImage}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13151f] via-transparent to-transparent lg:hidden" />
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* ── GRID DE POSTS RECENTES ── */}
          <div className="mt-12">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-6">
              Todos os Artigos & Análises
            </h2>

            {posts.length === 0 ? (
              <div className="py-16 text-center rounded-2xl bg-[#13151f]/50 border border-white/[0.06]">
                <p className="text-zinc-400 text-base">
                  Nenhum artigo publicado no momento. O robô diário publicará automaticamente às 18h!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(featuredPost ? regularPosts : posts).map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col justify-between rounded-2xl bg-[#13151f] border border-white/[0.06] hover:border-white/[0.14] overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg"
                  >
                    <div>
                      <div className="h-48 w-full bg-[#0c0d14] relative overflow-hidden">
                        {post.coverImage ? (
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            Sem imagem
                          </div>
                        )}
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold text-white uppercase tracking-wider">
                          {post.category}
                        </span>
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-2">
                          <span>{new Date(post.publishedAt).toLocaleDateString('pt-BR')}</span>
                          <span>•</span>
                          <span>{post.readTimeMinutes} min de leitura</span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-[#ff334b] transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-zinc-400 text-xs mt-2 line-clamp-3 leading-relaxed">
                          {post.excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 mt-2 flex items-center gap-1.5 text-xs font-bold text-[#ff334b]">
                      Ler artigo
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
