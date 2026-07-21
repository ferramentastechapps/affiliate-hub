/**
 * IndexNow — Notifica Bing e outros motores de busca quando um produto é criado/aprovado.
 * Documentação: https://www.indexnow.org/
 *
 * Como funciona:
 * 1. Gera-se uma chave API (salva no env como INDEXNOW_KEY)
 * 2. Cria-se um arquivo /{key}.txt na pasta /public com o conteúdo da chave
 * 3. Envia-se um POST para api.indexnow.org com a URL a indexar
 *
 * SETUP:
 * - Defina INDEXNOW_KEY no .env (ex: um UUID aleatório)
 * - Crie o arquivo /public/{INDEXNOW_KEY}.txt com o mesmo valor da chave
 */

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

/**
 * Notifica o IndexNow para uma URL específica.
 * Fire-and-forget — não bloqueia o fluxo principal nem lança exceção.
 */
export async function notifyIndexNow(url: string): Promise<void> {
  if (!INDEXNOW_KEY) {
    // Sem chave configurada — silencioso, não é erro crítico
    return;
  }

  try {
    const body = {
      host: new URL(SITE_URL).hostname,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: [url],
    };

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });

    if (res.ok || res.status === 202) {
      console.log(`[IndexNow] ✅ URL submetida: ${url}`);
    } else {
      console.warn(`[IndexNow] ⚠️ Status inesperado ${res.status} para ${url}`);
    }
  } catch (err: any) {
    // Nunca bloqueia — IndexNow é best-effort
    console.warn('[IndexNow] Erro ao submeter URL:', err.message || err);
  }
}

/**
 * Notifica o IndexNow para um produto (cria a URL /produto/{shortId} automaticamente).
 */
export async function notifyProductIndexNow(shortId: number): Promise<void> {
  const url = `${SITE_URL}/produto/${shortId}`;
  await notifyIndexNow(url);
}
