import fs from 'fs';
import path from 'path';
import assert from 'assert';

const routePath = path.join(process.cwd(), 'src/app/api/webhook/products/route.ts');
const tempRoutePath = path.join(process.cwd(), 'scripts/temp-test-route.ts');

class MockNextResponse {
  static json(body: any, init?: any) {
    return {
      status: init?.status || 200,
      json: async () => body,
      body
    };
  }
}

// 1. Criar o arquivo temporário com as dependências mockadas
function setupTempFile() {
  let content = fs.readFileSync(routePath, 'utf8');

  // Substituir imports Next.js/Prisma/etc. por mocks
  content = content.replace("import { NextResponse } from 'next/server';", 'const NextResponse = MockNextResponse;');
  content = content.replace("import { prisma } from '@/lib/prisma';", 'const prisma = (globalThis as any).prisma;');
  content = content.replace("import { validateApiKey, validateWebhookSignature } from '@/lib/auth';", 
    'const validateApiKey = () => true; const validateWebhookSignature = async () => true;');
  content = content.replace("import { generateAffiliateLink, resolveRedirect } from '@/lib/affiliate';", 
    'const generateAffiliateLink = async (url: string) => url + "-aff"; const resolveRedirect = async (url: string) => url;');
  content = content.replace("import { processProductWithAI } from '@/lib/ai';", 
    'const processProductWithAI = async () => ({ approved: true, score: 9.0, category: "smartphones" });');
  content = content.replace("import { saveEnhancedImage } from '@/lib/storage';", 
    'const saveEnhancedImage = async (url: string) => url;');
  content = content.replace("import { getSecondaryLifestyleImage } from '@/lib/scraper';", 
    'const getSecondaryLifestyleImage = async () => "https://images.com/enhanced.jpg";');
  content = content.replace("import { publishToGroup } from '@/lib/telegram';", 
    'const publishToGroup = async () => {};');
  content = content.replace("import { verificarEDispararAlertas } from '@/lib/notifications';", 
    'const verificarEDispararAlertas = async () => {};');
  content = content.replace("import { fetchAndSaveMLReviews } from '@/lib/reviews';", 
    'const fetchAndSaveMLReviews = async () => {};');

  // Injetar a definição de MockNextResponse no topo do arquivo temporário
  const mockClassStr = `
class MockNextResponse {
  static json(body: any, init?: any) {
    return {
      status: init?.status || 200,
      json: async () => body,
      body,
      headers: { get: () => null }
    };
  }
}
  `;

  fs.writeFileSync(tempRoutePath, mockClassStr + '\n' + content, 'utf8');
}

// 2. Mockar globalmente o prisma e o fetch
const mockProduct = {
  id: 'prod_test_123',
  shortId: 'st123',
  name: 'Celular Samsung Galaxy S24 Ultra',
  price: 5499.00,
  originalPrice: 6999.00,
  imageUrl: 'https://images.com/s24.jpg',
  enhancedImageUrl: 'https://images.com/s24-lifestyle.jpg',
  category: 'smartphones',
  status: 'active',
  coupons: [],
  links: {
    id: 'link_123',
    productId: 'prod_test_123',
    shopee: 'https://shopee.com.br/product-aff'
  }
};

const defaultModelMock = {
  findUnique: async () => mockProduct,
  findFirst: async () => null,
  findMany: async () => [],
  update: async () => mockProduct,
  create: async () => mockProduct,
  delete: async () => mockProduct,
  count: async () => 0
};

// Utiliza Proxy para aceitar qualquer modelo consultado no Prisma de forma dinâmica
(globalThis as any).prisma = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'product') {
      return {
        ...defaultModelMock,
        findUnique: async () => null, // Forçar a criação de um novo produto (não existente)
        findFirst: async () => null,
        update: async () => mockProduct,
        create: async () => mockProduct
      };
    }
    return defaultModelMock;
  }
});

