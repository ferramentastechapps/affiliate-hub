import assert from 'node:assert';
import { filterSubscribers, Subscriber } from './filterSubscribers';

// Mock de assinantes para o teste
const mockSubscribers: Subscriber[] = [
  { endpoint: 'sub-legacy', preferences: null },
  { endpoint: 'sub-all', preferences: { all: true } },
  { endpoint: 'sub-coupons-only', preferences: { couponsOnly: true } },
  { endpoint: 'sub-tech-category', preferences: { categories: ['tecnologia'] } },
  { endpoint: 'sub-combined-override', preferences: { all: true, couponsOnly: true } }, // Caso combinado
  { endpoint: 'sub-fashion-category', preferences: { categories: ['moda'] } },
];

function runTests() {
  console.log('Iniciando testes unitários para filterSubscribers...');

  // Cenário 1: Oferta normal (sem cupom) com categoria 'tecnologia'
  {
    const criteria = { category: 'tecnologia', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 1 (tecnologia, sem cupom):', endpoints);
    // Esperado:
    // - sub-legacy (legado -> true)
    // - sub-all (all: true -> true)
    // - sub-tech-category (categoria bate -> true)
    // - sub-combined-override (all: true -> true)
    assert.ok(endpoints.includes('sub-legacy'));
    assert.ok(endpoints.includes('sub-all'));
    assert.ok(endpoints.includes('sub-tech-category'));
    assert.ok(endpoints.includes('sub-combined-override'));

    // Não deve incluir:
    assert.ok(!endpoints.includes('sub-coupons-only'));
    assert.ok(!endpoints.includes('sub-fashion-category'));
  }

  // Cenário 2: Oferta com cupom na categoria 'moda'
  {
    const criteria = { category: 'moda', hasCoupon: true };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 2 (moda, com cupom):', endpoints);
    // Esperado:
    // - sub-legacy
    // - sub-all
    // - sub-coupons-only (tem cupom -> true)
    // - sub-combined-override (all: true -> true)
    // - sub-fashion-category (categoria bate -> true)
    assert.ok(endpoints.includes('sub-legacy'));
    assert.ok(endpoints.includes('sub-all'));
    assert.ok(endpoints.includes('sub-coupons-only'));
    assert.ok(endpoints.includes('sub-combined-override'));
    assert.ok(endpoints.includes('sub-fashion-category'));

    // Não deve incluir:
    assert.ok(!endpoints.includes('sub-tech-category'));
  }

  // Cenário 3: Notificação geral sem produto ou categoria específica (ex: aviso administrativo)
  {
    const criteria = {};
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 3 (geral manual admin):', endpoints);
    // Esperado:
    // - sub-legacy
    // - sub-all
    // - sub-combined-override (all: true -> true)
    // - sub-tech-category (recebe geral se não for restrito a cupons)
    // - sub-fashion-category (recebe geral se não for restrito a cupons)
    assert.ok(endpoints.includes('sub-legacy'));
    assert.ok(endpoints.includes('sub-all'));
    assert.ok(endpoints.includes('sub-combined-override'));
    assert.ok(endpoints.includes('sub-tech-category'));
    assert.ok(endpoints.includes('sub-fashion-category'));

    // Não deve incluir:
    // - sub-coupons-only (restringiu a cupons e não tem cupom -> false)
    assert.ok(!endpoints.includes('sub-coupons-only'));
  }

  // Cenário 4: Checagem explícita da combinação limitante (all: true + couponsOnly: true) sem cupom
  {
    const criteria = { category: 'alimentos', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 4 (alimentos, sem cupom - foco no combinado):', endpoints);
    // Para o sub-combined-override que possui all: true E couponsOnly: true,
    // o all: true deve preceder o couponsOnly: true e receber mesmo sem cupom.
    assert.ok(endpoints.includes('sub-combined-override'), 'sub-combined-override deveria ter recebido pois all: true precede couponsOnly: true');
  }

  // Cenário 5: Filtro com múltiplas categorias ativas na criteria
  {
    const criteria = { categories: ['tecnologia', 'moda'], hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 5 (múltiplas categorias - tecnologia ou moda):', endpoints);
    // Esperado:
    // - sub-legacy
    // - sub-all
    // - sub-tech-category (categoria 'tecnologia' bate)
    // - sub-fashion-category (categoria 'moda' bate)
    // - sub-combined-override (all: true)
    assert.ok(endpoints.includes('sub-legacy'));
    assert.ok(endpoints.includes('sub-all'));
    assert.ok(endpoints.includes('sub-tech-category'));
    assert.ok(endpoints.includes('sub-fashion-category'));
    assert.ok(endpoints.includes('sub-combined-override'));

    // Não deve incluir coupons-only
    assert.ok(!endpoints.includes('sub-coupons-only'));
  }

  console.log('Todos os testes passaram com sucesso! ✅');
}

runTests();
