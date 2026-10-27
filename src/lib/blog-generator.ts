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

/**
 * Busca manchetes recentes do Google News RSS Brasil com timeout e retry de queries
 */
async function fetchTrendingNews(): Promise<{ title: string; link?: string }[]> {
  const rssQueries = [
    'tecnologia+smartphones+ofertas+brasil',
    'compras+online+produtos+eletronicos+promocao',
    'comparativo+fones+televisores+notebooks+brasil',
  ];

  for (const query of rssQueries) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) continue;

      const xml = await res.text();
      const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      const items = itemMatches.slice(0, 5).map((item) => {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const rawTitle = titleMatch ? titleMatch[1] : '';
        const cleanTitle = rawTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
        return {
          title: cleanTitle,
          link: linkMatch ? linkMatch[1] : undefined,
        };
      }).filter((i) => Boolean(i.title));

      if (items.length > 0) return items;
    } catch {
      clearTimeout(timeout);
      continue;
    }
  }

  return [];
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
      take: 12,
    });
    return products;
  } catch (err) {
    console.error('[BlogGenerator] Erro ao buscar produtos para contexto:', err);
    return [];
  }
}

/**
 * Executa geração de conteúdo com Gemini com fallback de modelos
 */
async function callGeminiWithFallback(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
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
export async function generateDailyBlogPost(): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no ambiente.');
  }

  // 1. Coleta contexto externo (notícias/tendências) e interno (produtos reais)
  const [trendingNews, siteProducts] = await Promise.all([
    fetchTrendingNews(),
    fetchFeaturedProductsForContext(),
  ]);

  const newsContext = trendingNews.length > 0
    ? trendingNews.map((n, i) => `${i + 1}. ${n.title}`).join('\n')
    : 'Tendências atuais em smartphones, eletroportáteis, fones bluetooth e custo-benefício online no Brasil.';

  const productsContext = siteProducts.length > 0
    ? siteProducts.map((p) => `- ${p.name} | Categoria: ${p.category} | Preço: R$ ${p.price?.toFixed(2) || 'N/A'} | Link: /produto/${p.shortId || p.id}`).join('\n')
    : 'Nenhum produto cadastrado atualmente.';

  // Escolhe uma imagem de capa padrão ou do produto mais relevante
  const candidateCover = siteProducts[0]?.enhancedImageUrl || siteProducts[0]?.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1200&q=80';

  const systemPrompt = `Você é um redator sênior especialista em SEO (Google Search) e GEO (Generative Engine Optimization para ChatGPT, Perplexity, Claude e Google Gemini AI Overviews).
Seu objetivo é escrever um artigo de blog aprofundado, imparcial, prático e altamente recomendável sobre compras inteligentes, tecnologia ou comparativo de produtos no Brasil.

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
Crie um artigo de altíssimo nível (aproximadamente 800 a 1400 palavras no campo 'content') abordando um tema quente ou comparativo relevante com base nas tendências acima.
Garanta que o conteúdo tenha formatação Markdown impecável com subtítulos (## e ###), tabela comparativa, listas de prós e contras, veredito final e FAQ.`;

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
      coverImage: candidateCover,
      category: parsed.category || 'Comparativos',
      tags: parsed.tags || ['Economia', 'Comparativo', '2026'],
      readTimeMinutes: Number(parsed.readTimeMinutes) || 5,
      seoTitle: parsed.seoTitle || parsed.title,
      seoDescription: parsed.seoDescription || parsed.excerpt,
      keywords: parsed.keywords || [],
      structuredData: structuredData || null,
      sourceType: 'ai-automated',
      sourceUrl: trendingNews[0]?.link || null,
      status: 'published',
      publishedAt: new Date(),
    },
  });

  console.log(`[BlogGenerator] Post criado com sucesso: ${createdPost.title} (slug: ${createdPost.slug})`);
  return createdPost;
}
