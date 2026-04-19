# 🔍 Diagnóstico: ID do Produto não aparece no Telegram

## Problema
O ID do produto está aparecendo como "N/A" na mensagem do Telegram quando um novo produto é encontrado.

## Possíveis Causas

1. **API não está retornando o ID** - A resposta da API não contém o campo `id`
2. **Estrutura da resposta diferente** - O ID está em outro lugar na resposta
3. **Erro na criação do produto** - O produto não está sendo criado com sucesso
4. **Problema no parsing da resposta** - O código Python não está lendo a resposta corretamente

## Como Diagnosticar

### Passo 1: Testar a API diretamente

Execute o script de teste:

```bash
cd bot
python test_api_response.py
```

Este script vai:
- Criar um produto de teste
- Mostrar a resposta completa da API
- Analisar a estrutura da resposta
- Verificar se o ID está presente

### Passo 2: Verificar os logs do main.py

Adicionei logs detalhados no `main.py`. Execute o bot e observe a saída:

```bash
python main.py --once
```

Procure por linhas como:
```
🔍 DEBUG - Resultado da API completo:
   Type: <class 'dict'>
   Content: {...}
```

### Passo 3: Verificar o banco de dados

Se o produto foi criado, verifique se tem ID no banco:

```bash
# No diretório raiz do projeto
npx prisma studio
```

Abra a tabela `Product` e veja se os produtos têm IDs.

### Passo 4: Testar o endpoint diretamente

Use curl ou Postman para testar:

```bash
curl -X POST https://seu-site.com/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "name": "Teste Manual",
    "category": "Teste",
    "imageUrl": "https://via.placeholder.com/300",
    "price": 99.99
  }'
```

Verifique se a resposta contém o campo `id`.

## Soluções Possíveis

### Solução 1: Verificar se o ID está sendo retornado

No arquivo `src/app/api/webhook/products/route.ts`, já existe um log:

```typescript
console.log('✅ Produto criado:', {
  id: product.id,
  name: product.name,
  hasId: !!product.id,
  allKeys: Object.keys(product)
});
```

Verifique os logs do Next.js para ver se o ID está sendo criado.

### Solução 2: Garantir que o ID seja sempre retornado

O endpoint já retorna o ID na resposta:

```typescript
return NextResponse.json({
  success: true,
  product: {
    id: product.id,  // <-- ID está aqui
    name: product.name,
    // ...
  }
}, { status: 201 });
```

### Solução 3: Adicionar fallback no Python

Se por algum motivo o ID não vier, podemos usar o nome como identificador temporário:

```python
produto_id = produto_retornado.get('id')
if produto_id:
    produto['id'] = produto_id
else:
    # Fallback: usar hash do nome como ID temporário
    import hashlib
    produto['id'] = hashlib.md5(produto['name'].encode()).hexdigest()[:8]
    print(f'⚠️ ID não retornado, usando hash: {produto["id"]}')
```

## Checklist de Verificação

- [ ] Executar `test_api_response.py` e verificar se o ID aparece
- [ ] Executar `main.py --once` e verificar os logs DEBUG
- [ ] Verificar logs do Next.js (servidor)
- [ ] Testar endpoint com curl/Postman
- [ ] Verificar banco de dados com Prisma Studio
- [ ] Verificar se a variável `AFFILIATE_HUB_URL` está correta no `.env`
- [ ] Verificar se a variável `AFFILIATE_HUB_API_KEY` está correta

## Próximos Passos

1. Execute o script de teste: `python bot/test_api_response.py`
2. Compartilhe a saída completa
3. Vamos analisar onde está o problema exato
