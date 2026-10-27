import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Footer } from '@/components/Footer';
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';

export const revalidate = 1800;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        coverImage: true,
        seoTitle: true,
        seoDescription: true,
        keywords: true,
      },
    });

    if (!post) {
      return { title: 'Artigo não encontrado | Economizei' };
    }

    const title = post.seoTitle || `${post.title} | Blog Economizei`;
    const description = post.seoDescription || post.excerpt;
    const canonicalUrl = `${siteUrl}/blog/${slug}`;
    const image = post.coverImage || `${siteUrl}/icons/og-image.png?v=2`;

    return {
      title,
      description,
      keywords: post.keywords.length > 0 ? post.keywords : ['comparativo', 'guia de compra', 'economia', 'ofertas'],
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: 'article',
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  } catch {
    return { title: 'Artigo | Economizei' };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });

  if (!post) {
    notFound();
  }

  // Busca 3 artigos relacionados da mesma categoria ou recentes
  const relatedPosts = await prisma.blogPost.findMany({
    where: {
      id: { not: post.id },
      status: 'published',
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      category: true,
      publishedAt: true,
      readTimeMinutes: true,
    },
  });

  const absoluteCover = post.coverImage?.startsWith('http')
    ? post.coverImage
    : `${siteUrl}${post.coverImage || '/icons/og-image.png?v=2'}`;

  // Schema JSON-LD Article
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    inLanguage: 'pt-BR',
    articleSection: post.category,
    image: [absoluteCover],
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    wordCount: post.content.split(/\s+/).length,
    author: {
      '@type': 'Person',
      name: post.author,
      url: `${siteUrl}/blog`,
      jobTitle: 'Especialista em Ofertas e Análise de Produtos',
      worksFor: {
        '@type': 'Organization',
        name: 'Economizei',
        url: siteUrl,
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'Economizei',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo%20economizei.webp?v=2`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
  };

  // Schema BreadcrumbList
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${siteUrl}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${siteUrl}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {post.structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(post.structuredData) }}
        />
      )}

      <main className="min-h-screen bg-[#080910] text-white pt-20 md:pt-24 pb-20">
        <article className="max-w-[840px] mx-auto px-4 md:px-6">

          {/* ── BREADCRUMBS ── */}
          <nav aria-label="Navegação estrutural" className="flex items-center gap-2 text-xs text-zinc-500 py-4 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-zinc-400 truncate max-w-[240px] md:max-w-none">{post.category}</span>
          </nav>

          {/* ── CABEÇALHO DO ARTIGO ── */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
              <span className="px-3 py-1 rounded-full bg-[#ff334b]/15 text-[#ff334b] font-bold uppercase tracking-wider">
                {post.category}
              </span>
              <span className="text-zinc-500">•</span>
              <time dateTime={post.publishedAt.toISOString()} className="text-zinc-400">
                {new Date(post.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </time>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">{post.readTimeMinutes} min de leitura</span>
            </div>

            <h1 className="text-2xl md:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-tight mb-4">
              {post.title}
            </h1>

            <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
              {post.excerpt}
            </p>

            {/* EEAT Author Card */}
            <div className="flex items-center gap-3 pt-6 mt-6 border-t border-white/[0.06]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff334b] to-orange-500 flex items-center justify-center font-black text-white text-sm shadow-md">
                E
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  {post.author}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    Verificado
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  Curadoria de Ofertas e Comparativos de Preços
                </div>
              </div>
            </div>
          </header>

          {/* ── IMAGEM DE CAPA ── */}
          {post.coverImage && (
            <div className="my-8 rounded-3xl overflow-hidden bg-[#0c0d14] border border-white/[0.08] shadow-2xl">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full max-h-[460px] object-cover"
                loading="eager"
              />
            </div>
          )}

          {/* ── CONTEÚDO DO ARTIGO ── */}
          <div className="py-4">
            <MarkdownRenderer content={post.content} />
          </div>

          {/* ── TAGS ── */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-2">Tags:</span>
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* ── BANNER COMUNIDADE (WHATSAPP/TELEGRAM) ── */}
          <div className="my-12 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#12141c] to-[#080910] border border-[#ff334b]/20 shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Quer receber ofertas e cupons antes de todo mundo? 🚀
                </h3>
                <p className="text-zinc-400 text-sm mt-1 max-w-lg">
                  Entramos nos grupos das principais lojas e enviamos alertas em tempo real quando um preço despenca.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_t"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#25d366] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[#20bd5a] transition-colors shadow-lg"
                >
                  Grupo WhatsApp
                </a>
                <a
                  href="https://t.me/+OFDVybtJcc40YmZh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#0088cc] text-white font-extrabold text-xs uppercase tracking-wider hover:bg-[#0077b5] transition-colors shadow-lg"
                >
                  Canal Telegram
                </a>
              </div>
            </div>
          </div>

          {/* ── ARTIGOS RELACIONADOS ── */}
          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-10 border-t border-white/[0.08]">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-6">
                Você Também Pode Gostar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedPosts.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/blog/${rel.slug}`}
                    className="group rounded-2xl bg-[#13151f] border border-white/[0.06] hover:border-white/[0.14] overflow-hidden transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {rel.coverImage && (
                        <div className="h-32 w-full overflow-hidden bg-[#0c0d14]">
                          <img
                            src={rel.coverImage}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">
                          {rel.category}
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#ff334b] transition-colors line-clamp-2 leading-snug">
                          {rel.title}
                        </h3>
                      </div>
                    </div>
                    <div className="p-4 pt-0 text-[11px] font-bold text-[#ff334b] flex items-center gap-1">
                      Ler mais →
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </article>
      </main>
      <Footer />
    </>
  );
}
