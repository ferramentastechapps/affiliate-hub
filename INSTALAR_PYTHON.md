# 🐍 Como Instalar Python no Windows

## ❌ Problema

Você viu este erro:
```
Python não foi encontrado; executar sem argumentos para instalar do Microsoft Store
```

Isso significa que o Python não está instalado ou não está no PATH do Windows.

---

## ✅ Solução Rápida (5 minutos)

### OPÇÃO 1: Microsoft Store (Mais Fácil) ⭐ RECOMENDADO

1. **Abra o PowerShell e execute:**
   ```powershell
   .\instalar-python.ps1
   ```

2. **Ou manualmente:**
   - Pressione `Win + S`
   - Digite "Microsoft Store"
   - Procure por "Python 3.12"
   - Clique em "Obter" ou "Instalar"
   - Aguarde a instalação

3. **Após instalar:**
   - Feche o PowerShell
   - Abra novamente
   - Execute: `python --version`

---

### OPÇÃO 2: Site Oficial (Mais Controle)

1. **Baixar:**
   - Acesse: https://www.python.org/downloads/
   - Clique em "Download Python 3.12.x"

2. **Instalar:**
   - Execute o arquivo baixado
   - ⚠️ **IMPORTANTE:** Marque a opção **"Add Python to PATH"**
   - Clique em "Install Now"
   - Aguarde a instalação

3. **Verificar:**
   - Feche o PowerShell
   - Abra novamente
   - Execute: `python --version`

---

### OPÇÃO 3: Winget (Linha de Comando)

```powershell
# Instalar Python
winget install Python.Python.3.12

# Fechar e abrir PowerShell novamente

# Verificar
python --version
```

---

## 🔧 Após Instalar o Python

### 1. Verificar Instalação

```powershell
# Verificar Python
python --version
# Deve mostrar: Python 3.12.x

# Verificar pip
python -m pip --version
# Deve mostrar: pip 24.x.x
```

### 2. Instalar Dependências do Bot

```powershell
# Ir para a pasta do bot
cd C:\Users\jotas\affiliate-hub\bot

# Instalar dependências
python -m pip install -r requirements.txt
```

### 3. Testar o Bot

```powershell
# Testar melhorias
python testar_melhorias.py

# Executar uma busca de teste
python main.py --once
```

---

## 🐛 Problemas Comuns

### Problema 1: "Python não foi encontrado" (ainda)

**Causa:** PATH não atualizado

**Solução:**
1. Feche TODOS os PowerShell/CMD abertos
2. Abra um novo PowerShell
3. Tente novamente

Se ainda não funcionar:
1. Pressione `Win + Pause`
2. Clique em "Configurações avançadas do sistema"
3. Clique em "Variáveis de Ambiente"
4. Em "Variáveis do sistema", procure "Path"
5. Clique em "Editar"
6. Adicione:
   - `C:\Users\jotas\AppData\Local\Programs\Python\Python312`
   - `C:\Users\jotas\AppData\Local\Programs\Python\Python312\Scripts`
7. Clique em "OK" em todas as janelas
8. Feche e abra o PowerShell

---

### Problema 2: "pip não foi encontrado"

**Solução:**
```powershell
python -m ensurepip --upgrade
```

---

### Problema 3: Erro ao instalar dependências

**Solução:**
```powershell
# Atualizar pip
python -m pip install --upgrade pip

# Instalar dependências uma por uma
python -m pip install requests
python -m pip install beautifulsoup4
python -m pip install python-telegram-bot
python -m pip install schedule
python -m pip install python-dotenv
```

---

### Problema 4: "Access Denied" ao instalar

**Solução:**
```powershell
# Instalar só para o usuário atual
python -m pip install -r requirements.txt --user
```

---

## 🚀 Script Automático

Execute este script para verificar e instalar tudo automaticamente:

```powershell
cd C:\Users\jotas\affiliate-hub\bot
.\instalar-python.ps1
```

O script vai:
- ✅ Verificar se Python está instalado
- ✅ Verificar se pip está instalado
- ✅ Instalar dependências
- ✅ Testar a instalação

---

## 📝 Comandos Úteis

### Verificar Versões:
```powershell
python --version          # Versão do Python
python -m pip --version   # Versão do pip
```

### Instalar/Atualizar:
```powershell
python -m pip install --upgrade pip              # Atualizar pip
python -m pip install -r requirements.txt        # Instalar dependências
python -m pip install --upgrade nome-pacote      # Atualizar pacote
```

### Listar Pacotes:
```powershell
python -m pip list        # Listar todos os pacotes instalados
python -m pip freeze      # Listar com versões exatas
```

---

## ✅ Checklist de Instalação

- [ ] Python instalado (`python --version` funciona)
- [ ] pip instalado (`python -m pip --version` funciona)
- [ ] Dependências instaladas (`python -m pip list` mostra requests, beautifulsoup4, etc)
- [ ] Script de teste funciona (`python testar_melhorias.py`)
- [ ] Bot executa (`python main.py --once`)

---

## 🆘 Ainda com Problemas?

### Opção 1: Usar Python do Microsoft Store

É a forma mais fácil e geralmente funciona sem problemas:

1. Abra a Microsoft Store
2. Procure "Python 3.12"
3. Instale
4. Feche e abra o PowerShell
5. Tente novamente

### Opção 2: Usar `py` ao invés de `python`

Alguns instaladores criam o comando `py` ao invés de `python`:

```powershell
py --version
py -m pip install -r requirements.txt
py testar_melhorias.py
py main.py --once
```

### Opção 3: Reinstalar Python

1. Desinstale o Python atual:
   - Configurações > Aplicativos > Python
   - Desinstalar

2. Baixe novamente de https://www.python.org/downloads/

3. Instale marcando **"Add Python to PATH"**

---

## 📚 Próximos Passos

Após instalar o Python:

1. **Testar:** [GUIA_RAPIDO_V2.md](GUIA_RAPIDO_V2.md)
2. **Entender:** [ANTES_E_DEPOIS.md](ANTES_E_DEPOIS.md)
3. **Usar:** [bot/MELHORIAS_IMPLEMENTADAS.md](bot/MELHORIAS_IMPLEMENTADAS.md)

---

## 💡 Dicas

### Usar sempre `python -m pip` ao invés de `pip`

```powershell
# ❌ Pode não funcionar
pip install requests

# ✅ Sempre funciona
python -m pip install requests
```

### Criar ambiente virtual (opcional, mas recomendado)

```powershell
# Criar ambiente virtual
python -m venv venv

# Ativar (Windows)
.\venv\Scripts\Activate.ps1

# Instalar dependências
python -m pip install -r requirements.txt

# Executar bot
python main.py
```

---

**Boa sorte!** 🚀

Se ainda tiver problemas, verifique:
- Versão do Windows (deve ser Windows 10 ou 11)
- Permissões de administrador
- Antivírus (pode estar bloqueando)
