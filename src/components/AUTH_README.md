# Componente de Autenticação Flutuante

Sistema de autenticação não-bloqueante seguindo os princípios da **taste-skill** com configurações:
- DESIGN_VARIANCE: 6
- MOTION_INTENSITY: 6  
- VISUAL_DENSITY: 4

## Componentes Criados

### 1. Header.tsx
Header fixo com glassmorphism que contém:
- Logo e nome do site
- Navegação desktop (Início, Categorias, Cupons, Ofertas)
- Botão de autenticação
- Animações de scroll (blur e opacity dinâmicos)
- Efeito de compressão ao rolar

### 2. AuthButton.tsx
Botão de autenticação com dois estados:

**Estado Deslogado:**
- Ícone UserCircle + texto "Entrar"
- Animação spring ao hover/tap
- Abre o painel lateral

**Estado Logado:**
- Avatar com iniciais
- Nome do usuário (visível em desktop)
- Dropdown menu com:
  - Produtos Salvos
  - Notificações
  - Configurações
  - Sair

### 3. AuthPanel.tsx
Painel lateral (drawer) com:

**Características:**
- Slide animation da direita
- Overlay com backdrop blur
- Responsivo (full screen no mobile, 480px no desktop)
- Abas animadas (Login / Criar conta) com layoutId
- Fecha ao clicar fora ou no botão X

**Aba Login:**
- Campo e-mail com ícone
- Campo senha com toggle mostrar/ocultar
- Checkbox "Lembrar de mim"
- Link "Esqueci minha senha"
- Botão entrar com loading state
- Divisor "ou"
- Botão "Continuar com Google"

**Aba Criar Conta:**
- Campo nome completo
- Campo e-mail
- Campo senha com toggle
- Campo confirmar senha com toggle
- Checkbox aceitar termos (com links)
- Botão cadastrar com loading state
- Divisor "ou"
- Botão "Cadastrar com Google"

**Validações:**
- Validação inline de todos os campos
- Mensagens de erro animadas
- Validação de e-mail
- Validação de senha (mínimo 6 caracteres)
- Validação de senhas coincidentes
- Validação de termos aceitos

## Princípios taste-skill Aplicados

### Design Engineering
✅ Typography: Geist Sans (já configurado no projeto)
✅ Color: Electric Blue (#2563eb) como accent único
✅ Layout: Asymmetric header com logo à esquerda, nav no centro, auth à direita
✅ Materiality: Liquid Glass com border-white/10 e shadow-liquid
✅ Interactive States: Loading, error, hover, active todos implementados

### Motion Engine
✅ Spring Physics: `stiffness: 400, damping: 20` em todos os botões
✅ Layout Transitions: `layoutId="activeTab"` nas abas
✅ Staggered Orchestration: Animações de entrada/saída coordenadas
✅ Hardware Acceleration: Apenas transform e opacity

### Performance
✅ Client Components isolados
✅ Animações via transform/opacity
✅ Backdrop-blur em elemento fixo
✅ useEffect com cleanup

### Anti-Slop
✅ Sem emojis
✅ Sem Inter font
✅ Sem pure black (#09090b usado)
✅ Sem neon glows (apenas inner borders)
✅ Sem generic names (João Silva usado como exemplo)
✅ Sem 3-column layouts

## Integração

O Header foi adicionado ao `layout.tsx` e está visível em todas as páginas.

## TODO: Implementações Futuras

1. **Backend de Autenticação:**
   - Conectar com API de login/cadastro
   - Implementar OAuth com Google
   - Gerenciar tokens JWT
   - Persistir sessão no localStorage

2. **Funcionalidades:**
   - Recuperação de senha
   - Produtos salvos (favoritos)
   - Sistema de notificações
   - Configurações de usuário

3. **Estado Global:**
   - Considerar Zustand para gerenciar estado de autenticação
   - Context API para dados do usuário

## Uso

O componente funciona automaticamente. Para testar:

1. Clique em "Entrar" no header
2. Painel abre da direita com animação
3. Alterne entre "Entrar" e "Criar conta"
4. Preencha os campos (validação inline)
5. Clique em "Entrar" ou "Criar conta" (simula loading de 1.5s)
6. Painel fecha automaticamente após sucesso

## Responsividade

- **Mobile (<768px):** Painel ocupa tela inteira, navegação oculta
- **Tablet (768px-1024px):** Painel 480px, navegação visível
- **Desktop (>1024px):** Layout completo com todas as features
