import crypto from 'crypto';

export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.API_SECRET_KEY || process.env.AFFILIATE_HUB_API_KEY;
  
  if (!validKey) {
    console.warn('API_SECRET_KEY / AFFILIATE_HUB_API_KEY não configurada no .env');
    return false;
  }

  // Verifica se o usuário não alterou a chave padrão do README
  if (validKey === "mude-esta-chave-por-uma-segura-123456789") {
    console.error("ALERTA: O sistema foi bloqueado de validar Webhooks porque sua chave no .env está usando o valor padrão inseguro.");
    return false;
  }
  
  return apiKey === validKey;
}

export async function validateWebhookSignature(request: Request): Promise<boolean> {
  const secret = process.env.WEBHOOK_SECRET;
  
  // Se não houver WEBHOOK_SECRET configurada no .env, faz o fallback para validateApiKey
  if (!secret) {
    return validateApiKey(request);
  }

  // Permite autenticação alternativa via x-webhook-secret direta (caso configurado assim para testes)
  const webhookSecretHeader = request.headers.get('x-webhook-secret');
  if (webhookSecretHeader === secret) {
    return true;
  }

  const signature = request.headers.get('x-webhook-signature');
  if (!signature) {
    // Caso contrário, tenta validar pela chave de API padrão se fornecida
    if (validateApiKey(request)) {
      return true;
    }
    console.warn('Nenhuma assinatura x-webhook-signature, x-webhook-secret ou x-api-key válida fornecida.');
    return false;
  }

  try {
    // Clonar a request para poder ler o body sem consumir o stream original
    const clonedRequest = request.clone();
    const bodyText = await clonedRequest.text();
    
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(bodyText).digest('hex');

    if (signature.length !== digest.length) {
      return false;
    }

    // timingSafeEqual ajuda a evitar timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(digest, 'hex')
    );
  } catch (err) {
    console.error('Erro ao validar assinatura do webhook:', err);
    return false;
  }
}

