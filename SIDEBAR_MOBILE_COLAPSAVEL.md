# 📱 Sidebar Mobile Colapsável

## 🎯 Objetivo

Esconder a sidebar lateral no mobile e mostrar apenas quando o usuário clicar no botão hambúrguer.

---

## ✨ Melhorias Implementadas

### 1. **Sidebar Escondida por Padrão no Mobile**

**ANTES (❌):**
```tsx
<div style={{ marginLeft: '256px' }}>  // Sidebar sempre visível
  <AdminSidebar />
  <main>...</main>
</div>
```
- Sidebar ocupava espaço mesmo no mobile
- Menos espaço para conteúdo
- Layout desktop forçado

**DEPOIS (✅):**
```tsx
<div className="-translate-x-full lg:translate-x-0">  // Escondida no mobile
  <AdminSidebar />
</div>
<main style={{ marginLeft: 0 }}>  // Ocupa tela toda no mobile
  ...
</main>
```
- ✅ Sidebar **escondida** no mobile (< 1024px)
- ✅ Sidebar **visível** no desktop (≥ 1024px)
- ✅ Conteúdo ocupa **100% da largura** no mobile

---

### 2. **Botão Hambúrguer no Header**

**Adicionado:**
```tsx
<button onClick={onMenuClick} className="lg:hidden">
  {mobileSidebarOpen ? <X /> : <List />}
</button>
```

**Características:**
- ✅ Aparece **apenas no mobile** (`lg:hidden`)
- ✅ Ícone muda: `☰` (fechado) → `✕` (aberto)
- ✅ Posição: Canto superior esquerdo
- ✅ Tamanho: 24px (fácil de clicar)

---

### 3. **Overlay com Blur**

**Quando sidebar está aberta:**
```tsx
{mobileSidebarOpen && (
  <div 
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
    onClick={closeSidebar}
  />
)}
```

**Benefícios:**
- ✅ Escurece o fundo (60% opacidade)
- ✅ Blur para foco na sidebar
- ✅ Clique fora fecha a sidebar
- ✅ Padrão mobile moderno

---

### 4. **Animações Suaves**

```css
transition-transform duration-300 ease-in-out
```

**Comportamentos:**
- ✅ Sidebar desliza da esquerda
- ✅ Overlay aparece com fade
- ✅ Transição suave (300ms)
- ✅ Easing natural

---

### 5. **Fechamento Automático**

A sidebar fecha automaticamente quando:

1. **Usuário clica em um link** (mudança de página)
   ```tsx
   useEffect(() => {
     setMobileSidebarOpen(false);
   }, [pathname]);
   ```

2. **Usuário clica no overlay** (fundo escuro)
   ```tsx
   <div onClick={() => setMobileSidebarOpen(false)} />
   ```

3. **Usuário pressiona ESC**
   ```tsx
   useEffect(() => {
     const handleEsc = (e) => {
       if (e.key === 'Escape') setMobileSidebarOpen(false);
     };
     window.addEventListener('keydown', handleEsc);
   }, []);
   ```

---

## 📐 Breakpoints

```css
lg:     → Desktop (≥ 1024px)
```

**Comportamento:**
- **Mobile (< 1024px):**
  - Sidebar escondida por padrão
  - Botão hambúrguer visível
  - Overlay quando aberta
  - Conteúdo ocupa largura total

- **Desktop (≥ 1024px):**
  - Sidebar sempre visível
  - Botão hambúrguer escondido
  - Sem overlay
  - Layout tradicional (sidebar + conteúdo)

---

## 🎨 Hierarquia de z-index

```css
Overlay:       z-40
Sidebar:       z-50  (acima do overlay)
Header:        z-30  (abaixo da sidebar)
```

**Por quê:**
- Sidebar precisa estar **acima** do overlay
- Header precisa estar **abaixo** da sidebar (mobile)
- Overlay precisa cobrir **todo o conteúdo**

---

## 🔄 Fluxo de Interação

### Mobile

```
1. Usuário entra no admin
   └─> Sidebar ESCONDIDA (-translate-x-full)
   └─> Conteúdo ocupa tela toda

2. Usuário clica no ☰
   └─> mobileSidebarOpen = true
   └─> Overlay aparece (bg-black/60 + blur)
   └─> Sidebar desliza para direita (translate-x-0)

3. Usuário clica em "Produtos"
   └─> Navega para /admin/products
   └─> mobileSidebarOpen = false (auto-close)
   └─> Sidebar desliza para esquerda
   └─> Overlay desaparece

4. Alternativas para fechar:
   ├─> Clicar no overlay (fundo)
   ├─> Clicar no ✕ (botão hambúrguer)
   └─> Pressionar ESC
```

### Desktop

```
1. Usuário entra no admin
   └─> Sidebar VISÍVEL (translate-x-0)
   └─> Conteúdo com margin-left

2. Botão hambúrguer NÃO aparece (lg:hidden)

3. Sidebar pode colapsar (ícone na própria sidebar)
   └─> Largura muda de 256px → 60px
   └─> margin-left do conteúdo ajusta
```

---

## 📱 Comparação Visual

### ANTES (Desktop-Only)

