# 📱 Melhores Práticas Mobile - Guia de Referência

## 🎯 Touch Targets (Alvos de Toque)

### Guidelines Oficiais

**Apple Human Interface Guidelines (HIG)**:
- Mínimo: **44x44 pontos** (44x44px)
- Recomendado: **48x48 pontos**

**Material Design (Google)**:
- Mínimo: **48x48 dp** (48x48px)
- Recomendado: **56x56 dp**

**WCAG 2.1 (Acessibilidade)**:
- Mínimo: **44x44 pixels** (Level AAA)

### Implementação no Projeto

```tsx
// ✅ BOM: Botão com touch target adequado
<button className="px-5 py-3 min-h-[44px]">
  Clique aqui
</button>

// ✅ BOM: Botão de ícone
<button className="p-3 min-w-[44px] min-h-[44px]">
  <Icon size={20} />
</button>

// ❌ RUIM: Touch target insuficiente
<button className="px-2 py-1">
  Clique aqui
</button>
```

### Espaçamento Entre Elementos

**Mínimo recomendado**: 8px entre elementos clicáveis
**Ideal**: 12-16px

```tsx
// ✅ BOM: Espaçamento adequado
<div className="flex gap-4">
  <button>Botão 1</button>
  <button>Botão 2</button>
</div>

// ⚠️ ACEITÁVEL: Espaçamento mínimo
<div className="flex gap-2">
  <button>Botão 1</button>
  <button>Botão 2</button>
</div>

// ❌ RUIM: Sem espaçamento
<div className="flex gap-0">
  <button>Botão 1</button>
  <button>Botão 2</button>
</div>
```

---

## 📝 Tipografia Mobile

### Tamanhos Recomendados

```css
/* Hierarquia de Texto */
--text-xs:    12px  /* Mínimo absoluto - apenas para labels secundários */
--text-sm:    14px  /* Texto secundário, captions */
--text-base:  16px  /* Corpo de texto, inputs (evita zoom iOS) */
--text-lg:    18px  /* Subtítulos */
--text-xl:    20px  /* Títulos de seção */
--text-2xl:   24px  /* Títulos principais */
--text-3xl:   30px  /* Hero titles */
```

### Regras Importantes

1. **Inputs devem ter mínimo 16px** para evitar zoom automático no iOS
2. **Corpo de texto**: mínimo 14px, ideal 16px
3. **Texto secundário**: mínimo 12px
4. **Evite texto abaixo de 11px** em qualquer situação

### Implementação

```tsx
// ✅ BOM: Input com tamanho adequado (evita zoom iOS)
<input 
  type="email" 
  className="text-base py-4"
  placeholder="seu@email.com"
/>

// ✅ BOM: Hierarquia clara
<div>
  <h2 className="text-2xl font-bold">Título</h2>
  <p className="text-base text-zinc-400">Descrição</p>
  <span className="text-xs text-zinc-500">Metadata</span>
</div>

// ❌ RUIM: Input pequeno (causa zoom no iOS)
<input 
  type="email" 
  className="text-sm"
  placeholder="seu@email.com"
/>
```

---

## 📐 Espaçamento e Layout

### Sistema de Espaçamento (Tailwind)

```css
/* Escala de Espaçamento */
gap-1:  4px   /* Muito apertado */
gap-2:  8px   /* Mínimo aceitável */
gap-3:  12px  /* Confortável */
gap-4:  16px  /* Ideal para mobile */
gap-5:  20px  /* Espaçoso */
gap-6:  24px  /* Desktop */
```

### Grids Responsivos

```tsx
// ✅ BOM: Grid com espaçamento adequado
<div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
  {/* Cards */}
</div>

// ✅ BOM: Padding responsivo
<div className="p-4 sm:p-6 lg:p-8">
  {/* Conteúdo */}
</div>

// ❌ RUIM: Espaçamento fixo
<div className="grid grid-cols-2 gap-2">
  {/* Cards muito apertados */}
</div>
```

### Breakpoints Tailwind

```css
/* Breakpoints Padrão */
sm:  640px   /* Tablet pequeno */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop pequeno */
xl:  1280px  /* Desktop */
2xl: 1536px  /* Desktop grande */
```

### Mobile-First Approach

```tsx
// ✅ BOM: Mobile-first (base = mobile)
<div className="text-sm md:text-base lg:text-lg">
  Texto responsivo
</div>

// ✅ BOM: Padding mobile-first
<div className="p-4 md:p-6 lg:p-8">
  Container
</div>

// ❌ RUIM: Desktop-first
<div className="text-lg md:text-sm">
  Texto ao contrário
</div>
```

---

