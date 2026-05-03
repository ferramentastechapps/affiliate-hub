# Script para verificar e instalar Python no Windows
# Execute: .\instalar-python.ps1

Write-Host "🐍 Verificando Python..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Python está instalado
$pythonCommands = @("python", "python3", "py")
$pythonFound = $false
$pythonCommand = ""

foreach ($cmd in $pythonCommands) {
    try {
        $version = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Python encontrado: $cmd" -ForegroundColor Green
            Write-Host "   Versão: $version" -ForegroundColor Gray
            $pythonFound = $true
            $pythonCommand = $cmd
            break
        }
    } catch {
        # Comando não encontrado
    }
}

if (-not $pythonFound) {
    Write-Host "❌ Python não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Opções de Instalação:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OPÇÃO 1: Microsoft Store (Recomendado - Mais Fácil)" -ForegroundColor Yellow
    Write-Host "  1. Abra a Microsoft Store" -ForegroundColor White
    Write-Host "  2. Procure por 'Python 3.12'" -ForegroundColor White
    Write-Host "  3. Clique em 'Obter' ou 'Instalar'" -ForegroundColor White
    Write-Host "  4. Aguarde a instalação" -ForegroundColor White
    Write-Host ""
    Write-Host "OPÇÃO 2: Site Oficial (Mais Controle)" -ForegroundColor Yellow
    Write-Host "  1. Acesse: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "  2. Baixe Python 3.12 ou superior" -ForegroundColor White
    Write-Host "  3. Execute o instalador" -ForegroundColor White
    Write-Host "  4. ⚠️  IMPORTANTE: Marque 'Add Python to PATH'" -ForegroundColor Red
    Write-Host "  5. Clique em 'Install Now'" -ForegroundColor White
    Write-Host ""
    Write-Host "OPÇÃO 3: Winget (Linha de Comando)" -ForegroundColor Yellow
    Write-Host "  Execute no PowerShell:" -ForegroundColor White
    Write-Host "  winget install Python.Python.3.12" -ForegroundColor Gray
    Write-Host ""
    
    $resposta = Read-Host "Deseja abrir a Microsoft Store agora? (S/N)"
    if ($resposta -eq "S" -or $resposta -eq "s") {
        Start-Process "ms-windows-store://pdp/?ProductId=9NCVDN91XZQP"
        Write-Host ""
        Write-Host "✅ Microsoft Store aberta!" -ForegroundColor Green
        Write-Host "   Após instalar, feche e abra o PowerShell novamente" -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host ""
Write-Host "🔍 Verificando pip..." -ForegroundColor Cyan

try {
    $pipVersion = & $pythonCommand -m pip --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ pip encontrado: $pipVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠️  pip não encontrado, instalando..." -ForegroundColor Yellow
        & $pythonCommand -m ensurepip --upgrade
    }
} catch {
    Write-Host "⚠️  Erro ao verificar pip" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Verificando dependências do bot..." -ForegroundColor Cyan

if (Test-Path "requirements.txt") {
    Write-Host "✅ requirements.txt encontrado" -ForegroundColor Green
    Write-Host ""
    
    $resposta = Read-Host "Deseja instalar as dependências agora? (S/N)"
    if ($resposta -eq "S" -or $resposta -eq "s") {
        Write-Host ""
        Write-Host "📥 Instalando dependências..." -ForegroundColor Cyan
        & $pythonCommand -m pip install -r requirements.txt
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "⚠️  Erro ao instalar dependências" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️  requirements.txt não encontrado" -ForegroundColor Yellow
    Write-Host "   Execute este script na pasta 'bot'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🧪 Testando instalação..." -ForegroundColor Cyan

# Criar script de teste simples
$testScript = @"
import sys
print(f"✅ Python {sys.version.split()[0]} funcionando!")

# Testar imports importantes
try:
    import requests
    print("✅ requests instalado")
except ImportError:
    print("❌ requests não instalado")

try:
    from bs4 import BeautifulSoup
    print("✅ beautifulsoup4 instalado")
except ImportError:
    print("❌ beautifulsoup4 não instalado")

try:
    import telegram
    print("✅ python-telegram-bot instalado")
except ImportError:
    print("❌ python-telegram-bot não instalado")

try:
    import schedule
    print("✅ schedule instalado")
except ImportError:
    print("❌ schedule não instalado")
"@

$testScript | & $pythonCommand -

Write-Host ""
Write-Host "✅ Verificação concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Se alguma dependência está faltando, execute:" -ForegroundColor White
Write-Host "     $pythonCommand -m pip install -r requirements.txt" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Para testar o bot, execute:" -ForegroundColor White
Write-Host "     $pythonCommand testar_melhorias.py" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Para executar o bot, execute:" -ForegroundColor White
Write-Host "     $pythonCommand main.py --once" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Dica: Use '$pythonCommand' ao invés de 'python' nos comandos" -ForegroundColor Yellow
