# Como Verificar o Deploy na VPS

## ⚠️ Problema Detectado

O site está online mas o SSH não está acessível no momento. Não consegui verificar diretamente se o deploy foi aplicado.

## 🔍 Para Verificar na VPS

### Opção 1: Script Automatizado

1. **Acesse a VPS via SSH:**
   ```bash
   ssh root@200.17.134.101
   ```

2. **Execute o script de verificação:**
   ```bash
   cd /root/ofertou
   chmod +x verificar-deploy-vps.sh
   ./verificar-deploy-vps.sh
   ```

   O script vai verificar:
   - ✅ Status do serviço Next.js
   - ✅ Logs recentes
   - ✅ Se o código foi atualizado (detecção de agregadores)
   - ✅ Se o badge foi adicionado no admin
   - ✅ Processos rodando
   - ✅ API respondendo

---

### Opção 2: Verificação Manual

#### 1. Verificar se o Código Foi Atualizado

```bash
# Conferir se a função extractPlatformDetailsFromUrl tem a validação de agregadores
grep -A 5 "promobit.com.br" /root/ofertou/src/app/api/webhook/products/route.ts
```

**Esperado:** Deve mostrar algo como:
```typescript
if (urlLower.includes('promobit.com.br')) {
  console.log(`[Webhook] URL de agregador Promobit detectada...`);
  return { platformId: null, platformType: 'promobit' };
}
```

#### 2. Verificar Badge no Admin

```bash
# Conferir se o badge de agregador foi adicionado
grep "AGREGADOR" /root/ofertou/src/components/admin/ProductsTab.tsx
```

**Esperado:** Deve retornar 3 linhas (uma para cada modo de visualização)

#### 3. Verificar Status do Serviço

```bash
systemctl status ofertou-nextjs.service
```

**Esperado:** 
- Status: `active (running)`
- Sem erros recentes

#### 4. Ver Logs Recentes

```bash
journalctl -u ofertou-nextjs.service -n 50 --no-pager
```

Procure por:
- ❌ Erros de compilação
- ❌ Falhas no build
- ✅ Mensagens de sucesso

#### 5. Reiniciar Serviço (Se Necessário)

```bash
# Parar o serviço
sudo systemctl stop ofertou-nextjs.service

# Limpar cache do Next.js
cd /root/ofertou
rm -rf .next

# Rebuild
npm run build

# Iniciar novamente
sudo systemctl start ofertou-nextjs.service

# Verificar status
sudo systemctl status ofertou-nextjs.service
```

---

## 🧪 Teste Funcional

Após verificar que o serviço está rodando com o código atualizado:

### 1. Testar com Produto Real

```bash
curl -X POST https://ofertou.shop/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $(echo -n '{"name":"Teste Agregador"}' | openssl dgst -sha256 -hmac "SEU_WEBHOOK_SECRET" | cut -d' ' -f2)" \
  -d '{
    "name": "Samsung Galaxy S25 - Teste Agregador",
    "category": "Eletrônicos",
    "imageUrl": "https://via.placeholder.com/300",
    "price": 2999.99,
    "links": {
      "mercadoLivre": "https://www.promobit.com.br/oferta/2887015/smartphone-samsung"
    }
  }'
```

### 2. Verificar no Admin

Acesse: `https://ofertou.shop/admin/products`

**Procure por:**
- ✅ Badge laranja "AGREGADOR - Revisar Link" no produto criado
- ✅ Status do produto = `pending`
- ✅ platformType = 'promobit'
- ✅ platformId = null

---

## 📊 Checklist de Verificação

- [ ] SSH está acessível (porta 22)
- [ ] Serviço ofertou-nextjs.service está ativo
- [ ] Código atualizado está presente nos arquivos
- [ ] Build do Next.js foi executado sem erros
- [ ] API está respondendo em localhost:3000
- [ ] Badge de agregador aparece no admin
- [ ] Produto de teste é criado com status pending
- [ ] platformType é detectado corretamente

---

## 🚨 Troubleshooting

### Se o Site Mostrar Conteúdo Genérico

O fetch do site retornou um template genérico de "Miami Beach Water Sport". Isso pode indicar:

1. **Cache do Cloudflare/Nginx:** Limpar cache
2. **Build incompleto:** Refazer o build
3. **Porta errada:** Verificar se Nginx está apontando para porta correta

```bash
# Verificar configuração do Nginx
cat /etc/nginx/sites-enabled/ofertou.shop

# Deve ter algo como:
# proxy_pass http://localhost:3000;
```

### Se o Serviço Não Iniciar

```bash
# Ver erros detalhados
journalctl -u ofertou-nextjs.service -xe

# Testar manualmente
cd /root/ofertou
npm run build
npm start
```

---

## 📞 Suporte

Se encontrar problemas:

1. Execute o script `verificar-deploy-vps.sh`
2. Copie a saída completa
3. Compartilhe para análise detalhada

O importante é confirmar:
- ✅ Código foi atualizado
- ✅ Build foi executado
- ✅ Serviço está rodando
- ✅ Badge aparece no admin
