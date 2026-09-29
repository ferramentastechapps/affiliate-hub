export function isUsableImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "/placeholder.webp") return false;
  const lower = trimmed.toLowerCase();
  const invalidPatterns = ["01rmkvkk-ll", "31ptvi11gml", "41vok2o740l"];
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

const url = "https://i.promobit.com.br/394646208917906251905281261671.png";
console.log("Valid?", isUsableImageUrl(url));
