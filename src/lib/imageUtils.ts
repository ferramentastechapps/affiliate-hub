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
  
  return sanitized;
}
