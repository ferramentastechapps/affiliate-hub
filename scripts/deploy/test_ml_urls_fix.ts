import { resolveRedirect, generateAffiliateLink } from './src/lib/affiliate';

async function main() {
  console.log('--- TESTE 2: Vitrine com produto /up/MLBU ---');
  const result = await resolveRedirect(
    'https://www.mercadolivre.com.br/social/promobit?matt_word=promobit&matt_tool=76706625&forceInApp=true&ref=BAsT4B3tmmFEdltCwCGDfvbQgoLviE43BGKg3B8XeqI%2FfFH0bNAQRZHWYM6LlwUN2GiMwr2RI%2BzP%2FZr568a0%2FCtu0hmBalMk0cT2ZcGAxyECosSLLEfNOySZ2EWFJTfg9XlqOY1FAS3p3HePuD8k%2F7sCEjesfEP43B1mdIdwyjpmx14Z1tZarVWss7CT8uizUhV3jkr9uCjA8NNWZg%3D%3D',
    'Maçaric Culinário Portátil Regulagem Gourmet Profissional'
  );
  console.log('resolved:', result);
  
  if (result && result !== 'VITRINE_INVALIDA') {
    const affiliateUrl = await generateAffiliateLink(result);
    console.log('affiliate:', affiliateUrl);
  }

  console.log('\n--- TESTE 3: Regressão (Catálogo e Marketplace) ---');
  const cases = [
    // Produto marketplace direto (não vitrine)
    ['https://produto.mercadolivre.com.br/MLB3029481-tenis-nike', 'Tênis Nike'],
    // Produto catálogo direto
    ['https://www.mercadolivre.com.br/p/MLB2837380', 'Produto Catálogo'],
  ];

  const affiliateUrls: string[] = [];

  for (const [url, title] of cases) {
    const resolved = await resolveRedirect(url, title);
    let affiliate = null;
    if (resolved && resolved !== 'VITRINE_INVALIDA') {
        affiliate = await generateAffiliateLink(resolved);
        if (affiliate) affiliateUrls.push(affiliate);
    }
    console.log('input:', url);
    console.log('resolved:', resolved);
    console.log('affiliate:', affiliate);
    console.log('---');
  }

  console.log('\n--- TESTE 4: HTTP Status das URLs ---');
  // Add test 2 affiliate if available
  if (result && result !== 'VITRINE_INVALIDA') {
    const aff = await generateAffiliateLink(result);
    if (aff) affiliateUrls.unshift(aff);
  }

  for (const url of affiliateUrls) {
    try {
      const resp = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      console.log(`${resp.status} - ${url}`);
    } catch (e) {
      console.log(`Error fetching ${url}: ${e}`);
    }
  }
}

main().catch(console.error);
