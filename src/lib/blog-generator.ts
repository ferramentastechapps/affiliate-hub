import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';

export interface GeneratedPostData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  tags: string[];
  readTimeMinutes: number;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  structuredData?: any;
  sourceType: string;
  sourceUrl?: string;
}

export interface GenerateBlogOptions {
  topicType?: 'news' | 'comparison' | 'auto';
  forceTopic?: string;
}

/**
 * Busca manchetes recentes do Google News RSS Brasil com timeout e retry de queries,
 * combinando categorias ativas do nosso site com tendências e comparativos nacionais.
 */
async function fetchTrendingNews(siteCategories: string[] = []): Promise<{ title: string; link?: string }[]> {
  const cleanCategories = Array.from(new Set(siteCategories.filter(Boolean))).slice(0, 4);
  const dynamicQueries = cleanCategories.map(
    (cat) => `comparativo+${encodeURIComponent(cat.toLowerCase())}+brasil`
  );

  const baseQueries = [
    'comparativo+smartphones+celulares+brasil',
    'comparativo+notebooks+fones+televisores+brasil',
    'melhor+custo+beneficio+eletronicos+brasil',
    'noticias+tecnologia+lancamentos+brasil',
    'compras+online+produtos+promocao+brasil',
  ];

  const rssQueries = [...dynamicQueries, ...baseQueries];
  const allItems: { title: string; link?: string }[] = [];

  for (const query of rssQueries) {
    if (allItems.length >= 8) break;
    const url = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) continue;

      const xml = await res.text();
      const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const item of itemMatches.slice(0, 3)) {
        const titleMatch =
          item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const rawTitle = titleMatch ? titleMatch[1] : '';
        const cleanTitle = rawTitle
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        if (cleanTitle && !allItems.some((i) => i.title === cleanTitle)) {
          allItems.push({
            title: cleanTitle,
            link: linkMatch ? linkMatch[1] : undefined,
          });
        }
      }
    } catch {
      clearTimeout(timeout);
      continue;
    }
  }

  return allItems;
}

/**
 * Busca produtos ativos no banco do Economizei para enriquecer o post com links internos e dados reais
 */
async function fetchFeaturedProductsForContext(): Promise<any[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: { in: ['active', 'approved'] },
      },
      select: {
        id: true,
        shortId: true,
        name: true,
        category: true,
        price: true,
        originalPrice: true,
        imageUrl: true,
        enhancedImageUrl: true,
        storeName: true,
        brand: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
    return products;
  } catch (err) {
    console.error('[BlogGenerator] Erro ao buscar produtos para contexto:', err);
    return [];
  }
}

function resolveCoverImage(title: string, category: string, siteProducts: any[]): string {
  const lowerTitle = (title || '').toLowerCase();

  // 1. Tenta encontrar um produto no banco cujo nome esteja presente no título do artigo
  const matchedProduct = siteProducts.find((p) => {
    if (!p.name) return false;
    const pName = p.name.toLowerCase();
    const words = pName.split(/\s+/).filter((w: string) => w.length > 3);
    return words.some((w: string) => lowerTitle.includes(w));
  });

  if (matchedProduct && (matchedProduct.enhancedImageUrl || matchedProduct.imageUrl)) {
    return matchedProduct.enhancedImageUrl || matchedProduct.imageUrl;
  }

  // 2. Fallbacks temáticos de altíssima qualidade por assunto
  if (lowerTitle.includes('iphone') || lowerTitle.includes('galaxy') || lowerTitle.includes('celular') || lowerTitle.includes('smartphone') || lowerTitle.includes('motorola') || lowerTitle.includes('xiaomi')) {
    return 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=1200&q=80';
  }
  if (lowerTitle.includes('fone') || lowerTitle.includes('audio') || lowerTitle.includes('headphone') || lowerTitle.includes('earbuds') || lowerTitle.includes('bluetooth') || lowerTitle.includes('som')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80';
  }
  if (lowerTitle.includes('tv') || lowerTitle.includes('televis') || lowerTitle.includes('monitor')) {
    return 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&q=80';
  }
  if (lowerTitle.includes('notebook') || lowerTitle.includes('laptop') || lowerTitle.includes('macbook') || lowerTitle.includes('computador') || lowerTitle.includes('pc')) {
    return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80';
  }
  if (lowerTitle.includes('game') || lowerTitle.includes('gamer') || lowerTitle.includes('playstation') || lowerTitle.includes('ps5') || lowerTitle.includes('xbox') || lowerTitle.includes('nintendo') || lowerTitle.includes('setup')) {
    return 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80';
  }
  if (lowerTitle.includes('air fryer') || lowerTitle.includes('fritadeira') || lowerTitle.includes('aspirador') || lowerTitle.includes('cozinha') || lowerTitle.includes('eletro')) {
    return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80';
  }
  if (lowerTitle.includes('cupom') || lowerTitle.includes('desconto') || lowerTitle.includes('oferta') || lowerTitle.includes('promoc') || lowerTitle.includes('shopee') || lowerTitle.includes('mercado livre')) {
    return 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80';
  }

  return 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80';
}

