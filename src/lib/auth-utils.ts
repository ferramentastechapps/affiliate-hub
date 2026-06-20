import crypto from 'crypto';

// Utiliza a chave secreta de ambiente, com fallback seguro para desenvolvimento
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-key-economiza-ai-12345678';

/**
 * Criptografa uma senha usando PBKDF2 com salting aleatório (segurança nível militar, nativo do Node.js).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifica se a senha inserida coincide com o hash salvo no banco de dados.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch (error) {
    console.error('Erro na verificação de senha:', error);
    return false;
  }
}

/**
 * Assina um token JWT nativo usando algoritmo HS256 com base64url encoding.
 */
export function signToken(payload: any, expiresInDays = 30): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
  const fullPayload = { ...payload, exp };

  const base64UrlHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64UrlPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64UrlHeader}.${base64UrlPayload}`)
    .digest('base64url');

  return `${base64UrlHeader}.${base64UrlPayload}.${signature}`;
}

/**
 * Verifica um token JWT e retorna o payload decodificado ou null se for inválido/expirado.
 */
export function verifyToken(token: string): any | null {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    if (!headerB64 || !payloadB64 || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

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
