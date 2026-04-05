export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.API_SECRET_KEY;
  
  if (!validKey) {
    console.warn('API_SECRET_KEY não configurada no .env');
    return false;
  }
  
  return apiKey === validKey;
}
