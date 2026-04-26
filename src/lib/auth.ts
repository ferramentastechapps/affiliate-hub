export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.API_SECRET_KEY;
  
  if (!validKey) {
    console.warn('API_SECRET_KEY não configurada no .env');
    return false;
  }

  // Verifica se o usuário não alterou a chave padrão do README
  if (validKey === "mude-esta-chave-por-uma-segura-123456789") {
    console.error("ALERTA: O sistema foi bloqueado de validar Webhooks porque sua chave no .env está usando o valor padrão inseguro.");
    return false;
  }
  
  return apiKey === validKey;
}
