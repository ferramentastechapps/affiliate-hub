# Painel Admin - Affiliate Hub

## Configuração Inicial

1. Instalar dependências (se ainda não instalou):
```bash
npm install
```

2. Configurar o banco de dados:
```bash
npm run db:push
```

3. Iniciar o servidor:
```bash
npm run dev
```

## Acessar o Admin

Acesse: http://localhost:3000/admin

## Funcionalidades

### Gerenciar Produtos

1. **Adicionar Produto Automaticamente**
   - Cole o link de um produto (Amazon, Mercado Livre, Shopee, AliExpress, TikTok)
   - Clique em "Buscar" para puxar os dados automaticamente
   - Os campos serão preenchidos com nome, imagem, preço e descrição
   - Adicione links de outras plataformas manualmente
   - Salve o produto

2. **Adicionar Produto Manualmente**
   - Preencha todos os campos manualmente
   - Adicione os links de afiliados de cada plataforma
   - Escolha a categoria
   - Salve o produto

3. **Editar/Deletar Produtos**
   - Clique no botão "Editar" para modificar
   - Clique no ícone de lixeira para deletar

### Gerenciar Cupons

1. **Adicionar Cupom**
   - Código do cupom (ex: DESCONTO10)
   - Descrição do desconto
   - Valor do desconto (ex: 10% OFF)
   - Plataforma onde funciona
   - Produto específico (opcional)
   - Data de expiração (opcional)

2. **Ativar/Desativar Cupons**
   - Clique no botão "Ativo/Inativo" para alternar

3. **Copiar Código**
   - Clique no código do cupom para copiar

## Visualizar no Site

Os produtos e cupons cadastrados aparecerão automaticamente em:
http://localhost:3000

## Banco de Dados

Para visualizar e editar o banco de dados diretamente:
```bash
npm run db:studio
```

Isso abrirá o Prisma Studio em http://localhost:5555