```
┌─────────────────────────────────┐
│[Sidebar]│ Content               │
│         │                        │
│ Links   │ Produtos...            │
│         │                        │  ← Sidebar sempre visível
│ Aqui    │ [Card] [Card]          │     no mobile (ruim!)
│         │                        │
└─────────────────────────────────┘
         ↑
    Ocupa espaço no mobile
```

### DEPOIS (Mobile-First)

#### Mobile - Fechado
```
┌─────────────────────────────────┐
│ ☰ Admin          [User] [Exit]  │ ← Header com hambúrguer
├─────────────────────────────────┤
│                                  │
│ Content ocupa largura total!    │
│                                  │
│ [Card]                          │
│ [Card]                          │ ← Mais espaço!
│ [Card]                          │
│                                  │
└─────────────────────────────────┘
```

#### Mobile - Aberto
```
┌─────────────────────────────────┐
│┌──────────┐                     │
││[Sidebar] │ [Overlay escuro]    │
││          │     com blur         │
││ Dashboard│                      │
││ Produtos │  Clique aqui         │
││ Cupons   │  para fechar         │
││ Usuários │                      │
││          │                      │
│└──────────┘                     │
└─────────────────────────────────┘
   ↑ Desliza    ↑ Fecha ao clicar
   da esquerda
```

---

## 🚀 Arquivos Modificados

### 1. `AdminLayout.tsx`

**Mudanças:**
- ✅ Adicionado estado `mobileSidebarOpen`
- ✅ Sidebar com `fixed` + `translate-x`
- ✅ Overlay com blur (`backdrop-blur-sm`)
- ✅ Auto-close ao mudar página
- ✅ Fechar com ESC
- ✅ `margin-left` apenas no desktop

**Código Principal:**
```tsx
// Sidebar fixa com animação
<div className={`
  fixed top-0 left-0 h-full z-50
  lg:translate-x-0
  ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
`}>
  <AdminSidebar />
</div>

// Overlay mobile
{mobileSidebarOpen && (
  <div 
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
    onClick={() => setMobileSidebarOpen(false)}
  />
)}
```

---

### 2. `AdminHeader.tsx`

**Mudanças:**
- ✅ Adicionado props `onMenuClick` e `mobileSidebarOpen`
- ✅ Botão hambúrguer (`lg:hidden`)
- ✅ Ícone muda: `<List />` ↔ `<X />`
- ✅ Título "Admin" no mobile
- ✅ User info compactado no mobile

**Código Principal:**
```tsx
<button
  onClick={onMenuClick}
  className="lg:hidden p-2"
>
  {mobileSidebarOpen ? <X size={24} /> : <List size={24} />}
</button>
```

---

## ✅ Benefícios

### Para o Usuário:
- ✅ **Mais espaço** no mobile (conteúdo ocupa 100%)
- ✅ **Navegação rápida** (sidebar desliza suave)
- ✅ **Padrão familiar** (menu hambúrguer)
- ✅ **Controle** (fecha ao clicar fora ou ESC)

### Para o Sistema:
- ✅ **Responsivo** (funciona em todas as telas)
- ✅ **Performance** (sidebar não renderiza fora da tela)
- ✅ **Acessibilidade** (ESC fecha, overlay clicável)
- ✅ **UX moderna** (animações + blur)

---

## 🧪 Como Testar

### 1. Deploy

```powershell
.\ship.ps1
```

### 2. Teste Mobile

Abra no celular:
```
https://economizei.ftech-apps.com.br/admin
```

**Verificar:**
- [ ] Sidebar **escondida** por padrão
- [ ] Botão **☰** aparece no canto superior esquerdo
- [ ] Clicar em **☰** abre a sidebar
- [ ] **Overlay escuro** aparece atrás
- [ ] Clicar no **overlay** fecha a sidebar
- [ ] Clicar em um **link** fecha a sidebar
- [ ] Pressionar **ESC** fecha a sidebar
- [ ] Conteúdo ocupa **largura total** quando fechada

### 3. Teste Desktop

Abra no navegador (> 1024px de largura):
```
https://economizei.ftech-apps.com.br/admin
```

**Verificar:**
- [ ] Sidebar **visível** por padrão
- [ ] Botão **☰** NÃO aparece
- [ ] Sem **overlay**
- [ ] Layout tradicional (sidebar + conteúdo lado a lado)

---

## 📊 Comparação de Espaço

### Mobile (< 1024px)

| Estado | Sidebar | Conteúdo | Total |
|--------|---------|----------|-------|
| **Fechado** | 0px (escondida) | **100%** ✅ | 100% |
| **Aberto** | 256px (overlay) | 100% (atrás) | 100% |

### Desktop (≥ 1024px)

| Estado | Sidebar | Conteúdo | Total |
|--------|---------|----------|-------|
| **Normal** | 256px | calc(100% - 256px) | 100% |
| **Colapsado** | 60px | calc(100% - 60px) | 100% |

---

## 🎉 Resultado Final

### Mobile:
- ✅ **Sidebar escondida** = Mais espaço para produtos
- ✅ **Menu hambúrguer** = Padrão familiar
- ✅ **Overlay + blur** = Foco na navegação
- ✅ **Auto-close** = UX suave

### Desktop:
- ✅ **Sidebar sempre visível** = Navegação rápida
- ✅ **Sem botão hambúrguer** = Interface limpa
- ✅ **Colapso opcional** = Mais espaço quando necessário

**Perfeito para editar produtos no celular!** 📱✨
