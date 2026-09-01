/**
 * Módulo de Rate Limiting reutilizável para APIs Next.js.
 *
 * NOTA: Esta implementação usa Map em memória. Em produção com múltiplos
 * processos PM2 (cluster mode), cada processo tem seu próprio rate limiter.
 * Para ambiente multi-processo, substituir por Redis/Upstash.
 *
 * Para a maioria das VPS com PM2 em single instance, funciona corretamente.
 */

interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
  lastRequestAt: number;
}

interface RateLimitOptions {
  /** Janela de tempo em milissegundos (padrão: 60s) */
  windowMs?: number;
  /** Máximo de requests na janela (padrão: 30) */
  max?: number;
  /** Mensagem de erro retornada ao cliente */
  message?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterMs: number;
  message?: string;
}

// Armazenamento global de rate limits (por namespace)
const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup automático a cada 5 minutos para limpar apenas chaves expiradas (sem deletar o namespace)
setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store.entries()) {
      if (now - entry.firstRequestAt > 60 * 60 * 1000) {
        store.delete(key);
      }
    }
  }
}, 5 * 60 * 1000);

/**
 * Cria um rate limiter com namespace próprio para evitar colisão entre endpoints.
 */
export function createRateLimiter(namespace: string, options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000,
    max = 30,
    message = 'Muitas requisições. Tente novamente em breve.',
  } = options;

  if (!stores.has(namespace)) {
    stores.set(namespace, new Map<string, RateLimitEntry>());
  }

  return function checkLimit(identifier: string): RateLimitResult {
    try {
      let store = stores.get(namespace);
      if (!store) {
        store = new Map<string, RateLimitEntry>();
        stores.set(namespace, store);
      }
      const now = Date.now();
      const entry = store.get(identifier);

      if (!entry || now - entry.firstRequestAt > windowMs) {
        store.set(identifier, { count: 1, firstRequestAt: now, lastRequestAt: now });
        return { success: true, remaining: max - 1, retryAfterMs: 0 };
      }

      if (entry.count >= max) {
        const retryAfterMs = windowMs - (now - entry.firstRequestAt);
        return { success: false, remaining: 0, retryAfterMs, message };
      }

      entry.count += 1;
      entry.lastRequestAt = now;
      return { success: true, remaining: max - entry.count, retryAfterMs: 0 };
    } catch {
      return { success: true, remaining: max, retryAfterMs: 0 };
    }
  };
}

/**
 * Extrai o IP real do cliente a partir dos headers da request.
 * Funciona com Nginx/Caddy como proxy reverso.
 */
export function getClientIp(request: Request): string {
  try {
    if (!request || !request.headers) return 'unknown';

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();

    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();
  } catch {
    return 'unknown';
  }

  return 'unknown';
}

/**
 * Sanitiza strings de input do usuário removendo caracteres perigosos.
 */
export function sanitizeInput(input: string, maxLength = 500): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\0/g, '');
}

/**
 * Verifica se uma URL é interna/privada (proteção contra SSRF).
 * Bloqueia IPs como 127.x.x.x, 10.x.x.x, 192.168.x.x, 169.254.x.x (AWS metadata).
 */
export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '0.0.0.0') return true;
    if (hostname === '::1' || hostname.startsWith('[::')) return true;
    if (hostname === '169.254.169.254') return true;
    if (hostname === 'metadata.google.internal') return true;
    if (hostname === '100.100.100.200') return true;

    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, a, b] = match.map(Number);
      if (a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 127) return true;
      if (a === 169 && b === 254) return true;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) return true;

    return false;
  } catch {
    return true;
  }
}
