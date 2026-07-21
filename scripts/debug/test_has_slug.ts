function hasSlug(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const path = url.pathname;
    const cleanPath = path.replace(/MLB-?\d+/gi, '').replace(/[^a-zA-Z]/g, '');
    return cleanPath.length > 3;
  } catch {
    return false;
  }
}

console.log('Should be false:', hasSlug('https://produto.mercadolivre.com.br/MLB6415231806'));
console.log('Should be false:', hasSlug('https://produto.mercadolivre.com.br/MLB-6415231806'));
console.log('Should be true:', hasSlug('https://produto.mercadolivre.com.br/MLB-6992245086-tnis-vorax-1015-pro-masculino-academia-caminhada-original-_JM'));
console.log('Should be true:', hasSlug('https://www.mercadolivre.com.br/tenis-esportivo-masculino-fluir-olympikus/p/MLB100371975037'));
