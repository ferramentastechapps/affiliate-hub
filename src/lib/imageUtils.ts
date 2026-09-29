export function isUsableImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "/placeholder.webp") return false;
  
  const lower = trimmed.toLowerCase();
  
  // Imagens de placeholder comuns de lojas (ex: Amazon "Image Unavailable")
  const invalidPatterns = [
    "01rmkvkk-ll",
    "31ptvi11gml", 
    "41vok2o740l"
  ];

  const hasInvalidPattern = invalidPatterns.some(pattern => lower.includes(pattern));

  return (
    !lower.includes("unavailable") &&
    !lower.includes("no-image") &&
    !lower.includes("noimage") &&
    !lower.includes("no_image") &&
    !lower.includes("placeholder") &&
    !hasInvalidPattern
  );
}

export function sanitizeImageUrl(url?: string | null): string | null {
  if (!isUsableImageUrl(url)) return null;

  let sanitized = url!.trim();
  if (sanitized.startsWith("//")) sanitized = "https:" + sanitized;
  if (sanitized.startsWith("http://")) sanitized = sanitized.replace("http://", "https://");

  // Lojas conhecidas que permitem hotlinking livremente ou têm seu próprio proxy
  const knownOrigins = [
    'amazon.com', 'media-amazon.com', 'ssl-images-amazon.com',
    'mlstatic.com', 'mercadolivre.com',
    'shopee.com',
    'alicdn.com', 'aliexpress.com',
    'kabum.com',
    'magazineluiza.com', 'magalucdn.com', 'zattini.com', 'netshoes.com',
    'promobit.com',
    'duckduckgo.com',
    'bing.net', 'bing.com',
    'tcdn.com',
    'vtexassets.com', 'vteximg.com',
    'unsplash.com', 'picsum.photos',
    'cloudinary.com', 'imgur.com'
  ];

  const lowerUrl = sanitized.toLowerCase();

  // Se for uma imagem solta da web (buscada via DuckDuckGo, por exemplo),
  // ela pode ser bloqueada por CORS/Hotlink (403 Forbidden).
  // Para garantir que ela carregue, usamos o proxy oficial do DuckDuckGo.
  const isFromKnownOrigin = knownOrigins.some(domain => lowerUrl.includes(domain));

  if (!isFromKnownOrigin) {
    // Evita proxyar imagens relativas internas ou base64
    if (sanitized.startsWith('https://') || sanitized.startsWith('http://')) {
      return `/api/proxy-image?url=${encodeURIComponent(sanitized)}`;
    }
  }

  return sanitized;
}
