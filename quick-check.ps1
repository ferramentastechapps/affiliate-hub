$ErrorActionPreference = "Continue"

Write-Host "🔍 Verificando bot na VPS (212.85.10.239)..." -ForegroundColor Cyan
Write-Host ""

# Comando simples e direto
Write-Host "1️⃣ Checando status do PM2..." -ForegroundColor Yellow
ssh root@212.85.10.239 'pm2 list'

Write-Host ""
Write-Host "2️⃣ Últimas linhas do scraper..." -ForegroundColor Yellow  
ssh root@212.85.10.239 'tail -30 ~/.pm2/logs/affiliate-hub-scraper-out.log'

Write-Host ""
Write-Host "3️⃣ Erros do scraper..." -ForegroundColor Yellow
ssh root@212.85.10.239 'tail -30 ~/.pm2/logs/affiliate-hub-scraper-error.log'
