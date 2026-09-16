# Scrapling Microservice - Windows (desenvolvimento local)
# Uso: .\start.ps1

Write-Host "🕷️  Iniciando Scrapling Microservice na porta 8001..." -ForegroundColor Cyan

# Verificar se uvicorn está instalado
if (-not (Get-Command uvicorn -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    pip install -r requirements.txt
    # Instalar browsers do playwright (necessário para DynamicFetcher)
    scrapling install
}

Set-Location $PSScriptRoot
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