## 🎨 Formulários Mobile

### Inputs Otimizados

```tsx
// ✅ BOM: Input completo e otimizado
<input
  type="email"
  inputMode="email"
  autoComplete="email"
  className="w-full px-4 py-4 text-base rounded-xl"
  placeholder="seu@email.com"
/>

// ✅ BOM: Input de senha
<input
  type="password"
  autoComplete="current-password"
  className="w-full px-4 py-4 text-base rounded-xl"
  placeholder="••••••••"
/>

// ✅ BOM: Input de telefone
<input
  type="tel"
  inputMode="tel"
  autoComplete="tel"
  className="w-full px-4 py-4 text-base rounded-xl"
  placeholder="(11) 99999-9999"
/>
```

### Atributos Importantes

**inputMode**: Define o teclado mobile
```tsx
inputMode="text"      // Teclado padrão
inputMode="email"     // Teclado com @ e .com
inputMode="tel"       // Teclado numérico com símbolos
inputMode="numeric"   // Apenas números
inputMode="decimal"   // Números com decimal
inputMode="search"    // Teclado de busca
inputMode="url"       // Teclado com .com e /
```

**autoComplete**: Preenche automaticamente
```tsx
autoComplete="name"
autoComplete="email"
autoComplete="tel"
autoComplete="street-address"
autoComplete="postal-code"
autoComplete="current-password"
autoComplete="new-password"
```

### Checkboxes e Radio Buttons

```tsx
// ✅ BOM: Checkbox com área clicável grande
<label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
  <input 
    type="checkbox" 
    className="w-5 h-5 rounded"
  />
  <span className="text-sm">Aceito os termos</span>
</label>

// ❌ RUIM: Checkbox pequeno
<label className="flex items-center gap-1">
  <input type="checkbox" className="w-3 h-3" />
  <span>Aceito</span>
</label>
```

---

## 🎭 Modais e Overlays

### Modal Responsivo

```tsx
// ✅ BOM: Modal otimizado para mobile
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  {/* Overlay */}
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
  
  {/* Modal */}
  <div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl sm:rounded-3xl overflow-hidden max-h-[90vh] mx-2 sm:mx-0">
    {/* Botão fechar */}
    <button 
      className="absolute top-3 right-3 sm:top-4 sm:right-4 p-3 min-w-[44px] min-h-[44px]"
      aria-label="Fechar modal"
    >
      <X size={20} />
    </button>
    
    {/* Conteúdo scrollável */}
    <div className="overflow-y-auto max-h-[90vh] p-4 sm:p-6">
      {/* Conteúdo */}
    </div>
  </div>
</div>
```

### Boas Práticas

1. **Sempre adicione `aria-label`** em botões de fechar
2. **Use `max-h-[90vh]`** para evitar modal maior que a tela
3. **Adicione padding lateral** em mobile (`mx-2`)
4. **Botão fechar**: mínimo 44x44px
5. **Scroll interno**: use `overflow-y-auto`

---

## 🎬 Animações Performáticas

### Propriedades Seguras

**Use apenas estas propriedades para animações**:
- `transform` (translate, scale, rotate)
- `opacity`

**Evite animar**:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `background-color` (use com moderação)

### Framer Motion Otimizado

```tsx
// ✅ BOM: Animação performática
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  Conteúdo
</motion.div>

// ✅ BOM: Hover suave
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
>
  Botão
</motion.button>

// ❌ RUIM: Animação pesada
<motion.div
  animate={{ 
    width: "100%", 
    height: "500px",
    backgroundColor: "#000"
  }}
>
  Conteúdo
</motion.div>
```

### Event Listeners Otimizados

```tsx
// ✅ BOM: Passive listener
useEffect(() => {
  const handleScroll = () => {
    // Lógica
  };
  
  window.addEventListener("scroll", handleScroll, { passive: true });
  
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

// ❌ RUIM: Sem passive
window.addEventListener("scroll", handleScroll);
```

---

## 🖼️ Imagens Otimizadas

### Next.js Image

```tsx
// ✅ BOM: Imagem otimizada
<Image
  src="/produto.jpg"
  alt="Nome do produto"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 800px"
  priority={false}
  quality={85}
  className="object-cover"
/>

// ✅ BOM: Imagem hero (acima da dobra)
<Image
  src="/hero.jpg"
  alt="Banner principal"
  width={1920}
  height={1080}
  sizes="100vw"
  priority={true}
  quality={90}
/>

// ❌ RUIM: Tag img comum
<img src="/produto.jpg" alt="Produto" />
```

### Lazy Loading