/**
 * Executa geração de conteúdo com Gemini com fallback de modelos
 */
async function callGeminiWithFallback(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
  let lastError: any = null;

  for (const modelName of models) {
    try {
      console.log(`[BlogGenerator] Tentando modelo Gemini: ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (err: any) {
      console.warn(`[BlogGenerator] Falha no modelo ${modelName}:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Falha em todos os modelos Gemini disponíveis.');
}

/**
 * Gera um post completo otimizado para SEO & GEO usando o Google Gemini
 */
export async function generateDailyBlogPost(options?: GenerateBlogOptions): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no ambiente.');
  }

  // 1. Coleta produtos do catálogo para contextualizar links e categorias
  const siteProducts = await fetchFeaturedProductsForContext();
  const siteCategories = Array.from(
    new Set(siteProducts.map((p) => p.category).filter(Boolean))
  ) as string[];

  // 2. Coleta notícias e manchetes externas sincronizadas com as categorias do site
  const trendingNews = await fetchTrendingNews(siteCategories);

  const newsContext = trendingNews.length > 0
    ? trendingNews.map((n, i) => `${i + 1}. ${n.title}`).join('\n')
    : 'Tendências atuais em smartphones, eletroportáteis, fones bluetooth e custo-benefício online no Brasil.';

  const productsContext = siteProducts.length > 0
    ? siteProducts.map((p) => `- ${p.name} | Categoria: ${p.category} | Preço: R$ ${p.price?.toFixed(2) || 'N/A'} | Link: /produto/${p.shortId || p.id}`).join('\n')
    : 'Nenhum produto cadastrado atualmente.';

  // Determina foco editorial (Manhã: Notícias/Tendências às 8h | Tarde: Comparativos às 18h)
  const currentHour = new Date().getHours();
  const effectiveType = options?.topicType && options.topicType !== 'auto'
    ? options.topicType
    : (currentHour < 13 ? 'news' : 'comparison');

  const editorialFocus = effectiveType === 'news'
    ? `DIRETRIZ EDITORIAL: NOTÍCIAS, TENDÊNCIAS E LANÇAMENTOS DO MERCADO (Edição Matinal das 08h).
Aborde notícias quentes, novos lançamentos de tecnologia, movimentações de preço ou tendências de compras no Brasil.
Conecte o fato aos produtos do catálogo Economizei (abaixo) para orientar o consumidor se vale a pena comprar agora ou aguardar promoções.`
    : `DIRETRIZ EDITORIAL: COMPARATIVO DIRETO DE PRODUTOS / BATALHA DE MODELOS (Edição da Tarde das 18h).
Coloque modelos concorrentes frente a frente (ex: 'Modelo A vs Modelo B' ou 'Os Melhores Modelos de 2026').
Analise especificações técnicas, desempenho real, tabela comparativa com prós e contras e eleja o campeão em custo-benefício.`;

  const customTopicBlock = options?.forceTopic
    ? `\nTEMA ESPECÍFICO SOLICITADO: "${options.forceTopic}". Desenvolva o artigo centrado neste tópico.`
    : '';

  const systemPrompt = `Você é um redator sênior especialista em SEO (Google Search) e GEO (Generative Engine Optimization para ChatGPT, Perplexity, Claude e Google Gemini AI Overviews).
Seu objetivo é escrever um artigo de blog aprofundado, imparcial, prático e altamente recomendável sobre compras inteligentes, tecnologia ou comparativo de produtos no Brasil.

${editorialFocus}
${customTopicBlock}

DIRETRIZES FUNDAMENTAIS DE SEO E GEO:
1. FOCO NO USUÁRIO E RESPOSTA DIRETA (AEO/GEO): O primeiro parágrafo do artigo deve conter um resumo claro ("Veredito Rápido / TL;DR") respondendo diretamente à pergunta ou tema do artigo, para ser citado como resposta direta por mecanismos de IA.
2. TABELA COMPARATIVA OBRIGATÓRIA: Todo comparativo deve incluir uma tabela Markdown estruturada com colunas: | Modelo / Item | Preço Médio | Pontos Fortes | Pontos Fracos | Indicação Principal |.
3. PRÓS E CONTRAS: Use tópicos com ícones (✅ Prós / ❌ Contras) para cada produto ou opção analisada.
4. LINKS INTERNOS NATURAIS: Quando citar produtos similares aos disponíveis no site, use a sintaxe Markdown [Nome do Produto](/produto/ID) utilizando os dados da lista de produtos fornecida.
5. SEÇÃO DE PERGUNTAS FREQUENTES (FAQ): No final, inclua 3 a 4 perguntas e respostas detalhadas (essenciais para Schema FAQPage do Google).
6. TOM DE VOZ: Confiável, especializado, transparente, estilo guia de compras brasileiro com dados práticos de 2026.

FORMATO DE RESPOSTA OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "title": "Título chamativo e otimizado com ano 2026 (máx 70 chars)",
  "category": "Comparativos" | "Guia de Compras" | "Tecnologia" | "Achados",
  "excerpt": "Resumo magnético para o snippet do Google com 140 a 160 caracteres.",
  "content": "Texto completo em formato Markdown rico...",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "readTimeMinutes": 5,
  "seoTitle": "Título SEO com até 60 chars | Economizei",
  "seoDescription": "Meta descrição concisa para Google com até 155 caracteres.",
  "keywords": ["palavra1", "palavra2", "palavra3"],
  "faq": [
    {
      "question": "Pergunta comum do usuário?",
      "answer": "Resposta direta e explicativa."
    }
  ]
}`;

  const userPrompt = `Data atual: Outubro de 2026.
TENDÊNCIAS E NOTÍCIAS RECENTES NO BRASIL:
${newsContext}

PRODUTOS EM DESTAQUE NO ECONOMIZEI PARA REFERÊNCIA E LINKS INTERNOS:
${productsContext}

INSTRUÇÃO:
Crie um artigo de altíssimo nível (aproximadamente 800 a 1400 palavras no campo 'content') abordando o tema definido acima.
Garanta que o conteúdo tenha formatação Markdown impecável com subtítulos (## e ###), tabela comparativa, listas de prós e contras, links internos para produtos do catálogo, veredito final e FAQ.`;

  const responseText = await callGeminiWithFallback(apiKey, systemPrompt, userPrompt);
  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch (err) {
    console.error('[BlogGenerator] Erro ao parsear JSON retornado pelo Gemini:', err, responseText);
    throw new Error('Falha no formato JSON gerado pela IA.');
  }

  // Gera slug amigável e único
  let baseSlug = slugify(parsed.title || 'post-comparativo');
  let finalSlug = baseSlug;
  let counter = 1;

  while (await prisma.blogPost.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Monta FAQ schema estruturado
  const faqList = Array.isArray(parsed.faq) ? parsed.faq : [];
  const structuredData = faqList.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqList.map((item: any) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  } : undefined;

  // Salva no banco de dados
  const createdPost = await prisma.blogPost.create({
    data: {
      slug: finalSlug,
      title: parsed.title,
      excerpt: parsed.excerpt || parsed.title,
      content: parsed.content,
      coverImage: resolveCoverImage(parsed.title, parsed.category, siteProducts),
      category: parsed.category || 'Comparativos',
      tags: parsed.tags || ['Economia', 'Comparativo', '2026'],
      readTimeMinutes: Number(parsed.readTimeMinutes) || 5,
      seoTitle: parsed.seoTitle || parsed.title,
      seoDescription: parsed.seoDescription || parsed.excerpt,
      keywords: parsed.keywords || [],
      structuredData: structuredData || null,
      sourceType: 'ai-automated',
      sourceUrl: trendingNews[0]?.link || null,
      status: 'draft',
      publishedAt: new Date(),
    },
  });

  console.log(`[BlogGenerator] Post criado com sucesso: ${createdPost.title} (slug: ${createdPost.slug})`);
  return createdPost;
}
