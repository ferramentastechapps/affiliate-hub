/**
 * Valida se uma URL de imagem é acessível e retorna status HTTP de sucesso (2xx).
 * Executado apenas uma vez por disparo no início da API.
 * 
 * @param url A URL da imagem a ser validada
 * @param timeoutMs Tempo máximo de espera pela validação (default 2s)
 * @returns boolean true se for válida e acessível, false em caso de falha ou timeout
 */
export async function validateImageUrl(url: string, timeoutMs: number = 2000): Promise<boolean> {
  if (!url) return false;

  // Verifica protocolo básico
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    // Tenta primeiro com HEAD (mais rápido, sem baixar o corpo da imagem)
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      // Se o HEAD retornar erro (ex: 405 Method Not Allowed), tenta GET
      if (!response.ok) {
        throw new Error('HEAD method failed');
      }
    } catch {
      // Fallback para GET
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
    }

    clearTimeout(timerId);

    if (!response.ok) {
      return false;
    }

    // Verifica o Content-Type para certificar-se de que é uma imagem
    const contentType = response.headers.get('content-type');
    if (contentType) {
      const lowerType = contentType.toLowerCase();
      // Se retornar HTML ou texto de erro explicitamente, invalida
      if (lowerType.includes('text/html') || lowerType.includes('application/json')) {
        return false;
      }
    }

    return true;
  } catch (error) {
    // Captura timeout (AbortError), erro de conexão de rede ou URL inválida
    return false;
  }
}
