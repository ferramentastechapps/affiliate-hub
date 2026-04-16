import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Set correct workspace root
  outputFileTracingRoot: require('path').join(__dirname),

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

export default nextConfig;
