# Sistema de Banners

## 📋 Visão Geral

O sistema de banners foi implementado na hero section da página inicial. Os banners são clicáveis e ao clicar, o usuário é direcionado para a seção de ofertas com filtros aplicados automaticamente.

## 🎨 Banners Configurados

### 1. LG Member Days
- **Nome:** LG Member Days
- **Categoria:** eletrodomesticos
- **Descrição:** Até 60% OFF em produtos LG
- **Arquivo:** `/public/banners/lg-memberdays.jpg`

### 2. Netshoes
- **Nome:** Netshoes
- **Categoria:** esportes
- **Descrição:** Cupom de até 15% OFF
- **Arquivo:** `/public/banners/netshoes.jpg`

### 3. Elets Cadeiras
- **Nome:** Elets Cadeiras
- **Categoria:** escritorio
- **Descrição:** Cadeiras com 8% OFF aplicando cupom exclusivo
- **Arquivo:** `/public/banners/elets-cadeiras.jpg`

### 4. Samsung Aniversário
- **Nome:** Samsung Aniversário
- **Categoria:** tecnologia
- **Descrição:** Aniversário Samsung com até 50% OFF + Parcele em até 18x
- **Arquivo:** `/public/banners/samsung-aniversario.jpg`

### 5. AliExpress Saldão de Outono
- **Nome:** AliExpress Saldão de Outono
- **Categoria:** moda
- **Descrição:** Saldão de Outono com até 70% OFF
- **Arquivo:** `/public/banners/aliexpress-outono.jpg`

## 📁 Estrutura de Arquivos

```
src/components/
  └── BannersCarousel.tsx    # Componente do carrossel de banners
  └── HeroSection.tsx         # Hero section atualizada com banners

public/
  └── banners/
      ├── lg-memberdays.jpg
      ├── netshoes.jpg
      ├── elets-cadeiras.jpg
      ├── samsung-aniversario.jpg
      └── aliexpress-outono.jpg
```

## 🎯 Funcionalidades

### Carrossel Automático
- Navegação por setas (esquerda/direita)
- Indicadores de posição (dots)
- Transições suaves com animações
- Hover effect com overlay de informações

### Interatividade
- **Clique no banner:** Rola a página até a seção de ofertas
- **Callback personalizado:** `onBannerClick(category, bannerName)`
- **Filtro automático:** Filtra produtos por categoria ao clicar

### Responsividade
- Mobile: altura 200px
- Desktop: altura 280px
- Controles adaptativos
- Touch-friendly

## 🔧 Como Adicionar Novos Banners

Edite o arquivo `src/components/BannersCarousel.tsx`:

```typescript
const banners: Banner[] = [
  // ... banners existentes
  {
    id: "novo-banner",
    name: "Nome do Banner",
    imageUrl: "/banners/novo-banner.jpg",
    category: "categoria",
    description: "Descrição da oferta"
  }
];
```

## 📐 Especificações das Imagens

- **Formato:** JPG ou PNG
- **Dimensões:** 1400px × 280px
- **Proporção:** 5:1 (widescreen)
- **Peso:** Máximo 500KB (otimizado)
- **Qualidade:** 80-90% (JPG)

## 🎨 Design Guidelines

### Cores
- Use cores vibrantes e contrastantes
- Mantenha legibilidade do texto
- Considere o tema dark do site

### Texto
- Título claro e objetivo
- Call-to-action visível
- Informações de desconto em destaque

### Layout
- Logo da marca no canto superior
- Produtos/imagens no centro ou direita
- Texto principal à esquerda
- Botão CTA no canto inferior direito

## 🔗 Integração com Produtos

Para conectar os banners com produtos específicos, você pode:

1. **Filtrar por categoria:**
   ```typescript
   onBannerClick={(category) => {
     // Filtrar produtos pela categoria
   }}
   ```

2. **Criar landing pages específicas:**
   - `/ofertas/lg-memberdays`
   - `/ofertas/netshoes`
   - etc.

3. **Usar query parameters:**
   - `?category=eletrodomesticos`
   - `?brand=lg`
   - `?promo=memberdays`

## 📱 Salvar as Imagens

1. Baixe as 5 imagens fornecidas
2. Salve na pasta `public/banners/` com os nomes corretos:
   - `lg-memberdays.jpg`
   - `netshoes.jpg`
   - `elets-cadeiras.jpg`
   - `samsung-aniversario.jpg`
   - `aliexpress-outono.jpg`

## ✅ Checklist de Implementação

- [x] Componente BannersCarousel criado
- [x] HeroSection atualizada
- [x] Estrutura de pastas criada
- [ ] Imagens dos banners salvas
- [ ] Teste de navegação
- [ ] Teste de responsividade
- [ ] Integração com filtros de produtos

## 🚀 Próximos Passos

1. Salvar as imagens dos banners
2. Testar a navegação do carrossel
3. Implementar filtros de produtos por categoria
4. Adicionar analytics para tracking de cliques
5. Criar sistema de A/B testing para banners
