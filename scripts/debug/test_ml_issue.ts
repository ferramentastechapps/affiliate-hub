import { resolveRedirect } from './src/lib/affiliate';

async function test() {
  const promobitUrl = 'https://www.promobit.com.br/oferta/tenis-esportivo-masculino-fluir-olympikus-2886319-2886319/';
  const invalidRefUrl = 'https://www.mercadolivre.com.br/social/promobit?matt_word=promobit&matt_tool=76706625&forceInApp=true';

  console.log('--- TEST 1: Resolving live Promobit URL (Should resolve to Fluir Olympikus) ---');
  try {
    const finalUrl1 = await resolveRedirect(promobitUrl);
    console.log('Test 1 Resolved Final URL:', finalUrl1);
    if (finalUrl1.includes('MLB6415231806')) {
      console.log('Result 1: SUCCESS (Resolved to correct product MLB6415231806)');
    } else {
      console.error('Result 1: FAILURE (Resolved to incorrect product or VITRINE_INVALIDA)');
    }
  } catch (err) {
    console.error('Test 1 Error:', err);
  }

  console.log('\n--- TEST 2: Resolving ML social URL without ref / expired ref (Should discard as VITRINE_INVALIDA) ---');
  try {
    // Pass original title context for validation
    const finalUrl2 = await resolveRedirect(invalidRefUrl, 'Tênis Esportivo Masculino Fluir Olympikus');
    console.log('Test 2 Resolved Final URL:', finalUrl2);
    if (finalUrl2 === 'VITRINE_INVALIDA') {
      console.log('Result 2: SUCCESS (Successfully discarded as VITRINE_INVALIDA)');
    } else {
      console.error('Result 2: FAILURE (Allowed resolving to wrong product in fallback feed)');
    }
  } catch (err) {
    console.error('Test 2 Error:', err);
  }
}

test();
