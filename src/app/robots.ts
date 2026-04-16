import { MetadataRoute } from 'next';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 ROBOTS.TXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Instrui os crawlers dos motores de busca sobre quais páginas podem indexar

export default function robots(): MetadataRoute.Robots {
  // URL base do site (ALTERE PARA SEU DOMÍNIO)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seu-dominio.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // Não indexar rotas de API
          '/admin/login',    // Não indexar página de login
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/login'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
