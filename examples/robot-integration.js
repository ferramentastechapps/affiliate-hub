#!/usr/bin/env node
/**
 * Exemplo de integração do robô de promoções com Affiliate Hub (Node.js)
 */

const axios = require('axios');

class AffiliateHubAPI {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    };
  }

  async adicionarProduto(produto) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/webhook/products`,
        produto,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar produto:', error.response?.data || error.message);
      return null;
    }
  }

  async adicionarProdutosLote(produtos) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/api/webhook/products`,
        { products: produtos },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar produtos em lote:', error.response?.data || error.message);
      return null;
    }
  }

  async adicionarCupom(cupom) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/webhook/coupons`,
        cupom,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar cupom:', error.response?.data || error.message);
      return null;
    }
  }

  async adicionarCuponsLote(cupons) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/api/webhook/coupons`,
        { coupons: cupons },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar cupons em lote:', error.response?.data || error.message);
      return null;
    }
  }
}

// Configuração
const API_URL = 'https://seu-dominio.com'; // Altere para sua URL
const API_KEY = 'sua-chave-super-secreta-123'; // Altere para sua chave

// Inicializar API
const api = new AffiliateHubAPI(API_URL, API_KEY);

// Exemplo 1: Adicionar produto único
async function exemploProdutoUnico() {
  const produto = {
    name: 'Mouse Gamer Logitech G502',
    category: 'Gaming',
    description: 'Mouse gamer com 11 botões programáveis e sensor HERO 25K',
    imageUrl: 'https://exemplo.com/mouse-g502.jpg',
    price: 189.90,
    links: {
      amazon: 'https://amazon.com.br/dp/B07GBZ4Q68',
      mercadoLivre: 'https://produto.mercadolivre.com.br/MLB-123456',
      shopee: 'https://shopee.com.br/product/123456'
    }
  };

  const resultado = await api.adicionarProduto(produto);
  if (resultado?.success) {
    console.log(`✅ Produto adicionado: ${produto.name}`);
    console.log(`   ID: ${resultado.product.id}`);
  } else {
    console.log('❌ Erro ao adicionar produto');
  }
}

// Exemplo 2: Adicionar múltiplos produtos
async function exemploProdutosLote() {
  const produtos = [
    {
      name: 'Teclado Mecânico Redragon K552',
      category: 'Gaming',
      imageUrl: 'https://exemplo.com/teclado-k552.jpg',
      price: 249.90,
      links: {
        amazon: 'https://amazon.com.br/dp/B016MAK38U'
      }
    },
    {
      name: 'Headset HyperX Cloud II',
      category: 'Gaming',
      imageUrl: 'https://exemplo.com/headset-cloud2.jpg',
      price: 399.90,
      links: {
        amazon: 'https://amazon.com.br/dp/B00SAYCXWG',
        shopee: 'https://shopee.com.br/product/789012'
      }
    }
  ];

  const resultado = await api.adicionarProdutosLote(produtos);
  if (resultado?.success) {
    console.log(`✅ ${resultado.created} produtos adicionados`);
    if (resultado.errors > 0) {
      console.log(`⚠️  ${resultado.errors} erros`);
    }
  } else {
    console.log('❌ Erro ao adicionar produtos em lote');
  }
}

// Exemplo 3: Adicionar cupom
async function exemploCupomUnico() {
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + 7);

  const cupom = {
    code: 'TECH10',
    description: '10% de desconto em produtos de tecnologia',
    discount: '10% OFF',
    platform: 'Amazon',
    expiresAt: expiraEm.toISOString()
  };

  const resultado = await api.adicionarCupom(cupom);
  if (resultado?.success) {
    console.log(`✅ Cupom adicionado: ${cupom.code}`);
    console.log(`   Expira em: ${expiraEm.toLocaleDateString()}`);
  } else {
    console.log('❌ Erro ao adicionar cupom');
  }
}

// Exemplo 4: Integração completa
async function exemploIntegracaoCompleta() {
  console.log('🤖 Iniciando busca de promoções...');

  // Simula dados extraídos pelo seu robô
  const promocoesEncontradas = [
    {
      name: 'SSD Kingston A400 480GB',
      category: 'Setup',
      description: 'SSD SATA III 2.5" com velocidade de leitura de até 500MB/s',
      imageUrl: 'https://exemplo.com/ssd-kingston.jpg',
      price: 199.90,
      links: {
        amazon: 'https://amazon.com.br/dp/B01N5IB20Q',
        mercadoLivre: 'https://produto.mercadolivre.com.br/MLB-111111'
      }
    },
    {
      name: 'Monitor LG 24" Full HD',
      category: 'Setup',
      description: 'Monitor IPS 24 polegadas Full HD com taxa de atualização de 75Hz',
      imageUrl: 'https://exemplo.com/monitor-lg.jpg',
      price: 699.90,
      links: {
        shopee: 'https://shopee.com.br/product/222222'
      }
    }
  ];

  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + 5);

  const cuponsEncontrados = [
    {
      code: 'TECH15',
      description: '15% de desconto em periféricos',
      discount: '15% OFF',
      platform: 'Amazon',
      expiresAt: expiraEm.toISOString()
    }
  ];

  // Enviar produtos
  console.log(`\n📦 Enviando ${promocoesEncontradas.length} produtos...`);
  const resultadoProdutos = await api.adicionarProdutosLote(promocoesEncontradas);

  if (resultadoProdutos?.success) {
    console.log(`✅ ${resultadoProdutos.created} produtos adicionados com sucesso!`);
  }

  // Enviar cupons
  console.log(`\n🎫 Enviando ${cuponsEncontrados.length} cupons...`);
  const resultadoCupons = await api.adicionarCuponsLote(cuponsEncontrados);

  if (resultadoCupons?.success) {
    console.log(`✅ ${resultadoCupons.created} cupons adicionados com sucesso!`);
  }

  console.log('\n✨ Integração concluída!');
}

// Executar
(async () => {
  console.log('='.repeat(60));
  console.log('🤖 Robô de Promoções - Integração com Affiliate Hub');
  console.log('='.repeat(60));

  // Descomente o exemplo que deseja testar:
  
  // await exemploProdutoUnico();
  // await exemploProdutosLote();
  // await exemploCupomUnico();
  await exemploIntegracaoCompleta();
})();
