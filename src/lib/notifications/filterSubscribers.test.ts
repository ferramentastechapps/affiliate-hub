import assert from 'node:assert';
import { filterSubscribers, Subscriber, matchKeyword } from './filterSubscribers';

// Mock de assinantes para o teste
const mockSubscribers: Subscriber[] = [
  { endpoint: 'sub-open-general', preferences: null },
  { endpoint: 'sub-tech-category', preferences: { categories: ['tecnologia'] } },
  { endpoint: 'sub-fashion-category', preferences: { categories: ['moda'] } },
  { endpoint: 'sub-keyword-iphone', preferences: { customInterests: ['iphone'] } },
  { endpoint: 'sub-keyword-fone', preferences: { customInterests: ['fone'] } },
  { endpoint: 'sub-keyword-accent', preferences: { customInterests: ['tênis'] } },
  { endpoint: 'sub-keyword-multiple-words', preferences: { customInterests: ['ar condicionado'] } },
  { endpoint: 'sub-both-cat-and-kw', preferences: { categories: ['games'], customInterests: ['ps5'] } }
];

function runTests() {
  console.log('Iniciando testes unitários para filterSubscribers...');

  // Cenário 1: Oferta normal (sem cupom) com categoria 'tecnologia'
  {
    const criteria = { category: 'tecnologia', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 1 (tecnologia, sem cupom):', endpoints);
    assert.ok(endpoints.includes('sub-open-general'), 'Assinante aberto deve receber');
    assert.ok(endpoints.includes('sub-tech-category'), 'Assinante de tecnologia deve receber');

    // Não deve incluir outros
    assert.ok(!endpoints.includes('sub-fashion-category'), 'Moda não deve receber');
    assert.ok(!endpoints.includes('sub-keyword-iphone'), 'Iphone sem match de categoria não deve receber');
  }

  // Cenário 2: Oferta com cupom na categoria 'moda' -> TODOS OS ASSINANTES RECEBEM CUPOM!
  {
    const criteria = { category: 'moda', hasCoupon: true };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 2 (moda, com cupom -> todos recebem):', endpoints);
    assert.strictEqual(endpoints.length, mockSubscribers.length, 'Todos os inscritos devem receber notificações de cupom');
  }

  // Cenário 3: Notificação geral informativa (ex: aviso administrativo)
  {
    const criteria = {};
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 3 (geral manual admin):', endpoints);
    assert.ok(endpoints.includes('sub-open-general'));
    assert.ok(endpoints.includes('sub-tech-category'));
    assert.ok(endpoints.includes('sub-fashion-category'));
  }

  // Cenário 4: Teste de palavra-chave (customInterests)
  {
    const criteria = { productName: 'iPhone 15 Pro Max 256GB', category: 'smartphones', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 4 (palavra-chave "iphone" correspondente):', endpoints);
    assert.ok(endpoints.includes('sub-keyword-iphone'), 'Deveria conter sub-keyword-iphone');
    assert.ok(!endpoints.includes('sub-keyword-fone'), 'Não deveria conter sub-keyword-fone (evitar falso positivo)');
  }

  // Cenário 5: Teste de limite de palavra (evitar fone vs iphone)
  {
    const criteria = { productName: 'Celular Apple iPhone 14 Pro', category: 'smartphones', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 5 (iphone não deve bater com fone):', endpoints);
    assert.ok(!endpoints.includes('sub-keyword-fone'), 'Usuário que quer fone NÃO deve receber alerta de iphone');
    
    // Agora o produto é um fone de verdade
    const criteria2 = { productName: 'Fone de Ouvido Bluetooth JBL Tune', category: 'acessorios', hasCoupon: false };
    const result2 = filterSubscribers(mockSubscribers, criteria2);
    const endpoints2 = result2.map(s => s.endpoint);
    
    console.log('Cenário 5b (fone de ouvido deve bater com fone):', endpoints2);
    assert.ok(endpoints2.includes('sub-keyword-fone'), 'Usuário que quer fone deve receber fone de ouvido');
  }

  // Cenário 6: Teste de acentuação (tênis vs tenis)
  {
    const criteria = { productName: 'Tenis de Corrida Olimpikus Masculino', category: 'calcados', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 6 (tênis sem acento deve bater com palavra-chave tênis):', endpoints);
    assert.ok(endpoints.includes('sub-keyword-accent'), 'Palavra-chave "tênis" deve bater com produto "Tenis de Corrida"');
  }

  // Cenário 7: Teste de palavra-chave com múltiplas palavras (ar condicionado)
  {
    const criteria = { productName: 'Ar Condicionado Split LG Dual Inverter 12000 BTUs', category: 'eletrodomesticos', hasCoupon: false };
    const result = filterSubscribers(mockSubscribers, criteria);
    const endpoints = result.map(s => s.endpoint);

    console.log('Cenário 7 (múltiplas palavras "ar condicionado"):', endpoints);
    assert.ok(endpoints.includes('sub-keyword-multiple-words'), 'Palavra-chave "ar condicionado" deve bater com o produto');
  }

  // Cenário 8: Unitários diretos do matchKeyword
  {
    console.log('Cenário 8 (Unitários diretos de matchKeyword):');
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
