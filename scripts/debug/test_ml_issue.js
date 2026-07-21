const { resolveRedirect } = require('./src/lib/affiliate');

async function test() {
  const promobitUrl = 'https://www.promobit.com.br/oferta/tenis-esportivo-masculino-fluir-olympikus-2886319-2886319/';
  console.log('Testing Promobit URL:', promobitUrl);
  try {
    const finalUrl = await resolveRedirect(promobitUrl);
    console.log('Resolved Final URL:', finalUrl);
  } catch (err) {
    console.error('Error resolving:', err);
  }
}

test();
