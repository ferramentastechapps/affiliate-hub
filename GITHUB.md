# 📤 Como Enviar para o GitHub

## Opção 1: Criar Novo Repositório

### 1. Criar repositório no GitHub
1. Acesse https://github.com/new
2. Nome do repositório: `affiliate-hub`
3. Descrição: `Hub de produtos com links de afiliados e painel admin`
4. Deixe como público ou privado (sua escolha)
5. **NÃO** marque "Initialize with README" (já temos um)
6. Clique em "Create repository"

### 2. Conectar e enviar
Após criar o repositório, execute no terminal:

```bash
cd affiliate-hub

# Adicionar o remote do GitHub (substitua SEU-USUARIO pelo seu username)
git remote add origin https://github.com/SEU-USUARIO/affiliate-hub.git

# Enviar para o GitHub
git push -u origin master
```

## Opção 2: Repositório Existente

Se você já tem um repositório:

```bash
cd affiliate-hub

# Verificar remotes atuais
git remote -v

# Se já existe um remote chamado 'origin', remova
git remote remove origin

# Adicionar novo remote
git remote add origin https://github.com/SEU-USUARIO/affiliate-hub.git

# Enviar
git push -u origin master
```

## 🔐 Autenticação

Se pedir autenticação, você tem duas opções:

### Opção A: Personal Access Token (Recomendado)
1. Vá em GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Clique em "Generate new token (classic)"
3. Marque: `repo` (acesso completo aos repositórios)
4. Copie o token gerado
5. Use o token como senha quando o Git pedir

### Opção B: GitHub CLI
```bash
# Instalar GitHub CLI
winget install GitHub.cli

# Fazer login
gh auth login

# Enviar
git push -u origin master
```

## 📝 Próximos Commits

Para futuras alterações:

```bash
# Ver o que mudou
git status

# Adicionar arquivos
git add .

# Fazer commit
git commit -m "descrição das mudanças"

# Enviar para o GitHub
git push
```

## 🚀 Deploy Automático na Vercel

Depois de enviar para o GitHub:

1. Acesse https://vercel.com
2. Clique em "New Project"
3. Importe o repositório do GitHub
4. Configure:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Adicione variável de ambiente:
   - `DATABASE_URL` = `file:./dev.db`
6. Clique em "Deploy"

## ⚠️ Importante

- O arquivo `.env` NÃO será enviado (está no .gitignore)
- O banco de dados `dev.db` NÃO será enviado (está no .gitignore)
- Você precisará configurar o banco novamente após clonar em outro lugar

## 🔄 Clonar em Outro Computador

```bash
git clone https://github.com/SEU-USUARIO/affiliate-hub.git
cd affiliate-hub
npm install
cp .env.example .env
npm run db:push
npm run dev
```
