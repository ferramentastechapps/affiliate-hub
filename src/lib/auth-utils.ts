import crypto from 'crypto';

// JWT_SECRET DEVE estar configurado no .env. Sem fallback fraco.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.API_SECRET_KEY;
  if (!secret) {
    throw new Error(
      '[SEGURANÇA] JWT_SECRET não configurado no .env. ' +
      'Execute: node -e "require(\"crypto\").randomBytes(48).toString(\"hex\")" ' +
      'e adicione ao seu .env como JWT_SECRET=<valor_gerado>'
    );
  }
  if (secret.length < 32) {
    throw new Error('[SEGURANÇA] JWT_SECRET muito curto. Mínimo 32 caracteres.');
  }
  return secret;
}

// Iterações PBKDF2 — mínimo recomendado OWASP 2025 para SHA-512
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

/**
 * Criptografa uma senha usando PBKDF2 com salting aleatório.
 * Formato do hash: salt:iterations:hash (inclui iterações para migração futura).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return `${salt}:${PBKDF2_ITERATIONS}:${hash}`;
}

/**
 * Verifica se a senha inserida coincide com o hash salvo no banco de dados.
 * Suporta formato legado (salt:hash com 1000 iter.) e novo (salt:iterations:hash).
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length < 2) return false;

    let salt: string, iterations: number, hash: string;

    if (parts.length === 2) {
      // Formato legado: salt:hash (1000 iterações)
      [salt, hash] = parts;
      iterations = 1_000;
    } else {
      // Formato novo: salt:iterations:hash
      [salt, , hash] = parts;
      iterations = parseInt(parts[1], 10);
      if (isNaN(iterations) || iterations < 1) return false;
    }

    if (!salt || !hash) return false;

    const verifyHash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    // timingSafeEqual para evitar timing attacks
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (error) {
    console.error('Erro na verificação de senha:', error);
    return false;
  }
}

/**
 * Assina um token JWT nativo usando algoritmo HS256 com base64url encoding.
 */
export function signToken(payload: any, expiresInDays = 30): string {
  const secret = getJwtSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
  const iat = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, exp, iat };

  const base64UrlHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64UrlPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${base64UrlHeader}.${base64UrlPayload}`)
    .digest('base64url');

  return `${base64UrlHeader}.${base64UrlPayload}.${signature}`;
}

/**
 * Verifica um token JWT e retorna o payload decodificado ou null se for inválido/expirado.
 */
export function verifyToken(token: string): any | null {
  try {
    const secret = getJwtSecret();
    const [headerB64, payloadB64, signature] = token.split('.');
    if (!headerB64 || !payloadB64 || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    // timingSafeEqual para evitar timing attacks na comparação de assinaturas
    const sigBuf = Buffer.from(signature, 'base64url');
    const expBuf = Buffer.from(expectedSignature, 'base64url');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    // Verifica se o token expirou
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verifica o token de ID recebido do Google OAuth diretamente com a API do Google.
 * Não requer pacotes pesados como google-auth-library e é extremamente robusto.
 */
export async function verifyGoogleToken(token: string) {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!response.ok) {
      console.error('Erro na resposta do verificador de token do Google:', response.statusText);
      return null;
    }
    const payload = await response.json();
    
    // Validação da audiência (deve bater com o Google Client ID do projeto)
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (googleClientId && payload.aud !== googleClientId) {
      console.error('Divergência de audiência do Google OAuth:', payload.aud, 'esperado:', googleClientId);
      return null;
    }
    
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error('Erro ao verificar token com a API do Google:', error);
    return null;
  }
}