let capturedPayloads: any[] = [];
const originalFetch = global.fetch;

global.fetch = async (url: any, options: any) => {
  const urlStr = String(url);
  if (urlStr.includes('/api/push/send')) {
    const payload = JSON.parse(options.body);
    capturedPayloads.push(payload);
  }
  return {
    ok: true,
    json: async () => ({ success: true }),
    status: 200
  } as any;
};

// 3. Executar o teste de integração
async function runIntegrationTest() {
  console.log('Criando ambiente de teste temporário...');
  setupTempFile();

  try {
    // Importar dinamicamente os handlers do arquivo temporário
    const { POST, PUT } = require('./temp-test-route');

    console.log('Executando teste do handler POST...');
    capturedPayloads = [];

    // Mockar requisição POST
    const mockPostReq = {
      headers: {
        get: (name: string) => {
          if (name === 'x-api-key') return 'test-key';
          if (name === 'content-type') return 'application/json';
          return null;
        }
      },
      json: async () => ({
        id: 'prod_test_123',
        name: 'Celular Samsung Galaxy S24 Ultra',
        price: 5499.00,
        originalPrice: 6999.00,
        imageUrl: 'https://images.com/s24.jpg',
        category: 'smartphones',
        links: { shopee: 'https://shopee.com.br/product' },
        autoApprove: true // Força o envio do push direto
      })
    };

    await POST(mockPostReq as any);

    // Aguardar o processamento assíncrono da IA em background concluir
    await new Promise((resolve) => setTimeout(resolve, 150));

    console.log(`Payloads de push capturados no POST: ${capturedPayloads.length}`);
    assert.strictEqual(capturedPayloads.length, 1, 'Deveria ter disparado 1 notificação push no POST');
    assert.ok(capturedPayloads[0].productId, 'O pushPayload no POST deve conter productId!');
    assert.strictEqual(capturedPayloads[0].productId, 'prod_test_123', 'O productId deve ser "prod_test_123"');
    console.log('✅ Teste do handler POST passou com sucesso (productId presente)!');

    // Reset de payloads capturados
    capturedPayloads = [];

    console.log('Executando teste do handler PUT...');
    // Mockar requisição PUT (batch / atualizar status)
    const mockPutReq = {
      headers: {
        get: (name: string) => {
          if (name === 'x-api-key') return 'test-key';
          if (name === 'content-type') return 'application/json';
          return null;
        }
      },
      json: async () => ({
        products: [{
          id: 'prod_test_123',
          name: 'Celular Samsung Galaxy S24 Ultra',
          price: 5499.00,
          originalPrice: 6999.00,
          imageUrl: 'https://images.com/s24.jpg',
          category: 'smartphones',
          links: { shopee: 'https://shopee.com.br/product' },
          autoApprove: true // Força o envio do push direto no background
        }]
      })
    };

    await PUT(mockPutReq as any);

    // Aguardar o processamento
    await new Promise((resolve) => setTimeout(resolve, 150));

    console.log(`Payloads de push capturados no PUT: ${capturedPayloads.length}`);
    assert.strictEqual(capturedPayloads.length, 1, 'Deveria ter disparado 1 notificação push no PUT');
    
    assert.ok(capturedPayloads[0].productId, 'O pushPayload no PUT deve conter productId!');
    assert.strictEqual(capturedPayloads[0].productId, 'prod_test_123', 'O productId no PUT deve ser "prod_test_123"');
    console.log('✅ Teste do handler PUT passou com sucesso (productId presente)!');

  } catch (error) {
    console.error('❌ Teste de integração falhou:', error);
    process.exit(1);
  } finally {
    // Restaurar fetch original e limpar arquivo temporário
    global.fetch = originalFetch;
    if (fs.existsSync(tempRoutePath)) {
      fs.unlinkSync(tempRoutePath);
      console.log('Arquivo de teste temporário removido.');
    }
  }
}

runIntegrationTest();
