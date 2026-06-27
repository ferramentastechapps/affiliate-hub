import assert from 'node:assert';
import { filterSubscribers, Subscriber, matchKeyword } from './filterSubscribers';

// Mock de assinantes para o teste
const mockSubscribers: Subscriber[] = [
  { endpoint: 'sub-legacy', preferences: null },
  { endpoint: 'sub-all', preferences: { all: true } },
  { endpoint: 'sub-coupons-only', preferences: { couponsOnly: true } },
  { endpoint: 'sub-tech-category', preferences: { categories: ['tecnologia'] } },
  { endpoint: 'sub-combined-override', preferences: { all: true, couponsOnly: true } },
  { endpoint: 'sub-fashion-category', preferences: { categories: ['moda'] } },
  // Novos assinantes com interesses customizados
  { endpoint: 'sub-keyword-iphone', preferences: { customInterests: ['iphone'] } },
  { endpoint: 'sub-keyword-fone', preferences: { customInterests: ['fone'] } },
  { endpoint: 'sub-keyword-accent', preferences: { customInterests: ['tênis'] } },
  { endpoint: 'sub-keyword-multiple-words', preferences: { customInterests: ['ar condicionado'] } },
  // Assinante combinado: couponsOnly + customInterests
  { endpoint: 'sub-coupons-and-keyword', preferences: { couponsOnly: true, customInterests: ['iphone'] } }
];

