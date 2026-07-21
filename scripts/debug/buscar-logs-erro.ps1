$ErrorActionPreference = "Stop"

Write-Host "Baixando logs da VPS..." -ForegroundColor Cyan

$sshCommand = @"
echo "=== LOGS DO NEXT.JS (API) ==="
tail -n 150 ~/.pm2/logs/nextjs-error.log 2>/dev/null || echo "Nao encontrou nextjs-error.log"
tail -n 150 ~/.pm2/logs/nextjs-out.log 2>/dev/null || echo "Nao encontrou nextjs-out.log"

echo ""
echo "=== LOGS DO ROBO (SCRAPER) ==="
tail -n 150 ~/.pm2/logs/affiliate-scraper-error.log 2>/dev/null || echo "Nao encontrou affiliate-scraper-error.log"
tail -n 150 ~/.pm2/logs/affiliate-scraper-out.log 2>/dev/null || echo "Nao encontrou affiliate-scraper-out.log"
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash" > logs_vps.txt

Write-Host "✅ Logs salvos com sucesso no arquivo 'logs_vps.txt'!" -ForegroundColor Green
