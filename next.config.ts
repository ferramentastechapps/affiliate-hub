import type { NextConfig } from "next";
// @ts-ignore - next-pwa types incompatibility
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(jpg|jpeg|png|gif|webp|avif|svg)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "product-images",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 86400, // 24 horas
        },
      },
    },
    {
      urlPattern: /\/api\/products/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-products",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300, // 5 minutos
        },
      },
    },
    {
      urlPattern: /\/api\/coupons/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-coupons",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300,
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // Configuração do Turbopack
  turbopack: {
    root: require('path').join(__dirname),
  },
  
  // Permitir acesso do domínio em desenvolvimento
  allowedDevOrigins: ['123testando.usejotashop.com.br'],
  
  // Metadados base para Open Graph
  metadataBase: new URL('https://123testando.usejotashop.com.br'),
  
  // Add logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Configuração de imagens externas
  images: {
    remotePatterns: [
      // Unsplash (imagens de exemplo)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      // Amazon
      {
        protocol: 'https',
        hostname: '**.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
      },
      // Mercado Livre
      {
        protocol: 'https',
        hostname: 'http2.mlstatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.mlstatic.com',
      },
      // Shopee
      {
        protocol: 'https',
        hostname: 'cf.shopee.com.br',
      },
      {
        protocol: 'https',
        hostname: '**.shopee.com.br',
      },
      // AliExpress
      {
        protocol: 'https',
        hostname: 'ae01.alicdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.alicdn.com',
      },
      // TikTok Shop
      {
        protocol: 'https',
        hostname: 'p16-oec-va.ibyteimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.ibyteimg.com',
      },
      // Promobit (Scraper)
      {
        protocol: 'https',
        hostname: '**.promobit.com.br',
      },
      // Placeholder genérico
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // Permitir qualquer CDN comum
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.imgur.com',
      },
    ],
    // Formatos de imagem otimizados
    formats: ['image/avif', 'image/webp'],
    // Cache de imagens otimizadas
    minimumCacheTTL: 60,
  },
};

// @ts-ignore - next-pwa types incompatibility
export default withPWA(nextConfig);