function runTests() {
  console.log('Iniciando testes unitários para filterSubscribers...');

  // Cenário 1: Oferta normal (sem cupom) com categoria 'tecnologia'
  {
    const criteria = { category: 'tecnologia', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 1 (tecnologia, sem cupom):', endpoints);
    assert.ok(endpoints.includes('sub-legacy'));
    assert.ok(endpoints.includes('sub-all'));
    assert.ok(endpoints.includes('sub-tech-category'));
    assert.ok(endpoints.includes('sub-combined-override'));

    // Não deve incluir outros
    assert.ok(!endpoints.includes('sub-coupons-only'));
    assert.ok(!endpoints.includes('sub-fashion-category'));
    assert.ok(!endpoints.includes('sub-keyword-iphone'));
  }

  // Cenário 2: Oferta com cupom na categoria 'moda'
  {
    const criteria = { category: 'moda', hasCoupon: true };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 2 (moda, com cupom):', endpoints);
    assert.ok(endpoints.includes('sub-legacy'));
    assert.ok(endpoints.includes('sub-all'));
    assert.ok(endpoints.includes('sub-coupons-only'));
    assert.ok(endpoints.includes('sub-combined-override'));
    assert.ok(endpoints.includes('sub-fashion-category'));

    // Não deve incluir
    assert.ok(!endpoints.includes('sub-tech-category'));
  }

  // Cenário 3: Notificação geral sem produto ou categoria específica (ex: aviso administrativo)
  {
    const criteria = {};
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 3 (geral manual admin):', endpoints);
    assert.ok(endpoints.includes('sub-legacy'));
    assert.ok(endpoints.includes('sub-all'));
    assert.ok(endpoints.includes('sub-combined-override'));
    assert.ok(endpoints.includes('sub-tech-category'));
    assert.ok(endpoints.includes('sub-fashion-category'));

    // Não deve incluir couponsOnly puro
    assert.ok(!endpoints.includes('sub-coupons-only'));
  }

  // Cenário 4: Checagem explícita da combinação limitante (all: true + couponsOnly: true) sem cupom
  {
    const criteria = { category: 'alimentos', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 4 (alimentos, sem cupom - foco no combinado):', endpoints);
    assert.ok(endpoints.includes('sub-combined-override'), 'sub-combined-override deveria ter recebido pois all: true precede couponsOnly: true');
  }

  // Cenário 5: Filtro com múltiplas categorias ativas na criteria
  {
    const criteria = { categories: ['tecnologia', 'moda'], hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 5 (múltiplas categorias - tecnologia ou moda):', endpoints);
    assert.ok(endpoints.includes('sub-legacy'));
    assert.ok(endpoints.includes('sub-all'));
    assert.ok(endpoints.includes('sub-tech-category'));
    assert.ok(endpoints.includes('sub-fashion-category'));
    assert.ok(endpoints.includes('sub-combined-override'));
    assert.ok(!endpoints.includes('sub-coupons-only'));
  }

  // Cenário 6: Teste de palavra-chave (customInterests)
  {
    const criteria = { productName: 'iPhone 15 Pro Max 256GB', category: 'smartphones', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 6 (palavra-chave "iphone" correspondente):', endpoints);
    assert.ok(endpoints.includes('sub-keyword-iphone'), 'Deveria conter sub-keyword-iphone');
    assert.ok(!endpoints.includes('sub-keyword-fone'), 'Não deveria conter sub-keyword-fone (evitar falso positivo)');
  }

  // Cenário 7: Teste de palavra-chave com prioridade sobre couponsOnly
  {
    const criteria = { productName: 'Smart TV Apple iPhone 13', category: 'tecnologia', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 7 (palavra-chave "iphone" em usuário couponsOnly):', endpoints);
    // sub-coupons-and-keyword tem couponsOnly: true E customInterests: ['iphone'].
    // Como a palavra-chave bate, deve receber mesmo sem cupom (Regra 3 > Regra 4).
    assert.ok(endpoints.includes('sub-coupons-and-keyword'), 'Deveria conter sub-coupons-and-keyword devido à prioridade da palavra-chave');
    // sub-coupons-only puro não tem palavra-chave e não tem cupom -> não recebe.
    assert.ok(!endpoints.includes('sub-coupons-only'), 'sub-coupons-only não deve receber sem cupom');
  }

  // Cenário 8: Teste de limite de palavra (evitar fone vs iphone)
  {
    // O produto é um iPhone. O usuário quer "fone" (de fone de ouvido). Ele NÃO deve receber.
    const criteria = { productName: 'Celular Apple iPhone 14 Pro', category: 'smartphones', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 8 (iphone não deve bater com fone):', endpoints);
    assert.ok(!endpoints.includes('sub-keyword-fone'), 'Usuário que quer fone NÃO deve receber alerta de iphone');
    
    // Agora o produto é um fone de verdade
    const criteria2 = { productName: 'Fone de Ouvido Bluetooth JBL Tune', category: 'acessorios', hasCoupon: false };
    const result2 = filterSubscribers(mockSubscribers, criteria2);
    const endpoints2 = result2.map(s => s.endpoint);
    
    console.log('Cenário 8b (fone de ouvido deve bater com fone):', endpoints2);
    assert.ok(endpoints2.includes('sub-keyword-fone'), 'Usuário que quer fone deve receber fone de ouvido');
  }

  // Cenário 9: Teste de acentuação (tênis vs tenis)
  {
    const criteria = { productName: 'Tenis de Corrida Olimpikus Masculino', category: 'calcados', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 9 (tênis sem acento deve bater com palavra-chave tênis):', endpoints);
    assert.ok(endpoints.includes('sub-keyword-accent'), 'Palavra-chave "tênis" deve bater com produto "Tenis de Corrida"');
  }

  // Cenário 10: Teste de palavra-chave com múltiplas palavras (ar condicionado)
  {
    const criteria = { productName: 'Ar Condicionado Split LG Dual Inverter 12000 BTUs', category: 'eletrodomesticos', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 10 (múltiplas palavras "ar condicionado"):', endpoints);
    assert.ok(endpoints.includes('sub-keyword-multiple-words'), 'Palavra-chave "ar condicionado" deve bater com o produto');
  }

  // Cenário 11: Unitários diretos do matchKeyword
  {
    console.log('Cenário 11 (Unitários diretos de matchKeyword):');
    // Falso positivo fone/iphone
    assert.strictEqual(matchKeyword('iPhone 15 Pro', 'fone'), false);
    assert.strictEqual(matchKeyword('Fone de Ouvido', 'fone'), true);
    assert.strictEqual(matchKeyword('SuperFone', 'fone'), false);
    
    // Acentuações
    assert.strictEqual(matchKeyword('Tênis de Academia', 'tenis'), true);
    assert.strictEqual(matchKeyword('Tenis Masculino', 'tênis'), true);
    assert.strictEqual(matchKeyword('Café Melitta', 'cafe'), true);
    
    // Case sensitivity
    assert.strictEqual(matchKeyword('IPHONE 13', 'Iphone'), true);
    
    // Múltiplas palavras
    assert.strictEqual(matchKeyword('Ar Condicionado Inverter', 'ar condicionado'), true);
    assert.strictEqual(matchKeyword('Condicionado de Ar', 'ar condicionado'), false);
  }

  console.log('Todos os testes passaram com sucesso! ✅');
}

runTests();