```tsx
// ✅ BOM: Lazy load automático (Next.js Image)
<Image src="/produto.jpg" alt="Produto" width={400} height={300} />

// ✅ BOM: Lazy load manual
<img 
  src="/produto.jpg" 
  alt="Produto" 
  loading="lazy"
  decoding="async"
/>
```

---

## ♿ Acessibilidade Mobile

### ARIA Labels

```tsx
// ✅ BOM: Botão com aria-label
<button 
  aria-label="Fechar modal"
  className="p-3"
>
  <X size={20} />
</button>

// ✅ BOM: Link com aria-label
<a 
  href="/produto"
  aria-label="Ver detalhes do produto"
>
  <ArrowRight size={20} />
</a>

// ❌ RUIM: Botão sem label
<button className="p-3">
  <X size={20} />
</button>
```

### Contraste

**WCAG AA (Mínimo)**:
- Texto normal: 4.5:1
- Texto grande (18px+): 3:1

**WCAG AAA (Ideal)**:
- Texto normal: 7:1
- Texto grande: 4.5:1

```tsx
// ✅ BOM: Contraste adequado
<p className="text-white">Texto branco em fundo escuro</p>
<p className="text-zinc-900">Texto escuro em fundo claro</p>

// ⚠️ CUIDADO: Contraste baixo
<p className="text-zinc-400">Texto cinza em fundo escuro</p>
```

### Foco Visível

```tsx
// ✅ BOM: Foco visível
<button className="focus:outline-none focus:ring-2 focus:ring-accent">
  Botão
</button>

// ❌ RUIM: Sem foco visível
<button className="focus:outline-none">
  Botão
</button>
```

---

## 📱 PWA e Offline

### Viewport Meta Tag

```html
<!-- ✅ BOM: Viewport otimizado -->
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1, maximum-scale=5"
/>

<!-- ❌ RUIM: Bloqueia zoom (acessibilidade) -->
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1, user-scalable=no"
/>
```

### Manifest.json

```json
{
  "name": "123 Testando",
  "short_name": "123 Testando",
  "description": "Melhores cupons e promoções",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## 🎯 Checklist de Desenvolvimento

### Antes de Commitar

- [ ] Todos os botões têm `min-h-[44px]` ou maior
- [ ] Inputs têm `text-base` (16px) para evitar zoom iOS
- [ ] Checkboxes têm mínimo `w-5 h-5` (20px)
- [ ] Espaçamento entre elementos clicáveis: mínimo 8px
- [ ] Modais têm botão fechar com 44x44px
- [ ] Todos os botões de ícone têm `aria-label`
- [ ] Formulários têm `autoComplete` e `inputMode`
- [ ] Animações usam apenas `transform` e `opacity`
- [ ] Imagens usam Next.js Image (exceto ícones pequenos)
- [ ] Testado em 320px (menor tela)

### Antes de Deploy

- [ ] Testado em Chrome DevTools (5 tamanhos diferentes)
- [ ] Testado em dispositivo real (iOS ou Android)
- [ ] Lighthouse Mobile Score > 90
- [ ] Sem erros de acessibilidade
- [ ] PWA funciona offline
- [ ] Install banner aparece corretamente

---

## 🚀 Performance Tips

### Code Splitting

```tsx
// ✅ BOM: Lazy load de modal
const PlatformModal = dynamic(() => import('./PlatformModal'), {
  loading: () => <div>Carregando...</div>
});

// ✅ BOM: Lazy load de componente pesado
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Memoização

```tsx
// ✅ BOM: Evita re-renders desnecessários
const ProductCard = memo(({ product }) => {
  return <div>{product.name}</div>;
});

// ✅ BOM: useMemo para cálculos pesados
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);
```

### Debounce em Inputs

```tsx
// ✅ BOM: Debounce em busca
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  // Busca apenas após 300ms sem digitar
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

---

## 📚 Recursos Adicionais

### Guidelines Oficiais
- [Apple HIG - iOS](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design - Android](https://material.io/design)
- [WCAG 2.1 - Acessibilidade](https://www.w3.org/WAI/WCAG21/quickref/)

### Ferramentas de Teste
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [BrowserStack](https://www.browserstack.com/)

### Validadores
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE - Acessibilidade](https://wave.webaim.org/)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

---

## ✨ Conclusão

Seguindo estas práticas, você garante uma experiência mobile excepcional, acessível e performática. Lembre-se:

1. **Touch targets**: mínimo 44x44px
2. **Tipografia**: mínimo 16px em inputs
3. **Espaçamento**: mínimo 8px entre elementos
4. **Acessibilidade**: sempre adicione ARIA labels
5. **Performance**: use transform e opacity para animações

**Mobile-first é o caminho!** 📱✨

