#!/bin/bash

echo "=========================================="
echo "TESTE: Correção de Agregadores"
echo "=========================================="
echo ""

# Pegar o webhook secret do .env
cd ~/affiliate-hub
WEBHOOK_SECRET=$(grep WEBHOOK_SECRET .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$WEBHOOK_SECRET" ]; then
    echo "❌ WEBHOOK_SECRET não encontrado no .env"
    exit 1
fi

echo "✅ WEBHOOK_SECRET carregado"
echo ""

# Criar payload de teste
PAYLOAD='{
  "name": "Teste Samsung S25 - Link Agregador Promobit",
  "category": "Eletrônicos",
  "imageUrl": "https://via.placeholder.com/300",
  "price": 2999.99,
  "originalPrice": 3499.99,
  "links": {
    "mercadoLivre": "https://www.promobit.com.br/oferta/999999/samsung-galaxy-s25-teste"
  }
}'

# Calcular assinatura
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

echo "📤 Enviando webhook de teste..."
echo "Payload: Produto de teste com link do Promobit"
echo ""

# Enviar webhook
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST http://localhost:3005/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIGNATURE" \
  -d "$PAYLOAD")

# Separar body e status
HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo "Status HTTP: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "201" ]; then
    echo "✅ Produto criado com sucesso!"
    echo ""
    
    # Extrair ID do produto
    PRODUCT_ID=$(echo "$HTTP_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$PRODUCT_ID" ]; then
        echo "ID do produto: $PRODUCT_ID"
        echo ""
        echo "🔍 Verificando produto no banco de dados..."
        echo ""
        
        # Criar script Node.js para consultar o produto
        cat > /tmp/check_product.js << 'EOF'
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
const productId = process.argv[2];

prisma.product.findUnique({
  where: { id: productId },
  select: {
    id: true,
    name: true,
    platformId: true,
    platformType: true,
    status: true,
    source: true,
    price: true
  }
}).then(p => {
  if (!p) {
    console.log('❌ Produto não encontrado');
    process.exit(1);
  }
  
  console.log('📊 RESULTADO DO TESTE:');
  console.log('====================');
  console.log('Nome:', p.name);
  console.log('platformId:', p.platformId);
  console.log('platformType:', p.platformType);
  console.log('status:', p.status);
  console.log('source:', p.source);
  console.log('');
  
  // Verificar se está correto
  const isCorrect = (
    p.platformType === 'promobit' &&
    p.platformId === null &&
    p.status === 'pending'
  );
  
  if (isCorrect) {
    console.log('✅ TESTE PASSOU! Correção funcionando:');
    console.log('   ✅ platformType = "promobit" (detectado corretamente)');
    console.log('   ✅ platformId = null (não usou ID do agregador)');
    console.log('   ✅ status = "pending" (forçado para aprovação manual)');
    console.log('');
    console.log('🎉 Badge laranja "AGREGADOR" vai aparecer no admin!');
  } else {
    console.log('❌ TESTE FALHOU! Problemas encontrados:');
    if (p.platformType !== 'promobit') {
      console.log('   ❌ platformType deveria ser "promobit", mas é:', p.platformType);
    }
    if (p.platformId !== null) {
      console.log('   ❌ platformId deveria ser null, mas é:', p.platformId);
    }
    if (p.status !== 'pending') {
      console.log('   ❌ status deveria ser "pending", mas é:', p.status);
    }
  }
  
  process.exit(isCorrect ? 0 : 1);
}).catch(e => {
  console.error('Erro:', e);
  process.exit(1);
});
EOF
        
        node /tmp/check_product.js "$PRODUCT_ID"
        TEST_RESULT=$?
        
        rm /tmp/check_product.js
        
        echo ""
        echo "=========================================="
        if [ $TEST_RESULT -eq 0 ]; then
            echo "✅ TESTE COMPLETO - CORREÇÃO FUNCIONANDO!"
        else
            echo "❌ TESTE FALHOU - VERIFICAR CÓDIGO"
        fi
        echo "=========================================="
        
        exit $TEST_RESULT
    else
        echo "⚠️  Não foi possível extrair ID do produto"
        echo "Response:"
        echo "$HTTP_BODY"
    fi
elif [ "$HTTP_STATUS" = "409" ]; then
    echo "⚠️  Produto duplicado (409) - normal se já testou antes"
    echo "Response:"
    echo "$HTTP_BODY"
else
    echo "❌ Erro ao criar produto"
    echo "Response:"
    echo "$HTTP_BODY"
    exit 1
fi
